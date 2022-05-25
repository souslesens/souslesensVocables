/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

Lineage_properties = (function() {
  var self = {};
  sourceColors = {};
  self.defaultShape = "triangle";
  self.defaultEdgeArrowType = "triangle";
  self.defaultShape = "dot";
  self.defaultShape = "text";
  self.defaultShapeSize = 8;

  self.init = function() {
    self.graphInited = false;
    Lineage_common.currentSource = MainController.currentSource;
  };
  self.showPropInfos = function(_event, obj) {
    var id = obj.node.id;
    var html = JSON.stringify(self.properties[id]);
    $("#graphDiv").html(html);
  };

  self.jstreeContextMenu = function() {
    var items = {
      nodeInfos: {
        label: "Property infos",
        action: function(_e) {
          // pb avec source

          SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode.data.id, "mainDialogDiv", { resetVisited: 1 }, function(_err, _result) {
            // pass
          });
        }
      }
    };
    if (MainController.currentTool == "lineage") {
      /*  items.graphNode = {
      label: "graph Property",
      action: function (_e) {
          // pb avec source
          if (Config.sources[self.currentTreeNode.data.source].schemaType == "OWL"){
            self.drawRangeAndDomainsGraph
            //  self.drawIndividualsProperty(self.currentTreeNode.data);
             // self.drawObjectProperty(self.currentTreeNode.data);
          }
          else if (Config.sources[self.currentTreeNode.data.source].schemaType == "KNOWLEDGE_GRAPH") self.drawIndividualsProperty(self.currentTreeNode.data);
          //   Lineage_classes.drawNodeAndParents(self.currentTreeNode.data)
      },
  };*/
      items.drawRangesAndDomainsProperty = {
        label: "Draw ranges and domains",
        action: function(_e) {
          // pb avec source
          setTimeout(function() {
            self.drawRangeAndDomainsGraph(self.currentTreeNode);
          }, 200);
        }
      };
      items.copyNodeToClipboard = {
        label: "copy to Clipboard",
        action: function(_e) {
          // pb avec source

          Lineage_common.copyNodeToClipboard(self.currentTreeNode.data);
        }
      };

      if (!Lineage_common.currentSource || Config.sources[Lineage_common.currentSource].editable) {
        items.pasteNodeFromClipboard = {
          label: "paste from Clipboard",
          action: function(_e) {
            // pb avec source

            Lineage_common.pasteNodeFromClipboard(self.currentTreeNode);
          }
        };
        items.deleteProperty = {
          label: "delete property",
          action: function(_e) {
            // pb avec source

            Lineage_common.jstree.deleteNode(self.currentTreeNode, "Lineage_propertiesTree");
          }
        };
      }
    }

    return items;
  };
  self.onTreeNodeClick = function(_event, obj) {
    if (!obj || !obj.node) return;
    self.currentTreeNode = obj.node;
    if (obj.node.children && obj.node.children.length > 0) return;
    self.openNode(obj.node);
  };

  self.openNode = function(node) {
    var options = { subPropIds: node.data.id };
    MainController.UI.message("searching in " + node.data.source);
    // @ts-ignore
    Sparql_OWL.getObjectProperties(node.data.source, null, options, function(err, result) {
      if (err) return MainController.UI.message(err);
      var data = common.array.sort(common.array.distinctValues(result, "prop"), "propLabel");
      var distinctIds = {};
      var jstreeData = [];
      data.forEach(function(item) {
        if (!distinctIds[item.prop.value]) {
          distinctIds[item.prop.value] = 1;

          var parent = node.data.source;
          if (item.subProp) parent = item.subProp.value;
          jstreeData.push({
            text: item.propLabel.value,
            id: item.prop.value,
            parent: parent,
            data: {
              label: item.propLabel.value,
              id: item.prop.value,
              parent: parent,
              type: "http://www.w3.org/2002/07/owl#ObjectProperty",
              source: node.data.source
            }
          });
        }
      });
      common.jstree.addNodesToJstree("Lineage_propertiesTree", node.id, jstreeData);
      MainController.UI.message("", true);
    });
  };


  self.getPropertiesjsTreeData = function(source, ids, words, options, callback) {
    if (!options) options = {};

    if (!options.searchType || options.searchType == "Property")
      options.filter = Sparql_common.setFilter("prop", null, words, options);
    else if (options.searchType == "Domain") {
      options.filter = Sparql_common.setFilter("domain", null, words, options);
      options.justPropertyAndLabel = false;
    } else if (options.searchType == "Range") {
      options.filter = Sparql_common.setFilter("range", null, words, options);
      options.justPropertyAndLabel = false;
    }

    if (Config.sources[source].schemaType == "OWL") {
      Sparql_OWL.getObjectProperties(source, ids, options, function(err, result) {
        if (err) return callback(err);
        var data = common.array.sort(common.array.distinctValues(result, "prop"), "propLabel");
        var distinctIds = {};
        var jstreeData = [];
        data.forEach(function(item) {
          if (!distinctIds[item.prop.value]) {
            distinctIds[item.prop.value] = 1;

            var parent = source;
            if (item.subProp) parent = item.subProp.value;
            jstreeData.push({
              text: item.propLabel.value,
              id: item.prop.value,
              parent: parent,
              data: {
                label: item.propLabel.value,
                id: item.prop.value,
                parent: parent,
                type: "http://www.w3.org/2002/07/owl#ObjectProperty",
                source: source
              }
            });
          }
        });
        callback(null, jstreeData);
      });
    } else if (Config.sources[source].schemaType == "KNOWLEDGE_GRAPH") {
      options = { distinct: "property" };
      Sparql_OWL.getIndividualProperties(source, null, null, null, options, function(err, result) {
        if (err) return callback(err);
        var distinctIds = {};
        var jstreeData = [];
        result.forEach(function(item) {
          if (!distinctIds[item.property.value]) {
            distinctIds[item.property.value] = 1;

            var parent = source;
            jstreeData.push({
              text: item.propertyLabel.value,
              id: item.property.value,
              parent: parent,
              data: {
                label: item.propertyLabel.value,
                id: item.property.value,
                parent: parent,
                type: "http://www.w3.org/2002/07/owl#Property",
                source: source
              }
            });
          }
        });
        callback(null, jstreeData);
      });
    }
  };
  self.drawIndividualsProperty = function(nodeData) {
    var nodes = null;
    // if (visjsGraph.isGraphNotEmpty()) {
    var nodesSelection = $("#LineagePropertie_nodesSelectionSelect").val();

    if (nodesSelection == "currentGraphNodes") {
      nodes = visjsGraph.data.nodes.getIds();
    }

    Sparql_OWL.getIndividualProperties(nodeData.source, nodes, nodeData.id, null, {}, function(err, result) {
      if (err) return callback(err);
      var visjsData = { nodes: [], edges: [] };
      var existingNodes = visjsGraph.getExistingIdsMap();
      var color = Lineage_classes.getSourceColor(nodeData.source);
      result.forEach(function(item) {
        if (!existingNodes[item.subject.value]) {
          existingNodes[item.subject.value] = 1;
          visjsData.nodes.push({
            id: item.subject.value,
            label: item.subjectLabel.value,
            shape: "dot",
            size: Lineage_classes.defaultShapeSize,
            color: color,
            data: {
              source: nodeData.source,
              id: item.subject.value,
              label: item.subject.value
            }
          });
        }
        if (!existingNodes[item.object.value]) {
          existingNodes[item.object.value] = 1;
          visjsData.nodes.push({
            id: item.object.value,
            label: item.objectLabel.value,
            shape: "dot",
            size: Lineage_classes.defaultShapeSize,
            color: color,
            data: {
              source: nodeData.source,
              id: item.object.value,
              label: item.object.value
            }
          });
        }
        var edgeId = item.subject.value + "_" + item.property.value + "_" + item.object.value;
        if (!existingNodes[edgeId]) {
          existingNodes[edgeId] = 1;

          visjsData.edges.push({
            id: edgeId,
            from: item.subject.value,
            to: item.object.value,
            data: { propertyId: item.property.value, source: nodeData.source },

            arrows: {
              to: {
                enabled: true,
                type: "solid",
                scaleFactor: 0.5
              }
            },
            color: Lineage_classes.propertyColors
          });
        }
      });
      if (visjsGraph.isGraphNotEmpty()) {
        visjsGraph.data.nodes.add(visjsData.nodes);
        visjsGraph.data.edges.add(visjsData.edges);
      } else {
        var options = {};
        visjsGraph.draw("graphDiv", visjsData, options);
      }
      visjsGraph.network.fit();
      $("#waitImg").css("display", "none");
    });
  };

  self.drawObjectProperty = function(nodeData) {
    Sparql_OWL.getPropertyClasses(nodeData.source, nodeData.id, {}, function(err, result) {
      if (err) {
        alert(err.responseText);
        return MainController.UI.message(err.responseText, true);
      }
      var visjsData = { nodes: [], edges: [] };

      var existingNodes = visjsGraph.getExistingIdsMap();
      var isNewGraph = true;
      if (Object.keys(existingNodes).length > 0) isNewGraph = false;
      var source = nodeData.source;
      var color = Lineage_classes.getSourceColor(source);
      //  console.log(JSON.stringify(result, null, 2))
      result.forEach(function(item) {
        if (!existingNodes[item.prop.value]) {
          existingNodes[item.prop.value] = 1;
          visjsData.nodes.push({
            id: item.prop.value,
            label: item.propLabel.value,
            shape: "square",
            size: Lineage_classes.defaultShapeSize,
            color: color,
            data: {
              source: source,
              id: item.prop.value,
              label: item.propLabel.value,
              varName: "prop"
            }
          });
        }
        if (!existingNodes[item.sourceClass.value]) {
          existingNodes[item.sourceClass.value] = 1;
          visjsData.nodes.push({
            id: item.sourceClass.value,
            label: item.sourceClassLabel.value,
            shape: Lineage_classes.defaultShape,
            size: Lineage_classes.defaultShapeSize,
            color: color,
            data: {
              source: source,
              id: item.sourceClass.value,
              label: item.sourceClassLabel.value,
              varName: "value"
            }
          });
          var edgeId = item.sourceClass.value + "_" + item.prop.value;
          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;

            visjsData.edges.push({
              id: edgeId,
              from: item.sourceClass.value,
              to: item.prop.value,
              data: { propertyId: item.prop.value, source: source },

              arrows: {
                to: {
                  enabled: true,
                  type: "solid",
                  scaleFactor: 0.5
                }
              },
              dashes: true,
              color: Lineage_classes.restrictionColor
            });
          }
        }
        if (item.targetClass && !existingNodes[item.targetClass.value]) {
          existingNodes[item.targetClass.value] = 1;
          visjsData.nodes.push({
            id: item.targetClass.value,
            label: item.targetClassLabel.value,
            shape: Lineage_classes.defaultShape,
            size: Lineage_classes.defaultShapeSize,
            color: color,
            data: {
              source: source,
              id: item.targetClass.value,
              label: item.targetClassLabel.value,
              varName: "value"
            }
          });
          edgeId = item.prop.value + "_" + item.targetClass.value;
          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;

            visjsData.edges.push({
              id: edgeId,

              from: item.prop.value,
              to: item.targetClass.value,
              data: { propertyId: item.prop.value, source: source },

              arrows: {
                to: {
                  enabled: true,
                  type: "solid",
                  scaleFactor: 0.5
                }
              },
              dashes: true,
              color: Lineage_classes.restrictionColor
            });
          }
        }
      });
      if (!isNewGraph) {
        visjsGraph.data.nodes.add(visjsData.nodes);
        visjsGraph.data.edges.add(visjsData.edges);
      } else {
        var options = {};
        visjsGraph.draw("graphDiv", visjsData, options);
      }
      visjsGraph.network.fit();
      $("#waitImg").css("display", "none");
    });
  };

  self.drawPredicateTriples = function(predicate) {
    if (!predicate) predicate = self.currentTreeNode;
    if (!predicate) return alert("select a property first");
    var sparql_url = Config.sources[Lineage_common.currentSource].sparql_server.url;
    var fromStr = Sparql_common.getFromStr(Lineage_common.currentSource);

    var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " + "select * " + fromStr + " where {";

    query += " ?sub ?prop ?obj. filter (?prop in ( <" + predicate.data.id + ">)) ";

    query += "  Optional {?sub rdfs:label ?subLabel}  Optional {?obj rdfs:label ?objLabel} ";
    query += "} limit 1000";
    var url = sparql_url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Lineage_common.currentSource }, function(err, result) {
      if (err) return MainController.UI.message(err);

      result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["sub", "obj", "prop"]);
      var data = result.results.bindings;
      if (data.length == 0) {
        $("#waitImg").css("display", "none");
        MainController.UI.message("no dataFound");
        return;
      }
      var color = Lineage_classes.getSourceColor(Lineage_common.currentSource);
      var visjsData = { nodes: [], edges: [] };
      var existingIds = visjsGraph.getExistingIdsMap();

      data.forEach(function(item) {
        if (!existingIds[item.sub.value]) {
          existingIds[item.sub.value] = 1;
          var node = {
            id: item.sub.value,
            label: item.subLabel.value,
            shape: Lineage_classes.defaultShape,
            size: Lineage_classes.defaultShapeSize,
            color: color,
            font: { multi: true, size: 10 },
            data: {
              source: Lineage_common.currentSource,
              id: item.sub.value,
              label: item.sub.value
            }
          };

          visjsData.nodes.push(node);
        }

        if (!existingIds[item.obj.value]) {
          existingIds[item.obj.value] = 1;
          node = {
            id: item.obj.value,
            label: item.objLabel.value,
            shape: Lineage_classes.defaultShape,
            size: Lineage_classes.defaultShapeSize,
            color: color,
            font: { multi: true, size: 10 },
            data: {
              source: Lineage_common.currentSource,
              id: item.obj.value,
              label: item.obj.value
            }
          };

          visjsData.nodes.push(node);
        }

        var edgeId = item.sub.value + "_" + item.obj.value;

        var arrows = {
          to: {
            enabled: true,
            type: Lineage_classes.defaultEdgeArrowType,
            scaleFactor: 0.5
          }
        };

        if (!existingIds[edgeId]) {
          existingIds[edgeId] = 1;
          visjsData.edges.push({
            id: edgeId,
            from: item.sub.value,
            to: item.obj.value,
            arrows: arrows
          });
        }
      });

      if (visjsGraph.isGraphNotEmpty()) {
        visjsGraph.data.nodes.update(visjsData.nodes);
        visjsGraph.data.edges.update(visjsData.edges);
      } else {
        Lineage_classes.drawNewGraph(visjsData);
      }
    });
  };

  self.drawRangeAndDomainsGraph = function(property) {
    /*  if (!property) property = self.currentTreeNode;
if (!property) return alert("select a property first");*/
    var source = Lineage_common.currentSource;
    var propId = null;
    if (property) {
      source = property.data.source;
      propId = property.id;
    }
    //if search in multiple sources and choose a source : draw all the properties found for this source
    if (property && property.parent == "#") {
      Lineage_common.currentSource = property.data.source;
      propId = property.children;

    }
    var targetnodes = null;
    var nodesSelection = $("#LineagePropertie_nodesSelectionSelect").val();
    nodesSelection = false;
    if (visjsGraph.data && visjsGraph.data.nodes && nodesSelection == "currentGraphNodes") {
      targetnodes = visjsGraph.data.nodes.getIds();
    }

    // Sparql_OWL.getObjectProperties(Lineage_common.currentSource, null, {propIds:[propId]}, function (err, result) {


    function drawproperties(result) {
      var visjsData = { nodes: [], edges: [] };
      var existingNodes = {};
      if (visjsGraph.data && visjsGraph.data.nodes) existingNodes = visjsGraph.getExistingIdsMap();
      var color = Lineage_classes.getSourceColor(Lineage_common.currentSource);

      result.forEach(function(item) {
        var ok = 0;
        if (targetnodes) {
          if (item.range && targetnodes.indexOf(item.range.value) > -1) ok = 1;
          else if (item.domain && targetnodes.indexOf(item.domain.value) > -1) ok = 1;

          if (!ok) return;
        }
        if(item.property.value.indexOf("#type")>-1 && item.property.value.indexOf("#label")>-1)
          return;

        if (!existingNodes[item.property.value]) {
          existingNodes[item.property.value] = 1;
          visjsData.nodes.push({
            id: item.property.value,
            label: item.propertyLabel.value,
            data: {
              id: item.property.value,
              label: item.propertyLabel.value,
              subProperties: [],
              source: Lineage_common.currentSource
            },
            size: self.defaultShapeSize,
            color: color,
            shape: self.defaultShape,
            font: { color: "blue", size: 12 }
          });
        }

        if (item.subProperty) {
          var subProperty = item.subProperty.value;
          if (!existingNodes[subProperty]) {
            existingNodes[subProperty] = 1;
            visjsData.nodes.push({
              id: subProperty,
              label: item.subPropertyLabel.value,
              data: {
                id: subProperty,
                label: item.subPropertyLabel.value,
                subProperties: [],
                source: Lineage_common.currentSource
              },
              font: { color: "blue", size: 12 },
              size: self.defaultShapeSize,
              color: color,
              shape: self.defaultShape
            });
            var edgeId = item.property.value + "_" + subProperty;
            if (!existingNodes[edgeId]) {
              existingNodes[edgeId] = 1;
              visjsData.edges.push({
                id: edgeId,
                from: item.property.value,
                to: subProperty,
                // label: "range"
                color: "brown",
                dashes: true,
                arrows: {
                  from: {
                    enabled: true,
                    type: Lineage_classes.defaultEdgeArrowType,
                    scaleFactor: 0.5
                  }
                }
              });
            }
          }
        }
        if (item.range) {
          if (!existingNodes[item.range.value]) {
            var shape = "text";
            if (item.rangeType) {
              if (item.rangeType.value.indexOf("Class") > -1) shape = Lineage_classes.defaultShape;
              if (item.rangeType.value.indexOf("property") > -1) shape = self.defaultShape;
            }
            existingNodes[item.range.value] = 1;

            visjsData.nodes.push({
              id: item.range.value,
              label: item.rangeLabel.value,
              data: {
                id: item.range.value,
                label: item.rangeLabel.value,
                source: Lineage_common.currentSource
              },
              size: self.defaultShapeSize,
              color: color,
              shape: shape
            });
          }
          edgeId = item.property.value + "_" + item.range.value;
          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            visjsData.edges.push({
              id: edgeId,
              from: item.property.value,
              to: item.range.value,
              // label: "range"
              color: "brown",
              dashes: true,
              arrows: {
                to: {
                  enabled: true,
                  type: Lineage_classes.defaultEdgeArrowType,
                  scaleFactor: 0.5
                }
              }
            });
          }
        }
        if (item.domain) {
          if (!existingNodes[item.domain.value]) {
            existingNodes[item.domain.value] = 1;
            shape = "text";
            if (item.domainType) {
              if (item.domainType.value.indexOf("Class") > -1) shape = Lineage_classes.defaultShape;
              if (item.domainType.value.indexOf("property") > -1) shape = self.defaultShape;
            }

            visjsData.nodes.push({
              id: item.domain.value,
              label: item.domainLabel.value,
              data: {
                id: item.domain.value,
                label: item.domainLabel.value,
                source: Lineage_common.currentSource
              },
              color: color,
              size: self.defaultShapeSize,
              shape: shape
            });
          }
          edgeId = item.property.value + "_" + item.domain.value;
          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            visjsData.edges.push({
              id: edgeId,
              from: item.property.value,
              to: item.domain.value,
              // label: "domain",
              color: "green",
              dashes: true
              /*   arrows: {
to: {
  enabled: true,
  type: Lineage_classes.defaultEdgeArrowType,
  scaleFactor: 0.5
}
}*/
            });
          }
        }
        if (item.range) {
          if (!existingNodes[item.range.value]) {
            shape = "text";
            if (item.rangeType) {
              if (item.rangeType.value.indexOf("Class") > -1) shape = Lineage_classes.defaultShape;
              if (item.rangeType.value.indexOf("property") > -1) shape = self.propertiesLineage_classes.defaultShape;
            }
            existingNodes[item.range.value] = 1;

            visjsData.nodes.push({
              id: item.range.value,
              label: item.rangeLabel.value,
              data: {
                id: item.range.value,
                label: item.rangeLabel.value,
                source: Lineage_common.currentSource
              },
              color: color,
              size: self.defaultShapeSize,
              shape: shape
            });
          }
          edgeId = item.property.value + "_" + item.range.value;
          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            visjsData.edges.push({
              id: edgeId,
              from: item.property.value,
              to: item.range.value,
              color: "brown",
              dashes: true,
              arrows: {
                to: {
                  enabled: true,
                  type: Lineage_classes.defaultEdgeArrowType,
                  scaleFactor: 0.5
                }
              }
            });
          }
        }
      });

      if (!visjsGraph.data || !visjsGraph.data.nodes) {
        var options = {
          onclickFn: Lineage_classes.graphActions.onNodeClick,
          onRightClickFn: Lineage_classes.graphActions.showGraphPopupMenu
        };
        visjsGraph.draw("graphDiv", visjsData, options);
      } else {
        visjsGraph.data.nodes.add(visjsData.nodes);
        visjsGraph.data.edges.add(visjsData.edges);
      }
      visjsGraph.network.fit();
      self.graphInited = true;
    };

    if (Config.sources[source].schemaType == "OWL") {
      OwlSchema.initSourceSchema(source, function(err, schema) {
        if (err) return MainController.UI.message(err);
        //  var options={filter:"Filter (NOT EXISTS{?property rdfs:subPropertyOf ?x})"}

        Sparql_schema.getPropertiesRangeAndDomain(schema, propId, null, { mandatoryDomain: 0 }, function(err, result) {
          if (err) return MainController.UI.message(err);
          drawproperties(result);
        });
      });

    }

    if (Config.sources[source].schemaType == "KNOWLEDGE_GRAPH") {
      let options={}
      Sparql_OWL.getIndividualProperties(source, targetnodes, null, null, options, function(err, result) {
        if (err) return callback(err);

        result.forEach(function(item){
          item.range={value:item.object.value}
          item.rangeLabel={value:item.objectLabel.value}
          item.domain={value:item.subject.value}
          item.domainLabel={value:item.subjectLabel.value}

        })
        drawproperties(result);

      })
    }
  };
  self.graphActions = {
    expandNode: function(node, _point, _event) {
      self.drawGraph(node);
    },
    showNodeInfos: function() {
      SourceBrowser.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode.id, "mainDialogDiv");
    }
  };


  self.searchAllSourcesTerm = function() {

    var term = $("#LineageProperties_searchAllSourcesTermInput").val();
    if (!term || term == "") term == null; // return

    var exactMatch = $("#LineageProperties_allExactMatchSearchCBX").prop("checked");
    var searchAllSources = $("#LineageProperties_searchInAllSources").prop("checked");
    var searchType = $("#LineageProperties_searchAllType").val();
    //if (searchType)
      var searchedSources = [];
    if (searchAllSources) {
      for (var sourceLabel in Config.sources) {
        if (Config.sources[sourceLabel].schemaType == "OWL") searchedSources.push(sourceLabel);
      }
    } else {
      if (!Lineage_common.currentSource) return alert("select a source or search in all source");
      searchedSources.push(Lineage_common.currentSource);
    }
    var jstreeData = [];
    var uniqueIds = {};

    async.eachSeries(
      searchedSources,
      function(sourceLabel, callbackEach) {
        //  setTimeout(function () {

        MainController.UI.message("searching in " + sourceLabel);
        //  }, 100)

        self.getPropertiesjsTreeData(sourceLabel, null, term, {
          exactMatch: exactMatch,
          justPropertyAndLabel: 1,
          searchType: searchType
        }, function(err, result) {
          if (err) return callbackEach(err);

          result.forEach(function(item) {
            if (!uniqueIds[item.id]) {
              uniqueIds[item.id] = 1;
              item.parent = sourceLabel;
              jstreeData.push(item);
            }
          });

          /*  jstreeData.forEach(function (item) {
                if (!uniqueIds[item.parent]) item.parent = sourceLabel;
            });*/
          if (result.length > 0) {
            var text = "<span class='searched_conceptSource'>" + sourceLabel + "</span>";
            jstreeData.push({ id: sourceLabel, text: text, parent: "#", data: { source: sourceLabel } });
          }

          callbackEach();
        });
      },
      function(err) {
        if (err) MainController.UI.message(err, true);

        if (jstreeData.length == 0)
          $("#Lineage_propertiesTree").html("no properties found");

        MainController.UI.message(jstreeData.length + " nodes found", true);
        var options = { selectTreeNodeFn: Lineage_properties.onTreeNodeClick, openAll: true };
        options.contextMenu = self.jstreeContextMenu();
        common.jstree.loadJsTree("Lineage_propertiesTree", jstreeData, options);
      }
    );
  };

  return self;
})();
