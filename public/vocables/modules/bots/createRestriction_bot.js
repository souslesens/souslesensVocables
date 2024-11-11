import Sparql_common from "../sparqlProxies/sparql_common.js";
import _botEngine from "./_botEngine.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";
import CommonBotFunctions from "./_commonBotFunctions.js";
import Lineage_createRelation from "../tools/lineage/lineage_createRelation.js";
import common from "../shared/common.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";
import OntologyModels from "../shared/ontologyModels.js";
import Lineage_createResource from "../tools/lineage/lineage_createResource.js";

var CreateRestriction_bot = (function () {
    var self = {};
    self.title = "Create Resource";

    self.start = function (workflow, params, callback) {
        _botEngine.startParams = _botEngine.fillStartParams(arguments);
        self.callbackFn = callback;
        self.params = params
        if (!workflow) {
            workflow = self.workflow;
        }
        _botEngine.init(CreateRestriction_bot, workflow, null, function () {

            _botEngine.nextStep();
        });
    };


    self.workflow = {
        listRestrictionsTypesFn: {
            _OR: {
                "CardinalityRestriction": {
                    listVocabsFn: {
                        listTargetPropertyFn: {
                            chooseCardinalityTypeFn: {
                                promptCardinalityNumberFn: {
                                    saveCardinalityRestrictionFn: {}
                                }
                            }
                        }
                    }
                },

                "ValueRestriction": {
                listVocabsFn: {listTargetClassFn: {showValueRestictionWidgetFn: {}}},

            },
            },

        }
    };
    self.workflowChooseConstraintTypeFn= {chooseConstraintTypeFn:{
          processConstraintTypeFn:{}

        }}



    self.functionTitles = {
        _OR: "Select an option",
        listRestrictionsTypesFn: "Choose a Restriction type",

        listVocabsFn: "Choose a reference ontology",
        listPropertiesFn: "choose a property",
        chooseCardinalityTypeFn: "choose cardinality type",
        promptCardinalityNumberFn: " enter cardinality value",
        chooseConstraintTypeFn:"choose cardinality type",



    };

    self.functions = {
        listRestrictionsTypesFn: function () {
            var choices = [
                {id: "CardinalityRestriction", label: "CardinalityRestriction"},
                {id: "ValueRestriction", label: "ValueRestriction"},

            ];
            _botEngine.showList(choices, "resourceType");
        },

        listVocabsFn: function () {
            CommonBotFunctions.listVocabsFn(self.params.source, "currentVocab");
        },


        listTargetClassFn: function () {
            CommonBotFunctions.listVocabClasses(self.params.currentVocab, "targetClassUri", true);
        },
        listTargetPropertyFn: function () {
            CommonBotFunctions.listVocabPropertiesFn(self.params.currentVocab, "objectPropertyUri");
        },

        chooseCardinalityTypeFn: function () {
            var choices = [
                {id: "owl:maxCardinality", label: "owl:maxCardinality"},
                {id: "owl:minCardinality", label: "owl:minCardinality"},
                {id: "owl:cardinality", label: "owl:cardinality"},

            ];
            _botEngine.showList(choices, "cardinalityType");
        },
        chooseConstraintTypeFn:function(){
            var choices = [
                {id: "owl:someValuesFrom", label: "owl:someValuesFrom"},
                {id: "owl:allValuesFrom ", label: "owl:allValuesFrom "},
                {id: "owl:hasValue ", label: "owl:hasValue "},
                {id: "owl:maxCardinality", label: "owl:maxCardinality"},
                {id: "owl:maxCardinality", label: "owl:maxCardinality"},
                {id: "owl:minCardinality", label: "owl:minCardinality"},
                {id: "owl:cardinality", label: "owl:cardinality"},

            ];
            _botEngine.showList(choices, "constraintType");
        },
        promptCardinalityNumberFn: function () {
            _botEngine.promptValue("enter Cardinality value", "cardinalityValue")


        },


        saveCardinalityRestrictionFn: function () {

            var triples = [];


            var restrictionId = "_:" + common.getRandomHexaId(10)
            triples.push({
                subject: self.params.currentNode.id,
                predicate: "rdfs:subClassOf",
                object: restrictionId
            })
            triples.push({
                subject: restrictionId,
                predicate: "rdf:type",
                object: "owl:Restriction"
            })
            triples.push({
                subject: restrictionId,
                predicate: "owl:onProperty",
                object: self.params.objectPropertyUri
            })

            triples.push({
                subject: restrictionId,
                predicate: self.params.constraintType ||  self.params.cardinalityType,
                object: "\"" + self.params.cardinalityValue + "^^http://www.w3.org/2001/XMLSchema#nonNegativeInteger\""
            })


            Sparql_generic.insertTriples(self.params.source, triples, {}, function (err, result) {
                if (err) {
                    _botEngine.abort(err.responseText || err)
                }
                //add manchester to Axioms JSTree
                _botEngine.end()

            });

        },

        showValueRestictionWidgetFn: function () {
            var edgeData={
                from:{
                    data:self.params.currentNode.data
                    },
                to:{
                    data:{
                        id:self.params.targetClassUri,
                        label:Sparql_common.getLabelFromURI(self.params.targetClassUri),
                        source:self.params.currentVocab
                    }
                }



            }
            Lineage_createRelation.showAddEdgeFromGraphDialog(edgeData, function (err, result) {
                if (err) {
                    _botEngine.abort(err.responseText || err)
                }
                //add manchester to Axioms JSTree
                _botEngine.end()
            })
        }

        ,processConstraintTypeFn:function(){
            var constraintType=self.params.constraintType;

            if(constraintType.indexOf("ardinality")>-1){
                _botEngine.promptValue("enter Cardinality value", "cardinalityValue","",null, function(cardinality){
                   if(!cardinality)
                       return _botEngine.end()
                    self.params.cardinality=cardinality;
                   self.functions.saveCardinalityRestrictionFn()

                })
            }else{

                //return  self.params.constraintType
                _botEngine.end()
            }

        }


    };

    return self;
})();

export default CreateRestriction_bot;
window.CreateRestriction_bot = CreateRestriction_bot;
