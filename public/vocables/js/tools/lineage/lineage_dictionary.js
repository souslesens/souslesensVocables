var Lineage_dictionary = (function() {
  var self = {};

  self.showSimilarsDialog = function(selectId) {
    $("#mainDialogDiv").dialog("open");
    $("#mainDialogDiv").load("snippets/lineage/lineageDictionary.html", function() {
      if (!selectId) selectId = "LineageDictionary_rangeSourceSelect";
      self.getDictionaryTargetSources(null, Lineage_common.currentSource, null, function(err, result) {
        if (err) MainController.UI.message(err.responseText);
        var rangeSourceLabel = [];
        result.forEach(function(item) {
          if( rangeSourceLabel.indexOf(item.rangeSourceLabel.value)<0)
          rangeSourceLabel.push(item.rangeSourceLabel.value);
        });
        rangeSourceLabel.sort();
        common.fillSelectOptions(selectId, rangeSourceLabel, true);
      });
    });
  };
  self.drawDictionarySameAs = function() {

    var filter = " FILTER (?prop = <http://www.w3.org/2002/07/owl#sameAs>) ";
    var rangeSourceLabel = $("#LineageDictionary_rangeSourceSelect").val();
    filter += "  FILTER (?domainSourceLabel ='" + Lineage_common.currentSource + "')";
    if (rangeSourceLabel)
      filter += "  FILTER (?rangeSourceLabel ='" + rangeSourceLabel + "')";
    var nodes = null;
    var mode=$("#LineageDictionary_nodesSelectionSelect").val()
    if(mode=="currentGraphNodes")
      nodes = visjsGraph.data.nodes.getIds();
    var options = {
      // processorFn: processMetadata,
      filter: filter,
      getMetadata: true
    };
    Lineage_classes.drawRestrictions(Config.dictionarySource, nodes, false, false, options, function(err) {
      if (err)
        return alert(err.responseText);
        var nodes = visjsGraph.data.nodes.getIds();
      $("#mainDialogDiv").dialog("close")
      var distinctSources=[]
        SearchUtil.getSourceLabels(null, nodes, null, null, function(err, result) {
          if (err)
            return alert(err.responseText);
          var newNodes = [];
          var newSources=[];
          result.forEach(function(hit) {
            var hitSource=SearchUtil.getSourceLabelFromIndexName(hit._index)
            if(newSources.indexOf(hitSource)<0){
              newSources.push(hitSource)
            }
            newNodes.push({
              id: hit._source.id,
              label: hit._source.label,
              data:{
                id: hit._source.id,
                label: hit._source.label,
                source:hitSource
              }
            });
          });
          visjsGraph.data.nodes.update(newNodes)

          newSources.forEach(function(source){

            Lineage_classes.registerSource(source)
          })

        });

    });
  };


  self.getDictionaryTargetSources = function(dictionary, domainSource, rangeSource, callback) {
    if (!dictionary) dictionary = Config.dictionarySource;
    var strFrom = Sparql_common.getFromStr(dictionary, false, false);
    var query =
      "PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> select distinct  ?domainSourceLabel ?rangeSourceLabel " +
      strFrom +
      " where " +
      "{?restriction <http://data.souslesens.org/property#domainSourceLabel> ?domainSourceLabel. ?restriction <http://data.souslesens.org/property#rangeSourceLabel> ?rangeSourceLabel ";
    if (domainSource) query += " filter (?domainSourceLabel='" + domainSource + "') ";
    if (rangeSource) query += " filter (?rangeSourceLabel='" + rangeSource + "') ";

    query += " }  limit 10000";

    var sparql_url = Config.sources[dictionary].sparql_server.url;
    var url = sparql_url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: dictionary }, function(err, result) {
      if (err) {
        return callback(err);
      }

      return callback(null, result.results.bindings);
    });
  };

  self.createSameAsRelations = function(type) {
    var relations = [];
    var targetSources = [];
    var dictionarySourceLabel = Config.dictionarySource;

    if (type == "exactMatch") {
      for (var key in self.matrixWordsMap.entities) {
        self.matrixWordsMap.entities[key].forEach(function(obj) {
          if (obj) {
            var targetSource = self.indexSourcesMap[obj.index];
            if (targetSources.indexOf(targetSource) < 0) targetSources.push(targetSource);
            relations.push({
              sourceNode: {
                source: self.currentSource,
                label: obj.sourceHit.label,
                id: obj.sourceHit.id
              },
              targetNode: {
                source: targetSource,
                label: obj.label,
                id: obj.id
              },
              type: "http://www.w3.org/2002/07/owl#sameAs"
            });
          }
        });
      }
    } else if (type == "fuzzyMatch") {
      self.fuzzyMatches.forEach(function(item) {
        if (item) {
          relations.push({
            sourceNode: {
              source: self.currentSource,
              label: item.sourceNode.label,
              id: item.sourceNode.id
            },
            targetNode: {
              source: item.targetNode.source,
              label: item.targetNode.label,
              id: item.targetNode.id
            },
            type: "http://www.w3.org/2002/07/owl#sameAs"
          });
        }
      });
    }

    if (!confirm("create " + relations.length + " relations sameAs in " + dictionarySourceLabel)) return;

    var sliceLength = 10;
    var totalCreated = 0;

    async.series(
      [
        function(callbackSeries) {
          return callbackSeries();
        },
        function(callbackSeries) {
          var slices = common.array.slice(relations, sliceLength);
          MainController.UI.message(" Creating relations  in +" + dictionarySourceLabel + "...");
          async.eachSeries(
            slices,
            function(slice, callbackEach) {
              Lineage_blend.createRelationTriples(slice, true, dictionarySourceLabel, function(err, _result) {
                if (err) return callbackEach(err);
                /*   slice.forEach(function(relation){
var labelTriples=[
{ subject: relation.sourceNode.id, predicate: "http://www.w3.org/2000/01/rdf-schema#label",object:relation.sourceNode.label},
{ subject: relation.targetNode.id, predicate: "http://www.w3.org/2000/01/rdf-schema#label",object:relation.targetNode.label},
})*/

                totalCreated += sliceLength;
                MainController.UI.message(totalCreated + " relations created in " + dictionarySourceLabel);

                return callbackEach();
              });
            },
            function(_err) {
              callbackSeries();
            }
          );
        }
      ],
      function(err) {
        if (err) return alert(err);

        MainController.UI.message(totalCreated + " relations created in " + dictionarySourceLabel, true);
      }
    );
  };


  exportTSFdictionary=function(){
    var query="PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>SELECT * from <http://data.total.com/resource/tsf/dictionary/> WHERE {{ ?concept rdfs:subClassOf ?node.  ?node rdf:type owl:Restriction. ?node owl:onProperty ?prop . OPTIONAL {?prop rdfs:label ?propLabel} OPTIONAL {?concept rdfs:label ?conceptLabel}?node owl:someValuesFrom ?value. OPTIONAL {?value rdfs:label ?valueLabel}  filter (?prop=<http://www.w3.org/2002/07/owl#sameAs>) } OPTIONAL {?node <http://data.souslesens.org/property#domainSourceLabel> ?domainSource}\n" +
      "  OPTIONAL {?node <http://data.souslesens.org/property#rangeSourceLabel> ?rangeSource} \n" +
      "   OPTIONAL {?node <purl.org/dc/terms/created> ?creationDate} \n" +
      "  OPTIONAL {?node <https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status> ?status} \n" +
      "  OPTIONAL {?node <http://purl.org/dc/terms/creator> ?author} \n" +
      "  \n" +
      "\n" +
      "} limit 10000"
  }
  return self;
})
();
