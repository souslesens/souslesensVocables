import common from "../../shared/common.js";
import BotWidget from "../../uiWidgets/botWidget.js";

var AxiomsEditor = (function() {

  var self = {};
  self.keywordsMap = null;
  self.showDialog = function(sourceLabel) {
    if (!sourceLabel) {
      sourceLabel = Lineage_sources.activeSource;
    }


    $("#smallDialogDiv").dialog("open");
    $("#smallDialogDiv").load("modules/tools/lineage/html/axiomEditor.html", function() {
      self.init(sourceLabel);
    });
  };
  self.init = function(sourceLabel) {
    var keyWords= {
      "and": { css: "bot-syntax", id: "and", label: "and" },
      "or": { css: "bot-syntax", id: "or", label: "or" },
      "(": { css: "bot-syntax", id: "(", label: "(" },
      ")": { css: "bot-syntax", id: ")", label: ")" }
    }

      BotWidget.init("axiomTA", sourceLabel,keyWords);
  };


  self.analyse = function(str) {

    var lastToken = str;
    if (event.code == "Backspace") {
      $("#" + self.previousTokenId).remove();
    }

    if ((event.ctrlKey == 1 || event.code == "Enter") && lastToken.length > 2) {
      var proposals = [];
      for (var key in self.keywordsMap) {
        if (key.indexOf(lastToken) == 0) {
          proposals.push({ id: lastToken + "|" + self.keywordsMap[key].label, label: self.keywordsMap[key].label });
        }
      }
      if (false && proposals.length == 1) {
        self.onResourceProposalChange(proposals[0].id);
      }
      else {
        common.fillSelectOptions("axioms_resourcesProposalSelect", proposals, false, "label", "id");
        $("#axioms_resourcesProposalSelect").css("display", "block");
      }


    }
    else if (self.keywordsMap[lastToken]) {
      var tokenObj = self.keywordsMap[lastToken];
      self.writeCompletedHtml(tokenObj);

    }
  };


  self.onResourceProposalChange = function(id) {
    var key = id.split("|")[1].toLowerCase();
    var tokenObj = self.keywordsMap[key];
    self.writeCompletedHtml(tokenObj);
    $("#axioms_resourcesProposalSelect").empty();
    $("#axioms_resourcesProposalSelect").css("display", "none");
  };

  self.writeCompletedHtml = function(selectedToken) {

    var tokenId = "token_" + common.getRandomHexaId(5);
    selectedToken.index = Object.keys(self.currentValidTokens).length;
    self.currentValidTokens[tokenId] = selectedToken;
    self.previousTokenId = tokenId;
    var html = "<span class='axiom-token " + selectedToken.css + "' id='" + tokenId + "'>" + selectedToken.label + "</span>";
    html += "<span>&nbsp;</span>";
    $(html).insertBefore("#axiom_inputContainer");
    $("#axiom_input").val("");
    $("#axiom_input").focus();


    return;


  };


  return self;


})();

export default AxiomsEditor;
window.AxiomEditor = AxiomsEditor;