import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { createMessage, getAnswerText, getCutAnswerError, restrictionKinds, cardinalityKinds } from "../ontologyFromDb/ontology/ontologyAnswer.js";
import { getPairProperties, getModelLabel } from "../ontologyFromDb/ontology/restrictionCheck.js";
import { getTermIri } from "../ontologyFromDb/mappings/mappingAnswer.js";
import { callVocablesFunction, setRunnerSource } from "../../remoteCodeRunner.js";
import { getPreparedSource, getTableDescription } from "./sourcePreparation.js";
import { getKnownTableReading, getTableReadingText } from "./tableReading.js";
import {
    suggestionModelId,
    suggestionReasoningEffort,
    suggestionMaxTokens,
    askSamples,
    markupCharacterRegex,
    isFilledText,
    readJsonObject,
    readClassAnswer,
    noClassKinds,
    getKnownClasses,
    getCorrectionParams,
} from "./columnClassSuggestion.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const promptPath = join(currentDirectory, "prompts/column_restriction_suggestion.md");
const judgementPromptPath = join(currentDirectory, "prompts/implicit_object_judgement.md");
// a single sample proposes an implicit object too easily and several rarely agree on its name: a longer reasoning judges them
const judgementReasoningEffort = "medium";
// the reasoning counts in the answer
const judgementMaxTokens = 16000;
// the restrictions are shown at once, the judgement is asked by the page afterwards: until then, its candidates and the
// conversation they came from
const pendingJudgementsById = {};
// a judgement the page never asks, its table closed in the meantime, is forgotten
const pendingJudgementLifetimeMs = 2 * 60 * 1000;

const owlNamespace = "http://www.w3.org/2002/07/owl#";
// owl:hasValue points to an individual, which no column maps to
const suggestedKinds = restrictionKinds.filter((restrictionKind) => restrictionKind != "hasValue");
// the prompt asks for at most as many
const maxRestrictionSuggestions = 3;
// an implicit object that links fewer columns links nothing
const minImplicitObjectLinks = 2;
// one answer drops or adds a pair from one click to the next: a pair stays when several samples give it
const minAgreeingSampleCount = 2;
const iriBracketsRegex = /^\s*<|>\s*$/g;

// the parent and the definition of the local classes, which the upper ontologies of the prompt do not hold
async function getLocalClassDescriptions(classIris, graphUri, userContext) {
    const descriptionByClass = {};
    if (classIris.length == 0) {
        return descriptionByClass;
    }
    const classValues = classIris.map((classIri) => "<" + classIri + ">");
    const query =
        "SELECT ?class ?parent ?definition FROM <" +
        graphUri +
        "> WHERE { VALUES ?class { " +
        classValues.join(" ") +
        " } OPTIONAL { ?class <http://www.w3.org/2000/01/rdf-schema#subClassOf> ?parent FILTER (isIRI(?parent)) } " +
        "OPTIONAL { ?class <http://www.w3.org/2004/02/skos/core#definition> ?definition } }";
    const classRows = await callVocablesFunction("AxiomExtractor", "execQuery", [query], userContext);
    classRows.forEach(function (classRow) {
        if (!descriptionByClass[classRow.class]) {
            descriptionByClass[classRow.class] = { parents: [], definitions: [] };
        }
        const classDescription = descriptionByClass[classRow.class];
        if (classRow.parent && !classDescription.parents.includes(classRow.parent)) {
            classDescription.parents.push(classRow.parent);
        }
        if (classRow.definition && !classDescription.definitions.includes(classRow.definition)) {
            classDescription.definitions.push(classRow.definition);
        }
    });
    return descriptionByClass;
}

function getDirectionKey(fromColumn, toColumn) {
    const directionKey = fromColumn + " -> " + toColumn;
    return directionKey;
}

// per direction { from, to } between two { column, classId }, the properties whose domain or range fit both classes,
// read as the plugin checks its restrictions: the source with every ontology it imports, directly or not
async function readAllowedProperties(directions, request, preparedSource, userContext) {
    if (!globalThis.Config.sources[request.source]) {
        setRunnerSource(request.source, userContext.userSources[request.source]);
    }
    // two columns of one class read the same pair
    const classPairsByKey = {};
    directions.forEach(function (direction) {
        classPairsByKey[direction.from.classId + " " + direction.to.classId] = { fromClass: direction.from.classId, toClass: direction.to.classId };
    });
    const classPairKeys = Object.keys(classPairsByKey);
    // a name of its own: the runner keeps a model by source name, and two requests may run at once
    const checkSource = request.source + "#restrictionSuggestion" + Date.now() + Math.random();
    globalThis.Config.sources[checkSource] = { ...globalThis.Config.sources[request.source], imports: preparedSource.checkedOntologies };
    const pairReadings = classPairKeys.map(function (classPairKey) {
        const classPair = classPairsByKey[classPairKey];
        return getPairProperties(checkSource, classPair.fromClass, classPair.toClass, userContext);
    });
    // every reading ends before the check source goes, a failed one included
    const settledReadings = await Promise.allSettled(pairReadings);
    delete globalThis.Config.sources[checkSource];
    const fittingPropertiesByClassPair = {};
    for (const [classPairIndex, settledReading] of settledReadings.entries()) {
        if (settledReading.status == "rejected") {
            throw settledReading.reason;
        }
        fittingPropertiesByClassPair[classPairKeys[classPairIndex]] = settledReading.value.fittingProperties;
    }
    const allowedPropertiesByDirection = {};
    directions.forEach(function (direction) {
        const fittingProperties = fittingPropertiesByClassPair[direction.from.classId + " " + direction.to.classId];
        if (fittingProperties.length > 0) {
            allowedPropertiesByDirection[getDirectionKey(direction.from.column, direction.to.column)] = fittingProperties;
        }
    });
    return allowedPropertiesByDirection;
}

function getPropertyLabel(propertyIri, preparedSource) {
    const propertyLabel = getModelLabel(propertyIri, preparedSource.checkedOntologies, preparedSource.ontologyModels);
    return propertyLabel;
}

function getRestrictionPrompt(request, preparedSource, allowedPropertiesByDirection, descriptionByClass, tableReading) {
    const mappedColumns = [request.mappedColumn].concat(request.otherColumns);
    const classLines = mappedColumns.map(function (mappedColumn) {
        const classDescription = descriptionByClass[mappedColumn.classId];
        const columnText = mappedColumn.isVirtual ? mappedColumn.column + " (virtual column)" : mappedColumn.column;
        const classLine = columnText + " maps to <" + mappedColumn.classId + '> "' + mappedColumn.classLabel + '"';
        if (!classDescription) {
            return classLine;
        }
        const parentLines = classDescription.parents.map((parentIri) => "    SubClassOf: <" + parentIri + ">");
        const definitionLines = classDescription.definitions.map((definition) => "    Definition: " + definition);
        const describedClassLines = [classLine].concat(parentLines, definitionLines);
        return describedClassLines.join("\n");
    });
    const otherColumnsText = classLines.slice(1).join("\n");
    const directionLines = Object.entries(allowedPropertiesByDirection).map(function ([directionKey, propertyIris]) {
        const propertyTexts = propertyIris.map((propertyIri) => "<" + propertyIri + '> "' + getPropertyLabel(propertyIri, preparedSource) + '"');
        return directionKey + ": " + propertyTexts.join(", ");
    });
    const directionsText = directionLines.length > 0 ? directionLines.join("\n") : "none";
    const localClassLines = request.localClasses.map((localClass) => "<" + localClass.id + '> "' + localClass.label + '"');
    const localClassesText = localClassLines.length > 0 ? localClassLines.join("\n") : "none yet";
    const restrictionPrompt =
        getTableDescription(request, preparedSource) +
        getTableReadingText(tableReading) +
        "\n# Column just mapped\n\n" +
        classLines[0] +
        "\n\n# Other mapped columns of the table\n\n" +
        otherColumnsText +
        "\n\n# Local classes of the application ontology\n\n" +
        localClassesText +
        "\n\n# Allowed properties, per direction\n\n" +
        directionsText;
    return restrictionPrompt;
}

function readPropertyIri(answeredRestriction, preparedSource) {
    const propertyReference = String(answeredRestriction.property || "").replace(iriBracketsRegex, "");
    const propertyIri = getTermIri(propertyReference, preparedSource.modelPrefixes);
    return propertyIri;
}

// why the inputs do not allow an answered restriction, null when they do
function getRefusal(answeredRestriction, allowedPropertiesByDirection, preparedSource) {
    const allowedProperties = allowedPropertiesByDirection[getDirectionKey(answeredRestriction.from, answeredRestriction.to)];
    if (!allowedProperties) {
        return "no allowed property from " + answeredRestriction.from + " to " + answeredRestriction.to;
    }
    if (!allowedProperties.includes(readPropertyIri(answeredRestriction, preparedSource))) {
        return "the property is not allowed in this direction";
    }
    const isCardinality = cardinalityKinds.includes(answeredRestriction.kind);
    const isValidCardinality = Number.isInteger(answeredRestriction.cardinality) && answeredRestriction.cardinality >= 0;
    if (!suggestedKinds.includes(answeredRestriction.kind) || (isCardinality && !isValidCardinality)) {
        return "unknown kind or cardinality";
    }
    return null;
}

// the restriction as the page draws it and the tool writes it
function getSuggestedRestriction(answeredRestriction, preparedSource) {
    const propertyIri = readPropertyIri(answeredRestriction, preparedSource);
    const restrictionType = owlNamespace + answeredRestriction.kind;
    const isCardinality = cardinalityKinds.includes(answeredRestriction.kind);
    const suggestedRestriction = {
        fromColumn: answeredRestriction.from,
        toColumn: answeredRestriction.to,
        property: { id: propertyIri, label: getPropertyLabel(propertyIri, preparedSource) },
        restrictionType: restrictionType,
        cardinality: isCardinality ? { type: restrictionType, value: String(answeredRestriction.cardinality) } : null,
    };
    return suggestedRestriction;
}

// the answered restrictions the allowed properties accept, one per column besides centralColumn, in the order of the answer
function getAllowedRestrictions(answeredRestrictions, centralColumn, allowedPropertiesByDirection, preparedSource, refusals) {
    const allowedRestrictions = [];
    const linkedColumns = [];
    answeredRestrictions.forEach(function (answeredRestriction) {
        // a link between two other columns was asked when they got their own classes
        if (answeredRestriction.from != centralColumn && answeredRestriction.to != centralColumn) {
            return;
        }
        const refusal = getRefusal(answeredRestriction, allowedPropertiesByDirection, preparedSource);
        if (refusal) {
            refusals.push(JSON.stringify(answeredRestriction) + ": " + refusal);
            return;
        }
        // one restriction per pair, never its inverse too
        const otherColumn = answeredRestriction.from == centralColumn ? answeredRestriction.to : answeredRestriction.from;
        if (linkedColumns.includes(otherColumn)) {
            return;
        }
        linkedColumns.push(otherColumn);
        allowedRestrictions.push(getSuggestedRestriction(answeredRestriction, preparedSource));
    });
    return allowedRestrictions;
}

// { restrictions, refusals, implicitAnswer }: the model only proposes, a restriction is kept when the inputs allow it
function readRestrictions(answerText, request, allowedPropertiesByDirection, preparedSource) {
    const readAnswer = readJsonObject(answerText);
    if (readAnswer.error) {
        return { restrictions: [], refusals: [readAnswer.error], implicitAnswer: null };
    }
    const answeredRestrictions = Array.isArray(readAnswer.answer.restrictions) ? readAnswer.answer.restrictions : [];
    const refusals = [];
    const restrictions = getAllowedRestrictions(answeredRestrictions, request.mappedColumn.column, allowedPropertiesByDirection, preparedSource, refusals);
    return { restrictions: restrictions, refusals: refusals, implicitAnswer: readAnswer.answer.implicitObject || null };
}

// { column, classSuggestion, restrictions } for an implicit object whose class exists or is whole and which links
// at least two mapped columns with allowed properties, null otherwise: it is left out, never corrected
async function readImplicitObject(implicitAnswer, request, preparedSource, userContext) {
    const mappedColumns = [request.mappedColumn].concat(request.otherColumns);
    const usedColumnNames = request.columns.concat(mappedColumns.map((mappedColumn) => mappedColumn.column));
    const lowerUsedColumnNames = usedColumnNames.map((columnName) => String(columnName).toLowerCase());
    const implicitColumn = isFilledText(implicitAnswer.column) ? implicitAnswer.column.trim() : "";
    if (!implicitColumn || markupCharacterRegex.test(implicitColumn) || lowerUsedColumnNames.includes(implicitColumn.toLowerCase())) {
        return null;
    }
    const knownClasses = getKnownClasses({ localClasses: request.localClasses, mappedColumns: mappedColumns });
    const classAnswer = readClassAnswer(implicitAnswer, preparedSource, knownClasses);
    if (classAnswer.error || noClassKinds.includes(classAnswer.suggestion.columnKind)) {
        return null;
    }
    const classSuggestion = classAnswer.suggestion;
    // a column of any table already identifies its objects, or a new class narrows them
    const isMappedObject = request.mappedClassIds.includes(classSuggestion.classId) || request.mappedClassIds.includes(classSuggestion.parentId);
    if (isMappedObject) {
        return null;
    }
    // a new class has the domains and ranges of its superclass
    const implicitClassId = classSuggestion.columnKind == "existingClass" ? classSuggestion.classId : classSuggestion.parentId;
    const implicitEnd = { column: implicitColumn, classId: implicitClassId };
    const answeredRestrictions = Array.isArray(implicitAnswer.restrictions) ? implicitAnswer.restrictions : [];
    const directions = [];
    answeredRestrictions.forEach(function (answeredRestriction) {
        const isFromImplicit = answeredRestriction.from == implicitColumn;
        const isToImplicit = answeredRestriction.to == implicitColumn;
        const linkedColumnName = isFromImplicit ? answeredRestriction.to : answeredRestriction.from;
        const linkedColumn = mappedColumns.find((mappedColumn) => mappedColumn.column == linkedColumnName);
        // one end is the implicit object, the other a mapped column
        if (isFromImplicit == isToImplicit || !linkedColumn) {
            return;
        }
        directions.push(isFromImplicit ? { from: implicitEnd, to: linkedColumn } : { from: linkedColumn, to: implicitEnd });
    });
    const allowedPropertiesByDirection = await readAllowedProperties(directions, request, preparedSource, userContext);
    const restrictions = getAllowedRestrictions(answeredRestrictions, implicitColumn, allowedPropertiesByDirection, preparedSource, []);
    if (restrictions.length < minImplicitObjectLinks) {
        return null;
    }
    const implicitObject = { column: implicitColumn, classSuggestion: classSuggestion, restrictions: restrictions };
    return implicitObject;
}

// { restrictions, refusals, implicitAnswer, answerText }, or { error } for a cut answer
async function askModel(messageParams, request, allowedPropertiesByDirection, preparedSource) {
    const completion = await createMessage(messageParams, { input_tokens: 0, output_tokens: 0 });
    const answerText = getAnswerText(completion);
    const cutAnswerError = getCutAnswerError(completion, answerText);
    if (cutAnswerError) {
        return { error: cutAnswerError };
    }
    const readAnswer = readRestrictions(answerText, request, allowedPropertiesByDirection, preparedSource);
    return { ...readAnswer, answerText: answerText };
}

// { restrictions, refusals, implicitAnswer } of one sample, or { error } for a cut answer; a failed call to the model throws
async function askSample(messageParams, request, allowedPropertiesByDirection, preparedSource) {
    const firstAnswer = await askModel(messageParams, request, allowedPropertiesByDirection, preparedSource);
    if (firstAnswer.error || firstAnswer.refusals.length == 0) {
        return firstAnswer;
    }
    // a property out of its list: the model is told once, and what it still gets wrong is left out
    const correctionText =
        "These restrictions were refused: " +
        firstAnswer.refusals.join("; ") +
        ". Use only an allowed property of the direction you write, one of the two columns being the column just mapped, or leave the pair out. Write only the JSON object.";
    const correctedAnswer = await askModel(getCorrectionParams(messageParams, firstAnswer.answerText, correctionText), request, allowedPropertiesByDirection, preparedSource);
    // a cut correction keeps what the first answer got right
    const sampleAnswer = correctedAnswer.error ? firstAnswer : correctedAnswer;
    return sampleAnswer;
}

// { restrictions, implicitJudgementId, allowedMilliseconds, llmMilliseconds }, the id null when no sample proposes a valid
// implicit object, or the HTTP error to answer; a failed call to the model throws
async function suggestColumnRestrictions(request, abortSignal, userContext) {
    const preparedSource = await getPreparedSource(request.source);
    if (!preparedSource) {
        return { status: 409, error: "the ontologies of " + request.source + " are not prepared, open the tool again" };
    }
    const allowedStart = Date.now();
    const directions = [];
    request.otherColumns.forEach(function (otherColumn) {
        directions.push({ from: request.mappedColumn, to: otherColumn });
        directions.push({ from: otherColumn, to: request.mappedColumn });
    });
    // a pair that no property links directly may still be linked through an implicit object: the model is asked all the same
    const allowedPropertiesByDirection = await readAllowedProperties(directions, request, preparedSource, userContext);
    const allowedMilliseconds = Date.now() - allowedStart;
    if (abortSignal.aborted) {
        return { status: 499, error: "the request was cancelled" };
    }
    const mappedClassIris = [request.mappedColumn.classId].concat(request.otherColumns.map((otherColumn) => otherColumn.classId));
    const localClassIris = mappedClassIris.filter((classIri) => !preparedSource.classLabelByIri[classIri]);
    const descriptionByClass = await getLocalClassDescriptions(localClassIris, userContext.userSources[request.source].graphUri, userContext);
    const tableReading = await getKnownTableReading(request);
    const systemPrompt = readFileSync(promptPath, "utf8") + "\n\n# Upper ontologies, most abstract first\n" + preparedSource.modelText;
    const llmStart = Date.now();
    const messageParams = {
        model: suggestionModelId,
        system: systemPrompt,
        messages: [{ role: "user", content: getRestrictionPrompt(request, preparedSource, allowedPropertiesByDirection, descriptionByClass, tableReading) }],
        maxTokens: suggestionMaxTokens,
        reasoningEffort: suggestionReasoningEffort,
        isPromptCached: true,
        abortSignal: abortSignal,
    };
    const askedSamples = await askSamples(() => askSample(messageParams, request, allowedPropertiesByDirection, preparedSource));
    if (askedSamples.error) {
        return askedSamples;
    }
    const llmMilliseconds = Date.now() - llmStart;
    const sampleAnswers = askedSamples.sampleAnswers;
    // the few samples left when the others failed still give their restrictions
    const minAgreeingSamples = Math.min(minAgreeingSampleCount, sampleAnswers.length);
    const restrictions = mergeSampleRestrictions(sampleAnswers, request.mappedColumn.column, minAgreeingSamples);
    // checked before the judgement: an implicit object the inputs refuse is never judged
    const implicitObjectPromises = sampleAnswers.map((sampleAnswer) => (sampleAnswer.implicitAnswer ? readImplicitObject(sampleAnswer.implicitAnswer, request, preparedSource, userContext) : null));
    const sampleImplicitObjects = await Promise.all(implicitObjectPromises);
    const implicitCandidates = getImplicitCandidates(sampleImplicitObjects);
    // no one would ask the judgement of a cancelled request
    if (abortSignal.aborted) {
        return { status: 499, error: "the request was cancelled" };
    }
    const implicitJudgementId = implicitCandidates.length > 0 ? keepPendingJudgement(implicitCandidates, messageParams, userContext.user) : null;
    return { restrictions: restrictions, implicitJudgementId: implicitJudgementId, allowedMilliseconds: allowedMilliseconds, llmMilliseconds: llmMilliseconds };
}

function keepPendingJudgement(implicitCandidates, messageParams, userInfo) {
    const judgementId = randomUUID();
    const forgetTimer = setTimeout(() => delete pendingJudgementsById[judgementId], pendingJudgementLifetimeMs);
    // a pending judgement must not keep the server running
    forgetTimer.unref();
    pendingJudgementsById[judgementId] = { implicitCandidates: implicitCandidates, messageParams: messageParams, userLogin: userInfo.user.login, forgetTimer: forgetTimer };
    return judgementId;
}

// { implicitObject, judgementMilliseconds }, the implicit object null when the judgement refuses them all, or the HTTP error
// to answer; asked once
async function judgeImplicitObject(judgementId, abortSignal, userInfo) {
    const pendingJudgement = pendingJudgementsById[judgementId];
    if (!pendingJudgement || pendingJudgement.userLogin != userInfo.user.login) {
        return { status: 404, error: "this judgement is unknown or expired, map the column again" };
    }
    clearTimeout(pendingJudgement.forgetTimer);
    delete pendingJudgementsById[judgementId];
    const judgementStart = Date.now();
    const messageParams = { ...pendingJudgement.messageParams, abortSignal: abortSignal };
    const judgement = await judgeImplicitCandidates(pendingJudgement.implicitCandidates, messageParams);
    if (judgement.error) {
        return { status: 502, error: judgement.error };
    }
    const judgementMilliseconds = Date.now() - judgementStart;
    return { implicitObject: judgement.implicitObject, judgementMilliseconds: judgementMilliseconds };
}

function groupByKey(items, getKey) {
    const itemsByKey = {};
    items.forEach(function (item) {
        const itemKey = getKey(item);
        if (!itemsByKey[itemKey]) {
            itemsByKey[itemKey] = [];
        }
        itemsByKey[itemKey].push(item);
    });
    return itemsByKey;
}

// the keys holding at least minCount items, most items first; equal counts in key order, never in the order the samples came in
function getAgreedKeys(itemsByKey, minCount) {
    const agreedKeys = Object.keys(itemsByKey).filter((itemKey) => itemsByKey[itemKey].length >= minCount);
    agreedKeys.sort((itemKey1, itemKey2) => itemsByKey[itemKey2].length - itemsByKey[itemKey1].length || itemKey1.localeCompare(itemKey2));
    return agreedKeys;
}

function getPropertyKey(restriction) {
    const propertyKey = restriction.fromColumn + " " + restriction.property.id + " " + restriction.toColumn;
    return propertyKey;
}

function getRestrictionKey(restriction) {
    const cardinalityText = restriction.cardinality ? " " + restriction.cardinality.value : "";
    const restrictionKey = getPropertyKey(restriction) + " " + restriction.restrictionType + cardinalityText;
    return restrictionKey;
}

// the pairs that at least minAgreeingSamples samples link, most often linked first; per pair the property its samples
// write most often, then the kind they write most often with it
function mergeSampleRestrictions(sampleAnswers, centralColumn, minAgreeingSamples) {
    const sampleRestrictions = [];
    sampleAnswers.forEach(function (sampleAnswer) {
        sampleRestrictions.push(...sampleAnswer.restrictions);
    });
    // getAllowedRestrictions keeps one restriction per pair in a sample: the restrictions of a pair count its samples
    const restrictionsByColumn = groupByKey(sampleRestrictions, (restriction) => (restriction.fromColumn == centralColumn ? restriction.toColumn : restriction.fromColumn));
    const agreedColumns = getAgreedKeys(restrictionsByColumn, minAgreeingSamples);
    const keptColumns = agreedColumns.slice(0, maxRestrictionSuggestions);
    const restrictions = keptColumns.map(function (otherColumn) {
        const restrictionsByProperty = groupByKey(restrictionsByColumn[otherColumn], getPropertyKey);
        const mostWrittenProperty = getAgreedKeys(restrictionsByProperty, 1)[0];
        const restrictionsByKind = groupByKey(restrictionsByProperty[mostWrittenProperty], getRestrictionKey);
        const mostWrittenKind = getAgreedKeys(restrictionsByKind, 1)[0];
        const mergedRestriction = restrictionsByKind[mostWrittenKind][0];
        return mergedRestriction;
    });
    return restrictions;
}

// one candidate per column the samples name, as the sample linking it most writes it, with the number of samples naming it;
// the most named first
function getImplicitCandidates(sampleImplicitObjects) {
    const implicitObjects = sampleImplicitObjects.filter((implicitObject) => implicitObject !== null);
    const implicitObjectsByColumn = groupByKey(implicitObjects, (implicitObject) => implicitObject.column.toLowerCase());
    const candidateColumns = getAgreedKeys(implicitObjectsByColumn, 1);
    const getLinksText = (implicitObject) => JSON.stringify(implicitObject.restrictions);
    const implicitCandidates = candidateColumns.map(function (candidateColumn) {
        const columnObjects = implicitObjectsByColumn[candidateColumn];
        columnObjects.sort((implicitObject1, implicitObject2) => implicitObject2.restrictions.length - implicitObject1.restrictions.length || getLinksText(implicitObject1).localeCompare(getLinksText(implicitObject2)));
        const implicitCandidate = { implicitObject: columnObjects[0], sampleCount: columnObjects.length };
        return implicitCandidate;
    });
    return implicitCandidates;
}

function getCandidateText(implicitCandidate, candidateNumber) {
    const implicitObject = implicitCandidate.implicitObject;
    const classSuggestion = implicitObject.classSuggestion;
    const newClassText = 'new class "' + classSuggestion.label + '" under <' + classSuggestion.parentId + '> "' + classSuggestion.parentLabel + '": ' + classSuggestion.definition;
    const classText = classSuggestion.columnKind == "existingClass" ? "class <" + classSuggestion.classId + '> "' + classSuggestion.label + '"' : newClassText;
    const restrictionLines = implicitObject.restrictions.map((restriction) => "    " + restriction.fromColumn + " " + restriction.property.label + " " + restriction.toColumn);
    const candidateText = candidateNumber + ". virtual column " + implicitObject.column + ", " + classText + ", proposed by " + implicitCandidate.sampleCount + " answers\n" + restrictionLines.join("\n");
    return candidateText;
}

// { implicitObject } the judgement holds legitimate, with its reason, null when it refuses them all; { error } for a cut or
// unreadable answer; a failed call to the model throws
async function judgeImplicitCandidates(implicitCandidates, messageParams) {
    const candidateTexts = implicitCandidates.map((implicitCandidate, candidateIndex) => getCandidateText(implicitCandidate, candidateIndex + 1));
    const judgementText = readFileSync(judgementPromptPath, "utf8") + "\n\n# Proposed implicit objects\n\n" + candidateTexts.join("\n\n");
    const judgementMessages = [...messageParams.messages, { role: "user", content: judgementText }];
    const judgementParams = { ...messageParams, messages: judgementMessages, maxTokens: judgementMaxTokens, reasoningEffort: judgementReasoningEffort };
    const completion = await createMessage(judgementParams, { input_tokens: 0, output_tokens: 0 });
    const answerText = getAnswerText(completion);
    const cutAnswerError = getCutAnswerError(completion, answerText);
    if (cutAnswerError) {
        return { error: cutAnswerError };
    }
    const readAnswer = readJsonObject(answerText);
    if (readAnswer.error) {
        return { error: readAnswer.error };
    }
    const candidateNumber = Number(readAnswer.answer.candidate);
    if (candidateNumber === 0) {
        return { implicitObject: null };
    }
    const chosenCandidate = implicitCandidates[candidateNumber - 1];
    if (!chosenCandidate) {
        return { error: "the judgement chose no listed implicit object: " + JSON.stringify(readAnswer.answer.candidate) };
    }
    const reason = isFilledText(readAnswer.answer.reason) ? readAnswer.answer.reason.trim() : "";
    const judgedObject = { ...chosenCandidate.implicitObject, reason: reason };
    return { implicitObject: judgedObject };
}

export { suggestColumnRestrictions, judgeImplicitObject };
