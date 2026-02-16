import authentication from "../shared/authentification.js";
import UserDataService from "../shared/userDataService.js";
import UserDataWidget from "../uiWidgets/userDataWidget.js";

var AnnotationTemplateAppliedService = (function () {
  var self = {};

  self.APPLIED_TYPE = "annotationPropertiesTemplateApplied";

  /**
   * Returns true if created resource is owl:Class or owl:NamedIndividual.
   * @param {Array<Object>} triples
   * @returns {boolean}
   */
  self.isConcernedResourceType = function (triples) {
    var isClass = false;
    var isInd = false;
    (triples || []).forEach(function (t) {
      if (t.predicate === "rdf:type" && t.object === "owl:Class") isClass = true;
      if (t.predicate === "rdf:type" && t.object === "owl:NamedIndividual") isInd = true;
    });
    return isClass || isInd;
  };

  /**
   * Create an "Applied" userData record for a created resource.
   * This does NOT block the resource creation flow.
   *
   * @param {string} source
   * @param {string} resourceUri
   * @param {Array<number>} templateIds
   * @param {function(Error|null)} callback
   */
  self.createApplied = function (source, resourceUri, templateIds, callback) {
    if (!templateIds || templateIds.length === 0) {
      return callback(null);
    }

    var payload = {
      data_path: "",
      data_type: self.APPLIED_TYPE,
      data_label: resourceUri,
      data_comment: "auto-applied on creation",
      data_group: source,
      data_tool: "lineage",
      data_source: source,
      data_content: {
        resourceId: resourceUri,
        source: source,
        templateIds: templateIds,
        createdBy: authentication.currentUser ? authentication.currentUser.login : "",
        createdAt: new Date().toISOString(),
      },
      is_shared: false,
      owned_by: authentication.currentUser ? authentication.currentUser.login : "",
      shared_profiles: [],
      shared_users: [],
    };

    UserDataService.create(payload, function (err) {
      // do not block anything
      if (err) {
        // eslint-disable-next-line no-console
        console.log("Applied template creation failed", err);
      }
      return callback(null);
    });
  };

  return self;
})();

export default AnnotationTemplateAppliedService;
window.AnnotationTemplateAppliedService = AnnotationTemplateAppliedService;