var SourceEditor = (function () {
        var self = {};
        self.data = {};
        self.currentSourceSchema;
        self.currentSourceUri;

        self.schemasConfig;
        self.prefLang = "en"
        //self.currentSourceSchema=Sparql_schema.npdOntologyUri

        self.editingObject;


        self.schema = {
            initSourceSchema: function (sourceLabel, callback) {
                async.series([
                    // load schema sconfig
                    function (callbackSeries) {
                        if (self.schemasConfig)
                            return callbackSeries();


                        $.getJSON("config/schemas.json", function (json) {
                            self.schemasConfig = json;
                            if (Config.sources[sourceLabel].sourceSchema)
                                self.currentSourceSchema = self.schemasConfig[Config.sources[sourceLabel].sourceSchema]
                            else// default SKOS
                                self.currentSourceSchema = self.schemasConfig["SKOS"];
                            return callbackSeries();
                        })


                    },
                    // load classes
                    function (callbackSeries) {
                        Sparql_schema.getClasses(self.currentSourceSchema, function (err, result) {
                            if (err)
                                return callbackSeries(err);
                            self.currentSourceSchema.classes = {}
                            result.forEach(function (item) {
                                self.currentSourceSchema.classes[item.class.value] = {id: item.class.value, label: common.getItemLabel(item, "class"), objectProperties: {}, annotations: {}}
                            })
                            return callbackSeries();

                        })
                    },
                ], function (err) {
                    callback(err)
                })
            }

            ,
            initClassProperties: function (sourceLabel, classType, callback) {
                async.series([
                        // load schema if not
                        function (callbackSeries) {

                            if (self.currentSourceSchema)
                                return callbackSeries();
                            self.schema.initSourceSchema(sourceLabel, function (err, result) {
                                callbackSeries(err);
                            })
                        }
                        ,
                        //check if classType already loaded
                        function (callbackSeries) {
                            if (Object.keys(self.currentSourceSchema.classes[classType].objectProperties).length > 0)
                                return callback();
                            return callbackSeries()
                        },
                        // load classes
                        function (callbackSeries) {
                            Sparql_schema.getClasses(self.currentSourceSchema, function (err, result) {
                                if (err)
                                    return callbackSeries(err);
                                self.currentSourceSchema.classes = {}
                                result.forEach(function (item) {
                                    self.currentSourceSchema.classes[item.class.value] = {id: item.class.value, label: common.getItemLabel(item, "class"), objectProperties: {}, annotations: {}}
                                })
                                return callbackSeries();
                            })
                        }
                        ,
                        // load object properties
                        function (callbackSeries) {
                            Sparql_schema.getClassProperties(self.currentSourceSchema, classType, function (err, result) {
                                if (err)
                                    return callbackSeries(err)
                                result.forEach(function (item) {
                                    if (item.subProperty)
                                        self.currentSourceSchema.classes[classType].objectProperties[item.subProperty.value] = {id: item.subProperty.value, label: common.getItemLabel(item, "subProperty")}
                                    else
                                        self.currentSourceSchema.classes[classType].objectProperties[item.property.value] = {id: item.property.value, label: common.getItemLabel(item, "property")}

                                })

                                callbackSeries();
                            })
                        }
                        // load annotations
                        ,
                        function (callbackSeries) {
                            Sparql_schema.getObjectAnnotations(self.currentSourceSchema, classType, function (err, result) {
                                if (err)
                                    return callbackSeries(err)

                                result.forEach(function (item) {
                                    self.currentSourceSchema.classes[classType].annotations[item.annotation.value] = {id: item.annotation.value, label: common.getItemLabel(item, "annotation")}
                                })

                                callbackSeries();
                            })
                        }
                    ],
                    function (err) {
                        callback(err)
                    }
                )
            }
        }


        self.onLoaded = function () {
            $("#sourceDivControlPanelDiv").html("<input id='SourceEditor_searchAllSourcesTermInput'> <button onclick='ThesaurusBrowser.searchAllSourcesTerm()'>Search</button>")

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
            self.initSourceSchema(sourceLabel, function (err, result) {

                if (err)
                    return MainController.UI.message(err)
                var contextMenu = self.getJstreeConceptsContextMenu()
                ThesaurusBrowser.showThesaurusTopConcepts(sourceLabel, {treeSelectNodeFn: SourceEditor.editjstreeNode, contextMenu: contextMenu})
                $("#graphDiv").load("snippets/sourceEditor.html")
                $("#SourceEditor_NewObjectDiv").css("display", "none")
                // $("#actionDivContolPanelDiv").html("<button onclick='SourceEditor.onAddNewObject()'>+</button>")
                $("#actionDivContolPanelDiv").html("<input id='GenericTools_searchTermInput'> <button onclick='ThesaurusBrowser.searchTerm()'>Search</button>")
            })
        }

        self.selectNodeFn = function (event, propertiesMap) {
            self.editjstreeNode(event, propertiesMap)
            ThesaurusBrowser.openTreeNode("currentSourceTreeDiv", MainController.currentSource, propertiesMap.node)

        }


        self.onAddNewObject = function (divId, parentObj) {

            $("#" + divId).load("snippets/sourceEditor.html")
            setTimeout(function () {

                //  $("#SourceEditor_mainDiv").css("display", "block")
                $("#SourceEditor_NewObjectDiv").css("display", "block")
                $("#SourceEditor_graphUri").html("sourceGraphUri")
                common.fillSelectOptions("SourceEditor_NewClassSelect", self.currentSourceSchema.classes, true, "label", "id")

                if (!parentObj)
                    parentObj = self.editingObject
                if (parentObj) {
                    if (self.currentSourceSchema) {
                        var parentProperty = self.currentSourceSchema.newObject.treeParentProperty
                        var mandatoryProps = self.currentSourceSchema.newObject.mandatoryProperties;
                        var childClass = self.currentSourceSchema.newObject.treeChildrenClasses[parentObj.type]
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

            self.editNewObject = function (divId, sourceLabel, classId, initData) {
                if (!classId)
                    classId = $("#SourceEditor_NewClassSelect").val();

                var classLabel = self.currentSourceSchema.classes[classId].label
                self.schema.initClassProperties(sourceLabel, classId, function (err, result) {
                    if (err)
                        return MainController.UI.message(err)
                    $("#SourceEditor_NewClassSelect").val("");
                    $("#SourceEditor_NewObjectDiv").css("display", "none");
                    $("#SourceEditor_ObjectType").html(classLabel);

                    var newNodeId = common.getNewUri(sourceLabel)
                    $("#SourceEditor_ObjectUri").val(newNodeId);

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
            var editingObject;

            var nodeProps = {}
            async.series([
                    //initClassPropsAndAnnotations for type
                    function (callbackSeries) {
                        self.schema.initClassProperties(source, type, function (err, result) {
                            return callbackSeries(err)
                        })
                    }
                    //init editing object
                    , function (callbackSeries) {
                        editingObject = JSON.parse(JSON.stringify(self.currentSourceSchema.classes[type]))
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


                        $("#" + divId).load("snippets/sourceEditor.html");

                        setTimeout(function () {
                            $("#SourceEditor_mainDiv").css("display", "block")
                            $("#SourceEditor_ObjectUri").val(editingObject.about);
                            $("#SourceEditor_ObjectType").html(self.currentSourceSchema.classes[editingObject.type].label);
                            $(".SourceEditor_minorDiv").remove();
                            var objectPropertiesList = Object.keys(self.currentSourceSchema.classes[type].objectProperties).sort();
                            common.fillSelectOptions("SourceEditor_NewObjectPropertySelect", objectPropertiesList, true, "label", "id")
                            for (var key in editingObject.objectProperties) {
                                if (editingObject.objectProperties[key].value) {

                                    self.drawObjectValue("objectProperties", key, editingObject, "SourceEditor_ObjectPropertiesTableDiv")
                                }
                            }
                            var annotationsList = Object.keys(self.currentSourceSchema.classes[type].annotations).sort();
                            common.fillSelectOptions("SourceEditor_NewObjectAnnotationSelect", annotationsList, true, "label", "id")
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
            values.forEach(function (value) {
                var langStr = "";
                if (value["xml:lang"]) {
                    langStr = "<input class='SourceEditor_lang' value='" + value["xml:lang"] + "'>"
                }

                html += "<tr class='SourceEditor_input_TR' id='SourceEditor_" + key + "'>" +
                    "<td><span>" + keyLabel + "</span></td>" +
                    "<td>" + langStr + "<input class='SourceEditor_value '  value='" + value.value + "'></td>" +
                    "<td><button onclick='SourceEditor.deleteEditingValue(\"SourceEditor_" + key + "\")'>X</button></td>" +
                    "</tr>"
            })
            var divId = "SourceEditor_" + keyLabel.replace(/ /g, "_") + "Div"

            //if (!self.currentSourceSchema.classes[type][metaType][key].divId) {
            if (!$("#" + divId).length) {
                self.currentSourceSchema.classes[type][metaType][key].divId = divId;
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
            if (self.currentSourceSchema.classes[className].objectProperties[predicate])
                return "uri"
            if (self.currentSourceSchema.classes[className].annotations[predicate])
                return "literal"
            return null;
        }

        self.saveEditingObject = function (callback) {


            var mandatoryProps = SourceEditor.currentSourceSchema.newObject.mandatoryProperties;
            var triples = [];
            var predicate
            var nodeLabel = null
            triples.push({subject: self.editingObject.about, predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", object: self.editingObject.type, valueType: "uri"})


            self.editingObject.errors = []

            $(".SourceEditor_input_TR").each(function (e, x) {


                predicate = $(this).attr("id").substring(13);

                var value = $(this).find(".SourceEditor_value").val();
                var lang = $(this).find(".SourceEditor_lang").val();

                if (mandatoryProps.indexOf(predicate) > -1) {
                    if (!value || value == "")
                        return self.editingObject.errors.push("missing property value :" + predicate)
                }

                var valueType = self.getPredicateValueType(self.editingObject.type, predicate)

                var triple = {subject: self.editingObject.about, predicate: predicate, object: value, valueType: valueType}
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
                    triples.push({subject: item.value, predicate: key, object: self.editingObject.about, valueType: "uri"});
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
            $("#SourceEditor_NewPropertySelect").val("");
            self.drawObjectValue("objectProperties", property, self.editingObject, "SourceEditor_ObjectPropertiesTableDiv", "", true)


        }

        self.onSelectNewAnnotation = function (annotation) {
            $("#SourceEditor_NewPropertySelect").val("");
            self.drawObjectValue("annotations", annotation, self.editingObject, "SourceEditor_ObjectAnnotationsTableDiv", "focus", true)

        }

        self.deleteEditingObject = function () {

            var children = $('#currentSourceTreeDiv').jstree(true).get_node(self.editingObject.about).children
            if (children.length > 0)
                return alert("cannot delete node with children")

            Sparql_generic.deleteTriples(MainController.currentSource, self.editingObject.about, null, null, function (err, result) {
                if (err)
                    MainController.UI.message(err);
                $('#currentSourceTreeDiv').jstree(true).delete_node(self.editingObject.about)
                $('#currentSourceTreeDiv').jstree(true).deselect_all();
                self.editingObject = null;
                $("#SourceEditor_mainDiv").css("display", "none")


            })


        }

        self.showNodeInfos = function (divId, defaultLang, nodeId, data) {

            var bindings = []
            var propertiesMap = {label: "", id: "", properties: {}};
            data.forEach(function (item) {
                var propName = item.prop.value
                var p = propName.lastIndexOf("#")
                if (p == -1)
                    var p = propName.lastIndexOf("/")
                if (p > -1)
                    var propName = propName.substring(p + 1)
                var value = item.value.value;
                /*   if (item.valueLabel)
                       value = item.valueLabel.value;*/

                if (!propertiesMap.properties[propName])
                    propertiesMap.properties[propName] = {name: propName, langValues: {}}

                if (item.value && item.value["xml:lang"]) {
                    if (!propertiesMap.properties[propName].langValues[item.value["xml:lang"]])
                        propertiesMap.properties[propName].langValues[item.value["xml:lang"]] = []
                    propertiesMap.properties[propName].langValues[item.value["xml:lang"]].push(value);
                } else {
                    if (!propertiesMap.properties[propName].value)
                        propertiesMap.properties[propName].value = [];
                    propertiesMap.properties[propName].value.push(value);
                }

            })


            var defaultProps = ["UUID", "http://www.w3.org/2004/02/skos/core#prefLabel",
                "http://www.w3.org/2004/02/skos/core#definition", "" +
                "http://www.w3.org/2004/02/skos/core#altLabel",
                "http://www.w3.org/2004/02/skos/core#broader",
                "http://www.w3.org/2004/02/skos/core#narrower",
                "http://www.w3.org/2004/02/skos/core#related",
                "http://www.w3.org/2004/02/skos/core#exactMatch",
                "http://www.w3.org/2004/02/skos/core#closeMatch",
                //  "http://www.w3.org/2004/02/skos/core#sameAs"
            ];

            if (!defaultLang)
                defaultLang = 'en';

            for (var key in propertiesMap.properties) {
                if (defaultProps.indexOf(key) < 0)
                    defaultProps.push(key)
            }
            var str = "<table class='infosTable'>"
            str += "<tr><td class='detailsCellName'>UUID</td><td><a target='_blank' href='" + nodeId + "'>" + nodeId + "</a></td></tr>"
            str += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>"


            defaultProps.forEach(function (key) {
                if (!propertiesMap.properties[key])
                    return;

                str += "<tr >"


                if (propertiesMap.properties[key].value) {
                    var values = propertiesMap.properties[key].value;
                    str += "<td class='detailsCellName'>" + propertiesMap.properties[key].name + "</td>"
                    var valuesStr = ""
                    values.forEach(function (value, index) {
                        if (value.indexOf("http") == 0)
                            value = "<a target='_blank' href='" + value + "'>" + value + "</a>"
                        if (index > 0)
                            valuesStr += "<br>"
                        valuesStr += value
                    })
                    str += "<td class='detailsCellValue'>" + valuesStr + "</td>"
                    str += "</tr>"


                } else {
                    var keyName = propertiesMap.properties[key].name
                    var selectId = "detailsLangSelect_" + keyName
                    var propNameSelect = "<select id='" + selectId + "' onchange=ThesaurusBrowser.onNodeDetailsLangChange('" + keyName + "') >"
                    var langDivs = "";


                    for (var lang in propertiesMap.properties[key].langValues) {
                        var values = propertiesMap.properties[key].langValues[lang];
                        var selected = "";
                        if (lang == defaultLang)
                            selected = "selected";
                        propNameSelect += "<option " + selected + ">" + lang + "</option> ";
                        var valuesStr = ""
                        values.forEach(function (value, index) {
                            if (value.indexOf("http") == 0)
                                value += "<a target='_blank' href='" + value + "'>" + value + "</a>"
                            if (index > 0)
                                valuesStr += "<br>"
                            valuesStr += value

                        })

                        langDivs += "<div class='detailsLangDiv_" + keyName + "' id='detailsLangDiv_" + keyName + "_" + lang + "'>" + valuesStr + "</div>"

                    }


                    propNameSelect += "</select>"

                    str += "<td class='detailsCellName'>" + propertiesMap.properties[key].name + " " + propNameSelect + "</td>"
                    str += "<td class='detailsCellValue'>" + langDivs + "</td>";

                    if (propertiesMap.properties[key].langValues[defaultLang])
                        str += "<script>ThesaurusBrowser.onNodeDetailsLangChange('" + keyName + "','" + defaultLang + "') </script>";

                    str += "</tr>"

                }

            })
            str += "</table>"


            $("#" + divId).html(str)


        }


        return self;


    }
)
()
