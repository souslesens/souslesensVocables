import BotEngineClass from "../../bots/_botEngineClass.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import Lineage_sources from "../lineage/lineage_sources.js";
import UserDataWidget from "../../uiWidgets/userDataWidget.js";

/**
 * @module createAnnotationPropertiesTemplate_bot
 * A dedicated workflow to create "annotation properties templates".
 * This bot is started from the Admin menu.
 * A reference source may be provided for vocabulary listing, but is optional.
 */
var CreateAnnotationPropertiesTemplate_bot = (function () {
    var self = {};

    self.myBotEngine = new BotEngineClass();
    self.title = "Create annotation properties template";
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

        self.myBotEngine.init(CreateAnnotationPropertiesTemplate_bot, workflow, null, function () {
            self.myBotEngine.startParams = startParams;

            self.params = {
                referenceSource: null,
                selectedVocabulary: "",
                selectedPropertyUri: "",
                propertyUriToLabelMap: {},
                templateSelections: [],
                templatePropertyUris: [],
            };

            // Optional reference source (context only) (à revoir si utile)
            if (_params && _params.referenceSource) {
                self.params.referenceSource = _params.referenceSource;
            } else {
                self.params.referenceSource = Lineage_sources.activeSource || null;
            }

            self.myBotEngine.nextStep();
        });
    };

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

            // GLOBAL templates (no reference source): show standard + common import vocabularies
            if (!sourceForVocabs) {
                var vocabs = [
                    { id: "searchProperty", label: "Search Property" },

                    // Imports (common)
                    { id: "BFO", label: "[Import] BFO" },
                    { id: "dc", label: "[Import] dc" },
                    { id: "dcterms", label: "[Import] dcterms" },
                    { id: "iof-av", label: "[Import] iof-av" },

                    // Standards
                    { id: "rdf", label: "[Standard] rdf" },
                    { id: "rdfs", label: "[Standard] rdfs" },
                    { id: "owl", label: "[Standard] owl" },
                    { id: "skos", label: "[Standard] skos" },
                ];

                return self.myBotEngine.showList(vocabs, "selectedVocabulary");
            }

            // Normal behavior: source-based vocab listing
            CommonBotFunctions.listVocabsFn(sourceForVocabs, true, function (err, vocabs) {
                if (err) {
                    return self.myBotEngine.abort(err.responseText || err);
                }
                if (!vocabs || vocabs.length === 0) {
                    return self.myBotEngine.previousStep("No vocabularies found. Try another source.");
                }
                // --------------------------------------------------------------
                // Vocabulary categorization and sorting (Admin / Bot UI)
                // -------------------------------------------------------------

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
                    var categoryDiff = VOCAB_CATEGORY_ORDER[a.category] - VOCAB_CATEGORY_ORDER[b.category];

                    if (categoryDiff !== 0) {
                        return categoryDiff;
                    }

                    // Same category → alphabetical order
                    return a.label.localeCompare(b.label);
                });

                // "Search Class" always available as first option
                categorizedVocabularies.splice(0, 0, { id: "searchProperty", label: "Search Property" });

                return self.myBotEngine.showList(categorizedVocabularies, "selectedVocabulary");
            });
        },

        /**
         * Shows annotation properties for the selected vocabulary.
         * In "searchProperty" mode, loads and merges ALL properties from every available vocab
         * (referenceSource + imports + basicVocabularies) and shows them as a single list.
         * For basicVocabularies whose graph is absent from the triplestore, falls back to
         * filtering the referenceSource graph by URI namespace.
         * In normal mode, loads properties for the single selected vocab only.
         */
        choosePropertyFn: function () {
            var vocab = self.params.selectedVocabulary;
            if (!vocab) {
                return self.myBotEngine.previousStep("No vocabulary selected.");
            }

            self.params.propertyUriToLabelMap = {};

            var showPropertyChoices = function (properties, vocabId) {
                var choices = [];

                properties.forEach(function (propertyItem) {
                    if (!propertyItem || !propertyItem.id) {
                        return;
                    }
                    var rawLabel = propertyItem.label || propertyItem.id;
                    var normalizedLabel = normalizePropertyLabel(vocabId || vocab, rawLabel);

                    choices.push({ id: propertyItem.id, label: normalizedLabel });
                    self.params.propertyUriToLabelMap[propertyItem.id] = normalizedLabel;
                });

                if (choices.length === 0) {
                    return self.myBotEngine.previousStep("No usable annotation properties found for " + vocab + ".");
                }

                choices.sort(function (a, b) {
                    return (a.label || "").localeCompare(b.label || "");
                });

                self.myBotEngine.showList(choices, "selectedPropertyUri");
            };

            if (vocab === "searchProperty") {
                var source = self.params.referenceSource;
                var vocabsToLoad = [];

                // Load in priority order: specific vocabs first, general source last.
                // This ensures deduplication keeps the most precise vocab name (e.g. "skos"
                // over "IOF-CORE-202401" for skos:prefLabel).

                // 1. basicVocabularies first (rdf, rdfs, owl, skos, dc, dcterms, iof-av)
                for (var bvKey in Config.basicVocabularies) {
                    vocabsToLoad.push(bvKey);
                }

                if (source && Config.sources[source]) {
                    // 2. imports of referenceSource (e.g. BFO)
                    var imports = Config.sources[source].imports || [];
                    imports.forEach(function (imp) {
                        if (vocabsToLoad.indexOf(imp) < 0) {
                            vocabsToLoad.push(imp);
                        }
                    });

                    // 3. referenceSource last (may contain everything but less specific)
                    if (vocabsToLoad.indexOf(source) < 0) {
                        vocabsToLoad.push(source);
                    }
                } else {
                    // No referenceSource: use sources currently loaded on the whiteboard
                    var loadedSrcIds = Object.keys(Lineage_sources.loadedSources || {});
                    loadedSrcIds.forEach(function (srcId) {
                        if (vocabsToLoad.indexOf(srcId) < 0) {
                            vocabsToLoad.push(srcId);
                        }
                    });
                }

                var allProps = [];
                var propVocabSeen = {};

                var addProps = function (props, vocabId) {
                    props.forEach(function (p) {
                        if (!p || !p.id) {
                            return;
                        }
                        var key = p.id + "|" + vocabId;
                        if (propVocabSeen[key]) {
                            return;
                        }
                        propVocabSeen[key] = true;
                        var shortLabel = normalizePropertyLabel(vocabId, p.label || p.id);
                        allProps.push({ id: p.id, label: shortLabel + " (" + vocabId + ")" });
                        self.params.propertyUriToLabelMap[p.id] = shortLabel;
                    });
                };

                async.eachSeries(
                    vocabsToLoad,
                    function (vocabId, callbackEach) {
                        CommonBotFunctions.listNonObjectPropertiesFn([vocabId], null, function (err, props) {
                            if (err || !props || props.length === 0) {
                                var vocabGraphUri =
                                    (Config.basicVocabularies && Config.basicVocabularies[vocabId] && Config.basicVocabularies[vocabId].graphUri) ||
                                    (Config.sources && Config.sources[vocabId] && Config.sources[vocabId].graphUri);
                                if (vocabGraphUri && source && source !== vocabId) {
                                    CommonBotFunctions.listNonObjectPropertiesFn([source], null, function (err2, sourceProps) {
                                        if (!err2 && sourceProps) {
                                            var nsFiltered = sourceProps
                                                .filter(function (p) {
                                                    return p.id && p.id.startsWith(vocabGraphUri);
                                                })
                                                .map(function (p) {
                                                    var shortLabel = p.id.split("/").pop().split("#").pop();
                                                    return { id: p.id, label: shortLabel };
                                                });
                                            addProps(nsFiltered, vocabId);
                                        }
                                        callbackEach();
                                    });
                                } else {
                                    callbackEach();
                                }
                                return;
                            }
                            addProps(props, vocabId);
                            callbackEach();
                        });
                    },
                    function () {
                        if (allProps.length === 0) {
                            return self.myBotEngine.previousStep("No annotation properties found.");
                        }
                        allProps.sort(function (a, b) {
                            return (a.label || "").localeCompare(b.label || "");
                        });
                        self.myBotEngine.showList(allProps, "selectedPropertyUri");
                    },
                );
                return;
            }

            var loadFromReferenceSourceByNamespace = function (vocabNamespaceUri) {
                var fallbackSource = self.params.referenceSource;
                if (!fallbackSource) {
                    return self.myBotEngine.previousStep("No annotation properties found for " + vocab + ".");
                }
                CommonBotFunctions.listNonObjectPropertiesFn([fallbackSource], null, function (err2, sourceProps) {
                    if (err2 || !sourceProps) {
                        return self.myBotEngine.previousStep("No annotation properties found for " + vocab + ".");
                    }
                    var filtered = sourceProps
                        .filter(function (p) {
                            return p.id && p.id.startsWith(vocabNamespaceUri);
                        })
                        .map(function (p) {
                            var shortLabel = p.id.split("/").pop().split("#").pop();
                            return { id: p.id, label: vocab + ":" + shortLabel };
                        });

                    if (filtered.length === 0) {
                        return self.myBotEngine.previousStep("No annotation properties found for " + vocab + ".");
                    }
                    showPropertyChoices(filtered, vocab);
                });
            };

            CommonBotFunctions.listNonObjectPropertiesFn([vocab], null, function (err, nonObjectProperties) {
                if (err) {
                    return self.myBotEngine.abort(err.responseText || err);
                }

                if (!nonObjectProperties || nonObjectProperties.length === 0) {
                    var basicVocab = Config.basicVocabularies && Config.basicVocabularies[vocab];
                    if (basicVocab && basicVocab.graphUri) {
                        return loadFromReferenceSourceByNamespace(basicVocab.graphUri);
                    }
                    return self.myBotEngine.previousStep("No annotation properties found for " + vocab + ".");
                }

                showPropertyChoices(nonObjectProperties, vocab);
            });
        },

        /**
         * Adds the selected property into the template arrays (deduplicated).
         */
        afterChoosePropertyFn: function () {
            var vocab = self.params.selectedVocabulary;
            if (vocab === "searchProperty") {
                vocab = resolveVocabFromPropertyUri(self.params.selectedPropertyUri) || "searchProperty";
                self.params.selectedVocabulary = vocab;
            }
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
                selections: self.params.templateSelections,
            };

            // Keep referenceSource only as information (optional)
            if (self.params.referenceSource) {
                dataContent.referenceSource = self.params.referenceSource;
            }

            UserDataWidget.showSaveDialog("annotationPropertiesTemplate", dataContent, "smallDialogDiv", { title: "Save annotation properties template" }, function (err, saved) {
                if (err) {
                    return self.myBotEngine.abort(err.responseText || err);
                }

                // Keep saved template id
                self.params.savedTemplateId = saved.id;

                self.params.savedTemplateMeta = {
                    id: saved.id,
                    label: saved.data_label || "Template " + saved.id,
                    group: saved.data_group || "",
                    comment: saved.data_comment || "",
                };

                self.functions.showTemplateSummaryFn();

                // Show post-save menu: create another or finish
                self.myBotEngine.currentObj = self.workflow_afterSave;
                return self.myBotEngine.nextStep(self.workflow_afterSave);

                // });
            });

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

            html += "<div><b>Template scope:</b> Global</div>";

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

    // ---------------------------
    // Helpers
    // ---------------------------

    /**
     * Resolves the vocabulary ID from a property URI by matching against basicVocabularies
     * and Config.sources graphUris.
     * @param {string} uri - Property URI
     * @returns {string|null}
     */
    function resolveVocabFromPropertyUri(uri) {
        if (!uri) {
            return null;
        }
        for (var bvKey in Config.basicVocabularies) {
            var bv = Config.basicVocabularies[bvKey];
            if (bv.graphUri && uri.startsWith(bv.graphUri)) {
                return bvKey;
            }
        }
        for (var srcKey in Config.sources) {
            var src = Config.sources[srcKey];
            if (src.graphUri && uri.startsWith(src.graphUri)) {
                return srcKey;
            }
        }
        return null;
    }

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
    return self;
})();

export default CreateAnnotationPropertiesTemplate_bot;
window.CreateAnnotationPropertiesTemplate_bot = CreateAnnotationPropertiesTemplate_bot;
