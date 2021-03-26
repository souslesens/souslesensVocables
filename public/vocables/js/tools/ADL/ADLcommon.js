var ADLcommon = (function () {

    var self = {}
    self.currentSource
    self.allObjectsMap = {}
    self.constraintsMap= {domains: [], properties: [], ranges: []}


    self.Ontology = {
        jstreeData_types: [],
        load: function (source,callback) {
            self.currentSource = source
            var classJstreeData = []
            var depth = 5;

            self.constraintsMap = {domains: [], properties: [], ranges: []}
            var allClassIds = []
            var subPropertiesMap={}
            async.series([


                    //load propertiesRangesAndDomains
                    function (callbackSeries) {
                        OwlSchema.initSourceSchema(self.currentSource, function (err, schema) {
                            if (err)
                                return callbackSeries(err);
                            Sparql_schema.getPropertiesRangeAndDomain(schema, null, null, null, function (err, result) {
                                if (err)
                                    return callbackSeries(err);


                                result.forEach(function (item) {
                                    if(item.subProperty){
                                        if(!subPropertiesMap[item.property.value])
                                            subPropertiesMap[item.property.value]=[]
                                        subPropertiesMap[item.property.value].push({id:item.subProperty.value,label:item.subPropertyLabel.value})
                                        self.allObjectsMap[item.subProperty.value] = {
                                            type: "Property", label: item.subPropertyLabel.value, data: {label: item.propertyLabel.value, id: item.subProperty.value}
                                        }

                                    }
                                })


                                result.forEach(function (item) {
                                    var propertyId = item.property.value

                                    if (item.range || item.domain) {
                                        self.allObjectsMap[item.property.value] = {
                                            type: "Property", label: item.propertyLabel.value, data: {label: item.propertyLabel.value, id: propertyId}
                                        }


                                        if (item.domain) {
                                            var domainId = item.domain.value
                                            if (!self.constraintsMap.domains[domainId])
                                                self.constraintsMap.domains[domainId] = []
                                            if (self.constraintsMap.domains[domainId].indexOf(propertyId) < 0)
                                                self.constraintsMap.domains[domainId].push(propertyId)
                                        }
                                        if (item.range) {
                                            var rangeId = item.range.value
                                            if (!self.constraintsMap.ranges[rangeId])
                                                self.constraintsMap.ranges[rangeId] = []
                                            if (self.constraintsMap.ranges[rangeId].indexOf(propertyId) < 0)
                                                self.constraintsMap.ranges[rangeId].push(propertyId)
                                        }


                                    }
                                })

                                callbackSeries();
                            })
                        })
                    },
                    //load restrictions
                    function (callbackSeries) {
                        var objs = []
                        Sparql_OWL.getObjectRestrictions(self.currentSource, null, null, function (err, result) {
                           // console.log(JSON.stringify(result,null,2))
                            if (err)
                                return callbackSeries(err)

                            result.forEach(function (item) {

                                if (!item.value) {
                                    item.value = {value: "any"}
                                }
                                var hasId = true
                                if (!item.id) {
                                    item.id = {value: "any"}
                                    hasId = false
                                }

                                var obj = {property: item.prop.value, domain: item.id.value, range: item.value.value}
                                self.allObjectsMap[item.prop.value] = {type: "Property", label: item.propLabel.value, data: obj}

                                objs.push(obj)
                            })
                            objs.forEach(function (obj) {
                                if (!self.constraintsMap.domains[obj.domain])
                                    self.constraintsMap.domains[obj.domain] = []
                                if (self.constraintsMap.domains[obj.domain].indexOf(obj.property) < 0)
                                    self.constraintsMap.domains[obj.domain].push(obj.property)

                                if (!self.constraintsMap.ranges[obj.range])
                                    self.constraintsMap.ranges[obj.range] = []
                                if (self.constraintsMap.ranges[obj.range].indexOf(obj.property) < 0)
                                    self.constraintsMap.ranges[obj.range].push(obj.property)

                                if (!self.constraintsMap.properties[obj.property])
                                    self.constraintsMap.properties[obj.property] = {}

                                if (!self.constraintsMap.properties[obj.property][obj.domain])
                                    self.constraintsMap.properties[obj.property][obj.domain] = {}
                                self.constraintsMap.properties[obj.property][obj.domain][obj.range] = []

                                if(subPropertiesMap[obj.property]){
                                    subPropertiesMap[obj.property].forEach(function(subProperty) {

                                        if (!self.constraintsMap.properties[subProperty.id])
                                            self.constraintsMap.properties[subProperty.id] = {}

                                        if (!self.constraintsMap.properties[subProperty.id][obj.domain])
                                            self.constraintsMap.properties[subProperty.id][obj.domain] = {}
                                        self.constraintsMap.properties[subProperty.id][obj.domain][obj.range] = []
                                    })

                                }

                            })

                            callbackSeries();
                        })


                    },

                    // loadClasses
                    function (callbackSeries) {

                        var depth = 4;
                        Sparql_OWL.getNodeChildren(self.currentSource, null, null, depth, null, function (err, result) {
                            if (err)
                                return callbackSeries(err)
                            result.forEach(function (item) {

                                if (!self.allObjectsMap[item.concept.value]) {
                                    self.allObjectsMap[item.concept.value] = {type: "Class", label: item.conceptLabel.value, data: {}, parent: null}

                                }
                                for (var i = 1; i < depth; i++) {

                                    if (item["child" + i]) {
                                        var childId = item["child" + i].value

                                        if (childId == "http://data.total.com/resource/one-model/ontology#Tag")


                                            var parentId;
                                        if (i == 1)
                                            parentId = item.concept.value
                                        else
                                            parentId = item["child" + (i - 1)].value

                                        if (!self.allObjectsMap[childId]) {
                                            self.allObjectsMap[childId] = {type: "Class", label: item["child" + i + "Label"].value, data: {}, parent: parentId}
                                        }


                                    }

                                }
                            })
                            callbackSeries()
                        })
                    },
                    // loadClasses
                    function (callbackSeries) {

                        var filter = "?concept rdf:type owl:Class"
                        Sparql_OWL.getItems(self.currentSource, {filter: filter}, function (err, result) {
                            if (err)
                                return callbackSeries(err)
                            result.forEach(function (item) {

                                if (self.allObjectsMap[item.concept.value])
                                // if (self.constraintsMap.domains[item.concept.value] || self.constraintsMap.ranges[item.concept.value])
                                    self.allObjectsMap[item.concept.value].label= item.conceptLabel.value



                            })
                            callbackSeries()
                        })
                    },

                    //inherit properties
                    function (callbackSeries) {
//return callbackSeries()
                        for (var classId in self.allObjectsMap) {
                            var item = self.allObjectsMap[classId]
                           // if(classId==)
if(item.parent){
                            if (item.type == "Class" ) {
                                if (self.constraintsMap.domains[item.parent]) {
                                    if (!self.constraintsMap.domains[classId]) {
                                        self.constraintsMap.domains[classId] = self.constraintsMap.domains[item.parent]

                                    } else
                                        self.constraintsMap.domains[item.parent].forEach(function (item) {
                                            self.constraintsMap.domains[classId].push(item)
                                        })

                                }

                                if (self.constraintsMap.ranges[item.parent]) {
                                    if (!self.constraintsMap.ranges[classId]) {
                                        self.constraintsMap.ranges[classId] = self.constraintsMap.ranges[item.parent]

                                    } else
                                        self.constraintsMap.ranges[item.parent].forEach(function (item) {
                                            self.constraintsMap.ranges[classId].push(item)
                                        })

                                }
                            }

                              else  if (item.type == "Property") {
                                    if (self.constraintsMap.properties[item.parent]) {
                                        if (!self.constraintsMap.properties[item.parent][classId]) {
                                            self.constraintsMap.properties[item.parent][classId] = []
                                        }
                                    }
                                }
                            }
                        }
                        callbackSeries()
                    },


                    //set   Ontology jstreeData_types
                    function (callbackSeries) {
                        self.Ontology.jstreeData_types = []
                        var typeUri = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"

                        self.Ontology.jstreeData_types.push({
                            id: typeUri,
                            text: "rdf:type",
                            parent: "#",
                            data: {id: "typeUri", label: "rdf:type", source: self.currentSource}
                        })

                        for (var key in self.allObjectsMap) {
                            var item = self.allObjectsMap[key]
                            if (item.type == "Class") {
                                self.Ontology.jstreeData_types.push({
                                    id: key,
                                    text: item.label,
                                    parent: item.parent || typeUri,
                                    data: {id: key, label: item.label}
                                })
                            }
                        }
                        callbackSeries()

                    }


                ],

                function (err) {
                    if (err)
                        return callback(err)
                    return callback(null, {
                        source: self.currentSource,
                        allObjectsMap: self.allObjectsMap,
                        constraintsMap: self.constraintsMap
                    })


                }
            )
        },



    }


    return self;


})()
