import KGcreator from "./KGcreator.js";
import KGcreator_graph from "./KGcreator_graph.js";

var KGcreator_mappings = (function() {
  var self = {};

  self.showMappingDialog = function(addColumnClassType) {
    PopupMenuWidget.hidePopup();

    self.currentSlsvSource = KGcreator.currentSlsvSource;
    self.currentColumn = {
      node: KGcreator.currentTreeNode,
      triples: []
    };
    var columnNode = self.currentColumn.node;

    /*   if (columnNode.data.type.indexOf("Column") < 0) {
return alert("select a field (column)");
}*/

    $("#smallDialogDiv").dialog("open");
    $("#smallDialogDiv").dialog("option", "title", "Mapping " + columnNode.data.table + "." + columnNode.data.id);

    $("#smallDialogDiv").load("./modules/tools/KGcreator/html/columnMappingsDialog.html", function() {
      PredicatesSelectorWidget.load("LinkColumn_predicateSelectorDiv", self.currentSlsvSource, function() {
        $("#editPredicate_mainDiv").css("flex-direction", "column");
        $("#editPredicate_vocabularySelect2").css("display", "inline");
        $("#editPredicate_vocabularySelect2").val("usual");
        PredicatesSelectorWidget.init(self.currentSlsvSource, function() {
          PredicatesSelectorWidget.onSelectObjectFn = function(value) {
          };
          PredicatesSelectorWidget.onSelectPropertyFn = function(value) {
          };

          var html =
            "<div>isBlankNode<input type='checkbox' id='LinkColumn_isObjectBlankNodeCBX' />" +
            "is String <input type='checkbox' id='LinkColumn_isObjectStringCBX' /><br> " +
            " lookup name <input id='LinkColumn_objectLookupName' style='width:150px;background-color: white'/></div>";
          $("#editPredicate_customContentDiv").html(html);

          $("#editPredicate_vocabularySelect2").bind("change", function() {
            KGcreator_mappings.onTripleModelSelect("o", $(this).val());
          });

          $("#LinkColumn_subjectInput").val(columnNode.data.id);
          $("#editPredicate_vocabularySelect2").append("<option value=\"table_Column\">table Column</option>");
        });

        self.columnJsonEditor = new JsonEditor("#KGcreator_columnJsonDisplay", {});

        var existingTriples = KGcreator.getColumnsMappings(columnNode.data.table, columnNode.data.id, "s");
        if (existingTriples[columnNode.data.id]) {
          self.updateColumnTriplesEditor(existingTriples[columnNode.data.id]);
        }
        if (addColumnClassType && KGcreator_graph.currentGraphNode.data.id) {
          var classTypeTriple = {
            s: columnNode.data.id,
            p: "rdf:type",
            o: KGcreator_graph.currentGraphNode.data.id
          };
          self.updateColumnTriplesEditor(classTypeTriple);
        }
      });
    });
  };
  self.onTripleModelSelect = function(role, value) {
    if (!value) {
      return;
    }
    var columnNode = self.currentColumn.node;

    if (value == "_function") {
      return self.showFunctionDialog(role);
    }

    if (role == "s") {
      if (value == "_selectedColumn") {
        $("#KGcreator_subjectInput").val(columnNode.id);
      }
      else {
        $("#KGcreator_subjectInput").val(value);
      }
    }
    else if (role == "p") {
      $("#editPredicate_propertyValue").val(value);
    }
    else if (role == "o") {
      if (value == "table_Column") {
        var table = columnNode.data.table;
        var columns = KGcreator.currentConfig.currentDataSource.tables[table];
        common.fillSelectOptions("editPredicate_objectSelect", columns, true);
      }
      else {
        $("#editPredicate_objectValue").val(value);
      }
    }
  };

  self.updateColumnTriplesEditor = function(triples) {
    if (!Array.isArray(triples)) {
      triples = [triples];
    }

    triples.forEach(function(triple) {
      if (Object.keys(triple).length >= 3) {
        self.currentColumn.triples.push(triple);
      }
    });
    self.columnJsonEditor.load(self.currentColumn.triples);
  };

  self.addBasicMapping = function(basicType) {
    if (basicType) {
      var column = self.currentColumn.node.data.id;
      var triples = [];
      triples.push({
        s: column,
        p: "rdf:type",
        o: basicType
      });
      triples.push({
        s: column,
        p: "rdfs:label",
        o: column,
        isString: true
      });
      self.updateColumnTriplesEditor(triples);
    }
  };
  self.addTripleFromPredicateSelectorWidget = function(basicType) {
    var subject = self.currentColumn.node.data.id;
    var predicate = PredicatesSelectorWidget.getSelectedProperty();
    var object = PredicatesSelectorWidget.getSelectedObjectValue();
    var isSubjectBlankNode = $("#LinkColumn_isSubjectBlankNodeCBX").prop("checked");
    var isObjectBlankNode = $("#LinkColumn_isObjectBlankNodeCBX").prop("checked");
    var isObjectString = $("#LinkColumn_isBlankNode").prop("checked");
    var isRestrictionCBX = $("#LinkColumn_isRestrictionCBX").prop("checked");
    var subjectLookupName = $("#LinkColumn_subjectLookupName").val();
    var objectLookupName = $("#LinkColumn_objectLookupName").val();
    var isSpecificPredicate = $("#LinkColumn__isSpecificPredicateCBX").prop("checked");

    if (!subject) {
      return alert("missing subject");
    }
    if (!predicate) {
      return alert("missing predicate");
    }
    if (!object) {
      return alert("missing object");
    }

    var tripleObj = { s: subject, p: predicate, o: object };

    if (predicate.indexOf("xsd:") == 0) {
      tripleObj.dataType = predicate;
    }

    if (isObjectString) {
      tripleObj.isString = true;
    }
    else if (predicate.toLowerCase().indexOf("label") > -1) {
      tripleObj.isString = true;
    }
    else if (predicate.toLowerCase().indexOf("definedby") > -1) {
      tripleObj.isString = true;
    }
    else if (predicate.toLowerCase().indexOf("comment") > -1) {
      tripleObj.isString = true;
    }
    else if (predicate.toLowerCase().indexOf("example") > -1) {
      tripleObj.isString = true;
    }

    if (subjectLookupName) {
      tripleObj.lookup_s = subjectLookupName;
    }
    if (objectLookupName) {
      tripleObj.lookup_o = objectLookupName;
    }
    if (isSubjectBlankNode) {
      tripleObj.s = "$_" + subject;
    }
    if (isObjectBlankNode) {
      tripleObj.o = "$_" + object;
    }
    if (isRestrictionCBX) {
      tripleObj.isRestriction = true;
    }
    /*   if (subject.indexOf("http://") > 0 && object.indexOf("function") < 0) {
     tripleObj.subjectIsSpecificUri = true;
 }
 if (object.indexOf("http://") > 0 && object.indexOf("function") < 0) {
     tripleObj.objectIsSpecificUri = true;
 }*/
    self.updateColumnTriplesEditor(tripleObj);
  };
  self.addLookup = function() {
    var lookup = {
      name: $("#KGCreator_lookupName").val(),
      fileName: $("#KGCreator_lookupTable").val(),
      sourceColumn: $("#KGCreator_lookupSourceColumnSelect").val(),
      targetColumn: $("#KGCreator_lookupTargetColumnSelect").val(),
      transformFn: $("#KGCreator_lookupTransformFn").val().replace(/"/g, "'")
    };


    if (!lookup.name) {
      return alert("name is mandatory");
    }
    if (!lookup.fileName) {
      return alert("fileName is mandatory");
    }
    if (!lookup.sourceColumn) {
      return alert("sourceColumn is mandatory");
    }
    if (!lookup.targetColumn) {
      return alert("targetColumn is mandatory");
    }


    KGcreator.currentConfig.currentMappings.lookups.push(lookup);
    KGcreator.saveDataSourceMappings();
    $("#smallDialogDiv").dialog("close");

  };
  self.showFunctionDialog = function(_role) {
    $("#KGcreator_dialogDiv").load("modules/tools/KGcreator/html/functionDialog.html");
    $("#KGcreator_dialogDiv").dialog("open");
  };

  self.createPrefixTransformFn = function() {
    var prefix = prompt("Enter Prefix", self.currentTreeNode.data.id);
    if (!prefix) {
      return;
    }
    var str = "if(mapping.isString && role=='o') return value; else return '" + prefix + "_'+value;";
    $("#KGcreator_fnBody").val(str);
  };
  self.testFunction = function() {
    var fnBody = $("#KGcreator_fnBody").val();
    fnBody = fnBody.replace(/"/g, "'");
    try {
      new Function("row", "mapping", fnBody);
      $("#KGcreator_testFnResult").html("function OK");
    } catch (err) {
      $("#KGcreator_testFnResult").html("error in function code " + err.message);
    }
  };

  self.addFunction = function(role) {
    var fnBody = $("#KGcreator_fnBody").val();
    fnBody = fnBody.replace(/"/g, "'");

    try {
      new Function("row", "mapping", fnBody);
    } catch (err) {
      return alert("error in function code " + err.message);
    }
    var fnObject = "function{" + fnBody + "}";
    //  var fnObject=JSON.stringify({"_function":fnBody})

    if (role == "s") {
      $("#KGcreator_subjectInput").val(fnObject);
    }
    else if (role == "p") {
      $("#editPredicate_propertyValue").val(fnObject);
    }
    else if (role == "o") {
      $("#editPredicate_objectValue").val(fnObject);
    }
    $("#KGcreator_dialogDiv").dialog("close");
  };


  self.addTransformFunction = function() {
    var table = self.currentTable;
    if (!table) {
      return alert("no table selected");
    }

    var column = $("#KGcreator_transformColumnSelect").val();
    var fnBody = $("#KGcreator_fnBody").val();
    fnBody = fnBody.replace(/"/g, "'");

    try {
      new Function("value", "role", "prop", "row", fnBody);
    } catch (err) {
      return alert("error in function code " + err.message);
    }
    fnBody = fnBody.replace(/"/g, "'");
    fnBody = "function{" + fnBody + "}";
    if (!KGcreator.currentConfig.currentMappings[self.currentTable].transform) {
      KGcreator.currentConfig.currentMappings[self.currentTable].transform = {};
    }
    KGcreator.currentConfig.currentMappings[self.currentTable].transform[column] = fnBody;
    self.transformJsonEditor.load(KGcreator.currentConfig.currentMappings[self.currentTable].transform);

  };


  self.saveTransform = function() {
    var json = self.transformJsonEditor.get();
    KGcreator.currentConfig.currentMappings[self.currentTable].transform = json;
    KGcreator.saveDataSourceMappings();
    $("#KGcreator_dialogDiv").dialog("close");
  };


  self.saveColumnMappings = function() {
    var columnNode = self.currentColumn.node;
    if (!KGcreator.currentConfig.currentMappings[columnNode.data.table]) {
      KGcreator.currentConfig.currentMappings[columnNode.data.table] = { tripleModels: [], transforms: [] };
    }
    var newColumnMappings=self.columnJsonEditor.get()

    //concat new triples from editor with other mappings in table
    KGcreator.currentConfig.currentMappings[columnNode.data.table].tripleModels.forEach(function(triple){
      if(triple.s.indexOf(columnNode.data.id)==0 || triple.s.indexOf(columnNode.data.id)==1 )//include "$_ blanknode
        return;
        newColumnMappings.push(triple)
    })


    KGcreator.currentConfig.currentMappings[columnNode.data.table].tripleModels =newColumnMappings;
    KGcreator.saveDataSourceMappings();

    JstreeWidget.setSelectedNodeStyle({ color: "#0067bb" });
    JstreeWidget.setSelectedNodeStyle({ color: "#0067bb" });

    if (self.currentGraphNode) {
      columnNode.data.classNode = KGcreator_graph.currentGraphNode.id;
      KGcreator_graph.drawColumnToClassGraph([columnNode]);
    }
    $("#smallDialogDiv").dialog("close");
  };

  self.showTableMappings = function(node) {
    KGcreator_graph.drawDetailedMappings(node.data.id);
  };

  self.showSourceMappings = function(node) {
    KGcreator_graph.drawDetailedMappings(null);
  };

  self.showLookupsDialog = function(node) {

    PopupMenuWidget.hidePopup();
    self.currentSlsvSource = KGcreator.currentSlsvSource;
    var table = node.data.id;
    $("#smallDialogDiv").dialog("open");
    $("#smallDialogDiv").dialog("option", "title", "Lookups for " + table);

    $("#smallDialogDiv").load("./modules/tools/KGcreator/html/lookupDialog.html", function() {
      $("#KGCreator_lookupName").val(table);
      $("#KGCreator_lookupTable").val(table);

      var columns = [];
      KGcreator.currentConfig.currentDataSource.tables[table].forEach(function(column) {
        columns.push(column);
      });
      common.fillSelectOptions("KGCreator_lookupSourceColumnSelect", columns, true);
      common.fillSelectOptions("KGCreator_lookupTargetColumnSelect", columns, true);

    });
  };

  self.showTranformsDialog = function(node) {
    PopupMenuWidget.hidePopup();
    self.currentSlsvSource = KGcreator.currentSlsvSource;
    var table = node.data.id;
    self.currentTable = table;
    $("#smallDialogDiv").dialog("open");
    $("#smallDialogDiv").dialog("option", "title", "Lookups for " + table);

    $("#smallDialogDiv").load("./modules/tools/KGcreator/html/transformDialog.html", function() {
      var columns = [];
      KGcreator.currentConfig.currentDataSource.tables[table].forEach(function(column) {
        columns.push(column);
      });
      common.fillSelectOptions("KGcreator_transformColumnSelect", columns, true);


      var transforms = KGcreator.currentConfig.currentMappings[table].transform;
      if (!transforms) {
        transforms = {};
      }
      self.transformJsonEditor = new JsonEditor("#KGcreator_transformJsonDisplay", {});
      self.transformJsonEditor.load(transforms);


    });
  };


  return self;
})
();

export default KGcreator_mappings;
window.KGcreator_mappings = KGcreator_mappings;
