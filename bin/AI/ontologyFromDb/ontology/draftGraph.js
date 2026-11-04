import { writeFile } from "fs/promises";
import { createHash, randomBytes } from "crypto";
import rdflib from "rdflib";
import { rdfDataModel } from "../../../../model/rdfData.js";
import { getDraftGraphUri, updateGraphTriples, deleteGenuineBlankNodeTriples } from "./ontologyRuns.js";
import { getTermNamespace, getRestrictionNodeKey, restrictionKinds, cardinalityKinds, localAnnotationProperties, datatypeRanges } from "./ontologyAnswer.js";
import { isAnonymousNode, tryCheckRunRestrictions } from "./restrictionCheck.js";
import { wellKnownPrefixes } from "../upperOntologyModel.js";

// once loaded, the draft is the reference of the ontology: the whiteboard and the chatbot edit it, the checks and the validation read it

// a whiteboard edit records who made it and when: provenance, not ontology
const editProvenancePredicates = [
    "http://purl.org/dc/terms/creator",
    "http://purl.org/dc/terms/created",
    "http://purl.org/dc/terms/source",
    "https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status",
];
// the default of Config.sousLeSensVocablesGraphUri, which Lineage_createRelation.getCommonMetaDataTriples prefixes its options with
const editOptionPredicatePrefix = "http://data.souslesens.org/property#";
const localNameRegex = /[^/#]+$/;

// every triple of the graph as N-Triples, read in one query: a blank node label only holds inside one query
async function readGraphTriples(graphUri) {
    const tripleCount = await rdfDataModel.getTripleCount(graphUri);
    const graphTriples = tripleCount > 0 ? await rdfDataModel.getGraphPartNt(graphUri, tripleCount, 0) : "";
    return graphTriples;
}

// a genuine blank node cannot be reached from one query to the next, and sparql_generic.js writes one for an edit whose random id is all digits:
// the draft holds IRIs <_:b...> only. Inserted before the delete, a failure in between leaves a duplicate rather than a loss
async function readDraftTriples(graphUri) {
    const graphTriples = await readGraphTriples(graphUri);
    const store = rdflib.graph();
    rdflib.parse(graphTriples, store, graphUri, "text/turtle");
    const blankNodeStatements = store.statements.filter((statement) => statement.subject.termType == "BlankNode" || statement.object.termType == "BlankNode");
    if (blankNodeStatements.length == 0) {
        return graphTriples;
    }
    const iriByBlankNode = {};
    function toNamedNodeText(term) {
        if (term.termType != "BlankNode") {
            return term.toNT();
        }
        iriByBlankNode[term.value] = iriByBlankNode[term.value] ?? "_:b" + randomBytes(8).toString("hex");
        return "<" + iriByBlankNode[term.value] + ">";
    }
    const namedTriples = blankNodeStatements.map((statement) => toNamedNodeText(statement.subject) + " " + statement.predicate.toNT() + " " + toNamedNodeText(statement.object) + " .");
    await updateGraphTriples(graphUri, [], namedTriples);
    await deleteGenuineBlankNodeTriples(graphUri);
    return readGraphTriples(graphUri);
}

// sorted lines: the triple store returns them in no fixed order
function getGraphHash(graphTriples) {
    const graphLines = graphTriples.split("\n");
    const sortedLines = graphLines.sort();
    const graphHash = createHash("sha256").update(sortedLines.join("\n")).digest("hex");
    return graphHash;
}

// the graph in the answer format the revision agent edits, the inverse of getAnswerTurtle. What that format cannot hold is
// listed in notCarried and left alone by a change of the answer; problems lists what the graph shows wrong, in the words of getAnswerTurtle where it has them.
// carriedTriples are what the answer states, graphTerms the IRIs getAnswerTurtle keeps for them
function getGraphAnswer(graphTriples, graphUri, termNamespace, upperOntologyGraphUris, report) {
    const rdf = rdflib.Namespace(wellKnownPrefixes.rdf);
    const rdfs = rdflib.Namespace(wellKnownPrefixes.rdfs);
    const owl = rdflib.Namespace(wellKnownPrefixes.owl);
    const skos = rdflib.Namespace(wellKnownPrefixes.skos);
    const local = rdflib.Namespace(termNamespace);
    const store = rdflib.graph();
    rdflib.parse(graphTriples, store, graphUri, "text/turtle");
    const carriedStatements = new Set();
    // read to be listed as one line, not stated by the answer
    const listedStatements = new Set();
    const restrictionNodeByKey = {};
    const problems = new Set();
    const notCarried = [];

    function readStatements(subject, predicate, object) {
        const statements = store.statementsMatching(subject, predicate, object);
        statements.forEach((statement) => carriedStatements.add(statement));
        return statements;
    }
    function readTextList(subject, predicate) {
        const textStatements = readStatements(subject, predicate, null);
        const texts = textStatements.map((statement) => statement.object.value);
        const answerTexts = texts.length > 0 ? texts : undefined;
        return answerTexts;
    }
    // a single text stays a string, as the model writes it; several texts, added in the whiteboard, stay a list
    function readTexts(subject, predicate) {
        const texts = readTextList(subject, predicate) ?? [];
        const answerTexts = texts.length > 1 ? texts : texts[0];
        return answerTexts;
    }
    function getTypedNodes(typeTerm) {
        const typeStatements = store.statementsMatching(null, rdf("type"), typeTerm);
        const typedNodes = typeStatements.map((statement) => statement.subject);
        return typedNodes;
    }

    // what getAnswerTurtle writes on the ontology node, from the ontologyComment; another statement there is listed
    const ontologyNodes = getTypedNodes(owl("Ontology"));
    const ontologyComment = ontologyNodes.length > 0 ? readTexts(ontologyNodes[0], rdfs("comment")) : undefined;
    for (const ontologyNode of ontologyNodes) {
        for (const ontologyPredicate of [rdf("type"), rdfs("label")]) {
            readStatements(ontologyNode, ontologyPredicate, null);
        }
        for (const upperOntologyGraphUri of upperOntologyGraphUris) {
            readStatements(ontologyNode, owl("imports"), rdflib.sym(upperOntologyGraphUri));
        }
    }
    for (const annotationName of localAnnotationProperties) {
        readStatements(local(annotationName), null, null);
    }

    // a local term is named by its label in the answer, an imported one by its IRI
    const classNodes = getTypedNodes(owl("Class"));
    const datatypePropertyNodes = getTypedNodes(owl("DatatypeProperty"));
    const individualNodes = getTypedNodes(owl("NamedIndividual"));
    // rdflib gives each statement its own node object: a group is found again by its IRI
    const groupNodeByIri = {};
    for (const memberStatement of store.statementsMatching(null, rdfs("member"), null)) {
        groupNodeByIri[memberStatement.subject.value] = memberStatement.subject;
    }
    const groupNodes = Object.values(groupNodeByIri);
    const labelByIri = {};
    const labelStatementByIri = {};
    for (const localNode of [...classNodes, ...datatypePropertyNodes, ...individualNodes, ...groupNodes]) {
        // the answer holds one label: a second one, added in the whiteboard, is listed
        const labelStatement = store.statementsMatching(localNode, rdfs("label"), null)[0];
        labelByIri[localNode.value] = labelStatement ? labelStatement.object.value : localNode.value;
        labelStatementByIri[localNode.value] = labelStatement;
    }
    // a group has no type in the answer format: its types stay uncarried, then listed
    function readTerm(localNode, typeTerm) {
        if (typeTerm) {
            readStatements(localNode, rdf("type"), typeTerm);
        }
        if (labelStatementByIri[localNode.value]) {
            carriedStatements.add(labelStatementByIri[localNode.value]);
        }
    }
    // the whiteboard names a new term in the namespace of the version graph, the generation in the namespace of the source
    function getReference(referencedNode) {
        const iri = referencedNode.value;
        const isLocalNamespace = iri.startsWith(termNamespace) || iri.startsWith(graphUri);
        if (labelByIri[iri] === undefined && isLocalNamespace) {
            problems.add("reference to no local term: " + iri);
        }
        const reference = labelByIri[iri] ?? iri;
        return reference;
    }

    // a restriction of another shape stays uncarried, then listed
    function readRestriction(classNode, restrictionNode) {
        const restrictionKind = restrictionKinds.find((kind) => store.any(restrictionNode, owl(kind)));
        const property = store.any(restrictionNode, owl("onProperty"));
        if (!restrictionKind || !property || isAnonymousNode(property)) {
            return null;
        }
        const isCardinality = cardinalityKinds.includes(restrictionKind);
        const target = isCardinality ? store.any(restrictionNode, owl("onClass")) : store.any(restrictionNode, owl(restrictionKind));
        const cardinality = isCardinality ? Number(store.any(restrictionNode, owl(restrictionKind)).value) : null;
        if (!target || isAnonymousNode(target) || (isCardinality && !Number.isInteger(cardinality))) {
            return null;
        }
        readStatements(restrictionNode, rdf("type"), owl("Restriction"));
        readStatements(restrictionNode, owl("onProperty"), null);
        readStatements(restrictionNode, owl(restrictionKind), null);
        restrictionNodeByKey[getRestrictionNodeKey(classNode.value, property.value, restrictionKind, target.value, isCardinality ? cardinality : null)] = restrictionNode.value;
        const restriction = { property: getReference(property), kind: restrictionKind, target: getReference(target) };
        if (isCardinality) {
            readStatements(restrictionNode, owl("onClass"), null);
            restriction.cardinality = cardinality;
        }
        return restriction;
    }
    function getRestrictionSortKey(restriction) {
        const restrictionSortKey = restriction.target + " " + restriction.property + " " + restriction.kind;
        return restrictionSortKey;
    }
    function byLabel(leftNode, rightNode) {
        const labelOrder = labelByIri[leftNode.value].localeCompare(labelByIri[rightNode.value]);
        return labelOrder;
    }

    // sorted on their own values: the order the triple store returns changes from one reading to the next
    const classes = [];
    for (const classNode of [...classNodes].sort(byLabel)) {
        const classLabel = labelByIri[classNode.value];
        readTerm(classNode, owl("Class"));
        const parents = [];
        const restrictions = [];
        for (const subClassStatement of store.statementsMatching(classNode, rdfs("subClassOf"), null)) {
            const superClassNode = subClassStatement.object;
            if (!isAnonymousNode(superClassNode)) {
                parents.push(getReference(superClassNode));
                carriedStatements.add(subClassStatement);
                continue;
            }
            const restriction = readRestriction(classNode, superClassNode);
            carriedStatements.add(subClassStatement);
            if (restriction) {
                restrictions.push(restriction);
                continue;
            }
            listedStatements.add(subClassStatement);
            // listed as one line rather than as statements on a blank node
            const restrictionParts = [];
            for (const restrictionStatement of readStatements(superClassNode, null, null)) {
                listedStatements.add(restrictionStatement);
                const predicateName = restrictionStatement.predicate.value.match(localNameRegex)[0];
                const objectText = labelByIri[restrictionStatement.object.value] ?? restrictionStatement.object.value;
                restrictionParts.push(predicateName + " " + objectText);
            }
            notCarried.push(classLabel + ": restriction the answer format cannot hold (" + restrictionParts.join(", ") + ")");
        }
        if (parents.length == 0) {
            problems.add("class without parent: " + classLabel);
        }
        const sortedParents = parents.sort();
        const sortedRestrictions = restrictions.sort((left, right) => getRestrictionSortKey(left).localeCompare(getRestrictionSortKey(right)));

        const datatypeProperties = [];
        const classPropertyNodes = datatypePropertyNodes.filter((propertyNode) => store.holds(propertyNode, rdfs("domain"), classNode));
        for (const propertyNode of classPropertyNodes.sort(byLabel)) {
            const propertyLabel = labelByIri[propertyNode.value];
            readTerm(propertyNode, owl("DatatypeProperty"));
            readStatements(propertyNode, rdfs("domain"), classNode);
            // the generation derives the notation of a datatype property from its columns
            readStatements(propertyNode, skos("notation"), null);
            const domainNodes = store.each(propertyNode, rdfs("domain"), null);
            if (domainNodes.length > 1) {
                const domainLabels = domainNodes.map((domainNode) => labelByIri[domainNode.value] ?? domainNode.value);
                problems.add("datatype property on several classes, its domains intersect: " + propertyLabel + " (" + domainLabels.join(", ") + ")");
            }
            const rangeNode = store.any(propertyNode, rdfs("range"));
            readStatements(propertyNode, rdfs("range"), null);
            const range = rangeNode ? rangeNode.value.replace(wellKnownPrefixes.xsd, "") : undefined;
            if (!datatypeRanges.includes(range)) {
                problems.add("range not written on " + propertyLabel + ": " + range);
            }
            datatypeProperties.push({ label: propertyLabel, range: range, columns: readTextList(propertyNode, local("sourceColumn")) });
        }

        classes.push({
            label: classLabel,
            // a class given a second parent in the whiteboard keeps both
            parent: sortedParents.length > 1 ? sortedParents : sortedParents[0],
            definition: readTexts(classNode, skos("definition")),
            altLabels: readTextList(classNode, skos("altLabel")),
            notation: readTexts(classNode, skos("notation")),
            identifyingColumns: readTextList(classNode, local("identifyingColumn")),
            sourceColumns: readTextList(classNode, local("sourceColumn")),
            interpretationStatus: readTexts(classNode, local("interpretationStatus")),
            restrictions: sortedRestrictions.length > 0 ? sortedRestrictions : undefined,
            datatypeProperties: datatypeProperties.length > 0 ? datatypeProperties : undefined,
        });
    }

    const individuals = [];
    for (const individualNode of [...individualNodes].sort(byLabel)) {
        const individualLabel = labelByIri[individualNode.value];
        readTerm(individualNode, owl("NamedIndividual"));
        const individualTypes = store.each(individualNode, rdf("type"), null);
        const classTypes = individualTypes.filter((typeNode) => !typeNode.equals(owl("NamedIndividual")));
        // the answer holds one type: the others stay uncarried, then listed
        const sortedClassTypes = classTypes.sort((leftNode, rightNode) => leftNode.value.localeCompare(rightNode.value));
        if (sortedClassTypes.length == 0) {
            problems.add("individual without type: " + individualLabel);
        } else {
            readStatements(individualNode, rdf("type"), sortedClassTypes[0]);
        }
        individuals.push({
            label: individualLabel,
            type: sortedClassTypes.length > 0 ? getReference(sortedClassTypes[0]) : undefined,
            notation: readTexts(individualNode, skos("notation")),
        });
    }

    const groups = [];
    for (const groupNode of groupNodes.sort(byLabel)) {
        readTerm(groupNode, null);
        const groupMemberStatements = readStatements(groupNode, rdfs("member"), null);
        const memberNodes = groupMemberStatements.map((statement) => statement.object);
        groups.push({ label: labelByIri[groupNode.value], notation: readTexts(groupNode, skos("notation")), members: memberNodes.map(getReference) });
    }

    for (const statement of store.statements) {
        const isEditProvenance = editProvenancePredicates.includes(statement.predicate.value) || statement.predicate.value.startsWith(editOptionPredicatePrefix);
        if (carriedStatements.has(statement) || isEditProvenance) {
            continue;
        }
        const subjectText = labelByIri[statement.subject.value] ?? statement.subject.value;
        const objectText = labelByIri[statement.object.value] ?? statement.object.value;
        notCarried.push(subjectText + " " + statement.predicate.value + " " + objectText);
    }
    const ontologyAnswer = { ontologyComment: ontologyComment, classes: classes, individuals: individuals, groups: groups, report: report ?? undefined };
    const iriByLabel = {};
    for (const [iri, label] of Object.entries(labelByIri)) {
        iriByLabel[label] = iri;
    }
    const carriedTriples = [];
    const uncarriedStatements = [];
    for (const statement of store.statements) {
        if (carriedStatements.has(statement) && !listedStatements.has(statement)) {
            carriedTriples.push(statement.toNT());
        } else {
            uncarriedStatements.push(statement);
        }
    }
    const graphAnswer = {
        ontologyAnswer: ontologyAnswer,
        problems: [...problems],
        notCarried: notCarried,
        carriedTriples: carriedTriples,
        uncarriedStatements: uncarriedStatements,
        graphTerms: { iriByLabel: iriByLabel, restrictionNodeByKey: restrictionNodeByKey },
    };
    return graphAnswer;
}

// the triples to delete and to insert for the graph to state an answer: what the answer does not state stays, unless its subject is a term the answer no longer holds
function getGraphChange(graphAnswer, answerTurtle, graphUri) {
    const answerStore = rdflib.graph();
    rdflib.parse(answerTurtle, answerStore, graphUri, "text/turtle");
    const answerTriples = answerStore.statements.map((statement) => statement.toNT());
    const answerTripleSet = new Set(answerTriples);
    const answerSubjects = new Set(answerStore.statements.map((statement) => statement.subject.value));
    const uncarriedTriples = graphAnswer.uncarriedStatements.map((statement) => statement.toNT());
    const graphTripleSet = new Set([...graphAnswer.carriedTriples, ...uncarriedTriples]);
    const carriedSubjects = new Set();
    for (const carriedTriple of graphAnswer.carriedTriples) {
        carriedSubjects.add(carriedTriple.substring(1, carriedTriple.indexOf(">")));
    }
    const droppedStatements = graphAnswer.uncarriedStatements.filter((statement) => carriedSubjects.has(statement.subject.value) && !answerSubjects.has(statement.subject.value));
    const droppedTriples = droppedStatements.map((statement) => statement.toNT());
    const removedTriples = graphAnswer.carriedTriples.filter((carriedTriple) => !answerTripleSet.has(carriedTriple));
    const graphChange = {
        deletedTriples: [...removedTriples, ...droppedTriples],
        insertedTriples: answerTriples.filter((answerTriple) => !graphTripleSet.has(answerTriple)),
        droppedTriples: droppedTriples,
    };
    return graphChange;
}

// a draft that changed since its last check is checked again, without any LLM call
async function updateGraphCheck(found, source, graphTriples) {
    const savedRun = found.run.savedRun;
    const graphHash = getGraphHash(graphTriples);
    if (!savedRun || savedRun.graphHash == graphHash) {
        return;
    }
    const graphUri = getDraftGraphUri(found.sourceConfig.graphUri);
    const upperOntologies = (savedRun.upperOntologies || []).filter((upperOntology) => found.userSources[upperOntology]);
    const upperOntologyGraphUris = upperOntologies.map((upperOntology) => found.userSources[upperOntology].graphUri);
    const userContext = { user: found.userInfo, userSources: found.userSources };
    savedRun.graphProblems = getGraphAnswer(graphTriples, graphUri, getTermNamespace(found.sourceConfig), upperOntologyGraphUris, null).problems;
    const restrictionCheckResult = await tryCheckRunRestrictions(graphTriples, graphUri, source, upperOntologies, userContext);
    savedRun.restrictionChecks = restrictionCheckResult.restrictionChecks;
    savedRun.restrictionCheckError = restrictionCheckResult.restrictionCheckError;
    // a check that failed runs again at the next opening
    savedRun.graphHash = savedRun.restrictionChecks ? graphHash : null;
    await writeFile(found.run.jsonPath, JSON.stringify(savedRun, null, 2));
}

export { readDraftTriples, getGraphHash, getGraphAnswer, getGraphChange, updateGraphCheck };
