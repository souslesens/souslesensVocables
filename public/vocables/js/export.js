var Export = (function () {
    var self = {};
    self.context = null;
    self.currentOptions = {};
    self.currentSource = null;
    self.dataTable;

    self.exportGraphToDataTable = function () {
        var nodes = visjsGraph.data.nodes.get();
        var edges = visjsGraph.data.edges.get();

        var nodesFromMap = {};

        edges.forEach(function (edge) {
            if (!nodesFromMap[edge.from]) nodesFromMap[edge.from] = [];
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

        var str = "fromLabel\tedgeLabel\ttoLabel\tfromURI\tedgeURI\ttoURI\n";
        nodesFromArray.forEach(function (nodeFromId, index) {
            nodesFromMap[nodeFromId].forEach(function (edge) {
                var edgeLabel=edge.label|| "-"
                edgeLabel=edgeLabel.replaceAll("<[^>]*>", "");
                str += allNodesMap[nodeFromId].data.label + "\t";
                str += edgeLabel+ "\t";
                str += allNodesMap[edge.to].data.label;
                str += "\t" + nodeFromId + "\t" + edge.id + "\t" + edge.to;
                str += "\n";
            });
        });

        common.copyTextToClipboard(str);
    };

    self.exportGraphToDataTableOld = function () {
        var nodes = visjsGraph.data.nodes.get();
        var edges = visjsGraph.data.edges.get();

        var nodesToMap = {};
        edges.forEach(function (edge) {
            if (!nodesToMap[edge.to]) nodesToMap[edge.to] = [];
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
            if (!node.id) return;

            edges.forEach(function (edge) {
                if (edge.from == node.id) {
                    var ok = true;
                    for (var key in ancestors)
                        if (ancestors[key].indexOf(edge.to) > -1) {
                            ok = false;
                        }
                    if (ok) {
                        if (!ancestors["_" + level]) ancestors["_" + level] = [];

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
            if (leafLabel.indexOf("?_") == 0)
                //datatype property
                leafLabel = leafLabel.substring(leafLabel.lastIndexOf("/") + 1);
            else leafLabel = leafNode.label || leafNode.id;
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
                        if (edge.from == leafNode.ancestors[previousAncestorLevel] && edge.to == leafNode.ancestors[ancestorLevel]) propLabel = "-[" + edge.label + "]-";
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

    self.exportTeeToDataTable = function (jstreeDiv, nodeId) {
        if (!jstreeDiv) jstreeDiv = SourceBrowser.currentTargetDiv;
        if (!nodeId) nodeId = SourceBrowser.currentTreeNode ? SourceBrowser.currentTreeNode.id : "#";
        if (!nodeId) nodeId = "#";
        //  var data = common.jstree.toTableData(jstreeDiv,nodeId)

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
                } else flat(data.children, prev);
            }
        }

        flat(tree);
        //  var nodesArray = result;

        var data = self.prepareDataSet(result, nodesMap);
        self.showDataTable(null, data.cols, data.dataSet);

        return;
    };

    self.exportAllDescendants = function (parentId, options, indexes) {
        if (!options) options = {};

        MainController.UI.message("exporting node descendants...");
        $("#waitImg").css("display", "block");
        SearchUtil.getParentAllDescendants(parentId, indexes, null, function (err, result) {
            if (err) MainController.UI.message(err, true);
            var matrixLabels = [];
            var matrixIds = [];
            var maxParentsLength = 0;
            result.data.forEach(function (hit, _index) {
                var parentIdsArray = [];
                var parentLabelsArray = [];
                if (!hit.parents || !hit.parents.forEach) return;
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

            MainController.UI.message("", true);
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

    self.showDataTable = function (div, cols, dataSet, buttons) {
        if (self.dataTable) {
            self.dataTable.destroy();
            $("#dataTableDiv").html("");
        }
        if (!div) {
            $("#mainDialogDiv").dialog("open");
            $("#mainDialogDiv").html("<table id='dataTableDivExport'></table>");
            div = "dataTableDiv";
        } else {
            $("#" + div).html("<table id='dataTableDivExport'></table>");
        }
        setTimeout(function () {
            if (!buttons) buttons = "Bfrtip";
            self.dataTable = $("#dataTableDivExport").DataTable({
                data: dataSet,
                columns: cols,

                // async: false,
                pageLength: 15,
                dom: buttons,
                /*buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ]*/
                buttons: [
                    {
                        extend: "csvHtml5",
                        text: "Export CSV",
                        fieldBoundary: "",
                        fieldSeparator: ";",
                    },
                    "copy",
                ],
                /* 'columnDefs': [
             {'max-width': '20%', 'targets': 0}
         ],*/
                order: [],
            });
        }, 200);
    };

    return self;
})();
