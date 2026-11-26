// the conversation about the master data guess and the data of the database, docked under the graph; the dock and the
// Markdown rendering are the ones of the sls-virtual-db-creator plugin, read from it so that both conversations look the same
var AIMappingWorkflowChat = (function () {
    var self = {};
    self.pluginUrl = "/plugins/sls-virtual-db-creator";
    self.renderMarkdown = null;
    // the conversation as the chat route takes it
    self.messages = [];
    self.isWaiting = false;
    // the state of the request on its way, its events are read while it is the current one
    self.currentRequest = null;
    self.workingTimer = null;
    self.workingStartMs = null;
    self.unfoldedHeight = null;
    self.openedHeight = "300px";
    self.maxInputHeightPx = 180;
    // what the page has open, read at each question: { source, databaseId, screen }
    self.getContext = null;
    // called with the guess the chat changed on the user's request, to draw it again
    self.onGuessChange = null;
    self.workingLabels = {
        run_sql: "Reading the database",
        search_upper_ontologies: "Searching the upper ontologies",
        get_upper_ontology_terms: "Reading upper ontology terms",
        change_guess: "Changing the guess",
    };
    self.sendIconHtml = null;
    // set at the first question, the conversation is saved under it after each answer
    self.conversationId = null;
    // the conversations store of the revision agents keeps these ones under their database id
    self.conversationKind = "masterData";
    self.historyLength = 5;
    self.historyMenuMarginPx = 8;
    self.stopIconHtml = '<svg class="vdbChat-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1" /></svg>';

    // graphDiv is shared with the other tools: it is wrapped in a column while the tool is open, unwrapped by unmount
    self.mount = function (getContext, onGuessChange) {
        self.getContext = getContext;
        self.onGuessChange = onGuessChange;
        if ($("#vdbChat-graphColumn").length > 0) {
            return self.hide();
        }
        $("#graphDiv").wrap("<div id='vdbChat-graphColumn' style='display: flex; flex-direction: column; height: 100%'></div>");
        $("#graphDiv").css({ flex: "1", "min-height": "0", height: "auto" });
        $("#vdbChat-graphColumn").append("<div id='vdbChat-dockContainer'></div>");
        import(self.pluginUrl + "/js/renderMarkdown.js")
            .then(function (renderMarkdownModule) {
                self.renderMarkdown = renderMarkdownModule.default;
                $("#vdbChat-dockContainer").load(self.pluginUrl + "/html/discussionDock.html", self.bindDock);
            })
            .catch(function () {
                UI.message("the chat needs the sls-virtual-db-creator plugin, not reachable on this server");
            });
    };

    self.bindDock = function () {
        $("#vdbChat-dock").resizable({
            handles: "n",
            minHeight: 140,
            resize: function (_event, resizeState) {
                // a north handle moves the top, the dock stays in the column flow and the graph shrinks instead
                resizeState.element.css("top", 0);
            },
        });
        self.setResizable(false);
        $("#vdbChat-historyButton").on("click", function (clickEvent) {
            clickEvent.stopPropagation();
            self.toggleHistoryMenu();
        });
        $("#vdbChat-historyMenu").on("click", function (clickEvent) {
            clickEvent.stopPropagation();
        });
        $(document).off("click.aiMappingWorkflowChat").on("click.aiMappingWorkflowChat", self.closeHistoryMenu);
        $("#vdbChat-input").attr("placeholder", "Ask about the master data, their classes, or the data of the database…");
        $(".vdbChat-hint").text("Enter to send, Shift+Enter for a new line. A query read in the database is shown as a table.");
        $("#vdbChat-foldButton").on("click", self.toggleFold);
        $("#vdbChat-resetButton").on("click", self.reset);
        self.sendIconHtml = $("#vdbChat-sendButton").html();
        $("#vdbChat-sendButton").on("click", function () {
            if (self.isWaiting) {
                return self.stopByUser();
            }
            self.send();
        });
        $("#vdbChat-input").on("input", self.growInput);
        $("#vdbChat-input").on("keydown", function (keyEvent) {
            if (keyEvent.key == "Enter" && !keyEvent.shiftKey) {
                keyEvent.preventDefault();
                self.send();
            }
        });
    };

    self.unmount = function () {
        self.stopRequest();
        $(document).off("click.aiMappingWorkflowChat");
        if ($("#vdbChat-graphColumn").length == 0) {
            return;
        }
        $("#vdbChat-dockContainer").remove();
        $("#graphDiv").css({ flex: "", "min-height": "", height: "100%" });
        $("#graphDiv").unwrap();
    };

    // shown once the guess of a database is drawn, a new conversation for each database
    self.show = function () {
        $("#vdbChat-dock").css("display", "block");
        self.reset();
    };

    // the conversation belongs to the database it was about: another database starts a new one
    self.hide = function () {
        self.reset();
        $("#vdbChat-dock").css("display", "none");
    };

    // the answer on its way is dropped: it would land in the conversation that follows
    self.stopRequest = function () {
        clearInterval(self.workingTimer);
        if (!self.currentRequest) {
            return;
        }
        self.currentRequest.abortController.abort();
        self.currentRequest = null;
        self.isWaiting = false;
        self.setSendButtonStop(false);
    };

    // the send button stops the answer on its way
    self.setSendButtonStop = function (isStop) {
        $("#vdbChat-sendButton")
            .html(isStop ? self.stopIconHtml : self.sendIconHtml)
            .attr("title", isStop ? "Stop the answer" : "Send");
    };

    // the question left unanswered goes out of the conversation, the model never saw an answer to it
    self.stopByUser = function () {
        var stoppedRequest = self.currentRequest;
        if (stoppedRequest && stoppedRequest.liveTurn) {
            stoppedRequest.liveTurn.remove();
        }
        self.stopRequest();
        self.setWorking(false);
        self.messages.pop();
        self.appendEntry($("<div class='vdbChat-turn-error'>").text("Stopped"));
    };

    self.reset = function () {
        self.stopRequest();
        self.closeHistoryMenu();
        self.messages = [];
        self.conversationId = null;
        $("#vdbChat-thread").empty();
        // the dock shrinks back to the composer, its north handle stays off until a conversation opens it
        $("#vdbChat-panel").addClass("vdbChat-composerOnly").removeClass("vdbChat-collapsed");
        $("#vdbChat-dock").css("height", "auto");
        self.setResizable(false);
    };

    // the dock may still be loading when a database is opened
    self.setResizable = function (isResizable) {
        if ($("#vdbChat-dock").resizable("instance")) {
            $("#vdbChat-dock").resizable(isResizable ? "enable" : "disable");
        }
    };

    self.openTranscript = function () {
        if (!$("#vdbChat-panel").hasClass("vdbChat-composerOnly")) {
            return;
        }
        $("#vdbChat-panel").removeClass("vdbChat-composerOnly");
        $("#vdbChat-dock").css("height", self.openedHeight);
        self.setResizable(true);
    };

    self.toggleFold = function () {
        var dock = $("#vdbChat-dock");
        var isFolded = $("#vdbChat-panel").hasClass("vdbChat-collapsed");
        if (isFolded) {
            dock.css("height", self.unfoldedHeight);
        } else {
            self.unfoldedHeight = dock.css("height");
            dock.css("height", "auto");
        }
        $("#vdbChat-panel").toggleClass("vdbChat-collapsed", !isFolded);
        $("#vdbChat-foldButton").attr("title", isFolded ? "Fold the conversation" : "Unfold the conversation");
    };

    self.growInput = function () {
        var inputElement = document.getElementById("vdbChat-input");
        inputElement.style.height = "auto";
        inputElement.style.height = Math.min(inputElement.scrollHeight, self.maxInputHeightPx) + "px";
    };

    self.appendEntry = function (entryElement) {
        $("#vdbChat-thread").append(entryElement);
        // the working row stays the last line of the thread
        $("#vdbChat-working").appendTo("#vdbChat-thread");
        var transcript = $("#vdbChat-transcript");
        transcript.scrollTop(transcript[0].scrollHeight);
    };

    self.setWorking = function (isWorking, workingLabel) {
        if (!isWorking) {
            clearInterval(self.workingTimer);
            $("#vdbChat-working").remove();
            return;
        }
        if ($("#vdbChat-working").length == 0) {
            self.workingStartMs = Date.now();
            self.appendEntry(
                "<div id='vdbChat-working' class='vdbChat-working'><div class='vdbChat-working-spinner'></div>" +
                    "<div class='vdbChat-working-label'></div><div class='vdbChat-working-elapsed'>0 s</div></div>",
            );
            clearInterval(self.workingTimer);
            self.workingTimer = setInterval(function () {
                $("#vdbChat-working .vdbChat-working-elapsed").text(Math.round((Date.now() - self.workingStartMs) / 1000) + " s");
            }, 1000);
        }
        $("#vdbChat-working .vdbChat-working-label").text(workingLabel);
    };

    // tableEvent: { purpose, sql, columns, rows }, values of the database, never read as html
    self.getTableEntry = function (tableEvent) {
        var tableEntry = $("<div class='vdbChat-turn-assistant'>");
        tableEntry.append($("<p>").text(tableEvent.purpose));
        var resultTable = $("<table class='masterData-evidenceTable'>");
        var headerCells = tableEvent.columns.map((column) => $("<th>").text(column));
        resultTable.append($("<tr>").append(headerCells));
        tableEvent.rows.forEach(function (resultRow) {
            var valueCells = resultRow.map((value) => $("<td>").text(value));
            resultTable.append($("<tr>").append(valueCells));
        });
        tableEntry.append($("<div class='masterData-evidence'>").append(resultTable));
        var sqlDetails = $("<details>").append($("<summary>").text("SQL"), $("<pre>").append($("<code>").text(tableEvent.sql)));
        tableEntry.append(sqlDetails);
        return tableEntry;
    };

    self.onProgressEvent = function (progressEvent, requestState) {
        if (progressEvent.type == "textDelta") {
            if (!requestState.liveTurn) {
                requestState.liveText = "";
                requestState.liveTurn = $("<div class='vdbChat-turn-assistant'>");
                self.appendEntry(requestState.liveTurn);
            }
            requestState.liveText += progressEvent.text;
            requestState.liveTurn.html(self.renderMarkdown.render(requestState.liveText));
            self.setWorking(true, "Writing");
            return;
        }
        // the text written before a query stays as it was streamed, the next turn writes below the table
        if (progressEvent.type == "toolCall" || progressEvent.type == "answer") {
            var streamedTurn = requestState.liveTurn;
            requestState.liveTurn = null;
            if (progressEvent.type == "answer" && streamedTurn) {
                streamedTurn.remove();
            }
        }
        if (progressEvent.type == "toolCall") {
            self.setWorking(true, self.workingLabels[progressEvent.name] || progressEvent.name);
        } else if (progressEvent.type == "toolResult") {
            if (progressEvent.isError) {
                self.appendEntry($("<div class='vdbChat-tool-event'>").append($("<span class='vdbChat-tool-outcome-error'>").text(progressEvent.name + " " + progressEvent.outcome)));
            }
            self.setWorking(true, "Thinking");
        } else if (progressEvent.type == "guessChange") {
            self.appendEntry($("<div class='vdbChat-version-event'>").text(progressEvent.summary));
            self.onGuessChange(progressEvent.guessKey, progressEvent.guess, progressEvent.nextGuesses);
        } else if (progressEvent.type == "table") {
            self.appendEntry(self.getTableEntry(progressEvent));
        } else if (progressEvent.type == "answer") {
            requestState.hasAnswered = true;
            self.messages.push({ role: "assistant", content: progressEvent.text });
            self.appendAssistantTurn(progressEvent.text);
        } else if (progressEvent.type == "error") {
            requestState.streamError = progressEvent.error;
        }
    };

    self.send = function () {
        var inputElement = $("#vdbChat-input");
        var messageText = inputElement.val().trim();
        if (!messageText || self.isWaiting) {
            return;
        }
        inputElement.val("");
        self.growInput();
        self.closeHistoryMenu();
        // not crypto.randomUUID: it exists in a secure context only, and a server may be reached over http
        if (!self.conversationId) {
            var randomDigits = Math.random().toString(36);
            self.conversationId = Date.now().toString(36) + "-" + randomDigits.substring(2);
        }
        self.messages.push({ role: "user", content: messageText });
        var now = new Date();
        var timeLabel = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
        self.openTranscript();
        self.appendEntry($("<div class='vdbChat-time'>").text(timeLabel));
        self.appendEntry($("<div class='vdbChat-turn-user'>").text(messageText));
        self.isWaiting = true;
        self.setSendButtonStop(true);
        self.setWorking(true, "Thinking");
        var requestState = { hasAnswered: false, streamError: null, liveTurn: null, liveText: "", abortController: new AbortController() };
        self.currentRequest = requestState;
        var requestBody = self.getContext();
        requestBody.messages = self.messages;
        requestState.context = requestBody;
        self.postProgressStream(
            "/ai/aiMappingWorkflow/chat",
            requestBody,
            requestState.abortController.signal,
            function (progressEvent) {
                // a request stopped by another database or a new conversation
                if (self.currentRequest !== requestState) {
                    return;
                }
                self.onProgressEvent(progressEvent, requestState);
            },
            function (errorText) {
                if (self.currentRequest !== requestState) {
                    return;
                }
                self.currentRequest = null;
                self.isWaiting = false;
                self.setSendButtonStop(false);
                self.setWorking(false);
                var stopError = errorText || requestState.streamError || (requestState.hasAnswered ? null : "the conversation ended without an answer");
                if (!stopError) {
                    return self.saveConversation(requestState.context);
                }
                if (requestState.liveTurn) {
                    requestState.liveTurn.remove();
                }
                self.appendEntry($("<div class='vdbChat-turn-error'>").text(stopError));
                // the unanswered message goes back to the input, to be sent again
                self.messages.pop();
                inputElement.val(messageText);
                self.growInput();
            },
        );
    };

    self.appendAssistantTurn = function (answerText) {
        self.appendEntry($("<div class='vdbChat-turn-assistant'>").html(self.renderMarkdown.render(answerText)));
    };

    // the tables of the answers are not kept, their text is
    self.saveConversation = function (chatContext) {
        var conversation = { conversationId: self.conversationId, kind: self.conversationKind, versionNames: [chatContext.databaseId], messages: self.messages };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/ai/ontologyFromDb/conversations",
            data: JSON.stringify({ source: chatContext.source, conversation: conversation }),
            contentType: "application/json",
            dataType: "json",
            error: function (error) {
                UI.message("the conversation could not be saved: " + (error.responseJSON ? error.responseJSON.error : error.responseText));
            },
        });
    };

    // the last conversations about the database open, last updated first
    self.toggleHistoryMenu = function () {
        var historyMenu = $("#vdbChat-historyMenu");
        if (!historyMenu.hasClass("vdbChat-history-menu-hidden")) {
            return self.closeHistoryMenu();
        }
        var chatContext = self.getContext();
        var query = { source: chatContext.source, kind: self.conversationKind, versionName: chatContext.databaseId };
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/ai/ontologyFromDb/conversations?" + $.param(query),
            dataType: "json",
            success: function (result) {
                historyMenu.empty();
                var lastConversations = result.conversations.slice(0, self.historyLength);
                if (lastConversations.length == 0) {
                    historyMenu.append("<div class='vdbChat-history-empty'>No conversation yet.</div>");
                }
                lastConversations.forEach(function (conversation) {
                    var firstUserMessage = conversation.messages.find((message) => message.role == "user");
                    var titleText = firstUserMessage ? firstUserMessage.content : "Conversation";
                    var isActiveConversation = conversation.conversationId == self.conversationId;
                    var historyItem = $("<div class='vdbChat-history-item'>").toggleClass("vdbChat-history-item-active", isActiveConversation).attr("title", titleText);
                    historyItem.append($("<span class='vdbChat-history-item-title'>").text(titleText));
                    historyItem.append($("<span class='vdbChat-history-item-time'>").text(new Date(conversation.updatedAt).toLocaleString()));
                    historyItem.on("click", function () {
                        self.openConversation(conversation);
                    });
                    historyMenu.append(historyItem);
                });
                // fixed: the panel clips what overflows it, the list opens above the history button
                var buttonRect = $("#vdbChat-historyButton")[0].getBoundingClientRect();
                var menuLeft = Math.max(self.historyMenuMarginPx, Math.min(buttonRect.right - historyMenu.outerWidth(), window.innerWidth - historyMenu.outerWidth() - self.historyMenuMarginPx));
                historyMenu.css({ left: menuLeft, bottom: window.innerHeight - buttonRect.top + self.historyMenuMarginPx });
                historyMenu.removeClass("vdbChat-history-menu-hidden");
            },
            error: function (error) {
                UI.message(error.responseJSON ? error.responseJSON.error : error.responseText);
            },
        });
    };

    self.closeHistoryMenu = function () {
        $("#vdbChat-historyMenu").addClass("vdbChat-history-menu-hidden");
    };

    // the conversation goes on where it stopped, its tables are not drawn again
    self.openConversation = function (conversation) {
        self.reset();
        self.conversationId = conversation.conversationId;
        self.messages = conversation.messages;
        self.openTranscript();
        conversation.messages.forEach(function (message) {
            if (message.role == "user") {
                return self.appendEntry($("<div class='vdbChat-turn-user'>").text(message.content));
            }
            self.appendAssistantTurn(message.content);
        });
    };

    // the route answers one JSON event per line; an error met before it started answers plain JSON
    self.postProgressStream = function (route, requestBody, abortSignal, onProgressEvent, onStreamEnd) {
        fetch(Config.apiUrl + route, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: abortSignal,
        })
            .then(function (response) {
                if (!response.ok) {
                    return response.text().then(function (errorText) {
                        var errorMessage = errorText;
                        // the route answers { error }, the request validation { errors: [...] }
                        try {
                            var errorBody = JSON.parse(errorText);
                            errorMessage = errorBody.error || JSON.stringify(errorBody.errors);
                        } catch (_parseError) {
                            errorMessage = errorText;
                        }
                        onStreamEnd("could not start: " + errorMessage);
                    });
                }
                return self.readProgressEvents(response.body.getReader(), new TextDecoder(), "", onProgressEvent, onStreamEnd);
            })
            .catch(function (error) {
                onStreamEnd(error.message);
            });
    };

    self.readProgressEvents = function (reader, decoder, pendingText, onProgressEvent, onStreamEnd) {
        return reader.read().then(function (chunk) {
            if (chunk.done) {
                return onStreamEnd(null);
            }
            var receivedText = pendingText + decoder.decode(chunk.value, { stream: true });
            var lines = receivedText.split("\n");
            // the last line may be cut in the middle, it waits for the next chunk
            var unfinishedLine = lines.pop();
            lines.forEach(function (line) {
                if (line) {
                    onProgressEvent(JSON.parse(line));
                }
            });
            return self.readProgressEvents(reader, decoder, unfinishedLine, onProgressEvent, onStreamEnd);
        });
    };

    return self;
})();

export default AIMappingWorkflowChat;
window.AIMappingWorkflowChat = AIMappingWorkflowChat;
