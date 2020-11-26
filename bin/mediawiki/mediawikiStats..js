var httpProxy = require('../../httpProxy.')
var elasticRestProxy = require('../../elasticRestProxy.')
//var superagent = require('superagent')
var request = require('request');
var fs = require('fs')
var async = require('async')
var thesauriiConcepts = {};
var mediawikiStats = {
    sparqlUrl: "http://51.178.139.80:8890/sparql/",


    generateCatWords: function (categoryWord, thesaurusWord, callback) {

        mediawikiStats.getCatWordsTriples(categoryWord, thesaurusWord, function (err, bindings) {
            var Allconcepts = [];
            var catWordsMap = {};

            bindings.forEach(function (item) {
                var concept = item.concept.value.toLowerCase();
                var category = item.category.value.toLowerCase();
                category = category.substring(category.lastIndexOf("/") + 1)
                if (Allconcepts.indexOf(concept) < 0)
                    Allconcepts.push(concept)
                if (!catWordsMap[category])
                    catWordsMap[category] = {concepts: {}};
                if(!catWordsMap[category].concepts[concept])
                    catWordsMap[category].concepts[concept]=0
                catWordsMap[category].concepts[concept]+=1

            })


              var xx=catWordsMap


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
        })


    },
    generateCatWordsMatrix: function (categoryWord, thesaurusWord, callback) {
        mediawikiStats.getCatWordsTriples(categoryWord, thesaurusWord, function (err, bindings) {
            var Allconcepts = [];
            var catWordsMap = {};

            bindings.forEach(function (item) {
                var concept = item.concept.value.toLowerCase();
                var category = item.category.value.toLowerCase();
                category = category.substring(category.lastIndexOf("/") + 1)
                if (Allconcepts.indexOf(concept) < 0)
                    Allconcepts.push(concept)
                if (!catWordsMap[category])
                    catWordsMap[category] = {concepts: [], occurences: []};
                catWordsMap[category].concepts.push(concept);
            })

            Allconcepts.forEach(function (concept) {
                for (var category in catWordsMap) {
                    if (catWordsMap[category].concepts.indexOf(concept) > -1) {
                        catWordsMap[category].occurences.push(1)
                    } else
                        catWordsMap[category].occurences.push(0)
                }


            })

            var str = "titre\tx\n"
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

        })


    }
    ,

    getCatWordsTriples: function (categoryWord, thesaurusWord, callback) {

        var limit = 1000;
        var offset = 0;
        var length = 1;


        var allBindings = []

        var filter = ""
        var catFilter = ""
        var thesaurusFilter = ""
        if (categoryWord)
            catFilter = " regex(str(?category),\"" + categoryWord + "\",\"i\")"

        if (thesaurusWord)
            thesaurusFilter = " regex(str(?a),\"" + thesaurusWord + "\",\"i\")"

        if (thesaurusWord && categoryWord)
            filter = "filter (" + catFilter + " && " + thesaurusFilter + ")"
        else if (categoryWord)
            filter = "filter (" + catFilter + ")"
        else if (thesaurusWord)
            filter = "filter (" + thesaurusFilter + ")"

        var query = "prefix skos: <http://www.w3.org/2004/02/skos/core#>" +
            "select ?concept ?category   where { GRAPH ?g {" +
            "    ?a <http://souslesens.org/vocab#wikimedia-category> ?category. " + filter + " ?a skos:prefLabel ?concept filter(lang(?concept)='en')" +
            "?a skos:broader ?broader. ?broader skos:prefLabel ?broaderLabel. filter(lang(?broaderLabel)='en')" +
            " " +
            "" +
            "}} order by ?concept limit " + limit;

        async.whilst(
            function (callbackTest) {//test
                return callbackTest(null, (length > 0 && offset < 10000));
            },
            function iter(callbackWhilst) {
                var params = {query: (query + " offset " + offset)}
                offset += limit;

                httpProxy.post(mediawikiStats.sparqlUrl, null, params, function (err, result) {
                    if (err) {
                        console.log(params.query)
                        return callback(err);
                    }
                    length = result.results.bindings.length

                    allBindings = allBindings.concat(result.results.bindings)
                    console.log(offset + "    " + allBindings.length)
                    callbackWhilst()
                })


            },
            function (err, n) {
                if (err)
                    return callback(err);
                return callback(null, allBindings)
            })
    }


}


module.exports = mediawikiStats


if (false) {

    //mediawikiStats.generateCatWordsMatrix("aapg", "gemet", function (err, result) {
    mediawikiStats.generateCatWordsMatrix("aapg", null, function (err, result) {
        if (err)
            console.log(err);
        console.log("Done ");

    })


}

if (true) {

    //mediawikiStats.generateCatWordsMatrix("aapg", "gemet", function (err, result) {
    mediawikiStats.generateCatWords("aapg", null, function (err, result) {
        if (err)
            console.log(err);
        console.log("Done ");

    })


}
//mediawikiStats.createMediawikiIndex(elasticUri,"mediawiki");
