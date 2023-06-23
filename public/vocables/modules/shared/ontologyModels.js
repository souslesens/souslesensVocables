import Sparql_common from "../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import Lineage_axioms_draw from "../tools/lineage/lineage_axioms_draw.js";


// eslint-disable-next-line no-global-assign
var OntologyModels = (function() {
    self.registerSourcesModel = function(sources, callback) {
      if (!Array.isArray(sources)) {
        sources = [sources];
      }

      let url = Config.default_sparql_url + "?format=json&query=";

      var queryP = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" + "PREFIX owl: <http://www.w3.org/2002/07/owl#>";

      async.eachSeries(
        sources,
        function(source, callbackEach) {
          var graphUri;
          if (!Config.ontologiesVocabularyModels[source]) {
            if (!Config.sources[source]) {
              return MainController.UI.message("source " + source + " not allowed for user ");
            }
            graphUri = Config.sources[source].graphUri;
            if (!graphUri) {
              return callback();
            }
            Config.ontologiesVocabularyModels[source] = { graphUri: graphUri };
          }

          graphUri = Config.ontologiesVocabularyModels[source].graphUri;

          Config.ontologiesVocabularyModels[source].constraints = {}; //range and domain
          Config.ontologiesVocabularyModels[source].restrictions = {};
          Config.ontologiesVocabularyModels[source].classes = {};
          Config.ontologiesVocabularyModels[source].properties = [];

          var uniqueProperties = {};
          var propsWithoutDomain = [];
          var propsWithoutRange = [];
          var inversePropsMap = [];
          async.series(
            [
              // set properties
              function(callbackSeries) {
                var query =
                  queryP +
                  " SELECT distinct ?prop ?propLabel ?inverseProp ?superProperty from <" +
                  graphUri +
                  ">  WHERE {\n" +
                  "  ?prop ?p ?o optional{?prop rdfs:label ?propLabel}" +
                  "optional{?prop owl:inverseOf ?inverseProp}" +
                  "optional{?prop rdfs:subPropertyOf ?superProperty}" +
                  " VALUES ?o {rdf:Property owl:ObjectProperty owl:OntologyProperty owl:AnnotationProperty} }";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function(err, result) {
                  if (err) {
                    return callbackSeries(err);
                  }

                  result.results.bindings.forEach(function(item) {
                    if (item.superProperty) {
                      var x = 3;
                    }
                    if (!uniqueProperties[item.prop.value]) {
                      uniqueProperties[item.prop.value] = 1;
                      Config.ontologiesVocabularyModels[source].properties.push({
                        id: item.prop.value,
                        label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value),
                        inverseProp: item.inverseProp ? item.inverseProp.value : null,
                        superProp: item.superProperty ? item.superProperty.value : null
                      });
                    }
                    if (item.inverseProp) {
                      inversePropsMap[item.prop.value] = item.inverseProp.value;
                    }


                  });

                  callbackSeries();
                });
              },
              // set model classes (if source not  declared in sources.json)
              function(callbackSeries) {
                if (!Config.basicVocabularies[source] && !Config.topLevelOntologies[source]) {
                  return callbackSeries();
                }
                var query =
                  queryP +
                  " select distinct ?sub ?subLabel FROM <" +
                  graphUri +
                  "> where{" +
                  " ?sub rdf:type ?class. OPTIONAL{ ?sub rdfs:label ?subLabel} VALUES ?class {owl:Class rdf:class rdfs:Class} filter( !isBlank(?sub))} order by ?sub";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function(err, result) {
                  if (err) {
                    return callbackSeries(err);
                  }
                  result.results.bindings.forEach(function(item) {
                    if (!Config.ontologiesVocabularyModels[source].classes[item.sub.value]) {
                      Config.ontologiesVocabularyModels[source].classes[item.sub.value] = {
                        id: item.sub.value,
                        label: item.subLabel ? item.subLabel.value : Sparql_common.getLabelFromURI(item.sub.value)
                      };
                    }
                  });
                  callbackSeries();
                });
              },

              //set domain constraints
              function(callbackSeries) {
                var query = queryP + "" + " select distinct ?prop ?domain FROM <" + graphUri + "> where{" + " ?prop rdfs:domain ?domain." + "OPTIONAL{ ?domain rdfs:label ?domainLabel} }";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function(err, result) {
                  if (err) {
                    return callbackSeries(err);
                  }
                  result.results.bindings.forEach(function(item) {
                    if (!Config.ontologiesVocabularyModels[source].constraints[item.prop.value]) {
                      Config.ontologiesVocabularyModels[source].constraints[item.prop.value] = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                    }
                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].domain = item.domain.value;
                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].domainLabel = item.domainLabel
                      ? item.domainLabel.value
                      : Sparql_common.getLabelFromURI(item.domain.value);
                  });
                  callbackSeries();
                });
              },
              //set range constraints
              function(callbackSeries) {
                var query = queryP + " select distinct ?prop ?range FROM <" + graphUri + "> where{" + " ?prop rdfs:range ?range.OPTIONAL{ ?range rdfs:label ?rangeLabel} }";
                Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function(err, result) {
                  if (err) {
                    return callbackSeries(err);
                  }
                  result.results.bindings.forEach(function(item) {
                    if (!Config.ontologiesVocabularyModels[source].constraints[item.prop.value]) {
                      Config.ontologiesVocabularyModels[source].constraints[item.prop.value] = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                    }
                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].range = item.range.value;
                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].rangeLabel = item.rangeLabel
                      ? item.rangeLabel.value
                      : Sparql_common.getLabelFromURI(item.range.value);
                  });
                  callbackSeries();
                });
              },

              //set inverse Props constraints
              function(callbackSeries) {
                for (var propId in inversePropsMap) {
                  var propConstraints = Config.ontologiesVocabularyModels[source].constraints[propId];
                  var inversePropConstraints = Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]];
                  if (!propConstraints) {
                    propConstraints = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                    Config.ontologiesVocabularyModels[source].constraints[propId] = propConstraints;
                  }
                  if (!inversePropConstraints) {
                    inversePropConstraints = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                    Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]] = inversePropConstraints;
                  }

                  if (propConstraints.domain && !inversePropConstraints.range) {
                    Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].range = propConstraints.domain;
                    Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].rangeLabel = propConstraints.domainLabel;
                  }
                  if (propConstraints.range && !inversePropConstraints.domain) {
                    Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].domain = propConstraints.range;
                    Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].domainLabel = propConstraints.rangeLabel;
                  }

                  if (inversePropConstraints.domain && !propConstraints.range) {
                    Config.ontologiesVocabularyModels[source].constraints[propId].range = inversePropConstraints.domain;
                    Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = inversePropConstraints.domainLabel;
                  }
                  if (inversePropConstraints.range && !propConstraints.domain) {
                    Config.ontologiesVocabularyModels[source].constraints[propId].domain = inversePropConstraints.range;
                    Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = inversePropConstraints.rangeLabel;
                  }
                }
                callbackSeries();
              },
              // set retrictions constraints
              function(callbackSeries) {
                // only relations  declared in sources.json
                if (!Config.sources[source]) {
                  return callbackSeries();
                }
                Sparql_OWL.getObjectRestrictions(source, null, { withoutBlankNodes: 1, withoutImports: 1 }, function(err, result) {
                  result.forEach(function(item) {
                    var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value);
                    var domainLabel = item.subjectLabel ? item.subjectLabel.value : Sparql_common.getLabelFromURI(item.subject.value);
                    var rangeLabel = item.valueLabel ? item.valueLabel.value : Sparql_common.getLabelFromURI(item.value.value);
                    var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value);

                    if (!uniqueProperties[item.prop.value]) {
                      uniqueProperties[item.prop.value] = 1;
                      Config.ontologiesVocabularyModels[source].properties.push({
                        id: item.prop.value,
                        label: propLabel
                      });
                    }
                    if (!Config.ontologiesVocabularyModels[source].restrictions[item.prop.value]) {
                      Config.ontologiesVocabularyModels[source].restrictions[item.prop.value] = [];
                    }
                    Config.ontologiesVocabularyModels[source].restrictions[item.prop.value].push({
                      domain: item.subject.value,
                      range: item.value.value,
                      domainLabel: domainLabel,
                      rangeLabel: rangeLabel
                    });
                  });

                  callbackSeries();
                });
              },

              //set inherited Constraints
              function(callbackSeries) {
                if (!Config.sources[source] || !Config.topLevelOntologies[source]) {
                  return callbackSeries();
                }
                var constraints = Config.ontologiesVocabularyModels[source].constraints;
                Config.ontologiesVocabularyModels[source].properties.forEach(function(prop) {
                  if (!constraints[prop.id]) {
                    propsWithoutDomain.push(prop.id);
                    propsWithoutRange.push(prop.id);
                  }
                  else {
                    if (!constraints[prop.id].domain) {
                      propsWithoutDomain.push(prop.id);
                    }
                    if (!constraints[prop.id].range) {
                      propsWithoutRange.push(prop.id);
                    }
                  }
                });
                callbackSeries();
              },

              //set inherited domains
              function(callbackSeries) {
                if (propsWithoutDomain.length == 0) {
                  return callbackSeries();
                }
                var props = propsWithoutDomain.concat(propsWithoutRange);
                Sparql_OWL.getPropertiesInheritedConstraints(source, props, {}, function(err, propsMap) {
                  if (err) {
                    return callbackSeries(err);
                  }

                  for (var propId in propsMap) {
                    var constraint = propsMap[propId];
                    if (!Config.ontologiesVocabularyModels[source].constraints[propId]) {
                      Config.ontologiesVocabularyModels[source].constraints[propId] = { domain: "", range: "" };
                    }

                    if (constraint.domain && !Config.ontologiesVocabularyModels[source].constraints[propId].domain) {
                      Config.ontologiesVocabularyModels[source].constraints[propId].domain = constraint.domain;
                      Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = constraint.domainLabel;
                      Config.ontologiesVocabularyModels[source].constraints[propId].domainParentProperty = constraint.parentProp;
                    }

                    if (constraint.range && !Config.ontologiesVocabularyModels[source].constraints[propId].range) {
                      Config.ontologiesVocabularyModels[source].constraints[propId].range = constraint.range;
                      Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = constraint.rangeLabel;
                      Config.ontologiesVocabularyModels[source].constraints[propId].rangeParentProperty = constraint.parentProp;
                    }
                  }

                  return callbackSeries();
                });
              },

              // set constraints prop label and superProp
              function(callbackSeries) {
                Config.ontologiesVocabularyModels[source].properties.forEach(function(property) {
                  if (Config.ontologiesVocabularyModels[source].constraints[property.id]) {
                    Config.ontologiesVocabularyModels[source].constraints[property.id].label = property.label;

                    Config.ontologiesVocabularyModels[source].constraints[property.id].superProp = property.superProp
                    ;
                  }
                });
                return callbackSeries();
              },


              // set transSourceRangeAndDomainLabels
              function(callbackSeries) {

                if (!Config.sources[source]) {
                  return callbackSeries();
                }
                var classes = [];
                for (var propId in Config.ontologiesVocabularyModels[source].constraints) {
                  var constraint = Config.ontologiesVocabularyModels[source].constraints[propId];
                  if (constraint.domain && classes.indexOf(constraint.domain) < 0) {
                    classes.push(constraint.domain);
                  }
                  if (constraint.range && classes.indexOf(constraint.range) < 0) {
                    classes.push(constraint.range);
                  }
                }
                var filter = Sparql_common.setFilter("id", classes);
                Sparql_OWL.getDictionary(source, { lang: Config.default_lang, filter: filter }, null, function(err, result) {
                  if (err) {
                    return callbackSeries(err);
                  }
                  var labelsMap = {};
                  result.forEach(function(item) {
                    if (item.label) {
                      labelsMap[item.id.value] = item.label.value;
                    }

                  });
                  for (var propId in Config.ontologiesVocabularyModels[source].constraints) {
                    var constraint = Config.ontologiesVocabularyModels[source].constraints[propId];
                    if (labelsMap[constraint.domain]) {
                      Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = labelsMap[constraint.domain];
                    }
                    if (labelsMap[constraint.range]) {
                      Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = labelsMap[constraint.range];
                    }
                  }

                  return callbackSeries();
                });

              },


              //register source in Config.sources
              function(callbackSeries) {
                if (!Config.sources[source]) {
                  Config.sources[source] = { graphUri: graphUri, controllerName: Sparql_OWL, controller: Sparql_OWL, sparql_server: { url: Config.default_sparql_url } };
                }
                return callbackSeries();
              }
            ],
            function(err) {
              callbackEach(err);
            }
          );
        },
        function(err) {
          if (callback) {
            return callback(err);
          }
        }
      );
    };

    self.unRegisterSourceModel = function() {
      var basicsSources = Object.keys(Config.basicVocabularies);
      for (var source in Config.ontologiesVocabularyModels) {
        if (basicsSources.indexOf(source) < 0) {
          delete Config.ontologiesVocabularyModels[source];
        }
      }
    };

    self.getAllowedPropertiesBetweenNodes = function(source, startNodeId, endNodeId, callback) {
      var startNodeAncestors = [];
      var endNodeAncestors = [];
      Sparql_OWL.getNodesAncestors(source, [startNodeId, endNodeId], { excludeItself: 0 }, function(err, result) {
        if (err) {
          return callbackSeries(err);
        }

        var allSources = [source];
        if (Config.sources[source].imports) {
          allSources = allSources.concat(Config.sources[source].imports);
        }

        var allConstraints = {};
        var allDomains = {};
        var allRanges = {};
        allSources.forEach(function(_source) {
          var sourceConstraints = Config.ontologiesVocabularyModels[_source].constraints;
          for (var property in sourceConstraints) {

            var constraint = sourceConstraints[property];
            constraint.source=_source
            allConstraints[property] = constraint;
            if (constraint.domain) {
              if (!allDomains[constraint.domain]) {
                allDomains[constraint.domain] = [];
              }
              allDomains[constraint.domain].push(property);
            }
            if (constraint.range) {
              if (!allRanges[constraint.range]) {
                allRanges[constraint.range] = [];
              }
              allRanges[constraint.range].push(property);
            }
          }

        });


        var validConstraints = {

        };
        var stop=false
        result.hierarchies[startNodeId].forEach(function(item) {
          if(stop)
            return;
          var superClass=item.superClass.value
          if (allDomains[superClass]) {
            stop=true
            allDomains[superClass].forEach(function(property) {
              if ( result.hierarchies[endNodeId].indexOf(allConstraints[property].range)>-1) {
                stop=true
                if(!validConstraints[property]) {
                  allConstraints[property].group = "both"
                  validConstraints[property]=allConstraints[property]
                }
              }
              else{
                if(!validConstraints[property]) {
                  allConstraints[property].group = "domain"
                  validConstraints[property]=allConstraints[property]
                }
              }
            });
          }else{

          }
        });
        var stop=false
        result.hierarchies[endNodeId].forEach(function(item) {
          if(stop)
            return;
          var superClass=item.superClass.value
          if (allRanges[superClass]) {
            allDomains[superClass].forEach(function(property) {
              stop=true
              if ( result.hierarchies[startNodeId].indexOf(allConstraints[property].domain)>-1) {
                if(!validConstraints[property]) {
                  allConstraints[property].group="both"
                  validConstraints[property]=allConstraints[property]
                }
              }
              else{
                if(!validConstraints[property]) {
                  allConstraints[property].group = "range"
                  validConstraints[property]=allConstraints[property]
                }
              }
            });
          }else{

          }
        });


        return callback( null, validConstraints)

      });
    };


    self.getAllowedPropertiesBetweenNodesXX = function(source, startNodeId, endNodeId, callback) {

      var levels = 0;

      function extractClassHierarchyFromAxiomsVisjData(visjsData) {
        var classHierarchy = [];
        var classNodesMap = {};
        visjsData.nodes.forEach(function(node) {
          if (node.data.type == "http://www.w3.org/2002/07/owl#Class") {
            classNodesMap[node.id] = node;
          }
        });

        visjsData.edges.forEach(function(edge) {
          if (classNodesMap[edge.from]) {
            if (classHierarchy.indexOf(edge.from) < 0) {
              classHierarchy.push(edge.from);
            }
          }
        });
        return classHierarchy;
      }

      var properties = {};
      var propertiesByLevel = [];

      var startNode = {
        id: startNodeId,
        axioms: {},
        classHierarchy: [],
        objectProperties: []
      };

      var endNode = {
        id: endNodeId,
        axioms: {},
        classHierarchy: [],
        objectProperties: []
      };

      async.series(
        [


          //get startNodeAxioms
          function(callbackSeries) {
            Lineage_axioms_draw.drawNodeAxioms(source, startNodeId, null, 4, {}, function(err, result) {
              if (err) {
                return callbackSeries(err);
              }
              startNode.axioms = result;
              startNode.classHierarchy = extractClassHierarchyFromAxiomsVisjData(result);
              return callbackSeries();

            });
          },
          //get endNodeAxioms
          function(callbackSeries) {


            Lineage_axioms_draw.drawNodeAxioms(source, endNodeId, null, 4, {}, function(err, result) {
              if (err) {
                return callbackSeries(err);
              }
              endNode.axioms = result;
              endNode.classHierarchy = extractClassHierarchyFromAxiomsVisjData(result);
              return callbackSeries();


            });
          }
          ,

          function(callbackSeries) {
            var nodesMap = {};
            startNode.axioms.nodes.forEach(function(node) {
              if (node.data.type == "http://www.w3.org/2002/07/owl#Class") {
                nodesMap[node.id] = node;
              }
            });

            startNode.classHierarchy.forEach(function(classId) {

              var node = nodesMap[classId];
              var classSource = node.data.source;

              if (Config.ontologiesVocabularyModels[classSource] && Config.ontologiesVocabularyModels[classSource].constraints) {
                for (var key in Config.ontologiesVocabularyModels[classSource].constraints) {
                  var constraint = Config.ontologiesVocabularyModels[classSource].constraints[key];

                  constraint.source = classSource;
                  constraint.level = node.level;
                  levels = Math.max(levels, node.level);
                  if (!constraint.domain) {
                    if (!constraint.range) {
                      constraint.group = "noConstaints";

                    }
                    else if (endNode.classHierarchy.indexOf(constraint.range) > -1) {
                      constraint.group = "range";
                    }
                  }
                  else if (constraint.domain == classId) {
                    if (endNode.classHierarchy.indexOf(constraint.range) > -1) {
                      constraint.group = "both";
                    }
                    else {
                      constraint.group = "domain";
                    }
                  }

                  if (constraint.group) {
                    properties[key] = constraint;
                  }


                }
              }


            });


            return callbackSeries();
          },
//set superProperty
          function(callbackSeries) {

            return callbackSeries();
          },


          //   delete properties with domain and range that are ancestors of property both
          function(callbackSeries) {


            var existsBothGroup = false;
            for (var propId in properties) {
              var property = properties[propId];
              if (!property.group != "noConstaints") {
                existsBothGroup = true;

              }
            }
            if (!existsBothGroup) {
              return callbackSeries();
            }

            var startNodeAncestors = [];
            var endNodeAncestors = [];
            Sparql_OWL.getNodesAncestors(source, startNodeId, { excludeItself: 1 }, function(err, result) {
              if (err) {
                return callbackSeries(err);
              }
              result.forEach(function(item) {
                startNodeAncestors.push(item.superClass.value);
              });
              Sparql_OWL.getNodesAncestors(source, endNodeId, { excludeItself: 1 }, function(err, result) {
                if (err) {
                  return callbackSeries(err);
                }
                result.forEach(function(item) {
                  endNodeAncestors.push(item.superClass.value);
                });

                for (var propId in properties) {
                  var property = properties[propId];
                  if (startNodeAncestors.indexOf(property.domain) > -1) {
                    delete properties[propId];
                  }
                  if (endNodeAncestors.indexOf(property.range) > -1) {
                    delete properties[propId];
                  }
                }


                return callbackSeries();
              });
            });
          }


        ],

        function(err) {
          if (err) {
            return callback(err);
          }
          return callback(null, properties);
        }
      )
      ;


    };


    return self;
  }
)
();

export default OntologyModels;

window.OntologyModels = OntologyModels;
