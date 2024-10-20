import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import KGconstraintsModeler from "./KGconstraintsModeler.js";
import common from "../../shared/common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";

var Cfihos_pump_poc = (function () {
    var self = {};
    self.valuesMap = {}

    self.query = function (uri) {
        if (!uri) {
            uri = "http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClassCFIHOS-30000521";
        }
        KGconstraintsModeler.visjsGraph.clearGraph();
        var uniqueNodes = {};
        var visjsData = {nodes: [], edges: []};

        var propertyTypes = {
            "http://w3id.org/readi/rdl/D101001535": {type: "Picklist", color: "#07b611", shape: "box"},
            "http://w3id.org/readi/rdl/D101001516": {type: "PhysicalQuantity", color: "#90d6e4", shape: "box"},
            "http://w3id.org/readi/rdl/D101001532": {type: "text", color: "#efbf00", shape: "text"},

        }
        var distinctPicklists = [];
        var classAncestors=[{id:uri,label:""}]
        var uriNodeId
        async.series(
            [

                //get SuperClasses
                function (callbackSeries) {

                            Sparql_OWL.getNodesAncestorsOrDescendants(self.currentSource,[uri],{ excludeItself: 0},function(err,result){
                    if (err) {
                        return alert(err.responseText || err);
                    }
                    result.hierarchies[uri].forEach(function(item){
                        classAncestors.splice(0,0,{id:item.superClass.value,label:item.superClassLabel.value})

                    })

                    callbackSeries()
                    })

                },


                //getRestrictions  and addNodes
                function (callbackSeries) {



                async.eachSeries(classAncestors, function (ancestor,callbackEach) {
                    var options = {filter: " ?value rdfs:subClassOf ?valueClass."}
                    Sparql_OWL.getObjectRestrictions(self.currentSource, ancestor.id, options, function (err, result) {
                        if (err) {
                            return alert(err.responseText || err);
                        }
                        if (result.length == 0) {
                            return callbackEach()
                            //return UI.message("no data");
                        }


                        var classId;

                        result.sort(function (a, b) {
                            if (a.valueClass.value > b.valueClass.value) {
                                return 1;
                            }
                            if (a.valueClass.value < b.valueClass.value) {
                                return -1;
                            }
                            return 0;
                        })

                        if ( !uniqueNodes[result[0].subjectLabel.value]) {
                            uniqueNodes[result[0].subjectLabel.value]=1
                            individualId = common.getRandomHexaId(5);

                            visjsData.nodes.push({
                                id: individualId,
                                label: "my" + result[0].subjectLabel.value,
                                color: "#eab3b3",
                                level: 0,
                                data: {
                                    id: result[0].subject.value,
                                    label: "my" + result[0].subjectLabel.value,
                                    type: "Individual",
                                    source: self.currentSource,
                                },
                            });

                            if(result[0].subject.value !=uri ) {
                                visjsData.edges.push({
                                    from: uriNodeId,
                                    label: "",
                                    to: individualId,
                                    width: 2,
                                    data: {
                                        type: "SubClass",
                                    },
                                    arrows: null,
                                    color: "#ccc",
                                })
                            }else{
                                uriNodeId=individualId
                            }
                        }
                        result.forEach(function (item) {
                            if (!uniqueNodes[item.subject.value]) {
                                classId = common.getRandomHexaId(5);
                                uniqueNodes[item.subject.value] = classId;

                                visjsData.nodes.push({
                                    id: classId,
                                    label: item.subjectLabel.value,
                                    shape: "box",
                                    color: "#00afef",
                                    level: 1,
                                    data: {
                                        id: item.subject.value,
                                        label: item.subjectLabel.value,
                                        type: "Class",
                                        source: self.currentSource,
                                    },
                                });
                                visjsData.edges.push({
                                    from: individualId,
                                    label: "",
                                    to: classId,
                                    width: 2,
                                    data: {
                                        type: "rdf:type",
                                    },
                                    arrows: null,
                                    color: "#ccc",
                                });
                            }

                            if (!uniqueNodes[item.prop.value]) {
                                var objectId = common.getRandomHexaId(5);
                                uniqueNodes[item.prop.value] = objectId;
                                distinctPicklists.push(item.prop.value);
                                visjsData.nodes.push({
                                    id: objectId,
                                    label: item.propLabel.value,
                                    shape: "box",
                                    color: "#00afef",
                                    level: 3,
                                    data: {
                                        id: item.value.value,
                                        label: item.propLabel.value,
                                        type: "Class",
                                        datatype: "Property",
                                        source: self.currentSource,

                                    },
                                });
                                visjsData.edges.push({
                                    from: classId,
                                    label: "", //item.propLabel.value,
                                    to: objectId,
                                    width: 2,
                                    data: {
                                        type: "rdf:type",
                                        id: item.prop.value,
                                        label: item.propLabel.value,
                                    },
                                    arrows: null,
                                    color: "#ccc",
                                });


                                var objectId = common.getRandomHexaId(5);
                                uniqueNodes[item.value.value] = objectId;
                                var attrs = propertyTypes[item.valueClass.value] || {}
                                var shape = attrs.shape || "box";
                                var color = attrs.color || "#07b611";
                                var datatype = attrs.type || "?"

                                visjsData.nodes.push({
                                    id: objectId,
                                    label: item.valueLabel.value,
                                    shape: shape,
                                    color: color,
                                    level: 5,
                                    data: {
                                        id: item.value.value,
                                        label: item.valueLabel.value,
                                        type: "Class",
                                        datatype: datatype,
                                        source: self.currentSource,
                                    },
                                });
                                visjsData.edges.push({
                                    from: uniqueNodes[item.prop.value],
                                    label: "",
                                    to: objectId,
                                    width: 2,
                                    data: {
                                        type: "rdf:type",
                                    },
                                    arrows: null,
                                    color: "#ccc",
                                });
                            }

                        })
                        callbackEach()
                    })

                },function(err){
                 callbackSeries()
                })
                },

            ],
            function (err) {
                KGconstraintsModeler.drawGraphCanvas(KGconstraintsModeler.graphDiv, visjsData);
            }
        );
    };

    self.getPickListContent = function (picklist, callback) {

        if (self.valuesMap[picklist]) {
            return callback(null, self.valuesMap[picklist])
        }


        Sparql_OWL.getClassIndividuals(self.currentSource, [picklist], null, function (err, result) {
            if (err) {
                return callback(err);
            }

            var values = [];
            result.forEach(function (item) {
                values.push({
                    id: item.id.value,
                    label: item.label.value,
                });
            });
            self.valuesMap[picklist] = values
            return callback(null, values);

        })

    };
    self.getUnitOfMeasureContent = function (dimensionId, callback) {

        if (self.valuesMap[dimensionId]) {
            return callback(null, self.valuesMap[dimensionId])
        }


        var query = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "select distinct *  FROM   <http://w3id.org/readi/rdl/>" +
            "  WHERE {?subject ?prop ?object. " +
            " FILTER( ?object =<" + dimensionId + ">) FILTER( ?prop =<http://w3id.org/readi/rdl/D101001524>) " +
            " . ?subject rdfs:label ?label. ?subject skos:altLabel ?altLabel}" +
            " order by ?propLabel  limit 100"

        Sparql_proxy.querySPARQL_GET_proxy(Config._defaultSource.sparql_server.url, query, null, {source: self.currentSource}, function (err, result) {
            if (err) {
                return callback(err);
            }
            var values = [];
            result.results.bindings.forEach(function (item) {
                values.push({
                    id: item.subject.value,
                    label: item.altLabel.value,
                });
            });
            self.valuesMap[dimensionId] = values
            return callback(null, values);

        });


    };

    self.getValueLabel = function (value) {
        var label = null;
        for (var key in self.valuesMap) {
            for (var key2 in self.valuesMap[key]) {
                var obj = self.valuesMap[key][key2]
                if (obj) {
                    label = obj.label
                }

            }
        }
        return label || value

    }

    self.saveConstraintValues = function () {

        var value = "";
        var label = ""
        var datatype = KGconstraintsModeler.currentGraphNode.data.datatype;
        if (datatype == "Picklist") {
            value = $("#KGconstraint_PicklistValueSelect").val();
            label = self.getValueLabel(value)


        } else if (datatype == "Litteral") {
            value = $("#KGconstraint_litteralValue").val();
            label = value
        }
        if (datatype == "PhysicalQuantity") {
            value = $("#KGconstraint_PhysicalQuantityValue").val();
            var unit = $("#KGconstraint_UnitOfMesasureSelect").val();
            if (!unit || !value) {
                return;
            }
            var unit = self.getValueLabel(unit)
            value += unit;
            label = value
        }
        var color = "#eab3b3";
        var type = KGconstraintsModeler.currentGraphNode.data.type;
        if (type == "RequiredValue") {
            color = "#af7ede";
            type = "ProposedValue";
        } else {
            type = "RequiredValue";
        }
        var visjsData = {nodes: [], edges: []};
        var nodeId = common.getRandomHexaId(5);
        $("#smallDialogDiv").dialog("close");

        visjsData.nodes.push({
            id: nodeId,
            label: label,
            shape: "box",
            color: color,
            level: KGconstraintsModeler.currentGraphNode.level + 1,
            data: {
                id: value,
                label: label,
                type: "RequiredValue",
                datatype: datatype,
                source: self.currentSource,
            },
        });
        visjsData.edges.push({
            from: KGconstraintsModeler.currentGraphNode.id,
            label: "value",
            to: nodeId,
            width: 2,
            data: {
                type: "rdf:type",
            },
            arrows: null,
            color: "#ccc",
        });

        KGconstraintsModeler.visjsGraph.data.nodes.add(visjsData.nodes);
        KGconstraintsModeler.visjsGraph.data.edges.add(visjsData.edges);
    };

    self.setItemAsSelected = function () {
        self.isTemplateModified = true;
        var datatype = KGconstraintsModeler.currentGraphNode.data.datatype;
        var html = "<div style='width:300px;minHeight:250px'>";
        if (datatype == "Picklist") {
            Cfihos_pump_poc.getPickListContent(KGconstraintsModeler.currentGraphNode.data.id, function (err, result) {
                if (err) {
                    return alert(err.responseText || err);
                }

                html += "<select size='10' style='width:200px' id='KGconstraint_PicklistValueSelect'  onchange='Cfihos_pump_poc.saveConstraintValues()'>";

                $("#smallDialogDiv").html(html);
                $("#smallDialogDiv").dialog("open");
                $("#smallDialogDiv").dialog("option", "title", "Picklist values");
                var options = {openAll: true};
                common.fillSelectOptions("KGconstraint_PicklistValueSelect", result, false, "label", "id");
            });
        } else if (datatype == "Litteral") {
            if (KGconstraintsModeler.currentGraphNode.data.id == "Boolean") {
                html += "<select style='width:100px' id='KGconstraint_litteralValue' >" + "<option>true</option>" + "<option>false</option>" + "</select>";
            } else {
                html += "<textarea  id='KGconstraint_litteralValue'></textarea>";
            }

            html += "<br><button onclick='Cfihos_pump_poc.saveConstraintValues()'>OK</button>";

            $("#smallDialogDiv").html(html);
            $("#smallDialogDiv").dialog("open");
            $("#smallDialogDiv").dialog("option", "title", "Enter value");
        } else if (datatype == "PhysicalQuantity") {
            Cfihos_pump_poc.getUnitOfMeasureContent(KGconstraintsModeler.currentGraphNode.data.id, function (err, result) {
                html += "<input  id='KGconstraint_PhysicalQuantityValue'></input>";
                html += "<select size='3' style='width:100px' id='KGconstraint_UnitOfMesasureSelect' onchange='Cfihos_pump_poc.saveConstraintValues()' ></select>";

                //   html += "<br><button onclick='Cfihos_pump_poc.saveConstraintValues()'>OK</button>"
                html += "</div>";

                $("#smallDialogDiv").html(html);
                $("#smallDialogDiv").dialog("open");
                $("#smallDialogDiv").dialog("option", "title", "Enter value");
                common.fillSelectOptions("KGconstraint_UnitOfMesasureSelect", result, false, "label", "id");
            });
        } else if (datatype == "Property") {
            if (confirm("select property")) {
                KGconstraintsModeler.currentGraphNode.data.Selected = true;
                KGconstraintsModeler.visjsGraph.data.nodes.update({
                    id: KGconstraintsModeler.currentGraphNode.id,
                    color: "#b5d8ed"
                });
            }
        }
    };

    self.listEquipments = function () {

        self.currentSource = Lineage_sources.activeSource || "CFIHOS_READI"
        //  Sparql_OWL.getNodesAncestorsOrDescendants(self.currentSource, "http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClassCFIHOS-30000311",{ excludeItself: 0, descendants:true }, function (err, result) {

        self.rootId = "http://w3id.org/readi/rdl/CFIHOS-30000311"
        if (self.currentSource == "CFIHOS_1_5_PLUS") {
            self.rootId = "http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClassCFIHOS-30000311";
        }

        Sparql_OWL.getAllDescendants(self.currentSource, self.rootId, null, null, function (err, result) {
            // Sparql_OWL.getAllDescendants(self.currentSource, rootId, null, null, function (err, result) {
            if (err) {
                return alert(err.responseText || err);
            }
            var x = result;

            var jstreedata = [];

            var parentsMap = {};

            var distinctNodes = {};
            result.forEach(function (item) {
                if (!distinctNodes[item.descendantParent.value]) {
                    distinctNodes[item.descendantParent.value] = 1;
                    parentsMap[item.descendantParent.value] = 1;
                }
            });
            result.forEach(function (item) {
                if (!distinctNodes[item.descendant.value]) {
                    distinctNodes[item.descendant.value] = 1;
                    if (!parentsMap[item.descendant.value]) {
                        jstreedata.push({
                            id: item.descendant.value,
                            text: item.descendantLabel.value,
                            parent: "#",
                        });
                    }
                }
            });

            var options = {
                selectTreeNodeFn: function (event, obj) {
                    KGconstraintsModeler.currentClassUri = obj.node.id;
                    Cfihos_pump_poc.query(obj.node.id);
                },
                searchPlugin: {
                    case_insensitive: true,
                    fuzzy: false,
                    show_only_matches: true,
                },
            };

            JstreeWidget.loadJsTree("KGconstraintsModeler_equipmentsJstreeDiv", jstreedata, options);
        });
    };

    return self;
})();

export default Cfihos_pump_poc;

window.Cfihos_pump_poc = Cfihos_pump_poc;
