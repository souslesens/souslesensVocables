var KGquery_predicates = (function () {

    var self = {}


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
                optional: queryElement.isOptional
            }
        }

        var subjectUri = queryElement.fromNode.id;

            var predicate = subjectVarName + "  rdf:type <" + subjectUri + ">. ";
            predicatesSubjectsMap[subjectVarName].predicates.push(predicate)


        if (queryElement.toNode) {
            var objectVarName = KGquery.getVarName(queryElement.toNode);
            if (!predicatesSubjectsMap[objectVarName]) {
                predicatesSubjectsMap[objectVarName] = {
                    predicates: [],
                    optional: queryElement.isOptional
                }
            }
            var objectUri = queryElement.toNode.id;
                var predicate = objectVarName + "  rdf:type <" + objectUri + ">.";
                predicatesSubjectsMap[objectVarName].predicates.push(predicate)

        }
        return predicatesSubjectsMap


    }

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
                predicatesSubjectsMap[startVarName] = {isOptional: false, predicates: []}
// for transitive nodes of path that are note already typed
                var itemUri = KGquery.varNameToClassMap[startVarName]
                var predicate = startVarName + "  rdf:type <" + itemUri + ">.";
                predicatesSubjectsMap[startVarName].predicates.push(predicate)

            }


            var pathPredicate = startVarName + " " + inverseStr + propertyStr + endVarName + ".\n";
            predicatesSubjectsMap[startVarName].predicates.push(pathPredicate)


        })
        return predicatesSubjectsMap
    }


    self.setRdfsMemberPredicates = function (queryElement, predicatesSubjectsMap) {

        if (!queryElement.fromNode.data.containerFilter) {
            return predicatesSubjectsMap;
        }
        var subjectVarName = KGquery.getVarName(queryElement.fromNode);
        var endVarName = KGquery.getVarName(queryElement.toNode);
        if (queryElement.fromNode.data.containerFilter.classId) {
            var predicate = "\n FILTER(" + subjectVarName + "=<" + queryElement.fromNode.data.containerFilter.classId + ">)\n ";

            predicatesSubjectsMap[subjectVarName].predicates.push(predicate)

        }
        var depth = queryElement.fromNode.data.containerFilter.depth || 1;
        queryElement.paths.forEach(function (pathItem, pathIndex) {
            var str = "";
            var number = parseInt(depth);
            var propertyStr = " rdfs:member{0," + number + "} ";
            predicatesSubjectsMap[subjectVarName].predicates.push(" FILTER (" + pathItem[0] + " !=" + pathItem[1] + ") ");
            predicatesSubjectsMap[subjectVarName].predicates.push(subjectVarName + " <" + propertyStr + "> " + endVarName + ".\n");

        })

        return predicatesSubjectsMap


    }


    return self;


})()

export default KGquery_predicates