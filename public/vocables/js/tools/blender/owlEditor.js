var OwlEditor = (function () {
    var self = {}
    
    self.shema = {}
    self.initSchema = function () {
        self.shema = {
            "owl:Class": {
                ["rdfs:label"]: ["xml:string"],
                ["rdfs:subClassOf"]: ["owl:Class"],
                ["rdfs:comment"]: ["xml:string"],


            },
            "owl:ObjectProperty": {
                ["rdfs:label"]: ["xml:string"],
                ["rdfs:range"]: ["owl:Class"],
                ["rdfs:domain"]: ["owl:Class"],
                ["rdfs:subPropertyOf"]: ["owl:ObjectProperty"],
                ["rdfs:comment"]: ["xml:string"],

            },
            "owl:DataTypeProperty": {},


            "owl:Restriction": {
                ["rdfs:label"]: ["xml:string"],
                "owl:onProperty": ["owl:ObjectProperty"],
                "owl:someValuesFrom": ["owl:Class"],
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
                inputHtml+="<button onclick=OwlEditor.onAddPropertyButton('"+rangeInpuId+"')>+</button>"
              //
                //
                inputHtml+="</td>"
                inputHtml += "</tr>"
                inputHtml+="<tr><td></td><td><div  class='OwlEditorItemPropertyDiv' id='OwlEditorItemPropertyDiv_"+rangeInpuId+"'></div></td></tr>"
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

                        var valueLabel="";
                        if(item.valueLabel)
                            valueLabel=item.valueLabel.value
                        else
                            valueLabel=value

                        if (!propsMap[prop]) {
                            propsMap[prop] = []
                        }
                        propsMap[prop].push({label:valueLabel,id:value})

                    })

                    for (var prop in propsMap) {
                        propsMap[prop].forEach(function (item) {

                            rangeInpuId=(type+"_"+prop).replace(/:/g,"-");
                            if( $("#OwlEditorItemPropertyDiv_"+rangeInpuId).length ) {

                                self.addProperty(rangeInpuId, item)

                            }


                        })
                    }

                    })



            }


        })


    }
    self.onAddPropertyButton=function(rangeInpuId){

        var object=$("#"+rangeInpuId).val()
        var element=$("#"+rangeInpuId)
        var objectLabel=""
        if(element[0].nodeName== "SELECT")
         objectLabel=$("#"+rangeInpuId +" option:selected").text()
        else
            objectLabel=object


        self.addProperty(rangeInpuId, {id:object, label:objectLabel})





    }
    self.addProperty=function(rangeId,data){


        var id=common.getRandomHexaId(5)
        var html="<div class='OwlEditorItemPropertyValueDiv2' id='"+id+"'>" +
            " <div class='OwlEditorItemPropertyValueDiv'>"+data.label+"</div>&nbsp;" +
            "<button onclick='OwlEditor.deleteRange(\""+id+"\")'>-</button>" +
            "</div>"

        $("#OwlEditorItemPropertyDiv_"+rangeId).prepend(html)





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