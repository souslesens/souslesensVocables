import common from "../../shared/common.js";
import MappingModeler from "./mappingModeler.js";
import UIcontroller from "./uiController.js";

/**
 * Module responsible for generating and managing mappings for the MappingTransform process.
 * It interacts with the Vis.js graph to retrieve mappings and formats them as JSON for use in the application.
 * It also provides functionality for generating SLS mappings and R2ML mappings (coming soon).
 * @module MappingTransform
 * @see [Tutorial: Overview]{@tutorial overview}
 */
var MappingTransform = (function () {
    var self = {};

    /**
     * Generates the SLS mappings from the Vis.js graph and displays them in the right panel of the UI.
     * The mappings are formatted as JSON and placed inside a textarea for easy access and copying.
     *
     * @function
     * @name generateSLSmappings
     * @memberof module:MappingTransform
     * @returns {void}
     */
    self.generateSLSmappings = function () {
        var json = MappingTransform.getSLSmappingsFromVisjsGraph();
        UIcontroller.activateRightPanel("generic");

        $("#mappingModeler_genericPanel").html(
            '<button class="w3-button nodesInfos-iconsButtons " style="font-size: 10px;margin-left:7px;" onclick=" MappingModeler.copyKGcreatorMappings()"><input type="image" src="./icons/CommonIcons/CopyIcon.png"></button>' +
                ' <textarea id="mappingModeler_infosTA" style="display: block;width:80%;height: 700px;overflow: auto;"> </textarea>',
        );
        //    $("#smallDialogDiv").dialog("open");
        $("#mappingModeler_infosTA").val(JSON.stringify(json, null, 2));
    };

    /**
     * Placeholder function for generating R2ML mappings. Currently displays an alert.
     *
     * @function
     * @name generateR2MLmappings
     * @memberof module:MappingTransform
     * @returns {void}
     */
    self.generateR2MLmappings = function () {
        alert("coming soon...");
    };

    /**
     * Retrieves the SLS mappings for the current table from the Vis.js graph.
     * Filters nodes that belong to the specified table and exclude those with type "Class" or "table".
     * @function
     * @name getSLSmappingsFromVisjsGraph
     * @memberof module:MappingTransform
     * @param {string} [table] - The name of the table for which to retrieve the mappings. Defaults to the current table if not provided.
     * @returns {Object} The generated JSON object containing the SLS mappings for the specified table.
     */
    self.getSLSmappingsFromVisjsGraph = function (table) {
        if (!table) {
            table = MappingModeler.currentTable.name;
        }
        var nodesMap = {};
        var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();

        nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });

        var columnsMap = {};
        nodes.forEach(function (node, callbackEach) {
            if (node.data.dataTable !== table) {
                return;
            }
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

    /**
     * Converts a node's data to a KGcreator-compatible column name based on its URI type and data type.
     * It generates column names based on different conditions such as blankNode, randomIdentifier, or URI.
     * Virtual columns and URI columns have specific suffixes added to the column name
     * @function
     * @name nodeToKGcreatorColumnName
     * @memberof module:MappingTransform
     * @param {Object} data - The node's data containing the URI type and other properties.
     * @returns {string} The generated column name in KGcreator format.
     */
    self.nodeToKGcreatorColumnName = function (data) {
        var colname = null;
        // if (data.uriType == "blankNode" || !data.rdfsLabel) {
        if (data.uriType == "blankNode") {
            colname = data.id + "_$";
        } else if (data.uriType == "randomIdentifier") {
            colname = data.id + "_£";
        } else {
            colname = data.id;
        }
        /*
        else if (data.uriType == "fromLabel") {
            colname = data.id;
        }*/

        if (colname && data.type == "VirtualColumn") {
            colname = "@" + colname + "_$";
        }
        if (data.type == "RowIndex") {
            colname = "_rowIndex";
        }
        if (data.type == "URI") {
            colname = data.id + "_#";
        }
        return colname;
    };

    /**
     * Transforms a columns map into KGcreator-compatible JSON format, generating mappings between columns, predicates, and objects.
     * This function handles RDF types, labels, transformations, and other predicates for each column.
     * It also processes connections between nodes and generates appropriate triples for each mapping
     * @function
     * @name mappingsToKGcreatorJson
     * @memberof module:MappingTransform
     * @param {Object} columnsMap - A map of nodes containing columns to be transformed.
     * @returns {Array} An array of mapping objects in KGcreator JSON format.
     */
    self.mappingsToKGcreatorJson = function (columnsMap, options) {
        if (!options) {
            options = {};
        }
        if (!options.getColumnMappingsOnly) {
            options.getColumnMappingsOnly = false;
        }
        var columnsMapLabels = Object.values(columnsMap).map(function (column) {
            return column.label;
        });
        var allMappings = [];

        for (var nodeId in columnsMap) {
            var data = columnsMap[nodeId].data;
            var subject = self.nodeToKGcreatorColumnName(data);

            if (!subject) {
                return alert("Error in column " + nodeId);
            }

            if (!options.getColumnMappingsOnly) {
                if (data.rdfType) {
                    var predicate = "rdf:type";

                    allMappings.push({
                        s: subject,
                        p: predicate,
                        o: data.rdfType,
                    });
                }

                if (data.rdfsLabel) {
                    allMappings.push({
                        s: subject,
                        p: "rdfs:label",
                        o: data.rdfsLabel,
                        dataType: "xsd:string",
                    });
                }

                if (data.transform) {
                    allMappings.push({
                        s: subject,
                        p: "transform",
                        o: data.transform,
                    });
                }
            }
            var connections = MappingColumnsGraph.visjsGraph.getFromNodeEdgesAndToNodes(nodeId);

            connections.forEach(function (connection) {
                if (connection.edge.data.type == "tableToColumn") {
                    return;
                }
                var property = connection.edge.data.id;
                if (!property) {
                    property = connection.edge.data.type;
                }
                var object = connection.toNode.data.id;
                if (columnsMapLabels.includes(object)) {
                    object = self.nodeToKGcreatorColumnName(
                        Object.values(columnsMap).filter(function (node) {
                            return object == node.label;
                        })[0].data,
                    );
                }

                var mapping = {
                    s: subject,
                    p: property,
                    o: object,
                };

                allMappings.push(mapping);
            });
            if (data.otherPredicates && !options.getColumnMappingsOnly) {
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
                        // triple.dataType = "xsd:string";
                    }
                    if (predicate.dateFormat) {
                        triple.dateFormat = predicate.dateFormat;
                    }

                    allMappings.push(triple);
                });
            }
        }

        allMappings = self.addMappingsRestrictions(allMappings);

        return allMappings;
    };

    /**
     * Adds restrictions to the mappings if both subject and object are classes and are different from each other.
     * This function checks if the subject and object in a mapping are RDF classes, and if they are, it marks the mapping as a restriction.
     * @function
     * @name addMappingsRestrictions
     * @memberof module:MappingTransform
     * @param {Array} allMappings - The array of mappings to which restrictions will be added.
     * @returns {Array} The modified array of mappings with restrictions added where applicable.
     */
    self.addMappingsRestrictions = function (allMappings) {
        var isClass = function (nodeId) {
            var isClass = false;
            allMappings.forEach(function (mapping) {
                if (mapping.s == nodeId) {
                    if (mapping.p == "rdf:type" && mapping.o == "owl:Class") {
                        isClass = true;
                    }
                }
            });
            return isClass;
        };
        allMappings.forEach(function (mapping) {
            if (!mapping.p.startsWith("http")) return;
            if (isClass(mapping.s) && isClass(mapping.o)) {
                if (mapping.s != mapping.o) {
                    mapping.isRestriction = true;
                }
            }
        });

        return allMappings;
    };

    /**
     * Copies the KGcreator mappings from the textarea to the clipboard.
     * It retrieves the current mappings as text from the UI and uses a common utility to copy the content to the clipboard.
     *
     * @function
     * @name copyKGcreatorMappings
     * @memberof module:MappingTransform
     */
    self.copyKGcreatorMappings = function () {
        var text = $("#mappingModeler_infosTA").val();
        $("#mappingModeler_infosTA").focus();
        common.copyTextToClipboard(text);
    };

    return self;
})();
export default MappingTransform;
window.MappingTransform = MappingTransform;
