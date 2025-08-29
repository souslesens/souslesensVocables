const async = require("async");
const sqlServerProxy = require("../KG/SQLserverConnector.");
const util = require("../util.");
const KGbuilder_socket = require("./KGbuilder_socket");
const KGbuilder_triplesWriter = require("./KGbuilder_triplesWriter");
var csvCrawler = require("../_csvCrawler.");
const dataController = require("../dataController.");
const path = require("path");
const { databaseModel } = require("../../model/databases");
var KGbuilder_triplesMaker = {
    mappingFilePredicate: "http://souslesens.org/KGcreator#mappingFile",
    existingTriples: {},
    /**
     * Generate triples
     *
     * @param mappings - ?
     * @param {string} graphUri - URI of the graph to generate
     * @param {string} sparqlServerUrl - URL of the sparql endpoint
     * @param {Object} options - {sampleSize: , }
     * @param {Function} callback - Node-style async Function called to proccess result or handle error
     **/
    createTriples: function (tableMappings, data, options, callback) {
        KGbuilder_triplesMaker.bNodeIndex = 0;
        if (!tableMappings || tableMappings.length == 0) {
            KGbuilder_socket.message(options.clientSocketId, "No mappings  in table " + tableMappings.table);
            return callback();
        }
        if (!data || data.length == 0) {
            KGbuilder_socket.message(options.clientSocketId, "No data  in table " + tableMappings.table);
            return callback();
        }

        var triples = [];

        async.eachSeries(
            data,
            function (line, callbackEachLine) {
                //   lines.forEach(function (line, _indexLine) {
                //clean line content

                var subjectStr = null;
                var objectStr = null;
                var propertyStr = null;
                var lineError = "";
                KGbuilder_triplesMaker.blankNodesMap = {};

                for (var key in line) {
                    if (line[key]) {
                        if (!KGbuilder_triplesMaker.allColumns[key]) {
                            KGbuilder_triplesMaker.allColumns[key] = 1;
                        }
                        if (line[key] instanceof Date) {
                            line[key] = line[key].toISOString();
                        } else {
                            line[key] = "" + line[key];
                        }
                    }
                }

                async.eachSeries(
                    tableMappings.tripleModels,
                    function (mapping, callbackEachMapping) {
                        //tableMappings.tripleModels.forEach(function(mapping) {

                        if (line[mapping.s] == "null") {
                            line[mapping.s] = null;
                        }
                        if (line[mapping.o] == "null") {
                            line[mapping.o] = null;
                        }

                        if (mapping["if_column_value_not_null"]) {
                            var value = line[mapping["if_column_value_not_null"]];
                            if (!value || value == "null") {
                                return callbackEachMapping();
                            }
                        }

                        async.series(
                            [
                                function (callbackSeries) {
                                    KGbuilder_triplesMaker.getTripleSubject(tableMappings, mapping, line, function (err, result) {
                                        if (err) {
                                            if (err.indexOf("no mapping.subject") > -1) {
                                                return callbackEachMapping();
                                            }
                                            return callbackSeries(err);
                                        }
                                        subjectStr = result;
                                        return callbackSeries();
                                    });
                                },
                                function (callbackSeries) {
                                    KGbuilder_triplesMaker.getTriplePredicate(tableMappings, mapping, line, function (err, result) {
                                        if (err) {
                                            return callbackSeries(err);
                                        }
                                        propertyStr = result;
                                        return callbackSeries();
                                    });
                                },
                                function (callbackSeries) {
                                    KGbuilder_triplesMaker.getTripleObject(tableMappings, mapping, line, function (err, result) {
                                        if (err) {
                                            return callbackSeries(err);
                                        }

                                        objectStr = result;
                                        return callbackSeries();
                                    });
                                },

                                function (callbackSeries) {
                                    if (mapping.isRestriction) {
                                        KGbuilder_triplesMaker.getRestrictionTriples(mapping, subjectStr, propertyStr, objectStr, function (err, restrictionTriples) {
                                            if (err) {
                                                return callbackSeries();
                                            }
                                            triples = triples.concat(restrictionTriples);
                                            return callbackSeries();
                                        });
                                    } else {
                                        if (subjectStr && propertyStr && objectStr) {
                                            if (!KGbuilder_triplesMaker.existingTriples[subjectStr + "_" + propertyStr + "_" + objectStr]) {
                                                KGbuilder_triplesMaker.existingTriples[subjectStr + "_" + propertyStr + "_" + objectStr] = 1;
                                                triples.push({
                                                    s: subjectStr,
                                                    p: propertyStr,
                                                    o: objectStr,
                                                });
                                            } else {
                                                var x = 3;
                                            }
                                        } /* else{
                    console.log( "missing " +subjectStr +" "+ propertyStr +" "+  objectStr)
                  }*/
                                        return callbackSeries();
                                    }
                                },
                            ],
                            function (err) {
                                callbackEachMapping(err);
                            },
                        );
                    },
                    function (err) {
                        callbackEachLine(err);
                    },
                );
            },
            function (err) {
                callback(err, triples);
            },
        );
    },

    getURIFromSpecificBaseUri: function (mappingValue, line, tableMappings, mapping) {
        if (!mappingValue || typeof mappingValue != "string") {
            return null;
        }
        var p = mappingValue.indexOf("]");

        if (p > 0) {
            //specific baseURI
            var baseUri = mappingValue.substring(1, p);
            var value = line[mappingValue.substring(p + 1)];
            /*var columnURI = mappingValue.substring(p + 1);
            var prefixURI = tableMappings.prefixURI[columnURI];
            if (prefixURI) {
                baseUri += prefixURI;
            }*/

            // specific base URI can also have transforms and lookups
            if (value) {
                if (tableMappings.transform && tableMappings.transform[mappingValue]) {
                    try {
                        return "<" + baseUri + tableMappings.transform[mappingValue](util.formatStringForTriple(value, true), "s", mapping.p, line, mapping) + ">";

                        //   return callback(null,subjectStr);
                    } catch (e) {
                        return null;
                    }
                }
                // lookup to do
                else {
                    return "<" + baseUri + util.formatStringForTriple(value, true) + ">";
                }
            } else {
                return null;
            }
        } else {
            return null;
        }
    },

    getTripleSubject: function (tableMappings, mapping, line, callback) {
        //get value for Subject
        var subjectStr = KGbuilder_triplesMaker.getURIFromSpecificBaseUri(mapping.s, line, tableMappings, mapping);
        var isTransformLookUp = false;
        var missingLookups_s;
        var okLookups_s;
        if (subjectStr) {
            return callback(null, subjectStr);
        }

        if (mapping.subjectIsSpecificUri || mapping.s.endsWith("_#")) {
            subjectStr = mapping.s.replace("_#", "");
        } else if (typeof mapping.s === "function") {
            try {
                subjectStr = mapping.s(line, mapping);
            } catch (e) {
                return callback(e);
            }
        } else if (mapping.s === "_rowIndex") {
            subjectStr = KGbuilder_triplesMaker.getBlankNodeId("_rowIndex");
            return callback(null, subjectStr);
        } else if ((typeof mapping.s === "string" && mapping.s.endsWith("_$")) || mapping.isSubjectBlankNode) {
            // blankNode
            if (typeof mapping.o === "string" && !mapping.o.endsWith("_$") && !mapping.isObjectBlankNode && KGbuilder_triplesMaker.allColumns[mapping.o] && !line[mapping.o]) {
                // ne pas creer des triplest sans objet
                return callback(null, null);
            }
            subjectStr = KGbuilder_triplesMaker.getBlankNodeId(mapping.s);
            return callback(null, subjectStr);
        }

        //encodedurl from string
        else if (typeof mapping.s === "string" && mapping.s.endsWith("_£")) {
            var key = mapping.s.replace("_£", "");
            if (line[key]) {
                subjectStr = KGbuilder_triplesMaker.getStringHashCode(line[key]);
            } else {
                subjectStr = null;
            }
        } else if (tableMappings.transform && tableMappings.transform[mapping.s]) {
            try {
                if (line[mapping.s]) {
                    subjectStr = tableMappings.transform[mapping.s](util.formatStringForTriple(line[mapping.s], true), "s", mapping.p, line, mapping);
                    // case when mapping is a lookup and a transform at same time
                    if (mapping.lookup_s) {
                        var lookupValue = KGbuilder_triplesMaker.getLookupValue(mapping.lookup_s, line[mapping.s]);
                        if (lookupValue) {
                            subjectStr = tableMappings.transform[mapping.s](lookupValue, "s", mapping.p, line, mapping);
                            okLookups_s += 1;
                            isTransformLookUp = true;
                        }
                    }
                }
                //   return callback(null,subjectStr);
            } catch (e) {
                return callback((lineError = e + " " + mapping.s));
            }
        } else if (typeof mapping.s === "string" && mapping.s.indexOf("http") == 0) {
            //var prefixURI = tableMappings.prefixURI[mapping.s] || "";
            subjectStr = "<" + prefixURI + mapping.s + ">";
            subjectStr = "<" + mapping.s + ">";
        }
        // sparql prefix
        else if (typeof mapping.s === "string" && mapping.s.match(/.+:.+/)) {
            subjectStr = mapping.s;
        } else {
            if (!line[mapping.s] || (mapping.o.indexOf(":") > -1 && line[mapping.o]) == "null") {
                return callback(null, null);
            }
            //var prefixURI = tableMappings.prefixURI[mapping.s] || "";
            subjectStr = line[mapping.s];
            //subjectStr = prefixURI + line[mapping.s];
        }
        if (mapping.lookup_s && !isTransformLookUp) {
            if (!lookUpsMap[mapping.lookup_s]) {
                KGbuilder_socket.message((lineError = "no lookup named " + mapping.lookup_s));
            }
            var lookupValue = KGbuilder_triplesMaker.getLookupValue(mapping.lookup_s, subjectStr);
            if (!lookupValue) {
                missingLookups_s += 1;
            } else {
                //var prefixURI = tableMappings.prefixURI[mapping.s] || "";
                //subjectStr = prefixURI + lookupValue;
                subjectStr = lookupValue;
                okLookups_s += 1;
            }
        }

        if (!subjectStr || subjectStr == "null") {
            return callback("no mapping.subject in line " + JSON.stringify(line));
        }

        //format subject

        subjectStr = subjectStr.trim();

        if (KGbuilder_triplesMaker.isPrefixedUri(subjectStr)) {
            //pass
        } else if (KGbuilder_triplesMaker.isUri(subjectStr)) {
            subjectStr = "<" + subjectStr + ">";
        } else {
            //var prefixURI = tableMappings.prefixURI[mapping.s] || "";

            subjectStr = "<" + tableMappings.graphUri + util.formatStringForTriple(subjectStr, true) + ">";
        }

        return callback(null, subjectStr);
    },

    getTripleObject: function (tableMappings, mapping, line, callback) {
        var objectStr = KGbuilder_triplesMaker.getURIFromSpecificBaseUri(mapping.o, line, tableMappings, mapping);
        var isTransformLookUp = false;
        var missingLookups_o;
        var okLookups_o;
        if (objectStr) {
            return callback(null, objectStr);
        }

        //get value for Object

        if (mapping.o === "_rowIndex") {
            objectStr = KGbuilder_triplesMaker.getBlankNodeId("_rowIndex");
            return objectStr;
        } else if (mapping.objectIsSpecificUri || mapping.o.endsWith("_#")) {
            objectStr = mapping.o.replace("_#", "");
        }

        if (mapping.o.endsWith("_!")) {
            objectStr = mapping.o.replace("_!", "");
            mapping.isString = true;
        } else if (typeof mapping.o === "function") {
            try {
                objectStr = mapping.o(line, mapping);
                objectStr = util.formatStringForTriple(objectStr, false);
            } catch (e) {
                return callback(e);
            }
        } else if (typeof mapping.o === "string" && mapping.o.indexOf("http") == 0) {
            //var prefixURI = tableMappings.prefixURI[mapping.o] || "";
            //objectStr = "<" + prefixURI + mapping.o + ">";
            objectStr = "<" + mapping.o + ">";
            return callback(null, objectStr);
        } else if (typeof mapping.o === "string" && mapping.o.match(/.+:.+/)) {
            objectStr = mapping.o;
        } else if ((typeof mapping.o === "string" && mapping.o.endsWith("_$")) || mapping.isObjectBlankNode) {
            objectStr = KGbuilder_triplesMaker.getBlankNodeId(mapping.o);
            return callback(null, objectStr);
        }
        //encodedurl from string
        else if (typeof mapping.o === "string" && mapping.o.endsWith("_£")) {
            var key = mapping.o.replace("_£", "");
            if (line[key]) {
                objectStr = KGbuilder_triplesMaker.getStringHashCode(line[key]);
            } else {
                objectStr = null;
            }
        } else {
            //  treat value
            //var isTransform = false;
            if (line[mapping.o] === 0) {
                line[mapping.o] = "0";
            }
            if (!line[mapping.o] || line[mapping.o] == "null") {
                return callback(null, null);
            }

            if (mapping.dataType) {
                var str = line[mapping.o];
                if (!str || str == "null") {
                    return callback(null, null);
                }
                if (mapping.dataType.startsWith("xsd:date")) {
                    if (mapping.dateFormat) {
                        str = util.getDateFromSLSformat(mapping.dateFormat, str);
                        if (!str) {
                            return callback(null, null);
                        }
                    } else if (str.match(/[.-]*Z/)) {
                        //ISO string format (coming from database)
                        // is relevant dates coming from dataBases have mapping.dateFormat=ISO-time?
                        str = util.formatStringForTriple(str);
                        str = util.convertISOStringDateForTriple(str);
                    } else {
                        var isDate = function (date) {
                            return new Date(date) !== "Invalid Date" && !isNaN(new Date(date)) ? true : false;
                        };
                        var formatDate = function (date) {
                            str = new Date(date).toISOString(); //.slice(0, 10);
                        };
                        if (!isDate(str)) {
                            var date = util.convertFrDateStr2Date(str);
                            if (!date) {
                                return;
                            } else {
                                str = date.toISOString();
                            }
                        } else {
                            str = formatDate(str);
                        }
                    }
                }
                if (!str) {
                    objectStr = "";
                }

                if (!mapping.dataType.startsWith("xsd:")) {
                    mapping.dataType = "xsd:string";
                }
                if (!str || str == "null") {
                    return callback(null, null);
                }
                if (mapping.dataType == "xsd:string") {
                    str = util.formatStringForTriple(str, false);
                }
                if (mapping.dataType == "xsd:float") {
                    if (str == "0") {
                        return callback(null, null);
                    }
                    str = str.replace(",", ".");
                    str = str.replace(" ", "");
                    if (!util.isFloat(str)) {
                        return callback(null, null);
                    } else {
                    }
                }
                if (mapping.dataType == "xsd:int") {
                    str = str.replace(" ", "");
                    if (!util.isInt(str)) {
                        return callback(null, null);
                    } else {
                    }
                }
                // format after to apply transformations
                objectStr = str;
            } else {
                //var prefixURI = tableMappings.prefixURI[mapping.o] || "";
                objectStr = line[mapping.o];
            }
            if (tableMappings.transform && (tableMappings.transform[mapping.s] || tableMappings.transform[mapping.o])) {
                // if the relation is a data property the transform will concern the subject
                //else he will concern the object
                if (mapping.dataType && tableMappings.transform[mapping.s]) {
                    try {
                        if (objectStr) {
                            objectStr = tableMappings.transform[mapping.s](objectStr, "o", mapping.p, line, mapping);
                        }
                        // return callback(null,objectStr);
                    } catch (e) {
                        return (lineError = e + " " + mapping.o);
                    }
                } else {
                    if (objectStr && tableMappings.transform[mapping.o]) {
                        try {
                            objectStr = tableMappings.transform[mapping.o](objectStr, "o", mapping.p, line, mapping);
                        } catch (e) {
                            return (lineError = e + " " + mapping.o);
                        }
                    }
                }
            }
            if (mapping.lookup_o) {
                try {
                    lookupValue = KGbuilder_triplesMaker.getLookupValue(mapping.lookup_o, objectStr);
                    objectStr = lookupValue;
                } catch (e) {
                    return (lineError = e + " " + mapping.o);
                }
            }
        }

        if (!objectStr || objectStr == "null") {
            return callback(null, null);
        }

        //format object
        {
            objectStr = objectStr.trim();
            // if (objectStr.indexOf && objectStr.indexOf("http") == 0) {
            if (objectStr.indexOf && KGbuilder_triplesMaker.isUri(objectStr)) {
                objectStr = "<" + objectStr + ">";
            }

            //  else if (objectStr.indexOf && objectStr.indexOf(":") > -1 && objectStr.indexOf(" ") < 0) {
            else if (KGbuilder_triplesMaker.isPrefixedUri(objectStr)) {
                // pass
            } else if (mapping.dataType) {
                objectStr = '"' + objectStr + '"^^' + mapping.dataType;
            } else if (mapping.isString) {
                objectStr = "'" + util.formatStringForTriple(objectStr, false) + "'";
            } else {
                objectStr = "<" + tableMappings.graphUri + util.formatStringForTriple(objectStr, true) + ">";
            }
        }

        return callback(null, objectStr);
    },
    getTriplePredicate: function (tableMappings, mapping, line, callback) {
        var propertyStr = mapping.p;
        if (typeof mapping.p === "function") {
            try {
                propertyStr = mapping.p(line, mapping);
            } catch (e) {
                KGbuilder_socket.message("function error " + e + "line" + line);
                return null;
            }
        }
        if (mapping.p.startsWith("_valuesOfColumn")) {
            var column = mapping.p.split("_")[2];
            var value = line[column];
            value = objectStr = "<" + tableMappings.graphUri + util.formatStringForTriple(value, true) + ">";
            return callback(null, value);
        }

        if (!propertyStr) {
            return;
        }
        if (typeof propertyStr === "string" && propertyStr.indexOf("http") == 0) {
            propertyStr = "<" + propertyStr + ">";
        }
        // did we need to throw error when the propertyStr is not valid as URI no prefix and not an URL
        return callback(null, propertyStr);
    },
    getRestrictionTriples: function (mapping, subjectStr, propertyStr, objectStr, callback) {
        if (!subjectStr || subjectStr == "null") {
            return callback("no mapping.subject  null-" + propertyStr + " " + objectStr);
        }
        if (!objectStr || objectStr == "null") {
            return callback("no mapping.object  " + propertyStr + "<-" + subjectStr);
        }

        var restrictionTriples = [];
        var blankNode = "<_:b" + util.getRandomHexaId(10) + ">";

        if (!KGbuilder_triplesMaker.existingTriples[subjectStr + "_" + propertyStr + "_" + objectStr]) {
            KGbuilder_triplesMaker.existingTriples[subjectStr + "_" + propertyStr + "_" + objectStr] = 1;
            restrictionTriples.push({
                s: blankNode,
                p: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
                o: "<http://www.w3.org/2002/07/owl#Restriction>",
            });
            restrictionTriples.push({
                s: blankNode,
                p: "<http://www.w3.org/2002/07/owl#onProperty>",
                o: propertyStr,
            });
            if (objectStr) {
                restrictionTriples.push({
                    s: blankNode,
                    p: "<http://www.w3.org/2002/07/owl#someValuesFrom>",
                    o: objectStr,
                });
            }
            restrictionTriples.push({
                s: subjectStr,
                p: "rdfs:subClassOf",
                o: blankNode,
            });
        }
        return callback(null, restrictionTriples);
    },
    loadLookups: function (tableMappings, callback) {
        var lookUpsMap = {};
        async.eachSeries(
            tableMappings.lookups,
            function (lookup, callbackEachLookup) {
                if (tableMappings.csvDataFilePath) {
                    var lookupFilePath = lookup.filePath;
                    KGbuilder_triplesMaker.readCsv(lookupFilePath, null, function (err, result) {
                        if (err) {
                            return callbackEachLookup(err);
                        }
                        lookUpsMap[lookup.name] = { dictionary: {}, transformFn: lookup.transformFn };
                        /*if(!lookup.transformFn){
                            var columnLookUp=lookup.name.split("|")[1];
                            if(columnLookUp && tableMappings.transform[columnLookUp]){
                                lookUpsMap[lookup.name].transformFn=tableMappings.transform[columnLookUp];
                            }
                        }*/
                        result.data.forEach(function (slice) {
                            var lookupLines = slice;

                            lookupLines.forEach(function (line, index) {
                                if (![line[lookup.sourceColumn]] && line[lookup.targetColumn]) {
                                    return KGbuilder_socket.message(options.clientSocketId, "missing lookup line" + index + " " + lookupFilePath, true);
                                }
                                lookUpsMap[lookup.name].dictionary[line[lookup.sourceColumn]] = line[lookup.targetColumn];
                            });
                        });
                        callbackEachLookup();
                    });
                } else if (tableMappings.databaseSource) {
                    var sqlQuery = "select distinct " + lookup.sourceColumn + "," + lookup.targetColumn + " from " + lookup.table;

                    databaseModel
                        .query(tableMappings.dataSourceConfig.dbName, sqlQuery)
                        .then((result) => {
                            var lookupLines = result.rows;
                            console.log("lookupLines", lookupLines);
                            lookUpsMap[lookup.name] = { dictionary: {}, transformFn: lookup.transformFn };
                            lookupLines.forEach(function (line, index) {
                                if (![line[lookup.sourceColumn]] && line[lookup.targetColumn]) {
                                    return KGbuilder_socket.message(options.clientSocketId, "missing lookup line" + index + " " + lookupFilePath, true);
                                }

                                lookUpsMap[lookup.name].dictionary[line[lookup.sourceColumn]] = line[lookup.targetColumn];
                            });

                            callbackEachLookup();
                        })
                        .catch((err) => {
                            return callbackEachLookup(err);
                        });
                }
            },
            function (err) {
                callback(err, lookUpsMap);
            },
        );
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
            p: "<" + KGbuilder_triplesMaker.mappingFilePredicate + ">",
            o: "'" + options.mappingTable + "'",
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
    isUri: function (str) {
        if (!str) {
            return false;
        }
        return str.indexOf("http") == 0;

        /*    var prefixesArray = Object.keys(KGbuilder_triplesWriter.sparqlPrefixes);
        var array = str.split(":");
        if (array.length == 0) {
            return false;
        } else {
            if (prefixesArray.indexOf(array[0]) > -1 || array[0].indexOf("http") == 0) {
                return true;
            }
            return false;
        }*/
    },

    isPrefixedUri: function (str) {
        if (!str) {
            return false;
        }
        var prefixesArray = Object.keys(KGbuilder_triplesWriter.sparqlPrefixes);
        var array = str.split(":");
        if (array.length == 0) {
            return false;
        } else {
            if (prefixesArray.indexOf(array[0]) > -1) {
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
    getBlankNodeId: function (key) {
        var value = KGbuilder_triplesMaker.blankNodesMap[key];
        if (value) {
            return value;
        } else {
            if (!KGbuilder_triplesMaker.bNodeIndex) {
                KGbuilder_triplesMaker.bNodeIndex = 0;
            }
            //  value = "_:b" + (KGbuilder_triplesMaker.bNodeIndex++)
            value = "<_:b" + util.getRandomHexaId(10) + ">";
            KGbuilder_triplesMaker.blankNodesMap[key] = value;
            return value;
        }
    },

    zipString: function (str) {
        const ascii = encodeURIComponent(str);
        const array = new TextEncoder().encode(ascii);
        const zip = fflate.deflateSync(array, { level: 9 });
        return window.btoa(String.fromCharCode(...zip));
    },

    getStringHashCode: function (str) {
        var hashCode = (s) => s.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);

        var code = hashCode(str);
        code = code.toString(16);
        //console.log(code+"    "+str+"   ")
        return code;
    },

    getLookupValue: function (lookupName, value, callback) {
        //var lookupArray = lookupName.split("|");
        var target = null;
        if (lookUpsMap[lookupName]) {
            target = lookUpsMap[lookupName].dictionary[value];
        }
        if (target && lookUpsMap[lookupName].transformFn) {
            try {
                target = lookUpsMap[lookupName].transformFn(target, "s", mapping.p, line, mapping);
            } catch (e) {
                return callback(e);
            }
        }

        return target;
    },
    loadData: function (tableMappings, options, callback) {
        var tableData = [];
        if (tableMappings.csvDataFilePath) {
            KGbuilder_socket.message(options.clientSocketId, "loading data from csv file " + tableMappings.table, false);
            KGbuilder_triplesMaker.readCsv(tableMappings.csvDataFilePath, options.sampleSize, function (err, result) {
                if (err) {
                    KGbuilder_socket.message(options.clientSocketId, err, true);
                    return callback(err);
                }
                KGbuilder_socket.message(options.clientSocketId, " data loaded from " + tableMappings.table, false);
                //  tableData = result.data[0];

                result.data.forEach(function (slice) {
                    tableData = tableData.concat(slice);
                });
                callback(null, tableData);
            });
        } else if (tableMappings.datasourceConfig) {
            KGbuilder_socket.message(options.clientSocketId, "loading data from database table " + tableMappings.table, false);
            databaseModel
                .batchSelect(tableMappings.datasourceConfig.dbName, tableMappings.table, {
                    limit: options.sampleSize || 10000,
                    noRecurs: Boolean(options.sampleSize),
                })
                .then((result) => {
                    tableData = result;
                    KGbuilder_socket.message(options.clientSocketId, " data loaded ,table " + tableMappings.table, false);

                    //function to separate the callback error to the next catch bacause it's degrade visibility and make the callback executed multiple times
                    //by chat gpt
                    setImmediate(() => callback(null, tableData));
                })
                .catch((err) => {
                    return callback(err);
                });
        }
    },
};
module.exports = KGbuilder_triplesMaker;
