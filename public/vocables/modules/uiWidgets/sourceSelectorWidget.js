import MainController from "../shared/mainController.js";
import SearchUtil from "../search/searchUtil.js";
import common from "../shared/common.js";

var SourceSelectorWidget = (function () {
    var self = {};
    self.currentTreeDiv = null;
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
        MainController.UI.showHideRightPanel("hide");
        /*$("#mainDialogDiv").load("./responsive/lineage/html/SourceDiv.html", function () {
            $("#" + $("#mainDialogDiv").parent().attr("aria-labelledby")).html("Source Selector");
            $("#mainDialogDiv")
                .parent()
                .find(".ui-dialog-titlebar-close")
                .on("click", function () {
                    $("#mainDialogDiv").parent().hide();
                });

            if (resetAll) {
                Lineage_sources.loadedSources = {};
                var onSourceSelect = ResponsiveUI.onSourceSelect;
            } else {
                var onSourceSelect = ResponsiveUI.onSourceSelectForAddSource;
            }
            SourceSelectorWidget.loadSourcesTreeDiv("sourcesSelectorDiv", { selectTreeNodeFn: onSourceSelect }, function (err, result) {});
        });*/
        $("#" + targetDivId).load("./responsive/lineage/html/SourceDiv.html", function (err) {
            self.loadSourcesTreeDiv("sourcesSelectorDiv", jsTreeOptions);
            $("#sourceSelector_searchInput").focus();
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
                $("#" + targetDivId).dialog("open");
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
            optiojstreeOptionsns = {};
        }

        var treeData = self.getSourcesJstreeData();

        if (!jstreeOptions.contextMenu) {
            jstreeOptions.contextMenu = MainController.UI.getJstreeConceptsContextMenu();
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
            MainController.UI.onSourceSelect(obj.event);
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

    self.showDialog = function (types, options, validateFn, okButtonValidateFn) {};

    self.getSelectedSource = function () {
        return $("#sourceSelector_jstreeDiv").jstree().get_selected();
    };

    self.getCheckedSources = function () {
        var checkedNodes = $("#sourceSelector_jstreeDiv").jstree().get_checked();
        var sources = [];
        checkedNodes.forEach(function (item) {
            if (Config.sources[item]) sources.push(item);
        });
        return sources;
    };

    return self;
})();

export default SourceSelectorWidget;
window.SourceSelectorWidget = SourceSelectorWidget;
