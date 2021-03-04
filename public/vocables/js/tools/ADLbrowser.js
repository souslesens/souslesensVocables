var ADLbrowser = (function () {


    var self = {}
    var typeColors = []
    self.aspectsChildrenDepth = 8
    self.OneModelDictionary = {}

    self.defaultNodeSize = 10;
    self.getPropertyColor = function (type, palette) {
        if (!palette)
            palette = "paletteIntense"
        if (!typeColors[type])
            typeColors[type] = common[palette][Object.keys(typeColors).length]
        return typeColors[type];
    }

    self.onLoaded = function () {
        $("#sourceDivControlPanelDiv").html("")
        MainController.UI.message("");


        $("#accordion").accordion("option", {active: 2});
        MainController.UI.openRightPanel()
        $("#rightPanelDiv").load("snippets/ADL/ADLbrowserRightPanel.html");
        $("#actionDivContolPanelDiv").load("snippets/ADL/ADLbrowser.html");
        setTimeout(function () {
            self.jstree.load.loadAdlsList();
            self.jstree.load.loadOneModel();
            //  self.loadAdlJstree()
            self.jstree.load.loadRdl();
            self.initOneModelDictionary()

            SourceBrowser.currentTargetDiv = "ADLbrowserItemsjsTreeDiv"
            $("#GenericTools_searchSchemaType").val("INDIVIDUAL")


        }, 200)
    }

    self.initOneModelDictionary = function () {
        var schema
        async.series([

            function (callbackSeries) {
                OwlSchema.initSourceSchema(Config.ADLBrowser.OneModelSource, function (err, _schema) {
                    schema = _schema
                    if (err)
                        return callbackSeries(err)
                    callbackSeries()
                })
            },
            function (callbackSeries) {

                var ontologyProps = {}
                Sparql_schema.getPropertiesRangeAndDomain(schema, null, null, null, function (err, result) {
                    if (err)
                        callbackSeries(err)
                    result.forEach(function (item) {
                        if (item.propertyLabel)
                            self.OneModelDictionary[item.property.value] = item.propertyLabel.value
                        else
                            self.OneModelDictionary[item.property.value] = item.property.value.substring(item.propertyLabel.value.lastIndexOf("/") + 1)

                        if (item.subProperty) {
                            if (item.subPropertyLabel)
                                self.OneModelDictionary[item.subProperty.value] = item.subPropertyLabel.value
                            else
                                self.OneModelDictionary[item.subProperty.value] = item.property.value.substring(item.subProperty.value.lastIndexOf("/") + 1)
                        }
                    })
                    callbackSeries()
                })

            },
            function (callbackSeries) {
                Sparql_schema.getClasses(schema, null, function (err, result) {
                    result.forEach(function (item) {
                        if (item.classLabel)
                            self.OneModelDictionary[item.class.value] = item.classLabel.value
                        else
                            self.OneModelDictionary[item.class.value] = item.class.value.substring(item.class.value.lastIndexOf("/") + 1)
                    })
                })
                callbackSeries()
            }
        ], function (err) {
            if (err)
                return MainController.UI.message(err);
        })
    }


    self.searchAllSourcesTerm = function () {
        MainController.UI.message("searching...")
        $("#waitImg").css("display", "flex");

        $('#ADLbrowserItemsjsTreeDiv').jstree(true).delete_node($('#ADLbrowserItemsjsTreeDiv').jstree(true).get_node(self.currentSource).children);

        var words = $("#ADLbrowser_searchAllSourcesTermInput").val();
        var exactMatch = $("#ADLbrowser_allExactMatchSearchCBX").prop("checked")
        var type = $("#ADLbrowser_searchAllSourcestypeSelect").val();
        Sparql_INDIVIDUALS.findByWords(self.currentSource, words, {exactMatch: exactMatch, type: type}, function (err, result) {


            if (err)
                return MainController.UI.message(err)

            if (result.length == 0) {
                MainController.UI.message("no  data found")
                return $("#waitImg").css("display", "none");
            }

            MainController.UI.message("displaying nodes...")
            var existingNodes = {}
            var jstreeData = []
            result.forEach(function (item) {
                if (false && !existingNodes[item.type.value]) { // type makes query execution longer
                    existingNodes[item.type.value] = 1;
                    jstreeData.push({
                        id: item.type.value,
                        text: item.type.value,
                        parent: self.currentSource,
                        data: {type: "type"}
                    })

                }
                if (!existingNodes[item.sub.value]) {
                    existingNodes[item.sub.value] = 1;
                    jstreeData.push({
                        id: item.sub.value,
                        text: item.objLabel.value,
                        parent: self.currentSource, // item.type.value, // type makes query execution longer
                        data: {sourceType: "adl", role: "sub|obj", source: self.currentSource, id: item.sub.value, label: item.objLabel.value, source: self.currentSource}
                    })
                }


            })

            common.addNodesToJstree("ADLbrowserItemsjsTreeDiv", self.currentSource, jstreeData)
            MainController.UI.message("")
            $("#waitImg").css("display", "none");

        })
    }


    self.showNodeInfos = function (node) {
        if (!node)
            node = self.currentJstreeNode
        MainController.UI.showNodeInfos(node.data.source, node.data.id, "mainDialogDiv")
    }

    self.getRdlJstreeData = function (parent, parentType, callback) {

        var fromStr = Sparql_common.getFromStr(Config.ADLBrowser.RDLsource)
        var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct * " + fromStr + " WHERE {" +
            "  ?id rdf:type ?type ." +
            "   ?id rdfs:label ?label ." +
            "  ?id rdfs:subClassOf  <" + parent + ">"


        var limit = Config.queryLimit;
        query += " } limit " + limit

        var url = Config.sources[Config.ADLBrowser.RDLsource].sparql_server.url + "?format=json&query=";
        MainController.UI.message("searching...")
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: Config.ADLBrowser.RDLsource}, function (err, result) {
            if (err) {
                return callback(err)
            }

            var jstreeData = []


            result.results.bindings.forEach(function (item) {
                jstreeData.push({
                    id: item.id.value,
                    text: item.label.value,
                    parent: parent,
                    data: {sourceType: "rdl", role: "sub", id: item.id.value, label: item.label.value, source: Config.ADLBrowser.RDLsource, type: parentType}

                })

            })
            MainController.UI.message("")
            return callback(null, jstreeData)

        })
    }


    self.jstree = {
        events: {
            onSelectNodeRdl: function (event, obj) {
                ADLbrowser.currentJstreeNode = obj.node;
                if (obj.node.children.length == 0)
                    ADLbrowser.getRdlJstreeData(obj.node.data.id, obj.node.data.type, function (err, result) {
                        if (err)
                            return MainController.UI.message(err)
                        common.addNodesToJstree("ADLbrowser_rdlJstreeDiv", obj.node.data.id, result)
                    })
                $("#ADLbrowser_rdlJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("ADLbrowser_rdlJstreeDiv")
            },
            onSelectNodeAdlList: function (event, data) {
                $("#ADLbrowserItemsjsTreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("ADLbrowserItemsjsTreeDiv")
                if (data.node.parent != "#") {// after search
                    // self.jstree.load.loadAdl(data.node)
                    self.currentJstreeNode = data.node
                } else {
                    self.currentSource = data.node.id
                    self.jstree.load.loadAdl()
                }

            },
            onSelectNodeOneModel: function (e, obj) {
                ADLbrowser.currentJstreeNode = obj.node;
                $("#ADLbrowser_oneModelJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("ADLbrowser_oneModelJstreeDiv")
            }
            ,
            onSelectNodeAdl: function (e, obj) {
                ADLbrowser.currentJstreeNode = obj.node;
                $("#ADLbrowser_adlJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("ADLbrowser_adlJstreeDiv")
            }

            , onSelectNodeQuery: function (e, obj) {
                ADLbrowser.currentJstreeQueryNode = obj.node;
                $("#ADLbrowser_adlJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeQueryContextMenu()
            }
        },

        load: {
            loadAdlsList: function () {
                var jstreeData = []
                for (var source in Config.sources) {
                    if (Config.sources[source].schemaType == "INDIVIDUAL")
                        jstreeData.push({
                            id: source,
                            text: source,
                            parent: "#"
                        })
                }
                var options = {
                    selectTreeNodeFn: self.jstree.events.onSelectNodeAdlList,
                    contextMenu: self.jstree.getJstreeConceptsContextMenu("ADLbrowserItemsjsTreeDiv")
                }
                common.loadJsTree("ADLbrowserItemsjsTreeDiv", jstreeData, options, function (err, result) {

                })
            }
            ,
            loadOneModel: function () {


                var jstreeData = [{
                    id: "http://standards.iso.org/iso/15926/part14/Location",
                    text: "<span class='aspect_Location'>Location</span>",
                    type: "Location",
                    parent: "#"
                },

                    {
                        id: "http://standards.iso.org/iso/15926/part14/FunctionalObject",
                        text: "<span class='aspect_Function'>Function</span>",
                        type: "Function",
                        parent: "#"
                    },
                    {
                        id: "http://standards.iso.org/iso/15926/part14/Aspect",
                        text: "<span class='aspect_Function'>Aspect</span>",
                        type: "Function",
                        parent: "http://standards.iso.org/iso/15926/part14/FunctionalObject"
                    },
                    {
                        id: "http://standards.iso.org/iso/15926/part14/PhysicalObject",
                        text: "<span class='aspect_Product'>Product</span>",
                        type: "Product",
                        parent: "#"
                    },
                    {
                        id: "http://standards.iso.org/iso/15926/part14/Activity",
                        text: "<span class='aspect_LifeCycle'>LifeCycle</span>",
                        type: "LifeCycle",
                        parent: "#"
                    }]


                async.eachSeries(jstreeData, function (topAspect, callbackEach) {
                    Sparql_generic.getNodeChildren(Config.ADLBrowser.OneModelSource, null, topAspect.id, self.aspectsChildrenDepth, null, function (err, result) {
                        if (err)
                            return callbackEach(err)
                        result.forEach(function (item) {
                            for (var i = 1; i < self.aspectsChildrenDepth; i++) {
                                if (item["child" + i]) {
                                    var parent;
                                    if (item.concept.value.indexOf("008") > -1)
                                        var x = 3
                                    self.OneModelDictionary[item.concept.value] = item.conceptLabel.value
                                    if (true || i == 1)
                                        parent = topAspect.id
                                    else
                                        parent = item["child" + (i - 1)].value


                                    if (item["child" + i] && !item["child" + (i + 1)]) {
                                        self.OneModelDictionary[item["child" + i].value] = item["child" + i + "Label"].value
                                        jstreeData.push({
                                            id: item["child" + i].value,
                                            text: item["child" + i + "Label"].value,
                                            parent: parent,
                                            data: {sourceType: "oneModel", source: Config.ADLBrowser.OneModelSource, id: item["child" + i].value, label: item["child" + i + "Label"].value,}
                                        })

                                    }
                                } else
                                    break;
                            }
                        })

                        callbackEach();
                    })

                }, function (err) {
                    if (err)
                        MainController.UI.message(err)
                    var options = {

                        selectTreeNodeFn: self.jstree.events.onSelectNodeOneModel,
                        contextMenu: self.jstree.getJstreeConceptsContextMenu("ADLbrowser_oneModelJstreeDiv")

                        ,
                        openAll: true,

                    }
                    common.loadJsTree("ADLbrowser_oneModelJstreeDiv", jstreeData, options, function (err, result) {

                    })
                })
            }
            ,
            loadRdl: function (aspectNode) {

                var topObjects = {
                    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-F0000000801": {label: "Functional Objects", type: "http://standards.iso.org/iso/15926/part14/FunctionalObject"},
                    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-P0000001723": {label: "Physical Objects", type: "http://standards.iso.org/iso/15926/part14/PhysicalObject"},
                    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-B0000000000": {label: "Disciplines", type: "http://w3id.org/readi/z018-rdl/Discipline"},
                    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-A0000000000": {label: "Attributes", type: "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute"}

                }
                var topIds = Object.keys(topObjects)
                var jstreeData = []
                async.eachSeries(topIds, function (parentId, callbackEach) {
                    var parentType = Config.ADLBrowser.topRdlObjects[parentId].type
                    self.getRdlJstreeData(parentId, parentType, function (err, result) {
                        if (err)
                            return MainController.UI.message(err)
                        jstreeData.push({
                            id: parentId,
                            text: topObjects[parentId].label,
                            parent: "#",

                            data: {sourceType: "rdl", role: "sub", id: parentId, label: Config.ADLBrowser.topRdlObjects[parentId].label, type: parentType, source: Config.ADLBrowser.RDLsource}
                        })
                        result.forEach(function (item) {
                            jstreeData.push(item)
                        })
                        callbackEach()
                    })


                }, function (err) {

                    var options = {
                        selectTreeNodeFn: self.jstree.events.onSelectNodeRdl,
                        contextMenu: self.jstree.getJstreeConceptsContextMenu("ADLbrowser_rdlJstreeDiv"),

                    }
                    common.loadJsTree("ADLbrowser_rdlJstreeDiv", jstreeData, options)

                })


            }
            ,
            loadAdl: function (node) {
                if (!self.currentSource) {
                    return alert("select a source")
                }

                self.query.getAdlModel("all", null, function (err, result) {

                    var jstreeData = []
                    var existingNodes = {}
                    var typesArray = []

                    result.forEach(function (item) {
                        if (!item.objType)
                            return;
                        if (typesArray.indexOf(item.subType.value) < 0)
                            typesArray.push(item.subType.value)


                        var subId = item.subType.value
                        var propId = item.subType.value + "_" + item.prop.value;
                        var objId = null;
                        if (item.objType)
                            objId = item.subType.value + "_" + item.prop.value + "_" + item.objType.value;


                        if (item.subType) {
                            var label = self.OneModelDictionary[item.subType.value]
                            if (!label)
                                label = item.subType.value
                            var color = self.getPropertyColor(item.subType.value)
                            if (!existingNodes[subId]) {

                                existingNodes[subId] = 1
                                jstreeData.push({
                                    id: subId,
                                    text: "<span style='color:" + color + "'>" + label + "</span>",
                                    parent: "#",
                                    data: {sourceType: "adl", role: "subType", source: self.currentSource, id: item.subType.value, label: label}
                                })
                            }
                        }
                        if (!existingNodes[propId]) {
                            var label = self.OneModelDictionary[propId]
                            if (!label)
                                label = item.prop.value
                            existingNodes[propId] = 1
                            jstreeData.push({
                                id: propId,
                                text: label,
                                parent: subId,
                                data: {sourceType: "adl", role: "pred", source: self.currentSource, id: item.prop.value, label: label}
                            })
                        }
                        if (objId && !existingNodes[objId]) {
                            if (typesArray.indexOf(item.objType.value) < 0)
                                typesArray.push(item.objType.value)

                            existingNodes[objId] = 1
                            var label = self.OneModelDictionary[item.objType.value]
                            if (!label)
                                label = item.objType.value
                            var color = self.getPropertyColor(item.objType.value)
                            jstreeData.push({
                                id: objId,
                                text: "<span style='color:" + color + "'>" + label + "</span>",
                                parent: propId,
                                data: {sourceType: "adl", role: "objType", source: self.currentSource, id: item.objType.value, label: self.OneModelDictionary[item.objType.value]}
                            })
                        }

                    })


                    var options = {

                        selectTreeNodeFn: self.jstree.events.onSelectNodeAdl,
                        openAll: true,
                        contextMenu: self.jstree.getJstreeConceptsContextMenu("ADLbrowser_adlJstreeDiv")

                    }
                    common.fillSelectOptions("ADLbrowser_searchAllSourcestypeSelect", typesArray, true)
                    common.loadJsTree("ADLbrowser_adlJstreeDiv", jstreeData, options)
                    $("#ADLbrowser_Tabs").tabs("option", "active", 0);


                })


            }

        }
        ,
        getJstreeConceptsContextMenu: function (jstreeDivId) {


            // return {}
            var items = {}
            /*  if (!self.currentJstreeNode)
                  return
              var type = self.currentJstreeNode.data.type;*/
            $("#waitImg").css("display", "none");
            MainController.UI.message("")
            if (jstreeDivId && $(jstreeDivId).jstree(true))
                self.currentJstreeNode = $(jstreeDivId).jstree(true).get_selected(true)
            if (true || type == "") {
                /* if (jstreeDivId == "ADLbrowserItemsjsTreeDiv" || jstreeDivId == "ADLbrowser_rdlJstreeDiv" || (visjsGraph.data && visjsGraph.data.nodes)) {
                      items.addAllNodesToGraph = {
                          label: "graph  nodes",
                          action: function (e) {// pb avec source
                              if (!self.currentSource)
                                  return alert("select a source")
                              self.jstree.menuActions.addAllNodesToGraph(self.currentJstreeNode)
                          }
                      }
                  }*/
                items.addFilteredNodesToGraph = {
                    label: "graph filtered nodes",
                    action: function (e, xx) {// pb avec source
                        if (!self.currentSource)
                            return alert("select a source")
                        self.queryMode = "graph"
                        self.query.showQueryParamsDialog(e.position, "graph")


                    }
                }
                items.addFilteredNodesToQuery = {
                    label: "add to query",
                    action: function (e, xx) {// pb avec source
                        if (!self.currentSource)
                            return alert("select a source")
                        self.queryMode = "query"
                        self.query.addNodeToQueryTree(self.currentJstreeNode)
                        ///  self.query.showQueryParamsDialog(e.position, "query")


                    }
                }
                items.nodeInfos = {
                    label: "node infos",
                    action: function (e, xx) {// pb avec source
                        self.showNodeInfos()


                    }
                }

                items.removeNodesFromGraph = {
                    label: "remove nodes from graph",
                    action: function (e) {// pb avec source
                        self.jstree.menuActions.removeNodesFromGraph(self.currentJstreeNode)
                    }
                }
            }
            return items;
        }
        ,
        getJstreeQueryContextMenu: function (jstreeDivId) {


            var items = {}

            $("#waitImg").css("display", "none");
            MainController.UI.message("")

            items.addFilter = {
                label: "add filter",
                action: function (e) {// pb avec source
                    self.jstree.menuActions.addQueryFilter(e.position)

                }
            },
                items.removeFilter = {
                    label: "remove filter",
                    action: function (e) {// pb avec source
                        self.jstree.menuActions.removeQueryFilter()
                    }
                }

            return items;
        }
        , menuActions: {
            addAllNodesToGraph: function (node) {
                MainController.UI.message("searching...")
                $("#waitImg").css("display", "flex");
                if (node) {

                    self.Graph.drawGraph(node)
                }
            }
            , removeNodesFromGraph: function (node) {

            }
            , addQueryFilter: function (position) {
                var properties = [ADLbrowser.currentJstreeQueryNode.data]
                common.fillSelectOptions("ADLbrowserQueryParams_property", properties, false, "label", "id")
                $("#ADLbrowserQueryParamsDialog").css("left", position.x)
                $("#ADLbrowserQueryParamsDialog").css("top", position.y)
                $("#ADLbrowserQueryParamsDialog").css("display", "block")

            }
            , removeQueryFilter: function () {
                $("#ADLbrowser_queryTreeDiv").jstree(true).delete_node(ADLbrowser.currentJstreeQueryNode.data.id)
            }


        }


    }


    self.query = {

        getAdlModel: function (subjectType, source, callback) {

            if (!source)
                source = self.currentSource;
            if (!self.adlModelCache)
                self.adlModelCache = {}

            if (self.adlModelCache[subjectType]) {
                return callback(null, self.adlModelCache[subjectType])
            }


            var fromStr = Sparql_common.getFromStr(self.currentSource)
            var filterStr = "";
            if (subjectType != "all")
                filterStr = "filter (?subType=<" + subjectType + "> ) "
            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct ?prop ?subType ?objType" +
                fromStr +
                "WHERE {?sub ?prop ?obj.filter (?prop !=<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>) {?sub rdf:type  ?subType. " + filterStr + "}  optional{?obj rdf:type ?objType}" +
                "}"
            var url = Config.sources[source].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "subType"])
                self.adlModelCache[subjectType] = result.results.bindings
                return callback(null, result.results.bindings)
            })

        },

        getNodeProperties: function (node, callback) {
            if (node.data.role == "pred")
                return [node.data.id]

            self.query.getAdlModel(node.data.type || node.data.id, null, function (err, result) {
                if (err) {
                    return callback(err)
                }
                var properties = []
                result.forEach(function (item) {
                    var objectType = "any"
                    if (item.objType)
                        objectType = item.objType.value
                    properties.push({
                        property: item.prop.value,
                        objectType: objectType,
                        propertyLabel: self.OneModelDictionary[item.prop.value] || item.prop.value,
                        objectTypeLabel: self.OneModelDictionary[objectType] || objectType,
                    })

                })
                return callback(null, properties)

            })
        },
        showQueryParamsDialog: function (position, mode) {
            var field = self.currentJstreeNode.id
            self.query.getNodeProperties(self.currentJstreeNode, function (err, properties) {
                var withBlankOption = false;
                if (properties.length > 1)
                    withBlankOption = true;
                $("#ADLbrowserQueryParams_type").html(self.currentJstreeNode.data.label)
                common.fillSelectOptions("ADLbrowserQueryParams_property", properties, withBlankOption, "propertyLabel", "property")

                $("#ADLbrowserQueryParamsDialog").css("left", position.x)
                $("#ADLbrowserQueryParamsDialog").css("top", position.y)
                $("#ADLbrowserQueryParamsDialog").css("display", "block")
            })
        },
        onQueryParamsDialogValidate: function () {
            var property = $("#ADLbrowserQueryParams_property").val()
            var operator = $("#ADLbrowserQueryParams_operator").val()
            var value = $("#ADLbrowserQueryParams_value").val()
            var field = self.currentJstreeNode.id
            var adlNodeObj = $("#ADLbrowser_adlJstreeDiv").jstree(true).get_node()
            $("#ADLbrowserQueryParamsDialog").css("display", "none")
            var filterStr = "";
            var numberOperators = ("<", ">", "<=", ">=")
            if (property) {
                if (value) {
                    if (operator == "contains")
                        filterStr = " ?obj <" + property + "> ?x. filter ( regex(?x,'" + value + "','i')) "
                    else if (operator == "not contains")
                        filterStr = " ?obj <" + property + "> ?x. filter regex(?x, '^((?!" + value + ").)*$','i') "
                    else if (numberOperators.indexOf(operator) > -1)
                        filterStr = " ?obj <" + property + "> ?x. filter ( xsd:float(?x)" + operator + value + ") "

                    else
                        filterStr = " ?obj <" + property + "> ?x. filter (?x " + operator + value + ") "
                } else {


                    filterStr = "  ?obj <" + property + "> ?x. "
                }


            }
            var filterLabel = property + " " + operator + " " + value
            if (self.queryMode == "graph")
                self.Graph.drawGraph(self.currentJstreeNode, filterStr)
            else if (self.queryMode == "query") {
                self.query.addFilterToQueryTree({label: filterLabel, content: filterStr})
            }


        }


        ,
        onQueryParamsDialogCancel: function () {

            $("#ADLbrowserQueryParamsDialog").css("display", "none")


        },


        addNodeToQueryTree: function (node, prop) {


            self.query.getAdlModel(node.data.type || node.data.id, null, function (err, result) {
                var isNewTree = $("#ADLbrowser_queryTreeDiv").is(':empty');
                var existingNodes = []
                if (!isNewTree)
                    existingNodes = common.getjsTreeNodes("ADLbrowser_queryTreeDiv", true)
                var jstreeData = [];

                if (existingNodes.indexOf(node.data.id) < 0) {
                    jstreeData.push({
                        id: node.data.id,
                        text: node.data.label,
                        parent: '#',
                        data: {
                            type: "Class",
                            id: node.data.id,
                            label: node.data.label,


                        }
                    })
                    if (!isNewTree) {

                        common.addNodesToJstree("ADLbrowser_queryTreeDiv", "#", jstreeData)
                        jstreeData = []
                    }
setTimeout(function(){
    $("#ADLbrowser_queryTreeDiv").jstree(true).select_node(node.data.id)
},200)

                }

                if (err) {
                    return callback(err)
                }
                result.forEach(function (item) {
                    if (existingNodes.indexOf(item.prop.id) < 0) {

                        jstreeData.push({
                            id: item.prop.value,
                            text: item.propLabel.value,
                            parent: node.data.id,
                            data: {
                                label: item.propLabel.value,
                                id: item.prop.value,
                                type: "property",
                                parent: node.data.id,
                                range: node.data.subType,

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
                    common.loadJsTree("ADLbrowser_queryTreeDiv", jstreeData, options)
                } else {
                    common.addNodesToJstree("ADLbrowser_queryTreeDiv", node.data.id, jstreeData)
                }

            })


        }
        , addFilterToQueryTree: function (filterObj) {
            var propId = ADLbrowser.currentJstreeQueryNode.data.id
            var id = "filter_" + common.getRandomHexaId(5)
            var jstreeData = [{
                id: id,
                text: filterObj.label,
                parent: propId,
                data: {type: "propFilter", content: filterObj.content}

            }]
            common.addNodesToJstree("ADLbrowser_queryTreeDiv", propId, jstreeData)
            setTimeout(function() {
                $("#ADLbrowser_queryTreeDiv").jstree(true).select_node(id)
            },200
            )


        }
        , clear() {
            self.currentQuery = []

        },
        execute: function () {

        },
    }

    self.Graph = {
        setGraphPopupMenus: function (node, event) {
            if (!node)
                return;

            var html =
                "    <span class=\"popupMenuItem\" onclick=\"ADLbrowser.showNodeInfos();\"> node infos</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"ADLbrowser.Graph.expandNode()\">expand...</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"ADLbrowser.Graph.collapseNode();\">collapse </span>"
            $("#graphPopupDiv").html(html)
        },
        clearGraph: function () {
            visjsGraph.clearGraph()
        },
        collapseNode: function () {
            visjsGraph.collapseNode(self.currentJstreeNode.id)

        },
        expandNode: function () {
            ADLbrowser.query.showQueryParamsDialog(self.Graph.lastRightClickPosition);

        },
        drawGraph: function (node, filterStr) {


            function execute(graphNodeFilterStr, callback) {
                var source;
                var query
                if (node.data.sourceType == "rdl") {
                    source = self.currentSource
                    var fromStrAdl = Sparql_common.getFromStr(source)
                    var fromStrRdl = Sparql_common.getFromStr(Config.ADLBrowser.RDLsource)
                    query = "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>" +
                        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                        "SELECT distinct * " + fromStrAdl + fromStrRdl + " WHERE {" +
                        filterStr +
                        "  ?obj rdfs:subClassOf ?sub." +
                        "  ?obj rdfs:label ?objLabel." +
                        "  ?sub rdfs:label ?subLabel." +
                        "  ?obj rdf:type ?objType." +
                        "   ?sub rdf:type ?subType." +
                        " }  limit 1000"


                }
                if (node.data.sourceType == "adl") {
                    source = self.currentSource

                    var fromStr = Sparql_common.getFromStr(source)
                    query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct * " +
                        fromStr +
                        "WHERE {" +
                        "   ?sub ?pred ?obj. ?sub rdf:type ?subType. ?obj rdf:type ?objType. optional {?sub rdfs:label ?subLabel} optional{?obj rdfs:label ?objLabel}"
                    // "filter(   ?" + node.data.role + " =<" + node.data.id + "> && regex(str(?pred),'part14'))" + filterStr +
                    if (node.data.role == "sub|obj") {
                        query += "filter(   ?sub =<" + node.data.id + "> || ?obj=<" + node.data.id + ">)"
                    } else
                        query += "filter(   ?" + node.data.role + " =<" + node.data.id + "> )"

                    query += filterStr + graphNodeFilterStr


                    query += " }  limit 1000"

                }
                if (node.data.sourceType == "oneModel") {
                    source = self.currentSource
                    query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct * " +
                        "FROM <http://data.total.com/resource/one-model/assets/clov/>  from <http://data.total.com/resource/one-model/quantum-rdl/>" +
                        "WHERE { ?adlConcept <http://data.total.com/resource/one-model#hasTotalRdlUri>  ?totalUri. ?adlConcept rdfs:label ?adlConceptLabel. ?adlConcept rdf:type ?adlType. " +
                        "?rdlConcept  rdfs:label ?rdlConceptLabel  .?rdlConcept rdfs:subClassOf* ?rdlConceptParent.filter(   ?totalUri =?rdlConcept && ?rdlConceptParent=<" + node.data.id + ">) }  limit 1000"

                }

                var url = Config.sources[source].sparql_server.url + "?format=json&query=";
                MainController.UI.message("searching...")
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
                    // $("#waitImg").css("display", "none");
                    if (err) {
                        return MainController.UI.message(err)
                    }
                    result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["sub", "obj"])
                    var data = result.results.bindings
                    if (data.length == 0) {
                        MainController.UI.message("no data found")
                        $("#waitImg").css("display", "none");
                        return callback()
                    }

                    MainController.UI.message("drawing " + data.length + "nodes...")
                    var visjsData = {nodes: [], edges: []}
                    var existingNodes = visjsGraph.getExistingIdsMap()
                    var isNewGraph = true
                    if (Object.keys(existingNodes).length > 0)
                        isNewGraph = false;


                    var subShape = "square"
                    if (!isNewGraph) {
                        subShape = "dot"
                    }


                    data.forEach(function (item) {
                        if (!isNewGraph || node.data.role.indexOf("sub") == 0) {
                            if (!existingNodes[item.sub.value]) {
                                existingNodes[item.sub.value] = 1
                                var color = "#ddd"
                                if (item.subType)
                                    color = self.getPropertyColor(item.subType.value)
                                visjsData.nodes.push({
                                    id: item.sub.value,
                                    label: item.subLabel.value,
                                    shape: subShape,
                                    color: color,
                                    size: self.defaultNodeSize,
                                    data: {sourceType: node.data.sourceType, role: "sub", source: self.currentSource, type: item.subType.value, id: item.sub.value, label: item.subLabel.value}

                                })
                            }
                        }
                        if (node.data.sourceType == "rdl" || !isNewGraph || node.data.role.indexOf("obj") == 0) {
                            if (!existingNodes[item.obj.value]) {
                                existingNodes[item.obj.value] = 1
                                var color = "#ddd"
                                if (item.objType)
                                    color = self.getPropertyColor(item.objType.value)
                                visjsData.nodes.push({
                                    id: item.obj.value,
                                    label: item.objLabel.value,
                                    shape: "dot",
                                    color: color,
                                    size: self.defaultNodeSize,
                                    data: {sourceType: "adl", role: "sub", source: self.currentSource, type: item.objType.value, id: item.obj.value, label: item.objLabel.value}

                                })
                            }
                        }
                        if (node.data.sourceType == "rdl" || !isNewGraph) {
                            var edgeId = item.obj.value + "_" + item.sub.value
                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: item.obj.value,
                                    to: item.sub.value,
                                    color: "#ccc"

                                })
                            }
                        }


                    })

                    MainController.UI.message("drawing...")

                    if (!visjsGraph.data || !visjsGraph.data.nodes) {
                        var options = {
                            onclickFn: function (node, point, event) {
                                self.currentJstreeNode = node
                                if (event.ctrlKey)
                                    ;


                            },
                            onRightClickFn: function (node, point, event) {

                                self.currentJstreeNode = node

                                MainController.UI.showPopup(point, "graphPopupDiv")
                                self.Graph.setGraphPopupMenus(node, event)
                                point.x += leftPanelWidth
                                self.Graph.lastRightClickPosition = point


                            }

                        }
                        visjsGraph.draw("graphDiv", visjsData, options)
                    } else {

                        visjsGraph.data.nodes.add(visjsData.nodes)
                        visjsGraph.data.edges.add(visjsData.edges)
                        visjsGraph.network.fit()
                    }
                    callback()

                })
            }

            if (!filterStr)
                filterStr = "";
            if (!self.currentSource)
                return alert("select a source")


            var graphNodeFilterStr = ""
            var slicedGraphNodes = [];
            if (visjsGraph.data && visjsGraph.data.nodes) {
                var existingNodes = visjsGraph.data.nodes.getIds();
                slicedGraphNodes = common.sliceArray(existingNodes, 50)


                async.eachSeries(slicedGraphNodes, function (slice, callbackEach) {
                    var graphNodesRole = "sub"
                    if (node.data.role == "sub" || node.data.role == "subType")
                        graphNodesRole = "obj"
                    if (node.data.role == "obj" || node.data.role == "objType")
                        graphNodesRole = "sub"

                    var graphNodeFilterStr = Sparql_common.setFilter(graphNodesRole, slice)
                    execute(graphNodeFilterStr, function (err, result) {
                        if (err)
                            return callbackEach(err)
                        return callbackEach()
                    })

                }, function (err) {
                    $("#waitImg").css("display", "none");
                    if (err)
                        return MainController.UI.message(err)
                    setTimeout(function () {
                        ///   MainController.UI.message("")
                    }, 1000)
                })

            } else {
                execute(graphNodeFilterStr, function (err, result) {
                    $("#waitImg").css("display", "none");
                    if (err)
                        return MainController.UI.message(err)
                    setTimeout(function () {
                        MainController.UI.message("")
                    }, 1000)
                })
            }
        }
    }


    return self;


})
()
