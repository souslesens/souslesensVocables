var fs = require('fs')
var path = require('path')

var TikaClient = require('@futpib/tika-server-client');
var tika = new TikaClient('http://localhost:41000');
const TikaServer = require("tika-server")
var util = require("../util.")
var httpProxy = require('../httpProxy.')
var async = require('async')
//var annotatorLive = require('../annotatorLive.')


var acceptedExtensions = ["ttl", "doc", "docx", "xls", "xslx", "pdf", "odt", "ods", "ppt", "pptx", "html", "htm", "txt", "csv"];
var base64Extensions = ["doc", "docx", "xls", "xslx", "pdf", "odt", "ods", "ppt", "pptx"]
var maxDocSize = 20 * 1000 * 1000;
//var tikaServerUrl = 'http://vps475829.ovh.net:9998';
var tikaServerUrl = '127.0.0.1:41000'
var spacyServerUrl = "http://51.178.39.209:8000/pos"

var parsedDocumentsHomeDir = "C:\\Users\\claud\\Downloads\\"
var Inflector = require('inflected');
var tikaServer = null
var tikaserverStarted = false

var DirContentAnnotator = {

    socket: {
        message: function (text) {
            console.log(text)
        }
    },


    startTikaServer: function (filePath, callback) {
        tikaServer = new TikaServer()
        ;(async () => {

            tikaServer.on("debug", (msg) => {
                //  console.log(`DEBUG: ${msg}`)

            })
            await tikaServer.start()
            var options = {}
            /* await tikaServer.query(text).then((data) => {
                   callback(null,data)
                 })*/
            await tika.tikaFromFile(filePath)
                .then(function (text) {

                    //  console.log( text );
                    return callback(null, text);
                });

        })().catch((err) => {
            console.log(`ERROR: ${err}`)
            callback(err)
        })

    },

    stopTikaServer: function () {

        ;(async () => {
            await tikaServer.stop()


        })().catch((err) => {
            console.log(`ERROR: ${err}`)
        })

    },


    getDocTextContent: function (filePath, callback) {


        var fileContent;
        var file = path.resolve(filePath);

        var extension = file.substring(file.lastIndexOf(".") + 1);
        var title = file;
        var p = file.lastIndexOf(path.sep);
        if (p > -1)
            title = file.substring(p + 1);
        var base64 = false;
        if (base64Extensions.indexOf(extension) > -1) {
            base64 = true;
        }
        var fileContent;
        if (base64) {
            fileContent = util.base64_encodeFile(filePath);
            if (!tikaServer) {
                DirContentAnnotator.startTikaServer(filePath, function (err, result) {
                    if (err)
                        return callback(err)
                    var tika = new TikaClient('http://localhost:41000');

                    tika.tikaFromFile(filePath)
                        .then(function (text) {

                            console.log(text);
                            return callback(null, result);
                        });

                });

            } else {
                tika.tikaFromFile(filePath)
                    .then(function (text) {

                        //   console.log( text );
                        return callback(null, text);
                    });


            }
        } else {
            fileContent = "" + fs.readFileSync(filePath);
            return callback(null, fileContent)
        }


    }
    ,


    getDirContent: function (dirPath, callback) {
        var dirsArray = []
        var dirFilesMap = {}
        var rootDirName = path.basename(dirPath)

        function recurse(parent) {
            parent = path.normalize(parent);
            if (!fs.existsSync(parent))
                return ("dir doesnt not exist :" + parent)
            if (parent.charAt(parent.length - 1) != path.sep)
                parent += path.sep;


            var files = fs.readdirSync(parent);
            for (var i = 0; i < files.length; i++) {
                var fileName = parent + files[i];
                var stats = fs.statSync(fileName);
                var infos = {lastModified: stats.mtimeMs};//fileInfos.getDirInfos(dir);

                if (stats.isDirectory()) {
                    dirFilesMap[fileName + "\\"] = [];
                    dirsArray.push({type: "dir", name: files[i], parent: parent})
                    recurse(fileName)
                } else {
                    var p = fileName.lastIndexOf(".");
                    if (p < 0)
                        continue;
                    var extension = fileName.substring(p + 1).toLowerCase();
                    if (acceptedExtensions.indexOf(extension) < 0) {
                        DirContentAnnotator.socket.message("!!!!!!  refusedExtension " + fileName);
                        continue;
                    }
                    if (stats.size > maxDocSize) {
                        DirContentAnnotator.socket.message("!!!!!! " + fileName + " file  too big " + Math.round(stats.size / 1000) + " Ko , not indexed ");
                        continue;
                    }
                    if (!dirFilesMap[parent])
                        dirFilesMap[parent] = []
                    dirFilesMap[parent].push({type: "file", parent: parent, name: files[i], infos: infos})
                    // dirsArray.push({type: "file", parent: parent, name: files[i], infos: infos})

                }


            }

        }


        recurse(dirPath, dirPath);
        var x = dirsArray;
        var y = dirFilesMap

        var files = []
        for (var dir in dirFilesMap) {
            var subjects = dir.substring(dir.indexOf(rootDirName)).split("\\")
            subjects.splice(subjects.length-1,1)//remove empty string at end

            dirFilesMap[dir].forEach(function (file) {
                files.push({path: file.parent + file.name, infos: file.infos, subjects: subjects})

            })
        }


        return callback(null, files)


    }


    ,
    parseDocumentsDir: function (rooDirPath, name, options, callback) {
        var files = {}
        async.series([

                function (callbackSeries) {
                    DirContentAnnotator.getDirContent(rooDirPath, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        files = result;
                        callbackSeries()
                    })
                },
                function (callbackSeries) {
                    var index = -1
                    var docText = "";
                    var output = [];
                    async.eachSeries(files, function (file, callbackEach) {
                        DirContentAnnotator.socket.message("extracting text from " + file.path)
                        DirContentAnnotator.getDocTextContent(file.path, function (err, text) {
                            index += 1
                            if (err) {
                                files[index].error = err
                                return callbackEach()
                            } else {

                                var json = {
                                    "text": text
                                }

                                httpProxy.post(spacyServerUrl, {'content-type': 'application/json'}, json, function (err, result) {
                                    if (err) {
                                        console.log(err)
                                        return callbackSeries(err);
                                    }
                                    files[index].nouns = []
                                    result.data.forEach(function (sentence) {
                                        sentence.tags.forEach(function (item) {
                                            if (item.text.length > 2)
                                                if (item.tag.indexOf("NN") > -1) {//item.tag.indexOf("NN")>-1) {
                                                    var noun = Inflector.singularize(item.text.toLowerCase());
                                                    if (files[index].nouns.indexOf(noun) < 0)

                                                        files[index].nouns.push(noun);

                                                }
                                        })
                                    })
                                    callbackEach()

                                })
                            }


                        })
                    }, function (err) {
                        callbackSeries(err)
                    })

                }
            ], function (err) {


                if (err)
                    DirContentAnnotator.socket.message(err);
                else {
                    var storePath = path.resolve(__dirname, "../../data/parseDocuments/" + name + ".json")
                    storePath = parsedDocumentsHomeDir + name + ".json"
                    fs.writeFileSync(storePath, JSON.stringify(files, null, 2))
                }

            }
        )
    }

    , annotateParsedDocuments: function (name, sources, options, callback) {
        var parsedDocumentsFilePath = parsedDocumentsHomeDir + name + ".json"
        var str = "" + fs.readFileSync(parsedDocumentsFilePath)
        var data = JSON.parse(str);

        var conceptsMap = {}

        async.eachSeries(data, function (fileObj, callbackEachDocument) {
            if (!conceptsMap[fileObj.path])
                conceptsMap[fileObj.path] = {subjects: fileObj.subjects, sources: {}}

            var nounSlices = util.sliceArray(fileObj.nouns, 50);
            async.eachSeries(nounSlices, function (nounSlice, callbackEachNounSlice) {
                var nounsMap = {}
                var regexStr = "("
                nounSlice.forEach(function (noun, index) {


                    if (index > 0)
                        regexStr += "|";
                    if (true || options.exactMatch)
                        regexStr += "^" + noun + "$";
                    else
                        regexStr += noun;
                })
                regexStr += ")"


                var filter = "  regex(?label, \"" + regexStr + "\", \"i\")";

                async.eachSeries(sources, function (source, callbackEachSource) {
                        conceptsMap[fileObj.path].sources[source.name] = []
                        var query = "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
                            "SELECT * " +
                            "FROM <" + source.graphUri + "> " +
                            "WHERE {" +
                            "?id skos:prefLabel|skos:altLabel ?label ."
                        if (source.predicates && source.predicates.lang)
                            query += "FILTER (lang(?label) = '" + source.predicates.lang + "')"

                        query += " filter " + filter + "} limit 10000";


                        var url = source.sparql_server.url;
                        var queryOptions = "";// "&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=20000&debug=off"

                        var params = {query: query}
                        var headers = {
                            "Accept": "application/sparql-results+json",
                            "Content-Type": "application/x-www-form-urlencoded"
                        }
                        httpProxy.post(url, headers, params, function (err, result) {
                            if (err) {
                                return callbackEachSource(err);
                            }
                            var bindings = [];
                            var ids = [];

                            result.results.bindings.forEach(function (item) {
                                conceptsMap[fileObj.path].sources[source.name].push({
                                    label: item.label.value,
                                    id: item.id.value
                                })
                            })
                            callbackEachSource()
                        })


                    }
                    , function (err) {
                        callbackEachNounSlice()
                    })
            }, function (err) {
                return callbackEachDocument()
            })
        }, function (err) {
            if (err)
                return DirContentAnnotator.socket.message(err);
            else {
                var storePath = path.resolve(__dirname, "../../data/parseDocuments/" + name + "_Concepts.json")
                storePath = parsedDocumentsHomeDir + name + "_Concepts.json"
                fs.writeFileSync(storePath, JSON.stringify(conceptsMap, null, 2))
            }
        })


    }

    , getConceptsSubjectsTree: function (corpusName, callback) {

        var storePath = parsedDocumentsHomeDir + corpusName + "_Concepts.json"
        var str = "" + fs.readFileSync(storePath)
        var data = JSON.parse(str);

        var conceptsTree = {}
        var parents = {}
      var subjectsMap={}
        for (var key in data) {
            var fileObj = data[key]

            fileObj.subjects.forEach(function (subject, index) {
                var parent;
                if (index == 0)
                    parent = corpusName
                else
                    parent = fileObj.subjects[index - 1]
                if (!parents[parent])
                    parents[parent] = []
                if (subject != "") {
                    if (parents[parent].indexOf(subject) < 0)
                        parents[parent].push(subject)


                // for the last subject attach file and nouns
                if (index == fileObj.subjects.length - 1) {
                    if (!subjectsMap[subject])
                        subjectsMap[subject] = {files: []}
                    var fileName=path.basename(key)
                    subjectsMap[subject].files.push({filePath: key, fileName:fileName,sources: fileObj.sources})
                }
            }

            })

        }


        function recurse(node){
            var children=parents[node.text]
            if(children) {
                children.forEach(function (child) {
                    var childObj={text: child, children: [],data:{}}
                    if(subjectsMap[child])
                        childObj.data=subjectsMap[child]
                    node.children.push(childObj)
                    recurse(childObj)
                })
            }

        }
        var rootNode={text:corpusName,children:[],sources:subjectsMap[corpusName]}
        recurse(rootNode)
        var x=rootNode



        var jstreeData=[];
        function recurseJstree(node){

            node.children.forEach(function(child){
                jstreeData.push({text:child.text,id:child.text,data:child.data,parent:node.text})
                recurseJstree(child)
            })
        }
        jstreeData.push({text:rootNode.text,id:rootNode.text,data:rootNode.data,parent:"#"})
        recurseJstree(rootNode)



        if(callback){
            return callback(null,jstreeData)
        }else {


            var storePath = path.resolve(__dirname, "../../data/parseDocuments/" + corpusName + "_subjectsTree.json")
            storePath = parsedDocumentsHomeDir + corpusName + "_subjectsTree.json"
            fs.writeFileSync(storePath, JSON.stringify(jstreeData, null, 2))
        }

    }

}


module.exports = DirContentAnnotator;
if (false) {

    DirContentAnnotator.getDirContent("D:\\NLP\\ontologies")
}
if (false) {
    DirContentAnnotator.parseDocumentsDir("D:\\Total\\2020\\_testAnnotator", "test", function (err, result) {

    });
}


var sources = {
    "Total-CTG":
        {
            name: "Total-CTG",
            "editable": false,
            "controller": "Sparql_SKOS",
            "sparql_server": {
                "url": "http://51.178.139.80:8890/sparql"
            },
            "graphUri": "http://data.total.com/resource/thesaurus/ctg2/",
            "schemaType": "SKOS",
            "predicates": {
                "broaderPredicate": "skos:broader|^skos:hasTopConcept",
                "lang": "en"
            },

            "color": "#9edae5"
        }
}


if (false) {
    DirContentAnnotator.annotateParsedDocuments("test", [sources["Total-CTG"]], {}, function (err, result) {

    });
}


if (true) {
    DirContentAnnotator.getConceptsSubjectsTree("test", function (err, result) {

    });
}


//  DirContentAnnotator.startTikaServer()
if (false) {
    DirContentAnnotator.getDocTextContent("D:\\Total\\2020\\_testAnnotator\\sujet1\\sujet1-1\\sujet1-1-1\\test.docx", function (err, result) {
        var x = result
    })
}

