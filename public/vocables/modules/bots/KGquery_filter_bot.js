import Sparql_common from "../sparqlProxies/sparql_common.js";

import SparqlQuery_bot from "./sparqlQuery_bot.js";

import BotEngine from "./_botEngine.js";
import _botEngine from "./_botEngine.js";

var KGquery_filter_bot = (function () {
    var self = {};
    self.title = "Filter Class";

    self.start = function (data, currentQuery, validateFn) {
        self.data = data;
        var workflow = null;
        if (!self.data.nonObjectProperties) {
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

   

    self.workflow_filterClass = { listPropertiesFn: {
            choosePropertyOperatorFn: {
                promptPropertyValueFn: {listLogicalOperatorFn:{setSparqlQueryFilterFn: {}}

                }
            }
        }
    }



    self.workflow_Property = { listPropertiesFn: { choosePropertyOperatorFn: { promptPropertyValueFn: { setSparqlQueryFilterFn: {} } } } };

    self.workflow_RdfLabel = {
        listFilterTypes: {
            _OR: {
                label: { promptIndividualsLabelFn: { setSparqlQueryFilterFn: {} } },
                labelsList: { listIndividualsFn: { setSparqlQueryFilterFn: {} } },
            },
        },
    };

    self.functionTitles = {
        listPropertiesFn: "Choose an property",
        choosePropertyOperatorFn: "Choose an operator",
        promptPropertyValueFn: "Enter a value ",
        promptIndividualsLabelFn: "Enter a label ",
        listIndividualsFn: "Choose a label ",
    };

    self.functions = SparqlQuery_bot.functions;

    (self.functions.listFilterTypes = function () {
        var choices = [
            { id: "property", label: "property" },
            { id: "label", label: "rdfs:label contains" },
            { id: "labelsList", label: "Choose rdfs:label" },
        ];
        BotEngine.showList(choices, "individualsFilterType");
    }),
        (self.functions.listPropertiesFn = function () {
            if (!self.data || !self.data.nonObjectProperties) {
                BotEngine.abort("no property for this Class");
            }
            var choices = self.data.nonObjectProperties;
            BotEngine.showList(choices, "property");
         
        });
    self.functions.choosePropertyOperatorFn = function () {
        var datatype = null;
        self.data.nonObjectProperties.forEach(function (item) {
            if (item.id == self.params.property) {
                datatype = item.datatype;
            }
        });
        self.params.propertyDatatype = datatype;
        var choices = [];
        if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#date" || self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#datetime") {
            // propertyOperator = ">";
            choices = ["=", "<", "<=", ">", ">="];
        } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#int") {
            choices = ["=", "<", "<=", ">", ">="];
        } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#float") {
            choices = ["=", "<", "<=", ">", ">="];
        } else {
            choices = ["=", "!=", "contains", ">", "!contains"];
        }

        BotEngine.showList(choices, "propertyOperator");
    };
    self.functions.promptPropertyValueFn = function () {
        if (!self.params.propertyDatatype || self.params.propertyDatatype == "xsd:string") {
            BotEngine.promptValue("enter value", "propertyValue");
        } else if (
            !self.params.propertyDatatype ||
            self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#date" ||
            self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#datetime"
        ) {
            BotEngine.promptValue("enter value", "propertyValue", null, { datePicker: 1 });
        } else {
            BotEngine.promptValue("enter value", "propertyValue");
        }
    };

    self.functions.listLogicalOperatorFn=function(){
       var choices=["end","AND","OR"]
        BotEngine.showList(choices, "propertyOperator",null,false,function(value){
            if(value=="end")
                _botEngine.nextStep()
        });
    }


    self.functions.setSparqlQueryFilterFn = function (queryParams, varName) {
        var varName = self.params.varName;
        var individualsFilterType = self.params.individualsFilterType;
        var individualsFilterValue = self.params.individualsFilterValue;
        var advancedFilter = self.params.advancedFilter || "";
        var filterLabel = self.params.queryText;

        var property = self.params.property;
        var propertyOperator = self.params.propertyOperator;
        var propertyValue = self.params.propertyValue;

        self.filter = "";
        //individualsFilterType='list';
        if (propertyValue) {
            var propLabel = Sparql_common.getLabelFromURI(property);

            if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#date" || self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#datetime") {
                // propertyOperator = ">";
                var dateStr = new Date(propertyValue).toISOString();
                //   var dateStr=date.getMonth()+"/"+date.getDate()+"/"+date.getFullYear()

                self.filter = "FILTER (?" + varName + "_" + propLabel + " " + propertyOperator + " '" + dateStr + "'^^xsd:datetime )";
            } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#int") {
                self.filter = "FILTER (?" + varName + "_" + propLabel + " " + propertyOperator + " '" + propertyValue + "'^^xsd:int )";
            } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#float") {
                self.filter = "FILTER (?" + varName + "_" + propLabel + " " + propertyOperator + " '" + propertyValue + "'^^xsd:float )";
            } else {
                if (common.isNumber(propertyValue)) {
                    self.filter = "FILTER (?" + varName + "_" + propLabel + " " + propertyOperator + " " + propertyValue + " )";
                } else {
                    //string
                    if (propertyOperator == "=" || propertyOperator == "!=") {
                        self.filter = "FILTER (?" + varName + "_" + propLabel + " " + propertyOperator + " '" + propertyValue + "')";
                    } else {
                        var negation=""
                        if(propertyOperator.indexOf("!")==0)
                            negation="!"
                        self.filter = " FILTER ("+negation+"regex(?" + varName + "_" + propLabel + ",'" + propertyValue + "','i'))";

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
