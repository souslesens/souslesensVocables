var ADLbrowser = (function () {

    var self = {}

    self.aspectsChildrenDepth = 8


    self.onLoaded = function () {
        $("#sourceDivControlPanelDiv").html("")
        MainController.UI.message("");


        $("#accordion").accordion("option", {active: 2});
        MainController.UI.openRightPanel()
        $("#rightPanelDiv").load("snippets/ADL/ADLbrowserRightPanel.html");
        $("#actionDivContolPanelDiv").load("snippets/ADL/ADLbrowser.html");
        setTimeout(function () {
            self.loadAdlsList();
            self.loadAspects();

            SourceBrowser.currentTargetDiv = "ADLbrowserItemsjsTreeDiv"
            $("#GenericTools_searchSchemaType").val("INDIVIDUAL")


        }, 200)
    }

    self.loadAdlsList = function () {
        var jstreeData = []
        for (var source in Config.sources) {
            if (Config.sources[source].schemaType == "INDIVIDUAL")
                jstreeData.push({
                    id: source,
                    text: source,
                    parent: "#"
                })
        }
        var options = {selectTreeNodeFn: ADLbrowser.onSelectLeftJstreeItem, openAll: true}
        common.loadJsTree("ADLbrowserItemsjsTreeDiv", jstreeData, options, function (err, result) {

        })
    }

    self.loadAspects = function () {


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
            Sparql_generic.getNodeChildren("ONE-MODEL", null, topAspect.id, self.aspectsChildrenDepth, null, function (err, result) {
                if (err)
                    return callbackEach(err)
                result.forEach(function (item) {
                    for (var i = 1; i < self.aspectsChildrenDepth; i++) {
                        if (item["child" + i]) {
                            var parent;
                            if (true || i == 1)
                                parent = topAspect.id
                            else
                                parent = item["child" + (i - 1)].value


                            if (item["child" + i] && !item["child" + (i + 1)]) {
                                jstreeData.push({
                                    id: item["child" + i].value,
                                    text: item["child" + i + "Label"].value,
                                    parent: parent
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
            var options = {selectTreeNodeFn: ADLbrowser.onSelectJsTreeAspect, openAll: true}
            common.loadJsTree("ADLbrowserjsAspectsTreeDiv", jstreeData, options, function (err, result) {

            })
        })
    }

    self.onSelectJsTreeAspect = function (event, data) {

        if (data.event && data.event.ctrlKey) {
            self.Graph.drawGraph(data.node)
        }
        self.currentAspect = data.node;
        self.loadAspectChildren(data.node)


    }

    self.onSelectLeftJstreeItem = function (event, data) {
        if (data.node.parents.length == 1)
            self.currentSource = data.node.id

    }


    self.searchAllSourcesTerm = function () {
        var words = $("#ADLbrowser_searchAllSourcesTermInput").val();
        var exactMatch = $("#ADLbrowser_allExactMatchSearchCBX").prop("checked")
        Sparql_INDIVIDUALS.findByWords(self.currentSource, words, {exactMatch: exactMatch}, function (err, result) {
            if (err)
                return MainController.UI.message(err)
            var existingNodes = {}
            var jstreeData = []
            result.forEach(function (item) {
                if (!existingNodes[item.type.value]) {
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
                        parent: item.type.value,
                        data: {type: "individual", id: item.sub.value, label: item.objLabel.value, source: self.currentSource}
                    })
                }


            })

            common.addNodesToJstree("ADLbrowserItemsjsTreeDiv", self.currentSource, jstreeData)

        })
    }

    self.loadAspectChildren = function (aspectNode) {
        if (aspectNode.id == "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute") {
        } else {
            self.MDM.getChildrenObjects(aspectNode.id, null, function (err, result) {

                if (err)
                    return MainController.UI.message(err);

                var jstreeData = []
                var jstreeParent = aspectNode.id

                result.forEach(function (item) {
                    jstreeData.push({
                        id: item.id.value,
                        text: item.label.value,
                        parent: jstreeParent,
                        data: {type: aspectNode.id, id: item.id.value, label: item.label.value}

                    })

                })
                common.addNodesToJstree("ADLbrowserjsAspectsTreeDiv", jstreeParent, jstreeData)


            })


        }


    }

    self.MDM = {
        getattributes: function (callback) {

            var graphUri = Config.ADLBrowser.mdmGraphUri;
            var query = ""


        },
        getChildrenObjects: function (parent, options, callback) {
            if (!options)
                options = {}
            if (true) {
                if (parent == "http://standards.iso.org/iso/15926/part14/PhysicalObject")
                    parent = "http://data.total.com/resource/one-model/quantum-mdm/TOTAL-P0000001723"

                else if (parent == "http://standards.iso.org/iso/15926/part14/FunctionalObject")
                    parent = "http://data.total.com/resource/one-model/quantum-mdm/TOTAL-F0000000801"

                else if (parent == "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute")
                    parent = "http://data.total.com/resource/one-model/quantum-mdm/TOTAL-P0000001723"
            }
            var query = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                "SELECT * from <http://data.total.com/resource/one-model/quantum-mdm/> WHERE {" +
                "  ?id rdf:type ?type ." +
                "   ?id rdfs:label ?label ." +
                "  ?id rdfs:subClassOf  ?parent. filter (?parent=<" + parent + ">)"


            var limit = options.limit || Config.queryLimit;
            query += " } limit " + limit
            var source = "MDM-QUANTUM-MIN"
            var url = Config.sources[source].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })
        }


    }


    self.Graph = {

        drawGraph: function (node) {
            var totalId = node.id.substring(node.id.lastIndexOf("/") + 1)
            var options = {filter :" FILTER (?conceptLabel='" + totalId + "') "}


            var query="PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct * \n" +
                "FROM <http://data.total.com/resource/one-model/assets/clov/>  from <http://data.total.com/resource/one-model/quantum-mdm/>\n" +
                "WHERE { ?concept <http://data.total.com/resource/one-model#hasTotalMdmUri>  ?totalUri. ?concept rdfs:label ?conceptLabel.   }  limit 100"

            var source = "MDM-QUANTUM-MIN"
            var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })
return;
            Sparql_INDIVIDUALS.getItems(self.currentSource, options, function (err, result) {
                if(err)
                    return MainController.UI.message(err)
            })
        }


    }


    return self;


})()
