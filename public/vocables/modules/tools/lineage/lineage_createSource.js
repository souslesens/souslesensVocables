import common from "../../shared/common.js";
import Authentification from "../../shared/authentification.js";

var Lineage_createSource = (function() {
  var self = {};
  self.onLoaded = function() {


    $("#smallDialogDiv").dialog("open");
    $("#smallDialogDiv").load("modules/tools/lineage/html/createSource.html", function() {
      var sources = Object.keys(Config.sources);
      sources.sort();
      common.fillSelectOptions("create_source_imports", sources, false);
    });
  };

  self.createSource = function() {

    var sourceName = $("#create_source_name").val();
    var graphUri = $("#create_source_graphUri").val();
    var imports = $("#create_source_imports").val();

    var user = Authentification.currentUser.login;
    if (!sourceName) {
      return ("enter source name");
    }
    if (!graphUri) {
      return ("enter source graphUri");
    }
    var userPrivateProfile = "PRIVATE/" + user;

    async.series([
      //write source
      function(callbackSeries) {
        self.writeSource(sourceName, graphUri, imports, userPrivateProfile, function(err, result) {
          return callbackSeries(err);
        });

      },
      //write private profile if not exists
      function(callbackSeries) {
        var userProfiles = Authentification.currentUser.groupes;
        if (userProfiles.indexOf(userPrivateProfile) > -1) {
          return callbackSeries();
        }
        self.writePrivateUser(user, userPrivateProfile,function(err, result) {

          return callbackSeries(err);
        });
      },
      //load private source in lineage
      function(callbackSeries) {
        var url = window.location.href;
        var p = url.indexOf("?");
        if (p > -1) {
          url = url.substring(0, p);
        }
        url += "?tool=lineage&source=" + sourceName;
        window.location.href = url;
      }

    ], function(err) {
      if (err) {
        return alert(err.responseText);
      }

    });


  };


  self.writeSource = function(sourceName, graphUri, imports,  userPrivateProfile, callback) {

    var sourceObject = {
      "id": common.getRandomHexaId(12),
      "name": sourceName,
      "_type": "source",
      "sparql_server": {
        "url": "_default",
        "method": "POST",
        "headers": {}
      },
      "controller": "Sparql_OWL",
      "topClassFilter": "?topConcept rdf:type owl:Class .",
      "schemaType": "OWL",
      "dataSource": {
        "type": "",
        "connection": "_default",
        "dbName": "",
        "table_schema": "",
        "local_dictionary": {
          "table": "",
          "idColumn": "",
          "labelColumn": ""
        }
      },
      "editable": true,
      "color": "",
      "isDraft": false,
      "allowIndividuals":false,
      "predicates": {
        "broaderPredicate": "",
        "lang": ""
      },
      "group": userPrivateProfile,
      "imports": imports,
      "taxonomyPredicates": [
        "rdfs:subClassOf"
      ],
      "graphUri": graphUri
    };


    var payload =  {
       [sourceName]: sourceObject
      }

    $.ajax({
      type: "POST",
      url: `${Config.apiUrl}/sources`,
      data: payload,
      dataType: "json",
      success: function(data, _textStatus, _jqXHR) {
        return callback(null, data);
      },
      error: function(err) {
        return callback(err);
      }
    });


  };


  self.writePrivateUser = function(user,userPrivateProfile, callback) {

    var userProfileObject = {
      "name": user,
      "_type": "profile",
      "id": common.getRandomHexaId(12),
      "allowedSourceSchemas": [
        "OWL"
      ],
      "sourcesAccessControl": {
        [userPrivateProfile]: "readwrite"
      },
      "allowedTools": "ALL",
      "forbiddenTools": []
    };

    var payload = {
      body: {
        [user]: userProfileObject
      }
    };
    $.ajax({
      type: "POST",
      url: `${Config.apiUrl}/profiles`,
      data: payload,
      dataType: "json",
      success: function(data, _textStatus, _jqXHR) {
        return callback(null, data);
      },
      error: function(err) {
        return callback(err);
      }
    });
  };


  return self;

})();
export default Lineage_createSource;
window.Lineage_createSource = Lineage_createSource;
