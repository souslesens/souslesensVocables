var TE_14224_browser = (function () {

        var self = {}
     self.mainSource = "TSF_ISO_14224"
      //self.graphUri = Config.sources[self.mainSource]
        self.onSourceSelect = function () {

        }
        self.onLoaded = function () {

            $("#actionDiv").html("")
            $("#actionDivContolPanelDiv").load("customPlugins/TotalEnergies/snippets/leftPanel.html")
            MainController.UI.toogleRightPanel(true)
            $("#rightPanelDiv").html("")
            $("#rightPanelDiv").load("customPlugins/TotalEnergies/snippets/rightPanel.html")


            $("#graphDiv").html("")
            // $("#graphDiv").load("snippets/standardizer/standardizer_central.html")
            $("#accordion").accordion("option", {active: 2});


            $("#sourcesTreeDiv").html("");

           var table="girassol_fl"
            self.getFunctionalLocations(table)

        }
        self.getFunctionalLocations=function(table){
            var dataSource= {
                "type": "sql.sqlserver",
                "connection": "_default",
                "dbName": "data14224",
                "table_schema": "dbo"
            }




           var  limit =100000

               var sqlQuery =  " select distinct functionalLocationCode from " + table ;


            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: {
                    KGquery: 1,
                    getData: 1,
                    dataSource: JSON.stringify(dataSource),
                    sqlQuery: sqlQuery
                },
                dataType: "json",

                success: function (data, textStatus, jqXHR) {
                    alert ("aaa")
debugger

                    data=data.slice(3000)
                  var x=data
                    var jstreeData=[]

                    return;
                    data.forEach(function(item){
                        var array=item.functionalLocationCode.split("/")
                        var previousId;
                        var all
                        for(var i=0;1<3;i++){
                            if(i=0)
                            var parent="#"
                            else
                                parent=previousId
                            var id=common.getRandomHexaId(10)
                            previousId=id

                            jstreeData.push({
                                id:id,
                                text:array[i],
                                parent:parent


                            })


                        }


                    })

                   common.jstree.loadJsTree("TE_114224_browser_rightPanelTreeDiv",jstreeData);






                }

                , error: function (err) {
                    var x=err
                    alert(err)


                }
            })
        }





        self.xxx=function(){
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
                            html+="<div  class='TE_114224_browser_title'>"+superClass.label+"</div>"
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

                            var options={withCheckboxes:1}
                            for(var key in treesData){
                                common.jstree.loadJsTree(key,treesData[key],options)

                            }

                        },200)

                    })


                }
                , 200)

        }

        return self;

    }
)()