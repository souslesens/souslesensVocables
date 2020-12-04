var OwlSchema=(function(){
   var self={}
    self.currentSourceSchema=null;

        self.initSourceSchema= function (sourceLabel, callback) {
            async.series([
                // load schema sconfig
                function (callbackSeries) {
                    if (self.schemasConfig)
                        return callbackSeries();


                    $.getJSON("config/schemas.json", function (json) {
                        self.schemasConfig = json;
                        if (Config.sources[sourceLabel].schema)
                            self.currentSourceSchema = self.schemasConfig[Config.sources[sourceLabel].schema]
                        else// default SKOS
                            self.currentSourceSchema = self.schemasConfig["SKOS"];
                        return callbackSeries();
                    })


                },
                // load classes
                function (callbackSeries) {
                    Sparql_schema.getClasses(self.currentSourceSchema, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        self.currentSourceSchema.classes = {}
                        result.forEach(function (item) {
                            self.currentSourceSchema.classes[item.class.value] = {id: item.class.value, label: common.getItemLabel(item, "class"), objectProperties: {}, annotations: {}}
                        })
                        return callbackSeries();

                    })
                },
            ], function (err) {
                callback(err)
            })
        }


        self.getClassDescription= function (sourceLabel, classType, callback) {
            async.series([
                    // load schema if not
                    function (callbackSeries) {

                        if (self.currentSourceSchema)
                            return callbackSeries();
                        self.initSourceSchema(sourceLabel, function (err, result) {
                            callbackSeries(err);
                        })
                    }
                    ,
                    //check if classType already loaded
                    function (callbackSeries) {
                        if (Object.keys(self.currentSourceSchema.classes[classType].objectProperties).length > 0)
                            return callback();
                        return callbackSeries()
                    },
                    // load classes
                    function (callbackSeries) {
                        Sparql_schema.getClasses(self.currentSourceSchema, function (err, result) {
                            if (err)
                                return callbackSeries(err);
                            self.currentSourceSchema.classes = {}
                            result.forEach(function (item) {
                                self.currentSourceSchema.classes[item.class.value] = {id: item.class.value, label: common.getItemLabel(item, "class"), objectProperties: {}, annotations: {}}
                            })
                            return callbackSeries();
                        })
                    }
                    ,
                    // load object properties
                    function (callbackSeries) {
                        Sparql_schema.getClassProperties(self.currentSourceSchema, classType, function (err, result) {
                            if (err)
                                return callbackSeries(err)
                            result.forEach(function (item) {
                                if (item.subProperty)
                                    self.currentSourceSchema.classes[classType].objectProperties[item.subProperty.value] = {id: item.subProperty.value, label: common.getItemLabel(item, "subProperty")}
                                else
                                    self.currentSourceSchema.classes[classType].objectProperties[item.property.value] = {id: item.property.value, label: common.getItemLabel(item, "property")}

                            })

                            callbackSeries();
                        })
                    }
                    // load annotations
                    ,
                    function (callbackSeries) {
                        Sparql_schema.getObjectAnnotations(self.currentSourceSchema, classType, function (err, result) {
                            if (err)
                                return callbackSeries(err)

                            result.forEach(function (item) {
                                self.currentSourceSchema.classes[classType].annotations[item.annotation.value] = {id: item.annotation.value, label: common.getItemLabel(item, "annotation")}
                            })

                            callbackSeries();
                        })
                    },
                function(callbackSeries){
                var properties=Object.keys(self.currentSourceSchema.classes[classType].objectProperties)
                    Sparql_schema.getPropertiesRangeAndDomain(self.currentSourceSchema,properties, function(err,result){
                        result.forEach(function(item){
                            self.currentSourceSchema.classes[classType].objectProperties[item.property.value].range=item.range.value
                            self.currentSourceSchema.classes[classType].objectProperties[item.property.value].domain=item.domain.value



                        })
                        callbackSeries();

                    })
                }
                ],
                function (err) {
                    callback(err, self.currentSourceSchema.classes[classType])

                }
            )
        }



    return self
})()
