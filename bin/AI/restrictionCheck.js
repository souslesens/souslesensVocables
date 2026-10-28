import rdflib from "rdflib";
import { callVocablesFunction } from "../remoteCodeRunner.js";

const rdfNamespace = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const rdfsNamespace = "http://www.w3.org/2000/01/rdf-schema#";
const owlNamespace = "http://www.w3.org/2002/07/owl#";
// hasValue points to an individual, not a class: its property is not checked against a range
const restrictionTargetPredicates = [owlNamespace + "someValuesFrom", owlNamespace + "allValuesFrom", owlNamespace + "onClass"];
// the buckets getAllowedPropertiesBetweenNodes sorts the compatible properties into
const allowedPropertyBuckets = ["both", "domain", "range", "noConstraints"];
const localNameRegex = /[^/#]+$/;

// { class, property, target } of each restriction a class is a subclass of; an anonymous property or target is null
function getStoreRestrictions(store) {
    const restrictions = [];
    store.statementsMatching(null, rdflib.sym(rdfsNamespace + "subClassOf"), null).forEach(function (subClassStatement) {
        const restrictionNode = subClassStatement.object;
        if (!store.holds(restrictionNode, rdflib.sym(rdfNamespace + "type"), rdflib.sym(owlNamespace + "Restriction"))) {
            return;
        }
        const property = store.any(restrictionNode, rdflib.sym(owlNamespace + "onProperty"));
        const targetPredicate = restrictionTargetPredicates.find((predicate) => store.any(restrictionNode, rdflib.sym(predicate)));
        const target = targetPredicate ? store.any(restrictionNode, rdflib.sym(targetPredicate)) : null;
        if (!property || !target) {
            return;
        }
        restrictions.push({
            class: subClassStatement.subject.value,
            property: property.termType == "NamedNode" ? property.value : null,
            target: target.termType == "NamedNode" ? target.value : null,
        });
    });
    return restrictions;
}

function getTurtleRestrictions(turtle, baseUri) {
    const store = rdflib.graph();
    rdflib.parse(turtle, store, baseUri, "text/turtle");
    return getStoreRestrictions(store);
}

// one restriction of a version, found again in the next one
function getRestrictionKey(restriction) {
    return restriction.class + " " + restriction.property + " " + restriction.target;
}

// the upper ontologies and, from one to the next, the sources they import: IOF brings BFO even when only IOF is given
function getImportedOntologies(upperOntologies, userSources) {
    const importedOntologies = [];
    const pendingOntologies = [...upperOntologies];
    while (pendingOntologies.length > 0) {
        const ontology = pendingOntologies.shift();
        if (importedOntologies.includes(ontology) || !userSources[ontology]) {
            continue;
        }
        importedOntologies.push(ontology);
        pendingOntologies.push(...(userSources[ontology].imports || []));
    }
    return importedOntologies;
}

// the status of each link { from, property, to } between two classes, read with getAllowedPropertiesBetweenNodes in checkSource
// and its imports, whose models are given: allowed, notAllowed when the property has a named domain or range that does not fit,
// unchecked when it has none, when the property or the target class is anonymous, or when an ontology is too big for
// OntologyModels to hold its classes
async function getLinkStatuses(checkSource, checkedOntologies, ontologyModels, links, userContext) {
    const constrainedProperties = new Set();
    for (const ontology of checkedOntologies) {
        const constraints = ontologyModels[ontology]?.constraints || {};
        for (const [propertyIri, constraint] of Object.entries(constraints)) {
            if (constraint.domain || constraint.range) {
                constrainedProperties.add(propertyIri);
            }
        }
    }
    // above that size OntologyModels reads the ancestors from an index, which a run graph has not
    const hasOntologyAboveMaxClasses = checkedOntologies.some((ontology) => ontologyModels[ontology]?.classesCount > globalThis.Config.ontologyModelMaxClasses);
    const allowedPropertiesByPair = {};
    if (!hasOntologyAboveMaxClasses) {
        for (const link of links) {
            const pairKey = link.from + " " + link.to;
            if (!link.property || !link.from || !link.to || allowedPropertiesByPair[pairKey]) {
                continue;
            }
            const allowed = await callVocablesFunction("OntologyModels", "getAllowedPropertiesBetweenNodes", [checkSource, [link.from], [link.to], { keepSuperClasses: true }], userContext);
            const allowedProperties = new Set();
            allowedPropertyBuckets.forEach(function (bucket) {
                Object.keys(allowed.constraints[bucket] || {}).forEach((propertyIri) => allowedProperties.add(propertyIri));
            });
            allowedPropertiesByPair[pairKey] = allowedProperties;
        }
    }
    return links.map(function (link) {
        const allowedProperties = allowedPropertiesByPair[link.from + " " + link.to];
        if (allowedProperties && allowedProperties.has(link.property)) {
            return "allowed";
        }
        if (allowedProperties && constrainedProperties.has(link.property)) {
            return "notAllowed";
        }
        return "unchecked";
    });
}

// the label of a term in the given ontology models, else its local name
function getModelLabel(iri, checkedOntologies, ontologyModels) {
    for (const ontology of checkedOntologies) {
        const ontologyModel = ontologyModels[ontology] || {};
        const ontologyTerm = ontologyModel.classes?.[iri] || ontologyModel.properties?.[iri];
        if (ontologyTerm) {
            return ontologyTerm.label;
        }
    }
    return iri.match(localNameRegex)[0];
}

// the restrictions of a run graph checked against the domains and ranges OntologyModels knows for the upper ontologies,
// inherited ones included, the run graph read as a source importing them
async function checkRunRestrictions(turtle, runGraphUri, source, upperOntologies, userContext) {
    const store = rdflib.graph();
    rdflib.parse(turtle, store, runGraphUri, "text/turtle");
    const restrictions = getStoreRestrictions(store);
    if (restrictions.length == 0) {
        return [];
    }
    const checkedOntologies = getImportedOntologies(upperOntologies, userContext.userSources);
    // the first call of the code runner loads its Config, where the run graph is then declared
    const ontologyModels = await callVocablesFunction("OntologyModels", "registerSourcesModel", [checkedOntologies, {}], userContext);
    const checkSource = runGraphUri;
    globalThis.Config.sources[checkSource] = { ...globalThis.Config.sources[source], graphUri: runGraphUri, imports: checkedOntologies };
    let statuses = [];
    try {
        const links = restrictions.map((restriction) => ({ from: restriction.class, property: restriction.property, to: restriction.target }));
        statuses = await getLinkStatuses(checkSource, checkedOntologies, ontologyModels, links, userContext);
    } finally {
        delete globalThis.Config.sources[checkSource];
    }
    function getLabel(iri) {
        const storedLabel = store.any(rdflib.sym(iri), rdflib.sym(rdfsNamespace + "label"));
        return storedLabel ? storedLabel.value : getModelLabel(iri, checkedOntologies, ontologyModels);
    }
    return restrictions.map(function (restriction, restrictionIndex) {
        return {
            ...restriction,
            classLabel: getLabel(restriction.class),
            propertyLabel: restriction.property ? getLabel(restriction.property) : "(anonymous property)",
            targetLabel: restriction.target ? getLabel(restriction.target) : "(class expression)",
            status: statuses[restrictionIndex],
        };
    });
}

export { checkRunRestrictions, getTurtleRestrictions, getRestrictionKey, getImportedOntologies, getLinkStatuses, getModelLabel };
