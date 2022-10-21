// eslint-disable-next-line @typescript-eslint/no-unused-vars
var CustomPluginController = (function () {
    var self = {};
    self.rootDir = "customPlugins/";
    self.typeUrisIcons = {};
    self.pluginDir = "TotalEnergies";
    self.customTools = self.init = function (customPlugins, callback) {
        self.pluginDir = customPlugins[0];

        if (self.pluginDir) {
            $.ajax({
                type: "GET",
                url: `${Config.apiUrl}/pluginController/jsonFile`,

                data: { filePath: self.rootDir + self.pluginDir + "/manifest.json" },
                dataType: "json",
                success: function (data, _textStatus, _jqXHR) {
                    if (data.uri_icons) {
                        for (var uri in data.uri_icons) {
                            self.typeUrisIcons[uri] = data.uri_icons[uri];
                        }
                    }
                    if (data.tools) {
                        async.eachSeries(
                            data.tools,
                            function (tool, callbackEach) {
                                $.getScript("customPlugins/" + self.pluginDir + "/" + tool.controller + ".js", function (data, _textStatus, _jqxhr) {
                                    Config.tools[tool.label] = tool;
                                    var _script = document.createElement("script");
                                    _script = eval(data);
                                    tool.controller = eval(tool.controller);

                                    callbackEach();
                                });
                            },
                            function (err) {
                                return callback(err);
                            }
                        );
                    }
                },
                error(err) {
                    return callback(err);
                },
            });
        } else {
            callback();
        }
    };

    self.setGraphNodesIcons = function () {
        return;
        if (!self.pluginDir) self.pluginDir = "TotalEnergies";
        //  var nodes=visjsGraph.data.nodes.get();
        var newNodes = [];
        self.path = self.rootDir + self.pluginDir + "/";

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
            Sparql_OWL.getNodesTypes(Lineage_sources.activeSource, nodeIds, function (err, result) {
                // eslint-disable-next-line no-console
                if (err) return console.log(err);
                result.forEach(function (item) {
                    var newNode = { id: item.concept.value };
                    if (Lineage_classes.sourcesGraphUriMap[item.g.value]) {
                        var source = Lineage_classes.sourcesGraphUriMap[item.g.value].name;
                        if (Config.sources[Lineage_sources.activeSource] && Config.sources[Lineage_sources.activeSource].imports && Config.sources[Lineage_sources.activeSource].imports.indexOf(source) > -1)
                            // only those in the imports of mainSource
                            var node = visjsGraph.data.nodes.get(item.concept.value);
                        if (node) node.data.source = source;
                    }

                    if (self.typeUrisIcons[item.type.value]) {
                        newNode.image = self.path + self.typeUrisIcons[item.type.value];
                        newNode.shape = "circularImage";
                        // newNode.shape = "image";
                        newNode.size = 10;
                        newNode.borderWidth = 4;
                        //  newNode.imagePadding = 4
                        /* newNodes.push({
                             id:item.concept.value,
                             image:path+self.typeUrisIcons[item.type.value],
                             shape:"circularImage",
                             size:10
                         })*/

                        newNodes.push(newNode);
                    }
                });
                visjsGraph.data.nodes.update(newNodes);
            });
        }, 200);
    };

    return self;
})();
