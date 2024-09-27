import Time2dChart from "./time2dChart.js";
import FiltersWidget from "./filtersWidget.js";

var SparqlQueries = (function () {
    var self = {};

    self.executeGraph2DQuery = function (options, callback) {
        if (!options) {
            options = {};
        }
        var url = Config.sources[Lifex_cost.currentSource].sparql_server.url + "?format=json&query=";
        UI.message("loading data");

        var query =
            `PREFIX owl: <http://www.w3.org/2002/07/owl#> PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> Select distinct *   FROM   <${Lifex_cost.lifexUri}>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <${Lifex_cost.planningSourceUri}>  FROM   <http://data.total/resource/tsf/one_data/>  where {?WBS_activity <http://rds.posccaesar.org/ontology/lis14/rdl/occursRelativeTo> ?JobCardExecution.\n` +
            "?Discipline <http://rds.posccaesar.org/ontology/lis14/rdl/realizedIn> ?JobCardExecution.\n" +
            "\n" +
            "\n" +
            ` ?WBS_activity  rdf:type <${Lifex_cost.planningSourceUri}WBS_activity>.  ?JobCardExecution  rdf:type <http://data.total/resource/tsf/dalia-lifex1/JobCardExecution>. ?Discipline  rdf:type <http://data.total/resource/tsf/dalia-lifex1/Discipline>. \n` +
            " OPTIONAL  {?WBS_activity <http://www.w3.org/2000/01/rdf-schema#label> ?WBS_activity_label.}\n" +
            ` OPTIONAL  {?WBS_activity <${Lifex_cost.planningSourceUri}startDate> ?WBS_activity_startDate.}\n` +
            ` OPTIONAL  {?WBS_activity <${Lifex_cost.planningSourceUri}endDate> ?WBS_activity_endDate.}\n` +
            " OPTIONAL  {?JobCardExecution <http://www.w3.org/2000/01/rdf-schema#label> ?JobCardExecution_label.}\n" +
            " OPTIONAL  {?Discipline <http://www.w3.org/2000/01/rdf-schema#label> ?Discipline_label.}\n" +
            ` OPTIONAL  {?WBS_activity <${Lifex_cost.planningSourceUri}durationInDays> ?WBS_activity_durationInDays.}\n` +
            " OPTIONAL  {?JobCardExecution <http://data.total/resource/tsf/dalia-lifex1/sumOffshorePOB> ?JobCardExecution_sumOffshorePOB.}\n" +
            ` OPTIONAL  { ?WBS_activity <${Lifex_cost.planningSourceUri}sumManHours> ?WBS_activity_sumManHours .}\n` +
            ` OPTIONAL  { ?WBS_activity <${Lifex_cost.planningSourceUri}sumManHours_110> ?WBS_activity_sumManHours_110.}\n` +
            `OPTIONAL  {?JobCardExecution <http://data.total/resource/tsf/dalia-lifex1/maximumPOB> ?JobCardExecution_maximumPOB.}` +
            "";

        if (options.filter) {
            query += options.filter;
        }
        if (options.subQueries) {
            options.subQueries.forEach(function (subQuery) {
                query += "\n{ SELECT * WHERE{" + subQuery + "}}";
            });
        }
        query += " }  limit 10000";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Lifex_cost.currentSource }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var checked_nodes = $("#" + FiltersWidget.jstreeDiv)
                .jstree("get_checked", true)
                .filter((item) => item?.text?.includes("DAL"));

            if (result.results.bindings.length > 10000 && checked_nodes.length > 0) {
                return alert(" filter more precisely, too much data returned ");
            }

            UI.message("", true);

            callback(null, result);
        });
    };
    self.getTagsSparqlData = function (options, callback) {
        if (self.tagSparqldata) {
            return callback(null, self.tagSparqldata);
        }

        var url = Config.sources[Lifex_cost.currentSource].sparql_server.url + "?format=json&query=";
        UI.message("loading data");

        var filterStr = "";
        var query =
            `PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> Select distinct *   FROM   <${Lifex_cost.lifexUri}>  FROM   <http://rds.posccaesar.org/ontology/lis14/ont/core>  FROM   <${Lifex_cost.planningSourceUri}>  where {?JobCardExecution <http://rds.posccaesar.org/ontology/lis14/rdl/hasPassiveParticipant> ?tag.\n` +
            "?functionalLocation ^<http://rds.posccaesar.org/ontology/lis14/rdl/residesIn> ?tag.\n" +
            "?WBS_activity <http://rds.posccaesar.org/ontology/lis14/rdl/occursRelativeTo> ?JobCardExecution.\n" +
            `?JobCardExecution  rdf:type <http://data.total/resource/tsf/dalia-lifex1/JobCardExecution>.  ?tag  rdf:type <http://data.total/resource/tsf/dalia-lifex1/tag>.   ?functionalLocation  rdf:type <http://data.total/resource/tsf/dalia-lifex1/FunctionalLocation>.  ?WBS_activity  rdf:type <${Lifex_cost.planningSourceUri}WBS_activity>.\n` +
            " OPTIONAL  {?tag <http://www.w3.org/2000/01/rdf-schema#label> ?tag_label.}\n" +
            " OPTIONAL  {?functionalLocation <http://www.w3.org/2000/01/rdf-schema#label> ?functionalLocation_label.}\n" +
            filterStr +
            "} ";

        var offset = 0;
        var length = 1;
        var allResults = [];
        var maxOffset = 100000;
        var fetchSize = 2000;

        async.whilst(
            function test(cb) {
                return length > 0 && offset < maxOffset;
            },
            function iter(callbackWhilst) {
                //  query=query+" offset "+(""+offset);
                var query2 = query + " limit " + fetchSize + " offset " + offset;
                offset += fetchSize;
                Sparql_proxy.querySPARQL_GET_proxy(url, query2, "", { source: Lifex_cost.currentSource }, function (err, result) {
                    if (err) {
                        return callbackWhilst(err);
                    }
                    length = result.results.bindings.length;
                    allResults = allResults.concat(result.results.bindings);
                    callbackWhilst();
                });
            },
            function (err) {
                UI.message("", true);
                self.tagSparqldata = allResults;
                callback(null, allResults);
            }
        );
    };

    return self;
})();

export default SparqlQueries;
