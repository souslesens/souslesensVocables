/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var KGquery = (function () {
    var self = {};
    self.currentProperty;
    self.currentNode;

    self.queryClassPath = {};


    self.showJstreeNodeChildren = function (jstreeTargetDiv, node) {


        return Sparql_INDIVIDUALS.getObjectProperties(node.data.source, node.data.id, {propertiesStats:false}, function (err, result) {
            var existingsNodes = {[node.data.id]: 1}

            var jstreeData = []
            var existingNodes={}
            var propIdsMap={}
            result.forEach(function (item) {
             if( !existingNodes[item.prop.value]){
                 var propId= item.prop.value + "_" + common.getRandomHexaId(3);
                 existingNodes[item.prop.value]=propId
                 jstreeData.push({
                     id:propId,
                     text:item.propLabel.value,
                     parent:node.data.id,
                     data:{source:node.data.source, id:item.prop.value,label:item.propLabel.value}
                 })

             }


                if( item.range.value!= node.data.id && !existingNodes[item.range.value]){
                    var range= item.range.value + "_" + common.getRandomHexaId(3);
                    existingNodes[item.range.value]=range
                    jstreeData.push({
                        id:range,
                        text:"->"+item.rangeLabel.value,
                        parent:existingNodes[item.prop.value],
                        data:{source:node.data.source, id:item.range.value,label:item.rangeLabel.value}
                    })

                }
                if( item.domain.value!= node.data.id && !existingNodes[item.domain.value]){
                    var domain= item.domain.value + "_" + common.getRandomHexaId(3);
                    existingNodes[item.domain.value]=domain
                    jstreeData.push({
                        id:domain,
                        text:"<-"+item.domainLabel.value,
                        parent:existingNodes[item.prop.value],
                        data:{source:node.data.source, id:item.domain.value,label:item.domainLabel.value}
                    })

                }

            })
            common.jstree.addNodesToJstree(jstreeTargetDiv, node.data.id, jstreeData)

   /*         var propsMap = {}
            result.forEach(function (item) {
                if (!propsMap[item.prop.value])
                    propsMap[item.prop.value] = {id: item.prop.value, label: item.propLabel.value, domains: [], ranges: []}

                propsMap[item.prop.value].domains.push({id: item.domain.value, label: item.domainLabel.value})
                propsMap[item.prop.value].ranges.push({id: item.range.value, label: item.rangeLabel.value})

            })

            var jstreeData = []
            for (var key in propsMap) {
                var item = propsMap[key]
var propId= item.id + "_" + common.getRandomHexaId(3);
                jstreeData.push({
                    id:propId,
                    text: item.label,
                    parent: node.data.id,
                    data: item
                })

                common.jstree.addNodesToJstree(jstreeTargetDiv, node.data.id, jstreeData)

           jstreeData = []
                item.domains.forEach(function (item) {
                    jstreeData.push({
                        id: item.id + "_" + common.getRandomHexaId(3),
                        text: item.label,
                        parent: propId,
                        data: item
                    })
                })

                item.ranges.forEach(function (item) {
                    jstreeData.push({
                        id: item.id + "_" + common.getRandomHexaId(3),
                        text: item.label,
                        parent: propId,
                        data: item
                    })
                })

                common.jstree.addNodesToJstree(jstreeTargetDiv, propId, jstreeData)
            }*/

        })




        }


        self.showNodeProperties = function (node) {
            $("#KGquery_dataPropertyFilterDialog").dialog({
                autoOpen: false,
                height: 300,
                width: 300,
                modal: false,
            })

            if (!node)
                node = Lineage_classes.currentGraphNode
            self.currentNode = node
            var data = []
            async.series([


                function (callbackSeries) {
                    Sparql_OWL.getObjectProperties(Lineage_common.currentSource, [node.id], null, function (err, result) {
                        if (err)
                            return MainController.UI.message(err)

                        data = result
                        callbackSeries()
                    })
                },

                function (callbackSeries) {
                    Sparql_OWL.getObjectRestrictions(Lineage_common.currentSource, [node.id], null, function (err, result) {
                        if (err)
                            return MainController.UI.message(err)
                        data = result
                        callbackSeries()
                    })
                },
                //matching object label to filter Quantum item mapping source label
                function (callbackSeries) {
                    if (Config.sources[MainController.currentSource].KGqueryController != "remoteSQL")
                        return callbackSeries()
                    var sourceObjs = [];

                    self.getMatchingLabels([node], "QUANTUM", function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        result.forEach(function (itemRemote) {
                            node.existsInRemoteSource = itemRemote.targetId;
                        })
                        callbackSeries()
                    })
                },

                //matching properties labels to filter Quantum items mapping source labels
                function (callbackSeries) {
                    if (Config.sources[MainController.currentSource].KGqueryController != "remoteSQL")
                        return callbackSeries()
                    var sourceObjs = [];
                    data.forEach(function (item) {
                        if (item.propLabel) {
                            sourceObjs.push({id: item.prop.value, label: item.propLabel.value})
                        }

                    })
                    self.getMatchingLabels(sourceObjs, "QUANTUM", function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        result.forEach(function (itemRemote) {
                            data.forEach(function (item) {
                                if (itemRemote.sourceId == item.prop.value) {
                                    item.existsInRemoteSource = itemRemote.targetId
                                }
                            })
                        })
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
                            node.properties[item.prop.value] = {id: item.prop.value, label: propLabel, range: range, existsInRemoteSource: item.existsInRemoteSource}
                        }
                        var existsInRemoteSourceClass = ""
                        if (item.existsInRemoteSource)
                            existsInRemoteSourceClass = " KGquery_existsInRemoteSource"
                        if (existingItems.indexOf(id) < 0) {
                            existingItems.push(id)
                            html += "<div class='KGquery_propertyDiv " + existsInRemoteSourceClass + " ' onclick='KGquery.actions.addPropertiesToTree($(this))' id='" + encodeURIComponent(id) + "'>" + propLabel + "</div>"
                        }

                    })
                    html += "</div>"
                    $("#KGquery_propertiesDiv").html(html);
                    $("#Lineage_Tabs").tabs("option", "active", 3);
                    callbackSeries()
                    /*   var point={x:300,y:600}
                       MainController.UI.showPopup(point, "graphPopupDiv")*/

                }


            ], function (err) {
            })
        }


        self.getJstreeConceptsContextMenu = function () {
            var items = {}
            /*   if(!KGquery.currentTreeNode)
                   return items;*/

            items.addQueryFilter = {
                label: "Add Query Filter...",
                action: function (e) {// pb avec source
                    KGquery.query.addQueryFilterShowDialog()
                }
            }
            items.removeQueryFilter = {
                label: "Remove Query Filter",
                action: function (e) {// pb avec source
                    KGquery.query.removeQueryFilter()
                }
            }
            items.setOptional = {
                label: "Optional",
                action: function (e) {// pb avec source
                    KGquery.query.setOptional()
                }
            }


            return items;


        }
        self.selectTreeNodeFn = function (xx, obj) {
            self.currentTreeNode = obj.node;
        };
        self.actions = {
            selectAllProps: function () {
                self.actions.addPropertiesToTree("KGquery_propertyDiv", true)
            },
            expandObjectProperties: function () {

                self.showProperties(KGquery.currentProperty.id, KGquery.currentProperty.text)
            },
            showDataProperties: function () {
                var schema = Config.sources[MainController.currentSource].schema;
                Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema, KGquery.currentProperty.id, function (err, result) {
                    OwlSchema.setLabelsFromQueryResult(result)
                    var html = "<B>" + KGquery.currentProperty.label + "</B>" +
                        "<div style='display:flex;flex-direction:column'>"
                    var existingItems = []
                    result.forEach(function (item) {


                        var range = null;

                        if (item.range) {
                            range = item.range
                        } else
                            return;
                        var id = KGquery.currentProperty.id + "|" + item.property.value;
                        if (!KGquery.currentProperty.dataProperties[id]) {
                            KGquery.currentProperty.dataProperties[id] = range
                        }

                        if (existingItems.indexOf(id) < 0) {
                            existingItems.push(id)
                            html += "<div class='KGquery_propertyDiv' onclick='KGquery.graphActions.addPropertiesToTree($(this))' id='" + id + "'>" + Sparql_common.getLabelFromId(item.property.value) + "</div>"
                        }

                    })
                    html += "</div>"
                    $("#KGquery_propertiesDiv").html(html);
                    /*   var point={x:300,y:600}
                       MainController.UI.showPopup(point, "graphPopupDiv")*/

                })

            },
            expandSubclasses: function () {
                Config.sources[MainController.currentSource].controller.getNodeChildren(MainController.currentSource, null, KGquery.currentProperty.id, 1, {}, function (err, children) {
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
                                color: KGquery.currentProperty.color
                            })
                            var edgeId = KGquery.currentProperty.id + "_" + item.child1.value
                            visjsData.edges.push({
                                id: edgeId,
                                from: KGquery.currentProperty.id,
                                to: item.child1.value,

                            })

                        }

                    })
                    visjsGraph.data.nodes.update(visjsData.nodes);
                    visjsGraph.data.edges.update(visjsData.edges);

                })
            },
            resetFilters: function () {
                $("#KGquery_queryTreeDiv").html("")
                self.queryClassPath = {};
            },
            addPropertiesToTree: function (div, all) {
                var props = [];
                if (all) {
                    $(".KGquery_existsInRemoteSource").each(function (item) {
                        var str = decodeURIComponent($(this).attr("id"));
                        var array = str.split("|")
                        props.push(self.currentNode.properties[array[1]]);
                    })
                } else {
                    var str = decodeURIComponent($(div).attr("id"));
                    var array = str.split("|")
                    props.push(self.currentNode.properties[array[1]]);
                }


                var isNewTree = $("#KGquery_queryTreeDiv").is(':empty');
                var existingNodes = []
                if (!isNewTree)
                    existingNodes = common.jstree.getjsTreeNodes("KGquery_queryTreeDiv", true)
                var jstreeData = [];

                if (existingNodes.indexOf(KGquery.currentNode.id) < 0) {
                    jstreeData.push({
                        id: KGquery.currentNode.id,
                        text: KGquery.currentNode.label,
                        parent: '#',
                        data: {
                            type: "Class",
                            id: KGquery.currentNode.id,
                            label: KGquery.currentNode.text || KGquery.currentNode.label,


                        }
                    })
                    if (!isNewTree) {

                        common.jstree.addNodesToJstree("KGquery_queryTreeDiv", "#", jstreeData)
                        jstreeData = []
                    }


                }
                props.forEach(function (prop) {
                    if (existingNodes.indexOf(prop.id) < 0) {

                        jstreeData.push({
                            id: prop.id,
                            text: prop.label,
                            parent: KGquery.currentNode.id,
                            data: {
                                label: prop.label,
                                propId: prop.id,
                                type: "DataProperty",
                                parent: KGquery.currentNode.id,
                                range: KGquery.currentNode.properties[prop.id].range,
                                existsInRemoteSource: prop.existsInRemoteSource
                            }
                        })
                    }
                })
                if (isNewTree) {
                    var jsTreeOptions = {};
                    jsTreeOptions.contextMenu = KGquery.getJstreeConceptsContextMenu()
                    jsTreeOptions.selectTreeNodeFn = KGquery.selectTreeNodeFn;
                    //  jsTreeOptions.onCheckNodeFn = KGquery.checkTreeNodeFn;
                    //  jsTreeOptions.withCheckboxes=true

                    common.jstree.loadJsTree("KGquery_queryTreeDiv", jstreeData, jsTreeOptions)
                } else {
                    common.jstree.addNodesToJstree("KGquery_queryTreeDiv", KGquery.currentNode.id, jstreeData)
                }
            }
            ,
            resetFilters: function () {
                $("#KGquery_queryTreeDiv").html("")
            }
            ,

            showNodeInfo: function () {

                SourceBrowser.showNodeInfos(MainController.currentSource, KGquery.currentProperty.id, "mainDialogDiv")
            }


        }
        self.getMatchingLabels = function (sourceData, targetSource, callback) {

            var labels = []
            var labelsMap = {}
            sourceData.forEach(function (item) {
                if (item.id && item.label)
                    labels.push(item.label)
                labelsMap[item.label.toLowerCase()] = item.id

            })

            if (labels.length == 0)
                return callback(null, [])
            var whereStr = " ?targetId rdfs:label  ?sourceLabel. "

            whereStr += Sparql_common.setFilter("source", null, labels, {exactMatch: true})
            var selectStr = "?targetId  ?sourceLabel "
            var fromStr = ""

            var graphUri = Config.sources[targetSource].graphUri
            fromStr = Sparql_common.getFromStr(targetSource);

            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                "Select " + selectStr + " " + fromStr + " where {" + whereStr;

            query += "} limit " + Config.queryLimit
            //  return;
            var url = Config.sources[Lineage_common.currentSource].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, {source: Lineage_common.currentSource}, function (err, result) {
                if (err)
                    callback(err)
                if (result.length >= Config.queryLimit)
                    MainController.UI.message("result too long >" + self.queryLimit + " lines ")

                var targetObjs = [];
                result.results.bindings.forEach(function (item) {
                    var sourceId = labelsMap[item.sourceLabel.value.toLowerCase()]
                    targetObjs.push({sourceId: sourceId, targetId: item.targetId.value, sourceLabel: item.sourceLabel.value})
                })

                callback(null, targetObjs)


            })
        },

            self.query = {

                addQueryFilterShowDialog: function () {
                    var node = $("#KGquery_queryTreeDiv").jstree(true).get_selected(true)[0]
                    var range = node.data.range

                    var operators = []
                    $("#KGquery_dataPropertyFilterDialog").dialog("open");
                    if (range == "?") {
                        operators = ["contains", "=", ">", "<", ">=", "<=", "#", "beginsWith", "endsWith"]
                    } else if (range.indexOf("XMLSchema#string") > -1 || range.value.indexOf("Literal") > -1) {
                        operators = ["=", "#", "contains", "beginsWith", "endsWith"]
                    } else if (range.indexOf("XMLSchema#decimal") > -1 || range.value.indexOf("XMLSchema#integer") > -1) {
                        operators = ["=", "#", ">", "<", ">=", "<="]
                    } else {
                        alert("else ?  " + range)
                    }

                    common.fillSelectOptions("KGquery_dataPropertyFilterDialog_operator", operators, true)


                },

                validateFilterDialog: function () {
                    var operator = $("#KGquery_dataPropertyFilterDialog_operator").val()
                    var value = $("#KGquery_dataPropertyFilterDialog_value").val()
                    $("#KGquery_dataPropertyFilterDialog").dialog("close");

                    var node = $("#KGquery_queryTreeDiv").jstree(true).get_selected(true)[0]
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

                    common.jstree.addNodesToJstree("KGquery_queryTreeDiv", node.id, jstreeData)


                },
                cancelFilterDialog: function () {
                    $("#KGquery_dataPropertyFilterDialog").dialog("close");
                },
                removeQueryFilter: function () {
                    var nodeId = $("#KGquery_queryTreeDiv").jstree(true).get_selected()[0]
                    $("#KGquery_queryTreeDiv").jstree(true).delete_node(nodeId)
                },
                setOptional: function () {
                    // var node = $("#KGquery_queryTreeDiv").jstree(true).get_selected(true)[0];
                    var node = self.currentTreeNode
                    $('#KGquery_queryTreeDiv').jstree('rename_node', node, node.text + " (OPTIONAL)")
                    node.data.optional = true
                    //  node.text=node.text+"optional"

                },
                executeQuery: function () {
                    var KGqueryController = Config.sources[MainController.currentSource].KGqueryController
                    if (KGqueryController == "remoteSQL")
                        self.query.executeRemoteSqlQuery()
                    if (KGqueryController == "RDF")
                        self.query.executeOntologyIndividualsQuery()
                },

                executeOntologyIndividualsQuery: function () {

                    var nodes = common.jstree.getjsTreeNodes("KGquery_queryTreeDiv")
                    var nodesMap = {}
                    nodes.forEach(function (item) {
                        nodesMap[item.id] = item;
                    })


                    var classNodeIds = common.jstree.getjsTreeNodeObj("KGquery_queryTreeDiv", "#").children;

                    var filters = [];
                    var selectFields = []
                    var previousClassId = null;
                    var previousClassLabel = null;
                    var selectStr = " * "
                    var showIds = $('KGquery_queryShowItemsIdsCBX').prop("checked")
                    var query = "";
                    if (!showIds)
                        selectStr = " ";
                    classNodeIds.forEach(function (classNodeId, index) {
                        // Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema,classNodeId ,function(err,result){


                        var propertyNodes = []
                        var propertyNodes = []
                        var classNode = common.jstree.getjsTreeNodeObj("KGquery_queryTreeDiv", [classNodeId])

                        if (index > 0) {// join classes

                            var previousClasses = Object.keys(self.queryClassPath);
                            var classes = OwlSchema.currentSourceSchema.classes
                            var done = false
                            for (var aClass in classes) {
                                if (!done) {
                                    var properties = classes[aClass].objectProperties
                                    for (var propertyId in properties) {
                                        var property = properties[propertyId]
                                        var p = previousClasses.indexOf(property.range)
                                        if (p > -1) {
                                            var previousClassLabel = self.queryClassPath[previousClasses[p]].label

                                            if (property.domain == classNodeId) {
                                                query += "?" + classNode.text + " <" + propertyId + "> ?" + previousClassLabel + " . "
                                                done = true;
                                            }
                                            if (property.range == classNodeId && previousClasses.indexOf(property.domain)) {
                                                query += "?" + previousClassLabel + " <" + propertyId + "> ?" + classNode.text + " . "
                                                done = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }


                        self.queryClassPath[classNodeId] = {id: classNodeId, label: classNode.text}


                        query += "?" + classNode.text + " rdf:type <" + classNode.id + "> . "
                        classNode.children.forEach(function (propertyNodeId) {
                            var propertyNode = common.jstree.getjsTreeNodeObj("KGquery_queryTreeDiv", [propertyNodeId])
                            if (propertyNode.data.optional) {
                                query += "OPTIONAL {"
                                propertyNode.text = propertyNode.text.replace(" (OPTIONAL)", "")
                            }
                            if (!showIds)
                                selectStr += " ?" + propertyNode.text;

                            query += "?" + classNode.text + " <" + propertyNode.data.propId + "> ?" + propertyNode.text + " . "
                            propertyNode.children.forEach(function (filterNodeId) {
                                var filterNode = common.jstree.getjsTreeNodeObj("KGquery_queryTreeDiv", [filterNodeId])
                                var operator = filterNode.data.operator;
                                var value = filterNode.data.value;
                                var range = propertyNode.data.range.value
                                if (range.indexOf("string") > -1) {
                                    if (operator == "contains")
                                        query += "FILTER (REGEX(?" + propertyNode.text + ",'" + value + "','i')) "
                                    else if (operator == "beginsWith")
                                        query += "FILTER (REGEX(?" + propertyNode.text + ",'^" + value + "','i')) "

                                    else if (operator == "beginsWith")
                                        query += "FILTER (REGEX(?" + propertyNode.text + ",'" + value + "$','i')) "
                                    else
                                        query += "FILTER (?" + propertyNode.text + operator + "'" + value + "'" + ")"

                                } else if (value.indexOf("http") > 0) {

                                } else {
                                    query += "FILTER (?" + propertyNode.text + operator + value + ")"
                                }


                            })

                            if (propertyNode.data.optional) {
                                query += "} "
                            }


                        })
                    })
                    var fromStr = "FROM <http://sws.ifi.uio.no/vocab/npd-v2/> FROM <http://sws.ifi.uio.no/data/npd-v2/> "
                    var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                        "Select " + selectStr + " " + fromStr + " where {" + query;

                    query += "} limit " + self.queryLimit
                    //  return;
                    var url = Config.sources[MainController.currentSource].sparql_server.url + "?format=json&query=";
                    Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, {}, function (err, result) {
                        if (err)
                            return MainController.UI.message(err)
                        if (result.length >= self.queryLimit)
                            return MainController.UI.message("result too long >" + self.queryLimit + " lines ")

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
                        self.query.showQueryResultInDataTable(result)
                    })


                },

                executeRemoteSqlQuery: function () {
                    var remoteObjs = [];
                    var isNewTree = $("#KGquery_queryTreeDiv").is(':empty');
                    if (isNewTree) {//query only class (not properties)
                    } else {
                        var nodes = common.jstree.getjsTreeNodes("KGquery_queryTreeDiv")
                        var nodesMap = {}
                        nodes.forEach(function (item) {
                            nodesMap[item.id] = item;
                        })


                        var classNodeIds = $('#KGquery_queryTreeDiv').jstree(true).get_node("#").children;


                        var filters = [];
                        var selectFields = []
                        var previousClassId = null;
                        var previousClassLabel = null;
                        var selectStr = " * "
                        var showIds = $('KGquery_queryShowItemsIdsCBX').prop("checked")
                        var query = "";
                        if (!showIds)
                            selectStr = " ";

                        formatVariableName = function (str) {
                            return str.replace(/ /g, "_")
                        }


                        classNodeIds.forEach(function (classNodeId, index) {

                            var props = common.jstree.getjsTreeNodes("KGquery_queryTreeDiv", false, [classNodeId])


                            var labels = []
                            var sourceObjs = []

                            props.forEach(function (prop) {
                                if (prop.data.existsInRemoteSource) {
                                    remoteObjs.push({id: prop.data.existsInRemoteSource, filter: []})


                                    var propChildrenIds = $("#KGquery_queryTreeDiv").jstree(true).get_node("prop.id").children
                                    propChildrenIds.forEach(function (filterId) {
                                        var filter = $("#KGquery_queryTreeDiv").jstree(true).get_node(filterId)
                                        var value = filter.data.value;
                                        var operator = filter.data.operator;
                                        value = common.convertNumStringToNumber(value)
                                        remoteObjs.push({id: prop.data.existsInRemoteSource, filter: [{operator: operator, value: value}]})
                                    })
                                }

                            })

                        })
                    }


                    self.query.queryRemoteAssetSource(remoteObjs, function (err, result) {
                        if (err)
                            return MainController.UI.message(err)


                    })


                },


                queryRemoteAssetSource: function (quantumObjs, callback) {
                    var payload = {}
                    payload.KGquery = true;
                    payload.asset = $("#KGquery_assetObjectSelect").val();
                    if (self.currentNode.existsInRemoteSource)
                        quantumObjs.push({id: self.currentNode.existsInRemoteSource})
                    payload.quantumObjs = JSON.stringify(quantumObjs, null, 2);


                    $.ajax({
                        type: "POST",
                        url: Config.serverUrl,
                        data: payload,
                        data: "json",
                        /* beforeSend: function(request) {
                             request.setRequestHeader('Age', '10000');
                         },*/

                        success: function (data, textStatus, jqXHR) {


                            $('#mainDialogDiv').dialog("open")

                            var dataSet = [];
                            var cols = [];
                            var colNames = [];

                            if (data.length == 0)
                                return alert("no remote data found")

                            for (var key in data[0]) {

                                cols.push(({title: key}))
                                colNames.push(key)
                            }


                            data.forEach(function (item, index) {
                                var line = []

                                colNames.forEach(function (col, index) {
                                    line.push(item[col] || "")
                                })
                                dataSet.push(line)

                            })

                            self.query.showQueryResultInDataTable(dataSet, cols)
                        }
                        , error: function (err) {

                            MainController.UI.message(err.responseText);
                        }
                    })
                }

                ,


                showQueryResultInDataTable: function (dataSet, cols) {


                    //  $("#KGquery_tabs").tabs("option", "active", 1);
                    $('#mainDialogDiv').dialog("open")

                    $('#mainDialogDiv').html("<table id='dataTableDiv'></table>");
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
