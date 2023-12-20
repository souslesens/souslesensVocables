import BotWidget from "../../uiWidgets/botWidget.js";
import Lineage_sources from "./lineage_sources.js";

var Lineage_queryBuilder=(function(){
  var self={}

  self.init=function(){
    $("#mainDialogDiv").dialog("open")
    $("#mainDialogDiv").load("modules/tools/lineage/html/queryBuilder.html",function(){




      BotWidget.init("lineage_queryBotDiv",Lineage_sources.activeSource,{},true)







    })






  }






  return self;



})()

export default Lineage_queryBuilder;
window.Lineage_queryBuilder=Lineage_queryBuilder