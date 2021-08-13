var OwlEditor = (function () {
    var self = {}

    self.shema = {}
    self.editingNodeMap={}
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
                ["superClassFor"]: ["owl:Class"],
                "owl:onProperty": ["owl:ObjectProperty"],
                "valuesFrom": ["owl:Class"],
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
        self.currentSourceData = {name: source, "owl:Class": [], "owl:ObjectProperty": [], "owl:Restriction": []}
        async.series([
            //load Classes
            function (callbackSeries) {
                var options = {filter: "?concept rdf:type owl:Class"}
                Sparql_OWL.getItems(source, options, function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    self.currentSourceData["owl:Class"] = common.array.sort(common.array.distinctValues(result, "concept"),"conceptLabel");
                    callbackSeries()
                })

            }
            //load Object Properties
            , function (callbackSeries) {
                Sparql_OWL.getObjectProperties(source, null, {inheritedProperties:1}, function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    self.currentSourceData["owl:ObjectProperty"] =  common.array.sort(common.array.distinctValues(result, "prop"),"propLabel");
                    callbackSeries()
                })


            }

            //load restrictions
            ,
            function (callbackSeries) {
                Sparql_OWL.getObjectRestrictions(source, null, {}, function (err, result) {
                    if (err)
                        return callbackSeries(err);
                    self.currentSourceData["owl:Restriction"] = result;
                    callbackSeries()

                })
            }

            //draw tree
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
                                type: "owl:Class",
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

                var distinctRestrictionNodes = {}
                self.currentSourceData["owl:Restriction"].forEach(function (item) {
                    if (!distinctRestrictionNodes[item.node.value])
                        distinctRestrictionNodes[item.node.value] = {
                            prop: item.prop.value,
                            propLabel: item.propLabel.value,
                            subClasses: {},
                            values: {}
                        }
                    if (!distinctRestrictionNodes[item.node.value].subClasses[item.concept.value])
                        distinctRestrictionNodes[item.node.value].subClasses[item.concept.value] = {
                            id: item.concept.value,
                            label: item.conceptLabel.value
                        }
                    if (!distinctRestrictionNodes[item.node.value].values[item.value.value])
                        distinctRestrictionNodes[item.node.value].values[item.value.value] = {
                            id: item.value.value,
                            label: item.valueLabel.value
                        }

                })

                for (var nodeId in distinctRestrictionNodes) {
                    var restriction = distinctRestrictionNodes[nodeId];
                    var label = nodeId + " " + restriction.propLabel;


                    if (!distinctIds[nodeId]) {
                        distinctIds[nodeId] = 1


                        jstreeData.push({
                            text: label,
                            id: nodeId,
                            parent: "owl:Restriction",
                            data: {
                                type: "owl:Restriction",
                                label: label,
                                id: nodeId,
                                values: restriction.values,
                                subClasses: restriction.subClasses

                            }
                        })
                    }
                }


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
            if (true || obj.node.data.type == "owl:Class")
                self.editingNodeMap={}
                self.showPropertiesDiv(obj.node.parent, self.currentNode.data)

        }


    }


    self.showPropertiesDiv = function (type, nodeData) {
        var html = "<table>"
        var rangeHtml = "";
        for (var prop in self.shema[type]) {
            var rangeArray = self.shema[type][prop];
            var inputHtml = "";
            var rangeInpuId = (type + "_" + prop).replace(/:/g, "-")
            rangeArray.forEach(function (range) {
                inputHtml += "<tr>"
                inputHtml += "<td><span class='OwlEditorItemPropertyName'>" + prop + "</span></td>" +
                    "</tr>"
                inputHtml += "<tr><td><div  class='OwlEditorItemPropertyDiv' id='OwlEditorItemPropertyDiv_" + rangeInpuId + "'></div></td></tr>"
                inputHtml += "<tr>"
                inputHtml += "<td><div>"
                if (range == "xml:string") {
                    inputHtml += "<input id='" + rangeInpuId + "' value=''>"
                }
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
                inputHtml += "<button onclick=OwlEditor.onAddPropertyButton('" + rangeInpuId + "')>+</button>" +
                    "</div>"
                //
                //
                inputHtml += "</td>"
                inputHtml += "</tr>"
                inputHtml += "<tr><td><hr></td></tr>"

                // inputHtml+="<tr><td></td></td><div id='OwlEditorItemPropertyDiv_"+rangeInpuId+"></div></td></tr>"
            })

            rangeHtml += inputHtml


        }

        html += "<tr><td>" + rangeHtml + "</td></tr>"
        html += "</table>"

        $("#owlEditor_propertiesDiv").html(html);
        setTimeout(function () {
            var prefixes = {
                "http://www.w3.org/1999/02/22-rdf-syntax-ns": "rdf",
                "http://www.w3.org/2002/07/owl": "owl",
                "http://www.w3.org/2000/01/rdf-schema": "rdfs",
                "http://www.w3.org/2004/02/skos/core": "skos"
            }

            if (nodeData) {
                Sparql_generic.getNodeInfos(self.currentSourceData.name, nodeData.id, {}, function (err, result) {
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

                        var valueLabel = "";
                        if (item.valueLabel)
                            valueLabel = item.valueLabel.value
                        else
                            valueLabel = value

                        if (!propsMap[prop]) {
                            propsMap[prop] = []
                        }
                        propsMap[prop].push({label: valueLabel, id: value})




                    })

                    if (self.currentNode.data.type == "owl:Restriction") {//restriction
                        if (!propsMap["superClassFor"])
                            propsMap["superClassFor"] = []
                        if (!propsMap["valuesFrom"])
                            propsMap["valuesFrom"] = []
                        var valuesArray = []
                        for (var key in self.currentNode.data.values) {
                            valuesArray.push(self.currentNode.data.values[key])
                        }
                        var subClassesArray = []
                        for (var key in self.currentNode.data.subClasses) {
                            subClassesArray.push(self.currentNode.data.subClasses[key])
                        }


                        propsMap["superClassFor"].push(subClassesArray)
                        propsMap["valuesFrom"].push(valuesArray)
                    }

                    var otherPropertiesHtml = " <div class=\"OwlEditorItemPropertyName\">Others</div><ul>"
                    for (var prop in propsMap) {
                        if (prop.indexOf("http") < 0) {
                            //if uri is prefixed
                            propsMap[prop].forEach(function (editingData) {

                                rangeInpuId = (type + "_" + prop).replace(/:/g, "-");

                                try {
                                    if ($("#OwlEditorItemPropertyDiv_" + rangeInpuId).length) {


                                        self.addProperty(rangeInpuId,nodeData, editingData)

                                    }
                                } catch (e) {
                                    var x = 3
                                }


                            })
                        } else {

                            otherPropertiesHtml = "<li>" + prop + "<ul>"
                            propsMap[prop].forEach(function (item) {
                                otherPropertiesHtml += "<li>" + item.label + "</li>"
                            })
                            otherPropertiesHtml += "</ul></li>"

                        }
                    }
                    otherPropertiesHtml += "</ul>"
                    $("#owlEditor_otherPropertiesDiv").html(otherPropertiesHtml)
                })


            }


        })


    }
    self.onAddPropertyButton = function (rangeInpuId) {

        var object = $("#" + rangeInpuId).val()
        var element = $("#" + rangeInpuId)
        var objectLabel = ""
        if (element[0].nodeName == "SELECT") {
            objectLabel = $("#" + rangeInpuId + " option:selected").text()
            self.addProperty(rangeInpuId, null,{id: object, label: objectLabel,type:"uri"})
        }
        else {
            objectLabel = object
            self.addProperty(rangeInpuId, null, { label: objectLabel,type:"literal"})
        }


    }
    self.addProperty = function (rangeId,subjectData, objectData) {

        if (!Array.isArray(objectData))
            objectData = [objectData]
        objectData.forEach(function (item) {
            var id = common.getRandomHexaId(5)
            self.editingNodeMap[id]={subjectData:subjectData,objectData:objectData,range:rangeId}
            var html = "<div class='OwlEditorItemPropertyValueDiv2' id='" + id + "'>" +
                " <div class='OwlEditorItemPropertyValueDiv'>" + item.label + "</div>&nbsp;" +
                "<button onclick='OwlEditor.deleteRange(\"" + id + "\")'>-</button>" +
                "</div>"

            $("#OwlEditorItemPropertyDiv_" + rangeId).prepend(html)
            $("#" + rangeId).val("");
        })


    }

    self.deleteRange = function (divId) {
        $("#" + divId).remove();
        delete self.editingNodeMap[divId]

    }
    self.newItem = function () {
        var type = self.currentNode.data.type
        self.showPropertiesDiv(type)
    }

    self.saveEditingNode=function(){

        var triples=[];
        for(var divId in self.editingNodeMap){
            var objectData=self.editingNodeMap[divId].objectData;
            var subjectData=self.editingNodeMap[divId].subjectData;
            var array=self.editingNodeMap[divId].range.split("_");
            var type=array[0].replace(/\-/g,":")


            var isNew=false;
            var predicate=array[1].replace(/\-/g,":")
            var subjectUri;
            objectData.forEach(function(item){
            var objectStr;
            if(objectData.type=="uri"){
                objectStr=item.id
            }else{
                objectStr="'"+item.label+"'"
            }

            if(subjectData) {
                subjectUri = subjectData.id;

            }
            else {
                subjectUri = Config.sources[self.currentSourceData.name].graphUri + common.getRandomHexaId();
                isNew=true;
            }
            var triple={
                subject:subjectUri,
                predicate:predicate,
                object:objectStr,
            }

            triples.push(triple)
            })
        }

        var x=triples;

        /*
        WITH <http://example/addresses>
DELETE { ?person foaf:firstName 'Bill' }
INSERT { ?person foaf:firstName 'William' }
WHERE
  { ?person a foaf:Person .
    ?person foaf:firstName 'Bill'
  }

         */
    }


    return self;
})()