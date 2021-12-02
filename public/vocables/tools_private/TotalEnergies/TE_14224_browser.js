var TE_14224_browser = (function () {

        var self = {}
     self.mainSource = "TSF_ISO_14224"
      //self.graphUri = Config.sources[self.mainSource]
        self.onSourceSelect = function () {

        }
        self.onLoaded = function () {
            $("#actionDiv").html("")
            $("#actionDivContolPanelDiv").load("tools_private/TotalEnergies/snippets/leftPanel.html")
            MainController.UI.toogleRightPanel(true)
            $("#rightPanelDiv").html("")
            $("#rightPanelDiv").load("tools_private/TotalEnergies/snippets/rightPanel.html")


            $("#graphDiv").html("")
            // $("#graphDiv").load("snippets/standardizer/standardizer_central.html")
            $("#accordion").accordion("option", {active: 2});

            $("#sourcesTreeDiv").html("");
            setTimeout(function () {
                    var levels = [

                        "Country",
                        "3-Installation",
                        "4-Plant/Unit",
                        "5-System",
                        "6-Equipment unit/Package",
                        "7-SubUnit/Class",
                        "8-Component",
                        "9-part"

                    ]
                    //  common.fillSelectOptions("TE_114224_browser_levelsSelect", levels)


                    var superClasses = [
                        {uri: "http://w3id.org/readi/z018-rdl/prod_SYS", label: "SYSTEM"},
                        {uri: "http://standards.iso.org/iso/15926/part14/FunctionalObject", label: "FUNCTION"},
                        {uri: "http://w3id.org/readi/rdl/CFIHOS-30000311", label: "ARTEFACT"},
                        {uri: "http://w3id.org/readi/rdl/CFIHOS-30000311", label: "COMPONENT"},
                        {uri: "https://w3id.org/requirement-ontology/rdl/REQ_0007", label: "ADVICE"},
                        {uri: "https://w3id.org/requirement-ontology/rdl/REQ_0010", label: "RECOMMENDATION"},
                        {uri: "https://w3id.org/requirement-ontology/rdl/REQ_0011", label: "REQUIREMENT"},


                    ]
                var index=0
                    var htmlTotal=""
                var treesData={

                }
                    async.eachSeries(superClasses, function (superClass, callbackEach) {

                        Sparql_OWL.getNodeChildren(self.mainSource,null,[superClass.uri],1,null, function(err, result){
                       if(err)
                           return callbackEach()

                        var html="<div class='TE_114224_browser_leftPanelClassDiv'>"
                            html+="<div>"+superClass.label+"</div>"
                            html+="<div class='TE_114224_browser_leftPanelTreeContainer'>"
                            html+="<div id='TE_114224_browser_tree_"+superClass.label+"'>"
                            html+="</div>"
                            html+="</div>"
                            html+="</div>"
                            htmlTotal+=html;
                       var jstreeData=[]
                            result.forEach(function(item){
                                jstreeData.push({
                                   id: item.child1.value,
                                    text: item.child1Label.value,
                                    parent:"#",
                                    data:{
                                        id: item.child1.value,
                                        label: item.child1Label.value,}
                                })

                            })

                            treesData["TE_114224_browser_tree_"+superClass.label] =jstreeData


                        if(++ index>5)
                           return callbackEach("stop")
                        callbackEach()
                        })
                    }, function (err) {
                        if (err)
                          ;//  return alert(err)
                        $("#TE_114224_browser_filtersContainerDiv").html(htmlTotal)
                        setTimeout(function(){

                            for(var key in treesData){
                                common.jstree.loadJsTree(key,treesData[key])

                            }

                        },200)

                    })


                }
                , 200)
        }

        return self;

    }
)()