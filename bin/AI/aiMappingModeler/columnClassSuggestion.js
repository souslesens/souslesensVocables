import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { createMessage, getAnswerText, getCutAnswerError } from "../ontologyFromDb/ontology/ontologyAnswer.js";
import { getTermIri } from "../ontologyFromDb/mappings/mappingAnswer.js";
import { getPreparedSource, getTableDescription, getTableKeys, readColumnSample } from "./sourcePreparation.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const promptPath = join(currentDirectory, "prompts/column_class_suggestion.md");

// OpenRouter id, fixed here as in the ontology generation: the page does not choose the model
const suggestionModelId = "openai/gpt-5.6-luna";
const suggestionReasoningEffort = "none";
// the reasoning counts: reaching the ceiling makes claude -p call the model again, up to 4 times
const suggestionMaxTokens = 1500;
// one answer changes its options from one click to the next, the mean of several answers keeps them
const suggestionSampleCount = 5;
const minMergedProbability = 10;
const iriBracketsRegex = /^\s*<|>\s*$/g;
const jsonObjectRegex = /\{[\s\S]*\}/;
// a label reaches the jstree of the classes, which reads it as html
const markupCharacterRegex = /[<>&]/;
// the prompt asks for at most as many readings of a column
const maxCandidates = 3;
const fullProbability = 100;
const noClassKinds = ["value", "technicalKey"];
const secondTypeText = "A class on this column would give the same individuals a second type.";
// rows read again for the column: none when they cannot be, the page then gives the first rows of the table
const sampleNoteTextByColumnState = {
    filled: "The sample rows are the first rows of the table where this column holds a value.",
    empty: "This column is empty in every row of the table: only its name, its comment and the other columns tell what it would hold.",
};
// the model read the column as a technical key without the keys of the database telling which tables type its rows
const genericTechnicalKeyText =
    "This column only carries the identity of rows that other tables give their class. " + secondTypeText + " Leave it without a class and give it the URI prefix of the key columns of those tables.";

// { roleText, technicalKeyText }: what the keys of the table tell the model about the column, and the explanation shown
// with a technical key, written here so that it names the tables exactly and stays the same from one click to the next
function getColumnKeyRole(request, preparedSource) {
    const tableKeys = getTableKeys(request, preparedSource);
    const primaryKeyColumns = tableKeys.primaryKeyColumns;
    const isRowKey = primaryKeyColumns.length == 1 && primaryKeyColumns[0] == request.column;
    // a key over several columns relates objects that other columns identify: no column carries the object of the rows
    const isBesideRowKey = primaryKeyColumns.length == 1 && !isRowKey && !tableKeys.foreignKeyColumns.includes(request.column);
    const isHandedOutKey = isRowKey && tableKeys.handedOutKeys.length > 0;
    // the primary key of a table taking the key it points at is the key of that kind, never a technical key
    const isHandedOutKeyReference = !isRowKey && tableKeys.referencedHandedOutKeys.length > 0;
    if (isBesideRowKey) {
        const besideRowKeyText = "The primary key " + primaryKeyColumns[0] + " carries the object of the rows. When this column names or identifies the same rows, it is a value and the only candidate.";
        return { roleText: besideRowKeyText, technicalKeyText: genericTechnicalKeyText };
    }
    if (!isHandedOutKey && !isHandedOutKeyReference) {
        return { roleText: "", technicalKeyText: genericTechnicalKeyText };
    }
    const subtypeKeys = isHandedOutKey ? tableKeys.handedOutKeys : tableKeys.referencedHandedOutKeys;
    const subtypeTables = subtypeKeys.map((subtypeKey) => subtypeKey.table_name);
    const subtypeKeyNames = subtypeKeys.map((subtypeKey) => subtypeKey.table_name + "." + subtypeKey.column_name);
    const subtypeTablesText = subtypeTables.join(", ");
    const adviceText = secondTypeText + " Leave it without a class and give it the URI prefix of " + subtypeKeyNames.join(", ") + ", so that its values and links land on these individuals.";
    if (isHandedOutKey) {
        const handedOutKeyText =
            "The tables " + subtypeTablesText + " take this key as their own primary key and have every other column of this table: each holds a kind of its rows, and this table only hands out the key.";
        const technicalKeyText = "The tables " + subtypeTablesText + " take this key as their own primary key and give each row its class. " + adviceText;
        return { roleText: handedOutKeyText, technicalKeyText: technicalKeyText };
    }
    const handedOutKeyReferenceText =
        "This column points at " +
        tableKeys.referencedKey +
        ", the key of a table that only hands it out to the tables " +
        subtypeTablesText +
        ", each taking it as its own primary key. This column does not carry the object of the rows of this table: it points at rows that these tables give their class.";
    const technicalKeyText = "This column points at " + tableKeys.referencedKey + ", which the tables " + subtypeTablesText + " take as their own primary key, each giving the rows their class. " + adviceText;
    return { roleText: handedOutKeyReferenceText, technicalKeyText: technicalKeyText };
}

// columnNoteTexts: what the code knows of the selected column, one paragraph each
function getColumnPrompt(request, preparedSource, columnNoteTexts) {
    const localClassLines = request.localClasses.map((localClass) => "<" + localClass.id + '> "' + localClass.label + '"');
    const localClassesText = localClassLines.length > 0 ? localClassLines.join("\n") : "none yet";
    const mappedColumnLines = request.mappedColumns.map(function (mappedColumn) {
        const columnText = mappedColumn.isVirtual ? mappedColumn.table + "." + mappedColumn.column + " (virtual column)" : mappedColumn.table + "." + mappedColumn.column;
        return columnText + " maps to <" + mappedColumn.classId + '> "' + mappedColumn.classLabel + '"';
    });
    const mappedColumnsText = mappedColumnLines.length > 0 ? mappedColumnLines.join("\n") : "none yet";
    const columnNoteParagraphs = columnNoteTexts.map((noteText) => "\n\n" + noteText);
    const columnNotesText = columnNoteParagraphs.join("");
    const columnPrompt =
        getTableDescription(request, preparedSource) +
        "\n# Selected column\n\n" +
        request.column +
        columnNotesText +
        "\n\n# Local classes of the application ontology\n\n" +
        localClassesText +
        "\n\n# Columns already mapped\n\n" +
        mappedColumnsText;
    return columnPrompt;
}

function readClassIri(writtenClass, prefixes) {
    const classReference = String(writtenClass || "").replace(iriBracketsRegex, "");
    const classIri = getTermIri(classReference, prefixes);
    return classIri;
}

function getClassLabel(classIri, preparedSource, knownClasses) {
    const knownClass = knownClasses.find((candidateClass) => candidateClass.id == classIri);
    const classLabel = knownClass ? knownClass.label : preparedSource.classLabelByIri[classIri];
    return classLabel;
}

// a mapped class may belong to an ontology left out of the prompt: it was written in the inputs all the same
function getKnownClasses(request) {
    const mappedClasses = request.mappedColumns.map((mappedColumn) => ({ id: mappedColumn.classId, label: mappedColumn.classLabel }));
    const knownClasses = request.localClasses.concat(mappedClasses);
    return knownClasses;
}

function isFilledText(value) {
    const isFilled = typeof value == "string" && value.trim().length > 0;
    return isFilled;
}

// { answer }, or { error } for an answer holding no readable JSON object
function readJsonObject(answerText) {
    const jsonMatch = answerText.match(jsonObjectRegex);
    if (!jsonMatch) {
        return { error: "the model gave no JSON answer" };
    }
    try {
        const answer = JSON.parse(jsonMatch[0]);
        return { answer: answer };
    } catch {
        return { error: "the model gave an unreadable JSON answer" };
    }
}

// two candidates naming one class, or a new class that turned out to be an imported one, are one reading of the column
function getReadingKey(suggestion) {
    const readingKey = suggestion.columnKind == "newClass" ? "newClass " + suggestion.label.toLowerCase() : suggestion.columnKind + " " + (suggestion.classId || "");
    return readingKey;
}

// a number written as text counts, anything else is no probability
function readProbability(givenValue) {
    const givenProbability = Number(givenValue);
    const probability = givenProbability > 0 ? givenProbability : 0;
    return probability;
}

// probabilities whose total is exactly 100: the first, the most probable, takes what the rounding of the others leaves
function normalizeProbabilities(weighedItems) {
    let probabilityTotal = 0;
    weighedItems.forEach(function (weighedItem) {
        probabilityTotal += weighedItem.probability;
    });
    let othersTotal = 0;
    weighedItems.forEach(function (weighedItem, itemIndex) {
        // no probability given: the options share it evenly
        const shareOfTotal = probabilityTotal > 0 ? weighedItem.probability / probabilityTotal : 1 / weighedItems.length;
        weighedItem.probability = Math.round(shareOfTotal * fullProbability);
        if (itemIndex > 0) {
            othersTotal += weighedItem.probability;
        }
    });
    weighedItems[0].probability = fullProbability - othersTotal;
}

// the most probable options, at most 3, their probabilities brought back to a total of 100; an option without probability
// next to options with one is left out before the choice
function keepMostProbable(weighedItems) {
    const hasProbabilities = weighedItems.some((weighedItem) => weighedItem.probability > 0);
    const probableItems = hasProbabilities ? weighedItems.filter((weighedItem) => weighedItem.probability > 0) : weighedItems;
    // the order of the answer is kept between equal probabilities
    const sortedItems = probableItems.sort((weighedItem1, weighedItem2) => weighedItem2.probability - weighedItem1.probability);
    const keptItems = sortedItems.slice(0, maxCandidates);
    if (keptItems.length > 0) {
        normalizeProbabilities(keptItems);
    }
    return keptItems;
}

// { suggestions, refusals }: the readings kept, at most 3, most probable first, their probabilities brought back to a total of 100,
// and why the others were refused
function readSuggestions(answerText, preparedSource, knownClasses) {
    const readAnswer = readJsonObject(answerText);
    if (readAnswer.error) {
        return { suggestions: [], refusals: [readAnswer.error] };
    }
    // an answer of one reading may come without the list
    const candidates = Array.isArray(readAnswer.answer.candidates) ? readAnswer.answer.candidates : [readAnswer.answer];
    const suggestionsByReadingKey = {};
    const refusals = [];
    candidates.forEach(function (candidate) {
        const classAnswer = readClassAnswer(candidate, preparedSource, knownClasses);
        if (classAnswer.error) {
            refusals.push(classAnswer.error);
            return;
        }
        const probability = readProbability(candidate.probability);
        const readingKey = getReadingKey(classAnswer.suggestion);
        const sameReading = suggestionsByReadingKey[readingKey];
        const readingProbability = probability + (sameReading ? sameReading.probability : 0);
        // two writings of one reading: the more probable gives its parent and definition
        if (!sameReading || probability > sameReading.probability) {
            suggestionsByReadingKey[readingKey] = { ...classAnswer.suggestion, probability: readingProbability };
        } else {
            sameReading.probability = readingProbability;
        }
    });
    const suggestions = keepMostProbable(Object.values(suggestionsByReadingKey));
    return { suggestions: suggestions, refusals: refusals };
}

// { suggestion } or { error }: a class the model names must exist and a new class must be whole, whatever it wrote
function readClassAnswer(answer, preparedSource, knownClasses) {
    if (noClassKinds.includes(answer.columnKind)) {
        return { suggestion: { columnKind: answer.columnKind } };
    }
    if (answer.columnKind == "existingClass") {
        const classId = readClassIri(answer.class, preparedSource.classPrefixes);
        const classLabel = getClassLabel(classId, preparedSource, knownClasses);
        if (classLabel === undefined) {
            return { error: "the model named a class that does not exist: " + JSON.stringify(answer.class) };
        }
        return { suggestion: { columnKind: "existingClass", classId: classId, label: classLabel } };
    }
    if (answer.columnKind != "newClass") {
        return { error: "the model gave an unknown answer: " + JSON.stringify(answer.columnKind) };
    }
    if (!isFilledText(answer.label) || markupCharacterRegex.test(answer.label)) {
        return { error: "the model gave a new class without a usable label" };
    }
    // the IRI of a class is built from its label: the same label is the same class
    const newLabel = answer.label.trim();
    const sameLabelClass = knownClasses.find((knownClass) => knownClass.label.toLowerCase() == newLabel.toLowerCase());
    if (sameLabelClass) {
        return { suggestion: { columnKind: "existingClass", classId: sameLabelClass.id, label: sameLabelClass.label } };
    }
    // a local class with the label of an imported class only renames it
    const sortedImportedIris = Object.keys(preparedSource.classLabelByIri).sort();
    const sameLabelImportedIri = sortedImportedIris.find((classIri) => preparedSource.classLabelByIri[classIri].toLowerCase() == newLabel.toLowerCase());
    if (sameLabelImportedIri) {
        return { suggestion: { columnKind: "existingClass", classId: sameLabelImportedIri, label: preparedSource.classLabelByIri[sameLabelImportedIri] } };
    }
    // one superclass, or the ones the model hesitates between, each with the definition that names it
    const parentAnswers = Array.isArray(answer.parents) ? answer.parents : [{ class: answer.parent, definition: answer.definition }];
    const parentOptions = [];
    const parentRefusals = [];
    parentAnswers.forEach(function (parentAnswer) {
        const parentId = readClassIri(parentAnswer.class, preparedSource.classPrefixes);
        const parentLabel = getClassLabel(parentId, preparedSource, knownClasses);
        if (parentLabel === undefined) {
            parentRefusals.push("the model named a superclass that does not exist: " + JSON.stringify(parentAnswer.class));
            return;
        }
        if (!isFilledText(parentAnswer.definition)) {
            parentRefusals.push("the model gave a new class without a usable definition");
            return;
        }
        if (parentOptions.some((parentOption) => parentOption.parentId == parentId)) {
            return;
        }
        parentOptions.push({ parentId: parentId, parentLabel: parentLabel, definition: parentAnswer.definition.trim(), probability: readProbability(parentAnswer.probability) });
    });
    if (parentOptions.length == 0) {
        return { error: parentRefusals[0] || "the model gave a new class without a superclass" };
    }
    const keptParentOptions = keepMostProbable(parentOptions);
    const mostProbableParent = keptParentOptions[0];
    const newClassSuggestion = {
        columnKind: "newClass",
        label: newLabel,
        parentId: mostProbableParent.parentId,
        parentLabel: mostProbableParent.parentLabel,
        definition: mostProbableParent.definition,
        parentOptions: keptParentOptions,
    };
    return { suggestion: newClassSuggestion };
}

// { suggestions, refusals, answerText }, or { error } for a cut answer
async function askModel(messageParams, request, preparedSource) {
    const completion = await createMessage(messageParams, { input_tokens: 0, output_tokens: 0 });
    const answerText = getAnswerText(completion);
    const cutAnswerError = getCutAnswerError(completion, answerText);
    if (cutAnswerError) {
        return { error: cutAnswerError };
    }
    const readAnswer = readSuggestions(answerText, preparedSource, getKnownClasses(request));
    return { ...readAnswer, answerText: answerText };
}

// the conversation once more, with the refused answer and what the model must change
function getCorrectionParams(messageParams, refusedAnswerText, correctionText) {
    const correctionMessages = [...messageParams.messages, { role: "assistant", content: refusedAnswerText || "(no answer)" }, { role: "user", content: correctionText }];
    const correctionParams = { ...messageParams, messages: correctionMessages };
    return correctionParams;
}

// { suggestions, refusals, answerText } of one sample, or { error }; a failed call to the model throws
async function askSample(messageParams, request, preparedSource) {
    const firstAnswer = await askModel(messageParams, request, preparedSource);
    if (firstAnswer.error) {
        return firstAnswer;
    }
    let finalAnswer = firstAnswer;
    // a refused reading would hand its share to the others: the model is told once, which costs about a second
    if (firstAnswer.refusals.length > 0) {
        const correctionText =
            "This answer was refused: " +
            firstAnswer.refusals.join("; ") +
            ". Name only a class written in the inputs. When none denotes the object, declare a new local class under the deepest written class that fits. Write only the JSON object.";
        const correctedAnswer = await askModel(getCorrectionParams(messageParams, firstAnswer.answerText, correctionText), request, preparedSource);
        // a cut correction, or one keeping nothing, leaves the readings the first answer got right
        const hasCorrectedSuggestions = !correctedAnswer.error && correctedAnswer.suggestions.length > 0;
        finalAnswer = hasCorrectedSuggestions ? correctedAnswer : firstAnswer;
    }
    if (finalAnswer.suggestions.length == 0) {
        return { error: finalAnswer.refusals[0] || "the model gave no candidate" };
    }
    return finalAnswer;
}

// one option per key, its probability the mean over the lists, a list without it counting 0;
// the options under minMergedProbability are left out, unless all are, then the most probable are kept
function mergeOptionLists(optionLists, getOptionKey) {
    const optionTotalByKey = {};
    optionLists.forEach(function (optionList) {
        optionList.forEach(function (option) {
            const optionKey = getOptionKey(option);
            if (!optionTotalByKey[optionKey]) {
                optionTotalByKey[optionKey] = { writing: option, probabilitySum: 0 };
            }
            const optionTotal = optionTotalByKey[optionKey];
            optionTotal.probabilitySum += option.probability;
            // as within one answer, the more probable writing gives the label, the parent and the definition
            if (option.probability > optionTotal.writing.probability) {
                optionTotal.writing = option;
            }
        });
    });
    // equal probabilities are told apart by the key, not by the order the samples came in
    const sortedKeys = Object.keys(optionTotalByKey).sort();
    const mergedOptions = sortedKeys.map((optionKey) => ({ ...optionTotalByKey[optionKey].writing, probability: optionTotalByKey[optionKey].probabilitySum / optionLists.length }));
    const frequentOptions = mergedOptions.filter((mergedOption) => mergedOption.probability >= minMergedProbability);
    const choosableOptions = frequentOptions.length > 0 ? frequentOptions : mergedOptions;
    const keptOptions = keepMostProbable(choosableOptions);
    return keptOptions;
}

// the readings of the samples merged; the superclasses of a new class merged over the samples holding it
function mergeSamples(sampleSuggestionLists) {
    const mergedSuggestions = mergeOptionLists(sampleSuggestionLists, getReadingKey);
    mergedSuggestions.forEach(function (mergedSuggestion) {
        if (mergedSuggestion.columnKind != "newClass") {
            return;
        }
        const readingKey = getReadingKey(mergedSuggestion);
        const parentOptionLists = [];
        sampleSuggestionLists.forEach(function (sampleSuggestions) {
            const sampleReading = sampleSuggestions.find((sampleSuggestion) => getReadingKey(sampleSuggestion) == readingKey);
            if (sampleReading) {
                parentOptionLists.push(sampleReading.parentOptions);
            }
        });
        const mergedParentOptions = mergeOptionLists(parentOptionLists, (parentOption) => parentOption.parentId);
        const mostProbableParent = mergedParentOptions[0];
        mergedSuggestion.parentId = mostProbableParent.parentId;
        mergedSuggestion.parentLabel = mostProbableParent.parentLabel;
        mergedSuggestion.definition = mostProbableParent.definition;
        mergedSuggestion.parentOptions = mergedParentOptions;
    });
    return mergedSuggestions;
}

// { sampleAnswers } of the samples that succeeded, or the HTTP error to answer when every sample fails; a failed or
// cancelled call throws, as it did with a single sample
async function askSamples(askOneSample) {
    const samplePromises = [];
    for (let sampleIndex = 0; sampleIndex < suggestionSampleCount; sampleIndex++) {
        samplePromises.push(askOneSample());
    }
    const sampleOutcomes = await Promise.allSettled(samplePromises);
    const sampleAnswers = [];
    sampleOutcomes.forEach(function (sampleOutcome) {
        if (sampleOutcome.status == "fulfilled" && !sampleOutcome.value.error) {
            sampleAnswers.push(sampleOutcome.value);
        }
    });
    if (sampleAnswers.length > 0) {
        return { sampleAnswers: sampleAnswers };
    }
    const firstOutcome = sampleOutcomes[0];
    if (firstOutcome.status == "rejected") {
        throw firstOutcome.reason;
    }
    return { status: 502, error: firstOutcome.value.error };
}

// { suggestions, llmMilliseconds }, or the HTTP error to answer; when every sample fails, the first failure ends the request
async function suggestColumnClass(request, abortSignal, userInfo) {
    const preparedSource = await getPreparedSource(request.source);
    if (!preparedSource) {
        return { status: 409, error: "the ontologies of " + request.source + " are not prepared, open the tool again" };
    }
    // the first rows of a table may all leave the column empty
    const columnSample = await readColumnSample(request, userInfo);
    // ended during the preparation or the read: no call to the model
    if (abortSignal.aborted) {
        return { status: 499, error: "the request was cancelled" };
    }
    const sampledRequest = { ...request, sampleRows: columnSample.sampleRows };
    const systemPrompt = readFileSync(promptPath, "utf8") + "\n\n# Upper ontologies, most abstract first\n" + preparedSource.classesText;
    const columnKeyRole = getColumnKeyRole(request, preparedSource);
    const columnNoteTexts = [sampleNoteTextByColumnState[columnSample.columnState], columnKeyRole.roleText];
    const writtenNoteTexts = columnNoteTexts.filter((noteText) => noteText);
    const llmStart = Date.now();
    const messageParams = {
        model: suggestionModelId,
        system: systemPrompt,
        messages: [{ role: "user", content: getColumnPrompt(sampledRequest, preparedSource, writtenNoteTexts) }],
        maxTokens: suggestionMaxTokens,
        reasoningEffort: suggestionReasoningEffort,
        isPromptCached: true,
        abortSignal: abortSignal,
    };
    const askedSamples = await askSamples(() => askSample(messageParams, request, preparedSource));
    if (askedSamples.error) {
        return askedSamples;
    }
    const sampleSuggestionLists = askedSamples.sampleAnswers.map((sampleAnswer) => sampleAnswer.suggestions);
    const suggestions = mergeSamples(sampleSuggestionLists);
    // without it the user reads a column left without a class as a failure of the tool
    suggestions.forEach(function (suggestion) {
        if (suggestion.columnKind == "technicalKey") {
            suggestion.definition = columnKeyRole.technicalKeyText;
        }
    });
    const llmMilliseconds = Date.now() - llmStart;
    return { suggestions: suggestions, llmMilliseconds: llmMilliseconds };
}

export { suggestionModelId, suggestionReasoningEffort, suggestionMaxTokens, askSamples, markupCharacterRegex, noClassKinds, isFilledText, readJsonObject, readClassAnswer, getKnownClasses, getCorrectionParams, suggestColumnClass };
