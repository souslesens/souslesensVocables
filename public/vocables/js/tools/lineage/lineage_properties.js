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

          SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode, "mainDialogDiv", { resetVisited: 1 }, function(_err, _result) {
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

    if (!options.searchType || options.searchType == "Property") options.filter = Sparql_common.setFilter("prop", null, words, options);
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


  self.exportRangeAndDomainsGraph = function(property) {
    var targetnodes = null;
    var nodesSelection = $("#LineagePropertie_nodesSelectionSelect").val();
    nodesSelection = false;
    if (visjsGraph.data && visjsGraph.data.nodes && nodesSelection == "currentGraphNodes") {
      targetnodes = visjsGraph.data.nodes.getIds();
    }
    self.getRangeAndDomainsGraph(property, function(err, result) {
      if (err)
        return alert(err.responseText);
      var strAll = "domainLabel\tsubPropertyLabel\tpropertyLabel\trangeLabel\tinversePropertyURI\t--\tdomainURI\tsubPropertyURI\tpropertyURI\trangeURI\tinversePropertyURI\n";

      var uniqueLines = {};

      result.forEach(function(item) {
        var ok = 0;
        if (targetnodes) {
          if (item.range && targetnodes.indexOf(item.range.value) > -1) ok = 1;
          else if (item.domain && targetnodes.indexOf(item.domain.value) > -1) ok = 1;

          if (!ok) return;
        }
        var str = "";
        str += (item.domainLabel ? item.domainLabel.value : "") + "\t";
        str += (item.subPropertyLabel ? item.subPropertyLabel.value : "") + "\t";
        str += (item.propertyLabel ? item.propertyLabel.value : "") + "\t";
        str += (item.rangeLabel ? item.rangeLabel.value : "") + "\t";
        str += (item.inversePropertyLabel ? item.inversePropertyLabel.value : "") + "\t";
        str += "" + "\t";
        str += (item.domain ? item.domain.value : "") + "\t";
        str += (item.subProperty ? item.subProperty.value : "") + "\t";
        str += (item.property ? item.property.value : "") + "\t";
        str += (item.inverseProperty ? item.inverseProperty.value : "") + "\t";
        str += (item.range ? item.range.value : "");

// needs to remove duplicates why ??
        if (!uniqueLines[str]){
          uniqueLines[str] = 1;
          strAll += str + "\n";
        }
      });

      common.copyTextToClipboard(strAll);

    });
  };

  self.drawRangeAndDomainsGraph = function(property) {
    var targetnodes = null;
    var nodesSelection = $("#LineagePropertie_nodesSelectionSelect").val();
    nodesSelection = false;
    if (visjsGraph.data && visjsGraph.data.nodes && nodesSelection == "currentGraphNodes") {
      targetnodes = visjsGraph.data.nodes.getIds();
    }

    self.getRangeAndDomainsGraph(property, function(err, result) {
      if (err)
        return alert(err.responseText);
      var visjsData = { nodes: [], edges: [] };
      var existingNodes = {};
      if (visjsGraph.data && visjsGraph.data.nodes) existingNodes = visjsGraph.getExistingIdsMap();
      var color = Lineage_classes.getSourceColor(Lineage_common.currentSource);

      var classShape = "dot";
      var propColor = "#ddd";
      var propShape = "box";

      result.forEach(function(item) {
        var ok = 0;
        if (targetnodes) {
          if (item.range && targetnodes.indexOf(item.range.value) > -1) ok = 1;
          else if (item.domain && targetnodes.indexOf(item.domain.value) > -1) ok = 1;

          if (!ok) return;
        }
        if (item.property.value.indexOf("#type") > -1 && item.property.value.indexOf("#label") > -1) return;

        if (!existingNodes[item.property.value]) {
          let label = item.propertyLabel ? item.propertyLabel.value : Sparql_common.getLabelFromURI(item.property.value);
          existingNodes[item.property.value] = 1;
          visjsData.nodes.push({
            id: item.property.value,
            label: label,
            data: {
              id: item.property.value,
              label: label,
              subProperties: [],
              source: Lineage_common.currentSource
            },
            size: self.defaultShapeSize,
            color: propColor,
            shape: propShape,
            font: { color: "blue", size: 12 }
          });
        }

        if (item.subProperty) {
          var subProperty = item.subProperty.value;
          let label = item.subPropertyLabel ? item.subPropertyLabel.value : Sparql_common.getLabelFromURI(item.subProperty.value);
          if (!existingNodes[subProperty]) {
            existingNodes[subProperty] = 1;
            visjsData.nodes.push({
              id: subProperty,
              label: label,
              data: {
                id: subProperty,
                label: label,
                subProperties: [],
                source: Lineage_common.currentSource
              },
              font: { color: "blue", size: 12 },
              size: self.defaultShapeSize,
              color: propColor,
              shape: propShape
            });
          }
          var edgeId = item.property.value + "_" + subProperty;
          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            visjsData.edges.push({
              id: edgeId,
              from: item.property.value,
              to: subProperty,
              // label: "range"
              color: Lineage_classes.defaultEdgeColor,
              //  dashes: true,
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

        if (item.range) {
          if (!existingNodes[item.range.value]) {
            if (item.rangeType) {
              if (item.rangeType.value.indexOf("Class") > -1) shape = Lineage_classes.defaultShape;
              if (item.rangeType.value.indexOf("property") > -1) shape = self.defaultShape;
            }
            existingNodes[item.range.value] = 1;
            let rangeLabel = item.rangeLabel ? item.rangeLabel.value : Sparql_common.getLabelFromURI(item.range.value);
            visjsData.nodes.push({
              id: item.range.value,
              label: rangeLabel,
              data: {
                id: item.range.value,
                label: rangeLabel,
                source: Lineage_common.currentSource
              },
              size: self.defaultShapeSize,
              color: color,
              shape: classShape
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
              // dashes: true,
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
            let domainLabel = item.domainLabel ? item.domainLabel.value : Sparql_common.getLabelFromURI(item.domain.value);
            visjsData.nodes.push({
              id: item.domain.value,
              label: domainLabel,
              data: {
                id: item.domain.value,
                label: domainLabel,
                source: Lineage_common.currentSource
              },
              color: color,
              size: self.defaultShapeSize,
              shape: classShape
            });
          }
          edgeId = item.property.value + "_" + item.domain.value;
          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            visjsData.edges.push({
              id: edgeId,
              from: item.property.value,
              to: item.domain.value,
              color: "green",
              //  dashes: true
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
              shape: classShape
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
              //  dashes: true,
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

        if (item.inverseProperty) {
          if (!existingNodes[item.inverseProperty.value]) {
            existingNodes[item.inverseProperty.value] = 1;
            var propLabel = item.inversePropertyLabel ? item.inversePropertyLabel.value : Sparql_common.getLabelFromURI(item.inverseProperty.value);
            visjsData.nodes.push({
              id: item.inverseProperty.value,
              label: propLabel,
              data: {
                id: item.inverseProperty.value,
                label: propLabel,
                source: Lineage_common.currentSource
              },
              color: propColor,
              size: self.defaultShapeSize,
              shape: propShape
            });
          }
          edgeId = item.inverseProperty.value + "_" + item.property.value;
          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            visjsData.edges.push({
              id: edgeId,
              from: item.property.value,
              to: item.inverseProperty.value,
              color: "blue",
              //label: "inverseOf",
              dashes: true
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

    });
  };


  self.getRangeAndDomainsGraph = function(property, callback) {

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

    // Sparql_OWL.getObjectProperties(Lineage_common.currentSource, null, {propIds:[propId]}, function (err, result) {


    if (propId && Config.sources[source].schemaType == "OWL") {
      OwlSchema.initSourceSchema(source, function(err, schema) {
        if (err) return callback(err);
        //  var options={filter:"Filter (NOT EXISTS{?property rdfs:subPropertyOf ?x})"}

        Sparql_schema.getPropertiesRangeAndDomain(schema, propId, null, { mandatoryDomain: 0 }, function(err, result) {
          if (err) return callback(err);
          return callback(null, result);

        });
      });
    } else if (Config.sources[source].schemaType == "OWL") {
      Sparql_OWL.getInferredPropertiesDomainsAndRanges(source, {}, function(err, result) {
        if (err) return callback(err);

        result.forEach(function(item) {
          item.property = item.prop;
          item.propertyLabel = item.propLabel;
          item.domain = item.propDomain;
          item.domainLabel = item.propDomainLabel;
          item.range = item.propRange;
          item.rangeLabel = item.propRangeLabel;
          item.subProperty = item.subProp;
          item.inverseProperty = item.inverseProp;
          item.subPropertyLabel = item.subPropLabel;
          item.inversePropertyLabel = item.inversePropLabel;
        });
        Sparql_OWL.getPropertiesWithoutDomainsAndRanges(source, {}, function(err, result2) {
          if (err) return alert(err);

          result2.forEach(function(item) {
            item.property = item.prop;
            item.propertyLabel = item.propLabel;
            item.subProperty = item.subProp;
            item.inverseProperty = item.inverseProp;
            item.subPropertyLabel = item.subPropLabel;
            item.inversePropertyLabel = item.inversePropLabel;
          });
          result = result.concat(result2);

          return callback(null, result);
        });
      });
    } else if (Config.sources[source].schemaType == "KNOWLEDGE_GRAPH") {
      let options = {};
      Sparql_OWL.getIndividualProperties(source, targetnodes, null, null, options, function(err, result) {
        if (err) return callback(err);

        result.forEach(function(item) {
          item.range = { value: item.object.value };
          item.rangeLabel = { value: item.objectLabel.value };
          item.domain = { value: item.subject.value };
          item.domainLabel = { value: item.subjectLabel.value };
        });
        return callback(null, result);
      });
    }
  };

  self.graphActions = {
    expandNode: function(node, _point, _event) {
      self.drawGraph(node);
    },
    showNodeInfos: function() {
      SourceBrowser.showNodeInfos(self.currentGraphNode.data.source, self.currentGraphNode, "mainDialogDiv");
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

        self.getPropertiesjsTreeData(
          sourceLabel,
          null,
          term,
          {
            exactMatch: exactMatch,
            justPropertyAndLabel: 1,
            searchType: searchType
          },
          function(err, result) {
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
          }
        );
      },
      function(err) {
        if (err) MainController.UI.message(err, true);

        if (jstreeData.length == 0) $("#Lineage_propertiesTree").html("no properties found");

        MainController.UI.message(jstreeData.length + " nodes found", true);
        var options = { selectTreeNodeFn: Lineage_properties.onTreeNodeClick, openAll: true };
        options.contextMenu = self.jstreeContextMenu();
        common.jstree.loadJsTree("Lineage_propertiesTree", jstreeData, options);
      }
    );
  };

  self.drawPropsRangeAndDomainMatrix = function(source) {
    var classes = [];
    var matrixMap = {};
    async.series(
      [
        //list classes and init matrixMap
        function(callbackSeries) {
          Sparql_OWL.getDictionary(source, null, null, function(err, result) {
            if (err) return callback(err);
            result.forEach(function(item) {
              classes.push(item.id.value);
            });
            classes.forEach(function(aClass1) {
              matrixMap[aClass1] = {};

              classes.forEach(function(aClass2) {
                matrixMap[aClass1][aClass2] = "";
              });
            });
            return callbackSeries();
          });
        },
        //get props ranges and domains
        function(callbackSeries) {
          Sparql_OWL.getInferredPropertiesDomainsAndRanges(source, {}, function(err, result) {
            if (err) return callback(err);
            result.forEach(function(item) {
              var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value);
              if (item.domain && item.range) matrixMap[item.domain.value][item.range.value] = propLabel;
              else if (item.domain) matrixMap[item.domain.value]["isDomain"] = propLabel;
              else if (item.range) matrixMap[item.range.value]["isRange"] = propLabel;
            });
            return callbackSeries();
          });
        },
        //draw matrix
        function(callbackSeries) {
          var cols = [];
          var dataSet = [];

          var domainsRow = [""];
          classes.forEach(function(aClass1, index1) {
            let class1Label = Sparql_common.getLabelFromURI(aClass1);
            cols.push({ title: class1Label, defaultContent: "" });

            let row = [];
            var cell = "";

            if (matrixMap[aClass1]["isRange"]) cell += matrixMap[aClass1]["isRange"];
            row.push(cell);

            classes.forEach(function(aClass2) {
              if (index1 == 0) {
                var cell = "";
                if (matrixMap[aClass2]["isDomain"]) cell = matrixMap[aClass2]["isDomain"];
                domainsRow.push(cell);
              }
              var cell = "";
              if (matrixMap[aClass1][aClass2]) cell = matrixMap[aClass1][aClass2];

              row.push(cell);
            });
            dataSet.push(row);
          });
          dataSet.splice(0, 0, domainsRow);
          cols.splice(0, 0, { title: "any", defaultContent: "" });
          let x = dataSet;
          Export.showDataTable(null, cols, dataSet);
          return callbackSeries();
        }
      ],

      function(err) {
      }
    );
  };
  return self;
})();
