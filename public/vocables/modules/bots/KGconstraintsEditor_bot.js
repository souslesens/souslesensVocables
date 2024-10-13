import Sparql_common from "../sparqlProxies/sparql_common.js";
import _botEngine from "./_botEngine.js";

import OntologyModels from "../shared/ontologyModels.js";

var KGquery_filter_bot = (function () {
    var self = {};
    self.title = "Filter Class";

    self.start = function (workflow, _params, validateFn) {
        _botEngine.startParams = _botEngine.fillStartParams(arguments);

        self.filter = "";
        self.filterItems = [];
        self.workflow = workflow;
        self.callbackFn = validateFn

        _botEngine.init(KGquery_filter_bot, workflow, null, function () {
            self.params = {};
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }
            _botEngine.nextStep();
        });
    };

    self.workflow_dataTypePropertyConstraint = {
        listClassesFn: {
            list_constraintTypesFn: {
                list_constraintsFn: {
                    dispatch_shapeTypeFn: {
                        _OR: {
                            "sh:property": {listPropertiesFn: {promptDatatypeValueFn: {promptContraintNameFn:{}}}},
                            "sh:node": {promptDatatypeValueFn: {promptContraintNameFn:{}}},
                        },
                    },
                },
            },
        },
    };

    self.functionTitles = {
        listClassesFn: "Choose a Class",
        listPropertiesFn: "Choose an property",
        list_constraintTypesFn: "Choose an property",
        list_constraintsFn: "Choose an property",
        dispatch_shapeTypeFn: "choose shacl_shapeType",
        promptDatatypeValueFn: "Enter a value",
        promptContraintNameFn:"Enter Constraint name"
    };

    self.functions = {}; //SparqlQuery_bot.functions;

    self.functions.listClassesFn = function () {
        var classes = [];
        self.params.nodesMap = {};
        self.params.model.nodes.forEach(function (node) {
            classes.push({id: node.data.id, label: node.data.label});
            self.params.nodesMap[node.data.id] = node;
        });
        common.array.sortObjectArray(classes, "label");

        _botEngine.showList(classes, "shacl_classUri");
    };

    self.functions.list_constraintTypesFn = function () {
        var choices = [];

        for (var type in self.params.constraintsMap) {
            choices.push({id: type, label: type});
        }

        common.array.sortObjectArray(choices, "label");
        _botEngine.showList(choices, "shacl_constraintType");
    };
    self.functions.list_constraintsFn = function () {
        var shacl_constraints = [];

        for (var shacl_constraint in self.params.constraintsMap[self.params.shacl_constraintType]) {
            shacl_constraints.push({id: shacl_constraint, label: shacl_constraint});
        }
        common.array.sortObjectArray(shacl_constraints, "label");
        _botEngine.showList(shacl_constraints, "shacl_constraint");
    };

    self.functions.dispatch_shapeTypeFn = function () {
        var shacl_constraint = self.params.constraintsMap[self.params.shacl_constraintType][self.params.shacl_constraint];
        if (shacl_constraint.shapeType.length > 1) {
            var shacl_shapeTypes = [];

            shacl_constraint.shapeType.forEach(function (shacl_shapeType) {
                shacl_shapeTypes.push({id: "sh:" + shacl_shapeType, label: "sh:" + shacl_shapeType});
            });
            _botEngine.showList(shacl_shapeTypes, "shacl_shapeType");
        } else {
            return _botEngine.nextStep(shacl_constraint.shapeType[0]);
        }
    };

    self.functions.promptDatatypeValueFn = function () {
        var shacl_property = self.params.constraintsMap[self.params.shacl_constraintType][self.params.shacl_constraint];
        if (shacl_property.dataType.indexOf("URI") > -1 || shacl_property.dataType.indexOf("URI list") > -1) {
            if (self.params.shapeType == "sh:property") {
                return self.functions.listTargetClassesFn();
            } else if (self.params.shapeType == "sh:node") {
                return self.functions.listPropertiesFn();
            }
        } else {

            if (shacl_property.shapeType== "int") {
                self.params.shacl_valueDataType="int"
                return _botEngine.promptValue("enter property value", "shacl_value");
            }
            else if (shacl_property.shapeType == "string") {
                self.params.shacl_valueDataType="string"
                return _botEngine.promptValue("enter property value", "shacl_value");
            }

            else {

                var nonObjectProperties = self.params.nodesMap[self.params.shacl_classUri].data.nonObjectProperties;
                var shacl_valueDataType = null
                nonObjectProperties.forEach(function (property) {
                    if (property.id == self.params.shacl_propertyUri) {
                        shacl_valueDataType = property.datatype
                    }
                })
                if(shacl_valueDataType.endsWith("int")){
                    self.params.shacl_valueDataType="int"
                    return _botEngine.promptValue("enter int value", "shacl_value");
                }
                if(shacl_valueDataType.endsWith("float")){
                    self.params.shacl_valueDataType="float"
                    return _botEngine.promptValue("enter float (ex 10.0) value", "shacl_value");
                }
                if(shacl_valueDataType.endsWith("dateTime") ||shacl_valueDataType.endsWith("date" )){
                    self.params.shacl_valueDataType="dateTime"
                    return _botEngine.promptValue("enter date value (YYYY-MM-DD)", "shacl_value");
                }else
                    self.params.shacl_valueDataType="string"
                    return _botEngine.promptValue("enter string value", "shacl_value");
            }
        }
    };

    self.functions.listTargetClassesFn = function () {
        var classes = [];
        self.params.model.edges.forEach(function (edge) {
            var targetClassUri;
            if (edge.from == self.params.classUri) {
                targetClassUri = edge.to;
            } else if (edge.to == self.params.classUri) {
                targetClassUri = edge.from;
            }
            classes.push({id: targetClassUri, label: self.params.model.nodes[targetClassUri].label});
        });
        common.array.sortObjectArray(classes, "label");
        self.params.shacl_valueDataType="class"
        _botEngine.showList(classes, "shacl_value");
    };
    self.functions.listPropertiesFn = function () {
        var properties = [];

        self.params.model.edges.forEach(function (edge) {
            if (edge.from == self.params.classUri) {
                properties.push({id: edge.data.propertyId, label: edge.data.propertyLabel});
            } else if (edge.to == self.params.classUri) {
                properties.push({id: edge.data.propertyId, label: edge.data.propertyLabel});
            }
        });

        var nonObjectProperties = self.params.nodesMap[self.params.shacl_classUri].data.nonObjectProperties;
        if (nonObjectProperties) {
            nonObjectProperties.forEach(function (property) {
                properties.push({id: property.id, label: property.label});
            });
        }
        common.array.sortObjectArray(properties, "label");
        _botEngine.showList(properties, "shacl_propertyUri");
    };

    self.functions.promptContraintNameFn=function(){
        var classLabel=self.params.nodesMap[self.params.shacl_classUri].label
        var property=self.params["shacl_propertyUri"]
        var propertylabel=property?Sparql_common.getLabelFromURI(property):""
        var defaultValue=classLabel+"_"+propertylabel+"_"+self.params["shacl_constraint"];
        _botEngine.promptValue("","shacl_constraintName",defaultValue)
    }

    return self;
})();

export default KGquery_filter_bot;
window.KGquery_filter_bot = KGquery_filter_bot;
