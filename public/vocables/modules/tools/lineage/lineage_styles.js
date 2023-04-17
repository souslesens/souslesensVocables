import common from "./../../common.js"
import Sparql_OWL from "./../../sparqlProxies/sparql_OWL.js"
import Sparql_generic from "./../../sparqlProxies/sparql_generic.js"
import Lineage_blend from "./lineage_blend.js"



var Lineage_styles = (function () {
    var self = {};

    self.stylesSourceLabel = "SLSV_STYLES";
    self.init = function () {
        if (!self.isInitialized) {
            self.isInitialized = true;
            Config.sources[self.stylesSourceLabel] = {
                graphUri: Config.styles_graphUri,
                sparql_server: { url: Config.default_sparql_url },
                controller: Sparql_OWL,
            };
        }
    };

    self.showDialog = function (objectData) {
        self.currentClientObjectData = objectData;
        self.init();
        $("#mainDialogDiv").dialog("open");
        $("#mainDialogDiv").load("snippets/lineage/lineage_styles.html", function () {
            self.listStyles();

            var colors = common.paletteIntense;
            var array = [];
            colors.forEach(function (color) {
                array.push();
            });
            common.fillSelectOptions("lineage_styles_colorSelect", colors, true);

            $("#lineage_styles_colorSelect option").each(function () {
                $(this).css("background-color", $(this).val());
            });

            var shapes = ["ellipse", " circle", " database", " box", " text", "diamond", " dot", " star", " triangle", " triangleDown", " hexagon", " square"];
            common.fillSelectOptions("lineage_styles_shapeSelect", shapes, true);
        });
    };

    self.listStyles = function (styleIds, callback) {
        Sparql_OWL.getAllTriples(self.stylesSourceLabel, null, styleIds, { source: self.stylesSourceLabel }, function (err, result) {
            if (err) {
                if (callback) return callback(err);
                return alert(err);
            }
            var objsMap = {};
            var labels = [];
            result.forEach(function (item) {
                if (!objsMap[item.subject.value]) objsMap[item.subject.value] = {};
                if (item.predicate.value == "http://www.w3.org/2000/01/rdf-schema#label") {
                    objsMap[item.subject.value].label = item.object.value;
                    labels.push({ id: item.subject.value, label: item.object.value });
                } else if (item.predicate.value == "http://souslesens.org/resource/styles/shape") objsMap[item.subject.value].shape = item.object.value;
                else if (item.predicate.value == "http://souslesens.org/resource/styles/size") objsMap[item.subject.value].size = item.object.value;
                else if (item.predicate.value == "http://souslesens.org/resource/styles/color") objsMap[item.subject.value].color = item.object.value;
                else if (item.predicate.value == "http://souslesens.org/resource/styles/icon") objsMap[item.subject.value].icon = item.object.value;
            });

            if (callback) return callback(null, objsMap);
            self.sylesMap = objsMap;
            common.fillSelectOptions("lineage_styles_listSelect", labels, true, "label", "id");
        });
    };
    self.newStyle = function () {
        self.currentSyleUri = null;
        $("#lineage_styles_labelInput").val(self.currentClientObjectData ? self.currentClientObjectData.label : "");
        $("#lineage_styles_shapeSelect").val("");
        $("#lineage_styles_colorSelect").val("");
        $("#lineage_styles_sizeInput").val("");
        $("#lineage_styles_iconInput").val("");
    };

    self.displayStyle = function (styleUri) {
        if (!styleUri) self.currentSyleUri = $("#lineage_styles_listSelect").val();
        else self.currentSyleUri = styleUri;
        var styleObj = self.sylesMap[self.currentSyleUri];

        $("#lineage_styles_labelInput").val(styleObj.label);
        $("#lineage_styles_shapeSelect").val(styleObj.shape);
        $("#lineage_styles_colorSelect").val(styleObj.color);
        $("#lineage_styles_sizeInput").val(styleObj.size);
        $("#lineage_styles_iconInput").val(styleObj.icon);
    };
    self.saveStyle = function () {
        var label = $("#lineage_styles_labelInput").val();
        var shape = $("#lineage_styles_shapeSelect").val();
        var color = $("#lineage_styles_colorSelect").val();
        var size = $("#lineage_styles_sizeInput").val();
        var icon = $("#lineage_styles_iconInput").val();

        if (!label) return alert("Enter a label for this style");

        var triples = [];
        var graphUri = Config.styles_graphUri;

        subjectUri = self.currentSyleUri;
        var isNew = true;
        if (!self.currentSyleUri) {
            subjectUri = graphUri + common.getRandomHexaId(10);
        }

        triples.push({
            subject: subjectUri,
            predicate: "http://www.w3.org/2000/01/rdf-schema#label",
            object: label,
        });

        if (shape) {
            triples.push({
                subject: subjectUri,
                predicate: "http://souslesens.org/resource/styles/shape",
                object: shape,
            });
        }
        if (color) {
            triples.push({
                subject: subjectUri,
                predicate: "http://souslesens.org/resource/styles/color",
                object: color,
            });
        }
        if (size) {
            triples.push({
                subject: subjectUri,
                predicate: "http://souslesens.org/resource/styles/size",
                object: size,
            });
        }

        if (icon) {
            triples.push({
                subject: subjectUri,
                predicate: "http://souslesens.org/resource/styles/icon",
                object: icon,
            });
        }
        triples = triples.concat(Lineage_blend.getCommonMetaDataTriples(subjectUri));
        Sparql_generic.insertTriples(self.stylesSourceLabel, triples, {}, function (err, result) {
            if (err) return alert(err);
            MainController.UI.message("style saved", true);
        });
    };
    self.linkStyle = function () {
        if (!self.currentClientObjectData) return alert("no client object");
        if (!self.currentSyleUri) return alert("no stylle selected");

        triples = [];
        triples.push({
            subject: self.currentClientObjectData.id,
            predicate: "http://souslesens.org/resource/styles/hasStyle",
            object: self.currentSyleUri,
        });

        Sparql_generic.insertTriples(self.currentClientObjectData.source, triples, {}, function (err, result) {
            if (err) return alert(err);
            $("#mainDialogDiv").dialog("close");
            MainController.UI.message("style associated", true);
        });
    };

    return self;
})();



export default Lineage_styles
