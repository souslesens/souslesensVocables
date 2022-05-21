var KGbrowserQuery = (function() {
  var self = {};
  self.classes = {};
  self.existingNodesIds = {};
  self.model = null;
  self.queryMode = "count";
  self.queryFilterNodes = [];
  self.shortestPathQueriesStack = [];
  self.varNamesMap = {};
  self.currentPath = null;
  self.onSelectKGtreeNode = function(event, obj) {
    if (obj.node.id == "..") return self.loadAdl();

    //  return self.loadAdl(obj.node)

    self.currentNode = obj.node;
    KGbrowser.currentNode = obj.node;
    KGbrowser.queryMode = "graph";
    self.queryMode = "count";
    self.showQueryParamsDialog({ x: w - 100, y: h / 3 });
    //   $("#KGbrowser_adlJstreeDiv").jstree(true).settings.contextmenu.items = self.jstree.getJstreeConceptsContextMenu("KGbrowser_adlJstreeDiv")
  };

  self.hideQueryParamsDialog = function() {
    $("#KGbrowserQueryParamsDialog").css("display", "none");
  };

  self.showQueryParamsDialog = function(position, node) {
    if (!node) node = self.currentNode;

    var firstClass = KGbrowserQuery.queryFilterNodes.length == 0;
    self.currentQueryDialogPredicates = [];
    if (!firstClass) {
      var predicates = self.getClassesPredicates(node.data.id, true);
      var ok = false;
      //  var ok = true;
      self.currentQueryDialogPredicates = [];

      predicates.forEach(function(item) {
        item.predicateLabel = self.model[item.predicate].label;
        if (firstClass) {
          self.currentQueryDialogPredicates.push(item);
        } else {
          self.currentMatchingFilterNode = null;
          KGbrowserQuery.queryFilterNodes.forEach(function(filter, _index) {
            var previousClass = filter.class;
            if (item.object == previousClass) {
              ok = true;
              self.currentMatchingFilterNode = filter;
              if (item.inverse) item.predicateLabel = "^" + item.predicateLabel;
              self.currentQueryDialogPredicates.push(item);
            }
          });
        }
      });
      if (!ok) ; //  return alert("class have to be contiguous in the graph")
    }

    self.currentQueryDialogField = node.data.id;
    self.showNodeProperties(node);
    $("#KGbrowserQueryParams_typeSelect").css("display", "none");

    //   $("#KGbrowserQueryParamsDialog").css("left", position.x - 200)
    $("#KGbrowserQueryParamsDialog").css("left", position.x + 200);
    $("#KGbrowserQueryParamsDialog").css("top", position.y);
    $("#KGbrowserQueryParamsDialog").css("display", "block");
    setTimeout(function() {
      $("#KGbrowserQueryParams_operator").val("=");
      $("#KGbrowserQueryParams_value").val("");
      $("#KGbrowserQueryParams_valuesSelect").val("");
      common.fillSelectOptions("KGbrowserQueryParams_valuesSelect", [""]);

      common.fillSelectOptions("KGbrowserQueryParams_predicateSelect", self.currentQueryDialogPredicates, null, "predicateLabel", "predicate");
      if (node.data.searchedLabel) {
        var array = [{ label: " rdfs:label", id: "http://www.w3.org/2000/01/rdf-schema#label" }];
        common.fillSelectOptions("KGbrowserQueryParams_property", array, false, "label", "id");

        $("#KGbrowserQueryParams_value").val(node.data.searchedLabel);
      }
    }, 500);
  };

  self.getClassesPredicates = function(classIds, _withInverse) {
    var classes = KGbrowserQuery.classes;
    if (!Array.isArray(classIds)) classIds = [classIds];

    var uniquePredicates = {};
    var retainedPredicates = [];
    classIds.forEach(function(classId) {
      var predicates = classes[classId];
      for (var predicate in predicates) {
        predicates[predicate].forEach(function(object) {
          if (predicate.indexOf("label") > -1) return;
          if (predicate.indexOf("type") > -1) return;
          if (!uniquePredicates[predicate + object]) {
            uniquePredicates[predicate + object] = 1;
            var label = KGbrowserQuery.model[classId].label + "-" + KGbrowserQuery.model[predicate].label + "->" + KGbrowserQuery.model[object].label;
            var id = classId + "|" + predicate + "|" + object;
            retainedPredicates.push({
              predicate: predicate,
              inverse: false,
              subject: classId,
              object: object,
              id: id,
              label: label
            });
          }
        });
      }
      //inverse
      for (var subject in classes) {
        for (predicate in classes[subject]) {
          classes[subject][predicate].forEach(function(object) {
            if (predicate.indexOf("label") > -1) return;
            if (predicate.indexOf("type") > -1) return;
            if (object == classId) {
              if (!uniquePredicates["^" + predicate + object]) {
                uniquePredicates["^" + predicate + object] = 1;
                var label = KGbrowserQuery.model[classId].label + "-" + KGbrowserQuery.model[predicate].label + "->" + KGbrowserQuery.model[subject].label;
                var id = classId + "|" + predicate + "|" + subject;
                retainedPredicates.push({
                  predicate: predicate,
                  inverse: true,
                  subject: classId,
                  object: subject,
                  id: id,
                  label: label
                });
              }
            }
          });
        }
      }
    });
    return retainedPredicates;
  };

  self.onQueryParamsListClick = function() {
    var listValue = $("#KGbrowserQueryParams_valuesSelect").val();
    if (listValue == "") {
      KGbrowserQuery.listQueryParamsDialogFieldValues();
      return $("#KGbrowserQueryParams_operator").val("=");
    }
  };
  self.onQueryParamsListChange = function() {
    var value = $("#KGbrowserQueryParams_valuesSelect").val();
    $("#KGbrowserQueryParams_value").val(value);
    self.onQueryParamsDialogValidate("union");
  };
  self.showNodeProperties = function(node) {
    var properties = [];
    for (var predicate in self.classes[node.data.id]) {
      if (predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
        var label = predicate;
        if (self.model[predicate]) label = self.model[predicate].label;
        properties.push({
          propertyLabel: label,
          property: predicate
        });
      }
    }
    properties.push({
      propertyLabel: "label",
      property: "http://www.w3.org/2000/01/rdf-schema#label"
    });

    var withBlankOption = false;
    if (properties.length > 1) withBlankOption = true;
    $("#KGbrowserQueryParams_type").html(node.data.label);
    $("#KGbrowserQueryParams_typeId").html(node.data.id);
    common.fillSelectOptions("KGbrowserQueryParams_property", properties, withBlankOption, "propertyLabel", "property", "http://www.w3.org/2000/01/rdf-schema#label");
  };

  (self.listQueryParamsDialogFieldValues = function() {
    var field = self.currentNode.data.id;
    var property = $("#KGbrowserQueryParams_property").val();
    var value = $("#KGbrowserQueryParams_value").val();

    var filter = "";
    if (value != "") filter = "FILTER (regex(?obj, \"^" + value + "\", \"i\") || regex(?objLabelLabel, \"^" + value + "\", \"i\") )";

    var filterGraphStr = "";
    /*   if( KGbrowser.currentGraphNodeSelection)
               filterGraphStr = Sparql_common.setFilter("sub",KGbrowser.currentGraphNodeSelection.id)*/

    if (!property || property == "") return alert("select a property");
    var fromStr = Sparql_common.getFromStr(KGbrowser.currentSource);
    var query =
      " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> " +
      "Select  distinct ?obj ?objLabel " +
      fromStr +
      " where {" +
      " ?sub <" +
      property +
      "> ?obj . ?sub rdf:type <" +
      field +
      ">. optional {?obj rdfs:label ?objLabel}" +
      filter +
      filterGraphStr +
      "} order by ?objLabel  ?obj limit " +
      Config.KG.queryLimit;
    var url = Config.sources[KGbrowser.currentSource].sparql_server.url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, { source: KGbrowser.currentSource }, function(err, result) {
      if (err) return MainController.UI.message(err);
      if (result.results.bindings.length > Config.KG.queryLimit) return alert("Too many values found : > " + result.results.bindings.length);
      var data = [];
      result.results.bindings.forEach(function(item) {
        var label;
        if (!item.objLabel) label = item.obj.value;
        else label = item.objLabel.value;
        data.push({ id: item.obj.value, label: label });
      });
      common.fillSelectOptions("KGbrowserQueryParams_valuesSelect", data, true, "label", "id");
    });
  }),
    (self.updateAdlTree = function(node) {
      KGbrowser.jstree.load.loadAdl(node);
    }),
    (self.onSelectDialogField = function(type) {
      self.currentQueryDialogField = type;
      self.query.showNodeProperties({ data: { type: type, id: type, label: self.OneModelDictionary[type] } });
    });

  self.onOperatorSelect = function(_operator) {
    // Pass
  };

  self.onQueryParamsDialogValidate = function(logicalMode) {
    var predicate = $("#KGbrowserQueryParams_predicateSelect").val();
    if (predicate == "" && self.queryFilterNodes.length > 0) return alert("select a predicate");

    var predicateIndex = $("#KGbrowserQueryParams_predicateSelect")[0].selectedIndex;
    var property = $("#KGbrowserQueryParams_property").val();
    var operator = $("#KGbrowserQueryParams_operator").val();
    var value = $("#KGbrowserQueryParams_value").val();
    var field = self.currentQueryDialogField;
    $("#KGbrowserQueryParamsDialog").css("display", "none");
    var dialogFilterStr = "";
    var numberOperators = ("<", ">", "<=", ">=");

    var varName = "?" + Sparql_common.formatStringForTriple(self.model[field].label, true) + "_" + self.queryFilterNodes.length;
    if (!self.varNamesMap[varName]) {
      var color = self.model[field].color;
      self.varNamesMap[varName] = { id: field, predicates: self.classes[field], color: color };
    }
    var varNameX = varName + "_X";
    /*   if (logicalMode == "union")//self.queryTypesArray.length == 0)
               typeVarName = "?sub"
           else
               typeVarName = "?obj"*/

    if (property && property != "") {
      if (value && value != "") {
        if (operator == "contains") dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter ( regex(" + varNameX + ",'" + value + "','i')) ";
        else if (operator == "not contains") dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter regex(" + varNameX + ", '^((?!" + value + ").)*$','i') ";
        else if ($("#KGbrowserQueryParams_valuesSelect").val() != "") {
          if (value.indexOf("http") > -1) dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter (" + varNameX + " =<" + value + ">) ";
          else dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter (" + varNameX + " " + operator + "'" + value + "') ";
        } else if (numberOperators.indexOf(operator) > -1) {
          if (!common.isNumber(value) && operator == "=") dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter (" + varNameX + " " + operator + "'" + value + "') ";
          else dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter ( xsd:float(" + varNameX + ")" + operator + value + ") ";
        } else dialogFilterStr = varName + " <" + property + "> " + varNameX + ". filter (" + varNameX + " " + operator + value + ") ";
      } else {
        dialogFilterStr = ""; //typeVarName + " <" + property + "> "+varName+". "
      }
    }
    var filterLabel;
    if (dialogFilterStr == "") filterLabel = "all";
    else {
      filterLabel = self.model[property].label + " " + operator + " " + value;
    }

    dialogFilterStr += varName + "    rdf:type " + varName + "Type.";
    dialogFilterStr += "filter(   " + varName + "Type =<" + field + "> )";

    if (dialogFilterStr.indexOf("Label") < 0) dialogFilterStr += "optional {" + varName + " rdfs:label " + varName + "Label} ";

    if (self.queryMode == "expandGraphNode") {
      KGbrowserGraph.expandNode(dialogFilterStr);
    } else if (self.queryMode == "count") {
      var options = {
        filter: dialogFilterStr,
        filterLabel: filterLabel,
        logicalMode: logicalMode,
        varName: varName,
        count: 1,
        classId: field,
        predicate: self.currentQueryDialogPredicates[predicateIndex]
      };

      var nodeData = {
        type: "count",
        class: self.currentNode.data.id,
        count: 0,
        filter: options.filter,
        filterLabel: options.filterLabel,
        varName: options.varName,
        color: color,
        id: self.currentNode.data.id,
        predicate: options.predicate
      };
      // KGbrowserQuery.queryFilterNodes.splice(0, 0, nodeData);
      KGbrowserQuery.queryFilterNodes.push(nodeData);

      var setFilterCountUI = function() {
        //  KGbrowserGraph.addCountNodeToModelGraph(self.currentNode, nodeData, queryResult, options, function (err, nodeData) {
        $("#KGbrowser_accordion").accordion("option", { active: 1 });
        var checkedStr = "";
        if (nodeData.count < 50) checkedStr = " checked='checked' ";
        var filterId = nodeData.id;
        var iconUrl = null;
        if (KGbrowserCustom.superClassesMap[nodeData.class])
          iconUrl = null;//KGbrowserCustom.iconsDir + KGbrowserCustom.superClassesMap[nodeData.class].group.toLowerCase() + ".png";
        var superClassLabel = KGbrowserQuery.model[nodeData.class].label;
        var divId = "filter_" + common.getRandomHexaId(5);
        KGbrowserQuery.queryFilterNodes[KGbrowserQuery.queryFilterNodes.length - 1].filterDivId = divId;
        var html =
          "<div class='KGbrowser_filterDiv ' style='color:" +
          nodeData.color +
          "' id='" +
          divId +
          "'>" +
          "<input  type='checkbox'  " +
          checkedStr +
          "class='KGbrowser_graphFilterCBX'>&nbsp;" +
          //  "<button class='btn btn-sm my-1 py-0 btn-outline-primary' title='list content' onclick='KGbrowserQuery.graphActions.listFilter(\"" + filterId + "\")'>L</button>&nbsp;" +
          "<button class='btn btn-sm my-1 py-0 btn-outline-primary' title='remove filter' onclick='KGbrowserQuery.graphActions.removeFilter(\"" +
          filterId +
          "\")'>X</button>&nbsp;";
        if (iconUrl)
          html += "<img src='" + iconUrl + "' width='25'/>";
        html += "<span style='font-weight:normal;color:" +
          "black" +
          "'>" +
          superClassLabel +
          " : " +
          nodeData.count +
          "<br><i> " +
          filterLabel +
          "</i></span>";
        ("</div>");

        $("#KGbrowser_filterDiv").prepend(html);
        // })
      };

      if (self.queryFilterNodes.length < 2) {
        self.executeQuery(self.currentNode, options, function(err, queryResult) {
          $("#waitImg").css("display", "none");
          if (err) return alert(err);

          if (queryResult.data[0].count.value == "0") {
            KGbrowserQuery.queryFilterNodes.splice(KGbrowserQuery.queryFilterNodes.length - 1, 1);
            return MainController.UI.message("No data found ", true);
          }
          KGbrowserQuery.queryFilterNodes[KGbrowserQuery.queryFilterNodes.length - 1].count = queryResult.data[0].count.value;
          setFilterCountUI();
        });
      } else {
        KGbrowserQuery.executeShortestPathQuery(null, null, { count: true }, function(err, queryResult) {
          $("#waitImg").css("display", "none");
          if (err) return alert(err);
          if (queryResult[0].count.value == "0") {
            KGbrowserQuery.queryFilterNodes.splice(KGbrowserQuery.queryFilterNodes.length - 1, 1);
            return MainController.UI.message("No data found ", true);
          }
          KGbrowserQuery.queryFilterNodes[KGbrowserQuery.queryFilterNodes.length - 1].count = queryResult[0].count.value;
          setFilterCountUI();
        });
      }
    }
  };

  self.onQueryParamsDialogCancel = function() {
    $("#KGbrowserQueryParamsDialog").css("display", "none");
  };

  self.addNodeToQueryTree = function(node, _prop) {
    self.query.getAdlModel(node.data.type || node.data.id, null, "subject", function(err, result) {
      var isNewTree = $("#KGbrowser_queryTreeDiv").is(":empty");
      var existingNodes = [];
      if (!isNewTree) existingNodes = common.jstree.getjsTreeNodes("KGbrowser_queryTreeDiv", true);
      var jstreeData = [];
      var typeId = "type" + common.getRandomHexaId(5);
      if (existingNodes.indexOf(node.data.id) < 0) {
        jstreeData.push({
          id: typeId,
          text: Sparql_common.getLabelFromURI(node.data.label),
          parent: "#",
          data: {
            type: "type",
            id: node.data.id,
            label: node.data.label,
            role: node.data.role,
            sourceType: node.data.sourceType
          }
        });
        if (!isNewTree) {
          var options = {};

          common.jstree.addNodesToJstree("KGbrowser_queryTreeDiv", "#", jstreeData);
          jstreeData = [];
        }
        setTimeout(function() {
          $("#KGbrowser_queryTreeDiv").jstree(true).select_node(node.data.id);
        }, 200);
      }

      if (err) {
        return callback(err);
      }
      result.forEach(function(item) {
        if (existingNodes.indexOf(item.prop.id) < 0) {
          jstreeData.push({
            id: "prop" + common.getRandomHexaId(5),
            text: item.propLabel.value,
            parent: typeId,
            data: {
              label: item.propLabel.value,
              id: item.prop.value,
              type: "property",
              parent: node.data.id,
              range: node.data.subType,
              role: node.data.role,
              sourceType: node.data.sourceType
            }
          });
        }
      });

      if (isNewTree) {
        options = {
          selectTreeNodeFn: self.jstree.events.onSelectNodeQuery,
          contextMenu: self.jstree.getJstreeQueryContextMenu("KGbrowser_queryTreeDiv"),

          openAll: true,
          withCheckboxes: true
        };
        common.jstree.loadJsTree("KGbrowser_queryTreeDiv", jstreeData, options);
      } else {
        common.jstree.addNodesToJstree("KGbrowser_queryTreeDiv", node.data.id, jstreeData);
      }
    });
  };

  self.getQueryFilter = function(filterId) {
    var obj = null;
    self.queryFilterNodes.forEach(function(filterData, _index) {
      if (filterData.filterDivId == filterId) obj = filterData;
    });
    return obj;
  };

  self.graphActions = {
    backToModel: function() {
      if (!self.ALDmodelGraph) return;
      var visjsData = {
        nodes: self.ALDmodelGraph.nodes,
        edges: self.ALDmodelGraph.edges
      };
      var options = {};
      if (self.ALDmodelGraph.params) options = self.ALDmodelGraph.params.options;

      visjsGraph.draw("graphDiv", visjsData, options);
      self.ALDmodelGraph = null;
    },
    listFilter: function(id) {
      var filterData = self.getQueryFilter(id);
      self.currentFilterData = filterData;

      var options = {
        logicalMode: "union",
        selectVars: [filterData.varName]
      };

      self.executeQuery(self.currentNode, options, function(_err, queryResult) {
        var jstreeData = [];
        var keyName = filterData.varName.substring(1);
        queryResult.data.forEach(function(item) {
          if (item[keyName]) {
            var label = "";
            if (item[keyName + "Label"]) label = item[keyName + "Label"].value;
            else label = Sparql_common.getLabelFromURI(item[keyName].value);
            jstreeData.push({
              id: item[keyName].value,
              text: label,
              parent: "#",
              data: self.currentNode.data
            });
          }
        });

        jstreeData.sort(function(a, b) {
          if (a.text > b.text) return 1;
          if (a.text < b.text) return -1;
          return 0;
        });

        var options = {
          withCheckboxes: true
        };
        common.jstree.loadJsTree("KGbrowser_adlJstreeDiv", jstreeData, options);
      });
    },

    queryFilters: function(output, addToGraph) {
      var selectVars = [];
      $(".KGbrowser_graphFilterCBX").each(function() {
        if ($(this).prop("checked")) {
          var filterDiv = $(this).parent();
          var filterId = filterDiv.attr("id");
          var filterObj = self.getQueryFilter(filterId);
          selectVars.push(filterObj.varName);
        }
      });

      KGbrowserQuery.executeShortestPathQuery(null, null, { restPath: 1 }, function(_err, queryResult) {
        if (queryResult.length == 0) return MainController.UI.message("No results", true);
        if (output == "graph") {
          if (!self.ALDmodelGraph) {
            //save modelGraph before drawing quryGraph
            self.ALDmodelGraph = { nodes: [], edges: [], params: {} };
            self.ALDmodelGraph.nodes = visjsGraph.data.nodes.get();
            self.ALDmodelGraph.edges = visjsGraph.data.edges.get();
            self.ALDmodelGraph.params = visjsGraph.currentContext;
          }
          MainController.UI.message("drawing Graph...", true);
          KGbrowserGraph.drawGraph(
            "graphDiv",
            { data: queryResult },
            {
              addToGraph: addToGraph,
              selectVars: selectVars
            }
          );
        }
        if (output == "table") {
          MainController.UI.message("drawing Table...", true);
          KGbrowserDataTable.showQueryResult({ data: queryResult }, { selectVars: selectVars });
        }
      });
    },

    removeFilter: function(id) {
      self.queryFilterNodes.forEach(function(filterData, index) {
        if (filterData.id == id) {
          self.queryFilterNodes.splice(index, 1);
          $("#" + filterData.filterDivId).remove();
          //   return visjsGraph.data.nodes.remove(id)
        }
      });
    },
    resetAllFilters: function() {
      KGbrowserQuery.graphActions.backToModel();
      setTimeout(function() {
        if ($("#KGbrowser_adlJstreeDiv").jstree) $("#KGbrowser_adlJstreeDiv").jstree("destroy");

        while (self.queryFilterNodes.length > 0) {
          var filterData = self.queryFilterNodes[0];
          self.graphActions.removeFilter(filterData.id);
        }
        if (visjsGraph.isGraphNotEmpty()) {
          visjsGraph.data.nodes.remove(KGbrowserGraph.zeroCountIds);
        }
        KGbrowserGraph.zeroCountIds = [];
        self.shortestPathQueriesStack = [];
        MainController.UI.message("", true);
      }, 500);
    },
    /*   addIndividualsFilter:function(){
               var checkedIds=$("#KGbrowser_adlJstreeDiv").jstree().get_checked();
               self.individualFilters={varName:self.currentFilterData.varName,ids:checkedIds}


           },*/
    clearIndividualsFilter: function() {
      if ($("#KGbrowser_adlJstreeDiv").jstree(true)) $("#KGbrowser_adlJstreeDiv").jstree().deselect_all(true);
    },

    clickClassesGraph: function(obj, point) {
      MainController.UI.hidePopup("graphPopupDiv");
      if (!obj) return KGbrowserQuery.hideQueryParamsDialog(point);
      if (obj.from) self.currentEdge = obj;
      else {
        self.currentNode = obj;
        if (obj.data.type == "count") {
          self.graphActions.showGraphPopupMenu(self.currentNode, point);
        } //class
        else {
          self.queryMode = "count";
          KGbrowserQuery.showQueryParamsDialog(point);
        }
      }
    },
    showGraphPopupMenu: function(node, point, _e) {
      var top = $("#graphDiv").position().top;
      point.y += top;
      var html = "";
      if (node.from) {
        //edge
      } else {
        html =
          "    <span class=\"popupMenuItem\" onclick=\"KGbrowserQuery.graphActions.listCountItems();\"> list items</span>" +
          //   "<span class=\"popupMenuItem\" onclick=\"KGbrowserQuery.graphActions.addToGraph();\"> Add to graph</span>" +
          // "<span class=\"popupMenuItem\" onclick=\"KGbrowserQuery.graphActions.setAsFilter();\"> Set as filter</span>"+
          "<span class=\"popupMenuItem\" onclick=\"KGbrowserQuery.graphActions.executeQuery();\"> Execute  Query</span>";
      }
      $("#graphPopupDiv").html(html);
      MainController.UI.showPopup(point, "graphPopupDiv");
    },
    listCountItems: function() {
      var query = "";
      var source = KGbrowser.currentSource;
      var fromStr = Sparql_common.getFromStr(source);
      query =
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
        "select distinct ?sub ?subLabel  " +
        fromStr +
        "WHERE {";

      var where = self.currentNode.data.queryWhere;
      query += where + " } order by ?subLabel limit 10000";

      var url = Config.sources[source].sparql_server.url + "?format=json&query=";
      MainController.UI.message("searching...");
      Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {
        // $("#waitImg").css("display", "none");
        if (err) {
          return MainController.UI.message(err);
        }
        Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["sub"]);
        var jstreeData = [];
        result.results.bindings.forEach(function(item) {
          jstreeData.push({
            id: item.sub.value,
            text: item.subLabel.value,
            parent: "#",
            data: self.currentNode.data
          });
        });

        common.jstree.loadJsTree("KGbrowser_adlJstreeDiv", jstreeData, {});
      });

      MainController.UI.hidePopup("graphPopupDiv");
    },
    addToGraph: function() {
      MainController.UI.hidePopup("graphPopupDiv");
    }
  };

  self.executeQuery = function(_node, options, callback) {
    var fetchLength = Config.KG.queryLimit;
    var queryFilterNodes = KGbrowserQuery.queryFilterNodes;
    var dialogFilterStr = "";
    var where = "";
    var varName = options.varName;
    var source = KGbrowser.currentSource;
    if (varName) {
      // add filter to query
      if (options.filter) dialogFilterStr = options.filter;
      if (!dialogFilterStr) dialogFilterStr = "";
      where += dialogFilterStr;
    }

    // join classes (anonym predicate)
    var message = null;

    var varName2 = varName;

    if (options.predicate) {
      // links new filter predicate to a previous varName matching
      var predicateStr = "<" + options.predicate.predicate + ">";
      if (options.predicate.inverse) predicateStr = "^" + predicateStr;
      //  predicateStr = predicateStr + "|^" + predicateStr
      var previousVarName = null;
      if (queryFilterNodes.length == 1) {
        // the first query has no predicate
        previousVarName = queryFilterNodes[0].varName;
        predicateStr = " " + varName2 + predicateStr + previousVarName + ". ";
        queryFilterNodes[0].filter += predicateStr;
        self.currentNode.filter += predicateStr;
      } else {
        queryFilterNodes.forEach(function(filterNodeData, _index2) {
          if (!previousVarName && (options.predicate.subject == filterNodeData.class || options.predicate.object == filterNodeData.class)) {
            previousVarName = filterNodeData.varName;
            predicateStr = " " + varName2 + " " + predicateStr + " " + previousVarName + ". ";
            filterNodeData.filter += predicateStr;
            self.currentNode.filter += predicateStr;
          }
        });
      }
    }

    //build query with all previous filters and varnames

    queryFilterNodes.forEach(function(filterNodeData, _index) {
      if (!filterNodeData) return;

      where += filterNodeData.filter;

      varName2 = filterNodeData.varName;
      if (!options.count) {
        where += " OPTIONAL{" + varName2 + " rdfs:label " + varName2 + "Label" + "} ";
        //  where += " OPTIONAL{" + previousVarName + " rdfs:label " + previousVarName + "Label" + "} "
        //  where += " " + previousVarName + " rdf:type " + previousVarName + "Type" + ". "
        where += " " + varName2 + " rdf:type " + varName2 + "Type" + ". ";
      }
    });

    if (message) return callback(message);

    //checked chexkboxes in class individuals
    if ($("#KGbrowser_adlJstreeDiv").jstree(true)) {
      var checkedIds = $("#KGbrowser_adlJstreeDiv").jstree().get_checked();
      if (checkedIds && checkedIds.length > 0) {
        self.individualFilters = { varName: self.currentFilterData.varName, ids: checkedIds };

        var idsStr = "";
        self.individualFilters.ids.forEach(function(id, index) {
          if (index > 0) idsStr += ",";
          idsStr += "<" + id + ">";
        });
        where += "filter (" + self.individualFilters.varName + " in (" + idsStr + "))";
      }
    }
    if (where == "") return MainController.UI.message("Wrong query : no where clasues", true);

    var fromStr = Sparql_common.getFromStr(source);
    var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> ";
    if (options.count) query += "select (count(distinct " + varName + ") as ?count) ";
    else if (options.selectVars) {
      var selectVarsStr = "";
      options.selectVars.forEach(function(varName, _index) {
        selectVarsStr += varName + " " + varName + "Label " + varName + "Type ";
      });
      query += "select distinct " + selectVarsStr;
    } else {
      query += "select distinct " + varName + " " + varName + "Label " + varName + "Type ";
    }
    query += fromStr + "WHERE {";

    query += where + " } ";

    var offset = 0;
    var length = 1;
    var allResults = [];

    var maxOffset = 50000;
    MainController.UI.message("searching...");
    async.whilst(
      function(_callbackTest) {
        //test
        if (offset >= maxOffset) alert("query results truncated : larger than " + maxOffset + " maximum authorized ");
        return length > 0 && offset < maxOffset;
      },
      function iter(callbackWhilst) {
        var url = Config.sources[source].sparql_server.url + "?format=json&query=";
        var query2 = query;
        if (!options.count) query2 = query + " limit " + fetchLength + " OFFSET " + offset;
        offset += fetchLength;
        Sparql_proxy.querySPARQL_GET_proxy(url, query2, "", { source: source }, function(err, result) {
          if (err) {
            return callbackWhilst(err);
          }
          length = result.results.bindings.length;
          if (options.count) length = 0;
          allResults = allResults.concat(result.results.bindings);
          MainController.UI.message("searching..." + allResults.length);
          callbackWhilst();
        });
      },
      function(err) {
        if (err) return callback(err);

        return callback(null, { data: allResults, filter: dialogFilterStr });
      }
    );
  };


  self.showIndividualsInGraph=function(queryFilterNodes,options,callback) {
    var source = KGbrowser.currentSource;
    var fromStr = Sparql_common.getFromStr(source);
   var  where = queryFilterNodes.filter + "\n";
    var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> ";
    if (options.count) {
      query += "SELECT (count(distinct *) as ?count) " + fromStr + "WHERE {" + where;
    } else query += "SELECT distinct *  " + fromStr + "WHERE {" + where;
    query += "}";
    var url = Config.sources[source].sparql_server.url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {
      if (err)
        return callback(err);
        return callback(null,result.results.bindings)

    })



  }
  self.executeShortestPathQuery = function(fromNode, toNode, options, callback) {
    if (!options) {
      options = {};
    }
    if (self.queryFilterNodes.length==0)
      return alert("create a filter first")

    if (self.queryFilterNodes.length < 2) {
      //return alert("this query needs at least 2 superClasses ");
     self.showIndividualsInGraph(self.queryFilterNodes[0],options,function(err,result){
        return callback(err, result);
      })
      return;
    }

    var where = "";

    self.queryFilterNodes.forEach(function(item, index) {
      where += item.filter + "\n";
      if (index == 0) return;
      if (index == 1) {
        fromNode = self.queryFilterNodes[index - 1];
        toNode = self.queryFilterNodes[index];
        where += GraphTraversal.getShortestPaths(fromNode, toNode, self.classes);
      } else {
        toNode = self.queryFilterNodes[index];
        where += GraphTraversal.addNodeToPath(toNode, self.classes, self.queryFilterNodes.length);
        where += toNode.filter + "\n";
      }
    });

    /*  self.queryFilterNodes.forEach(function (filterNode) {
            where += filterNode.filter + "\n"
        })*/

    var source = KGbrowser.currentSource;
    var fromStr = Sparql_common.getFromStr(source);
    var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> ";
    if (options.count) {
      query += "SELECT (count(distinct *) as ?count) " + fromStr + "WHERE {" + where;
    } else query += "SELECT distinct *  " + fromStr + "WHERE {" + where;

    query += "}";

    var fetchLength = Config.KG.queryLimit;
    var offset = 0;
    var length = 1;
    var allResults = [];

    var maxOffset = 50000;
    MainController.UI.message("searching...");
    async.whilst(
      function(_callbackTest) {
        //test
        if (length != 1 && length < fetchLength) return false;
        if (offset >= maxOffset) alert("query results truncated : larger than " + maxOffset + " maximum authorized ");
        return length > 0 && offset < maxOffset;
      },
      function iter(callbackWhilst) {
        var url = Config.sources[source].sparql_server.url + "?format=json&query=";
        var query2 = query;
        if (!options.count) query2 = query + " limit " + fetchLength + " OFFSET " + offset;
        offset += Sparql_proxy.querySPARQL_GET_proxy(url, query2, "", { source: source }, function(err, result) {
          if (err) {
            return callbackWhilst(err);
          }
          length = result.results.bindings.length;
          if (options.count) length = 0;
          allResults = allResults.concat(result.results.bindings);
          MainController.UI.message("searching..." + allResults.length);
          callbackWhilst();
        });
      },
      function(err) {
        if (err) return callback(err);

        return callback(null, allResults);
      }
    );
  };

  self.loadAdl = function(_node) {
    if (!KGbrowser.currentSource) {
      return alert("select a source");
    }
    self.graphActions.resetAllFilters();
    var options = {
      onclickFn: KGbrowserQuery.graphActions.clickClassesGraph,

      //  nodeColor: "#ddd",
      keepNodePositionOnDrag: true
    };
    var graphDiv = "graphDiv";
    // var graphDiv = "KGbrowser_adlJstreeDiv"
    return KGassetGraph.drawClassesAndPropertiesGraph(KGbrowser.currentSource, graphDiv, options, function(_err, result) {
      self.classes = result.classes;
      self.model = result.model;
      self.initClassesTab(result.classes, result.model);
    });
  };

  self.initClassesTab = function(classes, model) {
    $("#KGbrowser_accordion").accordion("option", { active: 0 });
    var classesArray = Object.keys(classes);
    classesArray.sort();
    var distinctNode = {};
    var jstreeData = [];
    classesArray.forEach(function(classId) {
      var id1 = common.getRandomHexaId(5);
      var label;
      if (model[classId]) label = model[classId].label;
      else label = Sparql_common.getLabelFromURI(classId);
      if (!distinctNode[id1]) {
        distinctNode[id1] = 1;
        var jstreeType =null;
        if( KGbrowserCustom.superClassesMap[classId])
          jstreeType=KGbrowserCustom.superClassesMap[classId].group;
        jstreeData.push({
          id: id1,
          text: label,
          parent: "#",
          type: jstreeType,
          data: {
            id: classId,
            label: label
          }
        });
      }
      for (var predicate in classes[classId]) {
        if (model[predicate]) {
          var id2 = common.getRandomHexaId(5);
          if (!distinctNode[id2]) {
            distinctNode[id2] = 1;
            jstreeData.push({
              id: id2,
              text: model[predicate].label,
              parent: id1,
              type: "owl:ObjectProperty",
              data: {
                id: predicate,
                label: model[predicate].label
              }
            });
          }
          classes[classId][predicate].forEach(function(object) {
            var id3 = common.getRandomHexaId(5);
            if (!distinctNode[id3]) {
              distinctNode[id3] = 1;
              var jstreeType =null;
              if( KGbrowserCustom.superClassesMap[object])
                jstreeType=KGbrowserCustom.superClassesMap[object].group;
              jstreeData.push({
                id: id3,
                text: model[object].label,
                parent: id2,
                type: jstreeType,
                data: {
                  id: object,
                  label: model[object].label
                }
              });
            }
          });
        }
      }
    });
    var options = {
      selectTreeNodeFn: function(_event, obj) {
        self.currentNode = obj.node;

        self.showQueryParamsDialog({ x: 300, y: 300 });
      },
      contextMenu: function() {
        var items = {};
        return items;
      }
    };
    common.jstree.loadJsTree("KGbrowser_ClassesDiv", jstreeData, options);
  };

  self.searchTerm = function() {
    var term = $("#KGbrowser_searchTermInput").val();
    if (term == "") return;
    if (!KGbrowser.currentSource) return alert("select a source");
    var source = KGbrowser.currentSource;
    var fromStr = Sparql_common.getFromStr(source);
    var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> ";

    query += "select ?sub ?subLabel ?subType  " + fromStr + " where { ?sub rdfs:label ?subLabel.?sub rdf:type ?subType." + " filter (regex(?subLabel,'" + term + "','i'))} limit 1000";

    var url = Config.sources[source].sparql_server.url + "?format=json&query=";
    MainController.UI.message("searching...");
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {
      if (err) {
        return callback(err);
      }

      var types = {};
      result.results.bindings.forEach(function(item) {
        var type = item.subType.value;
        var id = item.sub.value;
        var label = item.subLabel.value;

        if (!types[type]) types[type] = [];
        types[type].push({ id: id, label: label });
      });

      var jstreeData = [];
      var label;

      for (var type in types) {
        if (self.model[type]) label = self.model[type].label;
        else label = Sparql_common.getLabelFromURI(type);
        jstreeData.push({
          id: type,
          text: label,
          parent: source
        });
        types[type].forEach(function(item) {
          jstreeData.push({
            id: item.id,
            text: item.label,
            parent: type,
            data: {
              id: item.id,
              label: item.label,
              type: type
            }
          });
        });
      }

      common.jstree.addNodesToJstree("KGbrowserItemsjsTreeDiv", source, jstreeData);
    });
  };

  self.setFilterFromSearchedTerm = function(node) {
    // transform searched tree node into graph current node as if clicked
    self.currentNode = {
      id: node.data.type,
      label: node.text,
      data: {
        id: node.data.type,
        label: node.text,
        searchedLabel: node.data.label
      }
    };
    return self.showQueryParamsDialog({ x: 500, y: 500 });
  };

  return self;
})();
