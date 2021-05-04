/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var ADLmappings = (function () {

        var self = {}
        self.currentModelSource;
        self.prefixes = {
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdfs",
            "http://www.w3.org/2002/07/owl#": "owl",
            "http://data.total.com/resource/one-model/ontology/": "total"


        }


        var dbName;

        //  self.currentMappingsMap={type:"",joins:[],relations:[] }
        self.currentMappingsMap = null;
        self.currentMappedColumns = null;
        self.init = function () {
            self.subjectPropertiesMap = {}
            self.typedObjectsMap = {}
            self.sheetJoinColumns = {}
            self.currentMappedColumns = {}
            constraintsMap = {}
            // ADLcommon.allObjectsMap = {}

        }


        self.onLoaded = function () {
            self.init()
            MainController.UI.openRightPanel()

            $("#actionDivContolPanelDiv").html("ADL database &nbsp;<select onchange='ADLmappingData.loadADL_SQLModel()' id=\"ADLmappings_DatabaseSelect\"> </select>" +
              //  "<button onclick='TextAnnotator.init()'>text annotation</button>  "+
            "<button onclick='ADLassetGraph.drawAsset()'>mapping Graph</button>  "+
                "<button onclick='ADLbuild.initDialog()'>Build triples</button>  "
         //   "<button onclick='ADLassetGraph.drawSemanticAsset()'>target Graph</button>  "
            );

            $("#actionDiv").html(" <div id='ADLmappings_dataModelTree'  style='width:350px;height: 600px;overflow: auto'></div>");
            $("#accordion").accordion("option", {active: 2});
            visjsGraph.clearGraph()
            //  MainController.UI.toogleRightPanel(true)
            $("#graphDiv").html("")
            $("#graphDiv").load("./snippets/ADL/ADLmappings.html");
            $("#rightPanelDiv").load("snippets/ADL/ADLmappingRightPanel.html");


            setTimeout(function () {

                //  $("#ADLmappings_OneModelTab").html("")


                self.currentModelSource = Config.ADL.OneModelSource;
                ADLmappingData.initAdlsList()

                ADLcommon.Ontology.load(Config.ADL.OneModelSource, function (err, result) {
                    if (err)
                        return MainController.UI.message(err)
                    ADLmappings.displayOneModelTree()
                })
                self.displayLiteralsTree()
                //   self.displayPropertiesTree("ADLmappingPropertiesTree")

                $("#ADLmappings_AdvancedMappingDialogDiv").dialog({
                    autoOpen: false,
                    height: 800,
                    width: 1000,
                    modal: false,
                });

                $("#ADLassetGraphDiv").dialog({
                    autoOpen: false,
                    height: 1000,
                    width: 1300,
                    modal: false,
                    close: function( event, ui ) {
                        ADLmappings.isShowingAssetGraph=false
                    },
                    open: function( event, ui ) {
                        ADLmappings.isShowingAssetGraph=true
                    }

                })

            }, 500)

        }

        //
        self.onSourceSelect = function (source) {

            self.clearMappings()
            OwlSchema.currentADLdataSourceSchema = null;

            ADLcommon.Ontology.load(Config.ADL.OneModelSource, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
            })

        }


        //!!! shared by OneModelOntology and sourceBrowser(search)
        self.selectTreeNodeFn = function (event, propertiesMap) {




            if (!self.selectedOntologyNodes)
                self.selectedOntologyNodes = {}
            self.selectedOntologyNodes[propertiesMap.node.data.id] = propertiesMap.node;
            self.currentJstreeNode = propertiesMap.node;


            self.currentJstreeNode.jstreeDiv = event.currentTarget.id
            if (ADLmappingData.currentColumn) {
                ADLmappings.isModifyingMapping=true;
                if (ADLadvancedMapping.addingValueManuallyToNode) {
                    ADLadvancedMapping.addValueManuallyFromOntology(ADLadvancedMapping.addingValueManuallyToNode, propertiesMap.node)
                } else if (ADLadvancedMapping.assignConditionalTypeOn)
                    return ADLmappingData.assignConditionalType(propertiesMap.node)
                else
                    self.AssignOntologyTypeToColumn(ADLmappingData.currentColumn, propertiesMap.node)
            } else if (TextAnnotator.isAnnotatingText)
                TextAnnotator.setAnnotation(propertiesMap.node)
        }


        self.selectPropertyTreeNodeFn = function (event, propertiesMap) {
            if (!self.selectedOntologyNodes)
                self.selectedOntologyNodes = {}
            self.selectedOntologyNodes[propertiesMap.node.data.id] = propertiesMap.node;
            self.currentJstreeNode = propertiesMap.node;
            self.currentJstreeNode.jstreeDiv = event.currentTarget.id
            if (ADLmappingGraph.isAssigningProperty) {
                $("#ADLMapping_graphPropertySpan").html(propertiesMap.node.data.label)
            } else if (TextAnnotator.isAnnotatingText)
                TextAnnotator.setAnnotation(propertiesMap.node)
        },


            self.contextMenuFn = function (treeDiv) {
                var items = {}
                items.nodeInfos = {
                    label: "node infos",
                    action: function (e, xx) {// pb avec source
                        self.showNodeInfos()


                    }
                }

                items.openNode = {
                    label: "open Node",
                    action: function (e, xx) {// pb avec source

                        SourceBrowser.openTreeNode(self.currentJstreeNode.jstreeDiv, self.currentJstreeNode.data.source, self.currentJstreeNode, null)


                    }
                }
                if (treeDiv!="ADLmappings_OneModelTree") {
                    items.copyNodeToClipboard = {
                        label: "copy toClipboard",
                        action: function (e) {// pb avec source

                            Lineage_common.copyNodeToClipboard(self.currentJstreeNode.data)

                        }

                    }
                }

                if (treeDiv=="ADLmappings_OneModelTree") {
                    items.pasteNodeFromClipboard = {
                        label: "paste from Clipboard",
                        action: function (e) {// pb avec source

                            Lineage_common.pasteNodeFromClipboard(self.currentJstreeNode)

                        }

                    }
                }

                return items;
            }
        self.displayLiteralsTree = function () {
            var optionsClass = {
                selectTreeNodeFn: self.selectTreeNodeFn,
                openAll: true,

            }
            var jstreeData = []
            self.literalValues.forEach(function (item) {
                jstreeData.push({
                    id: item,
                    text: item,
                    parent: "#",
                    data: {source: "xsd", id: item, label: item}


                })
            })
            common.jstree.loadJsTree("ADLmappings_LiteralsTree", jstreeData, optionsClass)
        }
        self.displayOneModelTree = function () {
            var propJstreeData = []

            propJstreeData.push({
                id: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                text: "owl:DatatypePropertyOf",
                parent: "#",
                data: {
                    type: "DatatypePropertyOf",
                    id: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                    label: "owl:DatatypeProperty",
                    source: Config.ADL.OneModelSource
                }
            })

            for (var id in self.typedObjectsMap) {
                propJstreeData.push({
                    id: id + common.getRandomHexaId(3),
                    text: id,
                    parent: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                    data: {
                        type: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                        id: id,
                        label: id.substring(id.lastIndexOf(".") + 1),
                        source: Config.ADL.OneModelSource
                    }

                })
            }
            propJstreeData.push({
                id: "http://www.w3.org/2000/01/rdf-schema#label",
                text: "rdfs:labelOf",
                parent: "#",
                data: {
                    type: "labelOf",
                    id: "http://www.w3.org/2000/01/rdf-schema#label",
                    label: "http://www.w3.org/2000/01/rdf-schema#label",
                    source: Config.ADL.OneModelSource
                }
            })

            for (var id in self.typedObjectsMap) {
                propJstreeData.push({
                    id: id + common.getRandomHexaId(3),
                    text: id,
                    parent: "http://www.w3.org/2000/01/rdf-schema#label",
                    data: {
                        type: "http://www.w3.org/2000/01/rdf-schema#label",
                        id: id,
                        label: id.substring(id.lastIndexOf(".") + 1),
                        source: Config.ADL.OneModelSource
                    }
                })
            }


            ADLcommon.Ontology.jstreeData_types.forEach(function (item) {
                if (item.parent == "#") {
                    item.parent = Config.ADL.OneModelSource

                }
                item.data.source = Config.ADL.OneModelSource
                propJstreeData.push(item)

            })
            propJstreeData.push({
                id: Config.ADL.OneModelSource,
                text: Config.ADL.OneModelSource,
                parent: "#"
            })
            var optionsClass = {
                selectTreeNodeFn: self.selectTreeNodeFn,
                openAll: true,
                searchPlugin: {
                    "case_insensitive": true,
                    "fuzzy": false,
                    "show_only_matches": true
                },
                contextMenu: self.contextMenuFn("ADLmappings_OneModelTree")
            }
            common.jstree.loadJsTree("ADLmappings_OneModelTree", propJstreeData, optionsClass)
        }


        self.displayPropertiesTree = function (treeDivId) {
            Lineage_properties.getPropertiesjsTreeData(Config.ADL.OneModelSource, null, null, function (err, jsTreeData) {
                if (err)
                    return MainController.UI.message(err)




                jsTreeData.forEach(function (item) {
                    if (item.parent == "#")
                        item.parent = Config.ADL.OneModelSource
                })
                jsTreeData.push({id: Config.ADL.OneModelSource, text: Config.ADL.OneModelSource, parent: "#"})



                var jsTreeData2=[{
                    id: "http://www.w3.org/2000/01/rdf-schema#",
                    text: "rdfs:label",
                    parent: "#",
                    data: {
                        "type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
                        "id": "http://w3id.org/readi/rdl/CFIHOS-45000017_superprop",
                        "label": "rdfs:label",
                        "source": "RDFS",
                        "parent": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"
                    }
                },
                    {
                        id: "http://www.w3.org/2002/07/owl##DatatypeProperty",
                        text: "owl:DatatypeProperty",
                        parent: "#",
                        data: {
                            "type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
                            "id": "http://www.w3.org/2002/07/owl##DatatypeProperty",
                            "label": "owl:DatatypeProperty",
                            "source": "OWL",
                            "parent": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"
                        }
                    }



                ]



                jsTreeData=jsTreeData2.concat(jsTreeData)



                var options = {
                    selectTreeNodeFn: self.selectPropertyTreeNodeFn,
                    openAll: true,
                    contextMenu: self.contextMenuFn("ADLmappingPropertiesTree"),
                    searchPlugin: {
                        "case_insensitive": true,
                        "fuzzy": false,
                        "show_only_matches": true
                    },

                }
                common.jstree.loadJsTree(treeDivId, jsTreeData, options);
            })
        }


        self.AssignOntologyTypeToColumn = function (column, node) {
            ADLmappingData.setDataSampleColumntype(column, node)


            var types = []
            if (!Array.isArray(node.data))
                node.data = [node.data]
            node.data.forEach(function (item) {
                types.push({
                    type_id: item.id,
                    type_label: item.label,
                    type_parents: node.parents || item.parents,
                    condition: item.condition
                })
            })
            ADLmappings.currentMappedColumns[column] = {
                columnId: column,
                types: types,
            }
            var color = self.sourceTypeColors[node.jstreeDiv]
            ADLmappingGraph.drawNode(column, color,node.position)

            ADLmappingData.currentColumn = null;
            $(".dataSample_type").removeClass("datasample_type_selected")
        }

        self.unAssignOntologyTypeToColumn = function (column, node) {
            ADLmappingData.setDataSampleColumntype(column, "")


            delete ADLmappings.currentMappedColumns[column]

            ADLmappingGraph.graphActions.removeNode(column)

            ADLmappingData.currentColumn = null;
            $(".dataSample_type").removeClass("datasample_type_selected")
        }


        self.checkMappingEditionSave=function(){

            if(ADLmappings.isModifyingMapping) {
                if (confirm("continue without saving current mapping  ?")) {
                    ADLmappings.isModifyingMapping=false
                    return true
                }
                return false;
            }
            else{
                return true
            }


        }
        self.loadMappings = function (name) {
            if (!name)
                name = self.currentADLdataSource.dbName + "_" + ADLmappingData.currentADLtable.data.adlView || ADLmappingData.currentADLtable.data.adlTable
            var payload = {ADL_GetMappings: name}
            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (data, textStatus, jqXHR) {
                    if (!data.mappings)
                        return;
                    if (!data.model) {
                        data.model = self.generateADLModel(data.mappings)

                    }
                    self.clearMappings()


                    var basicPredicates = {
                        // "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        "http://www.w3.org/2000/01/rdf-schema#label": "rdfs:label",
                        "http://www.w3.org/2002/07/owl#DatatypeProperty": "owl:DatatypeProperty"
                    }
                    var associations = []
                    self.currentMappingData=data.data
                    data.mappings.forEach(function (item) {

                        if (item.predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                            var node = {}
                            if (typeof item.object === "object") {
                                //process switch
                                if (item.object.switch) {
                                    node.data = []
                                    for (var key in item.object.switch) {
                                        var value = item.object.switch[key]
                                        var label = key;
                                        var parents = ["?", "#"]
                                        if (data.model[value]) {
                                            label = data.model[value].label
                                            parents = data.model[value].parents
                                        }
                                        node.data.push({
                                            condition: key,
                                            id: value,
                                            label: label,
                                            parents: parents
                                        })
                                    }
                                }
                            } else {

                                node.data = {
                                    id: item.object,
                                    label: data.model[item.object].label,
                                    parents: data.model[item.object].parents
                                }
                            }


                            if (data.model[item.object].parents.indexOf("ONE-MODEL") > -1)
                                node.jstreeDiv = "ADLmappings_OneModelTree"
                            else if (item.object.indexOf("xsd") > -1)
                                node.jstreeDiv = "ADLmappings_LiteralsTree"
                            else
                                node.jstreeDiv = "ADLmappingsjsOtherOntologiesTreeDiv"


                        if(data.graph && data.graph[item.subject]){
                            node.position=data.graph[item.subject]
                        }

                            self.AssignOntologyTypeToColumn(item.subject, node)
                        }

                        //association
                        else if (item.object.indexOf("http") < 0) {

                            //label and DatatypeProperty
                            if (basicPredicates[item.predicate]) {
                                node = {
                                    data: {
                                        label: basicPredicates[item.predicate] + "<br>" + item.subject,
                                    }
                                }
                                ADLmappingData.setDataSampleColumntype(item.object, node)
                                var edgeId = item.subject + "_" + item.predicate + "_" + item.object
                                ADLmappingGraph.mappedProperties.mappings[edgeId] = {
                                    subject: item.subject,
                                    predicate: item.predicate,
                                    object: item.object,

                                }

                                return;
                            } else if (data.model[item.predicate]) {
                                data.model[item.predicate]
                            }

                            if (!data.model[item.predicate]) {
                                data.model[item.predicate] = {
                                    parents: ["?", "#"],
                                    label: item.predicate
                                }
                            }
                            var propLabel = data.model[item.predicate].label
                            var property = {data: {id: item.predicate, label: propLabel}}
                            var assocation = {
                                subject: {data: {columnId: item.subject}},
                                object: {data: {columnId: item.object}}
                            }
                            associations.push({property: property, association: assocation})


                            var column = item.object
                            var p = column.indexOf("^")
                            // literal
                            if (p > -1) {
                                column = column.substring(0, p);

                                var label = data.model[item.predicate].label + "<br>" + item.subject
                                ADLmappingData.setDataSampleColumntype(column, {data: {label: label}})
                            }


                        }
                    })
                    associations.forEach(function (item) {
                        ADLmappingGraph.graphActions.setAssociation(item.property, item.association)
                    })
                    if (data.infos) {
                        var html = "Last modified by : " + data.infos.modifiedBy + " " + data.infos.lastModified + " " + data.infos.comment
                        $("#ADLmappings_mappingInfos").html(html)
                    }


                }, error: function (err) {

                    return MainController.UI.message(err);
                }
            })

        }

        /**
         *
         * for old mappings (before march 2020 generate model from one model jstree
         *
         * @param mappings
         * @returns {{}}
         */
        self.generateADLModel = function (mappings) {
            var model = {}

            function getOneModelTreeInfos(id) {
                var oneModelNode = $("#ADLmappings_OneModelTree").jstree().get_node(id)
                if (oneModelNode) {
                    return {
                        parents: oneModelNode.parents,
                        label: oneModelNode.data.label
                    }
                } else
                    return null;
            }

            mappings.forEach(function (item) {
                if (typeof item.object === "object") {
                    if (item.object.switch) {
                        for (var key in item.object.switch) {
                            var id = item.object.switch[key]
                            model[id] = getOneModelTreeInfos(id)
                        }
                    }


                } else if (item.object.indexOf("http") > -1) {
                    model[item.object] = getOneModelTreeInfos(item.object)
                }


                var propertyJstreeNode = $("#ADLmappingPropertiesTree").jstree(true).get_node(item.predicate)
                if (propertyJstreeNode) {
                    model[item.predicate] = {
                        parents: propertyJstreeNode.parents,
                        label: propertyJstreeNode.data.label
                    }
                } else {
                    model[item.predicate] = {
                        parents: ["?", "#"],
                        label: item.predicate
                    }
                }
            })


            model["http://www.w3.org/2000/01/rdf-schema#label"] = {
                label: "rdfs:label",
                parents: [ADLmappingData.currentDatabase, "#"]
            }
            model["http://www.w3.org/2002/07/owl#DatatypeProperty"] = {
                label: "owl:DatatypeProperty",
                parents: [ADLmappingData.currentDatabase, "#"]
            }
            return model;

        }

        self.displayMappings = function () {
            var mappings = self.generateMappings()
            common.copyTextToClipboard(JSON.stringify(mappings, null, 2), function (err, result) {
                if (err)
                    return MainController.UI.message(err);
                MainController.UI.message(result);
            })

        }
        self.saveMappings = function () {
            var mappingName=ADLmappingData.currentADLtable.data.adlView || ADLmappingData.currentADLtable.data.adlTable || ADLmappingData.currentADLtable.data.label


            mappingName = ADLmappingData.currentADLdataSource.dbName + "_" +  mappingName
            var mappings = self.generateMappings();
            var comment = prompt(mappingName + " optional comment :")
            if (comment === null)
                return

            self.isModifyingMapping=false;
            mappings.infos = {lastModified: new Date(), modifiedBy: authentication.currentUser.identifiant, comment}
            if(!self.currentMappingData) {
                self.currentMappingData = {}

                mappings.data = {
                    adlSource: ADLmappingData.currentADLdataSource,
                    adlTable: ADLmappingData.currentADLtable.text,
                  //  build: self.currentMappingData.build
                }
                if (ADLmappingData.currentADLtable.data.sql) {
                    mappings.data.sql = ADLmappingData.currentADLtable.data.sql
                    mappings.data.adlTable = ADLmappingData.currentADLtable.data.adlTable
                }
            }else{
                mappings.data=self.currentMappingData
            }
            var payload = {
                ADL_SaveMappings: true,
                mappings: JSON.stringify(mappings, null, 2),
                ADLsource: mappingName
            }

            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (data, textStatus, jqXHR) {
                    return MainController.UI.message(mappingName + " mappings saved");


                }, error: function (err) {

                    return MainController.UI.message(err);
                }
            })
        }
        self.generateMappings = function () {

            var data = {mappings: [], model: {},graph:{}}
            for (var key in self.currentMappedColumns) {
                var obj = self.currentMappedColumns[key]
                var objObj = ""
                if (obj.types.length > 1) {
                    var switches = {}
                    obj.types.forEach(function (item) {
                        switches[item.condition] = item.type_id
                    })
                    objObj = {
                        "column": obj.columnId,
                        "switch": switches
                    }
                } else {
                    objObj = obj.types[0].type_id
                }
                data.mappings.push({
                    subject: key,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: objObj
                })

                obj.types.forEach(function (item) {
                    data.model[item.type_id] = {parents: item.type_parents, label: item.type_label}
                })

               data.graph= visjsGraph.getNodesPosition()


            }

            for (var key in ADLmappingGraph.mappedProperties.mappings) {
                var obj = ADLmappingGraph.mappedProperties.mappings[key]
                data.mappings.push({
                    subject: obj.subject,
                    predicate: obj.predicate,
                    object: obj.object
                })
            }
            for (var key in ADLmappingGraph.mappedProperties.model) {

                data.model[key] = ADLmappingGraph.mappedProperties.model[key]
            }


            return data
            /* $("#mainDialogDiv").html(JSON.stringify(data, null, 2))
             $("#mainDialogDiv").dialog("open")*/

        }

        self.clearMappings = function () {
            self.currentMappedColumns = {}
            ADLmappingGraph.initMappedProperties()
            $(".dataSample_type").html("");
            visjsGraph.clearGraph()
            //  $("#graphDiv").load("./snippets/ADL/ADLmappings.html");
            ADLadvancedMapping.assignConditionalTypeOn
            TextAnnotator.isAnnotatingText = false;
        }


        self.showNodeInfos = function (node) {
            if (!node)
                node = self.currentJstreeNode
            MainController.UI.showNodeInfos(node.data.source, node.data.id, "mainDialogDiv")
        }


        self.literalValues = [
            'xsd:string',
            'xsd:integer',
            'xsd:int',
            'xsd:decimal',
            'xsd:float',
            'xsd:dateTime',
            'xsd:boolean',
            'xsd:double',
            'xsd:short',
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
        ]

        self.sourceTypeColors = {
            ADLmappings_LiteralsTree: "#d9bb73",
            ADLmappings_OneModelTree: "#d0e5a6",
            ADLmappingsjsOtherOntologiesTreeDiv: "darkseagreen",
            ADLmappingPropertiesTree: "#86d5f8"
        }


        return self;
    }

)
()
