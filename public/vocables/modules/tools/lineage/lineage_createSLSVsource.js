import common from "../../shared/common.js";
import Authentification from "../../shared/authentification.js";
import CreateSLSVsource_bot from "../../bots/createSLSVsource_bot.js";

var Lineage_createSLSVsource = (function () {
    var self = {};
    self.onLoaded = function () {
        CreateSLSVsource_bot.start();
    };

    self.createSource = function (sourceName, graphUri, imports, callback) {
        var user = Authentification.currentUser.login;
        if (!sourceName) {
            return "enter source name";
        }
        if (!graphUri) {
            return "enter source graphUri";
        }
        var userPrivateProfile = "PRIVATE/" + user;

        async.series(
            [
                //write source
                function (callbackSeries) {
                    self.writeSource(sourceName, graphUri, imports, userPrivateProfile, function (err, result) {
                        return callbackSeries(err);
                    });
                },
                // load probably need to be after in a separate step or it will erase callback
                //load private source in lineage
                /*
                function (callbackSeries) {
                    var url = window.location.href;
                    var p = url.indexOf("?");
                    if (p > -1) {
                        url = url.substring(0, p);
                    }
                    url += "?tool=lineage&source=" + sourceName;
                    window.location.href = url;
                },
                */
            ],
            function (err) {
                if (err) {
                    if (callback) callback(err);
                    return alert(err.responseText);
                }
                callback();
            },
        );
    };

    self.writeSource = function (sourceName, graphUri, imports, userPrivateProfile, callback) {
        var sourceObject = {
            id: common.getRandomHexaId(12),
            name: sourceName,
            _type: "source",
            sparql_server: {
                url: "_default",
                method: "POST",
                headers: {},
            },
            controller: "Sparql_OWL",
            topClassFilter: "?topConcept rdf:type owl:Class .",
            schemaType: "OWL",
            dataSource: {
                type: "",
                connection: "_default",
                dbName: "",
                table_schema: "",
                local_dictionary: {
                    table: "",
                    idColumn: "",
                    labelColumn: "",
                },
            },
            editable: true,
            color: "",
            isDraft: false,
            allowIndividuals: false,
            predicates: {
                broaderPredicate: "",
                lang: "",
            },
            group: userPrivateProfile,
            imports: imports,
            taxonomyPredicates: ["rdfs:subClassOf"],
            graphUri: graphUri,
            owner: Authentification.currentUser.login,
            published: false,
        };

        var payload = {
            [sourceName]: sourceObject,
        };

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/sources`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    return self;
})();
export default Lineage_createSLSVsource;
window.Lineage_createSLSVsource = Lineage_createSLSVsource;
