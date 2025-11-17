import Sparql_common from "../sparqlProxies/sparql_common.js";
import BotEngineClass from "./_botEngineClass.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import Lineage_createRelation from "../tools/lineage/lineage_createRelation.js";
import common from "../shared/common.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";

var CreateRestriction_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();
    self.title = "Create Resource";

    self.start = function (workflow, params, callback) {
        var startParams = self.myBotEngine.fillStartParams(arguments);
        self.callbackFn = callback;
        self.params = params;
        if (!workflow) {
            workflow = self.workflow;
        }
        self.myBotEngine.init(CreateRestriction_bot, workflow, null, function () {
            self.myBotEngine.startParams = startParams;
            self.myBotEngine.nextStep();
        });
    };

    self.workflow = {
        listVocabsFn: {
            listTargetClassFn: {
                showValueRestictionWidgetFn: {},
            },
        },
    };

    self.workflowChooseConstraintTypeFn = {
        chooseConstraintTypeFn: {
            processConstraintTypeFn: {},
        },
    };

    self.workflowChooseCardinalityFn = {
        chooseCardinalityTypeFn: {
            promptCardinalityNumberFn: {
                saveCardinalityRestrictionFn: {},
            },
        },
    };

    self.functionTitles = {
        _OR: "Select an option",
        listRestrictionsTypesFn: "Choose a Restriction type",

        listVocabsFn: "Choose target ontology",
        listPropertiesFn: "choose a property",
        listTargetClassFn: " choose  target Class",
        chooseCardinalityTypeFn: "choose cardinality type",
        promptCardinalityNumberFn: " enter cardinality value",
        chooseConstraintTypeFn: "choose cardinality type",
    };

    self.functions = {
        listRestrictionsTypesFn: function () {
            var choices = [
                { id: "CardinalityRestriction", label: "CardinalityRestriction" },
                { id: "ValueRestriction", label: "ValueRestriction" },
            ];
            self.myBotEngine.showList(choices, "resourceType");
        },

        listVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(self.params.source, false, function (err, vocabs) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }
                if (vocabs.length == 0) {
                    return self.myBotEngine.previousStep("no values found, try another option");
                }
                self.myBotEngine.showList(vocabs, "currentVocab");
            });
        },

        listTargetClassFn: function () {
            CommonBotFunctions.listVocabClasses(self.params.currentVocab, true, null, function (err, classes) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }
                self.myBotEngine.showList(classes, "targetClassUri");
            });
        },
        listTargetPropertyFn: function () {
            CommonBotFunctions.listVocabPropertiesFn(self.params.currentVocab, null, function (err, props) {
                if (err) {
                    return self.myBotEngine.abort(err);
                }
                if (props.length == 0) {
                    return self.myBotEngine.previousStep("no values found, try another option");
                }
                self.myBotEngine.showList(props, "objectPropertyUri");
            });
        },

        chooseCardinalityTypeFn: function () {
            var choices = [
                { id: "owl:maxCardinality", label: "owl:maxCardinality" },
                { id: "owl:minCardinality", label: "owl:minCardinality" },
                { id: "owl:cardinality", label: "owl:cardinality" },
            ];
            self.myBotEngine.showList(choices, "cardinalityType");
        },
        chooseConstraintTypeFn: function () {
            var choices = [
                { id: "owl:someValuesFrom", label: "owl:someValuesFrom" },
                { id: "owl:allValuesFrom ", label: "owl:allValuesFrom " },
                { id: "owl:hasValue ", label: "owl:hasValue " },
                { id: "owl:maxCardinality", label: "owl:maxCardinality" },
                { id: "owl:minCardinality", label: "owl:minCardinality" },
                { id: "owl:cardinality", label: "owl:cardinality" },
            ];
            self.myBotEngine.showList(choices, "constraintType");
        },
        promptCardinalityNumberFn: function () {
            self.myBotEngine.promptValue("enter Cardinality value", "cardinalityValue");
        },

        saveCardinalityRestrictionFn: function () {
            if (!self.params.constraintType && !self.params.cardinalityType) {
                return self.myBotEngine.end();
            }
            if (!self.params.cardinalityValue) {
                return self.myBotEngine.end();
            }

            self.saveCardinalityRestriction(
                self.params.source,
                self.params.currentNode.id,
                self.params.objectPropertyUri,
                self.params.constraintType || self.params.cardinalityType,
                self.params.cardinalityValue,
                function (err, result) {
                    if (err) {
                        self.myBotEngine.abort(err.responseText || err);
                    }
                    //add manchester to Axioms JSTree
                    self.myBotEngine.end();
                },
            );
        },

        showValueRestictionWidgetFn: function () {
            var edgeData = {
                from: self.params.currentNode.data,

                to: {
                    id: self.params.targetClassUri,
                    label: Sparql_common.getLabelFromURI(self.params.targetClassUri),
                    source: self.params.currentVocab,
                },
            };
            self.myBotEngine.closeDialog();
            Lineage_createRelation.showAddEdgeFromGraphDialog(edgeData, self.callbackFn);
            /*     Lineage_createRelation.showAddEdgeFromGraphDialog(edgeData, function (err, result) {
             if (err) {
                    _botEngine.abort(err.responseText || err)
                }
                //add manchester to Axioms JSTree

                self.myBotEngine.end(true)
            })*/
        },

        processConstraintTypeFn: function () {
            var constraintType = self.params.constraintType;

            if (constraintType.indexOf("ardinality") > -1) {
                self.myBotEngine.promptValue("enter Cardinality value", "cardinalityValue", "", null, function (cardinality) {
                    if (!cardinality) {
                        return self.myBotEngine.end();
                    }
                    self.params.cardinality = cardinality;
                    self.myBotEngine.end();
                    // self.functions.saveCardinalityRestrictionFn()
                });
            } else {
                //return  self.params.constraintType
                self.myBotEngine.end();
            }
        },
    };

    self.saveCardinalityRestriction = function (source, subClassUri, propertyUri, cardinalityType, value, callback) {
        var triples = [];

        var restrictionId = "_:" + common.getRandomHexaId(10);
        triples.push({
            subject: subClassUri,
            predicate: "rdfs:subClassOf",
            object: restrictionId,
        });
        triples.push({
            subject: restrictionId,
            predicate: "rdf:type",
            object: "owl:Restriction",
        });
        triples.push({
            subject: restrictionId,
            predicate: "owl:onProperty",
            object: propertyUri,
        });

        triples.push({
            subject: restrictionId,
            predicate: cardinalityType,
            object: '"' + value + '^^http://www.w3.org/2001/XMLSchema#nonNegativeInteger"',
        });

        Sparql_generic.insertTriples(source, triples, {}, function (err, result) {
            callback(err, result);
        });
    };

    self.deleteCardinalityRestriction = function (source, restrictionUri, callback) {
        async.series(
            [
                // delete restriction
                function (callbackSeries) {
                    Sparql_generic.deleteTriples(source, restrictionUri, null, null, function (_err, _result) {
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    Sparql_generic.deleteTriples(source, null, null, restrictionUri, function (_err, _result) {
                        callbackSeries();
                    });
                },
            ],
            function (err, result) {
                return callback(err);
            },
        );
    };

    return self;
})();

export default CreateRestriction_bot;
window.CreateRestriction_bot = CreateRestriction_bot;
