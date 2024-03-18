var _botEngine = (function () {
    var self = {};
    self.firstLoad = true;
    self.OrReturnValues = [];
    self.lastFilterListStr = "";
    self.init = function (botModule, initialWorkflow, options, callback) {
        if (!options) {
            options = {};
        }
        self.currentBot = botModule;
        self.currentObj = initialWorkflow;
        self.initialWorkflow = initialWorkflow;
        self.history = [];
        self.history.currentIndex = 0;
        self.currentList = [];

        var divId;
        if (options.divId) {
            divId = options.divId;
            self.divId = options.divId;
        } else {
            divId = "botDiv";
            $("#botPanel").dialog("open");
            $($("#botPanel").parent()[0]).on("dialogclose", function (event) {
                self.firstLoad = true;
            });
            $("#botPanel").dialog("option", "title", self.currentBot.title);

            //$("#botPanel").parent().css("top", "13%");
            //$("#botPanel").parent().css("left", "30%");
        }

        $("#" + divId).load("responsive/widget/html/botResponsive.html", function () {
            if (!self.firstLoad) {
                //$("#resetButtonBot").remove();
                //$("#previousButtonBot").remove();
                $("#BotUpperButtons").remove();
            }
            $("#botFilterProposalInput").on("keyup", self.filterList);
            self.firstLoad = false;
            $("#BotUpperButtons").insertAfter($("#botPanel").parent().find(".ui-dialog-titlebar-close"));
            //$("#previousButtonBot").insertAfter($("#botPanel").parent().find(".ui-dialog-titlebar-close"));
            if (divId != "botDiv") {
                var dialogWindow = $("#" + divId)
                    .parents()
                    .filter('div[role="dialog"]')[0];
                var titleDialog = $(dialogWindow).find(".ui-dialog-titlebar-close");
                var idDialog = "#" + $(dialogWindow).attr("aria-describedby");
                //$(idDialog).parent().css("top", "13%");
                //$(idDialog).parent().css("left", "10%");
                $("#BotUpperButtons").insertAfter(titleDialog);
                //$("#resetButtonBot").insertAfter(titleDialog);
                //$("#previousButtonBot").insertAfter(titleDialog);
                $(dialogWindow).on("dialogclose", function (event) {
                    $("#" + self.divId).empty();
                    $(dialogWindow).find("#resetButtonBot").remove();
                    $(dialogWindow).find("#previousButtonBot").remove();
                    self.firstLoad = true;
                });
            }
            ResponsiveUI.PopUpOnHoverButtons();
            if (callback) {
                callback();
            }
        });
    };

    self.nextStep = function (returnValue, varToFill) {
        $("#botFilterProposalDiv").hide();
        self.history.push(JSON.parse(JSON.stringify(self.currentObj)));
        self.history.currentIndex += 1;
        if (!self.currentObj) {
            return self.end();
        }
        var keys = Object.keys(self.currentObj);

        if (keys.length == 0) {
            return self.end();
        }

        var key = keys[0];

        if (key == "_OR") {
            // alternative
            var alternatives = self.currentObj[key];
            if (returnValue && alternatives[returnValue]) {
                self.OrReturnValues.push(returnValue);
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
                if (!fn && self.currentBot.functions["_DEFAULT"]) {
                    fn = self.currentBot.functions["_DEFAULT"];
                }

                if (!fn || typeof fn !== "function") {
                    return alert("function not defined :" + key0);
                }
                if (obj[key0] != "_self") {
                    self.currentObj = obj[key0];
                }
                self.setStepMessage(key0);
                fn();
            } else {
                var choices = [];
                for (var key in alternatives) {
                    choices.push({ id: key, label: key });
                }
                self.showList(choices, varToFill);
                self.setStepMessage();
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

    self.previousStep = function (message) {
        if (message) {
            self.message(message);
        }
        if (self.history.currentIndex > 1) {
            $("#botPromptInput").css("display", "none");
            self.history.currentIndex -= 2;

            self.currentObj = self.history[self.history.currentIndex];

            //delete last 3 message sended
            var childrens = $("#botTA").children();
            // last is bot_input --> don't count
            $("#botTA").children().slice(-4).filter("span").remove();
            if (self.currentObj._OR != undefined) {
                if (self.OrReturnValues != []) {
                    var lastOrReturnValue = self.OrReturnValues.slice(-1);
                    self.OrReturnValues.pop();
                    self.nextStep(lastOrReturnValue);
                }
            } else {
                self.nextStep();
            }
        } else {
            self.reset();
        }
    };

    self.end = function () {
        self.currentBot.params.queryText = self.getQueryText();
        if (self.divId) {
            var dialogWindow = $("#" + self.divId)
                .parents()
                .filter('div[role="dialog"]')[0];
            var idDialog = "#" + $(dialogWindow).attr("aria-describedby");
            $(idDialog).dialog("close");
        } else {
            $("#botPanel").dialog("close");
        }
        if (self.currentBot.callbackFn) {
            return self.currentBot.callbackFn();
        }
    };

    self.setStepMessage = function (step) {
        if (self.currentBot.functionTitles) {
            var message = self.currentBot.functionTitles[step];
            // In case 2 questions are asked at the same time erase the last one
            var last_message = $("#botTA").children().filter("span").slice(-1)[0];
            if ($(last_message).attr("class") == "chat-left") {
                last_message.remove();
            }
            self.writeCompletedHtml(message || "select an option", { question: true });
        } else {
            self.writeCompletedHtml("select an option", { question: true });
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
        self.currentBot.start();
    };

    self.close = function () {
        $("#botPanel").css("display", "none");
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
        self.currentList = values;
        if (values.length > 20) {
            $("#botFilterProposalDiv").show();
        }
        common.fillSelectOptions("bot_resourcesProposalSelect", values, false, "label", "id");
        $("#bot_resourcesProposalSelect").unbind("click");

        $("#bot_resourcesProposalSelect").bind("click", function (evt) {
            var x = evt;

            var text = $("#bot_resourcesProposalSelect option:selected").text();
            self.writeCompletedHtml(text + ":");
            //voir avec Claude
            //Donne une liste pour cet élement de façon inconnue
            var selectedValue = $(this).val();
            if (Array.isArray(selectedValue)) {
                selectedValue = selectedValue[0];
            }
            if (evt.ctrlKey) {
                return;
            }
            if (callback) {
                return callback(selectedValue);
            }
            if (varToFill) {
                if (Array.isArray(self.currentBot.params[varToFill])) {
                    self.currentBot.params[varToFill].push(selectedValue);
                } else {
                    self.currentBot.params[varToFill] = selectedValue;
                }
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
            common.fillSelectOptions("bot_resourcesProposalSelect", self.currentList, false, "label", "id");
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
        common.fillSelectOptions("bot_resourcesProposalSelect", selection, false, "label", "id");
    };

    self.promptValue = function (message, varToFill, defaultValue, options, callback) {
        $("#bot_resourcesProposalSelect").hide();

        if (options && options.datePicker) {
            DateWidget.setDatePickerOnInput("botPromptInput", null, function (date) {
                _botEngine.currentBot.params[varToFill] = date.getTime();
                DateWidget.unsetDatePickerOnInput("botPromptInput");
               // self.nextStep();
            });
        }

        $("#botPromptInput").on("keyup", function (key) {
            if (event.keyCode == 13 || event.keyCode == 9) {
                $("#bot_resourcesProposalSelect").show();
                $("#botPromptInput").css("display", "none");
                var value = $(this).val();
                var varToFill = $("#botVarToFill").val();
                if (!varToFill) {
                    return _botEngine.previousStep();
                }
                _botEngine.currentBot.params[varToFill] = value.trim();
                self.writeCompletedHtml(value);
                $("#botPromptInput").off();
                if (callback) {
                    return callback(value);
                } else {
                    self.nextStep();
                }
            }
        });
        self.clearProposalSelect();
        $("#botVarToFill").val(varToFill);
        $("#botPromptInput").val(defaultValue || "");
        $("#botPromptInput").css("display", "block");
        $("#botPromptInput").focus();
    };

    self.writeCompletedHtml = function (str, options) {
        if (!str) {
            return;
        }
        if (!options) {
            options = {};
        }
        if (options.question) {
            var chat_class = "chat-left";
        } else {
            var chat_class = "chat-right";
        }
        var tokenId = "token_" + common.getRandomHexaId(5);
        var html = "<span class='" + chat_class + "' id='" + tokenId + "'>" + str + "</span>";
        $(html).insertBefore("#bot_input");
        $("#bot_input").val("");
        $("#bot_input").focus();
        if ($("#botDiv")[0].scrollHeight > 500) {
            $("#botPanel").scrollTop($("#botPanel")[0].scrollHeight);
        }

        return;
    };

    self.getQueryText = function () {
        var queryText = "";
        $(".bot-token").each(function () {
            queryText += $(this).html();
        });
        return queryText;
    };
    self.clearProposalSelect = function () {
        $("#bot_resourcesProposalSelect").find("option").remove().end();
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

        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").html("<div id='botGraphDiv' style='width:800px;height:800px'></div>");
        $("#mainDialogDiv").parent().css("z-index", 1);
        Lineage_whiteboard.drawNewGraph(visjsData, "botGraphDiv", {
            layoutHierarchical: { vertical: true, levelSeparation: 150, nodeSpacing: 50, direction: "LR" },
            physics: { enabled: true },
        });
    };

    return self;
})();
export default _botEngine;

window.BotEngine = _botEngine;
