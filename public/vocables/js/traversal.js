var Traversal = (function () {


    var self = {}

    self.traverse = function (fromNodeId, toNodeId, allClassesMap) {
        //   const Graph = require('dijkstra-short-path');

        const route = new Graph();


        for (var subject in allClassesMap) {
            var objectsArray =[]
            var predicates = allClassesMap[subject]


            for (var predicate in predicates) {
                if (predicate && predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    predicates[predicate].forEach(function (object) {
                        objectsArray.push([object, 1])
                        directPredicates[subject + "_" + object] = predicate
                        inversePredicates[object + "_" + subject] = predicate
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


    const classes = []
    const couples = []
    const directPredicates = {}
    const inversePredicates = {}
    self.traverseXXX = function (fromNodeId, toNodeId, allClassesMap) {
        for (var subject in allClassesMap) {
            if (classes.indexOf(subject) < 0)
                classes.push(subject)
            var predicates = allClassesMap[subject]


            for (var predicate in predicates) {
                if (predicate && predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    predicates[predicate].forEach(function (object) {
                        if (classes.indexOf(object) < 0)
                            classes.push(object)
                        couples.push([subject, object])
                        directPredicates[subject + "_" + object] = predicate
                        inversePredicates[object + "_" + subject] = predicate
                    })
                }
            }
        }


// The graph
        const adjacencyList = new Map();

// Add node
        function addNode(aclass) {
            adjacencyList.set(aclass, []);
        }

// Add edge, undirected
        function addEdge(origin, destination) {
            adjacencyList.get(origin).push(destination);
            adjacencyList.get(destination).push(origin);
        }

// Create the Graph
        classes.forEach(addNode);
        couples.forEach(route => addEdge(...route))
        var destinations = []
        var ok = false;

        function dfs(start, visited = new Set()) {

            if (!ok) {

                visited.add(start);

                const destinations = adjacencyList.get(start);

                for (const destination of destinations) {

                    if (destination === toNodeId) {
                        ok = true;
                        return visited.add(destination);
                    }

                    if (!visited.has(destination)) {
                        dfs(destination, visited);
                    }

                }
            } else ;
            return visited

        }

        var classesShorterstPath = []
        var visited = dfs(fromNodeId)
        for (const aClass of visited) {
            classesShorterstPath.push(aClass)
        }

        var select = ""
        var where = ""

        classesShorterstPath.forEach(function (aclass, index) {
            if (index > 0) {
                if (index > 1)
                    where += "/"
                var str = aclass + "_" + classesShorterstPath[index - 1]
                if (directPredicates[str])
                    where += "<" + directPredicates[str] + ">"
                else if (inversePredicates[str])
                    where += "^<" + inversePredicates[str] + ">"

            }
        })
        var xx = where


    }
    self.traverseExample = function () {

// DATA
        const airports = 'PHX BKK OKC JFK LAX MEX EZE HEL LOS LAP LIM'.split(' ');

        const routes = [
            ['PHX', 'LAX'],
            ['PHX', 'JFK'],
            ['JFK', 'OKC'],
            ['JFK', 'HEL'],
            ['JFK', 'LOS'],
            ['MEX', 'LAX'],
            ['MEX', 'BKK'],
            ['MEX', 'LIM'],
            ['MEX', 'EZE'],
            ['LIM', 'BKK'],
        ];


// The graph
        const adjacencyList = new Map();

// Add node
        function addNode(airport) {
            adjacencyList.set(airport, []);
        }

// Add edge, undirected
        function addEdge(origin, destination) {
            adjacencyList.get(origin).push(destination);
            adjacencyList.get(destination).push(origin);
        }

// Create the Graph
        airports.forEach(addNode);
        routes.forEach(route => addEdge(...route))
        var destinations = []

        function bfs(start) {

            const visited = new Set();

            const queue = [start]


            while (queue.length > 0) {

                const airport = queue.shift(); // mutates the queue

                destinations = adjacencyList.get(airport);


                for (const destination of destinations) {
                    ;

                    if (destination === 'BKK') {
                        console.log(`BFS found Bangkok!`)
                    }

                    if (!visited.has(destination)) {
                        visited.add(destination);
                        queue.push(destination);
                    }

                }


            }

        }

        bfs('PHX')


        function dfs(start, visited = new Set()) {

            console.log(start)

            visited.add(start);

            const destinations = adjacencyList.get(start);

            for (const destination of destinations) {

                if (destination === 'BKK') {
                    console.log(`DFS found Bangkok`)
                    return;
                }

                if (!visited.has(destination)) {
                    dfs(destination, visited);
                }

            }

        }

        dfs('PHX')


    }

    return self;


})()