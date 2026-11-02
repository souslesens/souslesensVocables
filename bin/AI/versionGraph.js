import { writeFile } from "fs/promises";
import { createHash } from "crypto";
import rdflib from "rdflib";
import { rdfDataModel } from "../../model/rdfData.js";
import { getRunGraphUri } from "./ontologyRuns.js";
import { getTermNamespace, restrictionKinds, cardinalityKinds, localAnnotationProperties, datatypeRanges } from "./ontologyAnswer.js";
import { tryCheckRunRestrictions } from "./restrictionCheck.js";
import { wellKnownPrefixes } from "./upperOntologyModel.js";

// once loaded, the graph of a version is its reference: the whiteboard edits it, its checks and its revisions read it

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

// sorted lines: the triple store returns them in no fixed order
function getGraphHash(graphTriples) {
    const graphLines = graphTriples.split("\n");
    const sortedLines = graphLines.sort();
    const graphHash = createHash("sha256").update(sortedLines.join("\n")).digest("hex");
    return graphHash;
}

// the graph in the answer format the revision agent edits, the inverse of getAnswerTurtle. What that format cannot hold is
// listed in notCarried; problems lists what the graph shows wrong, in the words of getAnswerTurtle where it has them
function getGraphAnswer(graphTriples, graphUri, termNamespace, upperOntologyGraphUris, report) {
    const rdf = rdflib.Namespace(wellKnownPrefixes.rdf);
    const rdfs = rdflib.Namespace(wellKnownPrefixes.rdfs);
    const owl = rdflib.Namespace(wellKnownPrefixes.owl);
    const skos = rdflib.Namespace(wellKnownPrefixes.skos);
    const local = rdflib.Namespace(termNamespace);
    const store = rdflib.graph();
    rdflib.parse(graphTriples, store, graphUri, "text/turtle");
    const carriedStatements = new Set();
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

    // what getAnswerTurtle writes on the ontology node, from the ontologyComment and the run; another statement there is listed
    const ontologyNodes = getTypedNodes(owl("Ontology"));
    const ontologyComment = ontologyNodes.length > 0 ? readTexts(ontologyNodes[0], rdfs("comment")) : undefined;
    for (const ontologyNode of ontologyNodes) {
        for (const ontologyPredicate of [rdf("type"), rdfs("label"), owl("versionIRI"), owl("versionInfo")]) {
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
    function readRestriction(restrictionNode) {
        const restrictionKind = restrictionKinds.find((kind) => store.any(restrictionNode, owl(kind)));
        const property = store.any(restrictionNode, owl("onProperty"));
        if (!restrictionKind || !property || property.termType != "NamedNode") {
            return null;
        }
        const isCardinality = cardinalityKinds.includes(restrictionKind);
        const target = isCardinality ? store.any(restrictionNode, owl("onClass")) : store.any(restrictionNode, owl(restrictionKind));
        const cardinality = isCardinality ? Number(store.any(restrictionNode, owl(restrictionKind)).value) : null;
        if (!target || target.termType != "NamedNode" || (isCardinality && !Number.isInteger(cardinality))) {
            return null;
        }
        readStatements(restrictionNode, rdf("type"), owl("Restriction"));
        readStatements(restrictionNode, owl("onProperty"), null);
        readStatements(restrictionNode, owl(restrictionKind), null);
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
            if (superClassNode.termType == "NamedNode") {
                parents.push(getReference(superClassNode));
                carriedStatements.add(subClassStatement);
                continue;
            }
            const restriction = readRestriction(superClassNode);
            carriedStatements.add(subClassStatement);
            if (restriction) {
                restrictions.push(restriction);
                continue;
            }
            // listed as one line rather than as statements on a blank node
            const restrictionParts = [];
            for (const restrictionStatement of readStatements(superClassNode, null, null)) {
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
    const graphAnswer = { ontologyAnswer: ontologyAnswer, problems: [...problems], notCarried: notCarried };
    return graphAnswer;
}

// a version whose graph changed since its last check is checked again on its graph, and its .ttl rewritten from it
async function updateGraphCheck(found, source, graphTriples) {
    const savedRun = found.run.savedRun;
    const graphHash = getGraphHash(graphTriples);
    if (!savedRun || savedRun.graphHash == graphHash) {
        return;
    }
    const graphUri = getRunGraphUri(found.sourceConfig.graphUri, found.run.runTimestamp);
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
    await writeFile(found.run.turtlePath, graphTriples);
}

export { readGraphTriples, getGraphAnswer, updateGraphCheck };
