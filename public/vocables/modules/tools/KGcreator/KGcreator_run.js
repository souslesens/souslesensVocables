import MainController from "../../shared/mainController.js";
import KGcreator from "./KGcreator.js";
import SearchUtil from "../../search/searchUtil.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";

var KGcreator_run = (function() {
  var self = {};


  self.createTriples = function(test, _options, callback) {
    if (!_options) {
      _options = {};
    }
    MainController.UI.message("creating triples...");
    $("#KGcreator_infosDiv").val("creating triples...");
    if (!mappings) {
      if (callback) {
        return callback("no currentJsonObject");
      }
      return;
    }

    var dataLocation = "";


    var mappings = KGcreator.currentConfig.currentMappings;

    if (!mappings.graphUri) {
      var graphUri = "";
      if (self.currentGraphUri) {
        graphUri = self.currentGraphUri;
      }
      graphUri = prompt("enter graphUri", graphUri);
      if (!graphUri) {
        return;
      }

      mappings.graphUri = graphUri;

    }
    var options = {};
    if (test) {
      options = {
        deleteOldGraph: false,
        sampleSize: 500,
        dataLocation: dataLocation
      };
    }
    else {
      options = {
        deleteOldGraph: false,
        dataLocation: dataLocation
      };
    }
    if (_options.deleteTriples) {
      options.deleteTriples = true;
    }

    if (Config.clientSocketId) {
      options.clientSocketId = Config.clientSocketId;
    }

    self.saveMappings(null, function(_err, _result) {
      if (_err) {
        return alert(_err);
      }

      $("#KGcreator_infosDiv").val("");

      var payload = {

        source: KGcreator.currentSlsvSource,
        type: KGcreator.currentConfig.currentDataSource.type,
        datasource: KGcreator.currentConfig.currentDataSource.name,
        table: KGcreator.currentConfig.currentDataSource.currentTable,
        options: JSON.stringify(options)
      };


      if (self.currentSourceType == "CSV") {
        payload = {
          dir: "CSV/" + self.currentCsvDir,
          fileName: self.currentSource + "_" + mappings.fileName + ".json",
          options: JSON.stringify(options)
        };
      }
      else if (self.currentSourceType == "DATABASE") {
        payload = {
          dir: "CSV/" + self.currentSlsvSource,
          fileName: self.currentDbName + "_" + mappings.fileName + ".json",
          options: JSON.stringify(options)
        };
      }

      if (_options && _options.allMappings) {
        payload.fileName = null;
      }

      $.ajax({
        type: "POST",
        url: `${Config.apiUrl}/kg/triples`,
        data: payload,
        dataType: "json",
        success: function(result, _textStatus, _jqXHR) {
          if (test) {
            var str = JSON.stringify(result, null, 2);

            $("#KGcreator_infosDiv").val(str);
            MainController.UI.message("", true);
          }
          else {
            if (_options.deleteTriples) {
              $("#KGcreator_infosDiv").val(result.result);
              MainController.UI.message(result.result, true);
            }
            else {
              $("#KGcreator_infosDiv").val(result.countCreatedTriples + " triples created in graph " + mappings.graphUri);
              MainController.UI.message("triples created", true);
            }
          }
          if (callback) {
            return callback();
          }
        },
        error(err) {
          if (callback) {
            return callback(err.responseText);
          }
          return alert(err.responseText);
        }
      });
    });
  };

  self.indexGraph = function(callback) {
    var graphSource = null;
    for (var source in Config.sources) {
      if (Config.sources[source].graphUri == self.currentGraphUri) {
        graphSource = source;
      }
    }
    if (!source) {
      if (callback) {
        return callback("no source associated to graph " + self.currentGraphUri);
      }
      return alert("no source associated to graph " + self.currentGraphUri);
    }
    if (callback || confirm("index source " + graphSource)) {
      SearchUtil.generateElasticIndex(graphSource, null, function(err, _result) {
        if (err) {
          if (callback) {
            return callback(err.responseText);
          }
          return alert(err.responseText);
        }
        $("#KGcreator_infosDiv").val("indexed graph " + mappings.graphUri + " in index " + graphSource.toLowerCase());
        if (callback) {
          return callback();
        }
      });
    }
  };

  self.clearGraph = function(deleteAllGraph, callback) {
    if (!mappings) {
      if (callback) {
        return callback("node currentJsonObject selected");
      }
      return;
    } //alert("no file mappings selected");
    if (!mappings.graphUri) {
      return alert("no graphUri");
    }

    if (!confirm("Do you really want to clear graph " + mappings.graphUri)) {
      if (callback) {
        return callback("graph deletion aborted");
      }
      return;
    }
    const payload = { graphUri: mappings.graphUri };
    $.ajax({
      type: "POST",
      url: `${Config.apiUrl}/kg/clearGraph`,
      data: payload,
      dataType: "json",
      success: function(_result, _textStatus, _jqXHR) {
        if (callback) {
          return callback();
        }
        return MainController.UI.message("graph deleted " + mappings.graphUri);
      },
      error(err) {
        if (callback) {
          return callback(err);
        }
        return MainController.UI.message(err);
      }
    });
  };

  self.deleteKGcreatorTriples = function(deleteAllKGcreatorTriples, callback) {
    if (!mappings) {
      if (callback) {
        return callback("node currentJsonObject selected");
      }
      return;
    } //alert("no file mappings selected");
    if (!mappings.graphUri) {
      if (callback) {
        return callback("no graphUri");
      }
      return alert("no graphUri");
    }

    if (deleteAllKGcreatorTriples) {
      if (!confirm("Do you really want to delete  triples created with KGCreator in " + mappings.graphUri)) {
        if (callback) {
          return callback("triples deletion aborted");
        }
        return;
      }

      var filter = "?p =<http://souslesens.org/KGcreator#mappingFile>";
      MainController.UI.message("delting triples triples created with KGCreator in " + mappings.graphUri);
      Sparql_generic.deleteTriplesWithFilter(self.currentSlsvSource, filter, function(err, result) {
        if (err) {
          if (callback) {
            return callback("triples deletion aborted");
          }
          return alert(err.responseText);
        }

        alert("triples deleted");
        if (callback) {
          return callback();
        }
      });
    }
    else {
      if (!confirm("Do you really want to delete  triples created with KGCreator in " + mappings.fileName)) {
        if (callback) {
          return callback("triples deletion aborted");
        }
        return;
      }
      MainController.UI.message("delting triples from mapping file : " + mappings.fileName);
      self.createTriples(false, { deleteTriples: true }, function(err, result) {
        if (err) {
          if (callback) {
            return callback("triples deletion aborted");
          }
          return alert(err.responseText);
        }

        alert("triples deleted");
        if (callback) {
          return callback();
        }
      });
    }
  };


  self.stopCreateTriples = function() {
    socket.emit("KGCreator", "stopCreateTriples");
    MainController.UI.message("import interrupted by user", true);
  };

  self.createAllMappingsTriples = function() {
    if (!mappings) {
      return callback("select any existing  mapping ");
    }
    if (!confirm("generate KGcreator triples form all mappings. this only will delete all previous  KGcreator triples ")) {
      return;
    }
    $("#KGcreator_infosDiv").val("generating KGcreator triples form all mappings ");
    async.series(
      [
        //delete previous KG creator triples
        function(callbackSeries) {
          $("#KGcreator_infosDiv").val("deleting previous KGcreator triples ");
          self.deleteKGcreatorTriples(true, function(err, result) {
            return callbackSeries(err);
          });
        },
        function(callbackSeries) {
          $("#KGcreator_infosDiv").val("creating new triples (can take long...)");
          self.createTriples(false, { allMappings: 1 }, function(err, result) {
            return callbackSeries(err);
          });
        },

        function(callbackSeries) {
          $("#KGcreator_infosDiv").val("reindexing graph)");
          self.indexGraph(function(err, result) {
            return callbackSeries(err);
          });
        }
      ],
      function(err) {
        if (err) {
          $("#KGcreator_infosDiv").val("\nALL DONE");
        }
      }
    );
  };

  return self;
})();

export default KGcreator_run;
window.KGcreator_run = KGcreator_run;