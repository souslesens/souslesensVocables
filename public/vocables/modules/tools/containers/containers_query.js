import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import common from "../../shared/common.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";

var Containers_query = (function () {
    var self = {};
    self.descendantsLimit = 300;
    self.getTopContainer = function (source, options, callback) {
        if (!options) {
            options = {};
        }
        var filterStr = "";
        if (false && options.memberClass) {
            filterStr = "?member rdf:type ?memberClass filter (?memberClass=<" + options.memberClass + ">)";
        }
        if (options.filter) {
            filterStr += " " + options.filter;
        }

        var fromStr = Sparql_common.getFromStr(source, false, false);
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT distinct ?member ?memberLabel " +
            fromStr +
            " where {" +
            " ?member rdfs:member ?x.\n" + // remove filter type rdf:Bag
            "   OPTIONAL { ?member rdfs:label ?memberLabel}\n" +
            "    filter (not exists{?parent rdfs:member ?member.}) \n" +
            filterStr +
            "    }";

        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return alert(err);
            }
            callback(err, result);
        });
    };

    self.getContainerDescendants = function (source, containerId, options, callback) {
        var fromStr = Sparql_common.getFromStr(source, false, false);
        var filter = options.filter || "";
        if (containerId) {
            // needs options.useFilterKeyWord because VALUES dont work
            filter = Sparql_common.setFilter("root", containerId, null, { useFilterKeyWord: 1 });
        }

        if (!options.leaves) {
            filter += ""; // " FILTER (?memberType in(rdf:Bag,rdf:List))";
        }

        var pathOperator = "+";

        if (options.depth) {
            pathOperator = "{1," + options.depth + "}";
        }

        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \n" +
            "SELECT distinct ?parent  ?member ?parentLabel  ?memberLabel ?subMember" +
            '(GROUP_CONCAT( distinct ?memberType;separator=",") as ?memberTypes) ' +
            fromStr +
            " WHERE {" +
            "  ?root  rdfs:member" +
            pathOperator +
            " ?member.\n" +
            "  ?parent rdfs:member ?member .\n" +
            "?member rdf:type ?memberType." +
            "  OPTIONAL{?member rdfs:member ?subMember} " +
            "   OPTIONAL{?member rdfs:label ?memberLabel} \n" +
            "   OPTIONAL{?parent rdfs:label ?parentLabel} \n" +
            filter +
            "} limit 10000 ";

        /*   "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \n" +
            "SELECT distinct ?descendant ?descendantParent ?descendantLabel ?descendantParentLabel " +
            fromStr +
            " WHERE {\n" +
            "?descendant ^rdfs:member ?descendantParent.\n" +
            "  OPTIONAL{?descendant rdfs:label ?descendantLabel}  " +
            "  OPTIONAL{?descendantParent rdfs:label ?descendantParentLabel}  " +
            "?parent  rdfs:member" +
            pathOperator +
            "?descendant.\n" +
            "            \n" +
            "  ?descendant rdf:type ?descendantType." +
            filter +
            "}order by ?descendantLabel " +
            "   LIMIT   " +
            self.descendantsLimit;*/

        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            if (false && result.results.bindings.length >= self.descendantsLimit) {
                alert("cannot show all nodes  :only: " + self.descendantsLimit + "");
            }
            return callback(null, result);
        });
    };

    /** search ascendants for  ids or label
     *
     *
     * @param source
     * @param containerIds
     * @param options
     * @param callback
     */
    self.getContainersAscendants = function (source, containerIds, options, callback) {
        var fromStr = Sparql_common.getFromStr(source, false, false);
        var url = Config.sources[source].sparql_server.url + "?format=json&query=";

        function execQuery(filter, callback) {
            var pathOperator = "*";
            if (options.depth) {
                pathOperator = "{1," + options.depth + "}";
            }
            var childStr = "";
            if (options.keepChild) {
                childStr = "?child ?childLabel";
            }
            var ancestorVars = "";
            var ancestorClause = "";
            if (options.keepAncestor) {
                ancestorVars = "?ancestor ";
                ancestorClause = " optional{?ancestor rdfs:member ?ancestorChild .}\n";
            }

            var query =
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \n" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \n" +
                "SELECT distinct " +
                ancestorVars +
                "?ancestorChild ?ancestorChildLabel" +
                childStr +
                fromStr +
                "WHERE {\n" +
                ancestorClause +
                "  ?ancestorChild  rdfs:member" +
                pathOperator +
                " ?child.\n" +
                "  OPTIONAL{?ancestorChild rdfs:label ?ancestorChildLabel}  \n" +
                // too long virtuoso error  "  OPTIONAL{?ancestor rdfs:label ?ancestorLabel}  \n" +
                "  {select ?child where  {\n" +
                "   ?child rdfs:label ?childLabel." +
                // may not work all times  "   ?child ?p ?childLabel." +
                filter +
                "}\n" +
                "  }\n" +
                "} limit 10000 ";

            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
                if (err) {
                    return callback(err);
                }
                return callback(null, result);
            });
        }

        if (containerIds) {
            var allResults = [];
            var slices = common.array.slice(containerIds, 20);
            // needs options.useFilterKeyWord because VALUES dont work
            filter = Sparql_common.setFilter("child", containerIds, null, { useFilterKeyWord: 1 });

            async.eachSeries(
                slices,
                function (slice, callbackEach) {
                    filter = Sparql_common.setFilter("child", slice, null, { useFilterKeyWord: 1 });
                    execQuery(filter, function (err, result) {
                        if (err) {
                            return callbackEach(err);
                        }
                        allResults = allResults.concat(result.results.bindings);
                        callbackEach();
                    });
                },
                function (err) {
                    return callback(err, allResults);
                }
            );
        } else {
            // search label
            var filter = options.filter || "";
            execQuery(filter, function (err, result) {
                if (err) {
                    return call(err);
                }
                return callback(null, result.results.bindings);
            });
        }
    };
    self.getContainerDescendantsOld = function (source, containerId, options, callback) {
        var fromStr = Sparql_common.getFromStr(source, false, false);
        var filterContainer0Str = "";
        if (containerId) {
            // needs options.useFilterKeyWord because VALUES dont work
            filterContainer0Str = Sparql_common.setFilter("parent0", containerId, null, { useFilterKeyWord: 1 });
        }

        var filter = options.filter || "";

        var filterLeaves = "";
        if (!options.leaves) {
            filterLeaves = ""; //" FILTER (?memberType in(rdf:Bag,rdf:List))";
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
                 WHERE {?searchValue ^rdfs:member* ?member.
                    ?member ^rdfs:member ?parent.
                    ?member rdf:type ?memberType.
                    OPTIONAL {?member rdfs:label ?memberLabel.}
                    OPTIONAL {?parent rdfs:label ?parentLabel.}
                    
                    {select ?searchValue where{
                        ?parent0  rdfs:member${pathOperator} ?searchValue.
                        OPTIONAL { ?searchValue rdfs:label ?searchValueLabel.}
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

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback(null, result);
        });
    };

    self.writeMovedNodeNewParent = function (movedNodeInfos) {
        var graphUri = Config.sources[Lineage_sources.activeSource].graphUri;
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "with <" +
            graphUri +
            "> delete {<" +
            movedNodeInfos.oldParent +
            "> rdfs:member <" +
            movedNodeInfos.nodeId +
            ">}" +
            "insert {<" +
            movedNodeInfos.newParent +
            "> rdfs:member <" +
            movedNodeInfos.nodeId +
            ">}";

        var url = Config.sources[Lineage_sources.activeSource].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Lineage_sources.activeSource }, function (err, result) {
            if (err) {
                return callback(err);
            }
        });
    };

    return self;
})();

export default Containers_query;

window.Containers_query = Containers_query;
