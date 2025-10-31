class BotEngineClass {
    constructor() {
        this.options = {};
        this.currentBot = null;
        this.currentObj = null;
        this.initialWorkflow = null;
        this.history = {
            workflowObjects: [],
            returnValues: [],
            VarFilling: {},
            currentIndex: -1,
            step: [],
        };
        this.currentList = [];
        this.divId = null;
    }

    init(botModule, initialWorkflow, options, callback) {
        if (!options) {
            options = {};
        }

        this.options = options;
        this.currentBot = botModule;
        this.currentObj = initialWorkflow;
        this.initialWorkflow = initialWorkflow;
        this.history = {};
        this.history.workflowObjects = [];
        this.history.returnValues = [];
        //Object {VarFilled:'',valueFilled:''}
        this.history.VarFilling = {};
        this.history.currentIndex = -1;
        // Step is the indexes when currentBot.nextStep is a function when the choice is let to the user
        this.history.step = [];
        this.currentList = [];

        var divId;

        if (options.divId) {
            divId = options.divId;
            this.divId = options.divId;
            $("#" + this.divId)
                .find("#resetButtonBot")
                .remove();
        } else {
            divId = "botDiv";
            this.divId = "botDiv";

            UI.setDialogTitle("#botPanel", this.currentBot.title);
            $("#botPanel").parent().find("#BotUpperButtons").remove();
        }

        $("#" + divId).load("./modules/uiWidgets/html/bot.html", () => {
            if (!options.divId) {
                UI.openDialog("botPanel", {title: "Bot Engine"});
            }
            if (window.location.href.indexOf("localhost") < 0) {
                $("#KGcreatorBot_exportToGraph").css("display", "none");
            }

            if (!options.divId) {
                $("#" + this.divId)
                    .find("#botFilterProposalInput")
                    .on("keyup", this.filterList);

                $("#" + this.divId)
                    .find("#BotUpperButtons")
                    .insertAfter($("#botPanel").parent().find(".ui-dialog-titlebar-close"));

                if (divId != "botDiv") {
                    var dialogWindow = $("#" + divId)
                        .parents()
                        .filter('div[role="dialog"]')[0];
                    var titleDialog = $(dialogWindow).find(".ui-dialog-titlebar-close");
                    var idDialog = "#" + $(dialogWindow).attr("aria-describedby");
                    $(dialogWindow).on("dialogclose", (event) => {
                        $("#" + this.divId).empty();
                    });
                }
            }
            this.botClickGestion();

            //UI.PopUpOnHoverButtons();
            if (callback) {
                callback();
            }
        });
    }
    // see if is necessary when botEngine is removed and bot work with botEngineClass
    botClickGestion() {
        // find if bot is in dialog
        var botInDialog = $("#" + this.divId).find("#resetButtonBot").length == 0;
        var resetButton = $("#" + this.divId).find("#resetButtonBot");
        var previousButton = $("#" + this.divId).find("#previousButtonBot");
        // necessary because dialog buttons are in the upper dialog not on bot div
        if (botInDialog) {
            resetButton = $("#botPanel").parent().find("#resetButtonBot");
            previousButton = $("#botPanel").parent().find("#previousButtonBot");
        }
        var input = $("#" + this.divId).find("#botFilterProposalInput");
        //desactivate others bots listeners in same context
        resetButton.off();
        previousButton.off();
        input.off();

        // temporary : remove onclick attribute, for not breaking _botEngine html and working
        resetButton.removeAttr("onclick");
        previousButton.removeAttr("onclick");
        input.removeAttr("onkeyup");
        // set new listeners
        input.on("keyup", (event) => {
            this.filterList(event);
        });
        previousButton.click(() => {
            this.previousStep();
        });
        resetButton.click(() => {
            this.reset();
        });
    }
    nextStep(returnValue, varToFill) {
        $("#" + this.divId)
            .find("#botFilterProposalDiv")
            .hide();
        this.history.workflowObjects.push(JSON.parse(JSON.stringify(this.currentObj)));
        this.history.currentIndex += 1;
        this.history.returnValues.push(returnValue);
        if (!this.currentObj) {
            return this.end();
        }
        var keys = Object.keys(this.currentObj);

        if (keys.length == 0) {
            return this.end();
        }

        var key = keys[0];

        if (key == "_OR") {
            // alternative
            var alternatives = this.currentObj[key];
            // if  return value execute function linked to return value in alternative
            if (returnValue) {
                if (alternatives[returnValue]) {
                    var obj = this.currentObj["_OR"][returnValue];
                    var key0 = Object.keys(obj)[0];
                    if (!key0) {
                        return this.end();
                    }

                    if (!obj[key0]) {
                        console.log("WARNING : in bot workflow has to be declared before it is called in another workflow");
                    }
                    if (key0 == "_OR") {
                        this.currentObj = obj;
                        return this.nextStep();
                    }
                } else if (alternatives["_DEFAULT"]) {
                    //  try to find _DEFAULT alternative and functuntion associated
                    var obj = this.currentObj["_OR"]["_DEFAULT"];
                    var key0 = Object.keys(obj)[0];
                } else {
                    this.showAlternatives(alternatives, varToFill);
                    return;
                }

                var fn = this.currentBot.functions[key0];

                if (!fn || typeof fn !== "function") {
                    return alert("function not defined :" + key0);
                }
                if (obj[key0] != "_self") {
                    this.currentObj = obj[key0];
                }
                this.setStepMessage(key0);
                fn();
            } else {
                this.showAlternatives(alternatives, varToFill);
            }
        } else {
            var fn = this.currentBot.functions[key];
            if (!fn && this.currentBot.functions["_DEFAULT"]) {
                fn = this.currentBot.functions["_DEFAULT"];
            }
            if (!fn || typeof fn !== "function") {
                return alert("function not defined :" + key);
            }

            this.currentObj = this.currentObj[key];
            this.setStepMessage(key);
            fn();
        }
    }

    /**
     *
     * back to a specific previous step
     *
     * works by applying  self.previousStep() until the current step index match the  step desired
     * @param parentStep
     */
    backToStep(parentStep) {
        var parentStepIndex = -1;
        this.history.workflowObjects.forEach(function (item, index) {
            if (item[parentStep]) {
                parentStepIndex = index;
            }
        });
        if (parentStepIndex < 0) {
            return alert("wrong parentStep " + parentStep);
        }

        this.currentObj = this.history.workflowObjects[parentStepIndex];
        this.nextStep();

        /*   var n = 0;
        do {
            self.previousStep();
            n++;
        } while (n <= parentStepIndex);*/
        // self.previousStep();
    }

    previousStep() {
        if (this.history.currentIndex > 0) {
            $("#" + this.divId)
                .find("#botPromptInput")
                .css("display", "none");

            var lastStepIndex = this.history.step[this.history.step.length - 2];
            if (lastStepIndex == 0) {
                return this.reset();
            }
            this.currentObj = this.history.workflowObjects[lastStepIndex];
            var returnValue = this.history.returnValues[lastStepIndex];

            this.deleteLastMessages(2);

            // cancel var filled concerned by the reverse

            var VarFillingKeys = Object.keys(this.history.VarFilling);
            var VarToUnfill = VarFillingKeys.filter((key) => key >= lastStepIndex);
            if (VarToUnfill.length > 0) {
                for (const key in VarToUnfill) {
                    if (this.history.VarFilling[VarToUnfill[key]]) {
                        var VarFilled = this.history.VarFilling[VarToUnfill[key]].VarFilled;
                        var ValueFilled = this.history.VarFilling[VarToUnfill[key]].valueFilled;
                        if (Array.isArray(this.currentBot.params[VarFilled])) {
                            this.currentBot.params[VarFilled] = this.currentBot.params[VarFilled].filter((item) => item !== ValueFilled);
                        } else {
                            this.currentBot.params[VarFilled] = "";
                        }
                        delete this.history.VarFilling[VarToUnfill[key]];
                    }
                }
            }
            // delete history trough the last step
            this.history.currentIndex = lastStepIndex - 1;
            this.history.workflowObjects = this.history.workflowObjects.filter(function (element, index, array) {
                return index < lastStepIndex;
            });
            this.history.returnValues = this.history.returnValues.filter(function (element, index, array) {
                return index < lastStepIndex;
            });
            this.history.step = this.history.step.filter(function (element, index, array) {
                return element < lastStepIndex;
            });

            this.nextStep(returnValue);
        } else {
            this.history.currentIndex = -1;
            this.nextStep();
            // self.reset();
        }
    }

    end(dontCallBack) {
        this.currentBot.params.queryText = this.getQueryText();
        this.closeDialog();
        if (!dontCallBack && this.currentBot.callbackFn) {
            return this.currentBot.callbackFn();
        }
    }

    closeDialog() {
        if (this.divId != "botDiv") {
            /*  var dialogWindow = $("#" + this.divId)
                  .parents()
                  .filter('div[role="dialog"]')[0];
              var idDialog = "#" + $(dialogWindow).attr("aria-describedby");*/
            $("#" + this.divId).dialog("close");
        } else {
            $("#botPanel").dialog("close");
        }
    }

    setStepMessage(step) {
        if (this.currentBot.functionTitles) {
            var message = this.currentBot.functionTitles[step];
            // In case 2 questions are asked consecutively erase the last one
            var messageDivs = $("#" + this.divId)
                .find("#botTA")
                .children();
            if (messageDivs.length > 0) {
                var lastMessages = $(messageDivs[0]).children().filter("span");
                if (lastMessages.length == 1) {
                    this.deleteLastMessages();
                }
            }

            if (message) {
                this.insertBotMessage(message, { isQuestion: true });
            } else {
                this.insertBotMessage("select an option", { isQuestion: true });
            }
        }
    }

    abort(message) {
        alert(message);
        this.close();
    }

    reset() {
        if (this.startParams && this.startParams.length > 0) {
            this.currentBot.start(...this.startParams, this.options);
        } else {
            this.currentBot.start(this.options);
        }
    }

    close() {
        $("#botPanel").css("display", "none");
    }
    message(message) {
        $("#" + this.divId)
            .find("#botMessage")
            .html(message);
    }

    showList(values, varToFill, returnValue, sort, callback) {
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
        if (!this.history.step.includes(this.history.currentIndex)) {
            this.history.step.push(this.history.currentIndex);
        }

        $("#" + this.divId)
            .find("#bot_resourcesProposalSelect")
            .css("display", "block");
        this.currentList = values;
        if (values.length > 20) {
            $("#" + this.divId)
                .find("#botFilterProposalDiv")
                .show();
            $("#botFilterProposalInput").trigger("focus");
        }
        common.fillSelectOptions($("#" + this.divId).find("#bot_resourcesProposalSelect"), values, false, "label", "id");
        $("#" + this.divId)
            .find("#bot_resourcesProposalSelect")
            .unbind("click");
        UI.adjustSelectListSize($("#" + this.divId).find("#bot_resourcesProposalSelect"), 10);
        $("#botPanel").scrollTop($("#botPanel")[0].scrollHeight);
        $("#" + this.divId)
            .find("#bot_resourcesProposalSelect")
            .bind("click", (evt) => {
                // 'this' ici est l'instance de la classe, evt.currentTarget est le select DOM
                var text = $(evt.currentTarget).find("option:selected").text();
                if (text == "") {
                    return;
                }
                this.insertBotMessage(text);

                var selectedValue = $(evt.currentTarget).val();
                if (Array.isArray(selectedValue)) {
                    selectedValue = selectedValue[0];
                }
                if (evt.ctrlKey) {
                    return;
                }

                if (varToFill) {
                    this.history.VarFilling[this.history.currentIndex] = { VarFilled: varToFill, valueFilled: selectedValue };
                    if (Array.isArray(this.currentBot.params[varToFill])) {
                        this.currentBot.params[varToFill].push(selectedValue);
                    } else {
                        this.currentBot.params[varToFill] = selectedValue;
                    }
                }
                if (callback) {
                    return callback(selectedValue);
                }
                this.nextStep(returnValue || selectedValue);
            });
    }
    filterList(evt) {
        //var str = $(this).val();
        var str = $(evt.currentTarget).val();
        if (!str && this.lastFilterListStr.length < str.length) {
            return;
        } else {
            common.fillSelectOptions($("#" + this.divId).find("#bot_resourcesProposalSelect"), this.currentList, false, "label", "id");
        }
        if (str.length < 2 && this.lastFilterListStr.length < str.length) {
            return;
        }
        this.lastFilterListStr = str;
        str = str.toLowerCase();
        var selection = [];
        this.currentList.forEach(function (item) {
            if (item.label.toLowerCase().indexOf(str) > -1) {
                selection.push(item);
            }
        });
        common.fillSelectOptions($("#" + this.divId).find("#bot_resourcesProposalSelect"), selection, false, "label", "id");
        UI.adjustSelectListSize($("#" + this.divId).find("#bot_resourcesProposalSelect"), 10);
        $("#" + this.divId)
            .find("#botPanel")
            .scrollTop($("#botPanel")[0].scrollHeight);
    }

    promptValue(message, varToFill, defaultValue, options, callback) {
        $("#" + this.divId)
            .find("#bot_resourcesProposalSelect")
            .hide();

        if (options && options.datePicker) {
            //DateWidget.unsetDatePickerOnInput("botPromptInput");
            DateWidget.setDatePickerOnInput("botPromptInput", null, function (date) {
                this.currentBot.params[varToFill] = date.getTime();
                $("#" + this.divId)
                    .find("#botPromptInput")
                    .trigger("focus");

                // this.nextStep();
            });
        }

        $("#" + this.divId)
            .find("#botPromptInput")
            .on("keyup", (evt) => {
                if (evt.keyCode == 13 || evt.keyCode == 9) {
                    DateWidget.unsetDatePickerOnInput("botPromptInput");
                    $("#" + this.divId)
                        .find("#bot_resourcesProposalSelect")
                        .show();
                    $("#" + this.divId)
                        .find("#botPromptInput")
                        .css("display", "none");
                    var value = $(evt.currentTarget).val();
                    var varToFill = $("#" + this.divId)
                        .find("#botVarToFill")
                        .val();
                    if (!varToFill) {
                        return this.previousStep();
                    }
                    //Il faut attribuer l'objet aux bon numéro de currentObject
                    this.history.VarFilling[this.history.currentIndex] = { VarFilled: varToFill, valueFilled: value.trim() };

                    this.currentBot.params[varToFill] = value.trim();
                    this.insertBotMessage(value);
                    $("#" + this.divId)
                        .find("#botPromptInput")
                        .off();
                    if (callback) {
                        return callback(value);
                    } else {
                        this.nextStep();
                    }
                }
            });
        this.clearProposalSelect();
        $("#" + this.divId)
            .find("#botVarToFill")
            .val(varToFill);
        $("#" + this.divId)
            .find("#botPromptInput")
            .val(defaultValue || "");
        $("#" + this.divId)
            .find("#botPromptInput")
            .css("display", "block");
        $("#" + this.divId)
            .find("#botPromptInput")
            .trigger("focus");
        if (!this.history.step.includes(this.history.currentIndex)) {
            this.history.step.push(this.history.currentIndex);
        }
    }

    insertBotMessage(str, options) {
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
            this.lastTokenId = tokenId;
        }
        if (chat_class == "chat-right") {
            $(html).insertAfter("#" + this.lastTokenId);
        } else {
            $("#" + this.divId)
                .find("#botTA")
                .prepend(html);
            //$(html).insertBefore("#bot_input");
        }

        $("#" + this.divId)
            .find("#bot_input")
            .val("");
        $("#" + this.divId)
            .find("#bot_input")
            .trigger("focus");
        if ($("#botDiv")[0].scrollHeight > 500) {
            $("#botPanel").scrollTop($("#botPanel")[0].scrollHeight);
        }

        return;
    }

    showAlternatives(alternatives, varToFill) {
        var lastMessageDiv = $("#" + "botPanel")
            .find("#botTA")
            .children()
            .first();
        if (lastMessageDiv) {
            var lastMessageClass = $(lastMessageDiv).children().last().attr("class");
            if (lastMessageClass && lastMessageClass.indexOf("chat-right") > -1) {
                this.insertBotMessage("Please select an option", { isQuestion: true });
            }
        }

        var choices = [];
        for (var key in alternatives) {
            choices.push({ id: key, label: key });
        }

        this.showList(choices, varToFill);
        // check if a message is already displayed by last function
        // or let a generic message to not disturb message flow
    }

    getQueryText() {
        var queryText = "";
        $(".bot-token").each(function () {
            queryText += $(this).html();
        });
        return queryText;
    }
    clearProposalSelect() {
        $("#" + this.divId)
            .find("#bot_resourcesProposalSelect")
            .find("option")
            .remove()
            .end();
    }

    exportToGraph() {
        var functionTitles = this.currentBot.functionTitles;
        var workflow = this.initialWorkflow;

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

        var title = this.currentBot.title;
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
        UI.openDialog("mainDialogDiv", {title: "Bot Workflow Visualization"});
        //  $("#mainDialogDiv").parent().css("z-index", 1);
        Lineage_whiteboard.drawNewGraph(visjsData, "botGraphDiv", {
            layoutHierarchical: { levelSeparation: 150, nodeSpacing: 50, direction: "LR" },
            physics: { enabled: true },
        });
    }
    fillStartParams(params) {
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
    }
    deleteLastMessages(numberOfMessagesToRemove) {
        if (!numberOfMessagesToRemove) {
            numberOfMessagesToRemove = 1;
        }
        for (var i = 0; i < numberOfMessagesToRemove; i++) {
            var messageDivs = $("#" + this.divId)
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
    }
}

export default BotEngineClass;

// window.botEngineClass = new BotEngineClass(); // Uncomment if global instance is needed
