var AssetQuery = (function () {
        var self = {};
        self.currentProperty;
        self.currentNode;

        self.queryClassPath = {};


        self.showNodeProperties = function (node) {
            if (!node)
                node = Lineage_classes.currentGraphNode
            self.currentNode = node
            var data = []
            async.series([


                function (callbackSeries) {
                    Sparql_OWL.getObjectProperties(Lineage_classes.currentSource, [node.id], null, function (err, result) {
                        if (err)
                            return MainController.UI.message(err)

                        data = result
                        callbackSeries()
                    })
                },

                function (callbackSeries) {
                    Sparql_OWL.getObjectRestrictions(Lineage_classes.currentSource, [node.id], null, function (err, result) {
                        if (err)
                            return MainController.UI.message(err)
                        data = result
                        callbackSeries()
                    })
                },


                function (callbackSeries) {
                    if (data.length == 0) {
                        return MainController.UI.message("no properties found")

                    }
                    if (!node.properties)
                        node.properties = {}
                    var html = "";
                    var existingItems = []
                    data.forEach(function (item) {
                        var range = null;
                        var rangeLabel = null;
                        var propLabel = null;
                        if (item.propLabel) {
                            propLabel = item.propLabel.value
                        }

                        if (item.range) {
                            range = item.range.value
                        } else if (item.value) {
                            range = item.range.value
                        } else
                            range = "?"

                        var id = node.id + "|" + item.prop.value;
                        if (!node.properties[id]) {
                            node.properties[item.prop.value] = {id: item.prop.value, label: propLabel, range: range}
                        }

                        if (existingItems.indexOf(id) < 0) {
                            existingItems.push(id)
                            html += "<div class='AssetQuery_propertyDiv' onclick='AssetQuery.actions.addPropertyToTree($(this))' id='" + encodeURIComponent(id) + "'>" + propLabel + "</div>"
                        }

                    })
                    html += "</div>"
                    $("#AssetQuery_propertiesDiv").html(html);
                    $("#Lineage_Tabs").tabs("option", "active", 3);
                    callbackSeries()
                    /*   var point={x:300,y:600}
                       MainController.UI.showPopup(point, "graphPopupDiv")*/

                }


            ], function (err) {
            })
        }


        self.showNodePropertiesOld = function (node) {
            if (!node)
                node = Lineage_classes.currentGraphNode
            self.currentProperty = node
            OwlSchema.initSourceSchema(Lineage_classes.currentSource, function (err, schema) {
                Sparql_schema.getClassPropertiesAndRanges(schema, node.id, function (err, result) {
                    OwlSchema.setLabelsFromQueryResult(result)
                    var html = "<B>" + node.label + "</B>" +
                        "<div style='display:flex;flex-direction:column'>"
                    var existingItems = []
                    if (!node.dataProperties)
                        node.dataProperties = {}
                    result.forEach(function (item) {


                        var range = null;

                        if (item.range) {
                            range = item.range
                        } else
                            return;
                        var id = node.id + "|" + item.property.value;
                        if (!node.dataProperties[id]) {
                            node.dataProperties[id] = range
                        }

                        if (existingItems.indexOf(id) < 0) {
                            existingItems.push(id)
                            html += "<div class='AssetQuery_propertyDiv' onclick='AssetQuery.actions.addPropertyToTree($(this))' id='" + id + "'>" + Sparql_common.getLabelFromId(item.property.value) + "</div>"
                        }

                    })
                    html += "</div>"
                    $("#AssetQuery_propertiesDiv").html(html);
                    $("#Lineage_Tabs").tabs("option", "active", 3);
                    /*   var point={x:300,y:600}
                       MainController.UI.showPopup(point, "graphPopupDiv")*/

                })

            })
        }


        self.getJstreeConceptsContextMenu = function () {
            var items = {}
            /*   if(!AssetQuery.currentTreeNode)
                   return items;*/

            items.addQueryFilter = {
                label: "Add Query Filter...",
                action: function (e) {// pb avec source
                    AssetQuery.query.addQueryFilterShowDialog()
                }
            }
            items.removeQueryFilter = {
                label: "Remove Query Filter",
                action: function (e) {// pb avec source
                    AssetQuery.query.removeQueryFilter()
                }
            }
            items.setOptional = {
                label: "Optional",
                action: function (e) {// pb avec source
                    AssetQuery.query.setOptional()
                }
            }


            return items;


        }
        self.selectTreeNodeFn = function (xx, obj) {
            self.currentTreeNode = obj.node;
        };
        self.actions = {
            expandObjectProperties: function () {

                self.showProperties(AssetQuery.currentProperty.id, AssetQuery.currentProperty.text)
            },
            showDataTypeProperties: function () {
                var schema = Config.sources[MainController.currentSource].schema;
                Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema, AssetQuery.currentProperty.id, function (err, result) {
                    OwlSchema.setLabelsFromQueryResult(result)
                    var html = "<B>" + AssetQuery.currentProperty.label + "</B>" +
                        "<div style='display:flex;flex-direction:column'>"
                    var existingItems = []
                    result.forEach(function (item) {


                        var range = null;

                        if (item.range) {
                            range = item.range
                        } else
                            return;
                        var id = AssetQuery.currentProperty.id + "|" + item.property.value;
                        if (!AssetQuery.currentProperty.dataProperties[id]) {
                            AssetQuery.currentProperty.dataProperties[id] = range
                        }

                        if (existingItems.indexOf(id) < 0) {
                            existingItems.push(id)
                            html += "<div class='AssetQuery_propertyDiv' onclick='AssetQuery.graphActions.addPropertyToTree($(this))' id='" + id + "'>" + Sparql_common.getLabelFromId(item.property.value) + "</div>"
                        }

                    })
                    html += "</div>"
                    $("#AssetQuery_propertiesDiv").html(html);
                    /*   var point={x:300,y:600}
                       MainController.UI.showPopup(point, "graphPopupDiv")*/

                })

            },
            expandSubclasses: function () {
                Config.sources[MainController.currentSource].controller.getNodeChildren(MainController.currentSource, null, AssetQuery.currentProperty.id, 1, {}, function (err, children) {
                    OwlSchema.setLabelsFromQueryResult(children)
                    if (err)
                        return MainController.UI.message(err);
                    var existingVisjsIds = visjsGraph.getExistingIdsMap()
                    var visjsData = {nodes: [], edges: []}
                    children.forEach(function (item) {
                        if (!existingVisjsIds[item.child1.value]) {
                            existingVisjsIds[item.child1.value] = 1

                            visjsData.nodes.push({
                                id: item.child1.value,
                                label: Sparql_common.getLabelFromId(item.child1.value),
                                shape: "dot",
                                color: AssetQuery.currentProperty.color
                            })
                            var edgeId = AssetQuery.currentProperty.id + "_" + item.child1.value
                            visjsData.edges.push({
                                id: edgeId,
                                from: AssetQuery.currentProperty.id,
                                to: item.child1.value,

                            })

                        }

                    })
                    visjsGraph.data.nodes.update(visjsData.nodes);
                    visjsGraph.data.edges.update(visjsData.edges);

                })
            },
            resetFilters: function () {
                $("#OntologyBrowser_queryTreeDiv").html("")
                self.queryClassPath = {};
            },
            addPropertyToTree: function (div) {
                var str = decodeURIComponent($(div).attr("id"));
                var array = str.split("|")

                var prop = self.currentNode.properties[array[1]];


                var isNewTree = $("#AssetQuery_queryTreeDiv").is(':empty');
                var existingNodes = []
                if (!isNewTree)
                    existingNodes = common.getjsTreeNodes("AssetQuery_queryTreeDiv", true)
                var jstreeData = [];

                if (existingNodes.indexOf(AssetQuery.currentNode.id) < 0) {
                    jstreeData.push({
                        id: AssetQuery.currentNode.id,
                        text: AssetQuery.currentNode.label,
                        parent: '#',
                        data: {
                            type: "Class",
                            id: AssetQuery.currentNode.id,

                        }
                    })
                    if (!isNewTree) {

                        common.addNodesToJstree("AssetQuery_queryTreeDiv", "#", jstreeData)
                        jstreeData = []
                    }


                }
                if (existingNodes.indexOf(prop.id) < 0) {

                    jstreeData.push({
                        id: prop.id,
                        text: prop.label,
                        parent: AssetQuery.currentNode.id,
                        data: {
                            label: prop.label,
                            propId: prop.id,
                            type: "DataTypeProperty",
                            parent: AssetQuery.currentNode.id,
                            range: AssetQuery.currentNode.properties[prop.id].range
                        }
                    })

                    if (isNewTree) {
                        var jsTreeOptions = {};
                        jsTreeOptions.contextMenu = AssetQuery.getJstreeConceptsContextMenu()
                        jsTreeOptions.selectTreeNodeFn = AssetQuery.selectTreeNodeFn;
                        //  jsTreeOptions.onCheckNodeFn = AssetQuery.checkTreeNodeFn;
                        //  jsTreeOptions.withCheckboxes=true

                        common.loadJsTree("AssetQuery_queryTreeDiv", jstreeData, jsTreeOptions)
                    } else {
                        common.addNodesToJstree("AssetQuery_queryTreeDiv", AssetQuery.currentNode.id, jstreeData)
                    }

                }

            }
            ,
            resetFilters: function () {
                $("#AssetQuery_queryTreeDiv").html("")
            }
            ,

            showNodeInfo: function () {

                MainController.UI.showNodeInfos(MainController.currentSource, AssetQuery.currentProperty.id, "mainDialogDiv")
            }


        }


        self.query = {

            addQueryFilterShowDialog: function () {
                var node = $("#AssetQuery_queryTreeDiv").jstree(true).get_selected(true)[0]
                var range = node.data.range

                var operators = []
                $("#AssetQuery_dataPropertyFilterDialog").dialog("open");


                if (range.value.indexOf("XMLSchema#string") > -1 || range.value.indexOf("Literal") > -1) {
                    operators = ["=", "#", "contains", "beginsWith", "endsWith"]
                } else if (range.value.indexOf("XMLSchema#decimal") > -1 || range.value.indexOf("XMLSchema#integer") > -1) {
                    operators = ["=", "#", ">", "<", ">=", "<="]
                } else {
                    alert("else ?  " + range.value)
                }

                common.fillSelectOptions("AssetQuery_dataPropertyFilterDialog_operator", operators, true)


            },

            validateFilterDialog: function () {
                var operator = $("#AssetQuery_dataPropertyFilterDialog_operator").val()
                var value = $("#AssetQuery_dataPropertyFilterDialog_value").val()
                $("#AssetQuery_dataPropertyFilterDialog").dialog("close");

                var node = $("#AssetQuery_queryTreeDiv").jstree(true).get_selected(true)[0]
                var property = node.data
                var jstreeData = []
                jstreeData.push({
                    id: "" + Math.random(),
                    text: operator + " " + value,
                    parent: node.id,
                    data: {
                        operator: operator,
                        value: value

                    }

                })

                common.addNodesToJstree("AssetQuery_queryTreeDiv", node.id, jstreeData)


            },
            cancelFilterDialog: function () {
                $("#AssetQuery_dataPropertyFilterDialog").dialog("close");
            },
            removeQueryFilter: function () {
                var nodeId = $("#AssetQuery_queryTreeDiv").jstree(true).get_selected()[0]
                $("#AssetQuery_queryTreeDiv").jstree(true).delete_node(nodeId)
            },
            setOptional: function () {
                // var node = $("#AssetQuery_queryTreeDiv").jstree(true).get_selected(true)[0];
                var node = self.currentTreeNode
                $('#AssetQuery_queryTreeDiv').jstree('rename_node', node, node.text + " (OPTIONAL)")
                node.data.optional = true
                //  node.text=node.text+"optional"

            },

            executeAssetQuery: function () {
                var nodes = common.getjsTreeNodes("AssetQuery_queryTreeDiv")
                var nodesMap = {}
                nodes.forEach(function (item) {
                    nodesMap[item.id] = item;
                })


                var classNodeIds = $('#AssetQuery_queryTreeDiv').jstree(true).get_node("#").children;


                var filters = [];
                var selectFields = []
                var previousClassId = null;
                var previousClassLabel = null;
                var selectStr = " * "
                var showIds = $('AssetQuery_queryShowItemsIdsCBX').prop("checked")
                var query = "";
                if (!showIds)
                    selectStr = " ";

                formatVariableName = function (str) {
                    return str.replace(/ /g, "_")
                }

                classNodeIds.forEach(function (classNodeId, index) {
                    // Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema,classNodeId ,function(err,result){


                    //  var whereStr = "?quantumId <http://data.total.com/resource/quantum/mappings/CFIHOS_READI#sameAs> ?id. "


                    //    var propIds = common.getjsTreeNodeObj("AssetQuery_queryTreeDiv", [classNodeId]).children
                    var props = common.getjsTreeNodes("AssetQuery_queryTreeDiv", false, [classNodeId])


                    var labels = []

                    props.forEach(function (prop) {
                        if (prop.data && prop.data.propId)
                            labels.push(prop.data.label)

                    })
                    var whereStr = "?quantumId rdfs:label  ?readiLabel. "
                    whereStr += Sparql_common.setFilter("readi", null, labels, {exactMatch: true})
                    var selectStr = "?quantumId  "
                    var fromStr = ""
                    if (self.graphUri && self.graphUri != "") {
                        if (!Array.isArray(self.graphUri))
                            self.graphUri = [self.graphUri]
                        self.graphUri.forEach(function (graphUri) {
                            fromStr = " FROM <" + graphUri + "> "
                        })
                    }


                    query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                        "Select " + selectStr + " " + fromStr + " where {" + whereStr;

                    query += "} limit " + Sparql_generic.queryLimit
                })
                //  return;
                var url = Config.sources[Lineage_classes.currentSource].sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, {source: Lineage_classes.currentSource}, function (err, result) {
                    if (err)
                        return MainController.UI.message(err)
                    if (result.length >= self.queryLimit)
                        return MainController.UI.message("result too long >" + self.queryLimit + " lines ")
                    self.query.showQueryResultInDataTable(result)
                })


            },


            showQueryResultInDataTable: function (result) {

                var dataSet = [];
                var cols = [];
                result.head.vars.forEach(function (item) {
                    cols.push({title: item})
                })
                result.results.bindings.forEach(function (item, indexRow) {
                    var line = []
                    result.head.vars.forEach(function (col, indexCol) {
                        if (item[col])
                            line.push(item[col].value);
                        else
                            line.push("");
                    })
                    dataSet.push(line)
                })
                $("#AssetQuery_tabs").tabs("option", "active", 1);

                $('#AssetQuery_tabs_result').html("<table id='dataTableDiv'></table>");
                setTimeout(function () {

                    $('#dataTableDiv').DataTable({
                        data: dataSet,
                        columns: cols,
                        // async: false,
                        "pageLength": 15,
                        dom: 'Bfrtip',
                        buttons: [
                            'copy', 'csv', 'excel', 'pdf', 'print'
                        ]


                    })
                        , 500
                })


            }


        }

        return self;


    }
    ()
)
