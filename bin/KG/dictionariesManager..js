var SQLserverConnector = require("./SQLserverConnector.");
var ConfigManager = require("../configManager.");
var ElasticRestProxy = require("../elasticRestProxy.");
var async = require("async");
var util = require("../util.");
const request = require("request");
var DictionariesManager = {
  getOneModelSuperClasses: function(callback) {
    SQLserverConnector.getData(req.body.dataSource.dbName, req.body.sqlQuery, function(err, data) {
      if (err) {
        return callback(err.responseText);
      }
      callback(null, data);
    });
  },
  getReferenceDictionary: function(superClassId, sources, callback) {
    SQLserverConnector.getData(req.body.dataSource.dbName, req.body.sqlQuery, function(err, data) {
      if (err) {
        return callback(err.responseText);
      }

      var referenceDictionary = {};
      data.forEach(function(item, _index) {
        if (item.term) {
          if (!referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()]) {
            referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()] = {};
          }
          if (!referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()][item.source]) {
            referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()][item.source] = item;
          }
          // referenceDictionary[item.superClassUri].terms[item.term.toLowerCase()]=item
        }
        if (item.type != "REFERENCE" && item.type != "CANDIDATE") {
          referenceDictionary[item.superClassUri].noSubClasses = true;
        }
      });
      callback(referenceDictionary);
    });
  },

  listIndexes: function(callback) {
    ConfigManager.getGeneralConfig(function(err, config) {
      if (err) {
        return callback(err);
      }
      const elasticUrl = config.ElasticSearch.url;
      ElasticRestProxy.listIndexes(elasticUrl, function(err, indexes) {
        return callback(err, indexes);
      });
    });
  },

  indexSource: function(indexName, data, options, callback) {
    if (!options) {
      options = {};
    }
    var elasticUrl;
    var elasticVersion;
    async.series(
      [
        //prepare payload
        function(callbackSeries) {
          ConfigManager.getGeneralConfig(function(err, config) {
            if (err) {
              return callbackSeries(err);
            }
            elasticUrl = config.ElasticSearch.url;
            callbackSeries();
          });
        },

        //delete index
        function(callbackSeries) {
          if (!options.replaceIndex) {
            return callbackSeries();
          }
          ElasticRestProxy.deleteIndex(elasticUrl, indexName, function(err, _result) {
            callbackSeries(err);
          });
        },

        //set mappings
        function(callbackSeries) {
          if (!options.replaceIndex) {
            return callbackSeries();
          }

          var mappings = {
            settings: {
              analysis: {
                normalizer: {
                  lowercase_normalizer: {
                    type: "custom",
                    char_filter: [],
                    filter: ["lowercase", "asciifolding"]
                  }
                }
              }
            },
            mappings: {
              [indexName]: {
                properties: {
                  label: {
                    type: "text",
                    fielddata: true,
                    fields: {
                      keyword: {
                        type: "keyword",
                        ignore_above: 256,
                        normalizer: "lowercase_normalizer"
                      }
                    }
                  },
                  skoslabels: {
                    type: "text",
                    fields: {
                      keyword: {
                        type: "keyword",
                        ignore_above: 256
                      }
                    }
                  },

                  id: {
                    type: "text",
                    fielddata: true,
                    fields: {
                      keyword: {
                        type: "keyword",
                        ignore_above: 256
                      }
                    }
                  },
                  parents: {
                    type: "text",
                    fields: {
                      keyword: {
                        type: "keyword",
                        ignore_above: 256
                      }
                    }
                  },
                  owlType: {
                    type: "keyword"
                  }
                }
              }
            }
          };
          var requestOptions = {
            method: "PUT",
            json: mappings,
            encoding: null,
            timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
            headers: {
              "content-type": "application/json"
            },
            url: elasticUrl + indexName
          };
          ElasticRestProxy.sendAuthRequest(requestOptions, function(error, _response, _body) {
            //  request(requestOptions, function (error, _response, _body) {
            if (error) {
              return callbackSeries(error);
            }
            return callbackSeries();
          });
        },

        //check version
        function(callbackSeries) {
        if(elasticVersion)
          return callbackSeries()
          var requestOptions = {
            method: "GET",
            headers: {
              "content-type": "application/json"
            },
            url: elasticUrl
          };
          ElasticRestProxy.sendAuthRequest(requestOptions, function(error, _response, _body) {
            //  request(requestOptions, function (error, _response, _body) {
            if (error) {
              return callbackSeries(error);
            }
            var json=JSON.parse(_body)
            var versionStr = json.version.number;
            elasticVersion=parseInt(versionStr.split(".")[0])
            return callbackSeries();
          });
        },

        function(callbackSeries) {
          var bulkStr = "";

          data.forEach(function(item, _indexedLine) {
            if (options.owlType) {
              item.owlType = options.owlType;
            }
            var id = "R" + util.getRandomHexaId(10);
            if (elasticVersion < 8) {
              bulkStr += JSON.stringify({ index: { _index: indexName, _type: indexName, _id: id } }) + "\r\n";
            }
            else {
              bulkStr += JSON.stringify({ index: { _index: indexName, _id: id } }) + "\r\n";
            }

            bulkStr += JSON.stringify(item) + "\r\n";
          });

          const requestOptions = {
            method: "POST",
            body: bulkStr,
            encoding: null,
            timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
            headers: {
              "content-type": "application/json"
            },
            url: elasticUrl + "_bulk?refresh=wait_for"
          };
          ElasticRestProxy.sendAuthRequest(requestOptions, function(error, response, body) {
            // request(requestOptions, function (error, response, body) {
            if (error) {
              return callbackSeries(error);
            }
            ElasticRestProxy.checkBulkQueryResponse(body, function(err, _result) {
              if (err) {
                return callbackSeries(err);
              }
              callbackSeries();
            });
          });
        },
      ],

      function(err) {
        if (err) {
          return callback(err);
        }
        callback(null, "done");
      }
    );
  },
};

module.exports = DictionariesManager;
