var ADLbrowser = (function () {

    var self = {}

    self.aspectsChildrenDepth = 10


    self.onLoaded = function () {
        $("#sourceDivControlPanelDiv").html("")
        MainController.UI.message("");


        $("#accordion").accordion("option", {active: 2});
        MainController.UI.openRightPanel()
        $("#rightPanelDiv").load("snippets/ADL/ADLbrowserRightPanel.html");
        $("#actionDivContolPanelDiv").load("snippets/ADL/ADLbrowser.html");
        setTimeout(function () {
            self.loadAdlsList();
            self.loadAspects();

            SourceBrowser.currentTargetDiv = "ADLbrowserItemsjsTreeDiv"
            $("#GenericTools_searchSchemaType").val("INDIVIDUAL")


        }, 200)
    }

    self.loadAdlsList = function () {
        var jstreeData = []
        for (var source in Config.sources) {
            if (Config.sources[source].schemaType == "INDIVIDUAL")
                jstreeData.push({
                    id: source,
                    text: source,
                    parent: "#"
                })
        }
        var options = {selectTreeNodeFn: ADLbrowser.onSelectJstreeItem, openAll: true}
        common.loadJsTree("ADLbrowserItemsjsTreeDiv", jstreeData, options, function (err, result) {

        })
    }

    self.loadAspects = function () {


        var jstreeData = [{
            id: "http://standards.iso.org/iso/15926/part14/Location",
            text: "<span class='aspect_Location'>Location</span>",
            type: "Location",
            parent: "#"
        },
            {
                id: "http://standards.iso.org/iso/15926/part14/Aspect",
                text: "<span class='aspect_Function'>Function</span>",
                type: "Function",
                parent: "#"
            },
            {
                id: "http://standards.iso.org/iso/15926/part14/PhysicalObject",
                text: "<span class='aspect_Product'>Product</span>",
                type: "Product",
                parent: "#"
            },
            {
                id: "http://standards.iso.org/iso/15926/part14/Activity",
                text: "<span class='aspect_LifeCycle'>LifeCycle</span>",
                type: "LifeCycle",
                parent: "#"
            }]


        async.eachSeries(jstreeData, function (topAspect, callbackEach) {
            Sparql_generic.getNodeChildren("ONE-MODEL", null, topAspect.id, self.aspectsChildrenDepth, null, function (err, result) {
                if (err)
                    return callbackEach(err)
                result.forEach(function (item) {
                    for (var i = 1; i < self.aspectsChildrenDepth; i++) {
                        if (item["child" + i]) {
                            var parent;
                            if (true || i == 1)
                                parent = topAspect.id
                            else
                                parent = item["child" + (i - 1)].value


                            if (item["child" + i] && !item["child" + (i + 1)]) {
                                jstreeData.push({
                                    id: item["child" + i].value,
                                    text: item["child" + i + "Label"].value,
                                    parent: parent
                                })

                            }
                        } else
                            break;
                    }
                })

                callbackEach();
            })

        }, function (err) {
            if (err)
                MainController.UI.message(err)
            var options = {selectTreeNodeFn: ADLbrowser.onSelectJsTreeAspect, openAll: true}
            common.loadJsTree("ADLbrowserjsAspectsTreeDiv", jstreeData, options, function (err, result) {

            })
        })
    }

    self.onSelectJsTreeAspect = function (event, data) {

    }

    self.onSelectJstreeItem = function (event, data) {
        self.currentSource = data.node.id

    }


    self.searchAllSourcesTerm = function () {
        var words = $("#ADLbrowser_searchAllSourcesTermInput").val();
        var exactMatch = $("#ADLbrowser_allExactMatchSearchCBX").prop("checked")
        Sparql_INDIVIDUALS.findByWords(self.currentSource, words, {exactMatch: exactMatch}, function (err, result) {
            if (err)
                return MainController.UI.message(err)
            var existingNodes={}
            var jstreeData=[]
            result.forEach(function(item){
                if(!existingNodes[item.type.value]){
                    existingNodes[item.type.value]=1;
                    jstreeData.push({
                        id:item.type.value,
                        text:item.type.value,
                        parent:self.currentSource,
                        data:{type:"type"}
                    })

                }
                if(!existingNodes[item.sub.value]) {
                    existingNodes[item.sub.value] = 1;
                    jstreeData.push({
                        id: item.sub.value,
                        text: item.objLabel.value,
                        parent: item.type.value,
                        data: {type: "individual", id:item.sub.value, label:item.objLabel.value, source:self.currentSource}
                    })
                }


            })

            common.addNodesToJstree("ADLbrowserItemsjsTreeDiv",self.currentSource,jstreeData)

        })
    }


    return self;


})()
