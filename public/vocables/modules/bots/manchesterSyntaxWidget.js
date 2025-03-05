import common from "../shared/common.js";

var ManchesterSyntaxWidget = (function () {
    var self = {};
    self.keywordsMap = {};

    self.init = function (divId, sourceLabel, specificKeywordsMap, basicVocabularies, callback) {
        //  $("#"+divId).before(self.getCss(self.getCss()))
        $("#" + divId).html(self.getHtml());
        $("#bot_input") .trigger( "focus" );
        $("#bot_resourcesProposalSelect").css("display", "none");

        self.initKeywords(sourceLabel, specificKeywordsMap, basicVocabularies, callback);
    };

    self.initKeywords = function (sourceLabel, specificKeywordsMap, basicVocabularies, callback) {
        var sources = [sourceLabel];
        var imports = Config.sources[sourceLabel].imports;
        imports.forEach(function (importSource) {
            sources.push(importSource);
        });

        sources.forEach(function (source) {
            var classes = Config.ontologiesVocabularyModels[source].classes;
            for (var classId in classes) {
                var classObj = classes[classId];
                self.keywordsMap[classObj.label.toLowerCase()] = { css: "bot-class", id: classObj.id, label: classObj.label };
            }

            var properties = Config.ontologiesVocabularyModels[source].properties;

            for (var propId in properties) {
                var propertyObj = properties[propId];
                self.keywordsMap[propertyObj.label.toLowerCase()] = { css: "bot-property", id: propertyObj.id, label: propertyObj.label };
            }
        });

        if (basicVocabularies) {
            var vocabs = Object.keys(Config.basicVocabularies);
            vocabs.forEach(function (source) {
                var classes = Config.ontologiesVocabularyModels[source].classes;
                for (var classId in classes) {
                    var classObj = classes[classId];
                    self.keywordsMap[classObj.label.toLowerCase()] = { css: "bot-class", id: classObj.id, label: classObj.label };
                }

                var properties = Config.ontologiesVocabularyModels[source].properties;

                for (var propId in properties) {
                    var propertyObj = properties[propId];
                    self.keywordsMap[propertyObj.label.toLowerCase()] = { css: "bot-property", id: propertyObj.id, label: propertyObj.label };
                }
            });
        }

        if (specificKeywordsMap) {
            for (var key in specificKeywordsMap) {
                self.keywordsMap[key] = specificKeywordsMap[key];
            }
        }

        self.currentValidTokens = {};

        if (callback) {
            return callback();
        }
    };

    self.analyse = function (str) {
        var lastToken = str.toLowerCase();
        if (event.code == "Backspace" && event.ctrlKey == 1) {
            $("#" + self.previousTokenId).remove();
        }

        if (event.ctrlKey == 1 || (event.code == "Enter" && lastToken.length > 2)) {
            var proposals = [];
            for (var key in self.keywordsMap) {
                if (key.indexOf(lastToken) == 0) {
                    proposals.push({ id: lastToken + "|" + self.keywordsMap[key].label, label: self.keywordsMap[key].label });
                }
            }
            if (false && proposals.length == 1) {
                self.onResourceProposalChange(proposals[0].id);
            } else {
                common.fillSelectOptions("bot_resourcesProposalSelect", proposals, false, "label", "id");
                $("#bot_resourcesProposalSelect").css("display", "block");
            }
        } else if (self.keywordsMap[lastToken]) {
            var tokenObj = self.keywordsMap[lastToken];
            self.writeCompletedHtml(tokenObj);
        }
    };

    self.onResourceProposalChange = function (id) {
        var strArray = id.split("|");
        if (strArray.length < 2) {
            return;
        }
        var key = id.split("|")[1].toLowerCase();
        var tokenObj = self.keywordsMap[key];
        self.writeCompletedHtml(tokenObj);
        $("#bot_resourcesProposalSelect").empty();
        $("#bot_resourcesProposalSelect").css("display", "none");
    };

    self.writeCompletedHtml = function (selectedToken) {
        if (!selectedToken) {
            return;
        }
        var tokenId = "token_" + common.getRandomHexaId(5);
        selectedToken.index = Object.keys(self.currentValidTokens).length;
        self.currentValidTokens[tokenId] = selectedToken;
        self.previousTokenId = tokenId;
        var html = "<span class='bot-token " + selectedToken.css + "' id='" + tokenId + "'>" + selectedToken.label + "</span>";
        html += "<span>&nbsp;</span>";
        $(html).insertBefore("#bot_inputContainer");
        $("#bot_input").val("");
        $("#bot_input") .trigger( "focus" );

        return;
    };

    self.getHtml = function () {
        var html =
            '  <div id="botTA" contenteditable="false">\n' +
            '          <div id="bot_inputContainer" style="display: flex;flex-direction: column;border:none;">\n' +
            '            <input id="bot_input"  autocomplete="off" onkeyup="ManchesterSyntaxWidget.analyse($(this).val())">\n' +
            '            <select id="bot_resourcesProposalSelect" size="4" onchange="ManchesterSyntaxWidget.onResourceProposalChange($(this).val())"></select>\n' +
            "          </div>\n" +
            "        </div>" +
            "<div><button onclick='ManchesterSyntaxWidget.reset()'>X</button></div>";

        return html;
    };

    self.getCss = function () {
        var css =
            "<style>" +
            "    #botTA {\n" +
            "        border: 1px solid saddlebrown;\n" +
            "        font-weight: bold;\n" +
            "        width: 90%;\n" +
            "        display: flex;\n" +
            "        flex-direction: row;\n" +
            "        flex-wrap: wrap;\n" +
            "    }\n" +
            "    #bot-input {\n" +
            "        border: none;\n" +
            "    }\n" +
            "    .bots-syntax {\n" +
            "        color: blue;\n" +
            "    }\n" +
            "    .bots-class {\n" +
            "        color: red;\n" +
            "    }\n" +
            "    .bots-property {\n" +
            "        color: green;\n" +
            "    }\n" +
            "</style>";

        return css;
    };

    self.reset = function () {
        $(".bot-token").remove();
        self.currentValidTokens = {};
    };

    self.getText = function () {
        var text = "";
        $(".bot-token").each(function () {
            text += $(this).html() + "";
        });
        return text;
    };

    return self;
})();

export default ManchesterSyntaxWidget;
window.ManchesterSyntaxWidget = ManchesterSyntaxWidget;
