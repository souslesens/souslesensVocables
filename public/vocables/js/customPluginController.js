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

    self.setGraphNodesIcons=function(){
        if(!self.pluginDir )
            return;
        var nodes=visjsGraph.data.nodes.getIds();
        var newNodes=[]
        var path=self.rootDir+self.pluginDir+"/"
        Sparql_OWL.getNodesTypes(null,nodes,function(err, result){
          if(err)
              return console.log(err)
           result.forEach(function(item){
               if(self.typeUrisIcons[item.type.value]){
                   newNodes.push({
                       id:item.concept.value,
                       image:path+self.typeUrisIcons[item.type.value],
                       shape:"circularImage",
                       size:10
                   })
               }

           })
           visjsGraph.data.nodes.update(newNodes)

       })


    }


    return self;


})()

