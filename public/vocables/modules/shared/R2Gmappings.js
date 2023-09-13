var R2Gmappings = (function () {
    var self = {};
    self.allTriplesMappings = {};
    self.getAllTriplesMappings = function (source, callback) {
        if (self.allTriplesMappings[source]) {
            return callback(null, self.allTriplesMappings[source]);
        }

        self.loadMappingsList(function (err, result) {
            if (err) {
                return alert(err.responseText);
            }

            var allTripleMappings = {};

            async.eachSeries(
                result,
                function (mappingFileName, callbackEach) {
                    var payload = {
                        dir: "CSV/" + source,
                        name: mappingFileName,
                    };
                    allTripleMappings[mappingFileName] = {};
                    $.ajax({
                        type: "GET",
                        url: `${Config.apiUrl}/data/file`,
                        data: payload,
                        dataType: "json",
                        success: function (result, _textStatus, _jqXHR) {
                            try {
                                var jsonObject = JSON.parse(result);
                                allTripleMappings[mappingFileName] = jsonObject;
                            } catch (e) {
                                console.log("parsing error " + mappingFileName);
                            }
                            callbackEach();
                        },
                        error(err) {
                            return callbackEach(err);
                        },
                    });
                },
                function (err) {
                    if (err) {
                        return callback(err.responseText);
                    }
                    self.allTriplesMappings[source] = allTripleMappings;
                    return callback(null, allTripleMappings);
                }
            );
        });
    };

    self.getIndividualMapping = function (source, className) {
        self.getAllTriplesMappings(source, function (err, allTripleMappings) {
            if (err) {
                return callback(err);
            }

            var table = null;
            var column = null;
            for (var fileName in allTripleMappings) {
                var tripleModels = allTripleMappings[fileName].tripleModels;
                var databaseSource = allTripleMappings[fileName].databaseSource;

                tripleModels.forEach(function (triple) {
                    if (triple.p == "rdf:type" && triple.o == className) {
                        table = fileName;
                        column = triple.s;
                        return { databaseSource: databaseSource, table: table, column: column };
                    }
                });
            }
        });
    };
    self.getIndividualRecord ==
        function (source, className, uri, callback) {
            var mapping = self.getIndividualMapping(source, className);

            var sql = "select * from " + mapping.table + "where " + mapping.column + " = '" + uri + "'";
        };

    return self;
})();

export default R2Gmappings;
window.R2Gmappings = R2Gmappings;
