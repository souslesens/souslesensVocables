import GanttSimulation from "./ganttSimulation.js";
import TagGeometry from "./tagGeometry.js";

import FiltersWidget from "./filtersWidget.js";
import CustomNodeInfos   from "./customNodeInfos.js";
import DataManager from "./dataManager.js";
import GroupsController from "./groupsController.js";


var Lifex_cost = (function() {
        var self = {};

        self.skipTagGeometry=true
        /*$('.vis-inner').filter(function() {
        return $(this).text()=='Structure';
        }).offset().top()*/
        self.planningSourceUri='http://data.total/resource/tsf/PRIMAVERA_REZA_17_07_2024/';
        self.currentSource = "LIFEX-DALIA_1";

        self.setConfig=function(config){
            self.database=config.id;
        }
        self.onLoaded = function() {


            self.lifexUri=Config.sources[self.currentSource].graphUri;
            $("#lateralPanelDiv").load("/modules/tools/Lifex_cost/html/leftPanel.html", function() {


                $("#Lifex_cost_left_tabs").tabs({

                    create: function(event, ui) {
                        $("[aria-selected='true']").addClass("nodesInfos-selectedTab");
                    },
                    activate: function(event, ui) {
                        $(".nodeInfosWidget_tabDiv").removeClass("nodesInfos-selectedTab");

                        setTimeout(function() {
                            $("[aria-selected='true']").addClass("nodesInfos-selectedTab");
                            if ($(ui.newTab).text() == "Cumul") {
                                DataManager.drawCumulTable();
                            }


                        }, 100);
                    }
                });
                // CRUDsource, slsvSource, scope, targetSelect, callback
                //   SavedQueriesWidget.list("STORED_KGQUERY_QUERIES", self.currentSource, null,"tagsCalendarSoredQueries" );
                FiltersWidget.loadTree(self.currentSource);


                var values=Object.keys(DataManager.quantityVarNamesMap)

                common.fillSelectOptions("Lifex_cost_quantityVarSelect",values,false)

                $('#Lifex_cost_quantityVarSelect').on('change',function(evt){
                    var yAxisVal=$('#Lifex_cost_quantityVarSelect').val();
                    if(yAxisVal.indexOf('Ressource') > -1){
                        var jstreeData=[{
                            id: "Resource",
                            text: "Resource Type",
                            parent: '#',
                            data: {
                                id: "Resource",
                                label: "Resource Type"
                            }

                        }];
                        JstreeWidget.addNodesToJstree(FiltersWidget.jstreeDiv, '#', jstreeData, null, function() {
                           FiltersWidget.openTopNode('Resource',function(){
                            /*var descendants=$("#" + FiltersWidget.jstreeDiv).jstree().get_node('Resource').children_d
                            $("#" + FiltersWidget.jstreeDiv).jstree().check_node(descendants);*/
                           });

                           $('#Lifex_cost_SplitBySelect').append('<option value="Resource">Resource type</option>');
                           $('#Lifex_cost_SplitBySelect').val('Resource');
                        });


                    }else{
                        $('#'+FiltersWidget.jstreeDiv).jstree().delete_node('Resource');
                        $("#Lifex_cost_SplitBySelect option[value='Resource']").remove();

                    }
                })

          /*     $("#tagsCalendarItemsSelect") .on("click",function(evt){
                   var selection=$(this).val()
                   if(evt.ctrlKey)
                  CustomNodeInfos.showNodeInfos(selection)
                  else if(evt.altKey)
                       Simulator.initSimulatorWidget(selection);
                   else{
                       TagsGeometry.highlightTags([selection]);
                   }
               }).on( "dblclick" ,function(evt) {
                   var selection = $(this).val()
                    CustomNodeInfos.showNodeInfos(selection)
               })*/



                $("#graphDiv").load("/plugins/Lifex_cost/html/rightPanel.html", function(x, y) {
                 //  TagsGeometry.drawAllTags("crossSection",function(err,decksMap){

                    if(!Lifex_cost.skipTagGeometry) {
                        TagsGeometry.drawAllTags("plan", function(err, decksMap) {

                          /*      var html = "";
                                for (var deck in decksMap) {
                                    html += "&nbsp;<span style='font-weight:bold;background-color:" + decksMap[deck] + "'>" + deck + "</span>&nbsp;";
                                }
                                $("#tagsGeometryDecksDiv").html(html);*/

                        })
                    }
                    $("#LifexPlanning_right_tabs").tabs({

                        create: function(event, ui) {
                            $("[aria-selected='true']").addClass("nodesInfos-selectedTab");
                        },
                                activate: function (event, ui) {
                                    $(".nodeInfosWidget_tabDiv").removeClass("nodesInfos-selectedTab");
                
                                    setTimeout(function () {
                                        $("[aria-selected='true']").addClass("nodesInfos-selectedTab");
                                        if ($(ui.newTab).text() == "Simulator") {
                                           GanttSimulation.showSimulationTable();
                                        }
                                        
                                    }, 100);
                                },
                    })


                    $( "#tagNeigborhoodSlider" ).slider({
                        min:0,
                        max:50,
                        value:0,
                        create: function() {

                            $( "#tagNeigborhoodSliderHandle" ).text( $( this ).slider( "value" ) );
                        },
                        slide: function( event, ui ) {
                            $( "#tagNeigborhoodSliderHandle" ).text( ui.value );
                            TagGeometry.selectTagsAroundTag()
                        }
                    });
                });
               /* $("#Lifex_cost_SplitBySelect").val("Activity")
                FiltersWidget.draw2dChart();*/


              //  });
            });
        };







        return self;


    }


)
();
export default Lifex_cost;
window.Lifex_cost = Lifex_cost;