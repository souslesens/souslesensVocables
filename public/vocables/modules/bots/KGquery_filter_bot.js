import botEngine from "./botEngine.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import KGquery from "../tools/KGquery/KGquery.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import BotEngine from "./botEngine.js";

var KGquery_filter_bot = (function() {
    var self = {};
    self.title = "Filter Class";


    self.start = function(data,currentQuery, validateFn) {
        self.data=data
        BotEngine.init(KGquery_filter_bot, self.workflow_filterClass, null, function() {
            self.validateFn = validateFn;
            self.callbackFn = function() {
                var filterLabel = BotEngine.getQueryText();
                return self.validateFn(null, { filter: self.filter, filterLabel: filterLabel });
            };

            self.params = currentQuery;
            SparqlQuery_bot.params = currentQuery;
            BotEngine.nextStep();
        });
    };

    self.workflow_filterClass = {

            _OR: {
                "Choose annotation":{   listAnnotationsFn:{promptAnnotationValueFn:{setSparqlQueryFilter: {} }}},
                "enter rdfs:label": {    promptIndividualsLabelFn: { setSparqlQueryFilter: {} } },
                "List rdfs:labels": {  listIndividualsFn: { setSparqlQueryFilter: {} } },
                // advanced: { promptIndividualsAdvandedFilterFn: { setSparqlQueryFilter: {} } },
                // date: { promptIndividualsAdvandedFilterFn: { setSparqlQueryFilter: {} } },
                //  period: { promptIndividualsAdvandedFilterFn: { setSparqlQueryFilter: {} } },
                // }
            }

    };

    self.functions = SparqlQuery_bot.functions;

    self.functions.listAnnotationsFn=function(){
        if(!self.data || !self.data.annotationProperties)
            BotEngine.abort("no annotations for this Class")
        var choices=self.data.annotationProperties;
        BotEngine.showList(choices, "annotationProperty");

    }
    self.functions.promptAnnotationValueFn=function() {
        var datatype = self.data.annotationProperties[annotationProperty];

        if (!datatype || datatype == "xsd:string") {
            BotEngine.promptValue("enter value", "annotationPropertyValue")
        } else if (!datatype || datatype == "xsd:date" || datatype == "xsd:datetime") {
//DateWidget.
        }
    }




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

        var annotationProperty=self.params.annotationProperty;
        var annotationPropertyValue=self.params.annotationPropertyValue;


        self.filter = "";

        if(annotationPropertyValue){
            var propLabel=Sparql_common.getLabelFromURI(annotationProperty)

            self.filter= " FILTER (regex(?"+varName+"_"+propLabel+",'"+annotationPropertyValue+"','i'))"
        }
        else if (individualsFilterType == "label") {
            self.filter = Sparql_common.setFilter(varName, null, individualsFilterValue);
        } else if (individualsFilterType == "list") {
            self.filter = Sparql_common.setFilter(varName, individualsFilterValue, null, { useFilterKeyWord: 1 });
        } else if (individualsFilterType == "advanced") {
            self.filter = advancedFilter;
        }
        self.filter=self.filter.replace("Label","_label");
        BotEngine.nextStep();
    };

    return self;
})();

export default KGquery_filter_bot;
window.KGquery_filter_bot = KGquery_filter_bot;
