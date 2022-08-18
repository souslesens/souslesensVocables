//https://openbase.com/js/@json-editor/json-editor/documentation

var KGcreator = (function () {
    var self = {};
    self.usualProperties = [
        "rdf:type",
        "rdfs:subClassOf",
        "rdfs:label",
        "rdfs:isDefinedBy",
        "rdfs:comment",
        "owl:sameAs",
        "owl:equivalentClass",

        "",
        "slsv:hasCode",
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
        "_part14Predefined",
        "",
        "owl:onProperty",
        "owl:someValuesFrom",
        "owl:allValuesFrom",
        "owl:hasValue",
        "rdfs:subPropertyOf",

        "",
    ];

    self.usualObjectClasses = ["owl:Class", "owl:NamedIndividual", "owl:Thing", "owl:Property", "owl:Restriction", "skos:Concept", "skos:Collection", "slsv:TopConcept", "_function", "_blankNode", ""];

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
        });

        $("#graphDiv").load("snippets/KGcreator/centralPanel.html", function () {
            self.initCentralPanel();
        });
        $("#rightPanelDiv").load("snippets/KGcreator/rightPanel.html", function () {
            // pass
        });
        $("#accordion").accordion("option", { active: 2 });
    };
    self.onChangeSourceTypeSelect = function (sourceType) {
        self.currentSourceType = sourceType;
        if (sourceType == "CSV") {
            self.loadCsvDirs();
        } else if (sourceType == "DATABASE") {
            self.loadDataBases();
        }
    };

    self.loadDataBases = function () {
        var sqlQuery = "SELECT name FROM sys.databases";
        const params = new URLSearchParams({
            type: "sql.sqlserver",
            dbName: "TEPDK2",
            sqlQuery: sqlQuery,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                common.fillSelectOptions("KGcreator_csvDirsSelect", data, true, "name", "name");
            },
            error(err) {
                return alert(err.responseText);
            },
        });
    };

    self.loadCsvDirs = function () {
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
        self.currentDataSourceModel = null;
        self.currentdabase = null;
        self.loadMappingsList();
        if (self.currentSourceType == "CSV") {
            self.listFiles();
        } else if (self.currentSourceType == "DATABASE") {
            self.listTables();
        }
    };

    self.loadMappingsList = function () {
        self.currentCsvDir = $("#KGcreator_csvDirsSelect").val();
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
                    if ((p = file.indexOf(".json")) > -1) self.mappingFiles[file.substring(0, p) + ".csv"] = 1;
                });
            },
            error: function (err) {
                alert(err.responseText);
            },
        });
    };

    self.listTables = function () {
        var dbName = $("#KGcreator_csvDirsSelect").val();
        var type = "sql.sqlserver";

        const params = new URLSearchParams({
            name: dbName,
            type: type,
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/model?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                self.currentDataSourceModel = data;
                var tables = [];
                self.currentdabase = { type: type, dbName: dbName };
                for (var key in data) {
                    tables.push(key);
                }
                self.showTablesTree(tables);
            },
            error: function (_err) {
                alert(err.responseText);
            },
        });
    };

    self.listFiles = function () {
        self.currentCsvDir = $("#KGcreator_csvDirsSelect").val();
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

    self.showTablesTree = function (data) {
        var jstreeData = [];
        var options = {
            openAll: true,
            selectTreeNodeFn: KGcreator.onCsvtreeNodeClicked,
            contextMenu: KGcreator.getSystemsTreeContextMenu(),
            withCheckboxes:true
        };
        data.forEach(function (file) {
            if (file.indexOf(".json") > 0) return;
            var label = file;

            //  if (data.indexOf(file + ".json") > -1)
            if (self.mappingFiles[file]) label = "<span class='KGcreator_fileWithMappings'>" + file + "</span>";
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
                        id: column,
                        text: column,
                        parent: key,
                        data: { id: column },
                    });
                });
            }
        }

        common.jstree.loadJsTree("KGcreator_csvTreeDiv", jstreeData, options);
    };

    self.onCsvtreeNodeClicked = function (event, obj) {
        $("#KGcreator_dataSampleDiv").val("");

        self.currentTreeNode = obj.node;
        if (obj.node.parents.length == 0) return;
        if (obj.node.parents.length == 2) {
            if (obj.node.data.sample) {
                $("#KGcreator_dataSampleDiv").val("");
                var str = "Sample data for column " + obj.node.data.id + "\n";
                str += "";
                obj.node.data.sample.forEach(function (item) {
                    str += item[obj.node.data.id] + "\n";
                });

                $("#KGcreator_dataSampleDiv").val(str);
            } else if (self.currentSourceType == "DATABASE") {
                var dbName = $("#KGcreator_csvDirsSelect").val();
                var sqlQuery = "select top 500 " + obj.node.data.id + " from " + obj.node.parent;
                const params = new URLSearchParams({
                    type: "sql.sqlserver",
                    dbName: dbName,
                    sqlQuery: sqlQuery,
                });

                $.ajax({
                    type: "GET",
                    url: Config.apiUrl + "/kg/data?" + params.toString(),
                    dataType: "json",

                    success: function (data, _textStatus, _jqXHR) {
                        $("#KGcreator_dataSampleDiv").val("");
                        var str = "Sample data for column " + obj.node.data.id + "\n";
                        str += "";
                        data.forEach(function (item) {
                            str += item[obj.node.data.id] + "\n";
                        });

                        $("#KGcreator_dataSampleDiv").val(str);
                    },
                    error(err) {
                        return alert(err, responseText);
                    },
                });
            }
        }else {

            if (obj.event.button != 2)
              //if popup menu dont load
                self.loadMappings(obj.node.data.id);
        }

        if (obj.node.children.length > 0) return;

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
    };
    self.getSystemsTreeContextMenu = function () {
        var items = {};

        items.setAsSubject = {
            label: "Subject",
            action: function (_e) {
                // pb avec source
                if (self.currentTreeNode.parents.length < 2) return;
                $("#KGcreator_subjectInput").val(self.currentTreeNode.data.id);
            },
        };

        items.setAsObject = {
            label: "Object",
            action: function (_e) {
                // pb avec source
                if (self.currentTreeNode.parents.length < 2) return;
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
                if (self.currentTreeNode.parents.length < 1) return;
                $("#KGcreator_dialogDiv").load("snippets/KGcreator/lookupdialog.html", function () {
                    $("#KGCreator_lookupFileName").val(self.currentTreeNode.data.id);
                });
                $("#KGcreator_dialogDiv").dialog("open");
            },
        };
        items.showTransformDialog = {
            label: "Add Transform",
            action: function (_e) {
                // pb avec source
                if (self.currentTreeNode.parents.length != 2) return;
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
                if (self.currentTreeNode.parents.length != 1) return;
                KGcreator.loadMappings();
            },
        };

        return items;
    };

    self.initCentralPanel = function () {
        async.series(
            [
                function (callbackSeries) {
                    Sparql_OWL.getDictionary("ISO_15926-part-14_PCA", null, null, function (err, result) {
                        if (err) callbackSeries(err);
                        result.sort(function (a, b) {
                            if (!a.label || !b.label) return 0;
                            if (a.label.value > b.label.value) return 1;
                            if (a.label.value < b.label.value) return -1;
                            return 0;
                        });
                        result.forEach(function (item) {
                            if (item.id.type == "bnode") return;
                            self.usualObjectClasses.push("part14:" + item.label.value);
                        });
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    Sparql_OWL.getObjectProperties("ISO_15926-part-14_PCA", null, null, function (err, result) {
                        if (err) callbackSeries(err);
                        result.sort(function (a, b) {
                            if (!a.propLabel || !b.propLabel) return 0;
                            if (a.propLabel.value > b.propLabel.value) return 1;
                            if (a.propLabel.value < b.propLabel.value) return -1;
                            return 0;
                        });
                        self.propertiesMap = {};
                        result.forEach(function (item) {
                            self.propertiesMap["part14:" + item.propLabel.value] = {
                                id: item.prop.value,
                                label: item.propLabel.value,
                                inverseProp: item.inverseProp ? item.inverseProp.value : null,
                                inversePropLabel: item.inversePropLabel ? "part14:" + item.inversePropLabel.value : null,
                            };

                            self.usualProperties.push("part14:" + item.propLabel.value);
                        });
                        // set missing inverse props
                        for (var key in self.propertiesMap) {
                            if (self.propertiesMap[key].inversePropLabel) {
                                if (!self.propertiesMap[self.propertiesMap[key].inversePropLabel].inversePropLabel) self.propertiesMap[self.propertiesMap[key].inversePropLabel].inversePropLabel = key;
                                self.propertiesMap[self.propertiesMap[key].inversePropLabel].inverseProp = self.propertiesMap[key];
                            }
                        }

                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    common.fillSelectOptions("KGcreator_subjectSelect", self.usualSubjectTypes, true);
                    common.fillSelectOptions("KGcreator_predicateSelect", self.usualProperties, true);
                    common.fillSelectOptions("KGcreator_objectSelect", self.usualObjectClasses, true);

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
                if (err) return alert(err.responseText);
            }
        );
    };

    self.addTripleToTA = function () {
        $("#KGcreator_tripleMessageDiv").html("");
        var subject = $("#KGcreator_subjectInput").val();
        var predicate = $("#KGcreator_predicateInput").val();
        var object = $("#KGcreator_objectInput").val();
        var isObjectString = $("#KGcreator_isStringCBX").prop("checked");

        var subjectLookupName = $("#KGcreator_subjectLookupName").val();
        var objectLookupName = $("#KGcreator_objectLookupName").val();
        var isRestrictionCBX = $("#KGcreator_isRestrictionCBX").prop("checked");
        var isSpecificPredicate = $("#KGcreator_isSpecificPredicateCBX").prop("checked");

        if (!subject) return alert("missing subject");
        if (!predicate) return alert("missing predicate");
        if (!object) return alert("missing object");
        if (predicate == "_part14Predefined") {
            predicate = self.getPredefinedPart14PredicateFromClasses(subject, object);
        }

        var tripleObj = { s: subject, p: predicate, o: object };

        if (isObjectString) tripleObj.isString = true;
        if (subjectLookupName) tripleObj.lookup_s = subjectLookupName;
        if (objectLookupName) tripleObj.lookup_o = objectLookupName;

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
        if (role == "s") $("#KGcreator_subjectInput").val(value);
        else if (role == "p") $("#KGcreator_predicateInput").val(value);
        else if (role == "o") {
            $("#KGcreator_objectInput").val(value);
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
        if (role == "s") $("#KGcreator_subjectInput").val(fnObject);
        else if (role == "p") $("#KGcreator_predicateInput").val(fnObject);
        else if (role == "o") $("#KGcreator_objectInput").val(fnObject);
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
        self.currentJsonObject = self.mainJsonEditor.get();
        if (!self.currentJsonObject.transform) self.currentJsonObject.transform = {};
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
        if (!options) options = {};

        self.currentJsonObject = data;

        var payload = {};
        if (self.currentDataSourceModel) {
            //database SQL
            self.currentJsonObject.databaseSource = self.currentdabase;
            payload = {
                dir: "SQL/",
                fileName: self.currentdabase.dbName + "_" + self.currentJsonObject.fileName + ".json",
                data: JSON.stringify(self.currentJsonObject),
            };
        } else {
            payload = {
                dir: "CSV/" + self.currentCsvDir,
                fileName: self.currentJsonObject.fileName + ".json",
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
                if (callback) return callback();
            },
            error(err) {
                if (callback) return callback(err);
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

            var payload = {};
            if (self.currentDataSourceModel) {
                //database SQL
                var dbName = $("#KGcreator_csvDirsSelect").val();
                payload = {
                    dir: "SQL/",
                    name: dbName + "_" + csvFileName + ".json",
                };
            } else {
                payload = {
                    dir: "CSV/" + self.currentCsvDir,
                    name: csvFileName + ".json",
                };
            }
            $.ajax({
                type: "GET",
                url: `${Config.apiUrl}/data/file`,
                data: payload,
                dataType: "json",
                success: function (result, _textStatus, _jqXHR) {
                    self.currentJsonObject = JSON.parse(result);

                    if (!self.currentJsonObject.graphUri) self.currentJsonObject.graphUri = self.currentGraphUri || "";
                    else self.currentGraphUri = self.currentJsonObject.graphUri;

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
                    }; // return alert(err.responseText)
                },
            });
        }

        if (self.mainJsonEditorModified) {
            //self.currentJsonObject && self.currentJsonObject.tripleModels && self.currentJsonObject.tripleModels.length > 0) {
            if (!self.currentJsonObject.fileName) return execLoadMappings();

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
    self.createTriples = function (test) {
        var selectedFiles=$("#KGcreator_csvTreeDiv").jstree().get_checked(true);
        if( selectedFiles.length>0)
            ;

        $("#KGcreator_dataSampleDiv").val("creating triples...");
        if (!self.currentJsonObject) return;
        if (!self.currentJsonObject.graphUri) {
            var graphUri = "";
            if (self.currentGraphUri) graphUri = self.currentGraphUri;
            graphUri = prompt("enter graphUri", graphUri);
            if (!graphUri) return;
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
            };
        } else {
            options = {
                deleteOldGraph: false,
            };
        }

        //  options.addAllPredefinedPart14PredicatesTriples = $("#KGcreator_addAllPredefinedPart14PredicatesTriples").prop("checked");

        self.saveMappings(null, function (_err, _result) {
            $("#KGcreator_dataSampleDiv").val("");
            var payload = {
                dir: "CSV/" + self.currentCsvDir,
                fileName: self.currentJsonObject.fileName + ".json",
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





                        /*    SearchUtil.generateElasticIndex(Lineage_common.currentSource,{ids:[self.graphModification.creatingNodeUri]},function(err, result) {
            })*/
                    }
                },
                error(err) {
                    return alert(err.responseText);
                },
            });
        });
    };


    self.indexGraph=function(){
        var graphSource=null;
        for (var source in Config.sources){
            if(Config.sources[source].graphUri==self.currentGraphUri)
                graphSource=source
        }
        if(!source)
            return alert("no source associated to graph "+self.currentGraphUri)
        if( confirm("index source "+graphSource)) {
            SearchUtil.generateElasticIndex(graphSource, null, function(err, _result) {
                if(err)
                    return alert(err);
                $("#KGcreator_dataSampleDiv").val("indexed graph "+ self.currentJsonObject.graphUri +" in index "+graphSource.toLowerCase());

            });
        }
    }

    self.clearGraph = function () {
        if (!self.currentJsonObject) return; //alert("no file mappings selected");
        if (!self.currentJsonObject.graphUri) return alert("no graphUri");

        if (!confirm("clear graph " + self.currentJsonObject.graphUri)) return;
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

    self.addAllPredefinedPart14PredicatesTriples = function () {
        // pass
    };

    self.getPredefinedPart14PredicateFromClasses = function (subjectClass, objectClass) {
        var pred = null;
        self.predefinedPart14Relations.forEach(function (item) {
            if (item[0] == subjectClass && item[1] == objectClass) {
                pred = "part14:" + item[2];
            }
        });
        if (!pred) return alert(" no Predicate between " + subjectClass + " and " + objectClass);

        return pred;
    };

    return self;
})();
