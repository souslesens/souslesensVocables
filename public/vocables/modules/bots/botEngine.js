var BotEngine = (function() {
  var self = {};


  self.init = function(botModule, callback) {
    self.currentBot = botModule;
    self.currentObj = botModule;
    $("#botPanel").css("display", "block");
    //  self.doNext(keywordsTree)
    $("#botDiv").load("modules/bots/html/bot.html", function() {
      $("#botTitle").html(self.currentBot.title);
      if(callback)
      callback();
    });
  };


  self.nextStep = function(returnValue) {
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
        self.showList(choices);
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
      $("#botMessage").html(message || "");
    }
  };

  self.abort = function(message) {
    alert(message);
    self.close();
  };

  self.clear = function() {
    self.currentBot.start();

  };


  self.close = function() {
    $("#botPanel").css("display", "none");

  };


  self.showList = function(values, varToFill, returnValue, sort) {
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