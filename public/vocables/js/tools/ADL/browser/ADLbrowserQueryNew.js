var ADLbrowserQuery = (function () {

        var self = {}
        self.classes = {}
        self.existingNodesIds = {}
        self.model = null
        self.queryMode = "count";
        self.queryFilterNodes = [];
        self.varNamesMap = {}
        var previousVarName = null;
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


            var firstClass = ADLbrowserQuery.queryFilterNodes.length == 0
            self.currentQueryDialogPredicates = []
            if (!firstClass) {
                var predicates = self.getClassesPredicates(self.currentNode.data.id, true)
                var ok = false;
                self.currentQueryDialogPredicates = []

                self.currentMatchingFilterNode = null;
                predicates.forEach(function (item) {
                    item.predicateLabel = self.model[item.predicate].label

                    if (firstClass) {
                        self.currentQueryDialogPredicates.push(item)
                    } else {

                        ADLbrowserQuery.queryFilterNodes.forEach(function (filter, index) {
                            var previousClass = filter.class
                            if (item.object == previousClass) {
                                ok = true
                                self.currentMatchingFilterNode = filter
                                if (item.inverse) item.predicateLabel = "^" + item.predicateLabel
                                self.currentQueryDialogPredicates.push(item)
                            }

                        })
                    }
                })
                if (!ok)
                    return alert("class have to be contiguous in the graph")
            }

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

                var emptyOptions = self.currentQueryDialogPredicates.length > 1
                common.fillSelectOptions("ADLbrowserQueryParams_predicateSelect", self.currentQueryDialogPredicates, null, "predicateLabel", 'predicate')
                if (self.currentNode.data.searchedLabel) {
                    var array = [{label: " rdfs:label", id: "http://www.w3.org/2000/01/rdf-schema#label"}]
                    common.fillSelectOptions("ADLbrowserQueryParams_property", array, false, "label", "id")

                    $("#ADLbrowserQueryParams_value").val(self.currentNode.data.searchedLabel)
                }


            }, 500)

        }


        self.getClassesPredicates = function (classIds, withInverse) {
            var classes = ADLbrowserQuery.classes
            if (!Array.isArray(classIds))
                classIds = [classIds]

            var uniquePredicates = {}
            var retainedPredicates = []
            classIds.forEach(function (classId) {
                var predicates = classes[classId]
                for (var predicate in predicates) {

                    predicates[predicate].forEach(function (object) {
                        if (predicate.indexOf("label") > -1)
                            return;
                        if (predicate.indexOf("type") > -1)
                            return;
                        ;
                        if (!uniquePredicates[predicate + object]) {
                            uniquePredicates[predicate + object] = 1
                            var label = ADLbrowserQuery.model[classId].label + "-" + ADLbrowserQuery.model[predicate].label + "->" + ADLbrowserQuery.model[object].label
                            var id = classId + "|" + predicate + "|" + object
                            retainedPredicates.push({
                                predicate: predicate,
                                inverse: false,
                                subject: classId,
                                object: object,
                                id: id,
                                label: label
                            })
                        }
                    })

                }
                if (true || withInverse) {
                    //inverse
                    for (var subject in classes) {
                        for (var predicate in classes[subject]) {
                            classes[subject][predicate].forEach(function (object) {
                                if (predicate.indexOf("label") > -1)
                                    return;
                                if (predicate.indexOf("type") > -1)
                                    return;
                                if (object == classId) {
                                    if (!uniquePredicates["^" + predicate + object]) {
                                        uniquePredicates["^" + predicate + object] = 1
                                        if (false) {
                                            var label = ADLbrowserQuery.model[subject].label + "-" + ADLbrowserQuery.model[predicate].label + "->" + ADLbrowserQuery.model[classId].label
                                            var id = subject + "|" + predicate + "|" + classId
                                            retainedPredicates.push({
                                                predicate: predicate,
                                                inverse: true,
                                                subject: subject,
                                                object: classId,
                                                id: id,
                                                label: label
                                            })
                                        } else {
                                            var label = ADLbrowserQuery.model[classId].label + "-" + ADLbrowserQuery.model[predicate].label + "->" + ADLbrowserQuery.model[subject].label
                                            var id = classId + "|" + predicate + "|" + subject
                                            retainedPredicates.push({
                                                predicate: predicate,
                                                inverse: true,
                                                subject: classId,
                                                object: subject,
                                                id: id,
                                                label: label
                                            })
                                        }
                                    }
                                }
                            })
                        }
                    }
                }
            })
            return retainedPredicates;

        }

        self.onQueryParamsListClick = function () {
            var listValue = $("#ADLbrowserQueryParams_valuesSelect").val()
            if (listValue == "") {
                ADLbrowserQuery.listQueryParamsDialogFieldValues();
                return $('#ADLbrowserQueryParams_operator').val('=')
            }
        }
        self.onQueryParamsListChange = function () {
            var value = $("#ADLbrowserQueryParams_valuesSelect").val()
            $("#ADLbrowserQueryParams_value").val(value)
            self.onQueryParamsDialogValidate("union")
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

        self.onOperatorSelect = function (operator) {

        }


        self.onQueryParamsDialogValidate = function (logicalMode) {

            var predicate = $("#ADLbrowserQueryParams_predicateSelect").val();
            if (predicate == "" && self.queryFilterNodes.length > 0)
                return alert("select a predicate")

            var predicateIndex = $("#ADLbrowserQueryParams_predicateSelect")[0].selectedIndex;
            var property = $("#ADLbrowserQueryParams_property").val()
            var operator = $("#ADLbrowserQueryParams_operator").val()
            var value = $("#ADLbrowserQueryParams_value").val()
            var field = self.currentQueryDialogField
            $("#ADLbrowserQueryParamsDialog").css("display", "none")
            var dialogFilterStr = "";
            var numberOperators = ("<", ">", "<=", ">=")

            var varName = "?" + Sparql_common.formatStringForTriple(self.model[field].label, true) + "_" + self.queryFilterNodes.length
            if (!self.varNamesMap[varName]) {
                var color = self.model[field].color
                self.varNamesMap[varName] = {id: field, predicates: self.classes[field], color: color}
            }
            var varNameX = varName + "_X"
            var typeVarName = varName;
            /*   if (logicalMode == "union")//self.queryTypesArray.length == 0)
                   typeVarName = "?sub"
               else
                   typeVarName = "?obj"*/


            if (property && property != "") {
                if (value && value != "") {
                    if (operator == "contains")
                        dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter ( regex(" + varNameX + ",'" + value + "','i')) "
                    else if (operator == "not contains")
                        dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter regex(" + varNameX + ", '^((?!" + value + ").)*$','i') "
                    else if ($("#ADLbrowserQueryParams_valuesSelect").val() != "") {
                        if (value.indexOf("http") > -1)
                            dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter (" + varNameX + " =<" + value + ">) "
                        else
                            dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter (" + varNameX + " " + operator + "'" + value + "') "
                    } else if (numberOperators.indexOf(operator) > -1) {
                        if (!common.isNumber(value) && operator == "=")
                            dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter (" + varNameX + " " + operator + "'" + value + "') "
                        else
                            dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter ( xsd:float(" + varNameX + ")" + operator + value + ") "
                    } else
                        dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter (" + varNameX + " " + operator + value + ") "
                } else {

                    dialogFilterStr = "";//typeVarName + " <" + property + "> "+varName+". "
                }


            }
            var filterLabel
            if (dialogFilterStr == "")
                filterLabel = "all"
            else
                filterLabel = self.model[property].label + " " + operator + " " + value

            dialogFilterStr += varName + "    rdf:type " + varName + "Type."
            dialogFilterStr += "filter(   " + varName + "Type =<" + field + "> )"

            if (dialogFilterStr.indexOf("Label") < 0)
                dialogFilterStr += "optional {" + varName + " rdfs:label " + varName + "Label} "


            if (self.queryMode == "count") {
                var options = {
                    filter: dialogFilterStr,
                    filterLabel: filterLabel,
                    logicalMode: logicalMode,
                    varName: varName,
                    count: 1,
                    predicate: self.currentQueryDialogPredicates[predicateIndex]
                }
                self.executeQuery(self.currentNode, options, function (err, queryResult) {
                    if (err)
                        return alert(err)
                    ADLbrowserGraph.addCountNodeToModelGraph(self.currentNode, queryResult, options, function (err, nodeData) {

                        $("#waitImg").css("display", "none");
                        if (err)
                            return MainController.UI.message(err)

                        if (nodeData.count == 0)
                            return

                      //  ADLbrowserQuery.queryFilterNodes.splice(0, 0, nodeData);
                        ADLbrowserQuery.queryFilterNodes.push( nodeData);
                        var filterId = nodeData.id;

                        var html = "<div class='ADLbrowser_filterDiv' id='" + filterId + "'>" +
                            "<input type='checkbox'  checked='checked' class='ADLbrowser_graphFilterCBX'>G&nbsp;" +
                            "<button title='list content' onclick='ADLbrowserQuery.graphActions.listFilter(\"" + filterId + "\")'>L</button>&nbsp;" +
                            "<button title='remove filter' onclick='ADLbrowserQuery.graphActions.removeFilter(\"" + filterId + "\")'>X</button>&nbsp;" +
                            "<span style='font-weight:bold;color:" + nodeData.color + "'>" + varName + "  " + filterLabel + " : " + nodeData.count
                        "</div>"

                        $("#ADLbrowser_filterDiv").prepend(html)


                    })
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


            backToModel: function () {


                if (!self.ALDmodelGraph)
                    return;
                var visjsData = {
                    nodes: self.ALDmodelGraph.nodes,
                    edges: self.ALDmodelGraph.edges,
                }
                var options = {}
                if (self.ALDmodelGraph.params)
                    options = self.ALDmodelGraph.params.options;

                visjsGraph.draw("graphDiv", visjsData, options)
                self.ALDmodelGraph = null;


            },
            listFilter: function (id) {
                var filterData = self.getQueryFilter(id)
                self.currentFilterData = filterData

                var options = {
                    logicalMode: "union",
                    selectVars: [filterData.varName]

                }

                var node = {data: {id: id}}
                self.executeQuery(self.currentNode, options, function (err, queryResult) {
                    var jstreeData = []
                    var keyName = filterData.varName.substring(1)
                    queryResult.data.forEach(function (item) {
                        if (item[keyName]) {
                            var label = ""
                            if (item[keyName + "Label"])
                                label = item[keyName + "Label"].value
                            else
                                label = Sparql_common.getLabelFromId(item[keyName].value)
                            jstreeData.push(
                                {
                                    id: item[keyName].value,
                                    text: label,
                                    parent: "#",
                                    data: self.currentNode.data
                                })
                        }

                    })

                    jstreeData.sort(function (a, b) {
                        if (a.text > b.text)
                            return 1;
                        if (a.text < b.text)
                            return -1;
                        return 0;
                    })

                    var options = {
                        withCheckboxes: true,
                    }
                    common.jstree.loadJsTree("ADLbrowser_adlJstreeDiv", jstreeData, options)


                })
            },

            queryFilters: function (output, addToGraph) {

                var selectVars = []
                $(".ADLbrowser_graphFilterCBX").each(function () {

                    if ($(this).prop("checked")) {
                        var filterDiv = $(this).parent()
                        var filterId = filterDiv.attr("id")
                        var filterObj = self.getQueryFilter(filterId)
                        selectVars.push(filterObj.varName)
                    }

                })


                var options = {
                    logicalMode: "union",
                    selectVars: selectVars

                }
                self.executeQuery(null, options, function (err, queryResult) {

                    if (output == "graph") {


                        if (!self.ALDmodelGraph) {//save modelGraph before drawing quryGraph
                            self.ALDmodelGraph = {nodes: [], edges: [], params: {}}
                            self.ALDmodelGraph.nodes = visjsGraph.data.nodes.get()
                            self.ALDmodelGraph.edges = visjsGraph.data.edges.get()
                            self.ALDmodelGraph.params = visjsGraph.currentContext
                        }

                        ADLbrowserGraph.drawGraph("graphDiv", queryResult, {
                            addToGraph: addToGraph,
                            selectVars: selectVars
                        })


                    }
                    if (output == "table") {
                        ADLbrowserDataTable.showQueryResult(queryResult, {selectVars: selectVars})

                    }

                })
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
                ADLbrowserQuery.graphActions.backToModel();
                setTimeout(function () {

                    previousVarName = null;
                    if ($('#ADLbrowser_adlJstreeDiv').jstree)
                        $('#ADLbrowser_adlJstreeDiv').jstree("destroy")

                    while (self.queryFilterNodes.length > 0) {
                        var filterData = self.queryFilterNodes[0]
                        self.graphActions.removeFilter(filterData.id)

                    }
                    visjsGraph.data.nodes.remove(ADLbrowserGraph.zeroCountIds)
                    ADLbrowserGraph.zeroCountIds = []
                }, 500)

            }
            ,
            /*   addIndividualsFilter:function(){
                   var checkedIds=$("#ADLbrowser_adlJstreeDiv").jstree().get_checked();
                   self.individualFilters={varName:self.currentFilterData.varName,ids:checkedIds}


               },*/
            clearIndividualsFilter: function () {
                if ($("#ADLbrowser_adlJstreeDiv").jstree(true))
                    $("#ADLbrowser_adlJstreeDiv").jstree().deselect_all(true)
            },

            clickClassesGraph: function (obj, point) {
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


        }

        self.executeQuery = function (node, options, callback) {
            var queryFilterNodes = ADLbrowserQuery.queryFilterNodes;
            var dialogFilterStr = "";
            var where = ""
            var varName = options.varName;
            var source = ADLbrowser.currentSource
            if (varName) {// add filter to query
                if (options.filter)
                    dialogFilterStr = options.filter
                if (!dialogFilterStr)
                    dialogFilterStr = "";
                where += dialogFilterStr


            }

            var queryFilterNodesMap = {}


            queryFilterNodes.forEach(function (filter) {
                if (filter.predicate)
                    queryFilterNodesMap[filter.predicate.predicate] = filter.predicate
            })


            // join classes (anonym predicate)
            var message = null


            if (true) {
                var predicateStr = "";
                queryFilterNodes.forEach(function (filterNodeData, index) {
                    // add currentFilter to query
                    if (options.predicate && self.currentMatchingFilterNode.varName && filterNodeData.varName == self.currentMatchingFilterNode.varName) {
                        if (index>0) {// when count (predicate comes from dialog
                            predicateStr = " <" + options.predicate.predicate + "> "
                            if (true || options.predicate.inverse)
                                predicateStr += "|^" + predicateStr

                        }
                        where += "" + varName + predicateStr +  self.currentMatchingFilterNode + ". "

                    }


                })
            }
            if (false) {
                var varName2 = varName;
                queryFilterNodes.forEach(function (filterNodeData, index) {
                    if (!filterNodeData)
                        return
                    if (!queryFilterNodesMap[options.predicate])
                        ;

                    var predicates = [];


                    if (index == 0) {
                        if (!varName2) {
                            var filter2 = filterNodeData.filter;
                            where += filter2
                            return;
                        }
                        previousVarName = queryFilterNodes[index].varName
                    } else {
                        previousVarName = queryFilterNodes[index - 1].varName
                        varName2 = queryFilterNodes[index].varName
                    }

                    var subjectOb = self.varNamesMap[previousVarName];
                    var objectId = self.varNamesMap[varName2].id

                    var predicateStr
                    if (index == 0 && options.predicate) {// when count (predicate comes from dialog
                        predicateStr = " <" + options.predicate.predicate + "> "
                        if (true || options.predicate.inverse)
                            predicateStr += "|^" + predicateStr
                    } else {
                        var previouPredicate = queryFilterNodes[index - 1].predicate
                        predicateStr = " <" + previouPredicate.predicate + "> "
                        if (true || !previouPredicate.predicate.inverse)//has to inverse predicate becaus it is in previous nodeData
                            predicateStr += "|^" + predicateStr
                    }


                    where += "" + varName2 + predicateStr + previousVarName + ". "
                    if (!options.count) {
                        where += " OPTIONAL{" + varName2 + " rdfs:label " + varName2 + "Label" + "} "
                        where += " OPTIONAL{" + previousVarName + " rdfs:label " + previousVarName + "Label" + "} "
                        where += " " + previousVarName + " rdf:type " + previousVarName + "Type" + ". "
                        where += " " + varName2 + " rdf:type " + varName2 + "Type" + ". "

                    }
                    var filter2 = filterNodeData.filter;
                    where += filter2


                })
            }

            if (message)
                return callback(message)

            //checked chexkboxes in class individuals
            if ($("#ADLbrowser_adlJstreeDiv").jstree(true)) {
                var checkedIds = $("#ADLbrowser_adlJstreeDiv").jstree().get_checked();
                if (checkedIds && checkedIds.length > 0) {
                    self.individualFilters = {varName: self.currentFilterData.varName, ids: checkedIds}

                    var idsStr = "";
                    self.individualFilters.ids.forEach(function (id, index) {
                        if (index > 0)
                            idsStr += ","
                        idsStr += "<" + id + ">"
                    })
                    where += "filter (" + self.individualFilters.varName + " in (" + idsStr + "))"
                }
            }

            var fromStr = Sparql_common.getFromStr(source)
            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> "
            if (options.count)
                query += "select (count(distinct " + varName + ") as ?count) "
            else if (options.selectVars) {
                var selectVarsStr = ""
                options.selectVars.forEach(function (varName, index) {
                    selectVarsStr += varName + " " + varName + "Label " + varName + "Type "

                })
                query += "select distinct " + selectVarsStr

            } else {
                query += "select distinct " + varName + " " + varName + "Label " + varName + "Type "
            }
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
                /*    result.results.bindings.forEach(function (item) {
                        for (var key in item) {
                            if (key != "count")
                                if (!item[key + "Label"])
                                    item[key + "Label"] = {value: Sparql_common.getLabelFromId(item[key].value)}

                        }
                    })*/
                var data = result.results.bindings;

                callback(null, {data: data, filter: dialogFilterStr})
            })


        }


        self.loadAdl = function (node) {
            if (!ADLbrowser.currentSource) {
                return alert("select a source")
            }
            self.graphActions.resetAllFilters()
            var options = {
                onclickFn: ADLbrowserQuery.graphActions.clickClassesGraph,


                //  nodeColor: "#ddd",
                keepNodePositionOnDrag: true

            }
            var graphDiv = "graphDiv"
            // var graphDiv = "ADLbrowser_adlJstreeDiv"
            return ADLassetGraph.drawClassesAndPropertiesGraph(ADLbrowser.currentSource, graphDiv, options, function (err, result) {
                self.classes = result.classes
                self.model = result.model

            })


        }

        self.searchTerm = function () {
            var term = $("#ADLbrowser_searchTermInput").val();
            if (term == "")
                return;
            if (!ADLbrowser.currentSource)
                return alert("select a source")
            var source = ADLbrowser.currentSource
            var fromStr = Sparql_common.getFromStr(source)
            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> "

            query += "select ?sub ?subLabel ?subType  " + fromStr + " where { ?sub rdfs:label ?subLabel.?sub rdf:type ?subType." +
                " filter (regex(?subLabel,'" + term + "','i'))} limit 1000"


            var url = Config.sources[source].sparql_server.url + "?format=json&query=";
            MainController.UI.message("searching...")
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
                // $("#waitImg").css("display", "none");
                if (err) {
                    return callback(err)
                }


                var types = {}
                result.results.bindings.forEach(function (item) {
                    var type = item.subType.value;
                    var id = item.sub.value;
                    var label = item.subLabel.value

                    if (!types[type])
                        types[type] = [];
                    types[type].push({id: id, label: label})

                })

                var jstreeData = []
                for (var type in types) {
                    jstreeData.push({
                        id: type,
                        text: self.model[type].label,
                        parent: source
                    })
                    types[type].forEach(function (item) {
                        jstreeData.push({
                            id: item.id,
                            text: item.label,
                            parent: type,
                            data: {
                                id: item.id,
                                label: item.label,
                                type: type
                            }
                        })
                    })
                }

                common.jstree.addNodesToJstree("ADLbrowserItemsjsTreeDiv", source, jstreeData)


            })


        }

        self.setFilterFromSearchedTerm = function (node) {

            // transform searched tree node into graph current node as if clicked
            self.currentNode = {
                id: node.data.type,
                label: node.text,
                data: {
                    id: node.data.type,
                    label: node.text,
                    searchedLabel: node.data.label
                }
            }
            return self.showQueryParamsDialog({x: 500, y: 500})

        }


        return self;
    }
)()