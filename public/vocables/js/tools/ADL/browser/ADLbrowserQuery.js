var ADLbrowserQuery = (function () {

        var self = {}
        self.classes = {}
        self.existingNodesIds = {}
        self.model = null
        self.queryMode = "count";
        self.queryFilterNodes = []
        self.onSelectADLtreeNode = function (event, obj) {

            if (obj.node.id == "..")
                return self.loadAdl()

            //  return self.loadAdl(obj.node)


            self.currentNode = obj.node;
            ADLbrowser.currentNode = obj.node;
            ADLbrowser.queryMode = "graph"
            self.queryMode = "count"
            self.showQueryParamsDialog({x: w - 100, y: h / 3},)
            //   $("#ADLbrowser_adlJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("ADLbrowser_adlJstreeDiv")

        }


        self.hideQueryParamsDialog = function () {
            $("#ADLbrowserQueryParamsDialog").css("display", "none")
        }

        self.showQueryParamsDialog = function (position) {

            self.currentQueryDialogField = self.currentNode.data.id
            self.showNodeProperties(self.currentNode);
            $("#ADLbrowserQueryParams_typeSelect").css("display", "none")


            //   $("#ADLbrowserQueryParamsDialog").css("left", position.x - 200)
            $("#ADLbrowserQueryParamsDialog").css("left", position.x + 200)
            $("#ADLbrowserQueryParamsDialog").css("top", position.y)
            $("#ADLbrowserQueryParamsDialog").css("display", "block")
            setTimeout(function () {
                $("#ADLbrowserQueryParams_operator").val("=")
                $("#ADLbrowserQueryParams_value").val("")
                $("#ADLbrowserQueryParams_valuesSelect").val("")
                common.fillSelectOptions("ADLbrowserQueryParams_valuesSelect", [""])


            }, 500)

        }

        self.showNodeProperties = function (node) {
            var properties = []
            for (var predicate in self.classes[node.data.id]) {
                var label = predicate;
                if (self.model[predicate])
                    label = self.model[predicate].label
                properties.push({
                    propertyLabel: label,
                    property: predicate
                })


            }

            var withBlankOption = false;
            if (properties.length > 1)
                withBlankOption = true;
            $("#ADLbrowserQueryParams_type").html(node.data.label)
            common.fillSelectOptions("ADLbrowserQueryParams_property", properties, withBlankOption, "propertyLabel", "property", "http://www.w3.org/2000/01/rdf-schema#label")

        }
        self.listQueryParamsDialogFieldValues = function () {
            var field = self.currentNode.data.id;
            var property = $("#ADLbrowserQueryParams_property").val();
            var value = $("#ADLbrowserQueryParams_value").val()


            var filter = "";
            if (value != "")
                filter = "FILTER (regex(?obj, \"^" + value + "\", \"i\") || regex(?objLabelLabel, \"^" + value + "\", \"i\") )"


            var filterGraphStr = ""
            /*   if( ADLbrowser.currentGraphNodeSelection)
                   filterGraphStr = Sparql_common.setFilter("sub",ADLbrowser.currentGraphNodeSelection.id)*/

            if (!property || property == "")
                return alert("select a property")
            var fromStr = Sparql_common.getFromStr(ADLbrowser.currentSource)
            var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
                "Select  distinct ?obj ?objLabel " + fromStr + " where {" +
                " ?sub <" + property + "> ?obj . ?sub rdf:type <" + field + ">. optional {?obj rdfs:label ?objLabel}" +
                filter + filterGraphStr +
                "} order by ?objLabel  ?obj limit " + Config.ADL.queryLimit
            var url = Config.sources[ADLbrowser.currentSource].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, {source: ADLbrowser.currentSource}, function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                if (result.results.bindings.length > Config.ADL.queryLimit)
                    return alert("Too many values found : > " + result.results.bindings.length)
                var data = []
                result.results.bindings.forEach(function (item) {
                    var label
                    if (!item.objLabel)
                        label = item.obj.value
                    else
                        label = item.objLabel.value
                    data.push({id: item.obj.value, label: label})
                })
                common.fillSelectOptions("ADLbrowserQueryParams_valuesSelect", data, true, "label", "id",)
            })

        }
            ,
            self.updateAdlTree = function (node) {
                ADLbrowser.jstree.load.loadAdl(node)
            },

            self.onSelectDialogField = function (type) {
                self.currentQueryDialogField = type
                self.query.showNodeProperties({data: {type: type, id: type, label: self.OneModelDictionary[type]}})
            }

        self.onQueryParamsDialogValidate = function (logicalMode) {

            var property = $("#ADLbrowserQueryParams_property").val()
            var operator = $("#ADLbrowserQueryParams_operator").val()
            var value = $("#ADLbrowserQueryParams_value").val()
            var field = self.currentQueryDialogField
            $("#ADLbrowserQueryParamsDialog").css("display", "none")
            var filterStr = "";
            var numberOperators = ("<", ">", "<=", ">=")

            var varName = "?" + Sparql_common.formatStringForTriple(self.model[field].label, true)
            var varNameX = varName + "_X"
            var typeVarName = varName;
            /*   if (logicalMode == "union")//self.queryTypesArray.length == 0)
                   typeVarName = "?sub"
               else
                   typeVarName = "?obj"*/


            if (property && property != "") {
                if (value && value != "") {
                    if (operator == "contains")
                        filterStr = varName + " <" + property + "> " + varNameX + ". filter ( regex(" + varNameX + ",'" + value + "','i')) "
                    else if (operator == "not contains")
                        filterStr = varName + " <" + property + "> " + varNameX + ". filter regex(" + varNameX + ", '^((?!" + value + ").)*$','i') "
                    else if ($("#ADLbrowserQueryParams_valuesSelect").val() != "") {
                        if (value.indexOf("http") > -1)
                            filterStr = varName + " <" + property + "> " + varNameX + ". filter (" + varNameX + " =<" + value + ">) "
                        else
                            filterStr = varName + " <" + property + "> " + varNameX + ". filter (" + varNameX + " " + operator + "'" + value + "') "
                    } else if (numberOperators.indexOf(operator) > -1)
                        filterStr = varName + " <" + property + "> " + varNameX + ". filter ( xsd:float(" + varNameX + ")" + operator + value + ") "

                    else
                        filterStr = varName + " <" + property + "> " + varNameX + ". filter (" + varNameX + " " + operator + value + ") "
                } else {

                    filterStr = "";//typeVarName + " <" + property + "> "+varName+". "
                }


            }
            var filterLabel
            if (filterStr == "")
                filterLabel = "all"
            else
                filterLabel = self.model[property].label + " " + operator + " " + value


            if (self.queryMode == "count") {
                var options = {
                    filter: filterStr,
                    filterLabel: filterLabel,
                    logicalMode: logicalMode,
                    varName: varName,
                    count: 1
                }
                self.executeQuery(self.currentNode, options, function (err, queryResult) {
                    if (err)
                        return alert(err)
                    ADLbrowserGraph.addCountNodesToGraph(self.currentNode, queryResult, options, function (err, nodeData) {
                        $("#waitImg").css("display", "none");
                        if (err)
                            return MainController.UI.message(err)
                        var filterId = nodeData.id;
                        var html = "<div class='ADLbrowser_filterDiv' id='" + filterId + "'>" +
                            "<button title='list content' onclick='ADLbrowserQuery.graphActions.listFilter(\"" + filterId + "\")'>L</button>&nbsp;" +
                            "<button title='graph nodes' onclick='ADLbrowserQuery.graphActions.graphFilter(\"" + filterId + "\")'>G</button>&nbsp;" +
                            "<button title='remove filter' onclick='ADLbrowserQuery.graphActions.removeFilter(\"" + filterId + "\")'>X</button>&nbsp;" +
                            "<span style='font-weight:bold;color:" + nodeData.color + "'>" + varName + "  " + filterLabel + " : " + nodeData.count
                        "</div>"

                        $("#ADLbrowser_filterDiv").prepend(html)


                    })
                })
            }
            if (self.queryMode == "graph") {
                ADLbrowser.query.addNodeToQueryTree(self.currentNode)
                var options = {filter: filterStr, logicalMode: logicalMode}
                ADLbrowserGraph.drawGraph(self.currentNode, options, function (err, result) {
                    $("#waitImg").css("display", "none");
                    if (err)
                        return MainController.UI.message(err)
                    if (result == 0)
                        return alert("no data found")
                    self.updateAdlTree(self.currentNode)
                })
            }
            if (true || self.queryMode == "query") {
                ADLbrowser.query.addFilterToQueryTree({label: filterLabel, content: filterStr}, function (err, result) {
                    $("#waitImg").css("display", "none");
                    if (err || result == 0)
                        return;
                    ADLbrowser.updateAdlTree(self.currentNode)
                })
            }


        }


        self.onQueryParamsDialogCancel = function () {

            $("#ADLbrowserQueryParamsDialog").css("display", "none")


        }


        self.addNodeToQueryTree = function (node, prop) {


            self.query.getAdlModel(node.data.type || node.data.id, null, "subject", function (err, result) {
                var isNewTree = $("#ADLbrowser_queryTreeDiv").is(':empty');
                var existingNodes = []
                if (!isNewTree)
                    existingNodes = common.jstree.getjsTreeNodes("ADLbrowser_queryTreeDiv", true)
                var jstreeData = [];
                var typeId = "type" + common.getRandomHexaId(5)
                if (existingNodes.indexOf(node.data.id) < 0) {
                    jstreeData.push({
                        id: typeId,
                        text: Sparql_common.getLabelFromId(node.data.label),
                        parent: '#',
                        data: {
                            type: "type",
                            id: node.data.id,
                            label: node.data.label,
                            role: node.data.role,
                            sourceType: node.data.sourceType


                        }
                    })
                    if (!isNewTree) {
                        var options = {}

                        common.jstree.addNodesToJstree("ADLbrowser_queryTreeDiv", "#", jstreeData)
                        jstreeData = []
                    }
                    setTimeout(function () {
                        $("#ADLbrowser_queryTreeDiv").jstree(true).select_node(node.data.id)
                    }, 200)

                }

                if (err) {
                    return callback(err)
                }
                result.forEach(function (item) {
                    if (existingNodes.indexOf(item.prop.id) < 0) {

                        jstreeData.push({
                            id: "prop" + common.getRandomHexaId(5),
                            text: item.propLabel.value,
                            parent: typeId,
                            data: {
                                label: item.propLabel.value,
                                id: item.prop.value,
                                type: "property",
                                parent: node.data.id,
                                range: node.data.subType,
                                role: node.data.role,
                                sourceType: node.data.sourceType

                            }
                        })
                    }
                })

                if (isNewTree) {
                    var options = {

                        selectTreeNodeFn: self.jstree.events.onSelectNodeQuery,
                        contextMenu: self.jstree.getJstreeQueryContextMenu("ADLbrowser_queryTreeDiv")

                        ,
                        openAll: true,
                        withCheckboxes: true,

                    }
                    common.jstree.loadJsTree("ADLbrowser_queryTreeDiv", jstreeData, options)
                } else {
                    common.jstree.addNodesToJstree("ADLbrowser_queryTreeDiv", node.data.id, jstreeData)
                }

            })


        }


        self.getQueryFilter = function (filterId) {
            var obj = null
            self.queryFilterNodes.forEach(function (filterData, index) {
                if (filterData.id == filterId)
                    obj = filterData
            })
            return obj;
        }

        self.graphActions = {

            listFilter: function (id) {
                var filterData = self.getQueryFilter(id)
                var options = {
                    filter: filterData.data,
                    filterLabel: filterData.filterLabel,
                    logicalMode: "union",
                    varName: filterData.varName,

                }
                var node = {data: {id: id}}
                self.executeQuery(self.currentNode, options, function (err, queryResult) {
                    var jstreeData = []
                    var keyName=filterData.varName.substring(1)
                    queryResult.data.forEach(function (item) {
                        jstreeData.push(
                            {
                                id: item[keyName].value,
                                text: item[keyName+"Label"].value,
                                parent: "#",
                                data: self.currentNode.data
                            })

                    })
                    jstreeData.sort(function(a,b){
                        if(a.text>b.text)
                            return 1;
                        if(a.text<b.text)
                            return -1;
                        return 0;
                    })


                    common.jstree.loadJsTree("ADLbrowser_adlJstreeDiv", jstreeData, {})

                })
            },

            graphFilter: function (id) {


            }

            ,

            removeFilter: function (id) {
                self.queryFilterNodes.forEach(function (filterData, index) {
                    if (filterData.id == id) {
                        self.queryFilterNodes.splice(index, 1);
                        $("#" + id).remove()
                        return visjsGraph.data.nodes.remove(id)
                    }

                })

            }
            ,

            resetAllFilters: function () {
                self.queryFilterNodes.forEach(function (filterData, index) {
                    self.graphActions.removeFilter(filterData.id)

                })

            }
            ,


            clickGraph: function (obj, point) {
                MainController.UI.hidePopup("graphPopupDiv")
                if (!obj)
                    return ADLbrowserQuery.hideQueryParamsDialog(point);
                if (obj.from)
                    self.currentEdge = obj
                else {
                    self.currentNode = obj
                    if (obj.data.type == "count") {

                        self.graphActions.showGraphPopupMenu(self.currentNode, point)

                    } else //class
                    {

                        ADLbrowserQuery.showQueryParamsDialog(point)
                    }
                }
            }
            ,
            showGraphPopupMenu: function (node, point, e) {

                var top = $("#graphDiv").position().top
                point.y += top
                var html = "";
                if (node.from) {//edge

                } else {

                    html = "    <span class=\"popupMenuItem\" onclick=\"ADLbrowserQuery.graphActions.listCountItems();\"> list items</span>" +
                        //   "<span class=\"popupMenuItem\" onclick=\"ADLbrowserQuery.graphActions.addToGraph();\"> Add to graph</span>" +
                        // "<span class=\"popupMenuItem\" onclick=\"ADLbrowserQuery.graphActions.setAsFilter();\"> Set as filter</span>"+
                        "<span class=\"popupMenuItem\" onclick=\"ADLbrowserQuery.graphActions.executeQuery();\"> Execute  Query</span>"
                }
                $("#graphPopupDiv").html(html);
                MainController.UI.showPopup(point, "graphPopupDiv")
            }
            ,

            listCountItems: function () {

                var query = ""
                var source = ADLbrowser.currentSource
                var fromStr = Sparql_common.getFromStr(source)
                query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
                    "select distinct ?sub ?subLabel  " +
                    fromStr +
                    "WHERE {"

                var where = self.currentNode.data.queryWhere
                query += where + " } order by ?subLabel limit 10000"

                var url = Config.sources[source].sparql_server.url + "?format=json&query=";
                MainController.UI.message("searching...")
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
                    // $("#waitImg").css("display", "none");
                    if (err) {
                        return MainController.UI.message(err)
                    }
                    var data = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["sub"])
                    var jstreeData = []
                    result.results.bindings.forEach(function (item) {
                        jstreeData.push(
                            {
                                id: item.sub.value,
                                text: item.subLabel.value,
                                parent: "#",
                                data: self.currentNode.data
                            })

                    })


                    common.jstree.loadJsTree("ADLbrowser_adlJstreeDiv", jstreeData, {})

                })


                MainController.UI.hidePopup("graphPopupDiv")
            }
            ,
            addToGraph: function () {
                MainController.UI.hidePopup("graphPopupDiv")

            }
            ,


            setAsFilter: function () {
                self.queryFilterNodes.splice(0, 0, ADLbrowserQuery.currentNode);
                visjsGraph.data.nodes.update({
                    id: ADLbrowserQuery.currentNode.id,
                    shape: "star",
                    color: {border: "#de1e5e"}
                })

                MainController.UI.hidePopup("graphPopupDiv")

            }
            ,


        }

        self.executeQuery = function (node, options, callback) {
            var queryFilterNodes = ADLbrowserQuery.queryFilterNodes;
            var filterStr = "";
            if (options.filter)
                filterStr = options.filter
            if (!filterStr)
                filterStr = "";
            var source = ADLbrowser.currentSource

            var where = ""
            var varName = options.varName;
            //    filterStr = filterStr.replace(/\?x/g, varName + "_x")

            where += varName + "    rdf:type " + varName + "Type. optional {" + varName + " rdfs:label " + varName + "Label} "
            where += "filter(   " + varName + "Type =<" + node.data.id + "> )"
            where += filterStr


            var previousVarName = varName


            // join classes (anonym predicate
            queryFilterNodes.forEach(function (filterNodeData, index) {
                if (!filterNodeData)
                    return
                var varName2 = filterNodeData.varName;
                if (previousVarName == varName2)
                    return
                where += previousVarName + " ?prop_" + index + " " + varName2 + ". "
                previousVarName = varName2
                var filter2 = filterNodeData.filter;
                where += filter2


            })


            var fromStr = Sparql_common.getFromStr(source)
           var  query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> "
            if (options.count)
                query += "select (count(distinct " + varName + ") as ?count) "
            else
                query += "select distinct " + varName + " "+ varName + "Label "

            query += fromStr +
                "WHERE {"

            query += where + " }  limit 20000"


            var url = Config.sources[source].sparql_server.url + "?format=json&query=";
            MainController.UI.message("searching...")
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
                // $("#waitImg").css("display", "none");
                if (err) {
                    return callback(err)
                }
                var data = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["sub", "obj"])
                callback(null, {data: data, filter: filterStr})
            })


        }


        self.loadAdl = function (node) {
            if (!ADLbrowser.currentSource) {
                return alert("select a source")
            }
            var options = {
                onclickFn: ADLbrowserQuery.graphActions.clickGraph,

                layoutHierarchical: {
                    direction: "LR",
                    sortMethod: "hubsize",
                    // levelSeparation: 200,
                },
                edges: {
                    "smooth": {
                        "type": "straightCross",
                        "forceDirection": "none",
                        "roundness": 0.25
                    }
                },
                nodeColor: "#ddd"
            }
            var graphDiv = "graphDiv"
            // var graphDiv = "ADLbrowser_adlJstreeDiv"
            return ADLassetGraph.drawClassesAndPropertiesGraph(ADLbrowser.currentSource, graphDiv, options, function (err, result) {
                self.classes = result.classes
                self.model = result.model

            })


            var jstreeData = []


            async.series([
                    //get adl types Stats
                    function (callbackSeries) {

                        var filterClassesStr = ""
                        if (node)
                            return callbackSeries()

                        self.buildClasses = {}
                        ADLassetGraph.getBuiltMappingsStats(ADLbrowser.currentSource, function (err, result) {
                            if (err)
                                return callbackSeries(err)
                            self.buildClasses = result
                            return callbackSeries();
                        })


                    },
                    //get classes from mappings
                    function (callbackSeries) {
                        if (node)
                            return callbackSeries();
                        ADLassetGraph.drawAssetTablesMappingsGraph(ADLbrowser.currentSource, function (err, result) {
                            self.model = result.model;
                            for (var predicate in result.predicates) {
                                for (var subject in result.predicates[predicate]) {
                                    if (self.buildClasses[subject]) {
                                        if (!self.classes[subject])
                                            self.classes[subject] = {}
                                        if (!self.classes[subject][predicate])
                                            self.classes[subject][predicate] = []
                                        result.predicates[predicate][subject].forEach(function (object) {
                                            if (self.buildClasses[object])
                                                self.classes[subject][predicate].push(object)
                                        })
                                    }
                                }

                            }
                            return callbackSeries();
                        })
                    },
                    function (callbackSeries) {

                        var objectsMap = {}
                        for (var subject in self.classes) {
                            for (var predicate in self.classes[subject]) {

                                self.classes[subject][predicate].forEach(function (object) {
                                    if (!objectsMap[object]) {
                                        objectsMap[object] = {}
                                    }
                                    if (!objectsMap[object][predicate])
                                        objectsMap[object][predicate] = []
                                    if (objectsMap[object][predicate].indexOf(subject) < 0)
                                        objectsMap[object][predicate].push(subject)


                                })

                            }
                        }


                        var newParents = []
                        var topNodeId
                        for (var subject in self.classes) {
                            if (!node || node.data.id == subject) {// at the beginning all nodes and then only node and children
                                var countStr = ""
                                if (!node)
                                    countStr = " (" + self.buildClasses[subject].count + ")"
                                var subjectId = common.getRandomHexaId(4)
                                topNodeId = subjectId
                                var label = self.model[subject].label + countStr;
                                label = "<span style='color:" + self.buildClasses[subject].color + "'>" + label + "</span>"
                                jstreeData.push({
                                    id: subjectId,
                                    text: label,
                                    parent: "#",
                                    data: {
                                        id: subject,
                                        type: "subject",
                                        label: self.model[subject].label,
                                        count: self.buildClasses[subject].count,
                                        role: "sub"

                                    }
                                })

                                if (node) {

                                    var existingChildren = {}
                                    for (var predicate in self.classes[subject]) {
                                        var predicateLabel = predicate;
                                        if (self.model[predicate])
                                            predicateLabel = self.model[predicate].label

                                        self.classes[subject][predicate].forEach(function (object) {


                                            var objectId = common.getRandomHexaId(4);


                                            var label = predicateLabel + " " + self.model[object].label;
                                            if (!existingChildren[label]) {
                                                existingChildren[label] = 1
                                                label = "<span style='color:" + self.buildClasses[object].color + "'>" + label + "</span>"
                                                jstreeData.push({
                                                    id: objectId,
                                                    text: label,
                                                    parent: subjectId,
                                                    data: {
                                                        id: object,
                                                        type: "object",
                                                        label: self.model[object].label,
                                                        count: self.buildClasses[object].count,
                                                        color: self.buildClasses[subject].color,
                                                        property: predicate,
                                                        role: "obj"
                                                    }
                                                })
                                            }


                                        })
                                    }


                                }
                            }
                        }
                        //relations inverses
                        if (node && objectsMap[node.data.id]) {
                            var existingChildren = {}
                            for (var predicate in self.classes[node.data.id]) {
                                var predicateLabel = predicate;
                                if (self.model[predicate])
                                    predicateLabel = self.model[predicate].label
                                if (objectsMap[node.data.id][predicate]) {
                                    objectsMap[node.data.id][predicate].forEach(function (object) {


                                        var objectId = common.getRandomHexaId(4);


                                        var label = "<-" + predicateLabel + " " + self.model[object].label;
                                        if (!existingChildren[label]) {
                                            existingChildren[label] = 1
                                            label = "<span style='color:" + self.buildClasses[object].color + "'>" + label + "</span>"
                                            jstreeData.push({
                                                id: objectId,
                                                text: label,
                                                parent: topNodeId,
                                                data: {
                                                    id: object,
                                                    type: "subject",
                                                    label: self.model[object].label,
                                                    count: self.buildClasses[object].count,
                                                    color: self.buildClasses[subject].color,
                                                    property: predicate,
                                                    role: "sub"
                                                }
                                            })
                                        }


                                    })
                                }
                            }
                        }


                        return callbackSeries();


                    }],
                function (err) {
                    if (err)
                        return alert(err)

                    var backNode = {
                        id: "..",
                        text: "..",
                        parent: "#"
                    }
                    jstreeData.splice(0, 0, backNode)
                    var options = {

                        selectTreeNodeFn: ADLbrowserQuery.onSelectADLtreeNode,
                        openAll: true,
                        doNotAdjustDimensions: true,
                        contextMenu: ADLbrowser.jstree.getJstreeConceptsContextMenu("ADLbrowser_adlJstreeDiv")

                    }
                    //  common.fillSelectOptions("ADLbrowser_searchAllSourcestypeSelect", typesArray, true)
                    common.jstree.loadJsTree("ADLbrowser_adlJstreeDiv", jstreeData, options)
                    $("#ADLbrowser_Tabs").tabs("option", "active", 0);


                })


        }


        return self;
    }
)()