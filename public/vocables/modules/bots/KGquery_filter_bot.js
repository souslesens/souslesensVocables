import Sparql_common from "../sparqlProxies/sparql_common.js";

import SparqlQuery_bot from "./sparqlQuery_bot.js";

import BotEngine from "./_botEngine.js";

var KGquery_filter_bot = (function () {
    var self = {};
    self.title = "Filter Class";

    self.start = function (data, currentQuery, validateFn) {
        self.data = data;
        var workflow = null;
        if (!self.data.annotationProperties) {
            workflow = self.workflow_RdfLabel;
        } else {
            workflow = self.workflow_filterClass;
        }

        BotEngine.init(KGquery_filter_bot, workflow, null, function () {
            self.validateFn = validateFn;
            self.callbackFn = function () {
                var filterLabel = BotEngine.getQueryText();
                return self.validateFn(null, { filter: self.filter, filterLabel: filterLabel });
            };

            self.params = currentQuery;
            SparqlQuery_bot.params = currentQuery;
            BotEngine.nextStep();
        });
    };

    self.workflow_filterClass = {
        listFilterTypes: {
            _OR: {
                annotation: { listAnnotationsFn: { chooseAnnotationOperatorFn: { promptAnnotationValueFn: { setSparqlQueryFilterFn: {} } } } },
                label: { promptIndividualsLabelFn: { setSparqlQueryFilterFn: {} } },
                labelsList: { listIndividualsFn: { setSparqlQueryFilterFn: {} } },
            },
        },
    };
    self.workflow_Annotation = { listAnnotationsFn: { chooseAnnotationOperatorFn: { promptAnnotationValueFn: { setSparqlQueryFilterFn: {} } } } };

    self.workflow_RdfLabel = {
        listFilterTypes: {
            _OR: {
                label: { promptIndividualsLabelFn: { setSparqlQueryFilterFn: {} } },
                labelsList: { listIndividualsFn: { setSparqlQueryFilterFn: {} } },
            },
        },
    };

    self.functionTitles = {
        listAnnotationsFn: "Choose an annotation",
        chooseAnnotationOperatorFn: "Choose an operator",
        promptAnnotationValueFn: "Enter a value ",
        promptIndividualsLabelFn: "Enter a label ",
        listIndividualsFn: "Choose a label ",
    };

    self.functions = SparqlQuery_bot.functions;

    (self.functions.listFilterTypes = function () {
        var choices = [
            { id: "annotation", label: "annotation" },
            { id: "label", label: "rdfs:label contains" },
            { id: "labelsList", label: "Choose rdfs:label" },
        ];
        BotEngine.showList(choices, "individualsFilterType");
    }),
        (self.functions.listAnnotationsFn = function () {
            if (!self.data || !self.data.annotationProperties) {
                BotEngine.abort("no annotations for this Class");
            }
            var choices = self.data.annotationProperties;
            BotEngine.showList(choices, "annotationProperty");
            BotEngine.showList(choices, "annotationProperty");
        });
    self.functions.chooseAnnotationOperatorFn = function () {
        var datatype = null;
        self.data.annotationProperties.forEach(function (item) {
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
            choices = ["=", "<", "<=", ">", ">="];
        } else {
            choices = ["=", "!=", "contains", ">", "!contains"];
        }

        BotEngine.showList(choices, "annotationPropertyOperator");
    };
    self.functions.promptAnnotationValueFn = function () {
        if (!self.params.annotationDatatype || self.params.annotationDatatype == "xsd:string") {
            BotEngine.promptValue("enter value", "annotationPropertyValue");
        } else if (
            !self.params.annotationDatatype ||
            self.params.annotationDatatype == "http://www.w3.org/2001/XMLSchema#date" ||
            self.params.annotationDatatype == "http://www.w3.org/2001/XMLSchema#datetime"
        ) {
            BotEngine.promptValue("enter value", "annotationPropertyValue", null, { datePicker: 1 });
        } else {
            BotEngine.promptValue("enter value", "annotationPropertyValue");
        }
    };

    self.functions.setSparqlQueryFilterFn = function (queryParams, varName) {
        var varName = self.params.varName;
        var individualsFilterType = self.params.individualsFilterType;
        var individualsFilterValue = self.params.individualsFilterValue;
        var advancedFilter = self.params.advancedFilter || "";
        var filterLabel = self.params.queryText;

        var annotationProperty = self.params.annotationProperty;
        var annotationPropertyOperator = self.params.annotationPropertyOperator;
        var annotationPropertyValue = self.params.annotationPropertyValue;

        self.filter = "";
        //individualsFilterType='list';
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
                } else {
                    //string
                    if (annotationPropertyOperator == "=" || annotationPropertyOperator == "!=") {
                        self.filter = "FILTER (?" + varName + "_" + propLabel + " " + annotationPropertyOperator + " '" + annotationPropertyValue + "')";
                    } else {
                        self.filter = " FILTER (regex(?" + varName + "_" + propLabel + ",'" + annotationPropertyValue + "','i'))";
                    }
                    return BotEngine.nextStep();
                }
            }
        } else if (individualsFilterType == "label") {
            self.filter = Sparql_common.setFilter(varName, null, individualsFilterValue);
        } else if (individualsFilterType == "labelsList") {
            self.filter = Sparql_common.setFilter(varName, individualsFilterValue, null, { useFilterKeyWord: 1 });
        } else if (individualsFilterType == "advanced") {
            self.filter = advancedFilter;
        }
        self.filter = self.filter.replace("Label", "_label");
        BotEngine.nextStep();
    };

    return self;
})();

export default KGquery_filter_bot;
window.KGquery_filter_bot = KGquery_filter_bot;
