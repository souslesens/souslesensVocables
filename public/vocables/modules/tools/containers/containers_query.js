import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
var Containers_query = (function () {
    var self = {};
    self.getTopContainer = function (source, callback) {
        var fromStr = Sparql_common.getFromStr(source, false, false);
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT distinct ?member ?memberLabel " +
            fromStr +
            " where {" +
            "    ?member rdf:type ?memberType. " +
            " ?member rdfs:label ?memberLabel. " +
            " FILTER (?memberType in(rdf:Bag,rdf:List))\n" +
            "  filter (not exists{?parent rdfs:member ?member})\n" +
            "    }";

        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result);
        });
    };

    self.getContainerDescendants = function (source, containerId, options, callback) {
        var fromStr = Sparql_common.getFromStr(source, false, false);
        var filter = options.filter || "";
        if (containerId) {
            // needs options.useFilterKeyWord because VALUES dont work
            filter = Sparql_common.setFilter("parent", containerId, null, { useFilterKeyWord: 1 });
        }

        if (!options.leaves) {
            filter = " FILTER (?memberType in(rdf:Bag,rdf:List))";
        }

        var pathOperator = "+";
        if (options.onlyOneLevel) {
            pathOperator = "";
        } else if (options.depth) {
            pathOperator = "{1," + options.depth + "}";
        }
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \n" +
            "SELECT distinct ?descendant ?descendantParent ?parent " +
            fromStr +
            " WHERE {\n" +
            "?descendant ^rdfs:member ?descendantParent.\n" +
            "?parent  rdfs:member" +
            pathOperator +
            "?descendant.\n" +
            "            \n" +
            filter +
            "} " +
            "      ";

        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result);
        });
    };

    self.getContainerAscendants = function (source, containerId, options, callback) {
        var fromStr = Sparql_common.getFromStr(source, false, false);
        var filter = options.filter || "";
        if (containerId) {
            // needs options.useFilterKeyWord because VALUES dont work
            filter = Sparql_common.setFilter("child", containerId, null, { useFilterKeyWord: 1 });
        }

        //  var pathOperator = "+";
        var pathOperator = "+";
        if (options.onlyOneLevel) {
            pathOperator = "";
        } else if (options.depth) {
            pathOperator = "{1," + options.depth + "}";
        }
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \n" +
            "SELECT distinct ?ancestor ?ancestorChild ?child  FROM   <http://data.total/resource/tsf/dalia-lifex1/> " +
            from +
            "WHERE {\n" +
            "?ancestor rdfs:member ?ancestorChild.\n" +
            "?ancestor  rdfs:member" +
            pathOperator +
            " ?child.\n" +
            "\n" +
            filter +
            " } limit 10000 ";

        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result);
        });
    };

    return self;
})();

export default Containers_query;

window.Containers_query = Containers_query;