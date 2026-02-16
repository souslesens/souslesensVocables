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
        // Admin passes selected sources here
        selectedSources: [],
        // We use the first selected source as the "reference" source for listing vocabs
        referenceSource: Lineage_sources.activeSource,

        selectedVocabulary: "",
        selectedPropertyUri: "",
        propertyUriToLabelMap: {},

        // Stored template content
        templateSelections: [], // [{vocab, propertyUri, propertyLabel}]
        templatePropertyUris: [], // [uri1, uri2, ...]
      };

      if (_params) {
        for (var key in _params) {
          self.params[key] = _params[key];
        }
      }

      // Normalize selected sources
      if (Array.isArray(self.params.sources)) {
        self.params.selectedSources = self.params.sources;
      }

      if (self.params.selectedSources.length > 0) {
        self.params.referenceSource = self.params.selectedSources[0];
      }

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
          choosePropertyFn: {
            afterChoosePropertyFn: self.workflow_loop,
          },
        },
      },
      "Save template": { saveTemplateFn: self.workflow_end },
    },
  };

  self.workflow_afterSave = {
    _OR: {
        "Create another template": { resetTemplateFn: self.workflow_entry },
        End: { endBotFn: {} },
    },
  };
  // Entry menu 
    self.workflow_entry = {
        _OR: {
            "Choose property": {
            listTemplateVocabsFn: {
                choosePropertyFn: {
                afterChoosePropertyFn: self.workflow_loop,
                },
            },
            },
            End: { endBotFn: {} },
        },
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

      // Same behavior as other tools: source + imports + base vocabs
      CommonBotFunctions.listVocabsFn(sourceForVocabs, true, function (err, vocabs) {
        if (err) {
          return self.myBotEngine.abort(err.responseText || err);
        }
        if (!vocabs || vocabs.length === 0) {
          return self.myBotEngine.previousStep("No vocabularies found. Try another source.");
        }
        self.myBotEngine.showList(vocabs, "selectedVocabulary");
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

        // Build list choices: id = URI
        var choices = nonObjectProperties.map(function (p) {
          return {
            id: p.id,
            label: normalizePropertyLabel(vocab, p.label),
          };
        });

        // Keep label map for later
        self.params.propertyUriToLabelMap = {};
        choices.forEach(function (c) {
          self.params.propertyUriToLabelMap[c.id] = c.label;
        });

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
        referenceSource: self.params.referenceSource,
        selectedSources: self.params.selectedSources,
        properties: self.params.templatePropertyUris,
        selections: self.params.templateSelections,
      };

      UserDataWidget.showSaveDialog(
        "annotationPropertiesTemplate",
        dataContent,
        "smallDialogDiv",
        { title: "Save annotation properties template" },
        function (err, saved) {
          if (err) {
            return self.myBotEngine.abort(err.responseText || err);
          }

          UI.message("Template saved (id=" + saved.id + ")", true);


          // Show post-save menu: create another or finish
          self.myBotEngine.currentObj = self.workflow_afterSave;
          return self.myBotEngine.nextStep(self.workflow_afterSave);

        },
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
  };

  return self;
})();

export default AnnotationPropertiesTemplate_bot;
window.AnnotationPropertiesTemplate_bot = AnnotationPropertiesTemplate_bot;