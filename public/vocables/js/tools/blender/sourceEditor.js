/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var SourceEditor = (function () {
        var self = {};
        self.data = {};

        self.currentSourceUri;

        self.schemasConfig;
        self.prefLang = "en"
        //self.currentSourceSchema=Sparql_schema.npdOntologyUri

        self.editingObject;


        self.onLoaded = function () {
            $("#sourceDivControlPanelDiv").load("./snippets/searchAll.html");

        }


        self.getJstreeConceptsContextMenu = function () {
            return {
                addChild: {
                    label: "add Child",
                    action: function (obj, sss, cc) {

                        SourceEditor.onAddNewObject("graphDiv", self.editingObject)
                        ;
                    },
                },
                delete: {
                    label: "Delete",
                    action: function (obj, sss, cc) {

                        SourceEditor.deleteEditingObject()
                        ;
                    },

                },
            }
        }
        self.onSourceSelect = function (sourceLabel) {
            MainController.currentSource = sourceLabel;
            self.currentSourceUri = Config.sources[sourceLabel].graphUri
            OwlSchema.initSourceSchema(sourceLabel, function (err, result) {

                if (err)
                    return MainController.UI.message(err)
                var contextMenu = self.getJstreeConceptsContextMenu()
                SourceBrowser.showThesaurusTopConcepts(sourceLabel, {
                    treeselectTreeNodeFn: SourceEditor.editjstreeNode,
                    contextMenu: contextMenu
                })
                $("#graphDiv").load("snippets/sourceEditor.html")
                $("#SourceEditor_NewObjectDiv").css("display", "none")
                // $("#actionDivContolPanelDiv").html("<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceEditor.onAddNewObject()'>+</button>")
                $("#actionDivContolPanelDiv").html("<input id='GenericTools_searchTermInput'> <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceBrowser.searchTerm()'>Search</button>")
            })
        }

        self.selectTreeNodeFn = function (event, propertiesMap) {
            self.editjstreeNode(event, propertiesMap)
            SourceBrowser.openTreeNode(SourceBrowser.currentTargetDiv, MainController.currentSource, propertiesMap.node)

        }


        self.onAddNewObject = function (divId, parentObj) {

            $("#" + divId).load("snippets/sourceEditor.html")
            setTimeout(function () {

                //  $("#SourceEditor_mainDiv").css("display", "block")
                $("#SourceEditor_NewObjectDiv").css("display", "block")
                $("#SourceEditor_graphUri").html("sourceGraphUri")
                common.fillSelectOptions("SourceEditor_NewClassSelect", OwlSchema.currentSourceSchema.classes, true, "label", "id")

                if (!parentObj)
                    parentObj = self.editingObject
                if (parentObj) {
                    if (OwlSchema.currentSourceSchema) {
                        var parentProperty = OwlSchema.currentSourceSchema.newObject.treeParentProperty
                        var mandatoryProps = OwlSchema.currentSourceSchema.newObject.mandatoryProperties;
                        var childClass = OwlSchema.currentSourceSchema.newObject.treeChildrenClasses[parentObj.type]
                        var initData = {}
                        initData[parentProperty] = [{value: parentObj.about, type: "uri"}];
                        mandatoryProps.forEach(function (item) {
                            initData[item] = [{"xml:lang": self.prefLang, value: "", type: "literal"}]
                        })

                        self.editNewObject(childClass, initData);

                    }
                }


            }, 200)


        },

            self.editNewObject = function (divId, sourceLabel, classId, _initData) {
                if (!classId)
                    classId = $("#SourceEditor_NewClassSelect").val();

                var initData = _initData
                OwlSchema.getClassDescription(sourceLabel, classId, function (err, result) {
                    if (err)
                        return MainController.UI.message(err)

                    $("#SourceEditor_NewClassSelect").val("");
                    $("#SourceEditor_NewObjectDiv").css("display", "none");
                    var classLabel = OwlSchema.currentSourceSchema.classes[classId].label
                    $("#SourceEditor_ObjectType").html(classLabel);

                    var newNodeId = common.getNewUri(sourceLabel)
                    $("#SourceEditor_ObjectUri").val(newNodeId);
                    //  self.editNode = function (divId, source, nodeId, type, initData, isNew) {

                    self.editNode(divId, sourceLabel, newNodeId, classId, initData, true)
                })

            }

        self.getNewUri = function (sourceLabel) {
            var sourceUri = Config.sources[sourceLabel].graphUri
            if (sourceUri.lastIndexOf("/") != sourceUri.length - 1)
                sourceUri += "/"
            var nodeId = sourceUri + common.getRandomHexaId(10)
            return nodeId;
        }

        self.editjstreeNode = function (event, obj, initData) {
            var type;
            if (!obj.node.data || !obj.node.data.type)
                type = "http://www.w3.org/2004/02/skos/core#Concept"
            else
                type = obj.node.data.type
            self.editNode("SourceEditor_mainDiv", MainController.currentSource, obj.node, initData)

        }


        self.editNode = function (divId, source, nodeId, type, initData, isNew) {

            $("#" + divId).css("display", "block")
            $("#Blender_nodeEditionButtonsDiv").css("display", "block")
            var editingObject;

            var nodeProps = {}
            async.series([
                    //initClassPropsAndAnnotations for type
                    function (callbackSeries) {
                        OwlSchema.getClassDescription(source, type, function (err, result) {
                            return callbackSeries(err)
                        })
                    }
                    //init editing object
                    , function (callbackSeries) {
                        editingObject = JSON.parse(JSON.stringify(OwlSchema.currentSourceSchema.classes[type]))
                        editingObject.source = source;
                        editingObject.inverseObjectProperties = {}
                        if (isNew)
                            editingObject.isNew = true
                        editingObject.about = nodeId;
                        editingObject.type = editingObject.id;
                        if (self.editingObject)
                            editingObject.parent = self.editingObject.about
                        // delete editingObject.id

                        self.editingObject = editingObject;
                        return callbackSeries()
                    },

                    //get node data and prepare editingObject
                    function (callbackSeries) {
                        if (initData) {
                            editingObject.isNew = 1;
                            for (var key in initData) {


                                nodeProps[key] = initData[key]
                            }

                            return callbackSeries();
                        }


                        Sparql_generic.getNodeInfos(source, nodeId, {}, function (err, result) {
                            if (err) {
                                return callbackSeries()
                            }

                            result.forEach(function (item) {
                                if (!nodeProps[item.prop.value])
                                    nodeProps[item.prop.value] = []
                                nodeProps[item.prop.value].push(item.value);
                            })
                            callbackSeries()
                        })
                    },
                    function (callbackSeries) {
                        for (var prop in editingObject.objectProperties) {
                            if (nodeProps[prop])
                                editingObject.objectProperties[prop].value = nodeProps[prop];
                            if (nodeProps["^" + prop]) {
                                editingObject.inverseObjectProperties[prop] = nodeProps["^" + prop];
                            }
                        }
                        for (var prop in editingObject.annotations) {
                            if (nodeProps[prop])
                                editingObject.annotations[prop].value = nodeProps[prop];
                        }

                        return callbackSeries()

                    },
                    //draw node data
                    function (callbackSeries) {

                        $("#" + divId).html("")
                        $("#" + divId).load("snippets/sourceEditor.html");

                        setTimeout(function () {
                            $("#SourceEditor_mainDiv").css("display", "block")
                            $("#SourceEditor_ObjectUri").val(editingObject.about);
                            $("#SourceEditor_ObjectType").html(OwlSchema.currentSourceSchema.classes[editingObject.type].label);
                            $(".SourceEditor_minorDiv").remove();
                            var objectPropertiesList = Object.keys(OwlSchema.currentSourceSchema.classes[type].objectProperties).sort();

                            // common.fillSelectOptions("SourceEditor_NewObjectPropertySelect", objectPropertiesList, true, "label", "id")
                            common.fillSelectOptions("SourceEditor_NewObjectPropertySelect", objectPropertiesList, true)
                            for (var key in editingObject.objectProperties) {
                                if (editingObject.objectProperties[key].value) {

                                    self.drawObjectValue("objectProperties", key, editingObject, "SourceEditor_ObjectPropertiesTableDiv")
                                }
                            }
                            var annotationsList = Object.keys(OwlSchema.currentSourceSchema.classes[type].annotations).sort();
                            // common.fillSelectOptions("SourceEditor_NewObjectAnnotationSelect", annotationsList, true, "label", "id")
                            common.fillSelectOptions("SourceEditor_NewObjectAnnotationSelect", annotationsList, true,)
                            for (var key in editingObject.annotations) {
                                if (editingObject.annotations[key].value)
                                    self.drawObjectValue("annotations", key, editingObject, "SourceEditor_ObjectAnnotationsTableDiv")
                            }
                        }, 200)

                    }

                ],

                function (err) {
                    if (err) {
                        return MainController.UI.message(err)
                    }
                }
            )


        }

        /**
         *  create also the key Div inside metaType if not exists (to group same keys values)
         *
         *
         * @param metaType annotations or objectProperties
         * @param key
         * @param editingObject
         * @return {string}
         */
        self.drawObjectValue = function (metaType, key, editingObject, parentDiv, focus, newValue) {

            var type = editingObject.type;
            var values = [];
            if (newValue) {
                var value = {value: ""};
                if (metaType == "annotations") {
                    value["xml:lang"] = self.prefLang;
                    value.type = "literal";
                } else
                    value.type = "uri";

                values.push(value);

            } else
                values = editingObject[metaType][key].value

            var keyLabel = editingObject[metaType][key].label
            var html = ""
            values.forEach(function (value, indexValue) {
                var langStr = "";
                if (value["xml:lang"]) {
                    langStr = "<input class='SourceEditor_lang' value='" + value["xml:lang"] + "'>"
                }
                var valueId = common.getRandomHexaId(3) + "_" + key
                html += "<tr class='SourceEditor_input_TR' id='SourceEditor_" + valueId + "'>" +
                    "<td><span>" + keyLabel + "</span></td>" +
                    "<td>" + langStr + "<input class='SourceEditor_value '  value='" + value.value + "'></td>" +
                    "<td><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='SourceEditor.deleteEditingValue(\"SourceEditor_" + valueId + "\")'>X</button></td>" +
                    "</tr>"
            })
            var divId = "SourceEditor_" + keyLabel.replace(/ /g, "_") + "Div"

            //if (!self.currentSourceSchema.classes[type][metaType][key].divId) {
            if (!$("#" + divId).length) {
                OwlSchema.currentSourceSchema.classes[type][metaType][key].divId = divId;
                $("#" + parentDiv).append("<div class='SourceEditor_minorDiv' id='" + divId + "'>  <table></table></div>")
            }
            setTimeout(function () {
                $("#" + divId).append(html)
                //  $("#SourceEditor_" + key +".SourceEditor_minorDiv").focus()
            }, 200)
            //$(html).appendTo( $( "#"+divId ) );

        }
        self.deleteEditingValue = function (id) {
            var elt = document.getElementById(id)
            $(elt).remove();
        }

        self.getPredicateValueType = function (className, predicate) {
            if (OwlSchema.currentSourceSchema.classes[className].objectProperties[predicate])
                return "uri"
            if (OwlSchema.currentSourceSchema.classes[className].annotations[predicate])
                return "literal"
            return null;
        }

        self.saveEditingObject = function (callback) {


            var mandatoryProps = OwlSchema.currentSourceSchema.newObject.mandatoryProperties;
            var triples = [];
            var predicate
            var nodeLabel = null
            triples.push({
                subject: self.editingObject.about,
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                object: self.editingObject.type,
                valueType: "uri"
            })


            self.editingObject.errors = []

            $(".SourceEditor_input_TR").each(function (e, x) {


                predicate = $(this).attr("id").substring(17);

                var value = $(this).find(".SourceEditor_value").val();
                var lang = $(this).find(".SourceEditor_lang").val();

                if (mandatoryProps.indexOf(predicate) > -1) {
                    if (!value || value == "")
                        return self.editingObject.errors.push("missing property value :" + predicate)
                }

                var valueType = self.getPredicateValueType(self.editingObject.type, predicate)

                var triple = {
                    subject: self.editingObject.about,
                    predicate: predicate,
                    object: value,
                    valueType: valueType
                }
                if (lang && lang != "")
                    triple.lang = lang;


                //  var labelProp=Config.sources[self.editingObject.source].prefLabel || Sparql_generic.defaultPredicates.prefLabel;
                //   if(!self.editingObject.nodeLabel  && predicate==labelProp && (!self.prefLang || lang==self.prefLang))// label for new jstree node...
                if (!self.editingObject.nodeLabel && predicate.indexOf("prefLabel") > -1 && (!self.prefLang || lang == self.prefLang))// label for new jstree node...
                    self.editingObject.nodeLabel = value;


                triples.push(triple)
                if (predicate.indexOf("prefLabel") > -1 && (!lang || lang == self.prefLang))
                    nodeLabel = value;
                else if (!nodeLabel && (predicate.indexOf("label") > -1 && (!lang || lang == self.prefLang)))
                    nodeLabel = value;

            })
            for (var key in self.editingObject.inverseObjectProperties) {
                self.editingObject.inverseObjectProperties[key].forEach(function (item) {
                    triples.push({
                        subject: item.value,
                        predicate: key,
                        object: self.editingObject.about,
                        valueType: "uri"
                    });
                })

            }


            Sparql_generic.update(self.editingObject.source, triples, function (err, result) {
                if (err) {
                    MainController.UI.message(err)
                    if (callback)
                        return callback(err)
                }

                MainController.UI.message("data saved")

                if (callback) {
                    return callback(null, self.editingObject)
                }

            })

        }


        self.onSelectNewProperty = function (property) {
            if (!property || property == "")
                return;
            $("#SourceEditor_NewPropertySelect").val("");
            self.drawObjectValue("objectProperties", property, self.editingObject, "SourceEditor_ObjectPropertiesTableDiv", "", true)


        }

        self.onSelectNewAnnotation = function (annotation) {
            $("#SourceEditor_NewPropertySelect").val("");
            self.drawObjectValue("annotations", annotation, self.editingObject, "SourceEditor_ObjectAnnotationsTableDiv", "focus", true)

        }

        self.deleteEditingObject = function () {

            var children = $('#' + SourceBrowser.currentTargetDiv).jstree(true).get_node(self.editingObject.about).children
            if (children.length > 0)
                return alert("cannot delete node with children")

            Sparql_generic.deleteTriples(MainController.currentSource, self.editingObject.about, null, null, function (err, result) {
                if (err)
                    MainController.UI.message(err);
                $('#' + SourceBrowser.currentTargetDiv).jstree(true).delete_node(self.editingObject.about)
                $('#' + SourceBrowser.currentTargetDiv).jstree(true).deselect_all();
                self.editingObject = null;
                $("#SourceEditor_mainDiv").css("display", "none")


            })


        }




        return self;


    }
)
()
