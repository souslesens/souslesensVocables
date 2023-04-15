import visjsGraph from "./visjsGraph2.js"
import Sparql_common from "./sparql_common.js"
import OwlSchema from "./owlSchema.js"



/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var OntologyBrowser = (function () {
    var self = {};

    self.schemasConfig;
    self.currentSourceUri;
    self.nodeProperties;
    self.currentFilters = {};
    self.currentSelectedProps = {};
    self.classColors = {};
    self.currentNode;
    self.queryClassPath = {};
    self.queryLimit = 500;

    self.onLoaded = function () {
        // $("#graphDiv").load("snippets/OntologyBrowser.html")
    };

    self.onSourceSelect = function (_sourceLabel) {
        return null;
    };

    /********************************************************************************************************************************/

    self.init = function (callback) {
        $("#graphDiv").load("snippets/OntologyBrowser.html");
        setTimeout(function () {
            var rightPanelDiv = 300;
            /*    var w = $("#graphDiv").width()
            var h = $(window).height();*/
            var h = $("#graphDiv").height();
            var w = $("#graphDiv").height();
            $("#OntologyBrowser_graphDiv").height(h);
            $("#OntologyBrowser_selectionDiv").height(h);
            $("#OntologyBrowser_graphDiv").width(w);
            $("#OntologyBrowser_selectionDiv").width(rightPanelDiv);
            $("#OntologyBrowser_tabs_result").width(w);
            $("#OntologyBrowser_tabs_result").height(h);

            $("#OntologyBrowser_dataPropertyFilterDialog").dialog({
                autoOpen: false,
                height: 300,
                width: 300,
                modal: false,
            });

            if (callback) callback();
        }, 500);
    };
    self.getJstreeConceptsContextMenu = function () {
        var items = {};
        /*   if(!OntologyBrowser.currentTreeNode)
               return items;*/

        items.addQueryFilter = {
            label: "Add Query Filter...",
            action: function (_e) {
                // pb avec source
                OntologyBrowser.query.addQueryFilterShowDialog();
            },
        };
        items.removeQueryFilter = {
            label: "Remove Query Filter",
            action: function (_e) {
                // pb avec source
                OntologyBrowser.query.removeQueryFilter();
            },
        };
        items.setOptional = {
            label: "Optional",
            action: function (_e) {
                // pb avec source
                OntologyBrowser.query.setOptional();
            },
        };

        return items;
    };
    self.selectTreeNodeFn = function (_xx, obj) {
        self.currentTreeNode = obj.node;
    };
    self.checkTreeNodeFn = function (_item, _xx) {
        /*pass*/
    };

    self.showProperties = function (classId, classLabel, callback) {
        function execute(classId) {
            var properties = {};
            async.series(
                [
                    function (callbackSeries) {
                        OwlSchema.initSourceSchema(MainController.currentSource, function (err, result) {
                            OwlSchema.currentSourceSchema = result;

                            callbackSeries(err);
                        });
                    },
                    function (callbackSeries) {
                        OwlSchema.getClassDescription(MainController.currentSource, classId, function (err, description) {
                            if (err) return callbackSeries(err);
                            OwlSchema.currentSourceSchema.labelsMap[classId] = description.label.value;
                            for (var key in description.objectProperties) {
                                properties[key] = description.objectProperties[key];
                            }
                            callbackSeries();
                        });
                    },
                    function (callbackSeries) {
                        // PROBLEM
                        // use anonymNodes properties
                        return callbackSeries();
                        // var schema = Config.sources[MainController.currentSource].schema;
                        // Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema, classId, function (err, result) {
                        //     result.forEach(function (item) {
                        //         if (!item.range) return;
                        //         if (!properties[item.property.value]) properties[item.property.value] = { id: item.property.value, label: item.property.value };
                        //         properties[item.property.value].range = item.range.value;
                        //     });
                        //     return callbackSeries();
                        // });
                    },

                    function (callbackSeries) {
                        // draw graph new or update

                        var visjsData = { nodes: [], edges: [] };
                        var existingVisjsIds = {};
                        if (!newGraph) {
                            existingVisjsIds = visjsGraph.getExistingIdsMap();
                        }

                        if (!existingVisjsIds[classId]) {
                            existingVisjsIds[classId] = 1;
                            visjsData.nodes.push({
                                id: SourceBrowser.currentTreeNode.data.id,
                                label: Sparql_common.getLabelFromURI(classId),
                                shape: "box",
                            });
                        }
                        for (var key in properties) {
                            var property = properties[key];
                            if (property.domain && !existingVisjsIds[property.domain]) {
                                existingVisjsIds[property.domain] = 1;
                                if (!self.classColors[property.domain]) self.classColors[property.domain] = common.palette[Object.keys(self.classColors).length];
                                visjsData.nodes.push({
                                    id: property.domain,
                                    label: Sparql_common.getLabelFromURI(property.domain),
                                    shape: "box",
                                    color: self.classColors[property.domain],
                                    data: {},
                                });
                                var edgeId = classId + "_" + property.domain;
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: classId,
                                    to: property.domain,
                                    label: Sparql_common.getLabelFromURI(key),
                                    data: { propertyId: key },
                                });
                            }
                            if (property.range && !existingVisjsIds[property.range]) {
                                existingVisjsIds[property.range] = 1;
                                if (!self.classColors[property.range]) self.classColors[property.range] = common.palette[Object.keys(self.classColors).length];
                                visjsData.nodes.push({
                                    id: property.range,
                                    label: Sparql_common.getLabelFromURI(property.range),
                                    shape: "box",
                                    color: self.classColors[property.range],
                                    data: {},
                                });
                                edgeId = classId + "_" + property.range;
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: classId,
                                    to: property.range,
                                    label: Sparql_common.getLabelFromURI(key),
                                    data: { propertyId: key },
                                });
                            }
                        }
                        if (newGraph) {
                            self.setGraphPopupMenus();
                            visjsGraph.draw("OntologyBrowser_graphDiv", visjsData, {
                                onclickFn: OntologyBrowser.onNodeClick,
                                onRightClickFn: OntologyBrowser.showGraphPopupMenu,
                            });
                        } else {
                            visjsGraph.data.nodes.update(visjsData.nodes);
                            visjsGraph.data.edges.update(visjsData.edges);
                        }
                        callbackSeries();
                    },
                ],
                function (err) {
                    if (callback) callback(err);
                    if (err) return MainController.UI.message(err);
                }
            );
        }

        var newGraph = true;

        if (!classId) {
            self.queryClassPath = {};
            classId = SourceBrowser.currentTreeNode.data.id;
            classLabel = SourceBrowser.currentTreeNode.data.label;
            self.init(function () {
                execute(classId, classLabel);
            });
        } else {
            newGraph = false;
            execute(classId);
        }
    };

    self.setGraphPopupMenus = function (node) {
        if (!node) return;
        if (!node.from) {
            var html =
                '    <span class="popupMenuItem" onclick="OntologyBrowser.graphActions.expandObjectProperties();"> Object properties</span>\n' +
                '    <span class="popupMenuItem" onclick="OntologyBrowser.graphActions.showDataTypeProperties();"> Data properties</span>\n' +
                '    <span  class="popupMenuItem"onclick="OntologyBrowser.graphActions.expandSubclasses();">Subclasses</span>';
        }
        html += '    <span  class="popupMenuItem"onclick="OntologyBrowser.graphActions.showNodeInfo();">showNodeInfo</span>';
        $("#graphPopupDiv").html(html);
    };

    self.onNodeClick = function (node, _point, _event) {
        if (!node) return MainController.UI.hidePopup("graphPopupDiv");

        OwlSchema.getClassDescription(MainController.currentSource, node.id, function (err, _result) {
            if (err) {
                self.currentNode = null;
                return MainController.UI.message(err);
            }
            self.currentNode = node;
            self.currentNode.dataProperties = {};
            self.graphActions.showDataTypeProperties();
        });
    };
    self.showGraphPopupMenu = function (node, point, _event) {
        self.setGraphPopupMenus(node);
        self.currentNode = node;
        MainController.UI.showPopup(point, "graphPopupDiv");
    };

    self.graphActions = {
        expandObjectProperties: function () {
            self.showProperties(OntologyBrowser.currentNode.id, OntologyBrowser.currentNode.text);
        },
        showDataTypeProperties: function () {
            Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema, OntologyBrowser.currentNode.id, function (_err, result) {
                OwlSchema.setLabelsFromQueryResult(result);
                var html = "<B>" + OntologyBrowser.currentNode.label + "</B>" + "<div style='display:flex;flex-direction:column'>";
                var existingItems = [];
                result.forEach(function (item) {
                    var range = null;

                    if (item.range) {
                        range = item.range;
                    } else return;
                    var id = OntologyBrowser.currentNode.id + "|" + item.property.value;
                    if (!OntologyBrowser.currentNode.dataProperties[id]) {
                        OntologyBrowser.currentNode.dataProperties[id] = range;
                    }

                    if (existingItems.indexOf(id) < 0) {
                        existingItems.push(id);
                        html +=
                            "<div class='OntologyBrowser_propertyDiv' onclick='OntologyBrowser.graphActions.addPropertyToTree($(this))' id='" +
                            id +
                            "'>" +
                            Sparql_common.getLabelFromURI(item.property.value) +
                            "</div>";
                    }
                });
                html += "</div>";
                $("#OntologyBrowser_propertiesDiv").html(html);
                /*   var point={x:300,y:600}
                   MainController.UI.showPopup(point, "graphPopupDiv")*/
            });
        },
        expandSubclasses: function () {
            Config.sources[MainController.currentSource].controller.getNodeChildren(MainController.currentSource, null, OntologyBrowser.currentNode.id, 1, {}, function (err, children) {
                OwlSchema.setLabelsFromQueryResult(children);
                if (err) return MainController.UI.message(err);
                var existingVisjsIds = visjsGraph.getExistingIdsMap();
                var visjsData = { nodes: [], edges: [] };
                children.forEach(function (item) {
                    if (!existingVisjsIds[item.child1.value]) {
                        existingVisjsIds[item.child1.value] = 1;

                        visjsData.nodes.push({
                            id: item.child1.value,
                            label: Sparql_common.getLabelFromURI(item.child1.value),
                            shape: "dot",
                            color: OntologyBrowser.currentNode.color,
                        });
                        var edgeId = OntologyBrowser.currentNode.id + "_" + item.child1.value;
                        visjsData.edges.push({
                            id: edgeId,
                            from: OntologyBrowser.currentNode.id,
                            to: item.child1.value,
                        });
                    }
                });
                visjsGraph.data.nodes.update(visjsData.nodes);
                visjsGraph.data.edges.update(visjsData.edges);
            });
        },

        addPropertyToTree: function (div) {
            var id = $(div).attr("id");
            var isNewTree = $("#OntologyBrowser_queryTreeDiv").is(":empty");
            var existingNodes = [];
            if (!isNewTree) existingNodes = common.jstree.getjsTreeNodes("OntologyBrowser_queryTreeDiv", true);
            var jstreeData = [];

            if (existingNodes.indexOf(OntologyBrowser.currentNode.id) < 0) {
                jstreeData.push({
                    id: OntologyBrowser.currentNode.id,
                    text: Sparql_common.getLabelFromURI(OntologyBrowser.currentNode.id),
                    parent: "#",
                    data: {
                        type: "Class",
                        id: OntologyBrowser.currentNode.id,
                    },
                });
                if (!isNewTree) {
                    common.jstree.addNodesToJstree("OntologyBrowser_queryTreeDiv", "#", jstreeData);
                    jstreeData = [];
                }
            }
            if (existingNodes.indexOf(id) < 0) {
                var propId = id.split("|")[1];
                jstreeData.push({
                    id: id,
                    text: Sparql_common.getLabelFromURI(propId),
                    parent: OntologyBrowser.currentNode.id,
                    data: {
                        propId: propId,
                        type: "DataTypeProperty",
                        parent: OntologyBrowser.currentNode.id,
                        range: OntologyBrowser.currentNode.dataProperties[id],
                    },
                });

                if (isNewTree) {
                    var jsTreeOptions = {};
                    jsTreeOptions.contextMenu = OntologyBrowser.getJstreeConceptsContextMenu();
                    jsTreeOptions.selectTreeNodeFn = OntologyBrowser.selectTreeNodeFn;
                    //  jsTreeOptions.onCheckNodeFn = OntologyBrowser.checkTreeNodeFn;
                    //  jsTreeOptions.withCheckboxes=true

                    common.jstree.loadJsTree("OntologyBrowser_queryTreeDiv", jstreeData, jsTreeOptions);
                } else {
                    common.jstree.addNodesToJstree("OntologyBrowser_queryTreeDiv", OntologyBrowser.currentNode.id, jstreeData);
                }
            }
        },
        resetFilters: function () {
            $("#OntologyBrowser_queryTreeDiv").html("");
        },

        showNodeInfo: function () {
            SourceBrowser.showNodeInfos(MainController.currentSource, OntologyBrowser.currentNode, "mainDialogDiv");
        },
    };

    self.query = {
        addQueryFilterShowDialog: function () {
            var node = $("#OntologyBrowser_queryTreeDiv").jstree(true).get_selected(true)[0];
            var range = node.data.range;

            var operators = [];
            $("#OntologyBrowser_dataPropertyFilterDialog").dialog("open");

            if (range.value.indexOf("XMLSchema#string") > -1 || range.value.indexOf("Literal") > -1) {
                operators = ["=", "#", "contains", "beginsWith", "endsWith"];
            } else if (range.value.indexOf("XMLSchema#decimal") > -1 || range.value.indexOf("XMLSchema#integer") > -1) {
                operators = ["=", "#", ">", "<", ">=", "<="];
            } else {
                alert("else ?  " + range.value);
            }

            common.fillSelectOptions("OntologyBrowser_dataPropertyFilterDialog_operator", operators, true);
        },

        validateFilterDialog: function () {
            var operator = $("#OntologyBrowser_dataPropertyFilterDialog_operator").val();
            var value = $("#OntologyBrowser_dataPropertyFilterDialog_value").val();
            $("#OntologyBrowser_dataPropertyFilterDialog").dialog("close");

            var node = $("#OntologyBrowser_queryTreeDiv").jstree(true).get_selected(true)[0];
            var jstreeData = [];
            jstreeData.push({
                id: "" + Math.random(),
                text: operator + " " + value,
                parent: node.id,
                data: {
                    operator: operator,
                    value: value,
                },
            });

            common.jstree.addNodesToJstree("OntologyBrowser_queryTreeDiv", node.id, jstreeData);
        },
        cancelFilterDialog: function () {
            $("#OntologyBrowser_dataPropertyFilterDialog").dialog("close");
        },
        removeQueryFilter: function () {
            var nodeId = $("#OntologyBrowser_queryTreeDiv").jstree(true).get_selected()[0];
            $("#OntologyBrowser_queryTreeDiv").jstree(true).delete_node(nodeId);
        },
        setOptional: function () {
            // var node = $("#OntologyBrowser_queryTreeDiv").jstree(true).get_selected(true)[0];
            var node = self.currentTreeNode;
            $("#OntologyBrowser_queryTreeDiv").jstree("rename_node", node, node.text + " (OPTIONAL)");
            node.data.optional = true;
            //  node.text=node.text+"optional"
        },

        executeQuery: function () {
            var nodes = common.jstree.getjsTreeNodes("OntologyBrowser_queryTreeDiv");
            var nodesMap = {};
            nodes.forEach(function (item) {
                nodesMap[item.id] = item;
            });

            var classNodeIds = common.jstree.getjsTreeNodeObj("OntologyBrowser_queryTreeDiv", "#").children;

            var selectStr = " * ";
            var showIds = $("OntologyBrowser_queryShowItemsIdsCBX").prop("checked");
            var query = "";
            if (!showIds) selectStr = " ";
            classNodeIds.forEach(function (classNodeId, index) {
                // Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema,classNodeId ,function(err,result){

                var classNode = common.jstree.getjsTreeNodeObj("OntologyBrowser_queryTreeDiv", [classNodeId]);

                if (index > 0) {
                    // join classes

                    var previousClasses = Object.keys(self.queryClassPath);
                    var classes = OwlSchema.currentSourceSchema.classes;
                    var done = false;
                    for (var aClass in classes) {
                        if (!done) {
                            var properties = classes[aClass].objectProperties;
                            for (var propertyId in properties) {
                                var property = properties[propertyId];
                                var p = previousClasses.indexOf(property.range);
                                if (p > -1) {
                                    var previousClassLabel = self.queryClassPath[previousClasses[p]].label;

                                    if (property.domain == classNodeId) {
                                        query += "?" + classNode.text + " <" + propertyId + "> ?" + previousClassLabel + " . ";
                                        done = true;
                                    }
                                    if (property.range == classNodeId && previousClasses.indexOf(property.domain)) {
                                        query += "?" + previousClassLabel + " <" + propertyId + "> ?" + classNode.text + " . ";
                                        done = true;
                                    }
                                }
                            }
                        }
                    }
                }

                self.queryClassPath[classNodeId] = { id: classNodeId, label: classNode.text };

                query += "?" + classNode.text + " rdf:type <" + classNode.id + "> . ";
                classNode.children.forEach(function (propertyNodeId) {
                    var propertyNode = common.jstree.getjsTreeNodeObj("OntologyBrowser_queryTreeDiv", [propertyNodeId]);
                    if (propertyNode.data.optional) {
                        query += "OPTIONAL {";
                        propertyNode.text = propertyNode.text.replace(" (OPTIONAL)", "");
                    }
                    if (!showIds) selectStr += " ?" + propertyNode.text;

                    query += "?" + classNode.text + " <" + propertyNode.data.propId + "> ?" + propertyNode.text + " . ";
                    propertyNode.children.forEach(function (filterNodeId) {
                        var filterNode = common.jstree.getjsTreeNodeObj("OntologyBrowser_queryTreeDiv", [filterNodeId]);
                        var operator = filterNode.data.operator;
                        var value = filterNode.data.value;
                        var range = propertyNode.data.range.value;
                        if (range.indexOf("string") > -1) {
                            if (operator == "contains") query += "FILTER (REGEX(?" + propertyNode.text + ",'" + value + "','i')) ";
                            else if (operator == "beginsWith") query += "FILTER (REGEX(?" + propertyNode.text + ",'^" + value + "','i')) ";
                            else query += "FILTER (?" + propertyNode.text + operator + "'" + value + "'" + ")";
                        } else if (value.indexOf("http") > 0) {
                            //pass
                        } else {
                            query += "FILTER (?" + propertyNode.text + operator + value + ")";
                        }
                    });

                    if (propertyNode.data.optional) {
                        query += "} ";
                    }
                });
            });
            var fromStr = "FROM <http://sws.ifi.uio.no/vocab/npd-v2/> FROM <http://sws.ifi.uio.no/data/npd-v2/> ";
            query =
                " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                "Select " +
                selectStr +
                " " +
                fromStr +
                " where {" +
                query;

            query += "} limit " + self.queryLimit;
            //  return;
            var url = Config.sources[MainController.currentSource].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, {}, function (err, result) {
                if (err) return MainController.UI.message(err);
                if (result.length >= self.queryLimit) return MainController.UI.message("result too long >" + self.queryLimit + " lines ");
                self.query.showQueryResultInDataTable(result);
            });
        },
        showQueryResultInDataTable: function (result) {
            var dataSet = [];
            var cols = [];
            result.head.vars.forEach(function (item) {
                cols.push({ title: item });
            });
            result.results.bindings.forEach(function (item, _indexRow) {
                var line = [];
                result.head.vars.forEach(function (col, _indexCol) {
                    if (item[col]) line.push(item[col].value);
                    else line.push("");
                });
                dataSet.push(line);
            });
            $("#OntologyBrowser_tabs").tabs("option", "active", 1);

            $("#OntologyBrowser_tabs_result").html("<table id='dataTableDiv'></table>");
            setTimeout(function () {
                $("#dataTableDiv").DataTable({
                    data: dataSet,
                    columns: cols,
                    // async: false,
                    pageLength: 15,
                    dom: "Bfrtip",
                    buttons: ["copy", "csv", "excel", "pdf", "print"],
                }),
                    500;
            });
        },
    };

    return self;
})();



export default OntologyBrowser
