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
            listPropertiesFn: {
                listConstraintTypesFn: {
                    listConstraintsFn: {

                            _OR: {
                                ChooseInList: {listIndividualsFn: {listLogicalOperatorFn: {setSparqlQueryFilterFn: {}}}},
                                _DEFAULT: {
                                    promptPropertyValueFn: {listLogicalOperatorFn: {setSparqlQueryFilterFn: {}}},
                                },
                            },

                    },

                }
        }}
    };


    self.functionTitles = {
        listClassesFn: "Choose a Class",
        listPropertiesFn: "Choose an property",
        listConstraintTypesFn: "Choose an property",
        listConstraintsFn: "Choose an property",
        choosePropertyOperatorFn: "Choose an operator",
        promptPropertyValueFn: "Enter a value ",
        promptIndividualsLabelFn: "Enter a label ",
        listIndividualsFn: "Choose a label ",
    };

    self.functions = {}; //SparqlQuery_bot.functions;

    self.functions.listClassesFn = function () {

        var classes =[]
        for (var classUri in self.params.model) {
            classes.push({id: classUri, label: self.params.model[classUri].label})
        }
        common.array.sortObjectArray(classes, "label")

        _botEngine.showList(classes, "classUri");


    };




    self.functions.listPropertiesFn = function () {

        var properties = []

        for (var propUri in self.params.model[ self.params.classUri].properties) {
            properties.push({id: propUri, label: self.params.model[self.params.classUri].properties[propUri].pLabel})
        }

        common.array.sortObjectArray(properties, "label")
        _botEngine.showList(properties, "propertyUri");

    };
    self.functions.listConstraintTypesFn= function () {

        var choices = []

        for (var type in self.params.constraintsMap) {
            choices.push({id: type, label: type})
        }

        common.array.sortObjectArray(choices, "label")
        _botEngine.showList(choices, "containtType");

    };
    self.functions.listConstraintsFn = function () {

        var constraints = []

        for (var constraint in self.params.constraintsMap[self.params.containtType]) {
            constraints.push({id: constraint, label: constraint})
        }

        common.array.sortObjectArray(constraints, "label")
        _botEngine.showList(constraints, "propertyUri");

    };



    self.functions.promptPropertyValueFn = function () {
        if (!self.params.propertyDatatype || self.params.propertyDatatype == "xsd:string") {
            _botEngine.promptValue("enter value", "propertyValue");
        } else if (
            !self.params.propertyDatatype ||
            self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#date" ||
            self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#dateTime"
        ) {
            if (self.params.propertyOperator == "range") {
                DateWidget.showDateRangePicker("widgetGenericDialogDiv", null, null, function (minDate, maxDate) {
                    self.params.dateValueRange = {minDate: minDate, maxDate: maxDate};
                    //   self.functions.setSparqlQueryFilterFn()
                    _botEngine.nextStep();
                });
                return;
            } else {
                _botEngine.promptValue("enter value", "propertyValue", null, {datePicker: 1});
            }
        } else {
            _botEngine.promptValue("enter value", "propertyValue");
        }
    };

    self.functions.listLogicalOperatorFn = function () {
        var choices = ["end", "AND", "OR"];
        _botEngine.showList(choices, "filterBooleanOperator");
    };

    self.functions.setSparqlQueryFilterFn = function () {
        var varName = self.params.varName;
        var individualsFilterType = self.params.individualsFilterType;
        var individualsFilterValue = self.params.individualsFilterValue;

        var advancedFilter = self.params.advancedFilter || "";
        var filterLabel = self.params.queryText;

        var property = self.params.property;
        var propertyOperator = self.params.propertyOperator;
        var propertyValue = self.params.propertyValue;
        var dateValueRange = self.params.dateValueRange;

        var filterBooleanOperator = self.params.filterBooleanOperator;
        if (!filterBooleanOperator || filterBooleanOperator == "end") {
            filterBooleanOperator = "";
        } else if (filterBooleanOperator == "AND") {
            filterBooleanOperator = " && ";
        } else if (filterBooleanOperator == "OR") {
            filterBooleanOperator = " || ";
        }

        var propLabel = Sparql_common.getLabelFromURI(property);
        if (dateValueRange) {
            var minDate = new Date(dateValueRange.minDate).toISOString();
            var maxDate = new Date(dateValueRange.maxDate).toISOString();
            minDate = common.ISODateStrToRDFString(minDate);
            maxDate = common.ISODateStrToRDFString(maxDate);
            self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + ">=" + ' "' + minDate + '"^^xsd:dateTime ');
            self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + "<=" + ' "' + maxDate + '"^^xsd:dateTime  &&');
        } else if (propertyValue) {
            if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#date" || self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#dateTime") {
                var dateStr = new Date(propertyValue).toISOString();
                dateStr = common.ISODateStrToRDFString(dateStr);
                self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + ' "' + dateStr + '"^^xsd:dateTime');
            } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#int") {
                self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:int ');
            } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#float") {
                self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:float ');
            } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#decimal") {
                self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:decimal ');
            } else {
                if (false && common.isNumber(propertyValue)) {
                    self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + " " + propertyValue + " ");
                } else {
                    //string
                    if (propertyOperator == "=" || propertyOperator == "!=") {
                        self.filterItems.push(filterBooleanOperator + "?" + varName + "_" + propLabel + " " + propertyOperator + ' "' + propertyValue + '"');
                    } else {
                        var negation = "";
                        if (propertyOperator.indexOf("!") == 0) {
                            negation = "!";
                        }
                        self.filterItems.push(filterBooleanOperator + negation + "regex(?" + varName + "_" + propLabel + ',"' + propertyValue + '","i")');
                    }
                }
            }
        } else if (individualsFilterType == "label") {
            self.filterItems.push(filterBooleanOperator + "regex(?" + varName + 'Label , "' + individualsFilterValue + '","i")');
        } else if (individualsFilterType == "labelsList" && individualsFilterValue) {
            self.filterItems.push(filterBooleanOperator + " ?" + varName + " =<" + individualsFilterValue + ">");
        } else {
            _botEngine.abort("filter type not implemented");
        }

        if (self.params.filterBooleanOperator == "end") {
            self.functions.writeFilterFn();

            _botEngine.nextStep();
        } else {
            _botEngine.currentObj = self.workflow_filterClass;
            _botEngine.currentBot.params.property = "";
            _botEngine.currentBot.params.propertyDatatype = "";
            _botEngine.currentBot.params.propertyOperator = "";
            _botEngine.currentBot.params.propertyValue = "";
            _botEngine.nextStep();
        }
    };

    self.functions.writeFilterFn = function () {
        var str = "";
        self.filterItems.forEach(function (item) {
            str = item + str;
        });
        var propLabel = Sparql_common.getLabelFromURI(self.params.property);
        self.filter += "FILTER (" + str + ")";
        self.filter = self.filter.replace("Label", "_label");
        self.filterParams = {varName: self.params.varName, property: self.params.property, propertyLabel: propLabel};
    };

    return self;
})
();

export default KGquery_filter_bot;
window.KGquery_filter_bot = KGquery_filter_bot;
