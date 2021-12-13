var OwlEditor = (function () {
    var self = {}

    self.shema = {}
    self.editingNodeMap = {}
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
        var graphUri = Config.sources[source].graphUri
        if (Array.isArray(graphUri))
            graphUri = graphUri[0]
        self.currentSourceData = {
            name: source,
            graphUri: graphUri,
            "owl:Class": [],
            "owl:ObjectProperty": [],
            "owl:Restriction": []
        };
        var imports =
            async.series([
                //load Classes
                function (callbackSeries) {
                    var options = {filter: "?concept rdf:type owl:Class", selectGraph: 1}
                    Sparql_OWL.getItems(source, options, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        self.currentSourceData["owl:Class"] = common.array.sort(common.array.distinctValues(result, "concept"), "conceptLabel");
                        callbackSeries()
                    })

                }
                //load Object Properties
                , function (callbackSeries) {
                    Sparql_OWL.getObjectProperties(source, null, {selectGraph: 1}, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        self.currentSourceData["owl:ObjectProperty"] = common.array.sort(common.array.distinctValues(result, "prop"), "propLabel");
                        callbackSeries()
                    })


                }

                //load restrictions
                ,
                function (callbackSeries) {
                    Sparql_OWL.getObjectRestrictions(source, null, {selectGraph: 1}, function (err, result) {
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
                            type: key,
                            parent: "#",
                            data: {type: key, id: key}
                        })

                    }
                    var distinctIds = {}
                    var rootClass = "http://www.w3.org/2002/07/owl#Thing"
                    self.currentSourceData["owl:Class"].forEach(function (item) {
                        if (!distinctIds[item.concept.value]) {
                            distinctIds[item.concept.value] = 1

                            var type = "owl:Class";
                            if (item.g && item.g.value != self.currentSourceData.graphUri)
                                type = "importedClass";

                            var parent = "owl:Class";
                            if (item.superClass && item.concept.value != rootClass)
                                parent = item.superClass.value
                            var graphUri = null;
                            if (item.g)
                                graphUri = item.g.value
                            jstreeData.push({
                                text: item.conceptLabel.value,
                                id: item.concept.value,
                                parent: parent,
                                type: type,
                                data: {
                                    type: type,
                                    label: item.conceptLabel.value,
                                    id: item.concept.value,
                                    graphUri: graphUri
                                }
                            })
                        }

                    })
                    if (!distinctIds[rootClass]) {
                        jstreeData.push({
                            text: "owl:Thing",
                            id: rootClass,
                            parent: "owl:Class",
                            type: "importedClass",
                            data: {
                                type: "importedClass",
                                label: "owl:Thing",
                                id: rootClass,
                            }
                        })
                    }

                    self.currentSourceData["owl:ObjectProperty"].forEach(function (item) {
                        if (!distinctIds[item.prop.value]) {
                            distinctIds[item.prop.value] = 1


                            var type = "owl:ObjectProperty";
                            if (item.g && item.g.value != self.currentSourceData.graphUri)
                                type = "importedProperty";


                            var parent = "owl:ObjectProperty";
                            if (item.subProp)
                                parent = item.subProp.value;
                            jstreeData.push({
                                text: item.propLabel.value,
                                id: item.prop.value,
                                parent: parent,
                                type: type,
                                data: {
                                    type: type,
                                    label: item.propLabel.value,
                                    id: item.prop.value,
                                    parent: parent
                                }
                            })
                        }
                    })

                    var distinctRestrictionNodes = {}
                    self.currentSourceData["owl:Restriction"].forEach(function (item) {
                        var type = "owl:Restriction";
                        if (item.g && item.g.value != self.currentSourceData.graphUri)
                            type = "importedRestriction";

                        if (!distinctRestrictionNodes[item.node.value])
                            distinctRestrictionNodes[item.node.value] = {
                                prop: item.prop.value,
                                propLabel: item.propLabel.value,
                                subClasses: {},
                                values: {},
                                type: type
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
                                type: restriction.type,
                                data: {
                                    type: restriction.type,
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
                        if (jstreeData.length < 300)
                            $("#" + jstreeDivId).jstree().open_all()
                        common.jstree.openNodeDescendants(jstreeDivId, "owl:ObjectProperty")
                    })

                    callbackSeries()
                }


            ], function (err) {


            })


    }


    self.onSelectTreeNode = function (event, obj) {
        if (obj.node.data.type.indexOf("imported") == 0) {
            var html = "<div class='OwlEditorItemSubjectUri'> " + obj.node.data.label + " imported (not editable)" + "</div><div id='owlEditor_ImportedObjInfosDiv'></div>"
            $("#owlEditor_propertiesDiv").html(html);
            Sparql_generic.getNodeInfos(self.currentSourceData.name, obj.node.data.id, {}, function (err, result) {
                SourceEditor.showNodeInfos("owlEditor_ImportedObjInfosDiv", null, obj.node.data.id, result)
            })
            return;
        }
        self.currentNode = obj.node;

        $("#owlEditor_messageDiv").html("")
        if (obj.node.parent != "#") {
            if (true || obj.node.data.type == "owl:Class")
                self.editingNodeMap = {}
            self.showPropertiesDiv(obj.node.data.type, self.currentNode.data)

        }


    }


    self.showPropertiesDiv = function (type, nodeData) {
        var html = "<table>"
        html += "<tr>"

        var subject = "New  " + type + " ";
        if (nodeData)
            subject = "About : " + nodeData.label + "    " + nodeData.id
        html += "<td><span class='OwlEditorItemSubjectUri'> " + subject + "</span></td>" +
            "</tr>"
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
                    inputHtml += "<input  class='newPropertyInput' id='" + rangeInpuId + "' value=''>"
                } else {
                    inputHtml += "<select class='newPropertyInput' id='" + rangeInpuId + "' >"
                    inputHtml += "<option></option>"


                    self.currentSourceData[range].forEach(function (item) {
                        if (item.concept)
                            inputHtml += "<option  value='" + item.concept.value + "'>" + item.conceptLabel.value + "</option>"
                        else if (item.prop)
                            inputHtml += "<option value='" + item.prop.value + "'>" + item.propLabel.value + "</option>"


                    })
                    inputHtml += "<option value='" + "http://www.w3.org/2002/07/owl#Thing" + "'>" + "Thing" + "</option>"


                    inputHtml += "</select>"


                }
                inputHtml += "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick=OwlEditor.onAddPropertyButton('" + rangeInpuId + "')>+</button>" +
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
            if(self.currentNode.data.isNew && $("#owl-Class_rdfs-subClassOf").length){

                $("#owl-Class_rdfs-subClassOf").val(self.currentNode.data.parent)
            }
            $(".newPropertyInput").bind("blur", function (event) {
                self.onAddPropertyButton($(this).attr("id"))

            })

            if (nodeData) {
                Sparql_generic.getNodeInfos(self.currentSourceData.name, nodeData.id, {}, function (err, result) {
                    var propsMap = {}
                    self.readOnlyPredicates = [];
                    result.forEach(function (item) {

                        var prop = item.prop.value

                        // only props corresponding to mapped prefixes are modifiable
                        var array = prop.split("#")
                        if (prefixes[array[0]])
                            prop = prefixes[array[0]] + ":" + array[1]
                        else {
                            self.readOnlyPredicates.push(item)

                        }


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


                                        self.addProperty(rangeInpuId, nodeData, editingData)

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
            self.addProperty(rangeInpuId, self.currentNode.data, {id: object, label: objectLabel, type: "uri"})
        } else {
            objectLabel = object
            self.addProperty(rangeInpuId, self.currentNode.data, {id: objectLabel, label: objectLabel, type: "literal"})
        }


    }
    self.addProperty = function (rangeId, subjectData, objectData) {

        if (!Array.isArray(objectData))
            objectData = [objectData]
        objectData.forEach(function (item) {
            var id = common.getRandomHexaId(5)
            self.editingNodeMap[id] = {subjectData: subjectData, objectData: objectData, range: rangeId}
            var html = "<div class='OwlEditorItemPropertyValueDiv2' id='" + id + "'>" +
                " <div class='OwlEditorItemPropertyValueDiv'>" + item.label + "</div>&nbsp;" +
                "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='OwlEditor.deleteRange(\"" + id + "\")'>-</button>" +
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
        if (!self.currentNode)
            return alert("Select a type")
        var type = self.currentNode.data.type;
        var newId = Config.sources[self.currentSourceData.name].graphUri + common.getRandomHexaId(10)
        var parent = self.currentNode.data.id
        self.currentNode = {data: {id: newId, type: type, parent: parent, isNew: true}}

        self.showPropertiesDiv(type, self.currentNode)
    }

    self.saveEditingNode = function () {

        var triples = [];
        var newNodeLabel=""
        for (var divId in self.editingNodeMap) {
            var objectData = self.editingNodeMap[divId].objectData;
            var subjectData = self.editingNodeMap[divId].subjectData;
            var array = self.editingNodeMap[divId].range.split("_");
            var type = array[0].replace(/\-/g, ":")




            var predicate = array[1].replace(/\-/g, ":")

            var subjectUri;
            objectData.forEach(function (item) {
                var objectStr;
                if (objectData.type == "uri") {
                    objectStr = item.id
                } else {
                    objectStr = item.id
                }

                if (subjectData) {
                    subjectUri = subjectData.id;

                }
                var triple = {
                    subject: subjectUri,
                    predicate: predicate,
                    object: objectStr,

                }
                if(predicate=="rdfs:label")
                    newNodeLabel=item.id

                triples.push(triple)
            })
        }

        var x = triples;

        function tripleToStr(triple) {
            var str = "<" + triple.subject + "> " + triple.predicate + " "
            if (triple.object.indexOf("http:") > -1)
                str += "<" + triple.object + ">.\n"
            else if (triple.object.indexOf(":") > -1)
                str += triple.object + ".\n"
            else
                str += "'" + triple.object + "'.\n"

            return str;
        }

        var graphUri = Config.sources[self.currentSourceData.name].graphUri;
        if (Array.isArray(graphUri))
            graphUri = graphUri[0]

        var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>"

        query += "    WITH <" + graphUri + ">"
        if (!self.currentNode.data.isNew) {
            query += " DELETE { <" + self.currentNode.data.id + "> ?p ?o. } "
        }
        query += " INSERT { "

        triples.forEach(function (item, index) {
            if (index == 0) {
                query += "<" + subjectData.id + "> rdf:type " + subjectData.type + ".\n"
            }
            query += tripleToStr(item);


        })
        if (self.readOnlyPredicates) {
            self.readOnlyPredicates.forEach(function (item) {
                var triple = {
                    subject: self.currentNode.data.id,
                    predicate: "<" + item.prop.value + ">",
                    object: item.value.value
                }
                query += tripleToStr(triple);
            })
        }

        query += " }"


        Sparql_proxy.querySPARQL_GET_proxy(Config.sources[self.currentSourceData.name].sparql_server.url, query, "", {source: self.currentSourceData.name}, function (err, result) {

            if (err)
                return $("#owlEditor_messageDiv").html(err)

            $("#owlEditor_messageDiv").html(" data saved")
            if (self.currentNode.data.isNew) {
                var jstreeData = {
                    id: subjectData.id,
                    label: newNodeLabel,
                    parent: subjectData.parent,
                    data: {
                        id: subjectData.id,
                        label:newNodeLabel,
                        type: subjectData.type
                    }
                }
            }
            common.jstree.addNodesToJstree("owlEditor_jstreeDiv", subjectData.parent, jstreeData)


            return
        })
    }


    return self;
})()