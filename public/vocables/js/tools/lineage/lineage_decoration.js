//@typescript-eslint/no-unused-vars
var Lineage_decoration = (function() {
  var self = {};
  self.legendMap = {};
  self.currentVisjGraphNodesMap = {};
  var topLevelOntologyFixedlegendMap = {
    "http://rds.posccaesar.org/ontology/lis14/rdl/Location": "#F90EDDFF",
    "http://rds.posccaesar.org/ontology/lis14/rdl/PhysicalObject": "#00AFEFFF",
    "http://rds.posccaesar.org/ontology/lis14/rdl/FunctionalObject": "#FDBF01FF",
    "http://rds.posccaesar.org/ontology/lis14/rdl/InformationObject": "#70AC47FF",
    "http://rds.posccaesar.org/ontology/lis14/rdl/Activity": "#70309f",
    "http://rds.posccaesar.org/ontology/lis14/rdl/Aspect": "#cb6601"
  };
  self.topLevelOntologyPredifinedLegendMap = JSON.parse(JSON.stringify(topLevelOntologyFixedlegendMap));


  self.init = function() {
    self.operationsMap = {
      colorNodesByType: self.colorGraphNodesByType,
      colorNodesByTopLevelOntologyTopType: self.colorNodesByTopLevelOntologyTopType
    };
    var operations = Object.keys(self.operationsMap);


    common.fillSelectOptions("Lineage_classes_graphDecoration_operationSelect", operations, true);
    self.currentVisjGraphNodesMap = {};
    self.legendMap = {};

  };
  self.run = function(operation) {
    $("#Lineage_classes_graphDecoration_operationSelect").val("");
    self.operationsMap[operation]();
  };

  self.showGraphDecorationDialog = function() {
    $("#mainDialogDiv").load("snippets/lineage/graphDecoration.html", function() {
      $("#mainDialogDiv").dialog("open");
    });
  };


  /**
   * set the upper ontology classes map
   * @param callback
   * @returns {*}
   */
  self.setTopLevelOntologyClassesMap = function(callback) {
    if (!Config.currentTopLevelOntology)
      return callback(null, null);
    self.topClasseMap = {};
    Sparql_generic.getSourceTaxonomy(Config.currentTopLevelOntology, {}, function(err, result) {
      if (err)
        return callback(null, {});


      self.topClasseMap = result.classesMap;
      for (var topClass in self.topClasseMap) {
        var color = null;
        if (self.topLevelOntologyPredifinedLegendMap[topClass])//predifined color
          color = self.topLevelOntologyPredifinedLegendMap[topClass];
        else {//look for a predifined parent class 
          self.topClasseMap[topClass].parents.forEach(function(parent) {
            if (self.topLevelOntologyPredifinedLegendMap[parent])//predifined color
              color = self.topLevelOntologyPredifinedLegendMap[parent];
          });
        }
        if (!color)//calculated color in palette
          color = common.paletteIntense[Object.keys(self.legendMap).length % Object.keys(common.paletteIntense).length];
        self.topClasseMap[topClass].color = color;
      }
      ;
      return callback(null, self.topClasseMap);
    });
  };

  /**
   search for each node in visjs graph correpsonding nodes in upper ontology (if any)
   an set the lowest upper ontology class thanks to the self.topClasseMap[topclass].parents nodes length

   */

  self.getVisjsNodesTopLevelOntologyClass = function(ids, callback) {
    if (!ids || ids.length == 0)
      return callback(null, []);


    var sourceLabel = Lineage_classes.mainSource;

    var strFrom = Sparql_common.getFromStr(sourceLabel, null, true, true);
    var sparql_url = Config.sources[sourceLabel].sparql_server.url;
    var url = sparql_url + "?format=json&query=";
    var slices = common.array.slice(ids, 50);
    //  var uriPattern = Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern;
    var data = [];
    async.eachSeries(
      slices,
      function(slice, callbackEach) {
        var query =
          "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
          "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
          "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
          "PREFIX owl: <http://www.w3.org/2002/07/owl#>";


        query +=
          "  SELECT distinct ?x ?type ?g ?label" +
          strFrom +
          "WHERE {GRAPH ?g{" +
          "    ?x  rdf:type ?s. " +
          "OPTIONAL {?x rdfs:label ?label}" +
          " ?x   (rdf:type|rdfs:subClassOf)+ ?type.  filter(regex(str(?type),'" + self.uriPattern + "'))";

        /*   query += "  SELECT distinct ?x ?type ?g ?label" +
        strFrom +
        "WHERE {GRAPH ?g{" +
        "    ?x  rdf:type ?s. " +
        "OPTIONAL {?x rdfs:label ?label}" +
        " ?x  (rdf:type|rdfs:subClassOf)+ ?type.  filter(regex(str(?type),'" + self.uriPattern + "'))";*/

        var filter = Sparql_common.setFilter("x", slice);
        if (filter.indexOf("?x in( )") > -1) return callbackEach();

        query += filter + "}}";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function(err, result) {
          if (err) {
            return callback(err);
          }
          data = data.concat(result.results.bindings);
          //  if (data.length > 100) ; // console.error(query);
          return callbackEach();
        });
      },
      function(err) {

        return callback(err, data);
      }
    );
  };


  self.colorGraphNodesByType = function(visjsNodes) {
    if (!Config.topLevelOntologies[Config.currentTopLevelOntology])
      return;

    self.currentVisjGraphNodesMap = {};
    if( self.topClasseMap && Object.keys(self.topClasseMap).length>0)
       return self.colorNodesByTopLevelOntologyTopType(visjsNodes);

    self.setTopLevelOntologyClassesMap(function(err, reult) {

      if (Config.topLevelOntologies[Config.currentTopLevelOntology]) {

        self.legendMap = {};
        self.uriPattern = Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern;
        self.colorNodesByTopLevelOntologyTopType(visjsNodes);
      } else
        return;
    });


  };

  self.colorNodesByTopLevelOntologyTopType = function(visjsNodes) {
    if (!Config.topLevelOntologies[Config.currentTopLevelOntology])
      return;


    var nonTopLevelOntologynodeIds = [];
    var topLevelOntologynodeIds = [];
    var individualNodes = [];
    if (!visjsNodes)
      visjsNodes = visjsGraph.data.nodes.get();
    visjsNodes.forEach(function(node) {
      if (node.data && node.data.rdfType == "NamedIndividual")
        individualNodes.push(node.id);
      else if (node.id.indexOf(self.uriPattern) < 0) {
        nonTopLevelOntologynodeIds.push(node.id);
      } else {
        if (self.topClasseMap[node.id])
          topLevelOntologynodeIds.push({ id: node.id, color: self.topClasseMap[node.id].color });
      }
    });
    visjsGraph.data.nodes.update(topLevelOntologynodeIds);

    self.getVisjsNodesTopLevelOntologyClass(nonTopLevelOntologynodeIds, function(err, result) {
      if (err) return;
      var excludedTypes = ["TopConcept", "Class", "Restriction"];

      var maxNumberOfParents = 0;

      result.forEach(function(item) {
        if (!self.currentVisjGraphNodesMap[item.x.value]) {
          self.currentVisjGraphNodesMap[item.x.value] = {
            type: item.type.value,
            graphUri: item.g.value,
            label: item.label ? item.label.value : Sparql_common.getLabelFromURI(item.x.value),
            topLevelOntologyClass: null,
            topLevelOntologyNumberOfParents: 0,
            color: null
          };
        }
        if (self.topClasseMap[item.type.value]) {


          // select the deepest upper ontology class  among all retrieved
         if ( self.topClasseMap[item.type.value].parents.length > self.currentVisjGraphNodesMap[item.x.value].topLevelOntologyNumberOfParents) {
            self.currentVisjGraphNodesMap[item.x.value].topLevelOntologyClass = item.type.value;
            self.currentVisjGraphNodesMap[item.x.value].color = self.topClasseMap[item.type.value].color;
           self.currentVisjGraphNodesMap[item.x.value].topLevelOntologyNumberOfParents= self.topClasseMap[item.type.value].parents.length

           if (!self.legendMap[item.type.value]) {
             self.legendMap[item.type.value] = {
               id: item.type.value,
               label: self.topClasseMap[item.type.value].label,
               color: self.topClasseMap[item.type.value].color,
               parents: self.topClasseMap[item.type.value].parents

             };
           }

          }

        }

      });


      // modify nodes color according to toOntolog superClass


      var neutralColor = null; //"#ccc";

      var newNodes = [];

      for (var nodeId in self.currentVisjGraphNodesMap) {
        var obj = self.currentVisjGraphNodesMap[nodeId];
        if (obj)
          newNodes.push({ id: nodeId, color: obj.color, legendType: obj.type });

        /*
        var source2 = nodesTypesMap[node.data.id].graphUri ? Sparql_common.getSourceFromGraphUri(nodesTypesMap[node.data.id].graphUri) : source;
        if (source2) node.data.source = source2;*/

      }


      if (visjsGraph.data && visjsGraph.data.nodes)
        visjsGraph.data.nodes.update(newNodes);

      self.colorIndividuals(individualNodes);
      self.drawLegend();

    });
  };

  self.colorIndividuals = function(individualIds) {
    var edges = visjsGraph.data.edges.get();
    var newNodes = [];
    edges.forEach(function(edge) {
      var obj = self.currentVisjGraphNodesMap[edge.to];
      if (obj) {
        newNodes.push({ id: edge.from, color: obj.color, legendType: obj.type });
        self.currentVisjGraphNodesMap[edge.from] = {
          topLevelOntologyClass: edge.to,
          color: obj.color
        };

      }
      /*else obj = self.currentVisjGraphNodesMap[edge.from];
      if (obj) {
        newNodes.push({ id: edge.to, color: obj.color, legendType: obj.type });
        self.currentVisjGraphNodesMap[edge.to] = {
          topLevelOntologyClass: edge.from,
          color: obj.color
        };

      }*/


      if (visjsGraph.data && visjsGraph.data.nodes)
        visjsGraph.data.nodes.update(newNodes);

    });

  };


  self.drawLegend = function() {
    if (!Config.currentTopLevelOntology)
      return;


    var str = "<div  class='Lineage_legendTypeTopLevelOntologyDiv'>";
    str+="<div>Upper ontology <b>"+Config.currentTopLevelOntology+"</b></div>"
    for (var topClassId in self.legendMap) {

      var label = self.legendMap[topClassId].label;
      var color = self.legendMap[topClassId].color;
      str +=
        "<div class='Lineage_legendTypeDiv' onclick='Lineage_decoration.onlegendTypeDivClick($(this),\"" +
        topClassId +
        "\")' style='background-color:" +
        color +
        "'>" +
        label +
        "</div>";
    }
    str += "</div>";

    $("#Lineage_classes_graphDecoration_legendDiv").html(str);

  };

  self.onlegendTypeDivClick = function(div, type) {
    self.currentLegendObject = { type: type, div: div };
    self.setGraphPopupMenus();
    var point = div.position();
    point.x = point.left;
    point.y = point.top;
    MainController.UI.showPopup(point, "graphPopupDiv", true);
  };

  self.setGraphPopupMenus = function() {
    var html =
      "    <span  class=\"popupMenuItem\" onclick=\"Lineage_decoration.hideShowLegendType(true);\"> Hide Type</span>" +
      " <span  class=\"popupMenuItem\" onclick=\"Lineage_decoration.hideShowLegendType();\"> Show Type</span>" +
      " <span  class=\"popupMenuItem\" onclick=\"Lineage_decoration.hideShowLegendType(null,true);\"> Show Only</span>";
    $("#graphPopupDiv").html(html);
  };
  self.hideShowLegendType = function(hide, only) {
    if (hide) self.currentLegendObject.div.addClass("Lineage_legendTypeDivHidden");
    else self.currentLegendObject.div.removeClass("Lineage_legendTypeDivHidden");
    var allNodes = visjsGraph.data.nodes.get();
    var newNodes = [];
    var hidden = hide ? true : false;
    allNodes.forEach(function(node) {
      if (only) {
        if (only == "all" || (node && node.legendType == self.currentLegendObject.type))
          newNodes.push({
            id: node.id,
            hidden: false
          });
        else newNodes.push({ id: node.id, hidden: true });
      } else {
        if (node && node.legendType == self.currentLegendObject.type)
          newNodes.push({
            id: node.id,
            hidden: hidden
          });
      }
    });
    visjsGraph.data.nodes.update(newNodes);
  };

  return self;
})();
