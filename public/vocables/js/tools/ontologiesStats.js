/* eslint-disable no-console */
/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var OntologiesStats = (function () {
    var self = {};
    self.generateAllOwlStats = function (_type) {
        var fromSources = ["ISO 15926-14", "ISO_15926_part_12", "CFIHOS-ISO", "ISO_15926_.org", "CFIHOS_equipment", "CFIHOS_READI", "ISO_15926_part_4", "ISO_15926_PCA", "QUANTUM"];
        //  var fromSources=[ "ISO_15926_part_12"]
        var toSources = ["ISO 15926-14", "ISO_15926_part_12", "CFIHOS-ISO", "ISO_15926_.org", "CFIHOS_equipment", "CFIHOS_READI", "ISO_15926_part_4", "ISO_15926_PCA", "QUANTUM"];
        var rdfTypes = [
            //  "owl:Class",
            //"owl:ObjectProperty",
            "owl:DatatypeProperty",
        ];
        $("#graphDiv").append("");
        var resultArray = [];
        var fromArray = [];
        async.eachSeries(
            rdfTypes,
            function (rdfType, callbackRdfType) {
                async.eachSeries(
                    fromSources,
                    function (fromSourceId, callbackStart) {
                        fromArray.push(fromSourceId);
                        async.eachSeries(
                            toSources,
                            function (toSourceId, callbackEnd) {
                                if (fromArray.indexOf(toSourceId) < 0) {
                                    $("#graphDiv").append("running " + rdfType + " from " + fromSourceId + " to " + toSourceId);
                                    MainController.UI.message("running " + rdfType + " from " + fromSourceId + " to " + toSourceId);
                                    self.compareConcepts(true, "stats", rdfType, fromSourceId, toSourceId, function (err, result) {
                                        if (result) {
                                            resultArray = resultArray.concat(result);
                                        }

                                        return callbackEnd(err);
                                    });
                                } else return callbackEnd();
                            },
                            function (_err) {
                                return callbackStart();
                            }
                        );
                    },
                    function (_err) {
                        return callbackRdfType();
                    }
                );
            },
            function (err) {
                if (err) MainController.UI.message(err);
                // eslint-disable-next-line no-console
                console.log(JSON.stringify(resultArray, null, 2));
                $("#graphDiv").html(JSON.stringify(resultArray, null, 2));
                MainController.UI.message("Done");
            }
        );
    };

    self.generateMatchingMatrix = function () {
        var json = [
            { rdfType: "owl:DatatypeProperty", from: "ISO 15926-14", to: "ISO_15926_part_12", matchingCount: 0, fromCount: 3, toCount: "9" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO 15926-14",
                to: "CFIHOS-ISO",
                matchingCount: 0,
                fromCount: 3,
                toCount: "23",
            },
            { rdfType: "owl:DatatypeProperty", from: "ISO 15926-14", to: "ISO_15926_.org", matchingCount: 0, fromCount: 3, toCount: "555" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO 15926-14",
                to: "CFIHOS_equipment",
                matchingCount: 0,
                fromCount: 3,
                toCount: "0",
            },
            { rdfType: "owl:DatatypeProperty", from: "ISO 15926-14", to: "CFIHOS_READI", matchingCount: 0, fromCount: 3, toCount: "93" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO 15926-14",
                to: "ISO_15926_part_4",
                matchingCount: 0,
                fromCount: 3,
                toCount: "0",
            },
            { rdfType: "owl:DatatypeProperty", from: "ISO 15926-14", to: "ISO_15926_PCA", matchingCount: 0, fromCount: 3, toCount: "2360" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO 15926-14",
                to: "QUANTUM",
                matchingCount: 0,
                fromCount: 3,
                toCount: "0",
            },
            { rdfType: "owl:DatatypeProperty", from: "ISO_15926_part_12", to: "CFIHOS-ISO", matchingCount: 1, fromCount: 9, toCount: "23" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO_15926_part_12",
                to: "ISO_15926_.org",
                matchingCount: 1,
                fromCount: 9,
                toCount: "555",
            },
            { rdfType: "owl:DatatypeProperty", from: "ISO_15926_part_12", to: "CFIHOS_equipment", matchingCount: 0, fromCount: 9, toCount: "0" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO_15926_part_12",
                to: "CFIHOS_READI",
                matchingCount: 0,
                fromCount: 9,
                toCount: "93",
            },
            { rdfType: "owl:DatatypeProperty", from: "ISO_15926_part_12", to: "ISO_15926_part_4", matchingCount: 0, fromCount: 9, toCount: "0" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO_15926_part_12",
                to: "ISO_15926_PCA",
                matchingCount: 0,
                fromCount: 9,
                toCount: "2360",
            },
            { rdfType: "owl:DatatypeProperty", from: "ISO_15926_part_12", to: "QUANTUM", matchingCount: 0, fromCount: 9, toCount: "0" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "CFIHOS-ISO",
                to: "ISO_15926_.org",
                matchingCount: 0,
                fromCount: 23,
                toCount: "555",
            },
            { rdfType: "owl:DatatypeProperty", from: "CFIHOS-ISO", to: "CFIHOS_equipment", matchingCount: 0, fromCount: 23, toCount: "0" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "CFIHOS-ISO",
                to: "CFIHOS_READI",
                matchingCount: 0,
                fromCount: 23,
                toCount: "93",
            },
            { rdfType: "owl:DatatypeProperty", from: "CFIHOS-ISO", to: "ISO_15926_part_4", matchingCount: 0, fromCount: 23, toCount: "0" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "CFIHOS-ISO",
                to: "ISO_15926_PCA",
                matchingCount: 0,
                fromCount: 23,
                toCount: "2360",
            },
            { rdfType: "owl:DatatypeProperty", from: "CFIHOS-ISO", to: "QUANTUM", matchingCount: 0, fromCount: 23, toCount: "0" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO_15926_.org",
                to: "CFIHOS_equipment",
                matchingCount: 0,
                fromCount: 266,
                toCount: "0",
            },
            { rdfType: "owl:DatatypeProperty", from: "ISO_15926_.org", to: "CFIHOS_READI", matchingCount: 0, fromCount: 266, toCount: "93" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO_15926_.org",
                to: "ISO_15926_part_4",
                matchingCount: 5,
                fromCount: 266,
                toCount: "0",
            },
            { rdfType: "owl:DatatypeProperty", from: "ISO_15926_.org", to: "ISO_15926_PCA", matchingCount: 4, fromCount: 266, toCount: "2360" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO_15926_.org",
                to: "QUANTUM",
                matchingCount: 19,
                fromCount: 266,
                toCount: "0",
            },
            { rdfType: "owl:DatatypeProperty", from: "CFIHOS_equipment", to: "CFIHOS_READI", matchingCount: 0, fromCount: 0, toCount: "93" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "CFIHOS_equipment",
                to: "ISO_15926_part_4",
                matchingCount: 0,
                fromCount: 0,
                toCount: "0",
            },
            { rdfType: "owl:DatatypeProperty", from: "CFIHOS_equipment", to: "ISO_15926_PCA", matchingCount: 0, fromCount: 0, toCount: "2360" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "CFIHOS_equipment",
                to: "QUANTUM",
                matchingCount: 0,
                fromCount: 0,
                toCount: "0",
            },
            { rdfType: "owl:DatatypeProperty", from: "CFIHOS_READI", to: "ISO_15926_part_4", matchingCount: 3, fromCount: 102, toCount: "0" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "CFIHOS_READI",
                to: "ISO_15926_PCA",
                matchingCount: 2,
                fromCount: 102,
                toCount: "2360",
            },
            { rdfType: "owl:DatatypeProperty", from: "CFIHOS_READI", to: "QUANTUM", matchingCount: 34, fromCount: 102, toCount: "0" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO_15926_part_4",
                to: "ISO_15926_PCA",
                matchingCount: 0,
                fromCount: 0,
                toCount: "2360",
            },
            { rdfType: "owl:DatatypeProperty", from: "ISO_15926_part_4", to: "QUANTUM", matchingCount: 0, fromCount: 0, toCount: "0" },
            {
                rdfType: "owl:DatatypeProperty",
                from: "ISO_15926_PCA",
                to: "QUANTUM",
                matchingCount: 2,
                fromCount: 2346,
                toCount: "0",
            },
        ];
        //listSources
        var sources = {};
        json.forEach(function (item) {
            if (!sources[item.from]) sources[item.from] = {};

            sources[item.from][item.to] = item;
            var total;
            if (item.fromCount === null) total = "error";
            else total = item.fromCount;

            sources[item.from].total = total;
        });

        var str = "Source\tTotal";

        for (var keyFrom in sources) {
            str += "\t" + keyFrom;
        }
        str += "\n";

        for (keyFrom in sources) {
            var total = sources[keyFrom].total;
            str += keyFrom + "\t" + total;

            for (var keyTo in sources) {
                var value = "";
                var item = sources[keyFrom][keyTo];

                if (item) {
                    if (item.matchingCount != null) value = item.matchingCount;
                    else if (item.error) value = "Error";
                }

                str += "\t" + value;
            }
            str += "\n";
        }
        console.log(str);
    };

    self.drawMatchingGraph = function () {
        var str =
            "Classes,ISO 15926-14,ISO_15926_part_12,CFIHOS-ISO,ISO_15926_.org,CFIHOS_equipment,CFIHOS_READI,ISO_15926_part_4,ISO_15926_PCA\n" +
            "ISO 15926-14,0,25,0,0,0,0,0,0\n" +
            "ISO_15926_part_12,0,0,0,0,0,0,0,0\n" +
            "CFIHOS-ISO,58,63,0,0,0,0,0,0\n" +
            "ISO_15926_.org,64,63,99,0,0,0,0,0\n" +
            "CFIHOS_equipment,0,2,0,1,0,0,0,0\n" +
            "CFIHOS_READI,88,26,7,14,99,0,0,0\n" +
            "ISO_15926_part_4,9,5,0,2,20,10,0,0\n" +
            "ISO_15926_PCA,42,22,6,8,26,14,77,0";

        var lines = str.split("\n");
        var visjsData = { nodes: [], edges: [] };
        var header = lines[0].split(",");

        header.forEach(function (source, indexLine) {
            if (indexLine > 0) {
                visjsData.nodes.push({
                    id: source,
                    label: source,
                    shape: "box",
                });
            }
        });

        lines.forEach(function (line, indexLine) {
            if (indexLine > 0) {
                var cells = line.split(",");

                cells.forEach(function (cell, indexCell) {
                    if (indexCell > 0) {
                        if (cell == 0) {
                            return;
                        } else var value = cell;

                        visjsData.edges.push({
                            from: cells[0],
                            to: header[indexCell],
                            value: value,
                        });
                    }
                });
            }
        });

        visjsGraph.draw("graphDiv", visjsData);
    };

    return self;
})();
