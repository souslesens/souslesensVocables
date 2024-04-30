import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import KGquery from "./KGquery.js";
import jstreeWidget from "../../uiWidgets/jstreeWidget.js";
import KGquery_filter_bot from "../../bots/KGquery_filter_bot.js";

var KGquery_filter = (function () {
    var self = {};

    self.containersFilterMap = {};

    self.selectOptionalPredicates = function (querySets, callback) {
        var queryNonObjectProperties = [];
        var uniqueProps = {};
        var labelProperty = {
            datatype: "http://www.w3.org/2001/XMLSchema#string",
            id: "rdfs:label",
            label: "label",
        };
        querySets.sets.forEach(function (querySet) {
            querySet.elements.forEach(function (queryElement, queryElementIndex) {
                // queryElement.paths.forEach(function(pathItem, pathIndex) {
                if (queryElement.fromNode) {
                    if (queryElement.fromNode.data.nonObjectProperties) {
                        var subjectVarName = KGquery.getVarName(queryElement.fromNode, true);
                        queryElement.fromNode.data.nonObjectProperties.forEach(function (property) {
                            if (!uniqueProps[subjectVarName + "_" + property.label]) {
                                uniqueProps[subjectVarName + "_" + property.label] = 1;
                                queryNonObjectProperties.push({ varName: subjectVarName, property: property, queryElementData: queryElement.fromNode.data });
                            }
                        });
                    } else {
                        queryElement.fromNode.data.nonObjectProperties = [];
                    }
                }
                if (queryElement.toNode) {
                    if (queryElement.toNode.data.nonObjectProperties) {
                        var objectVarName = KGquery.getVarName(queryElement.toNode, true);
                        queryElement.toNode.data.nonObjectProperties.forEach(function (property) {
                            if (!uniqueProps[objectVarName + "_" + property.label]) {
                                uniqueProps[objectVarName + "_" + property.label] = 1;
                                queryNonObjectProperties.push({ varName: objectVarName, property: property, queryElementData: queryElement.toNode.data });
                            }
                        });
                    } else {
                        queryElement.toNode.data.nonObjectProperties = [];
                    }
                }

                // });
            });

            if (querySet.classFiltersMap) {
                for (var key in querySet.classFiltersMap) {
                    // to be finished
                }
            }
        });

        var jstreeData = [];
        jstreeData.push({
            id: "root",
            text: "Properties",
            parent: "#",
        });
        queryNonObjectProperties.forEach(function (item) {
            var id = item.varName + "_" + item.property.label;
            var nodeDivId = item.nodeDivId;

            jstreeData.push({
                id: id,
                text:
                    id +
                    "<button style='vertical-align:middle' class=\"slsv-invisible-button filterIcon\" " +
                    'about="add filter" ' +
                    ">" + // "onclick=\"KGquery_filter.addNodeFilter('" + nodeDivId + "','" + label + "','" + item.property.id + "')\">" +
                    "</button>",
                parent: "root",
                data: item,
                type: "Property",
            });
        });

        var options = {
            withCheckboxes: true,
            selectTreeNodeFn: function (event, obj) {
                var node = obj.node;
                KGquery_filter.addNodeFilter(node.data.queryElementData.nodeDivId, node.data.queryElementData.label, node.data.property.id);
            },

            validateFn: function (checkedNodes) {
                KGquery_filter.getOptionalPredicates(checkedNodes, function (err, result) {
                    return callback(err, result);
                });
            },
        };
        JstreeWidget.loadJsTree(null, jstreeData, options, function () {
            JstreeWidget.openNodeDescendants(null, "root");
            if (true || queryNonObjectProperties.length < self.maxOptionalPredicatesInQuery) {
                JstreeWidget.checkAll();
            }
        });
    };
    self.getOptionalPredicates = function (propertyNodes, callback) {
        var selectedPropertyNodes = [];
        if (!propertyNodes || propertyNodes.length == 0) {
            alert("no properties selected");
            return callback("no properties selected");
        }
        propertyNodes.forEach(function (node) {
            if (node.parents.length == 2) {
                selectedPropertyNodes.push(node);
            }
        });

        if (selectedPropertyNodes.length > self.maxOptionalPredicatesInQuery) {
            if (confirm("many properties have been selected. Query may take time or abort, Continue anyway?")) {
                //  return callback(null, queryNonObjectProperties);
            } else {
                $("#smallDialogDiv").dialog("open");
                return callback("query aborted");
            }
        }

        function addToStringIfNotExists(str, text) {
            if (text.indexOf(str) > -1) {
                return text;
            } else {
                return text + str;
            }
        }

        var optionalPredicatesSparql = "";

        selectedPropertyNodes.forEach(function (propertyNode) {
            var optionalStr = " OPTIONAL ";
            var data = propertyNode.data;

            var propertyStr = "";
            if (data.property.id.startsWith("http")) {
                propertyStr = "<" + data.property.id + ">";
            } else {
                propertyStr = data.property.id;
            }
            var str = optionalStr + " {?" + data.varName + " " + propertyStr + " ?" + data.varName + "_" + data.property.label + ".}\n";
            optionalPredicatesSparql = addToStringIfNotExists(str, optionalPredicatesSparql);
        });

        return callback(null, optionalPredicatesSparql);
    };

    self.getAggregateFilterOptionalPredicates = function (querySet, filter) {
        var filterStr = "";
        for (var key in querySet.classFiltersMap) {
            var classObj = querySet.classFiltersMap[key].class;
            classObj.data.nonObjectProperties.forEach(function (property) {
                var varName = KGquery.getVarName(classObj);
                if (filter.indexOf(varName) > -1) filterStr += " OPTIONAL {" + varName + " <" + property.id + "> " + varName + "_" + property.label + ".}\n";
            });
        }
        return filterStr;
    };

    self.getAggregatePredicates = function (groupByPredicates) {
        var str = "";
        for (var key in groupByPredicates) {
            var obj = groupByPredicates[key];
            str += " ?" + obj.classLabel + " <" + obj.prop.id + "> ?" + obj.label + ". ";
        }

        return str;
    };

    self.addNodeFilter = function (classDivId, addTojsTreeNode, propertyId) {
        var aClass = KGquery.divsMap[classDivId];
        var classSetIndex = aClass.data.setIndex;
        if (KGquery.querySets.sets[classSetIndex].classFiltersMap[classDivId]) {
            delete KGquery.querySets.sets[classSetIndex].classFiltersMap[classDivId];
            $("#" + classDivId + "_filter").html("");
            if (addTojsTreeNode) {
                jstreeWidget.deleteNode(null, classDivId + "_filter");
            }
            return;
        }

        var currentFilterQuery = {
            source: KGquery.currentSource,
            currentClass: aClass.id,
            property: propertyId,
            varName: KGquery.getVarName(aClass, true),
        };

        KGquery_filter_bot.start(aClass.data, currentFilterQuery, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            KGquery.querySets.sets[classSetIndex].classFiltersMap[classDivId] = { class: aClass, filter: result.filter };
            $("#" + classDivId + "_filter").text(result.filterLabel || result.filter);

            if (addTojsTreeNode) {
                var jstreeData = [
                    {
                        id: classDivId + "_filter",
                        text: result.filterLabel || result.filter,
                        parent: addTojsTreeNode,
                    },
                ];
                jstreeWidget.addNodesToJstree(null, addTojsTreeNode, jstreeData);
            }
        });
    };

    return self;
})();

export default KGquery_filter;
window.KGquery_filter = KGquery_filter;
