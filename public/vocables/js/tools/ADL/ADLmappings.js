/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var ADLmappings = (function () {

        var self = {}
        self.currentSource;
        self.prefixes = {
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdfs",
            "http://www.w3.org/2002/07/owl#": "owl",
            "http://data.total.com/resource/one-model/ontology/": "total"


        }
        self.sampleData = {}


        var dbName;

        //  self.currentMappingsMap={type:"",joins:[],relations:[] }
        self.currentMappingsMap = null;
        self.init = function () {
            self.subjectPropertiesMap = {}
            self.typedObjectsMap = {}
            self.sheetJoinColumns = {}
            constraintsMap = {}
            // ADLcommon.allObjectsMap = {}

        }


        self.onLoaded = function () {
            self.init()
            /*  $("#actionDivContolPanelDiv").html(" <button onclick=\"ADLmappings.Data.loadXlsModel()\">open Xls Model</button>" +*/

            $("#actionDivContolPanelDiv").html("ADL database<select id=\"ADLmappings_DatabaseSelect\">" +

                "                </select>  " +
                " <button onclick=\"ADLmappings.Data.loadADL_SQLModel()\">load ADL Model</button>");
            $("#actionDiv").html(" <div id=\"ADLmappings_dataModelTree\"  style=\"width:400px\"></div>");
            $("#accordion").accordion("option", {active: 2});

            MainController.UI.toogleRightPanel(true)
            $("#graphDiv").load("./snippets/ADL/ADLmappings.html");
            setTimeout(function () {
                $("#rightPanelDiv").html(" <div> Ontology  Properties <div id=\"ADLmappings_ontologyPropertiesTree\" style=\"width:400px\"></div></div>")
                self.currentSource = Config.ADL.OneModelSource;
                self.initAdlsList()
                ADLcommon.Ontology.load(Config.ADL.OneModelSource, function (err, result) {
                    if (err)
                        return MainController.UI.message(err)
                })


            }, 200)
        }
        self.onSourceSelect = function (source) {
            self.currentSource = source;
            OwlSchema.currentSourceSchema = null;

            ADLcommon.Ontology.load(Config.ADL.OneModelSource, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
            })

        }


        self.initAdlsList = function () {
            var adls = []
            for (var key in Config.sources) {
                var sourceObj = Config.sources[key];
                if (sourceObj.schemaType == "INDIVIDUAL" && sourceObj.dataSource && sourceObj.dataSource.dbName) {
                    adls.push({id:sourceObj.dataSource.dbName,label:key})
                }
            }
            common.fillSelectOptions("ADLmappings_DatabaseSelect", adls, true,"label","id")

        }

        self.Ontology = {
            showNodePropertiesTree: function (nodeId, mode) {
                $("#ADLmappings_dataModelTree").jstree(true).select_node(nodeId)
                var jstreeNode = $("#ADLmappings_dataModelTree").jstree(true).get_node(nodeId)
                self.currentModelJstreeNode = jstreeNode
                self.currentJstreeNode = jstreeNode;
                self.Ontology.displayFilteredPropertiesTree(jstreeNode.data, mode)
            }

            ,


            displayFilteredPropertiesTree: function (columnNodeData, mode) {
                var properties;

                self.currentColumn = columnNodeData.id;
                if (!self.typedObjectsMap[columnNodeData.id] || mode == "types") {

                    properties = "rdf:type"
                } else {
                    var type = self.typedObjectsMap[columnNodeData.id].type
                    properties = ADLcommon.constraintsMap.domains[type]
                    //  properties = ADLcommon.constraintsMap.domains[columnNodeData.id]

                }


                var propJstreeData = []
                if (properties == "rdf:type") {


                    propJstreeData.push({
                        id: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                        text: "owl:DatatypePropertyOf",
                        parent: "#",
                        data: {type: "DatatypePropertyOf", id: "http://www.w3.org/2002/07/owl#DatatypeProperty", label: "owl:DatatypeProperty", source: self.currentSource}
                    })

                    for (var id in self.typedObjectsMap) {
                        propJstreeData.push({
                            id: id + common.getRandomHexaId(3),
                            text: id,
                            parent: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                            data: {type: "http://www.w3.org/2002/07/owl#DatatypeProperty", id: id, label: id.substring(id.lastIndexOf(".") + 1), source: self.currentSource}

                        })
                    }
                    propJstreeData.push({
                        id: "http://www.w3.org/2000/01/rdf-schema#label",
                        text: "rdfs:labelOf",
                        parent: "#",
                        data: {type: "labelOf", id: "http://www.w3.org/2000/01/rdf-schema#label", label: "http://www.w3.org/2000/01/rdf-schema#label", source: self.currentSource}
                    })

                    for (var id in self.typedObjectsMap) {
                        propJstreeData.push({
                            id: id + common.getRandomHexaId(3),
                            text: id,
                            parent: "http://www.w3.org/2000/01/rdf-schema#label",
                            data: {type: "http://www.w3.org/2000/01/rdf-schema#label", id: id, label: id.substring(id.lastIndexOf(".") + 1), source: self.currentSource}
                        })
                    }
                    //    propJstreeData = self.Ontology.jstreeData_types

                    ADLcommon.Ontology.jstreeData_types.forEach(function (item) {
                        propJstreeData.push(item)
                    })

                } else {

                    var uniqueIds = {}
                    properties.forEach(function (prop) {
                        if (!uniqueIds[prop]) {
                            uniqueIds[prop] = 1
                            if (!ADLcommon.allObjectsMap[prop])
                                x = 3
                            var label = ADLcommon.allObjectsMap[prop].label || prop

                            propJstreeData.push({
                                id: prop,
                                text: label,
                                parent: "#",
                                data: {id: prop, label: label, source: self.currentSource}
                            })
                        }

                        for (var range in ADLcommon.constraintsMap.properties[prop]) {
                            //   console.log(prop + "  " + JSON.stringify(ADLcommon.constraintsMap.properties[prop], null, 2))
                            label
                            if (!ADLcommon.allObjectsMap[range])
                                label = range
                            else
                                label = ADLcommon.allObjectsMap[range].label || range
                            if (!uniqueIds[range]) {
                                uniqueIds[range] = 1
                                propJstreeData.push({
                                    id: range,
                                    text: label,
                                    parent: prop,
                                    data: {id: range, label: label, source: self.currentSource}

                                })
                            }
                            ADLcommon.constraintsMap.properties[prop][range].forEach(function (item) {
                                if (!uniqueIds[item]) {
                                    uniqueIds[item] = 1

                                    propJstreeData.push({
                                        id: item,
                                        text: "<span class='rangeValue' >" + item + "</span>",
                                        parent: range,
                                        data: {id: item, label: item, source: self.currentSource}

                                    })
                                }
                            })


                        }
                    })

                }
                var optionsClass = {
                    selectTreeNodeFn: self.Ontology.onSelectPropertiesNode,
                    openAll: true
                }
                common.loadJsTree("ADLmappings_ontologyPropertiesTree", propJstreeData, optionsClass)
            }
            ,
            onSelectPropertiesNode: function (event, obj) {
                //  var parentNode = obj.node.parent
                //mode=type
                if (obj.node.data.type == "http://www.w3.org/2002/07/owl#DatatypeProperty") {
                    self.typedObjectsMap[obj.node.data.id].dataProperties.push(self.currentColumn)
                    var text = "dataPropertyOf :\n " + obj.node.data.label
                    $("#dataSample_type_" + self.currentColumn.replace(".", "__")).html(text)
                    self.currentMappingsMap[self.currentColumn.replace(".", "__")].type = text
                } else if (obj.node.data.type == "http://www.w3.org/2000/01/rdf-schema#label") {
                    self.typedObjectsMap[obj.node.data.id].rdfsLabels.push(self.currentColumn)
                    var text = "owlLabelOf :\n " + obj.node.data.label
                    $("#dataSample_type_" + self.currentColumn.replace(".", "__")).html(text)
                    self.currentMappingsMap[self.currentColumn.replace(".", "__")].type = text
                } else if (obj.node.parents.indexOf("http://www.w3.org/1999/02/22-rdf-syntax-ns#type") > -1) {
                    self.typedObjectsMap[self.currentColumn] = {type: obj.node.data.id, rdfsLabels: [], dataProperties: []};


                    var modelNode = $("#ADLmappings_dataModelTree").jstree(true).get_node(self.currentColumn)
                    var propLabel = ADLcommon.allObjectsMap[obj.node.data.id].label
                    $("#ADLmappings_dataModelTree").jstree(true).rename_node(self.currentColumn, "<span  class='typedColumn'>" + propLabel + ":" + modelNode.data.label + "</span>")


                    $("#dataSample_type_" + self.currentColumn.replace(".", "__")).html(obj.node.data.label)
                    self.currentMappingsMap[self.currentColumn.replace(".", "__")].type = obj.node.data.label


                    self.graph.drawNode(self.currentColumn, {type: obj.node.data.label})

                    var ancestors = obj.node.parents;
                    ancestors.push(obj.node.data.id)
                    for (var prop in ADLcommon.constraintsMap.properties) {
                        ancestors.forEach(function (ancestorId) {
                            if (ADLcommon.constraintsMap.properties[prop][ancestorId]) {
                                if (ADLcommon.constraintsMap.properties[prop][ancestorId].indexOf(self.currentColumn) < 0)
                                    ADLcommon.constraintsMap.properties[prop][ancestorId].push(self.currentColumn)
                            } else {
                                // ADLcommon.constraintsMap.properties[prop][ancestorId]=[self.currentColumn]
                            }

                        })
                    }


                } else {
                    //mode=properties
                    parentNode = obj.node.parent
                    if (obj.node.parents.length < 3)
                        return;
                    var propertyNode = obj.node.parents[1]
                    var newChildren = [];
                    var label = ADLcommon.allObjectsMap[propertyNode].label + "->" + ADLcommon.allObjectsMap[parentNode].label + ":" + obj.node.data.label
                    newChildren.push({
                        id: "_" + propertyNode + "_" + self.currentColumn,
                        text: "<span class='typedColumn'>" + label + "</span>",
                        parent: self.currentColumn,
                        data: {type: "triple", subject: self.currentColumn, predicate: propertyNode, object: obj.node.data.id}

                    })
                    common.addNodesToJstree("ADLmappings_dataModelTree", self.currentColumn, newChildren)
                    //  $("#dataSample_mapping_" + self.currentColumn.replace(".", "__")).append(mapping.predicate + " " + mapping.object)
                    self.currentMappingsMap[self.currentColumn.replace(".", "__")].mappings.push({subject: self.currentColumn, predicate: propertyNode, object: obj.node.data.id})
                    self.graph.drawNode(self.currentColumn, {predicate: ADLcommon.allObjectsMap[propertyNode].label, object: obj.node.data.label})
                }

            }
        }
        self.Data = {


            loadADL_SQLModel: function () {

                dbName = $("#ADLmappings_DatabaseSelect").val()
                if (dbName == "")
                    return alert("select a ADL database")

                $.ajax({
                    type: "POST",
                    url: Config.serverUrl,
                    data: {ADLquery: 1, getModel: dbName},
                    dataType: "json",

                    success: function (data, textStatus, jqXHR) {
                        self.Data.showModelJstree(data, dbName)

                    },
                    error: function (err) {
                        alert(err.responseText);
                    }
                })


            },

            loadXlsModel: function (path) {

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
                        self.Data.showModelJstree(data, path)
                    }
                    , error: function (err) {


                        $("#waitImg").css("display", "none");
                        console.log(JSON.stringify(err))
                        console.log(JSON.stringify(query))
                        MainController.UI.message(err.responseText);
                    }
                })


            },

            showModelJstree: function (data, source) {

                if (self.currentMappingsMap) {

                } else {
                    self.currentMappingsMap = {}
                }
                var modelJstreeData = []
                var existingNodes = {}
                for (var key in data) {
                    modelJstreeData.push({
                        id: key,
                        text: key,
                        parent: "#",
                        data: {type: "table", id: key, label: key, source: source}
                    })

                    data[key].forEach(function (item) {

                        modelJstreeData.push({
                            id: key + "." + item,
                            text: item,
                            parent: key,
                            data: {type: "column", id: key + "." + item, label: item, source: source}

                        })
                    })
                }

                var options = {
                    selectTreeNodeFn: function (event, obj) {
                        self.currentModelJstreeNode = obj.node
                        self.currentJstreeNode = obj.node;
                        var mode = "properties"
                        if (obj.event && obj.event.ctrlKey)
                            mode = "types"
                        ADLmappings.Ontology.displayFilteredPropertiesTree(obj.node.data, mode)
                        self.Data.showSampleData(obj.node)

                    },
                    // contextMenu: self.jstreeContextMenu("Column")
                }
                common.loadJsTree("ADLmappings_dataModelTree", modelJstreeData, options)
                $("#waitImg").css("display", "none");
            }


            ,
            showSampleData: function (node) {
                var limit = 10
                var dbName = node.data.source;
                var table;
                if (node.parents.length == 1)
                    table = node.id
                if (node.parents.length == 2)
                    table = node.parent
                if (node.parents.length == 3)
                    table = node.parents[node.parents[2]]

                function displaySampleData(data) {
                    var cols = []
                    var str = "<table><tr>"
                    var strTypes = ""
                    var strMappings = ""
                    var strJoins = ""
                    data.forEach(function (item) {
                        for (var key in item) {
                            if (cols.indexOf(key) < 0) {
                                cols.push(key);
                                var colId = table + "__" + key;
                                var colType = "";
                                var colMappings = ""
                                var colJoins = ""
                                if (!self.currentMappingsMap[colId])
                                    self.currentMappingsMap[colId] = {type: "", joins: [], mappings: []}
                                else {
                                    colType = self.currentMappingsMap[colId].type
                                    colMappings = JSON.stringify(self.currentMappingsMap[colId].mappings)
                                    colJoins = JSON.stringify(self.currentMappingsMap[colId].joins)

                                }

                                str += "<td class='dataSample_cell'>" + key + "</td>"
                                //   strJoins += "<td  class='dataSample_cell dataSample_join'<span id='dataSample_join_" + colId + "'>" + colJoins + "</span> </td>"
                                strTypes += "<td  class='dataSample_cell dataSample_type'<span id='dataSample_type_" + colId + "'>" + colType + "</span> </td>"

                                //   strMappings += "<td  class='dataSample_cell dataSample_mapping'<span id='dataSample_mapping_" + colId + "'>" + colMappings + "</span> </td>"
                            }
                        }
                    })
                    str += "</tr>"

                    str += "<tr>" + strTypes + "</tr>"
                    //   str += "<tr>" + strMappings + "</tr>"
                    //   str += "<tr>" + strJoins + "</tr>"

                    data.forEach(function (item) {
                        str += "<tr>"
                        cols.forEach(function (col) {
                            var value = ""

                            if (item[col]) {
                                value = item[col]
                            }
                            str += "<td class='dataSample_cell dataSample_cellValue'>" + value + "</td>"
                        })
                        str += "</tr>"
                    })

                    $("#ADLmappings_dataSampleDiv").html(str)
                    setTimeout(function () {
                        /*  $(".dataSample_join").bind("click", function () {

                          })*/

                        $(".dataSample_type").bind("click", function (event) {
                            var nodeId = $(this).attr("id").substring(16).replace("__", ".")
                            var mode = "properties"
                            if (event.ctrlKey)
                                mode = "types"
                            ADLmappings.Ontology.showNodePropertiesTree(nodeId, mode)


                        })
                        /*   $(".dataSample_mapping").bind("click", function () {

                           })*/

                    })
                }


                if (self.sampleData[table]) {

                    displaySampleData(self.sampleData[table])
                } else {

                    var sqlQuery = " select * from " + table + " limit " + limit;

                    $.ajax({
                        type: "POST",
                        url: Config.serverUrl,
                        data: {ADLquery: 1, getData: 1, dbName: dbName, sqlQuery: sqlQuery},
                        dataType: "json",

                        success: function (data, textStatus, jqXHR) {

                            self.sampleData[table] = data,
                                displaySampleData(self.sampleData[table])
                        }
                        , error: function (err) {


                        }
                    })
                }
            }
        }

        self.graph = {
            attrs: {
                table: {shape: "ellipse", color: "grey"},
                column: {shape: "box", color: "#9edae5"},


            },

            drawNode: function (columnObj, targetObj) {
                var existingNodes = visjsGraph.getExistingIdsMap()
                var visjsData = {nodes: [], edges: []}
                var array = columnObj.split(".")
                var table = array[0]
                var column = array[1]

                if (targetObj.object) {

                    if (!existingNodes[targetObj.object]) {
                        var array = targetObj.object.split(".")
                        table = array[0]
                        column = array[1]

                    }
                }
                if (targetObj.predicate) {
                    var edgeId = columnObj + "_" + targetObj.predicate + "_" + targetObj.object
                    if (!existingNodes[edgeId]) {
                        existingNodes[edgeId] = 1
                        visjsData.edges.push({
                                id: edgeId,
                                from: columnObj,
                                to: targetObj.object,
                                label: targetObj.predicate,
                                arrows: "to"
                            }
                        )
                    }


                }


                /*   if (!existingNodes[table]) {
                       visjsData.nodes.push({
                               id: table,
                               label: table,
                               data: {type: table, id: table, label: table},
                               shape: ADLmappings.graph.attrs["table"].shape,
                               color: ADLmappings.graph.attrs["table"].color,
                           }
                       )
                   }*/
                if (!existingNodes[columnObj]) {
                    visjsData.nodes.push({
                            id: columnObj,
                            label: column + "\n" + targetObj.type,
                            data: {type: column, id: columnObj, label: column},
                            shape: ADLmappings.graph.attrs["column"].shape,
                            color: ADLmappings.graph.attrs["column"].color,
                        }
                    )
                }


                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    var options = {
                        selectNodeFn: function (node, event) {
                            var mode = "properties"
                            if (event.ctrlKey)
                                mode = "types"

                            ADLmappings.Ontology.showNodePropertiesTree(node.id, mode)
                        }
                    }
                    visjsGraph.draw("ADLmappings_graph", visjsData, options)
                } else {
                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                }
                visjsGraph.network.fit()


            }


        }

        self.displayMappings = function () {


            //    data: {type: "triple", object: self.currentColumn, predicate: propertyNode, object: obj.node.data.id}
            var data = {
                mappings: [],
                //  sheetJoinColumns: self.sheetJoinColumns,
            };

            var nodes = common.getjsTreeNodes("ADLmappings_dataModelTree")

            for (var key in self.typedObjectsMap) {
                if (self.typedObjectsMap[key].type) {
                    data.mappings.push({
                        subject: key,
                        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                        object: self.typedObjectsMap[key].type
                    })
                }
                if (self.typedObjectsMap[key].dataProperties) {
                    self.typedObjectsMap[key].dataProperties.forEach(function (item) {
                        data.mappings.push({
                            subject: key,
                            predicate: "http://www.w3.org/2002/07/owl#DatatypeProperty",
                            object: item
                        })
                    })
                }

                if (self.typedObjectsMap[key].rdfsLabels) {
                    self.typedObjectsMap[key].rdfsLabels.forEach(function (item) {
                        data.mappings.push({
                            subject: key,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                            object: item
                        })
                    })
                }

            }
            nodes.forEach(function (node) {

                if (node.data.type == "triple") {
                    var subject = node.data.subject
                    var predicate = node.data.predicate
                    var object = node.data.object
                    if (subject && predicate && object) {
                        data.mappings.push({
                            subject: subject,
                            predicate: predicate,
                            object: object

                        })
                    }
                }

            })


            $("#mainDialogDiv").html(JSON.stringify(data, null, 2))
            $("#mainDialogDiv").dialog("open")

        }

        self.loadMappings = function () {


        }

        return self;
    }
)
()
