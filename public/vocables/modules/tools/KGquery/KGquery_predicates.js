import KGquery_filter from "./KGquery_filter.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import KGquery from "./KGquery.js";

var KGquery_predicates = (function () {
    var self = {};
    self.queryPrefixesStr =
        "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
        "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>";

    /**
     * populates a map (predicatesSubjectsMap) with RDF type triples derived from a
     * queryElement's subject (fromNode) and optional object (toNode)
     * @function
     * @name setRdfTypePredicates
     * @memberof module:KGquery_predicates
     * @param {Object} queryElement object describing a graph edge; expects:
     *      - fromNode {Object} with .id (URI) and .toNode (optional) properties
     *      - toNode   {Object} (optional) with .id (URI)
     *      - isOptional {boolean} indicating OPTIONAL clause for the triple pattern
     * @param {Object} predicatesSubjectsMap Mapping from variable name to an object:
     *      - { predicates: Array<string>, optional: boolean }
     * @returns {Object} predicatesSubjectsMap mapping from variable name to an object
     */
    self.setRdfTypePredicates = function (queryElement, predicatesSubjectsMap) {
        if (!queryElement.toNode) {
            //return;
            if (queryElement.fromNode) {
            } else {
            }
        }
        var subjectVarName = KGquery.getVarName(queryElement.fromNode);
        if (!predicatesSubjectsMap[subjectVarName]) {
            predicatesSubjectsMap[subjectVarName] = {
                predicates: [],
                optional: queryElement.isOptional,
            };
        }

        var subjectUri = queryElement.fromNode.id;

        var predicate = subjectVarName + "  rdf:type <" + subjectUri + ">. ";
        if (predicatesSubjectsMap[subjectVarName].predicates.indexOf(predicate) < 0) {
            predicatesSubjectsMap[subjectVarName].predicates.push(predicate);
        }

        if (queryElement.toNode) {
            var objectVarName = KGquery.getVarName(queryElement.toNode);
            if (!predicatesSubjectsMap[objectVarName]) {
                predicatesSubjectsMap[objectVarName] = {
                    predicates: [],
                    optional: queryElement.isOptional,
                };
            }
            var objectUri = queryElement.toNode.id;
            var predicate = objectVarName + "  rdf:type <" + objectUri + ">.";
            if (predicatesSubjectsMap[objectVarName].predicates.indexOf(predicate) < 0) {
                predicatesSubjectsMap[objectVarName].predicates.push(predicate);
            }
        }
        return predicatesSubjectsMap;
    };

    /**
     * populates a map (predicatesSubjectsMap) with SPARQL‑like predicate strings for each
     * path defined in a query element. It builds subject‑wise collections of required triples,
     * handling optional direction (inverse) and ensuring a rdf:type triple for each start
     * variable if none exists yet
     * @function
     * @name setPathPredicates
     * @memberof module:KGquery_predicates
     * @param {Object} queryElement object containing a `paths` array
     *   each pathItem is an array where indices encode subject, object and predicate
     * @param {Object} predicatesSubjectsMap map (plain object) keyed by variable name.
     *   each entry has shape: { isOptional: boolean, predicates: string[] }
     * @returns {Object} predicatesSubjectsMap, the updated predicatesSubjectsMap
     */
    self.setPathPredicates = function (queryElement, predicatesSubjectsMap) {
        queryElement.paths.forEach(function (pathItem, pathIndex) {
            var propertyStr = "<" + pathItem[2] + "> ";

            var startVarName;
            var endVarName;
            var inverseStr = "";
            if (pathItem.length == 4) {
                startVarName = pathItem[1];
                endVarName = pathItem[0];
                inverseStr = "^";
            } else {
                startVarName = pathItem[0];
                endVarName = pathItem[1];
            }

            if (!predicatesSubjectsMap[startVarName]) {
                predicatesSubjectsMap[startVarName] = { isOptional: false, predicates: [] };
                // for transitive nodes of path that are note already typed
                var itemUri = KGquery.varNameToClassMap[startVarName];
                var predicate = startVarName + "  rdf:type <" + itemUri + ">.";
                predicatesSubjectsMap[startVarName].predicates.push(predicate);
            }

            var pathPredicate = startVarName + " " + inverseStr + propertyStr + endVarName + ".\n";
            predicatesSubjectsMap[startVarName].predicates.push(pathPredicate);
        });
        return predicatesSubjectsMap;
    };

    /**
     * Enriches a SPARQL predicate map with rdfs:member path constraints based on a container filter
     * It mutates the provided predicatesSubjectsMap in‑place and returns it
     * @function
     * @name setRdfsMemberPredicates
     * @memberof module:KGquery_predicates
     * @param {Object} queryElement object containing a `paths` array
     * @param {Object} predicatesSubjectsMap map (plain object) keyed by variable name
     * @returns {Object} predicatesSubjectsMap, the updated predicatesSubjectsMap
     */
    self.setRdfsMemberPredicates = function (queryElement, predicatesSubjectsMap) {
        if (!queryElement.fromNode.data.containerFilter) {
            return predicatesSubjectsMap;
        }
        var subjectVarName = KGquery.getVarName(queryElement.fromNode);
        var endVarName = KGquery.getVarName(queryElement.toNode);
        if (queryElement.fromNode.data.containerFilter.classId) {
            var predicate = "\n FILTER(" + subjectVarName + "=<" + queryElement.fromNode.data.containerFilter.classId + ">)\n ";

            predicatesSubjectsMap[subjectVarName].predicates.push(predicate);
        }
        var depth = queryElement.fromNode.data.containerFilter.depth || 1;
        queryElement.paths.forEach(function (pathItem, pathIndex) {
            var str = "";
            var number = parseInt(depth);
            var propertyStr = " rdfs:member{0," + number + "} ";
            predicatesSubjectsMap[subjectVarName].predicates.push(" FILTER (" + pathItem[0] + " !=" + pathItem[1] + ") ");
            predicatesSubjectsMap[subjectVarName].predicates.push(subjectVarName + " <" + propertyStr + "> " + endVarName + ".\n");
        });

        return predicatesSubjectsMap;
    };

    /**
     * Dynamically builds a SPARQL query based on a collection of query sets and optional configuration
     * It handles distinct variable collection, optional UNION/JOIN composition,
     * and supports aggregation or SHACL output.
     * @function
     * @name buildQuery
     * @memberof module:KGquery_predicates
     * @param {Object} querySets object containing an array `sets` where each set describes
     *   elements, class filters, etc
     * @param {Object} options optional settings:
     *          - aggregate {select, groupBy}
     *          - output    ("shacl" => CONSTRUCT)
     * @returns {Object} Return the constructed query and metadata
     */
    self.buildQuery = function (querySets, options) {
        var distinctSetTypes = [];
        var query = "";
        //build query

        if (!options) {
            options = {};
        }

        var distinctTypesMap = {};

        var whereStr = "";

        var querySetsWhereStr = [];
        var disctinctSetVars = [];
        var isUnion = false;
        var isJoin = false;

        querySets.sets.forEach(function (querySet) {
            if (querySet.elements.length == 0 || !querySet.elements[0].fromNode) {
                return;
            }
            whereStr = "";
            distinctTypesMap = {};
            var predicateStr = "";
            var filterStr = "";
            var otherPredicatesStrs = "";
            var predicatesSubjectsMap = {};

            // set rdftype and predicates between classes
            querySet.elements.forEach(function (queryElement, queryElementIndex) {
                /*if (!queryElement.fromNode || !queryElement.toNode) {
                    return;
                }*/
                // need this case for single class query

                KGquery_predicates.setRdfTypePredicates(queryElement, predicatesSubjectsMap);

                var filterClassLabels = {};

                //disable rdf:member predicate
                if (false) {
                    KGquery_predicates.setRdfsMemberPredicates(queryElement, predicatesSubjectsMap);
                } else {
                    KGquery_predicates.setPathPredicates(queryElement, predicatesSubjectsMap);
                }
            });

            //set class filter
            for (var key in querySet.classFiltersMap) {
                filterStr += querySet.classFiltersMap[key].filter + " \n";
            }

            var optionalPredicatesSparql = "";
            if (optionalPredicatesSparql) {
                //optional predicates are filtered for each set or weird comportement for multiple set queries

                var querySetOptionalPredicates = "";
                Object.keys(distinctTypesMap).forEach(function (type) {
                    var regex = new RegExp("^\\s*OPTIONAL\\s*{\\s*\\" + type + "\\b[\\s\\S]*?}", "gm");
                    var matches = optionalPredicatesSparql.match(regex);
                    if (matches.length > 0) {
                        querySetOptionalPredicates += matches.join("\n");
                    }
                });
            }
            whereStr = predicateStr + "\n" + "" + "\n" + filterStr + "\n" + otherPredicatesStrs;

            whereStr += self.processOptionalQueryElements(predicatesSubjectsMap, KGquery.optionalPredicatesSubjecstMap);
            //  whereStr += querySetOptionalPredicates;

            //whereStr = "{" + whereStr + "}";
            var regex = /\?[\w_]+/g;
            var variables = whereStr.match(regex);
            var uniqueVariables = [...new Set(variables)];

            //  var subjectsPredicatesMap = {}

            disctinctSetVars.push(uniqueVariables);
            querySetsWhereStr.push(whereStr);
            distinctSetTypes.push(Object.keys(predicatesSubjectsMap));
        });

        //after each query set whereStr

        whereStr = "";
        if (querySetsWhereStr.length == 0) {
            return alert("no node selected");
        }
        if (querySetsWhereStr.length == 1) {
            whereStr = querySetsWhereStr[0];
        }
        if (querySetsWhereStr.length > 1) {
            querySetsWhereStr.forEach(function (querySetsWhereStr, index) {
                var disctinctVarsStr = disctinctSetVars[index].join(" ");
                var querySetNumber = index + 1;
                if (KGquery.querySets.sets[index].booleanOperator) {
                    whereStr += "\n " + KGquery.querySets.sets[index].booleanOperator + "\n ";
                    isJoin = true;
                    if (KGquery.querySets.sets[index].booleanOperator == "Union") {
                        isUnion = true;
                    }
                }
                whereStr += "{SELECT " + disctinctVarsStr + ' (("Query ' + querySetNumber + '") AS ?querySet) ';
                whereStr += "{" + querySetsWhereStr + "}";
                whereStr += "}";
            });
        }

        var fromStr = Sparql_common.getFromStr(KGquery.currentSource);
        query = self.queryPrefixesStr;

        var selectStr = " DISTINCT ";
        var groupByStr = "";
        if (options.aggregate) {
            selectStr = options.aggregate.select;
            groupByStr = " GROUP BY " + options.aggregate.groupBy;
        } else {
            selectStr += KGquery.selectClauseSparql ? KGquery.selectClauseSparql : "";
            var uniqueSetTypes = {};
            distinctSetTypes.forEach(function (setTypes) {
                setTypes.forEach(function (type) {
                    if (!uniqueSetTypes[type]) {
                        uniqueSetTypes[type] = true;
                        selectStr += " " + type;
                    }
                });
            });
            if (isJoin) {
                selectStr += " ?querySet ";
            }
        }

        var queryType = "SELECT";
        if (options.output == "shacl") {
            queryType = "CONSTRUCT";
            selectStr = "";
        }
        query += queryType + " " + selectStr + "  " + fromStr + " where {" + whereStr + "}";

        query += " " + groupByStr; // + " limit 10000";

        return { query: query, isUnion: isUnion, isJoin: isJoin, distinctSetTypes: distinctSetTypes };
    };

    /**
     *  !!! if a variable is optio,nall all predicates tha contains this variable as subject have to be in nthe optional clause
     * @param predicatesSubjectsMap
     * @param optionalPredicatesSubjecstMap
     * @return {string}
     */
    self.processOptionalQueryElements = function (predicatesSubjectsMap, optionalPredicatesSubjecstMap) {
        var whereStr = "";

        // case when select a unique Class
        if (Object.keys(predicatesSubjectsMap).length == 0) {
            for (var varName in optionalPredicatesSubjecstMap) {
                whereStr += optionalPredicatesSubjecstMap[varName] + "\n";
            }
            predicatesSubjectsMap[varName] = {};
            return whereStr;
        }

        for (var varName in predicatesSubjectsMap) {
            var str = "";
            var obj = predicatesSubjectsMap[varName];
            obj.predicates.forEach(function (predicate) {
                str += predicate + "\n";
            });
            if (optionalPredicatesSubjecstMap[varName]) {
                str += optionalPredicatesSubjecstMap[varName] + "\n";
            }
            if (obj.optional) {
                str = "OPTIONAL {" + str + "}";
            }
            whereStr += str + "\n";
        }

        return whereStr;
    };

    /**
     * Assembles a SPARQL aggregate query string from various input components
     * @function
     * @name buildAggregateQuery
     * @memberof module:KGquery_predicates
     * @param {Object} querySets containing `elements` (array of query elements) and `classFiltersMap`
     *   (map of class filters)
     * @param {Object} aggregateClauses object with `select`, `where`, `groupBy`, and `orderBy` string
     *   used in the aggregate part of the query
     * @param {Object} options optional configuration object
     * @returns {string} string representing the assembled SPARQL query, including prefixes, SELECT
     *   clause, FROM clause, WHERE block, GROUP BY, and ORDER BY clauses
     */
    self.buildAggregateQuery = function (querySet, aggregateClauses, options) {
        if (!options) {
            options = {};
        }

        var predicatesSubjectsMap = {};

        var filterStr = "";
        querySet.elements.forEach(function (queryElement, queryElementIndex) {
            KGquery_predicates.setRdfTypePredicates(queryElement, predicatesSubjectsMap);
            KGquery_predicates.setPathPredicates(queryElement, predicatesSubjectsMap);
        });

        var whereStr = "";
        for (var varName in predicatesSubjectsMap) {
            var obj = predicatesSubjectsMap[varName];
            obj.predicates.forEach(function (predicate) {
                whereStr += predicate + "\n";
            });
        }

        for (var key in querySet.classFiltersMap) {
            whereStr += querySet.classFiltersMap[key].filter + " \n";
        }
        var fromStr = Sparql_common.getFromStr(KGquery.currentSource);
        var query = self.queryPrefixesStr;
        query += "SELECT " + aggregateClauses.select + "\n";
        query += fromStr + "\n";
        query += "WHERE { " + aggregateClauses.where + "\n";
        query += whereStr + "\n";
        query += filterStr + "\n}\n";
        query += "GROUP BY " + aggregateClauses.groupBy + "\n";
        query += "ORDER BY DESC (" + aggregateClauses.orderBy + ")\n";
        return query;
    };

    return self;
})();

export default KGquery_predicates;
