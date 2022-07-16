/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var KGmappings = (function () {
    var self = {};
    self.currentModelSource;
    self.prefixes = {
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdfs",
        "http://www.w3.org/2002/07/owl#": "owl",
        "http://data.total.com/resource/one-model/ontology/": "total",
    };

    //  self.currentMappingsMap={type:"",joins:[],relations:[] }
    self.currentMappingsMap = null;
    self.currentMappedColumns = null;
    self.init = function () {
        self.subjectPropertiesMap = {};
        self.typedObjectsMap = {};
        self.sheetJoinColumns = {};
        self.currentMappedColumns = {};
        constraintsMap = {};
        // KGcommon.allObjectsMap = {}
    };

    self.onLoaded = function (callback) {
        self.init();
        var KGsources = [];
        for (var source in Config.sources) {
          //  if (Config.sources[source].schemaType == "KNOWLEDGE_GRAPH")
                if (Config.sources[source].dataSource  && Config.sources[source].schemaType != "NONE")
                KGsources.push(source);
        }
        MainController.UI.showSources("sourcesTreeDiv", false, KGsources, null, function (err, _result) {
            if (err) alert(err);
        });
        MainController.UI.openRightPanel();
        $("#actionDivContolPanelDiv").html(
            "KG database &nbsp;<select onchange='KGmappingData.loadKG_SQLModel()' id=\"KGmappings_DatabaseSelect\"> </select>" +
                //  "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='TextAnnotator.init()'>text annotation</button>  "+
                "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='KGassetGraph.drawAssetTablesMappingsGraph()'>Mappings Graph</button>  " +
                "  <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick=\"KGassetGraph.drawClassesAndPropertiesGraph()\">Classes Graph</button>" +
                "<button class='btn btn-sm my-1 py-0 btn-outline-primary' id='KGmappings_buildTriplesButton' onclick='KGbuild.initDialog()'>Build Triples</button>  "
        );

        $("#actionDiv").html(" <div id='KGmappings_dataModelTree'  style='width:350px;height: 600px;overflow: auto'></div>");
        $("#graphDiv").html("");
        visjsGraph.clearGraph();

        $("#graphDiv").load("./snippets/KG/KGmappings.html", function () {
            $("#rightPanelDiv").load("snippets/KG/KGmappingRightPanel.html", function () {
                //  $("#KGmappings_OneModelTab").html("")

                KGadvancedMapping.loadSuperClasses();
                self.currentModelSource = Config.KG.OneModelSource;
                KGmappingData.initAdlsList();
                if (authentication.currentUser.groupes.indexOf("reader") > -1) {
                    $("#KGmappings_saveMappingsButton").prop("disabled", true);
                    $("#KGmappings_buildTriplesButton").prop("disabled", true);
                }

                KGmappings.displayOneModelTree();

                self.displayLiteralsTree();
                //   self.displayPropertiesTree("KGmappingPropertiesTree")

                $("#KGmappings_AdvancedMappingDialogDiv").dialog({
                    autoOpen: false,
                    height: 800,
                    width: 1000,
                    modal: false,
                    beforeClose: function (_ui, _event) {
                        return KGadvancedMapping.beforeCloseDialog();
                    },
                });

                $("#KGassetGraphDiv").dialog({
                    autoOpen: false,
                    height: 900,
                    width: 1100,
                    modal: false,
                    close: function (_event, _ui) {
                        KGmappings.isShowingAssetGraph = false;
                    },
                    open: function (_event, _ui) {
                        KGmappings.isShowingAssetGraph = true;
                    },
                });
                if (callback) callback();
            });
        });
    };

    //
    self.onSourceSelect = function (source) {
        var dataSource = Config.sources[source].dataSource;
        if (!dataSource) return alert("no data source declared for source " + source);

        self.currentKGsource = source;
        self.currentGraphUri = Config.sources[source].graphUri;

        $("#KGmappings_DatabaseSelect").val(dataSource.dbName);
        KGmappingData.loadKG_SQLModel(dataSource.dbName);

        $("#accordion").accordion("option", { active: 2 });

        visjsGraph.clearGraph();
    };

    //!!! shared by OneModelOntology and sourceBrowser(search)
    self.selectTreeNodeFn = function (event, propertiesMap) {
        if (!self.selectedOntologyNodes) self.selectedOntologyNodes = {};

        self.selectedOntologyNodes[propertiesMap.node.data.id] = propertiesMap.node;
        self.currentJstreeNode = propertiesMap.node;

        self.currentJstreeNode.jstreeDiv = event.currentTarget.id;
        KGmappings.isModifyingMapping = true;
        if (KGadvancedMapping.addingValueManuallyToNode) {
            KGadvancedMapping.addValueManuallyFromOntology(KGadvancedMapping.addingValueManuallyToNode, propertiesMap.node);
        }
        self.AssignOntologyTypeToColumn(KGmappingData.currentColumn, propertiesMap.node, true);
    };

    (self.selectPropertyTreeNodeFn = function (event, propertiesMap) {
        if (!self.selectedOntologyNodes) self.selectedOntologyNodes = {};
        self.selectedOntologyNodes[propertiesMap.node.data.id] = propertiesMap.node;
        self.currentJstreeNode = propertiesMap.node;
        self.currentJstreeNode.jstreeDiv = event.currentTarget.id;
        if (KGmappingGraph.isAssigningProperty) {
            $("#KGMapping_graphPropertySpan").html(propertiesMap.node.data.label);
        } else if (TextAnnotator.isAnnotatingText) TextAnnotator.setAnnotation(propertiesMap.node);
    }),
        (self.contextMenuFn = function (treeDiv) {
            var items = {};
            items.nodeInfos = {
                label: "node infos",
                action: function (_e, _xx) {
                    // pb avec source
                    self.showNodeInfos();
                },
            };

            items.openNode = {
                label: "open Node",
                action: function (_e, _xx) {
                    // pb avec source

                    SourceBrowser.openTreeNode(self.currentJstreeNode.jstreeDiv, self.currentJstreeNode.data.source, self.currentJstreeNode, null);
                },
            };
            if (treeDiv != "KGmappings_OneModelTree") {
                items.copyNodeToClipboard = {
                    label: "copy toClipboard",
                    action: function (_e) {
                        // pb avec source

                        Lineage_common.copyNodeToClipboard(self.currentJstreeNode.data);
                    },
                };
            }

            if (treeDiv == "KGmappings_OneModelTree") {
                items.pasteNodeFromClipboard = {
                    label: "paste from Clipboard",
                    action: function (_e) {
                        // pb avec source

                        Lineage_common.pasteNodeFromClipboard(self.currentJstreeNode);
                    },
                };
            }

            return items;
        });
    self.displayLiteralsTree = function () {
        var optionsClass = {
            selectTreeNodeFn: self.selectTreeNodeFn,
            openAll: true,
        };
        var jstreeData = [];
        self.literalValues.forEach(function (item) {
            jstreeData.push({
                id: item,
                text: item,
                parent: "#",
                data: { source: "xsd", id: item, label: item },
            });
        });
        common.jstree.loadJsTree("KGmappings_LiteralsTree", jstreeData, optionsClass);
    };
    self.displayOneModelTree = function () {
        KGcommon.Ontology.load(Config.KG.OneModelSource, function (err, _result) {
            if (err) return MainController.UI.message(err);
            var propJstreeData = [];

            propJstreeData.push({
                id: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                text: "owl:DatatypePropertyOf",
                parent: "#",
                data: {
                    type: "DatatypePropertyOf",
                    id: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                    label: "owl:DatatypeProperty",
                    source: Config.KG.OneModelSource,
                },
            });

            for (var id in self.typedObjectsMap) {
                propJstreeData.push({
                    id: id + common.getRandomHexaId(3),
                    text: id,
                    parent: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                    type: "owl:ObjectProperty",
                    data: {
                        type: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                        id: id,
                        label: id.substring(id.lastIndexOf(".") + 1),
                        source: Config.KG.OneModelSource,
                    },
                });
            }
            propJstreeData.push({
                id: "http://www.w3.org/2000/01/rdf-schema#label",
                text: "rdfs:labelOf",
                parent: "#",
                type: "owl:ObjectProperty",
                data: {
                    type: "labelOf",
                    id: "http://www.w3.org/2000/01/rdf-schema#label",
                    label: "http://www.w3.org/2000/01/rdf-schema#label",
                    source: Config.KG.OneModelSource,
                },
            });

            for (id in self.typedObjectsMap) {
                propJstreeData.push({
                    id: id + common.getRandomHexaId(3),
                    text: id,
                    type: "owl:ObjectProperty",
                    parent: "http://www.w3.org/2000/01/rdf-schema#label",
                    data: {
                        type: "http://www.w3.org/2000/01/rdf-schema#label",
                        id: id,
                        label: id.substring(id.lastIndexOf(".") + 1),
                        source: Config.KG.OneModelSource,
                    },
                });
            }

            KGcommon.Ontology.jstreeData_types.forEach(function (item) {
                if (item.parent == "#") {
                    item.parent = Config.KG.OneModelSource;
                }
                item.data.source = Config.KG.OneModelSource;
                propJstreeData.push(item);
            });
            propJstreeData.push({
                id: Config.KG.OneModelSource,
                text: Config.KG.OneModelSource,
                type: "owl:ObjectProperty",
                parent: "#",
            });
        });
    };

    self.displayPropertiesTree = function (treeDivId) {
        Lineage_properties.getPropertiesjsTreeData(Config.KG.OneModelSource, null, null, {}, function (err, jsTreeData) {
            if (err) return MainController.UI.message(err);

            jsTreeData.forEach(function (item) {
                if (item.parent == "#") item.parent = Config.KG.OneModelSource;
            });
            jsTreeData.push({ id: Config.KG.OneModelSource, text: Config.KG.OneModelSource, parent: "#" });

            var jsTreeData2 = [
                {
                    id: "http://www.w3.org/2000/01/rdf-schema#",
                    text: "rdfs:label",
                    parent: "#",
                    type: "owl:ObjectProperty",
                    data: {
                        type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
                        id: "http://www.w3.org/2000/01/rdf-schema#label",
                        label: "rdfs:label",
                        source: "RDFS",
                        parent: "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
                    },
                },
                {
                    id: "http://www.w3.org/2002/07/owl##DatatypeProperty",
                    text: "owl:DatatypeProperty",
                    parent: "#",
                    type: "owl:ObjectProperty",
                    data: {
                        type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
                        id: "http://www.w3.org/2002/07/owl##DatatypeProperty",
                        label: "owl:DatatypeProperty",
                        source: "OWL",
                        parent: "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
                    },
                },
            ];

            jsTreeData = jsTreeData2.concat(jsTreeData);

            var options = {
                selectTreeNodeFn: self.selectPropertyTreeNodeFn,
                openAll: true,
                contextMenu: self.contextMenuFn("KGmappingPropertiesTree"),
                searchPlugin: {
                    case_insensitive: true,
                    fuzzy: false,
                    show_only_matches: true,
                },
            };
            common.jstree.loadJsTree(treeDivId, jsTreeData, options);
        });
    };

    self.AssignOntologyTypeToColumn = function (column, node, useDictionary) {
        KGmappingData.setDataSampleColumntype(column, node);

        var types = [];
        if (!Array.isArray(node.data)) node.data = [node.data];
        node.data.forEach(function (item) {
            types.push({
                type_id: item.id,
                type_label: item.label,
                type_parents: node.parents || item.parents,
                condition: item.condition,
            });
        });
        KGmappings.currentMappedColumns[column] = {
            columnId: column,
            types: types,
        };
        var color = self.sourceTypeColors[node.jstreeDiv];
        KGmappingGraph.drawNode(column, color, node.position);

        //show dictionary for this column
        //   if(useDictionary && KGadvancedMapping.dictionaries[node.data[0].dictionary]){
        if (useDictionary) {
            KGadvancedMapping.showAdvancedMappingDialog(node.data[0].dictionary, node.data[0].id, KGmappingData.currentColumn);
        } else {
            KGmappingData.currentColumn = null;
            $(".dataSample_type").removeClass("datasample_type_selected");
        }
    };

    self.unAssignOntologyTypeToColumn = function (column, _node) {
        KGmappingData.setDataSampleColumntype(column, "");

        delete KGmappings.currentMappedColumns[column];

        KGmappingGraph.graphActions.removeNode(column);

        KGmappingData.currentColumn = null;
        $(".dataSample_type").removeClass("datasample_type_selected");
    };

    self.checkMappingEditionSave = function () {
        if (KGmappings.isModifyingMapping) {
            if (confirm("continue without saving current mapping  ?")) {
                KGmappings.isModifyingMapping = false;
                return true;
            }
            return false;
        } else {
            return true;
        }
    };
    self.loadMappings = function (name) {
        if (!name) name = self.currentKGsource + "_" + KGmappingData.currentDatabase + "_" + KGmappingData.currentKGtable.data.adlView || KGmappingData.currentKGtable.data.adlTable;
        //    name = KGmappingData.currentKGdataSource.dbName + "_" + KGmappingData.currentKGtable.data.adlView || KGmappingData.currentKGtable.data.adlTable

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/mappings/" + name,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                if (!data.mappings) return;
                if (!data.model) {
                    data.model = self.generateKGModel(data.mappings);
                }

                var associations = [];
                self.currentMappingData = data.data;
                data.mappings.forEach(function (item) {
                    if (item.predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                        var node = {};
                        if (typeof item.object === "object") {
                            //process switch
                            if (item.object.switch) {
                                node.data = [];
                                for (var key in item.object.switch) {
                                    var value = item.object.switch[key];
                                    var label = key;
                                    var parents = ["?", "#"];
                                    if (data.model[value]) {
                                        label = data.model[value].label;
                                        parents = data.model[value].parents;
                                    }
                                    node.data.push({
                                        condition: key,
                                        id: value,
                                        label: label,
                                        parents: parents,
                                    });
                                }
                            }
                        } else {
                            node.data = {
                                id: item.object,
                                label: data.model[item.object].label,
                                parents: data.model[item.object].parents,
                            };
                        }

                        if (data.model[item.object].parents.indexOf("ONE-MODEL") > -1) node.jstreeDiv = "KGmappings_OneModelTree";
                        else if (item.object.indexOf("xsd") > -1) node.jstreeDiv = "KGmappings_LiteralsTree";
                        else node.jstreeDiv = "KGmappingsjsOtherOntologiesTreeDiv";

                        if (data.graph && data.graph[item.subject]) {
                            node.position = data.graph[item.subject];
                        }

                        self.AssignOntologyTypeToColumn(item.subject, node, false);
                    }

                    //association
                    else if (item.object.indexOf("http") < 0) {
                        //label and DatatypeProperty
                        data.model[item.predicate];

                        if (!data.model[item.predicate]) {
                            data.model[item.predicate] = {
                                parents: ["?", "#"],
                                label: item.predicate,
                            };
                        }
                        var propLabel = data.model[item.predicate].label;
                        var property = { data: { id: item.predicate, label: propLabel } };
                        var assocation = {
                            subject: { data: { columnId: item.subject } },
                            object: { data: { columnId: item.object } },
                        };
                        associations.push({ property: property, association: assocation });

                        var column = item.object;
                        var p = column.indexOf("^");
                        // literal
                        if (p > -1) {
                            column = column.substring(0, p);

                            label = data.model[item.predicate].label + "<br>" + item.subject;
                            KGmappingData.setDataSampleColumntype(column, { data: { label: label } });
                        }
                    }
                });
                associations.forEach(function (item) {
                    KGmappingGraph.graphActions.setAssociation(item.property, item.association);
                });
                if (data.infos) {
                    var html = "Last modified by : " + data.infos.modifiedBy + " " + data.infos.lastModified + " " + data.infos.comment;
                    $("#KGmappings_mappingInfos").html(html);
                }
            },
            error: function (err) {
                return MainController.UI.message(err);
            },
        });
    };

    /**
     *
     * for old mappings (before march 2020 generate model from one model jstree
     *
     * @param mappings
     * @returns {{}}
     */
    self.generateKGModel = function (mappings) {
        var model = {};

        function getOneModelTreeInfos(id) {
            var oneModelNode = $("#KGmappings_OneModelTree").jstree().get_node(id);
            if (oneModelNode) {
                return {
                    parents: oneModelNode.parents,
                    label: oneModelNode.data.label,
                };
            } else return null;
        }

        mappings.forEach(function (item) {
            if (typeof item.object === "object") {
                if (item.object.switch) {
                    for (var key in item.object.switch) {
                        var id = item.object.switch[key];
                        model[id] = getOneModelTreeInfos(id);
                    }
                }
            } else if (item.object.indexOf("http") > -1) {
                model[item.object] = getOneModelTreeInfos(item.object);
            }

            var propertyJstreeNode = $("#KGmappingPropertiesTree").jstree(true).get_node(item.predicate);
            if (propertyJstreeNode) {
                model[item.predicate] = {
                    parents: propertyJstreeNode.parents,
                    label: propertyJstreeNode.data.label,
                };
            } else {
                model[item.predicate] = {
                    parents: ["?", "#"],
                    label: item.predicate,
                };
            }
        });

        model["http://www.w3.org/2000/01/rdf-schema#label"] = {
            label: "rdfs:label",
            parents: [KGmappingData.currentDatabase, "#"],
        };
        model["http://www.w3.org/2002/07/owl#DatatypeProperty"] = {
            label: "owl:DatatypeProperty",
            parents: [KGmappingData.currentDatabase, "#"],
        };
        return model;
    };

    self.displayMappings = function () {
        var mappings = self.generateMappings();
        common.copyTextToClipboard(JSON.stringify(mappings, null, 2), function (err, result) {
            if (err) return MainController.UI.message(err);
            MainController.UI.message(result);
        });
    };
    self.saveMappings = function () {
        var mappingName = KGmappingData.currentKGtable.data.adlView || KGmappingData.currentKGtable.data.adlTable || KGmappingData.currentKGtable.data.label;

        mappingName = self.currentKGsource + "_" + KGmappingData.currentDatabase + "_" + mappingName;
        //   mappingName = KGmappingData.currentKGdataSource.dbName + "_" +  mappingName
        var mappings = self.generateMappings();
        var comment = prompt(mappingName + " optional comment :");
        if (comment === null) return;

        self.isModifyingMapping = false;

        var payload = {
            mappings: mappings,
            source: mappingName,
        };

        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/kg/mappings",
            data: payload,
            dataType: "json",
            success: function (_data, _textStatus, _jqXHR) {
                return MainController.UI.message(mappingName + " mappings saved");
            },
            error: function (err) {
                return MainController.UI.message(err);
            },
        });
    };
    self.generateMappings = function () {
        var data = { mappings: [], model: {}, graph: {} };
        for (var key in self.currentMappedColumns) {
            var obj = self.currentMappedColumns[key];
            var objObj = "";
            if (obj.types.length > 1) {
                var switches = {};
                obj.types.forEach(function (item) {
                    switches[item.condition] = item.type_id;
                });
                objObj = {
                    column: obj.columnId,
                    switch: switches,
                };
            } else {
                objObj = obj.types[0].type_id;
            }
            data.mappings.push({
                subject: key,
                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                object: objObj,
            });

            obj.types.forEach(function (item) {
                data.model[item.type_id] = { parents: item.type_parents, label: item.type_label };
            });

            data.graph = visjsGraph.getNodesPosition();
        }

        for (key in KGmappingGraph.mappedProperties.mappings) {
            obj = KGmappingGraph.mappedProperties.mappings[key];
            data.mappings.push({
                subject: obj.subject,
                predicate: obj.predicate,
                object: obj.object,
            });
        }
        for (key in KGmappingGraph.mappedProperties.model) {
            data.model[key] = KGmappingGraph.mappedProperties.model[key];
        }
        self.currentMappingData = {};

        data.data = {
            adlSource: KGmappingData.currentKGdataSource,
            adlTable: KGmappingData.currentKGtable.data.adlTable,
            //  build: self.currentMappingData.build
        };
        if (KGmappingData.currentKGtable.data.sql) {
            data.data.sql = KGmappingData.currentKGtable.data.sql;
            data.data.adlTable = KGmappingData.currentKGtable.data.adlTable;
        }

        return data;
        /* $("#mainDialogDiv").html(JSON.stringify(data, null, 2))
             $("#mainDialogDiv").dialog("open")*/
    };

    self.clearMappings = function () {
        self.currentMappedColumns = {};
        KGmappingGraph.initMappedProperties();
        $(".dataSample_type").html("");
        visjsGraph.clearGraph();
        KGadvancedMapping.assignConditionalTypeOn;
        TextAnnotator.isAnnotatingText = false;
    };

    self.showNodeInfos = function (node) {
        if (!node) node = self.currentJstreeNode;
        if (Array.isArray(node.data)) {
            node.data = node.data[0];
        }
        SourceBrowser.showNodeInfos(node.data.source, node.data.id, "mainDialogDiv");
    };

    self.literalValues = [
        "xsd:string",
        "xsd:integer",
        "xsd:int",
        "xsd:decimal",
        "xsd:float",
        "xsd:dateTime",
        "xsd:boolean",
        "xsd:double",
        "xsd:short",
        /*   'xsd:nonNegativeInteger',
               'xsd:negativeInteger',
                'xsd:positiveInteger',
               'xsd:nonPositiveInteger',
               'xsd:long',
               'xsd:unsignedLong',
               'xsd:hexBinary',
               'xsd:gYear',
               'xsd:anyURI',
               'xsd:NMTOKEN',
               'xsd:normalizedString',
               'xsd:unsignedInt',
               'xsd:base64Binary',
               'xsd:time',
               'xsd:gMonthDay',
               'xsd:token',
               'xsd:Name',

               'xsd:unsignedShort',

               'xsd:date',
               'xsd:gDay',
               'xsd:language',
               'xsd:NCName',
               'xsd:byte',
               'xsd:unsignedByte',

               'xsd:gYearMonth',
               'xsd:gMonth',*/
    ];

    self.sourceTypeColors = {
        KGmappings_LiteralsTree: "#d9bb73",
        KGmappings_OneModelTree: "#ebefe3",
        KGmappingsjsOtherOntologiesTreeDiv: "darkseagreen",
        KGmappingPropertiesTree: "#86d5f8",
    };

    return self;
})();
