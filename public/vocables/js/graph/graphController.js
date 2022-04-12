/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
Config = {
    visjs: {
        defaultNodeSize: 10,
        showNodesLabelMinScale: 0.5,
        defaultTextSize: 18,
    },
};
var graphController = (function () {
    var rootEntityColors = {};
    var self = {};
    (self.palette = ["#0072d5", "#FF7D07", "#c00000", "#FFD900", "#B354B3", "#a6f1ff", "#007aa4", "#584f99", "#cd4850", "#005d96", "#ffc6ff", "#007DFF", "#ffc36f", "#ff6983", "#7fef11", "#B3B005"]),
        (self.sliderIndexMin = 10);
    self.sliderIndexMax = 200;

    self.drawEntitiesGraph = function (data) {
        var nodes = [];
        var edges = [];
        var nodeMap = {};
        var rootEntityColors = {};
        var colorIndex = 0;
        data.labels.forEach(function (label, rowIndex) {
            var str = label.split("-")[0];
            if (!rootEntityColors[str]) rootEntityColors[str] = graphController.palette[colorIndex++];

            data.data[rowIndex].forEach(function (col, colIndex) {
                if (rowIndex > colIndex && col > 20) {
                    var edge = {
                        from: rowIndex,
                        to: colIndex,
                        width: col / 20,
                    };
                    edges.push(edge);
                }
            });
        });

        edges.forEach(function (edge) {
            if (!nodeMap[edge.from]) {
                var rootEntity = data.labels[edge.from].split("-")[0];
                var color = rootEntityColors[rootEntity];
                nodeMap[edge.from] = {
                    id: "E_" + edge.from,
                    color: color,
                    label: "" + data.labels[edge.from],
                    size: edge.width / 2,
                    font: {
                        color: color,
                        bold: true,
                        size: 14,
                    },
                    shape: "square",
                };
            } else {
                nodeMap[edge.from].size += edge.width / 2;
            }

            if (!nodeMap[edge.to]) {
                rootEntity = data.labels[edge.from].split("-")[0];
                color = rootEntityColors[rootEntity];
                nodeMap[edge.to] = {
                    id: "E_" + edge.to,
                    color: color,
                    label: "" + data.labels[edge.to],
                    size: edge.width / 2,
                };
            } else {
                nodeMap[edge.to].size += edge.width / 2;
            }
        });
        for (var key in nodeMap) {
            nodes.push(nodeMap[key]);
        }
        edges.forEach(function (edge) {
            edge.from = "E_" + edge.from;
            edge.to = "E_" + edge.to;
        });
        visjsGraph.draw("graphDiv", { nodes: nodes, edges: edges }, {});
    };

    self.showGraph = function () {
        var nodes = [];

        context.currentHits.forEach(function (hit) {
            var node = {
                id: hit._id,
                color: "red",
                label: "" + hit._source.docId,
            };
            nodes.push(node);
        });

        $("#dialogDiv").html("<div style='width:400px;height: 400px' id='graphDiv'></div>");
        $("#dialogDiv").dialog("open");
        var w = $("#dialogDiv").width();
        var h = $("#dialogDiv").height();
        $("#graphDiv").width(w);
        $("#graphDiv").height(h);

        visjsGraph.draw("graphDiv", { nodes: nodes, edges: [] });
    };

    self.onNodeClicked = function (node, _point, _options) {
        var docIds = [];
        node.attrs.documents.forEach(function (doc) {
            docIds.push(doc.id);
        });

        var query = { query: { terms: { "documents.id": docIds } }, size: 1000 };
        var queryStr = JSON.stringify(query);
        //  console.log(queryStr)
        var payload = {
            executeQuery: queryStr,
            indexes: JSON.stringify([context.currentThesaurusIndex]),
        };
        $.ajax({
            type: "POST",
            url: appConfig.elasticUrl,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                var hits = data.hits.hits;
                self.addEntityHitsToGraph(hits);
            },
            error: function (err) {
                // eslint-disable-next-line no-console
                console.log(err);
            },
        });
    };

    self.onEdgeClicked = function (edge, _point, _options) {
        var fromEntity = edge.fromNode.label;
        var toEntity = edge.toNode.label;
        var str = "<b>" + fromEntity + " / <br>" + toEntity + "<br> </b>";
        $("#infosDiv").html(str);
        statistics.showDocs(fromEntity, toEntity);
    };

    self.getNodeFromEntityHit = function (hit) {
        var rootEntity = hit._source.internal_id.split("-")[0];
        if (!rootEntityColors[rootEntity]) rootEntityColors[rootEntity] = graphController.palette[Object.keys(rootEntityColors).length];

        var color = rootEntityColors[rootEntity];
        var node = {
            id: hit._source.internal_id,
            label: hit._source.internal_id,
            attrs: {
                synonyms: hit._source.synonyms,
                documents: hit._source.documents,
            },
            value: hit._source.documents.length,
            color: color,
            shape: "square",
            font: {
                color: color,
                bold: true,
                size: 14,
            },
        };
        return node;
    };

    self.addEntityHitsToGraph = function (hits, nodes) {
        if (!nodes) nodes = visjsGraph.data.nodes.get();
        var relations = {};
        var newEdges = [];
        var newNodes = [];
        var existingNodesIds = visjsGraph.data.nodes.getIds();

        nodes.forEach(function (node) {
            hits.forEach(function (hit) {
                var newNode = self.getNodeFromEntityHit(hit);
                if (existingNodesIds.indexOf(newNode.id) < 0) {
                    newNodes.push(newNode);
                    existingNodesIds.push(newNode.id);
                }

                newNode.attrs.documents.forEach(function (doc) {
                    node.attrs.documents.forEach(function (doc2) {
                        if (doc2.id == doc.id) {
                            if (!relations[newNode.id + "|" + node.id]) {
                                if (!relations[node.id + "|" + newNode.id]) relations[node.id + "|" + newNode.id] = [];
                                relations[node.id + "|" + newNode.id].push(doc.id);
                            }
                        }
                    });
                });
            });
        });

        for (var key in relations) {
            var array = key.split("|");

            var edge = {
                from: array[0],
                to: array[1],
                value: relations[key].length,
            };
            newEdges.push(edge);
        }

        visjsGraph.data.nodes.add(newNodes);

        newEdges.sort(function (a, b) {
            if (a.value > b.value) return -1;
            if (a.value < b.value) return 1;
            return 0;
        });
        self.sliderEdges = newEdges;
        self.sliderEdges.index = self.sliderIndexMin;
        visjsGraph.data.edges.add(newEdges.slice(0, self.sliderIndexMin));
    };

    return self;
})();
