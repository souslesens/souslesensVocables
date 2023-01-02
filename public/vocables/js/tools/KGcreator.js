//https://openbase.com/js/@json-editor/json-editor/documentation

var KGcreator = (function () {
    var self = {};
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
        "",
    ];

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

    self.mappingFiles = {};
    self.onLoaded = function () {
        $("#actionDivContolPanelDiv").load("snippets/KGcreator/leftPanel.html", function () {
            self.loadCsvDirs();
            self.showSourcesDialog(function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                $("#graphDiv").load("snippets/KGcreator/centralPanel.html", function () {
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
        $("#KGcreator_csvTreeDiv").empty();
        $("#KGcreator_csvDirsSelect").val("_default");

        SourceBrowser.searchableSourcesTreeIsInitialized = null;
        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").load("./snippets/searchAll.html", function () {
            //    $("#sourceDivControlPanelDiv").load("./snippets/searchAll.html", function () {
            SourceBrowser.showSearchableSourcesTreeDialog(["OWL"], { includeSourcesWithoutSearchIndex: true }, function () {
                var source = $("#searchAll_sourcesTree").jstree(true).get_selected()[0];
                $("#sourcesSelectionDialogdiv").dialog("close");
                $("#mainDialogDiv").dialog("close");
                self.currentSource = source;
                Config.currentTopLevelOntology = Lineage_sources.setTopLevelOntologyFromImports(source);

                self.currentGraphUri = Config.sources[source].graphUri;
                if (!Config.currentTopLevelOntology) {
                    return alert("Source must have an upper ontology import");
                }
                $("#KGcreator_owlSourceInput").html(source);
                $("#KGcreator_topLevelOntologiesInput").html(Config.currentTopLevelOntology);
                self.topLevelOntologyPrefix = Config.topLevelOntologies[Config.currentTopLevelOntology].prefix;
                if (callback) {
                    callback(null);
                }
            });
        });
    };
    self.onChangeSourceTypeSelect = function (sourceType, callback) {
        self.currentSourceType = sourceType;
        if (sourceType == "CSV") {
            self.loadCsvDirs();
        } else if (sourceType == "DATABASE") {
            self.loadDataBases(callback);
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
        self.mainJsonEditor = new JsonEditor("#KGcreator_mainJsonDisplay", {});

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
    self.listObjects = function () {
        console.log("KGcreator.listObjects");
        self.currentDataSourceModel = null;
        self.currentdabase = null;
        self.loadMappingsList();
        if (self.currentSourceType == "CSV") {
            self.listFiles();
        } else if (self.currentSourceType == "DATABASE") {
            self.listTables();
        }
    };

    self.displayUploadApp = function () {
        $.getScript("/kg_upload_app.js");
    };

    self.loadMappingsList = function () {
        self.currentCsvDir = $("#KGcreator_csvDirsSelect").val();
        self.currentSource = self.currentCsvDir;
        var payload = {
            dir: "CSV/" + self.currentCsvDir,
        };
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/data/files",
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                self.mappingFiles = {};
                result.forEach(function (file) {
                    var p;
                    if ((p = file.indexOf(".json")) > -1) {
                        self.mappingFiles[file.substring(0, p) + ".csv"] = 1;
                    }
                });
            },
            error: function (err) {
                alert(err.responseText);
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
            if (self.mappingFiles[file]) {
                label = "<span class='KGcreator_fileWithMappings'>" + file + "</span>";
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

        common.jstree.loadJsTree("KGcreator_csvTreeDiv", jstreeData, options);
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

                    result.headers.forEach(function (col) {
                        jstreeData.push({
                            id: obj.node.id + "_" + col,
                            text: col,
                            parent: obj.node.id,
                            data: { id: col, sample: result.data[0] },
                        });
                    });
                    common.jstree.addNodesToJstree("KGcreator_csvTreeDiv", obj.node.id, jstreeData);
                },
                error: function (err) {
                    // alert(err.responseText);
                },
            });
        }
    };
    self.getSystemsTreeContextMenu = function () {
        var items = {};

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
                $("#KGcreator_objectInput").val(self.currentTreeNode.data.id);
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
        self.usualProperties.forEach(function (item) {
            currentPredicates.push({
                id: item,
                label: item,
            });
        });

        var currentSubjectClasses = [];
        var currentObjectClasses = [];
        self.usualObjectClasses.forEach(function (item) {
            currentObjectClasses.push({
                id: item,
                label: item,
            });
        });

        self.propertiesMap = {};

        async.series(
            [
                function (callbackSeries) {
                    self.getSourcePropertiesAndObjectLists(self.currentSource, topLevelOntology, function (err, result) {
                        currentObjectClasses = currentObjectClasses.concat(result.objectClasses);
                        currentPredicates = result.predicates;
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    currentSubjectClasses = ["_selectedColumn", "--------"].concat(self.usualSubjectTypes);
                    currentObjectClasses = [
                        { id: "_selectedColumn", label: "_selectedColumn" },
                        { id: "", label: "--------" },
                    ].concat(currentObjectClasses);
                    callbackSeries();
                },
                function (callbackSeries) {
                    common.fillSelectOptions("KGcreator_subjectSelect", currentSubjectClasses, true);
                    common.fillSelectOptions("KGcreator_predicateSelect", currentPredicates, true, "label", "id");
                    common.fillSelectOptions("KGcreator_objectSelect", currentObjectClasses, true, "label", "id");

                    self.mainJsonEditor = new JsonEditor("#KGcreator_mainJsonDisplay", {});
                    /*  const element = document.getElementById('KGcreator_mainJsonDisplay',{});
self.mainJsonEditor = new JSONEditor(element, {});*/
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

    self.addTripleToTA = function () {
        $("#KGcreator_tripleMessageDiv").html("");
        var subject = $("#KGcreator_subjectInput").val();
        var predicate = $("#KGcreator_predicateInput").val();
        var object = $("#KGcreator_objectInput").val();
        var isObjectString = $("#KGcreator_isObjectStringCBX").prop("checked");

        var subjectLookupName = $("#KGcreator_subjectLookupName").val();
        var objectLookupName = $("#KGcreator_objectLookupName").val();
        var isRestrictionCBX = $("#KGcreator_isRestrictionCBX").prop("checked");
        var isSpecificPredicate = $("#KGcreator_isSpecificPredicateCBX").prop("checked");

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
        if (value == "_function") {
            return self.showFunctionDialog(role);
        }

        if (role == "s") {
            if (value == "_selectedColumn") {
                $("#KGcreator_subjectInput").val(self.currentTreeNode.text);
            } else {
                $("#KGcreator_subjectInput").val(value);
            }
            $("#KGcreator_subjectSelect").val("");
        } else if (role == "p") {
            $("#KGcreator_predicateInput").val(value);

            $("#KGcreator_predicateSelect").val("");
        } else if (role == "o") {
            if (value == "_selectedColumn") {
                $("#KGcreator_objectInput").val(self.currentTreeNode.text);
            } else {
                $("#KGcreator_objectInput").val(value);
            }

            $("#KGcreator_objectSelect").val("");
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

    self.saveMappings = function (options, callback) {
        try {
            var data = self.mainJsonEditor.get();
        } catch (err) {
            alert(err.message);
        }
        if (!options) {
            options = {};
        }

        self.currentJsonObject = data;

        var payload = {};
        if (self.currentDataSourceModel) {
            //database SQL
            self.currentCsvDir = self.currentdabase.dbName;

            self.currentJsonObject.databaseSource = self.currentdabase;
            payload = {
                dir: "SQL/",
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
    };
    /*  self.copyMappings = function() {
try {
var data = self.mainJsonEditor.get();

data.tripleModels.forEach(function(item) {
if (item.o["_function(line, mapping)_"]) {
var expression = item.o["_function(line, mapping)_"];
try {
var fn = new Function("line", "mapping", expression);
} catch (err) {
$("#KGcreator_dataSampleDiv").val(err);
}
item.o = fn;
}
});
} catch (err) {
alert(err.message);
}
};*/
    self.clearMappings = function () {
        if (confirm("Clear mappings")) {
            self.mainJsonEditor.load({});
            self.mainJsonEditorModified = false;
        }
    };
    self.loadMappings = function (csvFileName) {
        function execLoadMappings() {
            self.currentJsonObject = {};
            self.mainJsonEditor.load(self.currentJsonObject);

            setUpperOntologyPrefix = function () {
                var currrentTopLevelOntology = Config.topLevelOntologies[Config.currentTopLevelOntology];
                if (!currrentTopLevelOntology) {
                    return;
                }
                if (!self.currentJsonObject.prefixes) {
                    self.currentJsonObject.prefixes = {};
                    if (!self.currentJsonObject.prefixes[currrentTopLevelOntology.prefix]) {
                        self.currentJsonObject.prefixes[currrentTopLevelOntology.prefix] = currrentTopLevelOntology.prefixtarget;
                    }
                } else {
                    currrentTopLevelOntology = Lineage_sources.setTopLevelOntologyFromPrefix(Object.keys(self.currentJsonObject.prefixes)[0]);
                    $("#KGcreator_topLevelOntologiesSelect").val(currrentTopLevelOntology);
                }
            };

            var payload = {};
            if (self.currentDataSourceModel) {
                //database SQL
                var dbName = self.currentDbName;
                payload = {
                    dir: "SQL/",
                    name: dbName + "_" + +csvFileName + ".json",
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
                    self.currentJsonObject = JSON.parse(result);

                    if (!self.currentJsonObject.graphUri) {
                        self.currentJsonObject.graphUri = self.currentGraphUri || "";
                    } else {
                        self.currentGraphUri = self.currentJsonObject.graphUri;
                    }
                    setUpperOntologyPrefix();
                    self.mainJsonEditor.load(self.currentJsonObject);
                    self.mainJsonEditorModified = false;
                },
                error(_err) {
                    self.currentJsonObject = {
                        fileName: csvFileName,
                        tripleModels: [],
                        transform: {},
                        lookups: [],
                        graphUri: "",
                    };
                    setUpperOntologyPrefix();
                    self.mainJsonEditor.load(self.currentJsonObject);
                },
            });
        }

        if (self.mainJsonEditorModified) {
            //self.currentJsonObject && self.currentJsonObject.tripleModels && self.currentJsonObject.tripleModels.length > 0) {
            if (!self.currentJsonObject.fileName) {
                return execLoadMappings();
            }

            if (confirm(" save current json before opening new file")) {
                self.saveMappings(null, function (_err, _result) {
                    execLoadMappings();
                });
            } else {
                execLoadMappings();
            }
        } else {
            execLoadMappings();
        }
    };
    self.createTriples = function (test, _options) {
        /*  var selectedFiles = $("#KGcreator_csvTreeDiv").jstree().get_checked(true);
if (selectedFiles.length > 0);*/

        $("#KGcreator_dataSampleDiv").val("creating triples...");
        if (!self.currentJsonObject) {
            return;
        }

        var dataLocation = "";
        if (self.currentSourceType != "CSV") {
            return alert("only triples from csv sources can be generated : IN PROGRESS, COMING SOON");
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
            var payload = {
                dir: "CSV/" + self.currentCsvDir,
                fileName: self.currentSource + "_" + self.currentJsonObject.fileName + ".json",
                options: JSON.stringify(options),
            };

            $.ajax({
                type: "POST",
                url: `${Config.apiUrl}/kg/csv/triples`,
                data: payload,
                dataType: "json",
                success: function (result, _textStatus, _jqXHR) {
                    if (test) {
                        var str = JSON.stringify(result, null, 2);

                        $("#KGcreator_dataSampleDiv").val(str);
                    } else {
                        $("#KGcreator_dataSampleDiv").val(result.countCreatedTriples + " triples created in graph " + self.currentJsonObject.graphUri);
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
            Sparql_generic.deleteTriplesWithFilter(self.currentSource, filter, function (err, result) {
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
                    return alert(err, responseText);
                },
            });
        }
    };

    self.getSourcePropertiesAndObjectLists = function (source, topLevelOntology, callback) {
        var propertiesMap = {};
        var currentPredicates = [];
        var currentObjectClasses = [];
        var sourceSpecificPredicates = [];
        currentSpecificObjectPropertiesMap = {};
        domainOntologyProperties = [];
        var topLevelOntologyPrefix = Config.topLevelOntologies[topLevelOntology].prefix;
        async.series(
            [
                // get objects Classes
                function (callbackSeries) {
                    Sparql_OWL.getDictionary(topLevelOntology, null, null, function (err, result) {
                        if (err) {
                            callbackSeries(err);
                        }
                        result.sort(function (a, b) {
                            if (!a.label || !b.label) {
                                return 0;
                            }
                            if (a.label.value > b.label.value) {
                                return 1;
                            }
                            if (a.label.value < b.label.value) {
                                return -1;
                            }
                            return 0;
                        });
                        result.forEach(function (item) {
                            if (!item.id) {
                                return;
                            }
                            if (item.id.type == "bnode") {
                                return;
                            }
                            currentObjectClasses.push({
                                id: item.id.value,
                                label: topLevelOntologyPrefix + ":" + (item.label ? item.label.value : Sparql_common.getLabelFromURI(item.id.value)),
                            });
                        });
                        callbackSeries();
                    });
                },

                //get predicates
                function (callbackSeries) {
                    Sparql_OWL.getObjectPropertiesDomainAndRange(topLevelOntology, null, null, function (err, result) {
                        if (err) {
                            callbackSeries(err);
                        }
                        result.sort(function (a, b) {
                            if (!a.propLabel || !b.propLabel) {
                                return 0;
                            }
                            if (a.propLabel.value > b.propLabel.value) {
                                return 1;
                            }
                            if (a.propLabel.value < b.propLabel.value) {
                                return -1;
                            }
                            return 0;
                        });

                        result.forEach(function (item) {
                            propertiesMap[topLevelOntologyPrefix + ":" + item.propLabel.value] = {
                                id: item.prop.value,
                                label: item.propLabel.value,
                                inverseProp: item.inverseProp ? item.inverseProp.value : null,
                                inversePropLabel: item.inversePropLabel ? topLevelOntologyPrefix + ":" + item.inversePropLabel.value : null,
                            };

                            var item2 = { id: item.prop.value, label: topLevelOntologyPrefix + ":" + item.propLabel.value };
                            if (currentPredicates.indexOf(item2) < 0) {
                                currentPredicates.push(item2);
                            }
                        });
                        // set missing inverse props
                        for (var key in propertiesMap) {
                            if (propertiesMap[key].inversePropLabel) {
                                if (!propertiesMap[propertiesMap[key].inversePropLabel].inversePropLabel) {
                                    propertiesMap[propertiesMap[key].inversePropLabel].inversePropLabel = key;
                                }
                                propertiesMap[propertiesMap[key].inversePropLabel].inverseProp = propertiesMap[key];
                            }
                        }

                        callbackSeries();
                    });
                },

                //get source specific properties and Classes
                function (callbackSeries) {
                    Sparql_OWL.listObjectProperties(source, null, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }

                        result.forEach(function (item) {
                            sourceSpecificPredicates.push({
                                id: "<" + item.prop.value + ">",
                                label: item.propLabel.value,
                            });
                        });

                        callbackSeries();
                    });
                },

                //get  upperOntology properties and Classes
                function (callbackSeries) {
                    Lineage_upperOntologies.getSourcePossiblePredicatesAndObject(source, function (err, result) {
                        if (err) {
                            return alert(err.responseText);
                        }

                        //  self.currentPossibleClassesAndPredicates = result;
                        result.predicates.forEach(function (item) {
                            propertiesMap[item.label] = item.id;
                        });

                        var objs = result.usualObjects.concat({ id: "", label: "------------" }).concat(result.sourceObjects);
                        objs.push({ id: "", label: "------------" });
                        objs = objs.concat(currentObjectClasses);
                        currentObjectClasses = objs;

                        //  var allObjects = result.usualObjects.concat(result.TopLevelOntologyObjects).concat([""]).concat(result.sourceObjects);
                        currentPredicates = result.predicates
                            .concat([
                                {
                                    id: "",
                                    label: "--------",
                                },
                            ])
                            .concat(sourceSpecificPredicates)
                            .concat([
                                {
                                    id: "",
                                    label: "--------",
                                },
                            ])
                            .concat(currentPredicates);

                        callbackSeries();
                    });
                },
                //getUpperOntologyPropertie
                function (callbackSeries) {
                    return callbackSeries();
                    Sparql_OWL.getObjectProperties(Config.currentTopLevelOntology, {}, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        currentPredicates.push({ id: "", label: "----------" });
                        result.forEach(function (item) {
                            currentPredicates.push({ id: item.property.value, label: item.propertyLabel.value });
                        });

                        callbackSeries();
                    });
                },
            ],
            function (err) {
                if (err) {
                    return callback(err);
                }
                return callback(null, { predicates: currentPredicates, objectClasses: currentObjectClasses });
            }
        );
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

    return self;
})();
