/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var jsonFileStorage = require('./jsonFileStorage')
var path=require('path')

var configs = {};
var configManager = {

    getProfiles: function (options, callback) {
        var profilesPath = path.join(__dirname, "../config/profiles.json")
        jsonFileStorage.retrieve(path.resolve(profilesPath), function (err, profiles) {
            callback(err, profiles)
        })
    },
    getSources: function (options, callback) {
        var sourcesPath = path.join(__dirname, "../config/sources.json")
        jsonFileStorage.retrieve(path.resolve(sourcesPath), function (err, sources) {
            callback(err, sources)
        })
    },
    getBlenderSources: function (options, callback) {
        var sourcesPath = path.join(__dirname, "../config/blenderSources.json")
        jsonFileStorage.retrieve(path.resolve(sourcesPath), function (err, sources) {
            callback(err, sources)
        })
    },
    addBlenderSource: function (options, callback) {
        var sourcesPath = path.join(__dirname, "../config/blenderSource.json")
        jsonFileStorage.retrieve(path.resolve(sourcesPath), function (err, sources) {
            callback(err, sources)
        })
    }




}


module.exports = configManager;

