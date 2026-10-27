import { readFileSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import async from "async";
import rdflib from "rdflib";
import llmClient from "../../../../bin/AI/llmClient.js";
import { llmAnswersDirectory, blankNodeAsIriRegex, nonNameCharacterRegex, trailingSlashRegex, getRunName, getRunGraphUri, loadTurtleIntoGraph } from "../../../../bin/AI/ontologyRuns.js";
import Util from "../../../../bin/util.js";
import userManager from "../../../../bin/user.js";
import * as dbConnector from "../../../../bin/KG/dbConnector.js";
import { databaseModel } from "../../../../model/databases.js";
import { sourceModel } from "../../../../model/sources.js";
import { rdfDataModel } from "../../../../model/rdfData.js";
import { mainConfigModel } from "../../../../model/mainConfig.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const ontologyBuildingPromptPath = join(currentDirectory, "../../../../bin/AI/prompts/ontology_building_from_db.md");
const linkCandidatesPromptPath = join(currentDirectory, "../../../../bin/AI/prompts/link_candidates_from_db.md");

// OpenRouter ids, fixed here: the page does not choose the models
const ontologyModelId = "anthropic/claude-opus-5.5";
const ontologyReasoningEffort = "medium";
const linkCandidatesModelId = "anthropic/claude-haiku-5.5";
const linkCandidatesReasoningEffort = "medium";
// the most OpenRouter lets the Claude 5.5 models write, reasoning included: a run is never cut by a limit of ours
const modelMaxOutputTokens = 128000;
const sampleRowCount = 5;
const sampleValueMaxLength = 100;
// YYYY-MM-DD
const dateTextLength = 10;
// database checks run before the call, a few at once: 8 saturate a postgres server on the biggest tables
const parallelCheckCount = 4;
const maxMeasuredPairs = 150;
const ontologyVersion = "0.1.0";
const restrictionKinds = ["someValuesFrom", "allValuesFrom", "hasValue", "qualifiedCardinality", "minQualifiedCardinality", "maxQualifiedCardinality"];
const cardinalityKinds = ["qualifiedCardinality", "minQualifiedCardinality", "maxQualifiedCardinality"];
const localAnnotationProperties = ["identifyingColumn", "sourceColumn", "interpretationStatus"];
// XSD local names the prompt allows as datatype property ranges
const datatypeRanges = ["string", "date", "dateTime", "decimal", "integer", "boolean"];

const wellKnownPrefixes = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    owl: "http://www.w3.org/2002/07/owl#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    skos: "http://www.w3.org/2004/02/skos/core#",
    obo: "http://purl.obolibrary.org/obo/",
};
const namespaceRegex = /^(.*[/#])[^/#]+$/;
const lastNamespaceSegmentRegex = /([^/#]+)[/#]$/;
const timestampSeparatorRegex = /[:.]/g;
const prefixStartRegex = /^[A-Za-z]/;
const lineBreakRegex = /\s*[\r\n]+\s*/g;
const absoluteIriRegex = /^https?:\/\//;
const jsonBlockRegex = /```json[ \t]*\r?\n([\s\S]*?)```/;
const maxPairsPlaceholderRegex = /\{maxPairs\}/g;
const answerLabelRegex = /"label"\s*:\s*"([^"]+)"/g;
// one pair of the link candidates answer, in the key order the prompt asks for
const streamedPairRegex = /\{\s*"left"\s*:\s*"([^"]+)"\s*,\s*"right"\s*:\s*"([^"]+)"\s*\}/g;
// the page is told what the model writes at most once a second
const writingProgressIntervalMs = 1000;

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

export default function () {
    let operations = {
        POST,
    };

    function describeDatabase(database, schema, columnsByTable, tableInspections) {
        const primaryKeyColumnsByTable = {};
        schema.primaryKeys.forEach(function (keyColumn) {
            if (!primaryKeyColumnsByTable[keyColumn.table_name]) {
                primaryKeyColumnsByTable[keyColumn.table_name] = [];
            }
            primaryKeyColumnsByTable[keyColumn.table_name].push(keyColumn.column_name);
        });
        const foreignKeysByTable = {};
        schema.foreignKeys.forEach(function (keyColumn) {
            if (!foreignKeysByTable[keyColumn.table_name]) {
                foreignKeysByTable[keyColumn.table_name] = {};
            }
            if (!foreignKeysByTable[keyColumn.table_name][keyColumn.constraint_name]) {
                foreignKeysByTable[keyColumn.table_name][keyColumn.constraint_name] = { columns: [], referencedTable: keyColumn.referenced_table, referencedColumns: [] };
            }
            const foreignKey = foreignKeysByTable[keyColumn.table_name][keyColumn.constraint_name];
            foreignKey.columns.push(keyColumn.column_name);
            foreignKey.referencedColumns.push(keyColumn.referenced_column);
        });

        let databaseDescription = "Database " + database.database + " (" + database.driver + ")\n";
        for (const tableName of Object.keys(columnsByTable)) {
            const inspection = tableInspections[tableName];
            const columnTypes = {};
            columnsByTable[tableName].forEach(function (column) {
                columnTypes[column.column_name] = column.data_type;
            });
            const columnTexts = columnsByTable[tableName].map(function (column) {
                const nullability = column.is_nullable == "NO" ? ", NOT NULL" : "";
                const columnProfile = inspection.profile ? inspection.profile.columnsByName[column.column_name] : null;
                const profileText = columnProfile ? ", " + columnProfile.distinctCount + " distinct, " + (inspection.profile.rowCount - columnProfile.filledCount) + " null" : "";
                return column.column_name + " (" + column.data_type + nullability + profileText + ")";
            });
            databaseDescription += "\nTable " + tableName + "\n";
            databaseDescription += inspection.profile ? "Rows: " + inspection.profile.rowCount + "\n" : "Rows: not counted (" + inspection.profileError + ")\n";
            databaseDescription += "Columns: " + columnTexts.join(", ") + "\n";
            if (primaryKeyColumnsByTable[tableName]) {
                databaseDescription += "Primary key: (" + primaryKeyColumnsByTable[tableName].join(", ") + ")\n";
            }
            const foreignKeys = foreignKeysByTable[tableName] || {};
            for (const [constraintName, foreignKey] of Object.entries(foreignKeys)) {
                databaseDescription +=
                    "Foreign key " + constraintName + ": (" + foreignKey.columns.join(", ") + ") -> " + foreignKey.referencedTable + "(" + foreignKey.referencedColumns.join(", ") + ")\n";
            }

            if (!inspection.rows) {
                databaseDescription += "Sample rows: unavailable (" + inspection.sampleError + ")\n";
                continue;
            }
            databaseDescription += "Sample rows:\n";
            inspection.rows.forEach(function (row) {
                const values = Object.entries(row).map(function ([columnName, value]) {
                    if (value === null || value === undefined) {
                        return "NULL";
                    }
                    if (Buffer.isBuffer(value)) {
                        return "<binary>";
                    }
                    let valueText;
                    if (value instanceof Date) {
                        // pg reads a stored date in the server time zone: its local fields are the stored value
                        valueText = value.toLocaleString("sv-SE");
                        if (columnTypes[columnName] == "date") {
                            valueText = valueText.substring(0, dateTextLength);
                        }
                    } else if (typeof value == "object") {
                        valueText = JSON.stringify(value);
                    } else {
                        valueText = String(value);
                    }
                    valueText = valueText.replace(lineBreakRegex, " ");
                    if (valueText.length > sampleValueMaxLength) {
                        valueText = valueText.substring(0, sampleValueMaxLength) + "...";
                    }
                    return valueText;
                });
                databaseDescription += values.join(" | ") + "\n";
            });
        }
        return databaseDescription;
    }

    // the whole graph of a source as Turtle grouped by subject, restrictions nested in their class,
    // one prefix per namespace, the configured one when a source owns it
    async function getOntologyTurtle(graphUri, pageSize, sourcePrefixesByGraphUri) {
        const tripleCount = await rdfDataModel.getTripleCount(graphUri);
        let nTriples = "";
        for (let offset = 0; offset < tripleCount; offset += pageSize) {
            nTriples += (await rdfDataModel.getGraphPartNt(graphUri, pageSize, offset)) + "\n";
        }

        // some sources store blank nodes as IRIs <_:b...>, which no RDF parser accepts
        const blankNodesAsTerms = nTriples.replace(blankNodeAsIriRegex, "_:$1");
        // one parse for every page, so a blank node keeps one identity across pages; N-Triples is a subset of Turtle
        const store = rdflib.graph();
        rdflib.parse(blankNodesAsTerms, store, graphUri, "text/turtle");

        const prefixes = { ...wellKnownPrefixes };
        store.statements.forEach(function (statement) {
            [statement.subject, statement.predicate, statement.object].forEach(function (term) {
                const namespaceMatch = term.termType == "NamedNode" ? term.value.match(namespaceRegex) : null;
                if (!namespaceMatch || Object.values(prefixes).includes(namespaceMatch[1])) {
                    return;
                }
                const namespace = namespaceMatch[1];
                let prefixName = sourcePrefixesByGraphUri[namespace];
                if (!prefixName) {
                    const segmentMatch = namespace.match(lastNamespaceSegmentRegex);
                    prefixName = segmentMatch ? segmentMatch[1] : "ns";
                }
                // a Turtle prefix starts with a letter and holds letters, digits, _ and -
                prefixName = prefixName.replace(nonNameCharacterRegex, "_");
                if (!prefixStartRegex.test(prefixName)) {
                    prefixName = "ns" + prefixName;
                }
                let uniquePrefixName = prefixName;
                for (let suffix = 2; prefixes[uniquePrefixName]; suffix++) {
                    uniquePrefixName = prefixName + suffix;
                }
                prefixes[uniquePrefixName] = namespace;
            });
        });

        // rdflib rather than the N3 writer, which neither groups triples by subject nor nests blank nodes
        const serializer = rdflib.Serializer(store);
        // rdflib ignores the prefixes starting with ns and names those namespaces itself
        serializer.setNamespaces(prefixes);
        return serializer.statementsToN3(store.statements);
    }

    // the compact answer of the model as Turtle, local IRIs built from labels as SousLeSens builds them;
    // what cannot be written is listed in problems rather than guessed
    function getAnswerTurtle(ontologyAnswer, source, sourceConfig, termNamespace, upperOntologyGraphUris) {
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
            const localName = Util.formatStringForTriple(String(localTerm.label), true);
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
            return local(Util.formatStringForTriple(String(reference), true));
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

    async function POST(req, res, _next) {
        const runStart = Date.now();
        // a generation streams its progress, one JSON object per line; the prompt-only calls answer at once
        const isProgressStreamed = !req.body.promptOnly && !req.body.linkCandidatesPromptOnly;
        function sendProgress(progressEvent) {
            if (!isProgressStreamed) {
                return;
            }
            if (!res.headersSent) {
                res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
                res.flushHeaders();
            }
            progressEvent.elapsedSeconds = Math.round((Date.now() - runStart) / 1000);
            res.write(JSON.stringify(progressEvent) + "\n");
        }
        const stepSeconds = {};
        function endStep(stepName, stepStart, stepDetails) {
            stepSeconds[stepName] = Math.round((Date.now() - stepStart) / 1000);
            sendProgress({ type: "stepEnd", step: stepName, seconds: stepSeconds[stepName], ...stepDetails });
        }

        try {
            const source = req.body.source;
            const databaseId = req.body.databaseId;
            const upperOntologies = req.body.upperOntologies || [];

            const userInfo = await userManager.getUser(req.user);
            const userSources = await sourceModel.getUserSources(userInfo.user);
            const unknownSources = [source, ...upperOntologies].filter((sourceName) => !userSources[sourceName]);
            if (unknownSources.length > 0) {
                return res.status(404).json({ error: "sources not found: " + unknownSources.join(", ") });
            }

            const connection = await databaseModel.getUserConnection(userInfo.user, databaseId);
            const database = await databaseModel.getDatabase(databaseId);
            const schema = await dbConnector.getSchemaDescription(connection, database.driver);
            const clientDriver = databaseModel.getClientDriver(database.driver);

            const preparationStart = Date.now();
            // the qualified name table.column is the form of the prompt and of the link candidates
            const columnsByQualifiedName = new Map();
            const columnsByTable = {};
            schema.columns.forEach(function (column) {
                columnsByQualifiedName.set(column.table_name + "." + column.column_name, column);
                if (!columnsByTable[column.table_name]) {
                    columnsByTable[column.table_name] = [];
                }
                columnsByTable[column.table_name].push(column);
            });
            const tableNames = Object.keys(columnsByTable);
            sendProgress({ type: "stepStart", step: "profiles", tableCount: tableNames.length, columnCount: schema.columns.length });
            let inspectedTableCount = 0;
            const inspectionList = await async.mapLimit(tableNames, parallelCheckCount, async function (tableName) {
                const inspection = { tableName: tableName };
                const columnNames = columnsByTable[tableName].map((column) => column.column_name);
                // a view without select right, or a broken one, must not stop the whole description
                try {
                    inspection.rows = await dbConnector.getSampleData(connection, tableName, sampleRowCount, clientDriver);
                } catch (sampleError) {
                    inspection.sampleError = sampleError.message;
                }
                try {
                    inspection.profile = await dbConnector.getColumnProfile(connection, clientDriver, tableName, columnNames);
                } catch (profileError) {
                    inspection.profileError = profileError.message;
                }
                inspectedTableCount++;
                sendProgress({ type: "progress", step: "profiles", done: inspectedTableCount, total: tableNames.length, item: tableName });
                return inspection;
            });
            endStep("profiles", preparationStart, {});
            const tableInspections = {};
            inspectionList.forEach(function (inspection) {
                tableInspections[inspection.tableName] = inspection;
            });
            const databaseText = describeDatabase(database, schema, columnsByTable, tableInspections);

            // the pairs worth measuring: given by the caller, or proposed by a small model that reads the database only
            const linkCandidatesTemplate = readFileSync(linkCandidatesPromptPath, "utf8");
            const linkCandidatesPrompt = linkCandidatesTemplate.replace(maxPairsPlaceholderRegex, String(maxMeasuredPairs)) + "\n\n# Database\n\n" + databaseText;
            if (req.body.linkCandidatesPromptOnly) {
                return res.status(200).json({ prompt: linkCandidatesPrompt, promptCharacters: linkCandidatesPrompt.length });
            }
            // a pair and its reverse are one measure; a pair is measured as soon as it is known, while the model still writes the next ones
            const distinctCountOf = (column) => tableInspections[column.table_name].profile?.columnsByName[column.column_name]?.distinctCount;
            const measuredPairKeys = new Set();
            // indexed by the order the pairs were proposed in, so the prompt lists them the same way at every run
            const measuredOverlaps = [];
            let measuredPairCount = 0;
            const pairsStart = Date.now();
            sendProgress({ type: "stepStart", step: "pairs" });
            const pairMeasureQueue = async.queue(async function ({ pair, pairIndex }) {
                const measuredOverlap = { left: pair.left, right: pair.right };
                const leftColumn = columnsByQualifiedName.get(pair.left);
                const rightColumn = columnsByQualifiedName.get(pair.right);
                if (!leftColumn || !rightColumn) {
                    measuredOverlap.error = "unknown column";
                } else {
                    // the distinct values of each column come from the profiles, one query per pair is left
                    measuredOverlap.leftDistinctValues = distinctCountOf(leftColumn);
                    measuredOverlap.rightDistinctValues = distinctCountOf(rightColumn);
                    try {
                        measuredOverlap.sharedDistinctValues = await dbConnector.getSharedDistinctValueCount(
                            connection,
                            clientDriver,
                            leftColumn.table_name,
                            leftColumn.column_name,
                            rightColumn.table_name,
                            rightColumn.column_name,
                        );
                    } catch (overlapError) {
                        measuredOverlap.error = overlapError.message;
                    }
                }
                measuredOverlaps[pairIndex] = measuredOverlap;
                measuredPairCount++;
                sendProgress({ type: "progress", step: "pairs", done: measuredPairCount, total: measuredPairKeys.size, item: pair.left + " = " + pair.right });
            }, parallelCheckCount);
            function queuePairMeasure(pair) {
                // the answer of a model may hold a pair of another shape
                if (!pair || typeof pair.left != "string" || typeof pair.right != "string") {
                    return;
                }
                const sortedColumns = [pair.left, pair.right].sort();
                const pairKey = sortedColumns.join("=");
                if (measuredPairKeys.has(pairKey) || measuredPairKeys.size >= maxMeasuredPairs) {
                    return;
                }
                measuredPairKeys.add(pairKey);
                pairMeasureQueue.push({ pair: pair, pairIndex: measuredPairKeys.size - 1 });
            }

            let linkCandidates = req.body.linkCandidates;
            let linkCandidatesAnswer = null;
            let linkCandidatesModel = null;
            let linkCandidatesError = null;
            const linkCandidatesUsage = { input_tokens: 0, output_tokens: 0 };
            const linkCandidatesStart = Date.now();
            if (!linkCandidates) {
                sendProgress({ type: "stepStart", step: "linkCandidates", model: linkCandidatesModelId });
                let streamedCandidatesText = "";
                let pairScanPosition = 0;
                try {
                    const candidatesMessage = {
                        messages: [{ role: "user", content: linkCandidatesPrompt }],
                        maxTokens: modelMaxOutputTokens,
                        model: linkCandidatesModelId,
                        reasoningEffort: linkCandidatesReasoningEffort,
                        onTextDelta: function (textDelta) {
                            streamedCandidatesText += textDelta;
                            // a pair cut in the middle is left for the next delta
                            const unscannedText = streamedCandidatesText.slice(pairScanPosition);
                            let scannedLength = 0;
                            for (const pairMatch of unscannedText.matchAll(streamedPairRegex)) {
                                queuePairMeasure({ left: pairMatch[1], right: pairMatch[2] });
                                scannedLength = pairMatch.index + pairMatch[0].length;
                            }
                            pairScanPosition += scannedLength;
                        },
                    };
                    const candidatesCompletion = await createMessage(candidatesMessage, linkCandidatesUsage);
                    linkCandidatesModel = candidatesCompletion.model;
                    linkCandidatesAnswer = getAnswerText(candidatesCompletion);
                    linkCandidatesError = getCutAnswerError(candidatesCompletion, linkCandidatesAnswer);
                    if (!linkCandidatesError) {
                        const candidatesMatch = linkCandidatesAnswer.match(jsonBlockRegex);
                        linkCandidates = JSON.parse(candidatesMatch ? candidatesMatch[1] : linkCandidatesAnswer);
                    }
                } catch (candidatesError) {
                    linkCandidatesError = "the list of pairs could not be read: " + candidatesError.message;
                }
            }
            if (!linkCandidatesError && !Array.isArray(linkCandidates?.pairs)) {
                linkCandidatesError = "the link candidates hold no pairs array";
            }
            if (linkCandidatesError) {
                console.warn("[ai/ontologyFromDb] link candidates: " + linkCandidatesError);
            }
            endStep("linkCandidates", linkCandidatesStart, { pairCount: linkCandidates?.pairs?.length ?? measuredPairKeys.size, error: linkCandidatesError });

            // pairs given by the caller, or written in a shape the streamed reading missed
            if (Array.isArray(linkCandidates?.pairs)) {
                linkCandidates.pairs.forEach(queuePairMeasure);
            }
            // drain() never resolves on a queue that is already idle
            if (!pairMeasureQueue.idle()) {
                await pairMeasureQueue.drain();
            }
            const sharingOverlaps = measuredOverlaps.filter((overlap) => overlap.sharedDistinctValues > 0);
            endStep("pairs", pairsStart, { sharingCount: sharingOverlaps.length });
            const preparationSeconds = Math.round((Date.now() - preparationStart) / 1000);

            let overlapsText = "\n## Overlaps measured between candidate columns\n\n";
            if (linkCandidatesError && measuredOverlaps.length == 0) {
                overlapsText += "The first reading of the database failed (" + linkCandidatesError + "): no overlap was measured, every link hypothesis without a declared key stays unchecked.\n";
            } else if (measuredOverlaps.length == 0) {
                overlapsText += "The first reading of the database proposed no pair of columns to measure.\n";
            } else {
                if (linkCandidatesError) {
                    overlapsText += "The first reading of the database stopped early (" + linkCandidatesError + "): only the pairs it proposed before are measured.\n";
                }
                overlapsText +=
                    "Pairs of columns proposed as possible links by a first reading of the database, measured before this call. " +
                    "Line format: column = reference: shared distinct values / distinct values of the column / distinct values of the reference, ? when the column could not be counted.\n";
            }
            const repeatingTablePairs = linkCandidatesError ? [] : (linkCandidates.repeatingTables || []).filter((tablePair) => Array.isArray(tablePair) && tablePair.length == 2);
            if (repeatingTablePairs.length > 0) {
                const repeatingPairTexts = repeatingTablePairs.map(([repeatingTable, repeatedTable]) => repeatingTable + " ~ " + repeatedTable);
                overlapsText += "Tables repeating the columns of another one (copies, views or extracts), not compared with each other: " + repeatingPairTexts.join(", ") + "\n";
            }
            sharingOverlaps.forEach(function (overlap) {
                overlapsText +=
                    overlap.left + " = " + overlap.right + ": " + overlap.sharedDistinctValues + " / " + (overlap.leftDistinctValues ?? "?") + " / " + (overlap.rightDistinctValues ?? "?") + "\n";
            });
            const disjointOverlaps = measuredOverlaps.filter((overlap) => overlap.sharedDistinctValues === 0);
            if (disjointOverlaps.length > 0) {
                const disjointPairTexts = disjointOverlaps.map((overlap) => overlap.left + " = " + overlap.right);
                overlapsText += "No shared value: " + disjointPairTexts.join(", ") + "\n";
            }
            const failedOverlaps = measuredOverlaps.filter((overlap) => overlap.error);
            if (failedOverlaps.length > 0) {
                const failedPairTexts = failedOverlaps.map((overlap) => overlap.left + " = " + overlap.right + " (" + overlap.error + ")");
                overlapsText += "Not measured: " + failedPairTexts.join(", ") + "\n";
            }

            const sourcePrefixesByGraphUri = {};
            Object.values(userSources).forEach(function (sourceConfig) {
                if (sourceConfig.prefix && sourceConfig.graphUri) {
                    sourcePrefixesByGraphUri[sourceConfig.graphUri] = sourceConfig.prefix;
                }
            });
            const config = await mainConfigModel.getConfig();
            const upperOntologiesStart = Date.now();
            sendProgress({ type: "stepStart", step: "upperOntologies", sources: upperOntologies });
            let ontologiesText = "";
            for (const upperOntology of upperOntologies) {
                const graphUri = userSources[upperOntology].graphUri;
                const turtle = await getOntologyTurtle(graphUri, config.sparqlDownloadLimit, sourcePrefixesByGraphUri);
                ontologiesText += "\n## " + upperOntology + " (graph " + graphUri + ")\n```turtle\n" + turtle + "```\n";
            }
            endStep("upperOntologies", upperOntologiesStart, {});

            const basePrompt = readFileSync(ontologyBuildingPromptPath, "utf8");
            const sourceConfig = userSources[source];
            // the IRIs of the terms are built on baseUri, which may differ from the graph
            const termNamespace = sourceConfig.baseUri || sourceConfig.graphUri;
            const prompt =
                basePrompt +
                "\n\n# Inputs\n\nSource whose ontology is built: " +
                source +
                "\nGraph: " +
                sourceConfig.graphUri +
                "\nNamespace of its terms: " +
                termNamespace +
                "\n\n## Database\n\n" +
                databaseText +
                overlapsText +
                "\n# Upper ontologies, most abstract first\n" +
                ontologiesText;
            if (req.body.promptOnly) {
                return res.status(200).json({
                    prompt: prompt,
                    promptCharacters: prompt.length,
                    measuredOverlapCount: measuredOverlaps.length,
                    preparationSeconds: preparationSeconds,
                    linkCandidates: linkCandidates,
                    linkCandidatesError: linkCandidatesError,
                    linkCandidatesUsage: linkCandidatesUsage,
                });
            }

            const usage = { input_tokens: 0, output_tokens: 0 };
            let completion = null;
            let failure = null;
            const ontologyStart = Date.now();
            if (!req.body.answer) {
                sendProgress({ type: "stepStart", step: "ontology", model: ontologyModelId, reasoningEffort: ontologyReasoningEffort, promptCharacters: prompt.length });
                let writtenText = "";
                let reasoningText = "";
                let labelScanPosition = 0;
                let sentReasoningLength = 0;
                let lastWritingProgress = 0;
                const sendWritingProgress = function (isLastTick) {
                    if (!isLastTick && Date.now() - lastWritingProgress < writingProgressIntervalMs) {
                        return;
                    }
                    lastWritingProgress = Date.now();
                    const newLabels = [];
                    // a label cut in the middle is left for the next tick
                    const unscannedText = writtenText.slice(labelScanPosition);
                    let scannedLength = 0;
                    for (const labelMatch of unscannedText.matchAll(answerLabelRegex)) {
                        newLabels.push(labelMatch[1]);
                        scannedLength = labelMatch.index + labelMatch[0].length;
                    }
                    labelScanPosition += scannedLength;
                    // the page appends the reasoning, so each tick carries only what came since the last one
                    const newReasoning = reasoningText.slice(sentReasoningLength);
                    sentReasoningLength = reasoningText.length;
                    sendProgress({
                        type: "writing",
                        writtenCharacters: writtenText.length,
                        reasoningCharacters: reasoningText.length,
                        newReasoning: newReasoning,
                        newLabels: newLabels,
                    });
                };
                const ontologyMessage = {
                    messages: [{ role: "user", content: prompt }],
                    maxTokens: modelMaxOutputTokens,
                    model: ontologyModelId,
                    reasoningEffort: ontologyReasoningEffort,
                    onTextDelta: function (textDelta) {
                        writtenText += textDelta;
                        sendWritingProgress();
                    },
                    onReasoningDelta: function (reasoningDelta) {
                        reasoningText += reasoningDelta;
                        sendWritingProgress();
                    },
                };
                try {
                    completion = await createMessage(ontologyMessage, usage);
                } catch (llmError) {
                    console.warn("[ai/ontologyFromDb] " + llmError.message);
                    failure = llmError.message;
                }
                sendWritingProgress(true);
            }
            endStep("ontology", ontologyStart, { usage: usage, failure: failure });

            const answerText = req.body.answer || getAnswerText(completion);
            const answerMatch = answerText.match(jsonBlockRegex);
            let ontologyAnswer = null;
            let answerError = getCutAnswerError(completion, answerText);
            if (!answerError && !answerMatch && !failure) {
                answerError = "the answer holds no JSON block, see the answer saved with the run";
            }
            if (answerMatch) {
                try {
                    ontologyAnswer = JSON.parse(answerMatch[1]);
                } catch (parseError) {
                    answerError = "the JSON of the answer could not be read: " + parseError.message;
                }
            }
            const upperOntologyGraphUris = upperOntologies.map((upperOntology) => userSources[upperOntology].graphUri);
            let answerOntology = null;
            // an answer of an unexpected shape must not stop the save of a paid generation
            try {
                answerOntology = ontologyAnswer ? getAnswerTurtle(ontologyAnswer, source, sourceConfig, termNamespace, upperOntologyGraphUris) : null;
            } catch (conversionError) {
                answerError = "answer not turned into Turtle: " + conversionError.message;
            }
            const turtle = answerOntology ? answerOntology.turtle : null;

            const runDate = new Date().toISOString();
            const runTimestamp = runDate.replace(timestampSeparatorRegex, "-");
            const runGraphUri = getRunGraphUri(sourceConfig.graphUri, runTimestamp);
            let graphTripleCount = null;
            let graphError = null;
            if (turtle) {
                const graphStart = Date.now();
                sendProgress({ type: "stepStart", step: "graph", graphUri: runGraphUri });
                try {
                    graphTripleCount = await loadTurtleIntoGraph(turtle, runGraphUri);
                } catch (loadError) {
                    graphError = loadError.message;
                }
                endStep("graph", graphStart, { tripleCount: graphTripleCount, error: graphError });
            }
            const totalSeconds = Math.round((Date.now() - runStart) / 1000);

            // every run is kept, failed ones included, a paid generation is never lost
            const databaseFolder = database.database.replace(nonNameCharacterRegex, "_");
            const databaseAnswersDirectory = join(llmAnswersDirectory, databaseFolder);
            const runName = getRunName(source, runTimestamp);
            const savedRun = {
                source: source,
                database: database.database,
                upperOntologies: upperOntologies,
                model: completion?.model ?? null,
                reasoningEffort: completion ? ontologyReasoningEffort : null,
                stopReason: completion?.stop_reason ?? null,
                failure: failure,
                usage: usage,
                totalSeconds: totalSeconds,
                stepSeconds: stepSeconds,
                graphUri: turtle ? runGraphUri : null,
                graphTripleCount: graphTripleCount,
                graphError: graphError,
                preparationSeconds: preparationSeconds,
                linkCandidatesModel: linkCandidatesModel,
                linkCandidatesUsage: linkCandidatesUsage,
                linkCandidates: linkCandidates,
                linkCandidatesError: linkCandidatesError,
                linkCandidatesAnswer: linkCandidatesAnswer,
                measuredOverlaps: measuredOverlaps,
                report: ontologyAnswer?.report ?? null,
                answerError: answerError,
                answerProblems: answerOntology?.problems ?? null,
                answer: answerText,
            };
            let saveError = null;
            try {
                await mkdir(databaseAnswersDirectory, { recursive: true });
                await writeFile(join(databaseAnswersDirectory, runName + ".json"), JSON.stringify(savedRun, null, 2));
                if (turtle) {
                    await writeFile(join(databaseAnswersDirectory, runName + ".ttl"), turtle);
                }
            } catch (writeError) {
                console.warn("[ai/ontologyFromDb] answer not saved: " + writeError.message);
                saveError = writeError.message;
            }

            const savedAs = saveError ? null : "data/semanticVirtualDB/" + databaseFolder + "/" + runName;
            sendProgress({
                type: "result",
                runName: runName,
                failure: failure,
                model: completion?.model ?? null,
                answerError: answerError,
                answerProblems: answerOntology?.problems ?? null,
                stopReason: completion?.stop_reason ?? null,
                usage: usage,
                linkCandidatesUsage: linkCandidatesUsage,
                linkCandidatesError: linkCandidatesError,
                totalSeconds: totalSeconds,
                stepSeconds: stepSeconds,
                graphUri: savedRun.graphUri,
                graphTripleCount: graphTripleCount,
                graphError: graphError,
                savedAs: savedAs,
                saveError: saveError,
            });
            res.end();
        } catch (error) {
            console.error("ontologyFromDb route error:", error);
            if (!res.headersSent) {
                return res.status(error.status || 500).json({ error: error.message });
            }
            sendProgress({ type: "error", error: error.message });
            res.end();
        }
    }

    POST.apiDoc = {
        security: [{ restrictAdmin: [] }],
        summary: "Generate a domain ontology from a database and the upper ontologies of a source",
        description:
            "Builds the `bin/AI/prompts/ontology_building_from_db.md` prompt with the database schema (columns, nullability, primary and foreign keys, " +
            "sample rows, row count and per column distinct and null counts), the overlaps measured beforehand between the pairs of columns " +
            "a first LLM call (Claude Haiku 5.5) proposes from the database description alone (150 at most) and the Turtle of the upper ontologies, most abstract first, then calls Claude Sonnet 5.5 once, at xhigh reasoning effort, through OpenRouter. " +
            "The answer is one compact JSON object (classes, restrictions, datatype properties, individuals, groups, report) that the route turns into Turtle. " +
            "Each run is saved under `data/semanticVirtualDB/<database>/`, the Turtle in a `.ttl` file, the report, the problems met while writing the Turtle and the whole answer in a `.json` file. " +
            "The Turtle is then loaded into the run graph `<source graphUri>/virtual-db-creator/<run timestamp>/`. " +
            "A generation answers in NDJSON, one event per line while it runs: stepStart and stepEnd (profiles, linkCandidates, pairs, upperOntologies, ontology, graph) with their seconds, " +
            "progress (tables profiled, pairs measured), writing (characters written, reasoning excerpt, labels completed) and a last result event with the total time, or an error event.",
        operationId: "postOntologyFromDb",
        parameters: [
            {
                name: "body",
                in: "body",
                required: true,
                schema: {
                    type: "object",
                    required: ["source", "databaseId"],
                    properties: {
                        source: { type: "string", description: "Source the ontology is built for." },
                        databaseId: { type: "string", description: "Database id from `databases.json`." },
                        upperOntologies: { type: "array", items: { type: "string" }, description: "Imports of the source, most abstract first." },
                        promptOnly: { type: "boolean", description: "Return the assembled prompt without calling the LLM." },
                        linkCandidatesPromptOnly: { type: "boolean", description: "Return the prompt of the link candidates step (database description only) without calling any LLM." },
                        linkCandidates: {
                            type: "object",
                            properties: {
                                pairs: { type: "array", items: { type: "object", properties: { left: { type: "string" }, right: { type: "string" } } } },
                                repeatingTables: { type: "array", items: { type: "array", items: { type: "string" } } },
                            },
                            description:
                                "Pairs of columns to measure, as the link candidates step returns them: { pairs: [{ left: table.column, right: table.column }], repeatingTables: [[table, table]] }. Skips that step.",
                        },
                        answer: { type: "string", description: "Answer of an earlier call to turn into Turtle and save again, without calling the LLM." },
                    },
                },
            },
        ],
        responses: {
            200: { description: "Prompt-only calls: the prompt as JSON. A generation: NDJSON progress events ending with a result event (run name, run graph, total time, usage, problems) or an error event." },
            404: { description: "A source is unknown to the user." },
        },
        tags: ["AI"],
    };

    return operations;
}
