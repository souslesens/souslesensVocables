
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
;



var Containers_query = (function() {
        var self = {};
        self.getTopContainer = function(source, callback) {
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

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        };

        self.getContainerDescendants = function(source, containerId, options, callback) {
            var fromStr = Sparql_common.getFromStr(source, false, false);
            var filterContainer0Str = "";
            if (containerId) {
                // needs options.useFilterKeyWord because VALUES dont work
                filterContainer0Str = Sparql_common.setFilter("parent0", containerId, null, { useFilterKeyWord: 1 });
            }

            var filter = options.filter || "";

            var filterLeaves = "";
            if (!options.leaves) {
                filterLeaves = " FILTER (?memberType in(rdf:Bag,rdf:List))";
            }

            //  var pathOperator = "+";
            var pathOperator = "+";
            if (options.onlyOneLevel) {
                pathOperator = "";
            } else if (options.depth) {
                pathOperator = "{1," + options.depth + "}";
            }
            var query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> 
                 PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
                 SELECT distinct ?member ?memberLabel ?parent ?parentLabel (GROUP_CONCAT( distinct ?memberType;separator=",") as ?memberTypes)  ${fromStr}
                 WHERE {?searchValue ^rdfs:member{0,5} ?member.
                    ?member ^rdfs:member ?parent.
                    ?member rdf:type ?memberType.
                    ?member rdfs:label ?memberLabel.
                    ?parent rdfs:label ?parentLabel.
                    
                    {select ?searchValue where{
                        ?parent0  rdfs:member${pathOperator} ?searchValue.
                        ?searchValue rdfs:label ?searchValueLabel.
                        ${filterContainer0Str}
                        ${filter}
                        }
                    }
                }  group by   ?member ?memberLabel ?parent ?parentLabel ?searchValue   
                `;

            /*
                filter +
                "  {select ?member where{\n" +
                "?parent0  rdfs:member" +
                pathOperator +
                " ?member." +
                filterContainer0Str +
                "}\n" +
                "  }\n" +
                "}  group by ?member ?memberLabel ?parent ?parentLabel";
                    */
            var url = Config.sources[source].sparql_server.url + "?format=json&query=";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        }


        return self;
    }
)();

export default Containers_query;

window.Containers_query = Containers_query;
