var Lineage_query = (function() {
  var self = {};
  self.databasesMap = {};
  self.relationObj = {};
  self.currentRelation = null;
  self.filters = {};

  self.existingTables = {};
  self.isLoaded = false;

  self.showQueryDailog = function() {
    $("#LineagePopup").dialog("open");
    if (self.isLoaded) {
      return;
    }
    $("#LineagePopup").load("snippets/lineage/queryDialog.html", function() {
      var data = [

        "rdf:type",
        "rdfs:label",
        "rdfs:isDefinedBy",
        "rdfs:comment",
        "skos:altLabel",
        "skos:prefLabel",
        "skos:definition",
        "skos:example"

      ];
      common.fillSelectOptions("lineageQuery_predicateSelect", data, true);


    });
  };


  self.onSelectObjectType = function(type) {

  };

  self.addFilter = function() {
    var predicate = $("#lineageQuery_predicateSelect").val();
    var subjectType = $("#lineageQuery_subjectTypeSelect").val();
    var objectType = $("#lineageQuery_objectTypeSelect").val();

    var filterBooleanOperator = $("#filterBooleanOperator").val();

    var operator = $("#lineageQuery_operator").val();
    var value = $("#lineageQuery_value").val();


    if (!objectType && !predicate) {
      return alert(" you must select at least a subject type or a predicate ");
    }


    $("#LineageQuery_value").val("");

    var filterId = "filter_" + common.getRandomHexaId(5);

    var html = "<div class='LineageQuery_QueryElt' id='" + filterId + "'> ";
    html += "<button style='size: 10px' onclick='Lineage_query.removeFilter(\"" + filterId + "\")'>X</button>";

    var obj = {
      subjectType: subjectType,
      objectType: objectType,
      predicate: predicate,
      filterBooleanOperator: filterBooleanOperator
    };

    if (value) {

      obj.operator = operator;
      obj.value = value;
      if (Object.keys(self.filters).length > 0) {
        html += filterBooleanOperator + " ";
      }
      html += "&nbsp;" + subjectType + " " + predicate + " " + objectType + " " + operator + "&nbsp;" + value + "&nbsp;";
    }
    else {
      html += "ALL &nbsp;";

    }
    html += "</div>";

    self.filters[filterId] = obj;

    $("#lineageQuery_Filters").append(html);
    ///  $("#LineageQuery_createFilterDiv").css("display", "none");
    return obj;
  };

  self.removeFilter = function(filterId) {
    delete self.filters[filterId];
    $("#" + filterId).remove();
  };

  self.executeQuery = function(queryType) {
    var source = Lineage_sources.activeSource;
    var fromStr = Sparql_common.getFromStr(source);
    var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
      "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
      "select ";


    if (queryType == "count") {
      query += "(count (distinct ?s) AS ?count)";
    }
    else {
      query += "*";
    }
    query += fromStr;

    query += " where {";


    var filterIndex = 0;
    for (var key in self.filters) {


      if (filterIndex > 0) {
        query += "\n " + filter.filterBooleanOperator + " \n";
      }
      filterIndex += 1;

      query += "{ ?s rdfs:label ?sLabel. ?s rdf:type ?sType. ";
      var filter = self.filters[key];
      var filterStr = "";


      if (filter.subjectType == "class") {
        filterStr += "?s rdf:type owl:Class.";
      }
      else if (filter.subjectType == "property") {
        filterStr += "?s rdf:type owl:ObjectProperty.";
      }

      else if (filter.subjectType == "bag") {
        filterStr += "?s rdf:type rdf:Bag.";
      }

      var strO = "sLabel";
      if (filter.predicate) {
        query += " ?s ?p ?o. Filter(?p =" + filter.predicate + ") ";
        strO = "o";
      }


      //filter object
      if (filter.objectType == "string") {

        if (filter.operator == "contains") {
          filterStr += " Filter(regex(str(?" + strO + "),'" + filter.value + "','i')).";
        }
        else if (filter.operator == "not contains") {
          filterStr += " Filter( ! regex(str(?" + strO + "),'" + filter.value + "','i')).";
        }
        else {
          filterStr += " Filter(?" + strO + "" + filter.operator + "'" + filter.value + "').";
        }
      }
      else if (filter.objectType == "number") {
        filterStr += " Filter(?" + strO + "" + filter.operator + "'" + filter.value + "'^^xsd:float).";

      }
      else if (filter.objectType == "date") {
        filterStr += " Filter(?" + strO + "" + filter.operator + "'" + filter.value + "'^^xsd:dateTime).";
      }


      query += filterStr;

      query += "}";


    }

    query += " } limit 10000";


    if (queryType == "copyQuery") {
      return common.copyTextToClipboard(query);
    }
    var url = Config.sources[source].sparql_server.url + "?format=json&query=";
    Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function(err, result) {
      if (err) {
        return callback(err);
      }

      if (queryType == "count") {
        var count = result.results.bindings[0].count.value;
        $("#lineageQuery_listResultDiv").html("" + count + " subjects found");

      }
      else if (queryType == "graph") {
        var nodeIds = [];
        result.results.bindings.forEach(function(item) {
          if (nodeIds.indexOf(item.s.value) < 0) {
            nodeIds.push(item.s.value);
          }
        });
        Lineage_classes.addNodesAndParentsToGraph(source, nodeIds, {});
      }

      else if (queryType == "list") {
        var jsdata = [];
        var jstreeData = [];
        var uniqueNodes = {};
        result.results.bindings.forEach(function(item) {
          if (!uniqueNodes[item.sType.value]) {
            uniqueNodes[item.sType.value] = 1;
            jstreeData.push({
              id: item.sType.value,
              text: Sparql_common.getLabelFromURI(item.sType.value),
              parent: "#"
            });
          }
          if (!uniqueNodes[item.s.value]) {
            uniqueNodes[item.s.value] = 1;
            var label = item.s ? item.sLabel.value : Sparql_common.getLabelFromURI(item.s.value);
            jstreeData.push({
              id: item.s.value,
              text: label,
              parent: item.sType.value,
              data: {
                id: item.s.value,
                label: label,
                source: source
              }
            });
          }

        });

        var options = {
          contextMenu: Lineage_query.getResultListContextmenu(),
          selectTreeNodeFn:function(event, obj){self.currentTreeNode=obj.node},
          open_all:true
        };
        $("#lineageQuery_listResultDiv").html("<div style='width:600px;height:180px;overflow: auto'><div id='lineageQuery_listResultDivTree'></div>");
        common.jstree.loadJsTree("lineageQuery_listResultDivTree", jstreeData, options, function() {

        });

      }
    });


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
        // pb avec source
        var selectedNodes = $("#lineageQuery_listResultDivTree").jstree().get_selected(true);
        if (selectedNodes.length > 1) {
          async.eachSeries(selectedNodes, function(node, callbackEach) {
            Lineage_classes.drawNodeAndParents(node.data, 0, null, function(err, result) {

              callbackEach(err);
            });
          }, function(err) {
            if (err) {
              return alert(err.responseText);
            }
          });
        }
        else {
          Lineage_classes.drawNodeAndParents(self.currentTreeNode.data, 0);
        }
      }
    };
    return items;
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
    $("#LineageQuery_SqlDiv").html("");
    $("#LineageQuery_SQL_columnsTree").jstree().uncheck_all();
    self.onSelectRelation(self.currentRelation);
  };

  self.viewSQL = function() {
    $("#LineageQuery_SqlDivWrapper").css("display", "block");
  };

  return self;
})
();
