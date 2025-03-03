

var _botFilteringFunctions = (function () {


    self.functions = {}; //SparqlQuery_bot.functions;



    self.getOperatorsList = function (propertyDatatype) {
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

       return choices
    };



    self.promptPropertyValueFn = function (propertyDatatype) {
        if (!self.params.propertyDatatype || self.params.propertyDatatype == "xsd:string") {
            self.aBotEngine.promptValue("enter value", "propertyValue");
        } else if (!self.params.propertyDatatype || self.params.propertyDatatype.indexOf("http://www.w3.org/2001/XMLSchema#date") > -1) {
            if (self.params.propertyOperator == "range") {
                DateWidget.showDateRangePicker("widgetGenericDialogDiv", null, null, function (minDate, maxDate) {
                    self.params.dateValueRange = { minDate: minDate, maxDate: maxDate };
                    //   self.functions.setSparqlQueryFilterFn()
                    self.aBotEngine.nextStep();
                });
                return;
            } else {
                self.aBotEngine.promptValue("enter value", "propertyValue", null, { datePicker: 1 });
            }
        } else {
            self.aBotEngine.promptValue("enter value", "propertyValue");
        }
    };

    self.getLogicalOperators = function () {
     return  ["end", "AND", "OR"];

    };

    self.getNonObjectPropertySparqlFilter = function (params) {
        if(!params.filterItems)
            params.filterItems=[]
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
var filterClause=""
        var propLabel = Sparql_common.getLabelFromURI(property);
        if (dateValueRange) {
            var minDate = new Date(dateValueRange.minDate).toISOString();
            var maxDate = new Date(dateValueRange.maxDate).toISOString();
            minDate = common.ISODateStrToRDFString(minDate);
            maxDate = common.ISODateStrToRDFString(maxDate);
           filterClause=("?" + varName  + " " + ">=" + ' "' + minDate + '"^^xsd:dateTime ');
           filterClause=("?" + varName  + " " + "<=" + ' "' + maxDate + '"^^xsd:dateTime  &&');
        } else if (propertyValue) {
            if (params.propertyDatatype.indexOf("http://www.w3.org/2001/XMLSchema#date") > -1) {
                var dateStr = new Date(propertyValue).toISOString();
                dateStr = common.ISODateStrToRDFString(dateStr);
               filterClause=("?" + varName  + " " + propertyOperator + ' "' + dateStr + '"^^xsd:dateTime');
            } else if (params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#int") {
               filterClause=("?" + varName  + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:int ');
            } else if (params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#float") {
               filterClause=("?" + varName  + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:float ');
            } else if (params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#decimal") {
               filterClause=("?" + varName  + " " + propertyOperator + ' "' + propertyValue + '"^^xsd:decimal ');
            } else {
                if (false && common.isNumber(propertyValue)) {
                   filterClause=("?" + varName  + " " + propertyOperator + " " + propertyValue + " ");
                } else {
                    //string
                    if (propertyOperator == "=" || propertyOperator == "!=") {
                       filterClause=("?" + varName  + " " + propertyOperator + ' "' + propertyValue + '"');
                    } else {
                        var negation = "";
                        if (propertyOperator.indexOf("!") == 0) {
                            negation = "!";
                        }
                       filterClause=(negation + "regex(?" + varName  + ',"' + propertyValue + '","i")');
                    }
                }
            }
        } else if (individualsFilterType == "label") {
           filterClause=("regex(?" + varName  + individualsFilterValue + '","i")');
        } else if (individualsFilterType == "labelsList" && individualsFilterValue) {
           filterClause=(" ?" + varName + " =<" + individualsFilterValue + ">");
        } else {
          return filterClause
        }
       return  filterClause


    };



    self.listIndividualsFn = function () {
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
            self.aBotEngine.showList(individuals, "individualsFilterValue");
        });
    };
    self.listFilterTypes = function () {
        var choices = [
            { id: "label", label: "rdfs:label contains" },
            { id: "labelsList", label: "Choose rdfs:label" },
        ];
        self.aBotEngine.showList(choices, "individualsFilterType");
    };
    return self;
})();

export default _botFilteringFunctions;
window.BotFilteringFunctions = _botFilteringFunctions;
