const async = require("async");
const sqlServerProxy = require("../KG/SQLserverConnector.");
const util = require("../util.");
const KGbuilder_socket = require("./KGbuilder_socket");
const KGbuilder_triplesWriter = require("./KGbuilder_triplesWriter");
var csvCrawler = require("../_csvCrawler.");
const dataController = require("../dataController.");
const path = require("path");
var KGbuilder_triplesMaker = {
  mappingFilePredicate: "http://souslesens.org/KGcreator#mappingFile",
  /**
   * Generate triples
   *
   * @param mappings - ?
   * @param {string} graphUri - URI of the graph to generate
   * @param {string} sparqlServerUrl - URL of the sparql endpoint
   * @param {Object} options - {sampleSize: , }
   * @param {Function} callback - Node-style async Function called to proccess result or handle error
   **/
  createTriples: function(tableMappings, data, options, callback) {
    if (!tableMappings || tableMappings.length == 0) {
      KGbuilder_socket.message(options.clientSocketId, "No mappings  in table " + tableMappings.table);
      return callback();

    }
    if (!data || data.length == 0) {
      KGbuilder_socket.message(options.clientSocketId, "No data  in table " + tableMappings.table);
      return callback();

    }


    //  var graphUri = "https://www.jip36-cfihos.org/ontology/cfihos_1_5/test/"
    var totalTriples = 0;
    var errors = "";

    existingNodes = {};
    var totalTriplesCount = 0;
    var totalTriples = 0;
    var missingLookups_s = 0;
    var missingLookups_o = 0;
    var okLookups_o = 0;
    var okLookups_s = 0;
    var lookUpsMap = {};
    var triples = [];
    var tableData = [];
    var dataSource = tableMappings.table;

    var graphUri = tableMappings.graphUri;

    KGbuilder_triplesMaker.allColumns = {};

    async.eachSeries(
      data,
      function(line, callbackEachLine) {
        //   lines.forEach(function (line, _indexLine) {
        //clean line content

        var subjectStr = null;
        var objectStr = null;
        var propertyStr = null;
        var lineError = "";
        KGbuilder_triplesMaker.blankNodesMap = {};

        for (var key in line) {
          if (line[key]) {
            if (!KGbuilder_triplesMaker.allColumns[key]) {
              KGbuilder_triplesMaker.allColumns[key] = 1;
            }
            line[key] = "" + line[key];
            if (line[key] && !KGbuilder_triplesMaker.isUri(line[key])) {
              line[key] = util.formatStringForTriple(line[key]);
            }
          }
        }

        async.eachSeries(
          tableMappings.tripleModels,
          function(mapping, callbackEachMapping) {
            //tableMappings.tripleModels.forEach(function(mapping) {

            if (line[mapping.s] == "null") {
              line[mapping.s] = null;
            }
            if (line[mapping.o] == "null") {
              line[mapping.o] = null;
            }

            if (mapping["if_column_value_not_null"]) {
              var value = line[mapping["if_column_value_not_null"]];
              if (!value || value == "null") {
                return callbackEachMapping();
              }
            }

            if (mapping.p == "http://rds.posccaesar.org/ontology/lis14/rdl/before") {
              var x = 3;
            }
            async.series(
              [
                function(callbackSeries) {
                  KGbuilder_triplesMaker.getTripleSubject(tableMappings, mapping, line, function(err, result) {
                    if (err) {
                      return callbackSeries(err);
                    }
                    subjectStr = result;
                    return callbackSeries();
                  });
                },
                function(callbackSeries) {
                  KGbuilder_triplesMaker.getTriplePredicate(mapping, line, function(err, result) {
                    if (err) {
                      return callbackSeries(err);
                    }
                    propertyStr = result;
                    return callbackSeries();
                  });
                },
                function(callbackSeries) {
                  KGbuilder_triplesMaker.getTripleObject(tableMappings, mapping, line, function(err, result) {
                    if (err) {
                      return callbackSeries(err);
                    }

                    objectStr = result;
                    return callbackSeries();
                  });
                },

                function(callbackSeries) {
                  if (mapping.isRestriction) {
                    KGbuilder_triplesMaker.getRestrictionTriples(mapping, subjectStr, propertyStr, objectStr, function(err, restrictionTriples) {
                      if (err) {
                        return callbackSeries(err);
                      }
                      triples = triples.concat(restrictionTriples);
                      return callbackSeries();
                    });
                  }
                  else {
                    if (subjectStr && propertyStr && objectStr) {
                      if (!existingNodes[subjectStr + "_" + propertyStr + "_" + objectStr]) {
                        existingNodes[subjectStr + "_" + propertyStr + "_" + objectStr] = 1;
                        triples.push({
                          s: subjectStr,
                          p: propertyStr,
                          o: objectStr
                        });
                      }
                    } /* else{
                    console.log( "missing " +subjectStr +" "+ propertyStr +" "+  objectStr)
                  }*/
                    return callbackSeries();
                  }
                }
              ],
              function(err) {
                callbackEachMapping(err);
              }
            );
          },
          function(err) {
            callbackEachLine(err);
          }
        );
      },
      function(err) {
        callback(err, triples);
      }
    );
  },

  getTripleSubject: function(tableMappings, mapping, line, callback) {
    //get value for Subject
    var subjectStr = null;
    if (mapping.subjectIsSpecificUri) {
      subjectStr = mapping.s;
    }
    else if (typeof mapping.s === "function") {
      try {
        subjectStr = mapping.s(line, mapping);
      } catch (e) {
        return callback(e);
      }
    }
    else if (mapping.s === "_rowIndex") {
      subjectStr = KGbuilder_triplesMaker.getBlankNodeId("_rowIndex");
    }
    else if (mapping.s.indexOf("$_") == 0 || mapping.isSubjectBlankNode) {
      // virtual column
      if (typeof mapping.o === "string" && (mapping.o.indexOf("$_") != 0 && !mapping.isObjectBlankNode) && KGbuilder_triplesMaker.allColumns[mapping.o] && !line[mapping.o]) {
        // ne pas creer des triplest sans objet
        return callback(null, null);
      }
      subjectStr = KGbuilder_triplesMaker.getBlankNodeId(mapping.s);
    }
    else if (tableMappings.transform && line[mapping.s] && tableMappings.transform[mapping.s]) {
      try {
        subjectStr = tableMappings.transform[mapping.s](line[mapping.s], "s", mapping.p, line, mapping);
      } catch (e) {
        return callback((lineError = e + " " + mapping.s));
      }
    }
    if (mapping.s.indexOf("http") == 0) {
      subjectStr = "<" + mapping.s + ">";
    }
    else if (mapping.s.match(/.+:.+/)) {
      subjectStr = mapping.s;
    }

    else {
      if (!line[mapping.s] || line[mapping.o] == "null") {
        return callback(null, null);
      }
      subjectStr = line[mapping.s];
    }
    if (mapping.lookup_s) {
      if (!lookUpsMap[mapping.lookup_s]) {
        KGbuilder_socket.message((lineError = "no lookup named " + mapping.lookup_s));
      }
      var lookupValue = KGbuilder_triplesMaker.getLookupValue(mapping.lookup_s, subjectStr);
      if (!lookupValue) {
        missingLookups_s += 1;
      }
      else {
        subjectStr = lookupValue;
        okLookups_s += 1;
      }
    }

    if (!subjectStr) {
      return callback("no mapping.subject in line " + JSON.stringify(line));
    }

    //format subject
    {
      subjectStr = subjectStr.trim();
      if (subjectStr.indexOf && subjectStr.indexOf("http") == 0) {
        subjectStr = "<" + subjectStr + ">";
      }
      else if (subjectStr.indexOf && subjectStr.indexOf(":") > -1) {
        //pass
      }
      else {
        subjectStr = "<" + tableMappings.graphUri + util.formatStringForTriple(subjectStr, true) + ">";
      }
    }
    return callback(null, subjectStr);
  },


  getTripleObject: function(tableMappings, mapping, line, callback) {
    var objectStr = null;

    if (mapping.o == "$_offshorewlmanhour") {
      var x = 3;
    }
    //get value for Object
    {
      if (mapping.o === "_rowIndex") {
        objectStr = KGbuilder_triplesMaker.getBlankNodeId("_rowIndex");
      }
      else if (mapping.objectIsSpecificUri) {
        objectStr = mapping.o;
      }
      else if (typeof mapping.o === "function") {
        try {
          objectStr = mapping.o(line, mapping);
          objectStr = util.formatStringForTriple(objectStr, false);
        } catch (e) {
          return callback(e);
        }
      }
      else if (mapping.o.indexOf("http") == 0) {
        objectStr = "<" + mapping.o + ">";
      }
      else if (mapping.o.match(/.+:.+/)) {
        objectStr = mapping.o;
      }
      else if (mapping.o.indexOf("$_") == 0 || mapping.isObjectBlankNode) {
        objectStr = KGbuilder_triplesMaker.getBlankNodeId(mapping.o);
      }
      else {
        if (!line[mapping.o] || line[mapping.o] == "null") {
          return callback(null, null);
        }
        else if (mapping.dataType) {
          var str = line[mapping.o];
          if (!str || str == "null") {
            return;
          }
          if (mapping.dataType == "xsd:dateTime") {
            var isDate = function(date) {
              return new Date(date) !== "Invalid Date" && !isNaN(new Date(date)) ? true : false;
            };

            var formatDate = function(date) {
              return new Date(date).toISOString(); //.slice(0, 10);
            };

            if (!isDate(str)) {
              var date = util.convertFrDateStr2Date(str);
              if (!date) {
                return;
              }
              else {
                str = date.toISOString();
              }
            }
            else {
              str = formatDate(str);
            }
          }

          mapping.p = "owl:hasValue";

          objectStr = "'" + str + "'^^" + mapping.dataType;
        }
        else if (tableMappings.transform && line[mapping.o] && tableMappings.transform[mapping.o]) {
          try {
            objectStr = tableMappings.transform[mapping.o](line[mapping.o], "o", mapping.p, line, mapping);
          } catch (e) {
            return (lineError = e + " " + mapping.o);
          }
        }
        else {
          objectStr = line[mapping.o];
        }

        if (mapping.lookup_o) {
          if (!lookUpsMap[mapping.lookup_o]) {
            return (lineError = "no lookup named " + mapping.lookup_o);
          }
          var lookupValue = KGbuilder_triplesMaker.getLookupValue(mapping.lookup_o, objectStr);
          if (!lookupValue) {
            missingLookups_o += 1;
          }
          else {
            okLookups_o += 1;
            objectStr = lookupValue;
          }
        }
      }
    }
    if (!objectStr || objectStr == "null") {
      return callback(null, null);
    }

    //format object
    {
      objectStr = objectStr.trim();
      if (objectStr.indexOf && objectStr.indexOf("http") == 0) {
        objectStr = "<" + objectStr + ">";
      }
      else if (mapping.datatype) {
        //pass
      }
      else if (objectStr.indexOf && objectStr.indexOf(":") > -1 && objectStr.indexOf(" ") < 0) {
        // pass
      }
      else if (mapping.isString) {
        objectStr = "'" + util.formatStringForTriple(objectStr, false) + "'";
      }
      else if (objectStr.indexOf("xsd:") > -1) {
        //pass
      }
      else {
        /* if(!mapping.isString)
objectStr=objectStr.replace(/[\-_]/g,"")*/
        objectStr = "<" + tableMappings.graphUri + util.formatStringForTriple(objectStr, true) + ">";
      }
    }

    return callback(null, objectStr);
  },
  getTriplePredicate: function(mapping, line, callback) {
    var propertyStr = mapping.p;
    if (typeof mapping.p === "function") {
      try {
        propertyStr = mapping.p(line, mapping);
      } catch (e) {
        KGbuilder_socket.message("function error " + e + "line" + line);
        return null;
      }
    }

    if (!propertyStr) {
      return;
    }
    if (propertyStr.indexOf("http") == 0) {
      propertyStr = "<" + propertyStr + ">";
    }
    return callback(null, propertyStr);
  },
  getRestrictionTriples: function(mapping, subjectStr, propertyStr, ObjectStr, callback) {
    var restrictionTriples = [];
    var blankNode = "<_:b" + util.getRandomHexaId(10) + ">";

    if (!KGbuilder_triplesMaker.existingNodes[subjectStr + "_" + prop + "_" + objectStr]) {
      KGbuilder_triplesWriter.existingNodes[subjectStr + "_" + prop + "_" + objectStr] = 1;
      restrictionTriples.push({
        s: blankNode,
        p: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
        o: "<http://www.w3.org/2002/07/owl#Restriction>"
      });
      restrictionTriples.push({
        s: blankNode,
        p: "<http://www.w3.org/2002/07/owl#onProperty>",
        o: propertyStr
      });
      if (objectStr) {
        restrictionTriples.push({
          s: blankNode,
          p: "<http://www.w3.org/2002/07/owl#someValuesFrom>",
          o: objectStr
        });
      }
      restrictionTriples.push({
        s: subjectStr,
        p: "rdfs:subClassOf",
        o: blankNode
      });
    }
    return callback(null, restrictionTriples);
  },
  loadLookups: function(tableMappings, callback) {
    var lookUpsMap = {};
    async.eachSeries(
      tableMappings.lookups,
      function(lookup, callbackEachLookup) {
        if (tableMappings.csvDataFilePath) {
          var lookupFilePath = lookup.filePath;

          KGbuilder_triplesMaker.readCsv(lookupFilePath, null, function(err, result) {
            if (err) {
              return callbackEachLookup(err);
            }
            var lookupLines = result.data[0];
            lookUpsMap[lookup.name] = { dictionary: {}, transformFn: lookup.transformFn };
            lookupLines.forEach(function(line, index) {
              if (![line[lookup.sourceColumn]] && line[lookup.targetColumn]) {
                return KGbuilder_socket.message(options.clientSocketId, "missing lookup line" + index + " " + lookupFilePath, true);
              }
              lookUpsMap[lookup.name].dictionary[line[lookup.sourceColumn]] = line[lookup.targetColumn];
            });

            callbackEachLookup();
          });
        }
        else if (tableMappings.databaseSource) {
          var sqlQuery = "select distinct " + lookup.sourceColumn + "," + lookup.targetColumn + " from " + lookup.table;

          sqlServerProxy.getData(tableMappings.databaseSource.dbName, sqlQuery, function(err, result) {
            if (err) {
              return callbackEachLookup(err);
            }
            var lookupLines = result;
            lookUpsMap[lookup.name] = { dictionary: {}, transformFn: lookup.transformFn };
            lookupLines.forEach(function(line, index) {
              if (![line[lookup.sourceColumn]] && line[lookup.targetColumn]) {
                return KGbuilder_socket.message(options.clientSocketId, "missing lookup line" + index + " " + lookupFilePath, true);
              }

              lookUpsMap[lookup.name].dictionary[line[lookup.sourceColumn]] = line[lookup.targetColumn];
            });

            callbackEachLookup();
          });
        }
      },
      function(err) {
        callback(err, lookupsMap);
      }
    );
  },
  getMetaDataTriples: function(subjectUri, options) {
    var creator = "KGcreator";
    var dateTime = "'" + util.dateToRDFString(new Date(), true) + "'^^xsd:dateTime";

    if (!options) {
      options = {};
    }
    var metaDataTriples = [];

    metaDataTriples.push({
      s: subjectUri,
      p: "<http://purl.org/dc/terms/created>",
      o: dateTime
    });
    metaDataTriples.push({
      s: subjectUri,
      p: "<" + KGbuilder_triplesMaker.mappingFilePredicate + ">",
      o: "'" + options.mappingTable + "'"
    });

    if (options.customMetaData) {
      for (var predicate in options.customMetaData) {
        metaDataTriples.push({
          s: subjectUri,
          p: "<" + predicate + ">",
          o: options.customMetaData[predicate]
        });
      }
    }

    return metaDataTriples;
  },
  isUri: function(str) {
    if (!str) {
      return false;
    }
    var prefixesArray = Object.keys(KGbuilder_triplesWriter.sparqlPrefixes);
    var array = str.split(":");
    if (array.length == 0) {
      return false;
    }
    else {
      if (prefixesArray.indexOf(array[0]) > -1 || array[0].indexOf("http") == 0) {
        return true;
      }
      return false;
    }
  },
  readCsv: function(filePath, maxLines, callback) {
    csvCrawler.readCsv({ filePath: filePath }, maxLines, function(err, result) {
      if (err) {
        return callback(err);
      }
      var data = result.data;
      var headers = result.headers;

      return callback(null, { headers: headers, data: data });
    });
  },
  getBlankNodeId: function(key) {
    var value = KGbuilder_triplesMaker.blankNodesMap[key];
    if (value) {
      return value;
    }
    else {
      value = "<_:b" + util.getRandomHexaId(10) + ">";
      KGbuilder_triplesMaker.blankNodesMap[key] = value;
      return value;
    }
  },
  getLookupValue: function(lookupName, value, callback) {
    var lookupArray = lookupName.split("|");
    var target = null;
    lookupArray.forEach(function(lookup, index) {
      if (index > 0) {
        var x = 3;
      }
      if (target) {
        return;
      }
      target = lookUpsMap[lookup].dictionary[value];
      if (target && lookUpsMap[lookup].transformFn) {
        try {
          target = lookUpsMap[lookup].transformFn(target);
        } catch (e) {
          return callback(e);
        }
      }
    });
    if (target == null) {
      var x = 3;
    }
    return target;
  },
  loadData: function(tableMappings, options, callback) {
    var tableData = [];
    if (tableMappings.csvDataFilePath) {
      KGbuilder_socket.message(options.clientSocketId, "loading data from csv file " + tableMappings.table, false);
      KGbuilder_triplesMaker.readCsv(tableMappings.csvDataFilePath, options.sampleSize, function(err, result) {
        if (err) {
          KGbuilder_socket.message(options.clientSocketId, err, true);
          return callback(err);
        }
        KGbuilder_socket.message(options.clientSocketId, " data loaded from " + tableMappings.table, false);
        tableData = result.data[0];
        callback(null, tableData);
      });
    }
    else if (tableMappings.datasourceConfig) {
      var limitStr = "";
      if (options.sampleSize) {
        limitStr = " TOP (" + options.sampleSize + ") ";
      }
      var sqlQuery = "select" + limitStr + " * from " + tableMappings.table;
      KGbuilder_socket.message(options.clientSocketId, "loading data from sql server, table " + tableMappings.table, false);
      sqlServerProxy.getData(tableMappings.datasourceConfig.dbName, sqlQuery, function(err, result) {
        if (err) {
          return callback(err);
        }
        tableData = result;
        KGbuilder_socket.message(options.clientSocketId, " data loaded ,table " + tableMappings.table, false);
        return callback(null, tableData);
      });
    }
  }
};
module.exports = KGbuilder_triplesMaker;
