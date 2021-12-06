var CustomPluginController = (function () {

    var self = {}
    self.rootDir = "customPlugins/"
    self.typeUrisIcons={}
    self.pluginDir
    self.customTools=
    self.init= function (customPlugins, callback) {
        self.pluginDir =customPlugins[0]

        if (self.pluginDir ) {
            $.ajax({
                type: "GET",
                url: "/getJsonFile",
                data: {filePath: self.rootDir+ self.pluginDir + "/manifest.json"},
                dataType: "json",
                success: function (data, textStatus, jqXHR) {

                    if(data.uri_icons){
                       for( var uri in data.uri_icons){
                            self.typeUrisIcons[uri]=data.uri_icons[uri]
                        }
                    }
                    if(data.tools){
                    async.eachSeries(  data.tools,function(tool,callbackEach) {

                            $.getScript("customPlugins/TotalEnergies/TE_14224_browser.js", function (data, textStatus, jqxhr) {
                               var script = document.createElement('script');
                                script=eval(data);
                                tool.controller=eval(tool.controller)
                                Config.tools[tool.label] = tool

                           callbackEach()

                            })

                        },function(err){
                     return callback(err);
                    })


                    }

                }
                , error(err) {
                    return callback(err)
                }
            })
        } else {
            callback()
        }
    }

    self.setGraphNodesIcons=function() {
        if (!self.pluginDir)
            return;
        //  var nodes=visjsGraph.data.nodes.get();
        var newNodes = []
        var path = self.rootDir + self.pluginDir + "/"
        var nodeIds = visjsGraph.data.nodes.getIds();
        /*     nodeIds.forEach(function(nodeId){
                 for (var key in  Lineage_classes.sourcesGraphUriMap){
                     if(nodeId.indexOf(key)>-1){
                         var node=visjsGraph.data.nodes.get(nodeId)
                         if( node)
                             node.data.source=Lineage_classes.sourcesGraphUriMap[key].name
                     }
                 }

             })*/

        setTimeout(function () {
            Sparql_OWL.getNodesTypes(Lineage_classes.mainSource, nodeIds, function (err, result) {
                if (err)
                    return console.log(err)
                result.forEach(function (item) {
                    if (item.concept.value.indexOf("14224") > -1)
                        var x = 3
                    var newNode = {id: item.concept.value}
                    if (Lineage_classes.sourcesGraphUriMap[item.g.value]) {
                        var source = Lineage_classes.sourcesGraphUriMap[item.g.value].name
                        if (Config.sources[Lineage_classes.mainSource].imports.indexOf(source) > -1)// only those in the imports of mainSource
                            var node = visjsGraph.data.nodes.get(item.concept.value)
                        if (node)
                            node.data.source = source
                    }


                    if (self.typeUrisIcons[item.type.value]) {
                        newNode.image = path + self.typeUrisIcons[item.type.value];
                        newNode.shape = "circularImage";
                       // newNode.shape = "image";
                        newNode.size = 10;
                        newNode.borderWidth = 4
                      //  newNode.imagePadding = 4
                        /* newNodes.push({
                             id:item.concept.value,
                             image:path+self.typeUrisIcons[item.type.value],
                             shape:"circularImage",
                             size:10
                         })*/

                        newNodes.push(newNode);
                    }

                })
                visjsGraph.data.nodes.update(newNodes)

            })


        }, 200)
    }


    return self;


})()

