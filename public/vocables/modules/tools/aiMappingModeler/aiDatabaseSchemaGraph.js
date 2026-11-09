import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import AIMappingColumnsGraph from "./aiMappingColumnsGraph.js";
import AIDataSourceManager from "./aiDataSourcesManager.js";
import AIMappingModeler from "./aiMappingModeler.js";
import LegendOverlayWidget from "../../uiWidgets/legendOverlayWidget.js";

/**
 * Schema of the selected database, drawn in place of the mapping graph and never saved with it.
 * @module AIDatabaseSchemaGraph
 */
var AIDatabaseSchemaGraph = (function () {
    var self = {};

    self.graphDiv = "mappingModeler_schemaGraphDiv";
    self.visjsGraph = null;
    self.tableColor = { background: "#eef3f8", border: "#8aa4c0" };
    self.mappedTableColor = { background: "#e3f4e3", border: "#2e8b2e" };
    self.tableNameColor = "#1f3b5c";
    self.columnNameColor = "#222";
    self.columnTypeColor = "#8a8a8a";
    self.columnKeyColor = "#b8860b";
    self.mappedColumnColor = "#1b7a1b";
    self.currentTableNode = null;
    self.foreignKeyColor = "#555";
    self.aiForeignKeyColor = "#8e44ad";
    self.aiForeignKeyLabelBackground = "#f3e8fa";
    // a monospace font aligns the key, name and type of the columns in three columns
    self.fontFace = "monospace";
    self.columnFontSize = 13;
    self.tableNameFontSize = 15;
    // the text of a table is readable at this scale without zooming
    self.readableScale = 0.85;
    // free space kept between two tables, in canvas pixels
    self.tableGap = 40;
    self.maxSeparationPasses = 200;
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
                label: "AI proposal: " + aiForeignKey.column + " -> " + aiForeignKey.referencedColumn,
                title: "Proposed by the AI: " + aiForeignKey.reason,
                arrows: "to",
                dashes: true,
                width: 2,
                color: self.aiForeignKeyColor,
                font: { color: self.aiForeignKeyColor, background: self.aiForeignKeyLabelBackground, size: 12 },
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
            var tableColor = mappedColumns.length > 0 ? self.mappedTableColor : self.tableColor;
            nodes.push({
                id: table,
                label: "<code>" + table + "</code>\n" + columnsText,
                shape: "box",
                margin: 10,
                borderWidth: 1 + Math.round(4 * centrality),
                shadow: centrality > 0.5,
                mass: 1 + linkCount,
                // vis.js colors a dragged or selected node otherwise, which reads as a change of mapping state
                color: { background: tableColor.background, border: tableColor.border, highlight: tableColor, hover: tableColor },
                font: {
                    multi: "html",
                    align: "left",
                    face: self.fontFace,
                    size: self.columnFontSize,
                    color: self.columnNameColor,
                    mono: {
                        face: self.fontFace,
                        color: self.tableNameColor,
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
            onRightClickFn: self.showSchemaGraphPopupMenu,
        };
        var schemaGraph = new VisjsGraphClass(self.graphDiv, { nodes: nodes, edges: edges }, graphOptions);
        self.visjsGraph = schemaGraph;
        schemaGraph.draw(function () {
            // another database, or the AI keys, redrew the schema meanwhile and destroyed this network
            if (self.visjsGraph != schemaGraph) {
                return;
            }
            // physics only places the tables, a dragged table then stays where it is dropped
            schemaGraph.network.setOptions({ physics: false });
            self.separateOverlappingTables(schemaGraph);
            // after the canvas of vis.js, which would cover a legend added before it
            LegendOverlayWidget.destroy(self.graphDiv);
            LegendOverlayWidget.render(self.graphDiv, {
                title: "🔍 Legend",
                items: {
                    nodes: [
                        { type: "table", label: "Table", color: self.tableColor.background, swatch: "box" },
                        { type: "mappedTable", label: "Mapped table, its mapped columns in green", color: self.mappedTableColor.background, swatch: "box" },
                    ],
                    edges: [
                        { cat: "foreignKey", label: "Foreign key declared in the database", color: self.foreignKeyColor, swatch: "line" },
                        { cat: "aiForeignKey", label: "Foreign key proposed by the AI", color: self.aiForeignKeyColor, swatch: "dashed" },
                    ],
                },
            });
            if (centralTable) {
                schemaGraph.network.focus(centralTable, { scale: self.readableScale });
            }
        });
    };

    // barnesHut sees a box as a circle: tall tables still overlap once the physics is stopped
    self.separateOverlappingTables = function (schemaGraph) {
        var network = schemaGraph.network;
        var tableIds = schemaGraph.data.nodes.getIds();
        var positions = network.getPositions(tableIds);
        var halfSizes = {};
        tableIds.forEach(function (tableId) {
            var boundingBox = network.getBoundingBox(tableId);
            halfSizes[tableId] = {
                width: (boundingBox.right - boundingBox.left + self.tableGap) / 2,
                height: (boundingBox.bottom - boundingBox.top + self.tableGap) / 2,
            };
        });

        for (var passIndex = 0; passIndex < self.maxSeparationPasses; passIndex++) {
            // every shift of a pass is measured on the positions it started from, then applied
            var shifts = {};
            tableIds.forEach(function (tableId) {
                shifts[tableId] = { x: 0, y: 0 };
            });
            var hasOverlap = false;
            for (var firstTableIndex = 0; firstTableIndex < tableIds.length; firstTableIndex++) {
                for (var secondTableIndex = firstTableIndex + 1; secondTableIndex < tableIds.length; secondTableIndex++) {
                    var firstTable = tableIds[firstTableIndex];
                    var secondTable = tableIds[secondTableIndex];
                    var distanceX = positions[secondTable].x - positions[firstTable].x;
                    var distanceY = positions[secondTable].y - positions[firstTable].y;
                    var overlapX = halfSizes[firstTable].width + halfSizes[secondTable].width - Math.abs(distanceX);
                    var overlapY = halfSizes[firstTable].height + halfSizes[secondTable].height - Math.abs(distanceY);
                    if (overlapX <= 0 || overlapY <= 0) {
                        continue;
                    }
                    hasOverlap = true;
                    // the two tables part along the axis where they overlap least, each by half of it
                    if (overlapX < overlapY) {
                        var shiftX = ((distanceX < 0 ? -1 : 1) * overlapX) / 2;
                        shifts[firstTable].x -= shiftX;
                        shifts[secondTable].x += shiftX;
                    } else {
                        var shiftY = ((distanceY < 0 ? -1 : 1) * overlapY) / 2;
                        shifts[firstTable].y -= shiftY;
                        shifts[secondTable].y += shiftY;
                    }
                }
            }
            if (!hasOverlap) {
                break;
            }
            tableIds.forEach(function (tableId) {
                positions[tableId].x += shifts[tableId].x;
                positions[tableId].y += shifts[tableId].y;
            });
        }

        var movedTables = tableIds.map(function (tableId) {
            return { id: tableId, x: positions[tableId].x, y: positions[tableId].y };
        });
        schemaGraph.data.nodes.update(movedTables);
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

    self.showSchemaGraphPopupMenu = function (node, point, event) {
        // an edge or the blank canvas
        if (!node || !node.data) {
            return;
        }
        self.currentTableNode = node;
        var html = '    <span class="popupMenuItem" onclick="AIDatabaseSchemaGraph.showSampleData()">show sample data</span>';
        $("#popupMenuWidgetDiv").html(html);
        point.x = event.x;
        point.y = event.y;
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    };

    // shaped as a table node of the data sources tree, whose parent is the data source
    self.showSampleData = function () {
        var tableTreeNode = { parent: AIDataSourceManager.currentConfig.currentDataSource.id, data: self.currentTableNode.data };
        AIMappingModeler.showSampleData(tableTreeNode);
    };

    return self;
})();

export default AIDatabaseSchemaGraph;
window.AIDatabaseSchemaGraph = AIDatabaseSchemaGraph;
