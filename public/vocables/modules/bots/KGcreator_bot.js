import _botEngine from "./_botEngine.js";
import KGcreator from "../tools/KGcreator/KGcreator.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import KGcreator_mappings from "../tools/KGcreator/KGcreator_mappings.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";

var KGcreator_bot = (function() {
    var self = {};

    self.callbackFn = function() {
        if (self.params.table) {
            KGcreator_mappings.showTableMappings(self.params.table);
        }
    };
    self.title = "Create mappings";
    self.lastObj = null;
    self.start = function(node, callbackFn) {
        self.currentUri = null;


        var workflow = null;
        if (node) {
            self.lastObj = node;
            self.params = {
                source: KGcreator.currentSlsvSource,
                datasource: KGcreator.currentConfig.currentDataSource,
                tripleModels: []
            };
            if (node.data.table) {
                self.params.table = node.data.table;
                self.params.column = node.data.id;

            } else {//map virtual on table node
                self.params.table = node.data.id;
                self.params.column = null;

            }


            self.params.tripleModels = self.getTableTripleModels(self.params.table);


            if (!self.params.column) {//map virtual on table node
                self.params.columnType = "virtualColumn";
                workflow = self.workflowBnode;
            } else if (self.params.tripleModels.length == 0) {
                workflow = self.workflowColumnMappingType;

            } else if (node.data.predicateObjectColumn && node.data.predicateObjectTable) {

                self.params.predicateTargetColumn = node.data.predicateObjectColumn;
                self.params.predicateObjectTable = node.data.predicateObjectTable;
                workflow = self.workflowObjectPredicateInOtherTable;
            } else {
                self.params.tripleModels.predicateObjectColumnClass = self.getColumnClasses(self.params.tripleModels, self.params.column);
                if (self.params.tripleModels.predicateObjectColumnClass) {
                    workflow = self.workflowColumnmMappingOther;
                } else {
                    workflow = self.workflowColumnMappingType;
                }
            }
        } else {
            if (self.node) {
                return self.start(self.lastObj);
            }

            /* workflow = self.workflow;
                self.params = { source: self.source, datasource: "", table: "", column: "", tripleModels: [] };
                */
        }
        CommonBotFunctions.loadSourceOntologyModel(self.params.source, true, function(err) {
            if (err) {
                return alert(err.responseText);
            }

            KGcreator_mappings.showMappingDialog(null, null, function() {
                $("#LinkColumn_botPanel").show();
                $("#LinkColumn_rightPanel").hide();
                $("#LinkColumn_basicTypeSelect").hide();
                $("#LinkColumn_basicTypeSelect").parent().find("span").hide();
                _botEngine.init(KGcreator_bot, workflow, { divId: "LinkColumn_botPanel" }, function() {
                    $("#previousButtonBot").css("margin-left", "450px");
                    _botEngine.nextStep();
                });
            });
        });
    };


    self.workflowColumnmMappingOther = {
        _OR: {
            "set value": { listValueTypeFn: { setValueColumnFn: { addMappingToModelFn: {} } } },
            "set object predicate": {
                listTablesFn: {
                    listTableColumnsFn: {
                        checkColumnTypeFn: {
                            _OR: {
                                KO: {
                                    promptTargetColumnVocabularyFn: {
                                        predicateObjectColumnClassFn: {
                                            listFilteredPropertiesFn: {
                                                setpredicateObjectColumnUriTypeFn: {
                                                    addMappingToModelFn: {
                                                        "_OR":
                                                            {
                                                                "save ObjectPredicate Class": {
                                                                    savePredicateObjectType: {}
                                                                },
                                                                "end": {}
                                                            }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                //  "OK": { "listPredicateVocabsFn": { "listVocabPropertiesFn": { "addMappingToModel": {} } } }
                                OK: { listFilteredPropertiesFn: { addMappingToModelFn: {} } }
                            }
                        }
                    }
                }
            },

            "set annotation predicate": { listAnnotationPropertiesVocabsFn: { listAnnotationPropertiesFn: { listTableColumnsFn: { addMappingToModelFn: {} } } } },
            "end": {}
        },
        "save mapping": { saveFn: {} },
        "new Mapping": {}
    };
    self.workflowRdfType = {
        _OR: {
            "set rdf:type": { listClassVocabsFn: { listClassesFn: { addMappingToModelFn: self.workflowColumnmMappingOther } } },
            "no rdf:type": self.workflowColumnmMappingOther
        }
    };


    self.workflowColumnMappingType = {
        setUriTypeFn: {
            _OR: {
                //   columnBlankNode: { addMappingToModelFn: self.workflowRdfType },
                "blankNode": { addMappingToModelFn: self.workflowRdfType },
                "namedIndividual": { addMappingToModelFn: self.workflowRdfType },
                "class": { listSuperClassVocabFn: { listSuperClassFn: { listClassLabelColumnFn: { addMappingToModelFn: {} } } } }
            }
        }
    };
    self.workflowBnode = {
        //  virtualColumnFn: { addMappingToModelFn: self.workflowRdfType }
        virtualColumnFn: self.workflowColumnMappingType
    };


    self.workflowMapping = {
        chooseSourceFn: {
            chooseTableFn: { chooseColumnFn: self.workflowColumnMappingType }
        }
    };

    self.workflowObjectPredicateInOtherTable = {
        ObjectPredicateInOtherTableFn: { listTableColumnsFn: { listFilteredPropertiesFn: { writeObjectPredicateJoinKeyFn: { writeObjectPredicateTableJoinFn: {} } } } }

    };


    self.functionTitles = {
        setUriTypeFn: "Choose column URI type",
        listValueTypeFn: "Choose a xsd type",
        setValueColumnFn: "Choose a column containing value",
        listClassVocabsFn: "Choose a reference ontology",
        listPredicateVocabsFn: "Choose a reference ontology",
        listClassesFn: "Choose a class",
        listPropertiesFn: " Choose a property",
        listTableColumnsFn: "Choose a  a column for predicate object ",
        virtualColumnFn: "Enter virtual column name",
        listAnnotationPropertiesVocabsFn: " Choose annnotation property vocabulary",
        listAnnotationPropertiesFn: " Choose annnotation property ",
        promptTargetColumnVocabularyFn: "Choose ontology for predicate column",
        predicateObjectColumnClassFn: " Choose  class of  predicate column",
        listFilteredPropertiesFn: "Choose a Property",
        setpredicateObjectColumnUriTypeFn: "Choose object URI type"
    };

    self.functions = {


        chooseSourceFn: function() {
        },
        chooseTableFn: function() {
        },
        chooseColumnFn: function() {
        },
        columnMappingFn: function() {
            _botEngine.nextStep();
        },

        setUriTypeFn: function() {
            var choices = ["namedIndividual", "blankNode", "class"];

            _botEngine.showList(choices, "uriType");
        },
        setpredicateObjectColumnUriTypeFn: function() {
            var choices = ["namedIndividual", "blankNode", "class"];

            _botEngine.showList(choices, "predicateObjectColumnUriType");
        },

        listClassVocabsFn: function() {
            CommonBotFunctions.listVocabsFn(self.params.source, "classVocab");
        },
        listPredicateVocabsFn: function() {
            CommonBotFunctions.listVocabsFn(self.params.source, "predicateVocab");
        },
        listAnnotationPropertiesVocabsFn: function() {
            CommonBotFunctions.listVocabsFn(self.params.source, "annotationPropertyVocab", true);
        },
        listClassesFn: function() {
            CommonBotFunctions.listVocabClasses(self.params.classVocab, "resourceType");
        },
        listValueTypeFn: function() {
            var choices = ["xsd:string", "xsd:int", "xsd:float", "xsd:datetime"];
            _botEngine.showList(choices, "valueType");
        },
        setValueColumnFn: function() {
            var columns = KGcreator.currentConfig.currentDataSource.tables[self.params.table];
            _botEngine.showList(columns, "valueColumn");
        },
        listTablesFn: function() {
            if (false) {
                var tables = Object.keys(KGcreator.currentConfig.currentDataSource.tables);
                _botEngine.showList(tables, "predicateObjectTable");
            }

            self.params.predicateObjectTable = self.params.table;
            BotEngine.nextStep();


        },
        listTableColumnsFn: function() {
            var virtualColumns = KGcreator.currentConfig.currentMappings[self.params.predicateObjectTable].virtualColumns;
            var columns = KGcreator.currentConfig.currentDataSource.tables[self.params.predicateObjectTable];

            if (virtualColumns) {
                columns = virtualColumns.concat(columns);
            }

            _botEngine.showList(columns, "predicateObjectColumn", true);
        },

        checkColumnTypeFn: function() {
            //check if source  target column is mapped and has a rdf:type that are classes in source and imports
            var predicateObjectTripleModels = self.getTableTripleModels(self.params.predicateObjectTable);
            //   self.params.predicateObjectColumnClass = self.getColumnClasses(predicateObjectTripleModels, self.params.column);
            self.params.predicateObjectColumnClass = self.getColumnClasses(predicateObjectTripleModels, self.params.predicateObjectColumn);
            self.params.checkColumnTypeFn = true;
            var OK = false;
            if (self.params.predicateObjectColumnClass && self.params.predicateObjectColumnClass) {
                OK = true;
            }
            return _botEngine.nextStep(OK ? "OK" : "KO");
        },

        targetColumnKoFn: function() {
            alert("target column " + self.params.predicateObjectColumn + " needs a rdf:type predicate before linking");
            _botEngine.reset();
        },
        promptTargetColumnVocabularyFn: function() {
            CommonBotFunctions.listVocabsFn(self.params.source, "predicateObjectColumnVocabulary");
            // BotEngine.nextStep();
        },

        predicateObjectColumnClassFn: function() {
            var choices = [];

            var classes = Config.ontologiesVocabularyModels[self.params.predicateObjectColumnVocabulary].classes;
            for (var classId in classes) {
                choices.push({
                    id: classId,
                    label: classes[classId].label || Sparql_common.getLabelFromURI(classId)
                });
            }

            _botEngine.showList(choices, "predicateObjectColumnClass", "Assert target column type", true);
        },

        listFilteredPropertiesFn: function() {
            var columnClass = self.getColumnClasses(KGcreator.currentConfig.currentMappings[self.params.table].tripleModels, self.params.column);
            var source = self.params.predicateObjectColumnVocabulary || self.params.source; // both cases existing or not predicate object
            OntologyModels.getAllowedPropertiesBetweenNodes(source, columnClass, self.params.predicateObjectColumnClass, function(err, result) {
                self.params.predicateObjectColumnClass = null;// not used after properties are found

                if (err) {
                    return alert(err);
                }
                var properties = [];
                for (var key in result.constraints) {
                    for (var propId in result.constraints[key]) {
                        var prop = result.constraints[key][propId];
                        properties.push({ id: propId, label: prop.source + ":" + (prop.label || Sparql_common.getLabelFromURI(propId)) });
                    }
                }
                //  CommonBotFunctions.sortList(properties)
                _botEngine.showList(properties, "propertyId");
            });
        },

        listAnnotationPropertiesFn: function() {
            // filter properties compatible with
            CommonBotFunctions.listAnnotationPropertiesFn(self.params.annotationPropertyVocab, "annotationPropertyId");
        },

        listVocabPropertiesFn: function() {
            // filter properties compatible with
            CommonBotFunctions.listVocabPropertiesFn(self.params.predicateVocab, "propertyId");
        },

        virtualColumnFn: function() {
            _botEngine.promptValue("enter virtualColumn name", "column", self.params.column);
        },
        savePredicateObjectType: function() {

            self.params.column = self.params.predicateObjectColumn;
            self.currentUri = self.params.predicateObjectColumn;
            self.params.resourceType = self.params.predicateObjectColumnClass;
            self.functions.addMappingToModelFn(function(err) {
                if (err) {
                    return _botEngine.abort(err);
                }
                _botEngine.nextStep();
            });

        },

        addMappingsToPredicateObjectColumnFn: function() {
            var node = {
                data: {
                    table: self.params.table,
                    id: self.params.predicateObjectColumn
                }
            };
            $("#botPanel").dialog("close");

            KGcreator_bot.start(node);
        },

        addMappingToModelFn: function(callback) {
            var source = self.params.source;
            var datasource = self.params.datasource;
            var table = self.params.table;
            var column = self.params.column;

            var uriType = self.params.uriType;
            var resourceType = self.params.resourceType;
            var propertyId = self.params.propertyId;
            var predicateObjectColumn = self.params.predicateObjectColumn;
            var annotationPropertyId = self.params.annotationPropertyId;
            var predicateObjectColumnUriType = self.params.predicateObjectColumnUriType;
            var predicateObjectColumnClass = self.params.predicateObjectColumnClass;

            var valueType = self.params.valueType;
            var valueColumn = self.params.valueColumn;
            var columnType = self.params.columnType;


            var superClass = self.params.superClass;
            var classLabelColumn = self.params.classLabelColumn;

            // var tripleModels = self.params.tripleModels;

            if (!self.currentUri) {
                self.currentUri = column;
            }
            if (!KGcreator.currentConfig.currentMappings[self.params.table]) {
                KGcreator.currentConfig.currentMappings[self.params.table] = {};
            }

            var triple = null;

            if (columnType == "virtualColumn") {
                if (!KGcreator.currentConfig.currentMappings[self.params.table]) {
                    KGcreator.currentConfig.currentMappings[self.params.table] = { virtualColumns: [], tripleModels: [] };
                }
                if (!KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns) {
                    KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns = [];
                }
                column = "@" + self.params.column + "";
                if (uriType == "blankNode") {
                    column += "_$";
                }
                self.params.columnType = null;
                self.params.column = column;
                self.currentUri = self.params.column;
                if (KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns.indexOf(self.currentUri) < 0) {
                    KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns.push(self.currentUri);
                }
                //  return callback ? callback() : BotEngine.nextStep();

            }


            if (uriType) {
                self.params.uriType = null;
                var str = "";
                if (uriType == "namedIndividual") {
                    triple = {
                        s: column,
                        p: "rdf:type",
                        o: "owl:NamedIndividual"
                    };
                    self.currentUri = column;
                    self.params.tripleModels.push(triple);
                    return _botEngine.nextStep();

                } else if (uriType == "blankNode" && !column.endsWith("_$")) {
                    self.currentUri += "_$";
                    return callback ? callback() : _botEngine.nextStep();
                }
            }
            if (predicateObjectColumnUriType) {
                if (predicateObjectColumnUriType == "namedIndividual") {
                    triple = {
                        s: predicateObjectColumn,
                        p: "rdf:type",
                        o: "owl:NamedIndividual"
                    };

                    self.params.tripleModels.push(triple);

                } else if (predicateObjectColumnUriType == "blankNode" && !predicateObjectColumn.endsWith("_$")) {
                    predicateObjectColumn += "_$";
                }
                //   self.currentUri = predicateObjectColumn;
            }

            // create a class
            if (superClass) {
                self.params.tripleModels.push({
                        s: self.currentUri,
                        p: "rdf:type",
                        o: "owl:Class"
                    },
                    {
                        s: self.currentUri,
                        p: "rdfs:subClassOf",
                        o: superClass
                    },
                    {
                        s: self.currentUri,
                        p: "rdfs:label",
                        o: classLabelColumn
                    });
                return self.functions.saveFn();

            }


            if (predicateObjectColumnClass) {
                triple = {
                    s: predicateObjectColumn,
                    p: "rdf:type",
                    o: predicateObjectColumnClass
                };
                self.params.tripleModels.push(triple);
            }

            if (resourceType) {
                self.params.resourceType = null;
                triple = {
                    s: self.currentUri,
                    p: "rdf:type",
                    o: resourceType
                };
                self.params.tripleModels.push(triple);
                self.functions.saveFn();
                KGcreator.showTableVirtualColumnsTree(self.params.table);
                //   return callback ? callback() : BotEngine.nextStep();
            }
            if (valueType && valueColumn) {
                self.params.valueType = null;
                triple = {
                    s: self.currentUri,
                    p: "rdf:value",
                    o: valueColumn,
                    dataType: valueType
                };
                self.params.tripleModels.push(triple);
                self.functions.saveFn();
                //  return callback ? callback() : BotEngine.nextStep();
            }

            if (propertyId && predicateObjectColumn) {
                self.params.propertyId = null;
                var object = predicateObjectColumn;
                if (self.isColumnBlankNode(predicateObjectColumn)) {
                    object = predicateObjectColumn + "_$";
                }

                triple = {
                    s: self.currentUri,
                    p: propertyId,
                    o: object
                };
                self.params.tripleModels.push(triple);
                self.functions.saveFn();

            }
            if (annotationPropertyId && predicateObjectColumn) {
                self.params.annotationPropertyId = null;
                triple = {
                    s: self.currentUri,
                    p: annotationPropertyId,
                    o: predicateObjectColumn,
                    isString: true
                };
                self.params.tripleModels.push(triple);
                self.functions.saveFn(callback);
                //  return callback ? callback() : BotEngine.nextStep();
                //  return BotEngine.nextStep();
            }
        },


        ObjectPredicateInOtherTableFn: function() {
            if (!self.params.predicateObjectTable) {

                return BotEngine.abort("no targetColumnTable");
            }

            if (self.params.predicateObjectTable == self.params.table) {
                return BotEngine.abort(" targetColumnTable==table");
            }

            var sourcecolumnType = self.getColumnClasses(self.params.tripleModels, self.params.column);
            var targetTripleModels = self.getTableTripleModels(self.params.predicateObjectTable);
            self.params.targetTripleModels = targetTripleModels;
            var targetcolumnType = self.getColumnClasses(targetTripleModels, self.params.predicateTargetColumn);

            var ok = sourcecolumnType && targetcolumnType;

            if (!ok) {
                return BotEngine.abort(" cannot proceed :no class defined for both subject and object");
            }
            self.params.predicateObjectColumnClass = targetcolumnType;
            BotEngine.nextStep();

        },
        writeObjectPredicateJoinKeyFn: function() {
            var triple = {
                s: self.params.predicateObjectColumn,
                p: self.params.propertyId,
                o: self.params.predicateTargetColumn
            };

            self.params.targetTripleModels.push(triple);
            KGcreator.currentConfig.currentMappings[self.params.predicateObjectTable].tripleModels = self.params.targetTripleModels;
            KGcreator.saveDataSourceMappings(self.params.source, self.params.datasource.name, KGcreator.currentConfig.currentMappings, function(err, result) {
                if (err) {
                    return BotEngine.abort(err);
                }
                _botEngine.message("mapping Saved");
                return _botEngine.nextStep();
            });

        },
        writeObjectPredicateTableJoinFn: function() {
            var join = {
                "fromTable": self.params.table,
                "toTable": self.params.predicateObjectTable,
                "fromColumn": self.params.column,
                "toColumn": self.params.predicateObjectColumn
            };
            KGcreator.rawConfig.databaseSources[KGcreator.currentConfig.currentDataSource.name].tableJoins.push(join);
            KGcreator.saveSlsvSourceConfig(function(err, result) {
                if (err) {
                    BotEngine.abort(err);
                }
                BotEngine.nextStep();
                KGcreator_graph.drawDataSourceMappings();
            });
        },

        listSuperClassVocabFn: function() {
            CommonBotFunctions.listVocabsFn(self.params.source, "superClassVocab");

        },

        listSuperClassFn: function() {
            CommonBotFunctions.listVocabClasses(self.params.superClassVocab, "superClass");
        },
        listClassLabelColumnFn: function() {
            var virtualColumns = KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns;
            var columns = KGcreator.currentConfig.currentDataSource.tables[self.params.table];

            if (virtualColumns) {
                columns = virtualColumns.concat(columns);
            }

            _botEngine.showList(columns, "classLabelColumn", true);


        },


        saveFn: function(callback) {
            KGcreator_mappings.columnJsonEditor.load(self.params.tripleModels);
            KGcreator.currentConfig.currentMappings[self.params.table].tripleModels = self.params.tripleModels;
            KGcreator.saveDataSourceMappings(self.params.source, self.params.datasource.name, KGcreator.currentConfig.currentMappings, function(err, result) {
                if (err) {
                    return callback ? callback(err) : alert(err);
                }
                _botEngine.message("mapping Saved");
                return callback ? callback() : _botEngine.nextStep();
            });
        }
    };
    self.isColumnBlankNode = function(columnName, role) {
        var isBlankNode = false;
        if (!role) {
            role = "s";
        }
        KGcreator.currentConfig.currentMappings[self.params.table].tripleModels.forEach(function(item) {
            if (item[role] == columnName + "_$") {
                isBlankNode = true;
            }
        });
        return isBlankNode;
    };
    self.getColumnClasses = function(tripleModels, columnName) {
        var columnClasses = [];
        tripleModels.forEach(function(item) {
            if ((item.s == columnName || item.s == columnName + "_$") && item.p == "rdf:type") {
                if (item.o.indexOf("owl:") < 0) {
                    if (!columnClasses) {

                    }
                    if (columnClasses.indexOf(item.o) < 0) {
                        columnClasses.push(item.o);
                    }
                }
            }
        });
        if (columnClasses.length == 0) {
            return null;
        }
        return columnClasses;
    };

    self.getTableTripleModels = function(table) {
        var tripleModels = [];
        if (KGcreator.currentConfig.currentMappings && KGcreator.currentConfig.currentMappings[table]) {
            tripleModels = KGcreator.currentConfig.currentMappings[table].tripleModels || [];
        } else {
            KGcreator.currentConfig.currentMappings[table] = { tripleModels: [] };
            tripleModels = [];
        }
        return tripleModels;
    };

    return self;
})();

export default KGcreator_bot;
window.KGcreator_bot = KGcreator_bot;
