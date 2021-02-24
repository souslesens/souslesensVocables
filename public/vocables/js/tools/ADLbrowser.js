var ADLbrowser = (function () {

    var self = {}
var typeColors=[]
    self.aspectsChildrenDepth = 8
    self.MDMsource = "MDM-QUANTUM-MIN"
self.OneModelSource="ONE-MODEL";
    self.OneModelDictionary={}


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
            self.loadAdlsList();
            self.loadAspects();
            self.initOneModelDictionary()

            SourceBrowser.currentTargetDiv = "ADLbrowserItemsjsTreeDiv"
            $("#GenericTools_searchSchemaType").val("INDIVIDUAL")


        }, 200)
    }

    self.initOneModelDictionary= function(){


        var schema = OwlSchema.initSourceSchema(self.OneModelSource, function (err, schema) {
            var ontologyProps = {}
            Sparql_schema.getPropertiesRangeAndDomain(schema, null, null, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
                result.forEach(function (item) {
                    if(item.propertyLabel)
                    self.OneModelDictionary[item.property.value]= item.propertyLabel.value
                    else
                    self.OneModelDictionary[item.property.value]= item.property.value.substring( item.propertyLabel.value.lastIndexOf("/")+1)

                    if(item.subProperty) {
                        if(item.subPropertyLabel)
                        self.OneModelDictionary[item.subProperty.value] = item.subPropertyLabel.value
                        else
                            self.OneModelDictionary[item.subProperty.value]= item.property.value.substring( item.subProperty.value.lastIndexOf("/")+1)
                    }
                })
            })
        })
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
            Sparql_generic.getNodeChildren(self.OneModelSource, null, topAspect.id, self.aspectsChildrenDepth, null, function (err, result) {
                if (err)
                    return callbackEach(err)
                result.forEach(function (item) {
                    for (var i = 1; i < self.aspectsChildrenDepth; i++) {
                        if (item["child" + i]) {
                            var parent;
                            self.OneModelDictionary[item.concept.value]= item.conceptLabel.value
                            if (true || i == 1)
                                parent = topAspect.id
                            else
                                parent = item["child" + (i - 1)].value


                            if (item["child" + i] && !item["child" + (i + 1)]) {
                                self.OneModelDictionary[item["child" + i].value]= item["child" + i + "Label"].value
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
            common.loadJsTree("ADLbrowser_aspectsJstreeDiv", jstreeData, options, function (err, result) {

            })
        })
    }


    self.loadAdlProperties=function(){

var fromStr=Sparql_common.getFromStr(self.currentSource)
                var query="PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct ?prop ?subType ?objType\n" +
                   fromStr+
                    "WHERE {?sub ?prop ?obj.filter (?prop !=<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>) optional{?sub rdf:type  ?subType.}  optional{?obj rdf:type ?objType}\n" +
                    "}"
        var url = Config.sources[self.MDMsource ].sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: self.MDMsource}, function (err, result) {
                    if (err) {
                        return callback(err)
                    }

                    var jstreeData = []
                    var existingNodes={}
                    result.results.bindings.forEach(function (item) {
                        if(item.subType) {
                            var label = self.OneModelDictionary[item.subType.value]
                            if (!label)
                                label = item.subType.value
                            var color=self.getPropertyColor(item.subType.value)
                            if (!existingNodes["sub_" + item.subType.value]) {
                                existingNodes["sub_" + item.subType.value] = 1
                                jstreeData.push({
                                    id: "sub_" + item.subType.value,
                                    text: "<span style='color:"+color+"'>"+label+"</span>",
                                    parent: "#",
                                    data: {type: "subject", id: item.subType.value, label: label}
                                })
                            }
                        }
                        if(!existingNodes["prop_"+item.prop.value]){
                            var label=self.OneModelDictionary[item.prop.value]
                            if(!label)
                            label=item.prop.value
                            existingNodes["prop_"+item.prop.value]=1
                            jstreeData.push({
                                id:"prop_"+item.prop.value,
                                text:label,
                                parent:"sub_"+item.subType.value,
                                data:{type:"property",id:item.prop.value, label:label}
                            })
                        }
                        if(item.objType && !existingNodes["obj_"+item.objType.value]){
                            existingNodes["obj_"+item.objType.value]=1
                            var label=self.OneModelDictionary[item.objType.value]
                            if(!label)
                                label=item.objType.value
                            var color=self.getPropertyColor(item.objType.value)
                            jstreeData.push({
                                id:"obj_"+item.objType.value,
                                text: "<span style='color:"+color+"'>"+label+"</span>",
                                parent:"prop_"+item.prop.value,
                                data:{type:"object",id:item.objType.value, label:self.OneModelDictionary[item.objType.value]}
                            })
                        }

                    })

                    var options = {selectTreeNodeFn: ADLbrowser.onSelectJsTreeProperties, openAll: true}

                    common.loadJsTree("ADLbrowser_propertiesJstreeDiv", jstreeData, options)



        })


    }





    self.onSelectJsTreeAspect = function (event, data) {

        if (data.event && data.event.ctrlKey) {
            self.Graph.drawGraph(data.node)
        }
        self.currentAspect = data.node;
        self.loadAspectChildren(data.node)


    }

    self.onSelectJsTreeProperties=function(err, data){
        var node=data.node
      self.Graph.drawExpandGraph(node)




    }

    self.onSelectLeftJstreeItem = function (event, data) {
        if (data.node.parents.length == 1)
            self.currentSource = data.node.id
        self.loadAdlProperties()

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
                common.addNodesToJstree("ADLbrowser_aspectsJstreeDiv", jstreeParent, jstreeData)


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

            var url = Config.sources[self.MDMsource ].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: self.MDMsource}, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })
        }


    }


    self.Graph = {
 clearGraph:function(){
     visjsGraph.clearGraph()
 },
        drawGraph: function (node) {

            if (!self.currentSource)
                return alert("select a source")

            var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct * \n" +
                "FROM <http://data.total.com/resource/one-model/assets/clov/>  from <http://data.total.com/resource/one-model/quantum-mdm/>\n" +
                "WHERE { ?adlConcept <http://data.total.com/resource/one-model#hasTotalMdmUri>  ?totalUri. ?adlConcept rdfs:label ?adlConceptLabel. ?adlConcept rdf:type ?adlType. \n" +
                "?mdmConcept  rdfs:label ?mdmConceptLabel  .?mdmConcept rdfs:subClassOf* ?mdmConceptParent.filter(   ?totalUri =?mdmConcept && ?mdmConceptParent=<" + node.data.id + ">) }  limit 1000"

            var source = self.currentSource
            var url = Config.sources[source].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function (err, result) {
                $("#waitImg").css("display", "none");
                if (err) {
                    return MainController.UI.message(err)
                }
                var data = result.results.bindings
                if (data.length == 0)
                    return MainController.UI.message("no data found")
                $("#waitImg").css("display", "flex");
                var visjsData = {nodes: [], edges: []}
                var existingNodes = visjsGraph.getExistingIdsMap()
                if(!self.currentAdlTypesOnGraph)
                    self.currentAdlTypesOnGraph={}


                data.forEach(function (item) {
                    if(!self.currentAdlTypesOnGraph[item.adlType.value])
                        self.currentAdlTypesOnGraph[item.adlType.value]=0;
                    self.currentAdlTypesOnGraph[item.adlType.value]+=1
                    var color=self.getPropertyColor(item.adlType.value)
                    if (!existingNodes[item.mdmConcept.value]) {
                        existingNodes[item.mdmConcept.value] = 1
                        visjsData.nodes.push({
                            id: item.mdmConcept.value,
                            label: item.mdmConceptLabel.value,
                            shape: "dot",
                            color: color,
                            data: {source: self.currentSource, id: item.mdmConcept.value, label: item.mdmConceptLabel.value}

                        })
                    }

                    if (!existingNodes[item.adlConcept.value]) {
                        existingNodes[item.adlConcept.value] = 1
                        visjsData.nodes.push({
                            id: item.adlConcept.value,
                            label: item.adlConceptLabel.value,
                            shape: "dot",
                            color: color,
                            data: {source: self.currentSource, id: item.adlConcept.value, label: item.adlConceptLabel.value}

                        })
                    }
                    var edgeId = item.adlConcept.value + "_" + item.mdmConcept.value
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1
                        visjsData.edges.push({
                            id: edgeId,
                            from: item.adlConcept.value,
                            to: item.mdmConcept.value,
                        })
                    }


                })
                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    var options={
                        onclickFn:function(node,point,event){
                            if(event.ctrlKey)
                            MainController.UI.showNodeInfos( node.data.source, node.data.id, "mainDialogDiv")



                        }

                    }
                    visjsGraph.draw("graphDiv", visjsData,options)
                } else {

                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                    visjsGraph.network.fit()
                }
                $("#waitImg").css("display", "none");
            })
        }
        ,drawExpandGraph(node){
            if(node.data.type=="property"){

                var fromStr=Sparql_common.getFromStr(self.currentSource)
                var graphNodes=visjsGraph.data.nodes.get();
                var graphNodeIdsStr=""
                graphNodes.forEach(function(item,index){
                    if(index>0)
                        graphNodeIdsStr+=","
                    graphNodeIdsStr+="<"+item.data.id+">"
                })


                var filterStr="filter (?pred=<"+node.data.id+"> && ?sub in ("+graphNodeIdsStr+")) "

                Sparql_INDIVIDUALS.getItems(self.currentSource,{filter:filterStr},function(err, result){
                    if(err)
                        return MainController.UI.message(err);

                    var existingIds=visjsGraph.getExistingIdsMap()
                    var visjsData={nodes:[],edges:[]}

                    result.forEach(function(item){
                        var color=self.getPropertyColor(item.objType.value)

                        if(!existingIds[item.obj.value]){
                            existingIds[item.obj.value]=1
                            visjsData.nodes.push({
                                id:item.obj.value,
                                label:item.objLabel.value,
                                shape:'dot',
                                color:color,
                                data:{source:self.currentSource, id:item.obj.value,
                                    label:item.objLabel.value}

                            })
                        }
                        var edgeId=item.obj.value+"_"+item.sub.value
                        if(!existingIds[edgeId]){
                            existingIds[edgeId]=1
                            visjsData.edges.push({
                                id:edgeId,
                                from :item.obj.value,
                                to:item.sub.value,

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
