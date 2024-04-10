import Sparql_common from "../sparqlProxies/sparql_common.js";

import SparqlQuery_bot from "./sparqlQuery_bot.js";

import BotEngine from "./_botEngine.js";
import _botEngine from "./_botEngine.js";

var KGquery_filter_bot = (function () {
    var self = {};
    self.title = "Filter Class";


    self.start = function (data, currentQuery, validateFn) {
        self.data = data;
        self.filter = "";
        self.filterItems=[]
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

   




    self.workflow_Property = { listPropertiesFn: { choosePropertyOperatorFn: { promptPropertyValueFn: { setSparqlQueryFilterFn:{ } }}}  };

    self.workflow_filterClass = {
        listPropertiesFn: {
                choosePropertyOperatorFn: {
                    promptPropertyValueFn: {listLogicalOperatorFn:{setSparqlQueryFilterFn: {}}

                        }
                    }
                }

    }

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


    self.functions.listFilterTypes = function () {
        var choices = [
            { id: "property", label: "property" },
            { id: "label", label: "rdfs:label contains" },
            { id: "labelsList", label: "Choose rdfs:label" },
        ];
        BotEngine.showList(choices, "individualsFilterType");
    }
        self.functions.listPropertiesFn = function () {
            if (!self.data || !self.data.nonObjectProperties) {
                BotEngine.abort("no property for this Class");
            }
            var choices = self.data.nonObjectProperties;
            BotEngine.showList(choices, "property");
         
        };
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
            choices = ["=", "<", "<=", ">", ">=","range"];
        } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#int") {
            choices = ["=", "<", "<=", ">", ">=","range"];
        } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#float") {
            choices = ["=", "<", "<=", ">", ">=","range"];
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
            if(self.params.propertyOperator=="range"){
                DateWidget.showDateRangePicker ( "KGquery_rangeSliderDialogDiv",null,null, function (minDate,maxDate) {
                    self.params.dateValueRange= { minDate:minDate,maxDate:maxDate };
                    self.functions.setSparqlQueryFilterFn()
                })
                return;
            }else {
                BotEngine.promptValue("enter value", "propertyValue", null, { datePicker: 1 });
            }
        } else {
            BotEngine.promptValue("enter value", "propertyValue");
        }
    };

    self.functions.listLogicalOperatorFn=function(){
       var choices=["end","AND","OR"]
        BotEngine.showList(choices, "filterBooleanOperator");
    }


    self.functions.setSparqlQueryFilterFn = function () {
        var varName = self.params.varName;
        var individualsFilterType = self.params.individualsFilterType;
        var individualsFilterValue = self.params.individualsFilterValue;
        var advancedFilter = self.params.advancedFilter || "";
        var filterLabel = self.params.queryText;

        var property = self.params.property;
        var propertyOperator = self.params.propertyOperator;
        var propertyValue = self.params.propertyValue;
        var dateValueRange=self.params.dateValueRange
        
        var filterBooleanOperator = self.params.filterBooleanOperator;
        if(!filterBooleanOperator || filterBooleanOperator=="end")
            filterBooleanOperator= ""
        else if(filterBooleanOperator=="AND"){
            filterBooleanOperator=" && "
        }
        else if(filterBooleanOperator=="OR"){
            filterBooleanOperator=" || "
        }






        var propLabel = Sparql_common.getLabelFromURI(property);
        if(dateValueRange){
            var minDate= new Date(dateValueRange.minDate).toISOString();
            var maxDate= new Date(dateValueRange.maxDate).toISOString();
            self.filterItems.push(filterBooleanOperator+ "?" + varName + "_" + propLabel + " " + ">=" + " \"" + minDate + "\"^^xsd:dateTime " + " && ")
            self.filterItems.push(filterBooleanOperator+ "?" + varName + "_" + propLabel + " " + "<=" + " \"" + maxDate + "\"^^xsd:dateTime " )

        }
        else  if (propertyValue) {


            if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#date" || self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#datetime") {


                    var dateStr = new Date(propertyValue).toISOString();
                    self.filterItems.push(filterBooleanOperator+ "?" + varName + "_" + propLabel + " " + propertyOperator + " \"" + dateStr + "^^xsd:dateTime"  );

                } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#int") {
                self.filterItems.push(filterBooleanOperator+ "?" + varName + "_" + propLabel + " " + propertyOperator + " \"" + propertyValue + "\"^^xsd:int " );
            } else if (self.params.propertyDatatype == "http://www.w3.org/2001/XMLSchema#float") {
                self.filterItems.push(filterBooleanOperator+ "?" + varName + "_" + propLabel + " " + propertyOperator + " \"" + propertyValue + "\"^^xsd:float " );
            } else {
                if (common.isNumber(propertyValue)) {
                    self.filterItems.push(filterBooleanOperator+ "?" + varName + "_" + propLabel + " " + propertyOperator + " " + propertyValue + " " );
                } else {
                    //string
                    if (propertyOperator == "=" || propertyOperator == "!=") {
                        self.filterItems.push(filterBooleanOperator+ "?" + varName + "_" + propLabel + " " + propertyOperator + " \"" + propertyValue + "\"" );
                    } else {
                        var negation=""
                        if(propertyOperator.indexOf("!")==0)
                            negation="!"
                        self.filterItems.push(filterBooleanOperator+ negation+"regex(?" + varName + "_" + propLabel + ",\"" + propertyValue + "\",\"i\")" );

                    }

                }
            }
        } else if (individualsFilterType == "label") {
            self.filterItems.push( filterBooleanOperator+ "regex(?" + varName + "Label , \"" + individualsFilterValue + "\",\"i\")"  );
        } else if (individualsFilterType == "labelsList") {
            self.filterItems.push( filterBooleanOperator+" ?" + varName + " =" + individualsFilterValue + "" );
        }
        else{
            _botEngine.abort(("filter type not implemented"))
        }
        
      if(self.params.filterBooleanOperator=="end") {
          self.functions.writeFilterFn()

          BotEngine.nextStep();
      }else{
          _botEngine.currentObj= self.workflow_filterClass;
          _botEngine.nextStep()
      }
    };
    




    self.functions.writeFilterFn=function(){
       var str=""
        self.filterItems.forEach(function(item){
            str=item+str
        })
        self.filter+= "FILTER ("+str+")"
        self.filter = self.filter.replace("Label", "_label");
    }

    return self;
})();

export default KGquery_filter_bot;
window.KGquery_filter_bot = KGquery_filter_bot;
