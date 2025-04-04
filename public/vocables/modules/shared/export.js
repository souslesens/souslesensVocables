import common from "./common.js";
import SearchUtil from "../search/searchUtil.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";

import MainController from "./mainController.js";

var Export = (function () {
    var self = {};
    self.context = null;
    self.currentOptions = {};
    self.currentSource = null;
    self.dataTable;

    self.exportGraphToDataTable = function (graphInstance, divId, nodes, edges,exportData) {
        if (!nodes && !edges) {
            nodes = graphInstance.data.nodes.get();
            edges = graphInstance.data.edges.get();
        }

        var nodesFromMap = {};

        var linkedNodes = {};

        edges.forEach(function (edge) {
            if (!nodesFromMap[edge.from]) {
                nodesFromMap[edge.from] = [];
                linkedNodes[edge.from] = 1;
                linkedNodes[edge.to] = 1;
            }
            nodesFromMap[edge.from].push(edge);
        });
        var allNodesMap = {};
        nodes.forEach(function (node) {
            allNodesMap[node.id] = node;
        });

        //sort nodes by number of edges
        var nodesFromArray = Object.keys(nodesFromMap);
        nodesFromArray.sort(function (a, b) {
            return nodesFromMap[a] - nodesFromMap[b];
        });

        var header = "fromLabel\tedgeLabel\ttoLabel\tfromURI\tedgeURI\ttoURI\n";
        
        var cols = [];
        var dataset = [];
        header
            .trim()
            .split("\t")
            .forEach(function (colName, index) {
                var width = "100";
                if (index < 3) {
                    width = "200";
                }
                cols.push({ title: colName, defaultContent: "" });
            });

        nodesFromArray.forEach(function (nodeFromId, index) {
            nodesFromMap[nodeFromId].forEach(function (edge) {
                if (!allNodesMap[nodeFromId] || !allNodesMap[edge.to]) {
                    return;
                }
                var line = [allNodesMap[nodeFromId].data.label, edge.label || "", allNodesMap[edge.to].data ? allNodesMap[edge.to].data.label : "?", nodeFromId, edge.id, edge.to];
                dataset.push(line);
            });
        });

        //nodes without edges

        nodes.forEach(function (node) {
            if (linkedNodes[node.id]) {
                return;
            }
            var line = [node.label, "", "", node.id, "", ""];
            dataset.push(line);
        });

        UI.message("", true);
        var columnDefs = [{ width: 200, targets: [0, 1, 2] }];
        if (nodesFromArray.length < Config.dataTableOutputLimit && !exportData) {
            Export.showDataTable(divId, cols, dataset, null, { fixedColumns: 1, columnDefs: columnDefs });
        }else{
            var columns = cols.map(function (item) {
                return item.title;
            });
            dataset.unshift(columns);
            if(!exportData){
                alert("to large results, it will be exported");
            }
            return Export.exportDataToCSV(dataset);
        }
        
        /*else {
            var str = header;
            nodesFromArray.forEach(function (nodeFromId, index) {
                nodesFromMap[nodeFromId].forEach(function (edge) {
                    if (!allNodesMap[nodeFromId] || !allNodesMap[edge.to]) {
                        return;
                    }
                    var edgeLabel = edge.label || "-";
                    edgeLabel = edgeLabel.replaceAll("<[^>]*>", "");
                    str += allNodesMap[nodeFromId].data.label + "\t";
                    str += edgeLabel + "\t";
                    str += allNodesMap[edge.to].data ? allNodesMap[edge.to].data.label : "??";
                    str += "\t" + nodeFromId + "\t" + edge.id + "\t" + edge.to;
                    str += "\n";
                });
            });

            common.copyTextToClipboard(str);
        }*/
    };

    self.exportGraphToDataTableOld = function () {
        var nodes = visjsGraph.data.nodes.get();
        var edges = visjsGraph.data.edges.get();

        var nodesToMap = {};
        edges.forEach(function (edge) {
            if (!nodesToMap[edge.to]) {
                nodesToMap[edge.to] = [];
            }
            nodesToMap[edge.to].push(edge);

            /*  if (!nodesFromMap[edge.from])
      nodesFromMap[edge.from] = []
  nodesFromMap[edge.from].push(edge)*/
        });

        var leafNodes = [];
        var nodesMap = {};
        nodes.forEach(function (node) {
            nodesMap[node.id] = node;
            if (!nodesToMap[node.id]) {
                leafNodes.push(node);
            }
        });

        function recurse(node, ancestors, level) {
            if (!node.id) {
                return;
            }

            edges.forEach(function (edge) {
                if (edge.from == node.id) {
                    var ok = true;
                    for (var key in ancestors)
                        if (ancestors[key].indexOf(edge.to) > -1) {
                            ok = false;
                        }
                    if (ok) {
                        if (!ancestors["_" + level]) {
                            ancestors["_" + level] = [];
                        }

                        ancestors["_" + level].push(edge.to);
                        // eslint-disable-next-line no-console

                        // console.log(nodesMap[edge.to].label);
                        recurse(nodesMap[edge.to], ancestors, ++level);
                    }
                }
            });
            return ancestors;
        }

        //  var tree = {id: "#", children: []}
        leafNodes.forEach(function (node) {
            var leafAncestors = recurse(node, {}, 1);
            node.ancestors = leafAncestors;
        });

        var dataSet = [];
        var colsCount = 0;
        leafNodes.forEach(function (leafNode) {
            var lineLabels = [];
            var lineIds = [];
            var leafLabel = leafNode.id;
            if (leafLabel.indexOf("?_") == 0) {
                //datatype property
                leafLabel = leafLabel.substring(leafLabel.lastIndexOf("/") + 1);
            } else {
                leafLabel = leafNode.label || leafNode.id;
            }
            lineLabels.push(leafLabel);
            lineIds.push(leafNode.id);
            var previousAncestorLevel = null;
            for (var ancestorLevel in leafNode.ancestors) {
                var labels = "";
                var ids = "";
                var propLabel = "";
                if (previousAncestorLevel) {
                    // search edge label
                    edges.forEach(function (edge) {
                        if (edge.from == leafNode.ancestors[previousAncestorLevel] && edge.to == leafNode.ancestors[ancestorLevel]) {
                            propLabel = "-[" + edge.label + "]-";
                        }
                    });
                }
                previousAncestorLevel = ancestorLevel;

                leafNode.ancestors[ancestorLevel].forEach(function (item, index) {
                    if (index > 0) {
                        labels += " , ";
                        ids += " , ";
                    }
                    var label = item;
                    if (nodesMap[item].data) {
                        label = propLabel + nodesMap[item].data.label || item;
                    }

                    labels += label;
                    ids += item;
                });

                lineLabels.push(labels);
                lineIds.push(ids);
            }
            var row = lineLabels; //.concat(lineIds)
            colsCount = Math.max(colsCount, row.length);
            dataSet.push(row);
        });

        dataSet.sort(function (a, b) {
            return a.length - b.length;
        });
        var cols = [];
        for (var i = 1; i <= colsCount; i++) {
            cols.push({ title: "Label_" + i, defaultContent: "" });
        }
        /*   for (var i = 1; i <= colsCount; i++) {
       cols.push({title: "Uri_" + i, defaultContent: ""})
   }*/
        self.showDataTable(null, cols, dataSet);
    };

    self.exportTreeToDataTable = function (jstreeDiv, nodeId) {
        if (!jstreeDiv) {
            jstreeDiv = SearchWidget.currentTargetDiv;
        }
        if (!nodeId) {
            nodeId = SearchWidget.currentTreeNode ? SearchWidget.currentTreeNode.id : "#";
        }
        if (!nodeId) {
            nodeId = "#";
        }
        //  var data = JstreeWidget.toTableData(jstreeDiv,nodeId)

        var tree = $("#" + jstreeDiv)
            .jstree(true)
            .get_json(nodeId, { flat: false });
        var nodesMap = {};
        var nodes = $("#" + jstreeDiv)
            .jstree(true)
            .get_json(nodeId, { flat: true });
        nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });

        const result = [];

        function flat(data, prev = "") {
            if (Array.isArray(data)) {
                data.forEach((e) => flat(e, prev));
            } else {
                prev = prev + (prev.length ? "|" : "") + data.id;
                if (!data.children.length) {
                    // result.push(prev)
                    result.push(prev.split("|")); //.map(Number))
                } else {
                    flat(data.children, prev);
                }
            }
        }

        flat(tree);
        //  var nodesArray = result;

        var data = self.prepareDataSet(result, nodesMap);
        self.showDataTable(null, data.cols, data.dataSet);

        return;
    };

    self.exportAllDescendants = function (parentId, options, indexes) {
        if (!options) {
            options = {};
        }

        UI.message("exporting node descendants...");
        $("#waitImg").css("display", "block");
        SearchUtil.getParentAllDescendants(parentId, indexes, null, function (err, result) {
            if (err) {
                UI.message(err, true);
            }
            var matrixLabels = [];
            var matrixIds = [];
            var maxParentsLength = 0;
            result.data.forEach(function (hit, _index) {
                var parentIdsArray = [];
                var parentLabelsArray = [];
                if (!hit.parents || !hit.parents.forEach) {
                    return;
                }
                hit.parents.forEach(function (parent, indexParent) {
                    if (indexParent > 0) {
                        parentLabelsArray.push(result.labelsMap[parent] || Sparql_common.getLabelFromURI(parent));
                        parentIdsArray.push(parent);
                    }
                });
                maxParentsLength = Math.max(maxParentsLength, parentIdsArray.length);

                if (options.fromBottomToTop) {
                    parentIdsArray.push(hit.id);
                    parentIdsArray = parentIdsArray.reverse();
                } else {
                    parentIdsArray.push(hit.id);
                }

                matrixIds.push(parentIdsArray);

                if (options.fromBottomToTop) {
                    parentLabelsArray.push(hit.label);
                    parentLabelsArray = parentLabelsArray.reverse();
                } else {
                    parentLabelsArray.push(hit.label);
                }

                matrixLabels.push(parentLabelsArray);
            });
            var cols = [];
            for (var i = 0; i <= maxParentsLength; i++) {
                cols.push({ title: "Label_level_" + i, defaultContent: "" });
            }

            matrixLabels.forEach(function (line, lineIndex) {
                for (var i = line.length; i <= maxParentsLength + 1; i++) {
                    matrixLabels[lineIndex].push("");
                }
                matrixLabels[lineIndex] = matrixLabels[lineIndex].concat(matrixIds[lineIndex]);
            });
            cols.push({ title: "-----", defaultContent: "" });
            // cols = cols.concat(cols);
            for (var i = 0; i <= maxParentsLength; i++) {
                cols.push({ title: "ID_level_" + i, defaultContent: "" });
            }
            cols.push({ title: "-----", defaultContent: "" });

            UI.message("", true);
            Export.showDataTable(null, cols, matrixLabels);
        });
    };

    self.prepareDataSet = function (flatNodesArray, nodesMap) {
        var cols = [];
        var dataSet = [];
        var colsMax = 0;
        flatNodesArray.forEach(function (item) {
            var line = [];
            var line2 = [];
            item.forEach(function (id) {
                var obj = nodesMap[id];
                if (obj && obj.data) {
                    var label = obj.data.label;
                    if (label == "any") {
                        label = obj.data.id;
                    }
                    line.push(label);
                    line2.push(obj.data.id);
                }
            });
            colsMax = Math.max(colsMax, line.length);
            line = line.concat(line2);

            dataSet.push(line);
        });

        for (var i = 1; i <= colsMax; i++) {
            cols.push({ title: "Label_" + i, defaultContent: "", width: "20%" });
        }
        for (let i = 1; i <= colsMax; i++) {
            cols.push({ title: "Uri_" + i, defaultContent: "" });
        }
        return { cols: cols, dataSet: dataSet };
    };

    self.showDataTable = function (div, cols, dataSet, buttons, options, callback) {
        if (dataSet.length == 0) {
            alert("No data");
            return;
        }
        if (cols.length == 0) {
            alert("No Columns");
            return;
        }
        if (!options) {
            options = {};
        }
        if (self.dataTable) {
            self.dataTable.destroy();
            $("#dataTableDiv").html("");
        }
        if (options.divId) {
            div = options.divId;
        } else {
            div = "mainDialogDiv";
            //$("#" + div).dialog("open");
        }

        var width = "97%";
        if (options.width) width = options.width;
        var height = "75vh";
        if (options.height) height = options.height;

        $("#" + div).html("<div style='width: " + width + ";height:" + height + "'> <table class='cell-border' id='dataTableDivExport'></table></div>");
        //  $("#" + div).html("<div style='width: 97%;height:75vh'> <table class='cell-border' id='dataTableDivExport'></table></div>");

        if (!buttons) {
            buttons = "Bfrtip";
        }

        if (!buttons) {
            buttons = "Bfrtip";
        }
        var params = {
            data: dataSet,
            columns: cols,
            fixedColumns: true,
            pageLength: 200,
            dom: buttons,
            buttons: [
                {
                    extend: "csvHtml5",
                    text: "Export CSV",
                    fieldBoundary: "",
                    fieldSeparator: ";",
                },
                "copy",
            ],

            paging: false,
            /*  columnDefs: [
    { width: 400, targets: 0 }
],
fixedColumns: true*/

            //  order: []
        };

        if (false && options && options.fixedColumns) {
            params.fixedColumns = true;
        }
        if (false && options && options.columnDefs) {
            params.columnDefs = options.columnDefs;
        }
        if (options && options.paging) {
            params.paging = true;
        }
        self.dataTable = $("#dataTableDivExport").DataTable(params);
        if (div == "mainDialogDiv") {
            //open the dialog after the datatable is loaded to be on center
            $("#" + div).dialog("open");
        }
        if (callback) {
            return callback(null, self.dataTable);
        }
    };

    self.exportDataToCSV = function (dataset) {
        let csvContent = "data:text/csv;charset=utf-8," + dataset.map((row) => row.map((cell) => `"${cell}"`).join(";")).join("\n");
        let encodedUri = encodeURI(csvContent);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "export_data.csv");
        document.body.appendChild(link);

        link.click();
        document.body.removeChild(link);
    };
    self.showExportPopUp = function (visjsGraph) {
        var html = `<span class="popupMenuItem" onclick="${visjsGraph}.toGraphMl();">Graph ML </span>`;
        html += `<span class="popupMenuItem" onclick="${visjsGraph}.toSVG()">SVG</span>`;
        html += `<span class="popupMenuItem" onclick="${visjsGraph}.exportGraphToDataTable(true);">CSV</span>`;
        if (visjsGraph == "MappingColumnsGraph.visjsGraph") {
            html += `<span class="popupMenuItem" onclick="MappingColumnsGraph.exportMappings();">JSON</span>`;
        }

        PopupMenuWidget.initAndShow(html, "popupMenuWidgetDiv");
    };
    /**
     * Downloads a JSON object as a file.
     * Converts the provided data into a JSON string, creates a downloadable file, and triggers the download.
     *
     * @function
     * @name downloadJSON
     * @memberof module:Export
     * @param {Object} data - The JSON object to be downloaded.
     * @param {string} fileName - The name of the file to be downloaded.
     * @returns {void}
     */
    self.downloadJSON = function (data, fileName) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const link = document.createElement("a");

        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    return self;
})();

export default Export;

window.Export = Export;
