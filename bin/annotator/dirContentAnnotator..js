var fs = require('fs')
var path = require('path')
var TikaClient = require('tika-server-client');
var async = require('async')
var annotatorLive=require('../annotatorLive.')


var acceptedExtensions = ["ttl", "doc", "docx", "xls", "xslx", "pdf", "odt", "ods", "ppt", "pptx", "html", "htm", "txt", "csv"];
var maxDocSize = 20 * 1000 * 1000;
var tikaServerUrl = 'http://vps475829.ovh.net:9998'
var tika = null;
var DirContentAnnotator = {

    socket: {
        message: function (text) {
            console.log(text)
        }
    },


    getDocTextFromTika: function (filePath, callback) {
        if (!tika)
            tika = new TikaClient(tikaServerUrl);
        tika.tikaFromFile(filePath)
            .then(function (text) {
                callback(null, text);
            }).error(function (err) {
            callback(err);
        });

    },


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

        /*   var dirMap = {}
           var parentsMap = {}
           var topNodes = []
           dirsArray.forEach(function (item) {


               var array = item.parent.substring(item.parent.indexOf(rootDirName)).split("\\")
               var parent
               array.forEach(function (child, index) {

                   if (child == "")
                       return;

                   if ( index == 0) {
                       parent = rootDirName
                       if (topNodes.indexOf(child) < 0)
                           topNodes.push(child)
                   } else {
                       parent = array[index - 1]
                   }
                   if (!dirMap[parent])
                       dirMap[parent] = {level: index, childrenFiles: [], childrenDirs: []}

                   if (dirMap[parent].childrenDirs.indexOf(child) < 0)
                       dirMap[parent].childrenDirs.push(child);




               })

               var child =item.name
               if (!dirMap[item.name])
                   dirMap[item.name] = {level:array.length-1, childrenFiles: [], childrenDirs: []}





           })*/

        var files = []
        for (var dir in dirFilesMap) {
            var subjects = dir.substring(dir.indexOf(rootDirName)).split("\\")
            //    subjects=subjects.splice(subjects.length,1)

            dirFilesMap[dir].forEach(function (file) {
                files.push({path: file.parent + file.name, infos: file.infos, subjects: subjects})

            })
        }


        return callback(null, files)


    }


    , annotateDirContent: function (rooDirPath, sources, callback) {
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
                    async.eachSeries(files, function (file, callbackEach) {
                        DirContentAnnotator.socket.message("extracting text from " + file.path)
                        DirContentAnnotator.getDocTextFromTika(file.path, function (err, result) {
                            index += 1
                            if (err) {
                                files[index].error = err
                                return callbackEach()
                            }
                            else {

                                annotatorLive.annotate(result, sources, function (err, result) {
                                    files[index].annnotation = result;
                                })
                            }





                        })
                    }, function (err) {
                        callbackSeries(err)
                    })

                }
            ], function (err) {
                var xx = files
                DirContentAnnotator.socket.message(err);
            }
        )
    }


}

module.exports = DirContentAnnotator;
if (false) {

    DirContentAnnotator.getDirContent("D:\\NLP\\ontologies")
}
if (false) {
    var filePath = "D:\\NLP\\ontologies\\incose_ISO_TC67_MBSE_JCL.docx"
    var filePath = "D:\\Total\\2020\\JeanCharles\\Proposition  de prestation Total EP Quantum-next-gen 1.pptx"
    DirContentAnnotator.getDocTextFromTika(filePath)


}
if (true) {
    var sources=[
        {
            "controller": "Sparql_SKOS",
            "sparql_server": {
                "url": "http://vps-c46025b8.vps.ovh.net:8890/sparql/"
            },
            "graphUri": "http://skos.um.es/unesco6/",
            "schemaType": "SKOS",
            "predicates": {
                "topConceptFilter": "  ?topConcept skos:prefLabel ?topConceptLabel.filter( NOT EXISTS{?topConcept skos:broader ?x})",
                "lang": "en"
            },
            "color": "#98df8a"
        }

    ]

    DirContentAnnotator.annotateDirContent("D:\\Total\\2020\\_testAnnotator",sources)
}
