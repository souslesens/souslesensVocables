import KGconstraintsModeler from "./KGconstraintsModeler.js";

var KGconstraints_validator = (function () {
    var self = {};

    self.onLoaded = function () {};

    self.transformVisjsGraph = function (rootNode, data) {
        var nodesMap = {};

        data.nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });

        var allPaths = [];
        var currentPath = [];

        var prefixMap = {
            cfihos: "http://data.totalenergies.com/resource/ontology/cfihos_1.5/",
            ido: "http://rds.posccaesar.org/ontology/lis14/rdl/",
        };

        function uriToPrefixedUri(uri) {
            for (var prefix in prefixMap) {
                var uri2 = uri.replace(prefixMap[prefix], prefix + ":");
                if (uri2 != uri) return uri2;
            }

            return uri;
        }

        function recurse(nodeId) {
            data.edges.forEach(function (edge) {
                if (edge.from == nodeId) {
                    var fromNode = nodesMap[nodeId];
                    var toNode = nodesMap[edge.to];
                    if (toNode.data.type == "RequiredValue") {
                        currentPath.RequiredValue = toNode.data.id;

                        allPaths.push(currentPath);
                        currentPath = [];
                    } else if (fromNode.data.type == "Class") {
                        if (edge.data.id) {
                            var currentQualityBnode = "cfihos:" + common.getRandomHexaId(10);
                            currentPath.push({
                                subject: uriToPrefixedUri(fromNode.data.id),
                                predicate: uriToPrefixedUri(toNode.data.id),
                                object: uriToPrefixedUri(currentQualityBnode),
                            });
                        }
                    }
                    recurse(edge.to);
                }
            });
        }

        recurse(rootNode.id);

        var triples = [];
        var prefix = "cfihos:";
        var subject = prefix + rootNode.label;
        var shaclProperties = [];

        triples.push({
            subject: subject,
            predicate: "rdf:type",
            object: allPaths[0].subject,
        });

        allPaths.forEach(function (path) {
            var shaclProperty = "sh:path  ;";

            if (path.RequiredValue) {
                var lastTriple = null;
                if (path.length == 1) {
                    path.forEach(function (triple, index) {
                        triples.push(triple);
                        lastTriple = triple;
                        if (index > 0) shaclProperty += "/";
                        shaclProperty += triple.predicate;
                    });

                    triples.push({
                        subject: lastTriple.object,
                        predicate: "rdf:value",
                        object: path.RequiredValue,
                    });

                    shaclProperty += "/rdf:value ; \n; sh:hasValue " + path.RequiredValue + " ;";
                    shaclProperties.push(shaclProperty);
                }
            }
        });

        var x = triples;
        var y = shaclProperties;
        var z = "";
    };
    /*
ex:BookShape
  a sh:NodeShape ;
  sh:targetClass ex:Book ;
  sh:property [
    sh:path ex:genre ;
    sh:hasValue ex:Mystery ;
]

ex:CentrifugalPumpShape
  a sh:NodeShape ;
  sh:targetClass cfihos:EquipmentClassCFIHOS-30000003 ;
  sh:property [
    sh:path cfihos:EquipmentClassCFIHOS-30000003/rdf:value ;
    sh:hasValue ex:Mystery ;
]
 */

    self.test = function () {
        var visjsGaph = KGconstraintsModeler.visjsGraph;
        var data = {
            nodes: visjsGaph.data.nodes.get(),
            edges: visjsGaph.data.edges.get(),
        };

        var rootNode = data.nodes[1];
        self.transformVisjsGraph(rootNode, data);
    };

    return self;
})();
export default KGconstraints_validator;
window.KGconstraints_validator = KGconstraints_validator;
