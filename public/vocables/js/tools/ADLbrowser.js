var ADLbrowser = (function () {

    var self = {}
    var typeColors = []
    self.aspectsChildrenDepth = 8
    self.MDMsource = "MDM-QUANTUM-MIN"
    self.OneModelSource = "ONE-MODEL";
    self.OneModelDictionary = {}


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
            self.jstree.load.loadMdm();
            self.initOneModelDictionary()

            SourceBrowser.currentTargetDiv = "ADLbrowserItemsjsTreeDiv"
            $("#GenericTools_searchSchemaType").val("INDIVIDUAL")


        }, 200)
    }

    self.initOneModelDictionary = function () {


        var schema = OwlSchema.initSourceSchema(self.OneModelSource, function (err, schema) {
            var ontologyProps = {}
            Sparql_schema.getPropertiesRangeAndDomain(schema, null, null, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
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
            })
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
                        data: {sourceType: "adl", source: self.currentSource, type: "subject", id: item.sub.value, label: item.objLabel.value, source: self.currentSource}
                    })
                }


            })

            common.addNodesToJstree("ADLbrowserItemsjsTreeDiv", self.currentSource, jstreeData)
            MainController.UI.message("")
            $("#waitImg").css("display", "none");

        })
    }


    self.getMdmJstreeData = function (parent, callback) {


        var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "SELECT distinct * from <http://data.total.com/resource/one-model/quantum-mdm/> WHERE {" +
            "  ?id rdf:type ?type ." +
            "   ?id rdfs:label ?label ." +
            "  ?id rdfs:subClassOf  ?parent. filter (?parent=<" + parent + ">)"


        var limit = Config.queryLimit;
        query += " } limit " + limit

        var url = Config.sources[self.MDMsource].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: self.MDMsource}, function (err, result) {
            if (err) {
                return callback(err)
            }

            var jstreeData = []


            result.results.bindings.forEach(function (item) {
                jstreeData.push({
                    id: item.id.value,
                    text: item.label.value,
                    parent: parent,
                    data: {type: "mdmClass", id: item.id.value, label: item.label.value}

                })

            })
            return callback(null, jstreeData)

        })
    }


    self.jstree = {
        getJstreeConceptsContextMenu: function (jstreeDivId) {
            // return {}
            var items = {}
            /*  if (!self.currentJstreeNode)
                  return
              var type = self.currentJstreeNode.data.type;*/
            $("#waitImg").css("display", "none");
            MainController.UI.message("")
            if (true || type == "") {
                if (jstreeDivId == "ADLbrowserItemsjsTreeDiv" || (visjsGraph.data && visjsGraph.data.nodes)) {
                    items.addAllNodesToGraph = {
                        label: "add  nodes",
                        action: function (e) {// pb avec source
                            self.jstree.actions.addAllNodesToGraph(self.currentJstreeNode)
                        }
                    }
                }
                items.addFilteredNodesToGraph = {
                    label: "add filtered nodes",
                    action: function (e, xx) {// pb avec source
                        self.query.showQueryParamsDialog(e.position)


                    }
                }

                items.removeNodesFromGraph = {
                    label: "remove nodes from graph",
                    action: function (e) {// pb avec source
                        self.jstree.actions.removeNodesFromGraph(self.currentJstreeNode)
                    }
                }
            }
            return items;
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
                    selectTreeNodeFn: function (event, data) {
                        $("#ADLbrowserItemsjsTreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("ADLbrowserItemsjsTreeDiv")
                        if (data.node.parent != "#") {// after search
                            // self.jstree.load.loadAdl(data.node)
                            self.currentJstreeNode = data.node
                        } else {
                            self.currentSource = data.node.id
                            self.jstree.load.loadAdl()
                        }

                    },
                    contextMenu: self.jstree.getJstreeConceptsContextMenu("ADLbrowserItemsjsTreeDiv")
                }
                common.loadJsTree("ADLbrowserItemsjsTreeDiv", jstreeData, options, function (err, result) {

                })
            },
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
                    Sparql_generic.getNodeChildren(self.OneModelSource, null, topAspect.id, self.aspectsChildrenDepth, null, function (err, result) {
                        if (err)
                            return callbackEach(err)
                        result.forEach(function (item) {
                            for (var i = 1; i < self.aspectsChildrenDepth; i++) {
                                if (item["child" + i]) {
                                    var parent;
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
                                            data: {sourceType: "oneModel", source: self.currentSource, id: item["child" + i].value, label: item["child" + i + "Label"].value,}
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
                        selectTreeNodeFn: function (event, obj) {
                            ADLbrowser.currentJstreeNode = obj.node;
                            $("#ADLbrowser_oneModelJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("ADLbrowser_oneModelJstreeDiv")
                        },
                        contextMenu: self.jstree.getJstreeConceptsContextMenu("ADLbrowser_oneModelJstreeDiv")

                        ,
                        openAll: true,

                    }
                    common.loadJsTree("ADLbrowser_oneModelJstreeDiv", jstreeData, options, function (err, result) {

                    })
                })
            },
            loadMdm: function (aspectNode) {

                var topObjects = {
                    "http://data.total.com/resource/one-model/quantum-mdm/TOTAL-F0000000801": "Functional Objects",
                    "http://data.total.com/resource/one-model/quantum-mdm/TOTAL-P0000001723": "physical Objects",
                    //  "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute"
                }
                var topIds = Object.keys(topObjects)
                var jstreeData = []
                async.eachSeries(topIds, function (parentId, callbackEach) {
                    self.getMdmJstreeData(parentId, function (err, result) {
                        if (err)
                            return MainController.UI.message(err)
                        jstreeData.push({
                            id: parentId,
                            text: topObjects[parentId],
                            parent: "#",
                            data: {sourceType: "mdm", id: parentId, text: topObjects[parentId]}
                        })
                        result.forEach(function (item) {
                            jstreeData.push(item)
                        })
                        callbackEach()
                    })


                }, function (err) {

                    var options = {
                        selectTreeNodeFn: function (event, obj) {
                            ADLbrowser.currentJstreeNode = obj.node;

                            if (obj.node.children.length == 0)
                                ADLbrowser.getMdmJstreeData(obj.node.data.id, function (err, result) {
                                    if (err)
                                        return MainController.UI.message(err)
                                    common.addNodesToJstree("ADLbrowser_mdmJstreeDiv", obj.node.data.id, result)

                                })
                            $("#ADLbrowser_mdmJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("ADLbrowser_mdmJstreeDiv")
                        },
                        contextMenu: self.jstree.getJstreeConceptsContextMenu("ADLbrowser_mdmJstreeDiv")
                    }
                    common.loadJsTree("ADLbrowser_mdmJstreeDiv", jstreeData, options)

                })


            },
            loadAdl: function (node) {
                if (!self.currentSource) {
                    return alert("select a source")
                }

                self.query.getAdlModel(null, null, function (err, result) {

                    var jstreeData = []
                    var existingNodes = {}
                    var typesArray = []

                    result.forEach(function (item) {
                        if (typesArray.indexOf(item.subType.value) < 0)
                            typesArray.push(item.subType.value)
                        if (item.subType) {
                            var label = self.OneModelDictionary[item.subType.value]
                            if (!label)
                                label = item.subType.value
                            var color = self.getPropertyColor(item.subType.value)
                            if (!existingNodes["sub_" + item.subType.value]) {
                                existingNodes["sub_" + item.subType.value] = 1
                                jstreeData.push({
                                    id: "sub_" + item.subType.value,
                                    text: "<span style='color:" + color + "'>" + label + "</span>",
                                    parent: "#",
                                    data: {sourceType: "adl", source: self.currentSource, type: "subject", id: item.subType.value, label: label}
                                })
                            }
                        }
                        if (!existingNodes["prop_" + item.prop.value]) {
                            var label = self.OneModelDictionary[item.prop.value]
                            if (!label)
                                label = item.prop.value
                            existingNodes["prop_" + item.prop.value] = 1
                            jstreeData.push({
                                id: "prop_" + item.prop.value,
                                text: label,
                                parent: "sub_" + item.subType.value,
                                data: {sourceType: "adl", source: self.currentSource, type: "property", id: item.prop.value, label: label}
                            })
                        }
                        if (item.objType && !existingNodes["obj_" + item.objType.value]) {
                            if (typesArray.indexOf(item.objType.value) < 0)
                                typesArray.push(item.objType.value)

                            existingNodes["obj_" + item.objType.value] = 1
                            var label = self.OneModelDictionary[item.objType.value]
                            if (!label)
                                label = item.objType.value
                            var color = self.getPropertyColor(item.objType.value)
                            jstreeData.push({
                                id: "obj_" + item.objType.value,
                                text: "<span style='color:" + color + "'>" + label + "</span>",
                                parent: "prop_" + item.prop.value,
                                data: {sourceType: "adl", source: self.currentSource, type: "object", id: item.objType.value, label: self.OneModelDictionary[item.objType.value]}
                            })
                        }

                    })


                    var options = {
                        selectTreeNodeFn: function (event, obj) {

                            ADLbrowser.currentJstreeNode = obj.node;
                            $("#ADLbrowser_adlJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("ADLbrowser_adlJstreeDiv")
                        }, openAll: true,
                        contextMenu: self.jstree.getJstreeConceptsContextMenu("ADLbrowser_adlJstreeDiv")

                    }
                    common.fillSelectOptions("ADLbrowser_searchAllSourcestypeSelect", typesArray, true)
                    common.loadJsTree("ADLbrowser_adlJstreeDiv", jstreeData, options)
                    $("#ADLbrowser_Tabs").tabs("option", "active", 0);


                })


            }

        }
        , actions: {
            addAllNodesToGraph: function (node) {
                MainController.UI.message("searching...")
                $("#waitImg").css("display", "flex");
                if (node) {

                    self.Graph.drawGraph(node)
                }
            },
            addFilteredNodesToGraph: function (node) {

            }
            ,
            removeNodesFromGraph: function (node) {

            }


        }

    }


    self.query = {

        getAdlModel: function (subjectType, source, callback) {
            if (!source)
                source = self.currentSource;

            var fromStr = Sparql_common.getFromStr(self.currentSource)
            var filterStr = "";
            if (subjectType)
                filterStr = "filter (?subType=<" + subjectType + "> ) "
            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct ?prop ?subType ?objType\n" +
                fromStr +
                "WHERE {?sub ?prop ?obj.filter (?prop !=<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>) {?sub rdf:type  ?subType. " + filterStr + "}  optional{?obj rdf:type ?objType}\n" +
                "}"
            var url = Config.sources[self.MDMsource].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: self.MDMsource}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings)
            })

        },

        getNodeProperties: function (node, callback) {
            self.query.getAdlModel(node.data.id, null, function (err, result) {
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
        showQueryParamsDialog: function (position) {
            var field = self.currentJstreeNode.id
            self.query.getNodeProperties(self.currentJstreeNode, function (err, properties) {


                common.fillSelectOptions("ADLbrowserQueryParams_property", properties, true, "propertyLabel", "property")

                $("#ADLbrowserQueryParamsDialog").css("left", position.x)
                $("#ADLbrowserQueryParamsDialog").css("top", position.y)
                $("#ADLbrowserQueryParamsDialog").css("display", "block")
            })
        },
        onQueryParamsDialogValidate:

            function () {
                var property = $("#ADLbrowserQueryParams_property").val()
                var operator = $("#ADLbrowserQueryParams_operator").val()
                var value = $("#ADLbrowserQueryParams_value").val()
                var field = self.currentJstreeNode.id
                var adlNodeObj = $("#ADLbrowser_adlJstreeDiv").jstree(true).get_node()
                $("#ADLbrowserQueryParamsDialog").css("display", "none")
                self.Graph.drawGraph(self.currentJstreeNode)
            }

        ,
        onQueryParamsDialogCancel: function () {

            $("#ADLbrowserQueryParamsDialog").css("display", "none")


        }
    }

    self.Graph = {
        setGraphPopupMenus: function (node, event) {
            if (!node)
                return;

            var html = "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.drawChildren();\"> show Infos</span>" +
                "<span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.drawParents();\"> expand</span>" +
                "    <span class=\"popupMenuItem\" onclick=\"Lineage_classes.graphActions.drawSimilars();\"> collapse</span>" +
                "    <span  class=\"popupMenuItem\"onclick=\"Lineage_classes.graphActions.hideChildren();\">remove</span>"

        },
        clearGraph: function () {
            visjsGraph.clearGraph()
        },
        drawGraph: function (node, filterStr) {

            if (!filterStr)
                filterStr = "";
            if (!self.currentSource)
                return alert("select a source")

            var source;
            var query
            if (node.data.sourceType == "mdm") {
                source = self.currentSource
                query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct * \n" +
                    "FROM <http://data.total.com/resource/one-model/assets/clov/>  from <http://data.total.com/resource/one-model/quantum-mdm/>\n" +
                    "WHERE { ?adlConcept <http://data.total.com/resource/one-model#hasTotalMdmUri>  ?totalUri. ?adlConcept rdfs:label ?adlConceptLabel. ?adlConcept rdf:type ?adlType. \n" +
                    "?mdmConcept  rdfs:label ?mdmConceptLabel  .?mdmConcept rdfs:subClassOf* ?mdmConceptParent.filter(   ?totalUri =?mdmConcept && ?mdmConceptParent=<" + node.data.id + ">) }  limit 1000"

            }
            if (node.data.sourceType == "adl") {
                source = self.currentSource

                var fromStr = Sparql_common.getFromStr(source)
                query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct * \n" +
                    fromStr +
                  "WHERE {" +
                    "  { ?sub ?pred ?obj. ?sub rdf:type ?subType. ?obj rdf:type ?objType. optional {?sub rdfs:label ?subLabel} optional{?obj rdfs:label ?objLabel}" +
                    "filter(   ?obj =<"+node.data.id+"> && regex(str(?pred),'part14'))}" +
                    "  UNION  { ?sub ?pred ?obj. ?sub rdf:type ?subType. ?obj rdf:type ?objType. optional {?sub rdfs:label ?subLabel} optional{?obj rdfs:label ?objLabel}" +
                    " filter(   ?sub =<"+node.data.id+"> && regex(str(?pred),'part14'))}"


                query += " }  limit 1000"

            }
            if (node.data.sourceType == "oneModel") {
                source = self.currentSource
                query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct * \n" +
                    "FROM <http://data.total.com/resource/one-model/assets/clov/>  from <http://data.total.com/resource/one-model/quantum-mdm/>\n" +
                    "WHERE { ?adlConcept <http://data.total.com/resource/one-model#hasTotalMdmUri>  ?totalUri. ?adlConcept rdfs:label ?adlConceptLabel. ?adlConcept rdf:type ?adlType. \n" +
                    "?mdmConcept  rdfs:label ?mdmConceptLabel  .?mdmConcept rdfs:subClassOf* ?mdmConceptParent.filter(   ?totalUri =?mdmConcept && ?mdmConceptParent=<" + node.data.id + ">) }  limit 1000"

            }

            var url = Config.sources[source].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
                // $("#waitImg").css("display", "none");
                if (err) {
                    return MainController.UI.message(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["sub", "obj"])
                var data = result.results.bindings
                if (data.length == 0)
                    return MainController.UI.message("no data found")
                //   $("#waitImg").css("display", "flex");
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                if (!self.currentAdlTypesOnGraph)
                    self.currentAdlTypesOnGraph = {}


                data.forEach(function (item) {
                    /*   if (!self.currentAdlTypesOnGraph[item.sub.value])
                           self.currentAdlTypesOnGraph[item.sub.value] = 0;
                       self.currentAdlTypesOnGraph[item.sub.value] += 1*/
                    if (!existingNodes[item.sub.value]) {
                        existingNodes[item.sub.value] = 1
                        var color = "#ddd"
                        if (item.subType)
                            color = self.getPropertyColor(item.subType.value)
                        visjsData.nodes.push({
                            id: item.sub.value,
                            label: item.subLabel.value,
                            shape: "dot",
                            color: color,
                            data: {source: self.currentSource, id: item.sub.value, label: item.subLabel.value}

                        })
                    }

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
                            data: {source: self.currentSource, id: item.obj.value, label: item.objLabel.value}

                        })
                    }
                    var edgeId = item.obj.value + "_" + item.sub.value
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.obj.value,
                            to: item.sub.value,
                        })
                    }


                })

                MainController.UI.message("drawing...")

                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    var options = {
                        onclickFn: function (node, point, event) {
                            if (event.ctrlKey)
                                MainController.UI.showNodeInfos(node.data.source, node.data.id, "mainDialogDiv")


                        },
                        onRightClickFn: function (node, point, event) {
                            self.currentJstreeNode=node
                            point.x+=leftPanelWidth
                            self.query.showQueryParamsDialog (point)
                        }

                    }
                    visjsGraph.draw("graphDiv", visjsData, options)
                } else {

                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                    visjsGraph.network.fit()
                }
                MainController.UI.message("")
                $("#waitImg").css("display", "none");
            })
        },
        drawGraphOld: function (node, filterStr) {

            if (!filterStr)
                filterStr = "";
            if (!self.currentSource)
                return alert("select a source")

            var source;
            var query
            if (node.data.sourceType == "mdm") {
                source = self.currentSource
                query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct * \n" +
                    "FROM <http://data.total.com/resource/one-model/assets/clov/>  from <http://data.total.com/resource/one-model/quantum-mdm/>\n" +
                    "WHERE { ?adlConcept <http://data.total.com/resource/one-model#hasTotalMdmUri>  ?totalUri. ?adlConcept rdfs:label ?adlConceptLabel. ?adlConcept rdf:type ?adlType. \n" +
                    "?mdmConcept  rdfs:label ?mdmConceptLabel  .?mdmConcept rdfs:subClassOf* ?mdmConceptParent.filter(   ?totalUri =?mdmConcept && ?mdmConceptParent=<" + node.data.id + ">) }  limit 1000"

            }
            if (node.data.sourceType == "adl") {
                source = self.currentSource


                query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct * \n" +
                    "FROM <http://data.total.com/resource/one-model/assets/clov/>  from <http://data.total.com/resource/one-model/quantum-mdm/>\n" +
                    " WHERE { ?sub ?pred ?obj. " +
                    "OPTIONAL{?sub rdf:type ?subType} " +
                    "OPTIONAL{?sub rdfs:label ?subLabel} " +
                    "OPTIONAL{?obj rdf:type ?objType} " +
                    "OPTIONAL{?obj rdf:type ?objLabel} " +
                    "filter(   ?pred !=rdfs:label)"

                if (node.data.type == "subject")
                    query += "filter(   ?sub =<" + node.data.id + ">)"
                if (node.data.type == "property")
                    query += "WHERE { ?sub ?pred ?obj. filter(   ?pred =<" + node.data.id + ">)"
                if (node.data.type == "obj")
                    query += "WHERE { ?sub ?pred ?obj. filter(   ?obj =<" + node.data.id + ">)"

                query += " }  limit 1000"

            }
            if (node.data.sourceType == "oneModel") {
                source = self.currentSource
                query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct * \n" +
                    "FROM <http://data.total.com/resource/one-model/assets/clov/>  from <http://data.total.com/resource/one-model/quantum-mdm/>\n" +
                    "WHERE { ?adlConcept <http://data.total.com/resource/one-model#hasTotalMdmUri>  ?totalUri. ?adlConcept rdfs:label ?adlConceptLabel. ?adlConcept rdf:type ?adlType. \n" +
                    "?mdmConcept  rdfs:label ?mdmConceptLabel  .?mdmConcept rdfs:subClassOf* ?mdmConceptParent.filter(   ?totalUri =?mdmConcept && ?mdmConceptParent=<" + node.data.id + ">) }  limit 1000"

            }

            var url = Config.sources[source].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
                // $("#waitImg").css("display", "none");
                if (err) {
                    return MainController.UI.message(err)
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["sub", "obj"])
                var data = result.results.bindings
                if (data.length == 0)
                    return MainController.UI.message("no data found")
                //   $("#waitImg").css("display", "flex");
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                if (!self.currentAdlTypesOnGraph)
                    self.currentAdlTypesOnGraph = {}


                data.forEach(function (item) {
                    /*   if (!self.currentAdlTypesOnGraph[item.sub.value])
                           self.currentAdlTypesOnGraph[item.sub.value] = 0;
                       self.currentAdlTypesOnGraph[item.sub.value] += 1*/
                    if (!existingNodes[item.sub.value]) {
                        existingNodes[item.sub.value] = 1
                        var color = "#ddd"
                        if (item.subType)
                            color = self.getPropertyColor(item.subType.value)
                        visjsData.nodes.push({
                            id: item.sub.value,
                            label: item.subLabel.value,
                            shape: "dot",
                            color: color,
                            data: {source: self.currentSource, id: item.sub.value, label: item.subLabel.value}

                        })
                    }

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
                            data: {source: self.currentSource, id: item.obj.value, label: item.objLabel.value}

                        })
                    }
                    var edgeId = item.obj.value + "_" + item.sub.value
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.obj.value,
                            to: item.sub.value,
                        })
                    }


                })

                MainController.UI.message("drawing...")

                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    var options = {
                        onclickFn: function (node, point, event) {
                            if (event.ctrlKey)
                                MainController.UI.showNodeInfos(node.data.source, node.data.id, "mainDialogDiv")


                        }

                    }
                    visjsGraph.draw("graphDiv", visjsData, options)
                } else {

                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                    visjsGraph.network.fit()
                }
                MainController.UI.message("")
                $("#waitImg").css("display", "none");
            })
        }
        , drawExpandGraph(node) {
            if (node.data.type == "property") {

                var fromStr = Sparql_common.getFromStr(self.currentSource)
                var graphNodes = visjsGraph.data.nodes.get();
                var graphNodeIdsStr = ""
                graphNodes.forEach(function (item, index) {
                    if (index > 0)
                        graphNodeIdsStr += ","
                    graphNodeIdsStr += "<" + item.data.id + ">"
                })


                var filterStr = "filter (?pred=<" + node.data.id + "> && ?sub in (" + graphNodeIdsStr + ")) "

                Sparql_INDIVIDUALS.getItems(self.currentSource, {filter: filterStr}, function (err, result) {
                    if (err)
                        return MainController.UI.message(err);

                    var existingIds = visjsGraph.getExistingIdsMap()
                    var visjsData = {nodes: [], edges: []}

                    result.forEach(function (item) {
                        var color = self.getPropertyColor(item.objType.value)

                        if (!existingIds[item.obj.value]) {
                            existingIds[item.obj.value] = 1
                            visjsData.nodes.push({
                                id: item.obj.value,
                                label: item.objLabel.value,
                                shape: 'dot',
                                color: color,
                                data: {
                                    source: self.currentSource, id: item.obj.value,
                                    label: item.objLabel.value
                                }

                            })
                        }
                        var edgeId = item.obj.value + "_" + item.sub.value
                        if (!existingIds[edgeId]) {
                            existingIds[edgeId] = 1
                            visjsData.edges.push({
                                id: edgeId,
                                from: item.obj.value,
                                to: item.sub.value,

                            })
                        }

                    })
                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                    visjsGraph.network.fit()

                })


            }
        }


    }


    return self;


})()
