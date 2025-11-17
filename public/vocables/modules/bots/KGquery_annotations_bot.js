import Sparql_common from "../sparqlProxies/sparql_common.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";

var KGquery_annotations_bot = (function () {
    var self = {};
    self.title = "Filter Class";

    self.start = function (currentQuery, validateFn) {
        var startParams = _botEngine.fillStartParams(arguments);
        _botEngine.init(KGquery_annotations_bot, self.workflow_selectproperties, null, function () {
            _botEngine.startParams = startParams;
            self.validateFn = validateFn;
            self.callbackFn = function () {
                var filterLabel = _botEngine.getQueryText();
                return self.validateFn(null, { filter: self.filter, filterLabel: filterLabel });
            };

            self.params = currentQuery;
            SparqlQuery_bot.params = currentQuery;
            _botEngine.nextStep();
        });
    };

    self.workflow_selectproperties = {
        listSelectvariablesTypes: {
            _OR: {
                "all properties": { setAllSelectVariables: { setSparqlQuerySelect: {} } },
                "select a class": { listClasses: { setClassSelectVariables: {} } },
                "execute query": { promptIndividualsAdvandedFilterFn: { setSparqlQueryFilter: {} } },
            },
        },
    };

    self.functions = SparqlQuery_bot.functions;

    self.functions.setSparqlQueryFilter = function (queryParams, varName) {
        var varName = self.params.varName;
        var individualsFilterType = self.params.individualsFilterType;
        var individualsFilterValue = self.params.individualsFilterValue;
        var advancedFilter = self.params.advancedFilter || "";
        var filterLabel = self.params.queryText;

        self.filter = "";
        if (individualsFilterType == "label") {
            self.filter = Sparql_common.setFilter(varName, null, individualsFilterValue);
        } else if (individualsFilterType == "list") {
            self.filter = Sparql_common.setFilter(varName, individualsFilterValue, null, { useFilterKeyWord: 1 });
        } else if (individualsFilterType == "advanced") {
            self.filter = advancedFilter;
        }
        _botEngine.nextStep();
    };

    return self;
})();

export default KGquery_annotations_bot;
window.KGquery_annotations_bot = KGquery_annotations_bot;
