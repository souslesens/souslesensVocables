import MainController from "../shared/mainController.js";
import SearchUtil from "../search/searchUtil.js";


var SourceSelectorWidget = (function() {
  var self={}


  self.currentTargetDiv = "currentSourceTreeDiv";

  self.showDialog = function(types, options, validateFn, okButtonValidateFn) {
    if (!options) {
      options = {};
    }
    if (!self.searchableSourcesTreeIsInitialized) {
      function doDialog(sources) {
        var jstreeOptions = {
          selectTreeNodeFn: validateFn,
          searchPlugin: {
            case_insensitive: true,
            fuzzy: false,
            show_only_matches: true
          }
        };
        if (options.withCheckboxes) {
          jstreeOptions.withCheckboxes = true;
          //   jstreeOptions.onCheckNodeFn=options.onCheckNodeFn
        }
        self.searchableSourcesTreeIsInitialized = false;
        if (!types) {
          types = ["OWL"];
        }
        var sourcesSelectionDialogdiv = "sourcesSelectionDialogdiv";
        if (options.targetDiv) {
          sourcesSelectionDialogdiv = options.targetDiv;
        }
        if (options.openTargetDialogDiv) {
          $("#" + sourcesSelectionDialogdiv).on("dialogopen", function(event, ui) {
            $("#Lineage_classes_SearchSourceInput").val("");
            MainController.UI.showSources("searchAll_sourcesTree", false, sources, types, jstreeOptions);
          });

          $("#" + sourcesSelectionDialogdiv).dialog("open");
        }
        else {
          $("#Lineage_classes_SearchSourceInput").val("");
          MainController.UI.showSources("searchAll_sourcesTree", false, sources, types, jstreeOptions);
        }
        $("#Lineage_classes_SearchSourceInput").focus();
        if (okButtonValidateFn) {
          $("#searchAllValidateButton").bind("click", okButtonValidateFn);
        }
        else {
          $("#searchAllValidateButton").css("display", "none");
        }

        $("#Lineage_classes_SearchSourceInput").bind("keydown", null, SearchWidget.searchInSourcesTree);
      }

      if (options.includeSourcesWithoutSearchIndex) {
        setTimeout(function() {
          doDialog(null);
        }, 500);
      }
      else {
        SearchUtil.initSourcesIndexesList(null, function(err, sources) {
          if (err) {
            return MainController.UI.message(err);
          }
          doDialog(sources);
        });
      }
    }
    else {
      $("#" + sourcesSelectionDialogdiv).dialog("open");
      $("#Lineage_classes_SearchSourceInput").focus();
      /*  if ($("#searchAll_sourcesTree").jstree())
$("#searchAll_sourcesTree").jstree().uncheck_all();*/
    }
  };

  return self;


})();

export default SourceSelectorWidget;
window.SourceSelectorWidget = SourceSelectorWidget;