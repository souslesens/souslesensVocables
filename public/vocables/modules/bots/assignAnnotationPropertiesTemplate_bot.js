import BotEngineClass from "./_botEngineClass.js";

/**
 * @module assignAnnotationPropertiesTemplate_bot
 * Assigns an annotation properties template to:
 * - a profile (applies to its accessible sources)
 * - a user (union of profile sources)
 *
 * One assignment record is created per source.
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
            previewSourcesFn: self.workflow_confirmApply
          }
        }
      },
      User: {
        chooseUserFn: {
          afterChooseUserFn: {
            previewSourcesFn: self.workflow_confirmApply
          }
        }
      },
      Source: {
        chooseSourceFn: {
          afterChooseSourceFn: self.workflow_confirmApply
        }
      },
      Cancel: { endFn: self.workflow_end }
    }
  };

  self.workflow = {
    chooseTemplateFn: {
      afterChooseTemplateFn: self.workflow_chooseTarget,
    },
  };

  self.functionTitles = {
    chooseTemplateFn: "Choose template",
    afterChooseTemplateFn: "Template details",
    chooseProfileFn: "Choose profile",
    chooseUserFn: "Choose user",
    previewSourcesFn: "Preview sources",
    applyAssignmentsFn: "Apply template",
    handleExistingSourceActionFn: "Existing template found - choose an action",
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
          return self.myBotEngine.end();
        }

        self.params.templatesList = list;

        var choices = list.map(function (tpl) {
          return {
            id: String(tpl.id),
            label: (tpl.data_label || ("Template " + tpl.id)) + " (id=" + tpl.id + ")",
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
          return self.myBotEngine.nextStep();
        });
      });
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
          return { id: profileId, label: (p && p.name ? p.name : profileId) };
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
          return { id: userLogin, label: (user && user.login ? user.login : userLogin) };
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
          var groups = (user && user.groups) ? user.groups : [];

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

      if (scope === "source") {
        // defer to source-specific logic (may show a choice list)
        return checkExistingTemplateForSource(targetId, templateId);
      }

      UI.message(
        "Assigning template " + templateId + " to " + scope + " " + targetId,
        true
      );

      createAnnotationTemplateAssignment(
        {
          scope: scope,
          targetId: targetId,
          templateId: templateId
        },
        function (err) {
          if (err) {
            return self.myBotEngine.abort(
              err.responseText || err.message || err
            );
          }

          UI.message("Template assigned successfully", true);
          return self.myBotEngine.end();
        }
      );
    },

    /**
     * Applies the user decision when an existing template was found on a source.
     */
    handleExistingSourceActionFn: function () {
      var action = self.params.existingTemplateAction;
      var sourceLabel = self.params.pendingSourceLabel;
      var newTemplateId = self.params.pendingNewTemplateId;

      if (!action || action === "cancel") {
        UI.message("Template assignment cancelled", true);
        return self.myBotEngine.end();
      }

      if (action === "keep") {
        UI.message("Keeping existing template on source " + sourceLabel, true);
        return self.myBotEngine.end();
      }

      if (action === "replace") {
        return createAnnotationTemplateAssignment(
          { scope: "source", targetId: sourceLabel, templateId: newTemplateId },
          endApply
        );
      }

      if (action === "add") {
        // 1) Read existing template(s)
        var existingTemplateIds = [];
        if (self.params.existingTemplateIds && Array.isArray(self.params.existingTemplateIds)) {
          existingTemplateIds = self.params.existingTemplateIds;
        } else if (self.params.existingTemplateId) {
          existingTemplateIds = [self.params.existingTemplateId];
        }

        // 2) Union with newTemplateId
        var map = {};
        existingTemplateIds.forEach(function (id) {
          if (id) map[String(id)] = 1;
        });
        if (newTemplateId) map[String(newTemplateId)] = 1;

        var unionIds = Object.keys(map).map(function (x) {
          return parseInt(x, 10);
        });

        // 3) Create a new assignment containing templateIds[]
        return createAnnotationTemplateAssignment(
          { scope: "source", targetId: sourceLabel, templateIds: unionIds },
          endApply
        );
      }

      if (action === "remove") {
        // Recommended "clean" approach in your current architecture:
        // create a neutralizing assignment (latest wins) so createResource_bot sees no templateId.
        return createAnnotationTemplateAssignment(
          { scope: "source", targetId: sourceLabel, templateId: null },
          endApply
        );
      }

      // Fallback
      UI.message("Unknown action: " + action, true);
      return self.myBotEngine.end();
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
          label: sourceLabel
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
  };

  // -------------------------
  // Internal helpers (AJAX)
  // -------------------------

  function loadUserDataList(dataType, callback) {
    $.ajax({
      url: Config.apiUrl + "/users/data?data_type=" + encodeURIComponent(dataType),
      type: "GET",
      dataType: "json",
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
    var label = templateFull.data_label || ("Template " + templateId);
    var group = templateFull.data_group || "";
    var comment = templateFull.data_comment || "";

    var content = normalizeDataContent(templateFull.data_content);
    var selections = (content && content.selections) || [];
    var properties = (content && content.properties) || [];

    // Load active assignments for this template (active-only per source)
    getActiveSourcesForTemplate(templateId, function (err, activeSources) {
      if (err) {
        activeSources = [];
      }

      var html = "<div style='font-size:12px;'>";
      html += "<div><b>Template:</b> " + escapeHtml(label) + "</div>";
      html += "<div><b>ID:</b> " + templateId + "</div>";
      html += "<div><b>Group:</b> " + escapeHtml(group) + "</div>";
      html += "<div><b>Description:</b> " + escapeHtml(comment) + "</div>";

      // sharing info (if present)
      var sp = templateFull.shared_profiles || [];
      var su = templateFull.shared_users || [];
      html += "<div style='margin-top:8px;'><b>Shared profiles:</b> " + escapeHtml(sp.join(", ")) + "</div>";
      html += "<div><b>Shared users:</b> " + escapeHtml(su.join(", ")) + "</div>";

      // active assignments
      html += "<div style='margin-top:8px;'><b>Active on sources:</b> " + escapeHtml(activeSources.join(", ")) + "</div>";

      // properties
      html += "<div style='margin-top:8px;'><b>Properties:</b></div><ul>";
      if (selections.length > 0) {
        selections.forEach(function (s) {
          html += "<li>" + escapeHtml(s.vocab || "?") + ": " + escapeHtml(s.propertyLabel || s.propertyUri || "") + "</li>";
        });
      } else {
        properties.forEach(function (p) {
          html += "<li>" + escapeHtml(p) + "</li>";
        });
      }
      html += "</ul></div>";

      $("#smallDialogDiv").html(html);
      $("#smallDialogDiv").dialog({
        modal: false,
        width: 420,
        position: {
          my: "left top",
          at: "right top",
          of: "#mainDialogDiv" // dialog du bot
        }
      }).dialog("open");
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

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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
      success: function () {
        return callback(null);
      },
      error: function (err) {
        return callback(err);
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
      url:
        Config.apiUrl +
        "/users/data?data_type=" +
        encodeURIComponent(ASSIGNMENT_TYPE) +
        "&data_source=" +
        encodeURIComponent(sourceLabel),
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

      // No existing assignment -> assign directly
      if (!existingFull) {
        return createAnnotationTemplateAssignment(
          { scope: "source", targetId: sourceLabel, templateId: newTemplateId },
          endApply
        );
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
        return createAnnotationTemplateAssignment(
          { scope: "source", targetId: sourceLabel, templateId: newTemplateId },
          endApply
        );
      }

      // Store context for next step
      self.params.existingAssignmentId = existingFull.id;
      self.params.existingTemplateId = existingTemplateId;
      self.params.pendingSourceLabel = sourceLabel;
      self.params.pendingNewTemplateId = newTemplateId;

      // Load existing template label for display
      loadUserDataById(existingTemplateId, function (_err2, tpl) {
        var label = "";
        if (tpl && tpl.data_label) label = tpl.data_label;
        self.params.existingTemplateLabel = label || ("Template " + existingTemplateId);

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
   * Ends the apply workflow cleanly.
   */
  function endApply(err) {
    if (err) {
      return self.myBotEngine.abort(err.responseText || err.message || err);
    }
    UI.message("Template assigned to source successfully", true);
    self.myBotEngine.end();
  }

  return self;
})();

export default AssignAnnotationPropertiesTemplate_bot;
window.AssignAnnotationPropertiesTemplate_bot = AssignAnnotationPropertiesTemplate_bot;