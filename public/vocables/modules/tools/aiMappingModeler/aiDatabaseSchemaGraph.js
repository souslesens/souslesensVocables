import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import AIMappingColumnsGraph from "./aiMappingColumnsGraph.js";
import AIDataSourceManager from "./aiDataSourcesManager.js";

/**
 * Schema of the selected database, drawn in place of the mapping graph and never saved with it.
 * @module AIDatabaseSchemaGraph
 */
var AIDatabaseSchemaGraph = (function () {
    var self = {};

    self.graphDiv = "mappingModeler_schemaGraphDiv";
    self.visjsGraph = null;
    // mapped in blue, as the mapped tables of the data sources tree; a hovered or selected table turns yellow
    self.selectedTableColor = { background: "#fff6cc", border: "#e0a800" };
    self.tableColor = { background: "#f4f4f4", border: "#9a9a9a", highlight: self.selectedTableColor, hover: self.selectedTableColor };
    self.mappedTableColor = { background: "#e6ecff", border: "blue", highlight: self.selectedTableColor, hover: self.selectedTableColor };
    self.tableNameColor = "#222";
    self.columnNameColor = "#222";
    self.columnTypeColor = "#8a8a8a";
    self.columnKeyColor = "#b8860b";
    self.mappedColumnColor = "blue";
    self.foreignKeyColor = "#555";
    self.aiForeignKeyColor = "#b35c00";
    // a monospace font aligns the key, name and type of the columns in three columns
    self.fontFace = "monospace";
    self.columnFontSize = 13;
    self.tableNameFontSize = 15;
    // the text of a table is readable at this scale without zooming
    self.readableScale = 0.85;
    // the html labels of vis.js collapse a run of plain spaces
    self.paddingSpace = "\u00a0";

    self.showMappingGraph = function () {
        $("#" + self.graphDiv).css("display", "none");
        $("#" + AIMappingColumnsGraph.graphDiv).css("display", "block");
    };

    self.drawDatabaseSchema = function () {
        var dataSource = AIDataSourceManager.currentConfig.currentDataSource;
        var tableKeys = dataSource.tableKeys || { foreignKeys: [], aiKeys: null };

        var mappedColumnsByTable = {};
        AIMappingColumnsGraph.visjsGraph.data.nodes.forEach(function (graphNode) {
            var isDataSourceColumn = graphNode.data && graphNode.data.type == "Column" && graphNode.data.datasource == dataSource.id;
            if (!isDataSourceColumn) {
                return;
            }
            if (!mappedColumnsByTable[graphNode.data.dataTable]) {
                mappedColumnsByTable[graphNode.data.dataTable] = [];
            }
            mappedColumnsByTable[graphNode.data.dataTable].push(graphNode.data.label);
        });

        // a composite foreign key is one edge carrying all its column pairs
        var foreignKeyEdges = {};
        tableKeys.foreignKeys.forEach(function (foreignKey) {
            var edgeId = foreignKey.table_name + "|" + foreignKey.constraint_name;
            var columnPair = foreignKey.column_name + " -> " + foreignKey.referenced_column;
            if (foreignKeyEdges[edgeId]) {
                foreignKeyEdges[edgeId].label += "\n" + columnPair;
                return;
            }
            foreignKeyEdges[edgeId] = {
                id: edgeId,
                from: foreignKey.table_name,
                to: foreignKey.referenced_table,
                label: columnPair,
                arrows: "to",
                color: self.foreignKeyColor,
            };
        });
        var edges = Object.values(foreignKeyEdges);

        // a declared foreign key wins over the one the AI found on the same column, as in the column tree
        var aiForeignKeys = tableKeys.aiKeys ? tableKeys.aiKeys.foreignKeys : [];
        aiForeignKeys.forEach(function (aiForeignKey) {
            var isDeclared = tableKeys.foreignKeys.some(function (foreignKey) {
                return foreignKey.table_name == aiForeignKey.table && foreignKey.column_name == aiForeignKey.column;
            });
            if (isDeclared) {
                return;
            }
            edges.push({
                id: "AI|" + aiForeignKey.table + "|" + aiForeignKey.column,
                from: aiForeignKey.table,
                to: aiForeignKey.referencedTable,
                label: "AI " + aiForeignKey.column + " -> " + aiForeignKey.referencedColumn,
                title: aiForeignKey.reason,
                arrows: "to",
                dashes: true,
                color: self.aiForeignKeyColor,
            });
        });

        var linkCountByTable = {};
        edges.forEach(function (edge) {
            linkCountByTable[edge.from] = (linkCountByTable[edge.from] || 0) + 1;
            linkCountByTable[edge.to] = (linkCountByTable[edge.to] || 0) + 1;
        });
        var centralTable = null;
        for (var linkedTable in linkCountByTable) {
            if (!centralTable || linkCountByTable[linkedTable] > linkCountByTable[centralTable]) {
                centralTable = linkedTable;
            }
        }
        var maxLinkCount = centralTable ? linkCountByTable[centralTable] : 1;

        var nodes = [];
        for (var table in dataSource.tables) {
            var mappedColumns = mappedColumnsByTable[table] || [];
            var columnTypes = dataSource.columnTypes[table];
            var columnRows = dataSource.tables[table].map(function (column) {
                return { name: column, type: columnTypes[column], keyText: AIDataSourceManager.getColumnKeyText(table, column) };
            });
            var primaryKeyRows = columnRows.filter(function (columnRow) {
                return columnRow.keyText.indexOf("PK") > -1;
            });
            var otherRows = columnRows.filter(function (columnRow) {
                return columnRow.keyText.indexOf("PK") < 0;
            });
            var orderedRows = primaryKeyRows.concat(otherRows);
            var keyTextLengths = columnRows.map(function (columnRow) {
                return columnRow.keyText.length;
            });
            var nameLengths = columnRows.map(function (columnRow) {
                return columnRow.name.length;
            });
            var keyWidth = Math.max.apply(null, keyTextLengths);
            var nameWidth = Math.max.apply(null, nameLengths);
            // fonts of the label: mono for the table name, boldital for a key, bold for a mapped column, ital for a type
            var columnLines = orderedRows.map(function (columnRow) {
                var keyCell = keyWidth > 0 ? "<b><i>" + columnRow.keyText.padEnd(keyWidth, self.paddingSpace) + "</i></b>" + self.paddingSpace : "";
                var paddedName = columnRow.name.padEnd(nameWidth, self.paddingSpace);
                var nameCell = mappedColumns.indexOf(columnRow.name) > -1 ? "<b>" + paddedName + "</b>" : paddedName;
                return keyCell + nameCell + self.paddingSpace + self.paddingSpace + "<i>" + columnRow.type + "</i>";
            });
            var columnsText = columnLines.join("\n");

            // the most linked tables stand out: thicker border, bigger name, more room around them
            var linkCount = linkCountByTable[table] || 0;
            var centrality = linkCount / maxLinkCount;
            nodes.push({
                id: table,
                label: "<code>" + table + "</code>\n" + columnsText,
                shape: "box",
                margin: 10,
                borderWidth: 1 + Math.round(4 * centrality),
                shadow: centrality > 0.5,
                mass: 1 + linkCount,
                color: mappedColumns.length > 0 ? self.mappedTableColor : self.tableColor,
                font: {
                    multi: "html",
                    align: "left",
                    face: self.fontFace,
                    size: self.columnFontSize,
                    color: self.columnNameColor,
                    mono: {
                        face: self.fontFace,
                        color: mappedColumns.length > 0 ? self.mappedColumnColor : self.tableNameColor,
                        size: self.tableNameFontSize + Math.round(6 * centrality),
                        mod: "bold",
                    },
                    boldital: { face: self.fontFace, color: self.columnKeyColor },
                    bold: { face: self.fontFace, color: self.mappedColumnColor },
                    ital: { face: self.fontFace, color: self.columnTypeColor, mod: "" },
                },
                data: { id: table, label: table, type: "table" },
            });
        }

        // the schema of the previous database would stay under the new canvas
        if (self.visjsGraph) {
            self.visjsGraph.network.destroy();
        }
        $("#" + AIMappingColumnsGraph.graphDiv).css("display", "none");
        $("#" + self.graphDiv).css("display", "block");
        var graphOptions = {
            visjsOptions: {
                physics: { barnesHut: { gravitationalConstant: -40000, centralGravity: 0.3, springLength: 350, avoidOverlap: 1 }, stabilization: { iterations: 400 } },
                edges: { smooth: false, font: { size: 11, align: "middle" } },
            },
            onclickFn: self.onSchemaGraphClick,
        };
        var schemaGraph = new VisjsGraphClass(self.graphDiv, { nodes: nodes, edges: edges }, graphOptions);
        self.visjsGraph = schemaGraph;
        schemaGraph.draw(function () {
            // physics only places the tables, a dragged table then stays where it is dropped
            schemaGraph.network.setOptions({ physics: false });
            if (centralTable) {
                schemaGraph.network.focus(centralTable, { scale: self.readableScale });
            }
        });
    };

    // the tree selection opens the mapping of the table and brings the mapping graph back
    self.onSchemaGraphClick = function (node) {
        // an edge or the blank canvas
        if (!node || !node.data) {
            return;
        }
        var dataSourcesTree = $("#" + AIDataSourceManager.dataSourcejstreeDivId).jstree(true);
        dataSourcesTree.deselect_all(true);
        dataSourcesTree.select_node(node.id);
    };

    return self;
})();

export default AIDatabaseSchemaGraph;
window.AIDatabaseSchemaGraph = AIDatabaseSchemaGraph;
