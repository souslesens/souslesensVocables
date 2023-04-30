import common from "../shared/common.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";

var PromptedSelectWidget = (function () {
    var self = {};
    self.prompt = function (type, selectId, source) {
        if (Config.selectListsCache[type]) {
            return common.fillSelectOptions(selectId, Config.selectListsCache[type], true, "label", "id");
        }

        var term = prompt(" filter values ...");
        if (term === null) {
            return;
        }
        var options = {
            selectGraph: true,
            lang: Config.default_lang,
            type: type,
            filter: term ? " FILTER ( regex(?label,'" + term + "','i'))" : "",
            limit: Config.maxSelectListSize,
            withoutImports: true,
        };
        if (!source) {
            source = Lineage_sources.activeSource || KGcreator.currentSlsvSource;
        }
        Sparql_OWL.getDictionary(source, options, null, function (err, result) {
            if (err) {
                alert(err.responseText);
            }

            if (result.length >= Config.maxSelectListSize) {
                if (confirm(" too many values; list truncated to  " + Config.maxSelectListSize + " values") === null) {
                    return;
                }
            }

            var objs = [];
            result.forEach(function (item) {
                objs.push({
                    id: item.id.value,
                    label: item.label ? item.label.value : Sparql_common.getLabelFromURI(item.id.value),
                });
            });
            objs.sort(function (a, b) {
                if (a.label > b.label) {
                    return 1;
                }
                if (a.label < b.label) {
                    return -1;
                }
                return 0;
            });
            if (result.length <= Config.minSelectListSize) {
                Config.selectListsCache[type] = objs;
            }

            common.fillSelectOptions(selectId, objs, true, "label", "id");
        });
    };

    return self;
})();

export default PromptedSelectWidget;
window.PromptedSelectWidget = PromptedSelectWidget;
