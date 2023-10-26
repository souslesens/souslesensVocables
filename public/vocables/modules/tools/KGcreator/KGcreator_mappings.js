import KGcreator from "./KGcreator.js";

var KGcreator_mappings=(function(){

  var self={}


    self.showMappingDialog= function (addColumnClassType) {
      PopupMenuWidget.hidePopup();

      self.currentSlsvSource=KGcreator.currentSlsvSource
      self.currentColumn = {
        node: KGcreator.currentTreeNode,
        triples: [],
      };
      var columnNode=self.currentColumn.node
    
    

      /*   if (columnNode.data.type.indexOf("Column") < 0) {
    return alert("select a field (column)");
  }*/

      $("#smallDialogDiv").dialog("open");
      $("#smallDialogDiv").dialog("option","title","Mapping "+columnNode.data.table+"."+columnNode.data.id);

      $("#smallDialogDiv").load("./modules/tools/KGcreator/html/linkColumnToClassDialog.html", function () {


        PredicatesSelectorWidget.load("LinkColumn_predicateSelectorDiv", self.currentSlsvSource, function () {
          $("#editPredicate_mainDiv").css("flex-direction", "column");
          $("#editPredicate_vocabularySelect2").css("display", "inline");
          $("#editPredicate_vocabularySelect2").val("usual");
          PredicatesSelectorWidget.init(self.currentSlsvSource, function () {
            PredicatesSelectorWidget.onSelectObjectFn = function (value) {};
            PredicatesSelectorWidget.onSelectPropertyFn = function (value) {};


            var html =
              "<div>isBlankNode<input type='checkbox' id='LinkColumn_isObjectBlankNodeCBX' />" +
              "is String <input type='checkbox' id='LinkColumn_isObjectStringCBX' /><br> "+
              " lookup name <input id='LinkColumn_objectLookupName' style='width:150px;background-color: white'/></div>";
            $("#editPredicate_customContentDiv").html(html);

            $("#editPredicate_vocabularySelect2").bind("change", function () {
              KGcreator_mappings.onTripleModelSelect("o", $(this).val());
            });

            $("#LinkColumn_subjectInput").val(columnNode.data.id)
            $("#editPredicate_vocabularySelect2").append('<option value=\"table_Column\">table Column</option>');





          });

          self.columnJsonEditor = new JsonEditor("#KGcreator_columnJsonDisplay", {});
         

          var existingTriples =KGcreator.getColumnsMappings(columnNode.data.table, columnNode.data.id, "s");
          if (existingTriples[ columnNode.data.id]) self.updateColumnTriplesEditor(existingTriples[ columnNode.data.id]);
          if (addColumnClassType && KGcreator_graph.currentGraphNode.data.id) {
            var classTypeTriple = {
              s:  columnNode.data.id,
              p: "rdf:type",
              o: KGcreator_graph.currentGraphNode.data.id,
            };
            self.updateColumnTriplesEditor(classTypeTriple);
          }
        });
      });
    }

      ;
  self.onTripleModelSelect= function (role, value) {
      var columnNode=self.currentColumn.node
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

      } else if (role == "o") {
        if (value == "table_Column") {
          var table=columnNode.data.table
          var columns=KGcreator.currentConfig.currentDataSource.tables[table]
          common.fillSelectOptions("editPredicate_objectSelect",columns,true)
        } else {
          $("#editPredicate_objectValue").val(value);
        }

      }
    }
  ;
  
  self.updateColumnTriplesEditor= function (triples) {
      if (!Array.isArray(triples)) {
        triples = [triples];
      }

      triples.forEach(function (triple) {
        if (Object.keys(triple).length >= 3) self.currentColumn.triples.push(triple);
      });
      self.columnJsonEditor.load(self.currentColumn.triples);
    }  ;
  
  
  self.addBasicMapping= function (basicType) {
      if (basicType) {
        var column = self.currentColumn.node.data.id;
        var triples = [];
        triples.push({
          s: column,
          p: "rdf:type",
          o: basicType,
        });
        triples.push({
          s: column,
          p: "rdfs:label",
          o: column,
          isString: true,
        });
        self.updateColumnTriplesEditor(triples);
      }
    }  ;
  self.addTripleFromPredicateSelectorWidget= function (basicType) {
      var subject = self.currentColumn.node.data.id;
      var predicate = PredicatesSelectorWidget.getSelectedProperty();
      var object = PredicatesSelectorWidget.getSelectedObjectValue();
      var isColumnBlankNode = $("#LinkColumn_isBlankNode").prop("checked");
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
      } else if (predicate.toLowerCase().indexOf("label") > -1) {
        tripleObj.isString = true;
      } else if (predicate.toLowerCase().indexOf("definedby") > -1) {
        tripleObj.isString = true;
      } else if (predicate.toLowerCase().indexOf("comment") > -1) {
        tripleObj.isString = true;
      } else if (predicate.toLowerCase().indexOf("example") > -1) {
        tripleObj.isString = true;
      }

      if (subjectLookupName) {
        tripleObj.lookup_s = subjectLookupName;
      }
      if (objectLookupName) {
        tripleObj.lookup_o = objectLookupName;
      }
      if (isColumnBlankNode) {
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
    }

  ;
  self.addLookup = function () {
      var lookup = {
        name: $("#KGCreator_lookupName").val(),
        fileName: $("#KGCreator_lookupFileName").val(),
        sourceColumn: $("#KGCreator_lookupSourceColumn").val(),
        targetColumn: $("#KGCreator_lookupTargetColumn").val(),
        transformFn: $("#KGCreator_lookupTransformFn").val().replace(/"/g, "'"),
      };

      KGcreator.currentConfig.currentMappings.lookups.push(lookup);
      $("#KGcreator_dialogDiv").dialog("close");
    }

  ;
  self.showFunctionDialog = function (_role) {
      $("#KGcreator_dialogDiv").load("modules/tools/KGcreator/html/functionDialog.html");
      $("#KGcreator_dialogDiv").dialog("open");
    }  ;
  self.testFunction = function () {
      var fnBody = $("#KGcreator_fnBody").val();
      fnBody = fnBody.replace(/"/g, "'");
      try {
        new Function("row", "mapping", fnBody);
        $("#KGcreator_testFnResult").html("function OK");
      } catch (err) {
        $("#KGcreator_testFnResult").html("error in function code " + err.message);
      }
    }  ;
  self.addFunction = function (role) {
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
      } else if (role == "p") {
        $("#editPredicate_propertyValue").val(fnObject);
      } else if (role == "o") {
        $("#editPredicate_objectValue").val(fnObject);
      }
      $("#KGcreator_dialogDiv").dialog("close");
    }  ;
  self.addTransformFunction= function () {
      var column = $("#KGcreator_transformColumn").val();
      var fnBody = $("#KGcreator_fnBody").val();
      fnBody = fnBody.replace(/"/g, "'");

      try {
        new Function("value", "role", "prop", "row", fnBody);
      } catch (err) {
        return alert("error in function code " + err.message);
      }
      fnBody = "function{" + fnBody + "}";
    KGcreator.currentConfig.currentMappings.transform[column] = fnBody;

      $("#KGcreator_dialogDiv").dialog("close");
    }  ;





  self.validateLinkColumnToClass= function () {
      var columnNode = self.currentColumn.node;
    KGcreator.currentConfig.currentMappings[columnNode.data.table].tripleModels = self.currentColumn.triples;
      KGcreator.saveDataSourceMappings();

      JstreeWidget.setSelectedNodeStyle({ color: "#0067bb" });
      JstreeWidget.setSelectedNodeStyle({ color: "#0067bb" });

      if (self.currentGraphNode) {
        columnNode.data.classNode = KGcreator_graph.currentGraphNode.id;
       KGcreator_graph.drawColumnToClassGraph([columnNode]);
      }
      $("#smallDialogDiv").dialog("close");
    }  ;





  return self;


})()

export default KGcreator_mappings;
window.KGcreator_mappings=KGcreator_mappings