import Sparql_common from "../../sparqlProxies/sparql_common.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Lineage_sources from "./lineage_sources.js";
import VisjsUtil from "../../graph/visjsUtil.js";
import visjsGraph from "../../graph/visjsGraph2.js";
import Lineage_classes from "./lineage_classes.js";


var Lineage_axioms = (function() {
  var self = {};

  /*  self.getAllBasicAxioms = function(sourceLabel, callback) {
      if (!sourceLabel) {
        sourceLabel = Lineage_sources.activeSource;
      }

      var fromStr = Sparql_common.getFromStr(sourceLabel);
      var query =
        "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
        "SELECT distinct * " + fromStr + " WHERE {" +
        "  ?X ?p_x ?x ." +
        "  { select ?x ?p_iu ?iu ?p_y ?y ?p_bn ?bn ?p_bny ?bny from <https://purl.industrialontologies.org/ontology/core/Core>  from <https://purl.industrialontologies.org/ontology/core/Core> where{" +
        "  ?x  (owl:intersectionOf|owl:union) ?iu." +
        "     ?x  ?p_iu ?iu." +
        "optional{ ?iu ?p_y ?y." +
        "  filter (!isBlank(?y))}" +
        "  " +
        "  optional{ ?iu ?p_bn ?bn." +
        "  filter (isBlank(?bn))" +
        "?bn  ?p_bny ?bny" +
        "  " +
        "      }" +
        "    }" +
        "  " +
        "  }" +
        "  " +
        " " +
        "}order by ?X ";

      var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";

      Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function(err, result) {
        if (err) {
          return callback(err);
        }
        result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept", { type: "http://www.w3.org/2002/07/owl#Class" });

        return callback(null, result.results.bindings);
      });
    };

    self.getMergedBasicAxioms = function(sourceLabel, callback) {
      self.getAllBasicAxioms(sourceLabel, function(err, result) {
        if (err) {
          return callback(err);
        }

        var allNodesMap = {};
        result.forEach(function(item) {
          item.axioms = {};
          allNodesMap[item.X.value] = item;
        });

        result.forEach(function(item) {
          for (var key in item) {
            if (key != "X" && item[key].type == "bnode") {
              if (allNodesMap[item[key].value]) {
                allNodesMap[item.X.value].axioms[item[key].value] = allNodesMap[item[key].value];
              }
            }
          }
        });

        callback(null, allNodesMap);
      });
    };


    self.getAxiomsWithBlankNodes = function(sourceLabel, ids, callback) {
      var fromStr = Sparql_common.getFromStr(sourceLabel);

      var filter = Sparql_common.setFilter("X", ids);
      var query =
        "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
        "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
        "SELECT distinct * " + fromStr + " WHERE {" +
        "  ?X ?p ?o . " + filter +
        "  ?X ?q ?b . " + "filter (isblank(?b))" +
        " optional{?o rdf:type ?oType}" +
        "optional{?o rdfs:label|skos:prefLabel ?oLabel}" +
        "filter (isUri(?o) || isBlank(?o))  " +
        " }limit 100";
      var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";

      Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function(err, result) {
        if (err) {
          return callback(err);
        }
        result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept", { type: "http://www.w3.org/2002/07/owl#Class" });

        return callback(null, result.results.bindings);
      });

    };


    self.getNodePredicates = function(sourceLabel, nodeIds, callback) {
      var fromStr = Sparql_common.getFromStr(sourceLabel);

      var filterStr = Sparql_common.setFilter("x", nodeIds);
      var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
        "SELECT distinct * " + fromStr +
        "where{  ?x ?p0 ?iu. \n" + filterStr+
      "    ?x  ?p_iu ?iu.\n" +"  ?x  ?p_iu ?iu.filter (!isBlank(?iu) && isUri(?iu) )"+
      "    optional{ ?iu ?p_y ?y. ?y rdf:type owl:Class.  filter (!isBlank(?y) && isUri(?y) )}  \n" +
      "    optional{ ?iu ?p_bn ?bn.  filter (isBlank(?bn))     } \n" +
      "  \n" +
      "  \n" +
      "       }order by ?X limit 100";

      var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
      Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function(err, result) {
        if (err) {
          return callback(err);
        }
        result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, "topConcept", { type: "http://www.w3.org/2002/07/owl#Class" });

        return callback(null, result.results.bindings);
      });
    };*/

  self.getNodeAxiomsTree = function(sourceLabel, nodeId, depth, callback) {
    var fromStr = Sparql_common.getFromStr(sourceLabel);

    var filterStr = "";// Sparql_common.setFilter("x", nodeIds);

    var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +

      "select  ?s ?p ?o ?sLabel ?oLabel ?pLabel " + fromStr + " where {" +
      " ?s ?p ?o. filter (?p !=rdf:type) " +
      /* " values ?p {rdf:first\n" +
       "rdf:rest\n" +
       "rdfs:domain\n" +
       "rdf:rest\n" +
       "rdfs:domain\n" +
       "rdfs:range\n" +
       "rdfs:subClassOf\n" +
       "rdfs:subPropertyOf\n" +
       "owl:allValuesFrom\n" +
       "owl:disjointWith\n" +
       "owl:equivalentClass\n" +
       "owl:intersectionOf\n" +
       "owl:inverseOf\n" +
       "owl:onProperty\n" +
       "owl:propertyChainAxiom\n" +
       "owl:someValuesFrom\n" +
       "owl:unionOf\n" +
       "  }"+*/
      "  optional {?s rdfs:label ?sLabel}\n" +
      "        optional {?o rdfs:label ?oLabel}\n" +
      "      optional {?p rdfs:label ?pLabel}" +
      " {SELECT distinct ?o " + fromStr + "  WHERE {" +
      "<" + nodeId + "> (<>|!<>){1," + depth + "} ?o filter (isIri(?o))}}}";


    var url = Config.sources[sourceLabel].sparql_server.url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function(err, result) {
      if (err) {
        return callback(err);
      }

      return callback(null, result.results.bindings);
    });

  };


  self.processAxioms = function(sourceLabel, nodeId, callback) {


    var nodeId = "https://purl.industrialontologies.org/ontology/core/Core/BuyingBusinessProcess";

    var sourceLabel = Lineage_sources.activeSource;

    self.getNodeAxiomsTree(sourceLabel, nodeId, 5, function(err, result) {

      var axiomsTriples = {};


      var existingNodes = visjsGraph.getExistingIdsMap();
      var visjsData = { nodes: [], edges: [] };


      var nodesMap = {};
      var nodesToMap = {};
      var startingNodes = {};
      result.forEach(function(item) {
        if (!nodesMap[item.s.value]) {
          item.children=[]
          nodesMap[item.s.value]=item

          }
          nodesMap[item.s.value].children.push(item.o.value)



      });
      var data=[];
      var uniqueIds={}

      function recurse(nodeId,level) {
        if(uniqueIds[nodeId])
          return;
          uniqueIds[nodeId]=1
        var item= nodesMap[nodeId]

        item.children.forEach(function(child) {

          var targetItem= nodesMap[child];
          if( !targetItem)
            return;

          if (!existingNodes[item.s.value]) {
            existingNodes[item.s.value] = 1;
            visjsData.nodes.push(VisjsUtil.getVisjsNode(sourceLabel, item.s.value, item.sLabel ? item.sLabel.value : Sparql_common.getLabelFromURI(item.s.value),null,{level:level}));
          }
          if (!existingNodes[targetItem.s.value]) {
            existingNodes[targetItem.s.value] = 1;
            visjsData.nodes.push(VisjsUtil.getVisjsNode(sourceLabel, targetItem.s.value, targetItem.sLabel ? targetItem.sLabel.value : Sparql_common.getLabelFromURI(targetItem.s.value),null,{level:level+1}));
          }
          var edgeId = item.s.value + "_" + targetItem.s.value;

          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            visjsData.edges.push({
              id: edgeId,
              from: item.s.value,
              to: targetItem.s.value,
              label: Sparql_common.getLabelFromURI(item.p.value),
              arrows: {
                to: {
                  enabled: true,
                  type: "solid",
                  scaleFactor: 0.5
                }
              }
            });
          }

          recurse(targetItem.s.value,level+1)

        })
      }




         recurse(nodeId,1);





      /* result.forEach(function(item) {

          if (!existingNodes[item.s.value]) {
            existingNodes[item.s.value] = 1;
            visjsData.nodes.push(VisjsUtil.getVisjsNode(sourceLabel, item.s.value, item.sLabel ? item.sLabel.value : Sparql_common.getLabelFromURI(item.s.value)));
          }
          if (!existingNodes[item.o.value]) {
            existingNodes[item.o.value] = 1;
            visjsData.nodes.push(VisjsUtil.getVisjsNode(sourceLabel, item.o.value, item.oLabel ? item.oLabel.value : Sparql_common.getLabelFromURI(item.o.value)));
          }

          var edgeId = item.s.value + "_" + item.o.value;

          if (!existingNodes[edgeId]) {
            existingNodes[edgeId] = 1;
            visjsData.edges.push({
              id: edgeId,
              from: item.s.value,
              to: item.o.value,
              label: Sparql_common.getLabelFromURI(item.p.value),
              arrows: {
                to: {
                  enabled: true,
                  type: "solid",
                  scaleFactor: 0.5
                }
              }
            });
          }
        });*/
      var options= {
        layoutHierarchical :{
          direction: "LR",
          sortMethod: "hubsize",
          //  sortMethod:"directed",
          //    shakeTowards:"roots",
          //  sortMethod:"directed",
          levelSeparation: 200,
          //   parentCentralization: true,
          //  shakeTowards:true

          //   nodeSpacing:25,
        }
      }

        VisjsUtil.drawVisjsData(visjsData,options);

      });


  }

  return self;
  })()

export default Lineage_axioms;
window.Lineage_axioms = Lineage_axioms;
