import MainController from "../../shared/mainController.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import AssignAnnotationPropertiesTemplate_bot
from "../../bots/assignAnnotationPropertiesTemplate_bot.js";


/**
 * @module adminAnnotationPropertiesTemplate
 * Admin UI for managing annotation templates assignments.
 *
 * Key rules:
 * - GET /users/data (list) does NOT include data_content => always use GET /users/data/{id} for details.
 * - Active assignment for a source is the newest one (highest assignmentId).
 */
var AdminAnnotationPropertiesTemplate = (function () {
  var self = {};

  var ASSIGNMENT_TYPE = "annotationPropertiesTemplateAssignment";
  var TEMPLATE_TYPE = "annotationPropertiesTemplate";
  // var PLACEHOLDER_VALUE = "__TO__FILL__";

  /**
   * Opens the assignments manager dialog.
   * Default behavior: show only active assignment per source (no history).
   */
  self.openAssignmentsManager = function () {
    var selectedSources = SourceSelectorWidget.getCheckedSources(); // can be empty
    var showHistory = false; // default: active only

    self.loadAssignments(selectedSources, function (err, assignmentRows) {
      if (err) {
        console.error(err);
        return MainController.errorAlert(err.responseText || err.message || err);
      }

      var rowsToDisplay = showHistory ? assignmentRows : keepOnlyActiveAssignments(assignmentRows);

      self.renderAssignmentsTable(rowsToDisplay, {
        selectedSources: selectedSources,
        showHistory: showHistory,
      });
    });
  };

  /**
   * Loads assignments list + enriches each with:
   * - assignment.data_content (via GET by id)
   * - template label + template content (properties/selections) via GET by id
   * @param {string[]} selectedSources Optional filter
   * @param {function} callback error-first callback(err, rows)
   */
  self.loadAssignments = function (selectedSources, callback) {
    fetchUserDataList({ data_type: ASSIGNMENT_TYPE }, function (err, assignmentsList) {
      if (err) {
        return callback(err);
      }

      if (selectedSources && selectedSources.length > 0) {
        assignmentsList = assignmentsList.filter(function (item) {
          return item && item.data_source && selectedSources.indexOf(item.data_source) >= 0;
        });
      }

      enrichAssignments(assignmentsList, function (err2, enrichedRows) {
        if (err2) {
          return callback(err2);
        }

        markActiveAssignmentPerTarget(enrichedRows);
        return callback(null, enrichedRows);
      });
    });
  };

  /**
   * Renders assignment rows in main dialog.
   * @param {Array} rows
   * @param {object} options
   */
  self.renderAssignmentsTable = function (rows, options) {
    var title = "Annotation properties template assignments";
    if (options && options.selectedSources && options.selectedSources.length > 0) {
      title += " (filtered)";
    }

    var html = "";
    html += "<div style='margin-bottom:8px;'>";
    html +=
      "<button class='btn btn-sm btn-outline-primary' onclick='AdminAnnotationPropertiesTemplate.openAssignmentsManager()'>Refresh</button>";    
    html +=
        "<button class='btn btn-sm btn-outline-success' onclick='AssignAnnotationPropertiesTemplate_bot.start()'>Assign template...</button>";
    html += "</div>";

    html += "<table class='table table-bordered table-sm' style='font-size:12px;'>";
    html += "<thead><tr>";
    html += "<th>Target</th>";
    html += "<th>Assignment ID</th>";
    html += "<th>Templates</th>";
    html += "<th>Properties</th>";
    html += "<th>Actions</th>";
    html += "</tr></thead><tbody>";

    self.rowsIndexByAssignmentId = {};
    rows.forEach(function (r) {
      if (r && r.assignmentId) self.rowsIndexByAssignmentId[String(r.assignmentId)] = r;
    });

    rows.forEach(function (row) {
      var propertiesCount = row.propertiesCount || 0;

      html += "<tr>";
      html += "<td>" + safeText(row.scope) + " : " + safeText(row.targetId) + "</td>";
      html += "<td>" + safeText(row.assignmentId) + "</td>";
      var templatesText = "";
      if (row.templateIds && row.templateIds.length > 0) {
        templatesText = row.templateIds
          .map(function (tplId, idx) {
            var lbl = row.templateLabels && row.templateLabels[idx] ? row.templateLabels[idx] : ("Template " + tplId);
            return lbl + " (id=" + tplId + ")";
          })
          .join(", ");
      }
      html += "<td>" + safeText(templatesText) + "</td>";
      html += "<td>" + propertiesCount + "</td>";
      html += "<td>";

      html +=
        "<button ... onclick='AdminAnnotationPropertiesTemplate.viewRowTemplates(" + JSON.stringify(row.assignmentId) + ")'>View</button>";

      html +=
        "<button class='btn btn-sm btn-outline-danger' onclick='AdminAnnotationPropertiesTemplate.deleteAssignment(" +
        JSON.stringify(row.assignmentId) +
        ")'>Delete</button>";

      html += "</td>";
      html += "</tr>";
    });

    html += "</tbody></table>";

    $("#mainDialogDiv").html(html);
    $("#mainDialogDiv").dialog("open");
    UI.setDialogTitle("#mainDialogDiv", title);
  };

  /**
   * Shows template details (vocab: label) in small dialog.
   * @param {number|string} templateId
   */
  self.viewTemplateDetails = function (templateId) {
    var templateIdNumber = parseInt(templateId, 10);
    if (!templateIdNumber) {
      return openSmallDialog("Template properties", "<div>Invalid template id.</div>");
    }

    fetchUserDataById(templateIdNumber, function (err, templateItem) {
      if (err) {
        console.error(err);
        return MainController.errorAlert(err.responseText || err.message || err);
      }

      var templateContent = normalizeDataContent(templateItem.data_content);
      var selections = (templateContent && templateContent.selections) || [];
      var properties = (templateContent && templateContent.properties) || [];

      var html = "<div style='font-size:12px;'>";
      html += "<div><b>Name:</b> " + safeText(templateItem.data_label) + "</div>";
      html += "<div><b>Group:</b> " + safeText(templateItem.data_group) + "</div>";
      html += "<div><b>Description:</b> " + safeText(templateItem.data_comment) + "</div>";
      html += "<div style='margin-top:8px;'><b>Properties:</b></div>";
      html += "<ul>";

      if (selections.length > 0) {
        selections.forEach(function (s) {
          html += "<li>" + safeText(s.vocab) + ": " + safeText(s.propertyLabel || s.propertyUri) + "</li>";
        });
      } else {
        properties.forEach(function (p) {
          html += "<li>" + safeText(p) + "</li>";
        });
      }

      html += "</ul></div>";

      openSmallDialog("Template properties (id=" + templateId + ")", html);
    });
  };

  /**
   * View templates linked to a row.
   * - If one template: open details directly
   * - If multiple: show a small list to pick which template to open
   */
  self.viewRowTemplates = function (assignmentId) {
    var row = self.rowsIndexByAssignmentId ? self.rowsIndexByAssignmentId[String(assignmentId)] : null;
    if (!row) {
      return openSmallDialog("Templates", "<div>No row found.</div>");
    }

    if (!row.templateIds || row.templateIds.length === 0) {
      return openSmallDialog("Templates", "<div>No template on this assignment.</div>");
    }

    if (row.templateIds.length === 1) {
      var singleId = parseInt(row.templateIds[0], 10);
      if (!singleId) {
        return openSmallDialog("Templates", "<div>Invalid template id in row.</div>");
      }
      return self.viewTemplateDetails(singleId);
    }

    var html = "<div style='font-size:12px;'><div><b>Templates (" + row.templateIds.length + ")</b></div><ul>";
    row.templateIds.forEach(function (tplId, idx) {
      var tplIdNumber = parseInt(tplId, 10);
      if (!tplIdNumber) return;

      var label = (row.templateLabels && row.templateLabels[idx]) ? row.templateLabels[idx] : ("Template " + tplIdNumber);
      html += "<li>" + safeText(label) +
        " (id=" + safeText(tplIdNumber) + ") " +
        "<button class='btn btn-sm btn-outline-secondary' onclick='AdminAnnotationPropertiesTemplate.viewTemplateDetails(" + JSON.stringify(tplIdNumber) + ")'>View</button>" +
        "</li>";
    });
    html += "</ul></div>";

    return openSmallDialog("Templates", html);
  };

  /**
   * Deletes an assignment by id using DELETE /users/data/{id}.
   * @param {number} assignmentId
   */
  self.deleteAssignment = function (assignmentId) {
    if (!assignmentId) {
      return;
    }

    var yes = confirm("Delete assignment id=" + assignmentId + " ?");
    if (!yes) {
      return;
    }

    $.ajax({
      url: Config.apiUrl + "/users/data/" + assignmentId,
      type: "DELETE",
      success: function () {
        UI.message("Deleted assignment " + assignmentId, true);
        self.openAssignmentsManager();
      },
      error: function (err) {
        console.error(err);
        return MainController.errorAlert(err.responseText || err.message || err);
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function fetchUserDataList(queryParams, callback) {
    var url = Config.apiUrl + "/users/data";
    if (queryParams && queryParams.data_type) {
      url += "?data_type=" + encodeURIComponent(queryParams.data_type);
    }

    $.ajax({
      url: url,
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

  function fetchUserDataById(id, callback) {
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

  function enrichAssignments(assignmentsList, callback) {
    var rows = [];

    async.eachSeries(
      assignmentsList,
      function (assignmentListItem, cbEach) {
        if (!assignmentListItem || !assignmentListItem.id) {
          return cbEach();
        }

        // 1) GET assignment by id to access data_content
        fetchUserDataById(assignmentListItem.id, function (err, assignmentFull) {
          if (err) {
            return cbEach(err);
          }

          var assignmentContent = normalizeDataContent(assignmentFull.data_content);
          // Support both single-template and multi-template assignments
          var templateIdsArray = [];
          if (assignmentContent && Array.isArray(assignmentContent.templateIds) && assignmentContent.templateIds.length > 0) {
            templateIdsArray = assignmentContent.templateIds;
          } else if (assignmentContent && assignmentContent.templateId) {
            templateIdsArray = [assignmentContent.templateId];
          }
          // Normalize template ids to integers to avoid invalid /users/data/{id} calls
          templateIdsArray = (templateIdsArray || [])
            .map(function (x) { return parseInt(x, 10); })
            .filter(function (x) { return !!x; });


          if (!templateIdsArray || templateIdsArray.length === 0) {
            rows.push(buildRowFromAssignment(assignmentListItem, assignmentContent, []));
            return cbEach();
          }

          var templatesInfoArray = [];
          async.eachSeries(
            templateIdsArray,
            function (templateId, cbTemplate) {
              fetchUserDataById(templateId, function (errTpl, templateFull) {
                if (errTpl || !templateFull) {
                  // Keep row usable even if one template cannot be loaded
                  templatesInfoArray.push({
                    id: templateId,
                    label: "Template " + templateId,
                    properties: [],
                    selections: [],
                  });
                  return cbTemplate();
                }

                var templateContent = normalizeDataContent(templateFull.data_content);
                templatesInfoArray.push({
                  id: templateId,
                  label: templateFull.data_label || ("Template " + templateId),
                  properties: (templateContent && templateContent.properties) || [],
                  selections: (templateContent && templateContent.selections) || [],
                });
                return cbTemplate();
              });
            },
            function () {
              rows.push(buildRowFromAssignment(assignmentListItem, assignmentContent, templatesInfoArray));
              return cbEach();
            }
          );
        });
      },
      function (err) {
        return callback(err || null, rows);
      },
    );
  }

  /**
   * Builds a UI row from an assignment item + its parsed content + loaded templates.
   * This supports:
   * - scope: source / user / profile
   * - targetId: source label / user login / profile id
   * - one or multiple templates
   */
  function buildRowFromAssignment(assignmentListItem, assignmentContent, templatesInfoArray) {
    var scope = "source";
    if (assignmentContent && typeof assignmentContent.scope === "string") {
      scope = assignmentContent.scope;
    }

    // Prefer explicit targetId from data_content (produced by the assign bot)
    var targetId = (assignmentContent && assignmentContent.targetId)
      ? assignmentContent.targetId
      : (assignmentListItem.data_source || "");

    // Aggregate templates
    var templateIds = (templatesInfoArray || []).map(function (t) { return t.id; });
    var templateLabels = (templatesInfoArray || []).map(function (t) { return t.label; });

    // Count unique properties across templates (simple union)
    var uniquePropertiesMap = {};
    (templatesInfoArray || []).forEach(function (t) {
      (t.properties || []).forEach(function (p) {
        if (p) uniquePropertiesMap[p] = 1;
      });
    });

    return {
      assignmentId: assignmentListItem.id,
      scope: scope,
      targetId: targetId,
      isActive: false,

      templateIds: templateIds,
      templateLabels: templateLabels,
      propertiesCount: Object.keys(uniquePropertiesMap).length,

      // Keep full template info for "View" actions
      templatesInfoArray: templatesInfoArray || [],
    };
  }

  /**
   * Marks active assignments using the "latest wins" rule.
   * Active = highest assignmentId per (scope + targetId).
   */
  function markActiveAssignmentPerTarget(rows) {
    var maxAssignmentIdByTargetKey = {}; // key = "<scope>|<targetId>"

    (rows || []).forEach(function (row) {
      if (!row || !row.scope || !row.targetId) return;
      var targetKey = row.scope + "|" + row.targetId;
      if (!maxAssignmentIdByTargetKey[targetKey] || row.assignmentId > maxAssignmentIdByTargetKey[targetKey]) {
        maxAssignmentIdByTargetKey[targetKey] = row.assignmentId;
      }
    });

    (rows || []).forEach(function (row) {
      var targetKey = row.scope + "|" + row.targetId;
      row.isActive = maxAssignmentIdByTargetKey[targetKey] === row.assignmentId;
    });
  }

  function keepOnlyActiveAssignments(rows) {
    return (rows || []).filter(function (r) {
      return r && r.isActive;
    });
  }

  function getPropertiesCount(row) {
    if (row && row.selections && row.selections.length > 0) {
      return row.selections.length;
    }
    if (row && row.properties) {
      return row.properties.length;
    }
    return 0;
  }

  function normalizeDataContent(dataContent) {
    if (!dataContent) return null;

    // Some endpoints return stringified JSON, some return object
    if (typeof dataContent === "string") {
      try {
        return JSON.parse(dataContent);
      } catch (e) {
        return null;
      }
    }
    return dataContent;
  }

  function openSmallDialog(title, html) {
    $("#smallDialogDiv").html(html);
    $("#smallDialogDiv").dialog("open");
    UI.setDialogTitle("#smallDialogDiv", title);
  }

  function safeText(value) {
    if (value === null || value === undefined) return "";
    return String(value);
  }
  return self;
})();

export default AdminAnnotationPropertiesTemplate;
window.AdminAnnotationPropertiesTemplate = AdminAnnotationPropertiesTemplate;