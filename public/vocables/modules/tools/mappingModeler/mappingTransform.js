import common from "../../shared/common.js";
import KGcreator from "../KGcreator/KGcreator.js";

var MappingTransform = (function () {
    var self = {};
    
    self.generateSLSmappings = function () {
        var json = MappingTransform.getSLSmappingsFromVisjsGraph();

        $("#smallDialogDiv").html(
            '<button class="w3-button nodesInfos-iconsButtons " style="font-size: 10px;margin-left:7px;" onclick=" MappingModeler.copyKGcreatorMappings()"><input type="image" src="./icons/CommonIcons/CopyIcon.png"></button>' +
                ' <textarea id="mappingModeler_infosTA" style="display: block;width:800px;height: 500px;overflow: auto;"> </textarea>'
        );
        $("#smallDialogDiv").dialog("open");
        $("#mappingModeler_infosTA").val(JSON.stringify(json, null, 2));
    };

    self.generateR2MLmappings = function () {
        alert("coming soon...");
    };

    self.getSLSmappingsFromVisjsGraph = function (table) {
        if (!table) table = MappingModeler.currentTable.name;
        var nodesMap = {};
        var nodes = MappingModeler.visjsGraph.data.nodes.get();

        nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });

        var columnsMap = {};
        nodes.forEach(function (node, callbackEach) {
            if (node.data.dataTable !== table) return;
            if (node.data.type == "Class") {
                return;
            }
            if (node.data.type == "table") {
                return;
            }

            columnsMap[node.id] = node;
        });

        var json = self.mappingsToKGcreatorJson(columnsMap);
        return json;
    };

    self.nodeToKGcreatorColumnName = function (data) {
        var colname = null;
        // if (data.uriType == "blankNode" || !data.rdfsLabel) {
        if (data.uriType == "blankNode") {
            colname = data.id + "_$";
        } else if (data.uriType == "randomIdentifier") {
            colname = data.id + "_£";
        } else{
            colname = data.id;
        }
        /*
        else if (data.uriType == "fromLabel") {
            colname = data.id;
        }*/

        if (colname && data.type == "VirtualColumn") {
            colname = "@" + colname;
        }
        if (data.type == "URI") {
            colname = data.id + "_#";
        }
        return colname;
    };
    self.mappingsToKGcreatorJson = function (columnsMap) {
        var columnsMapLabels = Object.values(columnsMap).map(function (column) {
            return column.label;
        });
        var allMappings = {};

        for (var nodeId in columnsMap) {
            var data = columnsMap[nodeId].data;
            var subject = self.nodeToKGcreatorColumnName(data);
            if (!subject) {
                return alert("Error in column " + nodeId);
            }

            if (!allMappings[data.dataTable]) {
                allMappings[data.dataTable] = { tripleModels: [] };
            }
            if (data.rdfType) {
                var predicate = "rdf:type";
                /*  if (data.rdfType == "owl:Class") {
                    predicate = "rdfs:subClassOf";
                }*/

                allMappings[data.dataTable].tripleModels.push({
                    s: subject,
                    p: predicate,
                    o: data.rdfType,
                });
            }

            if (data.rdfsLabel) {
                allMappings[data.dataTable].tripleModels.push({
                    s: subject,
                    p: "rdfs:label",
                    o: data.rdfsLabel,
                    dataType: "xsd:string",
                });
            }
            if (data.transform) {
                if (!allMappings[data.dataTable].transform) {
                    allMappings[data.dataTable].transform = {};
                }
                allMappings[data.dataTable].transform[data.label] = data.transform;
            }

            var connections = MappingModeler.visjsGraph.getFromNodeEdgesAndToNodes(nodeId);

            connections.forEach(function (connection) {
                if (connection.edge.data.type == "tableToColumn") return;
                var property = connection.edge.data.id;
                if (!property) {
                    property = connection.edge.data.type;
                }
                var object = connection.toNode.data.id;
                if (columnsMapLabels.includes(object)) {
                    object = self.nodeToKGcreatorColumnName(
                        Object.values(columnsMap).filter(function (node) {
                            return object == node.label;
                        })[0].data
                    );
                }

                allMappings[data.dataTable].tripleModels.push({
                    s: subject,
                    p: property,
                    o: object,
                });
            });
            if (data.otherPredicates) {
                data.otherPredicates.forEach(function (predicate) {
                    var triple = {
                        s: subject,
                        p: predicate.property,
                        o: predicate.object,
                    };

                    if (predicate.range) {
                        if (predicate.range.indexOf("Resource") > -1) {
                            triple.dataType = "xsd:string";
                        } else {
                            triple.dataType = predicate.range;
                        }
                    } else {
                        triple.dataType = "xsd:string";
                    }
                    if (predicate.dateFormat) {
                        triple.dateFormat = predicate.dateFormat;
                    }

                    allMappings[data.dataTable].tripleModels.push(triple);
                });
            }
        }

        var json = allMappings;

        return json;
    };

    self.copyKGcreatorMappings = function () {
        var text = $("#mappingModeler_infosTA").val();
        $("#mappingModeler_infosTA").focus();
        common.copyTextToClipboard(text);
    };

    return self;
})();
export default MappingTransform;
window.MappingTransform = MappingTransform;
