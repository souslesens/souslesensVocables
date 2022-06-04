var KGpropertyFilter = (function() {
  var self = {};

  self.onLoaded = function() {
    self.currentSource = "CFIHOS_1_5_PLUS";
    self.propertyFilteringSource = "TSF-PROPERTY-FILTERING";

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

    self.loadedFilters = {};
    var graphUri = Config.sources[self.propertyFilteringSource].graphUri;
    self.aspectsMap = {
      MDMentities: {
        predicate: graphUri + "appliesToMDMentityFilter",
        treeDiv: "KGpropertyFilter_MDMentitiesTree"
      },
      Disciplines: {
        predicate: graphUri + "appliesToDiscipline",
        treeDiv: "KGpropertyFilter_disciplinesTree"
      },
      LifeCycle: {
        predicate: graphUri + "appliesToLifeCycleStatus",
        treeDiv: "KGpropertyFilter_lifeCycleTree"
      },
      Organizations: {
        predicate: graphUri + "appliesToOrganizationFilter",
        treeDiv: "KGpropertyFilter_organizationsTree"
      }
    };

    $("#actionDivContolPanelDiv").load("snippets/KGpropertyFilter/leftPanel.html", function() {
      self.loadClassesTree();
      //   self.loadClassesPropertiesTree();
    });
    MainController.UI.toogleRightPanel(true);
    $("#graphDiv").load("snippets/KGpropertyFilter/centralPanel.html", function() {
      $("#KGpropertyFilter_filteringResult").height($("#graphDiv").height() - 200);
      $("#KGpropertyFilter_filteringResult").width($("#graphDiv").width());

      $("#KGpropertyFilter_centralPanelTabs").tabs({
        activate: function(e, ui) {
          self.currentOwlType = "Class";
          var divId = ui.newPanel.selector;
          if (divId == "#LineageTypesTab") {
            // pass
          }
        }
      });

      $("#rightPanelDiv").load("snippets/KGpropertyFilter/rightPanel.html", function() {
        $("#KGpropertyFilter_rightPanelTabs").tabs({
          activate: function(_e, _ui) {
            self.currentAspect = _ui.newTab[0].textContent;
          },
          create(event, ui) {
            self.initRightPanel();
            self.currentAspect = Object.keys(self.aspectsMap)[0];

            /*  $("#KGpropertyFilter_rightPanelTabs").tabs("option","active",1)
$("#KGpropertyFilter_rightPanelTabs").tabs("option","active",0)*/
          }
        });
      });
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
        onCheckNodeFn: null, //KGpropertyFilter.loadPropertiesFilters,
        tie_selection: false,
        contextMenu: KGpropertyFilter.getJstreePropertiesContextMenu()
      };
      self.currentFilters = {};
      common.jstree.loadJsTree("KGpropertyFilter_propertiesTreeDiv", jstreeData, options);

      $("#waitImg").css("display", "none");
    });
  };

  self.getJstreePropertiesContextMenu = function() {
    var items = {};
    items.nodeInfos = {
      label: "Node infos",
      action: function(_e) {
        // pb avec source
        SourceBrowser.showNodeInfos(self.currentSource, self.currentClassOrPropertyNode.data.id, "mainDialogDiv");
      }
    };
    items.viewFilters = {
      label: "View filters",
      action: function(_e) {
        KGpropertyFilter.loadPropertiesFilters();
      }
    };
    items.associate = {
      label: "Associate",
      action: function(_e) {
        KGpropertyFilter.associateFiltersToPropertyRestriction();
        // KGpropertyFilter.showAssociateDialog();
      }
    };
    return items;
  };
  self.showGraphPopupMenu = function() {
  };
  /*  self.showAssociateDialog = function () {
    var selectedProperties = common.jstree.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", true, "#");

    for (var key in self.aspectsMap)
        var items = $("#" + selectId)
            .jstree()
            .get_checked(true);
    items.forEach(function (item) {});
};*/

  self.onOpenClassesOrPropertyNode = function(evt, obj) {
    //  var classIds=$("#KGpropertyFilter_propertiesTreeDiv").jstree().get_checked();
    var classIds = obj.node.children;
    self.loadClassesPropertiesTree(classIds);
  };

  self.onClassOrPropertyNodeClicked = function(event, obj) {
    self.currentClassOrPropertyNode = obj.node;
    if (obj.node.data.type == "Class") {
      var propertyFilterTabIndex = $("#KGpropertyFilter_rightPanelTabs").tabs("option", "active");
      if (self.currentClassOrPropertyNode.parents.length > 1) self.currentClassId = self.currentClassOrPropertyNode.parents[1];
      else self.currentClassId = self.currentClassOrPropertyNode.id;
      $("#KGpropertyFilter_currentPropertyDiv").css("display", "block");
      $("#KGpropertyFilter_currentPropertySpan").html(obj.node.text);
      $("#KGpropertyFilter_currentPropertySpan2").html(obj.node.text);

      self.client.filterProperties(self.currentClassId);
    } else {
    }
  };

  self.associateFiltersToPropertyRestriction = function() {
    var leftObjs = $("#KGpropertyFilter_propertiesTreeDiv").jstree().get_checked(true);
    var selectedProperties = [];
    leftObjs.forEach(function(item) {
      if (item.data.type != "Property")
        // filter selected Properties Only
        return;
      selectedProperties.push(item.data);
    });
    if (selectedProperties.length == 0) return alert("no property is selected");

    var aspectObjs = $("#" + self.aspectsMap[self.currentAspect].treeDiv)
      .jstree()
      .get_checked(true);
    if (aspectObjs.length == 0) return alert("no aspect value  is selected");

    if (!confirm("Associate " + selectedProperties.length + "properties to  aspect selected  values of aspect" + self.currentAspect)) return;

    var filters = [];

    var classId;
    var classObj;
    var classLabel;

    selectedProperties.forEach(function(propertyObj) {
      self.currentFilters = [];
      self.currentFilters.aspect = self.currentAspect;
      aspectObjs.forEach(function(aspectObj) {
        // $("#" + selectId + " option:selected").each(function () {
        var filterId = propertyObj.retrictionId + "|" + aspectObj.data.id;
        var newFilter = {
          type: "filterClass",
          classLabel: classLabel,
          propertyLabel: propertyObj.propLabel,
          propertyId: propertyObj.propId,
          classId: propertyObj.classId,
          classLabel: propertyObj.classLabel,
          propertyRetrictionId: propertyObj.retrictionId,
          aspect: self.currentAspect,
          aspectId: self.currentAspect,
          aspectLabel: aspectObj.data.label,
          filterId: aspectObj.data.id,
          filterLabel: aspectObj.data.label
        };

        filters.push(newFilter);
      });
    });


    self.showFiltersDataTable(filters);
    self.saveNewRestrictionFilterTriples(filters);
  };

  self.showFiltersDataTable = function(filters) {
    var matrixHtml = self.matrix.getMatrixHtml(filters);
    $("#KGpropertyFilter_filteringResult").html(matrixHtml);
    return;
    var cols = [
      {
        title: "Selection",
        className: "select-checkbox",
        render: function(datum, type, row) {
          return "";
        }
      },
      { title: "Class", defaultContent: "" },
      { title: "Property", defaultContent: "" },
      { title: "Aspect", defaultContent: "" },
      { title: "Filter", defaultContent: "" }
    ];
    var dataset = [];
    filters.forEach(function(item) {
      dataset.push([item.propertyRetrictionId + "|" + item.filterId, item.classLabel, item.propertyLabel, item.aspectLabel, item.filterLabel]);
    });
    $("#KGpropertyFilter_filteringResult").html("<table id='dataTableDivExport'></table>");

    setTimeout(function() {
      self.dictionaryDataTable = $("#dataTableDivExport").DataTable({
        data: dataset,
        columns: cols,
        pageLength: 200,
        dom: "Bfrtip",
        /* "columnDefs": [
{ "width": "20px", "targets": 0 },
{ "width": "50px", "targets": 1 },
{ "width": "50px", "targets": 2 },
{ "width": "50px", "targets": 3 },
{ "width": "50px", "targets": 4 },
],*/
        // columnDefs: [{ className: "select-checkbox", targets: [0] }],
        select: {
          style: "multi",
          selector: "td:first-child"
        },
        buttons: [
          {
            extend: "csvHtml5",
            text: "Export CSV",
            fieldBoundary: "",
            fieldSeparator: ";"
          },
          {
            text: "Select All",
            action: function(e, dt, node, config) {
              KGpropertyFilter.dictionaryDataTable.rows().select();
            }
          },
          {
            text: "UnSelect All",
            action: function(e, dt, node, config) {
              KGpropertyFilter.dictionaryDataTable.rows().deselect();
            }
          },

          {
            text: "Delete",
            action: function(e, dt, node, config) {
              return alert("in construction");
              var data = KGpropertyFilter.dictionaryDataTable.rows({ selected: true }).data();
              KGpropertyFilter.deleteFilters(data);
            }
          }
        ]
      });
    }, 1000);
  };

  self.deleteFilters = function(dataTableData) {
    if (dataTableData.length == 0) return alert("no row is selected");
    if (!confirm(" remove  permanently " + dataTableData.length + " filters ?")) return;
    var subjects = [];
    var objects = [];
    var query = "DELETE DATA FROM   <" + Config.sources[self.propertyFilteringSource].graphUri + "> {\n";
    for (var i = 0; i < data.length; i++) {
      var array = data[i][0].split("|");
      query += "<" + array[0] + "> ?p <" + array[1] + ">.\n";
    }
    query += "}";
    let url = Config.sources[self.propertyFilteringSource].sparql_server.url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, { source: self.propertyFilteringSource }, function(err, result) {
      if (err) {
        return alert(err.responseText);
      }

      return MainController.UI.message("Deleted " + data.length + " filters", true);
    });
  };

  self.saveNewRestrictionFilterTriples = function(filters) {
    var triples = [];
    filters.forEach(function(filter) {
      triples.push({
        subject: filter.propertyRetrictionId,
        predicate: self.aspectsMap[self.currentFilters.aspect].predicate,
        object: filter.filterId
      });
    });

    Sparql_generic.insertTriples(self.propertyFilteringSource, triples, { getSparqlOnly: false }, function(err, result) {
      if (err) return alert(err.responseText);
      MainController.UI.message(result + " filters created ");
    });
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
      filters.forEach(function(item) {
        item.filterLabel = Sparql_common.getLabelFromURI(item.filter);
        item.aspectLabel = Sparql_common.getLabelFromURI(item.aspect);
      });
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
        $("#KGpropertyFilter_rightPanelTabs").tabs("option", "active", 0);
        if (err) return alert(err.response.text);
      }
    );

    return;
  };
  self.onSelectFilter = function() {
    // pass
  };

  self.loadClassesPropertiesTree = function(classIds) {
    //  var classIds = ["http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClass/CFIHOS-30000521"];
    // classIds = null

    var options = { filter: "  FILTER (?prop=<http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/hasQuality>)" };
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
              id: item.value.value,
              propLabel: item.valueLabel.value,
              retrictionId: item.node.value,
              classId: item.concept.value,
              classLabel: item.conceptLabel.value
            }
          });
        }
      });
      var options = {
        selectTreeNodeFn: function(/** @type {any} */ event, /** @type {any} */ obj) {
          return (self.currentClassNode = obj.node);
        }
      };
      common.array.sort(jstreeData, "text");
      common.jstree.addNodesToJstree("KGpropertyFilter_propertiesTreeDiv", null, jstreeData, options);
    });
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
        $("#KGpropertyFilter_lifeCycleTree").jstree().open_node("http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/Activity");
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
      }
    });
    jstreeData.push({
      id: "http://data.total.com/resource/tsf/mdm/SparePart",
      text: "6-SparePart",
      parent: "#",
      data: {
        id: "http://data.total.com/resource/tsf/mdm/SparePart",
        label: "SparePart",
        source: "http://data.total.com/resource/tsf/mdm/"
      }
    });

    var options = { openAll: true, withCheckboxes: true };
    common.array.sort(jstreeData, "text");
    common.jstree.loadJsTree("KGpropertyFilter_MDMentitiesTree", jstreeData, options);
    callback();
  };

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
      " ?restriction owl:onProperty <http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/hasQuality>.\n" +
      " ?restriction owl:someValuesFrom ?property.\n" +
      "   ?property rdfs:label ?propertyLabel.\n";

    if (classIds) sparql += Sparql_common.setFilter("class", classIds);

    function addFilters(aspect, selectId) {
      var filterId = $("#" + selectId).val();
      if (!filterId) return;
      var predicate = self.aspectsMap[aspect];
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
  /*
   type: "filterClass",
                      classLabel: classLabel,
                      propertyLabel: propertyObj.propLabel,
                      propertyId: propertyObj.propId,
                      classId: propertyObj.classId,
                      classLabel: propertyObj.classLabel,
                      propertyRetrictionId: propertyObj.retrictionId,
                      aspect: self.currentAspect,
                      aspectId: self.currentAspect,
                      aspectLabel: aspectObj.data.label,
                      filterId: aspectObj.data.id,
                      filterLabel: aspectObj.data.label,



   */
  self.matrix = {
    getMatrixHtml: function(filters, aspect) {
      let html = "<div class='matrix'>";

      var propsMap = {};

      self.matrixDivsMap = {};

      var aspectsArray = [];

      filters.sort(function(a,b){
        if((a.classLabel+a.propertyLabel)>(b.classLabel+b.propertyLabel))
          return 1;
        if((a.classLabel+a.propertyLabel)<(b.classLabel+b.propertyLabel))
          return -1;
        return 0;
      })

      filters.forEach(function(item) {
        if (aspectsArray.indexOf(item.filterLabel) < 0) aspectsArray.push(item.filterLabel);
      });


      filters.forEach(function(filter) {
        let propId = filter.class + "|" + filter.property;
        if (!propsMap[propId])
          propsMap[propId] = filter;
        var propAspects = [];
        aspectsArray.forEach(function(aspect) {
          if (filter.filterLabel==aspect)
            propAspects.push(1);
          else
            propAspects.push(0);
        })

        propsMap[propId].propAspects = propAspects;

      });
      {// draw first row with col titles
        let rowHtml = "<div  class='matrixRow " + "" + "'>"
        rowHtml += "<div class='matrixRowTitle' >" + "" + "</div>";
        aspectsArray.forEach(function(aspect) {
          rowHtml += "<div class='matrixColTitle'>" + aspect + "</div>";

        })
        html +=rowHtml+ "</div>"
      }

var classesArray=[]
      for (var propId in propsMap) {
          var prop = propsMap[propId];
          let matrixFilterClass = "matrixFilterClass";
          let rowDivId = "r" + common.getRandomHexaId(8);
          self.matrixDivsMap[rowDivId] = prop;
            //changeOf classLabel
          if(classesArray.indexOf(prop.classLabel)<0){
            classesArray.push(prop.classLabel)
            html+= "<div id='" + rowDivId + "' class='matrixClassRowTitle " + "" + "'>" +
            prop.classLabel+"</div>"

          }
          let rowHtml = "";
          rowHtml += "<div id='" + rowDivId + "' class='matrixRow " + "" + "'>"

           // rowHtml+="<div class='matrixRowTitle'>"+ prop.classLabel + "." + prop.propertyLabel+"</div>";
        rowHtml+="<div class='matrixRowTitle'>"+  prop.propertyLabel+"</div>";

          prop.propAspects.forEach(function(aspect) {
            let cellDivId = "C" + common.getRandomHexaId(8);
            self.matrixDivsMap[cellDivId] = { rowDivId: rowDivId, propId: propId, filterLabel: prop.filterLabel };
            let cellHtml = "";
            var cellClass = "";
            cellClass = (aspect == 1 ? "matrixCellMatch" : "");
            cellHtml = "<div id='" + cellDivId + "' class='matrixCell " + cellClass + "' >&nbsp;</div>";
            rowHtml += cellHtml

          });

          html += rowHtml+ "</div>";;
        }
        ;


      return html;
    }
  };

  return self;
})();
