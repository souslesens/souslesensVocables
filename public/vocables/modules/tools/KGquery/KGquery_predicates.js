import KGquery_filter from "./KGquery_filter.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";

var KGquery_predicates = (function () {
    var self = {};
    self.queryPrefixesStr =
        "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
        "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>";

    self.setRdfTypePredicates = function (queryElement, predicatesSubjectsMap) {
        if (!queryElement.toNode) {
            return;
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
        predicatesSubjectsMap[subjectVarName].predicates.push(predicate);

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
            predicatesSubjectsMap[objectVarName].predicates.push(predicate);
        }
        return predicatesSubjectsMap;
    };

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
            distinctSetTypes.push(distinctTypesMap);
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
                if (self.querySets.sets[index].booleanOperator) {
                    whereStr += "\n " + self.querySets.sets[index].booleanOperator + "\n ";
                    var isJoin = true;
                    if (self.querySets.sets[index].booleanOperator == "Union") {
                        var isUnion = true;
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
            Object.keys(distinctTypesMap).forEach(function (type) {
                selectStr += " " + type;
            });
            if (options.isJoin) {
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

        return query;
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

        var query = self.queryPrefixesStr;
        query += "SELECT " + aggregateClauses.select + "\n";
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
