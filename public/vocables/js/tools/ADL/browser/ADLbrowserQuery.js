var ADLbrowserQuery = (function () {

    var self = {}

    self.onSelectAdl = function (event, obj) {
        self.currentJstreeNode = obj.node;
        ADLbrowser.currentJstreeNode = obj.node;
        ADLbrowser.queryMode = "graph"
        self.queryMode = "graph"
        self.showQueryParamsDialog({x: w - 100, y: h / 3},)
        //   $("#ADLbrowser_adlJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("ADLbrowser_adlJstreeDiv")

    }

    self.showQueryParamsDialog = function (position) {

        self.currentQueryDialogField = self.currentJstreeNode.data.id
        self.showNodeProperties(self.currentJstreeNode);
        $("#ADLbrowserQueryParams_typeSelect").css("display", "none")


        $("#ADLbrowserQueryParamsDialog").css("left", position.x - 200)
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
        for (var predicate in ADLbrowser.classes[node.data.id]) {
            var label = predicate;
            if (ADLbrowser.model[predicate])
                label = ADLbrowser.model[predicate].label
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
        var field = self.currentJstreeNode.data.id;
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
        var adlNodeObj = $("#ADLbrowser_adlJstreeDiv").jstree(true).get_node()
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

                filterStr = typeVarName + " <" + property + "> ?x. "
            }


        }
        var filterLabel = property + " " + operator + " " + value


        if (self.queryMode == "graph") {
            var options = {filter: filterStr, logicalMode: logicalMode}
            ADLbrowserGraph.drawGraph(self.currentJstreeNode, options, function (err, result) {
                $("#waitImg").css("display", "none");
                if (err)
                    return MainController.UI.message(err)
                if (result == 0)
                    return alert("no data found")
                self.updateAdlTree(self.currentJstreeNode)
            })
        } else if (self.queryMode == "query") {
            self.query.addFilterToQueryTree({label: filterLabel, content: filterStr}, function (err, result) {
                $("#waitImg").css("display", "none");
                if (err || result == 0)
                    return;
                self.updateAdlTree(self.currentJstreeNode)
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


    return self;
})()