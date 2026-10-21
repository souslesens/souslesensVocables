const KEY_SEPARATOR = "|";
const DEFAULT_LITERAL_RANGE = "http://www.w3.org/2000/01/rdf-schema#Literal";
const RDFS_NAMESPACE = "http://www.w3.org/2000/01/rdf-schema#";
// postgres cuts an identifier at 63 bytes: two long aliases sharing their first 63 bytes come back as one column
const postgresIdentifierMaxBytes = 63;
const utf8Encoder = new TextEncoder();
// the data_type information_schema.columns gives the postgres text, date and time types
const postgresTextDataTypes = ["text", "character varying", "character"];
const postgresDateDataTypes = ["date", "timestamp without time zone", "timestamp with time zone", "time without time zone", "time with time zone"];
// no equality, which SELECT DISTINCT needs
const postgresDataTypesSelectedAsText = ["xml", "json", "point", "line", "lseg", "box", "path", "polygon", "circle"];

// the text of a date depends on DateStyle and holds the time: a date joined on a text keeps its join error rather than
// an empty result
function isJoinableAsText(dataType) {
    return Boolean(dataType) && !postgresTextDataTypes.includes(dataType) && !postgresDateDataTypes.includes(dataType);
}

// Recognize both CURIEs and full standard URIs without changing relation keys.
function getStandardPredicateKind(value) {
    if (value === "rdf:type" || value === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") return "rdf:type";
    if (value === "rdfs:subClassOf" || value === `${RDFS_NAMESPACE}subClassOf`) return "rdfs:subClassOf";
    if (value === "rdfs:label" || value === `${RDFS_NAMESPACE}label`) return "rdfs:label";
    return undefined;
}

function getEdgePredicateKind(edge) {
    return getStandardPredicateKind(edge.data?.id) ?? getStandardPredicateKind(edge.data?.type);
}

export function quoteIdentifier(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
}

// postgres only: dbConnector.getKGModel lists the public schema only, a database may set another search_path
export function quotePublicTableName(table) {
    return `"public".${quoteIdentifier(table)}`;
}

function truncateSqlAlias(alias, suffix) {
    // code points, a cut surrogate pair would reach postgres as another character
    const aliasCharacters = Array.from(alias);
    while (utf8Encoder.encode(aliasCharacters.join("") + suffix).length > postgresIdentifierMaxBytes) {
        aliasCharacters.pop();
    }
    return aliasCharacters.join("") + suffix;
}

export function getUriLocalName(uri) {
    if (!uri) return "";
    const value = String(uri);
    const index = Math.max(value.lastIndexOf("#"), value.lastIndexOf("/"), value.lastIndexOf(":"));
    return index >= 0 ? value.slice(index + 1) : value;
}

export function getClassLabel(classUri, json) {
    const node = json.nodes.find((node) => node.data?.type === "Class" && (node.id === classUri || node.data?.id === classUri));
    return node?.data?.label ?? node?.label ?? getUriLocalName(classUri);
}

// a column linked to a column of its own class in the same table (superior_funct_loc of a functional
// Location) is read as a value of that column, never joined on. The value column is the end with no
// other relation: isMainColumn cannot tell, in PAZFLOR_ABOX superiorfunctionallocation is the main one.
function getSameClassValueColumns(json) {
    const tableByColumn = new Map(json.nodes.map((node) => [node.id, node.data?.dataTable]));
    const classByColumn = new Map();
    const relationCountByColumn = new Map();

    for (const edge of json.edges) {
        if (getEdgePredicateKind(edge) === "rdf:type") {
            classByColumn.set(edge.from, edge.to);
            continue;
        }
        // a table to column edge carries no predicate
        if (!edge.data?.id) continue;
        relationCountByColumn.set(edge.from, (relationCountByColumn.get(edge.from) ?? 0) + 1);
        relationCountByColumn.set(edge.to, (relationCountByColumn.get(edge.to) ?? 0) + 1);
    }

    const subjectColumnByValueColumn = new Map();

    for (const edge of json.edges) {
        if (getEdgePredicateKind(edge) === "rdf:type" || !edge.data?.id || edge.from === edge.to) continue;

        const subjectClassUri = classByColumn.get(edge.from);

        // a node and its parent sit in the same row, a link across tables is a real relation
        if (!subjectClassUri || subjectClassUri !== classByColumn.get(edge.to) || tableByColumn.get(edge.from) !== tableByColumn.get(edge.to)) continue;

        const isFromOnlyInThisRelation = relationCountByColumn.get(edge.from) === 1;
        const isToOnlyInThisRelation = relationCountByColumn.get(edge.to) === 1;

        if (isToOnlyInThisRelation && !isFromOnlyInThisRelation) {
            subjectColumnByValueColumn.set(edge.to, edge.from);
        } else if (isFromOnlyInThisRelation && !isToOnlyInThisRelation) {
            subjectColumnByValueColumn.set(edge.from, edge.to);
        } else {
            console.warn("Same class relation with no value column to read:", edge.from, edge.to);
        }
    }

    return subjectColumnByValueColumn;
}

export function getPredicateLabel(predicateUri, json) {
    const edge = json.edges.find((edge) => edge.data?.id === predicateUri);
    return edge?.data?.label ?? edge?.label ?? getUriLocalName(predicateUri);
}

export function getRangeLabel(range, json) {
    const node = json.nodes.find((node) => node.id === range || node.data?.id === range);
    return node?.data?.label ?? node?.label ?? getUriLocalName(range);
}

export function buildMappingAlias(mapping, role, json) {
    const subjectLabel = mapping.subjectLabel ?? getClassLabel(mapping.subjectUri, json);
    if (role === "subject") return subjectLabel;
    if (role === "object" && mapping.kind === "objectProperty") {
        return mapping.objectLabel ?? getClassLabel(mapping.objectUri, json);
    }
    if (role === "object" && mapping.kind === "dataProperty") {
        return `${subjectLabel}_${mapping.predicateLabel ?? getUriLocalName(mapping.predicateUri)}`;
    }
    throw new Error(`Unsupported mapping kind/role: ${mapping.kind}/${role}`);
}

export function buildObjectPropertyKey(subjectClassUri, predicateUri, objectClassUri) {
    return [subjectClassUri, predicateUri, objectClassUri].join(KEY_SEPARATOR);
}

export function buildDataPropertyKey(nodeUri, predicateUri, range, format = null) {
    const parts = [nodeUri, predicateUri, range ?? DEFAULT_LITERAL_RANGE];
    if (format) parts.push(format);
    return parts.join(KEY_SEPARATOR);
}

export function getDatabaseSources(json) {
    return json?.options?.config?.databaseSources ?? {};
}

export function getDatasource(columnData, json) {
    if (columnData?.datasource) return columnData.datasource;

    const table = columnData?.dataTable;
    if (!table) return undefined;

    const tableNode = json.nodes.find((node) => node.data?.type === "Table" && node.data?.dataTable === table);

    return tableNode?.data?.datasource;
}

export function getDatabaseName(datasource, json) {
    const databaseSources = getDatabaseSources(json);
    return databaseSources?.[datasource]?.name ?? datasource;
}

export function extractRelationMap(json) {
    if (!json?.nodes || !json?.edges) {
        throw new Error("Invalid mapping JSON: nodes and edges are required");
    }

    const nodesById = new Map(json.nodes.map((node) => [node.id, node]));
    const classByColumn = new Map();
    const classMappingKindByColumn = new Map();
    const validColumnTypes = ["Column", "VirtualColumn"];

    // A column -> Class rdf:type maps instance identifiers.
    // A column -> Class rdfs:subClassOf maps identifiers of generated subclasses.
    // Preserve that distinction; column -> column subclass edges are relations,
    // not evidence that the columns share a class.
    for (const edge of json.edges) {
        const kind = getEdgePredicateKind(edge);
        if (kind !== "rdf:type" && kind !== "rdfs:subClassOf") continue;
        const source = nodesById.get(edge.from);
        const target = nodesById.get(edge.to);
        if (!validColumnTypes.includes(source?.data?.type)) continue;
        if (target?.data?.type !== "Class") continue;
        const classUri = target.data?.id ?? target.id;
        if (!classByColumn.has(edge.from) || kind === "rdf:type") {
            classByColumn.set(edge.from, classUri);
            classMappingKindByColumn.set(edge.from, kind);
        }
    }

    // A column rdf:type -> column of generated subclasses holds instances of their parent class.
    // The generated subclass of each instance is read on the same row, as a property of the instance.
    const instanceColumnByGeneratedClassColumn = new Map();
    for (const edge of json.edges) {
        if (getEdgePredicateKind(edge) !== "rdf:type" || classByColumn.has(edge.from)) continue;
        if (classMappingKindByColumn.get(edge.to) !== "rdfs:subClassOf") continue;
        classByColumn.set(edge.from, classByColumn.get(edge.to));
        classMappingKindByColumn.set(edge.from, "rdf:type");
        instanceColumnByGeneratedClassColumn.set(edge.to, edge.from);
    }

    const classesByTable = new Map();

    for (const [columnNodeId, classUri] of classByColumn) {
        const node = nodesById.get(columnNodeId);
        const table = node?.data?.dataTable;
        if (!table) continue;

        if (!classesByTable.has(table)) {
            classesByTable.set(table, new Set());
        }

        classesByTable.get(table).add(classUri);
    }

    const subjectColumnByValueColumn = getSameClassValueColumns(json);

    function getClassUri(columnNodeId) {
        const direct = classByColumn.get(columnNodeId);
        if (direct) return direct;

        const node = nodesById.get(columnNodeId);
        const table = node?.data?.dataTable;
        if (!table) return undefined;

        const classes = classesByTable.get(table);
        if (classes?.size === 1) {
            return [...classes][0];
        }

        return undefined;
    }

    function findColumnData(table, columnName, fallbackDatasource) {
        const node = json.nodes.find((candidate) => ["Column", "VirtualColumn"].includes(candidate.data?.type) && candidate.data?.dataTable === table && candidate.data?.id === columnName);

        if (node) return node.data;

        return {
            id: columnName,
            label: columnName,
            type: "Column",
            dataTable: table,
            datasource: fallbackDatasource,
            synthetic: true,
        };
    }

    const result = new Map();

    function addMapping(key, mapping) {
        if (!result.has(key)) result.set(key, []);
        result.get(key).push(mapping);
    }

    function getColumnSubjectUri(node) {
        return getClassUri(node.id) ?? `urn:column:${node.data.dataTable}.${node.data.id}`;
    }

    // Labels are literal values even when the target column has a class mapping.
    // Avoid duplicates when the same label occurs in both representations.
    const labelMappings = new Set();
    function addLabelMapping(fromNode, objectColumn, range = DEFAULT_LITERAL_RANGE, format = null) {
        // a generated subclass is labelled next to its instances, never as an instance of the parent class
        const instanceColumnId = instanceColumnByGeneratedClassColumn.get(fromNode.id);
        const subjectNode = instanceColumnId ? nodesById.get(instanceColumnId) : fromNode;
        // both spellings of rdfs:label share one key, so the tree shows one label.
        // rdf:type/rdfs:label is the SPARQL path to the label of the instance's class
        const predicateUri = instanceColumnId ? "rdf:type/rdfs:label" : "rdfs:label";
        const subjectUri = getColumnSubjectUri(subjectNode);
        const key = buildDataPropertyKey(subjectUri, predicateUri, range, format);
        const identity = JSON.stringify([
            key,
            getDatasource(subjectNode.data, json),
            subjectNode.data.dataTable,
            subjectNode.data.id,
            getDatasource(objectColumn, json),
            objectColumn.dataTable,
            objectColumn.id,
        ]);
        if (labelMappings.has(identity)) return;
        labelMappings.add(identity);
        addMapping(key, {
            kind: "dataProperty",
            semanticRelationKind: "label",
            subjectClassMappingKind: classMappingKindByColumn.get(subjectNode.id) ?? (getClassUri(subjectNode.id) ? "tableInference" : "generatedClass"),
            from: subjectNode.data,
            to: objectColumn,
            subjectUri,
            subjectLabel: getClassLabel(subjectUri, json),
            predicateUri,
            predicateLabel: instanceColumnId ? "classLabel" : "label",
            objectUri: range,
            objectLabel: getRangeLabel(range, json),
            range,
            format,
        });
    }

    for (const [generatedClassColumnId, instanceColumnId] of instanceColumnByGeneratedClassColumn) {
        const classUri = classByColumn.get(instanceColumnId);
        addMapping(buildDataPropertyKey(classUri, "rdf:type", DEFAULT_LITERAL_RANGE), {
            kind: "dataProperty",
            semanticRelationKind: "class",
            subjectClassMappingKind: "rdf:type",
            from: nodesById.get(instanceColumnId).data,
            to: nodesById.get(generatedClassColumnId).data,
            subjectUri: classUri,
            subjectLabel: getClassLabel(classUri, json),
            predicateUri: "rdf:type",
            predicateLabel: "class",
            objectUri: DEFAULT_LITERAL_RANGE,
            objectLabel: getRangeLabel(DEFAULT_LITERAL_RANGE, json),
            range: DEFAULT_LITERAL_RANGE,
            format: null,
        });
    }

    for (const edge of json.edges) {
        const predicateKind = getEdgePredicateKind(edge);
        if (predicateKind === "rdf:type") continue;
        // A column-to-Class subclass edge is schema mapping, not a SQL
        // object-property relation. Column-to-column edges remain eligible.
        if (predicateKind === "rdfs:subClassOf" && nodesById.get(edge.to)?.data?.type === "Class") continue;

        const predicateUri = edge.data?.id ?? predicateKind;
        if (!predicateUri) continue;

        const fromNode = nodesById.get(edge.from);
        const toNode = nodesById.get(edge.to);

        if (!fromNode || !toNode) continue;

        if (!validColumnTypes.includes(fromNode.data?.type) || !validColumnTypes.includes(toNode.data?.type)) {
            continue;
        }

        if (predicateKind === "rdfs:label") {
            addLabelMapping(fromNode, toNode.data, edge.data?.range ?? DEFAULT_LITERAL_RANGE, edge.data?.dateFormat ?? null);
            continue;
        }

        // Column values identify generated OWL classes for subclass relations.
        if (predicateKind === "rdfs:subClassOf" && validColumnTypes.includes(fromNode.data?.type) && validColumnTypes.includes(toNode.data?.type)) {
            const subjectClassUri = getClassUri(edge.from) ?? `urn:column:${fromNode.data.dataTable}.${fromNode.data.id}`;

            const objectClassUri = getClassUri(edge.to) ?? `urn:column:${toNode.data.dataTable}.${toNode.data.id}`;

            const key = buildObjectPropertyKey(subjectClassUri, predicateUri, objectClassUri);

            addMapping(key, {
                kind: "objectProperty",
                semanticRelationKind: "subClassOf",
                subjectClassMappingKind: classMappingKindByColumn.get(edge.from) ?? "generatedClass",
                objectClassMappingKind: classMappingKindByColumn.get(edge.to) ?? "generatedClass",
                from: fromNode.data,
                to: toNode.data,
                subjectUri: subjectClassUri,
                subjectLabel: getClassLabel(subjectClassUri, json),
                predicateUri,
                predicateLabel: "subClassOf",
                objectUri: objectClassUri,
                objectLabel: getClassLabel(objectClassUri, json),
            });

            continue;
        }

        const subjectClassUri = getClassUri(edge.from);
        const objectClassUri = getClassUri(edge.to);

        if (!subjectClassUri || !objectClassUri) {
            console.warn("Cannot resolve RDF classes for object property:", {
                predicateUri,
                from: edge.from,
                to: edge.to,
                subjectClassUri,
                objectClassUri,
            });
            continue;
        }

        const isValueColumnTo = subjectColumnByValueColumn.get(edge.to) === edge.from;
        const isValueColumnFrom = subjectColumnByValueColumn.get(edge.from) === edge.to;

        if (isValueColumnTo || isValueColumnFrom) {
            const subjectColumnNode = isValueColumnTo ? fromNode : toNode;
            const valueNode = isValueColumnTo ? toNode : fromNode;

            addMapping(buildDataPropertyKey(subjectClassUri, predicateUri, DEFAULT_LITERAL_RANGE), {
                kind: "dataProperty",
                subjectClassMappingKind: classMappingKindByColumn.get(subjectColumnNode.id) ?? "tableInference",
                from: subjectColumnNode.data,
                to: valueNode.data,
                subjectUri: subjectClassUri,
                subjectLabel: getClassLabel(subjectClassUri, json),
                predicateUri,
                predicateLabel: `label_${valueNode.data.id}`,
                objectUri: DEFAULT_LITERAL_RANGE,
                objectLabel: getRangeLabel(DEFAULT_LITERAL_RANGE, json),
                range: DEFAULT_LITERAL_RANGE,
                format: null,
            });
            continue;
        }

        const key = buildObjectPropertyKey(subjectClassUri, predicateUri, objectClassUri);

        addMapping(key, {
            kind: "objectProperty",
            subjectClassMappingKind: classMappingKindByColumn.get(edge.from) ?? "tableInference",
            objectClassMappingKind: classMappingKindByColumn.get(edge.to) ?? "tableInference",
            from: fromNode.data,
            to: toNode.data,
            subjectUri: subjectClassUri,
            subjectLabel: getClassLabel(subjectClassUri, json),
            predicateUri,
            predicateLabel: edge.data?.label ?? getPredicateLabel(predicateUri, json),
            objectUri: objectClassUri,
            objectLabel: getClassLabel(objectClassUri, json),
        });
    }

    for (const node of json.nodes) {
        if (!validColumnTypes.includes(node.data?.type) || subjectColumnByValueColumn.has(node.id)) continue;

        const table = node.data?.dataTable;
        const datasource = getDatasource(node.data, json);
        const otherPredicates = Array.isArray(node.data?.otherPredicates) ? node.data.otherPredicates : [];
        const hasRdfsLabel =
            otherPredicates.some((predicate) => getStandardPredicateKind(predicate?.property) === "rdfs:label") ||
            json.edges.some((edge) => edge.from === node.id && getEdgePredicateKind(edge) === "rdfs:label");

        // as the KG builder (mappingsParser.js): rdfsLabel adds rdfs:label unless the column already has one,
        // in otherPredicates or as an edge, and writes it as a string
        if (node.data?.rdfsLabel && !hasRdfsLabel) {
            addLabelMapping(node, findColumnData(table, node.data.rdfsLabel, datasource), "xsd:string");
        }

        if (otherPredicates.length === 0) {
            continue;
        }

        const nodeUri = getClassUri(node.id);

        if (!nodeUri && otherPredicates.some((predicate) => getStandardPredicateKind(predicate?.property) !== "rdfs:label")) {
            console.warn("Cannot resolve node URI for otherPredicates:", {
                nodeId: node.id,
                table: node.data?.dataTable,
                column: node.data?.id,
            });
        }

        for (const predicate of otherPredicates) {
            const predicateUri = predicate?.property;
            const objectColumnName = predicate?.object;

            if (!predicateUri || !objectColumnName) continue;

            const range = predicate.range ?? DEFAULT_LITERAL_RANGE;
            const format = predicate.dateFormat ?? null;

            const objectColumn = findColumnData(table, objectColumnName, datasource);

            if (getStandardPredicateKind(predicateUri) === "rdfs:label") {
                addLabelMapping(node, objectColumn, range, format);
                continue;
            }
            if (!nodeUri) continue;

            const key = buildDataPropertyKey(nodeUri, predicateUri, range, format);

            addMapping(key, {
                kind: "dataProperty",
                subjectClassMappingKind: classMappingKindByColumn.get(node.id) ?? "tableInference",
                from: node.data,
                to: objectColumn,
                subjectUri: nodeUri,
                subjectLabel: getClassLabel(nodeUri, json),
                predicateUri,
                predicateLabel: getUriLocalName(predicateUri),
                objectUri: range,
                objectLabel: getRangeLabel(range, json),
                range,
                format,
            });
        }
    }

    return result;
}

export function extractTableJoins(json) {
    const nodesById = new Map(json.nodes.map((node) => [node.id, node]));
    const joins = [];
    const subjectColumnByValueColumn = getSameClassValueColumns(json);

    for (const node of json.nodes) {
        const parentId = node.data?.definedInColumn;
        if (!parentId || subjectColumnByValueColumn.has(node.id)) continue;

        // the main column can be a value column (superiorfunctionallocation in PAZFLOR_ABOX)
        const joinedParentId = subjectColumnByValueColumn.get(parentId) || parentId;
        const parentNode = nodesById.get(joinedParentId);

        if (!parentNode) {
            console.warn(`definedInColumn target not found: ${parentId}`);
            continue;
        }

        const fromTable = node.data?.dataTable;
        const fromColumn = node.data?.id;
        const toTable = parentNode.data?.dataTable;
        const toColumn = parentNode.data?.id;

        if (!fromTable || !fromColumn || !toTable || !toColumn) continue;
        if (fromTable === toTable) continue;

        joins.push({
            fromTable,
            fromColumn,
            toTable,
            toColumn,
            fromDatasource: getDatasource(node.data, json),
            toDatasource: getDatasource(parentNode.data, json),
        });
    }

    return joins;
}

export function buildJoinGraph(joins) {
    const graph = new Map();

    function add(table, connection) {
        if (!graph.has(table)) graph.set(table, []);
        graph.get(table).push(connection);
    }

    joins.forEach((join, index) => {
        const edge = { ...join, edgeId: index };

        add(join.fromTable, {
            edge,
            nextTable: join.toTable,
        });

        add(join.toTable, {
            edge,
            nextTable: join.fromTable,
        });
    });

    return graph;
}

export function findJoinPath(graph, startTable, targetTable) {
    if (startTable === targetTable) return [];

    const queue = [{ table: startTable, path: [] }];
    const visited = new Set([startTable]);

    while (queue.length) {
        const current = queue.shift();

        for (const connection of graph.get(current.table) ?? []) {
            const nextTable = connection.nextTable;
            if (visited.has(nextTable)) continue;

            const nextPath = [...current.path, connection.edge];

            if (nextTable === targetTable) {
                return nextPath;
            }

            visited.add(nextTable);
            queue.push({
                table: nextTable,
                path: nextPath,
            });
        }
    }

    return null;
}

export function findMinimumJoinSet(requiredTables, joins) {
    // sorted: the first of equal join sets wins, it must not depend on the click order
    const tables = [...requiredTables].sort();
    if (tables.length <= 1) return [];

    const graph = buildJoinGraph(joins);
    let best = null;

    for (const rootTable of tables) {
        const selectedEdges = new Map();
        let valid = true;

        for (const targetTable of tables) {
            if (targetTable === rootTable) continue;

            const path = findJoinPath(graph, rootTable, targetTable);

            if (!path) {
                valid = false;
                break;
            }

            for (const edge of path) {
                selectedEdges.set(edge.edgeId, edge);
            }
        }

        if (!valid) continue;

        const candidate = [...selectedEdges.values()];

        if (!best || candidate.length < best.length) {
            best = candidate;
        }
    }

    if (!best) {
        throw new Error(`No join on a class of the path connects the tables: ${tables.join(", ")}`);
    }

    return best;
}

function getMappingsForKeys(keys, relationMap, json) {
    const mappings = [];

    for (const key of keys) {
        const value = relationMap.get(key);

        if (!value) {
            throw new Error(`Relation key not found: ${key}`);
        }

        const values = Array.isArray(value) ? value : [value];

        for (const mapping of values) {
            if (!mapping.kind || !mapping.from?.dataTable || !mapping.from?.id || !mapping.to?.dataTable || !mapping.to?.id) {
                throw new Error(`Invalid mapping for key: ${key}`);
            }

            const fromDatasource = getDatasource(mapping.from, json);
            const toDatasource = getDatasource(mapping.to, json);

            if (fromDatasource && toDatasource && fromDatasource !== toDatasource) {
                throw new Error(`Cross-database relation is not supported:\n${key}\n` + `${fromDatasource} -> ${toDatasource}`);
            }

            const datasource = fromDatasource ?? toDatasource;

            if (!datasource) {
                throw new Error(`Cannot determine datasource for relation: ${key}`);
            }

            mappings.push({
                key,
                datasource,
                ...mapping,
            });
        }
    }

    return mappings;
}

export function groupMappingsByDatasource(keys, relationMap, json) {
    const mappings = getMappingsForKeys(keys, relationMap, json);
    const groups = new Map();

    for (const mapping of mappings) {
        if (!groups.has(mapping.datasource)) {
            groups.set(mapping.datasource, []);
        }

        groups.get(mapping.datasource).push(mapping);
    }

    return groups;
}

// two columns hold the same instances when their definedInColumn chains end on the same column, the identity column
// of the class (the isMainColumn flag cannot tell, see getSameClassValueColumns)
function buildIdentityColumnFinder(json) {
    const nodesById = new Map(json.nodes.map((node) => [node.id, node]));
    // one table column can carry the nodes of two classes: a mapping column is found by its node data first, which holds
    // while the relation map is built from this same json
    const nodesByData = new Map(json.nodes.map((node) => [node.data, node]));
    const nodesByTableColumn = new Map(json.nodes.map((node) => [JSON.stringify([node.data?.dataTable, node.data?.id]), node]));
    const subjectColumnByValueColumn = getSameClassValueColumns(json);

    return function findIdentityColumn(column) {
        const columnNodeId = (nodesByData.get(column) ?? nodesByTableColumn.get(JSON.stringify([column.dataTable, column.id])))?.id;
        let identityColumnId = columnNodeId;
        const chainColumnIds = new Set();
        while (nodesById.get(identityColumnId)?.data?.definedInColumn && !chainColumnIds.has(identityColumnId)) {
            chainColumnIds.add(identityColumnId);
            identityColumnId = nodesById.get(identityColumnId).data.definedInColumn;
        }
        // the main column can be a value column (superiorfunctionallocation in PAZFLOR_ABOX)
        identityColumnId = subjectColumnByValueColumn.get(identityColumnId) || identityColumnId;
        return { identityColumnId, isIdentityColumn: identityColumnId === columnNodeId };
    };
}

// a stable order: the JSON order of the nodes changes when the mapping is saved again
function compareColumns(leftColumn, rightColumn) {
    return leftColumn.dataTable.localeCompare(rightColumn.dataTable) || leftColumn.id.localeCompare(rightColumn.id);
}

function getMappingClassColumns(mapping) {
    const classColumns = [{ column: mapping.from, classUri: mapping.subjectUri }];
    if (mapping.kind === "objectProperty") {
        classColumns.push({ column: mapping.to, classUri: mapping.objectUri });
    }
    return classColumns;
}

// a join on a class outside the selected mappings would change the meaning of the rows
function extractPathClassJoins(mappings, findIdentityColumn) {
    const classColumnsByKey = new Map();
    for (const mapping of mappings) {
        for (const classColumn of getMappingClassColumns(mapping)) {
            const tableColumnKey = JSON.stringify([classColumn.column.dataTable, classColumn.column.id]);
            const classColumnKey = JSON.stringify([tableColumnKey, classColumn.classUri]);
            if (classColumnsByKey.has(classColumnKey)) continue;
            const { identityColumnId } = findIdentityColumn(classColumn.column);
            classColumnsByKey.set(classColumnKey, { ...classColumn, identityColumnId });
        }
    }

    const classColumns = [...classColumnsByKey.values()];
    const joins = [];
    for (let fromIndex = 0; fromIndex < classColumns.length; fromIndex++) {
        for (let toIndex = fromIndex + 1; toIndex < classColumns.length; toIndex++) {
            const fromClassColumn = classColumns[fromIndex];
            const toClassColumn = classColumns[toIndex];
            const isSameClassInstance = fromClassColumn.classUri === toClassColumn.classUri && fromClassColumn.identityColumnId && fromClassColumn.identityColumnId === toClassColumn.identityColumnId;
            if (!isSameClassInstance || fromClassColumn.column.dataTable === toClassColumn.column.dataTable) continue;
            joins.push({
                fromTable: fromClassColumn.column.dataTable,
                fromColumn: fromClassColumn.column.id,
                toTable: toClassColumn.column.dataTable,
                toColumn: toClassColumn.column.id,
            });
        }
    }
    // findMinimumJoinSet keeps the first of equal candidates
    const joinSortKey = (join) => [join.fromTable, join.fromColumn, join.toTable, join.toColumn].join(KEY_SEPARATOR);
    joins.sort((leftJoin, rightJoin) => joinSortKey(leftJoin).localeCompare(joinSortKey(rightJoin)));
    return joins;
}

// the tables of the path, its joins, and one column per data property: several tables for one data property would
// add rows, drop rows and repeat its filter
function planPathTablesAndColumns(mappings, json) {
    const findIdentityColumn = buildIdentityColumnFinder(json);
    const isIdentityColumnMapping = (mapping) => findIdentityColumn(mapping.from).isIdentityColumn;
    const compareMappingColumns = (leftMapping, rightMapping) => compareColumns(leftMapping.from, rightMapping.from);

    const objectMappings = [];
    const dataMappingsByKey = new Map();
    for (const mapping of mappings) {
        if (mapping.kind === "objectProperty") {
            objectMappings.push(mapping);
            continue;
        }
        if (!dataMappingsByKey.has(mapping.key)) dataMappingsByKey.set(mapping.key, []);
        dataMappingsByKey.get(mapping.key).push(mapping);
    }
    for (const keyMappings of dataMappingsByKey.values()) {
        keyMappings.sort(compareMappingColumns);
    }
    for (const keyMappings of dataMappingsByKey.values()) {
        // tables holding different individuals of the class: no column can stand for the others
        const identityColumnIds = new Set(keyMappings.map((mapping) => findIdentityColumn(mapping.from).identityColumnId));
        if (identityColumnIds.size > 1) {
            const keyTables = keyMappings.map((mapping) => mapping.from.dataTable);
            throw new Error(`${keyMappings[0].subjectLabel} ${keyMappings[0].predicateLabel} is mapped on unrelated columns of ${keyTables.join(", ")}, set their definedInColumn`);
        }
    }

    const pathTables = new Set();
    for (const mapping of objectMappings) {
        pathTables.add(mapping.from.dataTable);
        pathTables.add(mapping.to.dataTable);
    }
    // no object property: the table of the identity column of each class
    let pathJoinMappings = objectMappings;
    if (!pathTables.size) {
        const dataMappingsByClass = new Map();
        for (const keyMappings of dataMappingsByKey.values()) {
            const classUri = keyMappings[0].subjectUri;
            if (!dataMappingsByClass.has(classUri)) dataMappingsByClass.set(classUri, []);
            dataMappingsByClass.get(classUri).push(...keyMappings);
        }
        for (const classMappings of dataMappingsByClass.values()) {
            classMappings.sort(compareMappingColumns);
            const identityMapping = classMappings.find(isIdentityColumnMapping) ?? classMappings[0];
            pathTables.add(identityMapping.from.dataTable);
        }
        pathJoinMappings = [];
        for (const keyMappings of dataMappingsByKey.values()) {
            for (const mapping of keyMappings) {
                if (pathTables.has(mapping.from.dataTable)) pathJoinMappings.push(mapping);
            }
        }
    }
    // the path joins come from the relations: a checked data property must not change how the rows are linked
    const selectedJoins = findMinimumJoinSet(pathTables, extractPathClassJoins(pathJoinMappings, findIdentityColumn));
    const baseTable = selectedJoins.length ? selectedJoins[0].toTable : [...pathTables][0];

    const selectedDataMappings = [];
    const outerMappings = [];
    for (const keyMappings of dataMappingsByKey.values()) {
        const pathTableMappings = keyMappings.filter((mapping) => pathTables.has(mapping.from.dataTable));
        if (pathTableMappings.length) {
            const baseTableMapping = pathTableMappings.find((mapping) => mapping.from.dataTable === baseTable);
            selectedDataMappings.push(pathTableMappings.find(isIdentityColumnMapping) ?? baseTableMapping ?? pathTableMappings[0]);
            continue;
        }
        outerMappings.push(keyMappings.find(isIdentityColumnMapping) ?? keyMappings[0]);
    }

    // the path column a LEFT JOIN is linked on: the base table first, then a stable order
    const pathClassColumns = [];
    for (const mapping of objectMappings.concat(selectedDataMappings)) {
        for (const classColumn of getMappingClassColumns(mapping)) {
            pathClassColumns.push({ ...classColumn, identityColumnId: findIdentityColumn(classColumn.column).identityColumnId });
        }
    }
    pathClassColumns.sort((leftClassColumn, rightClassColumn) => {
        const isLeftInBaseTable = leftClassColumn.column.dataTable === baseTable;
        const isRightInBaseTable = rightClassColumn.column.dataTable === baseTable;
        if (isLeftInBaseTable !== isRightInBaseTable) return isLeftInBaseTable ? -1 : 1;
        return compareColumns(leftClassColumn.column, rightClassColumn.column);
    });

    const outerJoinsByTable = new Map();
    const pathColumnDataMappings = [];
    const outerJoinedMappings = [];
    for (const mapping of outerMappings) {
        const outerTable = mapping.from.dataTable;
        const { identityColumnId } = findIdentityColumn(mapping.from);
        const pathClassColumn = pathClassColumns.find((classColumn) => classColumn.classUri === mapping.subjectUri && classColumn.identityColumnId === identityColumnId);
        if (!pathClassColumn) {
            throw new Error(`No column of ${mapping.subjectLabel} on the path to read ${mapping.predicateLabel} from ${outerTable}`);
        }
        // read on the path column, no LEFT JOIN: an id missing from the outer table, which the graph has no triple
        // for, still shows its value (Karim's choice)
        const isValueOnClassColumn = mapping.to.dataTable === mapping.from.dataTable && mapping.to.id === mapping.from.id;
        if (isValueOnClassColumn) {
            pathColumnDataMappings.push({ ...mapping, from: pathClassColumn.column, to: pathClassColumn.column });
            continue;
        }
        outerJoinedMappings.push(mapping);
        if (!outerJoinsByTable.has(outerTable)) outerJoinsByTable.set(outerTable, { conditionsByJoinColumns: new Map(), valueColumns: new Set() });
        const outerJoin = outerJoinsByTable.get(outerTable);
        const condition = { pathTable: pathClassColumn.column.dataTable, pathColumn: pathClassColumn.column.id, outerColumn: mapping.from.id };
        outerJoin.conditionsByJoinColumns.set(JSON.stringify(condition), condition);
        outerJoin.valueColumns.add(mapping.to.id);
    }

    return {
        mappings: objectMappings.concat(selectedDataMappings, pathColumnDataMappings, outerJoinedMappings),
        pathTables,
        selectedJoins,
        baseTable,
        outerJoinsByTable,
    };
}

function buildSqlFromMappings(allMappings, json, dataTypesByTable = {}) {
    if (!allMappings.length) {
        throw new Error("No mappings supplied");
    }

    const { mappings, pathTables, selectedJoins, baseTable, outerJoinsByTable } = planPathTablesAndColumns(allMappings, json);

    const aliasByTable = new Map();
    let aliasIndex = 0;

    function getAlias(table) {
        if (!aliasByTable.has(table)) {
            aliasByTable.set(table, `t${aliasIndex++}`);
        }

        return aliasByTable.get(table);
    }

    for (const table of pathTables) {
        getAlias(table);
    }

    for (const join of selectedJoins) {
        getAlias(join.fromTable);
        getAlias(join.toTable);
    }

    const baseAlias = getAlias(baseTable);

    // postgres has no text = integer: the other side is compared as text, the text side keeps its index
    function buildJoinCondition(fromTable, fromColumn, toTable, toColumn) {
        const fromDataType = dataTypesByTable[fromTable]?.[fromColumn];
        const toDataType = dataTypesByTable[toTable]?.[toColumn];
        const shouldCastFromToText = postgresTextDataTypes.includes(toDataType) && isJoinableAsText(fromDataType);
        const shouldCastToToText = postgresTextDataTypes.includes(fromDataType) && isJoinableAsText(toDataType);
        const fromExpression = `${getAlias(fromTable)}.${quoteIdentifier(fromColumn)}${shouldCastFromToText ? "::text" : ""}`;
        const toExpression = `${getAlias(toTable)}.${quoteIdentifier(toColumn)}${shouldCastToToText ? "::text" : ""}`;
        return `${fromExpression}
   = ${toExpression}`;
    }

    const joinedTables = new Set([baseTable]);
    const pendingJoins = [...selectedJoins];
    const sqlJoins = [];
    // an inner join gives its two columns the same value on every row: a joined column maps to the one it equals
    // first in the FROM
    const equalExpressionByJoinedExpression = new Map();
    const getFirstEqualExpression = (expression) => equalExpressionByJoinedExpression.get(expression) ?? expression;

    while (pendingJoins.length) {
        let found = false;

        for (let i = 0; i < pendingJoins.length; i++) {
            const join = pendingJoins[i];

            const fromJoined = joinedTables.has(join.fromTable);
            const toJoined = joinedTables.has(join.toTable);

            if (fromJoined && !toJoined) {
                const fromAlias = getAlias(join.fromTable);
                const toAlias = getAlias(join.toTable);
                const fromExpression = `${fromAlias}.${quoteIdentifier(join.fromColumn)}`;
                const toExpression = `${toAlias}.${quoteIdentifier(join.toColumn)}`;

                sqlJoins.push(
                    `JOIN ${quotePublicTableName(join.toTable)} ${toAlias}
  ON ${buildJoinCondition(join.fromTable, join.fromColumn, join.toTable, join.toColumn)}`,
                );
                equalExpressionByJoinedExpression.set(toExpression, getFirstEqualExpression(fromExpression));

                joinedTables.add(join.toTable);
                pendingJoins.splice(i, 1);
                found = true;
                break;
            }

            if (toJoined && !fromJoined) {
                const fromAlias = getAlias(join.fromTable);
                const toAlias = getAlias(join.toTable);
                const fromExpression = `${fromAlias}.${quoteIdentifier(join.fromColumn)}`;
                const toExpression = `${toAlias}.${quoteIdentifier(join.toColumn)}`;

                sqlJoins.push(
                    `JOIN ${quotePublicTableName(join.fromTable)} ${fromAlias}
  ON ${buildJoinCondition(join.fromTable, join.fromColumn, join.toTable, join.toColumn)}`,
                );
                equalExpressionByJoinedExpression.set(fromExpression, getFirstEqualExpression(toExpression));

                joinedTables.add(join.fromTable);
                pendingJoins.splice(i, 1);
                found = true;
                break;
            }

            if (fromJoined && toJoined) {
                pendingJoins.splice(i, 1);
                found = true;
                break;
            }
        }

        if (!found) {
            throw new Error("Unable to build SQL join tree");
        }
    }

    // the distinct rows of an outer table: a table repeating an individual would repeat the path rows. Its values
    // are read as text since xml has no equality, its class ids as they are to join
    for (const [outerTable, { conditionsByJoinColumns, valueColumns }] of outerJoinsByTable) {
        const outerAlias = getAlias(outerTable);
        const onConditions = [];
        const outerColumns = new Map();
        for (const condition of conditionsByJoinColumns.values()) {
            onConditions.push(buildJoinCondition(condition.pathTable, condition.pathColumn, outerTable, condition.outerColumn));
            outerColumns.set(condition.outerColumn, quoteIdentifier(condition.outerColumn));
        }
        for (const valueColumn of valueColumns) {
            if (!outerColumns.has(valueColumn)) outerColumns.set(valueColumn, `${quoteIdentifier(valueColumn)}::text AS ${quoteIdentifier(valueColumn)}`);
        }
        const distinctColumns = [...outerColumns.values()].join(", ");
        sqlJoins.push(`LEFT JOIN (SELECT DISTINCT ${distinctColumns} FROM ${quotePublicTableName(outerTable)}) ${outerAlias}\n  ON ${onConditions.join("\n  AND ")}`);
    }

    // two classes on one column stay two columns, so a wrong mapping stays visible
    const getClassIdExpressionKey = (classUri, expression) => JSON.stringify([classUri, getFirstEqualExpression(expression)]);

    // a data property, rdfs:label included, covers the class id column it equals
    const dataPropertyClassIdExpressionKeys = new Set();
    for (const mapping of mappings) {
        if (mapping.kind !== "dataProperty") continue;
        dataPropertyClassIdExpressionKeys.add(getClassIdExpressionKey(mapping.subjectUri, `${getAlias(mapping.to.dataTable)}.${quoteIdentifier(mapping.to.id)}`));
    }

    // distinct expressions stay apart, except a class id covered by a data property or equal to one already shown
    const selectColumns = new Map();
    const aliasMap = new Map();
    const expressionAliases = new Map();
    const projectedClassIdExpressionKeys = new Set();

    function addProjection(semanticAlias, expression, metadata) {
        const isClassIdColumn = metadata.role === "subject" || metadata.kind === "objectProperty";
        if (isClassIdColumn) {
            const classIdExpressionKey = getClassIdExpressionKey(metadata.semanticUri, expression);
            if (dataPropertyClassIdExpressionKeys.has(classIdExpressionKey) || projectedClassIdExpressionKeys.has(classIdExpressionKey)) return;
            projectedClassIdExpressionKeys.add(classIdExpressionKey);
        }
        const key = JSON.stringify([semanticAlias, expression]);
        if (expressionAliases.has(key)) return;
        let sqlAlias = truncateSqlAlias(semanticAlias, "");
        let suffix = 2;
        while (selectColumns.has(sqlAlias)) {
            sqlAlias = truncateSqlAlias(semanticAlias, `_${suffix++}`);
        }
        const shouldSelectAsText = postgresDataTypesSelectedAsText.includes(dataTypesByTable[metadata.table]?.[metadata.column]);
        selectColumns.set(sqlAlias, shouldSelectAsText ? `${expression}::text` : expression);
        aliasMap.set(sqlAlias, { ...metadata, isClassIdColumn, semanticAlias, sqlAlias, expression });
        expressionAliases.set(key, sqlAlias);
    }

    for (const mapping of mappings) {
        for (const [role, column] of [
            ["subject", mapping.from],
            ["object", mapping.to],
        ]) {
            // the class id of a LEFT JOINed table repeats the path one, empty where the table misses the individual
            if (role === "subject" && outerJoinsByTable.has(column.dataTable)) continue;
            const semanticAlias = buildMappingAlias(mapping, role, json);
            const expression = `${getAlias(column.dataTable)}.${quoteIdentifier(column.id)}`;
            // the SQL filters find their column by key and type it by range and format
            const isFilterableColumn = role === "object";
            addProjection(semanticAlias, expression, {
                role,
                key: isFilterableColumn ? mapping.key : undefined,
                kind: mapping.kind,
                semanticUri: role === "subject" ? mapping.subjectUri : mapping.objectUri,
                classMappingKind: role === "subject" ? mapping.subjectClassMappingKind : mapping.objectClassMappingKind,
                range: isFilterableColumn ? mapping.range : undefined,
                format: isFilterableColumn ? mapping.format : undefined,
                table: column.dataTable,
                column: column.id,
                datasource: mapping.datasource,
            });
        }
    }
    const selectSql = [...selectColumns.entries()].map(([alias, expression]) => `${expression} AS ${quoteIdentifier(alias)}`).join(",\n    ");

    const whereConditions = new Set();

    for (const mapping of mappings) {
        // an IS NOT NULL on a LEFT JOINed table would drop the individuals it misses
        if (outerJoinsByTable.has(mapping.from.dataTable)) continue;
        const fromAlias = getAlias(mapping.from.dataTable);

        whereConditions.add(`${fromAlias}.${quoteIdentifier(mapping.from.id)} IS NOT NULL`);
        // a row without the object of a path relation holds no such relation in the graph
        if (mapping.kind === "objectProperty") {
            whereConditions.add(`${getAlias(mapping.to.dataTable)}.${quoteIdentifier(mapping.to.id)} IS NOT NULL`);
        }
    }

    const whereClause = whereConditions.size ? `WHERE ${[...whereConditions].join("\n  AND ")}` : "";

    // a table repeating its rows gives the same row twice, the graph holds each triple once
    const sql = `
SELECT DISTINCT
    ${selectSql}
FROM ${quotePublicTableName(baseTable)} ${baseAlias}
${sqlJoins.join("\n")}
${whereClause}
`.trim();
    return { sql, aliasMap };
}

export function buildSqlByDatabaseSources(keys, relationMap, json, dataTypesByDatasource = {}) {
    if (!Array.isArray(keys) || keys.length === 0) {
        throw new Error("keys must be a non-empty array");
    }

    const groups = groupMappingsByDatasource(keys, relationMap, json);

    const result = new Map();

    for (const [datasource, mappings] of groups) {
        const databaseName = getDatabaseName(datasource, json);
        const { sql, aliasMap } = buildSqlFromMappings(mappings, json, dataTypesByDatasource[datasource]);

        result.set(databaseName, {
            datasource,
            databaseName,
            sql,
            aliasMap,
        });
    }

    return result;
}

export function buildSqlFromKeys(keys, relationMap, json) {
    const queries = buildSqlByDatabaseSources(keys, relationMap, json);

    if (queries.size !== 1) {
        throw new Error(`Requested mappings span ${queries.size} database sources. ` + `Use buildSqlByDatabaseSources() instead.`);
    }

    return [...queries.values()][0].sql;
}

export function getRelationKeys(relationMap) {
    return [...relationMap.keys()];
}

export default {
    extractRelationMap,
    buildObjectPropertyKey,
    buildDataPropertyKey,
    getUriLocalName,
    getClassLabel,
    getPredicateLabel,
    getRangeLabel,
    buildMappingAlias,
    getRelationKeys,
    getDatabaseSources,
    getDatasource,
    getDatabaseName,
    extractTableJoins,
    buildJoinGraph,
    findJoinPath,
    findMinimumJoinSet,
    groupMappingsByDatasource,
    buildSqlFromKeys,
    buildSqlByDatabaseSources,
    quoteIdentifier,
};
