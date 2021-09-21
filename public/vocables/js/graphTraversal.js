var GraphTraversal = (function () {

    var self = {}

    self.getShortestPaths = function (fromNodeId, toNodeId, allClassesMap) {
        //   const Graph = require('dijkstra-short-path');

        const route = new Graph();

        var directPredicates={}
        var inversePredicates={}

        var objectsMap = {}
        var routeMap = {}
        for (var subject in allClassesMap) {
            var objectsArray =[]
            var predicates = allClassesMap[subject]
            if(!routeMap[subject]){
                routeMap[subject]=[]
            }

            for (var predicate in predicates) {
                if (predicate && predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    predicates[predicate].forEach(function (object) {
                        routeMap[subject].push([object, 1])
                     //   objectsArray.push([object, 1])
                        directPredicates[object + "_" + subject] = predicate
                        inversePredicates[subject + "_" + object] = predicate

                    })
                }
            }

          //  route.addNode(subject,  new Map(objectsArray));

        }

        //inverse

        for (var subject in allClassesMap) {
            var predicates = allClassesMap[subject]

            for (var predicate in predicates) {
                if (predicate && predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    predicates[predicate].forEach(function (object) {
                        routeMap[object].push([subject, 1])

                    })
                }
            }
        }

        //generate route
        for(var key in routeMap){
            route.addNode(key,  new Map(routeMap[key]));


        }


        var path = route.path(fromNodeId, toNodeId).path;

        var select = ""
        var where = ""

        path.forEach(function (aclass, index) {
            if (index > 0) {
                if (index > 1)
                    where += "/"
                var str = aclass + "_" + path[index - 1]
                if (directPredicates[str])
                    where += "<" + directPredicates[str] + ">"
                else if (inversePredicates[str])
                    where += "^<" + inversePredicates[str] + ">"

            }
        })
        var xx = where
        return where


        /*   route.addNode('A', new Map([['B', 2], ['C', 5]])); // Distance list should be Map
           route.addNode('B', new Map([['A', 1], ['C', 2]])); // Distance from  B->A can be different from A->B.
           route.addNode('C', new Map([['D', 1]]));*/


    }




    return self;


})()