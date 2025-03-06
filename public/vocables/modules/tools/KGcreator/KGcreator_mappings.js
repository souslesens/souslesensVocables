import KGcreator from "./KGcreator.js";
import KGcreator_graph from "./KGcreator_graph.js";
import SimpleListSelectorWidget from "../../uiWidgets/simpleListSelectorWidget.js";

var KGcreator_mappings = (function () {
    var self = {};

    self.showMappingDialog = function (addColumnClassType, options, callback) {
        PopupMenuWidget.hidePopup();

        if (!options) {
            options = {};
        }

        self.currentSlsvSource = KGcreator.currentSlsvSource;
        self.currentColumn = {
            node: KGcreator.currentTreeNode,
            triples: [],
        };
        var columnNode = self.currentColumn.node;

        if (options.rowIndex) {
            self.currentColumn.rowIndex = 1;
            columnNode.data.table = columnNode.data.id;
            columnNode.data.id = "_rowIndex";
        } else {
            if (!columnNode) {
                alert("Click on Table column to map it with this class");
                return;
            }
        }
        /*   if (columnNode.data.type.indexOf("Column") < 0) {
return alert("select a field (column)");
}*/

        if (false && !columnNode.data.table) {
            alert("Select a column not a Table");
            return;
        }
        $("#smallDialogDiv").parent().css("z-index", 100);

        $("#smallDialogDiv").dialog("option", "title", "Mapping " + columnNode.data.table + "." + columnNode.data.id);
        $("#smallDialogDiv").css("height", "700px");
        //$("#smallDialogDiv").parent().css("left", "10%");
        /*$("#smallDialogDiv").css('left','10%');*/
        $("#smallDialogDiv").load("./modules/tools/KGcreator/html/columnMappingsDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
            $("#LinkColumn_rightPanel").show();
            $("#LinkColumn_basicTypeSelect").show();
            $("#LinkColumn_basicTypeSelect").parent().find("span").show();

            PredicatesSelectorWidget.load("LinkColumn_predicateSelectorDiv", self.currentSlsvSource, { "flex-direction": "column" }, function () {
                $("#editPredicate_vocabularySelect2").css("display", "inline");
                $("#editPredicate_vocabularySelect2").val("usual");
                $("#smallDialogDiv").find("#editPredicate_mainDiv").css("flex-direction", "column");
                PredicatesSelectorWidget.init(self.currentSlsvSource, function () {
                    PredicatesSelectorWidget.onSelectObjectFn = function (value) {};
                    PredicatesSelectorWidget.onSelectPropertyFn = function (value) {};
                    $("#smallDialogDiv").find("#editPredicate_savePredicateButton").css("display", "none");
                    $("#KGcreator_dialogDiv").dialog({
                        autoOpen: false,
                        modal: false,
                    });
                    var html =
                        "<div>isBlankNode<input type='checkbox' id='LinkColumn_isObjectBlankNodeCBX' />" +
                        "is String <input type='checkbox' id='LinkColumn_isObjectStringCBX' /><br> " +
                        " lookup name <input id='LinkColumn_objectLookupName'/></div>";
                    $("#editPredicate_customContentDiv").html(html);
                    //

                    $("#editPredicate_objectSelect").bind("change", function () {
                        KGcreator_mappings.onTripleModelSelect("o", $(this).val());
                    });

                    $("#editPredicate_vocabularySelect2").bind("change", function () {
                        KGcreator_mappings.onTripleModelSelect("o", $(this).val());
                    });

                    $("#editPredicate_currentVocabPredicateSelect").bind("change", function () {
                        KGcreator_mappings.onTripleModelSelect("p", $(this).val());
                    });

                    $("#LinkColumn_subjectInput").val(columnNode.data.id);
                    $("#editPredicate_vocabularySelect2").append('<option value="table_Column">table Column</option>');
                });

                self.columnJsonEditor = new JsonEditor("#KGcreator_columnJsonDisplay", {});
                // Add blank nodes $_column-name

                // var existingTriples = KGcreator.getColumnsMappings(columnNode.data.table, options.rowIndex ? null : columnNode.data.id, "s");

                var existingTriples = KGcreator.getColumnsMappings(columnNode.data.table, null, "s");

                if (existingTriples[columnNode.data.id]) {
                    self.updateColumnTriplesEditor(existingTriples[columnNode.data.id]);
                }
                if (existingTriples[columnNode.data.id + "_$"]) {
                    self.updateColumnTriplesEditor(existingTriples[columnNode.data.id + "_$"]);
                }

                if (addColumnClassType && KGcreator_graph.currentGraphNode.data.id) {
                    var classTypeTriple = {
                        s: columnNode.data.id,
                        p: "rdf:type",
                        o: KGcreator_graph.currentGraphNode.data.id,
                    };
                    self.updateColumnTriplesEditor(classTypeTriple);
                }
            });
            if (callback) {
                return callback();
            }
        });
    };

    self.onTripleModelSelect = function (role, value) {
        if (!value) {
            return;
        }
        self.currentMappingRole = role;
        var columnNode = self.currentColumn.node;

        if (value == "_function") {
            return self.showFunctionDialog(role);
        }

        if (role == "s") {
            if (value == "_selectedColumn") {
                $("#LinkColumn_subjectInput").val(columnNode.data.id);
            } else if (value == "_virtualColumn") {
                $("#LinkColumn_subjectInput").val(columnNode.data.id + "_$");
            } else {
                $("#LinkColumn_subjectInput").val(value);
            }
        } else if (role == "p") {
            if (value == "_function") {
                return self.showFunctionDialog(role);
            } else {
                $("#editPredicate_propertyValue").val(value);
            }
        } else if (role == "o") {
            if (value == "_function") {
                return self.showFunctionDialog(role);
            } else if (value == "table_Column") {
                var table = columnNode.data.table;
                var columns = KGcreator.currentConfig.currentDataSource.tables[table];
                common.fillSelectOptions("editPredicate_objectSelect", columns, true);
            } else {
                $("#editPredicate_objectValue").val(value);
            }
        }
    };

    self.updateColumnTriplesEditor = function (triples, column) {
        if (!Array.isArray(triples)) {
            triples = [triples];
        }

        triples.forEach(function (triple) {
            if (Object.keys(triple).length >= 3) {
                self.currentColumn.triples.push(triple);
            }
        });
        self.columnJsonEditor.load(self.currentColumn.triples);
    };

    self.addBasicMapping = function (basicType) {
        if (basicType) {
            var column = self.currentColumn.node.data.id;
            var triples = [];
            triples.push({
                s: column,
                p: "rdf:type",
                o: basicType,
            });
            triples.push({
                s: column,
                p: "rdfs:label",
                o: column,
                isString: true,
            });
            self.updateColumnTriplesEditor(triples);
        }
    };
    self.addTripleFromPredicateSelectorWidget = function (basicType) {
        // var subject = self.currentColumn.node.data.id;
        /*  var subjectType=$("#LinkColumn_subjectSelect").val();
  if(subjectType!="_selectedColumn")*/
        var subject = $("#LinkColumn_subjectInput").val();
        /* var predicate = PredicatesSelectorWidget.getSelectedProperty();
     var object = PredicatesSelectorWidget.getSelectedObjectValue();*/
        var predicate = $("#editPredicate_propertyValue").val();
        var object = $("#editPredicate_objectValue").val();
        var isSubjectBlankNode = $("#LinkColumn_isSubjectBlankNodeCBX").prop("checked");
        var isObjectBlankNode = $("#LinkColumn_isObjectBlankNodeCBX").prop("checked");
        var isObjectString = $("#LinkColumn_isBlankNode").prop("checked");
        var isRestrictionCBX = $("#LinkColumn_isRestrictionCBX").prop("checked");
        var subjectLookupName = $("#LinkColumn_subjectLookupName").val();
        var objectLookupName = $("#LinkColumn_objectLookupName").val();
        var isSpecificPredicate = $("#LinkColumn__isSpecificPredicateCBX").prop("checked");

        if (!subject) {
            return alert("missing subject");
        }
        if (!predicate) {
            return alert("missing predicate");
        }
        if (!object) {
            return alert("missing object");
        }

        var tripleObj = { s: subject, p: predicate, o: object };

        if (predicate.indexOf("xsd:") == 0) {
            tripleObj.dataType = predicate;
            tripleObj.p = "owl:hasValue";
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
        if (isSubjectBlankNode) {
            tripleObj.s = subject + "_$";
        }
        if (isObjectBlankNode) {
            tripleObj.o = object + "_$";
        }
        if (isRestrictionCBX) {
            tripleObj.isRestriction = true;
        }
        /*   if (subject.indexOf("http://") > 0 && object.indexOf("function") < 0) {
tripleObj.subjectIsSpecificUri = true;
}
if (object.indexOf("http://") > 0 && object.indexOf("function") < 0) {
tripleObj.objectIsSpecificUri = true;
}*/
        self.updateColumnTriplesEditor(tripleObj);
        self.saveColumnMappings(true);
    };
    self.addLookup = function () {
        var lookup = {
            name: $("#KGCreator_lookupName").val(),
            fileName: $("#KGCreator_lookupTable").val(),
            sourceColumn: $("#KGCreator_lookupSourceColumnSelect").val(),
            targetColumn: $("#KGCreator_lookupTargetColumnSelect").val(),
            transformFn: $("#KGCreator_lookupTransformFn").val().replace(/"/g, "'"),
        };

        if (!lookup.name) {
            return alert("name is mandatory");
        }
        if (!lookup.fileName) {
            return alert("fileName is mandatory");
        }
        if (!lookup.sourceColumn) {
            return alert("sourceColumn is mandatory");
        }
        if (!lookup.targetColumn) {
            return alert("targetColumn is mandatory");
        }

        KGcreator.currentConfig.currentMappings.lookups.push(lookup);
        KGcreator.saveDataSourceMappings();
        $("#smallDialogDiv").dialog("close");
    };
    self.showFunctionDialog = function (_role) {
        $("#KGcreator_dialogDiv").load("/old/html/snippets/KGcreator/functionDialog.html", function () {
            $("#KGcreator_dialogDiv").dialog("open");
        });
    };

    self.createPrefixTransformFn = function () {
        if (!self.currentTreeNode) {
            var column_selected = $("#KGcreator_transformColumnSelect").val();
        } else {
            var column_selected = self.currentTreeNode.data.id;
        }
        var prefix = prompt("Enter Prefix", column_selected);
        if (!prefix) {
            return;
        }
        var str = "if((mapping.isString||mapping.dataType) && role=='o') return value; else return '" + prefix + "-'+value;";
        $("#KGcreator_fnBody").val(str);
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

    self.addFunction = function (role) {
        if (!role) {
            role = self.currentMappingRole;
        }
        var fnBody = $("#KGcreator_fnBody").val();
        fnBody = fnBody.replace(/"/g, "'");

        try {
            new Function("row", "mapping", fnBody);
        } catch (err) {
            return alert("error in function code " + err.message);
        }
        var fnObject = "function{" + fnBody + "}";
        //  var fnObject=JSON.stringify({"_function":fnBody})

        if (role == "s") {
            $("#LinkColumn_subjectInput").val(fnObject);
        } else if (role == "p") {
            $("#editPredicate_propertyValue").val(fnObject);
        } else if (role == "o") {
            $("#editPredicate_objectValue").val(fnObject);
        }
        $("#KGcreator_dialogDiv").dialog("close");
    };

    self.addTransformFunction = function () {
        var table = self.currentTable;
        if (!table) {
            return alert("no table selected");
        }

        var column = $("#KGcreator_transformColumnSelect").val();
        var fnBody = $("#KGcreator_fnBody").val();
        fnBody = fnBody.replace(/"/g, "'");

        try {
            new Function("value", "role", "prop", "row", fnBody);
        } catch (err) {
            return alert("error in function code " + err.message);
        }
        fnBody = fnBody.replace(/"/g, "'");
        fnBody = "function{" + fnBody + "}";
        if (!KGcreator.currentConfig.currentMappings[self.currentTable].transform) {
            KGcreator.currentConfig.currentMappings[self.currentTable].transform = {};
        }
        KGcreator.currentConfig.currentMappings[self.currentTable].transform[column] = fnBody;
        self.transformJsonEditor.load(KGcreator.currentConfig.currentMappings[self.currentTable].transform);
    };

    self.saveTransform = function () {
        var json;
        try {
            json = self.transformJsonEditor.get();
        } catch (e) {
            return alert(e);
        }
        KGcreator.currentConfig.currentMappings[self.currentTable].transform = json;
        KGcreator.saveDataSourceMappings();
        $("#smallDialogDiv").dialog("close");
    };

    self.saveColumnMappings = function (keepDialogOpen) {
        var columnNode = self.currentColumn.node;
        if (!KGcreator.currentConfig.currentMappings[columnNode.data.table]) {
            KGcreator.currentConfig.currentMappings[columnNode.data.table] = { tripleModels: [], transforms: [] };
        }
        var newColumnMappings;
        try {
            newColumnMappings = self.columnJsonEditor.get();
        } catch (e) {
            return alert(e);
        }

        //concat new triples from editor with other mappings in table
        KGcreator.currentConfig.currentMappings[columnNode.data.table].tripleModels.forEach(function (triple) {
            if (triple.s.replace("_$", "") == columnNode.data.id) {
                return;
            }
            newColumnMappings.push(triple);
        });

        KGcreator.currentConfig.currentMappings[columnNode.data.table].tripleModels = newColumnMappings;
        KGcreator.saveDataSourceMappings();

        JstreeWidget.setSelectedNodeStyle({ color: "#0067bb" });

        if (self.currentGraphNode) {
            columnNode.data.classNode = KGcreator_graph.currentGraphNode.id;
            KGcreator_graph.drawColumnToClassGraph([columnNode]);
        }
        if (!keepDialogOpen) {
            $("#smallDialogDiv").dialog("close");
        }
    };

    self.saveTableMappings = function (tableId, tableMappings) {
        if (!tableMappings) {
            return alert("incorrect data");
        }
        if (!tableId) {
            return alert("incorrect data");
        }
        if (!tableMappings[tableId]) {
            return alert("incorrect data");
        }
        var tripleModels = tableMappings[tableId].tripleModels;
        if (!tripleModels) {
            return alert("no tripleModels");
        }

        if (!KGcreator.currentConfig.currentMappings[tableId]) {
            KGcreator.currentConfig.currentMappings[tableId] = { tripleModels: [], transform: {} };
        }
        KGcreator.currentConfig.currentMappings[tableId].tripleModels = tripleModels;
        var transform = tableMappings[tableId].transform;

        if (transform) {
            KGcreator.currentConfig.currentMappings[self.currentEditingTable].transform = transform;
        }
        var virtualColumns = tableMappings[tableId].virtualColumns;
        if (virtualColumns) {
            KGcreator.currentConfig.currentMappings[self.currentEditingTable].virtualColumns = virtualColumns;
        }
        KGcreator.saveDataSourceMappings();
    };

    self.joinColumns = function (columnFromData, columnToData, foreignKey, callback) {
        var joins = {
            fromTable: columnFromData.table,
            toTable: columnToData.table,
            fromColumn: foreignKey,
            toColumn: columnToData.columnName,
        };
        KGcreator.rawConfig.databaseSources[KGcreator.currentConfig.currentDataSource.name].tableJoins.push(joins);
        KGcreator.saveSlsvSourceConfig();
        return callback();
    };

    self.setPredicatesBetweenColumnsInTable = function (columnFromData, columnToData, foreignKey, callback) {
        OntologyModels.registerSourcesModel(KGcreator.currentSlsvSource, null, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }

            var fromClass = KGcreator.getColumnClass(columnFromData.table, columnFromData.id);
            var toClass = KGcreator.getColumnClass(columnToData.table, columnToData.id);
            var constraints = OntologyModels.getClassesConstraints(KGcreator.currentSlsvSource, fromClass, toClass);
            var restrictions = OntologyModels.getClassesRestrictions(KGcreator.currentSlsvSource, fromClass, toClass);
            var inverseRestrictions = OntologyModels.getClassesRestrictions(KGcreator.currentSlsvSource, toClass, fromClass);

            var targetColumnInTable = columnToData.columnName;
            if (foreignKey) {
                targetColumnInTable = foreignKey;
            }

            var allConstraints = {};
            for (var key in constraints) {
                allConstraints[key] = constraints[key];
            }
            for (var key in restrictions) {
                allConstraints[key] = restrictions[key];
            }
            for (var key in inverseRestrictions) {
                inverseRestrictions[key].inverse = true;
                allConstraints[key] = inverseRestrictions[key];
            }
            if (Object.keys(allConstraints).length == 0) {
                var message = "no constraints between " + fromClass + " and " + toClass;
                if (callback) {
                    return callback(message);
                }
                return alert(message);
            } else {
                return SimpleListSelectorWidget.showDialog(
                    null,
                    function (callbackLoad) {
                        return callbackLoad(Object.keys(allConstraints));
                    },

                    function (selectedProperty) {
                        if (!selectedProperty) {
                            return;
                        }

                        //write the join between tables if foreignKey
                        if (foreignKey) {
                            self.joinColumns(columnFromData, columnToData, foreignKey, function (err, result) {
                                if (err) {
                                    return callback(err);
                                }
                            });
                        }

                        if (inverseRestrictions[selectedProperty] && inverseRestrictions[selectedProperty].inverse) {
                            if (confirm("link columns " + columnToData.label + " to" + columnFromData.label + " with property " + selectedProperty)) {
                                var triple = {
                                    s: columnToData.id,
                                    p: selectedProperty,
                                    o: columnFromData.id,
                                };
                                KGcreator.currentConfig.currentMappings[columnFromData.table].tripleModels.push(triple);
                                KGcreator.saveDataSourceMappings(
                                    KGcreator.currentSlsvSource,
                                    KGcreator.currentConfig.currentDataSource.name,
                                    KGcreator.currentConfig.currentMappings,
                                    function (err, result) {
                                        KGcreator_mappings.showTableMappings(columnFromData.table);
                                    },
                                );
                            }
                        } else {
                            if (confirm("link columns " + columnFromData.label + " to" + columnToData.label + " with property " + selectedProperty)) {
                                var triple = {
                                    s: columnFromData.id,
                                    p: selectedProperty,
                                    o: columnToData.id,
                                };
                                KGcreator.currentConfig.currentMappings[columnFromData.table].tripleModels.push(triple);
                                KGcreator.saveDataSourceMappings(
                                    KGcreator.currentSlsvSource,
                                    KGcreator.currentConfig.currentDataSource.name,
                                    KGcreator.currentConfig.currentMappings,
                                    function (err, result) {
                                        KGcreator_mappings.showTableMappings(columnFromData.table);
                                    },
                                );
                            }
                        }
                    },
                );
            }
        });
    };

    self.showLookupsDialog = function (node) {
        PopupMenuWidget.hidePopup();
        self.currentSlsvSource = KGcreator.currentSlsvSource;
        var table = node.data.id;

        //$("#smallDialogDiv").parent().css("left", "10%");
        $("#smallDialogDiv").dialog("option", "title", "Lookups for " + table);

        $("#smallDialogDiv").load("./modules/tools/KGcreator/html/lookupDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
            $("#KGCreator_lookupName").val(table);
            $("#KGCreator_lookupTable").val(table);

            var columns = [];
            KGcreator.currentConfig.currentDataSource.tables[table].forEach(function (column) {
                columns.push(column);
            });
            common.fillSelectOptions("KGCreator_lookupSourceColumnSelect", columns, true);
            common.fillSelectOptions("KGCreator_lookupTargetColumnSelect", columns, true);
        });
    };

    self.showTransformDialog = function (node) {
        PopupMenuWidget.hidePopup();
        self.currentSlsvSource = KGcreator.currentSlsvSource;
        var table = node.data.id;
        self.currentTable = table;

        $("#smallDialogDiv").dialog("option", "title", "Lookups for " + table);

        $("#smallDialogDiv").load("./modules/tools/KGcreator/html/transformDialog.html", function () {
            $("#smallDialogDiv").dialog("open");
            var columns = [];
            KGcreator.currentConfig.currentDataSource.tables[table].forEach(function (column) {
                columns.push(column);
            });

            if (KGcreator.currentConfig.currentMappings[table]) {
                var virtualColumns = KGcreator.currentConfig.currentMappings[table].virtualColumns;
                if (virtualColumns) {
                    columns = virtualColumns.concat(columns);
                }
            }

            common.fillSelectOptions("KGcreator_transformColumnSelect", columns, true);

            var transforms = KGcreator.currentConfig.currentMappings[table].transform;
            if (!transforms) {
                transforms = {};
            }
            self.transformJsonEditor = new JsonEditor("#KGcreator_transformJsonDisplay", {});

            self.transformJsonEditor.load(transforms);
            //   $(".json-editor-blackbord *").css("color","#fff")
        });
    };

    self.showTableMappings = function (table) {
        KGcreator_graph.drawDetailedMappings(table);
        self.showMappingsInEditor(table);
    };

    self.showDataSourceMappings = function (node) {
        KGcreator_graph.drawDetailedMappings(null);
        self.showMappingsInEditor(null);
    };

    self.showMappingsInEditor = function (table) {
        if (!KGcreator.currentConfig.currentMappings) {
            return alert("no mappings selected");
        }
        var json = {};
        if (table) {
            var tableMappings = KGcreator.currentConfig.currentMappings[table];
            json = { [table]: tableMappings };
            self.currentEditingTable = table;
        } else {
            json = KGcreator.currentConfig.currentMappings;
            self.currentEditingTable = null;
        }

        self.jsonEditor = new JsonEditor("#KGcreator_mappingsEditor", json);
        $("#KGcreator_mappingsEditor").on("mouseup", function () {
            var selection = KGcreator.getTextSelection();
            if (selection) {
                self.currentMappingsSelection = selection;
            }
        });
    };

    self.saveEditorMappings = function () {
        var mappings;
        try {
            mappings = self.jsonEditor.get();
        } catch (e) {
            return alert(e);
        }
        if (self.currentEditingTable) {
            KGcreator_mappings.saveTableMappings(self.currentEditingTable, mappings);
        } else {
            KGcreator.saveDataSourceMappings();
        }
        KGcreator_mappings.showTableMappings(self.currentEditingTable);
    };

    self.afterMappingsFn = function () {
        KGcreator_mappings.showTableMappings(node.id);
    };

    return self;
})();

export default KGcreator_mappings;
window.KGcreator_mappings = KGcreator_mappings;
