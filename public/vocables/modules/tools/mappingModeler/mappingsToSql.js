const KEY_SEPARATOR = "|";

const DEFAULT_LITERAL_RANGE =
    "http://www.w3.org/2000/01/rdf-schema#Literal";

/**
 * Quote a SQL identifier.
 */
export function quoteIdentifier(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Extract the local name from a URI or prefixed name.
 */
export function getUriLocalName(uri) {
    if (!uri) return "";

    const value = String(uri);

    const index = Math.max(
        value.lastIndexOf("#"),
        value.lastIndexOf("/"),
        value.lastIndexOf(":")
    );

    return index >= 0
        ? value.slice(index + 1)
        : value;
}

/**
 * Resolve the label of a semantic class.
 */
export function getClassLabel(classUri, json) {
    const node = json.nodes.find(
        node =>
            node.data?.type === "Class" &&
            (
                node.id === classUri ||
                node.data?.id === classUri
            )
    );

    return (
        node?.data?.label ??
        node?.label ??
        getUriLocalName(classUri)
    );
}

/**
 * Resolve the label of a semantic predicate.
 */
export function getPredicateLabel(predicateUri, json) {
    const edge = json.edges.find(
        edge => edge.data?.id === predicateUri
    );

    return (
        edge?.data?.label ??
        edge?.label ??
        getUriLocalName(predicateUri)
    );
}

/**
 * Resolve the label of a datatype or range.
 */
export function getRangeLabel(range, json) {
    const node = json.nodes.find(
        node =>
            node.id === range ||
            node.data?.id === range
    );

    return (
        node?.data?.label ??
        node?.label ??
        getUriLocalName(range)
    );
}

/**
 * Build a semantic SQL alias.
 *
 * Object properties:
 *   subject -> subjectLabel
 *   object  -> objectLabel
 *
 * Data properties:
 *   subject -> subjectLabel
 *   object  -> subjectLabel_predicateLabel
 */
export function buildMappingAlias(mapping, role, json) {
    const subjectLabel =
        mapping.subjectLabel ??
        getClassLabel(mapping.subjectUri, json);

    if (role === "subject") {
        return subjectLabel;
    }

    if (
        role === "object" &&
        mapping.kind === "objectProperty"
    ) {
        return (
            mapping.objectLabel ??
            getClassLabel(mapping.objectUri, json)
        );
    }

    if (
        role === "object" &&
        mapping.kind === "dataProperty"
    ) {
        const predicateLabel =
            mapping.predicateLabel ??
            getUriLocalName(mapping.predicateUri);

        return `${subjectLabel}_${predicateLabel}`;
    }

    throw new Error(
        `Unsupported mapping kind/role: ${mapping.kind}/${role}`
    );
}

/**
 * Build the key of an object property.
 */
export function buildObjectPropertyKey(
    subjectClassUri,
    predicateUri,
    objectClassUri
) {
    return [
        subjectClassUri,
        predicateUri,
        objectClassUri
    ].join(KEY_SEPARATOR);
}

/**
 * Build the key of a data property.
 *
 * Format:
 * subjectUri|predicateUri|range[|dateFormat]
 */
export function buildDataPropertyKey(
    nodeUri,
    predicateUri,
    range,
    format = null
) {
    const parts = [
        nodeUri,
        predicateUri,
        range ?? DEFAULT_LITERAL_RANGE
    ];

    if (format) {
        parts.push(format);
    }

    return parts.join(KEY_SEPARATOR);
}

/**
 * Return configured database sources.
 */
export function getDatabaseSources(json) {
    return (
        json?.options?.config?.databaseSources ??
        {}
    );
}

/**
 * Resolve the datasource of a physical column.
 */
export function getDatasource(columnData, json) {
    if (columnData?.datasource) {
        return columnData.datasource;
    }

    const table = columnData?.dataTable;

    if (!table) {
        return undefined;
    }

    const tableNode = json.nodes.find(
        node =>
            node.data?.type === "Table" &&
            node.data?.dataTable === table
    );

    return tableNode?.data?.datasource;
}

/**
 * Resolve a datasource name.
 */
export function getDatabaseName(datasource, json) {
    const sources = getDatabaseSources(json);

    return (
        sources?.[datasource]?.name ??
        datasource
    );
}

/**
 * Extract semantic relations from mapping JSON.
 *
 * Returns:
 *
 * Map<
 *   "subjectUri|predicateUri|objectUri",
 *   Mapping[]
 * >
 *
 * Each mapping includes:
 *
 * - kind
 * - from
 * - to
 * - subjectUri
 * - subjectLabel
 * - predicateUri
 * - predicateLabel
 * - objectUri
 * - objectLabel
 *
 * Data properties additionally include:
 *
 * - range
 * - format
 */
export function extractRelationMap(json) {
    if (
        !Array.isArray(json?.nodes) ||
        !Array.isArray(json?.edges)
    ) {
        throw new Error(
            "Invalid mapping JSON: nodes and edges are required"
        );
    }

    const nodesById = new Map(
        json.nodes.map(node => [
            node.id,
            node
        ])
    );

    const classByColumn = new Map();

    /*
     * Resolve explicit rdf:type declarations.
     */
    for (const edge of json.edges) {
        if (edge.data?.type === "rdf:type") {
            classByColumn.set(
                edge.from,
                edge.to
            );
        }
    }

    /*
     * Collect semantic classes associated with each
     * physical table.
     */
    const classesByTable = new Map();

    for (const [columnNodeId, classUri] of classByColumn) {
        const node = nodesById.get(columnNodeId);

        const table = node?.data?.dataTable;

        if (!table) {
            continue;
        }

        if (!classesByTable.has(table)) {
            classesByTable.set(
                table,
                new Set()
            );
        }

        classesByTable.get(table).add(classUri);
    }

    /**
     * Resolve the semantic class of a column.
     *
     * First use explicit rdf:type.
     *
     * Otherwise infer the class only when its table
     * has exactly one known semantic class.
     */
    function getClassUri(columnNodeId) {
        const direct = classByColumn.get(columnNodeId);

        if (direct) {
            return direct;
        }

        const node = nodesById.get(columnNodeId);

        const table = node?.data?.dataTable;

        if (!table) {
            return undefined;
        }

        const classes = classesByTable.get(table);

        if (classes?.size === 1) {
            return [...classes][0];
        }

        return undefined;
    }

    /**
     * Find a physical column or create a synthetic
     * descriptor when the column is not represented
     * by a graph node.
     */
    function findColumnData(
        table,
        columnName,
        fallbackDatasource
    ) {
        const node = json.nodes.find(
            candidate =>
                (
                    candidate.data?.type === "Column" ||
                    candidate.data?.type === "VirtualColumn"
                ) &&
                candidate.data?.dataTable === table &&
                candidate.data?.id === columnName
        );

        if (node) {
            return node.data;
        }

        return {
            id: columnName,
            label: columnName,
            type: "Column",
            dataTable: table,
            datasource: fallbackDatasource,
            synthetic: true
        };
    }

    const relationMap = new Map();

    /**
     * A semantic relation can have several physical
     * mappings.
     */
    function addMapping(key, mapping) {
        if (!relationMap.has(key)) {
            relationMap.set(key, []);
        }

        relationMap.get(key).push(mapping);
    }

    const validColumnTypes = new Set([
        "Column",
        "VirtualColumn"
    ]);

    /*
     * Extract object properties.
     */
    for (const edge of json.edges) {
        if (edge.data?.type === "rdf:type") {
            continue;
        }

        const predicateUri = edge.data?.id;

        if (!predicateUri) {
            continue;
        }

        const fromNode = nodesById.get(edge.from);
        const toNode = nodesById.get(edge.to);

        if (!fromNode || !toNode) {
            continue;
        }

        if (
            !validColumnTypes.has(fromNode.data?.type) ||
            !validColumnTypes.has(toNode.data?.type)
        ) {
            continue;
        }

        const subjectClassUri = getClassUri(edge.from);
        const objectClassUri = getClassUri(edge.to);

        if (!subjectClassUri || !objectClassUri) {
            console.warn(
                "Cannot resolve RDF classes for object property:",
                {
                    predicateUri,
                    from: edge.from,
                    to: edge.to,
                    subjectClassUri,
                    objectClassUri
                }
            );

            continue;
        }

        const key = buildObjectPropertyKey(
            subjectClassUri,
            predicateUri,
            objectClassUri
        );

        addMapping(key, {
            kind: "objectProperty",

            from: fromNode.data,
            to: toNode.data,

            subjectUri: subjectClassUri,
            subjectLabel: getClassLabel(
                subjectClassUri,
                json
            ),

            predicateUri,
            predicateLabel:
                edge.data?.label ??
                getPredicateLabel(predicateUri, json),

            objectUri: objectClassUri,
            objectLabel: getClassLabel(
                objectClassUri,
                json
            )
        });
    }

    /*
     * Extract data properties from otherPredicates.
     */
    for (const node of json.nodes) {
        if (!validColumnTypes.has(node.data?.type)) {
            continue;
        }

        const otherPredicates =
            node.data?.otherPredicates;

        if (
            !Array.isArray(otherPredicates) ||
            otherPredicates.length === 0
        ) {
            continue;
        }

        const nodeUri = getClassUri(node.id);

        if (!nodeUri) {
            console.warn(
                "Cannot resolve semantic class for otherPredicates:",
                {
                    nodeId: node.id,
                    table: node.data?.dataTable,
                    column: node.data?.id
                }
            );

            continue;
        }

        const table = node.data?.dataTable;

        const datasource = getDatasource(
            node.data,
            json
        );

        for (const predicate of otherPredicates) {
            const predicateUri = predicate?.property;
            const objectColumnName = predicate?.object;

            if (!predicateUri || !objectColumnName) {
                continue;
            }

            const range =
                predicate.range ??
                DEFAULT_LITERAL_RANGE;

            const format =
                predicate.dateFormat ??
                null;

            const objectColumn = findColumnData(
                table,
                objectColumnName,
                datasource
            );

            const key = buildDataPropertyKey(
                nodeUri,
                predicateUri,
                range,
                format
            );

            addMapping(key, {
                kind: "dataProperty",

                from: node.data,
                to: objectColumn,

                subjectUri: nodeUri,
                subjectLabel: getClassLabel(
                    nodeUri,
                    json
                ),

                predicateUri,
                predicateLabel:
                    getUriLocalName(predicateUri),

                objectUri: range,
                objectLabel: getRangeLabel(
                    range,
                    json
                ),

                range,
                format
            });
        }
    }

    return relationMap;
}

/**
 * Extract physical joins from definedInColumn.
 *
 * These joins are independent of semantic relations.
 */
export function extractTableJoins(json) {
    const nodesById = new Map(
        json.nodes.map(node => [
            node.id,
            node
        ])
    );

    const joins = [];

    for (const node of json.nodes) {
        const parentId =
            node.data?.definedInColumn;

        if (!parentId) {
            continue;
        }

        const parentNode = nodesById.get(parentId);

        if (!parentNode) {
            console.warn(
                `definedInColumn target not found: ${parentId}`
            );

            continue;
        }

        const fromTable =
            node.data?.dataTable;

        const fromColumn =
            node.data?.id;

        const toTable =
            parentNode.data?.dataTable;

        const toColumn =
            parentNode.data?.id;

        if (
            !fromTable ||
            !fromColumn ||
            !toTable ||
            !toColumn
        ) {
            continue;
        }

        if (fromTable === toTable) {
            continue;
        }

        joins.push({
            fromTable,
            fromColumn,

            toTable,
            toColumn,

            fromDatasource: getDatasource(
                node.data,
                json
            ),

            toDatasource: getDatasource(
                parentNode.data,
                json
            )
        });
    }

    return joins;
}

/**
 * Build an undirected graph of physical joins.
 */
export function buildJoinGraph(joins) {
    const graph = new Map();

    function add(table, connection) {
        if (!graph.has(table)) {
            graph.set(table, []);
        }

        graph.get(table).push(connection);
    }

    joins.forEach((join, index) => {
        const edge = {
            ...join,
            edgeId: index
        };

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

/**
 * Find the shortest physical join path between
 * two tables using BFS.
 */
export function findJoinPath(
    graph,
    startTable,
    targetTable
) {
    if (startTable === targetTable) {
        return [];
    }

    const queue = [
        {
            table: startTable,
            path: []
        }
    ];

    const visited = new Set([
        startTable
    ]);

    let queueIndex = 0;

    while (queueIndex < queue.length) {
        const current = queue[queueIndex++];

        for (
            const connection of
        graph.get(current.table) ?? []
            ) {
            const nextTable =
                connection.nextTable;

            if (visited.has(nextTable)) {
                continue;
            }

            const nextPath = [
                ...current.path,
                connection.edge
            ];

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

/**
 * Find a small join set connecting all required tables.
 *
 * Tries each required table as the root and retains
 * the candidate with the fewest join edges.
 */
export function findMinimumJoinSet(
    requiredTables,
    joins
) {
    const tables = [...requiredTables];

    if (tables.length <= 1) {
        return [];
    }

    const graph = buildJoinGraph(joins);

    let best = null;

    for (const rootTable of tables) {
        const selectedEdges = new Map();

        let valid = true;

        for (const targetTable of tables) {
            if (targetTable === rootTable) {
                continue;
            }

            const path = findJoinPath(
                graph,
                rootTable,
                targetTable
            );

            if (!path) {
                valid = false;
                break;
            }

            for (const edge of path) {
                selectedEdges.set(
                    edge.edgeId,
                    edge
                );
            }
        }

        if (!valid) {
            continue;
        }

        const candidate = [
            ...selectedEdges.values()
        ];

        if (
            !best ||
            candidate.length < best.length
        ) {
            best = candidate;
        }
    }

    if (!best) {
        throw new Error(
            "Cannot connect requested tables through " +
            "definedInColumn: " +
            tables.join(", ")
        );
    }

    return best;
}

/**
 * Resolve requested semantic keys into physical
 * mappings and validate their datasources.
 */
function getMappingsForKeys(
    keys,
    relationMap,
    json
) {
    const mappings = [];

    for (const key of keys) {
        const value = relationMap.get(key);

        if (!value) {
            throw new Error(
                `Relation key not found: ${key}`
            );
        }

        const values = Array.isArray(value)
            ? value
            : [value];

        for (const mapping of values) {
            if (
                !mapping.kind ||
                !mapping.from?.dataTable ||
                !mapping.from?.id ||
                !mapping.to?.dataTable ||
                !mapping.to?.id
            ) {
                throw new Error(
                    `Invalid mapping for key: ${key}`
                );
            }

            const fromDatasource = getDatasource(
                mapping.from,
                json
            );

            const toDatasource = getDatasource(
                mapping.to,
                json
            );

            if (
                fromDatasource &&
                toDatasource &&
                fromDatasource !== toDatasource
            ) {
                throw new Error(
                    "Cross-database relation is not supported:\n" +
                    `${key}\n` +
                    `${fromDatasource} -> ${toDatasource}`
                );
            }

            const datasource =
                fromDatasource ??
                toDatasource;

            if (!datasource) {
                throw new Error(
                    "Cannot determine datasource for relation: " +
                    key
                );
            }

            mappings.push({
                ...mapping,
                key,
                datasource
            });
        }
    }

    return mappings;
}

/**
 * Group mappings by datasource.
 */
export function groupMappingsByDatasource(
    keys,
    relationMap,
    json
) {
    const mappings = getMappingsForKeys(
        keys,
        relationMap,
        json
    );

    const groups = new Map();

    for (const mapping of mappings) {
        if (!groups.has(mapping.datasource)) {
            groups.set(
                mapping.datasource,
                []
            );
        }

        groups
            .get(mapping.datasource)
            .push(mapping);
    }

    return groups;
}

/**
 * Build SQL projections with unique aliases.
 *
 * Rules:
 *
 * 1. Preserve semantic aliases when possible.
 *
 * 2. If the same semantic alias references the
 *    same SQL expression, select it only once.
 *
 * 3. If the same semantic alias references a
 *    different SQL expression, append _2, _3, etc.
 *
 * Returns:
 *
 * {
 *   columns: Map<sqlAlias, sqlExpression>,
 *   aliasMap: Map<sqlAlias, metadata>
 * }
 */
export function buildSelectColumns(
    mappings,
    getAlias,
    json
) {
    const columns = new Map();

    const aliasMap = new Map();

    const usedAliases = new Set();

    const expressionAliases = new Map();

    /**
     * Register a SQL projection.
     */
    function addSelectColumn(
        semanticAlias,
        expression,
        metadata
    ) {
        const expressionKey = JSON.stringify([
            semanticAlias,
            expression
        ]);

        /*
         * Identical semantic projection:
         * reuse the existing SQL alias.
         */
        if (expressionAliases.has(expressionKey)) {
            return expressionAliases.get(
                expressionKey
            );
        }

        let uniqueAlias = semanticAlias;

        let suffix = 2;

        /*
         * Resolve SQL alias collisions.
         */
        while (usedAliases.has(uniqueAlias)) {
            uniqueAlias =
                `${semanticAlias}_${suffix}`;

            suffix++;
        }

        columns.set(
            uniqueAlias,
            expression
        );

        aliasMap.set(
            uniqueAlias,
            {
                ...metadata,
                semanticAlias,
                sqlAlias: uniqueAlias,
                expression
            }
        );

        usedAliases.add(uniqueAlias);

        expressionAliases.set(
            expressionKey,
            uniqueAlias
        );

        return uniqueAlias;
    }

    for (const mapping of mappings) {
        const fromAlias = getAlias(
            mapping.from.dataTable
        );

        const toAlias = getAlias(
            mapping.to.dataTable
        );

        const subjectAlias = buildMappingAlias(
            mapping,
            "subject",
            json
        );

        const objectAlias = buildMappingAlias(
            mapping,
            "object",
            json
        );

        const subjectExpression =
            `${fromAlias}.` +
            quoteIdentifier(mapping.from.id);

        const objectExpression =
            `${toAlias}.` +
            quoteIdentifier(mapping.to.id);

        /*
         * Subject projection.
         */
        addSelectColumn(
            subjectAlias,
            subjectExpression,
            {
                role: "subject",

                kind: mapping.kind,

                semanticUri:
                mapping.subjectUri,

                semanticLabel:
                mapping.subjectLabel,

                table:
                mapping.from.dataTable,

                column:
                mapping.from.id,

                datasource:
                mapping.datasource
            }
        );

        /*
         * Object projection.
         */
        addSelectColumn(
            objectAlias,
            objectExpression,
            {
                role: "object",

                kind: mapping.kind,

                semanticUri:
                    mapping.kind === "dataProperty"
                        ? mapping.predicateUri
                        : mapping.objectUri,

                semanticLabel:
                    mapping.kind === "dataProperty"
                        ? mapping.predicateLabel
                        : mapping.objectLabel,

                range:
                    mapping.kind === "dataProperty"
                        ? mapping.range
                        : undefined,

                format:
                    mapping.kind === "dataProperty"
                        ? mapping.format
                        : undefined,

                table:
                mapping.to.dataTable,

                column:
                mapping.to.id,

                datasource:
                mapping.datasource
            }
        );
    }

    return {
        columns,
        aliasMap
    };
}

/**
 * Build SQL and its alias metadata for one datasource.
 *
 * Returns:
 *
 * {
 *   sql,
 *   aliasMap
 * }
 */
export function buildSqlFromMappings(
    mappings,
    json
) {
    if (!mappings.length) {
        throw new Error(
            "No mappings supplied"
        );
    }

    const datasource =
        mappings[0].datasource;

    const requiredTables = new Set();

    for (const mapping of mappings) {
        requiredTables.add(
            mapping.from.dataTable
        );

        requiredTables.add(
            mapping.to.dataTable
        );
    }

    /*
     * Select physical joins compatible with
     * the current datasource.
     */
    const allJoins = extractTableJoins(json);

    const datasourceJoins = allJoins.filter(
        join => {
            const fromOk =
                !join.fromDatasource ||
                join.fromDatasource === datasource;

            const toOk =
                !join.toDatasource ||
                join.toDatasource === datasource;

            return fromOk && toOk;
        }
    );

    const selectedJoins = findMinimumJoinSet(
        requiredTables,
        datasourceJoins
    );

    /*
     * Assign SQL table aliases.
     */
    const aliasByTable = new Map();

    let aliasIndex = 0;

    function getAlias(table) {
        if (!aliasByTable.has(table)) {
            aliasByTable.set(
                table,
                `t${aliasIndex++}`
            );
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

    /*
     * Build SELECT expressions.
     */
    const {
        columns,
        aliasMap
    } = buildSelectColumns(
        mappings,
        getAlias,
        json
    );

    const selectSql = [
        ...columns.entries()
    ]
        .map(
            ([alias, expression]) =>
                `${expression} AS ${quoteIdentifier(alias)}`
        )
        .join(",\n    ");

    /*
     * Choose a starting table.
     */
    const baseTable = selectedJoins.length
        ? selectedJoins[0].toTable
        : [...requiredTables][0];

    const baseAlias = getAlias(
        baseTable
    );

    /*
     * Build the SQL JOIN tree.
     */
    const joinedTables = new Set([
        baseTable
    ]);

    const pendingJoins = [
        ...selectedJoins
    ];

    const sqlJoins = [];

    while (pendingJoins.length) {
        let found = false;

        for (
            let i = 0;
            i < pendingJoins.length;
            i++
        ) {
            const join = pendingJoins[i];

            const fromJoined =
                joinedTables.has(
                    join.fromTable
                );

            const toJoined =
                joinedTables.has(
                    join.toTable
                );

            /*
             * Join a new destination table.
             */
            if (fromJoined && !toJoined) {
                const fromAlias = getAlias(
                    join.fromTable
                );

                const toAlias = getAlias(
                    join.toTable
                );

                sqlJoins.push(
                    `JOIN ${quoteIdentifier(join.toTable)} ${toAlias}\n` +
                    `  ON ${fromAlias}.${quoteIdentifier(join.fromColumn)}\n` +
                    `   = ${toAlias}.${quoteIdentifier(join.toColumn)}`
                );

                joinedTables.add(
                    join.toTable
                );

                pendingJoins.splice(
                    i,
                    1
                );

                found = true;
                break;
            }

            /*
             * Join a new source table.
             */
            if (toJoined && !fromJoined) {
                const fromAlias = getAlias(
                    join.fromTable
                );

                const toAlias = getAlias(
                    join.toTable
                );

                sqlJoins.push(
                    `JOIN ${quoteIdentifier(join.fromTable)} ${fromAlias}\n` +
                    `  ON ${fromAlias}.${quoteIdentifier(join.fromColumn)}\n` +
                    `   = ${toAlias}.${quoteIdentifier(join.toColumn)}`
                );

                joinedTables.add(
                    join.fromTable
                );

                pendingJoins.splice(
                    i,
                    1
                );

                found = true;
                break;
            }

            /*
             * Both tables are already present.
             */
            if (fromJoined && toJoined) {
                pendingJoins.splice(
                    i,
                    1
                );

                found = true;
                break;
            }
        }

        if (!found) {
            throw new Error(
                "Unable to build SQL join tree"
            );
        }
    }

    /*
     * Ensure every selected table is connected.
     */
    for (const table of requiredTables) {
        if (!joinedTables.has(table)) {
            throw new Error(
                `Required table was not joined: ${table}`
            );
        }
    }

    /*
     * Build non-null conditions for subject columns.
     */
    const whereConditions = new Set();

    for (const mapping of mappings) {
        const fromAlias = getAlias(
            mapping.from.dataTable
        );

        whereConditions.add(
            `${fromAlias}.${quoteIdentifier(mapping.from.id)} IS NOT NULL`
        );
    }

    const whereClause = whereConditions.size
        ? (
            "WHERE " +
            [...whereConditions].join(
                "\n  AND "
            )
        )
        : "";

    /*
     * Assemble the final SQL query.
     */
    const sql = [
        "SELECT",
        `    ${selectSql}`,
        `FROM ${quoteIdentifier(baseTable)} ${baseAlias}`,
        ...sqlJoins,
        whereClause
    ]
        .filter(Boolean)
        .join("\n");

    return {
        sql,
        aliasMap
    };
}

/**
 * Generate SQL queries grouped by database source.
 *
 * Returns:
 *
 * Map<
 *   databaseName,
 *   {
 *     datasource,
 *     databaseName,
 *     sql,
 *     aliasMap
 *   }
 * >
 */
export function buildSqlByDatabaseSources(
    keys,
    relationMap,
    json
) {
    if (
        !Array.isArray(keys) ||
        keys.length === 0
    ) {
        throw new Error(
            "keys must be a non-empty array"
        );
    }

    const groups = groupMappingsByDatasource(
        keys,
        relationMap,
        json
    );

    const result = new Map();

    for (
        const [datasource, mappings]
        of groups
        ) {
        const databaseName = getDatabaseName(
            datasource,
            json
        );

        const {
            sql,
            aliasMap
        } = buildSqlFromMappings(
            mappings,
            json
        );

        result.set(
            databaseName,
            {
                datasource,
                databaseName,
                sql,
                aliasMap
            }
        );
    }

    return result;
}

/**
 * Convenience function when all selected mappings
 * belong to one datasource.
 *
 * Returns only the SQL string.
 */
export function buildSqlFromKeys(
    keys,
    relationMap,
    json
) {
    const queries = buildSqlByDatabaseSources(
        keys,
        relationMap,
        json
    );

    if (queries.size !== 1) {
        throw new Error(
            `Requested mappings span ${queries.size} database sources. ` +
            "Use buildSqlByDatabaseSources() instead."
        );
    }

    return [
        ...queries.values()
    ][0].sql;
}

/**
 * Return all available semantic relation keys.
 */
export function getRelationKeys(
    relationMap
) {
    return [
        ...relationMap.keys()
    ];
}

/**
 * Default module export.
 */
export default {
    quoteIdentifier,

    getUriLocalName,
    getClassLabel,
    getPredicateLabel,
    getRangeLabel,

    buildMappingAlias,

    buildObjectPropertyKey,
    buildDataPropertyKey,

    getDatabaseSources,
    getDatasource,
    getDatabaseName,

    extractRelationMap,
    getRelationKeys,

    extractTableJoins,
    buildJoinGraph,
    findJoinPath,
    findMinimumJoinSet,

    groupMappingsByDatasource,

    buildSelectColumns,
    buildSqlFromMappings,

    buildSqlByDatabaseSources,
    buildSqlFromKeys
};