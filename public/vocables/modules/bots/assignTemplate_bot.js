import BotEngineClass from "./_botEngineClass.js";

/**
 * @module AssignTemplate_bot
 * Assigns an annotationPropertiesTemplate to:
 * - a profile (applies to profile accessible sources)
 * - a user (applies to union of profile sources from user.groups)
 *
 * This bot creates one assignment per source:
 * data_type = annotationPropertiesTemplateAssignment
 */
var AssignTemplate_bot = (function () {
  var self = {};
  self.myBotEngine = new BotEngineClass();
  self.title = "Assign template";

  var TEMPLATE_TYPE = "annotationPropertiesTemplate";
  var ASSIGNMENT_TYPE = "annotationPropertiesTemplateAssignment";
  var PLACEHOLDER_VALUE = "__TO__FILL__";

  self.start = function (workflow, _params, callback) {
    var startParams = self.myBotEngine.fillStartParams(arguments);
    self.callback = callback;

    if (!workflow) {
      workflow = self.workflow;
    }

    self.myBotEngine.init(AssignTemplate_bot, workflow, null, function () {
      self.myBotEngine.startParams = startParams;

      self.params = {
        // selected values
        selectedScope: "",
        selectedTemplateId: null,
        selectedProfileId: "",
        selectedUserId: "",

        // loaded caches
        templatesList: [],
        profilesMap: null, // { profileId: profileObject }
        usersMap: null, // { userId: userObject }

        // computed
        previewSources: [],
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
      Apply: { applyAssignmentsFn: self.workflow_end },
      Cancel: { endFn: self.workflow_end },
    },
  };

  self.workflow_chooseTarget = {
    _OR: {
      Profile: { chooseProfileFn: { afterChooseProfileFn: { previewSourcesFn: self.workflow_confirmApply } } },
      User: { chooseUserFn: { afterChooseUserFn: { previewSourcesFn: self.workflow_confirmApply } } },
      Cancel: { endFn: self.workflow_end },
    },
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
      var sources = self.params.previewSources || [];

      if (!templateId) {
        return self.myBotEngine.abort("Missing templateId");
      }
      if (!sources || sources.length === 0) {
        UI.message("No sources to apply", true);
        return self.myBotEngine.end();
      }

      UI.message("Applying template " + templateId + " to " + sources.length + " sources...", true);

      async.eachSeries(
        sources,
        function (sourceLabel, cbEach) {
          var assignmentContent = {
            templateId: templateId,
            source: sourceLabel,
            placeholderValue: PLACEHOLDER_VALUE,
            appliedAt: new Date().toISOString(),
          };

          var payload = {
            data_path: "",
            data_type: ASSIGNMENT_TYPE,
            data_label: "Template " + templateId + " for " + sourceLabel,
            data_comment: "Assigned from AssignTemplate_bot",
            data_group: sourceLabel,
            data_tool: "admin",
            data_source: sourceLabel,
            data_content: assignmentContent,
            is_shared: false,
            shared_profiles: [],
            shared_users: [],
          };

          $.ajax({
            url: Config.apiUrl + "/users/data",
            type: "POST",
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(payload),
            success: function () {
              return cbEach();
            },
            error: function (err) {
              return cbEach(err);
            },
          });
        },
        function (err) {
          if (err) {
            return self.myBotEngine.abort(err.responseText || err.message || err);
          }
          UI.message("Done: template applied to all sources", true);
          return self.myBotEngine.end();
        },
      );
    },

    /**
     * Ends bot cleanly.
     */
    endFn: function () {
      if (self.callback) self.callback(null);
      return self.myBotEngine.end();
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
      $("#smallDialogDiv").dialog("open");
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

  // -------------------------
  // Internal helpers (logic)
  // -------------------------

  /**
   * Computes accessible sources for a profile using:
   * - allowedSourceSchemas (required)
   * - sourcesAccessControl (optional; when provided, missing keys are treated as forbidden)
   *
   * This follows the same spirit as Admin.getUserAllowedSources (schemaType + draft filtering). [1](https://jemsprod-my.sharepoint.com/personal/cbekhouche_jems-group_com/Documents/Fichiers%20Microsoft%20Copilot%20Chat/shareUserData_bot.js)
   */
  function computeAccessibleSourcesForProfile(profile) {
    if (!profile) return [];

    var allowedSchemas = profile.allowedSourceSchemas || [];
    var sourcesAccessControl = profile.sourcesAccessControl || null;
    var hasAccessControlRules = sourcesAccessControl && Object.keys(sourcesAccessControl).length > 0;

    var out = [];

    Object.keys(Config.sources)
      .sort()
      .forEach(function (sourceLabel) {
        var src = Config.sources[sourceLabel];
        if (!src) return;

        // Ignore drafts
        if (src.isDraft) return;

        // Must match schema type
        var schemaType = src.schemaType;
        if (allowedSchemas.length > 0 && allowedSchemas.indexOf(schemaType) < 0) {
          return;
        }

        // Access control by schemaType/group path (optional)
        if (hasAccessControlRules) {
          var groupPath = src.group || "";
          var accessKeyCandidates = buildAccessKeyCandidates(schemaType, groupPath);

          var decision = null;
          accessKeyCandidates.forEach(function (k) {
            if (decision) return;
            if (sourcesAccessControl[k]) decision = sourcesAccessControl[k];
          });

          // If rules exist and no match -> forbidden by default
          if (!decision) {
            return;
          }
          if (decision === "forbidden") {
            return;
          }
          // decision "read" or "readwrite" => allowed
        }

        out.push(sourceLabel);
      });

    return out;
  }

  function buildAccessKeyCandidates(schemaType, groupPath) {
    // Try most specific first: schemaType/groupPath, then progressively shorten, then schemaType
    var candidates = [];
    if (groupPath) {
      var parts = groupPath.split("/");
      while (parts.length > 0) {
        candidates.push(schemaType + "/" + parts.join("/"));
        parts.pop();
      }
    }
    candidates.push(schemaType);
    return candidates;
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

  return self;
})();

export default AssignTemplate_bot;
window.AssignTemplate_bot = AssignTemplate_bot;