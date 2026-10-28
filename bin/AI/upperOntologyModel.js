import { getAnnotationsQuery, getEnrichedOntologyModel } from "../enrichedOntologyModel.js";
import { callVocablesFunction } from "../remoteCodeRunner.js";

const wellKnownPrefixes = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    owl: "http://www.w3.org/2002/07/owl#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    skos: "http://www.w3.org/2004/02/skos/core#",
    obo: "http://purl.obolibrary.org/obo/",
};
const namespaceRegex = /^(.*[/#])([^/#]+)$/;
const lastNamespaceSegmentRegex = /([^/#]+)[/#]$/;
const nonPrefixCharacterRegex = /[^A-Za-z0-9_-]/g;
const prefixStartRegex = /^[A-Za-z]/;
// IRIs and anonymous nodes only, a definition may hold other angle brackets
const bracketedIriRegex = /<((?:https?|nodeID):[^>\s]+)>/g;
const indent = "    ";
const lineBreakRegex = /\s*[\r\n]+\s*/g;
const annotationLocalNameRegex = /[^/#]+$/;

// the prefixed name of an IRI, its namespace getting a prefix the first time it is met
function getPrefixedName(iri, prefixes, prefixesByNamespace, usedPrefixes) {
    const namespaceMatch = iri.match(namespaceRegex);
    if (!namespaceMatch) {
        return "<" + iri + ">";
    }
    const [, namespace, localName] = namespaceMatch;
    if (!prefixesByNamespace[namespace]) {
        const segmentMatch = namespace.match(lastNamespaceSegmentRegex);
        const namespaceSegment = segmentMatch ? segmentMatch[1] : "ns";
        let prefixName = namespaceSegment.replace(nonPrefixCharacterRegex, "_");
        if (!prefixStartRegex.test(prefixName)) {
            prefixName = "ns" + prefixName;
        }
        let uniquePrefixName = prefixName;
        for (let suffix = 2; prefixes[uniquePrefixName]; suffix++) {
            uniquePrefixName = prefixName + suffix;
        }
        prefixes[uniquePrefixName] = namespace;
        prefixesByNamespace[namespace] = uniquePrefixName;
    }
    usedPrefixes.add(prefixesByNamespace[namespace]);
    return prefixesByNamespace[namespace] + ":" + localName;
}

// one entry per term: IRI and label, then one line per value; IRIs are bracketed, inside Manchester expressions too
function getTermEntry(termIri, label, valuesByFieldLabel) {
    const entryLines = ["<" + termIri + ">" + (label ? ' "' + label + '"' : "")];
    for (const [fieldLabel, values] of valuesByFieldLabel) {
        values.forEach(function (value) {
            entryLines.push(indent + fieldLabel + ": " + value);
        });
    }
    return entryLines.join("\n");
}

function bracketIri(iri) {
    return iri ? ["<" + iri + ">"] : [];
}

// the enriched model of each upper ontology, most abstract first, as compact text: IRIs as prefixed names,
// a term imported by several of them written under the first
async function getUpperOntologyModelText(upperOntologies, userContext) {
    const writtenTerms = new Set();
    let modelText = "";
    for (const upperOntology of upperOntologies) {
        const enrichedModel = await getEnrichedOntologyModel(upperOntology, userContext);
        const classEntries = [];
        const sortedClassIris = Object.keys(enrichedModel.classes).sort();
        for (const classIri of sortedClassIris) {
            if (writtenTerms.has(classIri)) {
                continue;
            }
            writtenTerms.add(classIri);
            const ontologyClass = enrichedModel.classes[classIri];
            classEntries.push(
                getTermEntry(classIri, ontologyClass.label, [
                    ["Definition", ontologyClass.definitions],
                    ["Example", ontologyClass.examples],
                    ["SubClassOf", ontologyClass.axioms.subClassOf],
                    ["EquivalentTo", ontologyClass.axioms.equivalentTo],
                    ["DisjointWith", ontologyClass.axioms.disjointWith],
                    ["DisjointUnionOf", ontologyClass.axioms.disjointUnionOf],
                ]),
            );
        }
        const propertyEntries = [];
        const sortedPropertyIris = Object.keys(enrichedModel.properties).sort();
        for (const propertyIri of sortedPropertyIris) {
            if (writtenTerms.has(propertyIri)) {
                continue;
            }
            writtenTerms.add(propertyIri);
            const property = enrichedModel.properties[propertyIri];
            const constraint = enrichedModel.constraints[propertyIri] || {};
            propertyEntries.push(
                getTermEntry(propertyIri, property.label, [
                    ["Definition", property.definitions],
                    ["Example", property.examples],
                    ["Domain", bracketIri(constraint.domain)],
                    ["Range", bracketIri(constraint.range)],
                    ["InverseOf", bracketIri(property.inverseProp)],
                    ["SubPropertyOf", bracketIri(property.superProp)],
                ]),
            );
        }
        modelText +=
            "\n## " + upperOntology + " (graph " + enrichedModel.graphUri + ")\n\n### Classes\n\n" + classEntries.join("\n") + "\n\n### Object properties\n\n" + propertyEntries.join("\n") + "\n";
    }
    return getPrefixedModelText(modelText, {}).text;
}

// the bracketed IRIs of a model text as prefixed names, and the prefixes they use; a declared prefix named like a well-known one is not used
function getPrefixedModelText(modelText, declaredPrefixes) {
    const prefixes = { ...declaredPrefixes, ...wellKnownPrefixes };
    const prefixesByNamespace = {};
    for (const [prefixName, namespace] of Object.entries(prefixes)) {
        prefixesByNamespace[namespace] = prefixName;
    }
    const usedPrefixes = new Set();
    const prefixedModelText = modelText.replace(bracketedIriRegex, (bracketedIri, iri) => getPrefixedName(iri, prefixes, prefixesByNamespace, usedPrefixes));
    const usedPrefixLines = [];
    for (const prefixName of [...usedPrefixes].sort()) {
        usedPrefixLines.push(prefixName + ": <" + prefixes[prefixName] + ">");
    }
    return { text: "\nPrefixes:\n" + usedPrefixLines.join("\n") + "\n" + prefixedModelText, prefixes: prefixes };
}

function isPropertyOfType(ontologyModel, propertyIri, typeLocalName) {
    return Boolean(ontologyModel.propertyTypes?.[propertyIri]?.[wellKnownPrefixes.owl + typeLocalName]);
}

// nonObjectProperties also holds the annotation properties and the untyped ones
function getDatatypePropertyIris(ontologyModel) {
    const nonObjectPropertyIris = Object.keys(ontologyModel.nonObjectProperties || {});
    return nonObjectPropertyIris.filter((propertyIri) => isPropertyOfType(ontologyModel, propertyIri, "DatatypeProperty"));
}

// the values of the local annotation properties of a graph, by term then by annotation name, English or untagged
async function getLocalAnnotationValues(graphUri, localAnnotationIris, userContext) {
    const valuesByAnnotationByTerm = {};
    if (localAnnotationIris.length == 0) {
        return valuesByAnnotationByTerm;
    }
    const annotationRows = await callVocablesFunction("AxiomExtractor", "execQuery", [getAnnotationsQuery(graphUri, localAnnotationIris)], userContext);
    annotationRows.forEach(function (annotationRow) {
        const annotationName = annotationRow.predicate.match(annotationLocalNameRegex)[0];
        if (!valuesByAnnotationByTerm[annotationRow.term]) {
            valuesByAnnotationByTerm[annotationRow.term] = {};
        }
        const termValuesByAnnotation = valuesByAnnotationByTerm[annotationRow.term];
        if (!termValuesByAnnotation[annotationName]) {
            termValuesByAnnotation[annotationName] = [];
        }
        termValuesByAnnotation[annotationName].push(annotationRow.text.replace(lineBreakRegex, " "));
    });
    // the endpoint returns rows in no stable order, the prompt must not change between two runs
    for (const termValuesByAnnotation of Object.values(valuesByAnnotationByTerm)) {
        Object.values(termValuesByAnnotation).forEach((annotationValues) => annotationValues.sort());
    }
    return valuesByAnnotationByTerm;
}

// read from the graph, whatever answer format produced the version and whatever was edited in it since
async function getValidatedOntologyModelText(tboxSource, termNamespace, termPrefix, userContext) {
    const enrichedModel = await getEnrichedOntologyModel(tboxSource, userContext);
    if (!enrichedModel) {
        return null;
    }
    const typedPropertyIris = Object.keys(enrichedModel.propertyTypes);
    const localAnnotationIris = typedPropertyIris.filter(
        (propertyIri) => propertyIri.indexOf(termNamespace) == 0 && isPropertyOfType(enrichedModel, propertyIri, "AnnotationProperty"),
    );
    const valuesByAnnotationByTerm = await getLocalAnnotationValues(enrichedModel.graphUri, localAnnotationIris, userContext);
    const getAnnotationFields = function (termIri) {
        const annotationFields = Object.entries(valuesByAnnotationByTerm[termIri] || {});
        return annotationFields.sort(([annotationName1], [annotationName2]) => annotationName1.localeCompare(annotationName2));
    };

    const classEntries = [];
    for (const classIri of Object.keys(enrichedModel.classes).sort()) {
        const ontologyClass = enrichedModel.classes[classIri];
        classEntries.push(
            getTermEntry(classIri, ontologyClass.label, [
                ["Definition", ontologyClass.definitions],
                ["SubClassOf", ontologyClass.axioms.subClassOf],
                ["EquivalentTo", ontologyClass.axioms.equivalentTo],
                ["DisjointWith", ontologyClass.axioms.disjointWith],
                ["DisjointUnionOf", ontologyClass.axioms.disjointUnionOf],
                ...getAnnotationFields(classIri),
            ]),
        );
    }
    const objectPropertyEntries = [];
    for (const propertyIri of Object.keys(enrichedModel.properties).sort()) {
        const property = enrichedModel.properties[propertyIri];
        const constraint = enrichedModel.constraints[propertyIri] || {};
        objectPropertyEntries.push(
            getTermEntry(propertyIri, property.label, [
                ["Definition", property.definitions],
                ["Domain", bracketIri(constraint.domain)],
                ["Range", bracketIri(constraint.range)],
                ["InverseOf", bracketIri(property.inverseProp)],
                ["SubPropertyOf", bracketIri(property.superProp)],
                ...getAnnotationFields(propertyIri),
            ]),
        );
    }
    const datatypePropertyIris = getDatatypePropertyIris(enrichedModel);
    const datatypePropertyEntries = [];
    for (const propertyIri of datatypePropertyIris.sort()) {
        const datatypeProperty = enrichedModel.nonObjectProperties[propertyIri];
        datatypePropertyEntries.push(
            getTermEntry(propertyIri, datatypeProperty.label, [
                ["Domain", bracketIri(datatypeProperty.domain)],
                ["Range", bracketIri(datatypeProperty.range)],
                ...getAnnotationFields(propertyIri),
            ]),
        );
    }
    const modelText =
        "\n## " +
        tboxSource +
        " (graph " +
        enrichedModel.graphUri +
        ")\n\n### Classes\n\n" +
        classEntries.join("\n") +
        "\n\n### Object properties\n\n" +
        objectPropertyEntries.join("\n") +
        "\n\n### Datatype properties\n\n" +
        datatypePropertyEntries.join("\n") +
        "\n";
    const classLabelByIri = {};
    for (const [classIri, ontologyClass] of Object.entries(enrichedModel.classes)) {
        classLabelByIri[classIri] = ontologyClass.label;
    }
    const prefixedModel = getPrefixedModelText(modelText, termPrefix ? { [termPrefix]: termNamespace } : {});
    return { text: prefixedModel.text, prefixes: prefixedModel.prefixes, classLabelByIri: classLabelByIri, datatypePropertyIris: datatypePropertyIris };
}

export { wellKnownPrefixes, getDatatypePropertyIris, getUpperOntologyModelText, getValidatedOntologyModelText };
