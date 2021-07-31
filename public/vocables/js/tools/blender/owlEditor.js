var OwlEditor = (function () {
    var self = {}


    /*

    @prefix dc: <http://purl.org/dc/elements/1.1/> .
@prefix grddl: <http://www.w3.org/2003/g/data-view#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xml: <http://www.w3.org/XML/1998/namespace> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .


    ###  http://standards.iso.org/iso/15926/part14/concretizes
lis:concretizes rdf:type owl:ObjectProperty ;
                rdfs:domain [ rdf:type owl:Class ;
                              owl:unionOf ( lis:Activity
                                            lis:Feature
                                          )
                            ] ;
                rdfs:range lis:InformationObject ;
                lis:relatedEntityISO15926 lis12:InformationObject ;
                rdfs:comment "Inspired by BFO's \"concretizes\". Note that the ISO 15926-14 definition diverges slightly from that in BFO, mainly in employing Feature where BFO has \"specifically dependent continuant\"." ,
                             "TODO. Consider splitting this into two relations, one concretizesInFeature and another concretizesInActivity, to avoid a disjunctive domain." ;
                rdfs:label "concretizes" ;
                rdfs:seeAlso obo:BFO_0000164 ,
                             obo:RO_0000059 ;
                skos:prefLabel "concretizes" .



###  http://standards.iso.org/iso/15926/part14/System
lis:System rdf:type owl:Class ;
           rdfs:subClassOf lis:FunctionalObject ,
                           [ rdf:type owl:Restriction ;
                             owl:onProperty lis:hasFunctionalPart ;
                             owl:someValuesFrom lis:FunctionalObject
                           ] ;
           lis:relatedEntityISO15926 lis2:FunctionalPhysicalObject ,
                                     lis12:FunctionalPhysicalObject ;
           rdfs:comment "A system is a complex of functional parts working together. Each part contributes to the realisation of the system's function (though not necessarily every part in every performance of the system)." ;
           rdfs:label "System" ;
           skos:note "A functional location that does not itself have functional parts is not a system." ;
           skos:prefLabel "System" .

<owl:Restriction>
                <owl:onProperty rdf:resource="http://standards.iso.org/iso/15926/part14/hasQuality"/>
                <owl:someValuesFrom rdf:resource="http://w3id.org/readi/rdl/D101001534"/>
            </owl:Restriction>




     */
    self.shema = {}
    self.initSchema = function () {
        self.shema = {
            "owl:Class": {
                ["rdfs:subClassOf"]: ["owl:Class"],
                ["rdfs:label"]: ["xml:string"],
                ["rdfs:comment"]: ["xml:string"],


            },
            "owl:ObjectProperty": {
                ["rdfs:range"]: ["owl:Class"],
                ["rdfs:domain"]: ["owl:Class"],
                ["rdfs:subPropertyOf"]: ["owl:ObjectProperty"],
                ["rdfs:label"]: ["xml:string"],
                ["rdfs:comment"]: ["xml:string"],

            },
            "owl:DataTypeProperty": {},


            "owl:Restriction": {
                "owl:onProperty": ["owl:ObjectProperty"],
                "owl:someValuesFrom": ["owl:Class"],
                ["rdfs:label"]: ["xml:string"],
                ["rdfs:comment"]: ["xml:string"],

            },



        }
    }

    self.loadUI = function () {
        $("#mainDialogDiv").load("snippets/blender/owlEditor.html")
        $("#mainDialogDiv").dialog("open")

        setTimeout(function () {
            self.initSchema()
            self.loadSources()
        }, 500)
    }


    self.loadSources = function () {
        var payload = {
            getBlenderSources: 1,
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {


                self.availableSources = [];
                for (var key in data) {
                    if (data[key].editable && data[key].schemaType == "OWL") {
                        Config.sources[key] = data[key]
                        if (!Config.sources[key].controllerName) {
                            Config.sources[key].controllerName = "" + Config.sources[key].controller
                            Config.sources[key].controller = eval(Config.sources[key].controller)
                        }
                        if (Config.sources[key].sparql_server.url == "_default")
                            Config.sources[key].sparql_server.url = Config.default_sparql_url


                        self.availableSources.push(key)
                    }
                }

                common.fillSelectOptions("owlEditor_SourcesSelect", self.availableSources.sort(), true)

            }
            , error: function (err) {
                alert("cannot load OWL Sources")
                console.log(err);
            }
        })


    }

    self.loadSource = function (source) {
        if (source == "")
            return
        self.currentSourceData = {name: source, "owl:Class": [], "owl:ObjectProperty": [], "owl:restriction": []}
        async.series([
            //load Classes
            function (callbackSeries) {
                var options = {filter: "?concept rdf:type owl:Class"}
                Sparql_OWL.getItems(source, options, function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    self.currentSourceData["owl:Class"] = common.array.distinctValues(result, "concept").sort();
                    callbackSeries()
                })

            }
            //load Object Properties
            , function (callbackSeries) {
                Sparql_OWL.getObjectProperties(source, null, {}, function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    self.currentSourceData["owl:ObjectProperty"] = common.array.distinctValues(result, "prop").sort();
                    callbackSeries()
                })


            }
            ,
            function (callbackSeries) {
                callbackSeries()


            }
            , function (callbackSeries) {
                var jstreeDivId = "owlEditor_jstreeDiv"
                self.initSchema()
                var jstreeData = [];
                for (var key in self.shema) {
                    jstreeData.push({
                        text: key,
                        id: key,
                        parent: "#",
                        data: {type: key, id: key}
                    })

                }
                var distinctIds = {}
                self.currentSourceData["owl:Class"].forEach(function (item) {
                    if (!distinctIds[item.concept.value]) {
                        distinctIds[item.concept.value] = 1

                        jstreeData.push({
                            text: item.conceptLabel.value,
                            id: item.concept.value,
                            parent: "owl:Class",
                            data: {
                                type: "owlClass",
                                label: item.conceptLabel.value,
                                id: item.concept.value,
                            }
                        })
                    }
                })
                self.currentSourceData["owl:ObjectProperty"].forEach(function (item) {
                    if (!distinctIds[item.prop.value]) {
                        distinctIds[item.prop.value] = 1

                        jstreeData.push({
                            text: item.propLabel.value,
                            id: item.prop.value,
                            parent: "owl:ObjectProperty",
                            data: {
                                type: "owl:ObjectProperty",
                                label: item.propLabel.value,
                                id: item.prop.value,
                            }
                        })
                    }
                })


                var options = {selectTreeNodeFn: OwlEditor.onSelectTreeNode}
                common.jstree.loadJsTree(jstreeDivId, jstreeData, options, function (err, result) {

                })

                callbackSeries()
            }


        ], function (err) {


        })


    }


    self.onSelectTreeNode = function (event, obj) {
        self.currentNode = obj.node;
        if (obj.node.parent != "#") {
            self.showPropertiesDiv(obj.node.parent, self.currentNode.data.id)
        }


    }

    self.showPropertiesDiv = function (type, nodeId) {
        var html = "<table>"
        var rangeHtml = "";
        for (var prop in self.shema[type]) {
            var rangeArray = self.shema[type][prop];
            var inputHtml = "";
            var rangeInpuId = (type + "_" + prop).replace(/:/g,"-")
            rangeArray.forEach(function (range) {
                inputHtml += "<tr>"
                inputHtml += "<td>" + prop + "</td>"
                inputHtml += "<td>"
                if (range == "xml:string")
                    inputHtml += "<input id='" + rangeInpuId + "' value=''>"
                else {
                    inputHtml += "<select id='" + rangeInpuId + "' >"
                    inputHtml += "<option></option>"


                    self.currentSourceData[range].forEach(function (item) {
                        if (item.concept)
                            inputHtml += "<option  value='" + item.concept.value + "'>" + item.conceptLabel.value + "</option>"
                        else if (item.prop)
                            inputHtml += "<option value='" + item.prop.value + "'>" + item.propLabel.value + "</option>"


                    })



                    inputHtml += "</select>"


                }
                inputHtml+="<button onclick=OwlEditor.addProperty('"+rangeInpuId+"')>+</button>"
              //
                //
                inputHtml+="</td>"
                inputHtml += "</tr>"
                inputHtml+="<tr><td></td><td><div id='OwlEditorItemPropertyDiv_"+rangeInpuId+"'></div></td></tr>"
               // inputHtml+="<tr><td></td></td><div id='OwlEditorItemPropertyDiv_"+rangeInpuId+"></div></td></tr>"
            })

            rangeHtml += inputHtml


        }

        html += "<tr><td>" + rangeHtml + "</td></tr>"
        html += "</table>"

        $("#owlEditor_propertiesDiv").html(html);
        setTimeout(function () {
            var prefixes={
                "http://www.w3.org/1999/02/22-rdf-syntax-ns":"rdf",
                "http://www.w3.org/2002/07/owl":"owl",
                "http://www.w3.org/2000/01/rdf-schema":"rdfs",
            }

            if (nodeId) {
                Sparql_generic.getNodeInfos(self.currentSourceData.name, nodeId, {}, function (err, result) {
                    var propsMap = {}
                    result.forEach(function (item) {
                        var prop = item.prop.value
                        var array = prop.split("#")
                        if (prefixes[array[0]])
                            prop = prefixes[array[0]] + ":" + array[1]


                        var value = item.value.value
                        var array = value.split("#")
                        if (prefixes[array[0]])
                            value = prefixes[array[0]] + ":" + array[1]

                        if (!propsMap[prop]) {
                            propsMap[prop] = []
                        }
                        propsMap[prop].push(value)

                    })

                    for (var prop in propsMap) {
                        propsMap[prop].forEach(function (item) {

                            rangeInpuId=(type+"_"+prop).replace(/:/g,"-");
                            if( $("#OwlEditorItemPropertyDiv_"+rangeInpuId).length ) {
                                var id = common.getRandomHexaId(3)
                                var html = "<div id='" + id + "'> <span>" + item + "</span><button onclick='OwlEditor.deleteRange(\"" + id + "\")'>-</button>"
                                $("#OwlEditorItemPropertyDiv_" + rangeInpuId).prepend(html)
                            }


                        })
                    }

                    })



            }


        })


    }
    self.addProperty=function(rangeInpuId){

        var object=$("#"+rangeInpuId).val()
        var element=$("#"+rangeInpuId)
        var objectLabel=""
        if(element[0].nodeName== "SELECT")
         objectLabel=$("#"+rangeInpuId +" option:selected").text()
        else
            objectLabel=object


var id=common.getRandomHexaId(3)
        var html="<div id='"+id+"'> <span>"+objectLabel+"</span><button onclick='OwlEditor.deleteRange(\""+id+"\")'>-</button>"
        $("#OwlEditorItemPropertyDiv_"+rangeInpuId).prepend(html)





    }

    self.deleteRange=function(divId){
        $("#"+divId).remove();

    }
    self.newItem = function () {
        var type = self.currentNode.data.type
        self.showPropertiesDiv(type)
    }


    return self;
})()