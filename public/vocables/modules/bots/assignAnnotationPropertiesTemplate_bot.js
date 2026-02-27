import BotEngineClass from "./_botEngineClass.js";
import AnnotationPropertiesTemplateAssignmentsResolver from "../shared/annotationPropertiesTemplateAssignmentsResolver.js";

/**
 * @module assignAnnotationPropertiesTemplate_bot
 * Assigns an annotation properties template to:
 * - a profile (applies to its accessible sources)
 * - a user (union of profile sources)
 *
 * One active assignment is maintained per target (source/user/profile). History is automatically cleaned (no-history policy).
 */
var AssignAnnotationPropertiesTemplate_bot = (function () {
    var self = {};
    self.myBotEngine = new BotEngineClass();
    self.title = "Assign annotation properties template";

    var TEMPLATE_TYPE = "annotationPropertiesTemplate";
    var ASSIGNMENT_TYPE = "annotationPropertiesTemplateAssignment";

    self.start = function (workflow, _params, callback) {
        var startParams = self.myBotEngine.fillStartParams(arguments);
        self.callback = callback;

        if (!workflow) {
            workflow = self.workflow;
        }

        self.myBotEngine.init(AssignAnnotationPropertiesTemplate_bot, workflow, null, function () {
            self.myBotEngine.startParams = startParams;

            self.params = {
                // selected values
                selectedScope: "",
                selectedTemplateId: null,
                selectedProfileId: "",
                selectedUserId: "",
                selectedSource: "",
                // loaded caches
                templatesList: [],
                profilesMap: null, // { profileId: profileObject }
                usersMap: null, // { userId: userObject }

                // computed
                previewSources: [],
                // existing source assignment resolution
                existingAssignmentId: null,
                existingTemplateId: null,
                existingTemplateLabel: "",
                pendingSourceLabel: "",
                pendingNewTemplateId: null,
                existingTemplateAction: "",
            };

            if (_params) {
                for (var k in _params) self.params[k] = _params[k];
            }

            self.myBotEngine.nextStep();
        });
    };

    /**
     * Ends the bot and triggers the optional callback (used by Admin UI for auto-refresh).
     * @param {Object|null} err
     */
    function endBot(err) {
        if (self.callback) {
            self.callback(err || null);
        }
        return self.myBotEngine.end();
    }

    // -------------------------
    // Workflows
    // -------------------------

    self.workflow_end = { _OR: { End: {} } };

    self.workflow_confirmApply = {
        _OR: {
            Apply: { applyAssignmentsFn: { handleExistingSourceActionFn: self.workflow_end } },
            Cancel: { endFn: self.workflow_end },
        },
    };

    self.workflow_chooseTarget = {
        _OR: {
            Profile: {
                chooseProfileFn: {
                    afterChooseProfileFn: {
                        previewSourcesFn: self.workflow_confirmApply,
                    },
                },
            },
            User: {
                chooseUserFn: {
                    afterChooseUserFn: {
                        previewSourcesFn: self.workflow_confirmApply,
                    },
                },
            },
            Source: {
                chooseSourceFn: {
                    afterChooseSourceFn: self.workflow_confirmApply,
                },
            },
            Cancel: { endFn: self.workflow_end },
        },
    };
    
    self.workflow_confirmDeleteTemplate = {
      _OR: {
        "Yes, delete": { deleteTemplateFn: self.workflow_end },
        Cancel: { endFn: self.workflow_end },
      },
    };

    // Confirm: unassign from all active targets, then delete the template
    self.workflow_confirmUnassignDeleteTemplate = {
      _OR: {
        "Unassign & delete (recommended)": {
          unassignTemplateFromAllTargetsFn: {
            deleteTemplateFn: self.workflow_end,
          },
        },
        Cancel: { endFn: self.workflow_end },
      },
    };

    self.workflow_chooseTemplate = {};

    self.workflow_templateActions = {
      _OR: {
        Apply: self.workflow_chooseTarget,
        "Delete template": { showDeleteTemplateWarningFn: {} },
        Back: { backToChooseTemplateFn: {} },
        Cancel: { endFn: self.workflow_end },
      },
    };

    self.workflow_chooseTemplate.chooseTemplateFn = {
      afterChooseTemplateFn: self.workflow_templateActions,
    };

    self.workflow = self.workflow_chooseTemplate;

    self.functionTitles = {
        chooseTemplateFn: "Choose template",
        afterChooseTemplateFn: "Template details",
        chooseProfileFn: "Choose profile",
        chooseUserFn: "Choose user",
        previewSourcesFn: "Preview sources",
        applyAssignmentsFn: "Apply template",
        handleExistingSourceActionFn: "Existing template found - choose an action",
        showDeleteTemplateWarningFn: "Delete template - warning",
        deleteTemplateFn: "Delete template",
        backToChooseTemplateFn: "Back to templates",
        unassignTemplateFromAllTargetsFn: "Unassign template from all targets",
    };

    // -------------------------
    // Functions
    // -------------------------

    self.functions = {
        /**
         * Loads templates list and asks user to select one.
         * Shows list as {id, label}.
         */
        chooseTemplateFn: function () {
            loadUserDataList(TEMPLATE_TYPE, function (err, list) {
                if (err) {
                    return self.myBotEngine.abort(err.responseText || err.message || err);
                }
                if (!list || list.length === 0) {
                    UI.message("No templates found", true);
                    return endBot(null);
                }

                // Defensive filtering: keep only templates (API may return mixed records)
                list = (list || []).filter(function (item) {
                    return item && item.data_type === TEMPLATE_TYPE;
                });

                self.params.templatesList = list;

                var choices = list.map(function (tpl) {
                    return {
                        id: String(tpl.id),
                        label: (tpl.data_label || "Template " + tpl.id) + " (id=" + tpl.id + ")",
                    };
                });

                return self.myBotEngine.showList(choices, "selectedTemplateId");
            });
        },

        /**
         * After selecting template, load full template (GET by id) and show details automatically.
         */
        afterChooseTemplateFn: function () {
            var templateId = parseInt(self.params.selectedTemplateId, 10);
            if (!templateId) {
                return self.myBotEngine.previousStep("No template selected");
            }

            self.params.selectedTemplateId = templateId;

            // Load template full info (includes data_content + shared_* fields)
            loadUserDataById(templateId, function (err, tplFull) {
                if (err) {
                    return self.myBotEngine.abort(err.responseText || err.message || err);
                }

                // Show template details (auto)
                showTemplateDetails(tplFull, function (err2) {
                    if (err2) {
                        // Non-blocking: still allow to continue
                        console.error(err2);
                    }
                    return self.myBotEngine.nextStep(self.workflow_templateActions);
                });
            });
        },

        /**
         * Goes back to the template list (chooseTemplateFn).
         * Avoids direct workflow circular references.
         */
        backToChooseTemplateFn: function () {
          // Close the right-side summary panel (best-effort)
          try {
            $("#smallDialogDiv").dialog("close");
          } catch (e) {}

          // Reset template selection
          self.params.selectedTemplateId = null;

          // Reset target selection (clean state)
          self.params.selectedProfileId = "";
          self.params.selectedUserId = "";
          self.params.selectedSource = "";

          // Reset computed preview
          self.params.previewSources = [];

          // Force BotEngine to restart at the chooseTemplate workflow
          self.myBotEngine.currentObj = self.workflow_chooseTemplate;
          return self.myBotEngine.nextStep(self.workflow_chooseTemplate);
        },

        /**
         * Loads profiles from /admin/profiles and asks user to choose one.
         */
        chooseProfileFn: function () {
            loadProfilesMap(function (err, profilesMap) {
                if (err) {
                    return self.myBotEngine.abort(err.responseText || err.message || err);
                }

                var profileIds = Object.keys(profilesMap || {});
                if (profileIds.length === 0) {
                    UI.message("No profiles found", true);
                    return self.myBotEngine.previousStep();
                }

                // Sort for readability
                profileIds.sort();

                var choices = profileIds.map(function (profileId) {
                    var p = profilesMap[profileId];
                    return { id: profileId, label: p && p.name ? p.name : profileId };
                });

                return self.myBotEngine.showList(choices, "selectedProfileId");
            });
        },

        afterChooseProfileFn: function () {
            if (!self.params.selectedProfileId) {
                return self.myBotEngine.previousStep("No profile selected");
            }
            return self.myBotEngine.nextStep();
        },

        /**
         * Loads users from /users and asks user to choose one.
         */
        chooseUserFn: function () {
            loadUsersMap(function (err, usersMap) {
                if (err) {
                    return self.myBotEngine.abort(err.responseText || err.message || err);
                }

                var userIds = Object.keys(usersMap || {});
                if (userIds.length === 0) {
                    UI.message("No users found", true);
                    return self.myBotEngine.previousStep();
                }

                userIds.sort();

                var choices = userIds.map(function (userLogin) {
                    var user = usersMap[userLogin];
                    return { id: userLogin, label: user && user.login ? user.login : userLogin };
                });

                return self.myBotEngine.showList(choices, "selectedUserId");
            });
        },

        afterChooseUserFn: function () {
            if (!self.params.selectedUserId) {
                return self.myBotEngine.previousStep("No user selected");
            }
            return self.myBotEngine.nextStep();
        },

        /**
         * Computes sources to apply, based on selected profile or user (union of user.groups profiles).
         * Shows a preview and stores self.params.previewSources.
         */
        previewSourcesFn: function () {
            var templateId = self.params.selectedTemplateId;
            if (!templateId) {
                return self.myBotEngine.previousStep("No template selected");
            }

            // Identify which branch we are in based on currentObj path:
            // If selectedProfileId is set -> profile mode, else user mode.
            var profileId = self.params.selectedProfileId;
            var userId = self.params.selectedUserId;

            if (profileId) {
                loadProfilesMap(function (err, profilesMap) {
                    if (err) return self.myBotEngine.abort(err.responseText || err.message || err);

                    var profile = profilesMap[profileId];
                    var sources = computeAccessibleSourcesForProfile(profile);

                    self.params.previewSources = sources;
                    showSourcesPreview("Profile " + profileId, sources);

                    return self.myBotEngine.nextStep(self.workflow_confirmApply);
                });
                return;
            }

            if (userId) {
                // User mode: union of sources from user.groups profiles
                loadUsersMap(function (err, usersMap) {
                    if (err) return self.myBotEngine.abort(err.responseText || err.message || err);

                    var user = usersMap[userId];
                    var groups = user && user.groups ? user.groups : [];

                    if (!groups || groups.length === 0) {
                        UI.message("User has no groups/profiles", true);
                        self.params.previewSources = [];
                        return self.myBotEngine.nextStep(self.workflow_confirmApply);
                    }

                    loadProfilesMap(function (err2, profilesMap2) {
                        if (err2) return self.myBotEngine.abort(err2.responseText || err2.message || err2);

                        var sourcesUnionMap = {};
                        groups.forEach(function (groupProfileId) {
                            var profile = profilesMap2[groupProfileId];
                            var sources = computeAccessibleSourcesForProfile(profile);
                            sources.forEach(function (s) {
                                sourcesUnionMap[s] = 1;
                            });
                        });

                        var sourcesUnion = Object.keys(sourcesUnionMap).sort();
                        self.params.previewSources = sourcesUnion;

                        showSourcesPreview("User " + userId + " (union of profiles)", sourcesUnion);

                        return self.myBotEngine.nextStep(self.workflow_confirmApply);
                    });
                });
                return;
            }

            // No target selected
            return self.myBotEngine.previousStep("No target selected (profile/user)");
        },

        /**
         * Creates one assignment per source (active-only strategy => newest wins).
         */
        applyAssignmentsFn: function () {
            var templateId = self.params.selectedTemplateId;
            if (!templateId) {
                return self.myBotEngine.abort("Missing templateId");
            }

            var scope = null;
            var targetId = null;

            if (self.params.selectedSource) {
                scope = "source";
                targetId = self.params.selectedSource;
            } else if (self.params.selectedProfileId) {
                scope = "profile";
                targetId = self.params.selectedProfileId;
            } else if (self.params.selectedUserId) {
                scope = "user";
                targetId = self.params.selectedUserId;
            } else {
                return self.myBotEngine.abort("No target selected");
            }

            // Use the same logic for all scopes (source/user/profile)
            return checkExistingTemplateForTarget(scope, targetId, templateId);
        },

        /**
         * Applies the user decision when an existing template was found on a source.
         */
        handleExistingSourceActionFn: function () {
            var action = self.params.existingTemplateAction;
            var scope = self.params.pendingTargetScope;
            var targetId = self.params.pendingTargetId;
            var newTemplateId = self.params.pendingNewTemplateId;

            if (!action || action === "cancel") {
                UI.message("Template assignment cancelled", true);
                return endBot(null);
            }

            if (action === "keep") {
                UI.message("Keeping existing template on " + scope + " " + targetId, true);
                return endBot(null);
            }

            if (action === "replace") {
                return createAnnotationTemplateAssignment({ scope: scope, targetId: targetId, templateId: newTemplateId }, endApply);
            }

            if (action === "add") {
                // Read existing template ids (already computed in checkExistingTemplateForTarget/checkExistingTemplateForSource)
                var existingTemplateIds = [];
                if (Array.isArray(self.params.existingTemplateIds)) {
                    existingTemplateIds = self.params.existingTemplateIds;
                }

                // Union existing + new
                var idsMap = {};
                existingTemplateIds.forEach(function (id) {
                    var n = parseInt(id, 10);
                    if (n) idsMap[String(n)] = 1;
                });
                if (newTemplateId) idsMap[String(parseInt(newTemplateId, 10))] = 1;

                var unionIds = Object.keys(idsMap).map(function (x) {
                    return parseInt(x, 10);
                });

                // Create a new assignment with templateIds[]
                return createAnnotationTemplateAssignment({ scope: scope, targetId: targetId, templateIds: unionIds }, endApply);
            }

            if (action === "remove") {
                // Recommended "clean" approach in your current architecture:
                // create a neutralizing assignment (latest wins) so createResource_bot sees no templateId.
                return createAnnotationTemplateAssignment({ scope: scope, targetId: targetId, templateId: null }, endApply);
            }

            // Fallback
            UI.message("Unknown action: " + action, true);
            return endBot(null);
        },

        /**
         * Ends bot cleanly.
         */
        endFn: function () {
            if (self.callback) self.callback(null);
            return self.myBotEngine.end();
        },

        /**
         * Lets the user choose a source.
         */
        chooseSourceFn: function () {
            var sources = Object.keys(Config.sources || {});
            if (!sources || sources.length === 0) {
                UI.message("No sources found", true);
                return self.myBotEngine.previousStep();
            }

            sources.sort();

            var choices = sources.map(function (sourceLabel) {
                return {
                    id: sourceLabel,
                    label: sourceLabel,
                };
            });

            self.myBotEngine.showList(choices, "selectedSource");
        },
        /**
         * Called after a source has been selected.
         */
        afterChooseSourceFn: function () {
            if (!self.params.selectedSource) {
                return self.myBotEngine.previousStep("No source selected");
            }
            return self.myBotEngine.nextStep();
        },

        /**
         * Shows a delete warning.
         * If the template is still applied on targets, propose "Unassign & delete" first.
         */
        showDeleteTemplateWarningFn: function () {
          var templateId = parseInt(self.params.selectedTemplateId, 10);
          if (!templateId) {
            return self.myBotEngine.previousStep("No template selected");
          }

          getActiveTargetsForTemplate(templateId, function (err, targets) {
            if (err) {
              return self.myBotEngine.abort(err.responseText || err.message || err);
            }
            targets = targets || { sources: [], profiles: [], users: [] };

            var sources = targets.sources || [];
            var profiles = targets.profiles || [];
            var users = targets.users || [];

            var hasAny = sources.length > 0 || profiles.length > 0 || users.length > 0;

            // Store for the unassign step
            self.params.pendingDeleteTemplateId = templateId;
            self.params.pendingDeleteTargets = targets;

            // Build info panel (right dialog)
            var html = "<div style='font-size:12px;'>";
            html += "<div><b>Delete template</b></div>";
            html += "<div style='margin-top:6px;'>Template id=<b>" + templateId + "</b></div>";

            if (hasAny) {
              html += "<div style='margin-top:6px; color:#b00;'><b>This template is still applied.</b></div>";
              html += "<div style='margin-top:6px;'>Recommended: unassign from all targets, then delete.</div>";

              html += "<div style='margin-top:10px;'><b>Applied on:</b></div>";

              html += "<div style='margin-top:4px;'><b>Sources (" + sources.length + "):</b></div>";
              html += "<div style='max-height:70px; overflow:auto; border:1px solid #ddd; padding:6px;'>" + escapeHtml(sources.join(", ")) + "</div>";

              html += "<div style='margin-top:6px;'><b>Profiles (" + profiles.length + "):</b></div>";
              html += "<div style='max-height:70px; overflow:auto; border:1px solid #ddd; padding:6px;'>" + escapeHtml(profiles.join(", ")) + "</div>";

              html += "<div style='margin-top:6px;'><b>Users (" + users.length + "):</b></div>";
              html += "<div style='max-height:70px; overflow:auto; border:1px solid #ddd; padding:6px;'>" + escapeHtml(users.join(", ")) + "</div>";

              html += "<div style='margin-top:10px; color:#555;'><i>Use the bot menu to choose an action.</i></div>";
            } else {
              html += "<div style='margin-top:6px;'>This template is not applied anywhere.</div>";
              html += "<div style='margin-top:6px;'>Do you want to delete it?</div>";
              html += "<div style='margin-top:10px; color:#555;'><i>Use the bot menu to confirm (Yes, delete / Cancel).</i></div>";
            }

            html += "</div>";

            $("#smallDialogDiv").html(html);
            $("#smallDialogDiv").dialog("open");
            UI.setDialogTitle("#smallDialogDiv", "Delete template");

            if (hasAny) {
              // Go to unassign+delete confirmation menu
              self.myBotEngine.currentObj = self.workflow_confirmUnassignDeleteTemplate;
              return self.myBotEngine.nextStep(self.workflow_confirmUnassignDeleteTemplate);
            }

            // No targets -> keep current delete confirmation
            self.myBotEngine.currentObj = self.workflow_confirmDeleteTemplate;
            return self.myBotEngine.nextStep(self.workflow_confirmDeleteTemplate);
          });
        },

        /**
         * Deletes the selected template (user data record).
         * Uses DELETE /users/data/{id}.
         */
        deleteTemplateFn: function () {
          var templateId = parseInt(self.params.selectedTemplateId, 10);
          if (!templateId) {
            return self.myBotEngine.abort("Missing templateId");
          }

          $.ajax({
            url: Config.apiUrl + "/users/data/" + templateId,
            type: "DELETE",
            success: function () {
              UI.message("Template deleted (id=" + templateId + ")", true);

              // Cleanup local state to avoid using deleted template after Back
              self.params.selectedTemplateId = null;

              // Best-effort: close the side dialog
              try {
                $("#smallDialogDiv").dialog("close");
              } catch (e) {}

              return endBot(null);
            },
            error: function (err) {
              return self.myBotEngine.abort(err.responseText || err.message || err);
            },
          });
        },

        /**
         * Unassigns the pending delete template from all active targets.
         * @returns {void}
         */
        unassignTemplateFromAllTargetsFn: function () {
          var templateId = parseInt(self.params.pendingDeleteTemplateId, 10);
          var targets = self.params.pendingDeleteTargets || { sources: [], profiles: [], users: [] };

          if (!templateId) {
            return self.myBotEngine.abort("Missing pendingDeleteTemplateId");
          }

          var targetJobs = [];
          (targets.sources || []).forEach(function (sourceLabel) {
            targetJobs.push({ scope: "source", targetId: sourceLabel });
          });
          (targets.profiles || []).forEach(function (profileId) {
            targetJobs.push({ scope: "profile", targetId: profileId });
          });
          (targets.users || []).forEach(function (userLogin) {
            targetJobs.push({ scope: "user", targetId: userLogin });
          });

          if (targetJobs.length === 0) {
            return self.myBotEngine.nextStep();
          }

          async.eachSeries(
            targetJobs,
            function (job, callbackEach) {
              getActiveAssignmentForTargetFull(job.scope, job.targetId, function (err, activeAssignment) {
                if (err) {
                  return callbackEach(err);
                }
                if (!activeAssignment) {
                  return callbackEach();
                }

                var content = normalizeDataContent(activeAssignment.data_content);
                var existingTemplateIds = [];

                if (content && Array.isArray(content.templateIds) && content.templateIds.length > 0) {
                  existingTemplateIds = content.templateIds.slice();
                } else if (content && content.templateId !== undefined && content.templateId !== null) {
                  existingTemplateIds = [content.templateId];
                }

                var remainingTemplateIds = [];
                var wasTemplatePresent = false;

                existingTemplateIds.forEach(function (id) {
                  var numericId = parseInt(id, 10);
                  if (!numericId) {
                    return;
                  }
                  if (numericId === templateId) {
                    wasTemplatePresent = true;
                    return;
                  }
                  if (remainingTemplateIds.indexOf(numericId) < 0) {
                    remainingTemplateIds.push(numericId);
                  }
                });

                if (!wasTemplatePresent) {
                  return callbackEach();
                }

                var assignmentParams = {
                  scope: job.scope,
                  targetId: job.targetId,
                };
                if (remainingTemplateIds.length === 0) {
                  return deleteAssignmentsForTarget(job.scope, job.targetId, callbackEach);
                }

                if (remainingTemplateIds.length === 1) {
                  assignmentParams.templateId = remainingTemplateIds[0];
                } else {
                  assignmentParams.templateIds = remainingTemplateIds;
                }

                createAnnotationTemplateAssignment(assignmentParams, function (err2, newAssignmentId) {
                  if (err2) {
                    return callbackEach(err2);
                  }
                  deletePreviousAssignmentsForTarget(job.scope, job.targetId, newAssignmentId, function () {
                    return callbackEach();
                  });
                });
              });
            },
            function (err) {
              if (err) {
                return self.myBotEngine.abort(err.responseText || err.message || err);
              }

              self.params.pendingDeleteTemplateId = null;
              self.params.pendingDeleteTargets = null;
              return self.myBotEngine.nextStep();
            },
          );
        },

    };

    // -------------------------
    // Internal helpers (AJAX)
    // -------------------------

    function loadUserDataList(dataType, callback) {
        $.ajax({
            url: Config.apiUrl + "/users/data",
            type: "GET",
            dataType: "json",
            data: { data_type: dataType },
            success: function (data) {
                return callback(null, data || []);
            },
            error: function (err) {
                return callback(err);
            },
        });
    }

    function loadUserDataById(id, callback) {
        $.ajax({
            url: Config.apiUrl + "/users/data/" + id,
            type: "GET",
            dataType: "json",
            success: function (data) {
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    }

    function loadProfilesMap(callback) {
        if (self.params.profilesMap) {
            return callback(null, self.params.profilesMap);
        }

        $.ajax({
            url: Config.apiUrl + "/admin/profiles",
            type: "GET",
            dataType: "json",
            success: function (data) {
                var profilesMap = data && data.resources ? data.resources : {};
                self.params.profilesMap = profilesMap;
                return callback(null, profilesMap);
            },
            error: function (err) {
                return callback(err);
            },
        });
    }

    function loadUsersMap(callback) {
        if (self.params.usersMap) {
            return callback(null, self.params.usersMap);
        }

        $.ajax({
            url: Config.apiUrl + "/users",
            type: "GET",
            dataType: "json",
            success: function (data) {
                var resources = data && data.resources ? data.resources : {};
                var usersMap = {};

                // The ShareUserData_bot expects resources values to be wrapper objects
                // like: { "admin": { id:"1", login:"admin", groups:[...] } }
                // It extracts login with Object.keys(wrapper)[0].
                var wrappersArray = Object.values(resources);

                wrappersArray.forEach(function (wrapper) {
                    if (!wrapper || typeof wrapper !== "object") {
                        return;
                    }

                    // Case A: wrapper has exactly one key = login
                    var wrapperKeys = Object.keys(wrapper);
                    if (wrapperKeys.length === 1) {
                        var loginKey = wrapperKeys[0];
                        var userObj = wrapper[loginKey];

                        if (userObj && typeof userObj === "object") {
                            if (!userObj.login) {
                                userObj.login = loginKey;
                            }
                            usersMap[userObj.login] = userObj;
                        }
                        return;
                    }

                    // Case B: direct user object (fallback)
                    if (wrapper.login) {
                        usersMap[wrapper.login] = wrapper;
                    }
                });

                self.params.usersMap = usersMap;
                return callback(null, usersMap);
            },
            error: function (err) {
                return callback(err);
            },
        });
    }

    // -------------------------
    // Internal helpers (UI)
    // -------------------------

    function showTemplateDetails(templateFull, callback) {
        var templateId = templateFull.id;
        var label = templateFull.data_label || "Template " + templateId;
        var group = templateFull.data_group || "";
        var comment = templateFull.data_comment || "";

        var content = normalizeDataContent(templateFull.data_content);
        var selections = (content && content.selections) || [];
        var properties = (content && content.properties) || [];

        // Load active assignments for this template (active-only per target: source/profile/user)
        getActiveTargetsForTemplate(templateId, function (err, activeTargets) {
          if (err) {
            activeTargets = { sources: [], profiles: [], users: [] };
          }

          // Defensive defaults
          var activeSources = (activeTargets && activeTargets.sources) ? activeTargets.sources : [];
          var activeProfiles = (activeTargets && activeTargets.profiles) ? activeTargets.profiles : [];
          var activeUsers = (activeTargets && activeTargets.users) ? activeTargets.users : [];

          var html = "<div style='font-size:12px;'>";
          html += "<div><b>Template:</b> " + escapeHtml(label) + "</div>";
          html += "<div><b>ID:</b> " + templateId + "</div>";
          html += "<div><b>Group:</b> " + escapeHtml(group) + "</div>";
          html += "<div><b>Description:</b> " + escapeHtml(comment) + "</div>";

          html += "<div style='margin-top:8px;'><b>Applied on:</b></div>";

          html += "<div style='margin-top:4px;'><b>Sources (" + activeSources.length + "):</b></div>";
          html +=
            "<div style='max-height:80px; overflow:auto; border:1px solid #ddd; padding:6px;'>" +
            escapeHtml(activeSources.join(", ")) +
            "</div>";

          html += "<div style='margin-top:6px;'><b>Profiles (" + activeProfiles.length + "):</b></div>";
          html +=
            "<div style='max-height:80px; overflow:auto; border:1px solid #ddd; padding:6px;'>" +
            escapeHtml(activeProfiles.join(", ")) +
            "</div>";

          html += "<div style='margin-top:6px;'><b>Users (" + activeUsers.length + "):</b></div>";
          html +=
            "<div style='max-height:80px; overflow:auto; border:1px solid #ddd; padding:6px;'>" +
            escapeHtml(activeUsers.join(", ")) +
            "</div>";

          // Properties (unchanged)
          html += "<div style='margin-top:8px;'><b>Properties:</b></div><ul>";
          if (selections.length > 0) {
            selections.forEach(function (s) {
              html +=
                "<li>" +
                escapeHtml(s.vocab || "?") +
                ": " +
                escapeHtml(s.propertyLabel || s.propertyUri || "") +
                "</li>";
            });
          } else {
            properties.forEach(function (p) {
              html += "<li>" + escapeHtml(p) + "</li>";
            });
          }
          html += "</ul></div>";

          $("#smallDialogDiv").html(html);
          $("#smallDialogDiv")
            .dialog({
              modal: false,
              width: 420,
              position: {
                my: "left top",
                at: "right top",
                of: "#mainDialogDiv",
              },
            })
            .dialog("open");

          UI.setDialogTitle("#smallDialogDiv", "Template details");
          return callback(null);
        });
    }

    function showSourcesPreview(title, sources) {
        var html = "<div style='font-size:12px;'>";
        html += "<div><b>" + escapeHtml(title) + "</b></div>";
        html += "<div style='margin-top:6px;'><b>Sources (" + sources.length + "):</b></div>";
        html += "<div style='max-height:200px; overflow:auto; border:1px solid #ddd; padding:6px;'>";
        html += escapeHtml(sources.join(", "));
        html += "</div></div>";

        $("#smallDialogDiv").html(html);
        $("#smallDialogDiv").dialog("open");
        UI.setDialogTitle("#smallDialogDiv", "Preview sources");
    }

    /**
     * Returns sources where this template is ACTIVE (active-only per source).
     * We do:
     * - GET list assignments (no data_content)
     * - find latest assignment id per source
     * - GET by id each latest assignment to read templateId
     */
    function getActiveSourcesForTemplate(templateId, callback) {
        $.ajax({
            url: Config.apiUrl + "/users/data?data_type=" + encodeURIComponent(ASSIGNMENT_TYPE),
            type: "GET",
            dataType: "json",
            success: function (list) {
                list = list || [];

                // latest assignment id per source (based on list ids)
                var latestIdBySource = {};
                list.forEach(function (a) {
                    if (!a || !a.data_source || !a.id) return;
                    if (!latestIdBySource[a.data_source] || a.id > latestIdBySource[a.data_source]) {
                        latestIdBySource[a.data_source] = a.id;
                    }
                });

                var activeAssignmentIds = Object.keys(latestIdBySource).map(function (s) {
                    return latestIdBySource[s];
                });

                var activeSources = [];

                async.eachSeries(
                    activeAssignmentIds,
                    function (assignmentId, cbEach) {
                        loadUserDataById(assignmentId, function (err, full) {
                            if (err) return cbEach(); // ignore one failure
                            var c = normalizeDataContent(full.data_content);
                            if (c && c.templateId === templateId) {
                                activeSources.push(full.data_source);
                            }
                            return cbEach();
                        });
                    },
                    function () {
                        activeSources.sort();
                        return callback(null, activeSources);
                    },
                );
            },
            error: function (err) {
                return callback(err);
            },
        });
    }

    function normalizeDataContent(dataContent) {
        if (!dataContent) return null;
        if (typeof dataContent === "string") {
            try {
                return JSON.parse(dataContent);
            } catch (e) {
                return null;
            }
        }
        return dataContent;
    }

    /**
     * Returns targets where this template is ACTIVE (active-only per target).
     * Active = latest assignment (highest id) for each target (source/user/profile).
     *
     * @param {number} templateId
     * @param {function} callback (err, result) with result={sources:[], profiles:[], users:[]}
     */
    function getActiveTargetsForTemplate(templateId, callback) {
      $.ajax({
        url: Config.apiUrl + "/users/data?data_type=" + encodeURIComponent(ASSIGNMENT_TYPE),
        type: "GET",
        dataType: "json",
        success: function (list) {
          list = list || [];

          // 1) Compute latest assignment id per target key
          var latestIdByTarget = {};

          list.forEach(function (a) {
            if (!a || !a.id) return;

            // Source target (data_source is set)
            if (a.data_source) {
              var keyS = "source:" + a.data_source;
              if (!latestIdByTarget[keyS] || a.id > latestIdByTarget[keyS]) {
                latestIdByTarget[keyS] = a.id;
              }
              return;
            }

            // User target (shared_users contains user login)
            if (Array.isArray(a.shared_users) && a.shared_users.length > 0) {
              // In this bot, assignments are typically 1 user; still handle arrays defensively
              a.shared_users.forEach(function (u) {
                if (!u) return;
                var keyU = "user:" + u;
                if (!latestIdByTarget[keyU] || a.id > latestIdByTarget[keyU]) {
                  latestIdByTarget[keyU] = a.id;
                }
              });
              return;
            }

            // Profile target (shared_profiles contains profile ids)
            if (Array.isArray(a.shared_profiles) && a.shared_profiles.length > 0) {
              a.shared_profiles.forEach(function (p) {
                if (!p) return;
                var keyP = "profile:" + p;
                if (!latestIdByTarget[keyP] || a.id > latestIdByTarget[keyP]) {
                  latestIdByTarget[keyP] = a.id;
                }
              });
            }
          });

          var latestIds = Object.keys(latestIdByTarget).map(function (k) {
            return latestIdByTarget[k];
          });

          var out = { sources: [], profiles: [], users: [] };
          var seen = { source: {}, profile: {}, user: {} };

          // 2) Reload each latest assignment by id to read data_content
          async.eachSeries(
            latestIds,
            function (assignmentId, cbEach) {
              loadUserDataById(assignmentId, function (err, full) {
                if (err || !full) return cbEach(); // ignore one failure

                var c = normalizeDataContent(full.data_content);
                if (!c) return cbEach();

                // Support both single and multi modes
                var match = false;
                if (c.templateId === templateId) match = true;
                if (!match && Array.isArray(c.templateIds) && c.templateIds.indexOf(templateId) > -1) match = true;
                if (!match) return cbEach();

                // Identify the target from the full record
                if (full.data_source) {
                  if (!seen.source[full.data_source]) {
                    seen.source[full.data_source] = 1;
                    out.sources.push(full.data_source);
                  }
                } else if (Array.isArray(full.shared_users) && full.shared_users.length > 0) {
                  full.shared_users.forEach(function (u) {
                    if (u && !seen.user[u]) {
                      seen.user[u] = 1;
                      out.users.push(u);
                    }
                  });
                } else if (Array.isArray(full.shared_profiles) && full.shared_profiles.length > 0) {
                  full.shared_profiles.forEach(function (p) {
                    if (p && !seen.profile[p]) {
                      seen.profile[p] = 1;
                      out.profiles.push(p);
                    }
                  });
                }

                return cbEach();
              });
            },
            function () {
              out.sources.sort();
              out.profiles.sort();
              out.users.sort();
              return callback(null, out);
            },
          );
        },
        error: function (err) {
          return callback(err);
        },
      });
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return "";
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    /**
     * Creates a declarative annotation template assignment.
     * No RDF triples are written here.
     *
     * @param {Object} params
     * @param {string} params.scope - "user" | "profile" | "source"
     * @param {string} params.targetId - userLogin | profileId | sourceLabel
     * @param {number|null} params.templateId
     * @param {Array<number>} [params.templateIds]
     * @param {Function} callback error-first callback
     */
    function createAnnotationTemplateAssignment(params, callback) {
        // Decide what we store (compute OUTSIDE the payload object)
        var tplIds = Array.isArray(params.templateIds) ? params.templateIds : null;

        // Backward compatible main templateId:
        // - if templateIds[] exists -> take the last one
        // - else fallback to params.templateId
        var mainTemplateId = null;
        if (tplIds && tplIds.length > 0) {
            mainTemplateId = tplIds[tplIds.length - 1];
        } else if (typeof params.templateId !== "undefined") {
            mainTemplateId = params.templateId;
        }

        var payload = {
            data_type: "annotationPropertiesTemplateAssignment",
            data_label: "Annotation template assignment",
            data_comment: "Declarative assignment",
            data_tool: "admin",

            // Visibility
            shared_users: params.scope === "user" ? [params.targetId] : [],
            shared_profiles: params.scope === "profile" ? [params.targetId] : [],
            data_source: params.scope === "source" ? params.targetId : "",

            // Business logic
            data_content: {
                scope: params.scope,
                targetId: params.targetId,

                // Always keep templateId for backward compatibility
                templateId: mainTemplateId,

                // Multi mode (can be null)
                templateIds: tplIds,

                strategy: tplIds ? "multi" : "single",
                createdAt: new Date().toISOString(),
            },
        };

        $.ajax({
            url: Config.apiUrl + "/users/data",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(payload),
            success: function (data, _textStatus, jqXHR) {
                // Try to read created id from response body or headers
                var newAssignmentId = getCreatedUserDataId(data, jqXHR);

                // Fallback: if API does not return the id, compute it from the latest matching assignment
                if (!newAssignmentId) {
                    return getLatestAssignmentIdForTarget(params.scope, params.targetId, function (_err2, latestId) {
                        newAssignmentId = latestId || null;

                        try {
                            AnnotationPropertiesTemplateAssignmentsResolver.clearCache();
                        } catch (e) {}

                        return callback(null, newAssignmentId);
                    });
                }

                try {
                    AnnotationPropertiesTemplateAssignmentsResolver.clearCache();
                } catch (e) {}

                return callback(null, newAssignmentId);
            },
            error: function (err) {
                return callback(err);
            },
        });
    }

    /**
     * Extracts created user-data id from ajax response (body or headers).
     * @param {Object} data Ajax success data
     * @param {Object} jqXHR Ajax jqXHR
     * @returns {number|null}
     */
    function getCreatedUserDataId(data, jqXHR) {
        // Case A: server returns {id: 123}
        if (data && data.id) {
            var id1 = parseInt(data.id, 10);
            if (id1) return id1;
        }

        // Case B: some servers put id in responseJSON
        if (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.id) {
            var id2 = parseInt(jqXHR.responseJSON.id, 10);
            if (id2) return id2;
        }

        // Case C: Location header ends with /users/data/{id}
        if (jqXHR && jqXHR.getResponseHeader) {
            var location = jqXHR.getResponseHeader("Location");
            if (location) {
                var match = location.match(/\/(\d+)\s*$/);
                if (match && match[1]) {
                    var id3 = parseInt(match[1], 10);
                    if (id3) return id3;
                }
            }
        }

        return null;
    }

    /**
     * Fallback: finds the latest assignment id for a given target (scope + targetId).
     * This is used only if the POST response does not return an id.
     *
     * @param {string} scope "source" | "user" | "profile"
     * @param {string} targetId
     * @param {function} callback (err, latestId)
     */
    function getLatestAssignmentIdForTarget(scope, targetId, callback) {
        $.ajax({
            url: Config.apiUrl + "/users/data?data_type=" + encodeURIComponent(ASSIGNMENT_TYPE),
            type: "GET",
            dataType: "json",
            success: function (list) {
                list = list || [];

                var matching = list.filter(function (item) {
                    if (!item || !item.id) return false;

                    if (scope === "source") {
                        return item.data_source && item.data_source === targetId;
                    }
                    if (scope === "user") {
                        return Array.isArray(item.shared_users) && item.shared_users.indexOf(targetId) > -1;
                    }
                    if (scope === "profile") {
                        return Array.isArray(item.shared_profiles) && item.shared_profiles.indexOf(targetId) > -1;
                    }
                    return false;
                });

                var latestId = null;
                matching.forEach(function (item) {
                    if (!latestId || item.id > latestId) latestId = item.id;
                });

                return callback(null, latestId);
            },
            error: function (_err) {
                // Do not block: just return null if we cannot compute it
                return callback(null, null);
            },
        });
    }

    /**
     * Returns the ACTIVE assignment record (FULL) for a source.
     * Active = latest assignment (highest id) for this source.
     * We MUST reload by id to get data_content (list endpoint may not include it).
     *
     * @param {string} sourceLabel
     * @param {Function} callback (err, fullAssignment|null)
     */
    function getActiveAssignmentForSourceFull(sourceLabel, callback) {
        $.ajax({
            url: Config.apiUrl + "/users/data?data_type=" + encodeURIComponent(ASSIGNMENT_TYPE) + "&data_source=" + encodeURIComponent(sourceLabel),
            type: "GET",
            dataType: "json",
            success: function (assignments) {
                assignments = assignments || [];
                if (assignments.length === 0) {
                    return callback(null, null);
                }
                var latest = assignments.reduce(function (acc, item) {
                    if (!acc) return item;
                    return item.id > acc.id ? item : acc;
                }, null);

                if (!latest || !latest.id) {
                    return callback(null, null);
                }

                // IMPORTANT: reload full record by id to get data_content
                loadUserDataById(latest.id, function (err, full) {
                    if (err) return callback(err);
                    return callback(null, full);
                });
            },
            error: function (err) {
                return callback(err);
            },
        });
    }

    /**
     * Returns the ACTIVE assignment record (FULL) for a generic target (user/profile/source).
     * Active = latest assignment (highest id) for this target.
     *
     * @param {string} scope "source" | "user" | "profile"
     * @param {string} targetId
     * @param {function} callback (err, fullAssignment|null)
     */
    function getActiveAssignmentForTargetFull(scope, targetId, callback) {
        // Source can reuse the existing source-specific endpoint
        if (scope === "source") {
            return getActiveAssignmentForSourceFull(targetId, callback);
        }

        // For user/profile: load list, filter by shared_users/shared_profiles, then reload full by id
        $.ajax({
            url: Config.apiUrl + "/users/data?data_type=" + encodeURIComponent(ASSIGNMENT_TYPE),
            type: "GET",
            dataType: "json",
            success: function (assignments) {
                assignments = assignments || [];

                var matching = assignments.filter(function (item) {
                    if (!item || !item.id) return false;

                    if (scope === "user") {
                        return Array.isArray(item.shared_users) && item.shared_users.indexOf(targetId) > -1;
                    }
                    if (scope === "profile") {
                        return Array.isArray(item.shared_profiles) && item.shared_profiles.indexOf(targetId) > -1;
                    }
                    return false;
                });

                if (matching.length === 0) {
                    return callback(null, null);
                }

                var latest = matching.reduce(function (acc, item) {
                    if (!acc) return item;
                    return item.id > acc.id ? item : acc;
                }, null);

                return loadUserDataById(latest.id, function (err, full) {
                    if (err) return callback(err);
                    return callback(null, full);
                });
            },
            error: function (err) {
                return callback(err);
            },
        });
    }

    /**
     * Checks if a source already has an active template and asks what to do.
     * Options: keep / replace / remove / cancel.
     *
     * @param {string} sourceLabel
     * @param {number} newTemplateId
     */
    function checkExistingTemplateForSource(sourceLabel, newTemplateId) {
        getActiveAssignmentForSourceFull(sourceLabel, function (err, existingFull) {
            if (err) {
                // safer to stop than to overwrite blindly
                return self.myBotEngine.abort(err.responseText || err.message || err);
            }
            self.params.pendingSourceLabel = sourceLabel;
            // No existing assignment -> assign directly
            if (!existingFull) {
                self.params.pendingTargetScope = "source";
                self.params.pendingTargetId = sourceLabel;
                return createAnnotationTemplateAssignment({ scope: "source", targetId: sourceLabel, templateId: newTemplateId }, endApply);
            }

            var existingContent = normalizeDataContent(existingFull.data_content);
            var existingTemplateId = existingContent ? existingContent.templateId : null;

            self.params.existingTemplateIds = null;

            if (existingContent && Array.isArray(existingContent.templateIds)) {
                self.params.existingTemplateIds = existingContent.templateIds;
            } else if (existingContent && existingContent.templateId) {
                self.params.existingTemplateIds = [existingContent.templateId];
            }

            // If existing record has no templateId -> treat as "no active template"
            if (!existingTemplateId) {
                return createAnnotationTemplateAssignment({ scope: "source", targetId: sourceLabel, templateId: newTemplateId }, endApply);
            }

            // Store context for next step
            self.params.existingAssignmentId = existingFull.id;
            self.params.existingTemplateId = existingTemplateId;
            self.params.pendingSourceLabel = sourceLabel;
            self.params.pendingNewTemplateId = newTemplateId;
            self.params.pendingTargetScope = "source";
            self.params.pendingTargetId = sourceLabel;
            // Load existing template label for display
            loadUserDataById(existingTemplateId, function (_err2, tpl) {
                var label = "";
                if (tpl && tpl.data_label) label = tpl.data_label;
                self.params.existingTemplateLabel = label || "Template " + existingTemplateId;

                // Show action list in the bot (project-friendly pattern)
                var choices = [
                    { id: "keep", label: "Keep current template (" + self.params.existingTemplateLabel + ")" },
                    { id: "replace", label: "Replace with new template (id=" + newTemplateId + ")" },
                    { id: "add", label: "Add another template (keep existing + add new)" },
                    { id: "remove", label: "Remove template from this source" },
                    { id: "cancel", label: "Cancel" },
                ];

                // This will set self.params.existingTemplateAction
                self.myBotEngine.showList(choices, "existingTemplateAction");

                // Then the workflow goes to handleExistingSourceActionFn (next step)
                return;
            });
        });
    }

    /**
     * Same behavior as source assignment, but for any scope (source/user/profile).
     * Shows keep/replace/add/remove/cancel when an existing assignment is found.
     *
     * @param {string} scope "source" | "user" | "profile"
     * @param {string} targetId
     * @param {number} newTemplateId
     */
    function checkExistingTemplateForTarget(scope, targetId, newTemplateId) {
        getActiveAssignmentForTargetFull(scope, targetId, function (err, existingFull) {
            if (err) {
                return self.myBotEngine.abort(err.responseText || err.message || err);
            }

            // Store generic pending target (used by endApply)
            self.params.pendingTargetScope = scope;
            self.params.pendingTargetId = targetId;
            self.params.pendingNewTemplateId = newTemplateId;

            // No existing assignment => assign directly (no-history will cleanup anyway)
            if (!existingFull) {
                return createAnnotationTemplateAssignment({ scope: scope, targetId: targetId, templateId: newTemplateId }, endApply);
            }

            var existingContent = normalizeDataContent(existingFull.data_content);
            self.params.existingTemplateIds = null;

            if (existingContent && Array.isArray(existingContent.templateIds)) {
                self.params.existingTemplateIds = existingContent.templateIds;
            } else if (existingContent && existingContent.templateId) {
                self.params.existingTemplateIds = [existingContent.templateId];
            }

            var existingTemplateId = existingContent ? existingContent.templateId : null;

            // If existing record has no templateId => treat as no active template
            if (!existingTemplateId) {
                return createAnnotationTemplateAssignment({ scope: scope, targetId: targetId, templateId: newTemplateId }, endApply);
            }

            // Load existing template label for display
            loadUserDataById(existingTemplateId, function (_err2, tpl) {
                var label = "";
                if (tpl && tpl.data_label) label = tpl.data_label;
                self.params.existingTemplateLabel = label || "Template " + existingTemplateId;

                var choices = [
                    { id: "keep", label: "Keep current template (" + self.params.existingTemplateLabel + ")" },
                    { id: "replace", label: "Replace with new template" },
                    { id: "add", label: "Add another template (keep existing + add new)" },
                    { id: "remove", label: "Remove template from this target" },
                    { id: "cancel", label: "Cancel" },
                ];

                // This sets self.params.existingTemplateAction
                self.myBotEngine.showList(choices, "existingTemplateAction");
                return;
            });
        });
    }

    /**
     * Finalizes an assignment by deleting previous ones for the same target (no-history policy).
     * @param {string} scope "source" | "user" | "profile"
     * @param {string} targetId
     * @param {number} newAssignmentId
     * @param {string} successMessage
     */
    function finalizeNoHistoryAssignment(scope, targetId, newAssignmentId, successMessage) {
        deletePreviousAssignmentsForTarget(scope, targetId, newAssignmentId, function () {
            UI.message(successMessage, true);
            endBot(null);
        });
    }

    /**
     * Ends the apply workflow cleanly.
     */
    function endApply(err, newAssignmentId) {
        if (err) {
            return self.myBotEngine.abort(err.responseText || err.message || err);
        }
        // For source actions, we stored the pending target in params
        finalizeNoHistoryAssignment(self.params.pendingTargetScope, self.params.pendingTargetId, newAssignmentId, "Template assigned successfully");
    }

    /**
     * Deletes previous assignments for the same target (no history policy).
     * Keeps only the newly created assignment (by id).
     *
     * Safety: deletes only assignments with id < newAssignmentId.
     *
     * @param {string} scope "source" | "user" | "profile"
     * @param {string} targetId sourceLabel | userLogin | profileId
     * @param {number} newAssignmentId
     * @param {function} callback error-first callback
     */
    function deletePreviousAssignmentsForTarget(scope, targetId, newAssignmentId, callback) {
        if (!scope || !targetId || !newAssignmentId) {
            return callback(null);
        }

        // 1) Load list of assignments (list endpoint is enough: id + data_source + shared_users + shared_profiles)
        $.ajax({
            url: Config.apiUrl + "/users/data?data_type=" + encodeURIComponent(ASSIGNMENT_TYPE),
            type: "GET",
            dataType: "json",
            success: function (list) {
                list = list || [];

                // 2) Keep only assignments matching this target
                var matching = list.filter(function (item) {
                    if (!item || !item.id) return false;

                    if (scope === "source") {
                        return item.data_source && item.data_source === targetId;
                    }
                    if (scope === "user") {
                        return Array.isArray(item.shared_users) && item.shared_users.indexOf(targetId) > -1;
                    }
                    if (scope === "profile") {
                        return Array.isArray(item.shared_profiles) && item.shared_profiles.indexOf(targetId) > -1;
                    }
                    return false;
                });

                // 3) Delete only older ones (id < newAssignmentId) and not the new one
                var idsToDelete = matching
                    .map(function (x) {
                        return x.id;
                    })
                    .filter(function (id) {
                        return id && id !== newAssignmentId && id < newAssignmentId;
                    });

                async.eachSeries(
                    idsToDelete,
                    function (id, cbEach) {
                        $.ajax({
                            url: Config.apiUrl + "/users/data/" + id,
                            type: "DELETE",
                            success: function () {
                                return cbEach();
                            },
                            error: function () {
                                return cbEach();
                            }, // non-blocking cleanup
                        });
                    },
                    function () {
                        return callback(null);
                    },
                );
            },
            error: function (err) {
                // Do not block the main flow if cleanup fails
                return callback(null);
            },
        });
    }

    /**
     * Deletes all template assignment records for a given target.
     * @param {string} scope "source" | "user" | "profile"
     * @param {string} targetId
     * @param {function} callback callback(err)
     * @returns {void}
     */
    function deleteAssignmentsForTarget(scope, targetId, callback) {
      if (!scope || !targetId) {
        return callback(null);
      }

      $.ajax({
        url: Config.apiUrl + "/users/data?data_type=" + encodeURIComponent(ASSIGNMENT_TYPE),
        type: "GET",
        dataType: "json",
        success: function (list) {
          list = list || [];

          var matchingIds = list
            .filter(function (item) {
              if (!item || !item.id) return false;

              if (scope === "source") {
                return item.data_source && item.data_source === targetId;
              }
              if (scope === "user") {
                return Array.isArray(item.shared_users) && item.shared_users.indexOf(targetId) > -1;
              }
              if (scope === "profile") {
                return Array.isArray(item.shared_profiles) && item.shared_profiles.indexOf(targetId) > -1;
              }
              return false;
            })
            .map(function (item) {
              return item.id;
            });

          if (matchingIds.length === 0) {
            try {
              AnnotationPropertiesTemplateAssignmentsResolver.clearCache();
            } catch (e) {}
            return callback(null);
          }

          async.eachSeries(
            matchingIds,
            function (id, callbackEach) {
              $.ajax({
                url: Config.apiUrl + "/users/data/" + id,
                type: "DELETE",
                success: function () {
                  return callbackEach();
                },
                error: function (err) {
                  return callbackEach(err);
                },
              });
            },
            function (err) {
              try {
                AnnotationPropertiesTemplateAssignmentsResolver.clearCache();
              } catch (e) {}
              return callback(err || null);
            },
          );
        },
        error: function (err) {
          return callback(err);
        },
      });
    }

    return self;
})();

export default AssignAnnotationPropertiesTemplate_bot;
window.AssignAnnotationPropertiesTemplate_bot = AssignAnnotationPropertiesTemplate_bot;
