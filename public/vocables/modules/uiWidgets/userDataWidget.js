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

            var data_path = self.data_dir + "/" + label + ".json";

            var group = $("#userDataWidget_group").val();

            self.saveMetadata(label, data_path, self.jsonContent, group, function (err, result) {
                $("#" + self.divId).dialog("close");
                UI.message(err || result);
                if (err) {
                    self.callbackFn(err);
                }

                self.callbackFn(null, { label: label, data_path: data_path, data_content: self.jsonContent });
            });
        });

    self.saveMetadata = function (label, data_path, jsonContent, group, callback) {
        var payload = {
            data_path: data_path || "",
            data_type: "string",
            data_label: label,
            data_comment: "",
            data_group: group || "",
            data_content: jsonContent || {},
            is_shared: false,
            shared_profiles: [],
            shared_users: [],
            owned_by: Authentification.currentUser.login,
        };

        var type = "POST";
        if (self.currentTreeNode) {
            type = "PUT";
        }
        payload = JSON.stringify(payload);
        $.ajax({
            type: type,
            url: `${Config.apiUrl}/users/data`,
            data: payload,
            //dataType: "json",
            contentType: "application/json",
            success: function (_result, _textStatus, _jqXHR) {
                callback(null, "graph saved");
            },
            error(err) {
                return callback(err);
            },
        });
    };
    self.loadUserDatabyId = function (id) {
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/users/data/` + "" + id,
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                callback(null, "graph saved");
            },
            error(err) {
                return callback(err);
            },
        });
    };

    self.getUserdatabyLabel=function(label,callback){

        self.listUserData  ("", function(err,result) {
            if(err)
                return callback(err)
            var obj=null
            result.forEach(function(item){
                if(item.data_label==label)
                    obj=item
            })
            if(!obj)
               return callback("not found")
            callback(null,obj)
        });

    }


    self.listUserData = function (filter, callback) {
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/users/data`,
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

    self.showSaveDialog = function (data_dir, jsonContent, divId, callbackFn) {
        self.data_dir = data_dir;
        self.jsonContent = jsonContent;
        self.callbackFn = callbackFn;
        self.showDialog(divId, "save");
    };

    self.showListDialog = function (divId, callbackFn) {
        self.callbackFn = callbackFn;
        self.currentTreeNode = null;
        self.showDialog(divId, "list", function () {
            $.ajax({
                type: "GET",
                url: `${Config.apiUrl}/users/data`,
                dataType: "json",
                success: function (_result, _textStatus, _jqXHR) {
                    var data = _result;

                    if (data.length == 0) {
                        $("#userDataWidget_jstree").html("nothing to load");
                    }

                    var jstreeData = [];
                    var uniqueNodes = {};

                    data.forEach(function (item) {
                        var parent = "#";
                        if (item.data_group != "") {
                            var array = item.data_group.split("/");

                            // if (array.length > 0) {

                            array.forEach(function (group, index) {
                                if (!uniqueNodes[group]) {
                                    uniqueNodes[group] = 1;
                                    jstreeData.push({
                                        id: group,
                                        text: group,
                                        parent: parent,
                                    });
                                    parent = group;
                                }
                            });
                        }

                        if (!uniqueNodes[item.id]) {
                            uniqueNodes[item.id] = 1;
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
                            if (obj.event.ctrlKey) {
                                self.currentTreeNode = obj.node;
                                if (!obj.node.data) {
                                    return;
                                } // refuse groups
                                $("#" + self.divId).dialog("close");

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
