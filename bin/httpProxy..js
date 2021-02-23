/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
const superagent = require('superagent');
var request = require("request")

var httpProxy = {

    get: function (url, options, callback) {
        if (!options.headers) {
            options.headers = {}
            /* options.headers={  "Accept": 'application/sparql-results+json',
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.106 Safari/537.36"}*/
        } else {
            var x = 3
        }
        var request = superagent.get(url)

        for (var key in options.headers) {
            request.set(key, options.headers[key])

        }
        request.end((err, res) => {
            if (err)
                return callback(err);
            if (res.text)
                return callback(null, res.text.trim());
            callback(null, res.body)
        })

    },

    post: function (url, headers, params, callback) {

        var options = {
            method: 'POST',


            url: url,
        };
        if (headers) {
            options.headers = headers;

            if (headers["content-type"] && headers["content-type"].indexOf("json") > -1)
                options.json = params;
            else
                options.form = params;
        } else {
            options.headers = {
                'content-type': 'application/x-www-form-urlencoded',
                'accept': 'application/json'
            };
            options.form = params;
        }

        request(options, function (error, response, body) {
            if (error) {
                console.log(JSON.stringify(params, null, 2))
                return callback(error);
            }



                if (typeof body == "string") {
                    body = body.trim()
                    if (body.indexOf("{") < 0)
                        return callback(body);//error
                    try {
                        var obj = JSON.parse(body);
                        return callback(null, obj)
                    } catch (e) {
                        callback(body)
                    }
                } else {
                    return callback(null, body)
                }


            return;
        })


        /*  const options = {
              url: 'https://api.github.com/repos/request/request',
              headers: {
                  'User-Agent': 'request'
              }
          };*/

        /*    request.post('http://vps475829.ovh.net:8890/sparql').form({query: query}).on('response', function (response) {

                console.log(response.statusCode) // 200
                console.log(response.headers['content-type']) // 'image/png'
            }).on('error', function (err) {
                console.error(err)
            })
            return;*/

        /*   superagent.post(url)
               .send(params) // sends a JSON post body
               .set("Content-Type", "application/x-www-form-urlencoded")
               .set('accept', 'json')
               .end((err, res) => {
                   if (err)
                       return callback(err);
                   callback(null, res.body)
               })*/

    }


}

module.exports = httpProxy

//httpProxy.get()

