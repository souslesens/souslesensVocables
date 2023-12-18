import Lineage_whiteboard from "../../modules/tools/lineage/lineage_whiteboard.js";
import Lineage_sources from "../../modules/tools/lineage/lineage_sources.js";
import ResponsiveUI from "../responsiveUI.js";
import NodesInfosWidget from "../../modules/uiWidgets/nodeInfosWidget.js";
import SearchWidget from "../../modules/uiWidgets/searchWidget.js";
import NodeInfosWidgetResponsive from "../../responsive/widget/nodeInfosWidgetResponsive.js";
import PredicatesSelectorWidget from "../../modules/uiWidgets/predicatesSelectorWidget.js";
var Lineage_r = (function () {
    var self = {};
    self.isResponsiveLoading = false;
    self.oldWhiteboardGraphActions = {};
    self.oldNodeInfosInit = null;
    self.oldAddEdgeDialog = null;
    self.oldExportTable = null;
    self.MoreActionsShow=false;
    self.MoreOptionsShow=true;
    self.init = function () {
        PredicatesSelectorWidget.load = self.loadPredicateSelectorWidgetResponsive;
        SearchWidget.currentTargetDiv = "LineageNodesJsTreeDiv";
        $("#ChangeSourceButton").show();
        $("#index_topContolPanel").show();
        //To Table
        self.oldExportTable = Export.exportTreeToDataTable;
        Export.exportTreeToDataTable = self.ExportTableDialog;
        //Nodes Infos overcharge
        /*
        self.oldNodeInfosInit = NodesInfosWidget.initDialog;
        NodesInfosWidget.initDialog = self.NodesInfosResponsiveDialog;
        All file changed
        */
        ResponsiveUI.replaceFile(NodesInfosWidget, NodeInfosWidgetResponsive);
        //SHowHideButtons overcharge
        Lineage_sources.showHideEditButtons = self.showHideEditButtons;
        //AddEdge overcharge
        self.oldAddEdgeDialog = Lineage_blend.graphModification.showAddEdgeFromGraphDialog;
        Lineage_blend.graphModification.showAddEdgeFromGraphDialog = self.responsiveAddEdgeDialog;

        //Loading
        $("#index_topContolPanel").load("./responsive/lineage/html/topMenu.html", function () {
            self.loadSources();
        });
    };
    self.loadSources = function () {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#lateralPanelDiv").load("./responsive/lineage/html/index.html", function () {
                self.initWhiteboardTab();
            });
        });
    };
    self.loadPredicateSelectorWidgetResponsive = function (divId, source, options, configureFn, callback) {
        PredicatesSelectorWidget.options = options || {};
        $("#" + divId).html("");
        $("#" + divId).load("./responsive/widget/html/predicatesSelectorWidgetDialogResponsive.html", function (a, b, c) {
            var x = a + b + c;
            PredicatesSelectorWidget.init(source, configureFn, function (err, result) {
                if (callback) {
                    return callback();
                }
            });
        });
    };
    self.initWhiteboardTab = function () {
        $("#tabs_whiteboard").load("./responsive/lineage/html/whiteboadPanel.html", function (s) {
            $("#WhiteboardTabButton").addClass("slsv-tabButtonSelected");
            $("#WhiteboardTabButton").parent().addClass("slsv-selectedTabDiv");
            Lineage_r.showHideEditButtons(Lineage_sources.activeSource);
            self.hideShowMoreActions("hide");
        });
    };

    self.initClassesTab = function () {
        $("#tabs_classes").load("./responsive/lineage/html/classesPanel.html", function (s) {
            SearchWidget.targetDiv = "LineageNodesJsTreeDiv";
            $("#GenericTools_searchAllDiv").load("./snippets/searchAllResponsive.html", function () {
                SearchWidget.init();
                $("#GenericTools_searchInAllSources").prop("checked", false);
                $('#Lineage_MoreClassesOptions').hide();
                SearchWidget.showTopConcepts();
            });
        });
    };
    self.initPropertiesTab = function () {
        $("#tabs_properties").load("./responsive/lineage/html/propertiesPanel.html", function (s) {
            Lineage_r.hideShowMoreOptions('hide','Lineage_MorePropertiesOptions');
            Lineage_properties.searchTermInSources();
        });
    };
    self.initContainersTab = function () {
        $("#tabs_containers").load("./responsive/lineage/html/containersPanel.html", function (s) {});
    };

    self.showHideEditButtons = function (source, hide) {
        if (!Lineage_whiteboard.lineageVisjsGraph.network) {
            return;
        }

        Lineage_whiteboard.lineageVisjsGraph.network.disableEditMode();
        $(".vis-edit-mode").css("display", "none");

        var isNodeEditable = Lineage_sources.isSourceEditableForUser(source);
        if (isNodeEditable) {
            $("#Lineage_graphEditionButtons").css("display", "block");
        } else {
            $("#Lineage_graphEditionButtons").css("display", "none");
        }
        $("#Title1").text($(".Lineage_selectedSourceDiv").text());
    };
    self.addNode = function () {
        ResponsiveUI.openDialogDiv("LineagePopup");
        Lineage_createResource.showAddNodeGraphDialog(function (err, result) {
            if (err) {
                return callback(err.responseText);
            }
            return null;
        });
    };
    self.addEdge = function () {
        Lineage_whiteboard.lineageVisjsGraph.network.addEdgeMode();
    };
    self.showQueryDialog = function () {
        //ResponsiveUI.openMainDialogDivForDialogs();
        $("#mainDialogDiv").parent().css("top", "10%");
        $("#mainDialogDiv").parent().css("left", "20%");
        $("#mainDialogDiv")
            .parent()
            .show("fast", function () {
                Lineage_relations.showDrawRelationsDialog();
            });
    };
    self.showPathesDialog = function () {
        //ResponsiveUI.openMainDialogDivForDialogs();

        $("#mainDialogDiv")
            .parent()
            .show("fast", function () {
                Lineage_graphTraversal.showShortestPathDialog();
            });
    };

    self.NodesInfosResponsiveDialog = function (sourceLabel, divId, options, callback) {
        ResponsiveUI.openDialogDiv(divId);
        $("#mainDialogDiv").parent().css("top", "5%");
        $("#mainDialogDiv").parent().css("left", "35%");
        $("#" + divId)
            .parent()
            .show("fast", function () {
                self.oldNodeInfosInit(sourceLabel, divId, options, callback);
            });
    };
    self.responsiveAddEdgeDialog = function (edgeData, callback) {
        ResponsiveUI.openDialogDiv("LineagePopup");
        $("#LineagePopup")
            .parent()
            .show("fast", function () {
                self.oldAddEdgeDialog(edgeData, function () {
                    callback();
                    self.showHideEditButtons(Lineage_sources.activeSource);
                });
            });
    };
    self.ExportTableDialog = function (jstreeDiv, nodeId) {
        $("#mainDialogDiv")
            .parent()
            .show("fast", function () {
                self.oldExportTable(jstreeDiv, nodeId);
            });
    };
    self.hideShowMoreActions=function(hideShowParameter){
        if(hideShowParameter=="hide"){
            self.MoreActionsShow=true;
        }
        if(hideShowParameter=="show"){
            self.MoreActionsShow=false;
        }
        if(!self.MoreActionsShow){
            $('#Lineage_MoreActionsButtons').show();
            self.MoreActionsShow=true;
            $('#Lineage_MoreActionsDiv').removeClass('TitleBoxLine');

        }
        else{
            $('#Lineage_MoreActionsButtons').hide();
            self.MoreActionsShow=false;
            $('#Lineage_MoreActionsDiv').addClass('TitleBoxLine');
            
        }
    }
    self.hideShowMoreOptions=function(hideShowParameter,divId){
        if(hideShowParameter=="hide"){
            self.MoreOptionsShow=false;
        }
        if(hideShowParameter=="show"){
            self.MoreOptionsShow=true;
        }
        if(self.MoreOptionsShow){
            $('#'+divId).show();
            self.MoreOptionsShow=false;
           

        }
        else{
            
            $('#'+divId).hide();
            self.MoreOptionsShow=true;
            
            
        }
    }
    
    return self;
})();
export default Lineage_r;
window.Lineage_r = Lineage_r;
