var Lineage_query = (function() {
  var self = {};
  self.databasesMap = {};
  self.relationObj = {};
  self.currentRelation = null;
  self.filters = {};

  self.existingTables = {};
  self.isLoaded = false;
  self.storedQueriesSource = "STORED_QUERIES";


  self.showQueryDailog = function() {
    $("#QueryDialog").dialog("open");
    if (self.isLoaded) {
      return;
    }

    self.filters = {};
    self.isLoaded = true;


    self.operators = {
      "string": ["contains", "not contains", "="],
      "number": ["=", "!=", "<", "<=", ">", ">="]

    };

    self.predicatesObjectsMap = {
      "rdf:type": ["owl:Class", "rdf:Bag", "owl:NamedIndividual"],
      "owl:subClassOf": ["_whiteBoardNodes", "_selectedNode", "OTHER"],
      "rdfs:member": ["_whiteBoardNodes", "_selectedNode", "OTHER"],
      "OTHER": ["_whiteBoardNodes", "_selectedNode", "OTHER", "string", "number", "date"],
      "any": ["_whiteBoardNodes", "_selectedNode", "OTHER"],
      " ": " ",
      "rdfs:label": "string",
      "rdfs:isDefinedBy": "string",
      "rdfs:comment": "string",
      "skos:altLabel": "string",
      "skos:prefLabel": "string",
      "skos:definition": "string",
      "skos:example": "string"
    };


    $("#QueryDialog").load("snippets/lineage/queryDialog.html", function() {
      $("#lineageQuery_tabsDiv").tabs();
      self.storedQueries.showStoredQueriesTab();

      self.queryModel.loadSourceModel();

      var predicates = Object.keys(self.predicatesObjectsMap);
      common.fillSelectOptions("lineageQuery_predicateSelect", predicates, true);

      $("#lineageQuery_value").keypress(function(e) {
        if (e.which == 13) {
          var str = $("#lineageQuery_value").val();
          if (str.length > 0) {
            Lineage_query.addFilter();
          }
        }

      });
    });
  };

  self.onSelectType = function(role, type) {


    if (role == "predicate") {
      $("#lineageQuery_predicateUriSelect").css("display", "none");
      var show = self.isObjectPredicate(type);
      $("#lineageQuery_inversePredicateDiv").css("display", show ? "block" : "none");


      var objectTypes = self.predicatesObjectsMap[type];
      if (!Array.isArray(objectTypes)) {
        objectTypes = [objectTypes];
      }
      common.fillSelectOptions("lineageQuery_objectTypeSelect", objectTypes, objectTypes.length > 1);

      if (objectTypes[0] == "string") {
        common.fillSelectOptions("lineageQuery_operator", self.operators["string"], true);
        $("#lineageQuery_operator").val("contains");
        $("#lineageQuery_valueDiv").css("display", "block");
      }

      if (type == "OTHER") {
        Sparql_OWL.getObjectProperties(Lineage_sources.activeSource, { withoutImports: false }, function(err, result) {
          if (err) {
            return alert(err.responseText);
          }
          $("#lineageQuery_predicateUriSelect").css("display", "block");
          var otherPredicates = [];
          var topOntologyObj = Config.topLevelOntologies[Config.currentTopLevelOntology];

          result.forEach(function(item) {
            var prefix = ".:";

            if (topOntologyObj && item.property.value.indexOf(topOntologyObj.uriPattern) > -1) {
              prefix = topOntologyObj.prefix + ":";
            }
            otherPredicates.push({ id: item.property.value, label: prefix + item.propertyLabel.value });

          });
          otherPredicates.sort(function(a, b) {
            if (a.label > b.label) {
              return 1;
            }
            if (a.label < b.label) {
              return -1;
            }
            return 0;
          });

          common.fillSelectOptions("lineageQuery_predicateUriSelect", otherPredicates, true, "label", "id");
        });

      }


    }

    else if (role == "predicateUri") {
      var predicateUri = type;
      if (predicateUri && predicateUri.indexOf("hasBeginning") > -1) {
        $("#lineageQuery_objectTypeSelect").val("date");
        common.fillSelectOptions("lineageQuery_operator", self.operators["number"], true);
        $("#lineageQuery_operator").val(">=");
        common.fillSelectOptions("lineageQuery_objectTypeSelect", ["date"]);

        common.setDatePickerOnInput("lineageQuery_value");
      }
      else if (predicateUri && predicateUri.indexOf("hasEnding") > -1) {
        $("#lineageQuery_objectTypeSelect").val("date");
        common.fillSelectOptions("lineageQuery_operator", self.operators["number"], true);
        $("#lineageQuery_operator").val("<=");
        common.setDatePickerOnInput("lineageQuery_value");
        common.fillSelectOptions("lineageQuery_objectTypeSelect", ["date"]);
      }
    }
    else if (role == "object") {
      $("#lineageQuery_objectUriSelect").css("display", "none");
      $("#lineageQuery_valueDiv").css("display", "none");
      if (type == "string") {
        common.fillSelectOptions("lineageQuery_operator", self.operators["string"], true);
        $("#lineageQuery_valueDiv").css("display", "block");
      }
      else if (type == "date") {
        common.fillSelectOptions("lineageQuery_operator", self.operators["number"], true);
        var predicate = $("#lineageQuery_predicateUriSelect").val();
        if (predicate.indexOf("hasBeginning") > -1) {
          $("#lineageQuery_operator").val(">=");
        }
        if (predicate.indexOf("hasEnding") > -1) {
          $("#lineageQuery_operator").val("<=");
        }


      }
      else if (type == "number") {
        common.fillSelectOptions("lineageQuery_operator", self.operators["number"], true);
        common.setDatePickerOnInput("lineageQuery_value");


      }

      else if (type == "OTHER") {

        $("#lineageQuery_objectUriSelect").css("display", "block");
        $("#lineageQuery_valueDiv").css("display", "none");
        KGcreator.fillObjectOptionsFromPrompt(null, "lineageQuery_objectUriSelect");

      }
    }
  };

  self.reset = function(subjectAlso) {
    if (subjectAlso) {
      $("#lineageQuery_subjectVarSelect").append(" <option value='" + varName + "'>Object" + filterIndex + "</option>");
    }
    // $("#lineageQuery_subjectVarSelect").val("");
    $("#lineageQuery_predicateSelect").val("");
    $("#lineageQuery_predicateUriSelect").val("");
    $("#lineageQuery_objectTypeSelect").val("");

    $("#filterBooleanOperator").val(" FILTER  EXISTS ");
    $("#lineageQuery_operator").val("contains");
    $("#lineageQuery_value").val("");
    $("#lineageQuery_predicateUriSelect").css("display", "none");
    $("#lineageQuery_objectUriSelect").css("display", "none");
    $("#lineageQuery_inversePredicateCBX").removeProp("checked");
    $("#lineageQuery_inversePredicateDiv").css("display", "none");

  };


  self.addFilter = function(filter) {
    if(!filter)
      filter={}

    var subjectVar = filter.subjectVar || $("#lineageQuery_subjectVarSelect").val();


    var predicateType =filter.predicateType || $("#lineageQuery_predicateSelect").val();
    var predicateUri =filter.predicateUri || $("#lineageQuery_predicateUriSelect").val();
    var predicateUriLabel =filter.predicateUriLabel || $("#lineageQuery_predicateUriSelect option:selected").text();

    var objectType =filter.objectType || $("#lineageQuery_objectTypeSelect").val();
    var objectUri =filter.objectUri || $("#lineageQuery_objectUriSelect").val();
    var objectUriLabel = filter.objectUriLabel ||$("#lineageQuery_objectUriSelect option:selected").text();

    var inversePredicate =filter.inversePredicate || $("#lineageQuery_inversePredicateCBX").prop("checked");


    var filterBooleanOperator = filter.filterBooleanOperator ||$("#filterBooleanOperator").val();
    var filterBooleanOperatorText = filter.filterBooleanOperatorText ||$("#lineageQuery_subjectUriSelect option:selected").text();

    var operator =filter.operator || $("#lineageQuery_operator").val();
    var value = filter.value ||$("#lineageQuery_value").val();

    if (!subjectVar) {
      return alert("select a subject");
    }




    if (!objectType && !objectUri && !predicateType && !predicateUri) {
      return alert(" not enough criteria ");
    }

    $("#LineageQuery_value").val("");

    var filterId = "filter_" + common.getRandomHexaId(5);

    var html = "<div class='LineageQuery_QueryElt' id='" + filterId + "'> ";
    html += "<button style='size: 10px' onclick='Lineage_query.removeFilter(\"" + filterId + "\")'>X</button>";


    if (predicateType == "OTHER") {
      predicateType = null;
    }
    if (objectType == "OTHER") {
      objectType = null;
    }

    var obj = {
      subjectVar: subjectVar,

      predicateType: predicateType,
      predicateUri: predicateUri,
      predicateUriLabel: predicateUriLabel,
      inversePredicate: inversePredicate,

      objectType: objectType,
      objectUri: objectUri,
      objectUriLabel: objectUriLabel,

      filterBooleanOperator: filterBooleanOperator
    };

    var valueStr = "";
    if (value) {
      obj.operator = operator;
      obj.value = value;
      valueStr = objectType + " " + operator + "&nbsp;" + value;
    }

    if (Object.keys(self.filters).length > 0) {
      html += filterBooleanOperatorText + " ";
    }
    // html += "&nbsp;subject" + subjectVar + " " + (inversePredicate ? "^" : "") + (predicateUriLabel || predicateType || "") + " " + (objectUriLabel || valueStr || objectType) + "&nbsp;";
    html += self.getFilterHtml(obj);
    html += "</div>";
    obj.id = filterId;
    self.filters[filterId] = obj;


    //allows to get object var as subject for next filter
    if (!objectType && !objectUri) {
      var filterIndex = Object.keys(self.filters).length;
      var varName = "?o" + filterIndex;
      $("#lineageQuery_subjectVarSelect").append(" <option value='" + varName + "'>Object" + filterIndex + "</option>");
    }


    $("#lineageQuery_Filters").append(html);
    ///  $("#LineageQuery_createFilterDiv").css("display", "none");

    self.reset();
    return obj;
  };


  self.getFilterHtml = function(filter, editvalue) {
    var valueStr = filter.value;
    if (editvalue) {
      valueStr = "<input class='storedQuery_value' id='" + filter.id + "_value' value='" + filter.value + "' />";
    }

    return "&nbsp;" + filter.subjectVar + " " + (filter.inversePredicate ? "^" : "") + (filter.predicateUriLabel || filter.predicateType || "") + " " + (filter.objectUriLabel || valueStr || filter.objectType) + "&nbsp;";


  };
  self.removeFilter = function(filterId) {
    delete self.filters[filterId];
    $("#" + filterId).remove();
  };


  self.isObjectPredicate = function(predicateType) {
    return (["rdf:type", "rdfs:member", "owl:subClassOf", "OTHER"].indexOf(predicateType) > -1); //filter label
  };


  self.executeQuery = function(queryType) {

    var activeTab = $("#lineageQuery_tabsDiv").tabs("option", "active");
    if (activeTab == 1) {//storedQueries
      if (!self.storedQueries.currentQuery) {
        return alert(" no stored Query selected");
      }
      self.storedQueries.updateStoredQueryParams();
      self.filters = self.storedQueries.currentQuery;
    }


    if (Object.keys(self.filters).length == 0) {
      return alert("add a  filter first ");
    }

    var source = Lineage_sources.activeSource;
    var fromStr = Sparql_common.getFromStr(source, false, true);
    var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
      "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "select ";

    if (queryType == "count") {
      query += "(count (distinct ?s1) AS ?count)";
    }
    else {
      query += "*";
    }
    query += fromStr;


    query += " where {";



    query += " ?s1 rdf:type ?s1Type.  ";
    if (queryType != "count") {
      query += " ?s1 rdfs:label ?s1Label.  ";
    }

    var filterIndex = 0;
    for (var key in self.filters) {



      /*   if ( filterIndex > 0) {
           query += "\n " + filter.filterBooleanOperator + " \n";
         }*/


      filterIndex += 1;


      var filter = self.filters[key];

      var subjectVar = filter.subjectVar;

      var predicateFilterStr = "{";


      var predicate = filter.predicateUri || filter.predicateType;
      if (predicate) {
        if (predicate.indexOf("http") == 0) {
          predicate = "<" + predicate + ">";
        }
        if (predicate == "any") {
          predicate = "?p" + filterIndex;
        }
      }
      else {
        predicate = "?p" + filterIndex;
      }
      if (filter.inversePredicate) {
        predicate = "^" + predicate;
      }


      if (filter.value) {// datatypeProperty predicate


        predicateFilterStr += subjectVar + " " + predicate + "  ?o" + filterIndex + ".";
        if (filter.objectType == "string") {


          if (filter.operator == "contains") {
            predicateFilterStr += " FILTER (regex(str(?o" + filterIndex + "),'" + filter.value + "','i')).";
          }
          else if (filter.operator == "not contains") {
            predicateFilterStr += "FILTER( ! regex(str(?o" + filterIndex + "),'" + filter.value + "','i')).";
          }
          else {
            predicateFilterStr += " FILTER(?o" + filterIndex + "" + filter.operator + "'" + filter.value + "').";
          }
        }
        else if (filter.objectType == "number") {
          predicateFilterStr += "  FILTER(?o" + filterIndex + filter.operator + "'" + filter.value + "'^^xsd:float).";
        }
        else if (filter.objectType == "date") {
          predicateFilterStr += " FILTER(?o" + filterIndex + filter.operator + "'" + filter.value + "'^^xsd:dateTime).";
        }


      }
      else if (filter.objectType == "_selectedNode") {
        if (!Lineage_classes.currentGraphNode) {
          return callback("no node selected");
        }
        predicateFilterStr += subjectVar + " " + predicate + " <" + Lineage_classes.currentGraphNode.data.id + ">. ";
      }
      else if (filter.objectType == "_whiteBoardNodes") {
        if (!visjsGraph.data) {
          return callback("no nodes on witheboard");

        }
        var graphNodeIds = visjsGraph.data.nodes.getIds();


        var filter = Sparql_common.setFilter("o" + filterIndex, graphNodeIds, null);
        predicateFilterStr += subjectVar + " " + predicate + "  ?o" + filterIndex + "." + filter;


      }

      //object predicate
      else {


        if (filter.objectUri) {
          predicateFilterStr += subjectVar + " " + predicate + " <" + filter.objectUri + ">. ";
        }
        else if (false && filter.objectType) {
          predicateFilterStr += subjectVar + " " + predicate + " " + filter.objectType + ". ";
        }
        else {
          predicateFilterStr += subjectVar + " " + predicate + " ?o" + filterIndex + ". ";
        }


      }


      query += " \n" + predicateFilterStr;

      query += "}";
    }

    query += " } limit 10000";

    if (queryType == "copyQuery") {
      return common.copyTextToClipboard(query);
    }
    var url = Config.sources[source].sparql_server.url + "?format=json&query=";


    self.setMessage("executing query...", true);
    //   $("#lineageQuery_sparqlDiv").html(query);
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {
      self.setMessage("");
      if (err) {
        return callback(err);
      }

      if (queryType == "count") {
        var count = result.results.bindings[0].count.value;
        $("#lineageQuery_listResultDiv").html("" + count + " subjects found");
      }
      else if (queryType == "graph") {
        if (result.results.bindings.length == 0) {
          return $("#lineageQuery_listResultDiv").html("no result");
        }
        self.setMessage("drawing nodes...", true);
        var nodeIds = [];
        result.results.bindings.forEach(function(item) {
          if (nodeIds.indexOf(item.s1.value) < 0) {
            nodeIds.push(item.s1.value);
          }
        });
        Lineage_classes.addNodesAndParentsToGraph(source, nodeIds, {});
        Lineage_query.executeQuery("list");
        self.setMessage("");
        $("#QueryDialog").dialog({
          position: { my: "left top", at: "left top", of: "#leftPanelDiv" }
        });
      }
      else if (queryType == "list") {
        var jsdata = [];
        var jstreeData = [];
        var uniqueNodes = {};
        if (result.results.bindings.length == 0) {
          return $("#lineageQuery_listResultDiv").html("no result");
        }
        result.results.bindings.forEach(function(item) {
          if (!uniqueNodes[item.s1Type.value]) {
            uniqueNodes[item.s1Type.value] = 1;
            jstreeData.push({
              id: item.s1Type.value,
              text: Sparql_common.getLabelFromURI(item.s1Type.value),
              parent: "#"
            });
          }
          if (!uniqueNodes[item.s1.value]) {
            uniqueNodes[item.s1.value] = 1;
            var label = item.s1 ? item.s1Label.value : Sparql_common.getLabelFromURI(item.s1.value);
            jstreeData.push({
              id: item.s1.value,
              text: label,
              parent: item.s1Type.value,
              data: {
                id: item.s1.value,
                label: label,
                source: source
              }
            });
          }
        });

        var options = {
          contextMenu: Lineage_query.getResultListContextmenu(),
          selectTreeNodeFn: function(event, obj) {
            self.currentTreeNode = obj.node;
          },
          open_all: true
        };
        $("#lineageQuery_listResultDiv").html("<div style='width:600px;height:300px;overflow: auto'><div id='lineageQuery_listResultDivTree'></div>");
        common.jstree.loadJsTree("lineageQuery_listResultDivTree", jstreeData, options, function() {
        });
      }

      else if (queryType == "csv") {

        var currentQueryLabelsMap = self.getQuerylabelsMap(query);

        if (result.results.bindings.length == 0) {
          return $("#lineageQuery_listResultDiv").html("no result");
        }
        var cols = [];
        result.head.vars.forEach(function(varName) {
          var title = currentQueryLabelsMap[varName] || varName;

          cols.push({ title: title, defaultContent: "" });
        });

        var dataSet = [];
        result.results.bindings.forEach(function(item) {
          var line = [];
          result.head.vars.forEach(function(varName) {
            var str = "";
            var obj = item[varName];
            if (obj) {
              str = obj.value;
            }
            else {
              str = "";
            }
            line.push(str);
          });
          dataSet.push(line);
        });
        Export.showDataTable(null, cols, dataSet);
      }
    });
  };

  /**
   * get a map where the predicate of witch the varname is the object
   * @param query
   * @returns {{}}
   */
  self.getQuerylabelsMap = function(query) {
    var regex = /\?([^ \s]\d) +([^ .]*) +\?(o\d)/gm;
    var array = [];
    var map = {};
    while ((array = regex.exec(query)) != null) {
      if (array.length == 4) {
        map[array[3]] = array[1] + Sparql_common.getLabelFromURI(array[2]);
      }
    }
    return map;
  };


  self.setMessage = function(message, waitImage) {

    $("#lineageQuery_messageSpan").html(message);
    $("#LineageQuery_waitImg").css("display", waitImage ? "block" : "none");
  };

  self.getResultListContextmenu = function() {
    var items = {};
    items["NodeInfos"] = {
      label: "Node infos",
      action: function(_e) {
        SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode, "mainDialogDiv");
      }
    };
    items.graphNode = {
      label: "graph Node",
      action: function(_e) {
        var selectedNodes = $("#lineageQuery_listResultDivTree").jstree().get_selected(true);
        if (selectedNodes.length > 1) {
          Lineage_classes.drawNodesAndParents(selectedNodes, 0);
        }
        else if (self.currentTreeNode.children.length > 0) {
          var selectedNodes = [];
          self.currentTreeNode.children.forEach(function(childId) {
            var node = $("#lineageQuery_listResultDivTree").jstree().get_node(childId);
            selectedNodes.push(node);
          });

          Lineage_classes.drawNodesAndParents(selectedNodes, 0);
        }
        else {
          Lineage_classes.drawNodesAndParents(self.currentTreeNode, 1, null, function(err, result) {
          });
        }
      }
    };

    items["Decorate"] = {
      label: "Decorate",
      action: function(_e) {
        self.showDecorateGraphDialog();
      }
    };
    return items;
  };


  self.showDecorateGraphDialog = function() {
    var existingNodes = visjsGraph.getExistingIdsMap();
    if (Object.keys(existingNodes).length == 0) {
      return alert("draw nodes first");
    }
    $("#LineagePopup").dialog("open");
    $("#LineagePopup").load("snippets/lineage/selection/lineage_selection_decorateDialog.html", function() {
      $("#lineage_selection_decorate_applyButton").bind("click", Lineage_query.decorateGraphNodes);
      var colors = common.paletteIntense;
      var array = [];
      colors.forEach(function(color) {
        array.push();
      });
      common.fillSelectOptions("lineage_selection_decorate_colorSelect", colors, true);

      $("#lineage_selection_decorate_colorSelect option").each(function() {
        $(this).css("background-color", $(this).val());
      });

      var shapes = ["ellipse", "circle", "database", "box", "text", "diamond", "dot", "star", "triangle", "triangleDown", "hexagon", "square"];
      common.fillSelectOptions("lineage_selection_decorate_shapeSelect", shapes, true);
    });
  };

  self.decorateGraphNodes = function() {
    function decorate(nodes) {
      var newIds = [];

      var color = $("#lineage_selection_decorate_colorSelect").val();
      var shape = $("#lineage_selection_decorate_shapeSelect").val();
      var size = $("#lineage_selection_decorate_sizeInput").val();
      var existingNodes = visjsGraph.getExistingIdsMap();
      nodes.forEach(function(nodeId) {
        if (!existingNodes[nodeId]) {
          return;
        }
        var obj = { id: nodeId };
        if (color) {
          obj.color = color;
        }
        if (shape) {
          obj.shape = shape;
        }
        if (size) {
          obj.size = size;
        }
        newIds.push(obj);
      });
      $("#LineagePopup").dialog("close");
      visjsGraph.data.nodes.update(newIds);
    }

    var selectedNodes = $("#lineageQuery_listResultDivTree").jstree().get_selected(true);
    if (selectedNodes.length > 1) {
      decorate(selectedNodes);
    }
    else if (self.currentTreeNode.children.length > 0) {
      var selectedNodes = [];
      self.currentTreeNode.children.forEach(function(childId) {
        selectedNodes.push(childId);
      });
      decorate(selectedNodes, 1);
    }
    else {
      decorate([self.currentTreeNode.id]);
    }
  };
  self.onColumnSelect = function() {
    var node = $("#LineageQuery_SQL_columnsTree").jstree().get_selected(true)[0];
    self.currentColumn = node.data.column;
    self.currentTable = node.data.table;
    $("#LineageQuery_createFilterDiv").css("display", "block");
    $("#LineageQuery_ExecuteDiv").css("display", "block");

    $("#LineageQuery_filteringColumn").html(self.currentColumn);
  };

  self.fillColumnValuesSelect = function() {
    if (self.currentTable == "#") {
      return;
    }
    self.getColumnValues(self.currentTable, self.currentColumn, function(err, data) {
      if (data.size >= self.dataSizeLimit) {
        return alert("too many values");
      }

      common.fillSelectOptions("LineageQuery_valuesSelect", data, true, self.currentColumn, self.currentColumn);
      $("#LineageQuery_operator").val("=");
    });
  };
  self.onColumnValuesSelect = function() {
    var value = $("#LineageQuery_valuesSelect").val();
    $("#LineageQuery_value").val(value);
    $("#LineageQuery_operator").val("=");
  };

  self.getColumnValues = function(table, column, callback) {
    self.dataSizeLimit = 1000;
    var sqlQuery = " select distinct column from " + table + " limit " + self.dataSizeLimit;
    if (self.queryContext.currentDataSource.type == "sql.sqlserver") {
      sqlQuery = " select distinct  " + column + " from " + table;
    }

    const params = new URLSearchParams({
      type: self.queryContext.currentDataSource.type,
      dbName: self.queryContext.currentDataSource.dbName,
      sqlQuery: sqlQuery
    });

    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/kg/data?" + params.toString(),
      dataType: "json",

      success: function(data, _textStatus, _jqXHR) {
        if (callback) {
          return callback(null, data);
        }
      },
      error(err) {
        if (callback) {
          return callback(null);
        }
      }
    });
  };

  self.displayResultToTable = function(data) {
    var dataSet = [];
    var cols = [];

    if (true) {
      allSelectColumns = [];
      for (var column in data[0]) {
        if (allSelectColumns.indexOf(column) < 0) {
          cols.push({ title: column, defaultContent: "" });
          allSelectColumns.push(column);
        }
      }

      data.forEach(function(item) {
        var line = [];
        allSelectColumns.forEach(function(column) {
          line.push(item[column] || "");
        });
        dataSet.push(line);
      });
    }

    $("#LineageLinkedDataQuery_tabs").tabs("option", { active: 2 });
    Export.showDataTable("LineageLinkedDataQuery_tableResult", cols, dataSet, null);
  };

  self.displayResultToVisjsGraph = function(data) {
    var currentDatabase = self.currentDatabase;
    var fromClass = self.databasesMap[currentDatabase].fromClass;
    var toClass = self.databasesMap[currentDatabase].toClass;

    var visjsData = { nodes: [], edges: [] };
    var existingNodes = visjsGraph.getExistingIdsMap();

    if (!existingNodes[fromClass.classId]) {
      existingNodes[fromClass.classId] = 1;
      visjsData.nodes.push({
        id: fromClass.classId,
        label: fromClass.classLabel,
        shape: Lineage_classes.defaultShape,
        color: Lineage_classes.getSourceColor(Lineage_sources.activeSource),
        data: {
          id: fromClass.classId,
          label: fromClass.label,
          source: Lineage_sources.activeSource,
          type: "class"
        }
      });
    }
    if (!existingNodes[toClass.classId]) {
      existingNodes[toClass.classId] = 1;
      visjsData.nodes.push({
        id: toClass.classId,
        label: toClass.classLabel,
        shape: Lineage_classes.defaultShape,
        color: Lineage_classes.getSourceColor(Lineage_sources.activeSource),
        data: {
          id: toClass.classId,
          label: toClass.label,
          source: Lineage_sources.activeSource,
          type: "class"
        }
      });
    }
    var primaryKeyFromColumn = null;
    var primaryKeyToColumn = null;
    for (var columnAlias in data[0]) {
      var array = columnAlias.split(",");
      if (array.length == 3) {
        if (array[0] == fromClass.classLabel) {
          primaryKeyFromColumn = columnAlias;
        }
        else if (array[0] == toClass.classLabel) {
          primaryKeyToColumn = columnAlias;
        }
      }
    }
    data.forEach(function(item) {
      var idFrom = item[primaryKeyFromColumn];
      var idTo = item[primaryKeyToColumn];

      if (!existingNodes[idFrom]) {
        existingNodes[idFrom] = 1;
        visjsData.nodes.push({
          id: idFrom,
          label: idFrom,
          shape: "square",
          size: Lineage_classes.defaultShapeSize,
          color: "brown",
          data: {
            id: idFrom,
            label: idFrom,
            source: self.currentDatabase,
            type: "linkedSQLdata"
          }
        });
      }

      if (!existingNodes[idTo]) {
        existingNodes[idTo] = 1;
        visjsData.nodes.push({
          id: idTo,
          label: idTo,
          shape: "square",
          size: Lineage_classes.defaultShapeSize,
          color: "grey",
          data: {
            id: idTo,
            label: idTo,
            source: self.currentDatabase,
            type: "linkedSQLdata"
          }
        });
      }
      var edgeId = idFrom + "_" + fromClass.classId;
      if (!existingNodes[edgeId]) {
        existingNodes[edgeId] = 1;
        visjsData.edges.push({
          id: edgeId,
          from: idFrom,
          to: fromClass.classId,
          arrows: {
            to: {
              enabled: true,
              type: "solid",
              scaleFactor: 0.5
            }
          },
          color: Lineage_classes.defaultEdgeColor
        });
      }
      var edgeId = idTo + "_" + toClass.classId;
      if (!existingNodes[edgeId]) {
        existingNodes[edgeId] = 1;
        visjsData.edges.push({
          id: edgeId,
          from: idTo,
          to: toClass.classId,
          arrows: {
            to: {
              enabled: true,
              type: "solid",
              scaleFactor: 0.5
            }
          },
          color: Lineage_classes.defaultEdgeColor
        });
      }
      var edgeId = idFrom + "_" + idTo;
      if (!existingNodes[edgeId]) {
        existingNodes[edgeId] = 1;
        visjsData.edges.push({
          id: edgeId,
          from: idFrom,
          to: idTo,
          arrows: {
            to: {
              enabled: true,
              type: "solid",
              scaleFactor: 0.5
            }
          },
          dashes: true,
          color: "blue",
          data: {
            id: edgeId,
            source: self.currentDatabase,
            type: "linkedSQLdataEdge"
          }
        });
      }
    });

    if (!visjsGraph.data || !visjsGraph.data.nodes) {
      self.drawNewGraph(visjsData);
    }
    visjsGraph.data.nodes.add(visjsData.nodes);
    visjsGraph.data.edges.add(visjsData.edges);
    visjsGraph.network.fit();
    $("#waitImg").css("display", "none");
  };

  self.copySqlToClipboard = function() {
    var sql = $("#LineageQuery_SqlDiv").html();
    common.copyTextToClipboard(sql);
  };
  self.stackContext = function() {
    self.queryContexts.push(self.queryContext);
  };


  self.clearQuery = function() {
    self.queryContexts = {};
    $("#lineageQuery_Filters").html("");
    self.filters={}

  };

  self.viewSQL = function() {
    $("#LineageQuery_SqlDivWrapper").css("display", "block");
  };


  self.storedQueries = {
    saveCurrentQuery: function() {
      if (Object.keys(self.filters).length == 0) {
        return alert("n query to save");
      }
      Sparql_CRUD.save("STORED_QUERIES", Lineage_sources.activeSource, self.filters, "private");


    }, showStoredQueriesTab: function() {
      Sparql_CRUD.showDialog("STORED_QUERIES", "LineageQuery_storedQueriesDiv", Lineage_sources.activeSource, null, self.storedQueries.onLoadStoredQuery);


    },

    onLoadStoredQuery: function(err, filters) {

      if (err) {
        return alert(err.responseText || err);
      }
      var html = "";
      for (var key in filters) {
        var filter = filters[key];
        html += "<div>" + self.getFilterHtml(filter, true) + "</div>";
      }
      //  html += "<div><button onclick='Lineage_query.executeStoredQuery()'>Execute</button></div>";
      $("#LineageQuery_currrentStoredQueryDiv").html(html);
      self.storedQueries.currentQuery = filters;

    }

    , updateStoredQueryParams: function() {
      var inputs = $(".storedQuery_value");
      inputs.each(function() {
        var filter = $(this).attr("id").replace("_value", "");
        var value = $(this).val();
        self.storedQueries.currentQuery[filter].value = value;

      });
    }


  };

  self.queryModel = {

    loadSourceModel: function() {
      Sparql_OWL.getObjectRestrictions(Lineage_sources.activeSource, null, null, function(err, result) {
        if (err) {
          return alert(err.responseText);
        }
        self.currentSourceRestrictions={}
        var data=[]
        result.forEach(function(item){
          for(var key in item){
            item[key]= item[key].value
          }
          self.currentSourceRestrictions[item.node]=item;
          var label=item.conceptLabel+" - "+item.propLabel+" - >"+item.valueLabel
          data.push({id: item.node, label :label})

        })
        data.sort(function(a,b){
          if(a.label>b.label)
            return 1;
          if(a.label<b.label)
            return -1;
         return 0
        })
        common.fillSelectOptions("LineageQuery_queryModelSelect",data, false,"label","id")
      });

    },
    onSelectRestriction: function(restrictionId) {
      if(!confirm("add filter "))
        return;
      var restriction=self.currentSourceRestrictions[restrictionId]

      self.reset();
      self.clearQuery()
      var filter= {
          subjectVar: "?s1",

          predicateType: "rdf:type",
          predicateUri: null,
          inversePredicate: null,

          objectType: null,
          objectUri: restriction.concept,
        objectUriLabel:restriction.conceptLabel,

          filterBooleanOperator: null
        };
      self.addFilter(filter)
      var filter= {
        subjectVar: "?s1",

        predicateType: null,
        predicateUri: restriction.prop,
        predicateUriLabel:restriction.propLabel,
        inversePredicate: null,

        objectType: null,
        objectUri: null,

        filterBooleanOperator: null
      };
      self.addFilter(filter)
      var filter= {
        subjectVar: "?o2",

        predicateType: "rdf:type",
        predicateUri: null,
        inversePredicate: null,

        objectType: null,
        objectUri: restriction.value,
        objectUriLabel:restriction.valueLabel,

        filterBooleanOperator: null
      };
      self.addFilter(filter)

      $("#lineageQuery_tabsDiv").tabs("option","active",1);





      }
  };


  return self;
})();
