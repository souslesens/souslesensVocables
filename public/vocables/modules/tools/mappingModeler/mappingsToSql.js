
const KEY_SEPARATOR = "|";
const DEFAULT_LITERAL_RANGE = "http://www.w3.org/2000/01/rdf-schema#Literal";
const RDFS_NAMESPACE = "http://www.w3.org/2000/01/rdf-schema#";

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

export function getUriLocalName(uri) {
    if (!uri) return "";
    const value = String(uri);
    const index = Math.max(value.lastIndexOf("#"), value.lastIndexOf("/"), value.lastIndexOf(":"));
    return index >= 0 ? value.slice(index + 1) : value;
}

export function getClassLabel(classUri, json) {
    const node = json.nodes.find(node =>
        node.data?.type === "Class" &&
        (node.id === classUri || node.data?.id === classUri)
    );
    return node?.data?.label ?? node?.label ?? getUriLocalName(classUri);
}

export function getPredicateLabel(predicateUri, json) {
    const edge = json.edges.find(edge => edge.data?.id === predicateUri);
    return edge?.data?.label ?? edge?.label ?? getUriLocalName(predicateUri);
}

export function getRangeLabel(range, json) {
    const node = json.nodes.find(node => node.id === range || node.data?.id === range);
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

    const tableNode = json.nodes.find(
        node => node.data?.type === "Table" && node.data?.dataTable === table
    );

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

    const nodesById = new Map(json.nodes.map(node => [node.id, node]));
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
        if (!classByColumn.has(edge.from) || kind === "rdf:type" || kind === "rdfs:subClassOf") {
            classByColumn.set(edge.from, classUri);
            classMappingKindByColumn.set(edge.from, kind);
        }
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
        const node = json.nodes.find(
            candidate =>
                ["Column", "VirtualColumn"].includes(candidate.data?.type) &&
                candidate.data?.dataTable === table &&
                candidate.data?.id === columnName
        );

        if (node) return node.data;

        return {
            id: columnName,
            label: columnName,
            type: "Column",
            dataTable: table,
            datasource: fallbackDatasource,
            synthetic: true
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
    function addLabelMapping(fromNode, objectColumn, predicateUri, range = DEFAULT_LITERAL_RANGE, format = null) {
        const subjectUri = getColumnSubjectUri(fromNode);
        const key = buildDataPropertyKey(subjectUri, predicateUri, range, format);
        const identity = JSON.stringify([key, getDatasource(fromNode.data, json),
            fromNode.data.dataTable, fromNode.data.id, getDatasource(objectColumn, json),
            objectColumn.dataTable, objectColumn.id]);
        if (labelMappings.has(identity)) return;
        labelMappings.add(identity);
        addMapping(key, {
            kind: "dataProperty",
            semanticRelationKind: "label",
            subjectClassMappingKind: classMappingKindByColumn.get(fromNode.id) ??
                (getClassUri(fromNode.id) ? "tableInference" : "generatedClass"),
            from: fromNode.data,
            to: objectColumn,
            subjectUri,
            subjectLabel: getClassLabel(subjectUri, json),
            predicateUri,
            predicateLabel: "label",
            objectUri: range,
            objectLabel: getRangeLabel(range, json),
            range,
            format
        });
    }

    for (const edge of json.edges) {
        const predicateKind = getEdgePredicateKind(edge);
        if (predicateKind === "rdf:type") continue;
        // A column-to-Class subclass edge is schema mapping, not a SQL
        // object-property relation. Column-to-column edges remain eligible.
        if (predicateKind === "rdfs:subClassOf" &&
            nodesById.get(edge.to)?.data?.type === "Class") continue;

        const predicateUri = edge.data?.id ?? predicateKind;
        if (!predicateUri) continue;

        const fromNode = nodesById.get(edge.from);
        const toNode = nodesById.get(edge.to);

        if (!fromNode || !toNode) continue;

        if (
            !validColumnTypes.includes(fromNode.data?.type) ||
            !validColumnTypes.includes(toNode.data?.type)
        ) {
            continue;
        }

        if (predicateKind === "rdfs:label") {
            addLabelMapping(fromNode, toNode.data, predicateUri,
                edge.data?.range ?? DEFAULT_LITERAL_RANGE, edge.data?.dateFormat ?? null);
            continue;
        }

        // Column values identify generated OWL classes for subclass relations.
        if (
            predicateKind === "rdfs:subClassOf" &&
            validColumnTypes.includes(fromNode.data?.type) &&
            validColumnTypes.includes(toNode.data?.type)
        ) {
            const subjectClassUri =
                getClassUri(edge.from) ??
                `urn:column:${fromNode.data.dataTable}.${fromNode.data.id}`;

            const objectClassUri =
                getClassUri(edge.to) ??
                `urn:column:${toNode.data.dataTable}.${toNode.data.id}`;

            const key = buildObjectPropertyKey(
                subjectClassUri,
                predicateUri,
                objectClassUri
            );

            addMapping(key, {
                kind: "objectProperty",
                semanticRelationKind: "subClassOf",
                subjectClassMappingKind:
                    classMappingKindByColumn.get(edge.from) ?? "generatedClass",
                objectClassMappingKind:
                    classMappingKindByColumn.get(edge.to) ?? "generatedClass",
                from: fromNode.data,
                to: toNode.data,
                subjectUri: subjectClassUri,
                subjectLabel: getClassLabel(subjectClassUri, json),
                predicateUri,
                predicateLabel: "subClassOf",
                objectUri: objectClassUri,
                objectLabel: getClassLabel(objectClassUri, json)
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
                objectClassUri
            });
            continue;
        }

        const key = buildObjectPropertyKey(
            subjectClassUri,
            predicateUri,
            objectClassUri
        );

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
            objectLabel: getClassLabel(objectClassUri, json)
        });
    }

    for (const node of json.nodes) {
        if (!validColumnTypes.includes(node.data?.type)) continue;

        const table = node.data?.dataTable;
        const datasource = getDatasource(node.data, json);
        if (node.data?.rdfsLabel) {
            addLabelMapping(node, findColumnData(table, node.data.rdfsLabel, datasource), "rdfs:label");
        }

        const otherPredicates = node.data?.otherPredicates;
        if (!Array.isArray(otherPredicates) || otherPredicates.length === 0) {
            continue;
        }

        const nodeUri = getClassUri(node.id);

        if (!nodeUri && otherPredicates.some(predicate =>
            getStandardPredicateKind(predicate?.property) !== "rdfs:label")) {
            console.warn("Cannot resolve node URI for otherPredicates:", {
                nodeId: node.id,
                table: node.data?.dataTable,
                column: node.data?.id
            });
        }

        for (const predicate of otherPredicates) {
            const predicateUri = predicate?.property;
            const objectColumnName = predicate?.object;

            if (!predicateUri || !objectColumnName) continue;

            const range = predicate.range ?? DEFAULT_LITERAL_RANGE;
            const format = predicate.dateFormat ?? null;

            const objectColumn = findColumnData(
                table,
                objectColumnName,
                datasource
            );

            if (getStandardPredicateKind(predicateUri) === "rdfs:label") {
                addLabelMapping(node, objectColumn, predicateUri, range, format);
                continue;
            }
            if (!nodeUri) continue;

            const key = buildDataPropertyKey(
                nodeUri,
                predicateUri,
                range,
                format
            );

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
                format
            });
        }
    }

    return result;
}

export function extractTableJoins(json) {
    const nodesById = new Map(json.nodes.map(node => [node.id, node]));
    const joins = [];

    for (const node of json.nodes) {
        const parentId = node.data?.definedInColumn;
        if (!parentId) continue;

        const parentNode = nodesById.get(parentId);

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
            toDatasource: getDatasource(parentNode.data, json)
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
            nextTable: join.toTable
        });

        add(join.toTable, {
            edge,
            nextTable: join.fromTable
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
                path: nextPath
            });
        }
    }

    return null;
}

export function findMinimumJoinSet(requiredTables, joins) {
    const tables = [...requiredTables];
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
        throw new Error(
            `Cannot connect requested tables through definedInColumn: ${tables.join(", ")}`
        );
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
            if (
                !mapping.kind ||
                !mapping.from?.dataTable ||
                !mapping.from?.id ||
                !mapping.to?.dataTable ||
                !mapping.to?.id
            ) {
                throw new Error(`Invalid mapping for key: ${key}`);
            }

            const fromDatasource = getDatasource(mapping.from, json);
            const toDatasource = getDatasource(mapping.to, json);

            if (
                fromDatasource &&
                toDatasource &&
                fromDatasource !== toDatasource
            ) {
                throw new Error(
                    `Cross-database relation is not supported:\n${key}\n` +
                    `${fromDatasource} -> ${toDatasource}`
                );
            }

            const datasource = fromDatasource ?? toDatasource;

            if (!datasource) {
                throw new Error(
                    `Cannot determine datasource for relation: ${key}`
                );
            }

            mappings.push({
                key,
                datasource,
                ...mapping
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

function buildSqlFromMappings(mappings, json, schemaName = "public") {
    if (!mappings.length) {
        throw new Error("No mappings supplied");
    }

    const datasource = mappings[0].datasource;
    function qualifyTable(table) {
        return `${quoteIdentifier(schemaName)}.${quoteIdentifier(table)}`;
    }
    const requiredTables = new Set();

    for (const mapping of mappings) {
        requiredTables.add(mapping.from.dataTable);
        requiredTables.add(mapping.to.dataTable);
    }

    const allJoins = extractTableJoins(json);

    const datasourceJoins = allJoins.filter(join => {
        const fromOk =
            !join.fromDatasource ||
            join.fromDatasource === datasource;

        const toOk =
            !join.toDatasource ||
            join.toDatasource === datasource;

        return fromOk && toOk;
    });

    const selectedJoins = findMinimumJoinSet(
        requiredTables,
        datasourceJoins
    );

    const aliasByTable = new Map();
    let aliasIndex = 0;

    function getAlias(table) {
        if (!aliasByTable.has(table)) {
            aliasByTable.set(table, `t${aliasIndex++}`);
        }

        return aliasByTable.get(table);
    }

    for (const table of requiredTables) {
        getAlias(table);
    }

    for (const join of selectedJoins) {
        getAlias(join.fromTable);
        getAlias(join.toTable);
    }

    // Keep distinct physical expressions even when their semantic labels match.
    // Identical semantic label + expression pairs are deduplicated.
    const selectColumns = new Map();
    const aliasMap = new Map();
    const expressionAliases = new Map();

    function addProjection(semanticAlias, expression, metadata) {
        const key = JSON.stringify([semanticAlias, expression]);
        if (expressionAliases.has(key)) return;
        let sqlAlias = semanticAlias;
        let suffix = 2;
        while (selectColumns.has(sqlAlias)) {
            sqlAlias = `${semanticAlias}_${suffix++}`;
        }
        selectColumns.set(sqlAlias, expression);
        aliasMap.set(sqlAlias, { ...metadata, semanticAlias, sqlAlias, expression });
        expressionAliases.set(key, sqlAlias);
    }

    for (const mapping of mappings) {
        for (const [role, column] of [["subject", mapping.from], ["object", mapping.to]]) {
            const semanticAlias = buildMappingAlias(mapping, role, json);
            const expression = `${getAlias(column.dataTable)}.${quoteIdentifier(column.id)}`;
            addProjection(semanticAlias, expression, {
                role,
                kind: mapping.kind,
                semanticUri: role === "subject" ? mapping.subjectUri : mapping.objectUri,
                classMappingKind: role === "subject"
                    ? mapping.subjectClassMappingKind
                    : mapping.objectClassMappingKind,
                table: column.dataTable,
                column: column.id,
                datasource: mapping.datasource
            });
        }
    }
    const selectSql = [...selectColumns.entries()]
        .map(([alias, expression]) => `${expression} AS ${quoteIdentifier(alias)}`)
        .join(",\n    ");

    const baseTable = selectedJoins.length
        ? selectedJoins[0].toTable
        : [...requiredTables][0];

    const baseAlias = getAlias(baseTable);

    const joinedTables = new Set([baseTable]);
    const pendingJoins = [...selectedJoins];
    const sqlJoins = [];

    while (pendingJoins.length) {
        let found = false;

        for (let i = 0; i < pendingJoins.length; i++) {
            const join = pendingJoins[i];

            const fromJoined = joinedTables.has(join.fromTable);
            const toJoined = joinedTables.has(join.toTable);

            if (fromJoined && !toJoined) {
                const fromAlias = getAlias(join.fromTable);
                const toAlias = getAlias(join.toTable);

                sqlJoins.push(
                    `JOIN ${qualifyTable(join.toTable)} ${toAlias}
  ON ${fromAlias}.${quoteIdentifier(join.fromColumn)}
   = ${toAlias}.${quoteIdentifier(join.toColumn)}`
                );

                joinedTables.add(join.toTable);
                pendingJoins.splice(i, 1);
                found = true;
                break;
            }

            if (toJoined && !fromJoined) {
                const fromAlias = getAlias(join.fromTable);
                const toAlias = getAlias(join.toTable);

                sqlJoins.push(
                    `JOIN ${qualifyTable(join.fromTable)} ${fromAlias}
  ON ${fromAlias}.${quoteIdentifier(join.fromColumn)}
   = ${toAlias}.${quoteIdentifier(join.toColumn)}`
                );

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

    const whereConditions = new Set();

    for (const mapping of mappings) {
        const fromAlias = getAlias(mapping.from.dataTable);

        whereConditions.add(
            `${fromAlias}.${quoteIdentifier(mapping.from.id)} IS NOT NULL`
        );
    }

    const whereClause = whereConditions.size
        ? `WHERE ${[...whereConditions].join("\n  AND ")}`
        : "";

    const sql = `
SELECT
    ${selectSql}
FROM ${qualifyTable(baseTable)} ${baseAlias}
${sqlJoins.join("\n")}
${whereClause}
`.trim();
    return { sql, aliasMap };
}

// Pass a schema name as the fourth argument; existing calls use "public".
export function buildSqlByDatabaseSources(keys, relationMap, json, schemaName = "public") {
    if (!Array.isArray(keys) || keys.length === 0) {
        throw new Error("keys must be a non-empty array");
    }

    const groups = groupMappingsByDatasource(
        keys,
        relationMap,
        json
    );

    const result = new Map();

    for (const [datasource, mappings] of groups) {
        const databaseName = getDatabaseName(datasource, json);
        const { sql, aliasMap } = buildSqlFromMappings(mappings, json, schemaName);

        result.set(databaseName, {
            datasource,
            databaseName,
            sql,
            aliasMap
        });
    }

    return result;
}

export function buildSqlFromKeys(keys, relationMap, json, schemaName = "public") {
    const queries = buildSqlByDatabaseSources(
        keys,
        relationMap,
        json,
        schemaName
    );

    if (queries.size !== 1) {
        throw new Error(
            `Requested mappings span ${queries.size} database sources. ` +
            `Use buildSqlByDatabaseSources() instead.`
        );
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
    quoteIdentifier
};
