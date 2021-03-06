/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Individuals = (function () {

        var self = {}
        self.currentSource = null;
        self.prefixes = {
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdfs",
            "http://www.w3.org/2002/07/owl#": "owl",
            "http://data.total.com/resource/one-model/ontology/": "total"


        }
        self.subjectPropertiesMap = {}

        var constraintsMap = {}
        self.onLoaded = function () {
            $("#graphDiv").load("./snippets/individuals.html");

        }
        self.onSourceSelect = function (source) {
            self.currentSource = source;
            OwlSchema.currentSourceSchema = null;


            setTimeout(function () {
                self.loadOntology();
                self.newTripleMapping()
            }, 200)


        }


        self.jstreeContextMenu = function (type) {
            function getSelectedNode(e) {
                var treeId = e.reference.context.id
                return $("#" + treeId).jstree(true).get_selected(true)[0]
            }

            var items = {};
            if (!type)
                return;
            if (type == "Column") {
                items.tripleSubject = {
                    label: "tripleSubject",
                    action: function (e) {// pb avec source
                        var ss = getSelectedNode(e)
                        self.setTripleObject("Subject", getSelectedNode(e).data)
                    }

                }
                items.newTripleSubject = {
                    label: "newTripleSubject",
                    action: function (e) {
                        var x = e.reference.prevObject[0]
                        self.setTripleObject("Subject", getSelectedNode(e).data, true)
                    }

                }
                items.tripleObject = {
                    label: "tripleObject",
                    action: function (e) {
                        var x = e.reference.prevObject[0]
                        var text = x.innerText
                        self.setTripleObject("Object", getSelectedNode(e).data)
                    }
                }


            } else if (type == "Class") {
                items.tripleObject = {
                    label: "tripleObject",
                    action: function (e) {
                        var x = e.reference.prevObject[0]
                        var text = x.innerText
                        self.setTripleObject("Object", getSelectedNode(e).data)
                    }
                }


            } else if (type == "Property") {
                items.triplePredicate = {
                    label: "triplePredicate",
                    action: function (e) {
                        var x = e.reference.prevObject[0]
                        var text = x.innerText
                        self.setTripleObject("Predicate", getSelectedNode(e).data)
                    }
                }

            }
            return items
        }


        self.setTripleObject = function (type, nodeData, newTripleDiv) {


            if (newTripleDiv)
                self.newTripleMapping()
            setTimeout(function () {
                var div = $("#" + self.currentMappingTripleDiv + " .mapping" + type);
                $(div).html(nodeData.id)
                if (type == "Subject") {
                    self.currentSubject = {id: nodeData.id, type: ""}

                    self.setConstaintsFilter("Subject", nodeData.id)
                }
                if (type == "Object") {
                    self.newTripleMapping()
                    if (self.currentPropertyJstreeNode.id == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
                        if (!self.subjectPropertiesMap[nodeData.id])
                            self.subjectPropertiesMap[nodeData.id] = []
                    self.subjectPropertiesMap [nodeData.id] = self.currentSubject.id
                }

            }, 200)
        }


        self.newTripleMapping = function () {
            var index = common.getNewId("mappingTripleCell")
            var id = "mappingTriple_" + index
            self.currentMappingTripleDiv = id;

            var subjectValue = self.currentModelJstreeNode ? self.currentModelJstreeNode.data.id : ""
            var html = "<div class=mappingTriple id='" + id + "' onclick='Individuals.selectMappingTriple($(this))'>" +
                "<div class='mappingTripleCell mappingSubject'>" + subjectValue + "</div>" +
                "<div class='mappingTripleCell mappingPredicate'></div>" +
                "<div class='mappingTripleCell mappingObject'></div>" +
                "<div class='mappingTripleButton mappingTripleCell ' style='min-width:20px' onclick='Individuals.deleteTripleDiv($(this))'>X</div> " +

                "</div>"
            $("#Individuals_mappingsTriplesDiv").append(html)
            self.selectMappingTriple($("#" + id))

        }

        self.deleteTripleDiv = function (div) {
            $(div).parent().remove()
        }

        self.selectMappingTriple = function (div) {
            $(".mappingTriple").removeClass("mappingTripleSelected")
            $(div).addClass("mappingTripleSelected")
            self.currentMappingTripleDiv = $(div).attr("id")
        }

        self.displayMappings = function () {
            var data = [];
            $(".mappingTriple").each(function () {
                var subject = $(this).find(".mappingSubject").html()
                var predicate = $(this).find(".mappingPredicate").html()
                var object = $(this).find(".mappingObject").html()
                data.push({
                    subject: subject,
                    predicate: predicate,
                    object: object

                })

            })


            $("#mainDialogDiv").html(JSON.stringify(data, null, 2))
            $("#mainDialogDiv").dialog("open")

        }


        self.setConstaintsFilter = function (type, nodeId) {


            var treeDivId;
            var filteredItems = []
            var jstreeDiv;
            if (type == "Subject") {
                jstreeDiv = "Individuals_ontologyPropertiesTree"
             //   filteredItems = constraintsMap.domains[nodeId]
                if (self.subjectPropertiesMap[nodeId]) {
                    filteredItems =constraintsMap.properties[self.currentSubject.type]
                }
               else {
                    filteredItems = constraintsMap.domains['default']
                }
            } else if (type == "Class") {
                if (self.currentPropertyJstreeNode == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
                    self.currentSubject.type = node.id
                jstreeDiv = "Individuals_ontologyPropertiesTree"
                filteredItems = constraintsMap.domains[nodeId] || []
                filteredItems.splice(0, 0, "http://www.w3.org/2000/01/rdf-schema#label");
                filteredItems.splice(0, 0, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type");


            } else if (type == "Property") {
                jstreeDiv = "Individuals_ontologyClassesTree"
                if (nodeId == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
                    filteredItems = constraintsMap.properties[nodeId] || []
                else {
                    if (self.subjectPropertiesMap[nodeId])
                        filteredItems = filteredItems.concat(self.subjectPropertiesMap[nodeId])

                }

            }

            $('#Individuals_ontologyClassesTree').jstree(true).hide_all()
            $('#Individuals_ontologyPropertiesTree').jstree(true).hide_all()

            $('#' + jstreeDiv).jstree(true).hide_all()
            if (!filteredItems)
                return
            var jsonNodes = $('#' + jstreeDiv).jstree(true).get_json("#", {flat: true});
            jsonNodes.forEach(function (item) {
                var ok = false

                if (filteredItems.indexOf("any") > -1)
                    ok = true
                else if (filteredItems.indexOf(item.id) > -1)
                    ok = true

                if (ok)
                    $('#' + jstreeDiv).jstree(true).show_node(item.id);

            });
        }


        self.loadOntology = function () {

            var classJstreeData = []
            var depth = 5;
            var propertyJstreeData = [{
                id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                text: "type",
                parent: "#",
                data: {type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", label: "type", source: self.currentSource}
            },
                {
                    id: "http://www.w3.org/2000/01/rdf-schema#label",
                    text: "label",
                    parent: "#",
                    data: {type: "http://www.w3.org/2000/01/rdf-schema#label", id: "http://www.w3.org/2000/01/rdf-schema#label", label: "label", source: self.currentSource}
                }]

            async.series([

                    //loadClasses
                    function (callbackSeries) {

                        Sparql_OWL.getNodeChildren(self.currentSource, null, null, depth, null, function (err, result) {
                            var existingNodes = {}

                            result.forEach(function (item) {
                                if (item.concept.value.indexOf("http") != 0)
                                    return
                                if (!existingNodes[item.concept.value]) {
                                    existingNodes[item.concept.value] = 1

                                    var obj = {
                                        id: item.concept.value,
                                        text: item.conceptLabel.value,
                                        parent: "#",
                                        data: {type: "Class", id: item.concept.value, label: item.conceptLabel.value, source: self.currentSource}

                                    }
                                    classJstreeData.push(obj);
                                    for (var i = 1; i < depth; i++) {
                                        if (item["child" + i]) {
                                            var id = item["child" + i].value;
                                            if (!existingNodes[id]) {
                                                existingNodes[id] = 1
                                                var label = item["child" + i + "Label"].value;

                                                var obj = {
                                                    id: id,
                                                    text: label,
                                                    parent: (i == 1 ? item.concept.value : item["child" + (i - 1)].value),
                                                    data: {type: "Class", id: id, label: label, source: self.currentSource}

                                                }
                                                classJstreeData.push(obj);

                                            }
                                        }
                                    }


                                }
                            })
                            callbackSeries(err)
                        })
                    },
                    //draw classesTree
                    function (callbackSeries) {
                        var optionsClass = {
                            selectTreeNodeFn: function (event, obj) {
                                self.currentClassJstreeNode = obj.node
                                self.currentJstreeNode = obj.node
                                self.setConstaintsFilter("Class", obj.node.data.id)
                                self.setTripleObject("Object", obj.node.data)
                            },
                            // contextMenu: self.jstreeContextMenu("Class"),
                            openAll: true
                        }
                        common.jstree.loadJsTree("Individuals_ontologyClassesTree", classJstreeData, optionsClass)
                        callbackSeries()
                    }
                    ,
                    //loadProperties
                    function (callbackSeries) {
                        var filter = " ?concept rdf:type owl:ObjectProperty"
                        Sparql_OWL.getItems(self.currentSource, {filter: filter}, function (err, result) {
                            if (err)
                                return MainController.UI.message(message)

                            var classJstreeData = []
                            var propertyJstreeData = [{
                                id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                text: "type",
                                parent: "#",
                                data: {type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", label: "type", source: self.currentSource}
                            },
                                {
                                    id: "http://www.w3.org/2000/01/rdf-schema#label",
                                    text: "label",
                                    parent: "#",
                                    data: {type: "http://www.w3.org/2000/01/rdf-schema#label", id: "http://www.w3.org/2000/01/rdf-schema#label", label: "label", source: self.currentSource}
                                }]
                            var existingNodes = {}
                            result.forEach(function (item) {
                                if (!existingNodes[item.concept.value]) {
                                    existingNodes[item.concept.value] = 1

                                    var obj = {
                                        id: item.concept.value,
                                        text: item.conceptLabel.value,
                                        parent: "#",
                                        data: {type: item.conceptType.value, id: item.concept.value, label: item.conceptLabel.value, source: self.currentSource}

                                    }

                                    if (item.conceptType.value == "http://www.w3.org/2002/07/owl#ObjectProperty") {
                                        propertyJstreeData.push(obj)
                                    }
                                }


                            })

                            var optionsProperty = {
                                selectTreeNodeFn: function (event, obj) {
                                    self.currentPropertyJstreeNode = obj.node
                                    self.currentJstreeNode = obj.node
                                    self.setConstaintsFilter("Property", obj.node.data.id)
                                    self.setTripleObject("Predicate", obj.node.data)

                                },
                                // contextMenu: self.jstreeContextMenu("Property")
                            }


                            common.jstree.loadJsTree("Individuals_ontologyPropertiesTree", propertyJstreeData, optionsProperty)
                            callbackSeries()
                        })
                    }
                    ,
                    // load constraints
                    function (callbackSeries) {


                        constraintsMap = {
                            domains: {"default": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "http://www.w3.org/2000/01/rdf-schema#label"]},
                            properties: {
                                "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": ["any"],
                                "http://www.w3.org/2000/01/rdf-schema#label": ["none"]
                            }
                        }

                        OwlSchema.initSourceSchema(self.currentSource, function (err, schema) {
                            if (err)
                                return callbackSeries(err)
                            var objs = []
                            Sparql_schema.getPropertiesRangeAndDomain(schema, null,null, {mandatoryDomain: 1}, function (err, result) {
                                //  Sparql_OWL.getObjectProperties(source, null, null, function (err, result) {
                                if (err)
                                    return MainController.UI.message(err)
                                result.forEach(function (item) {
                                    if (!item.range) {
                                        item.range = {value: "any"}
                                    }
                                    var hasId = true
                                    if (!item.domain) {
                                        item.range = {value: "any"}
                                        hasId = false;
                                    }

                                    var obj = {property: item.property.value, domain: item.domain.value, range: item.range.value}

                                    objs.push(obj);

                                    Sparql_OWL.getObjectRestrictions(self.currentSource, null, null, function (err, result) {
                                        if (err)
                                            return callbackSeries(err)

                                        result.forEach(function (item) {

                                            if (!item.value) {
                                                item.value = {value: "any"}
                                            }
                                            var hasId = true
                                            if (!item.id) {
                                                item.id = {value: "any"}
                                                hasId = false
                                            }

                                            var obj = {property: item.prop.value, domain: item.id.value, range: item.value.value}
                                            objs.push(obj)
                                        })
                                        objs.forEach(function (obj) {
                                            if (!constraintsMap.domains[obj.domain])
                                                constraintsMap.domains[obj.domain] = []
                                            if (constraintsMap.domains[obj.domain].indexOf(obj.property) < 0)
                                                constraintsMap.domains[obj.domain].push(obj.property)

                                            if (!constraintsMap.properties[obj.property])
                                                constraintsMap.properties[obj.property] = []
                                            if (constraintsMap.properties[obj.property].indexOf(obj.range) < 0)
                                                constraintsMap.properties[obj.property].push(obj.range)
                                        })


                                    })

                                })
                                callbackSeries()
                            })
                        })
                    }

                ],

                function (err) {
                    if (err)
                        return MainController.UI.message(message)
                    $('#Individuals_ontologyClassesTree').jstree(true).hide_all()
                    $('#Individuals_ontologyPropertiesTree').jstree(true).hide_all()
                }
            )
        }


        self.loadXlsModel = function (path) {
            var path = "D:\\NLP\\ontologies\\assets\\turbogenerator\\TO-G-6010A FJ-BCmodel.json"
            var payload = {
                triplesGenerator: 1,
                getJsonModel: path
            }


            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",

                success: function (data, textStatus, jqXHR) {
                    var modelJstreeData = []
                    var existingNodes = {}
                    for (var key in data) {
                        modelJstreeData.push({
                            id: key,
                            text: key,
                            parent: "#",
                            data: {type: "table", id: key, label: key, source: path}
                        })

                        data[key].forEach(function (item) {

                            modelJstreeData.push({
                                id: key + "." + item,
                                text: item,
                                parent: key,
                                data: {type: "column", id: key + "." + item, label: item, source: path}

                            })
                        })
                    }

                    var options = {
                        selectTreeNodeFn: function (event, obj) {
                            self.currentModelJstreeNode = obj.node
                            self.currentJstreeNode = obj.node;

                        },
                        contextMenu: self.jstreeContextMenu("Column")
                    }
                    common.jstree.loadJsTree("Individuals_dataModelTree", modelJstreeData, options)
                    $("#waitImg").css("display", "none");
                }
                , error: function (err) {


                    $("#waitImg").css("display", "none");
                    console.log(JSON.stringify(err))
                    console.log(JSON.stringify(query))
                    MainController.UI.message(err.responseText);
                }
            })


        }


        return self;
    }
)()
