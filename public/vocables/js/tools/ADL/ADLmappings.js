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
            self.currentMappedColumns = {};
            constraintsMap = {}
            // ADLcommon.allObjectsMap = {}

        }


        self.onLoaded = function () {
            self.init()


            $("#actionDivContolPanelDiv").html("ADL database &nbsp;<select onchange='ADLmappingData.loadADL_SQLModel()' id=\"ADLmappings_DatabaseSelect\"> </select>  ");

            $("#actionDiv").html(" <div id=\"ADLmappings_dataModelTree\"  style=\"width:400px\"></div>");
            $("#accordion").accordion("option", {active: 2});

            MainController.UI.toogleRightPanel(true)
            $("#graphDiv").load("./snippets/ADL/ADLmappings.html");
            $("#rightPanelDiv").load("snippets/ADL/ADLmappingRightPanel.html");
            setTimeout(function () {

                $("#ADLmappings_OneModelTab").html(" <button onclick=\"ADLmappings.displayOneModelTree(null,'types')\">reload</button>" +
                    "<div> Ontology  Properties <div id=\"ADLmappings_ontologyPropertiesTree\" style=\"width:400px\"></div></div>")
                self.currentModelSource = Config.ADL.OneModelSource;
                ADLmappingData.initAdlsList()
                ADLcommon.Ontology.load(Config.ADL.OneModelSource, function (err, result) {
                    if (err)
                        return MainController.UI.message(err)
                })


            }, 200)
        }

        //
        self.onSourceSelect = function (source) {

            self.currentMappedColumns = {}
            OwlSchema.currentADLdatabaseSchema = null;

            ADLcommon.Ontology.load(Config.ADL.OneModelSource, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
            })

        }


            //!!! shared by OneModelOntology and sourceBrowser(search)
        self.selectTreeNodeFn = function (event, propertiesMap) {
            if (!ADLmappingData.currentColumn)
                return alert("select a column")
            self.AssignOntologyTypeToColumn(ADLmappingData.currentColumn,propertiesMap.node)
        }


        self.displayOneModelTree = function (columnNodeData, mode) {
            var properties;
            if (!columnNodeData)
                columnNodeData = {id: -1}

            if (true) {

                properties = "rdf:type"
            }


            var propJstreeData = []
            if (properties == "rdf:type") {


                propJstreeData.push({
                    id: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                    text: "owl:DatatypePropertyOf",
                    parent: "#",
                    data: {
                        type: "DatatypePropertyOf",
                        id: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                        label: "owl:DatatypeProperty",
                        source: ADLmappingData.currentDatabase
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
                            source: ADLmappingData.currentDatabase
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
                        source: ADLmappingData.currentDatabase
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
                            source: ADLmappingData.currentDatabase
                        }
                    })
                }
                //    propJstreeData = self.Ontology.jstreeData_types

                ADLcommon.Ontology.jstreeData_types.forEach(function (item) {
                    propJstreeData.push(item)
                })

            }
            var optionsClass = {
                selectTreeNodeFn: self.selectTreeNodeFn,
                openAll: true
            }
            common.loadJsTree("ADLmappings_ontologyPropertiesTree", propJstreeData, optionsClass)
        }


        self.AssignOntologyTypeToColumn = function (column,node) {
            ADLmappingData.setDataSampleColumntype(column, node)
            ADLmappingGraph.drawNode(column)
            ADLmappingData.currentColumn = null;
            $(".dataSample_type").removeClass("dataSample_type_selected")
        }


        self.loadMappings = function (name) {
            if (!name)
                name = self.currentADLdatabase + "_" + self.currentADLtable.data.label
            var payload = {ADL_GetMappings: name}
            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (data, textStatus, jqXHR) {
                    var x = data;
                    data.mappings.forEach(function (item) {
                        if (item.predicate == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                          var node={data:{id:item.object,label:item.object, parents:data.model[item.object]}}
                          self.AssignOntologyTypeToColumn(item.subject,node)
                        } else {

                        }
                    })


                }, error: function (err) {

                    return MainController.UI.message(err);
                }
            })

        }

        self.displayMappings = function () {
            var mappings = self.getMappings()
            common.copyTextToClipboard(JSON.stringify(mappings, null, 2))
            MainController.UI.message("mappings copied to clipboard");
        }
        self.saveMappings = function () {
            var mappings = self.getMappings()
            var payload = {
                ADL_SaveMappings: true,
                mappings: JSON.stringify(mappings, null, 2),
                ADLsource: ADLmappingData.currentADLdatabase + "_" + ADLmappingData.currentADLtable.data.label
            }

            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (data, textStatus, jqXHR) {
                    return MainController.UI.message(ADLmappingData.currentDatabase + " mappings saved");


                }, error: function (err) {

                    return MainController.UI.message(err);
                }
            })
        }
        self.getMappings = function () {

            var data = {mappings: [], model: {}}
            for (var key in self.currentMappedColumns) {
                var obj = self.currentMappedColumns[key]
                data.mappings.push({
                    subject: key,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: obj.type_id
                })
                /*    data.mappings.push({
                        subject: key,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                        object: obj.type_label
                    })*/


                data.model[obj.type_id] = obj.type_parents


                for (var key in ADLmappingGraph.mappedProperties.mappings) {
                    var obj = ADLmappingGraph.mappedProperties.mappings[key]
                    data.mappings.push({
                        subject: obj.subject,
                        predicate: obj.predicate,
                        object: obj.object
                    })
                }
                for (var key in ADLmappingGraph.mappedProperties.model) {

                    data.model[obj.type_id] = ADLmappingGraph.mappedProperties.model[key]
                }


            }
            return data
            /* $("#mainDialogDiv").html(JSON.stringify(data, null, 2))
             $("#mainDialogDiv").dialog("open")*/

        }

        self.clearMappings = function () {
            self.currentMappedColumns = {}
            $(".dataSample_type").html("")
        }

        return self;
    }

)
()
