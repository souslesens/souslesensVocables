import BotEngine from "./botEngine.js";
import KGcreator from "../tools/KGcreator/KGcreator.js";
import CommonBotFunctions from "./commonBotFunctions.js";
import KGcreator_mappings from "../tools/KGcreator/KGcreator_mappings.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";

var AddPredicate_bot = (function () {
    var self = {};
    self.title = "Add predicate";
    self.lastColumnObj = null;
    self.start = function () {
        BotEngine.init(AddPredicate_bot, self.workflow, null, function () {
            self.source = Lineage_sources.activeSource;
            self.params = { source: self.source, resourceType: "", resourceLabel: "", currentVocab: "" };
            BotEngine.nextStep();
        });
    };

    self.callbackFn = function () {
        self.start(self.currentColumn);
    };

    self.workflowColumnmMappingOther = {
        _OR: {
            "set value": { listValueTypeFn: { setValueColumnFn: { addMappingToModelFn: {} } } },
            "set object predicate": {
                listTableColumnsFn: {
                    checkColumnTypeFn: {
                        _OR: {
                            KO: { targetColumnKoFn: {} },
                            //  "OK": { "listPredicateVocabsFn": { "listVocabPropertiesFn": { "addMappingToModel": {} } } }
                            OK: { listFilteredPropertiesFn: { addMappingToModelFn: {} } },
                        },
                    },
                },
            },
            "set annotation predicate": { listAnnotationPropertiesVocabsFn: { listAnnotationPropertiesFn: { listTableColumnsFn: { addMappingToModelFn: {} } } } },

            "save mapping": { saveFn: {} },
            "new Mapping": {},
        },
    };
    self.workflowRdfType = {
        _OR: {
            "set rdf:type": { listClassVocabsFn: { listClassesFn: { addMappingToModelFn: self.workflowColumnmMappingOther } } },
            "no rdf:type": self.workflowColumnmMappingOther,
        },
    };

    self.workflowColumnMappingType = {
        setUriTypeFn: {
            _OR: {
                //   columnBlankNode: { addMappingToModelFn: self.workflowRdfType },
                virtualColumnBlankNode: { virtualColumnBlankNodeFn: { addMappingToModelFn: self.workflowRdfType } },
                namedIndividual: { addMappingToModelFn: self.workflowRdfType },
            },
        },
    };

    self.workflowMapping = {
        chooseSourceFn: {
            chooseTableFn: { chooseColumnFn: self.workflowColumnMappingType },
        },
    };

    self.functionTitles = {
        setUriTypeFn: "Choose column URI type",
        setRdfType: "Choose column RDF type",
        listValueTypeFn: "Choose a xsd type",
        setValueColumnFn: "Choose a column containing value",
        listClassVocabsFn: "Choose a reference ontology",
        listPredicateVocabsFn: "Choose a reference ontology",
        listClassesFn: "Choose a class",
        listPropertiesFn: " Choose a property",
        listTableColumnsFn: "Choose a  a column for predicate object ",
        virtualColumnBlankNode: "Enter virtual column name",
        listAnnotationPropertiesVocabsFn: " Choose annnotation property vocabulary",
        listAnnotationPropertiesFn: " Choose annnotation property ",
    };

    self.functions = {
        chooseSourceFn: function () {},
        chooseTableFn: function () {},
        chooseColumnFn: function () {},
        columnMappingFn: function () {
            BotEngine.nextStep();
        },

        setUriTypeFn: function () {
            var choices = ["namedIndividual", "virtualColumnBlankNode"]; //"columnBlankNode",

            BotEngine.showList(choices, "uriType"); /*,null,false,function(value){
        self.params.uriType=value;
        BotEngine.nextStep()
      });*/
        },

        listClassVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(self.params.source, "classVocab");
        },
        listPredicateVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(self.params.source, "predicateVocab");
        },
        listAnnotationPropertiesVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(self.params.source, "annotationPropertyVocab", true);
        },
        listClassesFn: function () {
            CommonBotFunctions.listVocabClasses(self.params.classVocab, "resourceId");
        },
        listValueTypeFn: function () {
            var choices = ["xsd:string", "xsd:int", "xsd:float", "xsd:datetime"];
            BotEngine.showList(choices, "valueType");
        },
        setValueColumnFn: function () {
            var columns = KGcreator.currentConfig.currentDataSource.tables[self.params.table];
            BotEngine.showList(columns, "valueColumn");
        },

        listTableColumnsFn: function () {
            var columns = KGcreator.currentConfig.currentDataSource.tables[self.params.table];
            var virtualColumns = KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns;
            if (virtualColumns) {
                columns = columns.concat(virtualColumns);
            }

            BotEngine.showList(columns, "predicateObjectColumn");
        },

        checkColumnTypeFn: function () {
            //check if source  target column is mapped and has a rdf:type that are classes in source and imports
            var predicateObjectColumnName = self.params.predicateObjectColumn;
            var predicateObjectColumnType = null;
            self.params.predicateSubjectColumnType = CommonBotFunctions.getColumnClass(self.params.tripleModels, self.params.column);
            self.params.predicateObjectColumnType = CommonBotFunctions.getColumnClass(self.params.tripleModels, self.params.predicateObjectColumn);

            var OK = false;
            if (self.params.predicateSubjectColumnType && self.params.predicateObjectColumnType) {
                OK = true;
            }
            return BotEngine.nextStep(OK ? "OK" : "KO");
        },

        targetColumnKoFn: function () {
            alert("target column " + self.params.predicateObjectColumn + " needs a rdf:type predicate before linking");
            BotEngine.reset();
        },

        listFilteredPropertiesFn: function () {
            OntologyModels.getAllowedPropertiesBetweenNodes(self.params.source, self.params.predicateSubjectColumnType, self.params.predicateObjectColumnType, function (err, result) {
                if (err) {
                    return alert(err);
                }
                var properties = [];
                for (var key in result.constraints) {
                    for (var propId in result.constraints[key]) {
                        var prop = result.constraints[key][propId];
                        properties.push({ id: propId, label: prop.source + ":" + prop.label });
                    }
                }
                //  CommonBotFunctions.sortList(properties)
                BotEngine.showList(properties, "propertyId");
            });
        },

        listAnnotationPropertiesFn: function () {
            // filter properties compatible with
            CommonBotFunctions.listAnnotationPropertiesFn(self.params.annotationPropertyVocab, "annotationPropertyId");
        },

        listVocabPropertiesFn: function () {
            // filter properties compatible with
            CommonBotFunctions.listVocabPropertiesFn(self.params.predicateVocab, "propertyId");
        },

        virtualColumnBlankNodeFn: function () {
            BotEngine.promptValue("enter virtualColumn name", "virtualColumnBlankNodeName", self.params.column);
        },

        addMappingToModelFn: function () {
            var source = self.params.source;
            var datasource = self.params.datasource;
            var table = self.params.table;
            var column = self.params.column;

            var uriType = self.params.uriType;
            var resourceId = self.params.resourceId;
            var propertyId = self.params.propertyId;
            var predicateObjectId = self.params.predicateObjectId;
            var predicateObjectColumn = self.params.predicateObjectColumn;
            var annotationPropertyId = self.params.annotationPropertyId;

            var valueType = self.params.valueType;
            var valueColumn = self.params.valueColumn;

            var tripleModels = self.params.tripleModels;

            if (!self.currentUri) self.currentUri = column;

            var triple = null;

            if (uriType) {
                self.params.uriType = null;
                var str = "";
                if (uriType == "namedIndividual") {
                    triple = {
                        s: column,
                        p: "rdf:type",
                        o: "ow:NamedIndividual",
                    };
                    self.currentUri = column;
                    self.params.tripleModels.push(triple);
                    return BotEngine.nextStep();
                } else if (uriType == "columnBlankNode") {
                    self.currentUri = "$_" + column;
                    return BotEngine.nextStep();
                } else if (uriType == "virtualColumnBlankNode") {
                    if (!KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns) {
                        KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns = [];
                    }
                    self.currentUri = "$_V_" + self.params.virtualColumnBlankNodeName;

                    if (KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns.indexOf(self.currentUri) < 0) {
                        KGcreator.currentConfig.currentMappings[self.params.table].virtualColumns.push(self.currentUri);
                    }
                    return BotEngine.nextStep();
                }
            }

            if (resourceId) {
                self.params.resourceId = null;
                triple = {
                    s: self.currentUri,
                    p: "rdf:type",
                    o: resourceId,
                };
                self.params.tripleModels.push(triple);
                self.functions.saveFn();
                KGcreator.showTableVirtualColumnsTree(self.params.table);
                return BotEngine.nextStep();
            }
            if (valueType && valueColumn) {
                self.params.valueType = null;
                triple = {
                    s: self.currentUri,
                    p: "rdf:value",
                    o: valueColumn,
                    dataType: valueType,
                };
                self.params.tripleModels.push(triple);
                self.functions.saveFn();
                return BotEngine.nextStep();
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
                    o: object,
                };
                self.params.tripleModels.push(triple);
                self.functions.saveFn();
                return BotEngine.nextStep();
            }
            if (annotationPropertyId && predicateObjectColumn) {
                self.params.annotationPropertyId = null;
                triple = {
                    s: self.currentUri,
                    p: annotationPropertyId,
                    o: predicateObjectColumn,
                    isString: true,
                };
                self.params.tripleModels.push(triple);
                self.functions.saveFn();
                return BotEngine.nextStep();
            }
        },

        saveFn: function () {
            KGcreator_mappings.columnJsonEditor.load(self.params.tripleModels);
            KGcreator.currentConfig.currentMappings[self.params.table].tripleModels = self.params.tripleModels;
            KGcreator.saveDataSourceMappings(self.params.source, self.params.datasource.name, KGcreator.currentConfig.currentMappings, function (err, result) {
                if (err) {
                    return alert(err);
                }
                BotEngine.message("mapping Saved");
                BotEngine.nextStep();
            });
        },
    };
    self.isColumnBlankNode = function (columnName, role) {
        var isBlankNode = false;
        if (!role) {
            role = "s";
        }
        KGcreator.currentConfig.currentMappings[self.params.table].tripleModels.forEach(function (item) {
            if (item[role] == "$_" + columnName) {
                isBlankNode = true;
            }
        });
        return isBlankNode;
    };

    return self;
})();

export default AddPredicate_bot;
window.AddPredicate_bot = AddPredicate_bot;
