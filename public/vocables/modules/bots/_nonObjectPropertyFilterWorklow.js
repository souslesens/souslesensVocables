import OntologyModels from "../shared/ontologyModels.js";

class NonObjectPropertyFilterWorklow {
    constructor(visjsDataModel, params, botEngine) {
        self.visjsDataModel = visjsDataModel;
        self.params = params;
        self.botEngine = botEngine;
    }

    //     functions called in KGquery_filter_bot
    listNonObjectPropertiesFn(callback) {
        self.callback = callback;
        var model = {};

        self.visjsDataModel.nodes.forEach(function (node) {
            if (node.data.nonObjectProperties) {
                model[node.id] = node.data.nonObjectProperties;
            }
        });

        // OntologyModels.getKGnonObjectProperties(self.params.source, {}, function (err, model) {
        var currentClassId = self.params.currentClass;
        if (!model[currentClassId]) {
            // alert("no matching fact");
            return self.callback(null, "");
        }
        var nonObjectProperties = model[currentClassId];
        nonObjectProperties = common.removeDuplicatesFromArray(nonObjectProperties, "id");
        var anyObject=nonObjectProperties.filter(function (item) {return item.id == 'any'});

        if(anyObject.length==0){
            nonObjectProperties.unshift({ id: "any", label: "any" });
        }
        self.botEngine.showList(nonObjectProperties, "property", null, null, function (value) {
            if (value == "any") {
                return self.callback(null, "");
            }

            self.params.property = value;
            self.params.varName = "var_" + common.getRandomHexaId(3);
            self.params.propertyDatatype = "string";
            nonObjectProperties.forEach(function (item) {
                if (item.id == value) {
                    self.params.propertyDatatype = item.datatype;
                }
            });
            NonObjectPropertyFilterWorklow.choosePropertyOperatorFn();
        });
        //  });
    }

    static choosePropertyOperatorFn() {
        var choices = NonObjectPropertyFilterWorklow.getOperatorsList(self.params.propertyDatatype);
        self.botEngine.showList(choices, "propertyOperator", null, null, function (value) {
            self.params.propertyOperator = value;
            NonObjectPropertyFilterWorklow.promptPropertyValueFn();
        });
    }

    static promptPropertyValueFn() {
        if (!self.params.propertyDatatype || self.params.propertyDatatype == "xsd:string") {
            self.botEngine.promptValue("enter value", "propertyValue");
        } else if (!self.params.propertyDatatype || self.params.propertyDatatype.indexOf("http://www.w3.org/2001/XMLSchema#date") > -1) {
            if (self.params.propertyOperator == "range") {
                DateWidget.showDateRangePicker("widgetGenericDialogDiv", null, null, function (minDate, maxDate) {
                    self.params.dateValueRange = { minDate: minDate, maxDate: maxDate };
                    // self.setSparqlQueryFilterFn()
                    //   botEngine.nextStep();
                    NonObjectPropertyFilterWorklow.listLogicalOperatorFn();
                });
            } else {
                self.botEngine.promptValue("enter value", "propertyValue", null, { datePicker: 1 }, function (minDate, maxDate) {
                    self.params.propertyValue = minDate;
                    NonObjectPropertyFilterWorklow.listLogicalOperatorFn();
                });
            }
        } else {
            self.botEngine.promptValue("enter value", "propertyValue", null, null, function (value) {
                self.params.propertyValue = value;
                NonObjectPropertyFilterWorklow.listLogicalOperatorFn();
            });
        }
    }

    static listLogicalOperatorFn() {
        var choices = ["end", "AND", "OR"];
        self.botEngine.showList(choices, "filterBooleanOperator", null, null, function (value) {
            self.params.filterBooleanOperator = value;
            NonObjectPropertyFilterWorklow.setSparqlQueryFilterFn();
        });
    }

    static setSparqlQueryFilterFn() {
        self.params.filterText = NonObjectPropertyFilterWorklow.getNonObjectPropertySparqlFilter(self.params);
        var booleanOperator = self.params.filterBooleanOperator;
        var booleanOp = "";
        if (booleanOperator == "AND") {
            booleanOp = " && ";
        } else if (booleanOperator == "OR") {
            booleanOp = " || ";
        }
        if (!self.params.PropertyfilterItem) {
            self.params.PropertyfilterItem = "";
        }
        self.params.PropertyfilterItem += booleanOp + self.params.filterText + " ";

        if (true || booleanOperator == "end") {
            var filter = "?subject <" + self.params.property + "> ?" + self.params.varName + ".FILTER(" + self.params.PropertyfilterItem + ").";
            return self.callback(null, filter);
        } /*else {
            return  NonObjectPropertyFilterWorklow.lisNonObjectPropertiesFn()

        }*/
    }

    static ChooseInList() {
        KGquery_filter_bot.functions.ChooseInList();
    }

    static listIndividualsFn() {
        KGquery_filter_bot.functions.listIndividualsFn();
    }

    static getOperatorsList(propertyDatatype) {
        var choices = [];

        if (propertyDatatype.indexOf("http://www.w3.org/2001/XMLSchema#date") > -1) {
            // propertyOperator = ">";
            choices = ["=", "<", "<=", ">", ">=", "range"];
        } else if (propertyDatatype == "http://www.w3.org/2001/XMLSchema#int") {
            choices = ["=", "<", "<=", ">", ">="]; //, "range"];
        } else if (propertyDatatype == "http://www.w3.org/2001/XMLSchema#float") {
            choices = ["=", "<", "<=", ">", ">="]; //, "range"];
        } else if (propertyDatatype == "http://www.w3.org/2001/XMLSchema#decimal") {
            choices = ["=", "<", "<=", ">", ">="]; //, "range"];
        } else {
            choices = ["=", "!=", "contains", ">", "!contains", "ChooseInList"];
        }

        return choices;
    }

    static getNonObjectPropertySparqlFilter(params) {
        if (!params.filterItems) {
            params.filterItems = [];
        }
        var varName = params.varName;
        var individualsFilterType = params.individualsFilterType;
        var individualsFilterValue = params.individualsFilterValue;

        var advancedFilter = params.advancedFilter || "";
        var filterLabel = params.queryText;

        var property = params.property;
        var propertyOperator = params.propertyOperator;
        var propertyValue = params.propertyValue;
        var dateValueRange = params.dateValueRange;

        var filterBooleanOperator = params.filterBooleanOperator;
        if (!filterBooleanOperator || filterBooleanOperator == "end") {
            filterBooleanOperator = "";
        } else if (filterBooleanOperator == "AND") {
            filterBooleanOperator = " && ";
        } else if (filterBooleanOperator == "OR") {
            filterBooleanOperator = " || ";
        }
        var filterClause = "";
        var propLabel = Sparql_common.getLabelFromURI(property);
        if (dateValueRange) {
            var minDate = new Date(dateValueRange.minDate).toISOString();
            var maxDate = new Date(dateValueRange.maxDate).toISOString();
            minDate = common.ISODateStrToRDFString(minDate);
            maxDate = common.ISODateStrToRDFString(maxDate);
            filterClause = "?" + varName + " " + ">=" + ' "' + minDate + '"^^xsd:dateTime ';
            filterClause = "?" + varName + " " + "<=" + ' "' + maxDate + '"^^xsd:dateTime  &&';
        } else if (propertyValue) {
            if (params.propertyDatatype.indexOf("http://www.w3.org/2001/XMLSchema#date") > -1) {
                var dateStr = new Date(propertyValue).toISOString();
                dateStr = common.ISODateStrToRDFString(dateStr);
                filterClause = "?" + varName + " " + propertyOperator + ' "' + dateStr + '"^^xsd:dateTime';
            } else if (params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#int") {
                filterClause = "?" + varName + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:int ';
            } else if (params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#float") {
                filterClause = "?" + varName + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:float ';
            } else if (params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#decimal") {
                filterClause = "?" + varName + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:decimal ';
            } else {
                if (false && common.isNumber(propertyValue)) {
                    filterClause = "?" + varName + " " + propertyOperator + " " + propertyValue + " ";
                } else {
                    //string
                    if (propertyOperator == "=" || propertyOperator == "!=") {
                        filterClause = "?" + varName + " " + propertyOperator + ' "' + propertyValue + '"';
                    } else {
                        var negation = "";
                        if (propertyOperator.indexOf("!") == 0) {
                            negation = "!";
                        }
                        filterClause = negation + "regex(?" + varName + ',"' + propertyValue + '","i")';
                    }
                }
            }
        } else if (individualsFilterType == "label") {
            filterClause = "regex(?" + varName + individualsFilterValue + '","i")';
        } else if (individualsFilterType == "labelsList" && individualsFilterValue) {
            filterClause = " ?" + varName + " =<" + individualsFilterValue + ">";
        } else {
            return filterClause;
        }
        return filterClause;
    }

    listIndividualsFn() {
        Sparql_OWL.getDistinctClassLabels(self.params.source, [self.params.currentClass], {}, function (err, result) {
            if (err) {
                return alert(err);
            }
            var individuals = [];
            result.forEach(function (item) {
                individuals.push({
                    id: item.id.value,
                    label: item.label.value,
                });
            });

            individuals.sort(function (a, b) {
                if (a.label > b.label) {
                    return 1;
                }
                if (a.label < b.label) {
                    return -1;
                }
                return 0;
            });
            self.params.individualsFilterType = "labelsList";
            self.botEngine.showList(individuals, "individualsFilterValue");
        });
    }

    listFilterTypes() {
        var choices = [
            { id: "label", label: "rdfs:label contains" },
            { id: "labelsList", label: "Choose rdfs:label" },
        ];
        self.botEngine.showList(choices, "individualsFilterType");
    }
}

export default NonObjectPropertyFilterWorklow;
window.NonObjectPropertyFilterWorklow = NonObjectPropertyFilterWorklow;
