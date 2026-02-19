import BotEngineClass from "./_botEngineClass.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import UserDataWidget from "../uiWidgets/userDataWidget.js";

/**
 * @module AnnotationPropertiesTemplate_bot
 * A dedicated workflow to create "annotation properties templates".
 * This bot is started from the Admin menu and requires at least one selected source.
 */
var AnnotationPropertiesTemplate_bot = (function () {
  var self = {};

  self.myBotEngine = new BotEngineClass();
  self.title = "Annotation properties template";

  /**
   * Starts the bot.
   * @param {object} workflow Optional workflow override
   * @param {object} _params Parameters, expects { sources: string[] }
   * @param {function} callback Standard callback(err)
   */
  self.start = function (workflow, _params, callback) {
      var startParams = self.myBotEngine.fillStartParams(arguments);
      self.callback = callback;

      if (!workflow) {
          workflow = self.workflow;
      }

      self.myBotEngine.init(AnnotationPropertiesTemplate_bot, workflow, null, function () {
          self.myBotEngine.startParams = startParams;

          self.params = {
              referenceSource: null,
              selectedVocabulary: "",
              selectedPropertyUri: "",
              propertyUriToLabelMap: {},
              templateSelections: [],
              templatePropertyUris: []
          };

          // Optional reference source (context only)
          if (_params && _params.referenceSource) {
              self.params.referenceSource = _params.referenceSource;
          } else {
              self.params.referenceSource = Lineage_sources.activeSource || null;
          }

          // ✅ NOTHING ELSE HERE
          self.myBotEngine.nextStep();
      });
  };

  // ---------------------------
  // Helpers 
  // ---------------------------

  /**
   * Deduplicates selections by (vocab + uri).
   * @param {Array<{vocab:string, propertyUri:string, propertyLabel:string}>} selections
   * @returns {Array}
   */
  function dedupeSelections(selections) {
    var seen = {};
    var out = [];

    selections.forEach(function (item) {
      if (!item || !item.vocab || !item.propertyUri) {
        return;
      }
      var key = item.vocab + "||" + item.propertyUri;
      if (!seen[key]) {
        seen[key] = 1;
        out.push(item);
      }
    });

    return out;
  }

  /**
   * Extracts a shorter display label (removes "vocab:" prefix when present).
   * @param {string} vocab
   * @param {string} label
   * @returns {string}
   */
  function normalizePropertyLabel(vocab, label) {
    if (!label) return "";
    if (typeof label !== "string") {
    label = String(label);
    }
    var prefix = vocab + ":";
    if (label.indexOf(prefix) === 0) {
    return label.substring(prefix.length);
    }
    return label;
  }

  // ---------------------------
  // Workflows
  // ---------------------------

  self.workflow_end = {
    _OR: {
      End: {},
    },
  };

  self.workflow_loop = {
    _OR: {
      "Add another property": {
          listTemplateVocabsFn: {
              // selectedVocabulary: {
                  choosePropertyFn: {
                      afterChoosePropertyFn: self.workflow_loop
                  }
              // }
          }
      },
      "Save template": { saveTemplateFn: self.workflow_end },
    },
  };

  self.workflow_afterSave = {
    _OR: {
        "Create another template": { resetTemplateFn: {} },
        End: { endBotFn: {} },
    },
  };
  // Entry point: directly start with vocabulary selection
  self.workflow_entry = {
      _OR: {
          "Choose property": {
              listTemplateVocabsFn: {
                      choosePropertyFn: {
                          afterChoosePropertyFn: self.workflow_loop
                    }
              }
          },
          End: { endBotFn: {} }
      }
  };

  self.workflow = self.workflow_entry;

  self.functionTitles = {
    _OR: "Select an option",
    listTemplateVocabsFn: "Choose vocabulary (annotation properties)",
    choosePropertyFn: "Choose an annotation property",
    afterChoosePropertyFn: "Property added to template",
    saveTemplateFn: "Save annotation properties template",
  };

  self.functions = {
    /**
     * Lists vocabularies using the reference source (source + imports).
     */
    listTemplateVocabsFn: function () {
      var sourceForVocabs = self.params.referenceSource;
      
      // Fallback for GLOBAL templates (no source selected)
      // We list only standard vocabularies
      if (!sourceForVocabs) {
          var standardVocabs = [
              { id: "rdf", label: "[Standard] rdf" },
              { id: "rdfs", label: "[Standard] rdfs" },
              { id: "owl", label: "[Standard] owl" },
              { id: "skos", label: "[Standard] skos" }
          ];

          return self.myBotEngine.showList(
              standardVocabs,
              "selectedVocabulary"
          );
      }

      // Normal behavior: source-based vocab listing
      CommonBotFunctions.listVocabsFn(sourceForVocabs, true, function (err, vocabs) {
        if (err) {
          return self.myBotEngine.abort(err.responseText || err);
        }
        if (!vocabs || vocabs.length === 0) {
          return self.myBotEngine.previousStep("No vocabularies found. Try another source.");
        }
        // -------------------------------------------------------------------------
        // Vocabulary categorization and sorting (Admin / Bot UI)
        // -------------------------------------------------------------------------

        // RDF core vocabularies always available in SousLesens
        var RDF_STANDARD_VOCABS = {
            rdf: true,
            rdfs: true,
            owl: true,
            skos: true,
        };

        // Display order for categories (UX-oriented)
        var VOCAB_CATEGORY_ORDER = {
            Source: 1,
            Import: 2,
            Standard: 3,
        };

        /**
         * Returns the functional category of a vocabulary.
         * @param {string} vocabId
         * @param {string} referenceSource
         * @returns {"Source"|"Import"|"Standard"}
         */
        function getVocabularyCategory(vocabId, referenceSource) {
            if (vocabId === referenceSource) {
                return "Source";
            }
            if (RDF_STANDARD_VOCABS[vocabId]) {
                return "Standard";
            }
            return "Import";
        }

        /**
         * Normalizes raw vocabulary item coming from listVocabsFn.
         * Handles both string and object formats.
         */
        function normalizeVocabularyItem(vocabItem) {
            if (!vocabItem) return null;

            if (typeof vocabItem === "string") {
                return {
                    id: vocabItem,
                    label: vocabItem,
                };
            }

            if (typeof vocabItem === "object" && vocabItem.id) {
                return {
                    id: vocabItem.id,
                    label: vocabItem.label || vocabItem.id,
                };
            }

            return null;
        }

        // Reference source used to identify [Source]
        var referenceSource = self.params.referenceSource;

        // Build categorized vocabularies
        var categorizedVocabularies = vocabs
            .map(normalizeVocabularyItem)
            .filter(Boolean)
            .map(function (vocab) {
                var category = getVocabularyCategory(vocab.id, referenceSource);

                return {
                    id: vocab.id,
                    label: "[" + category + "] " + vocab.label,
                    category: category,
                };
            });

        // Sort vocabularies for better UX
        categorizedVocabularies.sort(function (a, b) {
            var categoryDiff =
                VOCAB_CATEGORY_ORDER[a.category] -
                VOCAB_CATEGORY_ORDER[b.category];

            if (categoryDiff !== 0) {
                return categoryDiff;
            }

            // Same category → alphabetical order
            return a.label.localeCompare(b.label);
        });

        // Feed BotEngine list
        self.myBotEngine.showList(categorizedVocabularies, "selectedVocabulary");
      });
    },

    /**
     * Shows annotation properties (non-object properties) for the selected vocabulary.
     */
    choosePropertyFn: function () {
      var vocab = self.params.selectedVocabulary;
      if (!vocab) {
        return self.myBotEngine.previousStep("No vocabulary selected.");
      }

      CommonBotFunctions.listNonObjectPropertiesFn([vocab], null, function (err, nonObjectProperties) {
        if (err) {
          return self.myBotEngine.abort(err.responseText || err);
        }
        if (!nonObjectProperties || nonObjectProperties.length === 0) {
          return self.myBotEngine.previousStep("No annotation properties found for this vocabulary.");
        }

        // Build list choices safely (skip invalid items)
        var choices = [];
        self.params.propertyUriToLabelMap = {};

        nonObjectProperties.forEach(function (propertyItem) {
            if (!propertyItem || !propertyItem.id) {
                return; // skip invalid properties
            }

            // Normalize label to string
            var rawLabel = propertyItem.label;
            if (!rawLabel) {
                rawLabel = propertyItem.id; // fallback to URI
            }
            var normalizedLabel = normalizePropertyLabel(vocab, rawLabel);

            choices.push({
                id: propertyItem.id,
                label: normalizedLabel,
            });

            self.params.propertyUriToLabelMap[propertyItem.id] = normalizedLabel;
        });

        if (choices.length === 0) {
            return self.myBotEngine.previousStep("No usable annotation properties found for this vocabulary.");
        }

        // Sort for better UX
        choices.sort(function (a, b) {
          return (a.label || "").localeCompare(b.label || "");
        });

        self.myBotEngine.showList(choices, "selectedPropertyUri");
      });
    },

    /**
     * Adds the selected property into the template arrays (deduplicated).
     */
    afterChoosePropertyFn: function () {
      var vocab = self.params.selectedVocabulary;
      var propertyUri = self.params.selectedPropertyUri;
      // Prevent double execution (can happen on some vocabularies / large lists)
      if (self.params.isProcessingPropertySelection) {
        return;
      }
      self.params.isProcessingPropertySelection = true;  

      if (!propertyUri) {
        return self.myBotEngine.previousStep("No property selected. Try again.");
      }

      var propertyLabel = self.params.propertyUriToLabelMap[propertyUri] || propertyUri;

      self.params.templateSelections.push({
        vocab: vocab,
        propertyUri: propertyUri,
        propertyLabel: propertyLabel,
      });

      self.params.templateSelections = dedupeSelections(self.params.templateSelections);

      // Rebuild flat URIs list
      var urisMap = {};
      self.params.templatePropertyUris = [];
      self.params.templateSelections.forEach(function (s) {
        if (!urisMap[s.propertyUri]) {
          urisMap[s.propertyUri] = 1;
          self.params.templatePropertyUris.push(s.propertyUri);
        }
      });

      UI.message(self.params.templatePropertyUris.length + " properties selected");
      UI.message("Added: " + propertyLabel + " (" + vocab + ")", true);

      // Reset selection for next loop
      self.params.selectedPropertyUri = "";

      // IMPORTANT: explicitly set the next workflow object to avoid BotEngine parsing "undefined"
      self.myBotEngine.currentObj = self.workflow_loop;
      // Release lock after transition is started
      setTimeout(function () {
        self.params.isProcessingPropertySelection = false;
      }, 300);
      return self.myBotEngine.nextStep(self.workflow_loop);
    },

    /**
     * Saves the template in user data.
     * Uses UserDataWidget.showSaveDialog (simple UI, no need to rebuild API calls).
     */
    saveTemplateFn: function () {
      if (!self.params.templatePropertyUris || self.params.templatePropertyUris.length === 0) {
        return self.myBotEngine.previousStep("No properties selected for template.");
      }

      var dataContent = {
          properties: self.params.templatePropertyUris,
          selections: self.params.templateSelections
      };

      // Keep referenceSource only as information (optional)
      if (self.params.referenceSource) {
          dataContent.referenceSource = self.params.referenceSource;
      }

      UserDataWidget.showSaveDialog(
        "annotationPropertiesTemplate",
        dataContent,
        "smallDialogDiv",
        { title: "Save annotation properties template" },
        function (err, saved) {
          if (err) {
            return self.myBotEngine.abort(err.responseText || err);
          }
          
          // Keep saved template id
          self.params.savedTemplateId = saved.id;

          self.params.savedTemplateMeta = {
            id: saved.id,
            label: saved.data_label || ("Template " + saved.id),
            group: saved.data_group || "",
            comment: saved.data_comment || "",
          };

          // Auto-apply to selected sources (the ones chosen in Admin)
          // self.functions.createAssignmentsForSelectedSourcesFn(saved.id, function (err2) {
          //   if (err2) {
          //    UI.message("Template saved but apply failed: " + (err2.responseText || err2.message || err2), true);
          //   } else {
          //       UI.message("Template saved and applied to selected sources", true);
          //   }
          self.functions.showTemplateSummaryFn();

          // Show post-save menu: create another or finish
          self.myBotEngine.currentObj = self.workflow_afterSave;
          return self.myBotEngine.nextStep(self.workflow_afterSave);

          // });
        }
      );
      
    // After opening the save dialog, move it to the right of the bot dialog
      setTimeout(function () {
        try {
            // Adjust these if your bot uses another dialog id
            var $botDialog = $(".ui-dialog:has(#mainDialogDiv)");
            var $saveDialog = $(".ui-dialog:has(#smallDialogDiv)");

            // If the bot is not in mainDialogDiv, fallback to "the currently open dialog"
            if ($botDialog.length === 0) {
            $botDialog = $(".ui-dialog:visible").first();
            }

            if ($botDialog.length > 0 && $saveDialog.length > 0) {
            var botOffset = $botDialog.offset();
            var botWidth = $botDialog.outerWidth();
            var left = botOffset.left + botWidth + 10; // 10px gap
            var top = botOffset.top;

            $saveDialog.css({ left: left + "px", top: top + "px" });

            // Ensure save dialog is above the bot dialog
            var botZ = parseInt($botDialog.css("z-index"), 10) || 1000;
            $saveDialog.css("z-index", botZ + 2);
            }
        } catch (e) {
            console.error(e);
        }
      }, 200);
    },

          /**
     * Resets current template selections (keeps selected sources).
     */
    resetTemplateFn: function () {
        self.params.selectedVocabulary = "";
        self.params.selectedPropertyUri = "";
        self.params.propertyUriToLabelMap = {};
        self.params.templateSelections = [];
        self.params.templatePropertyUris = [];

        UI.message("Template cleared. You can create a new one.", true);

        self.myBotEngine.currentObj = self.workflow_entry;
        return self.myBotEngine.nextStep(self.workflow_entry);
    },

    /**
     * Ends the bot properly.
     */
    endBotFn: function () {
        if (self.callback) {
            self.callback(null);
        }
        return self.myBotEngine.end();
    },

    // /**
    //  * Creates one assignment record per selected source.
    //  * Assignment = (templateId -> sourceLabel).
    //  * @param {number|string} templateId
    //  * @param {function} callback error-first callback
    //  */
    // createAssignmentsForSelectedSourcesFn: function (templateId, callback) {
    //     var selectedSources = self.params.selectedSources || [];

    //     if (!templateId) {
    //         return callback(new Error("Missing templateId"));
    //     }
    //     if (!selectedSources || selectedSources.length === 0) {
    //         return callback(new Error("No selected sources"));
    //     }

    //     async.eachSeries(
    //         selectedSources,
    //         function (sourceLabel, callbackEach) {
    //         var assignmentContent = {
    //             templateId: templateId,
    //             source: sourceLabel,
    //             placeholderValue: "__TO__FILL__",
    //             appliedAt: new Date().toISOString(),
    //         };

    //         var payload = {
    //             data_path: "",
    //             data_type: "annotationPropertiesTemplateAssignment",
    //             data_label: "Template " + templateId + " for " + sourceLabel,
    //             data_comment: "Auto-apply from AnnotationPropertiesTemplate_bot",
    //             data_group: sourceLabel,
    //             data_tool: "admin",
    //             data_source: sourceLabel,
    //             data_content: assignmentContent,
    //             is_shared: false,
    //             shared_profiles: [],
    //             shared_users: [],
    //         };

    //         $.ajax({
    //             url: Config.apiUrl + "/users/data",
    //             type: "POST",
    //             dataType: "json",
    //             contentType: "application/json; charset=utf-8",
    //             data: JSON.stringify(payload),
    //             success: function () {
    //             return callbackEach();
    //             },
    //             error: function (err) {
    //             return callbackEach(err);
    //             },
    //         });
    //         },
    //         function (err) {
    //         return callback(err || null);
    //         },
    //     );
    // },
    /**
     * Shows a summary of the created template: meta + sources + properties.
     */
    showTemplateSummaryFn: function () {
        var meta = self.params.savedTemplateMeta || {};
        var sources = self.params.selectedSources || [];
        var selections = self.params.templateSelections || [];
        var properties = self.params.templatePropertyUris || [];

        var html = "<div style='font-size:12px;'>";

        // Template meta
        html += "<div><b>Template:</b> " + (meta.label || "") + "</div>";
        html += "<div><b>Template ID:</b> " + (meta.id || "") + "</div>";
        html += "<div><b>Group:</b> " + (meta.group || "") + "</div>";
        html += "<div><b>Description:</b> " + (meta.comment || "") + "</div>";

        // Sources
        html += "<div style='margin-top:8px;'><b>Selected sources:</b> " + sources.join(", ") + "</div>";

        // Properties
        html += "<div style='margin-top:8px;'><b>Template properties:</b></div>";
        html += "<ul>";

        if (selections.length > 0) {
            selections.forEach(function (s) {
                var vocab = s.vocab || "?";
                var label = s.propertyLabel || s.propertyUri || "";
                html += "<li>" + vocab + ": " + label + "</li>";
            });
        } else {
            // Fallback: show URIs if selections are missing
            properties.forEach(function (p) {
                html += "<li>" + p + "</li>";
            });
        }

        html += "</ul>";
        html += "</div>";

        $("#smallDialogDiv").html(html);
        $("#smallDialogDiv").dialog("open");
        UI.setDialogTitle("#smallDialogDiv", "Template summary");
    },
  };

  return self;
})();

export default AnnotationPropertiesTemplate_bot;
window.AnnotationPropertiesTemplate_bot = AnnotationPropertiesTemplate_bot;