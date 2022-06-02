// eslint-disable-next-line @typescript-eslint/no-unused-vars
// !!!!!!!!  const util = require("../../../../../bin/util.");
var Lineage_blend = (function() {
  var self = {};

  self.addNodeToAssociationNode = function(node, role, allowAddToGraphButton) {
    if (role == "source") {
      self.currentAssociation = [node.data, ""];
      $("#lineage_sourceNodeDiv").html("<span style='color:" + Lineage_classes.getSourceColor(node.data.source) + "'>" + node.data.source + "." + node.data.label + "</span>");
      $("#lineage_targetNodeDiv").html("");
    } else if (role == "target") {
      if (!self.currentAssociation) return;
      self.currentAssociation[1] = node.data;
      $("#lineage_targetNodeDiv").html("<span style='color:" + Lineage_classes.getSourceColor(node.data.source) + "'>" + node.data.source + "." + node.data.label + "</span>");
    }
    if (authentication.currentUser.groupes.indexOf("admin") > -1 && Config.sources[Lineage_classes.mainSource].editable > -1) {
      if (self.currentAssociation && self.currentAssociation.length == 2 && self.currentAssociation[1] !== "") {
        $("#lineage_createRelationButtonsDiv").css("display", "block");
        self.initAllowedPropertiesForRelation();
      } else if (self.currentAssociation && self.currentAssociation[0] !== "") {
        $("#lineage_blendCreateSubClassButton").css("display", "block");
      } else {
        $("#lineage_createRelationButtonsDiv").css("display", "none");
        $("#lineage_blendCreateSubClassButton").css("display", "none");
      }
    }

    /* $("#GenericTools_searchAllSourcesTermInput").val(node.data.label)
$("#GenericTools_searchInAllSources").prop("checked", true)*/

    if (allowAddToGraphButton) {
      $("#lineage_blendToGraphButton").css("display", "block");
    } else {
      $("#lineage_blendToGraphButton").css("display", "none");
    }
  };

  self.clearAssociationNodes = function() {
    $("#lineage_sourceNodeDiv").html("");
    $("#lineage_targetNodeDiv").html("");
    self.currentAssociation = [];
    $("#lineage_createRelationButtonsDiv").css("display", "none");
  };

  self.setNewImport = function(mainSourceLabel, importedSourceLabel, callback) {
    if (mainSourceLabel == importedSourceLabel) return callback();
    var mainSource = Config.sources[mainSourceLabel];
    if (!mainSource) return alert("nos source with label " + mainSourceLabel);
    if (!mainSource.imports) mainSource.imports = [];
    var imports = mainSource.imports.concat(mainSource);
    if (imports && imports.indexOf(importedSourceLabel) > -1) {
      return callback();
    }
    if (!confirm("add  source " + importedSourceLabel + " to imports of source " + mainSourceLabel)) return callback("stop");

    self.addImportToCurrentSource(mainSourceLabel, importedSourceLabel, function(_err, _result) {
      Lineage_classes.registerSource(importedSourceLabel);
      callback();
    });
  };

  self.createSubClass = function() {
    var sourceNode = self.currentAssociation[0];

    if (confirm("Create  for subclass of " + sourceNode.label)) {
      SourceBrowser.addProperty("http://www.w3.org/2000/01/rdf-schema#subClassOf", sourceNode.id, sourceNode.source, true);
    }
  };

  self.createRelationUI = function(type, addImportToCurrentSource, createInverseRelation) {
    var sourceNode = self.currentAssociation[0];
    var targetNode = self.currentAssociation[1];
    if (!type) type = $("#lineage_createRelationPropertySelect").val();

    if (!sourceNode || !targetNode) return alert("select a source node and a target node ");

    if (sourceNode == targetNode) return "source node and target node must be distinct ";

    createInverseRelation = $("#lineage_blendSameAsInverseCBX").prop("checked");

    if (!confirm("paste " + sourceNode.source + "." + sourceNode.label + "  as " + type + " " + targetNode.source + "." + targetNode.label + "?")) return;
    self.createRelation(Lineage_classes.mainSource, type, sourceNode, targetNode, addImportToCurrentSource, createInverseRelation, {}, function(err, _result) {
      if (err) return alert(err);
      self.addRelationToGraph(propId);
      MainController.UI.message("relation added", true);
    });
  };

  self.createRelation = function(inSource, type, sourceNode, targetNode, addImportToCurrentSource, createInverseRelation, options, callback) {
    if (type != "http://www.w3.org/2002/07/owl#sameAs") createInverseRelation = false;

    async.series(
      [
        function(callbackSeries) {
          if (!addImportToCurrentSource) return callbackSeries();
          self.setNewImport(Lineage_classes.mainSource, targetNode.source, function(err, _result) {
            callbackSeries(err);
          });
        },

        function(callbackSeries) {
          var relations = { type: type, sourceNode: sourceNode, targetNode: targetNode };
          var options = {};
          self.createRelationTriples(relations, createInverseRelation, inSource, options, function(err, _result) {
            callbackSeries(err);
          });
        }
      ],
      function(err) {
        if (err) {
          if (callback) return callback(err);
          return alert(err);
        }
        if (callback) return callback();
      }
    );
  };

  self.createRelationTriples = function(relations, createInverseRelation, inSource, options, callback) {
    var allTriples = [];
    if (!Array.isArray(relations)) relations = [relations];
    relations.forEach(function(relation) {
      var propId = relation.type;

      var restrictionTriples = self.getRestrictionTriples(relation.sourceNode.id, relation.targetNode.id, propId);
      var normalBlankNode = restrictionTriples.blankNode;
      var metadataOptions = {
        domainSourceLabel: relation.sourceNode.source,
        rangeSourceLabel: relation.targetNode.source
      };
      if (!options) options = {};
      var origin = options.origin || "manual";
      var status = options.status || "candidate";

      var metaDataTriples = self.getCommonMetaDataTriples(normalBlankNode, origin, status, metadataOptions);
      restrictionTriples = restrictionTriples.concat(metaDataTriples);

      if (createInverseRelation) {
        var restrictionTriplesInverse = self.getRestrictionTriples(relation.targetNode.id, relation.sourceNode.id, propId);
        var inverseBlankNode = restrictionTriplesInverse.blankNode;
        restrictionTriples = restrictionTriples.concat(restrictionTriplesInverse);
        var inverseMetadataOptions = {
          domainSourceLabel: relation.targetNode.source,
          rangeSourceLabel: relation.sourceNode.source
        };
        var inverseMetaDataTriples = self.getCommonMetaDataTriples(inverseBlankNode, origin, status, inverseMetadataOptions);
        restrictionTriples = restrictionTriples.concat(inverseMetaDataTriples);

        restrictionTriples.push({
          subject: normalBlankNode,
          predicate: "http://www.w3.org/2002/07/owl#inverseOf",
          object: inverseBlankNode
        });
        restrictionTriples.push({
          subject: inverseBlankNode,
          predicate: "http://www.w3.org/2002/07/owl#inverseOf",
          object: normalBlankNode
        });
      }

      allTriples = allTriples.concat(restrictionTriples);
      if (options.additionalTriples) {
        allTriplesallTriples.concat(options.additionalTriples);
      }
    });

    Sparql_generic.insertTriples(inSource, allTriples, null, function(err, _result) {
      callback(err);
    });
  };

  self.deleteRestriction = function(inSource, restrictionNode, callback) {
    if (callback || confirm("delete selected restriction")) {
      var inverseRestriction = null;

      async.series(
        [
          // delete restriction
          function(callbackSeries) {
            Sparql_generic.deleteTriples(inSource, restrictionNode.data.bNodeId, null, null, function(_err, _result) {
              callbackSeries();
            });
          },
          function(callbackSeries) {
            Sparql_generic.deleteTriples(inSource, null, null, restrictionNode.data.bNodeId, function(_err, _result) {
              callbackSeries();
            });
          },
          // search if inverse exists
          function(callbackSeries) {
            Sparql_OWL.getInverseRestriction(inSource, restrictionNode.data.bNodeId, function(err, result) {
              if (err) return callbackSeries(err);
              if (result.length == 0) return callbackSeries();
              inverseRestriction = result[0].subject.value;
              callbackSeries();
            });
          },
          // delete inverse restriction
          function(callbackSeries) {
            if (!inverseRestriction) return callbackSeries();
            Sparql_generic.deleteTriples(inSource, inverseRestriction, null, null, function(_err, _result) {
              callbackSeries();
            });
          },
          function(callbackSeries) {
            if (!inverseRestriction) return callbackSeries();
            Sparql_generic.deleteTriples(inSource, null, null, inverseRestriction, function(_err, _result) {
              callbackSeries();
            });
          }
        ],
        function(_err) {
          if (callback) return callback(_err);

          visjsGraph.data.edges.remove(restrictionNode.id);
          visjsGraph.data.edges.remove(inverseRestriction);
          MainController.UI.message("restriction removed", true);
          esle;
        }
      );
    }
  };

  (self.createPropertyRangeAndDomain = function(source, souceNodeId, targetNodeId, propId, callback) {
    var triples = [];

    triples.push({
      subject: propId,
      predicate: "http://www.w3.org/2000/01/rdf-schema#domain",
      object: souceNodeId
    });
    triples.push({
      subject: propId,
      predicate: "http://www.w3.org/2000/01/rdf-schema#range",
      object: targetNodeId
    });

    Sparql_generic.insertTriples(source, triples, null, function(err, _result) {
      self.addRelationToGraph(propId);
      // Lineage_classes.drawObjectProperties(null,   [souceNodeId], Lineage_classes.mainSource)
      callback(err, "DONE");
    });
  }),
    (self.getSubClassTriples = function(souceNodeId, targetNodeId) {
      var triples = [];
      triples.push({
        subject: souceNodeId,
        predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
        object: targetNodeId
      });
      return triples;
    });

  self.getRestrictionTriples = function(sourceNodeId, targetNodeId, propId) {
    var restrictionsTriples = [];
    var blankNode = "_:b" + common.getRandomHexaId(10);

    restrictionsTriples.push({
      subject: sourceNodeId,
      predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
      object: blankNode
    });
    restrictionsTriples.push({
      subject: blankNode,
      predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      object: "http://www.w3.org/2002/07/owl#Restriction"
    });
    restrictionsTriples.push({
      subject: blankNode,
      predicate: "http://www.w3.org/2002/07/owl#onProperty",
      object: propId
    });
    restrictionsTriples.push({
      subject: blankNode,
      predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
      object: targetNodeId
    });

    restrictionsTriples.blankNode = blankNode;
    return restrictionsTriples;
  };

  self.addImportToCurrentSource = function(parentSourceLabel, importedSourceLabel, callback) {
    var payload = {
      importedSource: importedSourceLabel
    };
    $.ajax({
      type: "POST",
      url: `${Config.apiUrl}/sources/${parentSourceLabel}/imports`,
      data: payload,
      dataType: "json",
      success: function(_data, _textStatus, _jqXHR) {
        if (!Config.sources[parentSourceLabel].imports)
          //synchro on client
          Config.sources[parentSourceLabel].imports = [];
        Config.sources[parentSourceLabel].imports.push(importedSourceLabel);
        return callback();
      },
      error: function(err) {
        return callback(err);
      }
    });
  };

  self.addRelationToGraph = function(propUri) {
    var sourceNode = self.currentAssociation[0];
    var targetNode = self.currentAssociation[1];

    var existingNodes = visjsGraph.getExistingIdsMap();
    var visjsData = { nodes: [], edges: [] };

    if (!existingNodes[sourceNode.id]) {
      existingNodes[sourceNode.id] = 1;
      visjsData.nodes.push({
        id: sourceNode.id,
        label: sourceNode.label,
        shape: Lineage_classes.defaultShape,
        size: Lineage_classes.defaultShapeSize,
        color: Lineage_classes.getSourceColor(sourceNode.source),
        level: Lineage_classes.currentExpandLevel,
        data: {
          id: sourceNode.id,
          label: sourceNode.label,
          source: sourceNode.source
        }
      });
    }

    if (!existingNodes[targetNode.id]) {
      existingNodes[targetNode.id] = 1;
      visjsData.nodes.push({
        id: targetNode.id,
        label: targetNode.label,
        shape: Lineage_classes.defaultShape,
        size: Lineage_classes.defaultShapeSize,
        color: Lineage_classes.getSourceColor(targetNode.source),
        level: Lineage_classes.currentExpandLevel,
        data: {
          id: targetNode.id,
          label: targetNode.label,
          source: targetNode.source
        }
      });
    }

    var edgeId = sourceNode.id + "_" + propUri + "_" + targetNode.id;
    if (!existingNodes[edgeId]) {
      existingNodes[edgeId] = 1;
      var propLabel = Sparql_common.getLabelFromURI(propUri);
      visjsData.edges.push({
        id: edgeId,
        from: sourceNode.id,
        to: targetNode.id,
        label: "<i>" + propLabel + "</i>",
        data: { propertyId: propUri, source: Lineage_classes.mainSource },
        font: { multi: true, size: 10 },
        arrows: {
          from: {
            enabled: true,
            type: "bar",
            scaleFactor: 0.5
          }
        },
        dashes: true,
        color: Lineage_classes.objectPropertyColor
      });
    }
    visjsGraph.data.nodes.add(visjsData.nodes);
    visjsGraph.data.edges.add(visjsData.edges);
    visjsGraph.network.fit();
    $("#waitImg").css("display", "none");
  };

  self.importNodeInCurrentMainSource = function() {
    var node = self.currentAssociation[0];
    if (!node) return;
    var existingNodes = visjsGraph.getExistingIdsMap();
    if (existingNodes[node.id]) return alert("node " + node.label + " already exists in graph ");
    /* if(!confirm(" Import node "+node.label+" in source "+Lineage_classes.mainSource))
return;*/
    self.setNewImport(Lineage_classes.mainSource, node.source, function(err, _result) {
      if (err) return "";
      var toGraphUri = Config.sources[Lineage_classes.mainSource].graphUri;
      Sparql_generic.copyNodes(node.source, toGraphUri, [node.id], null, function(err, _result) {
        if (err) return alert(err);
        visjsGraph.data.nodes.push({
          id: node.id,
          label: node.label,
          color: Lineage_classes.getSourceColor(node.source),
          shape: "square",
          size: Lineage_classes.defaultShapeSize,
          data: node
        });
        visjsGraph.focusOnNode(node.id);
      });
    });
  };

  self.getCommonMetaDataTriples = function(subjectUri, source, status, options) {
    var metaDataTriples = [];
    if (!options) options = {};
    var login = authentication.currentUser.login;
    //  var authorUri = Config.defaultNewUriRoot + "users/" + login;
    var dateTime = common.dateToRDFString(new Date()) + "^^xsd:dateTime";

    metaDataTriples.push({
      subject: subjectUri,
      predicate: "http://purl.org/dc/terms/creator",
      object: login
    });

    metaDataTriples.push({
      subject: subjectUri,
      predicate: "http://purl.org/dc/terms/created",
      object: dateTime
    });

    metaDataTriples.push({
      subject: subjectUri,
      predicate: "https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status",
      object: status
    });
    metaDataTriples.push({
      subject: subjectUri,
      predicate: "http://purl.org/dc/terms/source",
      object: source
    });
    if (options) {
      for (var key in options) {
        metaDataTriples.push({
          subject: subjectUri,
          predicate: (Config.sousLeSensVocablesGraphUri || "http://data.souslesens.org/") + "property#" + key,
          object: options[key]
        });
      }
    }

    return metaDataTriples;
  };
  self.getProjectedGraphMetaDataTriples = function(graphUri, imports, options) {
    var triples = [];
    if (!options) options = {};

    imports.forEach(function(importedSource) {
      triples.push({
        subject: graphUri,
        predicate: Config.sousLeSensVocablesGraphUri + "property#import",
        object: importedSource
      });
    });
    triples.push({
      subject: graphUri,
      predicate: "http://www.w3.org/2002/07/owl#versionIRI",
      object: graphUri
    });

    triples.push({
      subject: graphUri,
      predicate: "http://www.w3.org/2002/07/owl#versionInfo",
      object: "Revised " + common.dateToRDFString(new Date())
    });
    if (options.label) {
      triples.push({
        subject: graphUri,
        predicate: "http://www.w3.org/2000/01/rdf-schema#label",
        object: options.label
      });
    }

    return triples;
  };

  self.transformSameLabelsEdgesIntoSameAsRelations = function(_callback) {
    var edges = visjsGraph.data.edges.get();
    var relations = [];
    var sameLabelEdgeIds = [];
    edges.forEach(function(edge) {
      if (edge.data && edge.data.type == "sameLabel") {
        sameLabelEdgeIds.push(edge.id);
        relations.push({
          type: "http://www.w3.org/2002/07/owl#sameAs",
          sourceNode: { id: edge.data.from, source: edge.data.fromSource },
          targetNode: { id: edge.data.to, source: edge.data.toSource }
        });
      }
    });
    if (relations.length > 0) {
      var options = {};
      self.createRelationTriples(relations, true, Lineage_classes.mainSource, options, function(err, _result) {
        if (err) return alert(err);
        visjsGraph.data.edges.remove(sameLabelEdgeIds);
        MainController.UI.message(relations.length + "  sameAs relations created", true);
      });
    }
  };

  self.createNode = function() {
    SourceBrowser.showNodeInfos(Lineage_classes.mainSource, null, "mainDialogDiv", null, function(_err, _result) {
      // pass
    });
  };

  self.initAllowedPropertiesForRelation = function() {
    var fromNode = self.currentAssociation[0];
    var toNode = self.currentAssociation[1];
    var distinctProperties = {};
    var properties = [];
    Config.Lineage.basicObjectProperties.forEach(function(item) {
      if (item.type == "ObjectProperty") {
        properties.push(item);
        distinctProperties[item.id] = 1;
      }
    });

    //   properties.splice(0, 0, {id: "http://www.w3.org/2002/07/owl#sameAs", label: "sameAs"})

    self.getAssociationAllowedProperties(fromNode, toNode, function(err, result) {
      if (err) return alert(err);

      result.forEach(function(item) {
        if (!distinctProperties[item.id]) {
          var prefix = "";
          if (item.p.value.indexOf("part14") > -1) prefix = "part14:";
          properties.push({
            id: item.p.value,
            label: prefix + (item.pLabel ? item.pLabel.value : Sparql_common.getLabelFromURI(item.p.value))
          });
        }
      });

      common.fillSelectOptions("lineage_createRelationPropertySelect", properties, false, "label", "id");
      /*
var words = [sourceNode.label, targetNode.label]
var indexes = [sourceNode.source.toLowerCase(), targetNode.source.toLowerCase()]
SearchUtil.getElasticSearchMatches(words, indexes, "exactMatch", 0, 10, function (err, result) {
if (err)
    return alert(err);
var xx = result

})*/
    });
  };

  self.getAssociationAllowedProperties = function(fromNode, toNode, callback) {
    var topOntology = "TSF_TOP_ONTOLOGY";

    var query =
      "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
      "SELECT distinct " +
      "?fromAncestor  ?toAncestor ?p ?pLabel  " +
      Sparql_common.getFromStr(fromNode.source, null, true) +
      " " +
      Sparql_common.getFromStr(toNode.source, null, true) +
      " " +
      Sparql_common.getFromStr(topOntology, null, false) +
      " " +
      /*   "WHERE {" +
"?fromAncestor rdfs:subClassOf ?b. ?b owl:onProperty ?p.optional{?p rdfs:label ?pLabel}" +
" optional{?b owl:someValuesFrom ?toAncestor.filter   ?to rdfs:subClassOf* ?toAncestor}\n" +
"  {SELECT ?fromAncestor   WHERE { ?from rdfs:subClassOf+ ?fromAncestor." +
" filter (?from=<"+fromNode.id+"\> )     }"+*/

      " WHERE {{?fromAncestor rdfs:subClassOf ?b. ?b owl:onProperty ?p.optional{?p rdfs:label ?pLabel} \n" +
      "   optional{ ?b owl:someValuesFrom ?toAncestor.  ?to rdfs:subClassOf+ ?toAncestor   filter( ?toAncestor!=owl:Thing  && ?to=<" +
      toNode.id +
      ">)}\n" +
      "     optional{ ?b owl:someValuesFrom ?toAncestor.  filter( ?toAncestor=owl:Thing)}\n" +
      " filter(BOUND(?toAncestor))\n" +
      "   \n" +
      "  {SELECT ?fromAncestor   WHERE { ?from rdfs:subClassOf+ ?fromAncestor. filter (?from=<" +
      fromNode.id +
      "> )     }}}\n" +
      "  \n" +
      /*    "WHERE {?fromAncestor rdfs:subClassOf ?b. ?b owl:onProperty ?p.optional{?p rdfs:label ?pLabel} optional{?b owl:someValuesFrom ?toAncestor} " + //filter (regex(str(?p),\"http://standards.iso.org/iso/15926/part14/\",\"i\"))" +
" {SELECT ?fromAncestor ?toAncestor ?from ?to" +
"    WHERE { ?from rdfs:subClassOf+ ?fromAncestor. filter (str(?from)=\"" + fromNode.id + "\" )" +
"        optional  { ?to rdfs:subClassOf+ ?toAncestor. filter (str(?to)=\"" + toNode.id + "\" )}" +
"  }" +*/
      "} limit 1000";

    var sparql_url = Config.sources[topOntology].sparql_server.url;
    var url = sparql_url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: topOntology }, function(err, result) {
      if (err) {
        return callback(err);
      }
      result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["node", "concept"]);

      return callback(null, result.results.bindings);
    });
  };

  self.graphModification = {
    showAddNodeGraphDialog: function() {
      self.graphModification.creatingNodeTriples=[]
      self.graphModification.creatingNodeUri=null;
      $("#LineagePopup").dialog("open");
      $("#LineagePopup").load("snippets/lineage/lineageAddNodeDialog.html", function() {
        common.fillSelectOptions("KGcreator_predicateSelect", KGcreator.usualProperties, true);
        Sparql_OWL.getDictionary("ISO_15926-part-14_PCA", null, null, function (err, result) {
          if (err) callbackSeries(err);
          result.sort(function (a, b) {
            if (!a.label || !b.label) return 0;
            if (a.label.value > b.label.value) return 1;
            if (a.label.value < b.label.value) return -1;
            return 0;
          });
          result.forEach(function (item) {
            if (item.id.type == "bnode") return;
            KGcreator.usualObjectClasses.push("part14:" + item.label.value);
          });
          common.fillSelectOptions("KGcreator_objectSelect", KGcreator.usualObjectClasses, true);

        });

      })
    },
    addTripleToCreatingNode: function(predicate,object) {

      if (! self.graphModification.creatingNodeUri) {
        let graphUri = Config.sources[Lineage_common.currentSource].graphUri;
        self.graphModification.creatingNodeUri = graphUri + common.getRandomHexaId(10);
       // self.graphModification.creatingNodeTriples = [];
      }
      if(!predicate)
      predicate = $("#KGcreator_predicateInput").val();
      if(!object)
      object = $("#KGcreator_objectInput").val();

      $("#KGcreator_predicateInput").val("");
      $("#KGcreator_objectInput").val("");
      $("#KGcreator_predicateSelect").val("");
      $("#KGcreator_objectSelect").val("");

      if (!predicate)
        return alert("no value for predicate");
      if (!object)
        return alert("no value for object");

      var triple = {
        subject: self.graphModification.creatingNodeUri,
        predicate: predicate,
        object: object
      };
      var num=self.graphModification.creatingNodeTriples.length
          self.graphModification.creatingNodeTriples.push(triple);
      $("#LineageBlend_creatingNodeTiplesDiv").append("<div id='triple_"+num+"' class='blendCreateNode_triplesDiv' >" + triple.subject+"&nbsp;&nbsp;<b>"+triple.predicate+"" +
        " </b>&nbsp;&nbsp;   "+triple.object + "&nbsp;<button  style='font-size: 8px;' onclick='Lineage_blend.graphModification.removeTriple("+num+")'>X</button></div>")

    },
    addClassStiples:function(){
      self.graphModification. addTripleToCreatingNode("rdf:type","owl:Class")
      self.graphModification. addTripleToCreatingNode("rdfs:subClassOf","owl:Thing")
     var label= prompt("rdfs:label")
      if(label)
        self.graphModification. addTripleToCreatingNode("rdfs:label",label)
    },
    removeTriple:function(index){
      self.graphModification.creatingNodeTriples.splice(index,1)
      $("#triple_"+index).remove()
    },
    createNode:function(){
      if (!self.graphModification.creatingNodeTriples)
        return alert("no predicates for node")
      var str=JSON.stringify(self.graphModification.creatingNodeTriples)
      if ( str.indexOf("rdf:type")<0)
        return alert("a type must be declared")
      if ( str.indexOf("owl:Class")>-1 && str.indexOf("rdfs:subClassOf")<0)
        return alert("a class must be a rdfs:subClassOf anotherClass")
      if ( str.indexOf("owl:Class")>-1 && str.indexOf("rdfs:label")<0)
        return alert("a class must have a rdfs:label")
      if( confirm("create node")){
        Sparql_generic.insertTriples(Lineage_common.currentSource,  self.graphModification.creatingNodeTriples, {}, function(err, _result) {
          if (err) return alert(err);
          $("#LineagePopup").dialog("close");
          var nodeData={
            id:self.graphModification.creatingNodeUri,
            source:Lineage_common.currentSource

          }
          MainController.UI.message("node Created")
          self.graphModification.creatingNodeTriples=[]
          Lineage_classes.drawNodeAndParents(nodeData);
          SearchUtil.generateElasticIndex(Lineage_common.currentSource,{ids:[self.graphModification.creatingNodeUri]},function(err, result){
            if(err)
              return alert(err.responseText)
            MainController.UI.message("node Created and Indexed")
          })
        });

      }

    },
    showAddEdgeFromGraphDialog: function(edgeData, callback) {
      $("#LineagePopup").dialog("open");
      $("#LineagePopup").load("snippets/lineage/lineageAddEdgeDialog.html", function() {
        self.sourceNode = visjsGraph.data.nodes.get(edgeData.from).data;
        self.targetNode = visjsGraph.data.nodes.get(edgeData.to).data;
        $("#lineageAddEdgeDialog_Title").html(self.sourceNode.label + " -> " + self.targetNode.label);
        $("#lineageAddEdgeDialog_Tabs").tabs({});

        let options = {
          openAll: true,
          selectTreeNodeFn: function(event, obj) {
            event.stopPropagation();

            //dispatch of sources to write in depending on relation type and editable
            var inSource;
            var options = {};
            if (obj.node.data.id == "http://www.w3.org/2002/07/owl#sameAs")
              // le sameAs sont tous dans le dictionaire
              inSource = Config.dictionarySource;
            else {
              //soit  dans currentSource
              if (Config.sources[Lineage_common.currentSource].editable)
                inSource = Lineage_common.currentSource;
              else
                //soit  dans predicateSource
                inSource = Config.predicatesSource;
            }

            Lineage_blend.graphModification.createRelationFromGraph(inSource, self.sourceNode, self.targetNode, obj.node.data.id, options, function(err, result) {
              if (err) return callback(err);
              let newEdge = edgeData;
              let propLabel = obj.node.data.label || Sparql_common.getLabelFromURI(obj.node.data.id);
              var bNodeId = "<_:b" + common.getRandomHexaId(10) + ">";
              newEdge.label = "<i>" + propLabel + "</i>";
              (newEdge.font = { multi: true, size: 10 }),
                (newEdge.arrows = {
                  to: {
                    enabled: true,
                    type: Lineage_classes.defaultEdgeArrowType,
                    scaleFactor: 0.5
                  }
                });
              newEdge.data = { source: obj.node.data.inSource, bNode: bNodeId, label: propLabel };
              visjsGraph.data.edges.add([newEdge]);
            });
          }
        };

        async.series(
          [
            function(callbackSeries) {
              let jstreedata2 = [];
              jstreedata2.push({
                id: "http://www.w3.org/2002/07/owl#sameAs",
                text: "owl:sameAs",
                parent: "#",
                data: {
                  id: "http://www.w3.org/2002/07/owl#sameAs",
                  inSource: Config.dictionarySource
                }
              });

              jstreedata2.push({
                id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                text: "rdf:type",
                parent: "#",
                data: {
                  id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                  inSource: Lineage_classes.mainSource
                }
              });
              if (Config.sources[Lineage_classes.mainSource].schemaType == "OWL") {
                jstreedata2.push({
                  id: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                  text: "rdfs:subClassOf",
                  parent: "#",
                  data: {
                    id: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                    inSource: Lineage_classes.mainSource
                  }
                });
              }
              // var data = ["owl:sameAs"]
              //  common.fillSelectOptions("lineageAddEdgeDialog_generalPropertiesTreeDiv", data)
              common.jstree.loadJsTree("lineageAddEdgeDialog_generalPropertiesTreeDiv", jstreedata2, options);
              callbackSeries();
            },

            function(callbackSeries) {
              if (!Config.sources[Lineage_classes.mainSource].editable) {
                $("#lineageAddEdgeDialog_part14PropertiesTreeDiv").html("source " + Lineage_classes.mainSource + " is not editable");
                return callbackSeries();
              }
              let inSource = "ISO_15926-part-14_PCA";
              Lineage_properties.getPropertiesjsTreeData(inSource, null, null, {}, function(err, jstreeData) {
                if (err) return callbackSeries(err);
                jstreeData.forEach(function(item) {
                  item.data.inSource = inSource;
                });

                jstreeData.push({
                  id: inSource,
                  text: inSource,
                  parent: "#"
                });

                common.jstree.loadJsTree("lineageAddEdgeDialog_part14PropertiesTreeDiv", jstreeData, options);
                callbackSeries();
              });
            },
            function(callbackSeries) {
              if (!Config.sources[Lineage_classes.mainSource].editable) {
                $("#lineageAddEdgeDialog_currentSourcePropertiesTreeDiv").html("source " + Lineage_classes.mainSource + " is not editable");
                return callbackSeries();
              }
              let inSource = Lineage_common.currentSource;
              Lineage_properties.getPropertiesjsTreeData(inSource, null, null, {}, function(err, jstreeData3) {
                if (err) return callbackSeries(err);
                jstreeData3.forEach(function(item) {
                  item.data.inSource = inSource;
                });

                jstreeData3.push({
                  id: inSource,
                  text: inSource,
                  parent: "#"
                });
                common.jstree.loadJsTree("lineageAddEdgeDialog_currentSourcePropertiesTreeDiv", jstreeData3, options);

                callbackSeries();
              });
            }
          ],

          function(err) {
            if (err) return callback(err);

            if (edgeData.from === edgeData.to) {
              return callback(null);
            } else {
              return callback(null);
            }
          }
        );
      });
    },
    execAddEdgeFromGraph: function() {
    },

    createRelationFromGraph: function(inSource, sourceNode, targetNode, propId, options, callback) {
      if (!confirm("create Relation " + sourceNode.label + "-" + Sparql_common.getLabelFromURI(propId) + "->" + targetNode.label)) return;
      $("#LineagePopup").dialog("close");
      if (propId == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" || propId == "http://www.w3.org/2000/01/rdf-schema#subClassOf") {
        var triples = [];
        triples.push({
          subject: sourceNode.id,
          predicate: propId,
          object: targetNode.id
        });

        Sparql_generic.insertTriples(inSource, triples, {}, function(err, _result) {
          if (err) return callback(err);
          return callback(null, _result);
        });
      } else {

        self.createRelation(inSource, propId, sourceNode, targetNode, true, true, {}, function(err, _result) {
          if (err) return callback(err);
          MainController.UI.message("relation added", true);
          return callback(null, _result);
        });
      }
    }
  };

  return self;
})();
