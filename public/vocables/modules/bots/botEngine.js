var BotEngine = (function() {
  var self = {};


  self.init = function(botModule,options, callback) {
    if(!options){
      options={}
    }
    self.currentBot = botModule;
    self.currentObj = botModule;
    self.history=[]
    self.history.currentIndex=0

    var divId
    if(options.divId){
      divId=options.divId
   //   $("#"+options.divId).html("  <div id='botDiv' style='width:100%;height:350px'></div>")
    }else{
      divId="botDiv"
      $("#botPanel").css("display", "block");
    }


      $("#"+divId).load("modules/bots/html/bot.html", function() {
        $("#botTitle").html(self.currentBot.title);
        if (callback)
          callback();
      });

  };


  self.nextStep = function(returnValue,varToFill) {
    self.history.push( JSON.parse(JSON.stringify(self.currentObj)));
    self.history.currentIndex+=1
    var keys = Object.keys(self.currentObj);


    if (keys.length == 0) {
      return self.end();
    }

    var key = keys[0];

    if (key == "_OR") {// alternative
      var alternatives = self.currentObj[key];
      if (returnValue && alternatives[returnValue]) {
        var obj = self.currentObj["_OR"][returnValue];
        var key0 = Object.keys(obj)[0];
        if (!key0) {
          return self.end();
        }
        if (key0 == "_OR") {
          self.currentObj = obj;
          return self.nextStep();
        }

        var fn = self.currentBot.functions[key0];
        if (!fn || typeof fn !== "function") {
          return alert("function not defined :" + key0);
        }
        if (obj[key0] != "_self") {
          self.currentObj = obj[key0];
        }
        self.setStepMessage(key0);
        fn();
      }

      else {
        var choices = [];
        for (var key in alternatives) {
          choices.push({ id: key, label: key });
        }
        ;
        self.showList(choices,varToFill);
      }
    }
    else {
      var fn = self.currentBot.functions[key];
      if (!fn || typeof fn !== "function") {
        return alert("function not defined :" + key);
      }
      self.currentObj = self.currentObj[key];
      self.setStepMessage(key);
      fn();

    }
  };

  self.previousStep = function(message) {

    if(message)
      self.message(message)
    if(self.history.currentIndex>1){
      self.history.currentIndex-=2
      self.currentObj= self.history[self.history.currentIndex]
      self.nextStep()
    }
    else{
      self.reset()
    }

  }



  self.end = function() {
    self.currentBot.params.queryText = self.getQueryText();
    $("#botPanel").css("display", "none");
    if (self.currentBot.callbackFn) {
      return self.currentBot.callbackFn();
    }
  };

  self.setStepMessage = function(step) {
    if (self.currentBot.functionTitles) {
      var message = self.currentBot.functionTitles[step];
      $("#botMessage").html(message || "select an option");
    }else{
      $("#botMessage").html( "select an option");
    }
  };


  self.message=function(message){
    $("#botMessage").html(message)
  }

  self.abort = function(message) {
    alert(message);
    self.close();
  };

  self.reset = function() {
    self.currentBot.start();

  };


  self.close = function() {
    $("#botPanel").css("display", "none");

  };


  self.showList = function(values, varToFill, returnValue, sort,callback) {
    values = common.StringArrayToIdLabelObjectArray(values);
    if (sort) {
      values.sort(function(a, b) {
        if (a.label > b.label) {
          return 1;
        }
        if (a.label < b.label) {
          return -1;
        }
        return 0;

      });
    }

    $("#bot_resourcesProposalSelect").css("display", "block");
    common.fillSelectOptions("bot_resourcesProposalSelect", values, false, "label", "id");
    $("#bot_resourcesProposalSelect").unbind("change");
    $("#bot_resourcesProposalSelect").bind("change", function() {

      var text = $("#bot_resourcesProposalSelect option:selected").text();
      self.writeCompletedHtml(text + ":");

      var selectedValue = $(this).val();
      if(callback){
        return callback(selectedValue)
      }
      if (varToFill) {
        self.currentBot.params[varToFill] = selectedValue;
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

  self.getQueryText = function() {
    var queryText = "";
    $(".bot-token").each(function() {
      queryText += $(this).html();
    });
    return queryText;
  };


  self.analyse = function(str) {

  };


  return self;


})();
export default BotEngine;

window.BotEngine = BotEngine;