import KGquery from "./KGquery.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import KGquery_paths from "./KGquery_paths.js";

/**
 * Module for handling node selection and visualization in the KGquery interface.
 * Provides functionality to display and interact with nodes in a tree structure.
 * @module KGquery_nodeSelector
 */
var KGquery_nodeSelector = (function () {
    var self = {};
    self.jstreeData = [];

    /**
     * Displays the inferred model in a JSTree format.
     * Converts the Visjs graph data into a tree structure and handles node visualization.
     * @function
     * @name showInferredModelInJstree
     * @memberof KGquery_nodeSelector
     * @param {Object} visjsData - The Visjs graph data containing nodes and edges
     */
    self.showInferredModelInJstree = function (visjsData) {
        var jstreeData = [];
        self.graphVisjsdata = visjsData;
        visjsData.nodes.forEach(function (visjsNode) {
            if (visjsNode.data.nonObjectProperties && visjsNode.data.nonObjectProperties.length > 0) {
                jstreeData.push({
                    id: visjsNode.id,
                    text: visjsNode.label,
                    parent: "#",
                    data: visjsNode.data,
                });
            }
        });

        jstreeData.sort(function (a, b) {
            if (a.text > b.text) {
                return 1;
            }
            if (a.text < b.text) {
                return -1;
            }
            return 0;
        });

        self.jstreeData = jstreeData;
        var options = {
            withCheckboxes: true,
            tie_selection: true,
            searchPlugin: {
                case_insensitive: true,
                fuzzy: false,
                show_only_matches: true,
            },
            selectTreeNodeFn: function (event, obj) {
                KGquery_nodeSelector.onSelectNode(obj.node);
            },

            validateFn: function (checkedNodes) {
                JstreeWidget.closeDialog();
                /*                 KGquery.clearAll();
                  async.eachSeries(checkedNodes, function(node, callbackEach) {
                       node.label = node.text;
                       KGquery.addNode(node, null, function(err, result) {
                           callbackEach(err)
                       });

                   }, function(err) {

                       if (err) {
                           return alert(err)
                       }
                   })*/
            },
        };
        self.alowedNodes = [];
        self.options = options;
        JstreeWidget.loadJsTree(null, jstreeData, options, function () {
            JstreeWidget.openNodeDescendants(null, "#");
        });
    };

    /**
     * Handles node selection events in the tree.
     * Processes the selected node and updates the query based on the selection.
     * @function
     * @name onSelectNode
     * @memberof KGquery_nodeSelector
     * @param {Object} node - The selected node object from the JSTree
     */
    self.onSelectNode = function (node) {
        var targetNodes = KGquery_paths.getNodeLinkedNodes(node.id, 3);
        self.alowedNodes = targetNodes; //self.alowedNodes.concat(targetNodes)
        var allowedJstreeData = [];
        self.jstreeData.forEach(function (item) {
            if (self.alowedNodes.indexOf(item.id) > -1) allowedJstreeData.push(item);
        });

        JstreeWidget.loadJsTree(null, allowedJstreeData, self.options, function () {
            /*
           var disabledNodes=self.jstreeData.map((v, i) => v.id)
            $("#"+JstreeWidget.jstreeDiv).jstree().disable_checkbox(disabledNodes)
            $("#"+JstreeWidget.jstreeDiv).jstree().disable_node(disabledNodes)
            $("#"+JstreeWidget.jstreeDiv).jstree().enable_checkbox(targetNodes)
            $("#"+JstreeWidget.jstreeDiv).jstree().enable_node(disabledNodes)*/
            node.label = node.text;
            KGquery.addNode(node, null, function (err, result) {});
        });
        return;
        if (!KGquery.currentQueryElement || KGquery.currentQueryElement.length == 0) {
            KGquery.addNode(node);
        } else {
            KGquery_paths.setQueryElementPath(self.currentQueryElement, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
            });
        }
    };

    return self;
})();

export default KGquery_nodeSelector;

window.KGquery_nodeSelector = KGquery_nodeSelector;
