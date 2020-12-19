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
        var p=id.lastIndexOf("#")
        if(p>-1)
        return id.substring(p + 1)
        else{
            var p=id.lastIndexOf("/")
            return id.substring(p + 1)
        }
    }

    self.onLoaded = function () {
        // $("#graphDiv").load("snippets/ontologyBrowser.html")
    }

    self.onSourceSelect = function (sourceLabel) {
        MainController.currentSource = sourceLabel;
        self.currentSourceUri = Config.sources[sourceLabel].graphUri
        if (Config.sources[sourceLabel].schema) {
            //  if(! self.schemasConfig) {
            $.getJSON("config/schemas.json", function (json) {
                self.schemasConfig = json;
                OwlSchema.currentSourceSchema = self.schemasConfig[Config.sources[sourceLabel].schema]
                ThesaurusBrowser.showThesaurusTopConcepts(sourceLabel, {treeSelectNodeFn: OntologyBrowser.onNodeSelect, contextMenu: {}})
                $("#actionDivContolPanelDiv").html("<input id='GenericTools_searchTermInput'> <button onclick='ThesaurusBrowser.searchTerm()'>Search</button>")
                $("#graphDiv").load("snippets/ontologyBrowser.html")
                setTimeout(function () {
                    $("#OntologyBrowser_tabs").tabs();
                    var rightPanelDiv = 300
                    $("#OntologyBrowser_graphDiv").width(w - rightPanelDiv)
                    $("#OntologyBrowser_selectionDiv").width(rightPanelDiv)
                }, 200)


            })
        } else
            return MainController.UI.message("no Schema for source " + sourceLabel)

    }

    self.onNodeSelect = function (event, obj) {


        Sparql_schema.getObjectDomainProperties(OwlSchema.currentSourceSchema, obj.node.id, function (err, result) {
            var nodeProperties = [];
            result.forEach(function (item) {
                nodeProperties.push({id: item.domain.value, label: common.getItemLabel(item, "domain")})
            })
            Sparql_schema.getObjectRangeProperties(OwlSchema.currentSourceSchema, obj.node.id, function (err, result) {

                result.forEach(function (item) {
                    nodeProperties.push({id: item.range.value, label: common.getItemLabel(item, "range")})
                })


            })
            common.fillSelectOptions("OntologyBrowser_filter_ObjectpropertiesSelect", nodeProperties, true, "label", "id")
            $("#OntologyBrowser_tabs").tabs("option", "active", 0);
            self.showDatatypeProperties(obj.node.id);

        })


    }


    self.showDatatypeProperties = function (classId) {
        self.currentClass = classId;
        Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema, classId, function (err, result) {
            self.nodeProperties = {};
            result.forEach(function (item) {
                var propLabel = common.getItemLabel(item, "property")
                if (self.nodeProperties[propLabel])
                    return;
                var range = "";
                if (item.range)
                    range = item.range.value
                else //?? correct ?????
                    range = "http://www.w3.org/2001/XMLSchema#string"
                self.nodeProperties[propLabel] = {id: item.property.value, label: propLabel, range: range}
            })
            var html = "<table border='1px'><tr><tr><td>property</td><td>all<input type='checkbox' class='OntologyBrowser_propCBX'  value='ALL'> </td></tr>"
            for (var key in self.nodeProperties) {

                html += "<tr><td>" + key + "</td>" +
                    "<td><input type='checkbox' class='OntologyBrowser_propCBX'  value='" + key + "'></td>" +

                    "</tr>"
            }
            html += "</table>"
            $("#OntologyBrowser_PropertiesDiv").html(html);
            $(".OntologyBrowser_propCBX").bind("change", function () {
                var add = $(this).prop("checked")
                OntologyBrowser.onDataPropertySelect($(this).val(), add)

            })
            common.fillSelectOptions("OntologyBrowser_filter_DataPropertiesSelect", self.nodeProperties, true, "label", "id")

        })
    }

    self.onDataPropertySelect = function (propLabel, add) {
        if (add) {
            if (propLabel == "ALL") {
                return $(".OntologyBrowser_propCBX").prop("checked", true)
            }


            $("#OntologyBrowser_PropertiesFilterInputDiv").css("display", "block")
            $("#OntologyBrowser_filter_DataPropertiesSelect").val(propLabel)

            var range = self.nodeProperties[propLabel].range

            if (dataTypes[range]) {
                common.fillSelectOptions("OntologyBrowser_filter_operators", operators[dataTypes[range]], false)

            }
            var classLabel = common.getUriLabel(self.currentClass)
            if (!self.currentSelectedProps[classLabel])
                self.currentSelectedProps[classLabel] = {classId: self.currentClass, properties: []};
            if (self.currentSelectedProps[classLabel].properties.indexOf(propLabel) < 0)
                self.currentSelectedProps[classLabel].properties.push(propLabel)


        } else {
            if (propLabel == "ALL") {
                return $(".OntologyBrowser_propCBX").prop("checked", false)
            }
            $("#OntologyBrowser_PropertiesFilterInputDiv").css("display", "none")
            //$("#OntologyBrowser_filter_DataPropertiesSelect").val("")
            var classLabel = common.getUriLabel(self.currentClass)
            var index = self.currentSelectedProps[classLabel].properties.indexOf(propLabel);
            self.currentSelectedProps[classLabel].properties.splice(index, 1)
        }

    }

    self.addFilter = function () {
        var propertyLabel = $("#OntologyBrowser_filter_DataPropertiesSelect").val();
        var operator = $("#OntologyBrowser_filter_operators").val();
        var value = $("#OntologyBrowser_filter_value").val();

        var range = self.nodeProperties[propertyLabel].range
        var propertyId = self.nodeProperties[propertyLabel].id

        var classLabel = common.getUriLabel(self.currentClass)
        if (!self.currentFilters[classLabel])
            self.currentFilters[classLabel] = {classId: self.currentClass, filters: []}
        self.currentFilters[classLabel].filters.push({
            propertyLabel: propertyLabel,
            propertyId: propertyId,
            operator: operator,
            value: value,
            range: range
        })
        var filterId = classLabel + "__" + (self.currentFilters[classLabel].length - 1)

        var html = "<div id='" + filterId + "' class='OntologyBrowser_minorDiv'>" +
            common.getUriLabel(propertyLabel) +
            operator +
            value +
            "<button onclick='OntologyBrowser.removeFilter(\"" + filterId + "\")'>-</button>" +
            "</div>"

        $("#OntologyBrowser_filtersContainerDiv").append(html)

    }

    self.removeFilter = function (filterId) {
        var array = filterId.split("__")
        var classId = array[0]
        var filterIndex = parseInt(array[1])
        self.currentFilters[classId].filters.splice(filterIndex, 1)
        $("#" + filterId).remove()

    }


    self.executeFilterQuery = function () {


        function getPropertyFilter(item, propertyLabel) {
            if (item.operator == "contains")
                return "regex(" + propertyLabel + ",'" + item.value + "','i')"

            var strPredObj = ""
            if (item.range) {
                var type = dataTypes[item.range]
                if (type == "number" || type == "date") {
                    strPredObj = item.operator + "'" + item.value + "^^" + item.range + "'"
                }
                if (type == "string") {
                    var langStr = ""
                    if (item.lang)
                        langStr = "@" + item.lang
                    strPredObj = item.operator + "'" + item.value + "'" + langStr;
                }
                strPredObj = item.operator + item.value;
                return propertyLabel + " " + strPredObj;
            } else
            // if(type=="uri"){
                return propertyLabel + "= <" + item.value + ">"
        }

        var propIndex = 0
        var query = ""
        var queryWhere = "";
        var querySelectProps = "";
        var selectProps = "";


        for (var key in self.currentSelectedProps) {
            var className = key
            var classId = self.currentSelectedProps[key].classId;
            self.currentSelectedProps[key].properties.forEach(function (item) {
                var propId = self.nodeProperties[item].id
                querySelectProps += "OPTIONAL {?" + className + " <" + propId + "> ?" + item + ".} ";
                selectProps += "?" + item + " ";
            })
        }


        for (var key in self.currentFilters) {
            var className = key
            var classId = self.currentFilters[key].classId;


            queryWhere += "?" + className + " rdf:type <" + classId + ">."
            self.currentFilters[key].filters.forEach(function (item) {
                var propertyLabel = "?" + item.propertyLabel + "_F_" + propIndex
                queryWhere += "?" + className + " <" + item.propertyId + "> " + propertyLabel + "." +
                    " FILTER (" + getPropertyFilter(item, propertyLabel) + ")"
                propIndex += 1


            })
        }
        var fromStr = ""
        var graphUri = Config.sources[MainController.currentSource].graphUri
        if (graphUri && graphUri != "") {
            if (!Array.isArray(graphUri))
                graphUri = [graphUri];
            graphUri.forEach(function (item) {
                fromStr += " FROM <" + item + "> "
            })
        }
        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " +
            "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            " select distinct " + selectProps + " " + fromStr + "   WHERE { " +
            queryWhere + " " + querySelectProps +
            "}limit 1000 "

        var url = Config.sources[MainController.currentSource].sparql_url + "?query=&format=json";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, null, function (err, result) {
            if (err) {
                return err
            }

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
                    dom: 'Bfrtip',
                    buttons: [
                        'copy', 'csv', 'excel', 'pdf', 'print'
                    ]


                })
                    , 500
            })

        })

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


    self.showProperties = function (classId, callback) {


        function execute(classId) {
            var properties = {}
            async.series([

                function (callbackSeries) {
                    OwlSchema.initSourceSchema(MainController.currentSource, function (err, result) {
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
                        existingVisjsIds = self.getExistingVisjsIds()
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
            self.init(function () {
                execute(classId)
            })
        } else {
            newGraph = false;
            execute(classId)
        }


    }


    self.setGraphPopupMenus = function () {
        var html = "    <span class=\"popupMenuItem\" onclick=\"OntologyBrowser.graphActions.expandObjectProperties();\"> Object properties</span>\n" +
            "    <span class=\"popupMenuItem\" onclick=\"OntologyBrowser.graphActions.showDataTypeProperties();\"> Data properties</span>\n" +
            "    <span  class=\"popupMenuItem\"onclick=\"OntologyBrowser.graphActions.expandSubclasses();\">Subclasses</span>"
        $("#graphPopupDiv").html(html);

    }
    self.getExistingVisjsIds = function () {
        var existingVisjsIds = {}
        var oldIds = visjsGraph.data.nodes.getIds()
        oldIds = oldIds.concat(visjsGraph.data.edges.getIds())
        oldIds.forEach(function (id) {
            existingVisjsIds[id] = 1;
        })
        return existingVisjsIds;
    }
    self.onNodeClick = function (node, point, event) {
        if (!node)
            return;
        self.currentJstreeNode = node;
        if (event.ctrlKey) {
            self.setGraphPopupMenus()
            MainController.UI.showPopup(point, "graphPopupDiv")
        } else {


        }
        self.currentJstreeNode.dataProperties = {}
        self.graphActions.showDataTypeProperties()
    }


    self.graphActions = {
        expandObjectProperties: function () {

            self.showProperties(OntologyBrowser.currentJstreeNode.id)
        },
        showDataTypeProperties: function () {
            var schema = Config.sources[MainController.currentSource].schema;
            Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema, OntologyBrowser.currentJstreeNode.id, function (err, result) {
                var html = "<B>" + getLabelFromId(OntologyBrowser.currentJstreeNode.id) + "</B>" +
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
                var existingVisjsIds = self.getExistingVisjsIds()
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
                    text: getLabelFromId(id),
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
            var node=self.currentTreeNode
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
            var selectStr=" * "
            var showIds=$('OntologyBrowser_queryShowItemsIdsCBX').prop("checked")
            var query="";
               if(!showIds)
                   selectStr=" ";
               classNodeIds.forEach(function (classNodeId, index) {
                // Sparql_schema.getClassPropertiesAndRanges(OwlSchema.currentSourceSchema,classNodeId ,function(err,result){



                var propertyNodes = []
                var propertyNodes = []
                var classNode = common.getjsTreeNodeObj("OntologyBrowser_queryTreeDiv", [classNodeId])

                if (index > 0) {// join classes
                    var edges = visjsGraph.data.edges.get();
                    edges.forEach(function (edge) {
                        var done = false;
                        for (var previousClassId in self.queryClassPath) {
                            var p = edge.id.indexOf(classNodeId);
                            var q = edge.id.indexOf(previousClassId)
                            if (!done && p > -1 && q > -1) {
                                done = true
                                var previousClassLabel = self.queryClassPath[previousClassId].label
                                //   if (p < q)
                                query += "?" + previousClassLabel + " <" + edge.data.propertyId + ">|^<" + edge.data.propertyId + "> ?" + classNode.text + " . "
                                /*    else
                                        query += "?" + classNode.text + " <" + edge.data.propertyId + "> ?" + previousClassLabel + " . "*/
                            }
                        }


                    })

                }


                self.queryClassPath[classNodeId] = {id: classNodeId, label: classNode.text}


                query += "?" + classNode.text + " rdf:type <" + classNode.id + "> . "
                classNode.children.forEach(function (propertyNodeId) {
                    var propertyNode = common.getjsTreeNodeObj("OntologyBrowser_queryTreeDiv", [propertyNodeId])
                    if (propertyNode.data.optional) {
                        query += "OPTIONAL {"
                        propertyNode.text = propertyNode.text.replace(" (OPTIONAL)", "")
                    }
                    if(!showIds)
                        selectStr+=" ?" + propertyNode.text ;

                    query += "?" + classNode.text + " <" + propertyNode.data.propId + "> ?" + propertyNode.text + " . "
                    propertyNode.children.forEach(function (filterNodeId) {
                        var filterNode = common.getjsTreeNodeObj("OntologyBrowser_queryTreeDiv", [filterNodeId])
                        var operator = filterNode.data.operator;
                        var value = filterNode.data.value;
                        var range = propertyNode.data.range.value
                        if (range.indexOf("string") > -1) {
                            if (operator == "contains")
                                query += "FILTER (REGEX(?" + propertyNode.text + ",'" + value + "','i')) "
                            if (operator == "beginsWith")
                                query += "FILTER (REGEX(?" + propertyNode.text + ",'^" + value + "','i')) "

                            if (operator == "beginsWith")
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
                "Select "+selectStr +" "+ fromStr + " where {"+query;

            query += "} limit " + self.queryLimit
            //  return;
            var url = Config.sources[MainController.currentSource].sparql_url + "?query=&format=json";
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
