import botEngine from "./_botEngine.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import KGquery from "../tools/KGquery/KGquery.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import _botEngine from "./_botEngine.js";

var KGquery_filter_bot = (function() {
    var self = {};
    self.title = "Filter Class";


    self.start = function(data, currentQuery, validateFn) {
        self.data = data;
        _botEngine.init(KGquery_filter_bot, self.workflow_filterClass, null, function() {
            self.validateFn = validateFn;
            self.callbackFn = function() {
                var filterLabel = _botEngine.getQueryText();
                return self.validateFn(null, { filter: self.filter, filterLabel: filterLabel });
            };

            self.params = currentQuery;
            SparqlQuery_bot.params = currentQuery;
            _botEngine.nextStep();
        });
    };

    self.workflow_filterClass = {

        _OR: {
            "Choose annotation": { listAnnotationsFn: { chooseAnnotationOperatorFn: { promptAnnotationValueFn: { setSparqlQueryFilter: {} } } } },
            "enter rdfs:label": { promptIndividualsLabelFn: { setSparqlQueryFilter: {} } },
            "List rdfs:labels": { listIndividualsFn: { setSparqlQueryFilter: {} } }
            // advanced: { promptIndividualsAdvandedFilterFn: { setSparqlQueryFilter: {} } },
            // date: { promptIndividualsAdvandedFilterFn: { setSparqlQueryFilter: {} } },
            //  period: { promptIndividualsAdvandedFilterFn: { setSparqlQueryFilter: {} } },
            // }
        }

    };


    self.functionTitles = {
        listAnnotationsFn: "Choose an annotation",
        chooseAnnotationOperatorFn: "Choose an operator",
        promptAnnotationValueFn: "Enter a value ",
        promptIndividualsLabelFn: "Enter a label ",
        listIndividualsFn: "Choose a label "
    };

    self.functions = SparqlQuery_bot.functions;

    self.functions.listAnnotationsFn = function() {
        if (!self.data || !self.data.annotationProperties) {
            _botEngine.abort("no annotations for this Class");
        }
        var choices = self.data.annotationProperties;
        _botEngine.showList(choices, "annotationProperty");

    };
    self.functions.chooseAnnotationOperatorFn = function() {
        var datatype = null;
        self.data.annotationProperties.forEach(function(item) {
            if (item.id == self.params.annotationProperty) {
                datatype = item.datatype;
            }
        });
        self.params.annotationDatatype = datatype;
        var choices = [];
        if (self.params.annotationDatatype == "http://www.w3.org/2001/XMLSchema#date" || self.params.annotationDatatype == "http://www.w3.org/2001/XMLSchema#datetime") {
            // annotationPropertyOperator = ">";
            choices = ["=", "<", "<=", ">", ">="];
        } else if (self.params.annotationDatatype == "http://www.w3.org/2001/XMLSchema#int") {
            choices = ["=", "<", "<=", ">", ">="];
        } else if (self.params.annotationDatatype == "http://www.w3.org/2001/XMLSchema#float") {
            choices = ["=", "!=", "contains", ">", "!contains"];

            _botEngine.showList(choices, "annotationPropertyOperator");


        }
    };
    self.functions.promptAnnotationValueFn = function() {

            if (!self.params.annotationDatatype || self.params.annotationDatatype == "xsd:string") {
                _botEngine.promptValue("enter value", "annotationPropertyValue");
            } else if (!self.params.annotationDatatype || self.params.annotationDatatype == "http://www.w3.org/2001/XMLSchema#date" || datatype == "http://www.w3.org/2001/XMLSchema#datetime") {
                _botEngine.promptValue("enter value", "annotationPropertyValue", null, { datePicker: 1 });


        }
    };


    self.functions.listFilterTypes = function() {
        /* var choices = ["label", "list"];
            BotEngine.showList(choices, "individualsFilterType");*/
    };

    self.functions.setSparqlQueryFilter = function(queryParams, varName) {
        var varName = self.params.varName;
        var individualsFilterType = self.params.individualsFilterType;
        var individualsFilterValue = self.params.individualsFilterValue;
        var advancedFilter = self.params.advancedFilter || "";
        var filterLabel = self.params.queryText;

        var annotationProperty = self.params.annotationProperty;
        var annotationPropertyOperator = self.params.annotationPropertyOperator;
        var annotationPropertyValue = self.params.annotationPropertyValue;


        self.filter = "";

        if (annotationPropertyValue) {
            var propLabel = Sparql_common.getLabelFromURI(annotationProperty);

            if (self.params.annotationDatatype == "http://www.w3.org/2001/XMLSchema#date" || self.params.annotationDatatype == "http://www.w3.org/2001/XMLSchema#datetime") {
                // annotationPropertyOperator = ">";
                var dateStr = new Date(annotationPropertyValue).toISOString();
                self.filter = "FILTER (?" + varName + "_" + propLabel + " " + annotationPropertyOperator + " '" + dateStr + "'^^xsd:datetime )";

            } else if (self.params.annotationDatatype == "http://www.w3.org/2001/XMLSchema#int") {
                self.filter = "FILTER (?" + varName + "_" + propLabel + " " + annotationPropertyOperator + " '" + annotationPropertyValue + "'^^xsd:int )";

            } else if (self.params.annotationDatatype == "http://www.w3.org/2001/XMLSchema#float") {
                self.filter = "FILTER (?" + varName + "_" + propLabel + " " + annotationPropertyOperator + " '" + annotationPropertyValue + "'^^xsd:float )";


                } else {
                    if (common.isNumber(annotationPropertyValue)) {
                        self.filter = "FILTER (?" + varName + "_" + propLabel + " " + annotationPropertyOperator + " " + annotationPropertyValue + " )";
                    } else { //string
                        if (annotationPropertyOperator == "=" || annotationPropertyOperator == "!=") {
                            self.filter = "FILTER (?" + varName + "_" + propLabel + " " + annotationPropertyOperator + " '" + annotationPropertyValue + "')";
                        } else {
                            self.filter = " FILTER (regex(?" + varName + "_" + propLabel + ",'" + annotationPropertyValue + "','i'))";
                        }
                        return _botEngine.nextStep();
                    }
                }
            } else if (individualsFilterType == "label") {
                self.filter = Sparql_common.setFilter(varName, null, individualsFilterValue);
            } else if (individualsFilterType == "list") {
                self.filter = Sparql_common.setFilter(varName, individualsFilterValue, null, { useFilterKeyWord: 1 });
            } else if (individualsFilterType == "advanced") {
                self.filter = advancedFilter;
            }
            self.filter = self.filter.replace("Label", "_label");
            _botEngine.nextStep();
        }
        ;
    };



    return self;
})();

export default KGquery_filter_bot;
window.KGquery_filter_bot = KGquery_filter_bot;
