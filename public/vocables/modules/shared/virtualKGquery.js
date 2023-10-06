import R2Gmappings from "./R2Gmappings.js";
import common from "./common.js";

var VirtualKGquery = (function() {

  var self = {};


  self.execPathQuery = function(querySets, slsvSource, dataSource, options, callback) {
    if (!options) {
      options = {};
    }
    var paths = [];
    var joins = [];
    var sqlSelect = "";
    var sqlFrom = "";
    var sqlWhere = "";

    asyn.series([

      function(callbackSeries) {
        R2Gmappings.loadSlsvSourceConfig(slsvSource, function(err, config) {
          if (err) {
            return callbackSeries(err);
          }
          self.sourceConfig = config;

          callbackSeries();
        });
      },


      function(callbackSeries) {
        R2Gmappings.loadSourceMappings(slsvSource, dataSource, function(err, mappings) {
          self.dataSourcemappings = mappings;
          callbackSeries();
        });
      },



      //get columns and tables from predicates
      function(callbackSeries) {
      var pathsMap={}
        querySets.sets.forEach(function(querySet) {

          querySet.elements.forEach(function(queryElement, queryElementIndex) {

            var classUri = queryElement.fromNode;
            var matches = R2Gmappings.getClass2ColumnMapping(self.dataSourcemappings, classUri);
            if (matches.length == 0) {
              return callbackSeries("no match for class " + classUri);
            }
            if (matches.length>1) {
              return callbackSeries("multiple matches for class " + classUri+ "  :  "+JSON.stringify(matches));
            }
            var match=matches[0]
            var  obj = { fromClassUri:classUri,fromColumn: match.column,fromTable:match.table};



            var classUri = queryElement.toNode;
            var matches = R2Gmappings.getClass2ColumnMapping(self.mappings, classUri);

            if (matches.length == 0) {
              return callbackSeries("no match for class " + classUri);
            }
          if (matches.length>1) {
            return callbackSeries("multiple matches for class " + classUri+ "  :  "+JSON.stringify(matches));
          }
          var match=matches[0]
          obj.toClassUri =classUri;
            obj.toColumn=match.column
            obj.toTable=match.table;

            paths.push(obj);
          });

        });
      },


      //set joins
      function(callbackSeries) {
        var tableJoins = self.sourceConfig[slsvSource].tableJoins;
        var error = null;
       var existsJoin=false
          paths.forEach(function(path) {
            tableJoins.forEach(function(join) {
            if( (path.fromTable=join.fromTable && path.toTable=join.toTable) || (path.fromTable=join.toTable && path.toTable=join.fromTable)){
              if(! join.id) {
                join.id = common.getRandomHexaId(3)
              }
              path.tableJoin=join
              existsJoin=true
            }
        });
            if(!existsJoin){
              callbackSeries("no join defined between  tables :"+JSON.stringify(path));
            }
        });
        callbackSeries()
      },


      //build SQL
      function(callbackSeries) {
        sqlSelect=" SELECT * "
        sqlFrom=" FROM  "
        sqlWhere=" WHERE * "
        var distinctFromTables={}
        var distinctJoins={}
        paths.forEach(function(path,index) {
          distinctFromTables[path.fromTable]=1
          distinctFromTables[path.toTable]=1
          distinctJoins[path.join.id]=1
        });
      },

      function(callbackSeries) {

        querySets.sets.forEach(function(querySet) {
          if (querySet.booleanOperator) {
            whereStr += "\n " + querySet.booleanOperator + "\n ";
          }

          var predicateStr = "";
          var filterStr = "";
          var optionalStrs = "";
          var fromStr = "";

          querySet.elements.forEach(function(queryElement, queryElementIndex) {
            var subjectVarName = self.getVarName(queryElement.fromNode);
          });
        });
      }
    ], function(err) {
      return callback(err);
    });


    /*    var distinctTypesMap = {};
        var uniqueBasicPredicatesMap = {};

        var selectStr = "distinct * ";
        var groupByStr = "";
        if (options.aggregate) {
          selectStr = options.aggregate.select;
          groupByStr = " GROUP BY " + options.aggregate.groupBy;
        }

        var whereStr = "";
        var uniqueQueries = {};

       querySets.sets.forEach(function (querySet) {
          if (querySet.booleanOperator) {
            whereStr += "\n " + querySet.booleanOperator + "\n ";
          }

          var predicateStr = "";
          var filterStr = "";
          var optionalStrs = "";
          var fromStr=""

          querySet.elements.forEach(function (queryElement, queryElementIndex) {
            var subjectVarName = self.getVarName(queryElement.fromNode);
            var subjectUri = queryElement.fromNode.id;
            if (!distinctTypesMap[subjectVarName]) {
              distinctTypesMap[subjectVarName] = 1;
              filterStr += " " + subjectVarName + "  rdf:type <" + subjectUri + ">. ";
            }

            var objectVarName = self.getVarName(queryElement.toNode);
            var objectUri = queryElement.toNode.id;
            var subjectUri = queryElement.fromNode.id;
            if (!distinctTypesMap[objectVarName]) {
              distinctTypesMap[objectVarName] = 1;

              filterStr += " " + objectVarName + "  rdf:type <" + objectUri + ">.";
            }

            var transitionPredicate = "";

            queryElement.paths.forEach(function (pathItem, pathIndex) {
              var startVarName;
              var endVarName;
              var inverseStr = "";
              if (pathItem.length == 4) {
                startVarName = self.getVarName({ id: pathItem[1] });
                endVarName = self.getVarName({ id: pathItem[0] });
                inverseStr = "^";
              } else {
                startVarName = self.getVarName({ id: pathItem[0] });
                endVarName = self.getVarName({ id: pathItem[1] });
              }

              var basicPredicate = startVarName + " " + inverseStr + "<" + pathItem[2] + "> " + endVarName + ".\n";
              if (!uniqueBasicPredicatesMap[basicPredicate]) {
                uniqueBasicPredicatesMap[basicPredicate] = 1;
                predicateStr += basicPredicate;
              }
            });

            for (var key in querySet.classFiltersMap) {
              filterStr += querySet.classFiltersMap[key].filter + " \n";
            }

            function addToStringIfNotExists(str, text) {
              if (text.indexOf(str) > -1) {
                return text;
              } else {
                return text + str;
              }
            }

            var optionalStr = "";
            optionalStr = addToStringIfNotExists(" OPTIONAL {" + subjectVarName + " owl:hasValue " + subjectVarName + "Value}\n", optionalStr);
            optionalStr = addToStringIfNotExists(" OPTIONAL {" + objectVarName + " owl:hasValue " + objectVarName + "Value}\n", optionalStr);
            optionalStr = addToStringIfNotExists(" OPTIONAL {" + subjectVarName + " rdfs:label " + subjectVarName + "Label}\n", optionalStr);
            optionalStr = addToStringIfNotExists(" OPTIONAL {" + objectVarName + " rdfs:label " + objectVarName + "Label}\n", optionalStr);
            optionalStrs += " \n" + optionalStr;
          });

          whereStr += "{" + predicateStr + "\n" + "" + "\n" + filterStr + "\n" + optionalStrs + "}";
        });

        var fromStr = Sparql_common.getFromStr(self.source);
        var query = "PREFIX owl: <http://www.w3.org/2002/07/owl#>" + "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";

        query += " Select " + selectStr + "  " + fromStr + " where {" + whereStr + "}";

        query += " " + groupByStr + " limit 10000";

        var url = Config.sources[self.source].sparql_server.url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.source, caller: "getObjectRestrictions" }, function (err, result) {
          if (err) {
            return callback(err);
          }

          callback(null, result);
        });*/
  };


  self.getDBmodel = function(dataSourceConfig, callback) {
    const params = new URLSearchParams({
      name: dataSourceConfig.dbName,
      type: dataSourceConfig.type
    });
    $.ajax({
      type: "GET",
      url: Config.apiUrl + "/kg/model?" + params.toString(),
      dataType: "json",
      success: function(data, _textStatus, _jqXHR) {
        return callback(null, data);
      },
      error: function(err) {
        if (callback) {
          return callback(err);
        }
        alert(err.responseText);
      }
    });
  };

  self.getJoinSql = function(joinObj) {

    var sql = "SELECT top 10 * from ";
    sql += joinObj.fromTable + " ";

    if (joinObj.joinTable) {
      sql += " LEFT OUTER JOIN " + joinObj.joinTable + " ON " + joinObj.fromTable + "." + joinObj.fromColumn + "=" + joinObj.joinTable + "." + joinObj.joinFromColumn;
      sql += " LEFT OUTER JOIN " + joinObj.toTable + " ON " + joinObj.joinTable + "." + joinObj.joinFromColumn + "=" + joinObj.toTable + "." + joinObj.toColumn;
    }
    else {
      sql += " LEFT OUTER JOIN " + joinObj.toTable + " ON " + joinObj.fromTable + "." + joinObj.fromColumn + "=" + joinObj.toTable + "." + joinObj.toColumn;

    }
    return sql;
  };


  return self;


})();

export default VirtualKGquery;

window.VirtualKGquery = VirtualKGquery;