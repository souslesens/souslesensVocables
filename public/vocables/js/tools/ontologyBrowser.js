var OntologyBrowser = (function () {
    var self = {}

    self.schemasConfig
    self.currentSourceUri
    self.nodeProperties;
    self.currentFilters = {}
    self.currentSelectedProps = {}
    self.classColors = {}
    self.currentJstreeNode;
    self.queryClassPath = {};
    self.queryLimit = 500;

    var dataTypes = {
        "http://www.w3.org/2001/XMLSchema#decimal": "number",
        "http://www.w3.org/2001/XMLSchema#string": "string",
        "http://www.w3.org/2001/XMLSchema#dateTime": "date"
    }
    var operators = {
        number: ["=", ">", "<", "!=", ">=", "<="],
        date: ["=", ">", "<", "!=", ">=", "<="],
        string: ["=", "!=", "startWith", "contains"]
    }

    function getLabelFromId(id) {

        if (OwlSchema.currentSourceSchema.labelsMap[id])
            return OwlSchema.currentSourceSchema.labelsMap[id];

        var p = id.lastIndexOf("#")
        if (p > -1)
            return id.substring(p + 1)
        else {
            var p = id.lastIndexOf("/")
            return id.substring(p + 1)
        }


    }

    self.onLoaded = function () {
        // $("#graphDiv").load("snippets/ontologyBrowser.html")
    }

    self.onSourceSelect = function (sourceLabel) {
    }

    /********************************************************************************************************************************/

    self.init = function (callback) {
        $("#graphDiv").load("snippets/ontologyBrowser.html")
        setTimeout(function () {
            var rightPanelDiv = 300
            var w = $("#graphDiv").width()
            var h = $(window).height();

            $("#OntologyBrowser_graphDiv").height(h - 100)
            $("#OntologyBrowser_selectionDiv").height(h - 100)
            $("#OntologyBrowser_graphDiv").width(w - rightPanelDiv)
            $("#OntologyBrowser_selectionDiv").width(rightPanelDiv);
            $("#OntologyBrowser_tabs_result").width(w);
            $("#OntologyBrowser_tabs_result").height(h - 100);

            $("#OntologyBrowser_dataPropertyFilterDialog").dialog({
                autoOpen: false,
                height: 300,
                width: 300,
                modal: false,
            })

            if (callback)
                callback()
        }, 500)
    }
    self.getJstreeConceptsContextMenu = function () {
        var items = {}
        /*   if(!OntologyBrowser.currentTreeNode)
               return items;*/

        items.addQueryFilter = {
            label: "Add Query Filter...",
            action: function (e) {// pb avec source
                OntologyBrowser.query.addQueryFilterShowDialog()
            }
        }
        items.removeQueryFilter = {
            label: "Remove Query Filter",
            action: function (e) {// pb avec source
                OntologyBrowser.query.removeQueryFilter()
            }
        }
        items.setOptional = {
            label: "Optional",
            action: function (e) {// pb avec source
                OntologyBrowser.query.setOptional()
            }
        }


        return items;


    }
    self.selectTreeNodeFn = function (xx, obj) {
        self.currentTreeNode = obj.node;
    }
    self.checkTreeNodeFn = function (item, xx) {
        var range = OntologyBrowser.currentJstreeNode.dataProperties[item]


    }


    self.showProperties = function (classId, classLabel, callback) {


        function execute(classId) {
            var properties = {}
            async.series([

                function (callbackSeries) {
                    OwlSchema.initSourceSchema(MainController.currentSource, function (err, result) {
                        OwlSchema.currentSourceSchema.labelsMap[classId] = classLabel;
                        callbackSeries(err)
                    })
                },
                function (callbackSeries) {
                    OwlSchema.getClassDescription(MainController.currentSource, classId, function (err, description) {
                        if (err)
                            return callbackSeries(err);
                        for (var key in description.objectProperties) {
                            properties[key] = description.objectProperties[key];
                        }
                        callbackSeries()
                    })
                }
                ,
                function (callbackSeries) {// use anonymNodes properties
                    return callbackSeries()
                    var schema = Config.sources[MainController.currentSource].schema;
                    Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema, classId, function (err, result) {
                        result.forEach(function (item) {
                            if (!item.range)
                                return;
                            if (!properties[item.property.value])
                                properties[item.property.value] = {id: item.property.value, label: item.property.value}
                            properties[item.property.value].range = item.range.value

                        })
                        return callbackSeries();

                    })

                },

                function (callbackSeries) {// draw graph new or update


                    var visjsData = {nodes: [], edges: []}
                    var existingVisjsIds = {}
                    if (!newGraph) {
                        existingVisjsIds = visjsGraph.getExistingIdsMap()
                    }

                    if (!existingVisjsIds[classId]) {
                        existingVisjsIds[classId] = 1
                        visjsData.nodes.push({
                            id: ThesaurusBrowser.currentTreeNode.data.id,
                            label: getLabelFromId(classId),
                            shape: "box"

                        })
                    }
                    for (var key in properties) {
                        var property = properties[key]
                        if (property.domain && !existingVisjsIds[property.domain]) {
                            existingVisjsIds[property.domain] = 1
                            if (!self.classColors[property.domain])
                                self.classColors[property.domain] = common.palette[Object.keys(self.classColors).length]
                            visjsData.nodes.push({
                                id: property.domain,
                                label: getLabelFromId(property.domain),
                                shape: "box",
                                color: self.classColors[property.domain],
                                data: {}
                            })
                            var edgeId = classId + "_" + property.domain
                            visjsData.edges.push({
                                id: edgeId,
                                from: classId,
                                to: property.domain,
                                label: getLabelFromId(key),
                                data: {propertyId: key}


                            })
                        }
                        if (property.range && !existingVisjsIds[property.range]) {

                            existingVisjsIds[property.range] = 1
                            if (!self.classColors[property.range])
                                self.classColors[property.range] = common.palette[Object.keys(self.classColors).length]
                            visjsData.nodes.push({
                                id: property.range,
                                label: getLabelFromId(property.range),
                                shape: "box",
                                color: self.classColors[property.range],
                                data: {}
                            })
                            var edgeId = classId + "_" + property.range
                            visjsData.edges.push({
                                id: edgeId,
                                from: classId,
                                to: property.range,
                                label: getLabelFromId(key),
                                data: {propertyId: key}


                            })
                        }


                    }
                    if (newGraph) {
                        self.setGraphPopupMenus()
                        visjsGraph.draw("OntologyBrowser_graphDiv", visjsData, {onclickFn: OntologyBrowser.onNodeClick})
                    } else {
                        visjsGraph.data.nodes.update(visjsData.nodes);
                        visjsGraph.data.edges.update(visjsData.edges);
                    }
                    callbackSeries();
                }

            ], function (err) {

                if (callback)
                    callback(err)
                if (err)
                    return MainController.UI.message(err);

            })

        }

        var newGraph = true;

        if (!classId) {
            self.queryClassPath = {};
            classId = ThesaurusBrowser.currentTreeNode.data.id
            classLabel = ThesaurusBrowser.currentTreeNode.data.label
            self.init(function () {
                execute(classId, classLabel)
            })
        } else {
            newGraph = false;
            execute(classId)
        }


    }


    self.setGraphPopupMenus = function (node) {
        if(!node)
            return;
        if(!node.from) {
            var html = "    <span class=\"popupMenuItem\" onclick=\"OntologyBrowser.graphActions.expandObjectProperties();\"> Object properties</span>\n" +
                "    <span class=\"popupMenuItem\" onclick=\"OntologyBrowser.graphActions.showDataTypeProperties();\"> Data properties</span>\n" +
                "    <span  class=\"popupMenuItem\"onclick=\"OntologyBrowser.graphActions.expandSubclasses();\">Subclasses</span>"
        }
        html += "    <span  class=\"popupMenuItem\"onclick=\"OntologyBrowser.graphActions.showNodeInfo();\">showNodeInfo</span>"
        $("#graphPopupDiv").html(html);

    }

    self.onNodeClick = function (node, point, event) {
        if (!node)
            return;
        if(node.from){//edge
            self.setGraphPopupMenus(node)
            self.currentJstreeNode = node;
            MainController.UI.showPopup(point, "graphPopupDiv")
        }
        OwlSchema.getClassDescription(MainController.currentSource, node.id, function (err, result) {
            if (err) {
                self.currentJstreeNode = null;
                return MainController.UI.message(err)
            }
            self.currentJstreeNode = node;
            if (true ||  event.ctrlKey) {
                self.setGraphPopupMenus(node)
                MainController.UI.showPopup(point, "graphPopupDiv")
            } else {


            }
            self.currentJstreeNode.dataProperties = {}
            self.graphActions.showDataTypeProperties()

        })
    }


    self.graphActions = {
        expandObjectProperties: function () {

            self.showProperties(OntologyBrowser.currentJstreeNode.id, OntologyBrowser.currentJstreeNode.text)
        },
        showDataTypeProperties: function () {
            var schema = Config.sources[MainController.currentSource].schema;
            Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema, OntologyBrowser.currentJstreeNode.id, function (err, result) {
                var html = "<B>" + OntologyBrowser.currentJstreeNode.text + "</B>" +
                    "<div style='display:flex;flex-direction:column'>"
                var existingItems = []
                result.forEach(function (item) {


                    var range = null;

                    if (item.rangeDataType) {
                        range = item.rangeDataType
                    } else if (item.rangeRestriction) {
                        range = item.rangeRestriction
                    }
                    if (!range)
                        return;
                    var id = OntologyBrowser.currentJstreeNode.id + "|" + item.property.value;
                    if (!OntologyBrowser.currentJstreeNode.dataProperties[id]) {
                        OntologyBrowser.currentJstreeNode.dataProperties[id] = range
                    }

                    if (existingItems.indexOf(id) < 0) {
                        existingItems.push(id)
                        html += "<div class='OntologyBrowser_propertyDiv' onclick='OntologyBrowser.graphActions.addPropertyToTree($(this))' id='" + id + "'>" + getLabelFromId(item.property.value) + "</div>"
                    }

                })
                html += "</div>"
                $("#OntologyBrowser_propertiesDiv").html(html);
                /*   var point={x:300,y:600}
                   MainController.UI.showPopup(point, "graphPopupDiv")*/

            })

        },
        expandSubclasses: function () {
            Config.sources[MainController.currentSource].controller.getNodeChildren(MainController.currentSource, null, OntologyBrowser.currentJstreeNode.id, 1, {}, function (err, children) {
                if (err)
                    return MainController.UI.message(err);
                var existingVisjsIds = visjsGraph.getExistingIdsMap()
                var visjsData = {nodes: [], edges: []}
                children.forEach(function (item) {
                    if (!existingVisjsIds[item.child1.value]) {
                        existingVisjsIds[item.child1.value] = 1

                        visjsData.nodes.push({
                            id: item.child1.value,
                            label: getLabelFromId(item.child1.value),
                            shape: "dot",
                            color: OntologyBrowser.currentJstreeNode.color
                        })
                        var edgeId = OntologyBrowser.currentJstreeNode.id + "_" + item.child1.value
                        visjsData.edges.push({
                            id: edgeId,
                            from: OntologyBrowser.currentJstreeNode.id,
                            to: item.child1.value,

                        })

                    }

                })
                visjsGraph.data.nodes.update(visjsData.nodes);
                visjsGraph.data.edges.update(visjsData.edges);

            })
        },

        addPropertyToTree: function (div) {
            var id = $(div).attr("id");
            var isNewTree = $("#OntologyBrowser_queryTreeDiv").is(':empty');
            var existingNodes = []
            if (!isNewTree)
                existingNodes = common.getjsTreeNodes("OntologyBrowser_queryTreeDiv", true)
            var jstreeData = [];

            if (existingNodes.indexOf(OntologyBrowser.currentJstreeNode.id) < 0) {
                jstreeData.push({
                    id: OntologyBrowser.currentJstreeNode.id,
                    text: getLabelFromId(OntologyBrowser.currentJstreeNode.id),
                    parent: '#',
                    data: {
                        type: "Class",
                        id: OntologyBrowser.currentJstreeNode.id,
                    }
                })
                if (!isNewTree) {

                    common.addNodesToJstree("OntologyBrowser_queryTreeDiv", "#", jstreeData)
                    jstreeData = []
                }


            }
            if (existingNodes.indexOf(id) < 0) {
                var propId = id.split("|")[1]
                jstreeData.push({
                    id: id,
                    text: getLabelFromId(propId),
                    parent: OntologyBrowser.currentJstreeNode.id,
                    data: {

                        propId: propId,
                        type: "DataTypeProperty",
                        parent: OntologyBrowser.currentJstreeNode.id,
                        range: OntologyBrowser.currentJstreeNode.dataProperties[id]
                    }
                })

                if (isNewTree) {
                    var jsTreeOptions = {};
                    jsTreeOptions.contextMenu = OntologyBrowser.getJstreeConceptsContextMenu()
                    jsTreeOptions.selectNodeFn = OntologyBrowser.selectTreeNodeFn;
                    //  jsTreeOptions.onCheckNodeFn = OntologyBrowser.checkTreeNodeFn;
                    //  jsTreeOptions.withCheckboxes=true

                    common.loadJsTree("OntologyBrowser_queryTreeDiv", jstreeData, jsTreeOptions)
                } else {
                    common.addNodesToJstree("OntologyBrowser_queryTreeDiv", OntologyBrowser.currentJstreeNode.id, jstreeData)
                }

            }

        },
        resetFilters: function () {
            $("#OntologyBrowser_queryTreeDiv").html("")
        },

        showNodeInfo: function(){

            MainController.UI.showNodeInfos(MainController.currentSource, OntologyBrowser.currentJstreeNode.id, "mainDialogDiv")
        }


    }

    self.query = {

        addQueryFilterShowDialog: function () {
            var node = $("#OntologyBrowser_queryTreeDiv").jstree(true).get_selected(true)[0]
            var range = node.data.range

            var operators = []
            $("#OntologyBrowser_dataPropertyFilterDialog").dialog("open");


            if (range.value.indexOf("XMLSchema#string") > -1 || range.value.indexOf("Literal") > -1) {
                operators = ["=", "#", "contains", "beginsWith", "endsWith"]
            } else if (range.value.indexOf("XMLSchema#decimal") > -1 || range.value.indexOf("XMLSchema#integer") > -1) {
                operators = ["=", "#", ">", "<", ">=", "<="]
            } else {
                alert("else ?  " + range.value)
            }

            common.fillSelectOptions("OntologyBrowser_dataPropertyFilterDialog_operator", operators, true)


        },

        validateFilterDialog: function () {
            var operator = $("#OntologyBrowser_dataPropertyFilterDialog_operator").val()
            var value = $("#OntologyBrowser_dataPropertyFilterDialog_value").val()
            $("#OntologyBrowser_dataPropertyFilterDialog").dialog("close");

            var node = $("#OntologyBrowser_queryTreeDiv").jstree(true).get_selected(true)[0]
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

            common.addNodesToJstree("OntologyBrowser_queryTreeDiv", node.id, jstreeData)


        },
        cancelFilterDialog: function () {
            $("#OntologyBrowser_dataPropertyFilterDialog").dialog("close");
        },
        removeQueryFilter: function () {
            var nodeId = $("#OntologyBrowser_queryTreeDiv").jstree(true).get_selected()[0]
            $("#OntologyBrowser_queryTreeDiv").jstree(true).delete_node(nodeId)
        },
        setOptional: function () {
            // var node = $("#OntologyBrowser_queryTreeDiv").jstree(true).get_selected(true)[0];
            var node = self.currentTreeNode
            $('#OntologyBrowser_queryTreeDiv').jstree('rename_node', node, node.text + " (OPTIONAL)")
            node.data.optional = true
            //  node.text=node.text+"optional"

        },

        executeQuery: function () {
            var nodes = common.getjsTreeNodes("OntologyBrowser_queryTreeDiv")
            var nodesMap = {}
            nodes.forEach(function (item) {
                nodesMap[item.id] = item;
            })


            var classNodeIds = common.getjsTreeNodeObj("OntologyBrowser_queryTreeDiv", "#").children;

            var filters = [];
            var selectFields = []
            var previousClassId = null;
            var previousClassLabel = null;
            var selectStr = " * "
            var showIds = $('OntologyBrowser_queryShowItemsIdsCBX').prop("checked")
            var query = "";
            if (!showIds)
                selectStr = " ";
            classNodeIds.forEach(function (classNodeId, index) {
                // Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema,classNodeId ,function(err,result){


                var propertyNodes = []
                var propertyNodes = []
                var classNode = common.getjsTreeNodeObj("OntologyBrowser_queryTreeDiv", [classNodeId])

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
                    var propertyNode = common.getjsTreeNodeObj("OntologyBrowser_queryTreeDiv", [propertyNodeId])
                    if (propertyNode.data.optional) {
                        query += "OPTIONAL {"
                        propertyNode.text = propertyNode.text.replace(" (OPTIONAL)", "")
                    }
                    if (!showIds)
                        selectStr += " ?" + propertyNode.text;

                    query += "?" + classNode.text + " <" + propertyNode.data.propId + "> ?" + propertyNode.text + " . "
                    propertyNode.children.forEach(function (filterNodeId) {
                        var filterNode = common.getjsTreeNodeObj("OntologyBrowser_queryTreeDiv", [filterNodeId])
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
                self.query.showQueryResultInDataTable(result)
            })


        }
        , showQueryResultInDataTable: function (result) {

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
            $("#OntologyBrowser_tabs").tabs("option", "active", 1);

            $('#OntologyBrowser_tabs_result').html("<table id='dataTableDiv'></table>");
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


})
()
