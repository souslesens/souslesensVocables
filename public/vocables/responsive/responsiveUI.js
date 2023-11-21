
import common from "../modules/shared/common.js";


var ResponsiveUI=(function(){
  var self={}

  self.alert=function(message){

  }


  self.init=function(){
  //  MainController.currentTool="lineage"
    var tools=Config.tools_available
    common.fillSelectOptions("toolsSelect",tools,false)

  }

  self.onToolSelect=function(tool){
    MainController.currentTool=tool;
    $("#selectedTool").html(tool)
    ResponsiveUI.showSourceDialog();
  }

  self.onSourceSelect=function(evt,obj) {

    if(!MainController.currentTool)
     return  self.alert('select a tool first')
    if(!obj.node.data || obj.node.data.type!="source")
     return self.alert('select a tool')


    MainController.currentSource=obj.node.data.id
    $("#selectedSource").html(MainController.currentSource)
    self.hideDiv("sources_panel")


    self.initTool(MainController.currentTool,obj.node.data)



  }

  self.initTool=function(tool,source){

  }

  self.showDiv=function(modalDiv){
    $("#"+modalDiv).css("display", "block")
  }

  self.hideDiv=function(modalDiv){
    $("#"+modalDiv).css("display", "none")
  }

  self.showSourceDialog=function() {
    self.showDiv("sources_panel")
    $("#sources_panel").css("display", "block")
    $("#sourceSelector_searchInput").focus()
    SourceSelectorWidget.loadSourcesTreeDiv("sourcesSelectorDiv", {selectTreeNodeFn:ResponsiveUI.onSourceSelect}, function(err, result) {


    })
  }



  return self;

})()
export default ResponsiveUI;
window.ResponsiveUI=ResponsiveUI