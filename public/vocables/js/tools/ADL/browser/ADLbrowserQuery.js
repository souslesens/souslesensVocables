var ADLbrowserQuery = (function () {

    var self = {}
    self.classes = {}
    self.existingNodesIds = {}
    self.model = null
    self.queryMode="graph"
    self.onSelectADLtreeNode = function (event, obj) {

        if (obj.node.id == "..")
            return self.loadAdl()

        //  return self.loadAdl(obj.node)


        self.currentNode = obj.node;
        ADLbrowser.currentNode = obj.node;
        ADLbrowser.queryMode = "graph"
        self.queryMode = "graph"
        self.showQueryParamsDialog({x: w - 100, y: h / 3},)
        //   $("#ADLbrowser_adlJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("ADLbrowser_adlJstreeDiv")

    }

    self.showQueryParamsDialog = function (position) {

        self.currentQueryDialogField = self.currentNode.data.id
        self.showNodeProperties(self.currentNode);
        $("#ADLbrowserQueryParams_typeSelect").css("display", "none")


     //   $("#ADLbrowserQueryParamsDialog").css("left", position.x - 200)
        $("#ADLbrowserQueryParamsDialog").css("left", position.x+200)
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
        var typeVarName;
        if (logicalMode == "union")//self.queryTypesArray.length == 0)
            typeVarName = "?sub"
        else
            typeVarName = "?obj"

        if (property && property != "") {
            if (value && value != "") {
                if (operator == "contains")
                    filterStr = typeVarName + " <" + property + "> ?x. filter ( regex(?x,'" + value + "','i')) "
                else if (operator == "not contains")
                    filterStr = typeVarName + " <" + property + "> ?x. filter regex(?x, '^((?!" + value + ").)*$','i') "
                else if ($("#ADLbrowserQueryParams_valuesSelect").val() != "") {
                    if (value.indexOf("http") > -1)
                        filterStr = typeVarName + " <" + property + "> ?x. filter (?x =<" + value + ">) "
                    else
                        filterStr = typeVarName + " <" + property + "> ?x. filter (?x " + operator + "'" + value + "') "
                } else if (numberOperators.indexOf(operator) > -1)
                    filterStr = typeVarName + " <" + property + "> ?x. filter ( xsd:float(?x)" + operator + value + ") "

                else
                    filterStr = typeVarName + " <" + property + "> ?x. filter (?x " + operator + value + ") "
            } else {

                filterStr = "";//typeVarName + " <" + property + "> ?x. "
            }


        }
        var filterLabel = property + " " + operator + " " + value


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
self.graphActions={
        clickGraph:function(obj,point){
            if(obj.from)
                self.currentEdge=obj
            else {
                self.currentNode = obj
                ADLbrowserQuery.showQueryParamsDialog(point)
            }
        }




}


    self.loadAdl = function (node) {
        if (!ADLbrowser.currentSource) {
            return alert("select a source")
        }
        var options = {onclickFn:ADLbrowserQuery.graphActions.clickGraph}
        var graphDiv = "graphDiv"
       // var graphDiv = "ADLbrowser_adlJstreeDiv"
        return ADLmappingGraph.graphClassesAndProperties(ADLbrowser.currentSource, graphDiv, options,function(err, result){
            self.classes=result.classes
            self.model=result.model
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
                    ADLassetGraph.drawAsset(ADLbrowser.currentSource, function (err, result) {
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
})()