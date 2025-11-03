import MainController from "../shared/mainController.js";
import common from "../shared/common.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import UI from "../shared/UI.js";

var SourceSelectorWidget = (function () {
    var self = {};
    self.currentTreeDiv = null;

    self.showSourceDialog = function (resetAll) {
        $("#sourceSelector_searchInput").trigger("focus");
        var onSourceSelect;
        if (resetAll) {
            Lineage_sources.loadedSources = {};
            onSourceSelect = SourceSelectorWidget.onSourceSelect;
        } else {
            onSourceSelect = SourceSelectorWidget.onSourceSelect_AddSource;
        }
        SourceSelectorWidget.initWidget(null, "mainDialogDiv", true, onSourceSelect, null, null, function () {
            $("#" + $("#mainDialogDiv").parent().attr("aria-labelledby")).html("Source Selector");
        });
    };

    self.initWidget = function (types, targetDivId, isDialog, selectTreeNodeFn, okButtonValidateFn, options, callback) {
        if (self.currentTreeDiv != null) {
            if ($("#" + self.currentTreeDiv).jstree() != undefined) {
                try {
                    $("#" + self.currentTreeDiv)
                        .jstree()
                        .destroy();
                } catch (e) {}
            }
        }

        self.currentTreeDiv = targetDivId;
        if (!options) {
            options = {};
        }
        var jsTreeOptions = options;
        jsTreeOptions.selectTreeNodeFn = selectTreeNodeFn;
        UI.showHideRightPanel("hide");

        $("#" + targetDivId).load("./modules/uiWidgets/html/sourceSelector.html", function (err) {
            try {
                UI.openDialog(targetDivId, { title: "Source Selector" });
            } catch (e) {}
            self.loadSourcesTreeDiv("sourceSelector_jstreeDiv", jsTreeOptions);
            $("#sourceSelector_searchInput").trigger("focus");
            //  $("#sourceSelector_SearchSourceInput");
            $("#sourceSelector_validateButton").bind("click", function () {
                okButtonValidateFn();
                if (isDialog) {
                    $("#" + targetDivId).dialog("close");
                }
            });

            if (options.withCheckboxes) {
                $(".sourceSelector_buttons").css("display", "block");
            } else {
                $(".sourceSelector_buttons").css("display", "none");
            }

            if (isDialog) {
                UI.openDialog(targetDivId, { title: "Source Selector" });
            }
            if (callback) {
                callback();
            }
        });
    };
    self.getSourcesJstreeData = function (types, sourcesSelection) {
        var distinctNodes = {};

        var distinctGroups = {};

        var treeData = [];
        if (Config.currentProfile.allowedSourceSchemas.length == 0) {
            return alert(Config.currentProfile.name + " has no schema type allowed. Contact administrator");
        }
        Config.currentProfile.allowedSourceSchemas.sort().forEach(function (item) {
            if (!types || (types && types.indexOf(item) > -1)) {
                treeData.push({
                    id: item,
                    text: item,
                    parent: "#",
                    type: "Folder",
                });
            }
        });
        Object.keys(Config.sources)
            .sort()
            .forEach(function (sourceLabel, index) {
                //  self.initControllers();
                if (sourcesSelection && sourcesSelection.indexOf(sourceLabel) < 0) {
                    return;
                }
                if (Config.sources[sourceLabel].isDraft) {
                    //OK
                }
                if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) < 0) {
                    return;
                }
                Config.sources[sourceLabel].name = sourceLabel;

                var parent = Config.sources[sourceLabel].schemaType;

                var othersGroup = "OTHERS";

                var group = Config.sources[sourceLabel].group;
                if (group) {
                    var subGroups = group.split("/");
                    subGroups.forEach(function (subGroup, index) {
                        if (index > 0) {
                            parent = subGroups[index - 1];
                        }
                        if (!distinctGroups[subGroup]) {
                            distinctGroups[subGroup] = 1;
                            treeData.push({
                                id: subGroup,
                                text: subGroup,
                                type: "Folder",
                                parent: parent,
                            });
                        }
                        group = subGroup;
                    });
                } else {
                    group = othersGroup + "_" + parent;
                    if (types) {
                        group = Config.sources[sourceLabel].schemaType;
                    } else {
                        group = Config.sources[sourceLabel].schemaType;
                    }
                }
                if (!types && !distinctGroups[othersGroup]) {
                    distinctGroups[othersGroup] = 1;
                    treeData.push({
                        id: othersGroup + "_" + parent,
                        text: "OTHERS",
                        type: "Folder",
                        parent: "#",
                    });
                }
                if (!distinctNodes[sourceLabel]) {
                    distinctNodes[sourceLabel] = 1;

                    if (!Config.sources[sourceLabel].color) {
                        Config.sources[sourceLabel].color = common.palette[index % common.palette.length];
                    }
                    //  console.log(JSON.stringify(jstreeData,null,2))
                    if (!types || types.indexOf(Config.sources[sourceLabel].schemaType) > -1) {
                        var type = Config.sources[sourceLabel].schemaType;
                        if (type == "OWL") {
                            type = "Source";
                        }
                        if (type == "SKOS") {
                            type = "Thesaurus";
                        }
                        treeData.push({
                            id: sourceLabel,
                            text: sourceLabel,
                            type: type,
                            parent: group,
                            data: {
                                type: "source",
                                label: sourceLabel,
                                id: sourceLabel,
                            },
                        });
                    }
                }
            });

        return treeData;
    };

    self.addRecentSources = function (treeData) {
        self.recentSources = JSON.parse(localStorage.getItem("recentSources"));
        if (self.recentSources && self.recentSources.length > 0) {
            treeData.unshift({ id: "Recent", text: "Recent", type: "Folder", parent: "#" });
            for (let i = self.recentSources.length - 1; i >= 0; i--) {
                var source = self.recentSources[i];
                treeData.push({ id: source, text: source, type: "Source", parent: "Recent", data: { type: "source", label: source, id: source } });
            }
        }
        return treeData;
    };
    /**
     *
     * @param divId
     * @param jstreeOptions
     *  contextMenu
     *  withCheckboxes
     *  selectTreeNodeFn
     * @param validateFn
     * @param okButtonValidateFn
     */
    self.loadSourcesTreeDiv = function (treeDiv, jstreeOptions, callback) {
        if (!jstreeOptions) {
            jstreeOptions = {};
        }

        var treeData = self.getSourcesJstreeData();
        treeData = self.addRecentSources(treeData);

        if (!jstreeOptions.contextMenu) {
            jstreeOptions.contextMenu = SourceSelectorWidget.getJstreeConceptsContextMenu();
        }

        if (!jstreeOptions.withCheckboxes && !jstreeOptions.selectTreeNodeFn) {
            jstreeOptions.selectTreeNodeFn = self.defaultSelectTreeNodeFn;
        }
        if (jstreeOptions.withCheckboxes) {
            jstreeOptions.tie_selection = false;
        }

        if (!jstreeOptions.onOpenNodeFn) {
            jstreeOptions.onOpenNodeFn = self.defaultOpenNodeFn;
        }

        $("#sourceSelector_searchInput").bind("keydown", null, function () {
            if (event.keyCode != 13 && event.keyCode != 9) {
                return;
            }
            var value = $(this).val();
            $("#" + treeDiv)
                .jstree(true)
                .search(value);
        });

        jstreeOptions.searchPlugin = {
            case_insensitive: true,
            fuzzy: false,
            show_only_matches: true,
        };

        JstreeWidget.loadJsTree(treeDiv, treeData, jstreeOptions, function () {
            var openedTypes = Config.preferredSchemaType;
            $("#" + treeDiv)
                .jstree(true)
                .open_node(openedTypes);
            if (self.recentSources)
                $("#" + treeDiv)
                    .jstree(true)
                    .open_node("Recent");
            if (callback) {
                return callback();
            }
        });
    };

    self.defaultSelectTreeNodeFn = function (evt, obj) {
        if (!Config.sources[obj.node.id]) {
            return;
        }
        $("#mainDialogDiv").dialog("close");
        if (obj.node.parent == "#") {
            //first level group by schema type
            if (Config.currentProfile.allowedSourceSchemas.indexOf(obj.node.id) > -1) {
                //schemaTypeNode
                if (obj.node.id == "KNOWLEDGE_GRAPH") {
                    MainController.currentSchemaType = "OWL";
                } else {
                    MainController.currentSchemaType = obj.node.id;
                }

                if ($("#sourcesTreeDiv").children().length > 0) {
                    $("#sourcesTreeDiv").jstree(true).open_node(obj.node.id);
                }
                return;
            }
        } else {
            self.currentSource = obj.node.id;
            SourceSelectorWidget.onSourceSelect(obj.event);
        }
    };

    self.defaultOpenNodeFn = function (evt, obj) {
        if (obj.node.parent == "#") {
            //first level group by schema type
            if (Config.currentProfile.allowedSourceSchemas.indexOf(obj.node.id) > -1) {
                //schemaTypeNode
                if (obj.node.id == "KNOWLEDGE_GRAPH") {
                    MainController.currentSchemaType = "OWL";
                } else {
                    MainController.currentSchemaType = obj.node.id;
                }
            }
        }
    };

    self.getSelectedSource = function () {
        return $("#sourceSelector_jstreeDiv").jstree().get_selected();
    };

    self.getCheckedSources = function () {
        var vv = $("#sourceSelector_jstreeDiv").jstree();
        var checkedNodes = $("#sourceSelector_jstreeDiv").jstree().get_checked();
        var sources = [];
        checkedNodes.forEach(function (item) {
            if (Config.sources[item]) sources.push(item);
        });
        return sources;
    };

    self.onSourceSelect = function (event, obj) {
        if (obj.event.type == "contextmenu") {
            return;
        }
        if (obj.node.type == "Folder") {
            $("#sourceSelector_jstreeDiv").jstree(true).open_node(obj.node.id);
            return;
        }
        $("#" + self.currentTreeDiv).dialog("close");
        self.initSource(obj.node.data.id);
    };

    self.initSource = function (source) {
        MainController.currentSource = source;
        $("#selectedSource").html(source);

        const params = new URLSearchParams(document.location.search);
        if (source) {
            params.set("source", source);
        }
        common.storeLocally(source, "recentSources", 8);
        window.history.replaceState(null, "", `?${params.toString()}`);
        MainController.initTool(MainController.currentTool, function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            UI.resetWindowSize();
        });
    };

    // MainController or in Lineage_r ?
    self.onSourceSelect_AddSource = function (evt, obj) {
        if (obj.node.type == "Folder") {
            $("#sourceSelector_jstreeDiv").jstree(true).open_node(obj.node.id);
            return;
        }
        $("#" + self.currentTreeDiv).dialog("close");
        //  if (!MainController.currentTool) return self.alert("select a tool first");
        if (!obj.node.data || obj.node.data.type != "source") {
            return alert("select a tool");
        }

        MainController.currentSource = obj.node.data.id;
        $("#selectedSource").html(MainController.currentSource);
        //  $("#mainDialogDiv").parent().hide();
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return MainController.errorAlert(err);
            }
        });
    };

    self.getJstreeConceptsContextMenu = function () {
        if (!MainController.currentTool || !Config.userTools[MainController.currentTool]) {
            return;
        }
        var controller = Config.userTools[MainController.currentTool].controller;
        if (controller.jstreeContextMenu) {
            return controller.jstreeContextMenu();
        }
    };

    return self;
})();

export default SourceSelectorWidget;
window.SourceSelectorWidget = SourceSelectorWidget;
