var configDir = "../config/elastic/";
var fs = require("fs");
var path = require("path");
var async = require("async");


/*var documentCrawler = require("./backoffice/_documentCrawler.");
var bookCrawler = require("./backoffice/_bookCrawler.");
var sqlCrawler = require("./backoffice/_sqlCrawler.");
var csvCrawler = require("./backoffice/_csvCrawler.");
var imapCrawler = require("./backoffice/_imapCrawler.");
var jsonCrawler = require("./backoffice/_jsonCrawler.");*/


var configs = {};
var configLoader = {


    getAllIndexNames: function (callback) {
        try {

            var indexNames = [];
            var pathStr = path.join(__dirname, configDir + "sources/");
            fs.readdirSync(pathStr).forEach(file => {
                var p = file.indexOf(".json")
                if (p > -1)
                    indexNames.push(file.substring(0, p))
            });
        } catch (e) {
            return callback(e);

        }
        return callback(null, indexNames);
    },
    getAllProfiles: function (callback) {
        try {
            var profiles = [];
            var pathStr = path.join(__dirname, configDir + "profiles/");
            fs.readdirSync(pathStr).forEach(file => {
                var str = "" + fs.readFileSync(pathStr + file);
                try{
                profiles.push(JSON.parse(str, null, 2))
                }catch(e){
                    return callback(pathStr+" ")+e;
                }
            });
        } catch (e) {
            return callback(e);
        }
        return callback(null, profiles);
    }
    , writeAllProfiles: function (profiles, callback) {
        var pathStr = path.join(__dirname, configDir + "profiles/profiles.json");
        fs.writeFile(pathStr, profiles, function (err, result) {
            if (err)
                return callback(err);
            return callback(null, "profiles saved : ");
        });

    },
    getAllJobs: function (callback) {
        try {
            var profiles = [];
            var pathStr = path.join(__dirname, configDir + "jobs/jobs.json");
            var str = "" + fs.readFileSync(pathStr);
            try{
            var jobs = JSON.parse(str, null, 2);
            }catch(e){
                return callback(pathStr+" ")+e;
            }

        } catch (e) {
            return callback(e);
        }
        return callback(null, jobs);
    }
    ,
    saveAllJobs: function (jobsStr, callback) {
        try {
            var pathStr = path.join(__dirname, configDir + "jobs/jobs.json");
            fs.writeFileSync(pathStr, jobsStr);
        } catch (e) {
            return callback(e);
        }
        return callback(null, "jobs saved");
    },

    getAllThesaurusConfig: function (callback) {
        try {
            var thesauri = [];
            var pathStr = path.join(__dirname, configDir + "thesauri/");
            fs.readdirSync(pathStr).forEach(file => {
                var str = "" + fs.readFileSync(pathStr + file);
                try {
                    thesauri.push(JSON.parse(str, null, 2))
                } catch (e) {
                    return callback(file+"  "+e);
                }
            });
        } catch (e) {
            return callback(e);
        }
        return callback(null, thesauri);
    },

    saveThesaurusConfig: function (name, content, callback) {
        try {
            var pathStr = path.join(__dirname, configDir + "thesauri/" + name + ".json");
            fs.writeFileSync(pathStr, content);
        } catch (e) {
            return callback(e);
        }
        return callback(null, "thesaurus saved");
    },
    loadIndexConfig: function (index, callback) {
        var config = null;
        var str = null;
        try {
            var pathStr = path.join(__dirname, configDir + "sources/" + index + ".json");

            //   console.log(pathStr);
            str = fs.readFileSync(pathStr);
        } catch (e) {

            return callback(e);
        }
        try {
            config = JSON.parse(str);
        } catch (e) {
          return callback(pathStr+"  "+e);
        }
        return callback(null, config);


    },
    saveIndexConfig: function (index, jsonStr, callback) {
        var pathStr = path.join(__dirname, configDir + "sources/" + index + ".json");

        fs.writeFile(pathStr, jsonStr, function (err, result) {
            if (err)
                return callback(err);

            return callback(null, "index saved : " + index);
        });

    },
    deleteIndexConfig: function (index, callback) {
        var pathStr = path.join(__dirname, configDir + "sources/" + index + ".json");

        fs.unlink(pathStr, function (err, result) {
            if (err)
                return callback(err);
            return callback(null, "index deleted : " + index);
        });


    },
    getIndexConfig: function (index, callback) {

        if (false && configs[index]) {
            return callback(null, configs[index])
        } else {
            configLoader.loadIndexConfig(index, function (err, config) {
                if (err) {
                    return callback(err);
                }

                configs[index] = config;
                return callback(null, config)

            });

        }


    }
    ,


    getUserIndexConfigs: function (userGroups, callback) {
        if (!Array.isArray(userGroups)) {
            userGroups = userGroups.split(",");
        }
        var indexes = [];


        var configs = {};
        var joker = false;
        async.series([
            function (callbackSeries) {

                configLoader.getAllProfiles(function (err, result) {
                    result.forEach(function (profile) {
                        for (var group in profile) {

                            if (userGroups.indexOf(group) > -1) {
                                indexes = indexes.concat(profile[group].indexes);
                            }
                            if (profile[group].indexes.indexOf("*") > -1)
                                joker = true;

                        }
                    })
                    return callbackSeries();
                })

            },
            function (callbackSeries) {
                if (!joker)
                    return callbackSeries();

                configLoader.getAllIndexNames(function (err, result) {
                    indexes = result;
                    return callbackSeries();
                })

            },
            function (callbackSeries) {

                indexes.forEach(function (index) {
                    configLoader.getIndexConfig(index, function (err, config) {
                        if (err)
                            return callbackSeries(err);
                        configs[index] = config;

                    })
                })
                return callbackSeries(null, configs)

            }
        ], function (err) {
            callback(err, configs)
        })

    }
    ,
    getUserThesaurus: function (userGroups, callback) {
        if (!Array.isArray(userGroups)) {
            userGroups = userGroups.split(",");
        }
        var thesauri = [];
        configLoader.getAllProfiles(function (err, result) {
            result.forEach(function (profile) {
                for (var group in profile) {

                    if (userGroups.indexOf(group) > -1) {
                        thesauri = thesauri.concat(profile[group].thesauri);
                    }
                }
            })
            return callback(null, thesauri);
        })

    }

    , getTemplates: function (callback) {
        try {

            var indexNames = [];
            var dirPathStr = path.join(__dirname, configDir + "templates/");
            var json = {}
            fs.readdirSync(dirPathStr).forEach(file => {
                var filePath = dirPathStr + file

                var str = "" + fs.readFileSync(filePath);
                try {
                    var json0 = JSON.parse(str)
                }catch(e){
                   return callback(filePath+" ")+e;
                }
                var p = file.indexOf(".json")
                var name = file.substring(0, p);
                json[name] = json0;
            });
        } catch (e) {
            return callback(e);

        }
        return callback(null, json);


    },

    generateDefaultMappingFields: function (connector, callback) {

        var connectorType = connector.type;

        var fn = function (err, result) {
            callback(err, result)
        }
        if (connectorType == "document")
            documentCrawler.generateDefaultMappingFields(connector, fn)
        else if (connectorType == "sql")
            sqlCrawler.generateDefaultMappingFields(connector, fn)
        else if (connectorType == "imap")
            imapCrawler.generateDefaultMappingFields(connector, fn)
        else if (connectorType == "csv")
            csvCrawler.generateDefaultMappingFields(connector, fn)
        else if (connectorType == "book")
            bookCrawler.generateDefaultMappingFields(connector, fn)
        else if (connectorType == "json")
            jsonCrawler.generateDefaultMappingFields(connector, fn)
    }


}


module.exports = configLoader;

if (false) {
    configLoader.getUserIndexConfigs("archives", function (err, result) {
        var xx = err;
    })
}

if (false) {
    configLoader.getTemplates(function (err, result) {
        var xx = err;
    })
}
