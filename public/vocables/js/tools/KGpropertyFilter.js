var KGpropertyFilter = (function() {
  var self = {};

  self.currentNewFilters = [];
  self.currentSavedFilters = [];


  self.treeConfigs = {
    dataContainers: {
      source: "IDCP",
      topUris: ["http://datalenergies.total.com/resource/tsf/idcp/DataContainer"],
      options: { memberPredicate: 1 },
      levels: 3,
      jstreeDiv: "KGpropertyFilter_dataContainerTreeDiv",
      parentPredicate: "^rdfs:member"
    }
    ,
    templates: {
      source: "IDCP",
      topUris: ["http://datalenergies.total.com/resource/tsf/idcp/template"],
      options: { memberPredicate: 0, specificPredicates: ["rdf:type", "<http://datalenergies.total.com/resource/tsf/idcp/9fc7b10ede>"] },
      levels: 5,
      jstreeDiv: "KGpropertyFilter_templatesTree"
    },
    disciplines: {
      source: "ISO_15926-PCA-2",
      topUris: ["http://data.15926.org/rdl/RDS6811233"],
      options: { memberPredicate: 1 },
      levels: 3,
      jstreeDiv: "KGpropertyFilter_disciplinesTree"
    },
    actors: {
      source: "IDCP",
      topUris: ["http://datalenergies.total.com/resource/tsf/idcp/DataContainer"],
      options: { memberPredicate: 1 },
      jstreeDiv: "KGpropertyFilter_actorsTree"
    },
    systems: {
      source: "IDCP",
      topUris: ["http://datalenergies.total.com/resource/tsf/idcp/DataContainer"],
      options: { memberPredicate: 1 },
      levels: 3,
      jstreeDiv: "KGpropertyFilter_systemsTree"
    },
    businessObjects: {
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
      self.onChangeSourceSelect ("IDCP")
    });

    //  MainController.UI.showHideRightPanel(true);
    $("#graphDiv").width(1000);
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


            /*  $("#KGpropertyFilter_rightPanelTabs").tabs("option","active",1)
$("#KGpropertyFilter_rightPanelTabs").tabs("option","active",0)*/
          }
        });
      });
    });

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
        //  $("#KGpropertyFilter_businessObjects_searchDiv").load("./snippets/searchAll.html");
          return callbackSeries();
          /*  self.loadInJstree(self.treeConfigs["businessObjects"], function(err, result) {
                callbackSeries(err);
              });*/
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

  self.matrix = {
    showFiltersMatrix: function(filters, aspect) {
      let html = "<div class='matrix'>";

      self.matrixDivsMap = {};
      var currentMatrixPropsMap = {};
      var fitlersArray = [];

      filters.forEach(function(item) {
        if (fitlersArray.indexOf(item.filterLabel) < 0) {
          fitlersArray.push(item.filterLabel);
        }
      });

      filters.forEach(function(filter) {
        let propId = filter.classId + "|" + filter.propertyId;
        if (!currentMatrixPropsMap[propId]) {
          currentMatrixPropsMap[propId] = filter;
        }
        if (!currentMatrixPropsMap[propId].propFilters) {
          currentMatrixPropsMap[propId].propFilters = {};
        }
        fitlersArray.forEach(function(filterLabel) {
          var value = 0;
          if (filter.filterLabel == filterLabel) {
            value = 1;
          }
          currentMatrixPropsMap[propId].propFilters[filterLabel] |= value;
        });
      });
      {
        // draw first row with col titles
        let rowHtml = "<div  class='matrixRow " + "" + "'>";
        rowHtml += "<div class='matrixRowTitle' >" + "" + "</div>";
        fitlersArray.forEach(function(aspect) {
          rowHtml += "<div class='matrixColTitle'>" + aspect + "</div>";
        });
        html += rowHtml + "</div>";
      }

      for (var propId in currentMatrixPropsMap) {
        var prop = currentMatrixPropsMap[propId];
        let matrixFilterClass = "matrixFilterClass";
        let rowDivId = "r" + common.getRandomHexaId(8);
        self.matrixDivsMap[rowDivId] = prop;
        let rowHtml = "";
        rowHtml += "<div id='" + rowDivId + "' class='matrixRow " + "" + "'>";
        var statusClass = "matrixPropTitle_" + prop.status;
        let propDivId = "r" + common.getRandomHexaId(8);
        self.matrixDivsMap[propDivId] = { rowDivId: rowDivId, propId: propId };
        rowHtml += "<div id='" + propDivId + "' class='matrixRowTitle " + statusClass + "'>" + prop.classLabel + "." + prop.propertyLabel + "</div>";

        fitlersArray.forEach(function(propFilter) {
          let cellDivId = "C" + common.getRandomHexaId(8);
          self.matrixDivsMap[cellDivId] = { rowDivId: rowDivId, propId: propId, filterLabel: prop.filterLabel };
          let cellHtml = "";
          var cellClass = "";
          cellClass = prop.propFilters[propFilter] == 1 ? "matrixCellMatch" : "";
          cellHtml = "<div id='" + cellDivId + "' class='matrixCell " + cellClass + "' >&nbsp;</div>";
          rowHtml += cellHtml;
        });

        html += rowHtml + "</div>";
      }

      $("#KGpropertyFilter_filteringResult").html(html);
      $("#KGpropertyFilter_filteringResult").animate({ zoom: 1.2 }, 400);
      $(".matrixRowTitle ").bind("click", KGpropertyFilter.matrix.onClickPropTitleDiv);
      $(".matrixCell ").bind("click", KGpropertyFilter.matrix.onClickPropCellDiv);
    },

    onClickPropTitleDiv: function(e) {
      var divId = $(this).attr("id");
      var prop = self.matrixDivsMap[divId];
      self.selectedMatrixProp = prop;
      var menuhtml = "    <span  class=\"popupMenuItem\" onclick=\"KGpropertyFilter.matrix.removePropAllfilters();\">remove prop</span>";
      $("#graphPopupDiv").html(menuhtml);
      var point = { x: e.clientX, y: e.clientY };
      MainController.UI.showPopup(point, "graphPopupDiv", true);
    },

    onClickPropCellDiv: function(e) {
      var divId = $(this).attr("id");
      var filter = self.matrixDivsMap[divId];
      self.selectedMatrixFilter = filter;
      var menuhtml = "    <span  class=\"popupMenuItem\" onclick=\"KGpropertyFilter.matrix.removePropfilter();\">remove prop</span>";
      $("#graphPopupDiv").html(menuhtml);
      var point = { x: e.clientX, y: e.clientY };
      MainController.UI.showPopup(point, "graphPopupDiv", true);
    },
    removePropAllfilters: function() {
      var prop = self.selectedMatrixProp;
      alert("coming soon");
    },
    removePropfilter: function() {
      var filter = (self.selectedMatrixFilter = filter);
      alert("coming soon");
    },

    exportMatrix: function() {
      return alert("coming soon");
    },
    copyMatrix: function() {
      return alert("coming soon");
      var html = $(".matrix").html();
      common.copyTextToClipboard(html);
    }
  };


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
                type: "Class",
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
                  type: "Class",
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
          contextMenu: KGpropertyFilter.commonJstreeActions.getJstreePropertiesContextMenu(),
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

    searchBO:function(){
      var term=self.currentTreeNode.text
      $("#GenericTools_searchAllSourcesTermInput").val(term);
      $("#KGpropertyFilter_rightPanelTabs").tabs("option", "active", 4);
      KGpropertyFilter.rightPanelsActions.searchBusinessObjects()

    },


    getJstreePropertiesContextMenu: function() {
      var items = {};
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

      items.nodeInfos = {
        label: "Node infos",
        action: function(_e) {
          // pb avec source
          KGpropertyFilter.commonJstreeActions.showNodeInfos();
        }
      };
      items.searchBO = {
        label: "Node infos",
        action: function(_e) {
          // pb avec source
          KGpropertyFilter.commonJstreeActions.searchBO()
        }
      };


      /*   items.associate = {
           label: "Associate",
           action: function(_e) {
             KGpropertyFilter.commonJstreeActions.associateFiltersToPropertyRestriction();
             // KGpropertyFilter.showAssociateDialog();
           }
         };*/
      return items;
    }

  };

  self.rightPanelsActions = {
    searchBusinessObjects: function(event) {
      if (event &&  event.keyCode != 13 && event.keyCode != 9) {
        return;
      }
      var options = {
        jstreeDiv: "KGpropertyFilter_businessObjectsTree",
        searchedSources: self.treeConfigs["businessObjects"].source
      };
      SourceBrowser.searchAllSourcesTerm(options)
    }
  }


  return self;
})
();
