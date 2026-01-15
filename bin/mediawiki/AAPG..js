/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import fs from 'fs';

//var httpProxy = require("../../httpProxy.");
import async from 'async';

var AAPG = {
    getLinks: function () {
        var path = "D:\\Total\\2020\\Stephanie\\AAPG-Pages.txt";

        var data = "" + fs.readFileSync(path);
        var pages = data.split("\n");
        var pageIndex = 0;

        var links = {};
        async.eachSeries(
            pages,
            function (page, callbackEach) {
                page = encodeURIComponent(page);
                if (!links[page]) links[page] = [];

                var url = "https://wiki.aapg.org/index.php?title=Special%3AWhatLinksHere&format=json&target=" + page;

                setTimeout(function () {
                    httpProxy.get(url, {}, function (err, result) {
                        if (err) return callbackEach(err);
                        var text = result;
                        console.log(page);
                        var regex = /<li><a href="\/([^".]*)" title/g;

                        let array;

                        while ((array = regex.exec(text)) !== null) {
                            links[page].push(array[1]);
                        }
                        if (pageIndex++ % 20 == 0) fs.writeFileSync("D:\\Total\\2020\\Stephanie\\AAPG-links.json", JSON.stringify(links));

                        callbackEach();
                    });
                }, 10);
            },
            function (err) {
                if (err) return console.log(err);

                fs.writeFileSync("D:\\Total\\2020\\Stephanie\\AAPG-links.json", JSON.stringify(links));
            },
        );
    },

    linksToRdf: function () {
        var json = JSON.parse("" + fs.readFileSync("D:\\Total\\2020\\Stephanie\\AAPG-links.json"));
        var rdf = "";
        for (var key in json) {
            json[key].forEach(function (item) {
                key = key.replace(/%20/g, "_");
                rdf += "<https://wiki.aapg.org/" + key + "> <http://www.w3.org/2000/01/rdf-schema#seeAlso> " + "<https://wiki.aapg.org/" + item + ">.\n";
            });
        }

        fs.writeFileSync("D:\\Total\\2020\\Stephanie\\AAPG-rdf.ttl", rdf);
    },
};

module.exports = AAPG;

//AAPG.getLinks()
//AAPG.linksToRdf();

if (false) {
    var str = fs.readFileSync("D:\\NLP\\ontologies\\sourcesProd_11_01_2023.json");
    var data = JSON.parse("" + str);
    var sources = Object.keys(data);
    console.log(sources);
}
