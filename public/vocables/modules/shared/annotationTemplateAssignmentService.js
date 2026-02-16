import authentication from "../shared/authentification.js";
import UserDataService from "../shared/userDataService.js";
import UserDataWidget from "../uiWidgets/userDataWidget.js";


/**
 * @module AnnotationTemplateAssignmentService
 * @description Resolve annotation properties templates assigned to a context (source/group/user)
 * for new resource creations (Option 1: not retroactive).
 */
var AnnotationTemplateAssignmentService = (function () {
  var self = {};

  self.ASSIGNMENT_TYPE = "annotationPropertiesTemplateAssignment";

  /**
   * Parse data_content that might be stored as stringified JSON.
   * @param {Object} item
   * @returns {Object|null}
   */
  function parseDataContent(item) {
    if (!item) return null;
    var c = item.data_content;
    if (typeof c === "string") {
      try {
        c = JSON.parse(c);
      } catch (e) {
        // keep as-is
      }
    }
    return c;
  }

  /**
   * Return true if assignment matches current context.
   * Empty scope fields are treated as "no constraint".
   * @param {Object} content
   * @param {Object} ctx
   * @returns {boolean}
   */
  function matchAssignment(content, ctx) {
    if (!content || !content.scope) return false;
    var s = content.scope;

    // source constraint
    if (s.source && ctx.source && s.source !== ctx.source) return false;

    // user constraint
    if (s.user && ctx.user && s.user !== ctx.user) return false;

    // group constraint
    if (s.group) {
      var groups = ctx.groups || [];
      if (groups.indexOf(s.group) < 0) return false;
    }

    // resourceTypes constraint (optional)
    if (content.resourceTypes && content.resourceTypes.length > 0 && ctx.resourceType) {
      if (content.resourceTypes.indexOf(ctx.resourceType) < 0) return false;
    }

    return true;
  }

    /**
     * Get templateIds assigned for a new creation context.
     * Union of assignments that match source and/or group and/or user (dedup).
     *
     * @param {Object} params
     * @param {string} params.source - sourceLabel (e.g. "testChakib")
     * @param {string} params.resourceType - "owl:Class" or "owl:NamedIndividual"
     * @param {function(Error|null, Array<number>) } callback
     */
    self.getAssignedTemplateIdsForCreation = function (params, callback) {
        params = params || {};
        var ctx = {
            source: params.source,
            resourceType: params.resourceType,
            user: authentication.currentUser ? authentication.currentUser.login : "",
            groups: authentication.currentUser ? authentication.currentUser.groupes || [] : [],
        };

        UserDataService.listByType(self.ASSIGNMENT_TYPE, function (err, items) {
            if (err) {
            // do not block creation flow
            return callback(null, []);
            }

            var templateIdMap = {};

            async.eachSeries(
            items || [],
            function (lightItem, eachCb) {
                // IMPORTANT: listByType may not return data_content.
                // Reload full item by id to get data_content reliably.
                UserDataWidget.loadUserDatabyId(lightItem.id, function (err2, fullItems) {
                if (err2 || !fullItems || fullItems.length === 0) {
                    return eachCb();
                }

                var fullItem = fullItems[0];
                var content = parseDataContent(fullItem); // already handles JSON string vs object

                if (content && matchAssignment(content, ctx)) {
                    var tid = content.templateId;
                    if (typeof tid === "string") tid = parseInt(tid, 10);
                    if (tid) templateIdMap[tid] = 1;
                }

                return eachCb();
                });
            },
            function () {
                return callback(
                null,
                Object.keys(templateIdMap).map(function (k) {
                    return parseInt(k, 10);
                })
                );
            }
            );
        });
    };

  return self;
})();
export default AnnotationTemplateAssignmentService;
window.AnnotationTemplateAssignmentService = AnnotationTemplateAssignmentService;