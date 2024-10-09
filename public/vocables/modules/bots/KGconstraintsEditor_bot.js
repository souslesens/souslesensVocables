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
            listConstraintTypesFn: {
                listConstraintsFn: {
                    dispatchShapeTypeFn: {
                        _OR: {
                            "sh:property": { listPropertiesFn: { promptDatatypeValue: {} } },
                            "sh:node": { promptDatatypeValue: {} },
                        },
                    },
                },
            },
        },
    };

    self.functionTitles = {
        listClassesFn: "Choose a Class",
        listPropertiesFn: "Choose an property",
        listConstraintTypesFn: "Choose an property",
        listConstraintsFn: "Choose an property",
        dispatchShapeTypeFn: "choose shapeType",
        promptDatatypeValue: "Enter a value",
    };

    self.functions = {}; //SparqlQuery_bot.functions;

    self.functions.listClassesFn = function () {
        var classes = [];
        self.params.nodesMap = {};
        self.params.model.nodes.forEach(function (node) {
            classes.push({ id: node.data.id, label: node.data.label });
            self.params.nodesMap[node.data.id] = node;
        });
        common.array.sortObjectArray(classes, "label");

        _botEngine.showList(classes, "classUri");
    };

    self.functions.listConstraintTypesFn = function () {
        var choices = [];

        for (var type in self.params.constraintsMap) {
            choices.push({ id: type, label: type });
        }

        common.array.sortObjectArray(choices, "label");
        _botEngine.showList(choices, "constraintType");
    };
    self.functions.listConstraintsFn = function () {
        var constraints = [];

        for (var constraint in self.params.constraintsMap[self.params.constraintType]) {
            constraints.push({ id: constraint, label: constraint });
        }
        common.array.sortObjectArray(constraints, "label");
        _botEngine.showList(constraints, "constraint");
    };

    self.functions.dispatchShapeTypeFn = function () {
        var constraint = self.params.constraintsMap[self.params.constraintType][self.params.constraint];
        if (constraint.shapeType.length > 1) {
            var shapeTypes = [];

            constraint.shapeType.forEach(function (shapeType) {
                shapeTypes.push({ id: shapeType, label: shapeType });
            });
            _botEngine.showList(shapeTypes, "shapeType");
        } else {
            return _botEngine.nextStep(constraint.shapeType[0]);
        }
    };

    self.functions.promptDatatypeValue = function () {
        var property = self.params.constraintsMap[self.params.constraintType][self.params.constraint];
        if (property.dataType.indexOf("URI") > -1 || property.dataType.indexOf("URI list") > -1) {
            if (self.params.shapeType == "sh:property") {
                return self.functions.listTargetClassesFn();
            } else if (self.params.shapeType == "sh:node") {
                return self.functions.listPropertiesFn();
            }
        } else if (property.dataType == "int") {
            return _botEngine.promptValue("enter property value", "propertyTargetInt");
        } else {
            return _botEngine.promptValue("enter property value", "propertyTargetString");
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
            classes.push({ id: targetClassUri, label: self.params.model.nodes[targetClassUri].label });
        });
        common.array.sortObjectArray(classes, "label");

        _botEngine.showList(classes, "propertyTargetClass");
    };
    self.functions.listPropertiesFn = function () {
        var properties = [];

        self.params.model.edges.forEach(function (edge) {
            if (edge.from == self.params.classUri) {
                properties.push({ id: edge.data.propertyId, label: edge.data.propertyLabel });
            } else if (edge.to == self.params.classUri) {
                properties.push({ id: edge.data.propertyId, label: edge.data.propertyLabel });
            }
        });

        var nonObjectProperties = self.params.nodesMap[self.params.classUri].data.nonObjectProperties;
        if (nonObjectProperties) {
            nonObjectProperties.forEach(function (property) {
                properties.push({ id: property.propertyId, label: property.label });
            });
        }
        common.array.sortObjectArray(properties, "label");
        _botEngine.showList(properties, "propertyUri");
    };

    return self;
})();

export default KGquery_filter_bot;
window.KGquery_filter_bot = KGquery_filter_bot;
