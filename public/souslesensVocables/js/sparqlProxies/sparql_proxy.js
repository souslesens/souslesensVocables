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
                        //  $("#messageDiv").html("found : " + data.results.bindings.length);
                        $("#waitImg").css("display", "none");
                        /*  if (data.results.bindings.length == 0)
                              return callback({data.results.bindings:},[])*/
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

        var body = {
            params: {query: query},
            headers: {
                "Accept": "application/sparql-results+json",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }


        $("#waitImg").css("display", "block");


        var payload = {
            httpProxy: 1,
            url: url,
            body: body,
            options: queryOptions


        }

        if (options.method && options.method == "GET")
            payload.GET = true;
        else
            payload.POST = true;

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
                $("#waitImg").css("display", "none");
                if (data.results.bindings.length == 0)
                    ;
                //    console.log(JSON.stringify(query))
                //  $("#messageDiv").html("found : " + data.results.bindings.length);

                /*  if (data.results.bindings.length == 0)
                      return callback({data.results.bindings:},[])*/
                callback(null, data)

            }
            , error: function (err) {
                if (err.responseText.indexOf("Virtuoso 42000") > -1) { //Virtuoso 42000 The estimated execution time
                    alert(err.responseText.substring(0, err.responseText.indexOf(".")) + "\n select more detailed data")
                } else
                    $("#messageDiv").html(err.responseText);

                $("#waitImg").css("display", "none");
                console.log(JSON.stringify(err))
                console.log(JSON.stringify(query))
                if (callback) {
                    return callback(err)
                }
                return (err);
            }

        });
    }


    return self;


})()
