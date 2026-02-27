import authentication from "../../shared/authentification.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import UserDataWidget from "../../uiWidgets/userDataWidget.js";

/**
 * @module AnnotationPropertiesTemplateAssignmentsResolver
 *
 * Resolves which annotation properties templates should be applied when creating a resource.
 *
 * Union rule:
 * - Source active assignment templates (data_source = current source)
 * - User active assignment templates (shared_users contains current login)
 * - Each profile/group active assignment templates (shared_profiles contains each user group)
 *
 * Important:
 * - /users/data list endpoint does not include data_content => reload by id is required.
 */
var AnnotationPropertiesTemplateAssignmentsResolver = (function () {
    var self = {};

    var USER_DATA_ASSIGNMENT_TYPE = "annotationPropertiesTemplateAssignment";

    // -----------------------------
    // Mini memory cache (TTL-based)
    // -----------------------------
    var cacheTimeToLiveMilliseconds = 30 * 1000; // 30 seconds

    var cachedAssignmentsList = null;
    var cachedAssignmentsListTimestampMilliseconds = 0;

    // Cache by id: { "<id>": { assignmentFullObject, timestampMilliseconds } }
    var cachedAssignmentByIdMap = {};

    // Optional debug logs (disabled by default)
    var debugLoggingEnabled = false;

    /**
     * Enables or disables debug console logs.
     * @param {boolean} enabled
     */
    self.setDebugLoggingEnabled = function (enabled) {
        debugLoggingEnabled = !!enabled;
    };

    /**
     * Clears all in-memory caches (useful after changing assignments).
     */
    self.clearCache = function () {
        cachedAssignmentsList = null;
        cachedAssignmentsListTimestampMilliseconds = 0;
        cachedAssignmentByIdMap = {};
    };

    /**
     * Resolves the final union of templateIds for a given source and current user context.
     * @param {string} currentSourceLabel
     * @param {function} callback (err, resolvedTemplateIdsArray)
     */
    self.resolveTemplateIdsForCurrentContext = function (currentSourceLabel, callback) {
        if (!currentSourceLabel) {
            return callback(null, []);
        }

        var currentUserLogin = authentication.currentUser && authentication.currentUser.login ? authentication.currentUser.login : null;

        var currentUserGroups =
            authentication.currentUser && (authentication.currentUser.groups || authentication.currentUser.groupes) ? authentication.currentUser.groups || authentication.currentUser.groupes : [];

        if (!Array.isArray(currentUserGroups)) {
            currentUserGroups = [currentUserGroups];
        }

        loadAssignmentsListWithCache(function (err, assignmentsList) {
            if (err) return callback(err);

            var activeAssignmentIdsForContext = computeActiveAssignmentIdsForContext(assignmentsList, currentSourceLabel, currentUserLogin, currentUserGroups);

            if (debugLoggingEnabled) {
                // eslint-disable-next-line no-console
                console.log("[TemplateResolver] activeAssignmentIdsForContext=", activeAssignmentIdsForContext);
            }

            if (!activeAssignmentIdsForContext || activeAssignmentIdsForContext.length === 0) {
                return callback(null, []);
            }

            var resolvedTemplateIdsMap = {}; // { "<templateId>": 1 }

            async.eachSeries(
                activeAssignmentIdsForContext,
                function (activeAssignmentId, callbackEach) {
                    loadAssignmentByIdWithCache(activeAssignmentId, function (err2, assignmentFull) {
                        if (err2 || !assignmentFull) {
                            // Resilient behavior: skip a failing assignment
                            return callbackEach();
                        }

                        var assignmentDataContentObject = normalizeDataContentToObject(assignmentFull.data_content);
                        var templateIdsFromThisAssignment = extractTemplateIdsFromAssignmentContent(assignmentDataContentObject);

                        templateIdsFromThisAssignment.forEach(function (templateId) {
                            resolvedTemplateIdsMap[String(templateId)] = 1;
                        });

                        return callbackEach();
                    });
                },
                function () {
                    var resolvedTemplateIdsArray = Object.keys(resolvedTemplateIdsMap)
                        .map(function (templateIdString) {
                            return parseInt(templateIdString, 10);
                        })
                        .filter(function (templateIdNumber) {
                            return !!templateIdNumber;
                        });

                    resolvedTemplateIdsArray.sort(function (a, b) {
                        return a - b;
                    });

                    if (debugLoggingEnabled) {
                        // eslint-disable-next-line no-console
                        console.log("[TemplateResolver] resolvedTemplateIdsArray=", resolvedTemplateIdsArray);
                    }

                    return callback(null, resolvedTemplateIdsArray);
                },
            );
        });
    };

    /**
     * Applies template placeholders ("?") on a newly created resource.
     * It inserts one triple per property defined in the template(s) resolved for the current context.
     *
     * @param {string} sourceLabel
     * @param {string} resourceUri
     * @param {function} callback error-first callback
     */
    self.applyTemplatePlaceholdersToResource = function (sourceLabel, resourceUri, callback) {
        if (!sourceLabel || !resourceUri) {
            return callback(null);
        }

        self.resolveTemplateIdsForCurrentContext(sourceLabel, function (err, resolvedTemplateIdsArray) {
            if (err || !resolvedTemplateIdsArray || resolvedTemplateIdsArray.length === 0) {
                // Do not block resource creation if resolver fails
                return callback(null);
            }

            var uniquePropertiesMap = {};
            var unionPropertiesArray = [];

            async.eachSeries(
                resolvedTemplateIdsArray,
                function (templateId, callbackEach) {
                    UserDataWidget.loadUserDatabyId(templateId, function (err2, templateResult) {
                        if (err2) return callbackEach(err2);

                        var templateItem = Array.isArray(templateResult) ? templateResult[0] : templateResult;
                        if (!templateItem || !templateItem.data_content) return callbackEach();

                        var templateDataContentObject = templateItem.data_content;
                        if (typeof templateDataContentObject === "string") {
                            try {
                                templateDataContentObject = JSON.parse(templateDataContentObject);
                            } catch (e) {
                                return callbackEach(e);
                            }
                        }

                        var templatePropertiesArray = templateDataContentObject.properties || [];
                        templatePropertiesArray.forEach(function (predicateUri) {
                            if (!predicateUri) return;
                            if (!uniquePropertiesMap[predicateUri]) {
                                uniquePropertiesMap[predicateUri] = 1;
                                unionPropertiesArray.push(predicateUri);
                            }
                        });

                        return callbackEach();
                    });
                },
                function (errLoad) {
                    if (errLoad || unionPropertiesArray.length === 0) {
                        // Do not block resource creation
                        return callback(null);
                    }

                    var placeholderLiteralValue = "?";
                    var triplesToInsertArray = unionPropertiesArray.map(function (predicateUri) {
                        return {
                            subject: resourceUri,
                            predicate: predicateUri,
                            object: placeholderLiteralValue,
                        };
                    });

                    Sparql_generic.insertTriples(sourceLabel, triplesToInsertArray, null, function (err3) {
                        return callback(err3 || null);
                    });
                },
            );
        });
    };

    // -----------------------------------------
    // Active assignment selection (per scope)
    // -----------------------------------------

    /**
     * Computes active assignment ids for:
     * - source: highest id where data_source == currentSourceLabel
     * - user: highest id where shared_users contains currentUserLogin
     * - each group: highest id where shared_profiles contains group
     *
     * @param {Array} assignmentsList
     * @param {string} currentSourceLabel
     * @param {string|null} currentUserLogin
     * @param {Array<string>} currentUserGroups
     * @returns {Array<number>}
     */
    function computeActiveAssignmentIdsForContext(assignmentsList, currentSourceLabel, currentUserLogin, currentUserGroups) {
        var activeSourceAssignmentId = null;
        var activeUserAssignmentId = null;

        // Active assignment id per group: { "<group>": id }
        var activeAssignmentIdByGroupMap = {};

        (assignmentsList || []).forEach(function (assignmentListItem) {
            if (!assignmentListItem || !assignmentListItem.id) return;

            var assignmentId = assignmentListItem.id;

            // 1) Source-level assignment
            if (assignmentListItem.data_source && assignmentListItem.data_source === currentSourceLabel) {
                if (!activeSourceAssignmentId || assignmentId > activeSourceAssignmentId) {
                    activeSourceAssignmentId = assignmentId;
                }
            }

            // 2) User-level assignment
            if (currentUserLogin && Array.isArray(assignmentListItem.shared_users) && assignmentListItem.shared_users.indexOf(currentUserLogin) > -1) {
                if (!activeUserAssignmentId || assignmentId > activeUserAssignmentId) {
                    activeUserAssignmentId = assignmentId;
                }
            }

            // 3) Profile/group-level assignment (one active per group)
            if (Array.isArray(currentUserGroups) && currentUserGroups.length > 0 && Array.isArray(assignmentListItem.shared_profiles) && assignmentListItem.shared_profiles.length > 0) {
                currentUserGroups.forEach(function (groupName) {
                    if (assignmentListItem.shared_profiles.indexOf(groupName) > -1) {
                        if (!activeAssignmentIdByGroupMap[groupName] || assignmentId > activeAssignmentIdByGroupMap[groupName]) {
                            activeAssignmentIdByGroupMap[groupName] = assignmentId;
                        }
                    }
                });
            }
        });

        // Unique ids union
        var uniqueActiveAssignmentIdsMap = {};

        if (activeSourceAssignmentId) uniqueActiveAssignmentIdsMap[String(activeSourceAssignmentId)] = 1;
        if (activeUserAssignmentId) uniqueActiveAssignmentIdsMap[String(activeUserAssignmentId)] = 1;

        Object.keys(activeAssignmentIdByGroupMap).forEach(function (groupName) {
            uniqueActiveAssignmentIdsMap[String(activeAssignmentIdByGroupMap[groupName])] = 1;
        });

        return Object.keys(uniqueActiveAssignmentIdsMap).map(function (assignmentIdString) {
            return parseInt(assignmentIdString, 10);
        });
    }

    // -----------------------------------------
    // Extract templateIds from assignment content
    // -----------------------------------------

    /**
     * Extracts template ids from assignment content supporting:
     * - templateIds: [..]
     * - templateId: number|string
     *
     * @param {object|null} assignmentDataContentObject
     * @returns {Array<number>}
     */
    function extractTemplateIdsFromAssignmentContent(assignmentDataContentObject) {
        if (!assignmentDataContentObject) return [];

        var extractedTemplateIdsArray = [];

        if (Array.isArray(assignmentDataContentObject.templateIds) && assignmentDataContentObject.templateIds.length > 0) {
            assignmentDataContentObject.templateIds.forEach(function (templateIdValue) {
                var templateIdNumber = parseInt(templateIdValue, 10);
                if (templateIdNumber) extractedTemplateIdsArray.push(templateIdNumber);
            });
            return extractedTemplateIdsArray;
        }

        if (assignmentDataContentObject.templateId !== null && typeof assignmentDataContentObject.templateId !== "undefined") {
            var singleTemplateIdNumber = parseInt(assignmentDataContentObject.templateId, 10);
            if (singleTemplateIdNumber) extractedTemplateIdsArray.push(singleTemplateIdNumber);
        }

        return extractedTemplateIdsArray;
    }

    function normalizeDataContentToObject(dataContent) {
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

    // -----------------------------------------
    // API calls with TTL cache
    // -----------------------------------------

    function loadAssignmentsListWithCache(callback) {
        var nowMilliseconds = Date.now();

        var isCacheValid = cachedAssignmentsList && nowMilliseconds - cachedAssignmentsListTimestampMilliseconds < cacheTimeToLiveMilliseconds;

        if (isCacheValid) {
            return callback(null, cachedAssignmentsList);
        }

        $.ajax({
            url: Config.apiUrl + "/users/data?data_type=" + encodeURIComponent(USER_DATA_ASSIGNMENT_TYPE),
            type: "GET",
            dataType: "json",
            success: function (data) {
                cachedAssignmentsList = data || [];
                cachedAssignmentsListTimestampMilliseconds = nowMilliseconds;
                return callback(null, cachedAssignmentsList);
            },
            error: function (err) {
                return callback(err);
            },
        });
    }

    function loadAssignmentByIdWithCache(assignmentId, callback) {
        var nowMilliseconds = Date.now();
        var assignmentIdKey = String(assignmentId);

        var cachedEntry = cachedAssignmentByIdMap[assignmentIdKey];
        var isCachedEntryValid = cachedEntry && nowMilliseconds - cachedEntry.timestampMilliseconds < cacheTimeToLiveMilliseconds;

        if (isCachedEntryValid) {
            return callback(null, cachedEntry.assignmentFullObject);
        }

        $.ajax({
            url: Config.apiUrl + "/users/data/" + assignmentId,
            type: "GET",
            dataType: "json",
            success: function (data) {
                cachedAssignmentByIdMap[assignmentIdKey] = {
                    assignmentFullObject: data,
                    timestampMilliseconds: nowMilliseconds,
                };
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    }

    return self;
})();

export default AnnotationPropertiesTemplateAssignmentsResolver;
window.AnnotationPropertiesTemplateAssignmentsResolver = AnnotationPropertiesTemplateAssignmentsResolver;
