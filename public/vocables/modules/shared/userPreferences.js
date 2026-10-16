import UserDataWidget from "../uiWidgets/userDataWidget.js";
import GraphDecorationWidget from "../uiWidgets/graphDecorationWidget.js";
import common from "./common.js";

/**
 * Display settings a user may change, saved in one userData record of type "userPreference".
 * Its data_content mirrors the preference tree, e.g. { lineage: { defaultNode: { shape: "box" } } }.
 * @module UserPreferences
 */
var UserPreferences = (function () {
    var self = {};

    self.dataType = "userPreference";
    self.preferenceRecord = null;

    // a node id is the path of its parameters in data_content, each parameter overrides a module variable
    self.preferenceTree = [
        { id: "preferences", text: "Preferences", parent: "#" },
        { id: "lineage", text: "Lineage", parent: "preferences" },
        {
            id: "lineage.defaultNode",
            text: "Default node",
            parent: "lineage",
            data: {
                parameters: [
                    {
                        key: "shape",
                        label: "Node shape",
                        moduleName: "Lineage_whiteboard",
                        variableName: "defaultShape",
                        // read at call time, graphDecorationWidget and lineage_whiteboard import each other
                        getChoices: function () {
                            return GraphDecorationWidget.nodeShapes;
                        },
                    },
                ],
            },
        },
    ];

    /**
     * @function
     * @name getNodeContent
     * @memberof module:UserPreferences
     * Returns the part of the preference content holding the parameters of a tree node.
     * @param {Object} content - data_content of the preference record
     * @param {string} nodeId - id of a preference tree node, a dotted path
     * @param {boolean} createMissing - create the missing levels instead of returning null
     * @returns {Object|null} the parameter values of the node
     */
    self.getNodeContent = function (content, nodeId, createMissing) {
        var pathKeys = nodeId.split(".");
        var nodeContent = content;
        for (var i = 0; i < pathKeys.length; i++) {
            var pathKey = pathKeys[i];
            if (!nodeContent[pathKey]) {
                if (!createMissing) {
                    return null;
                }
                nodeContent[pathKey] = {};
            }
            nodeContent = nodeContent[pathKey];
        }
        return nodeContent;
    };

    /**
     * @function
     * @name applyPreferences
     * @memberof module:UserPreferences
     * Overrides the module variables with the values the user saved.
     * @returns {void}
     */
    self.applyPreferences = function () {
        if (!self.preferenceRecord) {
            return;
        }
        self.preferenceTree.forEach(function (treeNode) {
            if (!treeNode.data) {
                return;
            }
            var nodeContent = self.getNodeContent(self.preferenceRecord.data_content, treeNode.id, false);
            if (!nodeContent) {
                return;
            }
            treeNode.data.parameters.forEach(function (parameter) {
                if (nodeContent[parameter.key]) {
                    window[parameter.moduleName][parameter.variableName] = nodeContent[parameter.key];
                }
            });
        });
    };

    /**
     * @function
     * @name loadPreferences
     * @memberof module:UserPreferences
     * Loads the preference record of the current user, then applies it.
     * @param {Function} callback - error-first callback
     * @returns {void}
     */
    self.loadPreferences = function (callback) {
        UserDataWidget.listUserData({ data_type: self.dataType }, function (err, userDataList) {
            if (err) {
                return callback(err.responseText || err);
            }
            // the list also holds records other users shared, a preference record never is
            var ownedRecords = userDataList.filter(function (userData) {
                return !userData.is_shared;
            });
            if (ownedRecords.length == 0) {
                self.preferenceRecord = null;
                return callback();
            }
            var firstRecordId = ownedRecords[0].id;
            ownedRecords.forEach(function (userData) {
                if (userData.id < firstRecordId) {
                    firstRecordId = userData.id;
                }
            });
            UserDataWidget.loadUserDatabyId(firstRecordId, function (err, userData) {
                if (err) {
                    return callback(err.responseText || err);
                }
                self.preferenceRecord = { id: userData.id, data_content: userData.data_content };
                self.applyPreferences();
                callback();
            });
        });
    };

    /**
     * @function
     * @name showPreferencesTree
     * @memberof module:UserPreferences
     * Displays the preference tree; selecting a node displays its parameters.
     * @param {string} treeDivId - id of the div receiving the jstree
     * @param {string} parametersDivId - id of the div receiving the parameters form
     * @returns {void}
     */
    self.showPreferencesTree = function (treeDivId, parametersDivId) {
        self.loadPreferences(function (err) {
            if (err) {
                return MainController.errorAlert(err);
            }
            var options = {
                openAll: true,
                selectTreeNodeFn: function (_event, obj) {
                    $("#" + parametersDivId).empty();
                    if (obj.node.data) {
                        self.showParameters(obj.node, parametersDivId);
                    }
                },
            };
            JstreeWidget.loadJsTree(treeDivId, self.preferenceTree, options);
        });
    };

    /**
     * @function
     * @name showParameters
     * @memberof module:UserPreferences
     * Displays a select per parameter of a tree node, set to the current value, and a save button.
     * @param {Object} treeNode - selected jstree node carrying data.parameters
     * @param {string} parametersDivId - id of the div receiving the form
     * @returns {void}
     */
    self.showParameters = function (treeNode, parametersDivId) {
        var parametersDiv = $("#" + parametersDivId);
        var parameterSelects = {};
        treeNode.data.parameters.forEach(function (parameter) {
            var select = $("<select>");
            parameterSelects[parameter.key] = select;
            var parameterDiv = $("<div>", { style: "margin-bottom:8px" });
            parameterDiv.append($("<label>", { text: parameter.label, style: "margin-right:8px" }));
            parameterDiv.append(select);
            parametersDiv.append(parameterDiv);

            var currentValue = window[parameter.moduleName][parameter.variableName];
            common.fillSelectOptions(select, parameter.getChoices(), false, null, null, currentValue);
        });

        var saveButton = $("<button>", { class: "w3-button", text: "Save" });
        saveButton.on("click", function () {
            self.saveParameters(treeNode, parameterSelects);
        });
        parametersDiv.append(saveButton);
    };

    /**
     * @function
     * @name saveParameters
     * @memberof module:UserPreferences
     * Saves the values selected for a tree node, creating the preference record on first save, then applies them.
     * @param {Object} treeNode - jstree node whose parameters are displayed
     * @param {Object} parameterSelects - jQuery select of each parameter, by parameter key
     * @returns {void}
     */
    self.saveParameters = function (treeNode, parameterSelects) {
        var content = {};
        // a copy, the record keeps the saved values if the request fails
        if (self.preferenceRecord) {
            content = JSON.parse(JSON.stringify(self.preferenceRecord.data_content));
        }
        var nodeContent = self.getNodeContent(content, treeNode.id, true);
        treeNode.data.parameters.forEach(function (parameter) {
            nodeContent[parameter.key] = parameterSelects[parameter.key].val();
        });

        var payload = {
            data_type: self.dataType,
            data_label: self.dataType,
            data_tool: "UserSettings",
            data_content: content,
        };
        var type = "POST";
        var url = `${Config.apiUrl}/users/data`;
        if (self.preferenceRecord) {
            type = "PUT";
            url += "/" + self.preferenceRecord.id;
        }
        $.ajax({
            type: type,
            url: url,
            data: JSON.stringify(payload),
            contentType: "application/json",
            success: function (result) {
                if (self.preferenceRecord) {
                    self.preferenceRecord.data_content = content;
                } else {
                    self.preferenceRecord = { id: result.id, data_content: content };
                }
                self.applyPreferences();
                UI.message("Preferences saved");
            },
            error: function (err) {
                MainController.errorAlert(err.responseText || err);
            },
        });
    };

    return self;
})();

export default UserPreferences;
window.UserPreferences = UserPreferences;
