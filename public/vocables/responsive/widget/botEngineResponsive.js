var BotEngineResponsive = (function () {
    var self = {};
    self.firstLoad=true;
    self.init = function (botModule, options, callback) {
        if (!options) {
            options = {};
        }
        BotEngine.currentBot = botModule;
        BotEngine.currentObj = botModule;
        BotEngine.history = [];
        BotEngine.history.currentIndex = 0;

        var divId = "botDiv";
        $("#botPanel").dialog('open');
        $("#botPanel").dialog("option", "title",BotEngine.currentBot.title);
        
        $("#botPanel").parent().css('top','13%');
        $("#botPanel").parent().css('left','30%');
        $("#" + divId).load("responsive/widget/html/botResponsive.html", function () {
            $('#resetButtonBot').insertAfter($('#botPanel').parent().find(".ui-dialog-titlebar-close"));
            $('#previousButtonBot').insertAfter($('#botPanel').parent().find(".ui-dialog-titlebar-close"));
            if (callback) callback();
        });
    };

    self.nextStep = function (returnValue, varToFill) {
        BotEngine.history.push(JSON.parse(JSON.stringify(BotEngine.currentObj)));
        BotEngine.history.currentIndex += 1;
        var keys = Object.keys(BotEngine.currentObj);

        if (keys.length == 0) {
            return self.end();
        }

        var key = keys[0];

        if (key == "_OR") {
            // alternative
            var alternatives = BotEngine.currentObj[key];
            if (returnValue && alternatives[returnValue]) {
                var obj = BotEngine.currentObj["_OR"][returnValue];
                var key0 = Object.keys(obj)[0];
                if (!key0) {
                    return self.end();
                }
                if (key0 == "_OR") {
                    BotEngine.currentObj = obj;
                    return self.nextStep();
                }

                var fn = BotEngine.currentBot.functions[key0];
                if (!fn || typeof fn !== "function") {
                    return alert("function not defined :" + key0);
                }
                if (obj[key0] != "_self") {
                    BotEngine.currentObj = obj[key0];
                }
                self.setStepMessage(key0);
                fn();
            } else {
                var choices = [];
                for (var key in alternatives) {
                    choices.push({ id: key, label: key });
                }
                self.showList(choices, varToFill);
            }
        } else {
            var fn = BotEngine.currentBot.functions[key];
            if (!fn || typeof fn !== "function") {
                return alert("function not defined :" + key);
            }
            BotEngine.currentObj = BotEngine.currentObj[key];
            self.setStepMessage(key);
            fn();
        }
    };

    self.previousStep = function (message) {
        if (message) self.message(message);
        if (BotEngine.history.currentIndex > 1) {
            BotEngine.history.currentIndex -= 2;
            BotEngine.currentObj = BotEngine.history[BotEngine.history.currentIndex];
            //delete last 3 message sended
            var childrens=$('#botTA').children();
            // last is bot_input --> don't count
            $('#botTA').children().slice(-4).filter('span').remove();
            self.nextStep();
        } else {
            self.reset();
        }
    };

    self.end = function () {
        BotEngine.currentBot.params.queryText = self.getQueryText();
        $("#botPanel").dialog('close');
        if (BotEngine.currentBot.callbackFn) {
            return BotEngine.currentBot.callbackFn();
        }
    };

    self.setStepMessage = function (step) {
        if (BotEngine.currentBot.functionTitles) {
            var message = BotEngine.currentBot.functionTitles[step];
            BotEngine.writeCompletedHtml(message || "select an option",{question:true});
            //$("#botMessage").html(message || "select an option");
        } else {
            //$("#botMessage").html("select an option");
            self.writeCompletedHtml("select an option",{question:true});
        }
    };

    self.message = function (message) {
        $("#botMessage").html(message);
    };

    self.abort = function (message) {
        alert(message);
        self.close();
    };

    self.reset = function () {
        $('#resetButtonBot').remove();
        $('#previousButtonBot').remove();
        BotEngine.currentBot.start();
    };

    self.close = function () {
        $("#botPanel").dialog("close", "none");
    };

    self.showList = function (values, varToFill, returnValue, sort, callback) {
        values = common.StringArrayToIdLabelObjectArray(values);
        if (sort) {
            values.sort(function (a, b) {
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
        $("#bot_resourcesProposalSelect").bind("change", function () {
            var text = $("#bot_resourcesProposalSelect option:selected").text();
            self.writeCompletedHtml(text + ":");

            var selectedValue = $(this).val();
            if (callback) {
                return callback(selectedValue);
            }
            if (varToFill) {
                BotEngine.currentBot.params[varToFill] = selectedValue;
            }

            self.nextStep(returnValue || selectedValue);
        });
    };

    self.writeCompletedHtml = function (str,options) {
        if (!str) {
            return;
        }
        if (!options) {
            options={};
        }
        if(options.question){
            var chat_class='chat-left';
        }
        else{
            var chat_class='chat-right';
        }
        var tokenId = "token_" + common.getRandomHexaId(5);
        var html = "<span class='"+chat_class + "' id='" + tokenId + "'>" + str + "</span>";
        $(html).insertBefore("#bot_input");
        $("#bot_input").val("");
        $("#bot_input").focus();
        return;
    };

    self.getQueryText = function () {
        var queryText = "";
        $(".bot-token").each(function () {
            queryText += $(this).html();
        });
        return queryText;
    };

    self.analyse = function (str) {};

    return self;
})();
export default BotEngineResponsive;

window.BotEngineResponsive = BotEngineResponsive;
