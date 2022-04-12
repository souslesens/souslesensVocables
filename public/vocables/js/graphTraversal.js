// eslint-disable-next-line @typescript-eslint/no-unused-vars
var GraphTraversal = (function () {
    var self = {};
    self.currentPathNodes = [];
    self.routeObject = null;
    self.initRoute = function (allClassesMap) {
        if (self.routeObject) return self.routeObject;

        var directPredicates = {};
        var inversePredicates = {};
        var route = new Graph();
        var routeMap = {};
        for (var subject in allClassesMap) {
            var predicates = allClassesMap[subject];
            if (!routeMap[subject]) {
                routeMap[subject] = [];
            }

            for (var predicate in predicates) {
                if (predicate && predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    predicates[predicate].forEach(function (object) {
                        routeMap[subject].push([object, 1]);
                        //   objectsArray.push([object, 1])
                        directPredicates[object + "_" + subject] = predicate;
                        inversePredicates[subject + "_" + object] = predicate;
                    });
                }
            }
        }

        //inverse

        for (const subject in allClassesMap) {
            predicates = allClassesMap[subject];

            for (const predicate in predicates) {
                if (predicate && predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    predicates[predicate].forEach(function (object) {
                        routeMap[object].push([subject, 1]);
                    });
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
        };
        return self.routeObject;
    };

    self.getShortestPaths = function (fromNodeObj, toNodeObj, allClassesMap) {
        //   const Graph = require('dijkstra-short-path');

        var obj = self.initRoute(allClassesMap);

        var route = obj.route;

        var path = route.path(fromNodeObj.class, toNodeObj.class).path;
        self.currentPathNodes = [];
        self.currentPathNodes.push({ fromNodeObj: fromNodeObj, toNodeObj: toNodeObj, path: path });

        var where = "";
        var pathStr = self.getWhereFromPath(path);
        where += fromNodeObj.varName + " " + pathStr + " " + toNodeObj.varName + ".\n";
        return where;
    };

    self.getWhereFromPath = function (path) {
        var where = "";
        path.forEach(function (aclass, index) {
            if (index > 0) {
                if (index > 1) where += "/";
                var str = aclass + "_" + path[index - 1];
                if (self.routeObject.directPredicates[str]) {
                    where += "<" + self.routeObject.directPredicates[str] + ">";
                } else if (self.routeObject.inversePredicates[str]) {
                    where += "^<" + self.routeObject.inversePredicates[str] + ">";
                }
            }
        });

        return where;
    };

    self.addNodeToPath = function (targetNodeObj, allClassesMap, seqNumber) {
        var obj = self.initRoute(allClassesMap);
        var route = obj.route;

        var candidatePathes = [];
        self.currentPathNodes.forEach(function (pathObj) {
            pathObj.path.forEach(function (node) {
                var path = route.path(node, targetNodeObj.class).path;
                candidatePathes.push(path);
            });
        });

        var minSize = 1000;
        var shortestPathIndex = -1;
        candidatePathes.forEach(function (path, index) {
            if (path.length < minSize) {
                minSize = path.length;
                shortestPathIndex = index;
            }
        });

        var intersectionPoint;
        var newPath = candidatePathes[shortestPathIndex];
        self.currentPathNodes.forEach(function (pathObj, pathIndex) {
            var p = pathObj.path.indexOf(newPath[0]);
            if (p > -1)
                intersectionPoint = {
                    pathIndex: pathIndex,
                    nodeIndex: p,
                    className: pathObj.path[p],
                    newPath: newPath,
                };
        });

        var where = "";
        var newPathNodes = [];
        self.currentPathNodes.forEach(function (pathObj, pathIndex) {
            if (pathIndex != intersectionPoint.pathIndex) {
                // on laisse le path entier
                newPathNodes.push(pathObj);
                var path = [];
                pathObj.path.forEach(function (node, _nodeIndex) {
                    path.push(node);
                });
                var pathStr = self.getWhereFromPath(path);
                where += pathObj.fromNodeObj.varName + " " + pathStr + " " + pathObj.toNodeObj.varName + ".\n";
            } else {
                // on coupe le path en deux et on ajoute un variable triangulaire

                var splitPath1 = [];
                var splitPath2 = [];
                pathObj.path.forEach(function (node, nodeIndex) {
                    if (nodeIndex < intersectionPoint.nodeIndex) splitPath1.push(node);
                    else if (nodeIndex > intersectionPoint.nodeIndex) splitPath2.push(node);
                    else {
                        splitPath1.push(node);
                        splitPath2.push(node);
                    }
                });

                //on enleve le vieux path
                //  self.currentPathNodes.splice(pathIndex, 1)
                var classLabel = KGbrowser.OneModelDictionary[intersectionPoint.className];

                var cutPathNodeObj;
                if (intersectionPoint.nodeIndex == 0) {
                    cutPathNodeObj = self.currentPathNodes[intersectionPoint.pathIndex].fromNodeObj;
                } else if (intersectionPoint.nodeIndex == self.currentPathNodes[intersectionPoint.pathIndex].length - 1) {
                    cutPathNodeObj = self.currentPathNodes[intersectionPoint.pathIndex].toNodeObj;
                } else {
                    cutPathNodeObj = {
                        class: intersectionPoint.className,
                        varName: "?" + classLabel + "_" + seqNumber,
                    };
                }

                var path1 = self.getWhereFromPath(splitPath1);
                newPathNodes.push({
                    fromNodeObj: pathObj.fromNodeObj,
                    toNodeObj: cutPathNodeObj,
                    path: splitPath1,
                });
                where += " " + pathObj.fromNodeObj.varName + " " + path1 + "  " + cutPathNodeObj.varName + " .\n";

                var path2 = self.getWhereFromPath(splitPath2);
                newPathNodes.push({
                    fromNodeObj: cutPathNodeObj,
                    toNodeObj: pathObj.toNodeObj,
                    path: splitPath2,
                });
                where += " " + cutPathNodeObj.varName + " " + path2 + " " + pathObj.toNodeObj.varName + " .\n";

                var path3 = self.getWhereFromPath(intersectionPoint.newPath);
                newPathNodes.push({
                    fromNodeObj: cutPathNodeObj,
                    toNodeObj: targetNodeObj,
                    path: intersectionPoint.newPath,
                });

                where += " " + cutPathNodeObj.varName + " " + path3 + " " + targetNodeObj.varName + " .\n";
            }
        });
        self.currentPathNodes = JSON.parse(JSON.stringify(newPathNodes));
        return where;
    };

    return self;
})();
