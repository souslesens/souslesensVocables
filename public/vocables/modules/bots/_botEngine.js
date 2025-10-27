var _botEngine = (function () {
    var self = {};
    self.lastFilterListStr = "";
    self.init = function (botModule, initialWorkflow, options, callback) {
        if (!options) {
            options = {};
        }
        // look if there is a bot already open
        if ($("#botContainerDiv")?.length > 0 && !_botEngine.oldBotEngine) {
            _botEngine.resetOldState = true;
            _botEngine.oldBotEngine = common.array.deepCloneWithFunctions(_botEngine);
            /*if(_botEngine.newStartParams) {
                _botEngine.oldBotEngine.startParams =  _botEngine.startParams;
                _botEngine.startParams = _botEngine.newStartParams;
                _botEngine.newStartParams = null;

            }*/
        }
        _botEngine.options = options;
        _botEngine.currentBot = botModule;
        _botEngine.currentObj = initialWorkflow;
        _botEngine.initialWorkflow = initialWorkflow;
        _botEngine.history = {};
        _botEngine.history.workflowObjects = [];
        _botEngine.history.returnValues = [];
        //Object {VarFilled:'',valueFilled:''}
        _botEngine.history.VarFilling = {};
        _botEngine.history.currentIndex = -1;
        // Step is the indexes when currentBot.nextStep is a function when the choice is let to the user
        _botEngine.history.step = [];
        _botEngine.currentList = [];

        var divId;

        if (options.divId) {
            divId = options.divId;
            _botEngine.divId = options.divId;
            $("#" + _botEngine.divId)
                .find("#resetButtonBot")
                .remove();
        } else {
            divId = "botDiv";
            _botEngine.divId = "botDiv";
            $($("#botPanel").parent()[0]).on("dialogclose", function (event) {
                // change div bot
                _botEngine.resetOldStateFn();
            });
            UI.setDialogTitle("#botPanel", _botEngine.currentBot.title);
            $("#botPanel").parent().find("#BotUpperButtons").remove();
        }

        $("#" + divId).load("./modules/uiWidgets/html/bot.html", function () {
            if (!options.divId) {
                UI.openDialog("botPanel");
            }
            if (window.location.href.indexOf("localhost") < 0) {
                $("#KGcreatorBot_exportToGraph").css("display", "none");
            }

            if (!options.divId) {
                $("#" + _botEngine.divId)
                    .find("#botFilterProposalInput")
                    .on("keyup", _botEngine.filterList);

                $("#" + _botEngine.divId)
                    .find("#BotUpperButtons")
                    .insertAfter($("#botPanel").parent().find(".ui-dialog-titlebar-close"));

                if (divId != "botDiv") {
                    var dialogWindow = $("#" + divId)
                        .parents()
                        .filter('div[role="dialog"]')[0];
                    var titleDialog = $(dialogWindow).find(".ui-dialog-titlebar-close");
                    var idDialog = "#" + $(dialogWindow).attr("aria-describedby");
                    $(dialogWindow).on("dialogclose", function (event) {
                        $("#" + _botEngine.divId).empty();
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
        $("#" + _botEngine.divId)
            .find("#botFilterProposalDiv")
            .hide();
        _botEngine.history.workflowObjects.push(JSON.parse(JSON.stringify(_botEngine.currentObj)));
        _botEngine.history.currentIndex += 1;
        _botEngine.history.returnValues.push(returnValue);
        if (!_botEngine.currentObj) {
            return _botEngine.end();
        }
        var keys = Object.keys(_botEngine.currentObj);

        if (keys.length == 0) {
            return _botEngine.end();
        }

        var key = keys[0];

        if (key == "_OR") {
            // alternative
            var alternatives = _botEngine.currentObj[key];
            // if  return value execute function linked to return value in alternative
            if (returnValue) {
                if (alternatives[returnValue]) {
                    var obj = _botEngine.currentObj["_OR"][returnValue];
                    var key0 = Object.keys(obj)[0];
                    if (!key0) {
                        return _botEngine.end();
                    }

                    if (!obj[key0]) {
                        console.log("WARNING : in bot workflow has to be declared before it is called in another workflow");
                    }
                    if (key0 == "_OR") {
                        _botEngine.currentObj = obj;
                        return _botEngine.nextStep();
                    }
                } else if (alternatives["_DEFAULT"]) {
                    //  try to find _DEFAULT alternative and functuntion associated
                    var obj = _botEngine.currentObj["_OR"]["_DEFAULT"];
                    var key0 = Object.keys(obj)[0];
                } else {
                    _botEngine.showAlternatives(alternatives, varToFill);
                    return;
                }

                var fn = _botEngine.currentBot.functions[key0];

                if (!fn || typeof fn !== "function") {
                    return alert("function not defined :" + key0);
                }
                if (obj[key0] != "_self") {
                    _botEngine.currentObj = obj[key0];
                }
                _botEngine.setStepMessage(key0);
                fn();
            } else {
                _botEngine.showAlternatives(alternatives, varToFill);
            }
        } else {
            var fn = _botEngine.currentBot.functions[key];
            if (!fn && _botEngine.currentBot.functions["_DEFAULT"]) {
                fn = _botEngine.currentBot.functions["_DEFAULT"];
            }
            if (!fn || typeof fn !== "function") {
                return alert("function not defined :" + key);
            }

            _botEngine.currentObj = _botEngine.currentObj[key];
            _botEngine.setStepMessage(key);
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
        _botEngine.history.workflowObjects.forEach(function (item, index) {
            if (item[parentStep]) {
                parentStepIndex = index;
            }
        });
        if (parentStepIndex < 0) {
            return alert("wrong parentStep " + parentStep);
        }

        _botEngine.currentObj = _botEngine.history.workflowObjects[parentStepIndex];
        _botEngine.nextStep();

        /*   var n = 0;
        do {
            self.previousStep();
            n++;
        } while (n <= parentStepIndex);*/
        // self.previousStep();
    };

    self.previousStep = function () {
        if (_botEngine.history.currentIndex > 0) {
            $("#" + _botEngine.divId)
                .find("#botPromptInput")
                .css("display", "none");

            var lastStepIndex = _botEngine.history.step[_botEngine.history.step.length - 2];
            if (lastStepIndex == 0) {
                return _botEngine.reset();
            }
            _botEngine.currentObj = _botEngine.history.workflowObjects[lastStepIndex];
            var returnValue = _botEngine.history.returnValues[lastStepIndex];

            _botEngine.deleteLastMessages(2);

            // cancel var filled concerned by the reverse

            var VarFillingKeys = Object.keys(_botEngine.history.VarFilling);
            var VarToUnfill = VarFillingKeys.filter((key) => key >= lastStepIndex);
            if (VarToUnfill.length > 0) {
                for (const key in VarToUnfill) {
                    if (_botEngine.history.VarFilling[VarToUnfill[key]]) {
                        var VarFilled = _botEngine.history.VarFilling[VarToUnfill[key]].VarFilled;
                        var ValueFilled = _botEngine.history.VarFilling[VarToUnfill[key]].valueFilled;
                        if (Array.isArray(_botEngine.currentBot.params[VarFilled])) {
                            _botEngine.currentBot.params[VarFilled] = _botEngine.currentBot.params[VarFilled].filter((item) => item !== ValueFilled);
                        } else {
                            _botEngine.currentBot.params[VarFilled] = "";
                        }
                        delete _botEngine.history.VarFilling[VarToUnfill[key]];
                    }
                }
            }
            // delete history trough the last step
            _botEngine.history.currentIndex = lastStepIndex - 1;
            _botEngine.history.workflowObjects = _botEngine.history.workflowObjects.filter(function (element, index, array) {
                return index < lastStepIndex;
            });
            _botEngine.history.returnValues = _botEngine.history.returnValues.filter(function (element, index, array) {
                return index < lastStepIndex;
            });
            _botEngine.history.step = _botEngine.history.step.filter(function (element, index, array) {
                return element < lastStepIndex;
            });

            _botEngine.nextStep(returnValue);
        } else {
            _botEngine.history.currentIndex = -1;
            _botEngine.nextStep();
            // self.reset();
        }
    };

    self.end = function (dontCallBack) {
        _botEngine.currentBot.params.queryText = _botEngine.getQueryText();
        _botEngine.closeDialog();
        _botEngine.resetOldStateFn();
        if (!dontCallBack && _botEngine.currentBot.callbackFn) {
            return _botEngine.currentBot.callbackFn();
        }
    };

    self.closeDialog = function () {
        if (_botEngine.divId != "botDiv") {
            /*  var dialogWindow = $("#" + _botEngine.divId)
                  .parents()
                  .filter('div[role="dialog"]')[0];
              var idDialog = "#" + $(dialogWindow).attr("aria-describedby");*/
            $("#" + _botEngine.divId).dialog("close");
        } else {
            $("#botPanel").dialog("close");
        }
    };

    self.setStepMessage = function (step) {
        if (_botEngine.currentBot.functionTitles) {
            var message = _botEngine.currentBot.functionTitles[step];
            // In case 2 questions are asked consecutively erase the last one
            var messageDivs = $("#" + _botEngine.divId)
                .find("#botTA")
                .children();
            if (messageDivs.length > 0) {
                var lastMessages = $(messageDivs[0]).children().filter("span");
                if (lastMessages.length == 1) {
                    _botEngine.deleteLastMessages();
                }
            }

            if (message) {
                _botEngine.insertBotMessage(message, { isQuestion: true });
            } else {
                _botEngine.insertBotMessage("select an option", { isQuestion: true });
            }
        }
    };

    self.abort = function (message) {
        alert(message);
        _botEngine.close();
    };

    self.reset = function () {
        if (_botEngine.startParams && _botEngine.startParams.length > 0) {
            _botEngine.currentBot.start(..._botEngine.startParams, _botEngine.options);
        } else {
            _botEngine.currentBot.start(_botEngine.options);
        }
    };

    self.close = function () {
        $("#botPanel").css("display", "none");
    };
    self.message = function (message) {
        $("#" + _botEngine.divId)
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
        if (!_botEngine.history.step.includes(_botEngine.history.currentIndex)) {
            _botEngine.history.step.push(_botEngine.history.currentIndex);
        }

        $("#" + _botEngine.divId)
            .find("#bot_resourcesProposalSelect")
            .css("display", "block");
        _botEngine.currentList = values;
        if (values.length > 20) {
            $("#" + _botEngine.divId)
                .find("#botFilterProposalDiv")
                .show();
            $("#botFilterProposalInput").trigger("focus");
        }
        common.fillSelectOptions($("#" + _botEngine.divId).find("#bot_resourcesProposalSelect"), values, false, "label", "id");
        $("#" + _botEngine.divId)
            .find("#bot_resourcesProposalSelect")
            .unbind("click");
        UI.adjustSelectListSize($("#" + _botEngine.divId).find("#bot_resourcesProposalSelect"), 10);
        $("#botPanel").scrollTop($("#botPanel")[0].scrollHeight);
        $("#" + _botEngine.divId)
            .find("#bot_resourcesProposalSelect")
            .bind("click", function (evt) {
                var x = evt;
                // to edit
                var text = $("#" + _botEngine.divId)
                    .find("#bot_resourcesProposalSelect option:selected")
                    .text();
                if (text == "") {
                    return;
                }
                _botEngine.insertBotMessage(text + ":");

                var selectedValue = $(this).val();
                if (Array.isArray(selectedValue)) {
                    selectedValue = selectedValue[0];
                }
                if (evt.ctrlKey) {
                    return;
                }

                if (varToFill) {
                    _botEngine.history.VarFilling[_botEngine.history.currentIndex] = { VarFilled: varToFill, valueFilled: selectedValue };
                    if (Array.isArray(_botEngine.currentBot.params[varToFill])) {
                        _botEngine.currentBot.params[varToFill].push(selectedValue);
                    } else {
                        _botEngine.currentBot.params[varToFill] = selectedValue;
                    }
                }
                if (callback) {
                    return callback(selectedValue);
                }
                _botEngine.nextStep(returnValue || selectedValue);
            });
    };
    self.filterList = function (evt) {
        //var str = $(this).val();
        var str = $(evt.currentTarget).val();
        if (!str && _botEngine.lastFilterListStr.length < str.length) {
            return;
        } else {
            common.fillSelectOptions($("#" + _botEngine.divId).find("#bot_resourcesProposalSelect"), _botEngine.currentList, false, "label", "id");
        }
        if (str.length < 2 && _botEngine.lastFilterListStr.length < str.length) {
            return;
        }
        _botEngine.lastFilterListStr = str;
        str = str.toLowerCase();
        var selection = [];
        _botEngine.currentList.forEach(function (item) {
            if (item.label.toLowerCase().indexOf(str) > -1) {
                selection.push(item);
            }
        });
        common.fillSelectOptions($("#" + _botEngine.divId).find("#bot_resourcesProposalSelect"), selection, false, "label", "id");
        UI.adjustSelectListSize($("#" + _botEngine.divId).find("#bot_resourcesProposalSelect"), 10);
        $("#" + _botEngine.divId)
            .find("#botPanel")
            .scrollTop($("#botPanel")[0].scrollHeight);
    };

    self.promptValue = function (message, varToFill, defaultValue, options, callback) {
        $("#" + _botEngine.divId)
            .find("#bot_resourcesProposalSelect")
            .hide();

        if (options && options.datePicker) {
            //DateWidget.unsetDatePickerOnInput("botPromptInput");
            DateWidget.setDatePickerOnInput("botPromptInput", null, function (date) {
                _botEngine.currentBot.params[varToFill] = date.getTime();
                $("#" + _botEngine.divId)
                    .find("#botPromptInput")
                    .trigger("focus");

                // _botEngine.nextStep();
            });
        }

        $("#" + _botEngine.divId)
            .find("#botPromptInput")
            .on("keyup", function (key) {
                if (event.keyCode == 13 || event.keyCode == 9) {
                    DateWidget.unsetDatePickerOnInput("botPromptInput");
                    $("#" + _botEngine.divId)
                        .find("#bot_resourcesProposalSelect")
                        .show();
                    $("#" + _botEngine.divId)
                        .find("#botPromptInput")
                        .css("display", "none");
                    var value = $(this).val();
                    var varToFill = $("#" + _botEngine.divId)
                        .find("#botVarToFill")
                        .val();
                    if (!varToFill) {
                        return _botEngine.previousStep();
                    }
                    //Il faut attribuer l'objet aux bon numéro de currentObject
                    _botEngine.history.VarFilling[_botEngine.history.currentIndex] = { VarFilled: varToFill, valueFilled: value.trim() };

                    _botEngine.currentBot.params[varToFill] = value.trim();
                    _botEngine.insertBotMessage(value);
                    $("#" + _botEngine.divId)
                        .find("#botPromptInput")
                        .off();
                    if (callback) {
                        return callback(value);
                    } else {
                        _botEngine.nextStep();
                    }
                }
            });
        _botEngine.clearProposalSelect();
        $("#" + _botEngine.divId)
            .find("#botVarToFill")
            .val(varToFill);
        $("#" + _botEngine.divId)
            .find("#botPromptInput")
            .val(defaultValue || "");
        $("#" + _botEngine.divId)
            .find("#botPromptInput")
            .css("display", "block");
        $("#" + _botEngine.divId)
            .find("#botPromptInput")
            .trigger("focus");
        if (!_botEngine.history.step.includes(_botEngine.history.currentIndex)) {
            _botEngine.history.step.push(_botEngine.history.currentIndex);
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
            _botEngine.lastTokenId = tokenId;
        }
        if (chat_class == "chat-right") {
            $(html).insertAfter("#" + _botEngine.lastTokenId);
        } else {
            $("#" + _botEngine.divId)
                .find("#botTA")
                .prepend(html);
            //$(html).insertBefore("#bot_input");
        }

        $("#" + _botEngine.divId)
            .find("#bot_input")
            .val("");
        $("#" + _botEngine.divId)
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

        _botEngine.showList(choices, varToFill);
        // alternatives has no message because is not a function
        // message of alternative is last setted function question message
        //_botEngine.setStepMessage();
    };

    self.getQueryText = function () {
        var queryText = "";
        $(".bot-token").each(function () {
            queryText += $(this).html();
        });
        return queryText;
    };
    self.clearProposalSelect = function () {
        $("#" + _botEngine.divId)
            .find("#bot_resourcesProposalSelect")
            .find("option")
            .remove()
            .end();
    };

    self.exportToGraph = function () {
        var functionTitles = _botEngine.currentBot.functionTitles;
        var workflow = _botEngine.initialWorkflow;

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

        var title = _botEngine.currentBot.title;
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
        UI.openDialog("mainDialogDiv");
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
            var messageDivs = $("#" + _botEngine.divId)
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
        if (!_botEngine.resetOldState) {
            return;
        }

        setTimeout(function () {
            if (_botEngine.oldBotEngine) {
                _botEngine = common.array.deepCloneWithFunctions(_botEngine.oldBotEngine);
                _botEngine.resetOldState = false;
                _botEngine.oldBotEngine = null;
            }
        }, 300);
    };

    return self;
})();
export default _botEngine;

window._botEngine = _botEngine;
