import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import KGconstraintsModeler from "./KGconstraintsModeler.js";

var Cfihos_pump_poc = (function () {
        var self = {}


        self.query = function (uri) {
            if (!uri) {
                uri = "http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClassCFIHOS-30000521"
            }
            KGconstraintsModeler.visjsGraph.clearGraph()
            var uniqueNodes = {}
            var visjsData = {nodes: [], edges: []}

            var distinctPicklists = []
            async.series([

                //getRestrictions  and addNodes
                function (callbackSeries) {
                    Sparql_OWL.getObjectRestrictions("CFIHOS_1_5_PLUS", uri, null, function (err, result) {
if(err)
    return alert(err.responseText || err)
                        if(result.length==0) {

                            return alert("no data")
                        }

                        var individualId = common.getRandomHexaId(5)
                        visjsData.nodes.push({
                            id: individualId,
                            label: "my" + result[0].subjectLabel.value,
                            "color": "#eab3b3",
                            level: 1,
                            "data": {
                                "id": "MyPump",
                                "label": "MyPump",
                                "type": "Individual",
                                "source": "CFIHOS_1_5_PLUS"
                            },
                        })


                        result.forEach(function (item) {
                            if (!uniqueNodes[item.subject.value]) {
                                var classId = common.getRandomHexaId(5)
                                uniqueNodes[item.subject.value] = classId

                                visjsData.nodes.push({
                                    "id": classId,
                                    "label": item.subjectLabel.value,
                                    "shape": "box",
                                    "color": "#00afef",
                                    level: 0,
                                    "data": {
                                        "id": item.subject.value,
                                        "label": item.subjectLabel.value,
                                        "type": "Class",
                                        "source": "CFIHOS_1_5_PLUS"
                                    }

                                })
                                visjsData.edges.push({
                                    "from": individualId,
                                    "label": "",
                                    "to": classId,
                                    "width": 2,
                                    "data": {
                                        "type": "rdf:type"
                                    },
                                    "arrows": null,
                                    "color": "#ccc"
                                })
                            }

                            if (true || !uniqueNodes[item.prop.value]) {
                                var propId = common.getRandomHexaId(5)
                                uniqueNodes[item.prop.value] = propId

                                visjsData.nodes.push({
                                    "id": propId,
                                    "label": item.propLabel.value,
                                    "shape": "text",
                                    "color": "#efbf00",
                                    level: 2,
                                    "data": {
                                        "id": item.prop.value,
                                        "label": item.propLabel.value,
                                        "type": "ObjectProperty",
                                        "source": "CFIHOS_1_5_PLUS"
                                    }

                                })
                                visjsData.edges.push({
                                    "from": individualId,
                                    "label": "",
                                    "to": propId,
                                    "width": 2,
                                    "data": {
                                        "type": "rdf:type"
                                    },
                                    "arrows": null,
                                    "color": "#ccc"
                                })
                            }

                            if (!uniqueNodes[item.value.value]) {
                                var objectId = common.getRandomHexaId(5)
                                uniqueNodes[item.value.value] = objectId

                                visjsData.nodes.push({
                                    "id": objectId,
                                    "label": item.valueLabel.value,
                                    "shape": "box",
                                    "color": "#00afef",
                                    level: 3,
                                    "data": {
                                        "id": item.value.value,
                                        "label": item.valueLabel.value,
                                        "type": "Class",
                                        "datatype":"Property",
                                        "source": "CFIHOS_1_5_PLUS"
                                    }

                                })
                                visjsData.edges.push({
                                    "from": propId,
                                    "label": "",
                                    "to": objectId,
                                    "width": 2,
                                    "data": {
                                        "type": "rdf:type"
                                    },
                                    "arrows": null,
                                    "color": "#ccc"
                                })
                            }
                        })
                        callbackSeries()
                    })
                },
                //getPicklists
                function (callbackSeries) {
                    Sparql_OWL.getAllTriples("CFIHOS_1_5_PLUS", "predicate", ["http://data.totalenergies.com/resource/ontology/cfihos_1.5/hasPicklist"], null, function (err, result) {

                        result.forEach(function (item) {
                            if (uniqueNodes[item.subject.value]) {


                                var objectId = common.getRandomHexaId(5)
                                uniqueNodes[item.object.value] = objectId
                                distinctPicklists.push(item.object.value)
                                visjsData.nodes.push({
                                    "id": objectId,
                                    "label": item.objectLabel.value,
                                    "shape": "box",
                                    "color": "#07b611",
                                    level: 5,
                                    "data": {
                                        "id": item.object.value,
                                        "label": item.objectLabel.value,
                                        "type": "Class",
                                        "datatype": "Picklist",
                                        "source": "CFIHOS_1_5_PLUS"
                                    }

                                })
                                visjsData.edges.push({
                                    "from": uniqueNodes[item.subject.value],
                                    "label": "hasPicklist",
                                    "to": objectId,
                                    "width": 2,
                                    "data": {
                                        "type": "rdf:type"
                                    },
                                    "arrows": null,
                                    "color": "#ccc"
                                })
                            }

                        })

                        callbackSeries()

                    })
                },

                // get datatypes
                function (callbackSeries) {

                    Sparql_OWL.getAllTriples("CFIHOS_1_5_PLUS", "predicate", ["http://rds.posccaesar.org/ontology/lis14/rdl/hasDatatype"], null, function (err, result) {

                        result.forEach(function (item) {

                            if (uniqueNodes[item.subject.value]) {
                                var label = item.objectLabel ? item.objectLabel.value : Sparql_common.getLabelFromURI(item.object.value)
                                var objectId = common.getRandomHexaId(5)
                                uniqueNodes[item.object.value] = objectId
                                visjsData.nodes.push({
                                    "id": objectId,
                                    "label": label,
                                    "shape": "box",
                                    "color": "#cceab7",
                                    level: 5,
                                    "data": {
                                        "id": item.object.value,
                                        "label": label,
                                        "type": "Class",
                                        "datatype": "Litteral",
                                        "source": "CFIHOS_1_5_PLUS"
                                    }

                                })
                                visjsData.edges.push({
                                    "from": uniqueNodes[item.subject.value],
                                    "label": "hasLitteralValue",
                                    "to": objectId,
                                    "width": 2,
                                    "data": {
                                        "type": "rdf:type"
                                    },
                                    "arrows": null,
                                    "color": "#ccc"
                                })
                            }


                        })
                        callbackSeries()
                    })


                },
                // get PhysicalQuantity
                function (callbackSeries) {

                    Sparql_OWL.getAllTriples("CFIHOS_1_5_PLUS", "predicate", ["http://rds.posccaesar.org/ontology/lis14/rdl/qualityQuantifiedAs"], null, function (err, result) {

                        result.forEach(function (item) {
                            var label = item.objectLabel ? item.objectLabel.value : Sparql_common.getLabelFromURI(item.object.value)
                            if (uniqueNodes[item.subject.value]) {


                                var objectId = common.getRandomHexaId(5)
                                uniqueNodes[item.object.value] = objectId
                                distinctPicklists.push(item.object.value)
                                visjsData.nodes.push({
                                    "id": objectId,
                                    "label": label,
                                    "shape": "box",
                                    "color": "#efbf00",
                                    level: 5,
                                    "data": {
                                        "id": item.object.value,
                                        "label": label,
                                        "type": "Class",
                                        "datatype": "PhysicalQuantity",
                                        "source": "CFIHOS_1_5_PLUS"
                                    }

                                })
                                visjsData.edges.push({
                                    "from": uniqueNodes[item.subject.value],
                                    "label": "HasPhysicalQuantity",
                                    "to": objectId,
                                    "width": 2,
                                    "data": {
                                        "type": "rdf:type"
                                    },
                                    "arrows": null,
                                    "color": "#ccc"
                                })
                            }

                        })
                        callbackSeries()
                    })


                }


            ], function (err) {
                KGconstraintsModeler.drawGraphCanvas(KGconstraintsModeler.graphDiv, visjsData);
            })


        }


        self.getPickListContent = function (picklist, callback) {
            Sparql_OWL.getFilteredTriples("CFIHOS_1_5_PLUS", [picklist], "rdf:value", null, {includeLiterals: true}, function (err, result) {
                //  getAllTriples("CFIHOS_1_5_PLUS", "subject", [picklist], null, function (err, result) {

                if (err) {
                    return callback(err)
                }

                var values = []
                result.forEach(function (item) {
                    values.push({
                        "id": item.object.value,
                        "label": item.object.value,
                    })
                })
                return callback(null, values)
            })
        }
        self.getUnitOfMeasureContent = function (dimensionId, callback) {
            Sparql_OWL.getFilteredTriples("CFIHOS_1_5_PLUS", [dimensionId], "rdf:value", null, {includeLiterals: true}, function (err, result) {
                //  getAllTriples("CFIHOS_1_5_PLUS", "subject", [picklist], null, function (err, result) {

                if (err) {
                    return callback(err)
                }

                var values = []
                result.forEach(function (item) {
                    values.push({
                        "id": item.object.value,
                        "label": item.object.value,
                    })
                })
                return callback(null, values)
            })
        }


        self.saveConstraintValues = function () {
            $("#smallDialogDiv").dialog("close")
            var value = ""
            var datatype = KGconstraintsModeler.currentGraphNode.data.datatype
            if (datatype == "Picklist") {
                value = $("#KGconstraint_PicklistValueSelect").val()

            } else if (datatype == "Litteral") {
                value = $("#KGconstraint_litteralValue").val()
            }
            if (datatype == "PhysicalQuantity") {
                value = $("#KGconstraint_PhysicalQuantityValue").val()
                var unit = $("#KGconstraint_UnitOfMesasureSelect").val()
                value += unit

            }
            var visjsData = {nodes: [], edges: []}
            var nodeId = common.getRandomHexaId(5)
            visjsData.nodes.push({
                "id": nodeId,
                "label": value,
                "shape": "ellipse",
                "color": "#eab3b3",
                level:KGconstraintsModeler.currentGraphNode.level+1,
                "data": {
                    "id": value,
                    "label": value,
                    "type": "Value",
                    "datatype": datatype,
                    "source": "CFIHOS_1_5_PLUS"
                }

            })
            visjsData.edges.push({
                "from": KGconstraintsModeler.currentGraphNode.id,
                "label": "value",
                "to": nodeId,
                "width": 2,
                "data": {
                    "type": "rdf:type"
                },
                "arrows": null,
                "color": "#ccc"
            })

            KGconstraintsModeler.visjsGraph.data.nodes.add(visjsData.nodes)
            KGconstraintsModeler.visjsGraph.data.edges.add(visjsData.edges)
        }


        self.listEquipments=function(){
          //  Sparql_OWL.getNodesAncestorsOrDescendants("CFIHOS_1_5_PLUS", "http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClassCFIHOS-30000311",{ excludeItself: 0, descendants:true }, function (err, result) {
var rootId="http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClassCFIHOS-30000311"
              Sparql_OWL.getAllDescendants("CFIHOS_1_5_PLUS",rootId,null,null,function(err,result){
                if(err)
                    return alert(err.responseText || err)
                var x=result;


                var jstreedata=[]
               /*   jstreedata.push({
                      id:rootId.value,
                      text:"EqupmentClass",
                      parent:"#"
                  })*/
                  var parentsMap={}


                  var distinctNodes={}
                  result.forEach(function(item){
                      if(!distinctNodes[item.descendantParent.value]){
                          distinctNodes[item.descendantParent.value]=1
                          parentsMap[item.descendantParent.value]=1
                      }

                  })
                  result.forEach(function(item){
                        if(!distinctNodes[item.descendant.value]){
                            distinctNodes[item.descendant.value]=1
                          if(!parentsMap[item.descendant.value]) {
                              jstreedata.push({
                                  id: item.descendant.value,
                                  text: item.descendantLabel.value,
                                  parent: "#"
                              })
                          }

                      }

                  })


                  var options={
                      selectTreeNodeFn:function(event,obj){
                        Cfihos_pump_poc.query(obj.node.id)
                    }
                  }

                  JstreeWidget.loadJsTree("KGconstraintsModeler_equipmentsJstreeDiv",jstreedata,options)


            })


        }

        return self;


    }
)
()

export default Cfihos_pump_poc

window.Cfihos_pump_poc = Cfihos_pump_poc


