import fs from "fs";
import path from "path";

//var TikaClient = require("@futpib/tika-server-client");
//var tika = new TikaClient("http://localhost:41000");
//const TikaServer = require("tika-server");
import util from "../util.js";

import httpProxy from "../httpProxy.js";
import socket from "../socketManager.js";
import ConfigManager from "../configManager.js";
import etl from "etl";
import async from "async";

var acceptedExtensions = ["ttl", "doc", "docx", "xls", "xslx", "pdf", "odt", "ods", "ppt", "pptx", "html", "htm", "txt", "csv"];
var base64Extensions = ["doc", "docx", "xls", "xslx", "pdf", "odt", "ods", "ppt", "pptx"];
var maxDocSize = 20 * 1000 * 1000;
//var tikaServerUrl = '';
//const tikaServerUrl = "127.0.0.1:41000";
const spacyServerUrl = "";

var parsedDocumentsHomeDir = null; //"../../data/annotator/parsedDocuments"
var uploadDirPath = null; //"../../data/annotator/temp"
import Inflector from "inflected";
var tikaServer = null;

// var tikaserverStarted = false;
import unzipper from "unzipper";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var jsonData = {};
var DirContentAnnotator = {
    socket: {
        message: function (text) {
            socket.message("annotate", text);
            console.log(text);
        },
    },
    init: function () {
        parsedDocumentsHomeDir = path.resolve(ConfigManager.config.data_dir + "annotator/parsedDocuments") + path.sep;
        uploadDirPath = path.resolve(ConfigManager.config.data_dir + "annotator/temp/") + path.sep;
    },

    uploadAndAnnotateCorpus: function (zipFile, corpusName, sources, options, callback) {
        console.log("uploadAndAnnotateCorpus 1");
        DirContentAnnotator.socket.message("unziping file " + zipFile.name + "(" + zipFile.size / 1000 + "ko)");
        var tempzip = uploadDirPath + "temp.zip";
        jsonData = { sources: [], files: {} };
        var fileNames = [];
        var tempFileNames = [];
        zipFile.mv(tempzip, function (err) {
            if (err) return callback(err);

            fs.createReadStream(tempzip)
                .pipe(unzipper.Parse())
                .pipe(
                    etl.map((entry) => {
                        var type = entry.type;
                        if (type == "File") {
                            var fileName = entry.path;
                            var array = fileName.split("/");
                            var tempFileName = uploadDirPath + array[array.length - 1];
                            tempFileNames.push(tempFileName);
                            fileNames.push(fileName);
                            entry.pipe(etl.toFile(tempFileName)).promise(function (_resolve, _reject) {
                                // do nothing ?
                            });

                            return;
                        } else entry.autodrain();
                    }),
                )

                .on("finish", function () {
                    DirContentAnnotator.processZippedFiles(fileNames, corpusName, sources, options, function (err, result) {
                        callback(err, result);

                        tempFileNames.push(tempzip);
                        async.eachSeries(tempFileNames, function (fileName, callbackSeries) {
                            fs.unlink(fileName, (err) => {
                                if (err) {
                                    console.error(err);
                                }
                                callbackSeries();
                            });
                        });
                    });
                });
        });
    },

    processZippedFiles: function (fileNames, corpusName, sources, options, callback) {
        var tempFileName;

        var filesProcessed = 0;
        var rootFileName = null;

        async.eachSeries(
            fileNames,
            function (fileName, callbackEachSeries) {
                if (!rootFileName) rootFileName = fileName;
                var array = fileName.split("/");
                var shortFileName = array[array.length - 1];
                var tempFileName = uploadDirPath + shortFileName;

                jsonData.files[fileName] = { name: shortFileName };

                var subjects = array.slice(0, array.length - 1);
                jsonData.files[fileName].subjects = subjects;

                var size = fs.statSync(tempFileName).size;
                var fileText;
                if (size > 0) {
                    DirContentAnnotator.socket.message("-------------------- file " + shortFileName + "(" + size / 1000 + "ko)-------------------");
                    async.series(
                        [
                            function (callbackSeries) {
                                DirContentAnnotator.socket.message(fileName + "     extracting text");
                                DirContentAnnotator.getDocTextContentFromFile(tempFileName, function (err, text) {
                                    if (err) return callbackSeries(err);
                                    var fileText = text.replace(/\n/g, "").trim();
                                    jsonData.files[fileName].text = fileText;
                                    return callbackSeries();
                                });
                            },
                            function (callbackSeries) {
                                var json = {
                                    text: fileText,
                                };

                                DirContentAnnotator.socket.message(shortFileName + "     extracting nouns ");
                                httpProxy.post(spacyServerUrl, { "content-type": "application/jsonData" }, json, function (err, result) {
                                    if (err) {
                                        console.log(err);
                                        return callbackSeries(err);
                                    }

                                    jsonData.files[fileName].nouns = {};
                                    var sentenceOffset = 0;
                                    result.data.forEach(function (sentence) {
                                        sentence.tags.forEach(function (item) {
                                            if (item.text.length > 2)
                                                if (item.tag.indexOf("NN") > -1) {
                                                    var noun = Inflector.singularize(item.text.toLowerCase());

                                                    if (!jsonData.files[fileName].nouns[noun]) {
                                                        jsonData.files[fileName].nouns[noun] = {
                                                            offsets: [],
                                                        };
                                                    }
                                                    jsonData.files[fileName].nouns[noun].offsets.push(sentenceOffset + item.char_offset);
                                                }
                                        });
                                        sentenceOffset += 0;
                                    });
                                    return callbackSeries();
                                });
                            },
                            function (callbackSeries) {
                                DirContentAnnotator.annotateText(jsonData.files[fileName], sources, corpusName, options, function (_err, _result) {
                                    filesProcessed++;
                                    console.log(filesProcessed);
                                    return callbackSeries();
                                });
                            },
                        ],
                        function (err) {
                            if (err) return callbackEachSeries(err);
                            callbackEachSeries();
                        },
                    );
                }
            },
            function (_err) {
                fs.writeFileSync(parsedDocumentsHomeDir + corpusName + "_concepts.json", JSON.stringify(jsonData, null, 2));
                callback(null, "done");
            },
        );
    },

    annotateText: function (fileObj, sources, corpusName, options, callback) {
        var allWords = [];

        for (var noun in fileObj.nouns) {
            allWords.push(noun);
        }
        var nounSlices = util.sliceArray(allWords, 50);
        async.eachSeries(
            sources,
            function (source, callbackEachSource) {
                if (jsonData.sources.indexOf(source.name) < 0) jsonData.sources.push(source.name);
                DirContentAnnotator.socket.message(fileObj.name + "     annotating  on source " + source.name);
                var entitiesCount = 0;
                async.eachSeries(
                    nounSlices,
                    function (nounSlice, callbackEachNounSlice) {
                        // var allnouns=[]
                        var regexStr = "(";
                        nounSlice.forEach(function (noun, index) {
                            noun = noun.replace(/[\x00-\x2F]/, ""); // eslint-disable-line no-control-regex
                            noun = util.formatStringForTriple(noun);

                            if (index > 0) regexStr += "|";
                            regexStr += "^" + noun + "$"; // XXX what if not exactMatch ?
                        });
                        regexStr += ")";

                        var filter = '  regex(?label, "' + regexStr + '", "i")';

                        //  async.eachSeries(sources, function (source, callbackEachSource) {

                        var query = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" + "SELECT * " + "FROM <" + source.graphUri + "> " + "WHERE {" + "?id skos:prefLabel|skos:altLabel ?label .";
                        if (source.predicates && source.predicates.lang) query += "FILTER (lang(?label) = '" + source.predicates.lang + "')";

                        query += " filter " + filter + "} limit 10000";

                        var url = source.sparql_server.url + "?format=json&query=";
                        var params = { query: query };
                        var headers = {
                            /* "Accept": "application/sparql-results+jsonData",
                     "Content-Type": "application/x-www-form-urlencoded",*/
                            Accept: "application/sparql-results+json",
                            charset: "UTF-8",
                        };

                        httpProxy.post(url, headers, params, function (err, result) {
                            if (err) {
                                return callbackEachNounSlice(err);
                            } else {
                                result.results.bindings.forEach(function (item) {
                                    var word = item.label.value.toLowerCase();
                                    entitiesCount += 1;
                                    if (fileObj.nouns[word]) {
                                        if (!fileObj.nouns[word].entities) fileObj.nouns[word].entities = {};
                                        if (!fileObj.nouns[word].entities[source.name]) fileObj.nouns[word].entities[source.name] = [];
                                        if (fileObj.nouns[word].entities[source.name].indexOf(item.id.value) < 0) fileObj.nouns[word].entities[source.name].push(item.id.value);
                                    }
                                });
                                callbackEachNounSlice();
                            }
                        });
                    },
                    function (err) {
                        DirContentAnnotator.socket.message(fileObj.name + "/" + source.name + " nouns :" + Object.keys(fileObj.nouns).length + " entities " + entitiesCount + "");
                        callbackEachSource(err, fileObj);
                    },
                );
            },
            function (err) {
                callback(err);
            },
        );
    },

    getDocTextContentFromBuffer: function (stream, callback) {
        if (!tikaServer) {
            var initFile = uploadDirPath + "init.txt";
            DirContentAnnotator.startTikaServer(initFile, function (err, result) {
                if (err) return callback(err);
                var tika = new TikaClient("http://localhost:41000");

                tika.tikaFromStream(stream).then(function (text) {
                    console.log(text);
                    return callback(null, result);
                });
            });
        } else {
            tika.tikaFromStream(stream).then(function (text) {
                //   console.log( text );
                return callback(null, text);
            });
        }
    },

    startTikaServer: function (filePath, callback) {
        tikaServer = new TikaServer();
        (async () => {
            /* tikaServer.on("debug", (msg) => {
                  console.log(`DEBUG: ${msg}`)
            }); */
            await tikaServer.start();
            /* await tikaServer.query(text).then((data) => {
                   callback(null,data)
                 })*/
            await tika.tikaFromFile(filePath).then(function (text) {
                //  console.log( text );
                return callback(null, text);
            });
        })().catch((err) => {
            console.log(`ERROR: ${err}`);
            callback(err);
        });
    },
    stopTikaServer: function () {
        (async () => {
            await tikaServer.stop();
        })().catch((err) => {
            console.log(`ERROR: ${err}`);
        });
    },
    getDocTextContentFromFile: function (filePath, callback) {
        var file = path.resolve(filePath);

        var extension = file.substring(file.lastIndexOf(".") + 1);
        var base64 = false;
        if (base64Extensions.indexOf(extension) > -1) {
            base64 = true;
        }
        var fileContent;
        if (base64) {
            fileContent = util.base64_encodeFile(filePath);
            if (!tikaServer) {
                DirContentAnnotator.startTikaServer(filePath, function (err, result) {
                    if (err) return callback(err);
                    var tika = new TikaClient("http://localhost:41000");

                    tika.tikaFromFile(filePath).then(function (text) {
                        console.log(text);
                        return callback(null, result);
                    });
                });
            } else {
                tika.tikaFromFile(filePath).then(function (text) {
                    //   console.log( text );
                    return callback(null, text);
                });
            }
        } else {
            fileContent = "" + fs.readFileSync(filePath);
            return callback(null, fileContent);
        }
    },
    getDirContent: function (dirPath, callback) {
        var dirsArray = [];
        var dirFilesMap = {};
        var rootDirName = path.basename(dirPath);

        function recurse(parent) {
            parent = path.normalize(parent);
            if (!fs.existsSync(parent)) return "dir doesnt not exist :" + parent;
            if (parent.charAt(parent.length - 1) != path.sep) parent += path.sep;

            var files = fs.readdirSync(parent);
            for (var i = 0; i < files.length; i++) {
                var fileName = parent + files[i];
                var stats = fs.statSync(fileName);
                var infos = { lastModified: stats.mtimeMs }; //fileInfos.getDirInfos(dir);

                if (stats.isDirectory()) {
                    dirFilesMap[fileName + "\\"] = [];
                    dirsArray.push({ type: "dir", name: files[i], parent: parent });
                    recurse(fileName);
                } else {
                    var p = fileName.lastIndexOf(".");
                    if (p < 0) continue;
                    var extension = fileName.substring(p + 1).toLowerCase();
                    if (acceptedExtensions.indexOf(extension) < 0) {
                        DirContentAnnotator.socket.message("!!!!!!  refusedExtension " + fileName);
                        continue;
                    }
                    if (stats.size > maxDocSize) {
                        DirContentAnnotator.socket.message("!!!!!! " + fileName + " file  too big " + Math.round(stats.size / 1000) + " Ko , not indexed ");
                        continue;
                    }
                    if (!dirFilesMap[parent]) dirFilesMap[parent] = [];
                    dirFilesMap[parent].push({
                        type: "file",
                        parent: parent,
                        name: files[i],
                        infos: infos,
                    });
                    // dirsArray.push({type: "file", parent: parent, name: files[i], infos: infos})
                }
            }
        }

        recurse(dirPath, dirPath);

        var files = [];
        for (var dir in dirFilesMap) {
            var subjects = dir.substring(dir.indexOf(rootDirName)).split("\\");
            subjects.splice(subjects.length - 1, 1); //remove empty string at end

            dirFilesMap[dir].forEach(function (file) {
                files.push({
                    path: file.parent + file.name,
                    infos: file.infos,
                    subjects: subjects,
                });
            });
        }

        return callback(null, files);
    },

    parseDocumentsDir: function (rooDirPath, name, callback) {
        var files = {};
        async.series(
            [
                function (callbackSeries) {
                    DirContentAnnotator.getDirContent(rooDirPath, function (err, result) {
                        if (err) return callbackSeries(err);
                        files = result;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var index = -1;
                    async.eachSeries(
                        files,
                        function (file, callbackEach) {
                            DirContentAnnotator.socket.message("extracting text from " + file.path);
                            DirContentAnnotator.getDocTextContentFromFile(file.path, function (err, text) {
                                index += 1;
                                if (err) {
                                    files[index].error = err;
                                    return callbackEach();
                                } else {
                                    var jsonData = {
                                        text: text,
                                    };

                                    httpProxy.post(spacyServerUrl, { "content-type": "application/jsonData" }, jsonData, function (err, result) {
                                        if (err) {
                                            console.log(err);
                                            return callbackSeries(err);
                                        }
                                        files[index].nouns = [];
                                        result.data.forEach(function (sentence) {
                                            sentence.tags.forEach(function (item) {
                                                if (item.text.length > 2)
                                                    if (item.tag.indexOf("NN") > -1) {
                                                        //item.tag.indexOf("NN")>-1) {
                                                        var noun = Inflector.singularize(item.text.toLowerCase());
                                                        if (files[index].nouns.indexOf(noun) < 0) {
                                                            files[index].nouns.push(noun);
                                                        }
                                                    }
                                            });
                                        });
                                        DirContentAnnotator.socket.message(files[index].nouns.length + "nouns extracted  from : " + file.path);
                                        callbackEach();
                                    });
                                }
                            });
                        },
                        function (err) {
                            callbackSeries(err);
                        },
                    );
                },
            ],
            function (err) {
                if (err) DirContentAnnotator.socket.message(err);
                else {
                    if (callback) return callback(null, files);
                    var storePath = path.resolve(__dirname, "../../data/parseDocuments/" + name + ".jsonData");
                    storePath = parsedDocumentsHomeDir + name + ".jsonData";
                    fs.writeFileSync(storePath, JSON.stringify(files, null, 2));
                }
            },
        );
    },
    annotateParsedDocuments: function (data, sources, corpusName, options, callback) {
        var conceptsMap = {};

        async.eachSeries(
            data,
            function (fileObj, callbackEachDocument) {
                if (!conceptsMap[fileObj.path]) conceptsMap[fileObj.path] = { subjects: fileObj.subjects, sources: {} };

                var allWords = [];
                var matchingWords = [];
                fileObj.nouns.forEach(function (noun) {
                    allWords.push(noun.toLowerCase());
                });
                var nounSlices = util.sliceArray(fileObj.nouns, 50);
                async.eachSeries(
                    sources,
                    function (source, callbackEachSource) {
                        DirContentAnnotator.socket.message("annotating " + fileObj.path + " on source " + source.name);
                        async.eachSeries(
                            nounSlices,
                            function (nounSlice, callbackEachNounSlice) {
                                var regexStr = "(";
                                nounSlice.forEach(function (noun, index) {
                                    noun = noun.replace(/[\x00-\x2F]/, ""); // eslint-disable-line no-control-regex
                                    noun = util.formatStringForTriple(noun);

                                    if (index > 0) regexStr += "|";
                                    regexStr += "^" + noun + "$"; // what if not exactMatch
                                });
                                regexStr += ")";

                                var filter = '  regex(?label, "' + regexStr + '", "i")';

                                //  async.eachSeries(sources, function (source, callbackEachSource) {
                                conceptsMap[fileObj.path].sources[source.name] = {
                                    entities: [],
                                    missingNouns: [],
                                };
                                var query =
                                    "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" + "SELECT * " + "FROM <" + source.graphUri + "> " + "WHERE {" + "?id skos:prefLabel|skos:altLabel ?label .";
                                if (source.predicates && source.predicates.lang) query += "FILTER (lang(?label) = '" + source.predicates.lang + "')";

                                query += " filter " + filter + "} limit 10000";

                                var url = source.sparql_server.url;

                                var params = { query: query };
                                var headers = {
                                    Accept: "application/sparql-results+jsonData",
                                    "Content-Type": "application/x-www-form-urlencoded",
                                };

                                httpProxy.post(url, headers, params, function (err, result) {
                                    if (err) {
                                        return callbackEachNounSlice(err);
                                    } else {
                                        result.results.bindings.forEach(function (item) {
                                            matchingWords.push(item.label.value.toLowerCase());

                                            conceptsMap[fileObj.path].sources[source.name].entities.push({
                                                label: item.label.value,
                                                id: item.id.value,
                                            });
                                        });
                                        callbackEachNounSlice();
                                    }
                                });
                            },
                            function (err) {
                                var missingNouns = allWords.filter((x) => !matchingWords.includes(x));
                                conceptsMap[fileObj.path].sources[source.name].missingNouns = missingNouns;
                                DirContentAnnotator.socket.message(" ---" + conceptsMap[fileObj.path].sources[source.name].entities.length + " entities matched / " + allWords.length + "nouns");

                                DirContentAnnotator.socket.message(" ---" + conceptsMap[fileObj.path].sources[source.name].missingNouns.length + " missing nouns");

                                callbackEachSource(err);
                            },
                        );
                    },
                    function (_err) {
                        return callbackEachDocument();
                    },
                );
            },
            function (err) {
                if (err) {
                    DirContentAnnotator.socket.message(err);
                    return callback(err);
                } else {
                    DirContentAnnotator.socket.message("saving corpus " + corpusName);

                    var storePath = path.resolve(__dirname, "../../data/parseDocuments/" + corpusName + "_Concepts.jsonData");
                    storePath = parsedDocumentsHomeDir + corpusName + "_Concepts.jsonData";
                    fs.writeFileSync(storePath, JSON.stringify(conceptsMap, null, 2));
                    return callback();
                }
            },
        );
    },

    annotateAndStoreCorpus: function (corpusDirPath, sources, corpusName, options, callback) {
        var files = [];
        async.series(
            [
                //parse documentsDir recursively

                function (callbackSeries) {
                    DirContentAnnotator.socket.message("parsing files in directory " + corpusDirPath);
                    DirContentAnnotator.parseDocumentsDir(corpusDirPath, corpusName, function (err, result) {
                        if (err) return callbackSeries(err);
                        files = result;
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    DirContentAnnotator.socket.message("annotating files");
                    DirContentAnnotator.annotateParsedDocuments(files, sources, corpusName, {}, function (err, result) {
                        if (err) return callbackSeries(err);
                        files = result;
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                callback(err, corpusName);
            },
        );
    },
    getAnnotatedCorpusList: function (group, callback) {
        var files = fs.readdirSync(parsedDocumentsHomeDir);
        var names = [];
        files.forEach(function (item) {
            names.push(item.replace("_Concepts.jsonData", ""));
        });

        return callback(null, names);
    },

    getConceptsSubjectsTree: function (corpusName, callback) {
        var storePath = parsedDocumentsHomeDir + corpusName; //+ "_Concepts.jsonData"
        var str = "" + fs.readFileSync(storePath);
        var data = JSON.parse(str);

        var parents = {};
        var subjectsMap = {};
        for (var key in data.files) {
            var fileObj = data.files[key];

            fileObj.subjects.forEach(function (subject, index) {
                var parent;
                if (index == 0) parent = corpusName;
                else parent = fileObj.subjects[index - 1];
                if (!parents[parent]) parents[parent] = [];
                if (subject != "") {
                    if (parents[parent].indexOf(subject) < 0) parents[parent].push(subject);

                    // for the last subject attach file and nouns
                    if (index == fileObj.subjects.length - 1) {
                        if (!subjectsMap[subject]) subjectsMap[subject] = { files: [] };
                        var fileName = path.basename(key);

                        subjectsMap[subject].files.push({
                            filePath: key,
                            fileName: fileName,
                            nouns: fileObj.nouns,
                            text: fileObj.text,
                        });
                    }
                }
            });
        }

        function recurse(node) {
            var children = parents[node.text];
            if (children) {
                children.forEach(function (child) {
                    var childObj = { text: child, children: [], data: {} };
                    if (subjectsMap[child]) childObj.data = subjectsMap[child];
                    node.children.push(childObj);
                    recurse(childObj);
                });
            }
        }

        var rootNode = { text: corpusName, children: [] };
        recurse(rootNode);

        var jstreeData = [];

        function recurseJstree(node) {
            node.children.forEach(function (child) {
                jstreeData.push({
                    text: child.text,
                    id: child.text,
                    data: child.data,
                    parent: node.text,
                });
                recurseJstree(child);
            });
        }

        jstreeData.push({
            text: rootNode.text,
            id: rootNode.text,
            data: rootNode.data,
            parent: "#",
        });
        recurseJstree(rootNode);

        if (callback) {
            return callback(null, { jstreeData: jstreeData, sources: data.sources });
        } else {
            storePath = parsedDocumentsHomeDir + corpusName + "_subjectsTree.jsonData";
            fs.writeFileSync(storePath, JSON.stringify(jstreeData, null, 2));
        }
    },

    SpacyExtract: function (text, types, options, callback) {
        if (!options) {
            options = {};
        }

        var json = {
            text: text,
        };

        DirContentAnnotator.socket.message(+"     extracting nouns ");
        httpProxy.post(spacyServerUrl, { "content-type": "application/jsonData" }, json, function (err, result) {
            if (err) {
                console.log(err);
                return callback(err);
            }
            var tokens = [];
            result.data.forEach(function (sentence) {
                sentence.tags.forEach(function (item) {
                    if (item.text.length > 2)
                        if (types.indexOf(item.tag) > -1) {
                            //item.tag.indexOf("NN")>-1) {
                            var token = Inflector.singularize(item.text.toLowerCase());
                            tokens.push(token);
                        }
                });
            });
            if (options.composedWords_2) {
                var tokens_2 = [];
                tokens.forEach(function (token, index) {
                    if (index > 0) tokens_2.push(tokens[index - 1] + " " + token);
                });
                var tokens = tokens.concat(tokens_2);
            }

            return callback(null, tokens);
        });
    },
};
DirContentAnnotator.init();
export default DirContentAnnotator;
/*
if (false) {
    DirContentAnnotator.getDirContent("D:\\NLP\\ontologies");
}
if (false) {
    DirContentAnnotator.parseDocumentsDir("D:\\Total\\2020\\_testAnnotator", "test", function (err, result) {});
}

var sources = {
    "Total-CTG": {
        name: "Total-CTG",
        editable: false,
        controller: "Sparql_SKOS",
        sparql_server: {
            url: "",
        },
        graphUri: "http://data.total.com/resource/thesaurus/ctg2/",
        schemaType: "SKOS",
        predicates: {
            broaderPredicate: "skos:broader|^skos:hasTopConcept",
            lang: "en",
        },

        color: "#9edae5",
    },
};

if (false) {
    DirContentAnnotator.annotateParsedDocuments("test", [sources["Total-CTG"]], {}, function (err, result) {});
}

if (false) {
    DirContentAnnotator.getConceptsSubjectsTree("test", function (err, result) {});
}

//  DirContentAnnotator.startTikaServer()
if (false) {
    DirContentAnnotator.getDocTextContentFromFile("D:\\Total\\2020\\_testAnnotator\\sujet1\\sujet1-1\\sujet1-1-1\\test.docx", function (err, result) {
        var x = result;
    });
}

if (false) {
    DirContentAnnotator.getAnnotatedCorpusList();
}

if (false) {
    var text =
        "The distance between the pump and driver shaft ends (distance between shaft ends, or DBSE) shall begreater than the seal cartridge length for all pumps other than OH type or at least 125 mm (5 in) and shallpermit removal of the coupling, bearing housing, bearings, seal and rotor, as applicable, without disturbingthe driver, driver coupling hub, pump coupling hub or the suction and discharge piping. For Types BB and VSpumps, this dimension, DBSE, shall always be greater than the total seal length, l, listed in Table 7, and shallbe included on the pump data sheet (Annex N).";
    DirContentAnnotator.SpacyExtract(text, ["NN"], { composedWords_2: 1 }, function (err, result) {});
}
*/
