import common from "../shared/common.js";
import Lineage_upperOntologies from "./lineage/lineage_upperOntologies.js";
import SearchUtil from "../search/searchUtil.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import visjsGraph from "../graph/visjsGraph2.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import SourceSelectorWidget from "../uiWidgets/sourceSelectorWidget.js";

//https://openbase.com/js/@json-editor/json-editor/documentation

var KGcreator = (function () {
    var self = {};
    self.rowCount = 0;
    self.mainJsonEditor = null;
    self.currentSource = null;
    self.usualProperties = [
        "rdf:type",
        "rdfs:subClassOf",
        "rdfs:label",
        "rdfs:isDefinedBy",
        "rdfs:comment",
        "rdfs:member",
        "slsv:next",
        "owl:sameAs",
        "owl:equivalentClass",

        "",
        "xsd:string",
        "xsd:dateTime",
        "xsd:boolean",
        "xsd:integer",
        "xsd:float",
        "xsd:double",
        "xsd:decimal",
        "rdf:XMLLiteral",

        "",

        "skos:altLabel",
        "skos:prefLabel",
        "skos:definition",
        "skos:example",
        "skos:member",
        "dcterms:format",
        "",
        "_function",
        "_restriction",
        // "_part14Predefined",
        "",
        "owl:onProperty",
        "owl:someValuesFrom",
        "owl:allValuesFrom",
        "owl:hasValue",
        "rdfs:subPropertyOf",
        "owl:inverseOf",

        "",
    ];

    self.usualObjectClasses = [
        "owl:Thing",
        "owl:Class",
        "owl:NamedIndividual",
        "owl:Thing",
        "owl:ObjectProperty",
        "owl:DatatypeProperty",
        "owl:Restriction",
        "rdf:Bag",
        "rdf:List",
        "skos:Concept",
        "skos:Collection",
        "slsv:TopConcept",
        "_function",
        "_blankNode",
        "_blankNodeSubjectTriple",
        "",
        
    ];

    self.columnDataList = [];

    self.xsdTypes = ["xsd:string", "xsd:dateTime", "xsd:boolean", "xsd:integer", "xsd:float", "xsd:double", "xsd:decimal", "rdf:XMLLiteral"];

    self.basicTypeClasses = ["owl:Class", "owl:NamedIndividual", "owl:Thing", ""];
    self.usualSubjectTypes = ["_function", "_blankNode", ""];

    self.predefinedPart14Relations = [
        ["Location", "Location", "hasSubLocation"],
        ["Location", "Activity", "hasActivityPart"],
        ["Location", "FunctionalObject", "hasFunctionalPart"],
        ["Location", "System", "hasFunctionalPart"],
        ["Activity", "Activity", "hasActivityPart"],
        ["Activity", "Location", "residesIn"],
        ["Activity", "FunctionalObject", "hasParticipant"],
        ["Activity", "System", "hasParticipant"],
        ["FunctionalObject", "FunctionalObject", "hasFunctionalPart"],
        ["FunctionalObject", "Location", ""],
        ["FunctionalObject", "Activity", "participantIn"],
        ["FunctionalObject", "System", "functionalPartOf"],
        ["System", "System", "hasFunctionalPart"],
        ["System", "Location", "residesIn"],
        ["System", "Activity", "participantIn"],
        ["System", "FunctionalObject", "hasFunctionalPart"],
    ];
    self.csvHeaders = [];
    self.csvData = [];
    self.mappingFiles = {};
    self.subjects = {}
    self.subjectList = [];
    self.blankNodeList = [];
    self.blankNodeCounter = 1;
    self.blankNodeTemplates = {};
    self.usedTemplates = []; // Will be used to store used templates
    self.counter = {},

    
    self.rmlPrefixes = {
        rml: "http://semweb.mmlab.be/ns/rml#",
        rr: "http://www.w3.org/ns/r2rml#",
        ql: "http://semweb.mmlab.be/ns/ql#",
        foaf: "http://xmlns.com/foaf/0.1/",
        schema: "http://schema.org/",
        xsd: "http://www.w3.org/2001/XMLSchema#",
        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        // Add other necessary prefixes here
    };

    self.onLoaded = function () {
        $("#actionDivContolPanelDiv").load("snippets/KGcreator/leftPanel.html", function () {
            self.loadCsvDirs();
            self.showSourcesDialog(function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                $("#graphDiv").load("snippets/KGcreatorRML/centralPanel.html", function () {
                    self.initCentralPanel();
                });
                $("#rightPanelDiv").load("snippets/KGcreator/rightPanel.html", function () {
                    // pass
                });
            });
        });
        $("#accordion").accordion("option", { active: 2 });
    };

    self.showSourcesDialog = function (callback) {
        var options = {
            withCheckboxes: false,
        };
        var selectTreeNodeFn = function () {
            $("#mainDialogDiv").dialog("close");
            var source = SourceSelectorWidget.getSelectedSource()[0];
            self.initSource(source, callback);
        };
        SourceSelectorWidget.initWidget(["OWL"], "mainDialogDiv", true, selectTreeNodeFn, null, options);
    };

    self.initSource = function (source, callback) {
        self.currentSource = source;
        self.currentSlsvSource = source;
        Config.currentTopLevelOntology = Lineage_sources.setTopLevelOntologyFromImports(source);

        self.currentGraphUri = Config.sources[source].graphUri;
        if (!Config.currentTopLevelOntology) {
            return alert("Source must have an upper ontology import");
        }
        $("#KGcreator_owlSourceInput").html(source);

        $("#KGcreator_topLevelOntologiesInput").html(Config.currentTopLevelOntology);
        self.topLevelOntologyPrefix = Config.topLevelOntologies[Config.currentTopLevelOntology].prefix;
        self.initModel(source, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            if (callback) {
                callback(err);
            }
        });
    };
    self.onChangeSourceTypeSelect = function (sourceType, callback) {
        self.currentSourceType = sourceType;
        if (sourceType == "CSV") {
            self.loadCsvDirs();
        } else if (sourceType == "DATABASE") {
            self.loadDataBases(callback);
        }else if (sourceType == "JSON"){
            return console.log("loadJsonData")
        }

    };

    self.loadDataBases = function (callback) {
        var sqlQuery = "SELECT name FROM sys.databases";
        const params = new URLSearchParams({
            type: "sql.sqlserver",
            dbName: "master",
            sqlQuery: sqlQuery,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                common.fillSelectOptions("KGcreator_csvDirsSelect", data, true, "name", "name");
                if (callback) {
                    return callback();
                }
            },
            error(err) {
                return alert(err.responseText);
                if (callback) {
                    return callback(err);
                }
            },
        });
    };

    self.onTopLevelOntologyChange = function (topLevelOntology) {
        // Config.currentTopLevelOntology = $("#KGcreator_topLevelOntologiesSelect").val();
        self.initCentralPanel();
    };

    self.loadCsvDirs = function (options) {
        if (!options) {
            options = {};
        }
        if (options.contextualMenuFn) {
            self.currentContextMenu = options.contextualMenuFn;
        } else {
            self.currentContextMenu = self.getSystemsTreeContextMenu;
        }

        var payload = {
            dir: "CSV",
        };
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/files",
            dataType: "json",
            data: payload,
            success: function (result, _textStatus, _jqXHR) {
                common.fillSelectOptions("KGcreator_csvDirsSelect", result, true);
            },
            error: function (err) {
                alert(err.responseText);
            },
        });
    };

    self.displayUploadApp = function () {
        $.getScript("/kg_upload_app.js");
    };

    self.loadMappingsList = function (callback) {
        self.currentSource = self.currentCsvDir;
        var payload;
        var prefix;
        if (self.currentDataSourceModel) {
            prefix = self.currentSlsvSource;
            payload = {
                dir: "CSV/" + self.currentSlsvSource,
            };
        } else {
            prefix = self.currentCsvDir;
            payload = {
                dir: "CSV/" + self.currentCsvDir,
            };
        }
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/files",
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                self.mappingFiles = {};
                if (result == null) {
                    return callback();
                }
                result.forEach(function (file) {
                    var p;
                    if ((p = file.indexOf(".json")) > -1) {
                        self.mappingFiles[file.substring(0, p)] = 1;
                    }
                });
                callback();
            },
            error: function (err) {
                callback(err);
            },
        });
    };

    self.listTables = function (db, callback) {
        self.currentDbName = db ? db : $("#KGcreator_csvDirsSelect").val();
        var type = "sql.sqlserver";

        const params = new URLSearchParams({
            name: self.currentDbName,
            type: type,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/model?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                self.currentDataSourceModel = data;
                var tables = [];
                self.currentSource = self.currentDbName;
                self.currentdabase = { type: type, dbName: self.currentDbName };
                for (var key in data) {
                    tables.push(key);
                }
                if (callback) {
                    return callback(null, data);
                }
                self.showTablesTree(tables);
            },
            error: function (_err) {
                if (callback) {
                    return callback(null);
                }
                alert(err.responseText);
            },
        });
    };

    self.listFiles = function (currentCsvDir = null) {
        self.currentCsvDir = currentCsvDir ? currentCsvDir : $("#KGcreator_csvDirsSelect").val();
        var payload = {
            dir: "CSV/" + self.currentCsvDir,
        };
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/files",
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                self.showTablesTree(result);
            },
            error: function (err) {
                alert(err.responseText);
            },
        });
    };

    self.getContextMenu = function () {
        return self.currentContextMenu();
    };

    self.showTablesTree = function (data) {
        self.loadMappingsList(function (err) {
            var jstreeData = [];
            var options = {
                openAll: true,
                selectTreeNodeFn: KGcreator.onCsvtreeNodeClicked,
                contextMenu: KGcreator.getContextMenu(),
                //  withCheckboxes: true,
            };
            data.forEach(function (file) {
                if (file.indexOf(".json") > 0) {
                    return;
                }
                var label = file;

                //  if (data.indexOf(file + ".json") > -1)
                for (var key in self.mappingFiles) {
                    if (key.indexOf(file) > -1) {
                        label = "<span class='KGcreator_fileWithMappings'>" + file + "</span>";
                    }
                }

                jstreeData.push({
                    id: file,
                    text: label,
                    parent: "#",
                    data: { id: file },
                });
            });
            if (self.currentDataSourceModel) {
                options.openAll = false;
                for (var key in self.currentDataSourceModel) {
                    var columns = self.currentDataSourceModel[key];
                    columns.forEach(function (column) {
                        jstreeData.push({
                            id: key + "_" + column,
                            text: column,
                            parent: key,
                            data: { id: column },
                        });
                    });
                }
            }

            JstreeWidget.loadJsTree("KGcreator_csvTreeDiv", jstreeData, options);
        });
    };

    self.getSystemsTreeContextMenu = function () {
        var items = {};
        items.addBasicIndividual = {
            label: "addBasicIndividual",
            action: function (_e) {
                // pb avec source
                KGcreator.addBasicMapping("owl:NamedIndividual");
            },
        };
        items.addBasicClass = {
            label: "addBasicClass",
            action: function (_e) {
                // pb avec source
                KGcreator.addBasicMapping("owl:Class");
            },
        };
        items.addBasicBag = {
            label: "addBasicBag",
            action: function (_e) {
                // pb avec source
                KGcreator.addBasicMapping("rdf:Bag");
            },
        };

        items.setAsSubject = {
            label: "Subject",
            action: function (_e) {
                // pb avec source
                if (self.currentTreeNode.parents.length < 2) {
                    return;
                }
                $("#KGcreator_subjectInput").val(self.currentTreeNode.data.id);
            },
        };

        items.setAsObject = {
            label: "Object",
            action: function (_e) {
                // pb avec source
                if (self.currentTreeNode.parents.length < 2) {
                    return;
                }
                $("#editPredicate_objectValue").val(self.currentTreeNode.data.id);
            },
        };

        items.copy = {
            label: "Copy",
            action: function (_e) {
                // pb avec source
                navigator.clipboard.writeText(self.currentTreeNode.data.id);
            },
        };

        items.showLookupDialog = {
            label: "Add lookup",
            action: function (_e) {
                // pb avec source
                if (self.currentTreeNode.parents.length < 1) {
                    return;
                }
                $("#KGcreator_dialogDiv").load("snippets/KGcreator/lookupDialog.html", function () {
                    $("#KGCreator_lookupFileName").val(self.currentTreeNode.data.id);
                });
                $("#KGcreator_dialogDiv").dialog("open");
            },
        };
        items.showTransformDialog = {
            label: "Add Transform",
            action: function (_e) {
                // pb avec source
                if (self.currentTreeNode.parents.length != 2) {
                    return;
                }
                $("#KGcreator_dialogDiv").load("snippets/KGcreator/transformDialog.html", function () {
                    $("#KGcreator_transformColumn").val(self.currentTreeNode.data.id);
                });
                $("#KGcreator_dialogDiv").dialog("open");
            },
        };

        items.loadMappings = {
            label: "load",
            action: function (_e) {
                // pb avec source
                if (self.currentTreeNode.parents.length != 1) {
                    return;
                }
                KGcreator.loadMappings();
            },
        };
        if (!self.currentDataSourceModel) {
            items.editFile = {
                label: "editFile",
                action: function (_e) {
                    // pb avec source
                    if (self.currentTreeNode.parents.length != 1) {
                        return;
                    }
                    KGcreator.editFile();
                },
            };
        }

        return items;
    };

    self.editFile = function () {
        const params = new URLSearchParams({
            dir: "CSV/" + self.currentCsvDir,
            name: self.currentTreeNode.data.id,
        });
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/data/file?` + params.toString(),
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                $("#KGcreator_saveFileButton").css("display", "block");
                $("#KGcreator_dataSampleDiv").val(_result);
            },
            error(err) {
                if (callback) {
                    return callback(err);
                }
                return alert(err.responseText);
            },
        });
    };

    self.saveFile = function () {
        if (!confirm("Save modified file?")) {
            return;
        }
        $("#KGcreator_saveFileButton").css("display", "none");
        var str = $("#KGcreator_dataSampleDiv").val();

        payload = {
            dir: "CSV/" + self.currentCsvDir,
            fileName: self.currentTreeNode.data.id,
            data: str,
        };

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/data/file`,
            data: payload,
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                MainController.UI.message("file saved");
                $("#KGcreator_dataSampleDiv").val("");
            },
            error(err) {
                return alert(err.responseText);
            },
        });
    };

    self.initCentralPanel = function () {
        // Config.currentTopLevelOntology = $("#KGcreator_topLevelOntologiesSelect").val();
        var topLevelOntology = Config.currentTopLevelOntology;

        var currentPredicates = [];
        var sourceSpecificPredicates = [];
        var upperOntologyClasses = [];
        var usualClasses = [];
        self.usualProperties.forEach(function (item) {
            currentPredicates.push({
                id: item,
                label: item,
            });
        });

        self.propertiesMap = {};

        async.series(
            [
                // fill subject Options
                function (callbackSeries) {
                    var currentSubjectClasses = [{ id: "_selectedColumn", label: "_selectedColumn" }];
                    self.usualSubjectTypes.forEach(function (item) {
                        currentSubjectClasses.push({
                            id: item,
                            label: item,
                        });
                    });
                    common.fillSelectOptions("KGcreator_subjectSelect", currentSubjectClasses, true, "label", "id");
                    return callbackSeries();
                },
                function (callbackSeries) {
                    $("#sharedPredicatesPanel").load("snippets/commonUIwidgets/editPredicateDialog.html", function () {
                        PredicatesSelectorWidget.init(KGcreator.currentSlsvSource, function () {
                            PredicatesSelectorWidget.onSelectObjectFn = function (value) {};
                            PredicatesSelectorWidget.onSelectPropertyFn = function (value) {};
                        });

                        $("#editPredicate_customPredicateContentDiv").html(
                            `<div style='margin-top: 10px;'>
                                <input type='checkbox' id='KGcreator_isRestrictionCBX' style='height: 20px; width: 20px; border: 1px solid #6e2500; background-color: #ddd;'/>
                                <span style='margin-left: 10px; font-size: 16px; '>Is Restriction</span>
                            </div>`
                        );
                        
                        var html =
                            `<div style='margin-top: 10px;'>
                                <input type='checkbox' id='KGcreator_isObjectStringCBX' style='height: 20px; width: 20px; border: 1px solid #6e2500; background-color: #ddd;'/> 
                                <span style='margin-left: 10px; font-size: 16px; '>is String</span>
                                <br/>
                                <span style='margin-left: 10px;  font-weight: bold; '>Lookup</span>
                                <input id='KGcreator_objectLookupName' style='width:100%;  height: 30px; padding: 10px; margin: 10px 0; border-radius: 5px; border: 1px solid #ccc;'/>
                                <button style='margin-left: 10px; padding: 5px 10px; border-radius: 5px; border: none; background-color: gray; color: white; cursor: pointer;' onclick='KGcreator.handleAddClick()'>Add</button>
                            </div>`;
                        
                        $("#editPredicate_customContentDiv").html(html);
                        return callbackSeries();
                        
                    });
                },

                // fill predicate options
                function (callbackSeries) {
                    return callbackSeries();
                    self.fillPredicatesSelect(self.currentSlsvSource, "KGcreator_predicateSelect", { usualProperties: true }, function (err) {
                        return callbackSeries(err);
                    });
                },

                //fill objectOptions
                function (callbackSeries) {
                    return callbackSeries();
                    Lineage_upperOntologies.getTopOntologyClasses(Config.currentTopLevelOntology, {}, function (err, result) {
                        if (err) {
                            return callbackSeries(err.responseText);
                        }
                        var usualObjectClasses = [
                            { id: "_selectedColumn", label: "_selectedColumn" },
                            { id: "", label: "--------" },
                        ];
                        self.usualObjectClasses.forEach(function (item) {
                            usualObjectClasses.push({
                                id: item,
                                label: item,
                            });
                        });

                        usualObjectClasses = usualObjectClasses.concat({ id: "", label: "--------" }).concat(result);
                        common.fillSelectOptions("KGcreator_usualObjectsSelect", usualObjectClasses, true, "label", "id");

                        return callbackSeries();
                    });
                },

                function (callbackSeries) {
                    self.mainJsonEditor = new JsonEditor("#KGcreator_mainJsonDisplay", {});
                    $("#KGcreator_mainJsonDisplay").on("click", () => {
                        self.mainJsonEditorModified = true;
                    });

                    $("#KGcreator_dialogDiv").dialog({
                        autoOpen: false,
                        height: 600,
                        width: 600,
                        modal: false,
                    });
                    callbackSeries();
                },
            ],

            function (err) {
                if (err) {
                    return alert(err.responseText);
                }
            }
        );
    };
    self.addBasicMapping = function (type) {
        var column = self.currentTreeNode.data.id;
        self.currentJsonObject.tripleModels.push({
            s: column,
            p: "rdf:type",
            o: type,
        });
        self.currentJsonObject.tripleModels.push({
            s: column,
            p: "rdfs:label",
            o: column,
            isString: true,
        });
        if (!self.currentJsonObject.transform[column]) {
            self.currentJsonObject.transform[column] = "function{if (value=='null') return null;if(mapping.isString && role=='o') return value; else return '" + column + "_'+value;}";
        }

        self.mainJsonEditor.load(self.currentJsonObject);
        self.mainJsonEditorModified = true;

        $("#KGcreator_subjectInput").val(column);
    };

    
    self.onCsvtreeNodeClicked = function (event, obj, callback) {
        $("#KGcreator_dataSampleDiv").val("");

        self.currentTreeNode = obj.node;
        if (obj.node.parents.length == 0) {
            return;
        }

        //click column
        if (obj.node.parents.length == 2) {
            self.showSampleData(obj.node);
        } else {
            if (obj.event && obj.event.button != 2) {
                //if popup menu dont load
                self.loadMappings(obj.node.data.id);
            }
        }

        if (obj.node.children.length > 0) {
            return;
        }

        if (self.currentSourceType == "CSV") {
            // load csv columns
            const payload = {
                dir: "CSV/" + self.currentCsvDir,
                name: obj.node.id,
                options: JSON.stringify({ lines: 100 }),
            };

            $.ajax({
                type: "GET",
                url: `${Config.apiUrl}/data/csv`,
                dataType: "json",
                data: payload,
                success: function (result, _textStatus, _jqXHR) {
                  
                    var jstreeData = [];
                    self.csvData = result.data;
                    self.csvHeaders = result.headers;  // save headers



                    result.headers.forEach(function (col) {
                        jstreeData.push({
                            id: obj.node.id + "_" + col,
                            text: col,
                            parent: obj.node.id,
                            data: { id: col, sample: result.data[0] },
                        });
                    });
                    
                    
                // Convert the result into a string
                var rowCount = result.data[0].length;
                self.csvHeaders = 


                    JstreeWidget.addNodesToJstree("KGcreator_csvTreeDiv", obj.node.id, jstreeData);
                    self.columnDataList = jstreeData.map(function(col) {
                        return col.text;
                    });
                
                    
                },
                error: function (err) {
                    // alert(err.responseText);
                },
            });
        }
    };

    //RML Mapping file generator 

    $(document).ready(() => {
        $("#KGcreator_subjectSelect").change(() => {
            $("#newSelect").toggle($(this).children("option:selected").val() === "_blankNode");
        });
    });

    self.initializeSubjectsData = function() {
        self.subjects = {};
        self.subjectList = [];
    
        self.blankNodeList = [];
        self.usedTemplates = [];
    }

    self.validateTripleElements = function(subject, predicate, object) {
        if (!subject) {
            return alert("missing subject");
        }
        if (!predicate) {
            return alert("missing predicate");
        }
        if (!object) {
            return alert("missing object");
        }
    }

    self.handleBlankNode = function(subject) {
        if(!self.blankNodeList.includes(subject)){
                          // check if '_blankNode' is already a key in the counter object
                          if (!self.counter.hasOwnProperty(subject)) {
                            // if not, add it with a value of 1
                            self.counter[subject] = 1;
                        } else {
                            // if yes, increment the value
                            self.counter[subject] += 1;
                        }
                        // add '_blankNode' with its counter to the blankNodeList
                        self.blankNodeList.push(subject + self.counter[subject]);
                    }
        return subject;
    }

    self.handleBlankNodeTemplates = function() {
        let selectedBlankNode = $('#subjectSelect').val();
        let template = $('#Selected_BlankNodeID').val(); 

        let existingBlankNode = Object.keys(self.blankNodeTemplates).find(key => self.blankNodeTemplates[key] === template);
        if (existingBlankNode && existingBlankNode !== selectedBlankNode) {
            alert(`The template ${template} is already assigned to the blank node ${existingBlankNode}. Please enter a unique template.`);
            return;
        }
        self.blankNodeTemplates[selectedBlankNode] = template;
        $('#Selected_BlankNodeID').val('');
        $('#subjectSelect').val('');
        $('#blankNodeID').val('');

    }

    self.populateBlankNodeSelect = function() {
        var blankNodeSelect = $("#KGcreator_blankNodeSelect_existingList");
        blankNodeSelect.empty();
        self.blankNodeList.forEach(blankNode => blankNodeSelect.append(new Option(blankNode, blankNode)));
    }

    self.handleSubjects = function(subject, predicate, object) {
        if (!self.subjects[subject]) {  // If the subject doesn't exist
            self.subjects[subject] = {};  // Add it to the dictionary
        }
        if (!self.subjects[subject][predicate]) {  // If the predicate for this subject doesn't exist
            self.subjects[subject][predicate] = [];  // Add it to the subject's dictionary
        }
        if (!self.subjects[subject][predicate].includes(object)) {  // If the object does not already exist for this predicate
            self.subjects[subject][predicate].push(object);  // Add the object to the predicate's array
        } else {
            alert("This predicate-object pair already exists for the subject.");
        }
    }

    self.refreshSubjectSelect = function(subject) {
        let subjectSelect = document.getElementById('subjectSelect');
        subjectSelect.innerHTML = '';
        let placeholderOption = new Option('Select a _blankNode');
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        subjectSelect.add(placeholderOption);
        self.blankNodeList.filter(sub => sub !== subject).forEach(sub => {
            let option = new Option(sub, sub);
            subjectSelect.add(option);
        });
    }

    self.generateRML = function() {
        $("#KGcreator_tripleMessageDiv").html("");
        let subject = $("#KGcreator_subjectInput").val();
        let predicate = $("#editPredicate_propertyValue").val();
        let object = $("#editPredicate_objectValue").val();
        let isObjectString = $("#KGcreator_isObjectStringCBX").prop("checked");
        let subjectLookupName = $("#KGcreator_subjectLookupName").val();
        let objectLookupName = $("#KGcreator_objectLookupName").val();
        let isRestrictionCBX = $("#KGcreator_isRestrictionCBX").prop("checked");
        let isSpecificPredicate = $("#KGcreator_isSpecificPredicateCBX").prop("checked");
        let tripleObject = $("#subjectSelect").val();
        let selectedBlankNode = $('#subjectSelect').val();
        let template = $('#Selected_BlankNodeID').val(); 

       
            


        self.validateTripleElements(subject, predicate, object);

        if (subject === "_blankNode") {
            self.handleBlankNode(subject);
        }

        self.handleBlankNodeTemplates();
        self.populateBlankNodeSelect();

       

        if (subject !== "_blankNode") {
            if (!self.subjectList.includes(subject)) {
                self.subjectList.push(subject);
            }
        }

        self.handleSubjects(subject, predicate, object);

        let rml = "";

        for (let key in self.rmlPrefixes) {
            rml += `@prefix ${key}: <${self.rmlPrefixes[key]}>.\n`;
        }

        rml += "@base <http://example.com/ns#>.\n\n";

        for (let subject in self.subjects) {
            
            if (subject === "_blankNode") {
                let uniqueBlankNodeName = `_blankNode${self.blankNodeCounter}`;
                self.blankNodeCounter++;
                Object.defineProperty(self.subjects, uniqueBlankNodeName, Object.getOwnPropertyDescriptor(self.subjects, subject));
                delete self.subjects[subject];
                subject = uniqueBlankNodeName;
            }

            rml += `<#${subject}Mapping>\n`;
            rml += "   a rr:TriplesMap;\n";
            rml += "   rml:logicalSource [\n";
            rml += `        rml:source "${self.currentJsonObject.fileName}";\n`;
            rml += "        rml:referenceFormulation ql:CSV\n";
            rml += "   ];\n\n";

            if (subject.startsWith("_blankNode")) {
                rml += "   rr:subjectMap [\n";
                rml += "        rr:termType rr:BlankNode;\n";
                
                let template = self.blankNodeTemplates[subject];
                if (template) {
                    rml += `        rr:template "${template}";\n`;
                }
                rml += "   ];\n\n";
            } else {
                rml += `   rr:subjectMap [\n`;
                rml += `        rr:termType rr:BlankNode;\n`;
                rml += `        rr:class <http://example.com/ns#${subject}>;\n`;
                rml += `   ];\n\n`;
            }

            let predicates = Object.keys(self.subjects[subject]);
            for (let i = 0; i < predicates.length; i++) {
                let predicate = predicates[i];
                for (let j = 0; j < self.subjects[subject][predicate].length; j++) {
                    let object = self.subjects[subject][predicate][j];

                    rml += "   rr:predicateObjectMap [\n";
                    rml += `        rr:predicate ${predicate};\n`;
                    rml += "        rr:objectMap [\n";
                    if (object === "_blankNodeSubjectTriple") {
                        rml += `               rr:termType rr:BlankNode;\n`;
                        rml += `               rr:template "${template}";\n`;
                    } else if (self.columnDataList.includes(object)) {
                        if (self.subjectList.includes(object)) {
                            rml += `               rr:parentTriplesMap <#${object}Mapping>;\n`;
                            rml += "               rr:joinCondition [\n";
                            rml += `                      rr:child "${object}";\n`;
                            rml += `                      rr:parent "${object}"\n`;
                            rml += "               ];\n";
                        } else {
                            rml += `               rr:reference "${object}"\n`;
                        }
                    } else {
                        rml += `               rr:constant ${object}`;
                    }

                    rml += "        ];\n";
                    if (i === predicates.length - 1 && j === self.subjects[subject][predicate].length - 1) {
                        rml += "   ].\n\n";
                    } else {
                        rml += "   ];\n\n";
                    }
                }
            }
        }

        var rmlTextarea = document.getElementById("rmlTextarea");
        if (rmlTextarea) {
            rmlTextarea.value = rml;
        }
    }


window.onload = () => {
    self.initializeSubjectsData();
};







 
    


 

    
    function showModal() {
        var subject = $("#KGcreator_subjectInput").val();
        var modal = document.getElementById("myModal");
    
        // Show the modal
        modal.style.display = "block";
    
        var subjectSelect = document.getElementById('subjectSelect');
        subjectSelect.innerHTML = '';
    
        // Create a new option for placeholder
        var placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.text = 'Select a _blankNode';
        placeholderOption.selected = true; // This option will be selected by default
        placeholderOption.disabled = true; // The user cannot select this option
    
        // Add the placeholder option to the select element
        subjectSelect.add(placeholderOption);
    
        self.blankNodeList
            .filter(function(sub) {
                return sub !== subject; // This line filters out the current subject from the list
            })
            .forEach(function(sub) {
                // Create a new option element
                var option = document.createElement('option');
                option.value = sub;
                option.text = sub;
    
                // Add the option to the select element
                subjectSelect.add(option);
            });
            $(document).ready(function() {
                $("#subjectSelect").change(function() {
                    var selectedOption = $(this).children("option:selected").val();
                    if (selectedOption.startsWith("_blankNode")) {
                        // Clear existing options
                        $("#blankNodeID").empty();
                        console.log("headers"+self.csvHeaders)
            
                        // Populate options from csvHeaders
                        self.columnDataList.forEach(function(header) {
                            $("#blankNodeID").append(new Option(header, header));
                        });
            
                        // Add the special option at the end, with a special CSS class
                        var specialOption = new Option("Generate an ID", "Generate an ID");
                        $(specialOption).addClass('specialOption');
                        $("#blankNodeID").append(specialOption);
            
                        // Show the select input
                        $("#blankNodeID").show();
                        $("#note").show();

            
                    } else {
                        // Hide the select input and the input field
                        $("#blankNodeID").hide();
                        $("#Selected_BlankNodeID").hide();
                        // Also hide the note
                        $("#note").hide();
                    }
                });
                // Handle change event for blankNodeID
                $("#blankNodeID").change(function() {
                    var selectedOption = $(this).children("option:selected").val();
                    // Set the text of the input field according to the selected option
                    $("#Selected_BlankNodeID").val("_yourkey_{" + selectedOption + "}");
            
                    // Show the input field
                    $("#Selected_BlankNodeID").show();
                });
            });
            
            
            
        // Enable the subjectSelect
        subjectSelect.disabled = false;
        

    
        // Attach the onclick event to the button
        var modalButton = document.getElementById("modalButton");
        modalButton.onclick = KGcreator.generateRML;
    }
    
    self.closeModal = function() {
        var modal = document.getElementById("myModal");
        modal.style.display = "none";
    }
    
     
     
    self.handleAddClick = function() {
        var object = $("#editPredicate_objectValue").val();
    
        if (object.trim() === "_blankNodeSubjectTriple") {
            // Here you call the function that presents the modal
            // Let's assume it's called showModal()
            showModal();
        } else {
            self.generateRML();
        }
    }

        self.createRDFTriples = function () {

            var rmlString = $('#rmlTextarea').val();  
            var fileName = self.currentJsonObject.fileName;  
        
        
            var csvHeaders = self.columnDataList ;
        

            console.log("Headers:", csvHeaders);
            console.log("First row of original data:", self.csvData[0]);
            
            var csvData = self.csvData.map(row => {
              var newRow = csvHeaders.map(header => {
                if (row[header] === undefined) {
                  console.log(`No property '${header}' in row`, row);
                }
                return row[header];
              });
              return newRow;
            });
            
            console.log(csvData)


            
            
        
            var data = {
                rml: rmlString,
                sources: [{
                    fileName: fileName,
                    csvHeaders: csvHeaders,
                    csvData: csvData
                }]
            };

            console.log(data)


            $.ajax({
                url: 'http://localhost:9090/api/mapping',  // replace with your actual Spring Boot app URL
                method: 'POST',
                data: JSON.stringify(data),
                contentType: 'application/json',
                success: function(responseData) {
                    $('#KGcreator_dataSampleDiv').val(responseData);  // replace with your actual output textarea id
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert('Error during the RML mapping process: ' + errorThrown);
                }
            });

        };
      
      


    self.addTripleToTA = function () {
        
        $("#KGcreator_tripleMessageDiv").html("");
        var subject = $("#KGcreator_subjectInput").val();
        //  var predicate = $("#KGcreator_predicateInput").val();
        //  var object = $("#KGcreator_objectInput").val();

        var predicate = $("#editPredicate_propertyValue").val();
        var object = $("#editPredicate_objectValue").val();

        var isObjectString = $("#KGcreator_isObjectStringCBX").prop("checked");

        var subjectLookupName = $("#KGcreator_subjectLookupName").val();
        var objectLookupName = $("#KGcreator_objectLookupName").val();
        var isRestrictionCBX = $("#KGcreator_isRestrictionCBX").prop("checked");
        var isSpecificPredicate = $("#KGcreator_isSpecificPredicateCBX").prop("checked");

        $("#KGcreator_objectSelect").val("");
        $("#KGcreator_predicateSelect").val("");

        if (!subject) {
            return alert("missing subject");
        }
        if (!predicate) {
            return alert("missing predicate");
        }
        if (!object) {
            return alert("missing object");
        }
        /*  if (predicate == "_part14Predefined") {
predicate = self.getPredefinedPart14PredicateFromClasses(subject, object);
}*/

        var tripleObj = { s: subject, p: predicate, o: object };

        if (predicate.indexOf("xsd:") == 0) {
            tripleObj.dataType = predicate;
        }

        if (isObjectString) {
            tripleObj.isString = true;
        } else if (predicate.toLowerCase().indexOf("label") > -1) {
            tripleObj.isString = true;
        } else if (predicate.toLowerCase().indexOf("definedby") > -1) {
            tripleObj.isString = true;
        } else if (predicate.toLowerCase().indexOf("comment") > -1) {
            tripleObj.isString = true;
        } else if (predicate.toLowerCase().indexOf("example") > -1) {
            tripleObj.isString = true;
        }

        if (subjectLookupName) {
            tripleObj.lookup_s = subjectLookupName;
        }
        if (objectLookupName) {
            tripleObj.lookup_o = objectLookupName;
        }

        if (isRestrictionCBX) {
            tripleObj.isRestriction = true;
            if (self.propertiesMap[predicate] && self.propertiesMap[predicate].inversePropLabel) {
                tripleObj.inverseRestrictionProperty = self.propertiesMap[predicate].inversePropLabel;
            }
        }
        if (isSpecificPredicate) {
            tripleObj.isSpecificPredicate = true;
        }

        self.currentJsonObject.tripleModels.push(tripleObj);

        self.mainJsonEditor.load(self.currentJsonObject);
        self.mainJsonEditorModified = true;

        $("#KGcreator_objectInput").val("");
        $("#KGcreator_objectSelect").val("");
        $("#KGcreator_predicateInput").val("");
        $("#KGcreator_predicateSelect").val("");

        //   $("#KGcreator_tripleTA").val(JSON.stringify(tripleObj))
    };

    self.onTripleModelSelect = function (role, value) {
        self.currentTripleModelRole = role;
   
        if (role == "s") {
            if (value == "_blankNode"){
                $("#KGcreator_blankNodeSelect").show();
                  // Add a change handler for KGcreator_blankNodeSelect
                $("#KGcreator_blankNodeSelect").change(function() {
                    var selectedOption = $(this).children("option:selected").val();
                    if (selectedOption == "_newBlankNode") {
                        $("#KGcreator_blankNodeSelect_existingList").hide();
                        $("#KGcreator_subjectInput").val(value);
                    }else {
                        $("#KGcreator_blankNodeSelect_existingList").show();
                        var existingBlankNode_SelectedOption = $("#KGcreator_blankNodeSelect_existingList").children("option:selected").val();
                        $("#KGcreator_subjectInput").val(existingBlankNode_SelectedOption);

                    }
                });
                    
            } else {
                $("#KGcreator_blankNodeSelect").hide();
            }
            
            if (value == "_function") {
                return self.showFunctionDialog(role);
            }
    
            if (value == "_selectedColumn") {
                $("#KGcreator_subjectInput").val(self.currentTreeNode.text);
            } else {
                $("#KGcreator_subjectInput").val(value);
            }
            //  $("#KGcreator_subjectSelect").val("");
        } else if (role == "p") {
            $("#KGcreator_predicateInput").val(value);

            //   $("#KGcreator_predicateSelect").val("");
        } else if (role == "o") {
            if (value == "_selectedColumn") {
                $("#KGcreator_objectInput").val(self.currentTreeNode.text);
            } else {
                $("#KGcreator_objectInput").val(value);
            }

            //   $("#KGcreator_objectSelect").val("");
        }
    };

    self.addLookup = function () {
        var lookup = {
            name: $("#KGCreator_lookupName").val(),
            fileName: $("#KGCreator_lookupFileName").val(),
            sourceColumn: $("#KGCreator_lookupSourceColumn").val(),
            targetColumn: $("#KGCreator_lookupTargetColumn").val(),
            transformFn: $("#KGCreator_lookupTransformFn").val().replace(/"/g, "'"),
        };
        self.currentJsonObject = self.mainJsonEditor.get();
        self.currentJsonObject.lookups.push(lookup);
        self.mainJsonEditor.load(self.currentJsonObject);
        self.mainJsonEditorModified = true;
        $("#KGcreator_dialogDiv").dialog("close");
    };

    self.showFunctionDialog = function (_role) {
        $("#KGcreator_dialogDiv").load("snippets/KGcreator/functionDialog.html");
        $("#KGcreator_dialogDiv").dialog("open");
    };
    self.testFunction = function () {
        var fnBody = $("#KGcreator_fnBody").val();
        fnBody = fnBody.replace(/"/g, "'");
        try {
            new Function("row", "mapping", fnBody);
            $("#KGcreator_testFnResult").html("function OK");
        } catch (err) {
            $("#KGcreator_testFnResult").html("error in function code " + err.message);
        }
    };
    self.addFunction = function () {
        var fnBody = $("#KGcreator_fnBody").val();
        fnBody = fnBody.replace(/"/g, "'");

        try {
            new Function("row", "mapping", fnBody);
        } catch (err) {
            return alert("error in function code " + err.message);
        }
        var fnObject = "function{" + fnBody + "}";
        //  var fnObject=JSON.stringify({"_function":fnBody})
        var role = self.currentTripleModelRole;
        if (role == "s") {
            $("#KGcreator_subjectInput").val(fnObject);
        } else if (role == "p") {
            $("#KGcreator_predicateInput").val(fnObject);
        } else if (role == "o") {
            $("#KGcreator_objectInput").val(fnObject);
        }
        $("#KGcreator_dialogDiv").dialog("close");
    };

    self.addTransformFunction = function () {
        var column = $("#KGcreator_transformColumn").val();
        var fnBody = $("#KGcreator_fnBody").val();
        fnBody = fnBody.replace(/"/g, "'");

        try {
            new Function("value", "role", "prop", "row", fnBody);
        } catch (err) {
            return alert("error in function code " + err.message);
        }
        fnBody = "function{" + fnBody + "}";
        self.currentJsonObject = self.mainJsonEditor.get();
        if (!self.currentJsonObject.transform) {
            self.currentJsonObject.transform = {};
        }
        self.currentJsonObject.transform[column] = fnBody;
        self.mainJsonEditor.load(self.currentJsonObject);
        self.mainJsonEditorModified = true;

        $("#KGcreator_dialogDiv").dialog("close");
    };

    /* self.saveClassMapping=function() {
var classId=prompt("Class id for this Mapping")
if(classId)
self.saveMappings({classId:classId})
}*/
self.saveRMLMappings = function () { 
   var rml = $("#rmlTextarea").val();

    if (rml.trim() === "") {
        alert("R2RML mapping is empty. Please enter valid mapping.");
        return;
    }else {
    if (!confirm("Save modified RML?")) {
        return;
    } }
    $("#KGcreator_saveFileButton");

   

    var payload = {
        dir: "RML/", // Update the directory path to where you want to save the R2RML mapping file
        fileName: self.currentTreeNode.data.id + ".rml", // Update the file name with the .ttl extension
        data: rml,
    };

    $.ajax({
        type: "POST",
        url: `${Config.apiUrl}/data/file`,
        data: payload,
        dataType: "json",
        success: function (_result, _textStatus, _jqXHR) {
            MainController.UI.message("File saved");
        },
        error(err) {
            return alert(err.responseText);
        },
    });
};
    self.saveMappings = function (options, callback) {
        try {
            var data = self.mainJsonEditor.get();
        } catch (err) {
            alert(err.message);
        }
        if (!options) {
            options = {};
        }
        self.checkModel(self.currentSource, function (err, result) {
            if (err) {
                $("#KGcreator_dataSampleDiv").val(err);
                if (!confirm("errors in mappings , save anyway ?")) return;
            }
            MainController.UI.message("Mapping conssitant with model");

            self.currentJsonObject = data;

            var payload = {};
            if (self.currentDataSourceModel) {
                self.currentCsvDir = self.currentdabase.dbName;

                self.currentJsonObject.databaseSource = self.currentdabase;

                payload = {
                    dir: "CSV/" + self.currentSlsvSource,
                    fileName: self.currentdabase.dbName + "_" + self.currentJsonObject.fileName + ".json",
                    data: JSON.stringify(self.currentJsonObject),
                };
            } else {
                payload = {
                    dir: "CSV/" + self.currentCsvDir,
                    fileName: self.currentSource + "_" + self.currentJsonObject.fileName + ".json",
                    data: JSON.stringify(self.currentJsonObject),
                };
            }

            $.ajax({
                type: "POST",
                url: `${Config.apiUrl}/data/file`,
                data: payload,
                dataType: "json",
                success: function (_result, _textStatus, _jqXHR) {
                    MainController.UI.message("json saved");
                    if (callback) {
                        return callback();
                    }
                },
                error(err) {
                    if (callback) {
                        return callback(err);
                    }
                    return alert(err.responseText);
                },
            });
        });
    };
    self.clearRML = function () {
        if (confirm("Clear RML textarea")) {
            $("#rmlTextarea").val("");
            self.subjects = {};
            self.subjectList = []; 
        }
    };
    

    self.clearMappings = function () {
        if (confirm("Clear mappings")) {
            self.mainJsonEditor.load({});
            self.mainJsonEditorModified = false;
        }
    };

    self.setUpperOntologyPrefix = function () {
        var currentTopLevelOntology = Config.topLevelOntologies[Config.currentTopLevelOntology];
        if (!currentTopLevelOntology) {
            return;
        }
        if (!self.currentJsonObject.prefixes) {
            self.currentJsonObject.prefixes = {};
            if (!self.currentJsonObject.prefixes[currentTopLevelOntology.prefix]) {
                self.currentJsonObject.prefixes[currentTopLevelOntology.prefix] = currentTopLevelOntology.prefixtarget;
            }
        } else {
            currentTopLevelOntology = Lineage_sources.setTopLevelOntologyFromPrefix(Object.keys(self.currentJsonObject.prefixes)[0]);
            $("#KGcreator_topLevelOntologiesSelect").val(currentTopLevelOntology);
        }
    };

    self.loadMappings = function (csvFileName, callback) {
        function getMappingFileJson(callback2) {
            var currentJsonObject = {};
            var payload = {};
            if (self.currentDataSourceModel) {
                var dbName = self.currentDbName;
                payload = {
                    dir: "CSV/" + self.currentSlsvSource,
                    name: dbName + "_" + csvFileName + ".json",
                };
            } else {
                payload = {
                    dir: "CSV/" + self.currentCsvDir,
                    name: self.currentSource + "_" + csvFileName + ".json",
                };
            }
            $.ajax({
                type: "GET",
                url: `${Config.apiUrl}/data/file`,
                data: payload,
                dataType: "json",
                success: function (result, _textStatus, _jqXHR) {
                    currentJsonObject = JSON.parse(result);

                    callback2(null, currentJsonObject);
                },
                error(_err) {
                    currentJsonObject = {
                        fileName: csvFileName,
                        tripleModels: [],
                        transform: {},
                        lookups: [],
                        graphUri: "",
                    };
                    callback2(null, currentJsonObject);
                },
            });
        }

        if (callback) {
            return getMappingFileJson(function (err, result) {
                return callback(null, result);
            });
        } else {
            function showMappings() {
                return getMappingFileJson(function (err, result) {
                    self.currentJsonObject = result;
                    self.mainJsonEditor.load(result);
                    self.setUpperOntologyPrefix();

                    self.mainJsonEditorModified = false;

                    if (!self.currentJsonObject.graphUri) {
                        currentJsonObject.graphUri = currentGraphUri || "";
                    } else {
                        self.currentGraphUri = self.currentJsonObject.graphUri;
                    }
                });
            }

            if (self.mainJsonEditorModified) {
                //self.currentJsonObject && self.currentJsonObject.tripleModels && self.currentJsonObject.tripleModels.length > 0) {
                if (!self.currentJsonObject.fileName) {
                    return showMappings();
                }

                if (confirm(" save current json before opening new file")) {
                    self.saveMappings(null, function (_err, _result) {
                        showMappings();
                    });
                } else {
                    showMappings();
                }
            } else {
                showMappings();
            }
        }
    };
    self.createTriples = function (test, _options) {
        MainController.UI.message("creating triples...");
        $("#KGcreator_dataSampleDiv").val("creating triples...");
        if (!self.currentJsonObject) {
            return;
        }

        var dataLocation = "";
        if (self.currentSourceType != "CSV") {
            // return alert("only triples from csv sources can be generated : IN PROGRESS, COMING SOON");
            dataLocation = { xxx: "ee" };
        } else {
            dataLocation = self.currentJsonObject.fileName;
        }

        if ($("#KGcreator_onlySelectionCBX").prop("checked")) {
            var selection = common.getInputSelection();
        }

        if (!self.currentJsonObject.graphUri) {
            var graphUri = "";
            if (self.currentGraphUri) {
                graphUri = self.currentGraphUri;
            }
            graphUri = prompt("enter graphUri", graphUri);
            if (!graphUri) {
                return;
            }
            self.currentGraphUri = graphUri;
            self.currentJsonObject = self.mainJsonEditor.get();
            self.currentJsonObject.graphUri = graphUri;
            self.mainJsonEditor.load(self.currentJsonObject);
        }
        var options = {};
        if (test) {
            options = {
                deleteOldGraph: false,
                sampleSize: 500,
                dataLocation: dataLocation,
            };
        } else {
            options = {
                deleteOldGraph: false,
                dataLocation: dataLocation,
            };
        }
        if (_options && _options.deleteTriples) {
            options.deleteTriples = true;
        }

        self.saveMappings(null, function (_err, _result) {
            if (_err) {
                return alert(_err);
            }
            $("#KGcreator_dataSampleDiv").val("");
            var payload;
            if (self.currentSourceType == "CSV") {
                payload = {
                    dir: "CSV/" + self.currentCsvDir,
                    fileName: self.currentSource + "_" + self.currentJsonObject.fileName + ".json",
                    options: JSON.stringify(options),
                };
            } else if (self.currentSourceType == "DATABASE") {
                payload = {
                    dir: "CSV/" + self.currentSlsvSource,
                    fileName: self.currentDbName + "_" + self.currentJsonObject.fileName + ".json",
                    options: JSON.stringify(options),
                };
            }

            $.ajax({
                type: "POST",
                url: `${Config.apiUrl}/kg/csv/triples`,
                data: payload,
                dataType: "json",
                success: function (result, _textStatus, _jqXHR) {
                    if (test) {
                        var str = JSON.stringify(result, null, 2);

                        $("#KGcreator_dataSampleDiv").val(str);
                        MainController.UI.message("", true);
                    } else {
                        $("#KGcreator_dataSampleDiv").val(result.countCreatedTriples + " triples created in graph " + self.currentJsonObject.graphUri);
                        MainController.UI.message("triples created", true);
                    }
                },
                error(err) {
                    return alert(err.responseText);
                },
            });
        });
    };

    self.indexGraph = function () {
        var graphSource = null;
        for (var source in Config.sources) {
            if (Config.sources[source].graphUri == self.currentGraphUri) {
                graphSource = source;
            }
        }
        if (!source) {
            return alert("no source associated to graph " + self.currentGraphUri);
        }
        if (confirm("index source " + graphSource)) {
            SearchUtil.generateElasticIndex(graphSource, null, function (err, _result) {
                if (err) {
                    return alert(err);
                }
                $("#KGcreator_dataSampleDiv").val("indexed graph " + self.currentJsonObject.graphUri + " in index " + graphSource.toLowerCase());
            });
        }
    };

    self.clearGraph = function (deleteAllGraph) {
        if (!self.currentJsonObject) {
            return;
        } //alert("no file mappings selected");
        if (!self.currentJsonObject.graphUri) {
            return alert("no graphUri");
        }

        if (!confirm("Do you really want to clear graph " + self.currentJsonObject.graphUri)) {
            return;
        }
        const payload = { graphUri: self.currentJsonObject.graphUri };
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/kg/clearGraph`,
            data: payload,
            dataType: "json",
            success: function (_result, _textStatus, _jqXHR) {
                return MainController.UI.message("graph deleted " + self.currentJsonObject.graphUri);
            },
            error(err) {
                return MainController.UI.message(err);
            },
        });
    };

    self.deleteKGcreatorTriples = function (deleteAllGraph) {
        if (!self.currentJsonObject) {
            return;
        } //alert("no file mappings selected");
        if (!self.currentJsonObject.graphUri) {
            return alert("no graphUri");
        }

        if (deleteAllGraph) {
            if (!confirm("Do you really want to delete  triples created with KGCreator in " + self.currentJsonObject.graphUri)) {
                return;
            }

            var filter = "?p =<http://purl.org/dc/terms/creator> && ?o='KGcreator'";
            Sparql_generic.deleteTriplesWithFilter(self.currentSlsvSource, filter, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                alert("triples deleted");
            });
        } else {
            if (!confirm("Do you really want to delete  triples created with KGCreator in " + self.currentJsonObject.fileName)) {
                return;
            }
            self.createTriples(false, { deleteTriples: true });
        }
    };


    self.showSampleData = function (node, allColumns, size, callback) {
        if (!size) {
            size = 200;
        }
        if (node.data.sample) {
            //csv
            $("#KGcreator_dataSampleDiv").val("");

            var str = "";

            if (allColumns) {
                var headers = [];
                node.data.sample.forEach(function (item) {
                    for (var key in item)
                        if (headers.indexOf(key) < 0) {
                            headers.push(key);
                            str += key + "\t";
                        }
                });
       
                str += "\n";

                node.data.sample.forEach(function (item) {
                    headers.forEach(function (column) {
                        str += (item[column] || "") + "\t";
                    });
                    str += "\n";
                });
            } else {
                str = "Sample data for column " + node.data.id + "\n";

                node.data.sample.forEach(function (item) {
                    str += item[node.data.id] + "\n";
                });
            }
            if (callback) {
                return callback(null, str);
            }
            $("#KGcreator_dataSampleDiv").val(str);
        } else if (self.currentSourceType == "DATABASE") {
            var sqlQuery = "select top  " + size + " " + (allColumns ? "*" : node.data.id) + " from " + node.parent;
            const params = new URLSearchParams({
                type: "sql.sqlserver",
                dbName: self.currentDbName,
                sqlQuery: sqlQuery,
            });

            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/kg/data?" + params.toString(),
                dataType: "json",

                success: function (data, _textStatus, _jqXHR) {
                    $("#KGcreator_dataSampleDiv").val("");
                    var str = "";
                    if (allColumns) {
                        var headers = [];
                        data.forEach(function (item) {
                            for (var key in item)
                                if (headers.indexOf(key) < 0) {
                                    headers.push(key);
                                    str += key + "\t";
                                }
                        });
                        str += "\n";

                        data.forEach(function (item, index) {
                            headers.forEach(function (column) {
                                str += (item[column] || "") + "\t";
                            });
                            str += "\n";
                        });
                    } else {
                        var str = "Sample data for column " + node.data.id + "\n";
                        str += "";
                        data.forEach(function (item) {
                            str += item[node.data.id] + "\n";
                        });
                    }
                    if (callback) {
                        return callback(null, str);
                    }
                    $("#KGcreator_dataSampleDiv").val(str);
                },
                error(err) {
                    if (callback) {
                        return callback(err);
                    }
                    return alert(err.responseText);
                },
            });
        }
    };

    self.createPrefixTransformFn = function () {
        var prefix = prompt("Enter Prefix", self.currentTreeNode.data.id);
        if (!prefix) {
            return;
        }
        var str = "if(mapping.isString && role=='o') return value; else return '" + prefix + "_'+value;";
        $("#KGcreator_fnBody").val(str);
    };

    self.graphMappings = function () {
        var mappingsTriples = self.currentJsonObject.tripleModels;
        var visjsData = { nodes: [], edges: [] };
        var existingNodes = {};
        var shape = "box";
        mappingsTriples.forEach(function (item) {
            function getColor(str) {
                if (str.indexOf("http") > -1) {
                    return "#70ac47";
                }
                if (str.indexOf(":") > -1) {
                    return "#0067bb";
                }
                return "#fdbf01";
            }

            if (!existingNodes[item.s]) {
                existingNodes[item.s] = 1;
                visjsData.nodes.push({
                    id: item.s,
                    label: item.s,
                    shape: shape,
                    color: getColor(item.s),
                });
            }
            if (!existingNodes[item.o]) {
                existingNodes[item.o] = 1;
                visjsData.nodes.push({
                    id: item.o,
                    label: item.o,
                    shape: shape,
                    color: getColor(item.o),
                });
            }
            var edgeId = item.s + item.p + item.o;
            if (!existingNodes[edgeId]) {
                existingNodes[edgeId] = 1;
                visjsData.edges.push({
                    id: edgeId,
                    from: item.s,
                    to: item.o,
                    label: item.p,
                    // color: getColor(item.o),
                    arrows: {
                        to: {
                            enabled: true,
                            type: Lineage_classes.defaultEdgeArrowType,
                            scaleFactor: 0.5,
                        },
                    },
                });
            }
        });

        var html = "<div id='KGcreator_mappingsGraphDiv' style='width:900px;height:750px'></div>";
        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").html(html);
        visjsGraph.draw("KGcreator_mappingsGraphDiv", visjsData, {}, function () {});
    };

    /**
     *
     * fills select options with sourxe and upperOntology predicates
     *
     * @param source
     * @param selectId
     * @param callback
     */
    self.fillPredicatesSelect = function (source, selectId, options, callback) {
        var sourcePredicates = [];
        Sparql_OWL.getObjectProperties(source, { withoutImports: 1 }, function (err, result) {
            if (err) {
                callback(err);
            }
            result.sort(function (a, b) {
                if (!a.propertyLabel || !b.propertyLabel) {
                    return 0;
                }
                if (a.propertyLabel.value > b.propertyLabel.value) {
                    return 1;
                }
                if (a.propertyLabel.value < b.propertyLabel.value) {
                    return -1;
                }
                return 0;
            });

            result.forEach(function (item) {
                sourcePredicates.push({ label: item.propertyLabel.value, id: item.property.value });
            });

            Lineage_upperOntologies.getUpperOntologyObjectPropertiesDescription(Config.currentTopLevelOntology, false, function (err, result) {
                if (err) {
                    return callback(err.responseText);
                }
                var predicates = [];
                if (options.usualProperties) {
                    KGcreator.usualProperties.forEach(function (item) {
                        predicates.push({ label: item, id: item });
                    });
                    predicates.push({ label: "-------", id: "" });
                }

                predicates = predicates.concat(sourcePredicates);

                predicates.push({ label: "-------", id: "" });

                var prefix = Config.topLevelOntologies[Config.currentTopLevelOntology].prefix;
                for (var key in result) {
                    var item = result[key];
                    predicates.push({ label: prefix + ":" + item.propLabel, id: item.prop });
                }

                common.fillSelectOptions(selectId, predicates, true, "label", "id");
                return callback();
            });
        });
    };

    self.initModel = function (source, callback) {
        Sparql_OWL.getObjectRestrictions(source, null, null, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            self.currentSourceRestrictions = {};
            var data = [];
            result.forEach(function (item) {
                for (var key in item) {
                    item[key] = item[key].value;
                }
                self.currentSourceRestrictions[item.prop] = item;
            });
            return callback(null, self.currentSourceRestrictions);
        });
    };

    /**
     * check if prdicate are conform to restrictions defined in Lineage_classes
     *
     *
     * @param source
     * @param callback
     */
    self.checkModel = function (source, callback) {
        var sourceObjects = {};
        self.getAllMappings(function (err, allMappings) {
            for (var subject in allMappings) {
                var item = allMappings[subject];
                item.forEach(function (mapping) {
                    if (["rdf:type", "rdfs:subClassOf"].indexOf(mapping.p) > -1 && mapping.o.indexOf("http:") > -1) {
                        sourceObjects[subject] = mapping.o;
                    }
                });
            }

            var errors = "";
            //   mappings.tripleModels.forEach(function(item) {
            for (var subject in allMappings) {
                var item = allMappings[subject];
                item.forEach(function (mapping) {
                    var restriction = self.currentSourceRestrictions[mapping.p];
                    if (restriction) {
                        if (sourceObjects[subject] && sourceObjects[subject] != restriction.subject) {
                            errors += " missing column with type  " + restriction.subject + "\n for prop " + restriction.propLabel + "(subject)\n";
                        }
                        if (sourceObjects[mapping.o] && sourceObjects[mapping.o] != restriction.value) {
                            errors += " missing column with type  " + restriction.subject + "\n for prop " + restriction.propLabel + " (object)\n";
                        }
                    }
                });
            }
            return callback(errors);
        });
    };

    self.getAllMappings = function (callback) {
        var allMappings = {};
        var files = Object.keys(self.mappingFiles);
        async.eachSeries(
            files,
            function (file, callbackEach) {
                var file2 = file.substring(file.indexOf("_") + 1);
                self.loadMappings(file2, function (err, result) {
                    if (err) return callbackEach();

                    for (var key in result.tripleModels) {
                        var mapping = result.tripleModels[key];
                        if (!allMappings[mapping.s]) allMappings[mapping.s] = [];
                        allMappings[mapping.s].push({ p: mapping.p, o: mapping.o });
                    }

                    callbackEach();
                });
            },
            function (err) {
                self.allMappingsSubjectsmap = allMappings;
                return callback(null, allMappings);
            }
        );
    };
    return self;
})();

export default KGcreator;

window.KGcreator = KGcreator;
