var KGpropertyFilter = (function() {
  var self = {};
  self.currentSource = "CFIHOS_1_5_PLUS";
  self.propertyFilteringSource = "TSF-PROPERTY-FILTERING";
  self.loadedFilters = {};

  self.onLoaded = function() {
    Config.sources[self.propertyFilteringSource] = {
      isDictionary: true,
      editable: true,
      graphUri: "http://data.total.com/resource/tsf/property-filtering/",
      imports: [],
      sparql_server: {
        url: "_default"
      },
      controller: "Sparql_OWL",
      schemaType: "OWL"
    };
    var graphUri = Config.sources[self.propertyFilteringSource].graphUri;
    self.aspectMap = {
      Discipline: graphUri + "appliesToDiscipline",
      LifeCycle: graphUri + "appliesToLifeCycleStatus",
      Organization: graphUri + "appliesToOrganizationFilter"
    };
    $("#actionDivContolPanelDiv").load("snippets/KGpropertyFilter/leftPanel.html", function() {
      self.loadClassesTree();
      //   self.loadClassesProperties();
    });

    $("#graphDiv").load("snippets/KGpropertyFilter/centralPanel.html", function() {
      $("#KGcreator_centralPanelTabs").tabs({
        activate: function(e, ui) {
          self.currentOwlType = "Class";
          var divId = ui.newPanel.selector;
          if (divId == "#LineageTypesTab") {
            // pass
          }
        }
      });
    });
    MainController.UI.toogleRightPanel(true);
    $("#rightPanelDiv").load("snippets/KGpropertyFilter/rightPanel.html", function() {
      $("#KGpropertyFilter_rightPanelTabs").tabs({
        activate: function(_e, _ui) {
          // pass
        }
      });
      self.initRightPanel();
    });

    $("#accordion").accordion("option", { active: 2 });
  };

  self.loadClassesTree = function() {
    var depth = 3;
    Sparql_generic.getNodeChildren(self.currentSource, null, ["http://data.totalenergies.com/resource/ontology/cfihos_1.5/TagClass/CFIHOS-30000311"], depth, {}, function(err, result) {
      if (err) {
        return MainController.UI.message(err);
      }

      var jstreeData = [];
      var existingNodes = {};

      result.forEach(function(item) {
        if (!existingNodes[item.child1.value]) {
          existingNodes[item.child1.value] = 1;
          jstreeData.push({
            parent: "#",
            id: item.child1.value,
            text: item.child1Label.value,
            type: "Class",
            data: {
              type: "Class",
              source: self.currentSource,
              label: item.child1Label.value,
              id: item.child1.value
            }
          });
        }

        for (var i = 2; i <= depth; i++) {
          if (!item["child" + i]) break;
          var parent = item["child" + (i - 1)].value;
          var id = item["child" + i].value;
          var label = item["child" + i + "Label"].value;
          if (!existingNodes[id]) {
            existingNodes[id] = 1;
            jstreeData.push({
              parent: parent,
              id: id,
              text: label,
              type: "Class",
              data: {
                type: "Class",
                source: self.currentSource,
                label: label,
                id: id
              }
            });
          }
        }
      });

      var options = {
        openAll: false,
        withCheckboxes: true,
        selectTreeNodeFn: KGpropertyFilter.onClassOrPropertyNodeClicked,
        onAfterOpenNodeFn: KGpropertyFilter.onOpenClassesOrPropertyNode,
        onCheckNodeFn: KGpropertyFilter.loadPropertiesFilters,
        tie_selection: false,
        contextMenu: KGpropertyFilter.getPropertyTreeContextMenu()
      };
      self.currentFilters = {};
      common.jstree.loadJsTree("KGpropertyFilter_propertiesTreeDiv", jstreeData, options);

      $("#waitImg").css("display", "none");
    });
  };
  self.loadClassesProperties = function(classIds) {
    //  var classIds = ["http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClass/CFIHOS-30000521"];
    // classIds = null

    var options = { filter: "  FILTER (?prop=<http://standards.iso.org/iso/15926/part14/hasQuality>)" };
    Sparql_OWL.getObjectRestrictions(self.currentSource, classIds, options, function(err, result) {
      if (err) {
        return MainController.UI.message(err.responseText);
      }

      var jstreeData = [];
      var existingNodes = common.jstree.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", true, "#");
      var restrictionIds = [];
      result.forEach(function(item) {
        var id = item.concept.value + "_" + item.value.value;
        if (!existingNodes[id]) {
          existingNodes[id] = 1;
          restrictionIds.push(id);
          existingNodes[id] = 1;
          jstreeData.push({
            id: id,
            text: "<span class='KGpropertyFilter_property' >" + item.valueLabel.value + "</span>",
            parent: item.concept.value,
            type: "Property",
            data: {
              type: "Property",
              propId: item.value.value,
              propLabel: item.valueLabel.value,
              retrictionId: item.node.value
            }
          });
        }
      });
      common.array.sort(jstreeData, "text");
      common.jstree.addNodesToJstree("KGpropertyFilter_propertiesTreeDiv", null, jstreeData, null);
    });
  };

  self.onOpenClassesOrPropertyNode = function(evt, obj) {
    //  var classIds=$("#KGpropertyFilter_propertiesTreeDiv").jstree().get_checked();
    var classIds = obj.node.children;
    self.loadClassesProperties(classIds);
  };

  self.onClassOrPropertyNodeClicked = function(event, obj) {
    if (obj.node.data.type == "Class") {
      self.currentPropertyNode = obj.node;
      if (self.currentPropertyNode.parents.length > 1) self.currentClassId = self.currentPropertyNode.parents[1];
      else self.currentClassId = self.currentPropertyNode.id;
      $("#KGpropertyFilter_currentPropertyDiv").css("display", "block");
      $("#KGpropertyFilter_currentPropertySpan").html(obj.node.text);
      $("#KGpropertyFilter_currentPropertySpan2").html(obj.node.text);

      self.client.filterProperties(self.currentClassId);
    }
  };

  self.getPropertyTreeContextMenu = function() {
    // pass
  };

  self.getAssociatedProperties = function(_selectId) {
    // pass
  };

  self.associateFiltersToPropertyRestriction = function() {
    var existingNodesArray = common.jstree.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", true, "#");
    var existingNodes = {};

    existingNodesArray.forEach(function(item) {
      existingNodes[item] = 1;
    });

    var propertyObjs = $("#KGpropertyFilter_propertiesTreeDiv").jstree().get_checked(true);

    var filters = [];

    function execute(filterType, selectId) {
      var classId;
      var classObj;
      var classLabel;

      propertyObjs.forEach(function(propertyObj) {
        if (!propertyObj || propertyObj.parents.length < 2) return; //alert(" Select a property")
        //   var props=$("#KGpropertyFilter_propertiesTreeDiv").jstree().get_selected(true)
        //   props.forEach(function(prop) {
        classId = propertyObj.parent;
        classObj = $("#KGpropertyFilter_propertiesTreeDiv").jstree().get_node(classId);
        classLabel = classObj.data.label;
        classId = propertyObj.data.id;

        var aspectId = propertyObj.id + "_" + filterType;
        var items = $("#" + selectId)
          .jstree()
          .get_checked(true);
        items.forEach(function(item) {
          // $("#" + selectId + " option:selected").each(function () {
          var label = item.data.label;
          var id = item.data.id;
          var filterId = aspectId + "_" + id;
          var newFilter = {
            type: "filterClass",
            classLabel: classLabel,
            propertyLabel: propertyObj.data.propLabel,
            propertyId: propertyObj.data.propId,
            classId: classId,
            retrictionId: propertyObj.data.retrictionId,
            aspect: filterType,
            aspectClassId: id,
            aspectClassLabel: label
          };
          var restrictionFilterId = newFilter.retrictionId + "_" + newFilter.aspectClassId;
          if (!self.currentFilters[restrictionFilterId]) {
            self.currentFilters[restrictionFilterId] = newFilter;
            if (!existingNodes[filterId]) {
              existingNodes[filterId] = 1;
              filters.push(newFilter);
            }
          }
        });
      });
    }

    execute("LifeCycle", "KGpropertyFilter_lifeCycleTree");
    execute("Discipline", "KGpropertyFilter_disciplinesTree");
    execute("Organization", "KGpropertyFilter_organizationsTree");
    execute("MDMentities", "KGpropertyFilter_MDMentitiesTree");

    self.showFiltersDataTable(filters);
  };

  self.showFiltersDataTable = function(filters) {
    var columns = [
      { title: "Class", defaultContent: "" },
      { title: "Property", defaultContent: "" },
      { title: "Aspect", defaultContent: "" },
      { title: "Filter", defaultContent: "" }
    ];
    var dataset = [];
    filters.forEach(function(item) {
      dataset.push([item.classLabel, item.propertyLabel, item.aspect, item.aspectClassLabel]);
    });
    Export.showDataTable("KGpropertyFilter_filteringResult", columns, dataset);
  };

  self.saveNewRestrictionFilterTriples = function() {
    //   var existingNodesArray = common.jstree.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", false, "#");
    var triples = [];
    //   existingNodesArray.forEach(function (node) {
    for (var key in self.currentFilters) {
      var filter = self.currentFilters[key];
      triples.push({
        subject: filter.retrictionId,
        predicate: self.aspectMap[filter.aspect],
        object: filter.aspectClassId
      });
    }
    Sparql_generic.insertTriples(self.propertyFilteringSource, triples, { getSparqlOnly: false }, function(err, result) {
      if (err) return alert(err.responseText);
      MainController.UI.message(result + " filters created ");
    });

    //  existingNodesArray.
  };

  self.loadPropertiesFilters = function(callback) {
    var nodes = $("#KGpropertyFilter_propertiesTreeDiv").jstree().get_checked(true);
    var restrictionIds = [];
    nodes.forEach(function(item) {
      if (item.data.retrictionId) restrictionIds.push(item.data.retrictionId);
    });

    var filterStr = Sparql_common.setFilter("restriction", restrictionIds);
    var sparql =
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
      "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
      "SELECT * from <http://data.total.com/resource/tsf/property-filtering/> from <http://data.totalenergies.com/resource/ontology/cfihos_1.5/> WHERE {\n" +
      "  ?class rdfs:subClassOf ?restriction .\n" +
      "  ?restriction <http://www.w3.org/2002/07/owl#someValuesFrom> ?property.\n" +
      "  ?property rdfs:label ?propertyLabel.\n" +
      "  ?class rdfs:label ?classLabel.\n" +
      "  ?restriction ?aspect ?filter. filter (regex(str(?aspect),'http://data.total.com/resource/tsf/property-filtering/'))\n";
    sparql += filterStr;
    sparql += "} LIMIT 10000";
    var url = Config.sources[self.propertyFilteringSource].sparql_server.url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, sparql, "", { source: self.propertyFilteringSource }, function(err, result) {
      if (err) {
        return callback(err);
      }

      var filters = Sparql_common.getBindingsValues(result.results.bindings);
      self.showFiltersDataTable(filters);
    });
  };

  self.initRightPanel = function() {
    async.series(
      [
        function(callbackSeries) {
          self.loadMDMentitiesTree(function(err, _result) {
            callbackSeries(err);
          });
        },
        function(callbackSeries) {
          self.loadLifeCycleTree(function(err, _result) {
            callbackSeries(err);
          });
        },
        function(callbackSeries) {
          self.loadDisciplinesTree(function(err, _result) {
            callbackSeries(err);
          });
        },
        function(callbackSeries) {
          self.loadOrganizationsTree(function(err, _result) {
            callbackSeries(err);
          });
        }

      ],
      function(err) {
        $("#KGpropertyFilter_rightPanelTabs").tabs("option","active",0)
        if (err) return alert(err.response.text);
      }
    );

    return;
  };
  self.onSelectFilter = function() {
    // pass
  };

  self.loadLifeCycleTree = function(callback) {
    Sparql_OWL.getNodeChildren("ISO-15663", null, null, 2, {}, function(err, result) {
      if (err) return callback(err.responseText);
      var jstreeData = [];
      var existingNodes = {};
      result.forEach(function(item) {
        if (!existingNodes[item.concept.value]) {
          existingNodes[item.concept.value] = 1;
          jstreeData.push({
            id: item.concept.value,
            text: item.conceptLabel.value,
            parent: "#",
            data: {
              id: item.concept.value,
              label: item.conceptLabel.value,
              source: "ISO-15663"
            }
          });
        }
        if (!existingNodes[item.child1.value]) {
          existingNodes[item.child1.value] = 1;
          jstreeData.push({
            id: item.child1.value,
            text: item.child1Label.value,
            parent: item.concept.value,
            data: {
              id: item.child1.value,
              label: item.child1Label.value,
              source: "ISO-15663"
            }
          });
        }
      });
      common.array.sort(jstreeData, "text");
      var options = { openAll: false, withCheckboxes: true };
      common.jstree.loadJsTree("KGpropertyFilter_lifeCycleTree", jstreeData, options, function() {
        $("#KGpropertyFilter_lifeCycleTree").jstree().open_node("http://standards.iso.org/iso/15926/part14/Activity");
      });

      callback();
    });
  };

  self.loadDisciplinesTree = function(callback) {
    Sparql_OWL.getNodeChildren("ISO_15926-org", null, ["http://data.15926.org/cfihos/15926200"], 2, {}, function(err, result) {
      if (err) return callback(err.responseText);
      var jstreeData = [];
      var existingNodes = {};
      result.forEach(function(item) {
        if (!existingNodes[item.concept.value]) {
          existingNodes[item.concept.value] = 1;
          jstreeData.push({
            id: item.concept.value,
            text: item.conceptLabel.value,
            parent: "#",
            data: {
              id: item.concept.value,
              label: item.conceptLabel.value,
              source: "ISO-15663"
            }
          });
        }
        if (!existingNodes[item.child1.value]) {
          existingNodes[item.child1.value] = 1;
          jstreeData.push({
            id: item.child1.value,
            text: item.child1Label.value,
            parent: item.concept.value,
            data: {
              id: item.child1.value,
              label: item.child1Label.value,
              source: "ISO-15663"
            }
          });
        }
      });
      var options = { openAll: true, withCheckboxes: true };
      common.array.sort(jstreeData, "text");
      common.jstree.loadJsTree("KGpropertyFilter_disciplinesTree", jstreeData, options);
      callback();
    });
  };
  self.loadOrganizationsTree = function(callback) {
    Sparql_OWL.getNodeChildren("ISO_15926-org", null, ["http://data.15926.org/lci/Organization"], 2, {}, function(err, result) {
      if (err) return callback(err.responseText);
      var jstreeData = [];
      var existingNodes = {};
      result.forEach(function(item) {
        if (!existingNodes[item.concept.value]) {
          existingNodes[item.concept.value] = 1;
          jstreeData.push({
            id: item.concept.value,
            text: item.conceptLabel.value,
            parent: "#",
            data: {
              id: item.concept.value,
              label: item.conceptLabel.value,
              source: "ISO-15663"
            }
          });
        }
        if (!existingNodes[item.child1.value]) {
          existingNodes[item.child1.value] = 1;
          jstreeData.push({
            id: item.child1.value,
            text: item.child1Label.value,
            parent: item.concept.value,
            data: {
              id: item.child1.value,
              label: item.child1Label.value,
              source: "ISO-15663"
            }
          });
        }
      });
      common.array.sort(jstreeData, "text");
      var options = { openAll: true, withCheckboxes: true };
      common.jstree.loadJsTree("KGpropertyFilter_organizationsTree", jstreeData, options);
      callback();
    });
  };

  self.loadDisciplinesTree = function(callback) {
    Sparql_OWL.getNodeChildren("ISO_15926-org", null, ["http://data.15926.org/cfihos/15926200"], 2, {}, function(err, result) {
      if (err) return callback(err.responseText);
      var jstreeData = [];
      var existingNodes = {};
      result.forEach(function(item) {
        if (!existingNodes[item.concept.value]) {
          existingNodes[item.concept.value] = 1;
          jstreeData.push({
            id: item.concept.value,
            text: item.conceptLabel.value,
            parent: "#",
            data: {
              id: item.concept.value,
              label: item.conceptLabel.value,
              source: "ISO-15663"
            }
          });
        }
        if (!existingNodes[item.child1.value]) {
          existingNodes[item.child1.value] = 1;
          jstreeData.push({
            id: item.child1.value,
            text: item.child1Label.value,
            parent: item.concept.value,
            data: {
              id: item.child1.value,
              label: item.child1Label.value,
              source: "ISO-15663"
            }
          });
        }
      });
      var options = { openAll: true, withCheckboxes: true };
      common.array.sort(jstreeData, "text");
      common.jstree.loadJsTree("KGpropertyFilter_disciplinesTree", jstreeData, options);
      callback();
    });
  };
  self.loadMDMentitiesTree = function(callback) {

    var jstreeData = [];

    jstreeData.push({
      id: "http://data.total.com/resource/tsf/mdm/Tag",
      text: "1-Tag",
      parent: "#",
      data: {
        id: "http://data.total.com/resource/tsf/mdm/Tag",
        label: "Tag",
        source: "http://data.total.com/resource/tsf/mdm/"
      }
    });

  jstreeData.push({
    id: "http://data.total.com/resource/tsf/mdm/FunctionalClass",
    text: "2-FunctionalClass",
    parent: "#",
    data: {
      id: "http://data.total.com/resource/tsf/mdm/FunctionalClass",
      label: "FunctionalClass",
      source: "http://data.total.com/resource/tsf/mdm/"
    }
  });
  jstreeData.push({
    id: "http://data.total.com/resource/tsf/mdm/PhysicalClass",
    text: "3-PhysicalClass",
    parent: "#",
    data: {
      id: "http://data.total.com/resource/tsf/mdm/PhysicalClass",
      label: "PhysicalClass",
      source: "http://data.total.com/resource/tsf/mdm/"
    }
  });
  jstreeData.push({
    id: "http://data.total.com/resource/tsf/mdm/Model",
    text: "4-Model",
    parent: "#",
    data: {
      id: "http://data.total.com/resource/tsf/mdm/Model",
      label: "Model",
      source: "http://data.total.com/resource/tsf/mdm/"
    }
  });

  jstreeData.push({
    id: "http://data.total.com/resource/tsf/mdm/ModelItem",
    text: "5-ModelItem",
    parent: "#",
    data: {
      id: "http://data.total.com/resource/tsf/mdm/ModelItem",
      label: "ModelItem",
      source: "http://data.total.com/resource/tsf/mdm/"
    },
  });
    jstreeData.push({
      id: "http://data.total.com/resource/tsf/mdm/SparePart",
      text: "6-SparePart",
      parent: "#",
      data: {
        id: "http://data.total.com/resource/tsf/mdm/SparePart",
        label: "SparePart",
        source: "http://data.total.com/resource/tsf/mdm/"
      },
    });

  var options = { openAll: true, withCheckboxes: true };
  common.array.sort(jstreeData, "text");
  common.jstree.loadJsTree("KGpropertyFilter_MDMentitiesTree", jstreeData, options);
  callback();


}
;

self.execSparqlFilterQuery = function(classIds, callback) {
  var sparql =
    "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
    "SELECT * from <http://data.total.com/resource/tsf/property-filtering/> from <http://data.totalenergies.com/resource/ontology/cfihos_1.5/> WHERE {\n" +
    "  ?class rdfs:subClassOf ?restriction .\n" +
    "  ?class rdfs:label ?classLabel.\n" +
    "  ?restriction rdf:type owl:Restriction.\n" +
    "  ?restriction ?aspect ?filterId.\n" +
    " ?restriction owl:onProperty <http://standards.iso.org/iso/15926/part14/hasQuality>.\n" +
    " ?restriction owl:someValuesFrom ?property.\n" +
    "   ?property rdfs:label ?propertyLabel.\n";

  if (classIds) sparql += Sparql_common.setFilter("class", classIds);

  function addFilters(aspect, selectId) {
    var filterId = $("#" + selectId).val();
    if (!filterId) return;
    var predicate = self.aspectMap[aspect];
    sparql += " filter ( ?aspect=<" + predicate + "> &&  ?filterId=<" + filterId + ">  )";
  }

  addFilters("LifeCycle", "KGpropertyFilter_lifeCycleSelect2");
  addFilters("Discipline", "KGpropertyFilter_disciplineSelect2");
  addFilters("Organization", "KGpropertyFilter_organizationSelect2");

  sparql += "} limit 10000";
  var url = Config.sources[self.propertyFilteringSource].sparql_server.url + "?format=json&query=";
  Sparql_proxy.querySPARQL_GET_proxy(url, sparql, "", { source: self.currentSource }, function(err, result) {
    if (err) {
      return callback(err);
    }
    var data = [];
    result.results.bindings.forEach(function(item) {
      var obj = {};
      for (var key in item) {
        obj[key] = item[key].value;
      }
      data.push(obj);
    });
    return callback(null, data);
  });
};

self.client = {
  filterProperties: function(_allClasses) {
    return;
    // var classId = null;
    // if (!allClasses) classId = self.currentClassId;

    // self.execSparqlFilterQuery(classId, function (err, result) {
    //     if (err) return MainController.UI.message(err.responseText);
    //     var columns = [
    //         { title: "Class", defaultContent: "" },
    //         { title: "Property", defaultContent: "" },
    //         { title: "ClassUri", defaultContent: "" },
    //         { title: "PropertyUri", defaultContent: "" },
    //     ];
    //     var dataset = [];
    //     result.forEach(function (item) {
    //         dataset.push([item.classLabel, item.propertyLabel, item.class, item.property]);
    //     });
    //     Export.showDataTable("KGpropertyFilter_filteringResult", columns, dataset);
    // });
  }
};

return self;
})
();
