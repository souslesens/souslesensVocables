//@typescript-eslint/no-unused-vars
var Lineage_decoration = (function () {
    var self = {};
    self.currentpart14ColorsMap = {};
    self.init = function () {
        self.operationsMap = {
            colorNodesByType: self.colorGraphNodesByType,
            colorNodesByPart14TopType: self.colorNodesByPart14TopType,
        };
        var operations = Object.keys(self.operationsMap);
        common.fillSelectOptions("Lineage_classes_graphDecoration_operationSelect", operations, true);
    };
    self.run = function (operation) {
        $("#Lineage_classes_graphDecoration_operationSelect").val("");
        self.operationsMap[operation]();
    };

    self.showGraphDecorationDialog = function () {
        $("#mainDialogDiv").load("snippets/lineage/graphDecoration.html", function () {
            $("#mainDialogDiv").dialog("open");
        });
    };
    self.listGraphNodeTypes = function (ids, part14TopTypes, callback) {
        if (!ids || ids.length == 0) return;
        var sourceLabel = Lineage_classes.mainSource;

        var strFrom = Sparql_common.getFromStr(sourceLabel, null, true, true);
        var sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var url = sparql_url + "?format=json&query=";

        var slices = common.array.slice(ids, 50);
        var data = [];
        async.eachSeries(
            slices,
            function (slice, callbackEach) {
                var query =
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                    "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>";

                if (part14TopTypes) {
                    query += "  SELECT distinct ?x ?type ?g " + strFrom + "WHERE {GRAPH ?g{" + "    ?x  rdf:type owl:Class." + " ?x   rdfs:subClassOf{,1} ?type.  filter(regex(str(?type),'lis14'))";

                    if (false) {
                        query += "SELECT distinct ?x ?type ?g " + strFrom + "WHERE {GRAPH ?g{" + '    ?x (rdfs:subClassOf| rdfs:subClassOf*/rdfs:subClassOf) ?type.  filter(regex(str(?type),"lis14"))';
                    }
                    /* "  ?x rdfs:subClassOf+|rdf:type+ ?type.\n" +
            " OPTIONAL {?type rdfs:subClassOf|rdf:type  ?parentType}" +*/
                    //  '  filter (regex(str(?type),"lis14") && ?type !=  <http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/Thing>)';
                } else {
                    query += "SELECT distinct ?x ?type ?g  " + strFrom + "  WHERE {GRAPH ?g{ ?x rdfs:subClassOf|rdf:type ?type.?type rdf:type ?typeType filter (?typeType not in (owl:Restriction)) "; // filter (?type not in ( <http://souslesens.org/resource/vocabulary/TopConcept>,<http://www.w3.org/2002/07/owl#Class>))"
                }

                query += Sparql_common.setFilter("x", slice);

                query += "}}";

                Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    data = data.concat(result.results.bindings);
                    if (data.length > 100); // console.error(query);
                    return callbackEach();
                });
            },
            function (err) {
                // find firstpart14Parent
                /*   var map = {};
        data.forEach(function(item) {
          map[item.x.value] = item;
        });

        function recurse(item) {
          if (!item.type2) {
            tree.push(item);
          }
        }

        for (var key in map) {
          if (map[key].parentType) {
            map[map[key].parentType].hasChildren = true;
          }
        }*/

                return callback(err, data);
            }
        );
    };
    self.colorNodesByPart14TopType = function () {
        self.colorGraphNodesByType(null, true);
    };

    self.colorGraphNodesByType = function (nodeIds, part14TopTypes) {
       // $("#Lineage_classes_graphDecoration_legendDiv").html("");
        part14TopTypes = true;
        if (!nodeIds) nodeIds = visjsGraph.data.nodes.getIds();
        if(!nodeIds)
            return
        // var existingNodes = visjsGraph.getExistingIdsMap(true);
        //  var ids = Object.keys(existingNodes);
        self.listGraphNodeTypes(nodeIds, part14TopTypes, function (err, result) {
            if (err) return alert(err);
            var nodesTypesMap = {};
            var colorsMap = {};

            var excludedTypes = ["TopConcept", "Class", "Restriction"];
            var distinctItems = {};
            result.forEach(function (item) {
                if (!distinctItems[item.x.value]) {
                    distinctItems[item.x.value] = 1;

                    var ok = true;
                    excludedTypes.forEach(function (type) {
                        if (item.type.value.indexOf(type) > -1) return (ok = false);
                    });

                    if (ok) {
                        var typeValue = item.type.value;
                        if (item.type.value.indexOf("lis14") < 0) {
                            return;
                        }
                        if (!self.currentpart14ColorsMap[typeValue]) {
                            self.currentpart14ColorsMap[typeValue] = common.paletteIntense[Object.keys(self.currentpart14ColorsMap).length];
                        }
                        nodesTypesMap[item.x.value] = {
                            type: item.type.value,
                            color: self.currentpart14ColorsMap[typeValue],
                            graphUri: item.g.value,
                        };
                    }
                }
            });
            // console.log(JSON.stringify(nodesTypesMap, null, 2))
            var newNodes = [];
            var neutralColor = null; //"#ccc";

            nodeIds.forEach(function (nodeId) {
                if (false && nodeId.indexOf("legend_") == 0) legendNodes.push(nodeId);
                else {
                    var color = neutralColor;
                    var type = null;

                    if (nodesTypesMap[nodeId]) {
                        color = nodesTypesMap[nodeId].color;
                        type = nodesTypesMap[nodeId].type;
                    }
                    if (color) newNodes.push({ id: nodeId, color: color, legendType: type });
                }
            });
            if (visjsGraph.data && visjsGraph.data.nodes) visjsGraph.data.nodes.update(newNodes);

            /// update node data source with the real source of the node
            var nodes = visjsGraph.data.nodes.get(nodeIds);
            if (true) {
                nodes.forEach(function (node) {
                    if (node.data && nodesTypesMap[node.data.id] && nodesTypesMap[node.data.id].graphUri) {
                        var source2 = nodesTypesMap[node.data.id].graphUri ? Sparql_common.getSourceFromGraphUri(nodesTypesMap[node.data.id].graphUri) : source;
                        if (source2) node.data.source = source2;
                    }
                });
            }

            var legendNodes = [];
            var str = "";

            for (var _type in self.currentpart14ColorsMap) {
                str +=
                    "<div class='Lineage_legendTypeDiv' onclick='Lineage_decoration.onlegendTypeDivClick($(this),\"" +
                    _type +
                    "\")' style='background-color:" +
                    self.currentpart14ColorsMap[_type] +
                    "'>" +
                    Sparql_common.getLabelFromURI(_type) +
                    "</div>";
            }
            $("#Lineage_classes_graphDecoration_legendDiv").html(str);
            //  visjsGraph.data.nodes.add(legendNodes)
        });
    };
    self.onlegendTypeDivClick = function (div, type) {
        self.currentLegendObject = { type: type, div: div };
        self.setGraphPopupMenus();
        var point = div.position();
        point.x = point.left;
        point.y = point.top;
        MainController.UI.showPopup(point, "graphPopupDiv", true);
    };

    self.setGraphPopupMenus = function () {
        var html =
            '    <span  class="popupMenuItem" onclick="Lineage_decoration.hideShowLegendType(true);"> Hide Type</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_decoration.hideShowLegendType();"> Show Type</span>' +
            ' <span  class="popupMenuItem" onclick="Lineage_decoration.hideShowLegendType(null,true);"> Show Only</span>';
        $("#graphPopupDiv").html(html);
    };
    self.hideShowLegendType = function (hide, only) {
        if (hide) self.currentLegendObject.div.addClass("Lineage_legendTypeDivHidden");
        else self.currentLegendObject.div.removeClass("Lineage_legendTypeDivHidden");
        var allNodes = visjsGraph.data.nodes.get();
        var newNodes = [];
        var hidden = hide ? true : false;
        allNodes.forEach(function (node) {
            if (only) {
                if (only == "all" || (node && node.legendType == self.currentLegendObject.type))
                    newNodes.push({
                        id: node.id,
                        hidden: false,
                    });
                else newNodes.push({ id: node.id, hidden: true });
            } else {
                if (node && node.legendType == self.currentLegendObject.type)
                    newNodes.push({
                        id: node.id,
                        hidden: hidden,
                    });
            }
        });
        visjsGraph.data.nodes.update(newNodes);
    };

    return self;
})();
