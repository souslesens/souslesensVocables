var Traversal = (function () {

    var self = {}

    self.traverse = function (fromNodeId, toNodeId, allClassesMap) {
        //   const Graph = require('dijkstra-short-path');

        const route = new Graph();

        var directPredicates={}
        var inversePredicates={}

        for (var subject in allClassesMap) {
            var objectsArray =[]
            var predicates = allClassesMap[subject]


            for (var predicate in predicates) {
                if (predicate && predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    predicates[predicate].forEach(function (object) {
                        objectsArray.push([object, 1])
                        directPredicates[object + "_" + subject] = predicate
                        inversePredicates[subject + "_" + object] = predicate
                    })
                }
            }

            route.addNode(subject,  new Map(objectsArray));

        }

        //inverse
        var objectsMap = {}
        for (var subject in allClassesMap) {
            var predicates = allClassesMap[subject]

            for (var predicate in predicates) {
                if (predicate && predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    predicates[predicate].forEach(function (object) {
                        if (!objectsMap[object]) {
                            objectsMap[object] = []
                        }
                        if (objectsMap[object].indexOf(subject) < 0)
                            objectsMap[object].push(subject)

                    })
                }
            }
        }
        for(var object in objectsMap){
            var subjectArray=[]
            objectsMap[object].forEach(function(subject){
                subjectArray.push([subject,1])
            })

            route.addNode(object,  new Map(subjectArray));

        }


        var path = route.path(fromNodeId, toNodeId).path; // return => { cost:5 , path : [ 'A', 'B', 'C', 'D' ]}

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