/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import httpProxy from "../httpProxy.js";

import fs from "fs";
import async from "async";
var mediawikiStats = {
    sparqlUrl: "",

    generateCatWords: function (categoryWord, thesaurusWord, _callback) {
        mediawikiStats.getCatWordsTriples(categoryWord, thesaurusWord, function (err, bindings) {
            var Allconcepts = [];
            var catWordsMap = {};

            bindings.forEach(function (item) {
                var concept = item.subject.value.toLowerCase();
                var category = item.category.value.toLowerCase();
                category = category.substring(category.lastIndexOf("/") + 1);
                if (Allconcepts.indexOf(concept) < 0) Allconcepts.push(concept);
                if (!catWordsMap[category]) catWordsMap[category] = { concepts: {} };
                if (!catWordsMap[category].subjects[concept]) catWordsMap[category].subjects[concept] = 0;
                catWordsMap[category].subjects[concept] += 1;
            });

            /*  var str = "titre\tx\n"
            for (var category in catWordsMap) {
                str += category + "\t";
                catWordsMap[category].occurences.forEach(function (occurence, index) {
                    if (index > 0)
                        str += ","
                    str += occurence
                })
                str += "\n"
            }
            fs.writeFileSync("D:\\Total\\2020\\Stephanie\\catWordsMatrix.csv", str)
*/
        });
    },
    generateCatWordsMatrix: function (categoryWord, thesaurusWord, _callback) {
        mediawikiStats.getCatWordsTriples(categoryWord, thesaurusWord, function (err, bindings) {
            var Allconcepts = [];
            var catWordsMap = {};

            bindings.forEach(function (item) {
                var concept = item.subject.value.toLowerCase();
                var category = item.category.value.toLowerCase();
                category = category.substring(category.lastIndexOf("/") + 1);
                if (Allconcepts.indexOf(concept) < 0) Allconcepts.push(concept);
                if (!catWordsMap[category]) catWordsMap[category] = { concepts: [], occurences: [] };
                catWordsMap[category].subjects.push(concept);
            });

            Allconcepts.forEach(function (concept) {
                for (var category in catWordsMap) {
                    if (catWordsMap[category].subjects.indexOf(concept) > -1) {
                        catWordsMap[category].occurences.push(1);
                    } else catWordsMap[category].occurences.push(0);
                }
            });

            var str = "titre\tx\n";
            for (var category in catWordsMap) {
                str += category + "\t";
                catWordsMap[category].occurences.forEach(function (occurence, index) {
                    if (index > 0) str += ",";
                    str += occurence;
                });
                str += "\n";
            }
            fs.writeFileSync("D:\\Total\\2020\\Stephanie\\catWordsMatrix.csv", str);
        });
    },
    getCatWordsTriples: function (categoryWord, thesaurusWord, callback) {
        var limit = 1000;
        var offset = 0;
        var length = 1;

        var allBindings = [];

        var filter = "";
        var catFilter = "";
        var thesaurusFilter = "";
        if (categoryWord) catFilter = ' regex(str(?category),"' + categoryWord + '","i")';

        if (thesaurusWord) thesaurusFilter = ' regex(str(?a),"' + thesaurusWord + '","i")';

        if (thesaurusWord && categoryWord) filter = "filter (" + catFilter + " && " + thesaurusFilter + ")";
        else if (categoryWord) filter = "filter (" + catFilter + ")";
        else if (thesaurusWord) filter = "filter (" + thesaurusFilter + ")";

        var query =
            "prefix skos: <http://www.w3.org/2004/02/skos/core#>" +
            "select ?subject ?category   where { GRAPH ?g {" +
            "    ?a <http://souslesens.org/vocab#wikimedia-category> ?category. " +
            filter +
            " ?a skos:prefLabel ?subject filter(lang(?subject)='en')" +
            "?a skos:broader ?broader. ?broader skos:prefLabel ?broaderLabel. filter(lang(?broaderLabel)='en')" +
            " " +
            "" +
            "}} order by ?subject limit " +
            limit;

        async.whilst(
            function (callbackTest) {
                //test
                return callbackTest(null, length > 0 && offset < 10000);
            },
            function iter(callbackWhilst) {
                var params = { query: query + " offset " + offset };
                offset += limit;

                httpProxy.post(mediawikiStats.sparqlUrl, null, params, function (err, result) {
                    if (err) {
                        console.log(params.query);
                        return callback(err);
                    }
                    length = result.results.bindings.length;

                    allBindings = allBindings.concat(result.results.bindings);
                    console.log(offset + "    " + allBindings.length);
                    callbackWhilst();
                });
            },
            function (err, _n) {
                if (err) return callback(err);
                return callback(null, allBindings);
            },
        );
    },
};

export default mediawikiStats;
/*
if (false) {
    //mediawikiStats.generateCatWordsMatrix("aapg", "gemet", function (err, result) {
    mediawikiStats.generateCatWordsMatrix("aapg", null, function (err, _result) {
        if (err) console.log(err);
        console.log("Done ");
    });
}
*/
//mediawikiStats.generateCatWordsMatrix("aapg", "gemet", function (err, result) {
mediawikiStats.generateCatWords("aapg", null, function (err, _result) {
    if (err) console.log(err);
    console.log("Done ");
});
//mediawikiStats.createMediawikiIndex(elasticUri,"mediawiki");
