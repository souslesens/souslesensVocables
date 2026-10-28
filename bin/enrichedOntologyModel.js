import { callVocablesFunction } from "./remoteCodeRunner.js";
// imported after RemoteCodeRunner, which defines the window global this client module assigns itself to
import TriplesToManchester from "../public/vocables/modules/tools/axioms/triplesToManchester.js";
import { ontologyModelsCache, enrichedOntologyModelsCache } from "../api/v1/paths/ontologyModels.js";

const axiomExtractorUrl = new URL("../public/vocables/modules/tools/axioms/axiomExtractor.js", import.meta.url).href;

const rdfsNamespace = "http://www.w3.org/2000/01/rdf-schema#";
const skosNamespace = "http://www.w3.org/2004/02/skos/core#";
const iofAnnotationNamespace = "https://spec.industrialontologies.org/ontology/core/meta/AnnotationVocabulary/";
// the annotation vocabulary of the IOF releases of 2026
const iofConstructAnnotationNamespace = "https://spec.industrialontologies.org/ontology/annotation/";
// BFO defines with skos:definition, IOF with its own annotation vocabulary
const textFieldByPredicate = {
    [skosNamespace + "definition"]: "definitions",
    [iofAnnotationNamespace + "naturalLanguageDefinition"]: "definitions",
    [iofConstructAnnotationNamespace + "naturalLanguageDefinition"]: "definitions",
    [skosNamespace + "example"]: "examples",
};
const axiomFieldByManchesterKeyword = {
    "SubClassOf:": "subClassOf",
    "EquivalentTo:": "equivalentTo",
    "DisjointWith:": "disjointWith",
    "DisjointUnionOf:": "disjointUnionOf",
};
const lineBreakRegex = /\s*[\r\n]+\s*/g;
const localNameRegex = /[^/#]+$/;

// the values of the given annotation predicates on the terms of a graph, English or untagged
function getAnnotationsQuery(graphUri, annotatedPredicates) {
    const bracketedPredicates = annotatedPredicates.map((predicate) => "<" + predicate + ">");
    const annotatedPredicateList = bracketedPredicates.join(", ");
    return (
        "SELECT ?term ?predicate ?text FROM <" +
        graphUri +
        "> WHERE { ?term ?predicate ?text FILTER (?predicate IN (" +
        annotatedPredicateList +
        ") && (lang(?text) = '' || langMatches(lang(?text), 'en'))) }"
    );
}

// the ontology model of a source as OntologyModels builds it, its restrictions filled, each class given its axioms
// in Manchester syntax, each class and object property its definitions and examples
async function getEnrichedOntologyModel(source, userContext) {
    if (enrichedOntologyModelsCache[source]) {
        return enrichedOntologyModelsCache[source];
    }
    let ontologyModel = ontologyModelsCache[source];
    // classesCount is the last key the client writes: without it the model is still being written
    if (!ontologyModel || ontologyModel.classesCount === undefined) {
        const ontologyModels = await callVocablesFunction("OntologyModels", "registerSourcesModel", [source, { noCache: true }], userContext);
        // a source without graphUri gets no model
        if (!ontologyModels[source]) {
            return null;
        }
        // a copy: the runner keeps its own model in its Config and refills it on its next computation
        ontologyModel = structuredClone(ontologyModels[source]);
        ontologyModelsCache[source] = ontologyModel;
    }
    const enrichedModel = structuredClone(ontologyModel);
    if (!enrichedModel.restrictions) {
        enrichedModel.restrictions = {};
    }

    const annotationRows = await callVocablesFunction("AxiomExtractor", "execQuery", [getAnnotationsQuery(enrichedModel.graphUri, Object.keys(textFieldByPredicate))], userContext);
    // the module the runner has just loaded: the axioms it cached for the source may predate the change that emptied the enriched cache
    const { default: AxiomExtractor } = await import(axiomExtractorUrl);
    delete AxiomExtractor.basicAxioms[source];
    const basicAxioms = await callVocablesFunction("AxiomExtractor", "getBasicAxioms", [source], userContext);
    // the axiom rows carry the labels of their terms, the imported ones included, which the model of the source lacks
    const labelByTerm = {};
    for (const axiomRows of Object.values(basicAxioms)) {
        for (const axiomRow of axiomRows) {
            if (axiomRow.sLabel) {
                labelByTerm[axiomRow.s] = axiomRow.sLabel;
            }
            if (axiomRow.pLabel) {
                labelByTerm[axiomRow.p] = axiomRow.pLabel;
            }
            if (axiomRow.oLabel) {
                labelByTerm[axiomRow.o] = axiomRow.oLabel;
            }
        }
    }

    // the parents the Lineage tree is indexed with, read like the index without the imports: [source, ..., direct parent],
    // an anomaly marker as direct parent of a class with several named superclasses or in a loop
    let taxonomyClassesMap = {};
    // a model withheld for its size has no class to place
    if (Object.keys(enrichedModel.classes).length > 0) {
        try {
            const taxonomy = await callVocablesFunction("Sparql_generic", "getSourceTaxonomy", [source, { withoutImports: true }], userContext);
            taxonomyClassesMap = taxonomy.classesMap;
        } catch (taxonomyError) {
            console.warn("taxonomy of " + source + " not read, its classes are ordered by label only: " + taxonomyError.message);
        }
    }

    for (const [classIri, ontologyClass] of Object.entries(enrichedModel.classes)) {
        const taxonomyClass = taxonomyClassesMap[classIri];
        // a class without label is left out of the taxonomy
        ontologyClass.parents = taxonomyClass ? taxonomyClass.parents : [source];
        ontologyClass.definitions = [];
        ontologyClass.examples = [];
        ontologyClass.axioms = { subClassOf: [], equivalentTo: [], disjointWith: [], disjointUnionOf: [] };
        const classAxioms = basicAxioms[classIri] || [];
        for (const classAxiom of classAxioms) {
            const restrictionRows = classAxiom.p == rdfsNamespace + "subClassOf" ? basicAxioms[classAxiom.o] || [] : [];
            for (const restrictionRow of restrictionRows) {
                // an anonymous property, inverse of a named one, keys no restriction
                if (restrictionRow.type != "Restriction" || restrictionRow.p.indexOf("http") != 0) {
                    continue;
                }
                if (!enrichedModel.restrictions[restrictionRow.p]) {
                    enrichedModel.restrictions[restrictionRow.p] = [];
                }
                // a restriction already added by Lineage
                if (enrichedModel.restrictions[restrictionRow.p].some((knownRestriction) => knownRestriction.blankNodeId == classAxiom.o)) {
                    continue;
                }
                const rangeClass = enrichedModel.classes[restrictionRow.o];
                const restriction = {
                    domain: classIri,
                    range: restrictionRow.o,
                    domainLabel: ontologyClass.label,
                    rangeLabel: rangeClass ? rangeClass.label : restrictionRow.oLabel || null,
                    constraintType: restrictionRow.constraintType,
                    constraintTypeLabel: restrictionRow.constraintType.match(localNameRegex)[0],
                    blankNodeId: classAxiom.o,
                };
                if (restrictionRow.cardinalityValue !== undefined) {
                    restriction.cardinalityValue = restrictionRow.cardinalityValue;
                }
                enrichedModel.restrictions[restrictionRow.p].push(restriction);
            }
        }
        if (classAxioms.length == 0) {
            continue;
        }
        const axiomTriples = await callVocablesFunction("AxiomExtractor", "getClassAxiomsTriples", [source, classIri], userContext);
        // TriplesToManchester writes a term by the label its triple carries, by its IRI otherwise
        const labelledAxiomTriples = axiomTriples.map((axiomTriple) => ({
            ...axiomTriple,
            sLabel: labelByTerm[axiomTriple.subject],
            pLabel: labelByTerm[axiomTriple.predicate],
            oLabel: labelByTerm[axiomTriple.object],
        }));
        let axiomsBySubject = {};
        try {
            axiomsBySubject = TriplesToManchester.getAxiomsBySubject(labelledAxiomTriples);
        } catch (conversionError) {
            // a class whose axioms hold no subClassOf, equivalentClass nor disjointWith root
            continue;
        }
        const manchesterAxioms = axiomsBySubject[classIri] || {};
        for (const [manchesterKeyword, expressions] of Object.entries(manchesterAxioms)) {
            ontologyClass.axioms[axiomFieldByManchesterKeyword[manchesterKeyword]].push(...expressions);
        }
    }

    for (const property of Object.values(enrichedModel.properties)) {
        property.definitions = [];
        property.examples = [];
    }
    annotationRows.forEach(function (annotationRow) {
        const term = enrichedModel.classes[annotationRow.term] || enrichedModel.properties[annotationRow.term];
        if (!term) {
            return;
        }
        const textField = textFieldByPredicate[annotationRow.predicate];
        const annotationText = annotationRow.text.replace(lineBreakRegex, " ");
        if (!term[textField].includes(annotationText)) {
            term[textField].push(annotationText);
        }
    });

    enrichedOntologyModelsCache[source] = enrichedModel;
    return enrichedModel;
}

export { getAnnotationsQuery, getEnrichedOntologyModel };
