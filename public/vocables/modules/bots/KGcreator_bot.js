import BotEngine from "./botEngine.js";
import KGcreator from "../tools/KGcreator/KGcreator.js";
import CommonBotFunctions from "./commonBotFunctions.js";
import KGcreator_mappings from "../tools/KGcreator/KGcreator_mappings.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";

var KGcreator_bot = (function() {
    var self = {};
    self.title = "Create mappings";
    self.lastObj = null;
    self.start = function(node,callbackFn) {
        self.currentUri = null;
     //   self.callbackFn=callbackFn

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


            if (KGcreator.currentConfig.currentMappings && KGcreator.currentConfig.currentMappings[node.data.table]) {
                self.params.tripleModels = KGcreator.currentConfig.currentMappings[node.data.table].tripleModels || [];
            } else {
                KGcreator.currentConfig.currentMappings[node.data.table] = { tripleModels: [] };
                self.params.tripleModels = [];
            }

            if (!self.params.column) {//map virtual on table node
                self.params.uriType = "virtualColumnBlankNode";
                workflow = self.workflowBnode;
            } else if (self.params.tripleModels.length == 0) {
                workflow = self.workflowColumnMappingType;

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
                BotEngine.init(KGcreator_bot, workflow, { divId: "LinkColumn_botPanel" }, function() {
                    $("#previousButtonBot").css("margin-left", "450px");
                    BotEngine.nextStep();
                });
            });
        });
    };

    self.callbackFn = function() {
        self.start(self.currentColumn);
    };

    self.workflowColumnmMappingOther = {
        _OR: {
            "set value": { listValueTypeFn: { setValueColumnFn: { addMappingToModelFn: {} } } },
            "set object predicate": {
                listTableColumnsFn: {
                    checkColumnTypeFn: {
                        _OR: {
                            KO: {
                                promptTargetColumnVocabularyFn: {
                                    predicateObjectColumnClassFn: {
                                        listFilteredPropertiesFn: {
                                            addMappingToModelFn: {
                                                savePredicateObjectType: {
                                                    "_OR":
                                                        {
                                                            " add mappings to predicate object  column": {addMappingsToPredicateObjectColumnFn:{}}
                                                            ,
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
            },

            "set annotation predicate": { listAnnotationPropertiesVocabsFn: { listAnnotationPropertiesFn: { listTableColumnsFn: { addMappingToModelFn: {} } } } }
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
                "virtualColumnBlankNode": { virtualColumnBlankNodeFn: { addMappingToModelFn: self.workflowRdfType } },
                "namedIndividual": { addMappingToModelFn: self.workflowRdfType }
            }
      }
    };
    self.workflowBnode = {
        virtualColumnBlankNodeFn: { addMappingToModelFn: self.workflowRdfType }
    };


    self.workflowMapping = {
        chooseSourceFn: {
            chooseTableFn: { chooseColumnFn: self.workflowColumnMappingType }
        }
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
        virtualColumnBlankNodeFn: "Enter virtual column name",
        listAnnotationPropertiesVocabsFn: " Choose annnotation property vocabulary",
        listAnnotationPropertiesFn: " Choose annnotation property ",
        promptTargetColumnVocabularyFn: "Choose ontology for predicate column",
        predicateObjectColumnClassFn: " Choose  class of  predicate column",
        listFilteredPropertiesFn: "Choose a Property"
    };

    self.functions = {
        chooseSourceFn: function() {
        },
        chooseTableFn: function() {
        },
        chooseColumnFn: function() {
        },
        columnMappingFn: function() {
            BotEngine.nextStep();
        },

        setUriTypeFn: function() {
            var choices = ["namedIndividual", "virtualColumnBlankNode"]; //"columnBlankNode",

            BotEngine.showList(choices, "uriType"); /*,null,false,function(value){
        self.params.uriType=value;
        BotEngine.nextStep()
      });*/
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
            BotEngine.showList(choices, "valueType");
        },
        setValueColumnFn: function() {
            var columns = KGcreator.currentConfig.currentDataSource.tables[self.params.table];
            BotEngine.showList(columns, "valueColumn");
        },

        listTableColumnsFn: function() {
            var columns = KGcreator.currentConfig.currentDataSource.tables[self.params.table];
            var virtualColumns = KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns;
            if (virtualColumns) {
                columns = columns.concat(virtualColumns);
            }

            BotEngine.showList(columns, "predicateObjectColumn");
        },

        checkColumnTypeFn: function() {
            //check if source  target column is mapped and has a rdf:type that are classes in source and imports
            var predicateObjectColumnName = self.params.predicateObjectColumn;
            var predicateObjectColumnClass = null;
            self.params.predicateObjectColumnClass = self.getColumnClasses(self.params.tripleModels, self.params.column);
            self.params.predicateObjectColumnClass = self.getColumnClasses(self.params.tripleModels, self.params.predicateObjectColumn);

            var OK = false;
            if (self.params.predicateObjectColumnClass && self.params.predicateObjectColumnClass) {
                OK = true;
            }
            return BotEngine.nextStep(OK ? "OK" : "KO");
        },

        targetColumnKoFn: function() {
            alert("target column " + self.params.predicateObjectColumn + " needs a rdf:type predicate before linking");
            BotEngine.reset();
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

            BotEngine.showList(choices, "predicateObjectColumnClass", "Assert target column type", true);
        },

        listFilteredPropertiesFn: function() {
            var columnClass = self.getColumnClasses(KGcreator.currentConfig.currentMappings[self.params.table].tripleModels, self.params.column);
            var source = self.params.predicateObjectColumnVocabulary || self.params.source; // both cases existing or not predicate object
            OntologyModels.getAllowedPropertiesBetweenNodes(source, columnClass, self.params.predicateObjectColumnClass, function(err, result) {
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
                BotEngine.showList(properties, "propertyId");
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

        virtualColumnBlankNodeFn: function() {
            BotEngine.promptValue("enter virtualColumn name", "virtualColumnBlankNodeName", self.params.column);
        },
        savePredicateObjectType: function() {
            self.params.column = self.params.predicateObjectColumn;
            self.currentUri = self.params.predicateObjectColumn;
            self.params.resourceType = self.params.predicateObjectColumnClass;
            self.functions.addMappingToModelFn(function(err) {
                if (err) {
                    return BotEngine.abort(err);
                }
                BotEngine.nextStep();
            });

        },

        addMappingsToPredicateObjectColumnFn: function() {
            var node = {
                data: {
                    table: self.params.table,
                    id: self.currentUri
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
            var predicateObjectId = self.params.predicateObjectId;
            var predicateObjectColumn = self.params.predicateObjectColumn;
            var annotationPropertyId = self.params.annotationPropertyId;

            var valueType = self.params.valueType;
            var valueColumn = self.params.valueColumn;

            var tripleModels = self.params.tripleModels;

            if (!self.currentUri) {
                self.currentUri = column;
            }

            var triple = null;

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
                    return BotEngine.nextStep();
                } else if (uriType == "columnBlankNode") {
                    self.currentUri = "$_" + column;
                    return callback ? callback() : BotEngine.nextStep();
                } else if (uriType == "virtualColumnBlankNode") {
                    if (!KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns) {
                        KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns = [];
                    }
                    self.currentUri = "$_V_" + self.params.virtualColumnBlankNodeName;

                    if (KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns.indexOf(self.currentUri) < 0) {
                        KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns.push(self.currentUri);
                    }
                    return callback ? callback() : BotEngine.nextStep();
                }
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
                    object = "$_" + predicateObjectColumn;
                }

                triple = {
                    s: self.currentUri,
                    p: propertyId,
                    o: object
                };
                self.params.tripleModels.push(triple);
                self.functions.saveFn();
              //  return callback ? callback() : BotEngine.nextStep();
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

        saveFn: function(callback) {
            KGcreator_mappings.columnJsonEditor.load(self.params.tripleModels);
            KGcreator.currentConfig.currentMappings[self.params.table].tripleModels = self.params.tripleModels;
            KGcreator.saveDataSourceMappings(self.params.source, self.params.datasource.name, KGcreator.currentConfig.currentMappings, function(err, result) {
                if (err) {
                    return callback ? callback(err) : alert(err);
                }
                BotEngine.message("mapping Saved");
                return callback ? callback() : BotEngine.nextStep();
            });
        }
    };
    self.isColumnBlankNode = function(columnName, role) {
        var isBlankNode = false;
        if (!role) {
            role = "s";
        }
        KGcreator.currentConfig.currentMappings[self.params.table].tripleModels.forEach(function(item) {
            if (item[role] == "$_" + columnName) {
                isBlankNode = true;
            }
        });
        return isBlankNode;
    };
    self.getColumnClasses = function(tripleModels, columnName) {
        var columnClasses = null;
        tripleModels.forEach(function(item) {
            if ((item.s == columnName || item.s == "$_" + columnName) && item.p == "rdf:type") {
                if (item.o.indexOf("owl:") < 0) {
                    if (!columnClasses) {
                        columnClasses = [];
                    }
                    columnClasses.push(item.o);
                }
            }
        });
        return columnClasses;
    };

    return self;
})();

export default KGcreator_bot;
window.KGcreator_bot = KGcreator_bot;
