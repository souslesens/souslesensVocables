import BotEngineClass from "./_botEngineClass.js";
import CommonBotFunctions from "./_commonBotFunctions.js";

var GitVersioning_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.title = "Version";
    self.cancelChoiceId = "cancel";
    self.addedTripleColor = "#15803d";
    self.removedTripleColor = "#b91c1c";

    self.workflowActions = {
        _OR: {
            version: { previewFn: { askVersionNumberFn: { askReleaseNotesFn: { confirmFn: { publishVersionFn: {} } } } } },
            branch: { previewFn: { askBranchNameFn: { askCommitMessageFn: { confirmFn: { pushBranchFn: {} } } } } },
            updateBranch: { chooseBranchFn: { previewFn: { askCommitMessageFn: { confirmFn: { pushBranchFn: {} } } } } },
            relink: { relinkFn: {} },
        },
    };

    self.workflow = {
        askRepositoryUrlFn: {
            askTokenFn: {
                openRepositoryFn: {
                    chooseActionFn: self.workflowActions,
                },
            },
        },
    };

    self.functionTitles = {
        askRepositoryUrlFn: "Repository URL (HTTPS)",
        askTokenFn: "Access token",
        openRepositoryFn: "Checking the access...",
        chooseActionFn: "What do you want to do?",
        previewFn: "Comparing with the repository...",
        askVersionNumberFn: "Version name",
        askReleaseNotesFn: "Release notes",
        askBranchNameFn: "Branch name",
        chooseBranchFn: "Branch to update",
        askCommitMessageFn: "Commit message",
        confirmFn: "Send to the repository?",
        publishVersionFn: "Publishing...",
        pushBranchFn: "Pushing the branch...",
        relinkFn: "Change the repository",
    };

    self.start = function (sourceName) {
        self.myBotEngine.init(GitVersioning_bot, self.workflow, null, function () {
            // the Reset button starts the bot again on the same source
            self.myBotEngine.startParams = [sourceName];
            self.params = { sourceName: sourceName, newRepositoryUrl: null, isRelinking: false, userName: "", token: null, repositoryState: null };
            $("#botPanel").one("dialogclose", function () {
                self.params.token = null;
            });
            self.myBotEngine.nextStep();
        });
    };

    self.callGitApi = function (method, route, body, callback) {
        var requestBody = Object.assign({ token: self.params.token, userName: self.params.userName }, body);
        $.ajax({
            type: method,
            url: Config.apiUrl + "/sources/" + encodeURIComponent(self.params.sourceName) + "/git/" + route,
            data: JSON.stringify(requestBody),
            contentType: "application/json",
            dataType: "json",
            success: function (responseBody) {
                callback(null, responseBody);
            },
            error: function (jqXHR) {
                var errorMessage = jqXHR.responseJSON && jqXHR.responseJSON.message ? jqXHR.responseJSON.message : jqXHR.statusText;
                callback(errorMessage, null, jqXHR.status);
            },
        });
    };

    self.showMessage = function (html) {
        // #botMessage is a flex column: unwrapped, each bold word or code would sit on its own line
        self.myBotEngine.message("<div>" + html + "</div>");
    };

    self.showError = function (errorMessage) {
        self.showMessage('<span style="color:' + self.removedTripleColor + '">' + CommonBotFunctions.escapeHtml(errorMessage) + "</span>");
    };

    self.linkedRepositoryUrl = function () {
        var gitRepository = Config.sources[self.params.sourceName].gitRepository;
        var repositoryUrl = gitRepository ? gitRepository.url : null;
        return repositoryUrl;
    };

    self.functions = {
        askRepositoryUrlFn: function () {
            if (self.linkedRepositoryUrl() && !self.params.isRelinking) {
                return self.myBotEngine.nextStep();
            }
            self.myBotEngine.promptValue("Repository URL (HTTPS)", "repositoryUrl", "", null, function (typedUrl) {
                var repositoryUrl = typedUrl.trim();
                // a clone URL may carry the user name the git server expects with a token, the URL is stored without it
                try {
                    var parsedUrl = new URL(repositoryUrl);
                    if (parsedUrl.username) {
                        self.params.userName = decodeURIComponent(parsedUrl.username);
                        parsedUrl.username = "";
                        parsedUrl.password = "";
                        repositoryUrl = parsedUrl.href;
                    }
                } catch {
                    // not a URL: the server refuses it with its own message
                }
                self.params.newRepositoryUrl = repositoryUrl;
                self.myBotEngine.nextStep();
            });
        },

        askTokenFn: function () {
            var repositoryUrl = self.params.newRepositoryUrl || self.linkedRepositoryUrl();
            var host = repositoryUrl;
            try {
                host = new URL(repositoryUrl).host;
            } catch {
                // shown as typed
            }
            self.showMessage("Token of your account on <b>" + CommonBotFunctions.escapeHtml(host) + "</b>, with write access. Never stored.");
            self.myBotEngine.promptValue("Access token", "token", "", { isSecret: true });
        },

        openRepositoryFn: function () {
            // the API rejects a null field, an absent URL reads the repository already linked
            var repositoryBody = self.params.newRepositoryUrl ? { url: self.params.newRepositoryUrl } : {};
            self.callGitApi("POST", "repository", repositoryBody, function (error, repositoryState, status) {
                if (error) {
                    var isRefusedWithDefaultUserName = status === 403 && !self.params.userName;
                    if (isRefusedWithDefaultUserName) {
                        self.showError(error);
                        self.myBotEngine.insertBotMessage("User name of your account on this git server", { isQuestion: true });
                        return self.myBotEngine.promptValue("User name", "userName", "", null, function (typedUserName) {
                            self.params.userName = typedUserName.trim();
                            self.functions.openRepositoryFn();
                        });
                    }
                    self.params.userName = "";
                    var questionToAskAgain = self.params.newRepositoryUrl ? "askRepositoryUrlFn" : "askTokenFn";
                    self.myBotEngine.backToStep(questionToAskAgain);
                    // after the question, whose own message would hide the error
                    return self.showError(error);
                }
                self.params.repositoryState = repositoryState;
                if (self.params.newRepositoryUrl) {
                    Config.sources[self.params.sourceName].gitRepository = { url: self.params.newRepositoryUrl };
                }
                self.params.newRepositoryUrl = null;
                self.params.isRelinking = false;
                var repositoryPath = new URL(repositoryState.repositoryUrl).pathname;
                self.showMessage("Write access checked on <b>" + CommonBotFunctions.escapeHtml(repositoryPath) + "</b>.");
                self.myBotEngine.nextStep();
            });
        },

        chooseActionFn: function () {
            var repositoryState = self.params.repositoryState;
            var versionCount = repositoryState.versions.length;
            var lastVersionLabel = versionCount > 0 ? repositoryState.versions[versionCount - 1] : "none";
            self.showMessage("Branch <b>" + CommonBotFunctions.escapeHtml(repositoryState.mainBranch) + "</b>, last version <b>" + CommonBotFunctions.escapeHtml(lastVersionLabel) + "</b>");
            var actionChoices = [
                { id: "version", label: "New version" },
                { id: "branch", label: "New branch" },
            ];
            if (repositoryState.branches.length > 0) {
                actionChoices.push({ id: "updateBranch", label: "Update a branch" });
            }
            actionChoices.push({ id: "relink", label: "Change the repository" });
            self.myBotEngine.showList(actionChoices, "action");
        },

        relinkFn: function () {
            self.params.isRelinking = true;
            self.myBotEngine.backToStep("askRepositoryUrlFn");
        },

        previewFn: function () {
            // the API rejects a null field, an absent branch compares with the main branch
            var previewBody = self.params.action === "updateBranch" ? { branch: self.params.branchName } : {};
            self.callGitApi("POST", "preview", previewBody, function (error, preview) {
                if (error) {
                    return self.showError(error);
                }
                var comparedLabel = preview.comparedBranch ? "<b>" + CommonBotFunctions.escapeHtml(preview.comparedBranch) + "</b>" : "the empty repository";
                var html = "<div>" + preview.sourceTripleCount + " triples in SLS. Against " + comparedLabel + ": ";
                html += '<span style="color:' + self.addedTripleColor + '">+' + preview.addedCount + "</span> ";
                html += '<span style="color:' + self.removedTripleColor + '">-' + preview.removedCount + "</span></div>";
                var diffLinesHtml = preview.previewLines.map(function (previewLine) {
                    var lineColor = previewLine.charAt(0) === "+" ? self.addedTripleColor : self.removedTripleColor;
                    var lineHtml = '<div style="color:' + lineColor + '">' + CommonBotFunctions.escapeHtml(previewLine) + "</div>";
                    return lineHtml;
                });
                var hiddenLineCount = preview.addedCount + preview.removedCount - preview.previewLines.length;
                if (hiddenLineCount > 0) {
                    diffLinesHtml.push("<div>... " + hiddenLineCount + " more</div>");
                }
                if (diffLinesHtml.length > 0) {
                    var diffBlockHtml = diffLinesHtml.join("");
                    html += '<div style="font-family:monospace;font-size:11px;white-space:pre;overflow:auto;max-height:200px;margin-top:6px">' + diffBlockHtml + "</div>";
                }
                self.showMessage(html);
                self.myBotEngine.nextStep();
            });
        },

        askVersionNumberFn: function () {
            self.myBotEngine.promptValue("Version name", "versionName", "", null);
        },

        askReleaseNotesFn: function () {
            self.myBotEngine.promptTextarea("Message of the tag", "releaseNotes", "", function (_safeNotes, releaseNotes) {
                self.params.releaseNotes = releaseNotes;
            });
        },

        askBranchNameFn: function () {
            self.myBotEngine.promptValue("Branch name", "branchName", "", null);
        },

        chooseBranchFn: function () {
            self.myBotEngine.showList(self.params.repositoryState.branches, "branchName");
        },

        askCommitMessageFn: function () {
            self.myBotEngine.promptValue("Commit message", "commitMessage", "", null);
        },

        confirmFn: function () {
            var summaryHtml = "Branch <b>" + CommonBotFunctions.escapeHtml(self.params.branchName) + "</b>";
            if (self.params.action === "version") {
                summaryHtml = "Version <b>" + CommonBotFunctions.escapeHtml(self.params.versionName) + "</b> on <b>" + CommonBotFunctions.escapeHtml(self.params.repositoryState.mainBranch) + "</b>";
            }
            self.showMessage(summaryHtml);
            var confirmChoices = [
                { id: "send", label: "Send" },
                { id: self.cancelChoiceId, label: "Cancel" },
            ];
            self.myBotEngine.showList(confirmChoices, "confirmation");
        },

        publishVersionFn: function () {
            if (self.params.confirmation === self.cancelChoiceId) {
                return self.endWithMessage("Nothing was sent.");
            }
            self.callGitApi("POST", "versions", { version: self.params.versionName, notes: self.params.releaseNotes }, function (error, publishedVersion, status) {
                if (error) {
                    self.showError(error);
                    // a name git refuses or a version that exists: asked again
                    if (status === 400 || status === 409) {
                        return self.myBotEngine.backToStep("askVersionNumberFn");
                    }
                    return;
                }
                var resultHtml =
                    "<b>" + CommonBotFunctions.escapeHtml(publishedVersion.tagName) + "</b> published, commit <code>" + CommonBotFunctions.escapeHtml(publishedVersion.commitId) + "</code>";
                if (publishedVersion.warning) {
                    resultHtml += '<br><span style="color:' + self.removedTripleColor + '">' + CommonBotFunctions.escapeHtml(publishedVersion.warning) + "</span>";
                }
                self.endWithMessage(resultHtml);
            });
        },

        pushBranchFn: function () {
            if (self.params.confirmation === self.cancelChoiceId) {
                return self.endWithMessage("Nothing was sent.");
            }
            var isBranchUpdate = self.params.action === "updateBranch";
            var method = isBranchUpdate ? "PUT" : "POST";
            self.callGitApi(method, "branches", { branch: self.params.branchName, message: self.params.commitMessage }, function (error, pushedBranch, status) {
                if (error) {
                    self.showError(error);
                    // a name git refuses or a branch that exists: asked again
                    if (!isBranchUpdate && (status === 400 || status === 409)) {
                        return self.myBotEngine.backToStep("askBranchNameFn");
                    }
                    return;
                }
                if (!pushedBranch.commitId) {
                    return self.endWithMessage("<b>" + CommonBotFunctions.escapeHtml(pushedBranch.branch) + "</b> already up to date, nothing pushed.");
                }
                self.endWithMessage("<b>" + CommonBotFunctions.escapeHtml(pushedBranch.branch) + "</b> pushed, commit <code>" + CommonBotFunctions.escapeHtml(pushedBranch.commitId) + "</code>");
            });
        },
    };

    // the last step: nextStep would close the dialog before the result is read
    self.endWithMessage = function (html) {
        $("#" + self.myBotEngine.divId)
            .find("#bot_resourcesProposalSelect")
            .hide();
        self.showMessage(html);
    };

    return self;
})();

export default GitVersioning_bot;
window.GitVersioning_bot = GitVersioning_bot;
