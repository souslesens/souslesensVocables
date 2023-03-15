/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
var OwlSchema = (function () {
    var self = {};
    self.currentSourceSchema = null;

    self.schemasConfig = {
        SKOS: {
            sparql_url: "_default",
            graphUri: "http://www.w3.org/2004/02/skos/core/",
            label: "skos",
            isOntology: false,
            allSubclasses: true,
            newSourceTopClass: "http://www.w3.org/2004/02/skos/core#ConceptScheme",
            labelProperty: "http://www.w3.org/2004/02/skos/core#prefLabel",
            newObject: {
                treeChildrenClasses: {
                    "http://www.w3.org/2004/02/skos/core#Concept": "http://www.w3.org/2004/02/skos/core#Concept",
                    "http://www.w3.org/2004/02/skos/core#ConceptScheme": "http://www.w3.org/2004/02/skos/core#Concept",
                },

                treeParentProperty: "http://www.w3.org/2004/02/skos/core#broader",
                mandatoryProperties: ["http://www.w3.org/2004/02/skos/core#prefLabel"],
            },
        },
    };

    self.setLabelsFromQueryResult = function (bindings) {
        bindings.forEach(function (item) {
            for (var key in item) {
                var p = key.indexOf("Label");
                if (p > -1) {
                    var idKey = key.substring(0, p);
                    if (item[idKey]) {
                        self.currentSourceSchema.labelsMap[item[idKey].value] = item[key].value;
                    }
                }
            }
        });
    };

    self.initSourceSchema = function (sourceLabel, callback) {
        if (!sourceLabel || !Config.sources[sourceLabel].schemaType) {
            return callback("invalid source " + sourceLabel);
        }

        if (self.schemasConfig && self.schemasConfig[sourceLabel]) {
            return callback(null, self.schemasConfig[sourceLabel]);
        }

        // only for SKOS by now

        var sourceSchema = null;

        sourceSchema = self.schemasConfig[Config.sources[sourceLabel].schemaType];

        if (sourceSchema) {
            sourceSchema.type = Config.sources[sourceLabel].schemaType;
            if (sourceSchema.sparql_url == "_default") sourceSchema.sparql_url = Config.default_sparql_url;
        }

        // for OWL   and not SKOS
        if (!sourceSchema) {
            sourceSchema = {
                sparql_url: Config.sources[sourceLabel].sparql_server.url,
                graphUri: Config.sources[sourceLabel].graphUri,
            };
        }
        sourceSchema.source = sourceLabel;
        sourceSchema.classes = {};
        sourceSchema.labelsMap = {};
        self.schemasConfig[sourceLabel] = sourceSchema;
        self.currentSourceSchema = sourceSchema;
        return callback(null, self.currentSourceSchema);
    };

    self.getClassDescription = function (sourceLabel, classId, callback) {
        var schemaType = Config.sources[sourceLabel].schemaType;
        async.series(
            [
                // load schema if not
                function (callbackSeries) {
                    if (self.currentSourceSchema) return callbackSeries();
                    self.initSourceSchema(sourceLabel, function (err, result) {
                        self.currentSourceSchema = result;
                        if (err) return MainController.UI.message(err);

                        callbackSeries(err);
                    });
                },
                //check if classType already loaded
                function (callbackSeries) {
                    if (self.currentSourceSchema.classes[classId]) return callback(null, self.currentSourceSchema.classes[classId]);
                    return callbackSeries();
                },
                // load classes
                function (callbackSeries) {
                    if (schemaType == "SKOS") {
                        Sparql_schema.getClasses(self.currentSourceSchema, classId, function (err, result) {
                            if (err) return callbackSeries(err);
                            self.setLabelsFromQueryResult(result);
                            if (result.length == 0) {
                                self.currentSourceSchema.classes["http://www.w3.org/2000/01/rdf-schema#Class"] = {
                                    id: "http://www.w3.org/2000/01/rdf-schema#Class",
                                    label: "owl:Class",
                                    objectProperties: {},
                                    annotations: {},
                                };
                            }
                            result.forEach(function (item) {
                                self.currentSourceSchema.classes[item.class.value] = {
                                    id: item.class.value,
                                    label: common.getItemLabel(item, "class"),
                                    objectProperties: {},
                                    annotations: {},
                                };
                            });
                            return callbackSeries();
                        });
                    } else if (schemaType == "OWL") {
                        self.currentSourceSchema.classes["http://www.w3.org/2000/01/rdf-schema#Class"] = {
                            id: "http://www.w3.org/2000/01/rdf-schema#Class",
                            label: "owl:Class",
                            objectProperties: {},
                            annotations: {},
                        };
                        return callbackSeries();
                    } else {
                        return callbackSeries("Schema type " + schemaType + " not supported");
                    }
                },
                // load object properties
                function (callbackSeries) {
                    if (schemaType == "SKOS") {
                        Sparql_schema.getClassProperties(self.currentSourceSchema, classId, function (err, result) {
                            if (err) return callbackSeries(err);
                            self.setLabelsFromQueryResult(result);
                            result.forEach(function (item) {
                                if (item.subProperty)
                                    self.currentSourceSchema.classes[classId].objectProperties[item.subProperty.value] = {
                                        id: item.subProperty.value,
                                        label: common.getItemLabel(item, "subProperty"),
                                    };
                                else
                                    self.currentSourceSchema.classes[classId].objectProperties[item.property.value] = {
                                        id: item.property.value,
                                        label: common.getItemLabel(item, "property"),
                                    };
                            });
                            if (self.currentSourceSchema.type == "SKOS")
                                self.currentSourceSchema.classes[classId].objectProperties["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] = {
                                    id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                    label: "rdf type",
                                };

                            callbackSeries();
                        });
                    } else {
                        return callbackSeries("Schema type " + schemaType + " not supported");
                    }
                },
                // load annotations
                function (callbackSeries) {
                    if (schemaType == "SKOS") {
                        Sparql_schema.getObjectAnnotations(self.currentSourceSchema, classId, function (err, result) {
                            if (err) return callbackSeries(err);

                            if (result.length == 0) {
                                if (self.currentSourceSchema.classes["http://www.w3.org/2000/01/rdf-schema#Class"])
                                    self.currentSourceSchema.classes["http://www.w3.org/2000/01/rdf-schema#Class"].annotations["http://www.w3.org/2000/01/rdf-schema#label"] = {
                                        id: "http://www.w3.org/2000/01/rdf-schema#label",
                                        label: "rdfs:label",
                                    };
                            } else {
                                self.setLabelsFromQueryResult(result);
                                result.forEach(function (item) {
                                    self.currentSourceSchema.classes[classId].annotations[item.annotation.value] = {
                                        id: item.annotation.value,
                                        label: common.getItemLabel(item, "annotation"),
                                    };
                                });
                            }

                            callbackSeries();
                        });
                    } else if (schemaType == "OWL") {
                        return callbackSeries();
                    } else {
                        return callbackSeries("Schema type " + schemaType + " not supported");
                    }
                },
                function (callbackSeries) {
                    if (schemaType == "SKOS") {
                        Sparql_schema.getObjectRangeProperties(self.currentSourceSchema, classId, function (err, result) {
                            if (err) return callbackSeries(err);
                            self.setLabelsFromQueryResult(result);
                            result.forEach(function (item) {
                                self.currentSourceSchema.classes[classId].objectProperties[item.prop.value].range = item.range.value;
                                if (item.domain) self.currentSourceSchema.classes[classId].objectProperties[item.prop.value].domain = item.domain.value;
                            });
                            callbackSeries();
                        });
                    } else {
                        return callbackSeries("Schema type " + schemaType + " not supported");
                    }
                },
            ],
            function (err) {
                callback(err, self.currentSourceSchema.classes[classId]);
            }
        );
    };

    return self;
})();
