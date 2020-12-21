var Sparql_proxy = (function () {
    var self = {};

    self.querySPARQL_GET_proxy_cursor = function (url, query, queryOptions, options, callback) {
        var offset = 0;
        var limit = 5000;
        var resultSize = 1;
        var allData = {
            results: {bindings: []}
        }

        var p = query.toLowerCase().indexOf("limit")
        if (p > -1)
            var query = query.substring(0, p)
        query += " LIMIT " + limit;


        async.whilst(
            function (callbackTest) {//test
                return resultSize > 0;
            },
            function (callbackWhilst) {//iterate

                var queryCursor = query + " OFFSET " + offset


                var body = {
                    params: {query: queryCursor},
                    headers: {
                        "Accept": "application/sparql-results+json",
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }


                $("#waitImg").css("display", "block");


                //   url="http://vps475829.ovh.net:8890/sparql"
                var payload = {
                    httpProxy: 1,
                    url: url,
                    body: body,
                    POST: true,

                }
                $.ajax({
                    type: "POST",
                    url: Config.serverUrl,
                    data: payload,
                    dataType: "json",
                    /* beforeSend: function(request) {
                         request.setRequestHeader('Age', '10000');
                     },*/

                    success: function (data, textStatus, jqXHR) {
                        var xx = data;

                        callbackWhilst(null, data);
                        resultSize = data.results.bindings.length
                        allData.results.bindings = allData.results.bindings.concat(data.results.bindings);
                        offset += limit;

                    }
                    , error: function (err) {
                        $("#messageDiv").html(err.responseText);

                        $("#waitImg").css("display", "none");
                        console.log(JSON.stringify(err))
                        console.log(JSON.stringify(query))
                        return callbackWhilst(err)

                    }

                });

            }, function (err) {
                callback(err, allData)

            })
    }


    self.querySPARQL_GET_proxy = function (url, query, queryOptions, options, callback) {
        if (!options)
            options = {}


        $("#waitImg").css("display", "block");


        var payload = {
            httpProxy: 1,
            options: queryOptions
        }

        var sourceParams
        if( options.source)
            sourceParams=Config.sources[options.source];
            else
            sourceParams=Config.sources[MainController.currentSource];



        if (sourceParams.sparql_server.method && sourceParams.sparql_server.method == "GET") {
            payload.GET = true;
            var query2 = encodeURIComponent(query);
            query2 = query2.replace(/%2B/g, "+").trim()
            payload.url = url + query2
            if(sourceParams.sparql_server.headers){
                payload.options=JSON.stringify({headers:sourceParams.sparql_server.headers})
            }
        } else {
            payload.POST = true;
            var headers={}
            if(sourceParams.sparql_server.headers){
                body=JSON.stringify({headers:sourceParams.server.headers})
            }
            headers["Accept"]= "application/sparql-results+json";
            headers["Content-Type"]="application/x-www-form-urlencoded"
            var body = {
                params: {query: query},
                headers: headers,
            }

            payload.body = JSON.stringify(body);
            payload.url = url
        }

        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            /* beforeSend: function(request) {
                 request.setRequestHeader('Age', '10000');
             },*/

            success: function (data, textStatus, jqXHR) {



                if (data.result && typeof data.result != "object")
                    data = JSON.parse(data.result.trim())

                if (!data.results)
                    return callback(null, {results:{bindings:[]}});





                callback(null, data)

            }
            , error: function (err) {
                if (err.responseText.indexOf("Virtuoso 42000") > -1) { //Virtuoso 42000 The estimated execution time
                    alert(err.responseText.substring(0, err.responseText.indexOf(".")) + "\n select more detailed data")
                } else
                   MainController.UI.message(err.responseText);

                $("#waitImg").css("display", "none");
                console.log(JSON.stringify(err))
                console.log(JSON.stringify(query))
                MainController.UI.message(err.responseText);
                if (callback) {
                    return callback(err)
                }
                return (err);
            }

        });
    }


    return self;


})()
