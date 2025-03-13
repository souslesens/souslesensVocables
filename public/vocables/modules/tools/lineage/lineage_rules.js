import Lineage_sources from "./lineage_sources.js";
import SearchWidget from "../../uiWidgets/searchWidget.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import OntologyModels from "../../shared/ontologyModels.js";
import jstreeWidget from "../../uiWidgets/jstreeWidget.js";

/**
 * @module Lineage_rules
 * @category Lineage
 * This module provides functionalities for managing and displaying rules in the lineage tool.
 * It includes functions for displaying the rules dialog, searching for classes and properties,
 * and executing rules based on selected premises and conclusions.
 * @namespace lineage
 */
var Lineage_rules = (function () {
    var self = {};

    self.selectedEntitiesDiv = {};
    self.conclusionsDivs = {};

    /**
     * Displays the rules dialog for searching and managing rules.
     * @function
     * @name showRulesDialog
     * @memberof Lineage_rules
     * @returns {void}
     */
    self.showRulesDialog = function () {
        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").load("modules/tools/lineage/html/lineage_rulesDialog.html", function () {
            $("#lineage_rules_searchClassInput").bind("keydown", null, Lineage_rules.onSearchClassKeyDown);
            $("#lineage_rules_searchPropertyInput").bind("keydown", null, Lineage_rules.onSearchPropertyKeyDown);
        });
    };
    /**
     * Handles the keydown event for the class search input.
     * Initiates a search for classes when Enter or Tab is pressed.
     * @function
     * @name onSearchClassKeyDown
     * @memberof Lineage_rules
     * @param {Object} event - The keydown event object.
     * @returns {void}
     */
    self.onSearchClassKeyDown = function (event) {
        if (event.keyCode != 13 && event.keyCode != 9) {
            return;
        }
        var term = $("#lineage_rules_searchClassInput").val();
        self.searchItem(term, "Class");
    };

    /**
     * Handles the keydown event for the property search input.
     * Initiates a search for object properties when Enter or Tab is pressed.
     * @function
     * @name onSearchPropertyKeyDown
     * @memberof Lineage_rules
     * @param {Object} event - The keydown event object.
     * @returns {void}
     */
    self.onSearchPropertyKeyDown = function (event) {
        if (event.keyCode != 13 && event.keyCode != 9) {
            return;
        }
        var term = $("#lineage_rules_searchClassInput").val();
        self.searchItem(term, "ObjectProperty");
    };

    /**
     * Searches for items based on the term and type provided.
     * Populates the jsTree with search results.
     * @function
     * @name searchItem
     * @memberof Lineage_rules
     * @param {string} term - The search term.
     * @param {string} type - The type of item to search for (e.g., 'Class', 'ObjectProperty').
     * @returns {void}
     */
    self.searchItem = function (term, type) {
        var filter = "";
        if (term) {
            term = term.replace("*", "");
            filter += "filter (regex(?label,'" + term + "','i'))";
        }
        if (type == "Class") {
            filter += "filter (  ?type=owl:Class)";
        } else if ((type = "ObjectProperty")) {
            filter += " filter ( ?type=owl:ObjectProperty)";
        }
        Sparql_OWL.getDictionary(Lineage_sources.activeSource, { filter: filter, selectGraph: 1, withoutImports: 1 }, null, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            var jstreeData = [];
            result.forEach(function (item) {
                jstreeData.push({
                    id: item.id.value,
                    text: item.label.value,
                    parent: "#",
                    data: {
                        id: item.id.value,
                        label: item.label.value,
                        source: Sparql_common.getSourceFromGraphUri(item.g.value, Lineage_sources.activeSource),
                        type: type,
                    },
                });
            });

            var options = {
                selectTreeNodeFn: Lineage_rules.selectTreeNodeFn,
                contextMenu: Lineage_rules.getContextMenu(),
            };
            JstreeWidget.loadJsTree("lineage_rules_searchJsTreeDiv", jstreeData, options);
        });
    };

    /**
     * Retrieves the context menu items for the jsTree.
     * @function
     * @name getContextMenu
     * @memberof Lineage_rules
     * @returns {Object} The context menu items.
     */
    self.getContextMenu = function () {
        var items = {};

        items.addPremise = {
            label: "Add Premise",
            action: function (_e, _xx) {
                self.addPremiseOrConclusion(self.currentTreeNode, "premise");
            },
        };
        items.addConclusion = {
            label: "Add Conclusion",
            action: function (_e, _xx) {
                self.addPremiseOrConclusion(self.currentTreeNode, "conclusion");
            },
        };

        return items;
    };
    /**
     * Handles the selection of a tree node in the jsTree.
     * Adds properties to the tree if the selected node has no children.
     * @function
     * @name selectTreeNodeFn
     * @memberof Lineage_rules
     * @param {Object} event - The event object.
     * @param {Object} obj - The jsTree node object.
     * @returns {void}
     */
    self.selectTreeNodeFn = function (event, obj) {
        self.currentTreeNode = obj.node;
        if (obj.node.children.length == 0) {
            self.addPropertiesToTree(obj.node);
        }
    };

    /**
     * Adds a premise or conclusion to the selected entities.
     * Updates the UI with the new premise or conclusion.
     * @function
     * @name addPremiseOrConclusion
     * @memberof Lineage_rules
     * @param {Object} node - The jsTree node object.
     * @param {string} role - The role of the entity ('premise' or 'conclusion').
     * @returns {void}
     */
    self.addPremiseOrConclusion = function (node, role) {
        var containerDiv, divId;
        if (role == "premise") {
            divId = "premise_" + common.getRandomHexaId(5);
            containerDiv = "lineage_rules_premisesDiv";
        } else if (role == "conclusion") {
            divId = "conclusion_" + common.getRandomHexaId(5);
            containerDiv = "lineage_rules_conclusionsDiv";
        }
        self.selectedEntitiesDiv[divId] = node.data;
        self.selectedEntitiesDiv[divId].role = role;

        var label = node.data.type + " : " + node.data.label;
        var html =
            "<div class='lineage_rules_premise lineage_rules_premise_" +
            node.data.type +
            "' id='" +
            divId +
            "'>" +
            "<span>" +
            label +
            " </span>" +
            "<button onclick='Lineage_rules.clearPremise(\"" +
            divId +
            "\")'>X</bbutton>";
        $("#" + containerDiv).append(html);
    };

    /**
     * Clears a premise from the selected entities and removes it from the UI.
     * @function
     * @name clearPremise
     * @memberof Lineage_rules
     * @param {string} div - The ID of the div to clear.
     * @returns {void}
     */
    self.clearPremise = function (div) {
        delete self.selectedEntitiesDiv[div];
        $("#" + div).remove();
    };

    /**
     * Retrieves the inferred model for the active source.
     * @function
     * @name getInferredModel
     * @memberof Lineage_rules
     * @returns {void}
     */
    self.getInferredModel = function () {
        OntologyModels.getInferredModel(Lineage_sources.activeSource, null, function (err, result) {});

        return;
    };

    /**
     * Adds properties to the jsTree for a given node.
     * @function
     * @name addPropertiesToTree
     * @memberof Lineage_rules
     * @param {Object} node - The jsTree node object.
     * @returns {void}
     */
    self.addPropertiesToTree = function (node) {
        OntologyModels.getAllowedPropertiesBetweenNodes(node.data.source, node.data.id, null, null, function (err, result) {
            if (err) {
                return callbackSeries(err);
            }
            var authorizedProps = result.constraints;

            var jstreeData = [];
            var existingIds = jstreeWidget.getjsTreeNodes("lineage_rules_searchJsTreeDiv", true, "#");
            for (var group in authorizedProps) {
                for (var propId in authorizedProps[group]) {
                    var property = authorizedProps[group][propId];

                    var propertyLabel = property.label || Sparql_common.getLabelFromURI(propId);
                    if (!property.domain) {
                        propertyLabel = "<i>" + propertyLabel + "</i>";
                    } else if (property.range) {
                        propertyLabel = propertyLabel + "->" + property.rangeLabel ? property.rangeLabel : Sparql_common.getLabelFromURI(property.range);
                    }
                    propertyLabel = property.source + " : " + propertyLabel;

                    var id = node.id + "_" + propId;
                    if (existingIds.indexOf(id) < 0) {
                        existingIds.push(id);
                        jstreeData.push({
                            id: id,
                            text: propertyLabel,
                            parent: node.id,
                            data: {
                                id: propId,
                                label: property.label,
                                source: node.data.source,
                                type: "ObjectProperty",
                            },
                        });
                    }
                }
            }

            jstreeWidget.addNodesToJstree("lineage_rules_searchJsTreeDiv", node.id, jstreeData, { openAll: true });
        });
    };

    /**
     * Executes a rule based on the selected premises and conclusions.
     * Sends an AJAX request to perform the rule operation.
     * @function
     * @name execRule
     * @memberof Lineage_rules
     * @returns {void}
     */
    self.execRule = function () {
        var operation;
        var params = {
            premises: { classes: [], objectProperties: [] },
            conclusions: { classes: [], objectProperties: [] },
        };

        for (var divId in self.selectedEntitiesDiv) {
            var data = self.selectedEntitiesDiv[divId];
            if (data.role == "premise") {
                if (data.type == "Class") {
                    params.premises.classes.push(data);
                } else if (premiseData.type == "ObjectProperty") {
                    params.premises.objectProperties.push(data);
                }
            } else if (data.role == "conclusion") {
                if (data.type == "Class") {
                    params.conclusions.classes.push(data);
                } else if (premiseData.type == "ObjectProperty") {
                    params.conclusions.objectProperties.push(data);
                }
            }
        }

        /*   var premisesDivs = $("#lineage_rules_premisesDiv")
           .children()
           .each(function () {
               var divId = $(this).attr("id");
               var data = self.selectedEntitiesDiv[divId];
               if (data.type == "Class") {
                   params.premises.classes.push(data);
               } else if (premiseData.type == "ObjectProperty") {
                   params.objectProperties.push(data);
               }
           });

       var conclusionsDivs = $("#lineage_rules_conclusionsDiv")
         .children()
         .each(function () {
             var divId = $(this).attr("id");
             var data = self.conclusionDivs[divId];
             if (data.type == "Class") {
                 params.conclusions.objectProperties.push(data);
             } else if (data.type == "ObjectProperty") {
                 params.conclusions.objectProperties.push(data);
             }
         });*/

        if (params.premises.classes.length == 0) {
            return alert("no Class premise selected");
        }

        if (params.conclusions.classes.length == 0 && params.conclusions.objectProperties.length == 0) {
            return alert("no Conclusion selected");
        }

        //insertRuleReclassification
        else if (params.premises.classes.length == 1 && params.conclusions.classes.length == 1) {
            operation = "alternative_exec_rule";
            var payload = {
                premise: [params.premises.classes[0].id],
                conclusion: [params.conclusions.classes[0].id],
            };
        } else if (params.premises.classes.length == 2) {
            if (params.premises.objectProperties.length != 1) {
                return alert(" one and only one ObjectProperty is needed ");
            }
            var conclusion = null;

            var operation = "exec_rule";
            var classeArray = [];
            var propertyClasses = [];
            params.conclusions.classes.forEach(function (item, index) {
                conclusion = item.id;
                var varName = Sparql_common.formatStringForTriple(item.label, true);
                propertyClasses.push(varName);
                classeArray.push({
                    name: item.id,
                    var: [varName],
                });
            });
            params.conclusions.objectProperties.forEach(function (item, index) {
                conclusion = item.id;
                var varName = Sparql_common.formatStringForTriple(item.label, true);
                propertyClasses.push(varName);
                classeArray.push({
                    name: item.id,
                    var: [varName],
                });
            });

            var payload = {
                premise: [
                    {
                        type: "owl:Class",
                        entities: classeArray,
                    },
                    {
                        type: "owl:ObjectProperty",
                        entities: {
                            name: params.premises.objectProperties[0].id,
                            var: propertyClasses,
                        },
                    },
                ],
                conclusion: [
                    {
                        type: "owl:ObjectProperty",
                        entities: [
                            {
                                name: conclusion,
                                var: propertyClasses,
                            },
                        ],
                    },
                ],
            };
        } else {
            return alert("case not implemented yet");
        }

        var fromStr = Sparql_common.getFromStr(Lineage_sources.activeSource, false, false);
        var describeQuery = "DESCRIBE ?s ?p ?o  " + fromStr + "  WHERE {  ?s ?p ?o    } ";

        const queryParams = new URLSearchParams({
            operation: operation,
            type: "internalGraphUri",
            payload: JSON.stringify(payload),
            url: Config.sources[Lineage_sources.activeSource].graphUri,
            describeQuery: describeQuery,
        });
        //  $("#lineage_reasoner_infosDiv").html("<span style='color:green;font-style:italic'>Processing " + Lineage_sources.activeSource + "...</span>");

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/jowl/rules?" + queryParams.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {},
            error(err) {
                return alert(err.responseText);
                if (callback) {
                    return callback(err);
                }
            },
        });
    };

    return self;
})();
export default Lineage_rules;
window.Lineage_rules = Lineage_rules;
