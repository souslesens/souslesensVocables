import Authentification from "../shared/authentification.js";

var UserDataWidget = (function () {
    var self = {};

    self.data_dir = "";
    self.jsonContent = "";
    (self.callbackFn = null),
        (self.saveUI = function () {
            var label = $("#userDataWidget_label").val();
            if (!label) {
                return alert("label is mandatory");
            }

            var data_type = self.data_type;

            var group = $("#userDataWidget_group").val();

            self.saveMetadata(label, data_type, self.jsonContent, group, function (err, result) {
                $("#" + self.divId).dialog("close");
                UI.message(err || result);
                if (err) {
                    self.callbackFn(err);
                }

                self.callbackFn(null, { label: label, data_type: data_type, data_content: self.jsonContent, id: result.id, data_group: group });
            });
        });

    self.saveMetadata = function (label, data_type, jsonContent, group, callback) {
        var tool = MainController.currentTool || "?";
        var source = MainController.currentSource || "?";
        var payload = {
            data_path: "",
            data_type: data_type,
            data_label: label,
            data_comment: "",
            data_group: group || "",
            data_tool: tool || "",
            data_source: source || "",
            data_content: jsonContent || {},
            is_shared: false,
            shared_profiles: [],
            shared_users: [],
            owned_by: Authentification.currentUser.login,
        };

        var type = "POST";
        if (self.currentTreeNode) {
            type = "PUT";
            payload.id = self.currentTreeNode.id;
        }
        payload = JSON.stringify(payload);
        $.ajax({
            type: type,
            url: `${Config.apiUrl}/users/data`,
            data: payload,
            //dataType: "json",
            contentType: "application/json",
            success: function (_result, _textStatus, _jqXHR) {
                callback(null, _result);
            },
            error(err) {
                return callback(err);
            },
        });
    };
    self.loadUserDatabyId = function (id, callback) {
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/users/data/` + "" + id,
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                callback(null, _result);
            },
            error(err) {
                return callback(err);
            },
        });
    };

    self.getUserdatabyLabel = function (label, callback) {
        self.listUserData("", function (err, result) {
            if (err) return callback(err);
            var obj = null;
            result.forEach(function (item) {
                if (item.data_label == label) obj = item;
            });
            if (!obj) return callback("not found");
            callback(null, obj);
        });
    };

    self.listUserData = function (filter, callback) {
        if (!filter) filter = {};

        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/users/data`,
            data: filter,
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                callback(null, _result);
            },
            error(err) {
                return callback(err);
            },
        });
    };

    self.deleteItem = function (nodeData, callback) {
        if (!nodeData) {
            return;
        }
        if (confirm("delete node " + nodeData.data_label)) {
            $.ajax({
                type: "DELETE",
                url: `${Config.apiUrl}/users/data/` + "" + nodeData.id,
                dataType: "json",
                success: function (_result, _textStatus, _jqXHR) {
                    callback(null, "graph saved");
                },
                error(err) {
                    return callback(err);
                },
            });
        }
    };

    self.showSaveDialog = function (data_type, jsonContent, divId, callbackFn) {
        self.data_type = data_type;
        self.jsonContent = jsonContent;
        self.callbackFn = callbackFn;
        self.showDialog(divId, "save");
    };

    self.showListDialog = function (divId, options, callbackFn) {
        self.callbackFn = callbackFn;
        self.currentTreeNode = null;
        if (!options) {
            options = {};
        }
        self.options = options;
        var parameters = {};
        if (self.options.filter && Object.keys(self.options.filter).length > 0) {
            Object.keys(self.options.filter).forEach(function (key) {
                if (self.options.filter[key]) {
                    parameters[key] = self.options.filter[key];
                }
            });
        }
        self.showDialog(divId, "list", function () {
            $.ajax({
                type: "GET",
                url: `${Config.apiUrl}/users/data`,
                data: parameters,
                dataType: "json",
                success: function (_result, _textStatus, _jqXHR) {
                    var data = _result;

                    if (data.length == 0) {
                        $("#userDataWidget_jstree").html("nothing to load");
                    }

                    var jstreeData = [];
                    self.uniqueJstreeNodes = {};

                    // check data after filters
                    if (data.length == 0) {
                        $("#userDataWidget_jstree").html("nothing to load");
                    }

                    data.forEach(function (item) {
                        var parent = "#";
                        if (item.data_group != "") {
                            var array = item.data_group.split("/");

                            // if (array.length > 0) {
                            if (array.length > 0) {
                                array.forEach(function (group, index) {
                                    if (!self.uniqueJstreeNodes[group]) {
                                        self.uniqueJstreeNodes[group] = 1;
                                        jstreeData.push({
                                            id: group,
                                            text: group,
                                            parent: parent,
                                        });
                                        parent = group;
                                    }
                                });
                                if (parent == "#") {
                                    var lastItem = array.at(-1);
                                    if (self.uniqueJstreeNodes[lastItem]) {
                                        parent = lastItem;
                                    }
                                }
                            }
                        }

                        if (!self.uniqueJstreeNodes[item.id]) {
                            self.uniqueJstreeNodes[item.id] = 1;
                            jstreeData.push({
                                id: item.id,
                                text: item.data_label,
                                parent: parent,
                                data: item,
                            });
                        }
                    });

                    var options = {
                        selectTreeNodeFn: function (event, obj) {
                            self.currentTreeNode = obj.node;
                            if (!obj.node.data) {
                                $("#userDataWidget_jstree").jstree().open_node(obj.node.id);
                                return;
                            } // refuse groups

                            if (obj.event.type == "click") {
                                if (self.divId.includes("Dialog")) {
                                    $("#" + self.divId).dialog("close");
                                }

                                callbackFn(null, obj.node.data);
                            }
                        },
                        contextMenu: function (node) {
                            var items = {};
                            if (self.callbackFn) {
                                items.open = {
                                    label: "Open",
                                    action: function (_e) {
                                        self.currentTreeNode = node;
                                        $("#" + self.divId).dialog("close");
                                        callbackFn(null, node.data);
                                    },
                                };
                            }

                            items.delete = {
                                label: "Delete",
                                action: function (_e) {
                                    UserDataWidget.deleteItem(node.data, function (err, result) {
                                        if (err) {
                                            return alert(err.responseText || err);
                                        }

                                        //!!!!!TODO  delete also graph data
                                        JstreeWidget.deleteNode("userDataWidget_jstree", node.data.id);
                                    });
                                },
                            };
                            items.share = {
                                label: "Share",
                                action: function (_e) {
                                    alert("coming soon");
                                },
                            };
                            return items;
                        },
                    };

                    JstreeWidget.loadJsTree("userDataWidget_jstree", jstreeData, options);
                    if (self.options.removeSaveDiv) {
                        $("#userDataWidget_saveDiv").remove();
                    }
                },
                error(err) {
                    return callbackFn(err.responseText || err);
                },
            });
        });
    };

    self.showDialog = function (divId, mode, callback) {
        if (!divId) {
            divId = "smallDialogDiv";
        }
        self.divId = divId;
        $("#" + divId).load("modules/uiWidgets/html/userDataWidget.html", function () {
            if (mode == "save") {
                $("#userDataWidget_saveDiv").css("display", "block");
            } else if (mode == "list") {
                $("#userDataWidget_listDiv").css("display", "block");
            }

            if (self.currentTreeNode) {
                $("#userDataWidget_updateButton").css("display", "block");
                $("#userDataWidget_label").val(self.currentTreeNode.data.data_label);
            }

            if (divId == "smallDialogDiv") {
                $("#" + divId).dialog("open");
            }

            if (callback) {
                callback();
            }
        });
    };

    return self;
})();

export default UserDataWidget;
window.UserDataWidget = UserDataWidget;
