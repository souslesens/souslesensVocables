var GraphTraversal = (function () {

        var self = {}

        self.routeObject = null;
        self.initRoute = function (allClassesMap) {
            if (self.routeObject)
                return self.routeObject;

            var directPredicates = {}
            var inversePredicates = {}
            var route = new Graph();
            var routeMap = {}
            for (var subject in allClassesMap) {
                var objectsArray = []
                var predicates = allClassesMap[subject]
                if (!routeMap[subject]) {
                    routeMap[subject] = []
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
            for (var key in routeMap) {
                route.addNode(key, new Map(routeMap[key]));

            }
            self.routeObject = {
                route: route,
                directPredicates: directPredicates,
                inversePredicates: inversePredicates,

            }
            return self.routeObject


        }


        self.getShortestPaths = function (fromNodeId, toNodeId, allClassesMap) {
            //   const Graph = require('dijkstra-short-path');

            var obj = self.initRoute(allClassesMap);

            var route = obj.route;
            var directPredicates = obj.directPredicates;
            var inversePredicates = obj.inversePredicates;


            var path = route.path(fromNodeId, toNodeId).path;

            var where = ""

            self.currentPathNodes = path

            return self.getWhereFromPath(path)




        }

        self.getWhereFromPath=function(path){
            var where=""
            path.forEach(function (aclass, index) {
                var propertyObj = {}
                if (index > 0) {
                    if (index > 1)
                        where += "/"
                    var str = aclass + "_" + path[index - 1]
                    if (self.routeObject.directPredicates[str]) {
                        where += "<" + self.routeObject.directPredicates[str] + ">"

                    } else if (self.routeObject.inversePredicates[str]) {
                        where += "^<" + self.routeObject.inversePredicates[str] + ">";

                    }


                }
            })

            return where
        }


        self.addNodeToPath = function (targetNodeId, allClassesMap) {
            var obj = self.initRoute(allClassesMap);
            var route = obj.route;
            var directPredicates = obj.directPredicates;
            var inversePredicates = obj.inversePredicates;



            var candidatePathes = []
            self.currentPathNodes.forEach(function (node) {
                var path = route.path(node, targetNodeId).path;
                candidatePathes.push(path)
            })


            var minSize=1000
            var shortestPathIndex=-1
             candidatePathes.forEach(function (path,index) {
                 if(path.length<minSize){
                     minSize=path.length;
                     shortestPathIndex=index;
                 }
            })
            var shortestPath=candidatePathes[shortestPathIndex]
            var  intersectionPointIndex=self.currentPathNodes.indexOf(shortestPath[0])
            var targetPaths=[];


            var splitPath1=[];
            var splitPath2=[]
            self.currentPathNodes.forEach(function(node,index){
                var currentPath=[]
                if(index<intersectionPointIndex)
                    splitPath1.push(node)
                else if(index>intersectionPointIndex)
                    splitPath2.push(node)
                else{
                    splitPath1.push(node)
                    splitPath2.push(node)
                }


            })

            var where1= self.getWhereFromPath(splitPath1)
            var where2= self.getWhereFromPath(splitPath2)
            var where3= self.getWhereFromPath(shortestPath)

var varName=" ?Q1. ?Q1 "
            var where= where1+varName+where2+ " ?Q1" +where3+ "?X"
            return where;
        }


        return self;


    }
)()

