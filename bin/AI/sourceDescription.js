import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Ask from "../ask.js";
import { getValidatedOntologyModelText, wellKnownPrefixes } from "./ontologyFromDb/ontologyModelText.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const sourceDescriptionPromptPath = join(currentDirectory, "prompts/source_description.md");
const languageNameByCode = { en: "English", fr: "French" };
const schemaVocabularyNamespaces = [wellKnownPrefixes.owl, wellKnownPrefixes.rdf, wellKnownPrefixes.rdfs, wellKnownPrefixes.skos];
const placeholderRegex = /\{\w+\}/g;
const sentenceSeparator = ". ";
// about 75k tokens
const modelTextMaxLength = 300000;
// tried in order, from the least lossy
const modelCompactionSteps = [
    { withoutAnonymousNodes: true },
    { withoutAnonymousNodes: true, groupRestrictions: true },
    { withoutAnonymousNodes: true, groupRestrictions: true, definitionMaxLength: 80 },
    { withoutAnonymousNodes: true, groupRestrictions: true, definitionMaxLength: 80, maxDepth: 5 },
    { withoutAnonymousNodes: true, groupRestrictions: true, definitionMaxLength: 80, maxDepth: 3 },
];

// whether the graph types at least one node outside the schema vocabularies; a source on its own endpoint is not queried
function getIndividualsText(sourceConfig) {
    const endpointUrl = (sourceConfig.sparql_server && sourceConfig.sparql_server.url) || "_default";
    if (endpointUrl != "_default" || !Ask.isValidIri(sourceConfig.graphUri)) {
        return Promise.resolve("not measured");
    }
    const schemaTypeTests = schemaVocabularyNamespaces.map((namespace) => 'STRSTARTS(STR(?type), "' + namespace + '")');
    const schemaTypeTest = schemaTypeTests.join(" || ");
    const individualQuery =
        "SELECT ?individual WHERE { GRAPH <" +
        sourceConfig.graphUri +
        "> { ?individual a ?type. FILTER (?type = <http://www.w3.org/2002/07/owl#NamedIndividual> || !(" +
        schemaTypeTest +
        ")) } } LIMIT 1";
    return new Promise((resolve, reject) => {
        Ask.executeSparqlQuery(null, individualQuery, (error, sparqlResult) => {
            if (error) {
                return reject(error);
            }
            const individualsText = sparqlResult.results.bindings.length > 0 ? "at least one" : "none";
            resolve(individualsText);
        });
    });
}

// the descriptions of the sources sharing one of its imports; its own description, when it has one, is left out of the prompt,
// copies included, since another version of the same ontology carries the same text, give or take a word after its first sentence
function getComparableDescriptions(source, userSources) {
    return new Promise((resolve, reject) => {
        Ask.getOntologySummary(userSources, (error, summaries) => {
            if (error) {
                return reject(error);
            }
            const sourceImports = userSources[source].imports || [];
            const getFirstSentence = (description) => (description || "").split(sentenceSeparator)[0];
            const ownSummary = summaries.find((summary) => summary.source == source);
            const ownFirstSentence = ownSummary ? getFirstSentence(ownSummary.description) : null;
            const comparableSummaries = summaries.filter(
                (summary) => summary.source != source && getFirstSentence(summary.description) != ownFirstSentence && summary.imports.some((importName) => sourceImports.includes(importName)),
            );
            const comparableLines = comparableSummaries.map((summary) => "- " + summary.source + ": " + (summary.description || "none"));
            const comparableDescriptions = comparableLines.join("\n") || "none";
            resolve(comparableDescriptions);
        });
    });
}

// the source_description prompt filled for one source, null when the source has no ontology model
async function getSourceDescriptionPrompt(source, languageCode, userContext) {
    const sourceConfig = userContext.userSources[source];
    // the first compaction under the budget, the last one when none is
    let ontologyModelText = null;
    for (const compaction of modelCompactionSteps) {
        ontologyModelText = await getValidatedOntologyModelText(source, sourceConfig.graphUri, null, userContext, compaction);
        if (!ontologyModelText || ontologyModelText.text.length <= modelTextMaxLength) {
            break;
        }
    }
    if (!ontologyModelText) {
        return null;
    }
    if (ontologyModelText.text.length > modelTextMaxLength) {
        console.warn("[sourceDescription] the model of " + source + " is still " + ontologyModelText.text.length + " characters long once compacted");
    }
    const individualsText = await getIndividualsText(sourceConfig);
    const comparableDescriptions = await getComparableDescriptions(source, userContext.userSources);

    const valueByPlaceholder = {
        "{language}": languageNameByCode[languageCode] || "English",
        "{source}": source,
        "{modelText}": ontologyModelText.text,
        "{individuals}": individualsText,
        "{comparableSourceDescriptions}": comparableDescriptions,
    };
    const template = readFileSync(sourceDescriptionPromptPath, "utf8");
    // one pass, so a definition inserted earlier is never read as a placeholder, nor its "$" as a pattern
    const prompt = template.replace(placeholderRegex, (placeholder) => valueByPlaceholder[placeholder] ?? placeholder);
    return prompt;
}

export { getSourceDescriptionPrompt };
