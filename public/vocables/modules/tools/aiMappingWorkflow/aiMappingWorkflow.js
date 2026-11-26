import VisjsGraphClass from "../../graph/VisjsGraphClass.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import AIMappingModeler from "../aiMappingModeler/aiMappingModeler.js";
import AIMappingColumnsGraph from "../aiMappingModeler/aiMappingColumnsGraph.js";
import AIColumnClassSuggestion from "../aiMappingModeler/aiColumnClassSuggestion.js";
import AIMappingWorkflowChat from "./aiMappingWorkflowChat.js";
import LegendOverlayWidget from "../../uiWidgets/legendOverlayWidget.js";
import AIMappingBuild from "./aiMappingBuild.js";

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
            label: "Semantic relations",
            guessKey: "linksGuess",
            chatStep: "links",
            guessRoute: "links",
            runText:
                "The AI now proposes the properties of the upper ontologies for the relations between the classes of steps 1 to 3, for each alternative of a class still undecided: a few minutes.",
            entryLegend: "Class",
            entryNoun: "relations",
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
        // no guess of its own: it writes the mapping of MappingModeler from the steps before
        { label: "Build", chatStep: "mapping", isBuildStep: true },
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
    self.mappingUriTypeLabels = { fromLabel: "from the Id", blankNode: "blank node", randomIdentifier: "random" };
    // the class graph in levels: the class, the Id of each table, every value column on one line, the groups below
    // the column line in three staggered rows, so a long label never meets its neighbour of the same row
    self.mappingGraphLayout = {
        classY: -330,
        keyY: -180,
        columnY: 0,
        columnRowCount: 3,
        columnRowOffset: 45,
        groupY: 220,
        columnSpacing: 75,
        groupGap: 70,
        tableGap: 120,
        labelCharWidth: 7,
        columnMargin: 20,
    };
    self.mappingValueColumnColor = "#dddddd";
    self.mappingGroupEdgeColor = "#b9b9b9";
    // the columns of a class grouped by the kind of value they give, in this order, the columns of another class and the
    // implicit classes last
    self.mappingGroupTitles = { text: "Text", dates: "Dates", numbers: "Numbers", booleans: "Yes / no", urls: "URLs", implicit: "Implicit classes" };
    self.mappingGroupOrder = ["text", "dates", "numbers", "booleans", "urls"];
    self.mappingGroupKeysByRange = {
        "xsd:date": "dates",
        "xsd:dateTime": "dates",
        "xsd:integer": "numbers",
        "xsd:int": "numbers",
        "xsd:decimal": "numbers",
        "xsd:float": "numbers",
        "xsd:double": "numbers",
        "xsd:boolean": "booleans",
        "xsd:anyURI": "urls",
    };
    // what Other offers beside the properties, the kinds of mapping_guess.md that need no property; individualPerValue
    // left out, it gives what implicitClass gives, one node per distinct value
    self.mappingOtherKinds = ["implicitClass", "subclassPerValue", "splitValue", "identifierClass"];
    self.mappingOtherKindLabels = { implicitClass: "one node per value", subclassPerValue: "one subclass per value", splitValue: "one node per code", identifierClass: "an identifier node" };
    // what rows give for each choice of Other
    self.mappingKindExamples = {
        existingProperty: 'order 4000123 has description "Replace pump seal"',
        implicitClass: 'planner "SMITH" on 40 orders: one node SMITH, the 40 orders point to it',
        subclassPerValue: 'type "PM02" on 500 orders: a class PM02 under the class, the 500 orders are PM02',
        splitValue: '"PM01, PM02" in one cell: two nodes PM01 and PM02, the order points to both',
        identifierClass: 'order 4000123 points to a node "tag 4000123", which has data of its own',
        unmapped: "nothing written",
    };
    self.exampleValueMaxLength = 30;
    self.mappingRanges = ["xsd:string", "xsd:integer", "xsd:decimal", "xsd:boolean", "xsd:date", "xsd:dateTime"];
    // the date formats util.getDateFromSLSformat reads
    self.mappingDateFormats = ["FR", "ISO", "USA", "EUR", "ISO-time"];
    // the separators after which util.hasURISeparator adds no "-" to the prefix
    self.uriSeparators = ["/", "-", "_", "#", ":"];
    self.propertySearchResultCount = 8;
    self.shownSampleValueCount = 3;
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
    // the legend keys of each node of the links graph, for a legend of what is shown
    self.linkLegendKeysByNodeId = {};
    // the assumption { class, superClass } each superclass node of the links graph stands for
    self.linkAssumptionByNodeId = {};
    // { databaseId, columnsByTable } of the database open, read by the forms of the changes made by hand
    self.databaseColumns = null;
    // the links graph, in canvas pixels: the distance between two rings of class trees around the center, the trees a
    // ring holds per ring of distance, the height of a superclass above its class, and the line of a link by its key
    self.linkRingSpacing = 500;
    self.linkRingCapacityStep = 6;
    self.linkSuperClassRise = 200;
    self.linkKeyDashes = { declared: false, ai: [8, 6], row: [2, 5] };
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
    // the start a reading of the model repeats, which the card already writes
    self.rowIsPrefixRegex = /^one row is\s+/i;
    // the associations join the other classes: they sit at the center, the master data around them, the important classes
    // outside
    self.linkRingOrder = ["eventsGuess", "masterDataGuess", "importantClassesGuess"];
    // the superclass decided for each class drawn on the links graph, by class label: the options assuming another one drop out
    self.decidedSuperClassByClass = {};

    self.onLoaded = function () {
        self.currentSource = MainController.currentSource;
        self.currentDatabaseId = null;
        self.currentGuess = null;
        Lineage_sources.loadedSources = {};
        UI.initMenuBar(function () {
            // the source beside Change source, as in MappingModeler
            Lineage_sources.loadSources(self.currentSource, function (error) {
                if (error) {
                    return MainController.errorAlert(error);
                }
                $("#Lineage_graphEditionButtons").hide();
            });
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
                userOptionPickedByColumns: self.currentMappingCard.userOptionByColumns,
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
        self.clearGuessGraph();
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
            ": its keys, master data, important classes, associations, relations, every decision taken and the chat?\nThe AI starts again from scratch, which takes several minutes.";
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

    // the color of a class by the step it comes from, the same in every graph; a class of the upper ontologies, proposed as
    // a superclass, is blue
    self.classKindColors = { masterDataGuess: "#2a9d8f", importantClassesGuess: "#e05780", eventsGuess: "#9b5de5", upperClass: "#00afef" };
    self.classKindLabels = { masterDataGuess: "Master data", importantClassesGuess: "Important class", eventsGuess: "Association", upperClass: "Class of the upper ontologies" };

    // the color of a class of steps 1 to 3 by its label, blue for any other class
    self.getClassKindColor = function (classLabel) {
        var classKindColor = self.classKindColors[self.getClassKind(classLabel)];
        return classKindColor;
    };

    // the key of classKindColors of a class by its label
    self.getClassKind = function (classLabel) {
        var classGuessKey = ["masterDataGuess", "importantClassesGuess", "eventsGuess"].find(function (guessKey) {
            var guess = self.currentAiKeys[guessKey];
            return guess && self.getGuessEntries(guess).some((guessEntry) => self.getDecidedClassLabel(guessEntry, guess) == classLabel);
        });
        var classKind = classGuessKey || "upperClass";
        return classKind;
    };

    // every node and edge the graphs of the steps may draw, by legend key, in the order of the legend
    self.getStepLegendItems = function () {
        var workflowStep = self.workflowSteps[self.currentStepIndex];
        var columnColor = self.getLegendItem("Column").color;
        var classEdgeColor = AIMappingColumnsGraph.getClassEdge("", "", "", "").color;
        var stepLegendItems = {
            entry: { section: "nodes", label: "Tables", color: columnColor, swatch: "box" },
            unclassifiedEntry: { section: "nodes", label: "Not classified", color: columnColor, swatch: "dashedFrame" },
            newClass: { section: "nodes", label: "Proposed class", color: self.classKindColors[workflowStep.guessKey], swatch: "box" },
            importedClass: { section: "nodes", label: "Existing class", color: self.classKindColors[workflowStep.guessKey], swatch: "frame" },
            table: { section: "nodes", label: "Table", color: AIMappingColumnsGraph.getVisjsTableNode("").color, swatch: "box" },
            mappingColumn: { section: "nodes", label: "Column", color: columnColor, swatch: "box" },
            rowIndex: { section: "nodes", label: "Row", color: self.getLegendItem("RowIndex").color, swatch: "triangle" },
            masterDataGuess: { section: "nodes", label: self.classKindLabels.masterDataGuess, color: self.classKindColors.masterDataGuess, swatch: "box" },
            importantClassesGuess: { section: "nodes", label: self.classKindLabels.importantClassesGuess, color: self.classKindColors.importantClassesGuess, swatch: "box" },
            eventsGuess: { section: "nodes", label: "Association", color: self.classKindColors.eventsGuess, swatch: "box" },
            associationClass: { section: "nodes", label: "Association", color: self.classKindColors.eventsGuess, swatch: "frame" },
            undecidedClass: { section: "nodes", label: "Undecided class", color: "#ffffff", swatch: "dashedFrame" },
            upperClass: { section: "nodes", label: "Upper class", color: self.classKindColors.upperClass, swatch: "box" },
            columnTarget: { section: "nodes", label: "Value class", color: self.getLegendItem("Class").color, swatch: "box" },
            valueColumn: { section: "nodes", label: "Value column", color: self.mappingValueColumnColor, swatch: "box" },
            valueGroup: { section: "nodes", label: "Group of values", color: self.mappingValueColumnColor, swatch: "ellipse" },
            rdfType: { section: "edges", label: "rdf:type", color: classEdgeColor, swatch: "line" },
            datatypeProperty: { section: "edges", label: "Datatype property", color: LegendOverlayWidget.defaultColors.edge.DatatypeProperty, swatch: "dashed" },
            implicitClasses: { section: "edges", label: "Implicit classes, decided later", color: classEdgeColor, swatch: "dotted" },
            subClassOf: { section: "edges", label: "Superclass", color: classEdgeColor, swatch: "line" },
            possibleSuperClass: { section: "edges", label: "Possible superclass", color: classEdgeColor, swatch: "dashed" },
            declared: { section: "edges", label: "Declared key", color: self.linkArrowStyle.color, swatch: "line" },
            ai: { section: "edges", label: "AI key", color: self.linkArrowStyle.color, swatch: "dashed" },
            row: { section: "edges", label: "Same row", color: self.linkArrowStyle.color, swatch: "dotted" },
        };
        return stepLegendItems;
    };

    // after the canvas of vis.js, which would cover a legend added before it
    self.renderStepLegend = function (legendKeys) {
        var legendItems = { nodes: [], edges: [] };
        var stepLegendItemEntries = Object.entries(self.getStepLegendItems());
        stepLegendItemEntries.forEach(function ([legendKey, stepLegendItem]) {
            if (!legendKeys.has(legendKey)) {
                return;
            }
            var legendItem = { label: stepLegendItem.label, color: stepLegendItem.color, swatch: stepLegendItem.swatch };
            if (stepLegendItem.section == "nodes") {
                legendItem.type = legendKey;
            } else {
                legendItem.cat = legendKey;
            }
            legendItems[stepLegendItem.section].push(legendItem);
        });
        // drawn again on each click of a class: a legend the user closed stays closed
        var shownLegend = LegendOverlayWidget.instances[self.graphDivId];
        var isLegendExpanded = shownLegend ? shownLegend.expanded : true;
        LegendOverlayWidget.destroy(self.graphDivId);
        LegendOverlayWidget.render(self.graphDivId, { title: "🔍 Legend", items: legendItems, initiallyExpanded: isLegendExpanded });
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
        if (workflowStep.isBuildStep) {
            return AIMappingBuild.showBuildPanel();
        }
        var guess = self.currentAiKeys[workflowStep.guessKey];
        if (guess) {
            return self.showGuess(guess);
        }
        self.clearGuessGraph();
        var runPanel = $("<div class='masterData-panel'>");
        runPanel.append($("<div>").text(workflowStep.runText), self.getStepRunButton("Guess the " + workflowStep.entryNoun, stepIndex));
        $("#aiMappingWorkflow_explanation").empty().append(runPanel);
    };

    self.clearGuessGraph = function () {
        if (self.guessGraph && self.guessGraph.network) {
            self.guessGraph.network.destroy();
        }
        self.guessGraph = null;
        LegendOverlayWidget.destroy(self.graphDivId);
    };

    // a step runs on the user's request; the steps before may still be reviewed
    self.getStepRunButton = function (buttonText, stepIndex, confirmationText) {
        var runButton = $("<button type='button' class='slsv-button-1'>").text(buttonText);
        runButton.on("click", function () {
            if (confirmationText && !confirm(confirmationText)) {
                return;
            }
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
                // the next steps the server kept up with a step guessed again
                Object.entries(result.nextGuesses || {}).forEach(([nextGuessKey, nextGuess]) => (self.currentAiKeys[nextGuessKey] = nextGuess));
                self.showStep(stepIndex);
            },
            error: function (error) {
                self.endProgress("");
                self.showExplanation("The " + workflowStep.entryNoun + " are not guessed: " + AIColumnClassSuggestion.getErrorText(error));
            },
        });
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
        // step 1 has no route of its own: the master data come with the key detection, run again by the reset
        if (self.currentStepIndex > 0) {
            var confirmationText = "Guess the " + workflowStep.entryNoun + " again? Every decision of this step is lost.";
            // steps 2 and 3 carry to the next ones, the relations and the mapping carry to none
            var isCarriedToNextSteps = workflowStep.guessKey == "importantClassesGuess" || workflowStep.guessKey == "eventsGuess";
            if (isCarriedToNextSteps) {
                confirmationText +=
                    "\nThe next steps are kept: a class gone leaves them, a new class gets its relations if its tables are named, without property yet. The mapping of step 5 is not updated.";
            }
            explanation.append(self.getStepRunButton("Guess them again, their decisions are lost", self.currentStepIndex, confirmationText));
        }
        if (workflowStep.guessKey == "linksGuess") {
            return self.showLinksExplanation(explanation);
        }
        if (workflowStep.guessKey == "mappingGuess") {
            return self.showMappingExplanation(explanation);
        }
        explanation.prepend(
            $("<div class='masterData-note'>").append(
                $("<div>").text("- Click: decide the class"),
                $("<div>").text("- Right click: change, rename, remove"),
                $("<div>").text("- Undecided: kept for later"),
            ),
        );
        explanation.append($("<div>").append($("<b>").text("Domain: "), $("<span>").text(self.currentAiKeys.masterDataGuess.domain)));
        $("#aiMappingWorkflow_explanation").empty().append(explanation);
        self.drawGuessGraph();
        AIMappingWorkflowChat.show();
    };

    // the explanation panel of the links step: the classes of steps 1 to 3 with their superclasses, the links between them
    self.showLinksExplanation = function (explanation) {
        explanation.prepend(
            $("<div class='masterData-note'>").append(
                $("<div>").text("- Click a class: it alone with its relations"),
                $("<div>").text("- Click outside: all classes again"),
                $("<div>").text("- Click a relation: its card"),
                $("<div>").text("- Right click a relation: change its property, remove it"),
                $("<div>").text("- Thick arrow: property chosen"),
            ),
        );
        explanation.append($("<div>").append($("<b>").text("Domain: "), $("<span>").text(self.currentAiKeys.masterDataGuess.domain)));
        var classesWithoutTables = (self.currentAiKeys.eventsGuess || {}).classesWithoutTables || [];
        if (classesWithoutTables.length > 0) {
            explanation.append($("<div class='masterData-note'>").text("No table of the database was found for " + classesWithoutTables.join(", ") + ": no relation reaches them."));
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
        // only the mapping step has its legend, its list and its back button over the graph
        LegendOverlayWidget.destroy(self.graphDivId);
        $("#aiMappingWorkflow_mappingList, #aiMappingWorkflow_mappingBack").remove();
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
        var legendKeys = new Set(["entry"]);
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
                legendKeys.add("unclassifiedEntry");
                return;
            }
            legendKeys.add(isImportedClass ? "importedClass" : "newClass");
            legendKeys.add("rdfType");
            var classLabel = isImportedClass
                ? self.getClassLabel(classification.classSource, classification.classLabel)
                : self.getClassLabel(self.currentSource, classification.classLabel || guessEntry.label);
            var classNodeId = entryNodeId + "|class";
            self.entryByNodeId[classNodeId] = guessEntry;
            nodes.push({
                id: classNodeId,
                label: classLabel,
                shape: classLegendItem.shape,
                color: self.classKindColors[self.workflowSteps[self.currentStepIndex].guessKey],
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
                    color: self.classKindColors.upperClass,
                    x: parentX,
                    y: -200,
                    data: { id: parentOption.parentId, label: parentLabel, type: "Class" },
                });
                var isApplied = decision.superClassId == parentOption.parentId;
                legendKeys.add("upperClass");
                legendKeys.add(isApplied ? "subClassOf" : "possibleSuperClass");
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
                    color: self.classKindColors.upperClass,
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
            if (self.guessGraph == guessGraph) {
                self.renderStepLegend(legendKeys);
            }
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
                    guessKey: guessKey,
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
        self.linkLegendKeysByNodeId = {};
        self.linkAssumptionByNodeId = {};
        linkClasses.forEach(function (linkClass) {
            var classNodeId = self.linkNodeIdByLabel[linkClass.label];
            self.linkClassNodeIdByNodeId[classNodeId] = classNodeId;
            var classKindKey = linkClass.isEvent ? "associationClass" : linkClass.guessKey;
            self.linkLegendKeysByNodeId[classNodeId] = linkClass.isDecided ? [classKindKey] : [classKindKey, "undecidedClass"];
            var classPosition = positionByClass[linkClass.label];
            nodes.push({
                id: classNodeId,
                label: linkClass.nodeLabel,
                shape: classLegendItem.shape,
                color: self.classKindColors[linkClass.guessKey],
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
                self.linkAssumptionByNodeId[superClassNodeId] = { class: linkClass.label, superClass: parentOption.parentLabel };
                self.linkClassNodeIdByNodeId[superClassNodeId] = classNodeId;
                self.linkLegendKeysByNodeId[superClassNodeId] = ["upperClass", linkClass.isSuperClassDecided ? "subClassOf" : "possibleSuperClass"];
                var superClassLabel = self.getClassLabel(parentOption.parentSource, parentOption.parentLabel);
                nodes.push({
                    id: superClassNodeId,
                    label: superClassLabel,
                    shape: classLegendItem.shape,
                    color: self.classKindColors.upperClass,
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
            linkArrow.label = propertyText + (arrowLinkCount > 1 ? ", " + arrowLinkCount + " relations" : "");
            var keyKind = self.linkKeyKindOrder.find((orderedKeyKind) => linkArrow.keyKinds.indexOf(orderedKeyKind) > -1);
            linkArrow.keyKind = keyKind;
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
        var legendKeys = new Set();
        var arrowUpdates = self.linkArrows.map(function (linkArrow) {
            var fromClassNodeId = self.linkClassNodeIdByNodeId[linkArrow.from];
            var toClassNodeId = self.linkClassNodeIdByNodeId[linkArrow.to];
            var isOfClass = Boolean(classNodeId) && (fromClassNodeId == classNodeId || toClassNodeId == classNodeId);
            if (isOfClass) {
                shownClassNodeIds.push(fromClassNodeId, toClassNodeId);
            }
            if (!classNodeId || isOfClass) {
                legendKeys.add(linkArrow.keyKind);
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
        var reachedClassNodeIds = shownClassNodeIds
            ? shownClassNodeIds.filter((shownClassNodeId, shownIndex) => shownClassNodeId != classNodeId && shownClassNodeIds.indexOf(shownClassNodeId) == shownIndex)
            : [];
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
        shownNodeIds.forEach((shownNodeId) => self.linkLegendKeysByNodeId[shownNodeId].forEach((legendKey) => legendKeys.add(legendKey)));
        self.renderStepLegend(legendKeys);
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

    // what carries a link in the database, in one line: the join of a foreign key with whether the AI found its keys,
    // the row holding both classes, or the columns of the row carrying an implicit association
    self.getLinkKeyText = function (link) {
        if (link.sameRowTable) {
            return "same row of " + link.sameRowTable;
        }
        if (link.rowColumns) {
            return "columns " + link.rowColumns.join(", ") + " of the row of " + link.toClass;
        }
        var foreignKey = link.foreignKey;
        var columnMatches = foreignKey.columns.map((column, columnIndex) => foreignKey.table + "." + column + " = " + foreignKey.referencedTable + "." + foreignKey.referencedColumns[columnIndex]);
        var aiPrimaryKeys = (self.currentAiKeys && self.currentAiKeys.primaryKeys) || [];
        var isAiPrimaryKey = aiPrimaryKeys.some((primaryKey) => primaryKey.table == foreignKey.referencedTable && primaryKey.columns.join(",") == foreignKey.referencedColumns.join(","));
        var keyNature = (isAiPrimaryKey ? "AI PK" : "PK") + " / " + (foreignKey.foundInData ? "AI FK" : "FK");
        var keyText = columnMatches.join(", ") + " (" + keyNature + ")";
        return keyText;
    };

    // how many objects of each class the other holds, read both ways
    self.getLinkCardinalityFields = function (link) {
        var cardinalityFields = [
            ["Per " + link.fromClass, link.cardinality ? link.cardinality + " " + link.toClass : null],
            ["Per " + link.toClass, link.inverseCardinality ? link.inverseCardinality + " " + link.fromClass : null],
        ];
        return cardinalityFields;
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
        var clickedArrow = self.linkArrows.find((linkArrow) => linkArrow.id == clickedNodeOrEdgeId);
        var arrowAssumption = self.linkAssumptionByNodeId[clickedArrow.from] || self.linkAssumptionByNodeId[clickedArrow.to] || null;
        self.entryCard = null;
        self.currentLinkCard = { link: edgeLinks[0], edgeLinks: edgeLinks, assumption: arrowAssumption };
        self.renderLinkCard();
    };

    // the options of a link its arrow draws: those assuming the superclass the arrow starts from or ends on, or none
    self.getArrowLinkOptions = function (link, arrowAssumption) {
        var visibleOptions = self.getVisibleLinkOptions(link);
        var arrowOptions = visibleOptions.filter(function (option) {
            if (!arrowAssumption || !option.assumes) {
                return !arrowAssumption && !option.assumes;
            }
            var isArrowAssumption = option.assumes.class == arrowAssumption.class && option.assumes.superClass == arrowAssumption.superClass;
            return isArrowAssumption;
        });
        return arrowOptions;
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
        var arrowAssumption = self.currentLinkCard.assumption;
        var cardDiv = $("#aiMappingWorkflow_card");
        cardDiv.empty();
        var headerPanel = $("<div class='masterData-panel'>");
        var getClassChip = function (classLabel) {
            var isAssumedClass = arrowAssumption && arrowAssumption.class == classLabel;
            var classChip = $("<span class='masterData-class'>").text(classLabel + (isAssumedClass ? " as " + arrowAssumption.superClass : ""));
            return classChip;
        };
        // an arrow drawing several links, one per key: each has its own card
        var edgeLinks = self.currentLinkCard.edgeLinks || [link];
        var keysDiv = $("<div>");
        edgeLinks.forEach(function (edgeLink) {
            if (edgeLinks.length == 1) {
                keysDiv.append($("<div>").text(self.getLinkKeyText(edgeLink)));
                return;
            }
            var keyButton = $("<button type='button' class='masterData-option'>")
                .toggleClass("masterData-selected", edgeLink == link)
                .text(self.getLinkKeyText(edgeLink));
            keyButton.on("click", function () {
                self.currentLinkCard = { link: edgeLink, edgeLinks: edgeLinks, assumption: self.currentLinkCard.assumption };
                self.renderLinkCard();
            });
            keysDiv.append(keyButton);
        });
        headerPanel.append(
            $("<div class='masterData-optionTitle'>").append(getClassChip(link.fromClass), $("<span>").text("→"), getClassChip(link.toClass)),
            keysDiv,
            self.getFieldsTable(self.getLinkCardinalityFields(link).concat([["Participation in", link.viaEvent || null]])),
        );
        cardDiv.append(headerPanel);
        var optionsDiv = $("<div class='masterData-stepContent'>");
        optionsDiv.append($("<div class='masterData-step'>").text("Property"));
        var visibleOptions = self.getArrowLinkOptions(link, arrowAssumption);
        visibleOptions.forEach(function (option) {
            var isSelected = Boolean(link.decision) && option.propertyIri == link.decision.propertyIri;
            var probabilityFill = $("<div class='masterData-probabilityFill'>").css("width", option.probability + "%");
            var probability = $("<div class='masterData-probability'>").append($("<div class='masterData-probabilityBar'>").append(probabilityFill), $("<span>").text(option.probability + "%"));
            var optionTitle = self.getClassLabel(option.propertySource, option.propertyLabel) + (option.inverse ? " (inverse)" : "");
            var optionButton = $("<button type='button' class='masterData-option'>").toggleClass("masterData-selected", isSelected);
            optionButton.append($("<div class='masterData-optionTitle'>").append($("<span>").text(optionTitle), probability));
            optionButton.on("click", function () {
                link.decision = { propertyIri: option.propertyIri };
                self.applyLinkDecision(link, { propertyIri: option.propertyIri });
            });
            var moreDetails = $("<details>").append(
                $("<summary>").text("More details"),
                self.getFieldsTable([
                    ["Reason", option.reason],
                    ["Definition", option.definition],
                ]),
            );
            optionsDiv.append($("<div class='masterData-readingBox'>").append(optionButton, moreDetails));
        });
        if (visibleOptions.length == 0) {
            var noOptionText = link.hasNoAllowedProperty
                ? "No property of the upper ontologies has a domain and a range fitting these two classes: the superclass of one of them is likely wrong."
                : "No property of the upper ontologies was proposed: right click the relation to choose one, or ask the chat.";
            optionsDiv.append($("<div class='masterData-note'>").text(noOptionText));
        }
        cardDiv.append(optionsDiv);
        var footer = $("<div class='masterData-footer'>");
        // the choice may be an option of another arrow of the link, under another superclass
        var decidedOption = link.decision ? self.getVisibleLinkOptions(link).find((option) => option.propertyIri == link.decision.propertyIri) : null;
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
                return MainController.errorAlert("The relations guess of " + databaseId + " is no longer in the mapping: open the database again.");
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
                    self.currentLinkCard = { link: savedLink, edgeLinks: arrowLinks, assumption: self.currentLinkCard.assumption };
                    self.renderLinkCard();
                    self.drawWorkflowTabs();
                    UI.message(CommonBotFunctions.escapeHtml("Choice saved for the relation"));
                },
                error: function (saveError) {
                    MainController.errorAlert(saveError);
                },
            });
        });
    };

    self.showMappingExplanation = function (explanation) {
        var mappingGuess = self.currentGuess;
        explanation.prepend(
            $("<div class='masterData-note'>").append(
                $("<div>").text("- Click a class: check its mapping, then apply"),
                $("<div>").text("- Hover a column: what the data shows"),
                $("<div>").text("- Hover its ?: why the AI chose it"),
            ),
        );
        explanation.append($("<div>").append($("<b>").text("Domain: "), $("<span>").text(self.currentAiKeys.masterDataGuess.domain)));
        if (mappingGuess.classesWithoutTables.length > 0) {
            explanation.append($("<div class='masterData-note'>").text("No table of the database was found for " + mappingGuess.classesWithoutTables.join(", ") + ": they have no mapping."));
        }
        $("#aiMappingWorkflow_explanation").empty().append(explanation);
        self.drawGuessGraph();
        AIMappingWorkflowChat.show();
    };

    // the list of the classes while none is open, the mapping of the class open otherwise
    self.drawMappingGraph = function () {
        if (self.currentMappingCard) {
            return self.drawMappingClassGraph();
        }
        if (self.guessGraph && self.guessGraph.network) {
            self.guessGraph.network.destroy();
        }
        self.guessGraph = null;
        // the class with the most columns to choose first
        var sortedMappings = self.currentGuess.classMappings.slice();
        sortedMappings.sort(
            (firstMapping, secondMapping) => secondMapping.columnMappings.length - firstMapping.columnMappings.length || firstMapping.classLabel.localeCompare(secondMapping.classLabel),
        );
        var headerCells = ["Class", "Columns to choose", "Table", "Mapping"].map((headerText) => $("<th>").text(headerText));
        var listTable = $("<table class='masterData-mappingList'>").append($("<tr>").append(headerCells));
        sortedMappings.forEach(function (classMapping) {
            var classRow = $("<tr>").append(
                $("<td>").append($("<span class='masterData-class'>").text(self.getClassLabel(self.currentSource, classMapping.classLabel))),
                $("<td>").text(classMapping.isImplicit ? "one per row" : classMapping.columnMappings.length),
                $("<td>").text(classMapping.table),
                $("<td>").text(classMapping.decision ? "applied" : "not applied"),
            );
            classRow.on("click", function () {
                self.showMappingCard({ data: { type: "Class", label: classMapping.classLabel } });
            });
            listTable.append(classRow);
        });
        $("#" + self.graphDivId).append($("<div id='aiMappingWorkflow_mappingList'>").append(listTable));
    };

    // the label of an option, its property or else its kind
    self.getMappingOptionName = function (option) {
        var propertyText = { existingProperty: self.getClassLabel(option.propertySource, option.propertyLabel), newProperty: option.newPropertyName }[option.kind];
        var optionName = propertyText || self.mappingKindLabels[option.kind];
        return optionName;
    };

    // the columns the card and the graph show, by table then by group: the columns of the class's own table, then the
    // columns another class maps onto it, read only there; the columns left out listed apart, the ones of kind other only
    // counted, the links of step 4 being among them
    self.getMappingTableViews = function (cardState) {
        var classMapping = cardState.classMapping;
        var tableViewByTable = {};
        var tableViews = [];
        var getTableView = function (table) {
            if (!tableViewByTable[table]) {
                tableViewByTable[table] = { table: table, keyColumns: [], groupByKey: {}, groups: [] };
                tableViews.push(tableViewByTable[table]);
            }
            return tableViewByTable[table];
        };
        var addMappingColumn = function (tableView, mappingColumn) {
            var groupKey = self.getMappingGroupKey(mappingColumn.option, classMapping.classLabel);
            if (!tableView.groupByKey[groupKey]) {
                var isOnOtherClass = groupKey.indexOf("on|") == 0;
                var groupTitle = isOnOtherClass ? "On " + self.getClassLabel(self.currentSource, mappingColumn.option.onClass) : self.mappingGroupTitles[groupKey];
                tableView.groupByKey[groupKey] = { groupKey: groupKey, title: groupTitle, mappingColumns: [] };
                tableView.groups.push(tableView.groupByKey[groupKey]);
            }
            var group = tableView.groupByKey[groupKey];
            // several classes of one table may map the same column the same way
            var optionName = self.getMappingOptionName(mappingColumn.option);
            var isShownAlready = group.mappingColumns.some((shownColumn) => shownColumn.columnsKey == mappingColumn.columnsKey && self.getMappingOptionName(shownColumn.option) == optionName);
            if (!isShownAlready) {
                group.mappingColumns.push(mappingColumn);
            }
        };
        var ownTableView = getTableView(classMapping.table);
        ownTableView.keyColumns = cardState.instance.identifierColumns;
        var otherKindCount = 0;
        var leftOutColumnsKeys = [];
        var mappedColumnsKeys = classMapping.columnMappings.map((columnMapping) => columnMapping.columns.join(", "));
        var userColumnsKeys = Object.keys(cardState.userOptionByColumns);
        var userOnlyColumnsKeys = userColumnsKeys.filter((columnsKey) => mappedColumnsKeys.indexOf(columnsKey) < 0);
        var cardColumnsKeys = mappedColumnsKeys.concat(userOnlyColumnsKeys);
        cardColumnsKeys.forEach(function (columnsKey) {
            var columnMapping = classMapping.columnMappings.find((candidateMapping) => candidateMapping.columns.join(", ") == columnsKey);
            var option = self.getPickedMappingOption(cardState, columnsKey, columnMapping);
            if (option.kind == "unmapped") {
                leftOutColumnsKeys.push(columnsKey);
                return;
            }
            if (option.kind == "other") {
                otherKindCount += 1;
                return;
            }
            addMappingColumn(ownTableView, { columnsKey: columnsKey, columnMapping: columnMapping, option: option, ownerClassLabel: null });
        });
        classMapping.unmappedColumns.forEach(function (unmappedColumn) {
            if (!cardState.userOptionByColumns[unmappedColumn.column]) {
                leftOutColumnsKeys.push(unmappedColumn.column);
            }
        });
        self.addForeignMappingColumns(classMapping.classLabel, getTableView, addMappingColumn);
        var getGroupRank = function (group) {
            var groupRank = self.mappingGroupOrder.indexOf(group.groupKey);
            if (groupRank > -1) {
                return groupRank;
            }
            var lastRank = group.groupKey == "implicit" ? self.mappingGroupOrder.length + 1 : self.mappingGroupOrder.length;
            return lastRank;
        };
        var shownTableViews = tableViews.filter((tableView) => tableView.groups.length > 0 || tableView == ownTableView);
        shownTableViews.forEach((tableView) => tableView.groups.sort((firstGroup, secondGroup) => getGroupRank(firstGroup) - getGroupRank(secondGroup)));
        var mappingView = { tableViews: shownTableViews, otherKindCount: otherKindCount, leftOutColumnsKeys: leftOutColumnsKeys };
        return mappingView;
    };

    // the columns other classes map onto this one, under their table, as their card picks them; a column of kind other
    // pointing to this class is how the rows of its table reach it, every such column kept, sorted
    self.addForeignMappingColumns = function (classLabel, getTableView, addMappingColumn) {
        self.currentGuess.classMappings.forEach(function (otherMapping) {
            if (otherMapping.classLabel == classLabel) {
                return;
            }
            otherMapping.columnMappings.forEach(function (columnMapping) {
                var option = columnMapping.options[columnMapping.decision ? columnMapping.decision.optionIndex : 0];
                if (!option || option.onClass != classLabel || option.kind == "unmapped") {
                    return;
                }
                var otherTableView = getTableView(otherMapping.table);
                if (option.kind != "other") {
                    addMappingColumn(otherTableView, { columnsKey: columnMapping.columns.join(", "), columnMapping: columnMapping, option: option, ownerClassLabel: otherMapping.classLabel });
                    return;
                }
                columnMapping.columns.forEach(function (column) {
                    if (otherTableView.keyColumns.indexOf(column) < 0) {
                        otherTableView.keyColumns.push(column);
                        otherTableView.keyColumns.sort();
                    }
                });
            });
        });
    };

    // the group of a column by the value it gives: its range for a property, implicit classes for a column becoming a thing
    self.getMappingGroupKey = function (option, classLabel) {
        var isProperty = option.kind == "existingProperty" || option.kind == "newProperty";
        if (!isProperty) {
            return "implicit";
        }
        if (option.onClass && option.onClass != classLabel) {
            return "on|" + option.onClass;
        }
        var groupKey = self.mappingGroupKeysByRange[option.range] || "text";
        return groupKey;
    };

    // the class open in levels, as the card groups it: the class, the Id of each table typed by it, every value column on
    // one line joined to its Id by its property, the groups of each table below; implicit classes are one node, decided later
    self.drawMappingClassGraph = function (cardMappingView) {
        var cardState = self.currentMappingCard;
        var classMapping = cardState.classMapping;
        var mappingView = cardMappingView || self.getMappingTableViews(cardState);
        var layout = self.mappingGraphLayout;
        var propertyColor = LegendOverlayWidget.defaultColors.edge.DatatypeProperty;
        var columnLegendItem = self.getLegendItem("Column");
        var rowIndexLegendItem = self.getLegendItem("RowIndex");
        var classEdgeColor = AIMappingColumnsGraph.getClassEdge("", "", "", "").color;
        var identifierColumnsKey = cardState.instance.identifierColumns.join(", ");
        var nodes = [];
        var edges = [];
        var keyNodes = [];
        var legendKeys = new Set(["rdfType", self.getClassKind(classMapping.classLabel)]);
        var classNodeId = "class|" + classMapping.classLabel;
        var nextX = 0;
        var columnIndex = 0;
        // the right edge of the last node of each row, a long label pushing the next node of its row further
        var rowRightXs = [];
        mappingView.tableViews.forEach(function (tableView) {
            var tableStartX = nextX;
            var tableEndX = nextX;
            var keyNodeId = "key|" + tableView.table;
            tableView.groups.forEach(function (group) {
                var groupNodeId = "group|" + tableView.table + "|" + group.groupKey;
                if (group.groupKey == "implicit") {
                    nodes.push({
                        id: groupNodeId,
                        label: group.title + ", " + group.mappingColumns.length,
                        shape: "ellipse",
                        color: self.mappingValueColumnColor,
                        shadow: true,
                        x: nextX + layout.groupGap,
                        y: layout.groupY,
                    });
                    tableEndX = nextX + layout.groupGap;
                    edges.push({ from: keyNodeId, to: groupNodeId, dashes: [2, 4], color: classEdgeColor });
                    legendKeys.add("valueGroup");
                    legendKeys.add("implicitClasses");
                    nextX += layout.columnSpacing + 2 * layout.groupGap;
                    return;
                }
                var groupColumnXs = [];
                group.mappingColumns.forEach(function (mappingColumn) {
                    var propertyName = self.getMappingOptionName(mappingColumn.option);
                    var propertyEdge = { from: keyNodeId, dashes: true, color: propertyColor, font: { color: propertyColor }, arrows: { to: { enabled: true, type: "arrow" } } };
                    // the Id column giving a property of its own instance
                    if (!mappingColumn.ownerClassLabel && mappingColumn.columnsKey == identifierColumnsKey) {
                        propertyEdge.to = keyNodeId;
                        propertyEdge.label = propertyName;
                        edges.push(propertyEdge);
                        legendKeys.add("datatypeProperty");
                        return;
                    }
                    // two classes may map one column of a table with two properties: one node each
                    var columnNodeId = "column|" + tableView.table + "|" + mappingColumn.columnsKey + "|" + columnIndex;
                    var columnTitle = mappingColumn.ownerClassLabel ? "chosen on the " + mappingColumn.ownerClassLabel + " card" : "";
                    var columnRow = columnIndex % layout.columnRowCount;
                    var columnHalfWidth = (Math.max(mappingColumn.columnsKey.length, propertyName.length) * layout.labelCharWidth) / 2;
                    var rowRightX = rowRightXs[columnRow] === undefined ? nextX : rowRightXs[columnRow] + columnHalfWidth + layout.columnMargin;
                    var columnX = Math.max(nextX, rowRightX);
                    rowRightXs[columnRow] = columnX + columnHalfWidth;
                    nodes.push({
                        id: columnNodeId,
                        label: mappingColumn.columnsKey + "\n<i>" + propertyName + "</i>",
                        title: columnTitle,
                        shape: "box",
                        color: self.mappingValueColumnColor,
                        font: { multi: "html", ital: { color: propertyColor } },
                        x: columnX,
                        y: layout.columnY + columnRow * layout.columnRowOffset,
                    });
                    propertyEdge.to = columnNodeId;
                    edges.push(propertyEdge);
                    edges.push({ from: columnNodeId, to: groupNodeId, color: self.mappingGroupEdgeColor });
                    groupColumnXs.push(columnX);
                    tableEndX = columnX;
                    columnIndex += 1;
                    nextX = columnX + layout.columnSpacing;
                });
                if (groupColumnXs.length == 0) {
                    return;
                }
                nodes.push({
                    id: groupNodeId,
                    label: group.title,
                    shape: "ellipse",
                    color: self.mappingValueColumnColor,
                    shadow: true,
                    x: (groupColumnXs[0] + groupColumnXs[groupColumnXs.length - 1]) / 2,
                    y: layout.groupY,
                });
                nextX += layout.groupGap;
                legendKeys.add("valueColumn");
                legendKeys.add("valueGroup");
                legendKeys.add("datatypeProperty");
            });
            // a table whose rows have no Id column gives one instance per row
            var hasKeyColumns = tableView.keyColumns.length > 0;
            var isOwnTable = tableView.table == classMapping.table;
            var keyText = hasKeyColumns ? tableView.keyColumns.join(", ") : isOwnTable ? "row" : "no column found";
            var keyLegendItem = hasKeyColumns || !isOwnTable ? columnLegendItem : rowIndexLegendItem;
            var keyNode = {
                id: keyNodeId,
                label: "<i>table " + tableView.table + "</i>\n<b>" + keyText + "</b>",
                title: isOwnTable ? self.getUriExample(cardState.instance, null) : "",
                shape: keyLegendItem.shape,
                color: keyLegendItem.color,
                font: { multi: "html" },
                x: (tableStartX + tableEndX) / 2,
                y: layout.keyY,
            };
            nodes.push(keyNode);
            keyNodes.push(keyNode);
            legendKeys.add(hasKeyColumns || !isOwnTable ? "mappingColumn" : "rowIndex");
            edges.push(AIMappingColumnsGraph.getClassEdge(keyNodeId, classNodeId, "", "rdf:type"));
            nextX += layout.tableGap;
        });
        var classX = (keyNodes[0].x + keyNodes[keyNodes.length - 1].x) / 2;
        nodes.push({
            id: classNodeId,
            label: self.getClassLabel(self.currentSource, classMapping.classLabel),
            shape: self.getLegendItem("Class").shape,
            color: self.getClassKindColor(classMapping.classLabel),
            x: classX,
            y: layout.classY,
        });
        if (self.guessGraph && self.guessGraph.network) {
            self.guessGraph.network.destroy();
        }
        $("#aiMappingWorkflow_mappingList").remove();
        var graphOptions = { visjsOptions: { physics: { enabled: false }, interaction: { hover: true } } };
        var guessGraph = new VisjsGraphClass(self.graphDivId, { nodes: nodes, edges: edges }, graphOptions);
        self.guessGraph = guessGraph;
        guessGraph.draw(function () {
            if (self.guessGraph != guessGraph) {
                return;
            }
            var backButton = $("<button type='button' id='aiMappingWorkflow_mappingBack' class='masterData-applyButton'>").text("Back to the classes");
            backButton.on("click", function () {
                self.currentMappingCard = null;
                $("#aiMappingWorkflow_card").empty();
                self.drawGuessGraph();
            });
            $("#aiMappingWorkflow_mappingBack").remove();
            $("#" + self.graphDivId).append(backButton);
            self.renderStepLegend(legendKeys);
        });
    };

    self.showMappingCard = function (node) {
        if (!node || !node.data || node.data.type != "Class") {
            return;
        }
        var classMapping = self.currentGuess.classMappings.find((candidateMapping) => candidateMapping.classLabel == node.data.label);
        self.currentMappingCard = self.getMappingCardState(classMapping);
        self.renderMappingCard();
    };

    // what the card shows picked: the applied mapping, else the proposal of the AI, its first option per column. An option
    // the user makes in Other waits in userOptionByColumns until Apply
    self.getMappingCardState = function (classMapping) {
        // a class the model failed on has no instance yet
        var emptyInstance = { identifierColumns: [], uriType: "fromLabel", prefixURI: "", suffixURI: "", labelColumn: null, reason: "" };
        var appliedInstance = classMapping.decision ? classMapping.decision.instance : classMapping.instance || emptyInstance;
        var optionIndexByColumns = {};
        classMapping.columnMappings.forEach(function (columnMapping) {
            optionIndexByColumns[columnMapping.columns.join(", ")] = columnMapping.decision ? columnMapping.decision.optionIndex : 0;
        });
        var cardState = {
            classMapping: classMapping,
            instance: JSON.parse(JSON.stringify(appliedInstance)),
            optionIndexByColumns: optionIndexByColumns,
            userOptionByColumns: {},
            openedColumnsKey: null,
        };
        return cardState;
    };

    // the option a column takes on the card: the one the user made, else the AI option picked
    self.getPickedMappingOption = function (cardState, columnsKey, columnMapping) {
        var userOption = cardState.userOptionByColumns[columnsKey];
        if (userOption) {
            return userOption;
        }
        var pickedOption = columnMapping ? columnMapping.options[cardState.optionIndexByColumns[columnsKey]] : null;
        return pickedOption;
    };

    // what the data shows of a column, as the server measured it
    self.getColumnEvidenceText = function (evidence) {
        if (!evidence) {
            return "";
        }
        var frequentTexts = evidence.frequentValues.map((frequentValue) => frequentValue.value + " (" + frequentValue.rowCount + ")");
        var shownSampleValues = evidence.sampleValues.slice(0, self.shownSampleValueCount);
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
        tableColumns.forEach((tableColumn) => columnSelect.append($("<option>").val(tableColumn).text(tableColumn)));
        columnSelect.val(selectedColumn || "");
        return columnSelect;
    };

    // the URI one row gives, built as triplesMaker builds it: the graph, the prefix with a "-" when it ends with no
    // separator, the identifier value, the suffix
    self.getUriExample = function (instance, identifierEvidence) {
        if (instance.uriType == "blankNode") {
            return "_:b1";
        }
        var graphUri = Config.sources[self.currentSource].graphUri;
        var baseUri = graphUri.endsWith("/") ? graphUri : graphUri + "/";
        // its randomIdentifier branch returns an undefined blank node before building any URI
        if (instance.uriType == "randomIdentifier") {
            return "no URI: triplesMaker.js builds none for randomIdentifier today";
        }
        var uriExample = baseUri + self.getUriPrefixText(instance.prefixURI) + self.getUriSampleValue(instance, identifierEvidence) + (instance.suffixURI || "");
        return uriExample;
    };

    // the prefix of a URI with a "-" when it ends with no separator
    self.getUriPrefixText = function (prefixUri) {
        var prefix = prefixUri || "";
        var hasNoSeparator = prefix && self.uriSeparators.indexOf(prefix.slice(-1)) < 0;
        var prefixText = hasNoSeparator ? prefix + "-" : prefix;
        return prefixText;
    };

    // the value one row gives the URI, its Id columns named when the data shows no sample
    self.getUriSampleValue = function (instance, identifierEvidence) {
        var hasSample = identifierEvidence && identifierEvidence.sampleValues.length > 0;
        var sampleValue = hasSample ? common.formatStringForTriple(String(identifierEvidence.sampleValues[0]), true) : "{" + instance.identifierColumns.join(", ") + "}";
        return sampleValue;
    };

    // the card of one class: how one row gives one instance, then one line per column, the columns left out folded; what the
    // data shows and the reasons of the AI on hover
    self.renderMappingCard = function () {
        var cardState = self.currentMappingCard;
        var classMapping = cardState.classMapping;
        var cardDiv = $("#aiMappingWorkflow_card");
        cardDiv.empty();
        var headerPanel = $("<div class='masterData-panel'>");
        headerPanel.append(
            $("<div class='masterData-optionTitle'>").text(self.getClassLabel(self.currentSource, classMapping.classLabel)),
            $("<div>").text("Table " + classMapping.table + (classMapping.otherTables.length > 0 ? ", also " + classMapping.otherTables.join(", ") : "")),
        );
        if (classMapping.error) {
            headerPanel.append($("<div class='masterData-note'>").text("The model gave no mapping for this class: " + classMapping.error));
        }
        var applyButton = $("<button type='button' class='masterData-applyButton'>").text("Apply");
        applyButton.on("click", function () {
            var columnChoices = [];
            for (const [columnsKey, optionIndex] of Object.entries(cardState.optionIndexByColumns)) {
                if (!cardState.userOptionByColumns[columnsKey]) {
                    columnChoices.push({ columns: columnsKey, optionIndex: optionIndex });
                }
            }
            for (const [columnsKey, userOption] of Object.entries(cardState.userOptionByColumns)) {
                columnChoices.push({ columns: columnsKey, option: userOption });
            }
            self.changeGuessByHand("apply_class_mapping", { classLabel: classMapping.classLabel, instance: cardState.instance, columnChoices: columnChoices });
        });
        var undoButton = $("<button type='button' class='masterData-applyButton'>").text("Undo the choice");
        undoButton.prop("disabled", !classMapping.decision);
        undoButton.on("click", function () {
            self.changeGuessByHand("undo_class_mapping", { classLabel: classMapping.classLabel });
        });
        var writtenText = classMapping.decision ? "applied, " + classMapping.columnMappings.length + " columns chosen" : "nothing applied yet";
        var footer = $("<div class='masterData-footer'>");
        footer.append(
            $("<div>").append($("<span class='masterData-writtenLabel'>").text("Mapping"), $("<span>").text(writtenText)),
            $("<div class='masterData-footerButtons'>").append(undoButton, applyButton),
        );
        var mappingView = self.getMappingTableViews(cardState);
        cardDiv.append(headerPanel, self.getMappingInstanceDiv(cardState), self.getMappingColumnsDiv(cardState, mappingView), footer);
        self.drawMappingClassGraph(mappingView);
    };

    // the identifier, the URI and the label of the instance, each changeable before Apply; the URI reads as the row gives
    // it: the graph, the prefix typed, the value of the Id, the suffix
    self.getMappingInstanceDiv = function (cardState) {
        var classMapping = cardState.classMapping;
        var instance = cardState.instance;
        var instanceDiv = $("<div class='masterData-stepContent'>").append(
            $("<div class='masterData-step'>").append(
                $("<span>").text("Instance "),
                $("<span class='masterData-help'>")
                    .text("?")
                    .attr("title", instance.reason || ""),
            ),
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
        var identifierEvidence = evidenceByColumn[instance.identifierColumns[0]];
        identifierSelect.attr("title", self.getColumnEvidenceText(identifierEvidence));
        identifierSelect.on("change", function () {
            var selectedIdentifier = identifierSelect.val();
            instance.identifierColumns = selectedIdentifier ? selectedIdentifier.split(", ") : [];
            self.renderMappingCard();
        });
        var graphUri = Config.sources[self.currentSource].graphUri;
        var graphUriSegments = graphUri.split("/");
        var graphUriLastSegments = graphUriSegments.filter((uriSegment) => uriSegment);
        var uriBase = $("<span class='masterData-uriBase'>")
            .text(".../" + graphUriLastSegments[graphUriLastSegments.length - 1] + "/")
            .attr("title", graphUri);
        var prefixInput = $("<input type='text' size='10' placeholder='prefix'>").val(instance.prefixURI);
        var prefixSeparator = $("<span class='masterData-uriBase'>");
        var uriValue = $("<span class='masterData-uriValue'>")
            .css("background", self.getLegendItem("Column").color)
            .text(self.getUriSampleValue(instance, identifierEvidence))
            .attr("title", "value of " + identifierText);
        var suffixInput = $("<input type='text' size='6' placeholder='suffix'>").val(instance.suffixURI || "");
        var uriBuilder = $("<div class='masterData-uriBuilder'>").append(uriBase, prefixInput, prefixSeparator, uriValue, suffixInput);
        var otherUriText = $("<div class='masterData-uriExample'>");
        var uriTypeButtons = $("<div>");
        var showUri = function () {
            var isFromLabel = instance.uriType == "fromLabel";
            uriBuilder.toggle(isFromLabel);
            otherUriText.toggle(!isFromLabel).text(self.getUriExample(instance, identifierEvidence));
            var prefixText = self.getUriPrefixText(instance.prefixURI);
            prefixSeparator.text(prefixText.slice((instance.prefixURI || "").length));
            uriTypeButtons.children().each(function () {
                $(this).toggleClass("masterData-optionChipOpened", $(this).data("uriType") == instance.uriType);
            });
        };
        Object.keys(self.mappingUriTypeLabels).forEach(function (uriType) {
            var uriTypeButton = $("<button type='button' class='masterData-optionChip'>").text(self.mappingUriTypeLabels[uriType]).data("uriType", uriType);
            uriTypeButton.on("click", function () {
                instance.uriType = uriType;
                showUri();
            });
            uriTypeButtons.append(uriTypeButton);
        });
        prefixInput.on("input", function () {
            instance.prefixURI = prefixInput.val().trim();
            showUri();
        });
        suffixInput.on("input", function () {
            instance.suffixURI = suffixInput.val().trim();
            showUri();
        });
        showUri();
        var labelSelect = self.getColumnSelect(tableColumns, instance.labelColumn, true);
        labelSelect.attr("title", self.getColumnEvidenceText(evidenceByColumn[instance.labelColumn]));
        labelSelect.on("change", function () {
            instance.labelColumn = labelSelect.val() || null;
            self.renderMappingCard();
        });
        var instanceTable = $("<table class='masterData-fields'>");
        [
            ["Id", identifierSelect],
            ["Label", labelSelect],
            ["URI", $("<div>").append(uriBuilder, otherUriText, uriTypeButtons)],
        ].forEach(function ([fieldName, fieldControl]) {
            instanceTable.append($("<tr>").append($("<td class='masterData-fieldName'>").text(fieldName), $("<td>").append(fieldControl)));
        });
        instanceDiv.append(instanceTable);
        return instanceDiv;
    };

    // the columns by table then by group of values, each with the option it takes; the implicit classes in chips, decided
    // later; a column another class maps here shown read only, chosen on its card; the columns of kind other counted, the
    // columns left out folded
    self.getMappingColumnsDiv = function (cardState, mappingView) {
        var hasSeveralTables = mappingView.tableViews.length > 1;
        var columnsDiv = $("<div class='masterData-stepContent'>");
        mappingView.tableViews.forEach(function (tableView) {
            if (hasSeveralTables) {
                var keyText = tableView.keyColumns.length > 0 ? ", by " + tableView.keyColumns.join(", ") : "";
                columnsDiv.append($("<div class='masterData-tableTitle'>").text("table " + tableView.table + keyText));
            }
            tableView.groups.forEach(function (group) {
                var groupDiv = $("<div class='masterData-group'>").append(
                    $("<div class='masterData-groupTitle'>").append($("<span>").text(group.title), $("<span>").text(group.mappingColumns.length)),
                );
                if (group.groupKey == "implicit") {
                    groupDiv.append(self.getImplicitColumnChips(cardState, group));
                    columnsDiv.append(groupDiv);
                    return;
                }
                var groupTable = $("<table class='masterData-fields'>");
                group.mappingColumns.forEach(function (mappingColumn) {
                    var columnRows = mappingColumn.ownerClassLabel
                        ? self.getForeignColumnRow(cardState, mappingColumn)
                        : self.getMappingColumnRows(cardState, mappingColumn.columnsKey, mappingColumn.columnMapping);
                    groupTable.append(columnRows);
                });
                columnsDiv.append(groupDiv.append(groupTable));
            });
        });
        if (mappingView.otherKindCount > 0) {
            columnsDiv.append($("<div class='masterData-note'>").text(mappingView.otherKindCount + " columns of kind other, the links of step 4 among them"));
        }
        if (mappingView.leftOutColumnsKeys.length > 0) {
            var classMapping = cardState.classMapping;
            var unmappedTable = $("<table class='masterData-fields'>");
            mappingView.leftOutColumnsKeys.forEach(function (columnsKey) {
                var columnMapping = classMapping.columnMappings.find((candidateMapping) => candidateMapping.columns.join(", ") == columnsKey);
                unmappedTable.append(self.getMappingColumnRows(cardState, columnsKey, columnMapping));
            });
            var unmappedDetails = $("<details>").append($("<summary>").text(mappingView.leftOutColumnsKeys.length + " columns left out"), unmappedTable);
            unmappedDetails.prop("open", mappingView.leftOutColumnsKeys.indexOf(cardState.openedColumnsKey) > -1);
            columnsDiv.append(unmappedDetails);
        }
        return columnsDiv;
    };

    // what the data shows of a column, one value of each of its columns, and why the AI chose its options, a column left
    // out included
    self.getMappingColumnHelp = function (classMapping, columnsKey, columnMapping) {
        var getSampleText = function (evidence) {
            var hasSample = evidence && evidence.sampleValues.length > 0;
            var sampleText = hasSample ? '"' + String(evidence.sampleValues[0]).slice(0, self.exampleValueMaxLength) + '"' : "";
            return sampleText;
        };
        if (columnMapping) {
            var evidenceTexts = columnMapping.evidences.map((evidence) => evidence.column + ": " + self.getColumnEvidenceText(evidence));
            var sampleTexts = columnMapping.evidences.map(getSampleText);
            var mappedColumnHelp = { evidenceText: evidenceTexts.join("\n"), reason: columnMapping.reason, sampleText: sampleTexts.join(" + ") };
            return mappedColumnHelp;
        }
        var unmappedColumn = classMapping.unmappedColumns.find((candidateColumn) => candidateColumn.column == columnsKey);
        var columnHelp = {
            evidenceText: unmappedColumn ? self.getColumnEvidenceText(unmappedColumn.evidence) : "",
            reason: unmappedColumn ? unmappedColumn.reason : "",
            sampleText: unmappedColumn ? getSampleText(unmappedColumn.evidence) : "",
        };
        return columnHelp;
    };

    // the implicit classes in chips; one of this class opens its choices below the chips, one of another class names it
    self.getImplicitColumnChips = function (cardState, group) {
        var chipsDiv = $("<div>");
        var openedChooser = null;
        group.mappingColumns.forEach(function (mappingColumn) {
            var columnChip = $("<button type='button' class='masterData-optionChip'>").text(mappingColumn.columnsKey);
            if (mappingColumn.ownerClassLabel) {
                chipsDiv.append(columnChip.prop("disabled", true).attr("title", "chosen on the " + mappingColumn.ownerClassLabel + " card"));
                return;
            }
            var isOpened = cardState.openedColumnsKey == mappingColumn.columnsKey;
            columnChip.toggleClass("masterData-optionChipOpened", isOpened).attr("title", self.getMappingOptionText(mappingColumn.option, cardState.classMapping));
            columnChip.on("click", function () {
                cardState.openedColumnsKey = isOpened ? null : mappingColumn.columnsKey;
                self.renderMappingCard();
            });
            chipsDiv.append(columnChip);
            if (isOpened) {
                openedChooser = self.getMappingOptionChooser(cardState, mappingColumn.columnsKey, mappingColumn.columnMapping);
            }
        });
        if (openedChooser) {
            chipsDiv.append(openedChooser);
        }
        return chipsDiv;
    };

    // a column another class maps onto this one: what it gives, and the card where it is chosen
    self.getForeignColumnRow = function (cardState, mappingColumn) {
        var columnHelp = self.getMappingColumnHelp(cardState.classMapping, mappingColumn.columnsKey, mappingColumn.columnMapping);
        var columnChip = $("<span class='masterData-column'>").css("background", self.getLegendItem("Column").color).text(mappingColumn.columnsKey).attr("title", columnHelp.evidenceText);
        var ownerButton = $("<button type='button' class='masterData-optionChip'>").text("on the " + self.getClassLabel(self.currentSource, mappingColumn.ownerClassLabel) + " card");
        ownerButton.on("click", function () {
            self.showMappingCard({ data: { type: "Class", label: mappingColumn.ownerClassLabel } });
        });
        var optionText = $("<span>").text(self.getMappingOptionName(mappingColumn.option) + " ");
        var foreignRow = $("<tr>").append($("<td class='masterData-fieldName'>").append(columnChip), $("<td>").append(optionText, ownerButton));
        return foreignRow;
    };

    // the row of a column, and below it its choices when it is open
    self.getMappingColumnRows = function (cardState, columnsKey, columnMapping) {
        var classMapping = cardState.classMapping;
        var columnHelp = self.getMappingColumnHelp(classMapping, columnsKey, columnMapping);
        var reason = columnHelp.reason;
        var columnChip = $("<span class='masterData-column'>").css("background", self.getLegendItem("Column").color).text(columnsKey).attr("title", columnHelp.evidenceText);
        var pickedOption = self.getPickedMappingOption(cardState, columnsKey, columnMapping);
        var isUserOption = Boolean(cardState.userOptionByColumns[columnsKey]);
        var optionChip = $("<button type='button' class='masterData-optionChip'>")
            .toggleClass("masterData-optionChipOpened", cardState.openedColumnsKey == columnsKey)
            .toggleClass("masterData-optionChipUser", isUserOption)
            .text(pickedOption ? self.getMappingOptionText(pickedOption, classMapping) : "unmapped")
            .attr("title", reason || "");
        optionChip.on("click", function () {
            cardState.openedColumnsKey = cardState.openedColumnsKey == columnsKey ? null : columnsKey;
            self.renderMappingCard();
        });
        var optionCell = $("<td>").append(optionChip);
        if (columnHelp.sampleText) {
            optionCell.append($("<div class='masterData-example'>").text("e.g. " + columnHelp.sampleText));
        }
        if (pickedOption && pickedOption.problem) {
            optionCell.append($("<div class='masterData-note'>").text(pickedOption.problem));
        }
        var columnRows = [$("<tr>").append($("<td class='masterData-fieldName'>").append(columnChip), optionCell)];
        if (cardState.openedColumnsKey == columnsKey) {
            columnRows.push($("<tr>").append($("<td colspan='2'>").append(self.getMappingOptionChooser(cardState, columnsKey, columnMapping))));
        }
        return columnRows;
    };

    // an option in one line: its property or kind, the other class it goes on, its range, its probability
    self.getMappingOptionText = function (option, classMapping) {
        var onClassText = option.onClass && option.onClass != classMapping.classLabel ? " on " + option.onClass : "";
        var rangeText = option.range ? " (" + option.range + ")" : "";
        var probabilityText = option.probability === null || option.probability === undefined ? ", by hand" : ", " + option.probability + "%";
        var optionText = self.getMappingOptionName(option) + onClassText + rangeText + probabilityText + (option.problem ? " ⚠" : "");
        return optionText;
    };

    // the options of the AI for a column, then Other: a property of the ontologies, a new property or another kind, its
    // range, date format and class set below once made
    self.getMappingOptionChooser = function (cardState, columnsKey, columnMapping) {
        var classMapping = cardState.classMapping;
        var chooserDiv = $("<div class='masterData-optionChooser'>");
        var aiOptions = columnMapping ? columnMapping.options : [];
        aiOptions.forEach(function (option, optionIndex) {
            var isSelected = !cardState.userOptionByColumns[columnsKey] && cardState.optionIndexByColumns[columnsKey] == optionIndex;
            var optionButton = $("<button type='button' class='masterData-option'>").toggleClass("masterData-selected", isSelected);
            var probabilityParts = [];
            if (option.probability !== null && option.probability !== undefined) {
                var probabilityFill = $("<div class='masterData-probabilityFill'>").css("width", option.probability + "%");
                probabilityParts.push(
                    $("<div class='masterData-probability'>").append($("<div class='masterData-probabilityBar'>").append(probabilityFill), $("<span>").text(option.probability + "%")),
                );
            }
            var onClassText = option.onClass != classMapping.classLabel ? ", on " + option.onClass : "";
            optionButton.append(
                $("<div class='masterData-optionTitle'>").append(
                    $("<span class='masterData-radio'>"),
                    $("<span>").text(self.getMappingOptionName(option) + onClassText),
                    $("<span class='masterData-badge'>").text(self.mappingKindLabels[option.kind]),
                    probabilityParts,
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
                delete cardState.userOptionByColumns[columnsKey];
                cardState.optionIndexByColumns[columnsKey] = optionIndex;
                self.renderMappingCard();
            });
            chooserDiv.append(optionButton);
        });
        chooserDiv.append(self.getMappingOtherDiv(cardState, columnsKey));
        return chooserDiv;
    };

    // Other: what the user picks becomes the option of the column, its range, date format and class then set here; under
    // each choice an example of what rows give
    self.getMappingOtherDiv = function (cardState, columnsKey) {
        var classMapping = cardState.classMapping;
        var classText = self.getClassLabel(self.currentSource, classMapping.classLabel);
        var getKindExample = function (kind) {
            var kindExample = $("<div class='masterData-example'>").text(self.mappingKindExamples[kind]);
            return kindExample;
        };
        var otherDiv = $("<div class='masterData-panel'>").append($("<div class='masterData-optionTitle'>").text("Something else: what should " + columnsKey + " become?"));
        var setUserOption = function (userOption) {
            userOption.onClass = classMapping.classLabel;
            cardState.userOptionByColumns[columnsKey] = userOption;
            self.renderMappingCard();
        };
        var propertySearch = $("<input type='text' placeholder='search a property of the ontologies'>").css("width", "100%");
        var propertyResults = $("<div>");
        var readSearchedText = function () {
            var typedText = propertySearch.val().trim();
            var searchedText = typedText.toLowerCase();
            return searchedText;
        };
        propertySearch.on("input", function () {
            var searchedText = readSearchedText();
            propertyResults.empty();
            if (searchedText.length < 2) {
                return;
            }
            self.loadMappingProperties(function (error, propertyByIri) {
                // the answer of a search typed over since
                if (readSearchedText() != searchedText) {
                    return;
                }
                if (error) {
                    return propertyResults.text(error);
                }
                propertyResults.empty();
                var matchingIris = Object.keys(propertyByIri).filter((propertyIri) => (propertyByIri[propertyIri].label + " " + propertyIri).toLowerCase().indexOf(searchedText) > -1);
                var shownIris = matchingIris.slice(0, self.propertySearchResultCount);
                shownIris.forEach(function (propertyIri) {
                    var property = propertyByIri[propertyIri];
                    var propertyText = self.getClassLabel(property.source, property.label) + (property.range ? " (" + property.range + ")" : "");
                    var propertyButton = $("<button type='button' class='masterData-optionChip'>").text(propertyText).attr("title", propertyIri);
                    propertyButton.on("click", function () {
                        setUserOption({ kind: "existingProperty", propertyIri: propertyIri, propertyLabel: property.label, propertySource: property.source, range: property.range || "xsd:string" });
                    });
                    propertyResults.append(propertyButton);
                });
            });
        });
        var newPropertyInput = $("<input type='text' placeholder='new property name' size='18'>");
        var newPropertyButton = $("<button type='button' class='masterData-optionChip'>").text("Create");
        newPropertyButton.on("click", function () {
            var newPropertyName = newPropertyInput.val().trim();
            if (!newPropertyName) {
                return;
            }
            setUserOption({ kind: "newProperty", newPropertyName: newPropertyName, range: "xsd:string" });
        });
        var kindButtons = self.mappingOtherKinds.map(function (kind) {
            var kindButton = $("<button type='button' class='masterData-otherKind'>").append($("<span>").text(self.mappingOtherKindLabels[kind]), getKindExample(kind));
            kindButton.on("click", function () {
                setUserOption({ kind: kind });
            });
            return kindButton;
        });
        var leaveOutButton = $("<button type='button' class='masterData-optionChip'>").text("Nothing, leave it out");
        leaveOutButton.on("click", function () {
            setUserOption({ kind: "unmapped" });
        });
        otherDiv.append(
            $("<div class='masterData-otherChoice'>").append(
                $("<b>").text("Keep it as a value of the " + classText),
                $("<div class='masterData-hint'>").text("text, a number or a date, through a property"),
                getKindExample("existingProperty"),
                propertySearch,
                propertyResults,
                $("<div>").append(newPropertyInput, " ", newPropertyButton),
            ),
            $("<div class='masterData-otherChoice'>").append(
                $("<b>").text("Make each value a node of its own"),
                $("<div class='masterData-hint'>").text("linked to the " + classText + ", its class decided later"),
                kindButtons,
            ),
            $("<div class='masterData-otherChoice'>").append(leaveOutButton, getKindExample("unmapped")),
        );
        var userOption = cardState.userOptionByColumns[columnsKey];
        if (userOption) {
            otherDiv.append(self.getUserOptionFields(cardState, userOption));
        }
        return otherDiv;
    };

    // the class, range and date format of the option the user made, changeable before Apply
    self.getUserOptionFields = function (cardState, userOption) {
        var classMapping = cardState.classMapping;
        var rowClassLabels = [classMapping.classLabel].concat(classMapping.rowResources.map((rowResource) => rowResource.classLabel));
        var onClassSelect = $("<select>");
        rowClassLabels.forEach((rowClassLabel) => onClassSelect.append($("<option>").val(rowClassLabel).text(rowClassLabel)));
        onClassSelect.val(userOption.onClass).on("change", function () {
            userOption.onClass = onClassSelect.val();
            self.renderMappingCard();
        });
        var fields = [["On class", onClassSelect]];
        var isProperty = userOption.kind == "existingProperty" || userOption.kind == "newProperty";
        if (isProperty) {
            var rangeSelect = $("<select>");
            self.mappingRanges.forEach((range) => rangeSelect.append($("<option>").val(range).text(range)));
            // a range of the ontology outside the list stays as it is
            if (self.mappingRanges.indexOf(userOption.range) < 0) {
                rangeSelect.append($("<option>").val(userOption.range).text(userOption.range));
            }
            rangeSelect.val(userOption.range).on("change", function () {
                userOption.range = rangeSelect.val();
                self.renderMappingCard();
            });
            fields.push(["Range", rangeSelect]);
        }
        if (isProperty && userOption.range && userOption.range.indexOf("xsd:date") == 0) {
            var dateFormatSelect = $("<select>").append($("<option>").val("").text("as stored"));
            self.mappingDateFormats.forEach((dateFormat) => dateFormatSelect.append($("<option>").val(dateFormat).text(dateFormat)));
            dateFormatSelect.val(userOption.dateFormat || "").on("change", function () {
                userOption.dateFormat = dateFormatSelect.val() || null;
                self.renderMappingCard();
            });
            fields.push(["Date format", dateFormatSelect]);
        }
        var fieldsTable = $("<table class='masterData-fields'>");
        fields.forEach(function ([fieldName, fieldControl]) {
            fieldsTable.append($("<tr>").append($("<td class='masterData-fieldName'>").text(fieldName), $("<td>").append(fieldControl)));
        });
        return fieldsTable;
    };

    // the properties a column may take, read once per source
    self.loadMappingProperties = function (callback) {
        if (self.mappingProperties && self.mappingProperties.source == self.currentSource) {
            return callback(null, self.mappingProperties.propertyByIri);
        }
        var source = self.currentSource;
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/ai/aiMappingWorkflow/mappingProperties?" + new URLSearchParams({ source: source }).toString(),
            dataType: "json",
            success: function (result) {
                self.mappingProperties = { source: source, propertyByIri: result.propertyByIri };
                callback(null, result.propertyByIri);
            },
            error: function (error) {
                callback(AIColumnClassSuggestion.getErrorText(error));
            },
        });
    };

    // the guess of a step the chat changed on the user's request: the graph of the step shown is drawn again, and the card
    // open shows the change
    self.replaceGuess = function (guessKey, guess, nextGuesses) {
        self.currentAiKeys[guessKey] = guess;
        // the next steps the server carried the change to
        Object.entries(nextGuesses || {}).forEach(([nextGuessKey, nextGuess]) => (self.currentAiKeys[nextGuessKey] = nextGuess));
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
            self.currentLinkCard = { link: savedLink, edgeLinks: arrowLinks, assumption: self.currentLinkCard.assumption };
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
                ["Tables", (entry.tables || []).join(", ")],
                ["Columns", (entry.columns || []).join(", ")],
                ["Also claimed", (entry.contestedTables || []).join(", ")],
                ["Data", entry.hasNoData ? "none, no relation" : null],
            ]),
        );
        cardDiv.append(headerPanel);

        var stepNumber = 1;
        // what the data say under a reading, the real rows showing it, and the question settling it
        // one box per reading: what the data say, its example rows and the question for the business folded under it
        var getReadingEvidence = function (reading) {
            var readingEvidence = $("<div class='masterData-readingEvidence'>");
            var moreDetails = $("<details>").append($("<summary>").text("More details"), self.getFieldsTable([["In the data", reading.inData]]));
            if (reading.example) {
                var exampleTable = $("<table class='masterData-evidenceTable'>");
                var headerCells = reading.example.columns.map((column) => $("<th>").text(column));
                exampleTable.append($("<tr>").append(headerCells));
                reading.example.rows.forEach(function (exampleRow) {
                    var valueCells = exampleRow.map((value) => $("<td>").text(value));
                    exampleTable.append($("<tr>").append(valueCells));
                });
                moreDetails.append($("<div class='masterData-evidence'>").append(exampleTable));
            }
            moreDetails.append(self.getFieldsTable([["Ask the business", reading.askBusiness]]));
            readingEvidence.append(moreDetails);
            return readingEvidence;
        };
        // a guess saved before the readings shared the class of the entry: each reading has its own class, picked first
        var readingClassKeys = new Set(card.readings.map((reading) => reading.classKey));
        var isReadingPickedFirst = readingClassKeys.size > 1;
        if (card.readings.length > 1 && !isReadingPickedFirst) {
            var rowsDiv = $("<div class='masterData-stepContent'>");
            rowsDiv.append($("<div class='masterData-step'>").text("One row is"));
            card.readings.forEach(function (reading) {
                var readingBox = $("<div class='masterData-readingBox'>").append(
                    $("<div>").append($("<b>").text(reading.label + ": "), $("<span>").text(self.getRowIsText(reading))),
                    getReadingEvidence(reading),
                );
                rowsDiv.append(readingBox);
            });
            cardDiv.append(rowsDiv);
        }
        if (isReadingPickedFirst) {
            var readingsDiv = $("<div class='masterData-stepContent'>");
            readingsDiv.append(getStepTitle(stepNumber, "One row is"));
            stepNumber++;
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
                var readingBox = $("<div class='masterData-readingBox'>").append(
                    getOptionButton(readingIndex == card.readingIndex, titleElements, [["", self.getRowIsText(reading)]], pickReading),
                    getReadingEvidence(reading),
                );
                readingsDiv.append(readingBox);
            });
            cardDiv.append(readingsDiv);
        }

        var superClassDiv = $("<div class='masterData-stepContent'>");
        superClassDiv.append(getStepTitle(stepNumber, "Superclass"));
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
                // a reading named only when the row may denote several things
                var superClassFields = [
                    ["If a row is", parentOption.readings && card.readings.length > 1 ? parentOption.readings.join(", ") : null],
                    ["Under", localClass ? localClass.superClassLabel : null],
                    ["Impact", parentOption.impact],
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
                        ["Second class", split.newLabel + " subClassOf " + splitParentLabel],
                        ["Why", split.reason],
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
        var leaveOpenButton = $("<button type='button' class='masterData-applyButton'>").text("Leave open until the relations");
        leaveOpenButton.prop("disabled", !isChoiceOpen || Boolean(entry.decision));
        leaveOpenButton.on("click", function () {
            self.applyDecision(entry, { readingIndex: card.readingIndex, superClassId: null, isLeftToLinks: true });
        });
        if (entry.decision && entry.decision.isLeftToLinks) {
            writtenText = "nothing yet, the relations settle the superclass";
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
        footer.append(
            $("<div>").append($("<span class='masterData-writtenLabel'>").text("Will be written"), $("<span>").text(writtenText)),
            $("<div class='masterData-footerButtons'>").append(undoButton, leaveOpenButton, applyButton),
        );
        cardDiv.append(footer);
    };

    // what one row is under a reading, without the "One row is" its title already says
    self.getRowIsText = function (reading) {
        var rowIsText = (reading.rowIs || "").replace(self.rowIsPrefixRegex, "");
        return rowIsText;
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
                self.replaceGuess(result.guessKey, result.guess, result.nextGuesses);
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
        var guessKey = self.workflowSteps[self.currentStepIndex].guessKey;
        var html = "";
        if (self.popupMenuEntry) {
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showClassChoiceDialog()">Choose the class</span>';
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.renameEntry()">Rename</span>';
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showDefinitionDialog()">Definition</span>';
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showEntryTablesDialog()">Tables</span>';
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showAddReadingDialog()">Add a reading</span>';
            if (self.getReadings(self.popupMenuEntry).length > 1) {
                html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showRemoveReadingDialog()">Remove a reading</span>';
            }
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.removeEntry()">Remove</span>';
        } else if (self.popupMenuLink) {
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showPropertyChoiceDialog()">Choose the property</span>';
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.removeLink()">Remove</span>';
        } else if (guessKey == "linksGuess") {
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showAddLinkDialog(false)">Add a relation on a key</span>';
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showAddLinkDialog(true)">Add a relation on a row</span>';
        } else if (guessKey != "mappingGuess") {
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showAddEntryDialog()">Add ' + (guessKey == "eventsGuess" ? "an association" : "a class") + "</span>";
            html += '    <span class="popupMenuItem" onclick="AIMappingWorkflow.showAddLocalClassDialog()">Add a local class above classes</span>';
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
        if (!confirm("Remove the relation " + link.fromClass + " -> " + link.toClass + " from the guess?")) {
            return;
        }
        self.changeGuessByHand("remove_link", { link: link.id });
    };

    // the tables of the database open, with their columns, read once per database for the forms
    self.loadDatabaseColumns = function (callback) {
        if (self.databaseColumns && self.databaseColumns.databaseId == self.currentDatabaseId) {
            return callback(null, self.databaseColumns.columnsByTable);
        }
        var databaseId = self.currentDatabaseId;
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/databases/model?" + new URLSearchParams({ name: databaseId, type: "sql" }).toString(),
            dataType: "json",
            success: function (columnsByTable) {
                self.databaseColumns = { databaseId: databaseId, columnsByTable: columnsByTable };
                callback(null, columnsByTable);
            },
            error: function (error) {
                callback(AIColumnClassSuggestion.getErrorText(error));
            },
        });
    };

    // a form in the small dialog, its values given to onValidate by field name. A field is { name, label, kind, value,
    // options }: kind "text", "textarea", "select" (options, or getOptions(values) read again when another select
    // changes), or "tables", an ordered list of tables, the main one first
    self.showFormDialog = function (title, fields, onValidate) {
        var form = $("<div style='display: flex; flex-direction: column; gap: 8px; min-width: 420px'>");
        var tablesByField = {};
        var inputsByName = {};
        var readValues = function () {
            var values = {};
            fields.forEach(function (field) {
                values[field.name] = field.kind == "tables" ? tablesByField[field.name].slice() : inputsByName[field.name].val();
            });
            return values;
        };
        var fillSelect = function (field, values) {
            var select = inputsByName[field.name];
            var selectedValue = select.val() || field.value;
            var options = field.getOptions ? field.getOptions(values) : field.options;
            select.empty();
            options.forEach((option) => select.append($("<option>").val(option).text(option)));
            select.val(options.indexOf(selectedValue) > -1 ? selectedValue : options[0]);
        };
        fields.forEach(function (field) {
            var row = $("<label style='display: flex; flex-direction: column'>").append($("<span>").text(field.label));
            if (field.kind == "tables") {
                tablesByField[field.name] = (field.value || []).slice();
                var tablesList = $("<div>");
                var drawTables = function () {
                    tablesList.empty();
                    tablesByField[field.name].forEach(function (table, tableIndex) {
                        var removeButton = $("<button type='button' class='slsv-invisible-button'>").text(" x");
                        removeButton.on("click", function () {
                            tablesByField[field.name].splice(tableIndex, 1);
                            drawTables();
                        });
                        tablesList.append($("<div>").append($("<span>").text((tableIndex == 0 ? "main: " : "") + table), removeButton));
                    });
                };
                var tableSelect = $("<select>");
                field.options.forEach((option) => tableSelect.append($("<option>").val(option).text(option)));
                var addButton = $("<button type='button' class='slsv-button-1'>").text("Add the table");
                addButton.on("click", function () {
                    if (tablesByField[field.name].indexOf(tableSelect.val()) < 0) {
                        tablesByField[field.name].push(tableSelect.val());
                    }
                    drawTables();
                });
                drawTables();
                row.append(tablesList, $("<div style='display: flex; gap: 4px'>").append(tableSelect, addButton));
            } else if (field.kind == "select") {
                inputsByName[field.name] = $("<select>");
                row.append(inputsByName[field.name]);
            } else {
                inputsByName[field.name] = field.kind == "textarea" ? $("<textarea rows='4'>") : $("<input type='text'>");
                inputsByName[field.name].val(field.value || "");
                row.append(inputsByName[field.name]);
            }
            form.append(row);
        });
        var selectFields = fields.filter((field) => field.kind == "select");
        selectFields.forEach((field) => fillSelect(field, readValues()));
        // a select depending on another one follows its change
        selectFields.forEach(function (field) {
            inputsByName[field.name].on("change", function () {
                selectFields.forEach(function (otherField) {
                    if (otherField != field && otherField.getOptions) {
                        fillSelect(otherField, readValues());
                    }
                });
            });
        });
        var validateButton = $("<button type='button' class='slsv-button-1'>").text("OK");
        validateButton.on("click", function () {
            onValidate(readValues());
        });
        form.append(validateButton);
        $("#smallDialogDiv").empty().append(form);
        UI.openDialog("smallDialogDiv", { title: title });
        UI.clampAndCenterDialog("smallDialogDiv");
    };

    // a class of steps 1 and 2 or an association of step 3 the AI missed, with its tables; its superclass is chosen after,
    // as for any entry
    self.showAddEntryDialog = function () {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        self.loadDatabaseColumns(function (error, columnsByTable) {
            if (error) {
                return MainController.errorAlert(error);
            }
            var tableNames = Object.keys(columnsByTable).sort();
            var fields = [
                { name: "newLabel", label: "Label", kind: "text" },
                { name: "definition", label: "Definition", kind: "textarea" },
                { name: "tables", label: "Tables holding its rows, the main one first", kind: "tables", options: tableNames },
            ];
            self.showFormDialog("Add " + self.workflowSteps[self.currentStepIndex].entryLegend.toLowerCase(), fields, function (values) {
                self.changeGuessByHand("add_entry", values, self.closeChoiceDialog);
            });
        });
    };

    // the tables of an entry: changed on step 3, the links of step 4 are computed again from them
    self.showEntryTablesDialog = function () {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        var guessEntry = self.popupMenuEntry;
        self.loadDatabaseColumns(function (error, columnsByTable) {
            if (error) {
                return MainController.errorAlert(error);
            }
            var currentTables = self.getEntryDataNames(guessEntry).filter((dataName) => Object.hasOwn(columnsByTable, dataName));
            var fields = [
                { name: "tables", label: "Tables holding the rows of " + guessEntry.label + ", the main one first", kind: "tables", value: currentTables, options: Object.keys(columnsByTable).sort() },
            ];
            self.showFormDialog("Tables of " + guessEntry.label, fields, function (values) {
                self.changeGuessByHand("set_entry_tables", { entry: guessEntry.label, tables: values.tables }, self.closeChoiceDialog);
            });
        });
    };

    self.showDefinitionDialog = function () {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        var guessEntry = self.popupMenuEntry;
        var reading = self.getReadings(guessEntry)[self.getEntryReadingIndex(guessEntry)];
        var fields = [{ name: "definition", label: "Definition of the class of " + guessEntry.label, kind: "textarea", value: reading.definition || guessEntry.definition }];
        self.showFormDialog("Definition of " + guessEntry.label, fields, function (values) {
            self.changeGuessByHand("update_class", { entry: guessEntry.label, reading: reading.label, definition: values.definition }, self.closeChoiceDialog);
        });
    };

    // another reading of what one row of the entry denotes; its superclass is chosen after, as for any class
    self.showAddReadingDialog = function () {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        var guessEntry = self.popupMenuEntry;
        var fields = [
            { name: "newLabel", label: "Label of the reading", kind: "text" },
            { name: "rowIs", label: "What one row is under this reading", kind: "textarea" },
            { name: "inData", label: "What in the data points to it", kind: "textarea" },
            { name: "definition", label: "Definition of its class", kind: "textarea" },
        ];
        self.showFormDialog("Add a reading to " + guessEntry.label, fields, function (values) {
            values.entry = guessEntry.label;
            self.changeGuessByHand("add_reading", values, self.closeChoiceDialog);
        });
    };

    self.showRemoveReadingDialog = function () {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        var guessEntry = self.popupMenuEntry;
        var readingLabels = self.getReadings(guessEntry).map((reading) => reading.label);
        var fields = [{ name: "reading", label: "Reading to remove", kind: "select", options: readingLabels }];
        self.showFormDialog("Remove a reading of " + guessEntry.label, fields, function (values) {
            self.changeGuessByHand("remove_reading", { entry: guessEntry.label, reading: values.reading }, self.closeChoiceDialog);
        });
    };

    // a local class of the ontology between an upper class and entries, as a client above reseller and individual customer:
    // its label, then its superclass in the tree of the upper ontologies
    self.showAddLocalClassDialog = function () {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        var fields = [
            { name: "newLabel", label: "Label", kind: "text" },
            { name: "definition", label: "Definition", kind: "textarea" },
        ];
        self.showFormDialog("Add a local class", fields, function (values) {
            var onSelect = function (event, selected) {
                var nodeData = selected.node.data || {};
                if (!nodeData.termIri) {
                    return;
                }
                values.superClassIri = nodeData.termIri;
                self.changeGuessByHand("add_local_class", values, self.closeChoiceDialog);
            };
            self.showChoiceDialog("Superclass of " + values.newLabel, [], "classes", "Classes", { selectTreeNodeFn: onSelect });
        });
    };

    // a link the AI missed between two classes of the graph, on a foreign key checked in the data or on a row holding both;
    // its property is chosen after, as for any link
    self.showAddLinkDialog = function (isOnRow) {
        PopupMenuWidget.hidePopup("popupMenuWidgetDiv");
        self.loadDatabaseColumns(function (error, columnsByTable) {
            if (error) {
                return MainController.errorAlert(error);
            }
            var classLabels = Object.keys(self.linkNodeIdByLabel).sort();
            var tableNames = Object.keys(columnsByTable).sort();
            var fields = [
                { name: "fromClass", label: "From the class", kind: "select", options: classLabels },
                { name: "toClass", label: "To the class", kind: "select", options: classLabels },
            ];
            if (isOnRow) {
                fields.push({ name: "sameRowTable", label: "Table whose rows hold both", kind: "select", options: tableNames });
            } else {
                fields.push(
                    { name: "table", label: "Table of the key", kind: "select", options: tableNames },
                    { name: "column", label: "Its column", kind: "select", getOptions: (values) => columnsByTable[values.table] || [] },
                    { name: "referencedTable", label: "Table it points at", kind: "select", options: tableNames },
                    { name: "referencedColumn", label: "Column it points at", kind: "select", getOptions: (values) => columnsByTable[values.referencedTable] || [] },
                );
            }
            self.showFormDialog("Add a relation", fields, function (values) {
                var linkInput = { fromClass: values.fromClass, toClass: values.toClass };
                if (isOnRow) {
                    linkInput.sameRowTable = values.sameRowTable;
                } else {
                    linkInput.table = values.table;
                    linkInput.columns = [values.column];
                    linkInput.referencedTable = values.referencedTable;
                    linkInput.referencedColumns = [values.referencedColumn];
                }
                self.changeGuessByHand("add_link", linkInput, self.closeChoiceDialog);
            });
        });
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
            if (treeNode.data && treeNode.data.superClassId) {
                items.removeOption = {
                    label: "Remove this option",
                    action: function () {
                        self.changeGuessByHand("remove_superclass_option", { entry: guessEntry.label, reading: reading.label, superClass: treeNode.data.superClassId }, self.closeChoiceDialog);
                    },
                };
            }
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
            var optionText =
                self.getAssumptionText(option) +
                self.getClassLabel(option.propertySource, option.propertyLabel) +
                (option.inverse ? " (inverse)" : "") +
                AIColumnClassSuggestion.getProbabilityText(option);
            var proposalNode = {
                id: "aiProposal|" + optionIndex,
                parent: "aiProposal",
                text: AIColumnClassSuggestion.getTreeNodeText(optionText, propertyColor, option.reason),
                data: { propertyIri: option.propertyIri },
            };
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

    // a decision taken on the card goes through the server as the changes of the chat, which carries it to the next steps
    self.applyDecision = function (guessEntry, decision) {
        var reading = self.getReadings(guessEntry)[decision.readingIndex];
        var decideInput = { entry: guessEntry.label, reading: reading.label, superClass: decision.superClassId, isLeftToLinks: Boolean(decision.isLeftToLinks) };
        self.changeGuessByHand("apply_decision", decideInput);
    };

    return self;
})();

export default AIMappingWorkflow;
window.AIMappingWorkflow = AIMappingWorkflow;
