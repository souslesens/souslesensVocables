/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var jsonFileStorage = require("./jsonFileStorage");
var SourceManager = require("./sourceManager.");
var path = require("path");
var async = require("async");
var fs = require("fs");

const { configPath, config } = require("../model/config");
const { SourceModel, sourceModel } = require("../model/sources.js");
//const { getAllowedSources, filterSources, sortObjectByKey, resourceFetched } = require("../api/v1/paths/utils");
//const util = require("util");

var ConfigManager = {
    // TODO move to model/config
    getGeneralConfig: function (callback) {
        var editableConfig = config;
        var err = null;
        try {
            editableConfig.version = process.env.npm_package_version;
            if (!editableConfig.data_dir) {
                editableConfig.data_dir = path.join(__dirname, "../data/");
            }

            ConfigManager.config = editableConfig;
        } catch (e) {
            console.log(e);
            // in that case return the string content not parsed
            err = e;
        } finally {
            if (callback) {
                callback(err, editableConfig);
            }
        }
    },
    // TODO move to model/profiles
    getProfiles: function (options, callback) {
        var profilesPath = path.join(__dirname, "../" + configPath + "/profiles.json");
        jsonFileStorage.retrieve(path.resolve(profilesPath), function (err, profiles) {
            callback(err, profiles);
        });
    },
    // TODO move to model/sources
    getSources: function (options, callback) {
        var sourcesPath = path.join(__dirname, "../" + configPath + "/sources.json");
        jsonFileStorage.retrieve(path.resolve(sourcesPath), function (err, sources) {
            callback(err, sources);
        });
    },
    // TODO move to model/blenderSources
    createNewResource: function (sourceName, graphUri, targetSparqlServerUrl, options, callback) {
        async.series(
            [
                // create and initiate graph triples
                function (callbackSeries) {
                    if (options.type == "SKOS") {
                        SourceManager.createNewSkosSourceGraph(sourceName, graphUri, targetSparqlServerUrl, options, function (err, result) {
                            return callbackSeries(err, result);
                        });
                    } else if (options.type == "OWL") {
                        return callbackSeries(null);
                    }
                },
                function (callbackSeries) {
                    var sourcesPath = path.join(__dirname, "../" + configPath + "/blenderSources.json");
                    jsonFileStorage.retrieve(path.resolve(sourcesPath), function (err, sources) {
                        if (err) {
                            return callback(err);
                        }
                        if (options.type == "SKOS") {
                            sources[sourceName] = {
                                editable: true,
                                controller: "Sparql_SKOS",
                                sparql_server: {
                                    url: "_default",
                                },

                                graphUri: graphUri,
                                schemaType: "SKOS",
                                predicates: { lang: options.lang },
                                color: "#9edae3",
                            };
                        } else if (options.type == "OWL") {
                            sources[sourceName] = {
                                editable: true,
                                controller: "Sparql_OWL",
                                sparql_server: {
                                    url: "_default",
                                },

                                graphUri: graphUri,
                                schemaType: "OWL",
                            };
                        }

                        // @ts-ignore
                        jsonFileStorage.store(path.resolve(sourcesPath), sources, function (err, _sources) {
                            callbackSeries(err);
                        });
                    });
                },
            ],
            function (err) {
                callback(err, "done");
            },
        );
    },

    // TODO move to model/blenderSources
    deleteResource: function (sourceName, graphUri, targetSparqlServerUrl, callback) {
        async.series(
            [
                // create and initiate graph triples
                function (callbackSeries) {
                    SourceManager.deleteSourceGraph(graphUri, targetSparqlServerUrl, function (err, result) {
                        return callbackSeries(err, result);
                    });
                },
                function (callbackSeries) {
                    var sourcesPath = path.join(__dirname, "../" + configPath + "/blenderSources.json");
                    jsonFileStorage.retrieve(path.resolve(sourcesPath), function (err, sources) {
                        if (err) {
                            return callback(err);
                        }
                        delete sources[sourceName];

                        jsonFileStorage.store(path.resolve(sourcesPath), sources, function (err, _sources) {
                            callbackSeries(err);
                        });
                    });
                },
            ],
            function (err) {
                callback(err, "done");
            },
        );
    },
    // TODO move to model/sources
    addImportToSource: function (parentSource, importedSource, callback) {
        ConfigManager.getSources(null, function (err, sources) {
            if (err) {
                return callback(err);
            }
            if (!sources[parentSource]) {
                return callback(err);
            }

            if (!sources[parentSource].imports) {
                sources[parentSource].imports = [];
            }
            sources[parentSource].imports.push(importedSource);
            ConfigManager.saveSources(sources, function (err, result) {
                callback(err, result);
            });
        });
    },
    // TODO move to model/sources
    saveSources: function (sources, callback) {
        var sourcesPath = path.join(__dirname, "../" + configPath + "/sources.json");
        jsonFileStorage.store(path.resolve(sourcesPath), sources, function (err, message) {
            callback(err, message);
        });
    },

    getUser: async function (req, res, next) {
        const userManager = require(path.resolve("bin/user."));
        try {
            const userInfo = await userManager.getUser(req.user || null);
            if (next) {
                return next(null, userInfo);
            }
            return userInfo;
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    },

    getUserSources: async function (req, res, next) {
        try {
            const { sourceModel, SourceModel } = require("../model/sources");
            const userManager = require(path.resolve("bin/user."));
            const userInfo = await userManager.getUser(req.user || null);
            const allowedSources = await sourceModel.getUserSources(userInfo.user);
            if (next) {
                return next(null, allowedSources);
            }
            return allowedSources;
            //  resourceFetched(res, sortedSources);
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
        if (false) {
            const { configPath, config } = require("../model/config");
            const sourcesJSON = path.resolve(configPath + "/sources.json");
            const profilesJSON = path.resolve(configPath + "/profiles.json");
            const util = require("util");
            const { readResource, writeResource, resourceCreated, responseSchema, resourceFetched } = require("../api/v1/paths/utils");
            const userManager = require(path.resolve("bin/user."));
            const read = util.promisify(fs.readFile);
            const { getAllowedSources, filterSources, sortObjectByKey } = require("../api/v1/paths/utils.js");
            try {
                const userInfo = await userManager.getUser(req.user || null);

                var sourcesFile = sourcesJSON;
                if (req.query.sourcesFile) {
                    sourcesFile = path.resolve(configPath + "/" + req.query.sourcesFile);
                    if (!sourcesFile.startsWith(path.resolve(configPath))) {
                        return res.status(403).json({ done: false, message: "forbidden path" });
                    }
                }
                //  const sources = await read(sourcesJSON);
                const sources = await read(sourcesFile);
                const parsedSources = JSON.parse(sources);
                // return all sources if user is admin
                let filteredSources;
                if (!userInfo.user.groups.includes("admin")) {
                    //   if (!userInfo.user.groups.indexOf("admin")>-1) {
                    // return filtered sources if user is not admin
                    const profiles = await read(profilesJSON);
                    const parsedProfiles = JSON.parse(profiles);
                    const allowedSources = getAllowedSources(userInfo.user, parsedProfiles, parsedSources, config.formalOntologySourceLabel);
                    filteredSources = filterSources(allowedSources, parsedSources);
                } else {
                    // admin, return all sources with readwrite right
                    filteredSources = Object.fromEntries(
                        Object.entries(parsedSources).map(([id, s]) => {
                            s["accessControl"] = "readwrite";
                            return [id, s];
                        }),
                    );
                }
                // sort
                const sortedSources = sortObjectByKey(filteredSources);
                // return
                next(null, sortedSources);
                //  resourceFetched(res, sortedSources);
            } catch (err) {
                next(err);
            }
        }
    },
};
ConfigManager.getGeneralConfig();
module.exports = ConfigManager;
