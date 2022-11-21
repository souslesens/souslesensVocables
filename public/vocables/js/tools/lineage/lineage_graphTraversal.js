// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Lineage_graphTraversal = (function() {


  var self = {};


  /**
   *
   * get nodes shortest path from server
   *
   * @param source
   * @param fromNodeId
   * @param toNodeId
   * @param callback return shortestPath nodes array
   */
  self.getShortestpath = function(source, fromNodeId, toNodeId, callback) {
    var body = {
      getShortestPath: 1,
      sparqlServerUrl: Config.sources[source].sparql_server.url,
      graphUri: Config.sources[source].graphUri,
      fromNodeUri: fromNodeId,
      toNodeUri: toNodeId

    };
    var payload = {
      url: Config.sources[source].sparql_server.url,
      body: JSON.stringify(body),
      POST: true
    };
    $.ajax({
      type: "POST",
      url: `${Config.apiUrl}/httpProxy`,
      data: payload,
      dataType: "json",
      success: function(data, _textStatus, _jqXHR) {
        return callback(null, data);
      }, error: function(err) {
        return callback(err);
      }
    });

  };

  self.drawShortestpath = function(source, fromNodeId, toNodeId) {


    var path = [];
    var relations = [];
   var labelsMap={}

    async.series([

      //get shortestPath nodes array
      function(callbackSeries) {

        self.getShortestpath(source, fromNodeId, toNodeId, function(err, result) {
          if (err)
            return callbackSeries(err);
          path = result;


        if(path.length==0)
          return alert("no path found ")

          callbackSeries();
        });
      }
      ,

      //get labels
      function(callbackSeries) {
        var ids = []
        path.forEach(function(item) {
            item.forEach(function(item2) {
              ids.push(item2)
            })
        });



       var fitlerStr=Sparql_common.setFilter("s", ids)

        var fromStr=Sparql_common.getFromStr(source,true)
        var query =

          "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
          "SELECT distinct * " +
          fromStr +
          " WHERE { GRAPH ?g {" +
         // "?s rdf:type ?type "+ Sparql_common.getVariableLangLabel("s", true)+"" +
         Sparql_common.getVariableLangLabel("s", false)+"" +
          fitlerStr +
          "}" +
          "} limit 10000" ;

            var url = Config.sources[source].sparql_server.url; + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {

          result.results.bindings.forEach(function(item) {
            labelsMap[item.s.value] = item.sLabel?item.sLabel.value: Sparql_common.getLabelFromURI("s")


          })
          callbackSeries();
        })
      }
      ,
     // setRelations
      function(callbackSeries) {

          path.forEach(function(item) {

            var relation = {
              from: item[0],
              fromLabel:labelsMap[item[0]],

              prop: item[2],
              propLabel: labelsMap[item[2]],

              to: item[1],
              toLabel: labelsMap[item[1]],

            };
            relations .push(relation);


          });
          return callbackSeries();

      }

      ,




      //build visjsNodeData
      function(callbackSeries) {

        var visjsData = { nodes: [], edges: [] };
        var existingIdsMap = visjsGraph.getExistingIdsMap();

        var shape = Lineage_classes.defaultShape;
        var color = Lineage_classes.getSourceColor(source);
        relations.forEach(function(relation, index) {


          if (!existingIdsMap[relation.from]) {
            existingIdsMap[relation.from] = 1;
            var node = {
              id: relation.from,
              label: relation.fromLabel,
              shadow: Lineage_classes.nodeShadow,
              shape: shape,
              color: color,
              size: Lineage_classes.defaultShapeSize,
              data: {
                source: source,
                id: relation.from,
                label: relation.fromLabel
              }
            };
            visjsData.nodes.push(node);

          }
          if (!existingIdsMap[relation.to]) {
            existingIdsMap[relation.to] = 1;
            var node = {
              id: relation.to,
              label: relation.toLabel,
              shadow: Lineage_classes.nodeShadow,
              shape: shape,
              color: color,
              size: Lineage_classes.defaultShapeSize,
              data: {
                source: source,
                id: relation.to,
                label: relation.toLabel
              }
            };
            visjsData.nodes.push(node);

          }

          var edgeId = "P_" + common.getRandomHexaId(6);
          if (!existingIdsMap[edgeId]) {
            existingIdsMap[edgeId] = 1;

            visjsData.edges.push({
              id: edgeId,
              from: relation.from,
              to: relation.to,
              label: relation.propLabel,
              color: "red",
              size: 3,
              // arrows: arrows,
              type: "path",
              data: {
                source: source,
                type: "path",
                path: path,
                id: edgeId,
                from: relation.from,
                to: relation.to,
                label: relation.propLabel

              }

            });
          }

        });


        var oldEdges = visjsGraph.data.edges.get();
        var toDelete = [];
        oldEdges.forEach(function(edge) {
          if (edge.type == "path")
            toDelete.push(edge.id);
        });
        visjsGraph.data.edges.remove(toDelete);


        if (visjsGraph.isGraphNotEmpty()) {
          visjsGraph.data.nodes.add(visjsData.nodes);
          visjsGraph.data.edges.add(visjsData.edges);
        } else {
          Lineage_classes.drawNewGraph(visjsData);
        }


        return callbackSeries();
      }

    ], function(err) {
      if (err)
        return alert(err.responseText);


    });

  };




  self.showShortestPathDialog=function(){
    $("#mainDialogDiv").dialog("open");
    $("#mainDialogDiv").load("snippets/lineage/lineage_shortestPathDialog.html", function(){
    $("#lineage_shorterstPath_searchInput").bind("keydown", null,Lineage_graphTraversal.onSearchKeyDown);




    })
  }


  self.initVisjsPathMode = function() {
    self.inPathMode = true;
    visjsGraph.network.addEdgeMode();


  };

  self.showPathNodesList = function(source, path) {

    var filter = Sparql_common.setFilter("concept", path, null);
    Sparql_OWL.getItems(source, { filter: filter }, function(err, result) {

    });


  };

  self.onSearchKeyDown=function(event){


    if (event.keyCode != 13 && event.keyCode != 9) return;
    var term=$("#lineage_shorterstPath_searchInput").val();
    self.searchConcept(term)
}

  self.searchConcept=function(term){


      /**
       *
       * show in jstree hierarchy of terms found in elestic search  from research UI or options if any
       *
       * @param options
       *  -term searched term
       *  -selectedSources array od sources to search
       *  -exactMatch boolean
       *  -searchAllSources
       *  -jstreeDiv
       *  -parentlabels searched in Elastic
       *  -selectTreeNodeFn
       *  -contextMenufn
       *
       */

      var options = {
        term: term,
        selectedSources: [Lineage_sources.activeSource],
        exactMatch: false,
        jstreeDiv: "lineage_shorterstPath_searchJsTreeDiv",
        selectTreeNodeFn: Lineage_graphTraversal.selectTreeNodeFn,
        contextMenufn: Lineage_graphTraversal.contextMenufn
      }

      SourceBrowser.searchAllSourcesTerm(options)
    }

    self.contextMenufn=function(){
     var items=[]
      items.setFromNode = {
        label: "from node",
        action: function (_e, _xx) {
        $("#lineage_shorterstPathFromUri").val(self.currentTreeNode.id)
        },
      };
      items.seToNode = {
        label: "to node",
        action: function (_e, _xx) {
          $("#lineage_shorterstPathToUri").val(self.currentTreeNode.id)
        },
      };


      return items
    }
    self.selectTreeNodeFn=function(event, obj){
self.currentTreeNode=obj.node
    }





  return self;


})();


/*

edges=[];



edges.push(["A", "B"]);
edges.push(["B", "C"])
edges.push(["B", "E"])
edges.push(["C", "D"])
edges.push(["C", "E"])
edges.push(["C", "G"])
edges.push(["D", "E"])
edges.push(["E", "F"]);
var path=GraphTraversal.getShortestPath(edges,"G","A")
console.log(path.toString());

 */

