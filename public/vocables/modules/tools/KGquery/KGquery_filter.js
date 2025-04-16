import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import KGquery from "./KGquery.js";
import jstreeWidget from "../../uiWidgets/jstreeWidget.js";
import KGquery_filter_bot from "../../bots/KGquery_filter_bot.js";

/**
 * KGquery_filter Module
 * Handles filtering functionality for knowledge graph queries.
 * @module KGquery_filter
 */

var KGquery_filter = (function () {
    var self = {};

    self.containersFilterMap = {};

    /**
     * Selects optional predicates for the query.
     * @function
     * @name selectOptionalPredicates
     * @memberof module:KGquery_filter
     * @param {Object} querySets - The query sets to process
     * @param {Object} options - Options for predicate selection
     * @param {Function} callback - Callback function called with (err, result)
     * @returns {void}
     */
    self.selectOptionalPredicates = function (querySets, options, callback) {
        var queryNonObjectProperties = [];
        var uniqueProps = {};

        querySets.sets.forEach(function (querySet) {
            querySet.elements.forEach(function (queryElement, queryElementIndex) {
                // queryElement.paths.forEach(function(pathItem, pathIndex) {
                if (queryElement.fromNode) {
                    if (queryElement.fromNode.data.nonObjectProperties) {
                        var subjectVarName = KGquery.getVarName(queryElement.fromNode, true);
                        queryElement.fromNode.data.nonObjectProperties.forEach(function (property) {
                            if (property.id == "http://purl.org/dc/terms/created") {
                                return;
                            }
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
                            if (property.id == "http://purl.org/dc/terms/created") {
                                return;
                            }
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

        var jstreeOptions = {
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
        JstreeWidget.loadJsTree(null, jstreeData, jstreeOptions, function () {
            JstreeWidget.openNodeDescendants(null, "root");

            if (queryNonObjectProperties.length < KGquery.maxOptionalPredicatesInQuery) {
                JstreeWidget.checkAll();
            } else {
                var preCheckedOptions = [];

                var precheckedWords = ["label", "name", "date"];
                jstreeData.forEach(function (item) {
                    var str = item.text.toLowerCase();
                    precheckedWords.forEach(function (expression) {
                        if (str.indexOf(expression) > -1) preCheckedOptions.push(item.id);
                    });
                });
                // Check properties with filter
                var jstreeDataLabels = jstreeData.map(function (node) {
                    return node.id;
                });
                KGquery.querySets.sets.forEach(function (set) {
                    for (var key in set.classFiltersMap) {
                        var filter = set.classFiltersMap[key].filter;
                        var regex = /\?(\w+?)[^\w]/gm;
                        var matches = filter.matchAll(regex);
                        for (const match of matches) {
                            if (match) {
                                var property = match[1];
                            }
                        }

                        if (property && jstreeDataLabels.includes(property)) {
                            preCheckedOptions.push(property);
                        }
                    }
                });
                jstreeWidget.setjsTreeCheckedNodes(null, preCheckedOptions);
            }

            if (false && options && options.output != "table") {
                var checkedNodes = JstreeWidget.getjsTreeCheckedNodes();
                KGquery_filter.getOptionalPredicates(checkedNodes, function (err, result) {
                    JstreeWidget.closeDialog();
                    return callback(err, result);
                });
            }
        });
    };

    /**
     * Gets the SPARQL representation of selected optional predicates.
     * @function
     * @name getOptionalPredicates
     * @memberof module:KGquery_filter
     * @param {Array} propertyNodes - Array of selected property nodes
     * @param {Function} callback - Callback function called with (err, result)
     * @param {Object} callback.result - The result object containing:
     * @param {string} callback.result.optionalPredicatesSparql - The OPTIONAL clauses in SPARQL
     * @param {string} callback.result.selectClauseSparql - The SELECT clause variables
     * @returns {void}
     */
    self.getOptionalPredicates = function (propertyNodes, callback) {
        var selectedPropertyNodes = [];
        var selectClauseSparql = "";
        if (!propertyNodes || propertyNodes.length == 0) {
            alert("no properties selected");
            return callback("no properties selected");
        }
        propertyNodes.forEach(function (node) {
            if (node.parents.length == 2) {
                selectedPropertyNodes.push(node);
                selectClauseSparql += " ?" + node.id;
            }
        });

        if (selectedPropertyNodes.length > KGquery.maxOptionalPredicatesInQuery) {
            if (confirm("many properties have been selected. Query may take time or abort, Continue anyway?")) {
                //  return callback(null, queryNonObjectProperties);
            } else {
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
        KGquery.currentSelectedPredicates = selectedPropertyNodes;
        return callback(null, { optionalPredicatesSparql: optionalPredicatesSparql, selectClauseSparql: selectClauseSparql });
    };

    /**
     * Gets optional predicates for aggregate filters.
     * @function
     * @name getAggregateFilterOptionalPredicates
     * @memberof module:KGquery_filter
     * @param {Object} querySet - The query set to process
     * @param {string} filter - The filter string to check
     * @returns {string} The filter string with optional predicates
     */
    self.getAggregateFilterOptionalPredicates = function (querySet, filter) {
        var filterStr = "";
        for (var key in querySet.classFiltersMap) {
            var classObj = querySet.classFiltersMap[key].class;
            classObj.data.nonObjectProperties.forEach(function (property) {
                var varName = KGquery.getVarName(classObj);
                if (filter.indexOf(varName) > -1) {
                    filterStr += " OPTIONAL {" + varName + " <" + property.id + "> " + varName + "_" + property.label + ".}\n";
                }
            });
        }
        return filterStr;
    };

    /**
     * Gets aggregate predicates for grouping.
     * @function
     * @name getAggregatePredicates
     * @memberof module:KGquery_filter
     * @param {Object} groupByPredicates - Map of predicates to group by
     * @param {Object} groupByPredicates[key] - A predicate object
     *
     * @returns {string} SPARQL string for aggregate predicates
     */
    self.getAggregatePredicates = function (groupByPredicates) {
        var str = "";
        for (var key in groupByPredicates) {
            var obj = groupByPredicates[key];
            str += " ?" + obj.classLabel + " <" + obj.prop.id + "> ?" + obj.label + ". \n";
        }

        return str;
    };

    /**
     * Adds a filter to a node based on a property.
     * @function
     * @name addNodeFilter
     * @memberof module:KGquery_filter
     * @param {string} classDivId - The ID of the class div
     * @param {string} addTojsTreeNode - The node to add the filter to
     * @param {string} propertyId - The ID of the property to filter on
     * @returns {void}
     */
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
