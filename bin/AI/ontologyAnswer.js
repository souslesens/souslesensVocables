import rdflib from "rdflib";
import llmClient from "./llmClient.js";
import Util from "../util.js";
import { trailingSlashRegex, listSourceRuns, readLastOntologyVersion } from "./ontologyRuns.js";
import { wellKnownPrefixes } from "./upperOntologyModel.js";

// the compact JSON answer the ontology prompts ask for, the calls that write it, and its Turtle
// OpenRouter ids, fixed here: the page does not choose the models
const ontologyModelId = "anthropic/claude-opus-5.5";
const ontologyReasoningEffort = "medium";
// the most OpenRouter lets the Claude 5.5 models write, reasoning included: a run is never cut by a limit of ours
const modelMaxOutputTokens = 128000;
const firstOntologyVersion = "0.1.0";
const restrictionKinds = ["someValuesFrom", "allValuesFrom", "hasValue", "qualifiedCardinality", "minQualifiedCardinality", "maxQualifiedCardinality"];
const cardinalityKinds = ["qualifiedCardinality", "minQualifiedCardinality", "maxQualifiedCardinality"];
const localAnnotationProperties = ["identifyingColumn", "sourceColumn", "interpretationStatus"];
// XSD local names the prompt allows as datatype property ranges
const datatypeRanges = ["string", "date", "dateTime", "decimal", "integer", "boolean"];
const absoluteIriRegex = /^https?:\/\//;
const jsonBlockRegex = /```json[ \t]*\r?\n([\s\S]*?)```/;

// llmClient.createMessage as a promise, its token usage added to the given counter
function createMessage(messageParams, usageCounter) {
    return new Promise((resolve, reject) => {
        llmClient.createMessage(messageParams, function (error, completion) {
            if (error) {
                return reject(error);
            }
            usageCounter.input_tokens += completion.usage?.input_tokens ?? 0;
            usageCounter.output_tokens += completion.usage?.output_tokens ?? 0;
            resolve(completion);
        });
    });
}

// an answer stopped by the output limit, in words a reader of the page understands; null when the answer is whole
function getCutAnswerError(completion, answerText) {
    if (completion?.stop_reason != "max_tokens") {
        return null;
    }
    const outputTokens = completion.usage?.output_tokens ?? 0;
    if (!answerText) {
        return "the model spent its whole output limit (" + outputTokens + " tokens) reasoning and wrote no answer";
    }
    return "the model reached its output limit (" + outputTokens + " tokens) before finishing its answer, after " + answerText.length + " characters";
}

function getAnswerText(completion) {
    const textBlocks = completion ? completion.content.filter((block) => block.type == "text") : [];
    const answerTexts = textBlocks.map((block) => block.text);
    return answerTexts.join("\n");
}

// the IRIs of the terms are built on baseUri, which may differ from the graph
// the local name of a term built from its label, as SousLeSens builds IRIs: the Turtle of a version and its mapping share it
function getLocalName(label) {
    return Util.formatStringForTriple(String(label), true);
}

function getTermNamespace(sourceConfig) {
    return sourceConfig.baseUri || sourceConfig.graphUri;
}

// the compact answer of the model as Turtle, local IRIs built from labels as SousLeSens builds them;
// what cannot be written is listed in problems rather than guessed
function getAnswerTurtle(ontologyAnswer, source, sourceConfig, termNamespace, upperOntologyGraphUris, ontologyVersion) {
    const rdf = rdflib.Namespace(wellKnownPrefixes.rdf);
    const rdfs = rdflib.Namespace(wellKnownPrefixes.rdfs);
    const owl = rdflib.Namespace(wellKnownPrefixes.owl);
    const xsd = rdflib.Namespace(wellKnownPrefixes.xsd);
    const skos = rdflib.Namespace(wellKnownPrefixes.skos);
    const local = rdflib.Namespace(termNamespace);
    const store = rdflib.graph();
    const problems = [];
    const classes = ontologyAnswer.classes || [];
    const individuals = ontologyAnswer.individuals || [];
    const groups = ontologyAnswer.groups || [];

    const localLabels = new Set();
    const labelsByLocalName = {};
    const datatypeProperties = classes.flatMap((ontologyClass) => ontologyClass.datatypeProperties || []);
    [...classes, ...individuals, ...groups, ...datatypeProperties].forEach(function (localTerm) {
        const localName = getLocalName(localTerm.label);
        if (labelsByLocalName[localName] !== undefined || localName == "") {
            problems.push("local terms sharing the IRI " + termNamespace + localName + ": " + labelsByLocalName[localName] + ", " + localTerm.label);
        }
        labelsByLocalName[localName] = localTerm.label;
        localLabels.add(localTerm.label);
    });
    function getTerm(reference) {
        if (absoluteIriRegex.test(reference)) {
            return rdflib.sym(reference);
        }
        if (!localLabels.has(reference)) {
            problems.push("reference to no local term: " + reference);
        }
        return local(getLocalName(reference));
    }
    function addTexts(subject, predicate, textOrTexts, language) {
        const texts = Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts];
        const writtenTexts = texts.filter((text) => typeof text == "string" && text != "");
        writtenTexts.forEach((text) => store.add(subject, predicate, rdflib.literal(text, language)));
    }

    const ontology = rdflib.sym(sourceConfig.graphUri);
    store.add(ontology, rdf("type"), owl("Ontology"));
    store.add(ontology, rdfs("label"), rdflib.literal(source));
    addTexts(ontology, rdfs("comment"), ontologyAnswer.ontologyComment, "en");
    store.add(ontology, owl("versionIRI"), rdflib.sym(sourceConfig.graphUri.replace(trailingSlashRegex, "") + "/version/" + ontologyVersion));
    store.add(ontology, owl("versionInfo"), rdflib.literal(ontologyVersion));
    upperOntologyGraphUris.forEach((graphUri) => store.add(ontology, owl("imports"), rdflib.sym(graphUri)));
    localAnnotationProperties.forEach(function (annotationName) {
        store.add(local(annotationName), rdf("type"), owl("AnnotationProperty"));
        store.add(local(annotationName), rdfs("label"), rdflib.literal(annotationName, "en"));
    });

    classes.forEach(function (ontologyClass) {
        const classTerm = getTerm(ontologyClass.label);
        store.add(classTerm, rdf("type"), owl("Class"));
        store.add(classTerm, rdfs("label"), rdflib.literal(ontologyClass.label, "en"));
        if (ontologyClass.parent) {
            store.add(classTerm, rdfs("subClassOf"), getTerm(ontologyClass.parent));
        } else {
            problems.push("class without parent: " + ontologyClass.label);
        }
        addTexts(classTerm, skos("definition"), ontologyClass.definition, "en");
        addTexts(classTerm, skos("altLabel"), ontologyClass.altLabels, "en");
        addTexts(classTerm, skos("notation"), ontologyClass.notation);
        addTexts(classTerm, local("identifyingColumn"), ontologyClass.identifyingColumns);
        addTexts(classTerm, local("sourceColumn"), ontologyClass.sourceColumns);
        addTexts(classTerm, local("interpretationStatus"), ontologyClass.interpretationStatus, "en");

        (ontologyClass.restrictions || []).forEach(function (restriction) {
            const isCardinality = cardinalityKinds.includes(restriction.kind);
            if (!restrictionKinds.includes(restriction.kind) || !restriction.property || !restriction.target || (isCardinality && !Number.isInteger(restriction.cardinality))) {
                problems.push("restriction not written on " + ontologyClass.label + ": " + JSON.stringify(restriction));
                return;
            }
            const restrictionNode = rdflib.blankNode();
            store.add(classTerm, rdfs("subClassOf"), restrictionNode);
            store.add(restrictionNode, rdf("type"), owl("Restriction"));
            store.add(restrictionNode, owl("onProperty"), getTerm(restriction.property));
            if (isCardinality) {
                store.add(restrictionNode, owl(restriction.kind), rdflib.literal(String(restriction.cardinality), xsd("nonNegativeInteger")));
                store.add(restrictionNode, owl("onClass"), getTerm(restriction.target));
            } else {
                store.add(restrictionNode, owl(restriction.kind), getTerm(restriction.target));
            }
        });

        (ontologyClass.datatypeProperties || []).forEach(function (datatypeProperty) {
            if (absoluteIriRegex.test(datatypeProperty.label)) {
                problems.push("imported datatype property not written on " + ontologyClass.label + ": " + datatypeProperty.label);
                return;
            }
            const propertyTerm = getTerm(datatypeProperty.label);
            const columnNames = (datatypeProperty.columns || []).map((qualifiedName) => qualifiedName.substring(qualifiedName.lastIndexOf(".") + 1));
            store.add(propertyTerm, rdf("type"), owl("DatatypeProperty"));
            store.add(propertyTerm, rdfs("label"), rdflib.literal(datatypeProperty.label, "en"));
            store.add(propertyTerm, rdfs("domain"), classTerm);
            if (datatypeRanges.includes(datatypeProperty.range)) {
                store.add(propertyTerm, rdfs("range"), xsd(datatypeProperty.range));
            } else {
                problems.push("range not written on " + datatypeProperty.label + ": " + datatypeProperty.range);
            }
            addTexts(propertyTerm, skos("notation"), [...new Set(columnNames)]);
            addTexts(propertyTerm, local("sourceColumn"), datatypeProperty.columns);
        });
    });

    individuals.forEach(function (individual) {
        const individualTerm = getTerm(individual.label);
        store.add(individualTerm, rdf("type"), owl("NamedIndividual"));
        store.add(individualTerm, rdf("type"), getTerm(individual.type));
        store.add(individualTerm, rdfs("label"), rdflib.literal(individual.label, "en"));
        addTexts(individualTerm, skos("notation"), individual.notation);
    });

    groups.forEach(function (group) {
        const groupTerm = getTerm(group.label);
        store.add(groupTerm, rdfs("label"), rdflib.literal(group.label, "en"));
        addTexts(groupTerm, skos("notation"), group.notation);
        (group.members || []).forEach((member) => store.add(groupTerm, rdfs("member"), getTerm(member)));
    });

    const prefixes = { ...wellKnownPrefixes };
    if (sourceConfig.prefix) {
        prefixes[sourceConfig.prefix] = termNamespace;
    }
    const serializer = rdflib.Serializer(store);
    serializer.setNamespaces(prefixes);
    return { turtle: serializer.statementsToN3(store.statements), problems: problems };
}

// each generation and each revision is a new minor version, above every version of the source: a version number names one
// version, the one a validation turns into the source <source>_TBOX_<version>, even once its run is deleted
async function getNextOntologyVersion(source) {
    const sourceRuns = await listSourceRuns(source);
    const givenVersions = sourceRuns.map((sourceRun) => sourceRun.savedRun?.ontologyVersion || firstOntologyVersion);
    const lastOntologyVersion = await readLastOntologyVersion(source);
    if (lastOntologyVersion) {
        givenVersions.push(lastOntologyVersion);
    }
    let highestMinorVersion = 0;
    givenVersions.forEach(function (ontologyVersion) {
        const minorVersion = Number(ontologyVersion.split(".")[1]);
        highestMinorVersion = Math.max(highestMinorVersion, minorVersion);
    });
    return "0." + (highestMinorVersion + 1) + ".0";
}

export {
    ontologyModelId,
    ontologyReasoningEffort,
    modelMaxOutputTokens,
    firstOntologyVersion,
    getNextOntologyVersion,
    jsonBlockRegex,
    createMessage,
    getCutAnswerError,
    getAnswerText,
    getTermNamespace,
    getLocalName,
    absoluteIriRegex,
    getAnswerTurtle,
};
