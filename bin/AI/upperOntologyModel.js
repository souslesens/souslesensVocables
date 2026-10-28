import { getEnrichedOntologyModel } from "../enrichedOntologyModel.js";

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
    const prefixes = { ...wellKnownPrefixes };
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
    return "\nPrefixes:\n" + usedPrefixLines.join("\n") + "\n" + prefixedModelText;
}

export { wellKnownPrefixes, getUpperOntologyModelText };
