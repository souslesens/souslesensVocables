var KGpropertyFilter = (function() {
  var self = {};

  self.currentNewFilters = [];
  self.currentSavedFilters = [];


  self.treeConfigs = {
    dataContainers: {
      key: "dataContainers",
      source: "IDCP",
      topUris: ["http://datalenergies.total.com/resource/tsf/idcp/DataContainer"],
      options: { memberPredicate: 1 },
      levels: 3,
      jstreeDiv: "KGpropertyFilter_dataContainerTreeDiv",
      parentPredicate: "^rdfs:member"
    }
    ,
    templates: {
      key: "templates",
      source: "IDCP",
      topUris: ["http://datalenergies.total.com/resource/tsf/idcp/template"],
      options: { memberPredicate: 0, specificPredicates: ["rdf:type", "<http://datalenergies.total.com/resource/tsf/idcp/9fc7b10ede>"] },
      levels: 5,
      jstreeDiv: "KGpropertyFilter_templatesTree"
    },
    disciplines: {
      key: "disciplines",
      source: "ISO_15926-PCA-2",
      topUris: ["http://data.15926.org/rdl/RDS6811233"],
      options: { memberPredicate: 1 },
      levels: 3,
      jstreeDiv: "KGpropertyFilter_disciplinesTree"
    },
    actors: {
      key: "actors",
      source: "IDCP",
      topUris: ["http://datalenergies.total.com/resource/tsf/idcp/DataContainer"],
      options: { memberPredicate: 1 },
      jstreeDiv: "KGpropertyFilter_actorsTree"
    },
    systems: {
      key: "systems",
      source: "IDCP",
      topUris: ["http://datalenergies.total.com/resource/tsf/idcp/DataContainer"],
      options: { memberPredicate: 1 },
      levels: 3,
      jstreeDiv: "KGpropertyFilter_systemsTree"
    },
    businessObjects: {
      key: "businessObjects",
      editable: false,
      source: "GIDEA-RAW",
      topUris: ["http://datalenergies.total.com/resource/tsf/gidea-raw/LogicalEntity"],
      options: { specificPredicates: ["?p"] },
      levels: 5,
      jstreeDiv: "KGpropertyFilter_businessObjectsTree"
    }


  };

  self.getTreeConfigByKey = function(key, value) {
    for (var entry in self.treeConfigs) {
      if (self.treeConfigs[entry][key] == value) {
        return self.treeConfigs[entry];
      }
    }

  };
  self.onLoaded = function() {
    var tsfPropertyFilterPrefix = Config.KGpropertyFilter.tsfPropertyFilterPrefix;


    $("#actionDivContolPanelDiv").load("snippets/KGpropertyFilter/leftPanel.html", function() {
      //  var sources = Config.KGpropertyFilter.sources;
      var sources = ["", "IDCP"];
      common.fillSelectOptions("KGpropertyFilter_sourceSelect", sources, true);
      $("#KGpropertyFilter_searchInPropertiesTreeInput").bind("keyup", null, KGpropertyFilter.searchInPropertiesTree);
      self.onChangeSourceSelect("IDCP");
    });

    //  MainController.UI.showHideRightPanel(true);
    $("#graphDiv").width(1000);
    /*  $("#graphDiv").load("snippets/KGpropertyFilter/centralPanel.html", function() {
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
        */


    $("#rightPanelDiv").load("snippets/KGpropertyFilter/rightPanel.html", function() {
      $("#KGpropertyFilter_rightPanelTabs").tabs({
        activate: function(_e, _ui) {
          self.currentAspect = _ui.newTab[0].textContent;
        },
        create(event, ui) {
          self.initRightPanel();


          /*  $("#KGpropertyFilter_rightPanelTabs").tabs("option","active",1)
$("#KGpropertyFilter_rightPanelTabs").tabs("option","active",0)*/
        }
      });
    });
    // });

    $("#accordion").accordion("option", { active: 2 });
  };


  self.onChangeSourceSelect = function(source) {
    // self.resetMatrixPropertiesFilters();
    self.currentSource = source;
    // self.initFiltersSource(source);

    self.loadInJstree(self.treeConfigs["dataContainers"], function(err, result) {
      if (err) {
        $("#KGpropertyFilter_searchInPropertiesTreeInput").bind("keyup", null, KGpropertyFilter.searchInPropertiesTree);
        return alert(err.responseText);
      }
    });
  };


  self.initRightPanel = function() {
    async.series(
      [
        function(callbackSeries) {
          self.loadInJstree(self.treeConfigs["disciplines"], function(err, result) {
            callbackSeries(err);
          });
        },
        function(callbackSeries) {
          self.loadInJstree(self.treeConfigs["templates"], function(err, result) {
            callbackSeries(err);
          });
        },
        function(callbackSeries) {
          $("#GenericTools_searchAllSourcesTermInput").bind("keyup", null, KGpropertyFilter.searchInPropertiesTree);

          return callbackSeries();

        },
        function(callbackSeries) {
          return callbackSeries();
          self.loadInJstree(self.treeConfigs["systems"], function(err, result) {
            callbackSeries(err);
          });
        }
        ,
        function(callbackSeries) {
          return callbackSeries();
          self.loadInJstree(self.treeConfigs["actors"], function(err, result) {
            callbackSeries(err);
          });
        }
      ],
      function(err) {
        $("#KGpropertyFilter_rightPanelTabs").tabs("option", "active", 0);
        if (err) {
          return alert(err.responseText);
        }
      }
    );

    return;
  };
  self.onSelectFilter = function() {
    // pass
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
      " ?restriction owl:onProperty <http://rds.posccaesar.org/ontology/lis14/rdl/hasQuality>.\n" +
      " ?restriction owl:someValuesFrom ?property.\n" +
      "   ?property rdfs:label ?propertyLabel.\n";

    if (classIds) {
      sparql += Sparql_common.setFilter("class", classIds);
    }

    function addFilters(aspect, selectId) {
      var filterId = $("#" + selectId).val();
      if (!filterId) {
        return;
      }
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

  self.client = {};


  self.searchInPropertiesTree = function(event, inputDiv, jstreeDiv) {

    inputDiv = "KGpropertyFilter_searchInPropertiesTreeInput";
    jstreeDiv = self.treeConfigs["dataContainers"].jstreeDiv;

    if (event.keyCode != 13 && event.keyCode != 9) {
      return;
    }
    var value = $("#" + inputDiv).val();
    $("#" + jstreeDiv).jstree(true).search(value);
    $("#" + inputDiv).val("");
  };

  self.loadInJstree = function(treeConfig, callback) {


    var depth = 3;
    Sparql_generic.getNodeChildren(
      treeConfig.source,
      null,
      treeConfig.topUris,
      treeConfig.levels,
      treeConfig.options,
      function(err, result) {
        //    Sparql_generic.getNodeChildren(self.currentSource, null, ["http://data.totalenergies.com/resource/ontology/cfihos_1.5/TagClass/CFIHOS-30000311"], depth, {}, function (err, result) {
        if (err) {
          return callback(err);
        }


        var jstreeData = [];
        var existingNodes = {};

        result.forEach(function(item) {
          if (!existingNodes[item.concept.value]) {
            existingNodes[item.concept.value] = 1;
            jstreeData.push({
              parent: "#",
              id: item.concept.value,
              text: item.conceptLabel.value,
              type: "Class",
              data: {
                type: treeConfig.key,
                source: self.currentSource,
                label: item.conceptLabel.value,
                id: item.concept.value
              }
            });
          }

          for (var i = 1; i <= 10; i++) {
            if (!item["child" + i]) {
              break;
            }
            var parent = i == 1 ? item.concept.value : item["child" + (i - 1)].value;

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
                  type: treeConfig.key,
                  source: self.currentSource,
                  label: label,
                  id: id
                }
              });
            }
          }
        });

        var jstreeOptions = {
          openAll: false,
          // withCheckboxes: true,
          selectTreeNodeFn: KGpropertyFilter.commonJstreeActions.onSelectTreeNode,
          // onAfterOpenNodeFn: KGpropertyFilter.onOpenClassesOrPropertyNode,
          //   onCheckNodeFn: null, //KGpropertyFilter.loadPropertiesFilters,
          //  tie_selection: false,
          contextMenu: KGpropertyFilter.commonJstreeActions.getJsTreeContextMenu(treeConfig.key),
          searchPlugin: {
            case_insensitive: true,
            fuzzy: false,
            show_only_matches: true
          }
        };
        common.jstree.loadJsTree(treeConfig.jstreeDiv, jstreeData, treeConfig.options.jstreeOptions || jstreeOptions);

        $("#waitImg").css("display", "none");
        callback();

      }
    );
  };


  self.commonJstreeActions = {

    onSelectTreeNode: function(event, obj) {
      self.currentTreeNode = obj.node;
      self.currentTreeNode.treeDiv = event.currentTarget.id;


      if (self.currentTreeNode.data.type == "dataContainers") {
        self.currentDataContainer = obj.node;
        self.showDataContainerDetails(self.currentTreeNode);

      }

    },
    createChildNode: function() {
      var parent = self.currentTreeNode.data.id;
      var label = prompt("New child label");
      if (!label) {
        return;
      }

      var treeConfig = self.getTreeConfigByKey("jstreeDiv", self.currentTreeNode.treeDiv);
      var parentPredicate = treeConfig.parentPredicate;
      if (!parentPredicate) {
        return alert("no parentPredicate in treeConfig");
      }
      var triples = [];
      let graphUri = Config.sources[treeConfig.source].graphUri;
      sourceUri = graphUri + common.formatStringForTriple(label, true);

      triples.push({ subject: sourceUri, predicate: "rdfs:label", object: label });
      triples.push({ subject: sourceUri, predicate: "rdf:type", object: "owl:NamedIndividual" });
      triples.push({ subject: sourceUri, predicate: parentPredicate, object: parent });


      Sparql_generic.insertTriples(treeConfig.source, triples, {}, function(err, _result) {
        if (err) {
          return alert(err.responseText);
        }

        MainController.UI.message("child Created");
        var newNode = {
          id: graphUri,
          text: label,
          parent: parent,
          data: {
            id: graphUri,
            label: label,
            source: treeConfig.source
          }

        };
        $("#" + self.currentTreeNode.treeDiv).jstree()
          .create_node(parent, newNode, "first", function(err, result) {
            $("#" + self.currentTreeNode.treeDiv).jstree().open_node(parent);
          });
      });

    },
    deleteNode: function() {
      var treeConfig = self.getTreeConfigByKey("jstreeDiv", self.currentTreeNode.treeDiv);
      if (self.currentTreeNode.children && self.currentTreeNode.children.length > 0) {

        var parentPredicate = treeConfig.parentPredicate;
        if (!parentPredicate) {
          return alert("no parentPredicate in treeConfig");
        }
        if (parentPredicate.indexOf("rdfs:member") < 0) {
          return alert("cannot delete nnode with children");
        }
      }

      if (!confirm("delete node " + self.currentTreeNode.text)) {
        return;
      }
      Sparql_generic.deleteTriples(treeConfig.source, self.currentTreeNode.data.id, null, null, function(err, result) {
        if (err) {
          return alert(message);
        }
        $("#" + self.currentTreeNode.treeDiv).jstree()
          .delete_node(self.currentTreeNode.data.id);
        return MainController.UI.message("node deleted");
      });

    },

    searchBO: function() {
      var term = self.currentTreeNode.text;
      $("#GenericTools_searchAllSourcesTermInput").val(term);
      $("#KGpropertyFilter_rightPanelTabs").tabs("option", "active", 4);
      KGpropertyFilter.rightPanelsActions.searchBusinessObjects();

    },

    associateNodeToDataContainer: function() {
      if (!self.currentDataContainer) {
        return alert("no data container selected");
      }
      var selectedNodeData = self.currentTreeNode.data;
      if (selectedNodeData.source == "GIDEA-RAW") {// create property
        if (self.currentTreeNode.parent.indexOf("Attribute") > 0) {
          if (!self.currentTreeNode.parentLogicalEntity) {
            return self.rightPanelsActions.showAttributesParentsDialog();
          }
          else{

            // create a new individual that is object of the dataContainer  and subject of gidea Attribute and Logical entity
            var newUri=Lineage_blend.graphModification.getURI("",selectedNodeData.source,"randomHexaNumber")
            var triples = [

              {
                subject: newUri,
                predicate:"rdf:type ",
                object: "owl:NamedIndividual"

              },
              {
                subject: newUri,
                predicate:"rdf:type ",
                object: "http://datalenergies.total.com/resource/tsf/idcp/gidea-attribute"

              },
              {
                subject: newUri,
                predicate:"rdfs:label ",
                object: self.currentTreeNode.parentLogicalEntity.label+"."+self.currentTreeNode.data.label

              },
              {
                subject: newUri,
                predicate:"rdfs:label ",
                object: self.currentTreeNode.parentLogicalEntity.label+"."+self.currentTreeNode.data.label

              },
              {

                subject: self.currentDataContainer.data.id,
                predicate: "http://datalenergies.total.com/resource/tsf/idcp/mapsWith",
                object: newUri,

              },
              {

                subject:newUri,
                predicate: "http://rds.posccaesar.org/ontology/lis14/rdl/hasPart",
                object: self.currentTreeNode.parentLogicalEntity.id,

              },
              {

                subject:newUri ,
                predicate: "http://rds.posccaesar.org/ontology/lis14/rdl/hasPart",
                object: self.currentTreeNode.data.id,

              },

            ];

            self.currentTreeNode.parentLogicalEntity=null;
          }
          triples=triples.concat(Lineage_blend.getCommonMetaDataTriples(newUri));
        }

        else if (self.currentTreeNode.parent.indexOf("LogicalEntity") > 0) {
          var triples = [
            {
              object: selectedNodeData.id,
              predicate: "http://datalenergies.total.com/resource/tsf/idcp/mapsWith",
              subject: self.currentDataContainer.data.id

            }
          ];
        }
      }
      else {// create member property
        var triples = [
          {
            subject: selectedNodeData.id,
            predicate: "rdfs:member",
            object: self.currentDataContainer.data.id

          }
        ];
      }
      Sparql_generic.insertTriples(self.treeConfigs["dataContainers"].source, triples, {}, function(err, result) {
        if (err) {
          return alert(err.responseText);
        }

      });

    },

    getJsTreeContextMenu: function(treeConfigKey) {
      var items = {};

      if (treeConfigKey != "businessObjects") {
        items.create = {
          label: "create child",
          action: function(_e) {
            // pb avec source
            KGpropertyFilter.commonJstreeActions.createChildNode();
          }
        };
        items.delete = {
          label: "delete node",
          action: function(_e) {
            // pb avec source
            KGpropertyFilter.commonJstreeActions.deleteNode();
          }
        };
      }
      else if (treeConfigKey == "businessObjects") {
        items.nodeInfos = {
          label: "Node infos",
          action: function(_e) {
            // pb avec source
            $("#mainDialogDiv").dialog("open");
            SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode, "mainDialogDiv");
          }
        };
      }

      if (treeConfigKey == "dataContainers") {
        items.searchBO = {
          label: "Search BO",
          action: function(_e) {
            // pb avec source
            KGpropertyFilter.commonJstreeActions.searchBO();
          }
        };
      }

      if (treeConfigKey != "dataContainers") {

        items.associate = {
          label: "Associate",
          action: function(_e) {
            KGpropertyFilter.commonJstreeActions.associateNodeToDataContainer();

          }
        };
      }


      return items;
    }

  };

  self.rightPanelsActions = {
    searchBusinessObjects: function(event) {
      if (event && event.keyCode != 13 && event.keyCode != 9) {
        return;
      }
      var options = {
        jstreeDiv: "KGpropertyFilter_businessObjectsTree",
        searchedSources: [self.treeConfigs["businessObjects"].source, "BUSINESS_OBJECTS_DATA_DOMAINS"],
        contextMenu: self.commonJstreeActions.getJsTreeContextMenu("businessObjects"),
        selectTreeNodeFn: function(event, obj) {
          self.currentTreeNode = obj.node;
          return;
        }
      };
      SourceBrowser.searchAllSourcesTerm(options);
    }

    ,
    showAttributesParentsDialog: function() {
      self.currentTreeNode.parentLogicalEntity = null;
      var html = "Select a Logical Entity<br>";
      html += "<select size='10' onclick='KGpropertyFilter.rightPanelsActions.onValidateAttributesParentsDialog($(this).val())' id='KGpropertyFilter_logicalEntitySelect'></select>";

      $("#mainDialogDiv").html(html);
      $("#mainDialogDiv").dialog("open");
      var source = "GIDEA-RAW";
      var options = {
        distinct: "?object ?objectLabel"
      };
      Sparql_OWL.getFilteredTriples(source, self.currentTreeNode.data.id, "http://datalenergies.total.com/resource/tsf/gidea-raw/describes", null, options, function(err, result) {
        if (err) {
          return alert(err.responseText);
        }

        var logicalEntities = [];
        result.forEach(function(item) {
          logicalEntities.push({
            id: item.object.value,
            label: item.objectLabel.value
          });

        });
        common.fillSelectOptions("KGpropertyFilter_logicalEntitySelect", logicalEntities, false, "label", "id");

      });
    },
    onValidateAttributesParentsDialog: function(logicalEntity) {
      var label=$( "#KGpropertyFilter_logicalEntitySelect option:selected" ).text();

      self.currentTreeNode.parentLogicalEntity ={id:logicalEntity,label:label};
      $("#mainDialogDiv").dialog("close");
      self.commonJstreeActions.associateNodeToDataContainer();
    }
  };
  self.showDataContainerDetails = function(node) {
    /* $("#KGpropertyFilter_nodeInfosDiv").load("snippets/KGpropertyFilter/dataContainer.html", function() {*/
    var level = self.currentTreeNode.parents.length - 1;
    var dataContainerId;
    if (level == 1) {
      dataContainerId = self.currentTreeNode;
    }
    else {
      return;
      dataContainerId = self.currentTreeNode.parents[level - 1];
    }


    /// $("#KGpropertyFilter_display_dataContainerDiv").html(self.currentTreeNode.text)
    var visjsNodes = [];
    var source = self.currentTreeNode.data.source;
    async.series([
      function(callbackSeries) {
        visjsGraph.clearGraph();
        return callbackSeries();

      },
      function(callbackSeries) {
        Lineage_classes.drawNodeAndParents(self.currentTreeNode.data, 0, { drawBeforeCallback: 1 }, function(err, result) {
          return callbackSeries(err);
        });
      },
      function(callbackSeries) {
        var options = {
          memberPredicate: true,
          depth: 2,
          drawBeforeCallback: 1
        };
        Lineage_classes.addChildrenToGraph(source, self.currentTreeNode.id, options, function(err, result) {
          if (err) {
            return callbackSeries(err);
          }
          result.nodes.forEach(function(node) {
            visjsNodes.push(node.id);
          });
          return callbackSeries();
        });
      },


      function(callbackSeries) {
        var properties = ["rdfs:member"];
        var options = { inversePredicate: 1 };
        Lineage_properties.drawPredicatesGraph(source, visjsNodes, properties, options, function(err, result) {
          return callbackSeries(err);
        });
      },
      function(callbackSeries) {
        var properties = ["http://datalenergies.total.com/resource/tsf/idcp/mapsWith"];
        var options = { };
        Lineage_properties.drawPredicatesGraph(source, visjsNodes, properties, options, function(err, result) {
          return callbackSeries(err);
        });
      }


    ], function(err) {
      if (err) {
        return alert(err.responseText);
      }
    });


  };


  return self;
})
();
