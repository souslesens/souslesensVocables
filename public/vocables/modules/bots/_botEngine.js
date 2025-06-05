var _botEngine = (function () {
    var self = {};
    self.firstLoad = true;
    self.lastFilterListStr = "";
    self.init = function (botModule, initialWorkflow, options, callback) {
        if (!options) {
            options = {};
        }
        // look if there is a bot already open
        if ($("#botContainerDiv")?.length > 0 && !self.oldBotEngine) {
            self.resetOldState = true;
            self.oldBotEngine = common.array.deepCloneWithFunctions(_botEngine);
            /*if(self.newStartParams) {
                self.oldBotEngine.startParams =  self.startParams;
                self.startParams = self.newStartParams;
                self.newStartParams = null;

            }*/
        }
        self.options = options;
        self.currentBot = botModule;
        self.currentObj = initialWorkflow;
        self.initialWorkflow = initialWorkflow;
        self.history = {};
        self.history.workflowObjects = [];
        self.history.returnValues = [];
        //Object {VarFilled:'',valueFilled:''}
        self.history.VarFilling = {};
        self.history.currentIndex = -1;
        // Step is the indexes when currentBot.nextStep is a function when the choice is let to the user
        self.history.step = [];
        self.currentList = [];

        var divId;

        if (options.divId) {
            divId = options.divId;
            self.divId = options.divId;
        } else {
            divId = "botDiv";
            self.divId = "botDiv";
            $($("#botPanel").parent()[0]).on("dialogclose", function (event) {
                self.firstLoad = false;
                // change div bot
                self.resetOldStateFn();
            });
            $("#botPanel").dialog("option", "title", self.currentBot.title);
        }

        $("#" + divId).load("./modules/uiWidgets/html/bot.html", function () {
            if (!options.divId) {
                $("#botPanel").dialog("open");
            }
            if (window.location.href.indexOf("localhost") < 0) {
                $("#KGcreatorBot_exportToGraph").css("display", "none");
            }

            if (!options.divId) {
                if (!self.firstLoad) {
                    $("#" + self.divId)
                        .find("#BotUpperButtons")
                        .remove();
                }
                $("#" + self.divId)
                    .find("#botFilterProposalInput")
                    .on("keyup", self.filterList);
                self.firstLoad = false;
                $("#" + self.divId)
                    .find("#BotUpperButtons")
                    .insertAfter($("#botPanel").parent().find(".ui-dialog-titlebar-close"));

                if (divId != "botDiv") {
                    var dialogWindow = $("#" + divId)
                        .parents()
                        .filter('div[role="dialog"]')[0];
                    var titleDialog = $(dialogWindow).find(".ui-dialog-titlebar-close");
                    var idDialog = "#" + $(dialogWindow).attr("aria-describedby");
                    $("#" + self.divId)
                        .find("#BotUpperButtons")
                        .insertAfter(titleDialog);
                    $(dialogWindow).on("dialogclose", function (event) {
                        $("#" + self.divId).empty();
                        $("#" + self.divId)
                            .find("#resetButtonBot")
                            .remove();
                        $("#" + self.divId)
                            .find("#previousButtonBot")
                            .remove();
                        self.firstLoad = true;
                    });
                }
            }

            //UI.PopUpOnHoverButtons();
            if (callback) {
                callback();
            }
        });
    };

    self.nextStep = function (returnValue, varToFill) {
        $("#" + self.divId)
            .find("#botFilterProposalDiv")
            .hide();
        self.history.workflowObjects.push(JSON.parse(JSON.stringify(self.currentObj)));
        self.history.currentIndex += 1;
        self.history.returnValues.push(returnValue);
        if (!self.currentObj) {
            return self.end();
        }
        var keys = Object.keys(self.currentObj);

        if (keys.length == 0) {
            return self.end();
        }

        var key = keys[0];
        console.log(key);
        if (key == "_OR") {
            // alternative
            var alternatives = self.currentObj[key];
            // if  return value execute function linked to return value in alternative
            if (returnValue) {
                if (alternatives[returnValue]) {
                    var obj = self.currentObj["_OR"][returnValue];
                    var key0 = Object.keys(obj)[0];
                    if (!key0) {
                        return self.end();
                    }

                    if (!obj[key0]) {
                        console.log("WARNING : in bot workflow has to be declared before it is called in another workflow");
                    }
                    if (key0 == "_OR") {
                        self.currentObj = obj;
                        return self.nextStep();
                    }
                } else if (alternatives["_DEFAULT"]) {
                    //  try to find _DEFAULT alternative and functuntion associated
                    var obj = self.currentObj["_OR"]["_DEFAULT"];
                    var key0 = Object.keys(obj)[0];
                } else {
                    self.showAlternatives(alternatives, varToFill);
                    return;
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
            } else {
                self.showAlternatives(alternatives, varToFill);
            }
        } else {
            var fn = self.currentBot.functions[key];
            if (!fn && self.currentBot.functions["_DEFAULT"]) {
                fn = self.currentBot.functions["_DEFAULT"];
            }
            if (!fn || typeof fn !== "function") {
                return alert("function not defined :" + key);
            }

            self.currentObj = self.currentObj[key];
            self.setStepMessage(key);
            fn();
        }
    };

    /**
     *
     * back to a specific previous step
     *
     * works by applying  self.previousStep() until the current step index match the  step desired
     * @param parentStep
     */
    self.backToStep = function (parentStep) {
        var parentStepIndex = -1;
        self.history.workflowObjects.forEach(function (item, index) {
            if (item[parentStep]) {
                parentStepIndex = index;
            }
        });
        if (parentStepIndex < 0) {
            return alert("wrong parentStep " + parentStep);
        }

        var n = 0;
        do {
            self.previousStep();
            n++;
        } while (n <= parentStepIndex);
        self.previousStep();
    };

    self.previousStep = function () {
        if (self.history.currentIndex > 0) {
            $("#" + self.divId)
                .find("#botPromptInput")
                .css("display", "none");

            var lastStepIndex = self.history.step[self.history.step.length - 2];
            if (lastStepIndex == 0) {
                return self.reset();
            }
            self.currentObj = self.history.workflowObjects[lastStepIndex];
            var returnValue = self.history.returnValues[lastStepIndex];

            self.deleteLastMessages(2);

            // cancel var filled concerned by the reverse

            var VarFillingKeys = Object.keys(self.history.VarFilling);
            var VarToUnfill = VarFillingKeys.filter((key) => key >= lastStepIndex);
            if (VarToUnfill.length > 0) {
                for (const key in VarToUnfill) {
                    if (self.history.VarFilling[VarToUnfill[key]]) {
                        var VarFilled = self.history.VarFilling[VarToUnfill[key]].VarFilled;
                        var ValueFilled = self.history.VarFilling[VarToUnfill[key]].valueFilled;
                        if (Array.isArray(self.currentBot.params[VarFilled])) {
                            self.currentBot.params[VarFilled] = self.currentBot.params[VarFilled].filter((item) => item !== ValueFilled);
                        } else {
                            self.currentBot.params[VarFilled] = "";
                        }
                        delete self.history.VarFilling[VarToUnfill[key]];
                    }
                }
            }
            // delete history trough the last step
            self.history.currentIndex = lastStepIndex - 1;
            self.history.workflowObjects = self.history.workflowObjects.filter(function (element, index, array) {
                return index < lastStepIndex;
            });
            self.history.returnValues = self.history.returnValues.filter(function (element, index, array) {
                return index < lastStepIndex;
            });
            self.history.step = self.history.step.filter(function (element, index, array) {
                return element < lastStepIndex;
            });

            self.nextStep(returnValue);
        } else {
            self.history.currentIndex = -1;
            self.nextStep();
            // self.reset();
        }
    };

    self.end = function (dontCallBack) {
        self.currentBot.params.queryText = self.getQueryText();
        self.closeDialog();
        self.resetOldStateFn();
        if (!dontCallBack && self.currentBot.callbackFn) {
            return self.currentBot.callbackFn();
        }
    };

    self.closeDialog = function () {
        if (self.divId != "botDiv") {
            /*  var dialogWindow = $("#" + self.divId)
                  .parents()
                  .filter('div[role="dialog"]')[0];
              var idDialog = "#" + $(dialogWindow).attr("aria-describedby");*/
            $("#" + self.divId).dialog("close");
        } else {
            $("#botPanel").dialog("close");
        }
    };

    self.setStepMessage = function (step) {
        if (self.currentBot.functionTitles) {
            var message = self.currentBot.functionTitles[step];
            // In case 2 questions are asked consecutively erase the last one
            var messageDivs = $("#" + self.divId)
                .find("#botTA")
                .children();
            if (messageDivs.length > 0) {
                var lastMessages = $(messageDivs[0]).children().filter("span");
                if (lastMessages.length == 1) {
                    self.deleteLastMessages();
                }
            }

            if (message) {
                self.insertBotMessage(message, { isQuestion: true });
            } else {
                self.insertBotMessage("select an option", { isQuestion: true });
            }
        }
    };

    self.abort = function (message) {
        alert(message);
        self.close();
    };

    self.reset = function () {
        if (self.startParams && self.startParams.length > 0) {
            self.currentBot.start(...self.startParams, self.options);
        } else {
            self.currentBot.start(self.options);
        }
    };

    self.close = function () {
        $("#botPanel").css("display", "none");
    };
    self.message = function (message) {
        $("#" + self.divId)
            .find("#botMessage")
            .html(message);
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
        if (!self.history.step.includes(self.history.currentIndex)) {
            self.history.step.push(self.history.currentIndex);
        }

        $("#" + self.divId)
            .find("#bot_resourcesProposalSelect")
            .css("display", "block");
        self.currentList = values;
        if (values.length > 20) {
            $("#" + self.divId)
                .find("#botFilterProposalDiv")
                .show();
            $("#botFilterProposalInput").trigger("focus");
        }
        common.fillSelectOptions($("#" + self.divId).find("#bot_resourcesProposalSelect"), values, false, "label", "id");
        $("#" + self.divId)
            .find("#bot_resourcesProposalSelect")
            .unbind("click");
        UI.adjustSelectListSize($("#" + self.divId).find("#bot_resourcesProposalSelect"), 10);
        $("#botPanel").scrollTop($("#botPanel")[0].scrollHeight);
        $("#" + self.divId)
            .find("#bot_resourcesProposalSelect")
            .bind("click", function (evt) {
                var x = evt;
                // to edit
                var text = $("#" + self.divId)
                    .find("#bot_resourcesProposalSelect option:selected")
                    .text();
                if (text == "") {
                    return;
                }
                self.insertBotMessage(text + ":");

                var selectedValue = $(this).val();
                if (Array.isArray(selectedValue)) {
                    selectedValue = selectedValue[0];
                }
                if (evt.ctrlKey) {
                    return;
                }

                if (varToFill) {
                    self.history.VarFilling[self.history.currentIndex] = { VarFilled: varToFill, valueFilled: selectedValue };
                    if (Array.isArray(self.currentBot.params[varToFill])) {
                        self.currentBot.params[varToFill].push(selectedValue);
                    } else {
                        self.currentBot.params[varToFill] = selectedValue;
                    }
                }
                if (callback) {
                    return callback(selectedValue);
                }
                self.nextStep(returnValue || selectedValue);
            });
    };
    self.filterList = function (evt) {
        //var str = $(this).val();
        var str = $(evt.currentTarget).val();
        if (!str && self.lastFilterListStr.length < str.length) {
            return;
        } else {
            common.fillSelectOptions($("#" + self.divId).find("#bot_resourcesProposalSelect"), self.currentList, false, "label", "id");
        }
        if (str.length < 2 && self.lastFilterListStr.length < str.length) {
            return;
        }
        self.lastFilterListStr = str;
        str = str.toLowerCase();
        var selection = [];
        self.currentList.forEach(function (item) {
            if (item.label.toLowerCase().indexOf(str) > -1) {
                selection.push(item);
            }
        });
        common.fillSelectOptions($("#" + self.divId).find("#bot_resourcesProposalSelect"), selection, false, "label", "id");
        UI.adjustSelectListSize($("#" + self.divId).find("#bot_resourcesProposalSelect"), 10);
        $("#" + self.divId)
            .find("#botPanel")
            .scrollTop($("#botPanel")[0].scrollHeight);
    };

    self.promptValue = function (message, varToFill, defaultValue, options, callback) {
        $("#" + self.divId)
            .find("#bot_resourcesProposalSelect")
            .hide();

        if (options && options.datePicker) {
            //DateWidget.unsetDatePickerOnInput("botPromptInput");
            DateWidget.setDatePickerOnInput("botPromptInput", null, function (date) {
                _botEngine.currentBot.params[varToFill] = date.getTime();
                $("#" + self.divId)
                    .find("#botPromptInput")
                    .trigger("focus");

                // self.nextStep();
            });
        }

        $("#" + self.divId)
            .find("#botPromptInput")
            .on("keyup", function (key) {
                if (event.keyCode == 13 || event.keyCode == 9) {
                    DateWidget.unsetDatePickerOnInput("botPromptInput");
                    $("#" + self.divId)
                        .find("#bot_resourcesProposalSelect")
                        .show();
                    $("#" + self.divId)
                        .find("#botPromptInput")
                        .css("display", "none");
                    var value = $(this).val();
                    var varToFill = $("#" + self.divId)
                        .find("#botVarToFill")
                        .val();
                    if (!varToFill) {
                        return _botEngine.previousStep();
                    }
                    //Il faut attribuer l'objet aux bon numéro de currentObject
                    self.history.VarFilling[self.history.currentIndex] = { VarFilled: varToFill, valueFilled: value.trim() };

                    _botEngine.currentBot.params[varToFill] = value.trim();
                    self.insertBotMessage(value);
                    $("#" + self.divId)
                        .find("#botPromptInput")
                        .off();
                    if (callback) {
                        return callback(value);
                    } else {
                        self.nextStep();
                    }
                }
            });
        self.clearProposalSelect();
        $("#" + self.divId)
            .find("#botVarToFill")
            .val(varToFill);
        $("#" + self.divId)
            .find("#botPromptInput")
            .val(defaultValue || "");
        $("#" + self.divId)
            .find("#botPromptInput")
            .css("display", "block");
        $("#" + self.divId)
            .find("#botPromptInput")
            .trigger("focus");
        if (!self.history.step.includes(self.history.currentIndex)) {
            self.history.step.push(self.history.currentIndex);
        }
    };

    self.insertBotMessage = function (str, options) {
        if (!str) {
            return;
        }
        if (!options) {
            options = {};
        }

        if (options.isQuestion) {
            var chat_class = "chat-left";
        } else {
            var chat_class = "chat-right";
        }
        var tokenId = "token_" + common.getRandomHexaId(5);
        var html = "";
        if (chat_class == "chat-left") {
            html += '<div style="display: flex; flex-direction: row;justify-content: space-between; align-items: center; ">';
        }
        html += "<span class='" + chat_class + "' id='" + tokenId + "'>" + str + "</span>";
        if (chat_class == "chat-left") {
            html += "</div>";
            self.lastTokenId = tokenId;
        }
        if (chat_class == "chat-right") {
            $(html).insertAfter("#" + self.lastTokenId);
        } else {
            $("#" + self.divId)
                .find("#botTA")
                .prepend(html);
            //$(html).insertBefore("#bot_input");
        }

        $("#" + self.divId)
            .find("#bot_input")
            .val("");
        $("#" + self.divId)
            .find("#bot_input")
            .trigger("focus");
        if ($("#botDiv")[0].scrollHeight > 500) {
            $("#botPanel").scrollTop($("#botPanel")[0].scrollHeight);
        }

        return;
    };

    self.showAlternatives = function (alternatives, varToFill) {
        var choices = [];
        for (var key in alternatives) {
            choices.push({ id: key, label: key });
        }

        self.showList(choices, varToFill);
        self.setStepMessage();
    };

    self.getQueryText = function () {
        var queryText = "";
        $(".bot-token").each(function () {
            queryText += $(this).html();
        });
        return queryText;
    };
    self.clearProposalSelect = function () {
        $("#" + self.divId)
            .find("#bot_resourcesProposalSelect")
            .find("option")
            .remove()
            .end();
    };

    self.exportToGraph = function () {
        var functionTitles = self.currentBot.functionTitles;
        var workflow = self.initialWorkflow;

        var visjsData = { nodes: [], edges: [] };

        var existingNodes = {};
        var recurse = function (obj, parentId, level) {
            if (typeof obj == "object") {
                for (var key in obj) {
                    if (true || key != parentId) {
                        var nodeId = common.getRandomHexaId(5);

                        visjsData.nodes.push({
                            id: nodeId,
                            label: key == "_OR" ? "" : functionTitles[key] || key,
                            shape: key == "_OR" ? "diamond" : "box",
                            size: 10,
                            level: level,
                            data: {
                                id: nodeId,
                                label: functionTitles[key] || key,
                            },
                        });
                        if (parentId) {
                            visjsData.edges.push({
                                id: common.getRandomHexaId(5),
                                from: nodeId,
                                to: parentId,
                                color: Lineage_whiteboard.defaultEdgeColor,
                                arrows: {
                                    from: {
                                        enabled: true,
                                        type: Lineage_whiteboard.defaultEdgeArrowType,
                                        scaleFactor: 0.5,
                                    },
                                },
                            });
                        }
                        recurse(obj[key], nodeId, level + 1);
                    }
                }
            }
        };

        var title = self.currentBot.title;
        visjsData.nodes.push({
            id: title,
            label: title,
            shape: "ellipse",
            color: "#117de8",
            font: { color: "white", size: 18 },

            level: 0,
            data: {
                id: title,
                label: title,
            },
        });

        recurse(workflow, title, 1);
        var x = visjsData;

        $("#mainDialogDiv").html(
            "" + "<div><button onclick='  Lineage_whiteboard.lineageVisjsGraph.toSVG();'>toSVG</button> </div>" + "<div id='botGraphDiv' style='width:1200px;height:800px'></div>",
        );
        $("#mainDialogDiv").dialog("open");
        //  $("#mainDialogDiv").parent().css("z-index", 1);
        Lineage_whiteboard.drawNewGraph(visjsData, "botGraphDiv", {
            layoutHierarchical: { levelSeparation: 150, nodeSpacing: 50, direction: "LR" },
            physics: { enabled: true },
        });
    };
    self.fillStartParams = function (params) {
        var startParams = [];
        var param;
        for (let i = 0; i < params.length; i++) {
            param = params[i];
            if (param) {
                try {
                    // Essayer de convertir en JSON
                    var str = JSON.stringify(param);
                    param = JSON.parse(str);
                } catch (e) {}
            }

            startParams.push(param);
        }
        return startParams;
        /* if($('#botContainerDiv')?.length >0){
            self.newStartParams =startParams;

           
        }else{
            self.startParams = startParams;
        }*/

        return;
    };
    self.deleteLastMessages = function (numberOfMessagesToRemove) {
        if (!numberOfMessagesToRemove) {
            numberOfMessagesToRemove = 1;
        }
        for (var i = 0; i < numberOfMessagesToRemove; i++) {
            var messageDivs = $("#" + self.divId)
                .find("#botTA")
                .children();
            if (messageDivs.length > 0) {
                var lastMessageDiv = $(messageDivs[0]);
                var lastMessages = $(lastMessageDiv).children().filter("span");
                if (lastMessages.length == 1) {
                    $(lastMessageDiv).remove();
                } else {
                    $(lastMessages[1]).remove();
                }
            }
        }
    };
    self.resetOldStateFn = function () {
        if (!self.resetOldState) {
            return;
        }
        if (self.divId == "botDiv") {
            $("#botPanel").parent().find("#BotUpperButtons").remove();
        }

        setTimeout(function () {
            if (self.oldBotEngine) {
                self = common.array.deepCloneWithFunctions(self.oldBotEngine);
                self.resetOldState = false;
                self.oldBotEngine = null;
            }
        }, 300);
    };

    return self;
})();
export default _botEngine;

window._botEngine = _botEngine;
