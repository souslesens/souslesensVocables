import Lineage_sources from "./lineage_sources.js";
import SearchWidget from "../../uiWidgets/searchWidget.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import OntologyModels from "../../shared/ontologyModels.js";
import jstreeWidget from "../../uiWidgets/jstreeWidget.js";

/**
 * @module Lineage_rules
 * @description Module for managing ontological rules and constraints.
 * Provides functionality for:
 * - Creating and managing ontology rules
 * - Handling premises and conclusions
 * - Supporting rule-based reasoning
 * - Managing rule components and relationships
 * - Supporting rule validation and execution
 * - Handling rule visualization and editing
 * - Managing rule-based constraints
 */

var Lineage_rules = (function () {
    var self = {};

    self.selectedEntitiesDiv = {};
    self.conclusionsDivs = {};

    /**
     * Displays the rules dialog.
     * @function
     * @name showRulesDialog
     * @memberof module:Lineage_rules
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
     * Handles the class search event on key press.
     * @function
     * @name onSearchClassKeyDown
     * @memberof module:Lineage_rules
     * @param {Event} event - The keyboard event.
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
     * Handles the property search event on key press.
     * @function
     * @name onSearchPropertyKeyDown
     * @memberof module:Lineage_rules
     * @param {Event} event - The keyboard event.
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
     * Searches for items (classes or properties) in the ontology.
     * @function
     * @name searchItem
     * @memberof module:Lineage_rules
     * @param {string} term - The search term.
     * @param {string} type - The type of item to search for ("Class" or "ObjectProperty").
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
                return MainController.errorAlert(err);
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
     * Returns the context menu for the rules tree.
     * @function
     * @name getContextMenu
     * @memberof module:Lineage_rules
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
     * Handles the selection of a node in the tree.
     * @function
     * @name selectTreeNodeFn
     * @memberof module:Lineage_rules
     * @param {Event} event - The selection event.
     * @param {Object} obj - Object containing the selected node data.
     * @returns {void}
     */
    self.selectTreeNodeFn = function (event, obj) {
        self.currentTreeNode = obj.node;
        if (obj.node.children.length == 0) {
            self.addPropertiesToTree(obj.node);
        }
    };

    /**
     * Adds a premise or conclusion to the rule.
     * @function
     * @name addPremiseOrConclusion
     * @memberof module:Lineage_rules
     * @param {Object} node - The node to add.
     * @param {string} role - The role of the node ("premise" or "conclusion").
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
     * Removes a premise from the rule.
     * @function
     * @name clearPremise
     * @memberof module:Lineage_rules
     * @param {string} div - The ID of the div to remove.
     * @returns {void}
     */
    self.clearPremise = function (div) {
        delete self.selectedEntitiesDiv[div];
        $("#" + div).remove();
    };

    /**
     * Retrieves the implicit model of the ontology.
     * @function
     * @name getImplicitModel
     * @memberof module:Lineage_rules
     * @returns {void}
     */
    self.getImplicitModel = function () {
        OntologyModels.getImplicitModel(Lineage_sources.activeSource, null, function (err, result) {});

        return;
    };

    /**
     * Adds properties to the tree for a given node.
     * @function
     * @name addPropertiesToTree
     * @memberof module:Lineage_rules
     * @param {Object} node - The node for which to add properties.
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
     * Exécute la règle définie avec les prémisses et conclusions sélectionnées.
     * @function
     * @name execRule
     * @memberof module:Lineage_rules
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
                return MainController.errorAlert(err);
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
