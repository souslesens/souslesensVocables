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

    }


    return self;


})()
