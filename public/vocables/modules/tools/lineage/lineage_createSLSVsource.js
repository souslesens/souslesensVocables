import common from "../../shared/common.js";
import Authentification from "../../shared/authentification.js";
import CreateSLSVsource_bot from "../../bots/createSLSVsource_bot.js";
import UI from "../../shared/UI.js";

/**
 * @module Lineage_createSLSVsource
 * @description Module for creating new SLSV (Sous Le Sens Vocables) sources in the system.
 * Provides functionality for:
 * - Creating and configuring new ontology sources
 * - Managing source metadata and configuration
 * - Handling source imports and dependencies
 * - Managing user permissions and ownership
 * - Supporting source validation and persistence
 * - Integrating with the SLSV bot system
 */

var Lineage_createSLSVsource = (function () {
    var self = {};

    /**
     * Initializes the source creation module and starts the corresponding bot.
     * @function
     * @name onLoaded
     * @memberof Lineage_createSLSVsource
     * @returns {void}
     */
    self.onLoaded = function () {
        self.checkSourceCreationRights(function (err, refusalMessage) {
            if (err) {
                return MainController.errorAlert(err);
            }
            if (refusalMessage) {
                $("#botPanel").html("<div style='padding: 15px; max-width: 400px;'>" + refusalMessage + "</div>");
                return UI.openDialog("botPanel", { title: CreateSLSVsource_bot.title });
            }
            CreateSLSVsource_bot.start();
        });
    };

    /**
     * Checks the source creation rights before the bot starts, so the user is not
     * refused by the API only after having filled every step of the workflow.
     * Both conditions are enforced again server side in POST /api/v1/sources.
     * @function
     * @name checkSourceCreationRights
     * @memberof Lineage_createSLSVsource
     * @param {Function} callback - called with (err, refusalMessage), refusalMessage null when the user may create a source.
     * @returns {void}
     */
    self.checkSourceCreationRights = function (callback) {
        var currentUser = Authentification.currentUser;
        var userGroups = currentUser.groupes || [];
        if (currentUser.login === "admin" || userGroups.indexOf("admin") > -1) {
            return callback(null, null);
        }

        if (!currentUser.allowSourceCreation) {
            return callback(null, "Your profile does not allow creating sources.");
        }

        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/sources?ownedOnly=true`,
            dataType: "json",
            success: function (data) {
                var ownedSourcesCount = Object.keys(data.resources || {}).length;
                var maxNumberCreatedSource = currentUser.maxNumberCreatedSource;
                if (typeof maxNumberCreatedSource === "number" && ownedSourcesCount >= maxNumberCreatedSource) {
                    return callback(
                        null,
                        "You already own " +
                            ownedSourcesCount +
                            " sources, your profile allows " +
                            maxNumberCreatedSource +
                            ". Delete one in UserSettings &gt; Sources, using the trash icon, to create a new one.",
                    );
                }
                callback(null, null);
            },
            error: function (err) {
                callback(err);
            },
        });
    };

    // mirrors mainapp/src/Source.ts, the ConfigEditor form refuses a name this regex rejects
    self.sourceNameRegex = /^[A-Za-z0-9][A-Za-z0-9_-]{1,254}$/;

    /**
     * Applies to a source name the rules the ConfigEditor form applies: the name becomes the
     * ElasticSearch index name once lowercased, so it must be a legal index name and stay unique
     * after that lowercasing.
     * @function
     * @name validateSourceName
     * @memberof Lineage_createSLSVsource
     * @param {string} sourceName - the name a user entered
     * @returns {string|null} the message to show, null when the name is acceptable
     */
    self.validateSourceName = function (sourceName) {
        if (!sourceName) {
            return "enter source name";
        }
        if (!self.sourceNameRegex.test(sourceName)) {
            return "Name must contain 2 to 255 alphanum, - or _ chars, and start with an alphanum char";
        }
        var indexName = sourceName.toLowerCase();
        if (indexName === "admin") {
            return "Name can't be admin";
        }
        var existingIndexNames = Object.keys(Config.sources).map(function (existingSourceName) {
            return existingSourceName.toLowerCase();
        });
        if (existingIndexNames.indexOf(indexName) > -1) {
            return "This name is already used by another source once lowercased";
        }
        return null;
    };

    /**
     * Applies to a graphUri the rule the ConfigEditor form applies, whose zod url() validator is
     * the URL constructor.
     * https://zod.dev/api?id=urls
     * @function
     * @name validateGraphUri
     * @memberof Lineage_createSLSVsource
     * @param {string} graphUri - the URI a user entered
     * @returns {string|null} the message to show, null when the URI is acceptable
     */
    self.validateGraphUri = function (graphUri) {
        if (!graphUri) {
            return "enter source graphUri";
        }
        try {
            new URL(graphUri);
        } catch {
            return "graphUri is not a correct URL";
        }
        return null;
    };

    /**
     * Creates a new source with the specified parameters.
     * Validates input values and writes the source metadata.
     * @function
     * @name createSource
     * @memberof Lineage_createSLSVsource
     * @param {string} sourceName - The name of the source to be created.
     * @param {string} graphUri - The URI of the source graph.
     * @param {Array<string>} imports - An array of URIs to be imported into the source.
     * @param {Function} callback - A callback function executed after the source creation.
     * @returns {void}
     */
    self.createSource = function (sourceName, graphUri, imports, callback) {
        var user = Authentification.currentUser.login;
        var sourceNameError = self.validateSourceName(sourceName);
        if (sourceNameError) {
            return callback(sourceNameError);
        }
        var graphUriError = self.validateGraphUri(graphUri);
        if (graphUriError) {
            return callback(graphUriError);
        }
        var userPrivateProfile = "PRIVATE/" + user;
        var sourceConfig = {};

        async.series(
            [
                //write source
                function (callbackSeries) {
                    self.writeSource(sourceName, graphUri, imports, userPrivateProfile, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        sourceConfig = result?.resources;
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
                    return MainController.errorAlert(err);
                }
                callback(err, sourceConfig);
            },
        );
    };

    /**
     * Writes the source configuration to the server.
     * Constructs a source object and sends it via an AJAX request.
     * @function
     * @name writeSource
     * @memberof Lineage_createSLSVsource
     * @param {string} sourceName - The name of the source.
     * @param {string} graphUri - The URI of the source graph.
     * @param {Array<string>} imports - An array of URIs to be imported.
     * @param {string} userPrivateProfile - The private profile identifier of the user.
     * @param {Function} callback - A callback function executed after writing the source.
     * @returns {void}
     */
    self.writeSource = function (sourceName, graphUri, imports, userPrivateProfile, callback) {
        var prefix = common.getRandomString(5);
        var baseUri = graphUri.endsWith("/") ? graphUri : graphUri + "/";
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
            // Empty means "use the default top-class query computed by Sparql_OWL.getTopConcepts
            // from the source taxonomyPredicates".
            topClassFilter: "",
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
            prefix: prefix,
            baseUri: baseUri,
        };

        var payload = {
            [sourceName]: sourceObject,
        };

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/sources`,
            contentType: "application/json",
            data: JSON.stringify(payload),
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
