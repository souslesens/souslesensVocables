var BotEngine = (function() {
  var self = {};





  self.init = function(botModule) {
    self.currentBot=botModule
   $("#botPanel").css("display","block")
      //  self.doNext(keywordsTree)
   $("#botDiv").load("modules/bots/html/bot.html",function(){
     self.currentBot.start();
   })








  };

  self.clear = function() {
    self.currentBot.start();

  };



  self.showList = function(values, varToFill, returnValue) {

    values.sort(function(a, b) {
      if (a.label > b.label) {
        return 1;
      }
      if (a.label < b.label) {
        return -1;
      }
      return 0;

    });

    $("#bot_resourcesProposalSelect").css("display", "block");
    common.fillSelectOptions("bot_resourcesProposalSelect", values, false, "label", "id");
    $("#bot_resourcesProposalSelect").unbind("change");
    $("#bot_resourcesProposalSelect").bind("change", function() {

      var text = $("#bot_resourcesProposalSelect option:selected").text();
      self.writeCompletedHtml(text + ":");

      var selectedValue = $(this).val();
      if (varToFill) {
        self.currentBot.currentQuery[varToFill] = selectedValue;
      }
      self.nextStep(returnValue || selectedValue);
    });

  };


  self.writeCompletedHtml = function(str) {
    if (!str) {
      return;
    }
    var tokenId = "token_" + common.getRandomHexaId(5);
    var html = "<span class='bot-token " + "" + "' id='" + tokenId + "'>" + str + "</span>";
    $(html).insertBefore("#bot_input");
    $("#bot_input").val("");
    $("#bot_input").focus();
    return;
  };

  self.getQueryText=function(){
    var queryText=""
    $(".bot-token").each(function(){
      queryText+=$(this).html();
    })
    return queryText;
  }





  self.currentObj=null
  self.nextStep = function(returnValue) {
    if(!self.currentObj)
      self.currentObj=returnValue;
    var keys = Object.keys(self.currentObj);


    if (keys.length == 0) {
      $("#mainDialogDiv").dialog("close");
      self.currentQuery.queryText=self.getQueryText();
      if(self.workflowEndCallbackFn) {

        return self.workflowEndCallbackFn(null, self.currentQuery)
      }
      return;
    }

    var key = keys[0];

    if (key == "_OR") {// alternative
      var alternatives = self.currentObj[key];
      if (returnValue && alternatives[returnValue]) {
        var obj = self.currentObj["_OR"][returnValue];
        var fnName = Object.keys(obj)[0];
        var fn = self.currentBot.functions[fnName];
        if (!fn || typeof fn !== "function") {
          return alert("function not defined :" + fnName);
        }
        self.currentObj = obj[fnName];
        fn();


      }


    }
    else {
      var fn = self.currentBot.functions[key];
      if (!fn || typeof fn !== "function") {
        return alert("function not defined :" + key);
      }

      fn();
      self.currentObj = self.currentObj[key];
    }
  };






  self.analyse = function(str) {

  }

  self.clear = function() {
    //   self.test();

  };


  return self;


})();
export default BotEngine;

window.BotEngine = BotEngine;