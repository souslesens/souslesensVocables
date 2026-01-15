import fs from 'fs';
import path from 'path';
import csvCrawler from './_csvCrawler.js';
import async from 'async';
import util from './util.js';
import httpProxy from './httpProxy.js';
import sqlServerProxy from './KG/SQLserverConnector.js';
import { databaseModel } from '../model/databases.js';
import ConfigManager from './configManager.js';
import SocketManager from './socketManager.js';

//var rootDir = "D:\\NLP\\ontologies\\CFIHOS\\CFIHOS V1.5\\CFIHOS V1.5 RDL";

var KGtripleBuilder = {
    message: function (clientSocketId, content, isError) {
        if (clientSocketId) {
            SocketManager.message(clientSocketId, "KGbuilder", content);
        }
        if (isError) {
            console.log(content);
        }
    },
    mappingFilePredicate: "http://souslesens.org/KGcreator#mappingFile",
    predefinedPart14Relations: [
        ["Location", "Location", "hasSubLocation"],
        ["Location", "Activity", "hasActivityPart"],
        ["Location", "FunctionalObject", "hasFunctionalPart"],
        ["Location", "System", "hasFunctionalPart"],
        ["Activity", "Activity", "hasActivityPart"],
        ["Activity", "Location", "residesIn"],
        ["Activity", "FunctionalObject", "hasParticipant"],
        ["Activity", "System", "hasParticipant"],
        ["FunctionalObject", "FunctionalObject", "hasFunctionalPart"],
        ["FunctionalObject", "Location", ""],
        ["FunctionalObject", "Activity", "participantIn"],
        ["FunctionalObject", "System", "functionalPartOf"],
        ["System", "System", "hasFunctionalPart"],
        ["System", "Location", "residesIn"],
        ["System", "Activity", "participantIn"],
        ["System", "FunctionalObject", "hasFunctionalPart"],
    ],

    sparqlPrefixes: {
        xs: "<http://www.w3.org/2001/XMLSchema#>",
        rdf: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
        rdfs: "<http://www.w3.org/2000/01/rdf-schema#>",
        owl: "<http://www.w3.org/2002/07/owl#>",
        skos: "<http://www.w3.org/2004/02/skos/core#>",
        iso14224: "<http://data.total.com/resource/tsf/iso_14224#>",
        req: "<https://w3id.org/requirement-ontology/rdl/>",
        part14: "<http://rds.posccaesar.org/ontology/lis14/rdl/>",
        iso81346: "<http://data.total.com/resource/tsf/IEC_ISO_81346/>",
        slsv: "<http://souslesens.org/resource/vocabulary/>",
        dcterms: "<http://purl.org/dc/terms/>",
    },

    getSparqlPrefixesStr: function () {
        var str = "";
        for (var key in KGtripleBuilder.sparqlPrefixes) {
            str += "PREFIX " + key + ": " + KGtripleBuilder.sparqlPrefixes[key] + " ";
        }
        return str;
    },
    isUri: function (str) {
        if (!str) {
            return false;
        }
        var prefixesArray = Object.keys(KGtripleBuilder.sparqlPrefixes);
        var array = str.split(":");
        if (array.length == 0) {
            return false;
        } else {
            if (prefixesArray.indexOf(array[0]) > -1 || array[0].indexOf("http") == 0) {
                return true;
            }
            return false;
        }
    },

    readCsv: function (filePath, maxLines, callback) {
        csvCrawler.readCsv({ filePath: filePath }, maxLines, function (err, result) {
            if (err) {
                return callback(err);
            }
            var data = result.data;
            var headers = result.headers;

            return callback(null, { headers: headers, data: data });
        });
    },

    getDescription: function (filePath) {
        var descriptionMap = {};

        KGtripleBuilder.readCsv(filePath, null, function (err, result) {
            descriptionMap = { filePath: filePath, headers: result.headers, length: result.data[0].length };

            fs.writeFileSync(filePath.replace(".txt", "description.json"), JSON.stringify(descriptionMap, null, 2));
        });
    },

    /**
     * Generate triples
     *
     * @param mappings - ?
     * @param {string} graphUri - URI of the graph to generate
     * @param {string} sparqlServerUrl - URL of the sparql endpoint
     * @param {Object} options - {sampleSize: , }
     * @param {Function} callback - Node-style async Function called to proccess result or handle error
     */
    createTriples: function (mappings, graphUri, sparqlServerUrl, options, callback) {
        //  var graphUri = "https://www.jip36-cfihos.org/ontology/cfihos_1_5/test/"
        var totalTriples = 0;
        var errors = "";
        var existingNodes = {};
        var propertiesTypeMap = {
            "rdfs:label": "string",
            "rdfs:comment": "string",

            "dcterms:format": "string",
            "owl:comment": "string",
            "skos:prefLabel": "string",
            "skos:definition": "string",
            "skos:notation": "string",
            "skos:example": "string",
            //   "cfihos:status": "string",
            "iso14224:priority": "string",
            "slsv:hasCode": "string",

            "rdf:type": "uri",
            "part14:functionalPartOf": "uri",
            "part14:assembledPartOf": "uri",
            "part14:hasFunctionalPart": "uri",
            "part14:hasAssembledPart": "uri",
            "part14:concretizes": "uri",
            "req:REQ_0020": "uri",
            "req:REQ_0021": "uri",
            "req:REQ_0022": "uri",
            "rdfs:subClassOf": "uri",
            _restriction: "uri",
        };
        var totalTriplesCount = 0;
        var totalTriples = 0;
        var missingLookups_s = 0;
        var missingLookups_o = 0;
        var okLookups_o = 0;
        var okLookups_s = 0;

        async.eachSeries(
            mappings,
            function (mapping, callbackEachMapping) {
                var lookUpMap = {};
                var triples = [];

                var csvData = [];
                var dataSource = mapping.dataSource;
                if (mapping.graphUri) {
                    graphUri = mapping.graphUri;
                }
                async.series(
                    [
                        // load Lookups
                        function (callbackSeries) {
                            if (mapping.lookups.length == 0) {
                                return callbackSeries();
                            }

                            async.eachSeries(
                                mapping.lookups,
                                function (lookup, callbackEachLookup) {
                                    if (mapping.csvDataFilePath) {
                                        var lookupFilePath = lookup.filePath;

                                        KGtripleBuilder.readCsv(lookupFilePath, null, function (err, result) {
                                            if (err) {
                                                return callbackEachLookup(err);
                                            }
                                            var lookupLines = result.data[0];
                                            lookUpMap[lookup.name] = { dictionary: {}, transformFn: lookup.transformFn };
                                            lookupLines.forEach(function (line, index) {
                                                if (![line[lookup.sourceColumn]] && line[lookup.targetColumn]) {
                                                    return KGtripleBuilder.message(options.clientSocketId, "missing lookup line" + index + " " + lookupFilePath, true);
                                                }
                                                lookUpMap[lookup.name].dictionary[line[lookup.sourceColumn]] = line[lookup.targetColumn];
                                            });

                                            callbackEachLookup();
                                        });
                                    } else if (mapping.databaseSource) {
                                        databaseModel
                                            .getConnection(mapping.databaseSource.dbName)
                                            .then((connection) => {
                                                connection
                                                    .distinct(lookup.sourceColumn, lookup.targetColumn)
                                                    .from(lookup.fileName)
                                                    .then((result) => {
                                                        var lookupLines = result.rows;
                                                        lookUpMap[lookup.name] = { dictionary: {}, transformFn: lookup.transformFn };
                                                        lookupLines.forEach(function (line, index) {
                                                            if (![line[lookup.sourceColumn]] && line[lookup.targetColumn]) {
                                                                return KGtripleBuilder.message(options.clientSocketId, "missing lookup line" + index + " " + lookupFilePath, true);
                                                            }

                                                            lookUpMap[lookup.name].dictionary[line[lookup.sourceColumn]] = line[lookup.targetColumn];
                                                        });

                                                        callbackEachLookup();
                                                    })
                                                    .catch((err) => {
                                                        return callbackEachLookup(err);
                                                    });
                                            })
                                            .catch((err) => {
                                                return callbackEachLookup(err);
                                            });
                                    }
                                },
                                function (err) {
                                    callbackSeries(err);
                                },
                            );
                        },

                        //load csv
                        function (callbackSeries) {
                            if (!mapping.csvDataFilePath) {
                                return callbackSeries();
                            }
                            KGtripleBuilder.message(options.clientSocketId, "loading data from csv file", false);
                            KGtripleBuilder.readCsv(mapping.csvDataFilePath, options.sampleSize, function (err, result) {
                                if (err) {
                                    KGtripleBuilder.message(options.clientSocketId, err, true);

                                    return callbackSeries(err);
                                }
                                KGtripleBuilder.message(options.clientSocketId, " data loaded", false);
                                csvData = result.data;
                                callbackSeries();
                            });
                        },

                        //load SQL dataSource
                        function (callbackSeries) {
                            if (!mapping.databaseSource) {
                                return callbackSeries();
                            }

                            databaseModel.getConnection(mapping.databaseSource.dbName).then((connection) => {
                                const request = connection.select("*").from(mapping.fileName);
                                if (options.sampleSize) {
                                    request.limit(options.sampleSize);
                                }

                                request
                                    .then((result) => {
                                        csvData = [result];
                                        KGtripleBuilder.message(options.clientSocketId, " data loaded", false);
                                        callbackSeries();
                                    })
                                    .catch((err) => {
                                        return callbackSeries(err);
                                    });
                            });
                        },
                        //fileProcessing
                        function (callbackSeries) {
                            if (!mapping.dataProcessing) {
                                return callbackSeries();
                            }
                            csvData.forEach(function (lines) {
                                mapping.dataProcessing(lines, function (err, result) {
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    lines = result;
                                    callbackSeries();
                                });
                            });
                        },

                        function (callbackSeries) {
                            function getNewBlankNodeId() {
                                return "<_:b" + util.getRandomHexaId(10) + ">";
                            }

                            function getLookupValue(lookupName, value, callback) {
                                var lookupArray = lookupName.split("|");
                                var target = null;
                                lookupArray.forEach(function (lookup, index) {
                                    if (index > 0) {
                                        var x = 3;
                                    }
                                    if (target) {
                                        return;
                                    }
                                    target = lookUpMap[lookup].dictionary[value];
                                    if (target && lookUpMap[lookup].transformFn) {
                                        try {
                                            target = lookUpMap[lookup].transformFn(target);
                                        } catch (e) {
                                            return callback(e);
                                        }
                                    }
                                });
                                if (target == null) {
                                    var x = 3;
                                }
                                return target;
                            }

                            var allColumns = {};
                            async.eachSeries(
                                csvData,
                                function (lines, callbackEachLines) {
                                    async.series(
                                        [
                                            function (callbackSeries2) {
                                                async.eachSeries(
                                                    lines,
                                                    function (line, callbackEachLines2) {
                                                        //   lines.forEach(function (line, _indexLine) {
                                                        //clean line content

                                                        var subjectStr = null;
                                                        var objectStr = null;
                                                        var currentBlankNode = null;
                                                        var lineError = "";
                                                        var blankNodesMap = {};

                                                        mapping.tripleModels.forEach(function (item) {
                                                            for (var key in line) {
                                                                if (!allColumns[key]) {
                                                                    allColumns[key] = 1;
                                                                }
                                                                line[key] = "" + line[key];
                                                                if (line[key] && !KGtripleBuilder.isUri(line[key])) {
                                                                    line[key] = util.formatStringForTriple(line[key]);
                                                                }
                                                            }

                                                            if (line[item.s] == "null") {
                                                                line[item.s] = null;
                                                            }
                                                            if (line[item.o] == "null") {
                                                                line[item.o] = null;
                                                            }

                                                            if (item["if_column_value_not_null"]) {
                                                                var value = line[item["if_column_value_not_null"]];
                                                                if (!value || value == "null") {
                                                                    return;
                                                                }
                                                            }

                                                            subjectStr = null;
                                                            objectStr = null;

                                                            //get value for Subject
                                                            {
                                                                if (item.subjectIsSpecificUri) {
                                                                    subjectStr = item.s;
                                                                } else if (typeof item.s === "function") {
                                                                    try {
                                                                        subjectStr = item.s(line, item);
                                                                    } catch (e) {
                                                                        return (lineError = e);
                                                                    }
                                                                } else if (item.isSubjectBlankNode) {
                                                                    if (!line[item.s]) {
                                                                        return;
                                                                    }
                                                                    var blankNode = blankNodesMap[item.s];
                                                                    if (!blankNode) {
                                                                        blankNode = getNewBlankNodeId();
                                                                        blankNodesMap[item.s] = blankNode;
                                                                    }
                                                                    subjectStr = blankNode;
                                                                } else if (item.s === "_rowIndex") {
                                                                    var blankNode = blankNodesMap["_rowIndex"];
                                                                    if (!blankNode) {
                                                                        blankNode = getNewBlankNodeId();
                                                                        blankNodesMap["_rowIndex"] = blankNode;
                                                                    }
                                                                    subjectStr = blankNode;
                                                                } else if (item.s.endsWith("_$")) {
                                                                    // virtual column
                                                                    if (typeof item.o === "string" && item.o.endsWith("_$") && allColumns[item.o] && !line[item.o]) {
                                                                        // ne pas creer des triplest sans objet

                                                                        return;
                                                                    }
                                                                    var blankNode = blankNodesMap[item.s];
                                                                    if (!blankNode) {
                                                                        blankNode = getNewBlankNodeId();
                                                                        blankNodesMap[item.s] = blankNode;
                                                                    }
                                                                    subjectStr = blankNode;
                                                                } else if (mapping.transform && line[item.s] && mapping.transform[item.s]) {
                                                                    try {
                                                                        subjectStr = mapping.transform[item.s](line[item.s], "s", item.p, line, item);
                                                                    } catch (e) {
                                                                        return (lineError = e + " " + item.s);
                                                                    }
                                                                } else if (item.s.match(/.+:.+|http.+/)) {
                                                                    subjectStr = item.s;
                                                                } else {
                                                                    if (!line[item.s]) {
                                                                        return;
                                                                    }
                                                                    subjectStr = line[item.s];
                                                                }

                                                                if (item.lookup_s) {
                                                                    if (!lookUpMap[item.lookup_s]) {
                                                                        return (lineError = "no lookup named " + item.lookup_s);
                                                                    }
                                                                    var lookupValue = getLookupValue(item.lookup_s, subjectStr);
                                                                    if (!lookupValue) {
                                                                        missingLookups_s += 1;
                                                                    } else {
                                                                        subjectStr = lookupValue;
                                                                        okLookups_s += 1;
                                                                    }
                                                                }
                                                                if (!subjectStr) {
                                                                    return;
                                                                }
                                                            }

                                                            //get value for Object
                                                            {
                                                                if (item.o === "_rowIndex") {
                                                                    var blankNode = blankNodesMap["_rowIndex"];
                                                                    if (!blankNode) {
                                                                        blankNode = getNewBlankNodeId();
                                                                        blankNodesMap["_rowIndex"] = blankNode;
                                                                    }
                                                                    objectStr = blankNode;
                                                                } else if (item.objectIsSpecificUri) {
                                                                    objectStr = item.o;
                                                                } else if (typeof item.o === "function") {
                                                                    try {
                                                                        ate;
                                                                        objectStr = item.o(line, item);
                                                                        objectStr = util.formatStringForTriple(objectStr, false);
                                                                    } catch (e) {
                                                                        return (lineError = e);
                                                                    }
                                                                } else if (item.o.endsWith("_$")) {
                                                                    var blankNode = blankNodesMap[item.o];
                                                                    if (!blankNode) {
                                                                        blankNode = getNewBlankNodeId();
                                                                        blankNodesMap[item.o] = blankNode;
                                                                    }
                                                                    objectStr = blankNode;
                                                                } else if (item.o.match(/http.+/)) {
                                                                    objectStr = "<" + item.o + ">";
                                                                } else if (item.o.match(/.+:.+/)) {
                                                                    objectStr = item.o;
                                                                } else {
                                                                    if (!line[item.o] || line[item.o] == "null") {
                                                                        return;
                                                                    }

                                                                    if (item.isObjectBlankNode) {
                                                                        var blankNode = blankNodesMap[item.o];
                                                                        if (!blankNode) {
                                                                            blankNode = getNewBlankNodeId();
                                                                            blankNodesMap[item.o] = blankNode;
                                                                        }
                                                                        objectStr = blankNode;
                                                                    } else if (item.dataType) {
                                                                        var str = line[item.o];
                                                                        if (!str || str == "null") {
                                                                            return;
                                                                        }
                                                                        if (item.dataType == "xsd:dateTime") {
                                                                            var isDate = function (date) {
                                                                                return new Date(date) !== "Invalid Date" && !isNaN(new Date(date)) ? true : false;
                                                                            };

                                                                            var formatDate = function (date) {
                                                                                return new Date(date).toISOString(); //.slice(0, 10);
                                                                            };

                                                                            if (!isDate(str)) {
                                                                                var date = util.convertFrDateStr2Date(str);
                                                                                if (!date) return;
                                                                                else str = date.toISOString();
                                                                            } else {
                                                                                str = formatDate(str);
                                                                            }
                                                                        }

                                                                        item.p = "owl:hasValue";

                                                                        objectStr = "'" + str + "'^^" + item.dataType;
                                                                    } else if (mapping.transform && line[item.o] && mapping.transform[item.o]) {
                                                                        try {
                                                                            objectStr = mapping.transform[item.o](line[item.o], "o", item.p, line, item);
                                                                        } catch (e) {
                                                                            return (lineError = e + " " + item.o);
                                                                        }
                                                                    } else {
                                                                        objectStr = line[item.o];
                                                                    }

                                                                    if (item.lookup_o) {
                                                                        if (!lookUpMap[item.lookup_o]) {
                                                                            return (lineError = "no lookup named " + item.lookup_o);
                                                                        }
                                                                        var lookupValue = getLookupValue(item.lookup_o, objectStr);
                                                                        if (!lookupValue) {
                                                                            missingLookups_o += 1;
                                                                        } else {
                                                                            okLookups_o += 1;
                                                                            objectStr = lookupValue;
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                            if (!objectStr || objectStr == "null") {
                                                                return;
                                                            }

                                                            //format subject
                                                            {
                                                                subjectStr = subjectStr.trim();

                                                                if (subjectStr.indexOf && subjectStr.indexOf("http") == 0) {
                                                                    subjectStr = "<" + subjectStr + ">";
                                                                } else if (subjectStr.indexOf && subjectStr.indexOf(":") > -1) {
                                                                    //pass
                                                                } else {
                                                                    subjectStr = "<" + graphUri + util.formatStringForTriple(subjectStr, true) + ">";
                                                                }
                                                            }

                                                            //format object
                                                            {
                                                                objectStr = objectStr.trim();
                                                                if (objectStr.indexOf && objectStr.indexOf("http") == 0) {
                                                                    objectStr = "<" + objectStr + ">";
                                                                } else if (item.datatype) {
                                                                    //pass
                                                                } else if (objectStr.indexOf && objectStr.indexOf(":") > -1 && objectStr.indexOf(" ") < 0) {
                                                                    // pass
                                                                } else if (item.isString) {
                                                                    objectStr = "'" + util.formatStringForTriple(objectStr, false) + "'";
                                                                } else if (propertiesTypeMap[item.p] == "string") {
                                                                    if (objectStr.indexOf("xsd:") < 0) {
                                                                        objectStr = "'" + util.formatStringForTriple(objectStr, false) + "'";
                                                                    }
                                                                } else if (objectStr.indexOf("xsd:") > -1) {
                                                                    //pass
                                                                } else {
                                                                    /* if(!item.isString)
objectStr=objectStr.replace(/[\-_]/g,"")*/
                                                                    objectStr = "<" + graphUri + util.formatStringForTriple(objectStr, true) + ">";
                                                                }
                                                            }

                                                            if (item.isRestriction) {
                                                                var propStr = item.p;
                                                                if (typeof item.p === "function") {
                                                                    try {
                                                                        propStr = item.p(line, item);
                                                                    } catch (e) {
                                                                        return (lineError = e);
                                                                    }
                                                                }

                                                                var blankNode = "<_:b" + util.getRandomHexaId(10) + ">";
                                                                var prop = propStr;
                                                                if (prop.indexOf("$") == 0) {
                                                                    prop = KGtripleBuilder.getUserPredicateUri(item.p, line, graphUri);
                                                                }
                                                                if (prop.indexOf("http") == 0) {
                                                                    prop = "<" + prop + ">";
                                                                }

                                                                if (!existingNodes[subjectStr + "_" + prop + "_" + objectStr]) {
                                                                    existingNodes[subjectStr + "_" + prop + "_" + objectStr] = 1;
                                                                    triples.push({
                                                                        s: blankNode,
                                                                        p: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
                                                                        o: "<http://www.w3.org/2002/07/owl#Restriction>",
                                                                    });
                                                                    triples.push({
                                                                        s: blankNode,
                                                                        p: "<http://www.w3.org/2002/07/owl#onProperty>",
                                                                        o: prop,
                                                                    });
                                                                    if (objectStr) {
                                                                        triples.push({
                                                                            s: blankNode,
                                                                            p: "<http://www.w3.org/2002/07/owl#someValuesFrom>",
                                                                            o: objectStr,
                                                                        });
                                                                    }
                                                                    triples.push({
                                                                        s: subjectStr,
                                                                        p: "rdfs:subClassOf",
                                                                        o: blankNode,
                                                                    });

                                                                    if (item.inverseRestrictionProperty) {
                                                                        propStr = item.inverseRestrictionProperty;

                                                                        // blankNode = "<_:b" + util.getRandomHexaId(10) + ">";
                                                                        blankNode = getNewBlankNodeId();
                                                                        prop = propStr;
                                                                        if (prop.indexOf("$") == 0) {
                                                                            prop = KGtripleBuilder.getUserPredicateUri(item.p, line, graphUri);
                                                                        }
                                                                        if (prop.indexOf("http") == 0) {
                                                                            prop = "<" + prop + ">";
                                                                        }

                                                                        if (!existingNodes[objectStr + "_" + prop + "_" + subjectStr]) {
                                                                            existingNodes[subjectStr + "_" + prop + "_" + objectStr] = 1;

                                                                            triples.push({
                                                                                s: blankNode,
                                                                                p: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
                                                                                o: "<http://www.w3.org/2002/07/owl#Restriction>",
                                                                            });
                                                                            triples.push({
                                                                                s: blankNode,
                                                                                p: "<http://www.w3.org/2002/07/owl#onProperty>",
                                                                                o: prop,
                                                                            });
                                                                            if (objectStr) {
                                                                                triples.push({
                                                                                    s: blankNode,
                                                                                    p: "<http://www.w3.org/2002/07/owl#someValuesFrom>",
                                                                                    o: subjectStr,
                                                                                });
                                                                            }
                                                                            triples.push({
                                                                                s: objectStr,
                                                                                p: "rdfs:subClassOf",
                                                                                o: blankNode,
                                                                            });
                                                                        }
                                                                    }
                                                                }

                                                                return;
                                                            }

                                                            //not restriction
                                                            else {
                                                                // get value for property
                                                                var propertyStr = item.p;

                                                                /*  if (item.isSpecificPredicate) {
propertyStr = line[item.p];
} else*/
                                                                if (typeof item.p === "function") {
                                                                    try {
                                                                        propertyStr = item.p(line, item);
                                                                    } catch (e) {
                                                                        return (lineError = e);
                                                                    }
                                                                } else if (item.p.indexOf("$") == 0) {
                                                                    propertyStr = KGtripleBuilder.getUserPredicateUri(item.p, line, graphUri);
                                                                }
                                                                if (!propertyStr) {
                                                                    var x = 3;
                                                                    return;
                                                                }
                                                                if (propertyStr.indexOf("http") == 0) {
                                                                    propertyStr = "<" + propertyStr + ">";
                                                                }
                                                                if (subjectStr && objectStr) {
                                                                    if (true || !item.datatype) {
                                                                        if (!existingNodes[subjectStr + "_" + propertyStr + "_" + objectStr]) {
                                                                            existingNodes[subjectStr + "_" + propertyStr + "_" + objectStr] = 1;
                                                                            triples.push({
                                                                                s: subjectStr,
                                                                                p: propertyStr,
                                                                                o: objectStr,
                                                                            });
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        });
                                                        return callbackEachLines2(lineError);
                                                    },
                                                    function (err) {
                                                        callbackSeries2(err);
                                                    },
                                                );
                                            },
                                            //write triples
                                            function (callbackSeries2) {
                                                if (options.sampleSize) {
                                                    var sampleTriples = triples.slice(0, options.sampleSize);
                                                    // return callbackSeries2("sample", sampleTriples);
                                                    return callback(null, sampleTriples);
                                                }

                                                var uniqueSubjects = {};
                                                var metaDataTriples = [];
                                                triples.forEach(function (triple) {
                                                    if (!uniqueSubjects[triple.s]) {
                                                        uniqueSubjects[triple.s] = 1;

                                                        metaDataTriples = metaDataTriples.concat(KGtripleBuilder.getMetaDataTriples(triple.s, { mappingFileName: mapping.fileName }));
                                                    }
                                                });
                                                triples = triples.concat(metaDataTriples);

                                                KGtripleBuilder.message(options.clientSocketId, "mapping " + mapping.fileName + " : writing triples:" + triples.length);

                                                var slices = util.sliceArray(triples, 200);
                                                triples = [];
                                                var sliceIndex = 0;
                                                async.eachSeries(
                                                    slices,
                                                    function (slice, callbackEach) {
                                                        if (KGtripleBuilder.stopCreateTriples) {
                                                            var message = "mapping " + mapping.fileName + " : import interrupted by user";
                                                            //  KGtripleBuilder.message(options.clientSocketId,message)
                                                            return callbackEach(message);
                                                        }

                                                        /*  if (options.deleteTriples) {
KGtripleBuilder.deleteTriples(slice, graphUri, sparqlServerUrl, function (err, result) {
if (err) {
errors += err + " slice " + sliceIndex + "\n";
return callbackEach(err);
}
sliceIndex += 1;

totalTriples += result;

callbackEach();
});
} else {*/

                                                        if (false) {
                                                            //check unicity of each triples (takes time)
                                                            KGtripleBuilder.writeUniqueTriples(slice, graphUri, sparqlServerUrl, function (err, result) {
                                                                if (err) {
                                                                    errors += err + " slice " + sliceIndex + "\n";
                                                                    return callbackEach(err);
                                                                }
                                                                sliceIndex += 1;
                                                                totalTriples += result;
                                                                KGtripleBuilder.message(options.clientSocketId, "mapping " + mapping.fileName + " : writen triples:" + totalTriples);

                                                                callbackEach();
                                                            });
                                                        } else {
                                                            KGtripleBuilder.writeTriples(slice, graphUri, sparqlServerUrl, function (err, result) {
                                                                if (err) {
                                                                    errors += err + " slice " + sliceIndex + "\n";
                                                                    return callbackEach(err);
                                                                }
                                                                sliceIndex += 1;
                                                                totalTriples += result;
                                                                KGtripleBuilder.message(options.clientSocketId, "mapping " + mapping.fileName + " : writen triples:" + totalTriples);

                                                                callbackEach();
                                                            });
                                                        }
                                                    },
                                                    function (err) {
                                                        //   KGtripleBuilder.message(  options.clientSocketId,"total triples writen:" + totalTriples)

                                                        callbackSeries2(err);
                                                    },
                                                );
                                            },
                                        ],

                                        function (err) {
                                            callbackEachLines(err);
                                        },
                                    );
                                },
                                function (err) {
                                    callbackSeries(err);
                                },
                            );
                        },
                    ],

                    function (_err) {
                        var message = "------------ created triples " + totalTriples;
                        if (options.deleteTriples) {
                            message = "------------ deleted triples " + totalTriples;
                        }

                        KGtripleBuilder.message(options.clientSocketId, message);
                        callbackEachMapping(_err);
                    },
                );
            },
            function (_err) {
                if (callback) {
                    var message = "------------ created triples " + totalTriples;
                    if (options.deleteTriples) {
                        message = "------------ deleted triples " + totalTriples;
                    }
                    KGtripleBuilder.message(options.clientSocketId, message);
                    return callback(_err, message);
                }
            },
        );
    },

    deleteMappingFileTriples: function (mappings, sparqlServerUrl, callback) {
        var query = "";
        query += "with  GRAPH <" + mappings.graphUri + "> " + "delete {?s ?p ?o} where {?s ?p ?o. ?s <" + KGtripleBuilder.mappingFilePredicate + "> '" + mappings.fileName + "'}";
        var params = { query: query };
        if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
            params.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };
        }
        httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
            if (err) {
                var x = query;
                return callback(err);
            }

            return callback(null, result.results.bindings[0]["callret-0"].value);
        });
    },

    deleteTriples: function (triples, graphUri, sparqlServerUrl, callback) {
        var insertTriplesStr = "";
        var totalTriples = 0;
        triples.forEach(function (triple) {
            var str = triple.s + " " + triple.p + " " + triple.o + ". ";
            insertTriplesStr += str;
        });
        var query = KGtripleBuilder.getSparqlPrefixesStr();
        query += "DELETE DATA {  GRAPH <" + graphUri + "> {  " + insertTriplesStr + " }  } ";
        var params = { query: query };
        if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
            params.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };
        }

        httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
            if (err) {
                var x = query;
                return callback(err);
            }
            totalTriples += triples.length;
            return callback(null, totalTriples);
        });
    },
    writeUniqueTriples: function (triples, graphUri, sparqlServerUrl, callback) {
        //var tempGraphUri="http://souslesesn.org/temp/"+util.getRandomHexaId(5)+"/"
        var tempGraphUri = graphUri + "temp/";

        async.series(
            [
                //insert triple into tempoary graph
                function (callbackSeries) {
                    KGtripleBuilder.writeTriples(triples, tempGraphUri, sparqlServerUrl, function (err, result) {
                        return callbackSeries(err);
                        callbackSeries();
                    });
                },

                //getDifference
                function (callbackSeries) {
                    var query = "" + "select count distinct *  " + "WHERE {" + "  GRAPH <" + tempGraphUri + "> { ?s ?p ?o }" + "  FILTER NOT EXISTS { GRAPH <" + graphUri + "> { ?s ?p ?o } }" + "}";

                    var params = { query: query };

                    if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
                        params.auth = {
                            user: ConfigManager.config.sparql_server.user,
                            pass: ConfigManager.config.sparql_server.password,
                            sendImmediately: false,
                        };
                    }

                    httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        callbackSeries();
                    });
                },

                //writeDifference
                function (callbackSeries) {
                    var query =
                        "" +
                        // "WITH <" +graphUri+"> "+
                        "insert {GRAPH <" +
                        graphUri +
                        "> {?s ?p ?o}} " +
                        "WHERE {" +
                        "  GRAPH <" +
                        tempGraphUri +
                        "> { ?s ?p ?o }" +
                        "  FILTER NOT EXISTS { GRAPH <" +
                        graphUri +
                        "> { ?s ?p ?o } }" +
                        "}";

                    var params = { query: query };

                    if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
                        params.auth = {
                            user: ConfigManager.config.sparql_server.user,
                            pass: ConfigManager.config.sparql_server.password,
                            sendImmediately: false,
                        };
                    }

                    httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        callbackSeries();
                    });
                },

                // delete tempGraph
                function (callbackSeries) {
                    var query = "clear Graph  <" + tempGraphUri + "> ";
                    var params = { query: query };

                    if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
                        params.auth = {
                            user: ConfigManager.config.sparql_server.user,
                            pass: ConfigManager.config.sparql_server.password,
                            sendImmediately: false,
                        };
                    }

                    httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
                        if (err) {
                            return callback(err);
                        }
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                return callback(err, triples.length);
            },
        );
    },
    /**
     * Write <triples> in <graphUri> at <sparqlServerUrl>
     *
     * @param {Array} triples - array of {s: ,p: ,o: }
     * @param {string} graphUri - URI to name the graph that will be written
     * @param {string} sparqlServerUrl - URL of the sparql endpoint where to write the graph
     * @param {Function} callback - Node-style async Function called to proccess result or handle error
     */
    writeTriples: function (triples, graphUri, sparqlServerUrl, callback) {
        var insertTriplesStr = "";
        var totalTriples = 0;
        triples.forEach(function (triple) {
            var str = triple.s + " " + triple.p + " " + triple.o + ". ";
            insertTriplesStr += str;
        });

        var queryGraph = KGtripleBuilder.getSparqlPrefixesStr();

        queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";

        var params = { query: queryGraph };

        if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
            params.auth = {
                user: ConfigManager.config.sparql_server.user,
                pass: ConfigManager.config.sparql_server.password,
                sendImmediately: false,
            };
        }

        httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
            if (err) {
                var x = queryGraph;
                return callback(err);
            }
            totalTriples += triples.length;
            return callback(null, totalTriples);
        });
    },

    getMetaDataTriples: function (subjectUri, options) {
        var creator = "KGcreator";
        var dateTime = "'" + util.dateToRDFString(new Date(), true) + "'^^xsd:dateTime";

        if (!options) {
            options = {};
        }
        var metaDataTriples = [];

        metaDataTriples.push({
            s: subjectUri,
            p: "<http://purl.org/dc/terms/created>",
            o: dateTime,
        });
        metaDataTriples.push({
            s: subjectUri,
            p: "<" + KGtripleBuilder.mappingFilePredicate + ">",
            o: "'" + options.mappingFileName + "'",
        });

        if (options.customMetaData) {
            for (var predicate in options.customMetaData) {
                metaDataTriples.push({
                    s: subjectUri,
                    p: "<" + predicate + ">",
                    o: options.customMetaData[predicate],
                });
            }
        }

        return metaDataTriples;
    },
    /**
     * Delete graph named <graphUri> from sparql endpoint at <sparqlServerUrl>
     *
     * @param {string} graphUri - URI of the graph to delete
     * @param {string} sparqlServerUrl - URL of the sparql endpoint
     * @param {Function} callback - Node-style async Function called to proccess result or handle error
     */
    clearGraph: function (graphUri, sparqlServerUrl, callback) {
        async.series(
            [
                function (callbackSeries) {
                    if (sparqlServerUrl) {
                        return callbackSeries();
                    }
                    ConfigManager.getGeneralConfig(function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        sparqlServerUrl = result.sparql_server.url;
                        callbackSeries();
                    });
                },
                function (_callbackSeries) {
                    var query = "clear graph   <" + graphUri + ">";
                    var params = { query: query };

                    if (ConfigManager.config && sparqlServerUrl.indexOf(ConfigManager.config.sparql_server.url) == 0) {
                        params.auth = {
                            user: ConfigManager.config.sparql_server.user,
                            pass: ConfigManager.config.sparql_server.password,
                            sendImmediately: false,
                        };
                    }

                    httpProxy.post(sparqlServerUrl, null, params, function (err, _result) {
                        if (err) {
                            return callback(err);
                        }

                        return callback(null);
                    });
                },
            ],
            function (err) {
                return callback(err, "graph cleared");
            },
        );
    },
    /**
     * Generate triples from a CSV file
     *
     * @param {string} dirName - the subdirectory of <src-dir>/data where to look for <mappingFileName>
     * @param {string} mappingFileName - name of the csv file to generate triples from (optional if null create triples from all mappings)
     * @param {Object} options - keys: sparqlServerUrl, deleteOldGraph, graphUri
     * @param {Function} callback - Node-style async Function called to proccess result or handle error
     */
    createTriplesFromCsv: function (dirName, mappingFileName, options, callback) {
        var sparqlServerUrl;
        var output = "";
        var clientSocketId = options.clientSocketId;
        var allMappingFiles = [];

        KGtripleBuilder.stopCreateTriples = false;
        SocketManager.clientSockets[options.clientSocketId].on("KGbuilder", function (message) {
            if (message == "stopCreateTriples") {
                KGtripleBuilder.stopCreateTriples = true;
            }
        });

        async.series(
            [
                function (callbackSeries) {
                    if (options.sparqlServerUrl) {
                        sparqlServerUrl = options.sparqlServerUrl;
                        return callbackSeries();
                    }
                    ConfigManager.getGeneralConfig(function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        sparqlServerUrl = result.sparql_server.url;
                        callbackSeries();
                    });
                },
                // delete old graph (optional)
                function (callbackSeries) {
                    if (!options.deleteOldGraph) {
                        return callbackSeries();
                    }
                    KGtripleBuilder.clearGraph(options.graphUri, sparqlServerUrl, function (err, _result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        KGtripleBuilder.message(options.clientSocketId, "graph deleted");

                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    if (mappingFileName) {
                        allMappingFiles = [mappingFileName];

                        return callbackSeries();
                    }
                    try {
                        var mappingsDirPath = path.join(__dirname, "../data/" + dirName);
                        var files = fs.readdirSync(mappingsDirPath);
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            if (file.indexOf(".json") > -1) {
                                allMappingFiles.push(file);
                            }
                        }
                    } catch (e) {
                        return callbackSeries(e);
                    }

                    return callbackSeries();
                },

                // read mapping file and prepare mappings
                function (callbackSeries) {
                    async.eachSeries(
                        allMappingFiles,
                        function (mappingFileName, callbackEach) {
                            var mappingsFilePath = path.join(__dirname, "../data/" + dirName + "/" + mappingFileName);
                            var mappings = "" + fs.readFileSync(mappingsFilePath);
                            mappings = JSON.parse(mappings);
                            if (typeof options.dataLocation == "string") {
                                mappings.csvDataFilePath = path.join(__dirname, "../data/" + dirName + "/" + options.dataLocation);
                            } else {
                                mappings.datasource = options.dataLocation;
                            }

                            if (options.deleteTriples) {
                                KGtripleBuilder.deleteMappingFileTriples(mappings, sparqlServerUrl, function (err, result) {
                                    if (err) {
                                        return callbackEach(err);
                                    }
                                    output = result;
                                    return callbackEach(null, "DELETE Mapping File triples  : " + mappings.fileName + "  " + result);
                                });
                            } else {
                                function getFunction(argsArray, fnStr, callback) {
                                    try {
                                        fnStr = fnStr.replace(/[/r/n/t]gm/, "");
                                        var array = /\{(?<body>.*)\}/.exec(fnStr);
                                        if (!array) {
                                            return callbackSeries("cannot parse object function " + JSON.stringify(item) + " missing enclosing body into 'function{..}'");
                                        }
                                        var fnBody = array.groups["body"];
                                        fnBody = "try{" + fnBody + "}catch(e){\rreturn console.log(e)\r}";
                                        var fn = new Function(argsArray, fnBody);
                                        return callback(null, fn);
                                    } catch (err) {
                                        return callback("error in object function " + fnStr + "\n" + err);
                                    }
                                }

                                // format functions
                                if (!mappings.tripleModels) {
                                    return callbackEach();
                                }

                                mappings.tripleModels.forEach(function (item) {
                                    if (item.s.indexOf("function{") > -1) {
                                        getFunction(["row", "mapping"], item.s, function (err, fn) {
                                            if (err) {
                                                return callbackSeries(err + " in mapping" + JSON.stringify(item));
                                            }
                                            item.s = fn;
                                        });
                                    }
                                    if (item.o.indexOf("function{") > -1) {
                                        getFunction(["row", "mapping"], item.o, function (err, fn) {
                                            if (err) {
                                                return callbackSeries(err + " in mapping" + JSON.stringify(item));
                                            }

                                            item.o = fn;
                                        });
                                    }

                                    if (item.p.indexOf("function{") > -1) {
                                        getFunction(["row", "mapping"], item.p, function (err, fn) {
                                            if (err) {
                                                return callbackSeries(err + " in mapping" + JSON.stringify(item));
                                            }

                                            item.p = fn;
                                        });
                                    }
                                });
                                for (var key in mappings.transform) {
                                    var fnStr = mappings.transform[key];
                                    if (fnStr.indexOf("function{") > -1) {
                                        getFunction(["value", "role", "prop", "row", "mapping"], fnStr, function (err, fn) {
                                            if (err) {
                                                return callbackSeries(err + " in mapping" + JSON.stringify(fnStr));
                                            }
                                            mappings.transform[key] = fn;
                                        });
                                    }
                                }

                                // format lookups
                                mappings.lookups.forEach(function (item) {
                                    var lookupFilePath = path.join(__dirname, "../../data/" + dirName + "/" + item.fileName);
                                    item.filePath = lookupFilePath;
                                    if (item.transformFn) {
                                        getFunction(["value", "role", "prop", "row", "mapping"], item.transformFn, function (err, fn) {
                                            if (err) {
                                                return callbackSeries(err + " in mapping" + JSON.stringify(item));
                                            }
                                            item.transformFn = fn;
                                        });
                                    }
                                });

                                // add prefixes (for upper ontology)
                                if (mappings.prefixes) {
                                    for (var prefix in mappings.prefixes) KGtripleBuilder.sparqlPrefixes[prefix] = "<" + mappings.prefixes[prefix] + ">";
                                }

                                var mappingsMap = { [mappings.csvDataFilePath]: mappings };
                                options.customMetaData = { [KGtripleBuilder.mappingFilePredicate]: mappings.fileName };
                                KGtripleBuilder.createTriples(mappingsMap, mappings.graphUri, sparqlServerUrl, options, function (err, result) {
                                    KGtripleBuilder.message(options.clientSocketId, "creating triples for mapping " + mappings.fileName);
                                    if (err) {
                                        return callbackSeries(err);
                                    }
                                    if (options.sampleSize) {
                                        output = result;
                                        return callbackEach(err, output);
                                    } else {
                                        output = { countCreatedTriples: result };
                                    }
                                    callbackEach();
                                });
                            }
                        },
                        function (err) {
                            callbackSeries(err);
                        },
                    );
                },
            ],
            function (err) {
                if (err == "sample") {
                    err = null;
                }
                return callback(err, output);
            },
        );
    },
    getUserPredicateUri: function (predicate, line, graphUri) {
        if (predicate.indexOf("$") == 0) {
            if (predicate.indexOf("http") < 0 && predicate.indexOf(":") < 0) {
                return graphUri + util.formatStringForTriple(line[predicate.substring(1)], true);
            } else {
                return line[predicate.substring(1)];
            }
        } else {
            return predicate;
        }
    },
};

export default KGtripleBuilder;