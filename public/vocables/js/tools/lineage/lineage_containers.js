var Lineage_containers = (function() {
  var self = {};


  self.search = function() {
    var term = $("#Lineage_containers_searchInput").val();

    var filter = "";
    if (term)
      filter = Sparql_common.setFilter("concept", null, term);

    filter += " ?concept rdf:type <http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag> ";
    var options = {
      filter: filter,
    //  distinct: "?concept ?conceptLabel"
    };
    Sparql_generic.getItems(Lineage_sources.activeSource, options, function(err, result) {
      if (err)
        return alert(err.responseText);
      var containers = [];
      var jstreeData = [];

      var containersMap={}
      result.forEach(function(item) {
        containersMap[item.o.value]=item.concept.value
      })

      result.forEach(function(item) {
        var parent="#"
        if(containersMap[item.concept.value])
          parent=containersMap[item.concept.value]
        jstreeData.push({
            id: item.concept.value,
            text: item.conceptLabel.value,
            parent: parent
          }
        );
      });
      var options = {

        openAll: true,
        contextMenu: Lineage_containers.getContextJstreeMenu(),
        selectTreeNodeFn: Lineage_containers.onSelectedNodeTreeclick,
        dnd: {
          drag_stop: function(data, element, helper, event) {
            self.onMoveContainer(data, element, helper, event);
          }

        }

      };

      common.jstree.loadJsTree("lineage_containers_containersJstree", jstreeData, options);

    });
  };

  self.getContextJstreeMenu = function() {
    var items = {};
    return items;
  };

  self.onSelectedNodeTreeclick = function(event, obj) {

  };

  self.onMoveContainer = function(data, element, helper, event) {
    var sourceNodeId = element.data.nodes[0];
    var targetNodeAnchor = element.event.target.id;
    var targetNodeId = targetNodeAnchor.substring(0, targetNodeAnchor.indexOf("_anchor"));


    var graphUri = Config.sources[Lineage_sources.activeSource].graphUri;
    var query = "with <" + graphUri + ">" +
      "delete {?s <http://www.w3.org/1999/02/22-rdf-syntax-ns#member> <" + sourceNodeId + ">}" +
      "insert {<" + targetNodeId + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#member> <" + sourceNodeId + ">}";

    var url = Config.sources[Lineage_sources.activeSource].sparql_server.url + "?format=json&query=";

    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: Lineage_sources.activeSource }, function(err, result) {
      if (err) {
        return callback(err);
      }
    });
  };

  return self;
})();