import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import AIMappingModeler from "../aiMappingModeler/aiMappingModeler.js";
import AIMappingColumnsGraph from "../aiMappingModeler/aiMappingColumnsGraph.js";
import AIColumnClassSuggestion from "../aiMappingModeler/aiColumnClassSuggestion.js";
import AIMappingWorkflowChat from "./aiMappingWorkflowChat.js";

/**
 * AIMappingWorkflow module.
 * Opens a database of the mapping of a source and shows, step after step, as a graph, the entries the AI guessed in it, master data then important classes, with their
 * classes and possible superclasses in the upper ontologies; the left panel explains the graph and holds the decisions.
 * @module AIMappingWorkflow
 */
var AIMappingWorkflow = (function () {
    var self = {};

    self.graphDivId = "aiMappingWorkflow_graphDiv";
    // between two readings of the keys while the AI detects them and guesses the master data
    self.tableKeysPollDelay = 5000;
    self.tableKeysPollTimer = null;
    // the operation under way, told beside the message line: its last step, its start, the timer of its elapsed time
    self.progressStepText = "";
    self.progressStartTime = null;
    self.progressTimer = null;
    // "AI keys 5/6: ..." or "Events: 2/4 ...": the step reached out of the steps of the operation
    self.stepNumbersRegex = /(\d+)\/(\d+)/;
    // the trees of the graph, one per entry, in canvas pixels: one superclass slot per option, wider than the longest
    // superclass label
    self.superClassSpacing = 280;
    self.startViewScale = 0.8;
    // in ms, the time the graph takes to end the fits of its opening
    self.startViewDuration = 4000;

    self.currentSource = null;
    // { databaseId: { name, ... } }, the databases of the mapping of the source
    self.databaseSources = {};
    self.currentDatabaseId = null;
    // the AI keys of the database opened, holding the guess of each step
    self.currentAiKeys = null;
    // the guess of the step shown
    self.currentGuess = null;
    self.guessGraph = null;
    // per node of the graph, the guess entry it draws
    self.entryByNodeId = {};
    // the decisions on the entry whose card is shown: { entry, readings, readingIndex, superClassId }
    self.entryCard = null;
    // the steps of the workflow, in their order, each one reached once the one before is guessed, decided or not; the next
    // one is shown by its number only. chatStep names the guess for the change_guess tool of the chat, guessRoute the
    // route guessing it, runText what the run button tells
    self.workflowSteps = [
        { label: "Master data", guessKey: "masterDataGuess", chatStep: "masterData", entryLegend: "Master data", entryNoun: "master data", reasonLabel: "Why master data" },
        {
            label: "Important classes",
            guessKey: "importantClassesGuess",
            chatStep: "importantClasses",
            guessRoute: "importantClasses",
            runText: "The AI now guesses the important classes of the business around the master data, reads what their rows denote and classifies them: a few minutes.",
            entryLegend: "Important class",
            entryNoun: "important classes",
            reasonLabel: "Why important",
        },
        {
            label: "Associations",
            guessKey: "eventsGuess",
            chatStep: "events",
            guessRoute: "events",
            runText:
                "The AI now guesses the associations of the business joining the classes of steps 1 and 2 (orders, notifications, assignments, contracts), held by tables or implicit in columns, and classifies them: a few minutes.",
            entryLegend: "Association class",
            entryNoun: "association classes",
            reasonLabel: "Why",
        },
        {
            label: "Links",
            guessKey: "linksGuess",
            chatStep: "links",
            guessRoute: "links",
            runText: "The AI now proposes the properties of the upper ontologies for the links between the classes of steps 1 to 3, for each alternative of a class still undecided: a few minutes.",
            entryLegend: "Class",
            entryNoun: "links",
            reasonLabel: "Why",
        },
        {
            label: "Mapping",
            guessKey: "mappingGuess",
            chatStep: "mapping",
            guessRoute: "mapping",
            runText:
                "The AI now reads the columns of the table of each class of steps 1 to 3 and proposes how one row gives one instance, then what each column becomes: an existing or new property, a code list, an implicit class, an instant of an event, or nothing. About a minute per class.",
            entryLegend: "Class",
            entryNoun: "class mappings",
            reasonLabel: "Why",
        },
    ];
    // step 5: the class whose mapping is open on the card, with the instance and the options picked on it, not applied yet
    self.currentMappingCard = null;
    // how the card names each kind of mapping of prompts/mapping_guess.md
    self.mappingKindLabels = {
        existingProperty: "existing property",
        newProperty: "new property",
        subclassPerValue: "subclass per value",
        individualPerValue: "individual per value",
        implicitClass: "implicit class",
        eventInstant: "event instant",
        identifierClass: "identifier class",
        splitValue: "split value",
        unmapped: "left unmapped",
        other: "other",
    };
    self.mappingUriTypes = ["fromLabel", "blankNode", "randomIdentifier"];
    self.currentStepIndex = 0;
    // step 4: the link open on the card, and the links each edge of the links graph draws
    self.currentLinkCard = null;
    self.linksByEdgeId = {};
    self.linkNodeIdByLabel = {};
    // the arrows of the links graph with their full label, the class node each node of a tree belongs to, and the class
    // whose links are shown
    self.linkArrows = [];
    self.linkClassNodeIdByNodeId = {};
    self.highlightedLinkClassNodeId = null;
    // the links graph, in canvas pixels: the distance between two rings of class trees around the center, the trees a
    // ring holds per ring of distance, the height of a superclass above its class, and the line of a link by its key
    self.linkRingSpacing = 500;
    self.linkRingCapacityStep = 6;
    self.linkSuperClassRise = 200;
    self.linkKeyDashes = { declared: false, ai: [8, 6], row: [2, 5] };
    self.linkKeyLegendStyles = { declared: "solid", ai: "dashed", row: "dotted" };
    // an arrow joining links on several kinds of key is drawn with the first kind of this order among them
    self.linkKeyKindOrder = ["declared", "ai", "row"];
    self.linkArrowStyle = { color: "#409304", fadedColor: "#b9d6a4", decidedWidth: 3, proposedWidth: 1.5, oppositeRoundness: 0.2, labelBackground: "rgba(255,255,255,0.9)" };
    self.linkFocusAnimation = { duration: 400 };
    // a clicked class gathers the trees its links reach on a circle around it, at least this far, back to their ring after
    self.linkFocusRadius = 400;
    // in radians, canvas y downward: from upper right clockwise to upper left
    self.linkFocusFreeSector = { start: -Math.PI / 4, span: (3 * Math.PI) / 2 };
    self.linkRingPositionByNodeId = {};
    // in screen pixels, how far from the line or the label of a shown link a click still takes it
    self.linkClickTolerance = 12;
    // the associations join the other classes: they sit at the center, the master data around them, the important classes
    // outside
    self.linkRingOrder = ["eventsGuess", "masterDataGuess", "importantClassesGuess"];
    // the superclass decided for each class drawn on the links graph, by class label: the options assuming another one drop out
    self.decidedSuperClassByClass = {};

    self.onLoaded = function () {
        self.currentSource = MainController.currentSource;
        self.currentDatabaseId = null;
        self.currentGuess = null;
        UI.initMenuBar(function () {
            // the graph takes the width the tool buttons of the other tools take
            $("#rightControlPanelDiv").empty().hide();
            $("#graphDiv").html(
                "<div style='display: flex; flex-direction: column; height: 100%'><div id='aiMappingWorkflow_tabs' class='aiMappingWorkflow-tabs'></div>" +
                    "<div id='" +
                    self.graphDivId +
                    "' style='flex: 1; min-height: 0; width: 100%'></div></div>",
            );
            self.drawWorkflowTabs();
            AIMappingWorkflowChat.mount(self.getChatContext, self.replaceGuess);
            $("#lateralPanelDiv").load("./modules/tools/aiMappingWorkflow/html/aiMappingWorkflowLeftPanel.html", function () {
                $("#aiMappingWorkflow_changeDatabaseButton").on("click", self.showDatabaseList);
                $("#aiMappingWorkflow_deleteAllButton").on("click", self.deleteAllAiKeys);
                self.readMappingDatabases(function (error) {
                    if (error) {
                        return self.showExplanation("Mapping of " + self.currentSource + " not read: " + AIColumnClassSuggestion.getErrorText(error));
                    }
                    var databaseIds = Object.keys(self.databaseSources);
                    if (databaseIds.length == 0) {
                        return self.showUserDatabases();
                    }
                    if (databaseIds.length == 1) {
                        return self.openDatabase(databaseIds[0]);
                    }
                    self.showDatabaseList();
                });
            });
        });
    };

    // the entries of a guess: the master data of step 1, the important classes of step 2, the event classes of step 3
    self.getGuessEntries = function (guess) {
        var guessEntries = guess.masterData || guess.importantClasses || guess.eventClasses;
        return guessEntries;
    };

    // a step is reached once the step before it is guessed: an undecided class goes on with its alternatives
    self.isStepReached = function (stepIndex) {
        // the keys of the database are still read
        if (!self.currentAiKeys) {
            return false;
        }
        if (stepIndex == 0) {
            return true;
        }
        var isReached = Boolean(self.currentAiKeys[self.workflowSteps[stepIndex - 1].guessKey]);
        return isReached;
    };

    // a step reached is chosen by its tab, the next one is not reachable yet
    self.drawWorkflowTabs = function () {
        var tabsDiv = $("#aiMappingWorkflow_tabs");
        tabsDiv.empty();
        self.workflowSteps.forEach(function (workflowStep, stepIndex) {
            var stepTab = $("<button type='button' class='aiMappingWorkflow-tab'>").text(stepIndex + 1 + " " + workflowStep.label);
            stepTab.toggleClass("aiMappingWorkflow-selectedTab", stepIndex == self.currentStepIndex);
            if (!self.isStepReached(stepIndex)) {
                stepTab.prop("disabled", true).attr("title", "Guess step " + stepIndex + " first");
            }
            stepTab.on("click", function () {
                self.showStep(stepIndex);
            });
            tabsDiv.append(stepTab);
        });
        var nextStepTab = $("<button type='button' class='aiMappingWorkflow-tab' disabled>").text(self.workflowSteps.length + 1);
        nextStepTab.attr("title", "Next step of the workflow, not reached yet");
        tabsDiv.append(nextStepTab);
    };

    self.unload = function () {
        clearTimeout(self.tableKeysPollTimer);
        self.endProgress("");
        self.currentDatabaseId = null;
        AIMappingWorkflowChat.unmount();
    };

    // what the chat sees of the screen: the database and the card open, with the choices shown on it
    self.getChatContext = function () {
        var screen = {
            database: self.databaseSources[self.currentDatabaseId].name || self.currentDatabaseId,
            step: self.workflowSteps[self.currentStepIndex].chatStep,
            openCard: null,
        };
        var card = self.entryCard;
        if (card && $("#aiMappingWorkflow_card").children().length > 0) {
            var classification = self.getClassification(card.entry, card.readingIndex);
            var parentOptions = classification.parentOptions || [];
            var chosenParent = parentOptions.find((parentOption) => parentOption.parentId == card.superClassId);
            screen.openCard = {
                entry: card.entry.label,
                readingSelected: card.readings[card.readingIndex].label,
                superClassSelected: chosenParent ? chosenParent.parentLabel : null,
                decisionSaved: card.entry.decision || null,
            };
        }
        if (self.currentLinkCard && $("#aiMappingWorkflow_card").children().length > 0) {
            var decisionPropertyIri = self.currentLinkCard.link.decision ? self.currentLinkCard.link.decision.propertyIri : null;
            var decidedOption = self.currentLinkCard.link.propertyOptions.find((option) => option.propertyIri == decisionPropertyIri);
            screen.openCard = {
                link: self.currentLinkCard.link.fromClass + " -> " + self.currentLinkCard.link.toClass,
                propertySelected: decidedOption ? decidedOption.propertyLabel : null,
            };
        }
        if (self.currentMappingCard && $("#aiMappingWorkflow_card").children().length > 0) {
            screen.openCard = {
                classMapping: self.currentMappingCard.classMapping.classLabel,
                instancePicked: self.currentMappingCard.instance,
                optionIndexPickedByColumns: self.currentMappingCard.optionIndexByColumns,
                applied: Boolean(self.currentMappingCard.classMapping.decision),
            };
        }
        var chatContext = { source: self.currentSource, databaseId: self.currentDatabaseId, screen: screen };
        return chatContext;
    };

    // the mapping file of the AI Mapping Modeler holds its databases in options.config
    self.getMappingFileName = function () {
        var mappingFileName = "mappings_" + self.currentSource + "_ALL.json";
        return mappingFileName;
    };

    self.readMappingFile = function (callback) {
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/file",
            data: { dir: "graphs/", fileName: self.getMappingFileName() },
            dataType: "json",
            success: function (mappingText) {
                var mapping = null;
                try {
                    mapping = JSON.parse(mappingText);
                } catch (parseError) {
                    return callback(parseError.message);
                }
                callback(null, mapping);
            },
            error: function (error) {
                // a source never mapped has no file yet
                if (error.status == 404) {
                    return callback(null, null);
                }
                callback(error);
            },
        });
    };

    self.readMappingDatabases = function (callback) {
        self.readMappingFile(function (error, mapping) {
            if (error) {
                return callback(error);
            }
            var mappingConfig = mapping && mapping.options && mapping.options.config;
            self.databaseSources = (mappingConfig && mappingConfig.databaseSources) || {};
            callback();
        });
    };

    // a source never mapped, or whose mapping holds no database yet: the databases the user can read
    self.showUserDatabases = function () {
        self.showExplanation("The mapping of " + self.currentSource + " holds no database yet: choose the one the AI reads.");
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/databases",
            dataType: "json",
            success: function (result) {
                if (result.resources.length == 0) {
                    return self.showExplanation("You can read no database: add one in ConfigEditor > Databases first.");
                }
                var databaseList = $("#aiMappingWorkflow_databaseList").empty();
                result.resources.forEach(function (database) {
                    var databaseButton = $("<button class='slsv-button-3'>").text(database.name);
                    databaseButton.on("click", function () {
                        databaseList.empty();
                        self.addDatabaseToMapping(database);
                    });
                    databaseList.append(databaseButton);
                });
            },
            error: function (error) {
                self.showExplanation("Databases not read: " + AIColumnClassSuggestion.getErrorText(error));
            },
        });
    };

    // the database is written in the mapping the AI Mapping Modeler opens, where the server writes the keys the AI finds in it
    self.addDatabaseToMapping = function (database) {
        self.readMappingFile(function (error, mapping) {
            if (error) {
                return self.showExplanation("Mapping not read: " + AIColumnClassSuggestion.getErrorText(error));
            }
            var sourceConfig = Config.sources[self.currentSource];
            // the mapping the AI Mapping Modeler starts a source with
            var savedMapping = mapping || {
                nodes: [],
                edges: [],
                context: {},
                positions: {},
                options: {
                    config: {
                        sparqlServerUrl: sourceConfig.sparql_server.url,
                        graphUri: sourceConfig.baseUri || sourceConfig.graphUri,
                        prefixes: {},
                        lookups: {},
                        databaseSources: {},
                        csvSources: {},
                        isConfigInMappingGraph: true,
                    },
                },
            };
            var mappingConfig = savedMapping.options.config;
            if (!mappingConfig.databaseSources) {
                mappingConfig.databaseSources = {};
            }
            mappingConfig.databaseSources[database.id] = { name: database.name };
            $.ajax({
                type: "POST",
                url: Config.apiUrl + "/data/file",
                data: { dir: "graphs/", fileName: self.getMappingFileName(), data: JSON.stringify(savedMapping, null, 2) },
                dataType: "json",
                success: function () {
                    self.databaseSources = mappingConfig.databaseSources;
                    self.openDatabase(database.id);
                },
                error: function (saveError) {
                    self.showExplanation("Database not added to the mapping: " + AIColumnClassSuggestion.getErrorText(saveError));
                },
            });
        });
    };

    self.showDatabaseList = function () {
        var databaseList = $("#aiMappingWorkflow_databaseList");
        // a second click closes the list
        if (databaseList.children().length > 0) {
            return databaseList.empty();
        }
        Object.keys(self.databaseSources).forEach(function (databaseId) {
            var databaseButton = $("<button class='slsv-button-3'>").text(self.databaseSources[databaseId].name || databaseId);
            databaseButton.on("click", function () {
                databaseList.empty();
                self.openDatabase(databaseId);
            });
            databaseList.append(databaseButton);
        });
    };

    self.openDatabase = function (databaseId) {
        clearTimeout(self.tableKeysPollTimer);
        self.currentDatabaseId = databaseId;
        self.currentAiKeys = null;
        self.currentGuess = null;
        self.entryCard = null;
        self.currentLinkCard = null;
        self.linksByEdgeId = {};
        self.linkNodeIdByLabel = {};
        self.currentStepIndex = 0;
        self.drawWorkflowTabs();
        $("#aiMappingWorkflow_databaseName").text(self.databaseSources[databaseId].name || databaseId);
        self.endProgress("");
        $("#aiMappingWorkflow_card").empty();
        self.showExplanation("The AI reads the database: its keys, then its master data and their classes in the upper ontologies.");
        if (self.guessGraph && self.guessGraph.network) {
            self.guessGraph.network.destroy();
        }
        AIMappingWorkflowChat.hide();
        self.prepareSource(databaseId);
        self.readTableKeys(databaseId);
    };

    // the keys, the guesses with their decisions and the chat of the database go, then the AI reads it again from scratch
    self.deleteAllAiKeys = function () {
        var databaseId = self.currentDatabaseId;
        if (!databaseId) {
            return;
        }
        var databaseName = self.databaseSources[databaseId].name || databaseId;
        var confirmationText =
            "Delete everything the AI found and decided on " +
            databaseName +
            ": its keys, master data, important classes, associations, links, every decision taken and the chat?\nThe AI starts again from scratch, which takes several minutes.";
        if (!confirm(confirmationText)) {
            return;
        }
        var deleteParams = new URLSearchParams({ databaseId: databaseId, source: self.currentSource });
        $.ajax({
            type: "DELETE",
            url: Config.apiUrl + "/ai/aiMappingModeler/tableKeys?" + deleteParams.toString(),
            dataType: "json",
            success: function () {
                self.openDatabase(databaseId);
                self.showProgressStep("Everything deleted on " + databaseName + ", the AI starts again");
            },
            error: function (error) {
                MainController.errorAlert(AIColumnClassSuggestion.getErrorText(error));
            },
        });
    };

    // starts the key detection and the master data guess of a database whose mapping holds none yet, and prepares the upper
    // ontologies the guess classifies the master data in
    self.prepareSource = function (databaseId) {
        var payload = { source: self.currentSource, upperOntologies: self.getUpperOntologies(), databaseIds: [databaseId], clientSocketId: Config.clientSocketId };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/ai/aiMappingModeler/preparation",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",
            success: function (result) {
                if (result.databaseErrors[databaseId]) {
                    self.endProgress("Schema not read: " + result.databaseErrors[databaseId]);
                }
            },
            error: function (error) {
                self.endProgress("Preparation failed: " + AIColumnClassSuggestion.getErrorText(error));
            },
        });
    };

    self.readTableKeys = function (databaseId) {
        var tableKeysParams = new URLSearchParams({ databaseId: databaseId, source: self.currentSource, clientSocketId: Config.clientSocketId || "" });
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/ai/aiMappingModeler/tableKeys?" + tableKeysParams.toString(),
            dataType: "json",
            success: function (tableKeys) {
                // another database was opened meanwhile
                if (self.currentDatabaseId != databaseId) {
                    return;
                }
                if (tableKeys.aiKeysStatus == "failed") {
                    self.endProgress("");
                    return self.showExplanation("The AI found no keys in this database: " + tableKeys.aiKeysError);
                }
                var masterDataGuess = tableKeys.aiKeys ? tableKeys.aiKeys.masterDataGuess : null;
                if (tableKeys.aiKeysStatus == "done" && masterDataGuess) {
                    self.currentAiKeys = tableKeys.aiKeys;
                    return self.showStep(0);
                }
                if (tableKeys.aiKeysStatus == "done") {
                    self.endProgress("");
                    return self.showExplanation("The AI found the keys of this database but guessed no master data: open it again to retry the guess.");
                }
                // running, or not started yet while the preparation is on its way
                self.tableKeysPollTimer = setTimeout(function () {
                    self.readTableKeys(databaseId);
                }, self.tableKeysPollDelay);
            },
            error: function (error) {
                self.showExplanation("Keys of the database not read: " + AIColumnClassSuggestion.getErrorText(error));
            },
        });
    };

    // keyDetectionStep: { databaseId, message }
    self.showKeyDetectionStep = function (keyDetectionStep) {
        if (keyDetectionStep.databaseId != self.currentDatabaseId) {
            return;
        }
        self.showProgressStep(keyDetectionStep.message);
    };

    // the step drawn as the KG builder draws its triples: a bar beside the message line, full in the share of the steps
    // done when the step tells its number, running otherwise, with the elapsed time
    self.showProgressStep = function (stepText) {
        if (!self.progressStartTime) {
            self.progressStartTime = Date.now();
            self.progressTimer = setInterval(self.showProgressMessage, 1000);
        }
        self.progressStepText = stepText;
        var stepNumbers = stepText.match(self.stepNumbersRegex);
        var percent = stepNumbers ? Math.round(((stepNumbers[1] - 1) / stepNumbers[2]) * 100) : null;
        UI.showProgressBar(percent);
        self.showProgressMessage();
    };

    self.showProgressMessage = function () {
        var elapsedTime = AIMappingModeler.formatDuration(Date.now() - self.progressStartTime);
        UI.message(CommonBotFunctions.escapeHtml(self.progressStepText + ", elapsed time " + elapsedTime));
    };

    // the bar goes, the message line tells how the operation ended
    self.endProgress = function (endText) {
        clearInterval(self.progressTimer);
        self.progressTimer = null;
        self.progressStartTime = null;
        UI.hideProgressBar();
        UI.message(CommonBotFunctions.escapeHtml(endText), true);
    };

    // texts of the model or of the server, never read as html
    self.showExplanation = function (explanationText) {
        $("#aiMappingWorkflow_explanation").empty().append($("<div class='masterData-note'>").text(explanationText));
    };

    // the label of a class as the AI Mapping Modeler writes it, prefixed by the start of its source name; a class the server
    // found in none of the upper ontologies keeps its bare label
    self.getClassLabel = function (source, label) {
        var classLabel = source ? AIMappingModeler.getClassLabelInTool(source, label) : label;
        return classLabel;
    };

    // the nodes look as the mapping graph draws a column and a class
    self.getLegendItem = function (label) {
        var legendItem = AIMappingModeler.legendItemsArray.find((legendItemOfMapping) => legendItemOfMapping.label == label);
        return legendItem;
    };

    // a guess saved before the readings holds no reading: its class is the entry itself
    self.getReadings = function (guessEntry) {
        var defaultReading = { label: "", rowIs: "", inData: "", askBusiness: "", definition: guessEntry.definition, classKey: guessEntry.label };
        var readings = guessEntry.readings || [defaultReading];
        return readings;
    };

    // the local class a superclass option names, added by the chat; null for a class of the upper ontologies
    self.getLocalClass = function (parentOption) {
        var localClasses = self.currentGuess.localClasses || [];
        var localClass = localClasses.find((candidateClass) => candidateClass.label == parentOption.parentId) || null;
        return localClass;
    };

    // the classification of the reading chosen, the one the data point to most until a choice is applied
    self.getClassification = function (guessEntry, readingIndex) {
        var reading = self.getReadings(guessEntry)[readingIndex];
        var classificationByClass = self.currentGuess.classificationByClass;
        var classification = (classificationByClass && classificationByClass[reading.classKey]) || guessEntry.classification;
        if (!classification) {
            classification = { classKind: "unclassified", reason: "not classified" };
        }
        return classification;
    };

    // the guess of a step, or the button running it for a step not guessed yet
    self.showStep = function (stepIndex) {
        self.currentStepIndex = stepIndex;
        self.entryCard = null;
        self.currentLinkCard = null;
        self.currentMappingCard = null;
        $("#aiMappingWorkflow_card").empty();
        self.drawWorkflowTabs();
        var workflowStep = self.workflowSteps[stepIndex];
        var guess = self.currentAiKeys[workflowStep.guessKey];
        if (guess) {
            return self.showGuess(guess);
        }
        if (self.guessGraph && self.guessGraph.network) {
            self.guessGraph.network.destroy();
        }
        var runPanel = $("<div class='masterData-panel'>");
        runPanel.append($("<div>").text(workflowStep.runText), self.getStepRunButton("Guess the " + workflowStep.entryNoun, stepIndex));
        $("#aiMappingWorkflow_explanation").empty().append(runPanel);
    };

    // a step runs on the user's request; the steps before may still be reviewed
    self.getStepRunButton = function (buttonText, stepIndex) {
        var runButton = $("<button type='button' class='slsv-button-1'>").text(buttonText);
        runButton.on("click", function () {
            runButton.prop("disabled", true);
            self.guessStep(stepIndex);
        });
        return runButton;
    };

    self.guessStep = function (stepIndex) {
        var workflowStep = self.workflowSteps[stepIndex];
        var databaseId = self.currentDatabaseId;
        self.endProgress("");
        self.showProgressStep("Guessing the " + workflowStep.entryNoun);
        var payload = { source: self.currentSource, databaseId: databaseId, clientSocketId: Config.clientSocketId };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/ai/aiMappingWorkflow/" + workflowStep.guessRoute,
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",
            success: function (result) {
                if (self.currentDatabaseId != databaseId) {
                    return;
                }
                self.currentAiKeys[workflowStep.guessKey] = result[workflowStep.guessKey];
                self.showStep(stepIndex);
            },
            error: function (error) {
                self.endProgress("");
                self.showExplanation("The " + workflowStep.entryNoun + " are not guessed: " + AIColumnClassSuggestion.getErrorText(error));
            },
        });
    };

    // the entries of the steps before changed since this step was guessed from them: an entry added, removed or renamed,
    // or its decision changed. A guess saved before entriesGuessedFrom kept the decisions only, in decisionsByClass or
    // decisionsByMasterData
    self.isStepGuessOutdated = function (stepIndex) {
        var guess = self.currentAiKeys[self.workflowSteps[stepIndex].guessKey];
        var isLegacyGuess = !guess.entriesGuessedFrom;
        var guessedEntries = guess.entriesGuessedFrom || guess.decisionsByClass || guess.decisionsByMasterData || {};
        var currentEntries = {};
        self.workflowSteps.slice(0, stepIndex).forEach(function (previousStep) {
            var previousGuess = self.currentAiKeys[previousStep.guessKey];
            // the links guess holds no entry
            if (!previousGuess || !self.getGuessEntries(previousGuess)) {
                return;
            }
            self.getGuessEntries(previousGuess).forEach(function (guessEntry) {
                // a legacy guess kept the decided entries only
                if (isLegacyGuess && !guessEntry.decision) {
                    return;
                }
                var decision = guessEntry.decision || {};
                var currentEntry = { classLabel: self.getDecidedClassLabel(guessEntry, previousGuess), readingIndex: decision.readingIndex ?? null, superClassId: decision.superClassId ?? null };
                currentEntries[guessEntry.label] = currentEntry;
            });
        });
        var isEntryChanged = function (label) {
            var guessedEntry = guessedEntries[label];
            var currentEntry = currentEntries[label];
            if (!guessedEntry || !currentEntry) {
                return true;
            }
            var isClassRenamed = !isLegacyGuess && guessedEntry.classLabel != currentEntry.classLabel;
            var isChanged = isClassRenamed || guessedEntry.readingIndex != currentEntry.readingIndex || guessedEntry.superClassId != currentEntry.superClassId;
            return isChanged;
        };
        var labels = Object.keys(guessedEntries).concat(Object.keys(currentEntries));
        var isOutdated = labels.some(isEntryChanged);
        return isOutdated;
    };

    // guess: { masterData | importantClasses | eventClasses: [{ label, definition, reason, readings, decision, evidence }], classificationByClass }
    self.showGuess = function (guess) {
        var workflowStep = self.workflowSteps[self.currentStepIndex];
        self.currentGuess = guess;
        // a guess drawn at the end of an operation, not on a change of step
        if (self.progressStartTime) {
            var totalDuration = AIMappingModeler.formatDuration(Date.now() - self.progressStartTime);
            self.endProgress(workflowStep.label + " guessed in " + totalDuration);
        }
        var explanation = $("<div class='masterData-panel'>");
        if (self.currentStepIndex > 0 && self.isStepGuessOutdated(self.currentStepIndex)) {
            explanation.append(
                $("<div class='masterData-note'>").text("Decisions of the steps before changed since these " + workflowStep.entryNoun + " were guessed."),
                self.getStepRunButton("Guess them again, their decisions are lost", self.currentStepIndex),
            );
        }
        if (workflowStep.guessKey == "linksGuess") {
            return self.showLinksExplanation(explanation);
        }
        if (workflowStep.guessKey == "mappingGuess") {
            return self.showMappingExplanation(explanation);
        }
        explanation.append(
            $("<div>").append($("<b>").text("Domain: "), $("<span>").text(self.currentAiKeys.masterDataGuess.domain)),
            $("<div>").text("The AI guessed " + self.getGuessEntries(guess).length + " " + workflowStep.entryNoun + " in this database. Each tree of the graph is one of them:"),
            $("<div class='masterData-legendLine'>").append(
                $("<span class='masterData-column'>").css("background", self.getLegendItem("Column").color).text(workflowStep.entryLegend),
                $("<span>").text("its tables in the database, at the bottom"),
            ),
            $("<div class='masterData-legendLine'>").append($("<span class='masterData-class'>").text("Class"), $("<span>").text("its class, a thick frame when an upper ontology already has it")),
            $("<div class='masterData-legendLine'>").append($("<span class='masterData-dashed'>"), $("<span>").text("a possible superclass, with its probability")),
            $("<div>").text(
                "Click an entry or its class to decide what its rows denote and its superclass, now or later: an undecided class goes on to the next steps with its alternatives. Right click it to choose another class, rename it or remove it.",
            ),
        );
        $("#aiMappingWorkflow_explanation").empty().append(explanation);
        self.drawGuessGraph();
        AIMappingWorkflowChat.show();
    };

    // the explanation panel of the links step: the classes of steps 1 to 3 with their superclasses, the links between them
    self.showLinksExplanation = function (explanation) {
        // the line of a link by the key it rests on, as drawLinksGraph draws it
        var getKeyLegendLine = function (keyKind, text) {
            var keyLine = $("<span class='masterData-dashed'>").css({ borderTopColor: self.linkArrowStyle.color, borderTopStyle: self.linkKeyLegendStyles[keyKind] });
            var legendLine = $("<div class='masterData-legendLine'>").append(keyLine, $("<span>").text(text));
            return legendLine;
        };
        explanation.append(
            $("<div>").append($("<b>").text("Domain: "), $("<span>").text(self.currentAiKeys.masterDataGuess.domain)),
            $("<div>").text(
                "The graph holds the classes of steps 1 to 3, each under its superclass or the superclasses it may still take: the associations at the center, the master data around them, the important classes outside. One arrow joins two classes, whatever the number of their links. Click a class to see it alone with its links, labelled with the best property proposed and the number of links, and the classes they reach; click outside to see them all again. A link proposed for a superclass of an undecided class starts from or ends on that superclass.",
            ),
            $("<div class='masterData-legendLine'>").append($("<span class='masterData-class'>").text("Class"), $("<span>").text("a thick frame for an association, a dashed one while its class is undecided")),
            getKeyLegendLine("declared", "a link on a foreign key declared in the database, thick once the properties of its links are chosen"),
            getKeyLegendLine("ai", "a link on a foreign key the AI found in the data, not declared"),
            getKeyLegendLine("row", "a link inside one row: two classes of a table, or an implicit association and its row"),
            $("<div>").text(
                "An arrow joining links on several keys takes the line of the first of this list. Click a link: its card shows its keys, the properties of the upper ontologies proposed, and for a class still undecided what each of its superclasses gives. Right click it to choose another property or to remove it.",
            ),
        );
        var classesWithoutTables = (self.currentAiKeys.eventsGuess || {}).classesWithoutTables || [];
        if (classesWithoutTables.length > 0) {
            explanation.append($("<div class='masterData-note'>").text("No table of the database was found for " + classesWithoutTables.join(", ") + ": no link reaches them."));
        }
        $("#aiMappingWorkflow_explanation").empty().append(explanation);
        self.drawGuessGraph();
        AIMappingWorkflowChat.show();
    };

    // the data mapped on the class, its tables or the columns of an implicit event, the main one first as the model names
    // them; a guess saved without tables takes those step 3 found for its class, else the entry label
    self.getEntryDataNames = function (guessEntry) {
        var stepThreeTables = ((self.currentAiKeys.eventsGuess || {}).classTables || {})[self.getDecidedClassLabel(guessEntry, self.currentGuess)];
        var dataNames = [guessEntry.tables, guessEntry.columns, stepThreeTables].find((names) => names && names.length > 0);
        return dataNames || [guessEntry.label];
    };

    // drawn as the mapping graph draws a mapped column: the entry at the bottom, its class above it, and for a new class
    // its possible superclasses above the class, dashed until one is applied, one tree per entry
    self.drawGuessGraph = function () {
        if (self.workflowSteps[self.currentStepIndex].guessKey == "linksGuess") {
            return self.drawLinksGraph();
        }
        if (self.workflowSteps[self.currentStepIndex].guessKey == "mappingGuess") {
            return self.drawMappingGraph();
        }
        var classLegendItem = self.getLegendItem("Class");
        var columnLegendItem = self.getLegendItem("Column");
        // an element: vis.js would read a title string as html
        var getTooltip = function (lines) {
            var tooltip = $("<div style='max-width: 400px; white-space: normal'>");
            lines.forEach(function (line) {
                tooltip.append($("<div>").text(line));
            });
            return tooltip[0];
        };
        var nodes = [];
        var edges = [];
        // the left edge of the next tree
        var treeX = 0;
        self.entryByNodeId = {};
        self.getGuessEntries(self.currentGuess).forEach(function (guessEntry) {
            var decision = guessEntry.decision || { readingIndex: 0, superClassId: null };
            var classification = self.getClassification(guessEntry, decision.readingIndex);
            var isImportedClass = classification.classKind == "existingClass";
            var isUnclassified = classification.classKind == "unclassified";
            var parentOptions = classification.classKind == "newClass" ? classification.parentOptions : [];
            // an applied superclass leaves the other options out
            if (decision.superClassId) {
                parentOptions = parentOptions.filter((parentOption) => parentOption.parentId == decision.superClassId);
            }
            // the tree is centered in its own slots, so that its options never reach into the tree before it
            var treeWidth = Math.max(1, parentOptions.length) * self.superClassSpacing;
            var treeCenterX = treeX + treeWidth / 2;
            treeX += treeWidth;
            var entryNodeId = "entry|" + guessEntry.label;
            self.entryByNodeId[entryNodeId] = guessEntry;
            var entryDataNames = self.getEntryDataNames(guessEntry);
            nodes.push({
                id: entryNodeId,
                label: entryDataNames[0],
                shape: columnLegendItem.shape,
                color: columnLegendItem.color,
                x: treeCenterX,
                y: 200,
                // an entry the model could not classify is no class yet
                shapeProperties: { borderDashes: isUnclassified ? [4, 4] : false },
                data: { id: entryNodeId, label: guessEntry.label, type: "Column" },
                title: getTooltip([guessEntry.label, guessEntry.definition, guessEntry.reason, "Data: " + entryDataNames.join(", ")]),
            });
            if (isUnclassified) {
                return;
            }
            var classLabel = isImportedClass
                ? self.getClassLabel(classification.classSource, classification.classLabel)
                : self.getClassLabel(self.currentSource, classification.classLabel || guessEntry.label);
            var classNodeId = entryNodeId + "|class";
            self.entryByNodeId[classNodeId] = guessEntry;
            nodes.push({
                id: classNodeId,
                label: classLabel,
                shape: classLegendItem.shape,
                color: classLegendItem.color,
                x: treeCenterX,
                y: 0,
                borderWidth: isImportedClass ? 3 : 1,
                data: { id: isImportedClass ? classification.classId : classNodeId, label: classLabel, type: "Class" },
            });
            edges.push(AIMappingColumnsGraph.getClassEdge(entryNodeId, classNodeId, "", "rdf:type"));
            // one superclass node per tree: two trees sharing it would cross their edges
            parentOptions.forEach(function (parentOption, parentIndex) {
                var parentNodeId = classNodeId + "|" + parentOption.parentId;
                var parentLabel = self.getClassLabel(parentOption.parentSource, parentOption.parentLabel);
                var parentX = treeCenterX + (parentIndex - (parentOptions.length - 1) / 2) * self.superClassSpacing;
                nodes.push({
                    id: parentNodeId,
                    label: parentLabel,
                    shape: classLegendItem.shape,
                    color: classLegendItem.color,
                    x: parentX,
                    y: -200,
                    data: { id: parentOption.parentId, label: parentLabel, type: "Class" },
                });
                var isApplied = decision.superClassId == parentOption.parentId;
                var optionEdge = AIMappingColumnsGraph.getClassEdge(classNodeId, parentNodeId, isApplied ? "" : parentOption.probability + "%", "rdfs:subClassOf");
                optionEdge.dashes = !isApplied;
                optionEdge.title = getTooltip([parentOption.definition, parentOption.impact]);
                edges.push(optionEdge);
                // a local class shows its own superclass above it
                var localClass = self.getLocalClass(parentOption);
                if (!localClass) {
                    return;
                }
                var localSuperClassNodeId = parentNodeId + "|" + localClass.superClassId;
                var localSuperClassLabel = self.getClassLabel(localClass.superClassSource, localClass.superClassLabel);
                nodes.push({
                    id: localSuperClassNodeId,
                    label: localSuperClassLabel,
                    shape: classLegendItem.shape,
                    color: classLegendItem.color,
                    x: parentX,
                    y: -400,
                    data: { id: localClass.superClassId, label: localSuperClassLabel, type: "Class" },
                });
                edges.push(AIMappingColumnsGraph.getClassEdge(parentNodeId, localSuperClassNodeId, "", "rdfs:subClassOf"));
            });
        });

        if (self.guessGraph && self.guessGraph.network) {
            self.guessGraph.network.destroy();
        }
        var graphOptions = {
            visjsOptions: { physics: { enabled: false }, edges: { smooth: true }, interaction: { hover: true } },
            onclickFn: self.showEntryCard,
            onRightClickFn: self.showGraphPopupMenu,
        };
        var guessGraph = new VisjsGraphClass(self.graphDivId, { nodes: nodes, edges: edges }, graphOptions);
        self.guessGraph = guessGraph;
        guessGraph.draw(function () {
            // the network fits its whole extent several times after its opening, too far out to read: the view is set on the
            // first trees, at a readable scale, again after each of those fits for a moment, then it belongs to the user
            var startViewTime = Date.now();
            var setStartView = function () {
                if (self.guessGraph != guessGraph || Date.now() - startViewTime > self.startViewDuration) {
                    return;
                }
                var graphWidth = $("#" + self.graphDivId).width();
                guessGraph.network.moveTo({ position: { x: graphWidth / 2 / self.startViewScale, y: 0 }, scale: self.startViewScale });
                guessGraph.network.once("afterDrawing", setStartView);
            };
            setStartView();
        });
    };

    // the classification decided for one entry of steps 1 to 3, read in its own guess: the links graph shows the guess of step 4
    self.getDecidedClassification = function (guessEntry, guess) {
        var decision = guessEntry.decision || { readingIndex: 0 };
        var reading = guessEntry.readings ? guessEntry.readings[decision.readingIndex] : null;
        // a guess saved before the readings: its class is the entry itself, as the server reads it
        if (!reading) {
            return {};
        }
        var classification = (guess.classificationByClass && guess.classificationByClass[reading.classKey]) || guessEntry.classification || {};
        return classification;
    };

    // the label the links of the server name the class of an entry by: its class, or the entry itself while unclassified
    self.getDecidedClassLabel = function (guessEntry, guess) {
        var classification = self.getDecidedClassification(guessEntry, guess);
        var isClassNamed = classification.classKind == "newClass" || classification.classKind == "existingClass";
        var classLabel = isClassNamed ? classification.classLabel : guessEntry.label;
        return classLabel;
    };

    // drawn as the class steps draw an entry: one tree per class of steps 1 to 3, keyed by the class label the links of the
    // server name, its superclass above it, or each superclass it may still take with its %, on rings around the center
    // (placeLinkClasses). The links between two nodes are one arrow, shown with its label when its class is clicked
    // (highlightLinkClass); one proposed under an assumed superclass starts from or ends on that superclass. Its line tells its key
    self.drawLinksGraph = function () {
        var classLegendItem = self.getLegendItem("Class");
        var linkClasses = [];
        self.linkNodeIdByLabel = {};
        self.linksByEdgeId = {};
        self.entryByNodeId = {};
        self.decidedSuperClassByClass = {};
        ["masterDataGuess", "importantClassesGuess", "eventsGuess"].forEach(function (guessKey) {
            var stepGuess = self.currentAiKeys[guessKey];
            if (!stepGuess) {
                return;
            }
            self.getGuessEntries(stepGuess).forEach(function (guessEntry) {
                var classification = self.getDecidedClassification(guessEntry, stepGuess);
                var classLabel = self.getDecidedClassLabel(guessEntry, stepGuess);
                // several entries may be taken as the same class: one tree
                if (self.linkNodeIdByLabel[classLabel]) {
                    return;
                }
                self.linkNodeIdByLabel[classLabel] = "class|" + classLabel;
                var parentOptions = classification.parentOptions || [];
                var decidedParent = guessEntry.decision ? parentOptions.find((parentOption) => parentOption.parentId == guessEntry.decision.superClassId) : null;
                if (decidedParent) {
                    self.decidedSuperClassByClass[classLabel] = decidedParent.parentLabel;
                }
                linkClasses.push({
                    label: classLabel,
                    nodeLabel: self.getClassLabel(classification.classKind == "existingClass" ? classification.classSource : self.currentSource, classLabel),
                    isEvent: guessKey == "eventsGuess",
                    ringRank: self.linkRingOrder.indexOf(guessKey),
                    // an entry left open until the links is undecided
                    isDecided: Boolean(guessEntry.decision) && !guessEntry.decision.isLeftToLinks,
                    superClassOptions: decidedParent ? [decidedParent] : parentOptions,
                    isSuperClassDecided: Boolean(decidedParent),
                    definition: guessEntry.definition,
                });
            });
        });
        var links = (self.currentGuess.links || []).filter((link) => self.linkNodeIdByLabel[link.fromClass] && self.linkNodeIdByLabel[link.toClass]);
        var positionByClass = self.placeLinkClasses(linkClasses, links);

        var nodes = [];
        var edges = [];
        var superClassNodeIdByAssumption = {};
        self.linkClassNodeIdByNodeId = {};
        linkClasses.forEach(function (linkClass) {
            var classNodeId = self.linkNodeIdByLabel[linkClass.label];
            self.linkClassNodeIdByNodeId[classNodeId] = classNodeId;
            var classPosition = positionByClass[linkClass.label];
            nodes.push({
                id: classNodeId,
                label: linkClass.nodeLabel,
                shape: classLegendItem.shape,
                color: classLegendItem.color,
                x: classPosition.x,
                y: classPosition.y,
                borderWidth: linkClass.isEvent ? 3 : 1,
                shapeProperties: { borderDashes: linkClass.isDecided ? false : [4, 4] },
                data: { id: classNodeId, label: linkClass.nodeLabel, type: "Class" },
                title: linkClass.definition,
            });
            linkClass.superClassOptions.forEach(function (parentOption, parentIndex) {
                var superClassNodeId = classNodeId + "|" + parentOption.parentId;
                superClassNodeIdByAssumption[linkClass.label + "|" + parentOption.parentLabel] = superClassNodeId;
                self.linkClassNodeIdByNodeId[superClassNodeId] = classNodeId;
                var superClassLabel = self.getClassLabel(parentOption.parentSource, parentOption.parentLabel);
                nodes.push({
                    id: superClassNodeId,
                    label: superClassLabel,
                    shape: classLegendItem.shape,
                    color: classLegendItem.color,
                    x: classPosition.x + (parentIndex - (linkClass.superClassOptions.length - 1) / 2) * self.superClassSpacing,
                    y: classPosition.y - self.linkSuperClassRise,
                    data: { id: parentOption.parentId, label: superClassLabel, type: "Class" },
                });
                var superClassEdge = AIMappingColumnsGraph.getClassEdge(classNodeId, superClassNodeId, linkClass.isSuperClassDecided ? "" : parentOption.probability + "%", "rdfs:subClassOf");
                superClassEdge.dashes = !linkClass.isSuperClassDecided;
                // a curved edge bends around a support point the focus of a class does not move
                superClassEdge.smooth = false;
                edges.push(superClassEdge);
            });
        });

        self.linkRingPositionByNodeId = {};
        nodes.forEach((node) => (self.linkRingPositionByNodeId[node.id] = { x: node.x, y: node.y }));

        // the links between the same two nodes make one arrow, labelled with its best option and the number of its links
        var getEndNodeId = function (classLabel, assumption) {
            var superClassNodeId = assumption && assumption.class == classLabel ? superClassNodeIdByAssumption[classLabel + "|" + assumption.superClass] : null;
            var endNodeId = superClassNodeId || self.linkNodeIdByLabel[classLabel];
            return endNodeId;
        };
        var linkArrowById = {};
        var addToArrow = function (link, fromNodeId, toNodeId, option, isDecided) {
            var arrowId = fromNodeId + ">" + toNodeId;
            if (!linkArrowById[arrowId]) {
                linkArrowById[arrowId] = { id: arrowId, from: fromNodeId, to: toNodeId, keyKinds: [], decidedOption: null, bestOption: null, isEveryLinkDecided: true };
                self.linksByEdgeId[arrowId] = [];
            }
            var linkArrow = linkArrowById[arrowId];
            if (self.linksByEdgeId[arrowId].indexOf(link) < 0) {
                self.linksByEdgeId[arrowId].push(link);
                linkArrow.keyKinds.push(self.getLinkKeyKind(link));
            }
            if (!isDecided) {
                linkArrow.isEveryLinkDecided = false;
            }
            if (option && isDecided) {
                linkArrow.decidedOption = option;
            }
            if (option && !isDecided && (!linkArrow.bestOption || option.probability > linkArrow.bestOption.probability)) {
                linkArrow.bestOption = option;
            }
        };
        links.forEach(function (link) {
            var decidedOption = link.decision ? (link.propertyOptions || []).find((option) => option.propertyIri == link.decision.propertyIri) : null;
            var drawnOptions = decidedOption ? [decidedOption] : self.getVisibleLinkOptions(link);
            if (drawnOptions.length == 0) {
                addToArrow(link, getEndNodeId(link.fromClass, null), getEndNodeId(link.toClass, null), null, false);
            }
            drawnOptions.forEach(function (option) {
                addToArrow(link, getEndNodeId(link.fromClass, option.assumes), getEndNodeId(link.toClass, option.assumes), option, Boolean(decidedOption));
            });
        });
        self.linkArrows = Object.values(linkArrowById);
        self.linkArrows.forEach(function (linkArrow) {
            var arrowLinkCount = self.linksByEdgeId[linkArrow.id].length;
            var labelOption = linkArrow.decidedOption || linkArrow.bestOption;
            var probabilityText = labelOption && !linkArrow.decidedOption ? " " + labelOption.probability + "%" : "";
            var propertyText = labelOption ? labelOption.propertyLabel + (labelOption.inverse ? " (inverse)" : "") + probabilityText : "no proposal";
            linkArrow.label = propertyText + (arrowLinkCount > 1 ? ", " + arrowLinkCount + " links" : "");
            var keyKind = self.linkKeyKindOrder.find((orderedKeyKind) => linkArrow.keyKinds.indexOf(orderedKeyKind) > -1);
            edges.push({
                id: linkArrow.id,
                from: linkArrow.from,
                to: linkArrow.to,
                label: "",
                dashes: self.linkKeyDashes[keyKind],
                width: linkArrow.isEveryLinkDecided ? self.linkArrowStyle.decidedWidth : self.linkArrowStyle.proposedWidth,
                color: self.linkArrowStyle.fadedColor,
                arrows: { to: { enabled: true, type: "arrow" } },
                // two opposite arrows bend apart
                smooth: linkArrowById[linkArrow.to + ">" + linkArrow.from] ? { type: "curvedCW", roundness: self.linkArrowStyle.oppositeRoundness } : false,
                font: { color: self.linkArrowStyle.color, background: self.linkArrowStyle.labelBackground },
                data: { id: linkArrow.id },
            });
        });
        if (self.guessGraph && self.guessGraph.network) {
            self.guessGraph.network.destroy();
        }
        var graphOptions = {
            visjsOptions: { physics: { enabled: false }, interaction: { hover: true } },
            onclickFn: self.showLinksCard,
            onRightClickFn: self.showGraphPopupMenu,
        };
        var guessGraph = new VisjsGraphClass(self.graphDivId, { nodes: nodes, edges: edges }, graphOptions);
        self.guessGraph = guessGraph;
        guessGraph.draw(function () {
            if (self.guessGraph != guessGraph) {
                return;
            }
            // a redraw after a choice keeps the links of the class shown
            var classNodeId = self.linkClassNodeIdByNodeId[self.highlightedLinkClassNodeId] || null;
            self.highlightLinkClass(classNodeId);
        });
    };

    // the center of each class tree, by class label: the most linked association at the center, then rings outward, a new
    // ring for each kind of linkRingOrder; each class at the mean angle of its neighbours placed on the rings before, the
    // ring spread evenly in that order
    self.placeLinkClasses = function (linkClasses, links) {
        var neighboursByClass = {};
        linkClasses.forEach((linkClass) => (neighboursByClass[linkClass.label] = []));
        links.forEach(function (link) {
            if (link.fromClass == link.toClass) {
                return;
            }
            // a shared key gives several links between the same two classes: one neighbour
            if (neighboursByClass[link.fromClass].indexOf(link.toClass) > -1) {
                return;
            }
            neighboursByClass[link.fromClass].push(link.toClass);
            neighboursByClass[link.toClass].push(link.fromClass);
        });
        var ringRankByClass = {};
        linkClasses.forEach((linkClass) => (ringRankByClass[linkClass.label] = linkClass.ringRank));
        var classesInRingOrder = Object.keys(neighboursByClass);
        classesInRingOrder.sort(
            (classA, classB) => ringRankByClass[classA] - ringRankByClass[classB] || neighboursByClass[classB].length - neighboursByClass[classA].length || classA.localeCompare(classB),
        );
        // a ring closes when full or when the kind changes
        var classRings = [];
        classesInRingOrder.forEach(function (classLabel) {
            var lastRing = classRings[classRings.length - 1];
            var ringCapacity = Math.max(1, (classRings.length - 1) * self.linkRingCapacityStep);
            var isNewRing = !lastRing || lastRing.length >= ringCapacity || ringRankByClass[lastRing[0]] != ringRankByClass[classLabel];
            if (isNewRing) {
                classRings.push([classLabel]);
                return;
            }
            lastRing.push(classLabel);
        });
        var angleByClass = {};
        var positionByClass = {};
        classRings.forEach(function (ringClasses, ringIndex) {
            var ringRadius = ringIndex * self.linkRingSpacing;
            var preferredAngleByClass = {};
            ringClasses.forEach(function (classLabel, classIndex) {
                var placedNeighbours = neighboursByClass[classLabel].filter((neighbour) => angleByClass[neighbour] != null);
                var neighbourAngles = placedNeighbours.map((neighbour) => angleByClass[neighbour]);
                var sumX = neighbourAngles.reduce((sum, angle) => sum + Math.cos(angle), 0);
                var sumY = neighbourAngles.reduce((sum, angle) => sum + Math.sin(angle), 0);
                preferredAngleByClass[classLabel] = neighbourAngles.length > 0 ? Math.atan2(sumY, sumX) : (2 * Math.PI * classIndex) / ringClasses.length;
            });
            ringClasses.sort((classA, classB) => preferredAngleByClass[classA] - preferredAngleByClass[classB]);
            ringClasses.forEach(function (classLabel, classIndex) {
                var angle = preferredAngleByClass[ringClasses[0]] + (2 * Math.PI * classIndex) / ringClasses.length;
                // the center holds no angle: its neighbours on the first ring keep their own order
                if (ringRadius > 0) {
                    angleByClass[classLabel] = angle;
                }
                positionByClass[classLabel] = { x: ringRadius * Math.cos(angle), y: ringRadius * Math.sin(angle) };
            });
        });
        return positionByClass;
    };

    // one class alone with its arrows, labelled, and the trees of the classes they reach, zoomed on; no class shows every
    // arrow faded and unlabelled
    self.highlightLinkClass = function (classNodeId) {
        self.highlightedLinkClassNodeId = classNodeId;
        var shownClassNodeIds = classNodeId ? [classNodeId] : null;
        var arrowUpdates = self.linkArrows.map(function (linkArrow) {
            var fromClassNodeId = self.linkClassNodeIdByNodeId[linkArrow.from];
            var toClassNodeId = self.linkClassNodeIdByNodeId[linkArrow.to];
            var isOfClass = Boolean(classNodeId) && (fromClassNodeId == classNodeId || toClassNodeId == classNodeId);
            if (isOfClass) {
                shownClassNodeIds.push(fromClassNodeId, toClassNodeId);
            }
            var arrowUpdate = {
                id: linkArrow.id,
                hidden: Boolean(classNodeId) && !isOfClass,
                label: isOfClass ? linkArrow.label : "",
                color: isOfClass ? self.linkArrowStyle.color : self.linkArrowStyle.fadedColor,
            };
            return arrowUpdate;
        });
        // the trees reached, by their angle on the rings, spread evenly on the circle of the class
        var classCenter = classNodeId ? self.linkRingPositionByNodeId[classNodeId] : null;
        var reachedClassNodeIds = shownClassNodeIds ? shownClassNodeIds.filter((shownClassNodeId, shownIndex) => shownClassNodeId != classNodeId && shownClassNodeIds.indexOf(shownClassNodeId) == shownIndex) : [];
        var getRingAngle = function (reachedClassNodeId) {
            var ringPosition = self.linkRingPositionByNodeId[reachedClassNodeId];
            var ringAngle = Math.atan2(ringPosition.y - classCenter.y, ringPosition.x - classCenter.x);
            return ringAngle;
        };
        reachedClassNodeIds.sort((classNodeIdA, classNodeIdB) => getRingAngle(classNodeIdA) - getRingAngle(classNodeIdB));
        // a circle long enough for the trees side by side, one superClassSpacing each
        var focusRadius = Math.max(self.linkFocusRadius, (reachedClassNodeIds.length * self.superClassSpacing) / Math.PI);
        var treeShiftByClassNodeId = {};
        reachedClassNodeIds.forEach(function (reachedClassNodeId, reachedIndex) {
            var ringPosition = self.linkRingPositionByNodeId[reachedClassNodeId];
            // the sector above the class is left to its superclasses
            var angle = self.linkFocusFreeSector.start + (self.linkFocusFreeSector.span * (reachedIndex + 0.5)) / reachedClassNodeIds.length;
            treeShiftByClassNodeId[reachedClassNodeId] = {
                x: classCenter.x + focusRadius * Math.cos(angle) - ringPosition.x,
                y: classCenter.y + focusRadius * Math.sin(angle) - ringPosition.y,
            };
        });
        var treeNodeIds = Object.keys(self.linkClassNodeIdByNodeId);
        var shownNodeIds = shownClassNodeIds ? treeNodeIds.filter((treeNodeId) => shownClassNodeIds.indexOf(self.linkClassNodeIdByNodeId[treeNodeId]) > -1) : treeNodeIds;
        var nodeUpdates = treeNodeIds.map(function (treeNodeId) {
            var ringPosition = self.linkRingPositionByNodeId[treeNodeId];
            var treeShift = treeShiftByClassNodeId[self.linkClassNodeIdByNodeId[treeNodeId]] || { x: 0, y: 0 };
            var nodeUpdate = { id: treeNodeId, hidden: shownNodeIds.indexOf(treeNodeId) < 0, x: ringPosition.x + treeShift.x, y: ringPosition.y + treeShift.y };
            return nodeUpdate;
        });
        // vis draws the edges of a hidden node: the superclass edges of the trees left out are hidden as well
        var graphEdges = self.guessGraph.data.edges.get();
        var superClassEdges = graphEdges.filter((edge) => !self.linksByEdgeId[edge.id]);
        var superClassEdgeUpdates = superClassEdges.map((edge) => ({ id: edge.id, hidden: shownNodeIds.indexOf(edge.from) < 0 }));
        self.guessGraph.data.nodes.update(nodeUpdates);
        self.guessGraph.data.edges.update(arrowUpdates.concat(superClassEdgeUpdates));
        self.guessGraph.network.fit({ nodes: shownNodeIds, animation: self.linkFocusAnimation });
        // a node left selected is deselected by the next click, and VisjsGraphClass then clears the whole selection: the
        // link clicked would read as a click outside
        self.guessGraph.network.unselectAll();
    };

    // the options of a link still possible: an option assuming a superclass the user did not decide for its class drops out
    self.getVisibleLinkOptions = function (link) {
        var visibleOptions = (link.propertyOptions || []).filter(function (option) {
            var decidedSuperClass = option.assumes ? self.decidedSuperClassByClass[option.assumes.class] : null;
            var isPossible = !decidedSuperClass || decidedSuperClass == option.assumes.superClass;
            return isPossible;
        });
        return visibleOptions;
    };

    // the key a link rests on: a foreign key declared in the database, one the AI found in the data, or the row holding both
    // classes, an implicit event in its columns included
    self.getLinkKeyKind = function (link) {
        if (!link.foreignKey) {
            return "row";
        }
        var keyKind = link.foreignKey.foundInData ? "ai" : "declared";
        return keyKind;
    };

    self.getAssumptionText = function (option) {
        var assumptionText = option.assumes ? "if " + option.assumes.class + " is a " + option.assumes.superClass + ": " : "";
        return assumptionText;
    };

    // what carries a link in the database: a foreign key, the row holding both classes, or the columns of the row carrying
    // an implicit association
    self.getLinkEvidenceText = function (link) {
        if (link.sameRowTable) {
            return "both in one row of " + link.sameRowTable;
        }
        if (link.rowColumns) {
            return "columns " + link.rowColumns.join(", ") + " of the row of " + link.toClass;
        }
        var foreignKey = link.foreignKey;
        var columnMatches = foreignKey.columns.map((column, columnIndex) => foreignKey.table + "." + column + " matches " + foreignKey.referencedTable + "." + foreignKey.referencedColumns[columnIndex]);
        var evidenceText = columnMatches.join(", ") + (foreignKey.foundInData ? " (found in the data)" : " (declared foreign key)");
        return evidenceText;
    };

    // the link read as a sentence, with its chosen property or the most likely one
    self.getLinkSentence = function (link) {
        var visibleOptions = self.getVisibleLinkOptions(link);
        var decidedOption = link.decision ? visibleOptions.find((option) => option.propertyIri == link.decision.propertyIri) : null;
        var sentenceOption = decidedOption || visibleOptions[0];
        if (!sentenceOption) {
            return link.fromClass + " -> " + link.toClass + ": no property proposed";
        }
        var linkSentence = self.getAssumptionText(sentenceOption) + link.fromClass + " " + sentenceOption.propertyLabel + (sentenceOption.inverse ? " (inverse)" : "") + " " + link.toClass;
        return linkSentence;
    };

    // how many objects of each class the other holds, read both ways
    self.getLinkCardinalityText = function (link) {
        var cardinalityParts = [];
        if (link.cardinality) {
            cardinalityParts.push(link.cardinality + " " + link.toClass + " per " + link.fromClass);
        }
        if (link.inverseCardinality) {
            cardinalityParts.push(link.inverseCardinality + " " + link.fromClass + " per " + link.toClass);
        }
        var cardinalityText = cardinalityParts.join(", ");
        return cardinalityText;
    };

    // the named fields of a card, the empty ones left out; texts of the model or of the server, never read as html
    self.getFieldsTable = function (fields) {
        var fieldsTable = $("<table class='masterData-fields'>");
        fields.forEach(function ([fieldName, fieldValue]) {
            if (!fieldValue) {
                return;
            }
            fieldsTable.append($("<tr>").append($("<td class='masterData-fieldName'>").text(fieldName), $("<td>").text(fieldValue)));
        });
        return fieldsTable;
    };

    // a class shows its links, a click outside them all; a link opens the card of its property, the first of the
    // links its arrow draws; a class is decided in its own step
    self.showLinksCard = function (nodeOrEdge, clickPoint) {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        // vis takes a link only within a few pixels of its line, never on its label
        var clickedNodeOrEdgeId = nodeOrEdge ? nodeOrEdge.id : self.getShownLinkArrowAt(clickPoint);
        if (!clickedNodeOrEdgeId) {
            self.highlightLinkClass(null);
            return;
        }
        var clickedClassNodeId = self.linkClassNodeIdByNodeId[clickedNodeOrEdgeId];
        // a superclass node is a proposal of its class, not the class
        if (clickedClassNodeId && clickedClassNodeId != clickedNodeOrEdgeId) {
            return;
        }
        if (clickedClassNodeId) {
            self.highlightLinkClass(clickedClassNodeId);
            return;
        }
        var edgeLinks = self.linksByEdgeId[clickedNodeOrEdgeId];
        if (!edgeLinks) {
            return;
        }
        self.entryCard = null;
        self.currentLinkCard = { link: edgeLinks[0], edgeLinks: edgeLinks };
        self.renderLinkCard();
    };

    // the labelled arrow of the class shown closest to a click, on its label or near its line; none outside a focus
    self.getShownLinkArrowAt = function (clickPoint) {
        if (!self.highlightedLinkClassNodeId || !clickPoint) {
            return null;
        }
        var network = self.guessGraph.network;
        var canvasPoint = network.DOMtoCanvas(clickPoint);
        var canvasTolerance = self.linkClickTolerance / network.getScale();
        var closestArrowId = null;
        var closestDistance = canvasTolerance;
        self.linkArrows.forEach(function (linkArrow) {
            var arrowEdge = network.body.edges[linkArrow.id];
            if (!arrowEdge || arrowEdge.options.hidden || !arrowEdge.connected) {
                return;
            }
            var labelBox = arrowEdge.labelModule.size;
            var isOnLabel =
                canvasPoint.x >= labelBox.left - canvasTolerance &&
                canvasPoint.x <= labelBox.left + labelBox.width + canvasTolerance &&
                canvasPoint.y >= labelBox.top - canvasTolerance &&
                canvasPoint.y <= labelBox.top + labelBox.height + canvasTolerance;
            var lineDistance = arrowEdge.edgeType.getDistanceToEdge(arrowEdge.from.x, arrowEdge.from.y, arrowEdge.to.x, arrowEdge.to.y, canvasPoint.x, canvasPoint.y);
            var arrowDistance = isOnLabel ? 0 : lineDistance;
            if (arrowDistance < closestDistance) {
                closestDistance = arrowDistance;
                closestArrowId = linkArrow.id;
            }
        });
        return closestArrowId;
    };

    // the card of one link: the link as a sentence, its cardinality both ways, what carries it in the database, and the
    // property options of the upper ontologies, under each superclass of a class still undecided
    self.renderLinkCard = function () {
        var link = self.currentLinkCard.link;
        var cardDiv = $("#aiMappingWorkflow_card");
        cardDiv.empty();
        var headerPanel = $("<div class='masterData-panel'>");
        headerPanel.append(
            $("<div class='masterData-optionTitle'>").text(self.getLinkSentence(link)),
            self.getFieldsTable([
                ["How many", self.getLinkCardinalityText(link) || null],
                ["Participation in", link.viaEvent || null],
            ]),
        );
        // an arrow drawing several links, one per key: each has its own card
        var edgeLinks = self.currentLinkCard.edgeLinks || [link];
        var keysDiv = $("<div class='masterData-stepContent'>").append($("<div class='masterData-step'>").text("Where it comes from:"));
        if (edgeLinks.length == 1) {
            keysDiv.append($("<div>").text(self.getLinkEvidenceText(link)));
        } else {
            edgeLinks.forEach(function (edgeLink) {
                var keyButton = $("<button type='button' class='masterData-option'>").toggleClass("masterData-selected", edgeLink == link).text(self.getLinkEvidenceText(edgeLink));
                keyButton.on("click", function () {
                    self.currentLinkCard = { link: edgeLink, edgeLinks: edgeLinks };
                    self.renderLinkCard();
                });
                keysDiv.append(keyButton);
            });
        }
        headerPanel.append(keysDiv);
        cardDiv.append(headerPanel);
        var optionsDiv = $("<div class='masterData-stepContent'>");
        optionsDiv.append($("<div class='masterData-step'>").text("Property of the upper ontologies:"));
        var visibleOptions = self.getVisibleLinkOptions(link);
        visibleOptions.forEach(function (option) {
            var isSelected = Boolean(link.decision) && option.propertyIri == link.decision.propertyIri;
            var probabilityFill = $("<div class='masterData-probabilityFill'>").css("width", option.probability + "%");
            var probability = $("<div class='masterData-probability'>").append(
                $("<div class='masterData-probabilityBar'>").append(probabilityFill),
                $("<span>").text(option.probability + "%"),
            );
            var optionTitle = self.getAssumptionText(option) + self.getClassLabel(option.propertySource, option.propertyLabel) + (option.inverse ? " (inverse)" : "");
            var optionButton = $("<button type='button' class='masterData-option'>").toggleClass("masterData-selected", isSelected);
            optionButton.append(
                $("<div class='masterData-optionTitle'>").append($("<span>").text(optionTitle), probability),
                self.getFieldsTable([
                    ["Reason", option.reason],
                    ["Definition", option.definition],
                ]),
            );
            optionButton.on("click", function () {
                link.decision = { propertyIri: option.propertyIri };
                self.applyLinkDecision(link, { propertyIri: option.propertyIri });
            });
            optionsDiv.append(optionButton);
        });
        if (visibleOptions.length == 0) {
            optionsDiv.append($("<div class='masterData-note'>").text("No property of the upper ontologies was proposed: right click the link to choose one, or ask the chat."));
        }
        cardDiv.append(optionsDiv);
        var footer = $("<div class='masterData-footer'>");
        var decidedOption = link.decision ? visibleOptions.find((option) => option.propertyIri == link.decision.propertyIri) : null;
        var writtenText = decidedOption ? link.fromClass + " " + decidedOption.propertyLabel + (decidedOption.inverse ? " (inverse)" : "") + " " + link.toClass : "nothing chosen yet";
        var undoButton = $("<button type='button' class='masterData-applyButton'>").text("Undo the choice");
        undoButton.prop("disabled", !link.decision);
        undoButton.on("click", function () {
            self.changeGuessByHand("undo_link_decision", { link: link.id });
        });
        footer.append($("<div>").append($("<span class='masterData-writtenLabel'>").text("Will be written: "), $("<span>").text(writtenText)), undoButton);
        cardDiv.append(footer);
    };

    // the decision of a link goes in the keys of the database in the mapping, read again right before the write so
    // that nothing the server wrote meanwhile is lost, like applyDecision does
    self.applyLinkDecision = function (link, decision) {
        var databaseId = self.currentDatabaseId;
        self.readMappingFile(function (error, mapping) {
            if (error) {
                return MainController.errorAlert(error);
            }
            var databaseSource = mapping.options.config.databaseSources[databaseId];
            var savedLinksGuess = databaseSource && databaseSource.aiKeys ? databaseSource.aiKeys.linksGuess : null;
            var savedLink = savedLinksGuess && (savedLinksGuess.links || []).find((savedLinkOfLinks) => savedLinkOfLinks.id == link.id);
            if (!savedLink) {
                return MainController.errorAlert("The links guess of " + databaseId + " is no longer in the mapping: open the database again.");
            }
            savedLink.decision = decision;
            if (!savedLinksGuess.changeLog) {
                savedLinksGuess.changeLog = [];
            }
            savedLinksGuess.changeLog.push({
                change: "apply_link_decision",
                entry: savedLink.id,
                summary: "decided on the card",
                userRequest: null,
                rationale: null,
                queries: [],
                at: new Date().toISOString(),
            });
            $.ajax({
                type: "POST",
                url: Config.apiUrl + "/data/file",
                data: { dir: "graphs/", fileName: self.getMappingFileName(), data: JSON.stringify(mapping, null, 2) },
                dataType: "json",
                success: function () {
                    link.decision = decision;
                    self.currentAiKeys.linksGuess = savedLinksGuess;
                    self.drawLinksGraph();
                    // the arrow is drawn again from the saved links: the card takes them, the keys of the arrow with it
                    var arrowLinks = Object.values(self.linksByEdgeId).find((edgeLinks) => edgeLinks.indexOf(savedLink) > -1);
                    self.currentLinkCard = { link: savedLink, edgeLinks: arrowLinks };
                    self.renderLinkCard();
                    self.drawWorkflowTabs();
                    UI.message(CommonBotFunctions.escapeHtml("Choice saved for the link"));
                },
                error: function (saveError) {
                    MainController.errorAlert(saveError);
                },
            });
        });
    };

    self.showMappingExplanation = function (explanation) {
        var mappingGuess = self.currentGuess;
        explanation.append(
            $("<div>").append($("<b>").text("Domain: "), $("<span>").text(self.currentAiKeys.masterDataGuess.domain)),
            $("<div>").text(
                "Each class of steps 1 to 3 gets its mapping: how one row of its table gives one instance, then what each column becomes, with what the data shows of the column, measured in the database. Click a class to check its mapping, change what you disagree with, then apply.",
            ),
            $("<div class='masterData-legendLine'>").append($("<span class='masterData-class'>").text("Class"), $("<span>").text("a thick frame once its mapping is applied, a dashed one before")),
        );
        if (mappingGuess.classesWithoutTables.length > 0) {
            explanation.append($("<div class='masterData-note'>").text("No table of the database was found for " + mappingGuess.classesWithoutTables.join(", ") + ": they have no mapping."));
        }
        $("#aiMappingWorkflow_explanation").empty().append(explanation);
        self.drawGuessGraph();
        AIMappingWorkflowChat.show();
    };

    // the classes mapped, joined as the links of step 4 join them
    self.drawMappingGraph = function () {
        var classLegendItem = self.getLegendItem("Class");
        var nodes = [];
        var edges = [];
        var nodeIdByClassLabel = {};
        self.currentGuess.classMappings.forEach(function (classMapping) {
            var nodeId = "mapping|" + classMapping.classLabel;
            nodeIdByClassLabel[classMapping.classLabel] = nodeId;
            var chosenCount = classMapping.columnMappings.filter((columnMapping) => columnMapping.decision).length;
            var countText = classMapping.isImplicit ? "one per row of " + classMapping.table : chosenCount + "/" + classMapping.columnMappings.length + " columns chosen";
            nodes.push({
                id: nodeId,
                label: self.getClassLabel(self.currentSource, classMapping.classLabel) + "\n" + countText,
                shape: classLegendItem.shape,
                color: classLegendItem.color,
                borderWidth: classMapping.decision ? 3 : 1,
                shapeProperties: { borderDashes: classMapping.decision ? false : [4, 4] },
                data: { id: nodeId, label: classMapping.classLabel, type: "Class" },
            });
        });
        var drawnPairs = {};
        ((self.currentAiKeys.linksGuess || {}).links || []).forEach(function (link) {
            var fromNodeId = nodeIdByClassLabel[link.fromClass];
            var toNodeId = nodeIdByClassLabel[link.toClass];
            var sortedPair = [link.fromClass, link.toClass].sort();
            var pairKey = sortedPair.join("|");
            if (!fromNodeId || !toNodeId || fromNodeId == toNodeId || drawnPairs[pairKey]) {
                return;
            }
            drawnPairs[pairKey] = true;
            edges.push({ id: "mapping|" + pairKey, from: fromNodeId, to: toNodeId, color: self.linkArrowStyle.fadedColor });
        });
        if (self.guessGraph && self.guessGraph.network) {
            self.guessGraph.network.destroy();
        }
        var graphOptions = {
            visjsOptions: { physics: { enabled: true }, interaction: { hover: true } },
            onclickFn: self.showMappingCard,
        };
        var guessGraph = new VisjsGraphClass(self.graphDivId, { nodes: nodes, edges: edges }, graphOptions);
        self.guessGraph = guessGraph;
        guessGraph.draw();
    };

    self.showMappingCard = function (node) {
        if (!node || !node.data || node.data.type != "Class") {
            return;
        }
        var classMapping = self.currentGuess.classMappings.find((candidateMapping) => candidateMapping.classLabel == node.data.label);
        self.currentMappingCard = self.getMappingCardState(classMapping);
        self.renderMappingCard();
    };

    // what the card shows picked: the applied mapping, else the proposal of the AI, its first option per column
    self.getMappingCardState = function (classMapping) {
        // a class the model failed on has no instance yet
        var emptyInstance = { identifierColumns: [], uriType: "fromLabel", prefixURI: "", labelColumn: null, reason: "" };
        var appliedInstance = classMapping.decision ? classMapping.decision.instance : classMapping.instance || emptyInstance;
        var optionIndexByColumns = {};
        classMapping.columnMappings.forEach(function (columnMapping) {
            optionIndexByColumns[columnMapping.columns.join(", ")] = columnMapping.decision ? columnMapping.decision.optionIndex : 0;
        });
        var cardState = { classMapping: classMapping, instance: JSON.parse(JSON.stringify(appliedInstance)), optionIndexByColumns: optionIndexByColumns };
        return cardState;
    };

    // what the data shows of a column, as the server measured it
    self.getColumnEvidenceText = function (evidence) {
        if (!evidence) {
            return "";
        }
        var frequentTexts = evidence.frequentValues.map((frequentValue) => frequentValue.value + " (" + frequentValue.rowCount + ")");
        var shownSampleValues = evidence.sampleValues.slice(0, 3);
        var evidenceText =
            evidence.type +
            ", " +
            evidence.filledCount +
            " of " +
            evidence.rowCount +
            " rows filled, " +
            evidence.distinctCount +
            " distinct" +
            (frequentTexts.length > 0 ? "; most frequent " + frequentTexts.join(", ") : "") +
            (shownSampleValues.length > 0 ? "; e.g. " + shownSampleValues.join(" | ") : "");
        return evidenceText;
    };

    // a select of the columns of the table, none included for an optional field
    self.getColumnSelect = function (tableColumns, selectedColumn, hasNoneOption) {
        var columnSelect = $("<select>");
        if (hasNoneOption) {
            columnSelect.append($("<option>").val("").text("none"));
        }
        tableColumns.forEach(function (tableColumn) {
            columnSelect.append($("<option>").val(tableColumn).text(tableColumn));
        });
        columnSelect.val(selectedColumn || "");
        return columnSelect;
    };

    // the card of one class: 1 how one row gives one instance, 2 what each column becomes, the columns left out folded
    self.renderMappingCard = function () {
        var cardState = self.currentMappingCard;
        var classMapping = cardState.classMapping;
        var cardDiv = $("#aiMappingWorkflow_card");
        cardDiv.empty();
        var headerPanel = $("<div class='masterData-panel'>");
        headerPanel.append(
            $("<div class='masterData-optionTitle'>").text(self.getClassLabel(self.currentSource, classMapping.classLabel)),
            $("<div>").text("Read in the table " + classMapping.table + (classMapping.otherTables.length > 0 ? ", also in " + classMapping.otherTables.join(", ") : "")),
        );
        if (classMapping.error) {
            headerPanel.append($("<div class='masterData-note'>").text("The model gave no mapping for this class: " + classMapping.error));
        }
        var applyButton = $("<button type='button' class='masterData-applyButton'>").text("Apply");
        applyButton.on("click", function () {
            var columnChoices = Object.entries(cardState.optionIndexByColumns).map(([columnsKey, optionIndex]) => ({ columns: columnsKey, optionIndex: optionIndex }));
            self.changeGuessByHand("apply_class_mapping", { classLabel: classMapping.classLabel, instance: cardState.instance, columnChoices: columnChoices });
        });
        var undoButton = $("<button type='button' class='masterData-applyButton'>").text("Undo the choice");
        undoButton.prop("disabled", !classMapping.decision);
        undoButton.on("click", function () {
            self.changeGuessByHand("undo_class_mapping", { classLabel: classMapping.classLabel });
        });
        var writtenText = classMapping.decision ? "applied, " + classMapping.columnMappings.length + " columns chosen" : "nothing applied yet";
        var footer = $("<div class='masterData-footer'>");
        footer.append($("<div>").append($("<span class='masterData-writtenLabel'>").text("Mapping"), $("<span>").text(writtenText)), $("<div class='masterData-footerButtons'>").append(undoButton, applyButton));
        cardDiv.append(headerPanel, self.getMappingInstanceDiv(cardState), self.getMappingColumnsDiv(cardState), footer);
    };

    // the identifier, the URI and the label of the instance, each changeable before Apply, with what the data shows of
    // the column chosen
    self.getMappingInstanceDiv = function (cardState) {
        var classMapping = cardState.classMapping;
        var instance = cardState.instance;
        var instanceDiv = $("<div class='masterData-stepContent'>").append(
            $("<div class='masterData-step'>").append($("<span class='masterData-stepNumber'>").text("1"), $("<span>").text("How one instance is built")),
        );
        if (classMapping.isImplicit) {
            instanceDiv.append($("<div>").text(instance.reason));
            return instanceDiv;
        }
        var evidenceByColumn = {};
        classMapping.columnMappings.forEach(function (columnMapping) {
            columnMapping.evidences.forEach((evidence) => (evidenceByColumn[evidence.column] = evidence));
        });
        classMapping.unmappedColumns.forEach((unmappedColumn) => (evidenceByColumn[unmappedColumn.column] = unmappedColumn.evidence));
        var tableColumns = Object.keys(evidenceByColumn);
        var identifierText = instance.identifierColumns.join(", ");
        var identifierSelect = self.getColumnSelect(tableColumns, identifierText, true);
        // a composite identifier stays as the AI or the applied mapping gave it
        if (instance.identifierColumns.length > 1) {
            identifierSelect.append($("<option>").val(identifierText).text(identifierText));
            identifierSelect.val(identifierText);
        }
        identifierSelect.on("change", function () {
            var selectedIdentifier = identifierSelect.val();
            instance.identifierColumns = selectedIdentifier ? selectedIdentifier.split(", ") : [];
        });
        var uriTypeSelect = $("<select>");
        self.mappingUriTypes.forEach((uriType) => uriTypeSelect.append($("<option>").val(uriType).text(uriType)));
        uriTypeSelect.val(instance.uriType).on("change", function () {
            instance.uriType = uriTypeSelect.val();
        });
        var prefixInput = $("<input type='text' size='16'>").val(instance.prefixURI);
        prefixInput.on("change", function () {
            instance.prefixURI = prefixInput.val().trim();
        });
        var labelSelect = self.getColumnSelect(tableColumns, instance.labelColumn, true);
        labelSelect.on("change", function () {
            instance.labelColumn = labelSelect.val() || null;
        });
        var instanceTable = $("<table class='masterData-fields'>");
        [
            ["Identified by", identifierSelect, self.getColumnEvidenceText(evidenceByColumn[instance.identifierColumns[0]])],
            ["URI", $("<span>").append(uriTypeSelect, " prefix ", prefixInput), ""],
            ["Label", labelSelect, self.getColumnEvidenceText(evidenceByColumn[instance.labelColumn])],
        ].forEach(function ([fieldName, fieldControl, evidenceText]) {
            var valueCell = $("<td>").append(fieldControl);
            if (evidenceText) {
                valueCell.append($("<div class='masterData-evidenceText'>").text(evidenceText));
            }
            instanceTable.append($("<tr>").append($("<td class='masterData-fieldName'>").text(fieldName), valueCell));
        });
        instanceDiv.append(instanceTable, $("<div>").text(instance.reason || ""));
        return instanceDiv;
    };

    // one block per column entry, its options picked by a click, then the columns left out folded with their reason
    self.getMappingColumnsDiv = function (cardState) {
        var classMapping = cardState.classMapping;
        var columnsDiv = $("<div class='masterData-stepContent'>").append(
            $("<div class='masterData-step'>").append($("<span class='masterData-stepNumber'>").text("2"), $("<span>").text("What each column becomes")),
        );
        var columnLegendColor = self.getLegendItem("Column").color;
        classMapping.columnMappings.forEach(function (columnMapping) {
            var columnsKey = columnMapping.columns.join(", ");
            var columnBlock = $("<div class='masterData-panel'>");
            columnBlock.append($("<div>").append($("<span class='masterData-column'>").css("background", columnLegendColor).text(columnsKey)));
            columnMapping.options.forEach(function (option, optionIndex) {
                var isSelected = cardState.optionIndexByColumns[columnsKey] == optionIndex;
                var probabilityFill = $("<div class='masterData-probabilityFill'>").css("width", option.probability + "%");
                var probability = $("<div class='masterData-probability'>").append($("<div class='masterData-probabilityBar'>").append(probabilityFill), $("<span>").text(option.probability + "%"));
                var propertyText = { existingProperty: self.getClassLabel(option.propertySource, option.propertyLabel), newProperty: option.newPropertyName }[option.kind];
                var onClassText = option.onClass != classMapping.classLabel ? ", on " + option.onClass : "";
                var optionTitle = (propertyText || self.mappingKindLabels[option.kind]) + onClassText;
                var optionButton = $("<button type='button' class='masterData-option'>").toggleClass("masterData-selected", isSelected);
                optionButton.append(
                    $("<div class='masterData-optionTitle'>").append(
                        $("<span class='masterData-radio'>"),
                        $("<span>").text(optionTitle),
                        $("<span class='masterData-badge'>").text(self.mappingKindLabels[option.kind]),
                        probability,
                    ),
                    self.getFieldsTable([
                        ["Range", option.range ? option.range + (option.dateFormat ? ", read as " + option.dateFormat : "") : null],
                        ["Gives", option.detail],
                    ]),
                );
                if (option.problem) {
                    optionButton.append($("<div class='masterData-note'>").text(option.problem));
                }
                optionButton.on("click", function () {
                    cardState.optionIndexByColumns[columnsKey] = optionIndex;
                    self.renderMappingCard();
                });
                columnBlock.append(optionButton);
            });
            var evidenceTexts = columnMapping.evidences.map((evidence) => evidence.column + ": " + self.getColumnEvidenceText(evidence));
            columnBlock.append($("<div class='masterData-evidenceText'>").text(evidenceTexts.join("\n")), $("<div>").text(columnMapping.reason));
            columnsDiv.append(columnBlock);
        });
        if (classMapping.unmappedColumns.length > 0) {
            var unmappedDetails = $("<details>").append($("<summary>").text(classMapping.unmappedColumns.length + " columns left unmapped"));
            classMapping.unmappedColumns.forEach(function (unmappedColumn) {
                unmappedDetails.append(
                    $("<div>").append(
                        $("<span class='masterData-column'>").css("background", columnLegendColor).text(unmappedColumn.column),
                        $("<span>").text(" " + unmappedColumn.reason),
                        $("<div class='masterData-evidenceText'>").text(self.getColumnEvidenceText(unmappedColumn.evidence)),
                    ),
                );
            });
            columnsDiv.append(unmappedDetails);
        }
        return columnsDiv;
    };

    // the guess of a step the chat changed on the user's request: the graph of the step shown is drawn again, and the card
    // open shows the change
    self.replaceGuess = function (guessKey, guess) {
        self.currentAiKeys[guessKey] = guess;
        self.drawWorkflowTabs();
        var changedStepIndex = self.workflowSteps.findIndex((workflowStep) => workflowStep.guessKey == guessKey);
        // a change of an earlier step may make the step shown outdated, or no longer reached
        if (changedStepIndex < self.currentStepIndex) {
            return self.showStep(self.isStepReached(self.currentStepIndex) ? self.currentStepIndex : 0);
        }
        if (changedStepIndex > self.currentStepIndex) {
            return;
        }
        self.currentGuess = guess;
        self.drawGuessGraph();
        if ($("#aiMappingWorkflow_card").children().length == 0) {
            return;
        }
        if (self.currentMappingCard) {
            var savedClassMapping = guess.classMappings.find((classMapping) => classMapping.classLabel == self.currentMappingCard.classMapping.classLabel);
            if (!savedClassMapping) {
                return $("#aiMappingWorkflow_card").empty();
            }
            self.currentMappingCard = self.getMappingCardState(savedClassMapping);
            return self.renderMappingCard();
        }
        if (self.currentLinkCard) {
            var savedLink = (guess.links || []).find((candidateLink) => candidateLink.id == self.currentLinkCard.link.id);
            if (!savedLink) {
                return $("#aiMappingWorkflow_card").empty();
            }
            var arrowLinks = Object.values(self.linksByEdgeId).find((edgeLinks) => edgeLinks.indexOf(savedLink) > -1);
            self.currentLinkCard = { link: savedLink, edgeLinks: arrowLinks };
            return self.renderLinkCard();
        }
        var card = self.entryCard;
        if (!card) {
            return;
        }
        var changedEntry = self.getGuessEntries(guess).find((guessEntry) => guessEntry.label == card.entry.label);
        if (!changedEntry) {
            return $("#aiMappingWorkflow_card").empty();
        }
        // an undecided card keeps the superclass picked on it, not applied yet; an undone decision opens the options again
        var pickedSuperClassId = card.entry.decision ? null : card.superClassId;
        var decision = changedEntry.decision || { readingIndex: card.readingIndex, superClassId: pickedSuperClassId };
        self.entryCard = { entry: changedEntry, readings: self.getReadings(changedEntry), readingIndex: decision.readingIndex, superClassId: decision.superClassId };
        self.renderEntryCard();
    };

    self.showEntryCard = function (node) {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        var guessEntry = node && self.entryByNodeId[node.id];
        // a superclass, an edge or the blank canvas
        if (!guessEntry) {
            return;
        }
        var decision = guessEntry.decision || { readingIndex: 0, superClassId: null };
        self.currentLinkCard = null;
        self.entryCard = { entry: guessEntry, readings: self.getReadings(guessEntry), readingIndex: decision.readingIndex, superClassId: decision.superClassId };
        self.renderEntryCard();
    };

    // the card of one entry: what one of its rows denotes, laid out from the data its evidence query read, then the
    // superclass of its class under the reading chosen
    self.renderEntryCard = function () {
        var card = self.entryCard;
        var entry = card.entry;
        var getStepTitle = function (stepNumber, title) {
            var stepTitle = $("<div class='masterData-step'>").append($("<span class='masterData-stepNumber'>").text(stepNumber), $("<span>").text(title));
            return stepTitle;
        };
        var getOptionButton = function (isSelected, titleElements, fields, onPick) {
            var optionButton = $("<button type='button' class='masterData-option'>").toggleClass("masterData-selected", isSelected);
            optionButton.append($("<div class='masterData-optionTitle'>").append($("<span class='masterData-radio'>"), titleElements), self.getFieldsTable(fields));
            optionButton.on("click", onPick);
            return optionButton;
        };
        var cardDiv = $("#aiMappingWorkflow_card");
        cardDiv.empty();
        var classification = self.getClassification(entry, card.readingIndex);
        var localClassLabel = (classification.classKind == "newClass" && classification.classLabel) || entry.label;
        var classLabel = self.getClassLabel(self.currentSource, localClassLabel);
        var headerPanel = $("<div class='masterData-panel'>");
        headerPanel.append(
            $("<span class='masterData-class'>").text(classLabel),
            self.getFieldsTable([
                ["Definition", entry.definition],
                [self.workflowSteps[self.currentStepIndex].reasonLabel, entry.reason],
                ["About", entry.aboutMasterData],
                ["Joins", (entry.joins || []).join(", ")],
                ["Tables", (entry.tables || []).join(", ")],
                ["Implicit in", (entry.columns || []).join(", ")],
                ["Claimed by other associations too", (entry.contestedTables || []).join(", ")],
                ["Data", entry.hasNoData ? "no table or column of the database carries it: it takes part in no link" : null],
            ]),
        );
        cardDiv.append(headerPanel);

        var stepNumber = 1;
        var evidence = entry.evidence;
        var evidenceDiv = null;
        if (evidence && evidence.rows) {
            var evidenceTable = $("<table class='masterData-evidenceTable'>");
            var headerCells = evidence.columns.map((column) => $("<th>").text(column));
            evidenceTable.append($("<tr>").append(headerCells));
            evidence.rows.forEach(function (evidenceRow) {
                var valueCells = evidenceRow.map((value) => $("<td>").text(value));
                evidenceTable.append($("<tr>").append(valueCells));
            });
            evidenceDiv = $("<div>").append($("<div>").text(evidence.purpose), $("<div class='masterData-evidence'>").append(evidenceTable));
        }
        // a guess saved before the readings shared the class of the entry: each reading has its own class, picked first
        var readingClassKeys = new Set(card.readings.map((reading) => reading.classKey));
        var isReadingPickedFirst = readingClassKeys.size > 1;
        if (card.readings.length > 1 && !isReadingPickedFirst) {
            var rowsDiv = $("<div class='masterData-stepContent'>");
            rowsDiv.append($("<div class='masterData-step'>").text("What one row of " + entry.label + " may denote"), evidenceDiv);
            card.readings.forEach(function (reading) {
                rowsDiv.append(
                    $("<div class='masterData-panel'>").append(
                        $("<b>").text(reading.label),
                        self.getFieldsTable([
                            ["A row is", reading.rowIs],
                            ["In the data", reading.inData],
                            ["Ask the business", reading.askBusiness],
                        ]),
                    ),
                );
            });
            rowsDiv.append($("<div class='masterData-note'>").text("The superclass chosen below settles what a row denotes."));
            cardDiv.append(rowsDiv);
        }
        if (isReadingPickedFirst) {
            var readingsDiv = $("<div class='masterData-stepContent'>");
            readingsDiv.append(getStepTitle(stepNumber, "What does one row of " + entry.label + " denote?"));
            stepNumber++;
            readingsDiv.append(evidenceDiv);
            readingsDiv.append($("<div class='masterData-note'>").text("The data cannot settle it: ask the business, the answer decides the superclass below."));
            card.readings.forEach(function (reading, readingIndex) {
                var titleElements = [$("<span>").text(reading.label)];
                // the first reading is the one the data point to most
                if (readingIndex == 0) {
                    titleElements.push($("<span class='masterData-badge'>").text("Data point here"));
                }
                var pickReading = function () {
                    card.readingIndex = readingIndex;
                    card.superClassId = null;
                    self.renderEntryCard();
                };
                var readingFields = [
                    ["A row is", reading.rowIs],
                    ["In the data", reading.inData],
                    ["Ask the business", reading.askBusiness],
                    ["Class definition", reading.definition],
                ];
                readingsDiv.append(getOptionButton(readingIndex == card.readingIndex, titleElements, readingFields, pickReading));
            });
            cardDiv.append(readingsDiv);
        }

        var superClassDiv = $("<div class='masterData-stepContent'>");
        superClassDiv.append(getStepTitle(stepNumber, "Choose the superclass of " + classLabel));
        var writtenText = "nothing chosen yet";
        var isChoiceOpen = classification.classKind == "newClass";
        if (classification.classKind == "existingClass") {
            var importedLabel = self.getClassLabel(classification.classSource, classification.classLabel);
            superClassDiv.append($("<div class='masterData-note'>").text(importedLabel + " already denotes it: taken as it is, no new class and no superclass."));
            writtenText = classLabel + " is " + importedLabel;
        } else if (!isChoiceOpen) {
            superClassDiv.append($("<div class='masterData-note'>").text("Not classified: " + classification.reason));
        } else {
            classification.parentOptions.forEach(function (parentOption) {
                var parentLabel = self.getClassLabel(parentOption.parentSource, parentOption.parentLabel);
                var isSelected = card.superClassId == parentOption.parentId;
                if (isSelected) {
                    writtenText = classLabel + " subClassOf " + parentLabel;
                }
                var probabilityFill = $("<div class='masterData-probabilityFill'>").css("width", parentOption.probability + "%");
                var probability = $("<div class='masterData-probability'>").append(
                    $("<div class='masterData-probabilityBar'>").append(probabilityFill),
                    $("<span>").text(parentOption.probability + "%"),
                );
                var pickSuperClass = function () {
                    card.superClassId = parentOption.parentId;
                    self.renderEntryCard();
                };
                var localClass = self.getLocalClass(parentOption);
                var superClassFields = [
                    ["Definition", parentOption.definition],
                    ["Impact", parentOption.impact],
                    ["Rests on", parentOption.readings ? parentOption.readings.join(", ") : null],
                    ["Local class under", localClass ? localClass.superClassLabel : null],
                ];
                superClassDiv.append(getOptionButton(isSelected, [$("<span class='masterData-class'>").text(parentLabel), probability], superClassFields, pickSuperClass));
            });
        }
        cardDiv.append(superClassDiv);

        var split = classification.split;
        if (split && !entry.decision) {
            var splitParentLabel = self.getClassLabel(split.parentOption.parentSource, split.parentOption.parentLabel);
            var splitButton = $("<button type='button' class='masterData-applyButton'>").text("Split into two classes");
            splitButton.on("click", function () {
                self.changeGuessByHand("split_entry", { entry: entry.label });
            });
            cardDiv.append(
                $("<div class='masterData-stepContent'>").append(
                    $("<div class='masterData-step'>").text("Two meanings at once?"),
                    self.getFieldsTable([
                        ["Second class", split.newLabel + " subClassOf " + splitParentLabel + ", same rows and identifier"],
                        ["Why", split.reason],
                        ["Definition", split.definition],
                    ]),
                    splitButton,
                ),
            );
        }

        var applyButton = $("<button type='button' class='masterData-applyButton'>").text("Apply");
        applyButton.prop("disabled", isChoiceOpen && !card.superClassId);
        applyButton.on("click", function () {
            self.applyDecision(entry, { readingIndex: card.readingIndex, superClassId: card.superClassId });
        });
        // nothing written yet: every superclass goes on to the links, which settle it
        var leaveOpenButton = $("<button type='button' class='masterData-applyButton'>").text("Leave open until the links");
        leaveOpenButton.prop("disabled", !isChoiceOpen || Boolean(entry.decision));
        leaveOpenButton.on("click", function () {
            self.applyDecision(entry, { readingIndex: card.readingIndex, superClassId: null, isLeftToLinks: true });
        });
        if (entry.decision && entry.decision.isLeftToLinks) {
            writtenText = "nothing yet, the links settle the superclass";
        }
        // back to the options of the AI, the upper class taken as the class included
        var isClassReplaced = card.readings.some((reading) => reading.replacedClassification);
        // on a class born of a split, the undo gives the split back to the class it came from
        var undoButton = $("<button type='button' class='masterData-applyButton'>").text(entry.splitFrom ? "Undo the split" : "Undo the choice");
        undoButton.prop("disabled", !entry.decision && !isClassReplaced && !entry.splitFrom);
        undoButton.on("click", function () {
            self.changeGuessByHand("undo_decision", { entry: entry.label });
        });
        var footer = $("<div class='masterData-footer'>");
        footer.append($("<div>").append($("<span class='masterData-writtenLabel'>").text("Will be written"), $("<span>").text(writtenText)), $("<div class='masterData-footerButtons'>").append(undoButton, leaveOpenButton, applyButton));
        cardDiv.append(footer);
    };

    // a change of the change_guess tool of the chat, made by the user from the graph or a card; the guess comes back as
    // saved and is drawn as a change of the chat is
    self.changeGuessByHand = function (change, changeInput, callback) {
        var databaseId = self.currentDatabaseId;
        changeInput.step = self.workflowSteps[self.currentStepIndex].chatStep;
        var payload = { source: self.currentSource, databaseId: databaseId, change: change, changeInput: changeInput };
        // the server rewrites the whole guess: a second click would race the first; the card drawn again frees them
        var cardButtons = $("#aiMappingWorkflow_card button");
        cardButtons.prop("disabled", true);
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/ai/aiMappingWorkflow/guessChange",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",
            success: function (result) {
                if (self.currentDatabaseId != databaseId) {
                    return;
                }
                self.replaceGuess(result.guessKey, result.guess);
                UI.message(CommonBotFunctions.escapeHtml(result.summary));
                if (callback) {
                    callback();
                }
            },
            error: function (error) {
                cardButtons.prop("disabled", false);
                MainController.errorAlert(AIColumnClassSuggestion.getErrorText(error));
            },
        });
    };

    // the right click on an entry of the graph, or on a link of step 4: the changes the user makes by hand
    self.showGraphPopupMenu = function (nodeOrEdge, point, event) {
        self.popupMenuEntry = nodeOrEdge ? self.entryByNodeId[nodeOrEdge.id] || null : null;
        // on an arrow drawing several links, the one open on the card, else the first
        var edgeLinks = nodeOrEdge ? self.linksByEdgeId[nodeOrEdge.id] || [] : [];
        var cardLink = self.currentLinkCard ? self.currentLinkCard.link : null;
        self.popupMenuLink = edgeLinks.indexOf(cardLink) > -1 ? cardLink : edgeLinks[0] || null;
        var html = "";
        if (self.popupMenuEntry) {
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showClassChoiceDialog()">Choose the class</span>';
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.renameEntry()">Rename</span>';
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.removeEntry()">Remove</span>';
        } else if (self.popupMenuLink) {
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showPropertyChoiceDialog()">Choose the property</span>';
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.removeLink()">Remove</span>';
        } else {
            return;
        }
        $("#popupMenuWidgetDiv").html(html);
        point.x = event.x;
        point.y = event.y;
        PopupMenuWidget.showPopup(point, "popupMenuWidgetDiv");
    };

    // the reading a change acts on: the one picked on the card of the entry, else the one decided, else the first
    self.getEntryReadingIndex = function (guessEntry) {
        var isCardOfEntry = Boolean(self.entryCard) && self.entryCard.entry.label == guessEntry.label;
        var decidedReadingIndex = guessEntry.decision ? guessEntry.decision.readingIndex : 0;
        var readingIndex = isCardOfEntry ? self.entryCard.readingIndex : decidedReadingIndex;
        return readingIndex;
    };

    self.renameEntry = function () {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        var guessEntry = self.popupMenuEntry;
        var readingIndex = self.getEntryReadingIndex(guessEntry);
        var classification = self.getClassification(guessEntry, readingIndex);
        var newLabel = prompt("New name of " + guessEntry.label, classification.classLabel || guessEntry.label);
        if (!newLabel) {
            return;
        }
        var reading = self.getReadings(guessEntry)[readingIndex];
        self.changeGuessByHand("update_class", { entry: guessEntry.label, reading: reading.label, newLabel: newLabel });
    };

    self.removeEntry = function () {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        var guessEntry = self.popupMenuEntry;
        if (!confirm("Remove " + guessEntry.label + " from the guess?")) {
            return;
        }
        self.changeGuessByHand("remove_entry", { entry: guessEntry.label });
    };

    self.removeLink = function () {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        var link = self.popupMenuLink;
        if (!confirm("Remove the link " + link.fromClass + " -> " + link.toClass + " from the guess?")) {
            return;
        }
        self.changeGuessByHand("remove_link", { link: link.id });
    };

    // the upper ontologies the guesses are classified in: the imports of the source small enough to be read whole
    self.getUpperOntologies = function () {
        var upperOntologies = [];
        AIColumnClassSuggestion.getImportsSortedByAbstraction(self.currentSource).forEach(function (importSource) {
            var ontologyModel = Config.ontologiesVocabularyModels[importSource];
            if (!Config.sources[importSource] || (ontologyModel && ontologyModel.classesCount > AIColumnClassSuggestion.maxClassesPerOntology)) {
                return;
            }
            upperOntologies.push(importSource);
        });
        return upperOntologies;
    };

    // the tree of the Classes or Properties choice of the AI Mapping Modeler, in a dialog: the AI proposal with its
    // probabilities first, then the terms of each upper ontology, filtered by the search field
    self.showChoiceDialog = function (title, proposalNodes, termsKey, rootLabel, treeOptions) {
        var classColor = self.getLegendItem("Class").color;
        var getRootText = function (label) {
            var rootSpan = $("<span>").css({ "font-weight": "bold", color: classColor }).text(label);
            return rootSpan[0].outerHTML;
        };
        var jstreeData = [{ id: "aiProposal", parent: "#", text: getRootText("AI proposal"), data: {} }];
        jstreeData = jstreeData.concat(proposalNodes);
        jstreeData.push({ id: "terms", parent: "#", text: getRootText(rootLabel), data: {} });
        var upperOntologies = self.getUpperOntologies();
        // the page of the workflow loads no ontology model of its own
        OntologyModels.registerSourcesModel(upperOntologies, null, function (error) {
            if (error) {
                return MainController.errorAlert(error);
            }
            self.openChoiceTree(title, jstreeData, upperOntologies, termsKey, treeOptions);
        });
    };

    self.openChoiceTree = function (title, jstreeData, upperOntologies, termsKey, treeOptions) {
        var classColor = self.getLegendItem("Class").color;
        upperOntologies.forEach(function (upperOntology) {
            jstreeData.push({ id: upperOntology, parent: "terms", text: AIColumnClassSuggestion.getTreeNodeText(upperOntology, classColor), data: {} });
            var ontologyModel = Config.ontologiesVocabularyModels[upperOntology];
            var termsByIri = ontologyModel && ontologyModel[termsKey] ? ontologyModel[termsKey] : {};
            var terms = Object.values(termsByIri);
            terms.sort((term, otherTerm) => String(term.label).localeCompare(String(otherTerm.label)));
            terms.forEach(function (term) {
                jstreeData.push({
                    // one IRI may be listed by several upper ontologies
                    id: upperOntology + "|" + term.id,
                    parent: upperOntology,
                    text: AIColumnClassSuggestion.getTreeNodeText(term.label || term.id, classColor),
                    data: { termIri: term.id },
                });
            });
        });
        var treeDivId = "aiMappingWorkflow_choiceJstreeDiv";
        // the search bar of the Mapping Modeler class tree
        var searchInput = $("<input style='width: 280px; height: 33.5px; border-bottom-left-radius: 14px; border-top-left-radius: 14px'>");
        var searchButton = $("<button class='search-icon slsv-invisible-button' style='margin-top: 4px; height: 20px; width: 20px'></button>");
        var searchBar = $("<div class='input-group mb-3'>").append(
            $("<div class='input-group-prepend'>").append(searchInput),
            $("<div class='SearchButtonIconRight border-without-raduis-theme1' style='height: 33.5px; padding-left: 7px; padding-right: 5px'>").append(searchButton),
        );
        $("#smallDialogDiv").empty().append(searchBar, $("<div style='max-height: 60vh; overflow: auto'>").attr("id", treeDivId));
        // as in the Mapping Modeler class tree: every source open, the search keeps only the matching classes
        treeOptions.openAll = true;
        treeOptions.searchPlugin = { show_only_matches: true };
        // opened once the tree is drawn, or it is centered on its empty size
        JstreeWidget.loadJsTree(treeDivId, jstreeData, treeOptions, function () {
            UI.openDialog("smallDialogDiv", { title: title });
            UI.clampAndCenterDialog("smallDialogDiv");
        });
        var searchTree = function () {
            $("#" + treeDivId)
                .jstree(true)
                .search(searchInput.val());
        };
        searchInput.on("keyup", searchTree);
        searchButton.on("click", searchTree);
    };

    self.closeChoiceDialog = function () {
        $("#smallDialogDiv").dialog("close");
    };

    // the class of an entry, chosen in the AI proposal or among the classes of the upper ontologies: a class of the upper
    // ontologies is a superclass of the new class, or the class itself from the context menu
    self.showClassChoiceDialog = function () {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        var guessEntry = self.popupMenuEntry;
        var readingIndex = self.getEntryReadingIndex(guessEntry);
        var reading = self.getReadings(guessEntry)[readingIndex];
        var classification = self.getClassification(guessEntry, readingIndex);
        var classColor = self.getLegendItem("Class").color;
        var proposalNodes = [];
        if (classification.classKind == "existingClass") {
            var existingClassText = "is " + self.getClassLabel(classification.classSource, classification.classLabel);
            proposalNodes.push({ id: "aiProposal|existingClass", parent: "aiProposal", text: AIColumnClassSuggestion.getTreeNodeText(existingClassText, classColor), data: { isExistingClass: true } });
        }
        var parentOptions = classification.classKind == "newClass" ? classification.parentOptions : [];
        parentOptions.forEach(function (parentOption, parentIndex) {
            var parentText = "subclass of " + self.getClassLabel(parentOption.parentSource, parentOption.parentLabel) + AIColumnClassSuggestion.getProbabilityText(parentOption);
            proposalNodes.push({
                id: "aiProposal|" + parentIndex,
                parent: "aiProposal",
                text: AIColumnClassSuggestion.getTreeNodeText(parentText, classColor, parentOption.definition),
                data: { superClassId: parentOption.parentId },
            });
        });
        var decide = function (superClassId) {
            var decideInput = { entry: guessEntry.label, reading: reading.label, superClass: superClassId };
            self.changeGuessByHand("apply_decision", decideInput, self.closeChoiceDialog);
        };
        var takeAsTheClass = function (classIri) {
            self.changeGuessByHand("update_class", { entry: guessEntry.label, reading: reading.label, existingClassIri: classIri }, function () {
                decide(null);
            });
        };
        var onSelect = function (event, selected) {
            var nodeData = selected.node.data || {};
            if (nodeData.isExistingClass) {
                decide(null);
            } else if (nodeData.superClassId) {
                decide(nodeData.superClassId);
            } else if (nodeData.termIri && classification.classKind != "newClass") {
                // an imported or unclassified class takes no superclass: the class picked becomes the class itself
                takeAsTheClass(nodeData.termIri);
            } else if (nodeData.termIri) {
                var isOption = parentOptions.some((parentOption) => parentOption.parentId == nodeData.termIri);
                if (isOption) {
                    return decide(nodeData.termIri);
                }
                var optionInput = { entry: guessEntry.label, reading: reading.label, superClassIri: nodeData.termIri, probability: 0, impact: "chosen by the user" };
                self.changeGuessByHand("add_superclass_option", optionInput, function () {
                    decide(nodeData.termIri);
                });
            }
        };
        var contextMenu = function (treeNode) {
            var items = {};
            if (treeNode.data && treeNode.data.termIri) {
                items.isTheClass = {
                    label: "Is the class itself",
                    action: function () {
                        takeAsTheClass(treeNode.data.termIri);
                    },
                };
            }
            return items;
        };
        self.showChoiceDialog("Class of " + guessEntry.label, proposalNodes, "classes", "Classes", { selectTreeNodeFn: onSelect, contextMenu: contextMenu });
    };

    // the property of a link, chosen in the AI proposal or among the object properties of the upper ontologies, in the
    // direction of the link or, from the context menu, the other way
    self.showPropertyChoiceDialog = function () {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        var link = self.popupMenuLink;
        var propertyColor = AIMappingModeler.propertyColor;
        var proposalNodes = self.getVisibleLinkOptions(link).map(function (option, optionIndex) {
            var optionText = self.getAssumptionText(option) + self.getClassLabel(option.propertySource, option.propertyLabel) + (option.inverse ? " (inverse)" : "") + AIColumnClassSuggestion.getProbabilityText(option);
            var proposalNode = { id: "aiProposal|" + optionIndex, parent: "aiProposal", text: AIColumnClassSuggestion.getTreeNodeText(optionText, propertyColor, option.reason), data: { propertyIri: option.propertyIri } };
            return proposalNode;
        });
        var decide = function (propertyIri) {
            self.changeGuessByHand("apply_link_decision", { link: link.id, property: propertyIri }, self.closeChoiceDialog);
        };
        var chooseProperty = function (propertyIri, isInverse) {
            var existingOption = link.propertyOptions.find((option) => option.propertyIri == propertyIri);
            if (existingOption && existingOption.inverse == isInverse) {
                return decide(propertyIri);
            }
            var optionInput = { link: link.id, propertyIri: propertyIri, probability: 0, inverse: isInverse };
            var addOption = function () {
                self.changeGuessByHand("add_link_property_option", optionInput, function () {
                    decide(propertyIri);
                });
            };
            // an option takes one direction: the other one replaces it
            if (existingOption) {
                return self.changeGuessByHand("remove_link_property_option", { link: link.id, property: propertyIri }, addOption);
            }
            addOption();
        };
        var onSelect = function (event, selected) {
            var nodeData = selected.node.data || {};
            if (nodeData.propertyIri) {
                decide(nodeData.propertyIri);
            } else if (nodeData.termIri) {
                chooseProperty(nodeData.termIri, false);
            }
        };
        var contextMenu = function (treeNode) {
            var items = {};
            if (treeNode.data && treeNode.data.termIri) {
                items.inverse = {
                    label: "Choose, the other way",
                    action: function () {
                        chooseProperty(treeNode.data.termIri, true);
                    },
                };
            }
            return items;
        };
        self.showChoiceDialog("Property of " + link.fromClass + " -> " + link.toClass, proposalNodes, "properties", "Properties", { selectTreeNodeFn: onSelect, contextMenu: contextMenu });
    };

    // the decision goes in the keys of the database in the mapping, read again right before the write so that nothing the
    // server wrote meanwhile is lost
    self.applyDecision = function (guessEntry, decision) {
        var databaseId = self.currentDatabaseId;
        self.readMappingFile(function (error, mapping) {
            if (error) {
                return MainController.errorAlert(error);
            }
            var databaseSource = mapping.options.config.databaseSources[databaseId];
            var guessKey = self.workflowSteps[self.currentStepIndex].guessKey;
            var savedGuess = databaseSource && databaseSource.aiKeys ? databaseSource.aiKeys[guessKey] : null;
            var savedEntry = savedGuess ? self.getGuessEntries(savedGuess).find((savedGuessEntry) => savedGuessEntry.label == guessEntry.label) : null;
            if (!savedEntry) {
                return MainController.errorAlert("The guess of " + guessEntry.label + " is no longer in the mapping: open the database again.");
            }
            savedEntry.decision = decision;
            // logged as the chat logs its changes, without rationale: the user chose on the card
            if (!savedGuess.changeLog) {
                savedGuess.changeLog = [];
            }
            savedGuess.changeLog.push({
                change: "apply_decision",
                entry: savedEntry.label,
                summary: decision.isLeftToLinks ? "left open until the links" : "decided on the card",
                userRequest: null,
                rationale: null,
                queries: [],
                at: new Date().toISOString(),
            });
            $.ajax({
                type: "POST",
                url: Config.apiUrl + "/data/file",
                data: { dir: "graphs/", fileName: self.getMappingFileName(), data: JSON.stringify(mapping, null, 2) },
                dataType: "json",
                success: function () {
                    guessEntry.decision = decision;
                    self.currentGuess.changeLog = savedGuess.changeLog;
                    self.drawGuessGraph();
                    // the last decision of a step opens the next one
                    self.drawWorkflowTabs();
                    UI.message(CommonBotFunctions.escapeHtml("Choice saved for " + guessEntry.label));
                },
                error: function (saveError) {
                    MainController.errorAlert(saveError);
                },
            });
        });
    };

    return self;
})();

export default AIMappingWorkflow;
window.AIMappingWorkflow = AIMappingWorkflow;
