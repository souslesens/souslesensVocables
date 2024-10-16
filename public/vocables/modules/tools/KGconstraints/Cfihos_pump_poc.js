import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import KGconstraintsModeler from "./KGconstraintsModeler.js";

var Cfihos_pump_poc = (function () {
    var self = {}


    self.query = function (uri) {
        if (!uri) {
            uri = "http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClassCFIHOS-30000521"
        }
        var uniqueNodes = {}
        var visjsData = {nodes: [], edges: []}

        var distinctPicklists=[]
        async.series([

            //getRestrictions  and addNodes
            function (callbackSeries) {
                Sparql_OWL.getObjectRestrictions("CFIHOS_1_5_PLUS", uri, null, function (err, result) {


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
            function(callbackSeries) {
                Sparql_OWL.getAllTriples("CFIHOS_1_5_PLUS", "predicate", ["http://data.totalenergies.com/resource/ontology/cfihos_1.5/hasPicklist"], null, function (err, result) {

                    result.forEach(function (item) {
                        if (uniqueNodes[item.subject.value]) {
                            var propId = common.getRandomHexaId(5)
                            uniqueNodes[item.predicate.value] = propId

                            visjsData.nodes.push({
                                "id": propId,
                                "label": item.predicateLabel.value,
                                "shape": "text",
                                "color": "#efbf00",
                                level: 4,
                                "data": {
                                    "id": item.predicate.value,
                                    "label": item.predicateLabel.value,
                                    "type": "ObjectProperty",
                                    "source": "CFIHOS_1_5_PLUS"
                                }

                            })
                            visjsData.edges.push({
                                "from": propId,
                                "label": "",
                                "to": uniqueNodes[item.subject.value],
                                "width": 2,
                                "data": {},
                                "arrows": null,
                                "color": "#ccc"
                            })


                                var objectId = common.getRandomHexaId(5)
                                uniqueNodes[item.object.value] = objectId
                                distinctPicklists.push(item.object.value)
                                visjsData.nodes.push({
                                    "id": objectId,
                                    "label": item.objectLabel.value,
                                    "shape": "box",
                                    "color": "#00afef",
                                    level: 5,
                                    "data": {
                                        "id": item.object.value,
                                        "label": item.objectLabel.value,
                                        "type": "Class",
                                        "superClass":"Picklist",
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
            }








        ], function(err){
            KGconstraintsModeler.drawGraphCanvas(KGconstraintsModeler.graphDiv, visjsData);
        })

        
    }



    self.getPickListContent=function(picklist,callback) {
        Sparql_OWL.getAllTriples("CFIHOS_1_5_PLUS", "subject", [picklist], null, function (err, result) {

          if(err)
              return callback(err)

            var values = []
            result.forEach(function (item) {
                values.push({
                    "id": item.object.value,
                    "label": item.object.value,
                })
            })
            return callback(null,values)
        })
    }

    self.saveCheckedPicklistValues=function(){


    }

        return self;


    }
)
    ()

    export default Cfihos_pump_poc

    window.Cfihos_pump_poc = Cfihos_pump_poc


