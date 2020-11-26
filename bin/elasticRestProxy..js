const request = require('request');


const elasticUrl = "http://localhost:9200/";
const debug = true;
var elasticRestProxy = {
    elasticUrl: elasticUrl,

    executePostQuery: function (url, query, callback) {

        if (url.toLowerCase().trim().indexOf("http") < 0)
            url = elasticUrl + url;
        var options = {
            method: 'POST',
            json: query,
            headers: {
                'content-type': 'application/json'
            },
            url: url
        };
        if (false && debug)
            console.log(JSON.stringify(query, null, 2));
        request(options, function (error, response, body) {
            if (error)
                return callback(error);

            if (url.indexOf("_bulk") > -1) {
                checkBulkQueryResponse.checkBulkQueryResponse(body, function (err, result) {
                    if (err)
                        return callback(err);
                    var message = "indexed " + result.length + " records ";
                    if (socket)
                        socket.message(message)
                    return callback(null, result)

                })
            } else {
                callback(null, body)
            }
        })

    },
    executeMsearch: function (ndjson, callback) {
        var options = {
            method: 'POST',
            body: ndjson,
            encoding: null,
            headers: {
                'content-type': 'application/json'
            },
            url: baseUrl + "/_msearch"
        };

        console.log(ndjson)
        request(options, function (error, response, body) {
            if (error)
                return callback(error);
            if (body.error && body.error.reason)
                return callback(body.error.reason)
            var json = JSON.parse(response.body);
            var responses = json.responses;
            var totalDocsAnnotated = 0
            /*  responses.forEach(function (response, responseIndex) {

                  var hits = response.hits.hits;
                  hits.forEach(function (hit) {

                  })
              })*/
            return callback(null, responses)

        });

    },


    checkBulkQueryResponse: function (responseBody, callback) {
        var body;
        //  if (typeof responseBody != "object")
        if (Buffer.isBuffer(responseBody))
            try {

        body = JSON.parse(responseBody.toString());
    }
    catch(e){
        return callback(e+" : "+responseBody.toString())

    }
        else
            body = responseBody;
        var errors = [];
        if (body.error) {
            if (body.error.reason)
                return callback(body.error.reason)
            return callback(body.error)
        }

        if (!body.items)
            return callback(null, "done");
        body.items.forEach(function (item) {
            if (item.index && item.index.error)
                errors.push(item.index.error);
            else if (item.update && item.update.error)
                errors.push(item.update.error);
            else if (item.delete && item.delete.error)
                errors.push(item.delete.error);
        })

        if (errors.length > 0) {
            errors = errors.slice(0, 20);
            return callback(errors);
        }
        return callback(null, body.items.length);
    },
    refreshIndex: function (config, callback) {

        var options = {
            method: 'GET',
            encoding: null,
            timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
            headers: {
                'content-type': 'application/json'
            },
            url: config.indexation.elasticUrl + config.general.indexName + "/_refresh"
        };

        request(options, function (error, response, body) {
            if (error) {
                return callback(error)
            }
            return callback();
        })
    },

    analyzeSentence:function(sentence, callback){
        var json={
            "analyzer" : "stop",
            "text" : sentence
        }
        var options = {
            method: 'POST',
            encoding: null,
            headers: {
                'content-type': 'application/json'
            },
            json:json,
            url: elasticUrl + "_analyze"
        };

        request(options, function (error, response, body) {
            if (error) {
                return callback(error)
            }
            return callback(null,body);
        })



    }


}

module.exports = elasticRestProxy;
