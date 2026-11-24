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
    // the steps of the workflow, in their order, each one reached once every entry of the one before is decided; the next
    // one is shown by its number only. chatStep names the guess for the change_guess tool of the chat
    self.workflowSteps = [
        { label: "Master data", guessKey: "masterDataGuess", chatStep: "masterData", entryLegend: "Master data", entryNoun: "master data", reasonLabel: "Why master data" },
        {
            label: "Important classes",
            guessKey: "importantClassesGuess",
            chatStep: "importantClasses",
            entryLegend: "Important class",
            entryNoun: "important classes",
            reasonLabel: "Why important",
        },
        {
            label: "Links",
            guessKey: "linksGuess",
            chatStep: "links",
            entryLegend: "Class",
            entryNoun: "event classes and links",
            reasonLabel: "Why an event",
        },
    ];
    self.currentStepIndex = 0;
    // step 3: the link open on the card, and the link each edge of the links graph draws
    self.currentLinkCard = null;
    self.linkByEdgeId = {};
    self.linkNodeIdByLabel = {};

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

    // a step is reached once every entry of the step before it is decided
    self.isStepReached = function (stepIndex) {
        // the keys of the database are still read
        if (!self.currentAiKeys) {
            return false;
        }
        if (stepIndex == 0) {
            return true;
        }
        var previousGuess = self.currentAiKeys[self.workflowSteps[stepIndex - 1].guessKey];
        var isReached = Boolean(previousGuess) && self.getGuessEntries(previousGuess).every((guessEntry) => guessEntry.decision);
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
                stepTab.prop("disabled", true).attr("title", "Decide every entry of step " + stepIndex + " first");
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
        self.linkByEdgeId = {};
        self.linkNodeIdByLabel = {};
        self.currentStepIndex = 0;
        self.drawWorkflowTabs();
        $("#aiMappingWorkflow_databaseName").text(self.databaseSources[databaseId].name || databaseId);
        $("#aiMappingWorkflow_progress").empty();
        $("#aiMappingWorkflow_card").empty();
        self.showExplanation("The AI reads the database: its keys, then its master data and their classes in the upper ontologies.");
        if (self.guessGraph && self.guessGraph.network) {
            self.guessGraph.network.destroy();
        }
        AIMappingWorkflowChat.hide();
        self.prepareSource(databaseId);
        self.readTableKeys(databaseId);
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
                    self.showProgressStep("Schema not read: " + result.databaseErrors[databaseId]);
                }
            },
            error: function (error) {
                self.showProgressStep("Preparation failed: " + AIColumnClassSuggestion.getErrorText(error));
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
                    return self.showExplanation("The AI found no keys in this database: " + tableKeys.aiKeysError);
                }
                var masterDataGuess = tableKeys.aiKeys ? tableKeys.aiKeys.masterDataGuess : null;
                if (tableKeys.aiKeysStatus == "done" && masterDataGuess) {
                    self.currentAiKeys = tableKeys.aiKeys;
                    return self.showStep(0);
                }
                if (tableKeys.aiKeysStatus == "done") {
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

    self.showProgressStep = function (stepText) {
        $("#aiMappingWorkflow_progress").append($("<div>").text(stepText));
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
        $("#aiMappingWorkflow_card").empty();
        self.drawWorkflowTabs();
        var guess = self.currentAiKeys[self.workflowSteps[stepIndex].guessKey];
        if (guess) {
            return self.showGuess(guess);
        }
        if (self.guessGraph && self.guessGraph.network) {
            self.guessGraph.network.destroy();
        }
        var runPanel = $("<div class='masterData-panel'>");
        if (stepIndex == 1) {
            runPanel.append(
                $("<div>").text("Every master data is decided. The AI now guesses the important classes of the business around them, reads what their rows denote and classifies them: a few minutes."),
                self.getStepRunButton("Guess the important classes", self.guessImportantClasses),
            );
        } else if (stepIndex == 2) {
            runPanel.append(
                $("<div>").text("Every important class is decided. The AI now guesses the event classes of the business around them and the links between the classes: a few minutes."),
                self.getStepRunButton("Guess the links", self.guessLinks),
            );
        }
        $("#aiMappingWorkflow_explanation").empty().append(runPanel);
    };

    // a step runs on the user's request; step 1 may still be reviewed before
    self.getStepRunButton = function (buttonText, onClick) {
        var runButton = $("<button type='button' class='slsv-button-1'>").text(buttonText);
        runButton.on("click", function () {
            runButton.prop("disabled", true);
            onClick();
        });
        return runButton;
    };

    self.getImportantClassesRunButton = function (buttonText) {
        return self.getStepRunButton(buttonText, self.guessImportantClasses);
    };

    self.guessImportantClasses = function () {
        var databaseId = self.currentDatabaseId;
        $("#aiMappingWorkflow_progress").empty();
        var payload = { source: self.currentSource, databaseId: databaseId, clientSocketId: Config.clientSocketId };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/ai/aiMappingWorkflow/importantClasses",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",
            success: function (result) {
                if (self.currentDatabaseId != databaseId) {
                    return;
                }
                self.currentAiKeys.importantClassesGuess = result.importantClassesGuess;
                self.showStep(1);
            },
            error: function (error) {
                self.showExplanation("Important classes not guessed: " + AIColumnClassSuggestion.getErrorText(error));
            },
        });
    };

    // the master data decisions changed since the important classes were guessed from them
    self.isImportantClassesGuessOutdated = function () {
        var guessedDecisions = self.currentAiKeys.importantClassesGuess.decisionsByMasterData;
        var masterData = self.currentAiKeys.masterDataGuess.masterData;
        if (masterData.length != Object.keys(guessedDecisions).length) {
            return true;
        }
        var isOutdated = masterData.some(function (masterDataEntry) {
            var guessedDecision = guessedDecisions[masterDataEntry.label];
            var isChanged =
                !guessedDecision ||
                !masterDataEntry.decision ||
                guessedDecision.readingIndex != masterDataEntry.decision.readingIndex ||
                guessedDecision.superClassId != masterDataEntry.decision.superClassId;
            return isChanged;
        });
        return isOutdated;
    };

    self.guessLinks = function () {
        var databaseId = self.currentDatabaseId;
        $("#aiMappingWorkflow_progress").empty();
        var payload = { source: self.currentSource, databaseId: databaseId, clientSocketId: Config.clientSocketId };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/ai/aiMappingWorkflow/links",
            data: JSON.stringify(payload),
            contentType: "application/json",
            dataType: "json",
            success: function (result) {
                if (self.currentDatabaseId != databaseId) {
                    return;
                }
                self.currentAiKeys.linksGuess = result.linksGuess;
                self.showStep(2);
            },
            error: function (error) {
                self.showExplanation("Links not guessed: " + AIColumnClassSuggestion.getErrorText(error));
            },
        });
    };

    // the master data or the important classes decisions changed since the links were guessed from them
    self.isLinksGuessOutdated = function () {
        var guessedDecisions = self.currentAiKeys.linksGuess.decisionsByClass;
        var currentDecisions = {};
        [self.currentAiKeys.masterDataGuess, self.currentAiKeys.importantClassesGuess].forEach(function (guess) {
            self.getGuessEntries(guess).forEach(function (guessEntry) {
                currentDecisions[guessEntry.label] = guessEntry.decision || null;
            });
        });
        var isOutdated = Object.keys(guessedDecisions).some(function (label) {
            var isChanged = !currentDecisions[label] || guessedDecisions[label].readingIndex != currentDecisions[label].readingIndex || guessedDecisions[label].superClassId != currentDecisions[label].superClassId;
            return isChanged;
        });
        return isOutdated || Object.keys(currentDecisions).some((label) => !Object.hasOwn(guessedDecisions, label) && currentDecisions[label]);
    };

    // guess: { masterData | importantClasses | eventClasses: [{ label, definition, reason, readings, decision, evidence }], classificationByClass }
    self.showGuess = function (guess) {
        var workflowStep = self.workflowSteps[self.currentStepIndex];
        self.currentGuess = guess;
        $("#aiMappingWorkflow_progress").empty();
        var explanation = $("<div class='masterData-panel'>");
        if (workflowStep.guessKey == "importantClassesGuess" && self.isImportantClassesGuessOutdated()) {
            explanation.append(
                $("<div class='masterData-note'>").text("The master data decisions changed since these classes were guessed."),
                self.getImportantClassesRunButton("Guess them again, their decisions are lost"),
            );
        }
        if (workflowStep.guessKey == "linksGuess" && self.isLinksGuessOutdated()) {
            explanation.append(
                $("<div class='masterData-note'>").text("The master data or the important classes decisions changed since these links were guessed."),
                self.getStepRunButton("Guess them again, their decisions are lost", self.guessLinks),
            );
        }
        if (workflowStep.guessKey == "linksGuess") {
            return self.showLinksExplanation(explanation, guess);
        }
        explanation.append(
            $("<div>").append($("<b>").text("Domain: "), $("<span>").text(self.currentAiKeys.masterDataGuess.domain)),
            $("<div>").text("The AI guessed " + self.getGuessEntries(guess).length + " " + workflowStep.entryNoun + " in this database. Each tree of the graph is one of them:"),
            $("<div class='masterData-legendLine'>").append(
                $("<span class='masterData-column'>").css("background", self.getLegendItem("Column").color).text(workflowStep.entryLegend),
                $("<span>").text("as the data hold it, at the bottom"),
            ),
            $("<div class='masterData-legendLine'>").append($("<span class='masterData-class'>").text("Class"), $("<span>").text("its class, a thick frame when an upper ontology already has it")),
            $("<div class='masterData-legendLine'>").append($("<span class='masterData-dashed'>"), $("<span>").text("a possible superclass, with its probability")),
            $("<div>").text("Click an entry or its class to decide what its rows denote and its superclass. Right click it to choose another class, rename it or remove it."),
        );
        $("#aiMappingWorkflow_explanation").empty().append(explanation);
        self.drawGuessGraph();
        AIMappingWorkflowChat.show();
    };

    // the explanation panel of the links step: the classes of steps 1 and 2 as nodes, the events and the links between them
    self.showLinksExplanation = function (explanation, guess) {
        explanation.append(
            $("<div>").append($("<b>").text("Domain: "), $("<span>").text(self.currentAiKeys.masterDataGuess.domain)),
            $("<div>").text("The graph holds the classes of steps 1 and 2, the event classes of the business and the links between them. A link is drawn along the foreign keys of the database."),
            $("<div class='masterData-legendLine'>").append($("<span class='masterData-class'>").text("Event class"), $("<span>").text("the class of the business, a class of its own")),
            $("<div class='masterData-legendLine'>").append($("<span class='masterData-dashed'>"), $("<span>").text("a proposed link, with its properties of the upper ontologies")),
            $("<div>").text("Click a class or an undecided link: on the card, decide the event, or the property of the link. Right click it to choose another class or property, or to remove it."),
        );
        $("#aiMappingWorkflow_explanation").empty().append(explanation);
        self.drawGuessGraph();
        AIMappingWorkflowChat.show();
    };

    // drawn as the mapping graph draws a mapped column: the entry at the bottom, its class above it, and for a new class
    // its possible superclasses above the class, dashed until one is applied, one tree per entry
    self.drawGuessGraph = function () {
        if (self.workflowSteps[self.currentStepIndex].guessKey == "linksGuess") {
            return self.drawLinksGraph();
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
            nodes.push({
                id: entryNodeId,
                label: guessEntry.label,
                shape: columnLegendItem.shape,
                color: columnLegendItem.color,
                x: treeCenterX,
                y: 200,
                // an entry the model could not classify is no class yet
                shapeProperties: { borderDashes: isUnclassified ? [4, 4] : false },
                data: { id: entryNodeId, label: guessEntry.label, type: "Column" },
                title: getTooltip([guessEntry.definition, guessEntry.reason]),
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

    // the classification decided for one step 1 or 2 entry, read in its own guess: the links graph shows the guess of step 3
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

    // drawn as the mapping graph draws a network: the classes of steps 1 and 2 as nodes, the event classes of the
    // guess as class nodes, the links of the guess as arrows along the foreign keys, the undecided ones dashed
    self.drawLinksGraph = function () {
        var classLegendItem = self.getLegendItem("Class");
        var nodes = [];
        var edges = [];
        self.linkNodeIdByLabel = {};
        self.linkByEdgeId = {};
        self.entryByNodeId = {};
        var guess = self.currentGuess;
        // the classes of steps 1 and 2, keyed by the label the links of the server name, one node per class even when
        // several entries are taken as the same class
        ["masterDataGuess", "importantClassesGuess"].forEach(function (guessKey) {
            var stepGuess = self.currentAiKeys[guessKey];
            if (!stepGuess) {
                return;
            }
            self.getGuessEntries(stepGuess).forEach(function (guessEntry) {
                var classification = self.getDecidedClassification(guessEntry, stepGuess);
                var isClassNamed = classification.classKind == "newClass" || classification.classKind == "existingClass";
                var classLabel = isClassNamed ? classification.classLabel : guessEntry.label;
                if (self.linkNodeIdByLabel[classLabel]) {
                    return;
                }
                var nodeId = "class|" + classLabel;
                self.linkNodeIdByLabel[classLabel] = nodeId;
                var nodeLabel = self.getClassLabel(classification.classKind == "existingClass" ? classification.classSource : self.currentSource, classLabel);
                nodes.push({
                    id: nodeId,
                    label: nodeLabel,
                    shape: classLegendItem.shape,
                    color: classLegendItem.color,
                    data: { id: nodeId, label: nodeLabel, type: "Class" },
                    title: guessEntry.definition,
                });
            });
        });
        // the event classes, dashed while undecided
        (guess.eventClasses || []).forEach(function (eventClass) {
            var classification = self.getClassification(eventClass, eventClass.decision ? eventClass.decision.readingIndex : 0);
            var eventClassLabel = classification && classification.classLabel ? self.getClassLabel(classification.classSource || self.currentSource, classification.classLabel) : eventClass.label;
            var nodeId = "event|" + eventClass.label;
            self.linkNodeIdByLabel[eventClass.label] = nodeId;
            self.entryByNodeId[nodeId] = eventClass;
            nodes.push({
                id: nodeId,
                label: eventClassLabel,
                shape: classLegendItem.shape,
                color: classLegendItem.color,
                borderWidth: 3,
                shapeProperties: { borderDashes: !eventClass.decision ? [4, 4] : false },
                data: { id: nodeId, label: eventClassLabel, type: "Event class" },
                title: [eventClass.definition, eventClass.reason, (eventClass.tables || []).join(", ")].filter(Boolean).join("\n"),
            });
        });
        // the links: decided as solid arrows with the chosen property, proposed as dashed, the clicked ones land on the card
        (guess.links || []).forEach(function (link) {
            var fromNodeId = self.linkNodeIdByLabel[link.fromClass];
            var toNodeId = self.linkNodeIdByLabel[link.toClass];
            if (!fromNodeId || !toNodeId) {
                return;
            }
            self.linkByEdgeId[link.id] = link;
            var getTooltip = function (lines) {
                var tooltip = $("<div style='max-width: 400px; white-space: normal'>");
                lines.forEach(function (line) {
                    tooltip.append($("<div>").text(line));
                });
                return tooltip[0];
            };
            var fkLines = link.foreignKey.columns.map(function (column, columnIndex) {
                return link.foreignKey.table + "." + column + " -> " + link.foreignKey.referencedTable + "." + link.foreignKey.referencedColumns[columnIndex];
            });
            var optionLines = (link.propertyOptions || []).map(function (option) {
                return option.propertyLabel + (option.inverse ? " (inverse)" : "") + ": " + option.probability + "%";
            });
            var linkEdge = {
                id: link.id,
                from: fromNodeId,
                to: toNodeId,
                label: "",
                dashes: !link.decision,
                color: "#00afef",
                arrows: { to: { enabled: true, type: "arrow" } },
                data: { id: link.id },
                title: getTooltip([fkLines.join("; "), link.viaEvent ? "Event: " + link.viaEvent : "", optionLines.join("; ")].filter(Boolean)),
            };
            if (link.decision) {
                var decisionOption = link.propertyOptions.find((option) => option.propertyIri == link.decision.propertyIri);
                linkEdge.label = decisionOption ? decisionOption.propertyLabel : "";
            }
            edges.push(linkEdge);
        });
        if (self.guessGraph && self.guessGraph.network) {
            self.guessGraph.network.destroy();
        }
        var graphOptions = {
            visjsOptions: { physics: { enabled: true }, edges: { smooth: true }, interaction: { hover: true } },
            onclickFn: self.showLinksCard,
            onRightClickFn: self.showGraphPopupMenu,
        };
        var guessGraph = new VisjsGraphClass(self.graphDivId, { nodes: nodes, edges: edges }, graphOptions);
        self.guessGraph = guessGraph;
        guessGraph.draw();
    };

    // an event opens the card of its class as steps 1 and 2 do, a link the card of its property; a class of steps 1
    // and 2 is decided in its own step
    self.showLinksCard = function (nodeOrEdge) {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        if (nodeOrEdge && self.entryByNodeId[nodeOrEdge.id]) {
            return self.showEntryCard(nodeOrEdge);
        }
        var link = nodeOrEdge && self.linkByEdgeId[nodeOrEdge.id];
        if (!link) {
            return;
        }
        self.entryCard = null;
        self.currentLinkCard = { link: link };
        self.renderLinkCard();
    };

    // the card of one link: the foreign key that evidences it, the property options of the upper ontologies and the
    // cardinality the AI wrote
    self.renderLinkCard = function () {
        var link = self.currentLinkCard.link;
        // texts of the model or of the server, never read as html
        var getFieldsTable = function (fields) {
            var fieldsTable = $("<table class='masterData-fields'>");
            fields.forEach(function ([fieldName, fieldValue]) {
                if (!fieldValue) {
                    return;
                }
                fieldsTable.append($("<tr>").append($("<td class='masterData-fieldName'>").text(fieldName), $("<td>").text(fieldValue)));
            });
            return fieldsTable;
        };
        var fkText = link.foreignKey.columns.map(function (column, columnIndex) {
            return link.foreignKey.table + "." + column + " -> " + link.foreignKey.referencedTable + "." + link.foreignKey.referencedColumns[columnIndex];
        });
        var cardDiv = $("#aiMappingWorkflow_card");
        cardDiv.empty();
        var headerPanel = $("<div class='masterData-panel'>");
        headerPanel.append(
            $("<span class='masterData-class'>").text(link.fromClass),
            $("<span>").text(" -> "),
            $("<span class='masterData-class'>").text(link.toClass),
            getFieldsTable([
                ["Foreign key", fkText.join("; ")],
                ["From the data", link.foreignKey.foundInData ? "found in the data, not declared" : "declared"],
                ["Cardinality", link.cardinality || null],
                ["Participation of", link.viaEvent || null],
            ]),
        );
        cardDiv.append(headerPanel);
        var optionsDiv = $("<div class='masterData-stepContent'>");
        optionsDiv.append($("<div class='masterData-step'>").text("Property of the upper ontologies:"));
        (link.propertyOptions || []).forEach(function (option) {
            var isSelected = Boolean(link.decision) && option.propertyIri == link.decision.propertyIri;
            var probabilityFill = $("<div class='masterData-probabilityFill'>").css("width", option.probability + "%");
            var probability = $("<div class='masterData-probability'>").append(
                $("<div class='masterData-probabilityBar'>").append(probabilityFill),
                $("<span>").text(option.probability + "%"),
            );
            var optionButton = $("<button type='button' class='masterData-option'>").toggleClass("masterData-selected", isSelected);
            optionButton.append($("<div class='masterData-optionTitle'>").append($("<span>").text(self.getClassLabel(option.propertySource, option.propertyLabel)), probability), getFieldsTable([
                    ["Reason", option.reason],
                    ["Definition", option.definition],
                ]));
            optionButton.on("click", function () {
                link.decision = { propertyIri: option.propertyIri };
                self.applyLinkDecision(link, { propertyIri: option.propertyIri });
            });
            optionsDiv.append(optionButton);
        });
        if (!link.propertyOptions || link.propertyOptions.length == 0) {
            optionsDiv.append($("<div class='masterData-note'>").text("No property of the upper ontologies was proposed: right click the link to choose one, or ask the chat."));
        }
        cardDiv.append(optionsDiv);
        var footer = $("<div class='masterData-footer'>");
        var decidedOption = link.decision ? (link.propertyOptions || []).find((option) => option.propertyIri == link.decision.propertyIri) : null;
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
                    self.currentLinkCard = { link: link };
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
        if (self.currentLinkCard) {
            var savedLink = (guess.links || []).find((candidateLink) => candidateLink.id == self.currentLinkCard.link.id);
            if (!savedLink) {
                return $("#aiMappingWorkflow_card").empty();
            }
            self.currentLinkCard = { link: savedLink };
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
        // texts of the model, never read as html
        var getFieldsTable = function (fields) {
            var fieldsTable = $("<table class='masterData-fields'>");
            fields.forEach(function ([fieldName, fieldValue]) {
                if (!fieldValue) {
                    return;
                }
                fieldsTable.append($("<tr>").append($("<td class='masterData-fieldName'>").text(fieldName), $("<td>").text(fieldValue)));
            });
            return fieldsTable;
        };
        var getStepTitle = function (stepNumber, title) {
            var stepTitle = $("<div class='masterData-step'>").append($("<span class='masterData-stepNumber'>").text(stepNumber), $("<span>").text(title));
            return stepTitle;
        };
        var getOptionButton = function (isSelected, titleElements, fields, onPick) {
            var optionButton = $("<button type='button' class='masterData-option'>").toggleClass("masterData-selected", isSelected);
            optionButton.append($("<div class='masterData-optionTitle'>").append($("<span class='masterData-radio'>"), titleElements), getFieldsTable(fields));
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
            getFieldsTable([
                ["Definition", entry.definition],
                [self.workflowSteps[self.currentStepIndex].reasonLabel, entry.reason],
                ["About", entry.aboutMasterData],
            ]),
        );
        cardDiv.append(headerPanel);

        var stepNumber = 1;
        if (card.readings.length > 1) {
            var readingsDiv = $("<div class='masterData-stepContent'>");
            readingsDiv.append(getStepTitle(stepNumber, "What does one row of " + entry.label + " denote?"));
            stepNumber++;
            var evidence = entry.evidence;
            if (evidence && evidence.rows) {
                readingsDiv.append($("<div>").text(evidence.purpose));
                var evidenceTable = $("<table class='masterData-evidenceTable'>");
                var headerCells = evidence.columns.map((column) => $("<th>").text(column));
                evidenceTable.append($("<tr>").append(headerCells));
                evidence.rows.forEach(function (evidenceRow) {
                    var valueCells = evidenceRow.map((value) => $("<td>").text(value));
                    evidenceTable.append($("<tr>").append(valueCells));
                });
                readingsDiv.append($("<div class='masterData-evidence'>").append(evidenceTable));
            }
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
                    ["Local class under", localClass ? localClass.superClassLabel : null],
                ];
                superClassDiv.append(getOptionButton(isSelected, [$("<span class='masterData-class'>").text(parentLabel), probability], superClassFields, pickSuperClass));
            });
        }
        cardDiv.append(superClassDiv);

        var applyButton = $("<button type='button' class='masterData-applyButton'>").text("Apply");
        applyButton.prop("disabled", isChoiceOpen && !card.superClassId);
        applyButton.on("click", function () {
            self.applyDecision(entry, { readingIndex: card.readingIndex, superClassId: card.superClassId });
        });
        // back to the options of the AI, the upper class taken as the class included
        var isClassReplaced = card.readings.some((reading) => reading.replacedClassification);
        var undoButton = $("<button type='button' class='masterData-applyButton'>").text("Undo the choice");
        undoButton.prop("disabled", !entry.decision && !isClassReplaced);
        undoButton.on("click", function () {
            self.changeGuessByHand("undo_decision", { entry: entry.label });
        });
        var footer = $("<div class='masterData-footer'>");
        footer.append($("<div>").append($("<span class='masterData-writtenLabel'>").text("Will be written"), $("<span>").text(writtenText)), $("<div class='masterData-footerButtons'>").append(undoButton, applyButton));
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

    // the right click on an entry of the graph, or on a link of step 3: the changes the user makes by hand
    self.showGraphPopupMenu = function (nodeOrEdge, point, event) {
        self.popupMenuEntry = nodeOrEdge ? self.entryByNodeId[nodeOrEdge.id] || null : null;
        self.popupMenuLink = nodeOrEdge ? self.linkByEdgeId[nodeOrEdge.id] || null : null;
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
        var proposalNodes = link.propertyOptions.map(function (option, optionIndex) {
            var optionText = self.getClassLabel(option.propertySource, option.propertyLabel) + (option.inverse ? " (inverse)" : "") + AIColumnClassSuggestion.getProbabilityText(option);
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
