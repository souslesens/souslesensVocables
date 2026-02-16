import Sparql_common from "../sparqlProxies/sparql_common.js";
import UserDataService from "./userDataService.js";

var AnnotationTemplateNodeInfoDecorator = (function () {
  var self = {};

  self.APPLIED_TYPE = "annotationPropertiesTemplateApplied";
  self.TEMPLATE_TYPE = "annotationPropertiesTemplate";

  function isClassOrIndividual(types) {
    if (!types) return false;
    return (
      types.indexOf("http://www.w3.org/2002/07/owl#Class") > -1 ||
      types.indexOf("http://www.w3.org/2002/07/owl#NamedIndividual") > -1
    );
  }

  function parseDataContent(item) {
    if (!item) return null;
    var c = item.data_content;
    if (typeof c === "string") {
      try {
        c = JSON.parse(c);
      } catch (e) {}
    }
    return c;
  }

  function injectPlaceholders(propertiesMap, propUris) {
    if (!propertiesMap || !propertiesMap.properties) return;

    propUris.forEach(function (propUri) {
      // detect by propUri already present
      var already = false;
      Object.keys(propertiesMap.properties).forEach(function (k) {
        var p = propertiesMap.properties[k];
        if (p && p.propUri === propUri) already = true;
      });
      if (already) return;

      var label = Sparql_common.getLabelFromURI(propUri);
      var key = "__tpl__" + propUri; // stable, prevents collisions

      propertiesMap.properties[key] = {
        name: label,
        propUri: propUri,
        value: [{ value: "?", isPlaceholder: true, propUri: propUri }],
      };
    });
  }

  /**
   * Decorate NodeInfosWidget.propertiesMap with template placeholders.
   * @param {string} sourceLabel
   * @param {string} nodeId
   * @param {Array<string>} types
   * @param {Object} propertiesMap
   * @param {function} callback
   */
  self.decorate = function (sourceLabel, nodeId, types, propertiesMap, callback) {
    if (!isClassOrIndividual(types)) {
      return callback();
    }

    UserDataService.listByType(self.APPLIED_TYPE, function (err, appliedItems) {
      if (err) {
        // fail silently (do not break nodeInfos)
        return callback();
      }

      var applied = (appliedItems || []).find(function (it) {
        return it && it.data_label === nodeId;
      });

      if (!applied) {
        return callback();
      }

      var appliedContent = parseDataContent(applied);
      if (!appliedContent || !appliedContent.templateIds || appliedContent.templateIds.length === 0) {
        return callback();
      }

      var templateIds = appliedContent.templateIds;
      var allPropUrisMap = {};
      var tasks = [];

      templateIds.forEach(function (tid) {
        tasks.push(function (cb) {
          UserDataService.loadById(tid, function (err2, tpl) {
            if (!err2 && tpl) {
              var tplContent = parseDataContent(tpl);
              if (tplContent && tplContent.properties && tplContent.properties.length > 0) {
                tplContent.properties.forEach(function (p) {
                  allPropUrisMap[p] = 1;
                });
              }
            }
            return cb(); // never block
          });
        });
      });

      async.series(tasks, function () {
        var propUris = Object.keys(allPropUrisMap);
        injectPlaceholders(propertiesMap, propUris);
        return callback();
      });
    });
  };

  return self;
})();

export default AnnotationTemplateNodeInfoDecorator;
window.AnnotationTemplateNodeInfoDecorator = AnnotationTemplateNodeInfoDecorator;