import crypto from "crypto";
import { callVocablesFunction } from "../remoteCodeRunner.js";
import { getLocalName, absoluteIriRegex } from "./ontologyAnswer.js";
import { getImportedOntologies, getLinkStatuses, getModelLabel } from "./restrictionCheck.js";

// the styles, layers and editor context of a mapping MappingModeler saved for PAZFLOR (data/graphs/mappings_PAZFLOR_ABOX_ALL.json)
const nodeStyles = {
    Class: { shape: "box", color: "#00afef", size: 18, level: 3 },
    Column: { shape: "box", color: "#cb9801", size: 18, level: 2 },
    Table: { shape: "box", color: "#d8cacd", size: 18, level: 1 },
};
const layerYByNodeType = { Class: -300, Column: 0, Table: 300 };
const nodeSpacing = 200;
const membershipEdgeColor = "#8f8a8c";
const classificationEdgeColor = "#00afef";
const relationEdgeColor = "#409304";
const edgeWidth = 3;
const edgeFontSize = 16;
const hierarchicalLayout = {
    direction: "DU",
    sortMethod: "hubsize",
    shakeTowards: "roots",
    blockShifting: true,
    edgeMinimization: true,
    parentCentralization: true,
    treeSpacing: 200,
    nodeSpacing: 200,
    levelSeparation: 300,
};
const editorContext = {
    divId: "mappingModeler_graphDiv",
    options: {
        keepNodePositionOnDrag: true,
        physics: { enabled: false, hierarchicalRepulsion: { centralGravity: 0.3, nodeDistance: 200 } },
        visjsOptions: {
            edges: { smooth: { enabled: true, type: "horizontal", roundness: 0.5, forceDirection: false } },
            layout: { hierarchical: hierarchicalLayout },
            physics: { enabled: false, solver: "hierarchicalRepulsion" },
        },
        layoutHierarchical: hierarchicalLayout,
    },
};
// MappingModeler draws a 8 hexadecimal id for a column node; a hash of table.column keeps it stable from one version to the next
const columnNodeIdLength = 8;
const literalRanges = ["xsd:string", "xsd:integer", "xsd:decimal", "xsd:boolean", "xsd:date", "xsd:dateTime"];
// the XSD ranges a SQL type holds without conversion; a text column holds any of them with a date format or a transform
const rangesBySqlTypeRegex = [
    [/int/, ["xsd:integer", "xsd:decimal", "xsd:string"]],
    [/numeric|decimal|real|double|float|money/, ["xsd:decimal", "xsd:string"]],
    [/bool/, ["xsd:boolean", "xsd:string"]],
    [/timestamp/, ["xsd:dateTime", "xsd:date", "xsd:string"]],
    [/^date$/, ["xsd:date", "xsd:dateTime", "xsd:string"]],
];
const localNameRegex = /[^/#]+$/;

// an IRI ending in / or # keeps its whole text as label
function getIriLocalName(iri) {
    const localNameMatch = iri.match(localNameRegex);
    return localNameMatch ? localNameMatch[0] : iri;
}

function getColumnNodeId(table, column) {
    const columnHash = crypto
        .createHash("md5")
        .update(table + "." + column)
        .digest("hex");
    return columnHash.slice(0, columnNodeIdLength);
}

// what names no table, column, class or property of the inputs is listed in problems, never guessed
function getMappingDocument(mappingAnswer, mappingContext) {
    const problems = [];
    const resources = mappingAnswer.resources || [];
    const relations = mappingAnswer.relations || [];
    function hasColumn(table, column) {
        return (mappingContext.columnsByTable[table] || []).some((schemaColumn) => schemaColumn.column_name == column);
    }
    function getClassIri(classReference) {
        if (absoluteIriRegex.test(classReference)) {
            return classReference;
        }
        if (!mappingContext.localClassLabels.has(classReference)) {
            problems.push("class of no local term: " + classReference);
        }
        return mappingContext.termNamespace + getLocalName(classReference);
    }
    function getDatatypePropertyIri(propertyReference) {
        if (absoluteIriRegex.test(propertyReference)) {
            return propertyReference;
        }
        if (!mappingContext.localDatatypePropertyLabels.has(propertyReference)) {
            problems.push("datatype property of no local term: " + propertyReference);
        }
        return mappingContext.termNamespace + getLocalName(propertyReference);
    }

    const nodes = [];
    const edges = [];
    const resourcesByColumnKey = {};
    const tableNames = [];
    resources.forEach(function (resource) {
        const columnKey = resource.table + "." + resource.column;
        if (!mappingContext.columnsByTable[resource.table]) {
            problems.push("resource in no table of the database: " + columnKey);
            return;
        }
        if (!hasColumn(resource.table, resource.column)) {
            problems.push("resource on no column of " + resource.table + ": " + columnKey);
            return;
        }
        if (resourcesByColumnKey[columnKey]) {
            problems.push("two resources on one column: " + columnKey);
            return;
        }
        resourcesByColumnKey[columnKey] = resource;
        if (!tableNames.includes(resource.table)) {
            tableNames.push(resource.table);
        }
    });

    // a reference resource is typed with the class of its main resource, as the triples builder reads definedInColumn
    const classIriByColumnKey = {};
    const rdfTypeByColumnKey = {};
    for (const [columnKey, resource] of Object.entries(resourcesByColumnKey)) {
        if (resource.isMainColumn) {
            classIriByColumnKey[columnKey] = getClassIri(resource.class);
            rdfTypeByColumnKey[columnKey] = resource.rdfType || "owl:NamedIndividual";
        }
    }
    for (const [columnKey, resource] of Object.entries(resourcesByColumnKey)) {
        const definingResource = resourcesByColumnKey[resource.identityDefinedIn];
        if (!resource.isMainColumn && definingResource && definingResource.isMainColumn) {
            classIriByColumnKey[columnKey] = classIriByColumnKey[resource.identityDefinedIn];
            rdfTypeByColumnKey[columnKey] = rdfTypeByColumnKey[resource.identityDefinedIn];
        }
    }

    const classIris = [];
    for (const [columnKey, resource] of Object.entries(resourcesByColumnKey)) {
        const columnNodeId = getColumnNodeId(resource.table, resource.column);
        const columnData = {
            id: resource.column,
            label: resource.column,
            type: "Column",
            dataTable: resource.table,
            schema: mappingContext.schemaName,
            datasource: mappingContext.databaseId,
            isMainColumn: Boolean(resource.isMainColumn),
        };
        if (resource.isMainColumn) {
            columnData.uriType = resource.uriType || "fromLabel";
            columnData.rdfType = rdfTypeByColumnKey[columnKey];
            columnData.prefixURI = resource.prefixURI || "";
            columnData.baseURI = "";
        } else {
            const definingResource = resourcesByColumnKey[resource.identityDefinedIn];
            if (!definingResource || !definingResource.isMainColumn) {
                problems.push("reference resource " + columnKey + " defined in no main resource: " + resource.identityDefinedIn);
            } else {
                columnData.definedInColumn = getColumnNodeId(definingResource.table, definingResource.column);
            }
        }
        if (resource.labelColumn) {
            if (hasColumn(resource.table, resource.labelColumn)) {
                columnData.rdfsLabel = resource.labelColumn;
            } else {
                problems.push("label column of no column of " + resource.table + ": " + resource.labelColumn);
            }
        }
        columnData.otherPredicates = [];
        (resource.literals || []).forEach(function (literal) {
            if (!hasColumn(resource.table, literal.column)) {
                problems.push("literal of " + columnKey + " on no column of " + resource.table + ": " + literal.column);
                return;
            }
            if (!literalRanges.includes(literal.range)) {
                problems.push("literal " + resource.table + "." + literal.column + " with the range " + literal.range + ", not one of " + literalRanges.join(", "));
            }
            columnData.otherPredicates.push({ property: getDatatypePropertyIri(literal.property), object: literal.column, range: literal.range, dateFormat: literal.dateFormat ?? null });
        });
        nodes.push({ id: columnNodeId, label: resource.column, data: columnData, ...nodeStyles.Column });
        edges.push({ id: "member-" + columnNodeId, from: resource.table, to: columnNodeId, color: membershipEdgeColor, width: edgeWidth, font: { size: edgeFontSize } });

        const classIri = classIriByColumnKey[columnKey];
        if (!classIri) {
            continue;
        }
        if (!classIris.includes(classIri)) {
            classIris.push(classIri);
        }
        const classificationType = rdfTypeByColumnKey[columnKey] == "owl:Class" ? "rdfs:subClassOf" : "rdf:type";
        edges.push({
            id: "type-" + columnNodeId,
            from: columnNodeId,
            to: classIri,
            label: classificationType == "rdf:type" ? "a" : "subClassOf",
            data: { type: classificationType },
            arrows: { to: { enabled: true, type: "arrow" } },
            color: classificationEdgeColor,
            width: edgeWidth,
            font: { size: edgeFontSize },
        });
    }

    classIris.forEach(function (classIri) {
        const classLabel = getIriLocalName(classIri);
        nodes.push({ id: classIri, label: classLabel, data: { id: classIri, label: classLabel, type: "Class", source: mappingContext.classSourceByIri[classIri] ?? null }, ...nodeStyles.Class });
    });
    tableNames.forEach(function (tableName) {
        nodes.push({
            id: tableName,
            label: tableName,
            data: { id: tableName, label: tableName, type: "Table", dataTable: tableName, schema: mappingContext.schemaName, datasource: mappingContext.databaseId },
            ...nodeStyles.Table,
        });
    });

    const checkedRelations = [];
    relations.forEach(function (relation, relationIndex) {
        const fromResource = resourcesByColumnKey[relation.from];
        const toResource = resourcesByColumnKey[relation.to];
        if (!fromResource || !toResource) {
            problems.push("relation " + relation.from + " " + relation.property + " " + relation.to + " between columns that are no resource");
            return;
        }
        if (fromResource.table != toResource.table) {
            problems.push("relation " + relation.from + " " + relation.property + " " + relation.to + " across two tables: a relation links two resources of one row");
            return;
        }
        if (!absoluteIriRegex.test(relation.property || "")) {
            problems.push("relation " + relation.from + " " + relation.to + " with a property that is no IRI: " + relation.property);
            return;
        }
        // the triples builder writes a restriction between two owl:Class columns only, a plain triple between individuals
        const isClassRelation = rdfTypeByColumnKey[relation.from] == "owl:Class" && rdfTypeByColumnKey[relation.to] == "owl:Class";
        const restrictionType = isClassRelation ? (relation.restrictionType ?? null) : null;
        edges.push({
            id: "relation-" + relationIndex + "-" + getColumnNodeId(relation.from, relation.to),
            from: getColumnNodeId(fromResource.table, fromResource.column),
            to: getColumnNodeId(toResource.table, toResource.column),
            label: getIriLocalName(relation.property),
            data: {
                id: relation.property,
                type: relation.property,
                source: null,
                restrictionType: restrictionType,
                cardinality: restrictionType && relation.cardinality != null ? { type: restrictionType, value: String(relation.cardinality) } : null,
            },
            targetClass: classIriByColumnKey[relation.to] ?? null,
            arrows: { to: { enabled: true, type: "diamond" } },
            smooth: { type: "curvedCW", forceDirection: "vertical", roundness: 0.2 },
            color: relationEdgeColor,
            width: edgeWidth,
            font: { size: edgeFontSize },
        });
        checkedRelations.push({ from: relation.from, property: relation.property, to: relation.to, fromClass: classIriByColumnKey[relation.from], toClass: classIriByColumnKey[relation.to] });
    });

    // tables side by side, each above its columns, the classes on top
    const positions = {};
    let nextColumnX = 0;
    tableNames.forEach(function (tableName) {
        const tableColumnNodes = nodes.filter((node) => node.data.type == "Column" && node.data.dataTable == tableName);
        tableColumnNodes.forEach(function (columnNode, columnIndex) {
            positions[columnNode.id] = { x: nextColumnX + columnIndex * nodeSpacing, y: layerYByNodeType.Column };
        });
        positions[tableName] = { x: nextColumnX + ((tableColumnNodes.length - 1) * nodeSpacing) / 2, y: layerYByNodeType.Table };
        nextColumnX += Math.max(tableColumnNodes.length, 1) * nodeSpacing + nodeSpacing;
    });
    classIris.forEach(function (classIri, classIndex) {
        positions[classIri] = { x: classIndex * nodeSpacing, y: layerYByNodeType.Class };
    });

    const mapping = {
        nodes: nodes,
        edges: edges,
        context: editorContext,
        positions: positions,
        options: {
            config: {
                sparqlServerUrl: "_default",
                graphUri: mappingContext.instanceNamespace,
                prefixes: {},
                lookups: {},
                databaseSources: { [mappingContext.databaseId]: { name: mappingContext.databaseName } },
                csvSources: {},
                isConfigInMappingGraph: true,
                lastUpdate: { user: mappingContext.userLogin, date: new Date().toISOString() },
            },
        },
    };
    return { mapping: mapping, problems: problems, checkedRelations: checkedRelations };
}

// a text column holds any range, a date needs a format there
function getLiteralRangeWarnings(mappingAnswer, columnsByTable) {
    const warnings = [];
    (mappingAnswer.resources || []).forEach(function (resource) {
        (resource.literals || []).forEach(function (literal) {
            const schemaColumn = (columnsByTable[resource.table] || []).find((column) => column.column_name == literal.column);
            if (!schemaColumn) {
                return;
            }
            const sqlType = String(schemaColumn.data_type).toLowerCase();
            const matchingTypeRule = rangesBySqlTypeRegex.find(([sqlTypeRegex]) => sqlTypeRegex.test(sqlType));
            const literalKey = resource.table + "." + literal.column;
            if (matchingTypeRule && !matchingTypeRule[1].includes(literal.range)) {
                warnings.push(literalKey + ": SQL type " + sqlType + " read as " + literal.range);
            } else if (!matchingTypeRule && (literal.range == "xsd:date" || literal.range == "xsd:dateTime") && !literal.dateFormat) {
                warnings.push(literalKey + ": SQL type " + sqlType + " read as " + literal.range + " without a date format");
            }
        });
    });
    return warnings;
}

// the source is read with its imports, its validated version among them
async function checkMappingRelations(checkedRelations, source, userContext) {
    if (checkedRelations.length == 0) {
        return [];
    }
    const checkedOntologies = getImportedOntologies(userContext.userSources[source].imports || [], userContext.userSources);
    const ontologyModels = await callVocablesFunction("OntologyModels", "registerSourcesModel", [checkedOntologies, {}], userContext);
    const links = checkedRelations.map((relation) => ({ from: relation.fromClass, property: relation.property, to: relation.toClass }));
    const statuses = await getLinkStatuses(source, checkedOntologies, ontologyModels, links, userContext);
    return checkedRelations.map(function (relation, relationIndex) {
        return {
            ...relation,
            propertyLabel: getModelLabel(relation.property, checkedOntologies, ontologyModels),
            status: statuses[relationIndex],
        };
    });
}

export { getMappingDocument, getLiteralRangeWarnings, checkMappingRelations };
