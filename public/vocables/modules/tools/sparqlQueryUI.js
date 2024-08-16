import Sparql_common from "../sparqlProxies/sparql_common.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";

var SparqlQueryUI = (function () {
    var self = {};

    self.init = function (sources) {
        $("#graphDiv").html("");
        $("#graphDiv").load("modules/tools/admin/sparqlQuery.html", function () {
            $("#sparqlQuery_endPointInput").val(Config.sparql_server.url);

            var fromStr = "";
            if (sources) {
                sources.forEach(function (source) {
                    if (Config.sources[source]) {
                        fromStr += Sparql_common.getFromStr(source, true, true) + " ";
                    }
                });
            }
            var defaultQuery = "select * " + fromStr + " where  {GRAPH {?s ?p ?o}} limit 100";
            $("#sparqlQuery_queryTA").text(defaultQuery);
        });
    };

    self.executeQuery = function (query, targetTA) {
        var url = Config.sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {}, function (err, result) {
            if (err) {
                return $("#" + targetTA).text(JSON.stringify(err, null, 2));
            }
            $("#" + targetTA).text(JSON.stringify(result, null, 2));
        });
    };

    return self;
})();

export default SparqlQueryUI;

window.SparqlQueryUI = SparqlQueryUI;
