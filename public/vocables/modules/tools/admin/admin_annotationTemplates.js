import MainController from "../../shared/mainController.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";

/**
 * @module AdminAnnotationTemplates
 * Admin UI for managing annotation templates assignments.
 *
 * Key rules:
 * - GET /users/data (list) does NOT include data_content => always use GET /users/data/{id} for details.
 * - Active assignment for a source is the newest one (highest assignmentId).
 */
var AdminAnnotationTemplates = (function () {
  var self = {};

  var ASSIGNMENT_TYPE = "annotationPropertiesTemplateAssignment";
  var TEMPLATE_TYPE = "annotationPropertiesTemplate";
  var PLACEHOLDER_VALUE = "__TO__FILL__";

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

      // Optional client-side filtering by source
      if (selectedSources && selectedSources.length > 0) {
        assignmentsList = assignmentsList.filter(function (item) {
          return item && item.data_source && selectedSources.indexOf(item.data_source) >= 0;
        });
      }

      enrichAssignments(assignmentsList, function (err2, enrichedRows) {
        if (err2) {
          return callback(err2);
        }

        markActiveAssignmentPerSource(enrichedRows);
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
    var title = "Annotation template assignments";
    if (options && options.selectedSources && options.selectedSources.length > 0) {
      title += " (filtered)";
    }

    var html = "";
    html += "<div style='margin-bottom:8px;'>";
    html +=
      "<button class='btn btn-sm btn-outline-primary' onclick='AdminAnnotationTemplates.openAssignmentsManager()'>Refresh</button>";    
    html +=
        "<button class='btn btn-sm btn-outline-success' onclick='AssignTemplate_bot.start()'>Assign template...</button>";
    html += "</div>";

    html += "<table class='table table-bordered table-sm' style='font-size:12px;'>";
    html += "<thead><tr>";
    html += "<th>Source</th>";
    html += "<th>Assignment ID</th>";
    html += "<th>Active</th>";
    html += "<th>Template</th>";
    html += "<th>Properties</th>";
    html += "<th>Actions</th>";
    html += "</tr></thead><tbody>";

    rows.forEach(function (row) {
      var propertiesCount = getPropertiesCount(row);
      var activeLabel = row.isActive ? "YES" : "";

      html += "<tr>";
      html += "<td>" + safeText(row.source) + "</td>";
      html += "<td>" + safeText(row.assignmentId) + "</td>";
      html += "<td style='font-weight:bold;'>" + activeLabel + "</td>";
      html += "<td>" + safeText(row.templateLabel) + " (id=" + safeText(row.templateId) + ")</td>";
      html += "<td>" + propertiesCount + "</td>";
      html += "<td>";

      html +=
        "<button class='btn btn-sm btn-outline-secondary' onclick='AdminAnnotationTemplates.viewTemplateDetails(" +
        JSON.stringify(row.templateId) +
        ")'>View</button> ";

      html +=
        "<button class='btn btn-sm btn-outline-primary' onclick='AdminAnnotationTemplates.promptChangeTemplate(" +
        JSON.stringify(row.source) +
        ")'>Change</button> ";

      html +=
        "<button class='btn btn-sm btn-outline-danger' onclick='AdminAnnotationTemplates.deleteAssignment(" +
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
    if (!templateId) {
      return openSmallDialog("Template properties", "<div>No template selected.</div>");
    }

    fetchUserDataById(templateId, function (err, templateItem) {
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
   * Prompts user for a templateId and creates a new assignment for the given source.
   * Newest assignment becomes active automatically.
   * @param {string} sourceLabel
   */
  self.promptChangeTemplate = function (sourceLabel) {
    var templateIdStr = prompt("Enter templateId to assign to source: " + sourceLabel, "");
    if (!templateIdStr) {
      return;
    }

    var templateId = parseInt(templateIdStr, 10);
    if (!templateId) {
      return alert("Invalid templateId");
    }

    createAssignment(sourceLabel, templateId, function (err) {
      if (err) {
        console.error(err);
        return MainController.errorAlert(err.responseText || err.message || err);
      }
      UI.message("Template changed for source " + sourceLabel, true);
      self.openAssignmentsManager();
    });
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
          var templateId = assignmentContent && assignmentContent.templateId ? assignmentContent.templateId : null;

          // 2) GET template by id to show label + properties
          if (!templateId) {
            rows.push(buildRow(assignmentListItem, null, null, [], []));
            return cbEach();
          }

          fetchUserDataById(templateId, function (err2, templateFull) {
            if (err2) {
              // Still keep the row without template details
              rows.push(buildRow(assignmentListItem, templateId, "Template " + templateId, [], []));
              return cbEach();
            }

            var templateContent = normalizeDataContent(templateFull.data_content);
            var selections = (templateContent && templateContent.selections) || [];
            var properties = (templateContent && templateContent.properties) || [];

            rows.push(buildRow(assignmentListItem, templateId, templateFull.data_label || ("Template " + templateId), properties, selections));
            return cbEach();
          });
        });
      },
      function (err) {
        return callback(err || null, rows);
      },
    );
  }

  function buildRow(assignmentListItem, templateId, templateLabel, properties, selections) {
    return {
      assignmentId: assignmentListItem.id,
      source: assignmentListItem.data_source,
      templateId: templateId,
      templateLabel: templateLabel || "",
      properties: properties || [],
      selections: selections || [],
      isActive: false,
    };
  }

  function markActiveAssignmentPerSource(rows) {
    var maxIdBySource = {};

    rows.forEach(function (r) {
      if (!r || !r.source) return;
      if (!maxIdBySource[r.source] || r.assignmentId > maxIdBySource[r.source]) {
        maxIdBySource[r.source] = r.assignmentId;
      }
    });

    rows.forEach(function (r2) {
      r2.isActive = maxIdBySource[r2.source] === r2.assignmentId;
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

  function createAssignment(sourceLabel, templateId, callback) {
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
      data_comment: "Manual change from Admin UI",
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
        return callback(null);
      },
      error: function (err) {
        return callback(err);
      },
    });
  }

  return self;
})();

export default AdminAnnotationTemplates;
window.AdminAnnotationTemplates = AdminAnnotationTemplates;