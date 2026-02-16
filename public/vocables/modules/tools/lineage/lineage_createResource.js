import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import OntologyModels from "../../shared/ontologyModels.js";
import Lineage_createRelation from "./lineage_createRelation.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import UserDataWidget from "../../uiWidgets/userDataWidget.js";
import AnnotationTemplateAppliedService from "../../shared/annotationTemplateAppliedService.js";
import AnnotationTemplateAssignmentService from "../../shared/annotationTemplateAssignmentService.js";

/**
 * @module Lineage_createResource
 * @description Module for creating new resources (classes, named individuals) in the ontology.
 * Provides functionality for:
 * - Creating new classes and named individuals
 * - Generating and managing RDF triples
 * - Handling resource URIs and labels
 * - Managing resource relationships and hierarchies
 * - Supporting metadata and provenance information
 * - Validating resource creation inputs
 */

var Lineage_createResource = (function () {
    var self = {};

    /**
     * Displays the dialog for adding a new node to the ontology graph.
     * Loads the HTML template and initializes necessary UI components.
     *
     * @function
     * @name showAddNodeGraphDialog
     * @memberof Lineage_createResource
     */
    self.showAddNodeGraphDialog = function () {
        self.currentResourceTriples = [];
        self.currentResourceUri = null;
        self.selectedNode = Lineage_whiteboard.currentGraphNode;
        self.currentSource = Lineage_sources.activeSource;

        $("#LineagePopup").load("modules/tools/lineage/html/createResourceDialog.html", function () {
            UI.openDialog("LineagePopup", { title: "Create resource in source " + self.currentSource });
            $("#editPredicate_mainDiv").remove();
            //AxiomEditor.init(Lineage_sources.activeSource)
            // $("#lineageCreateResource_labelInput") .trigger( "focus" );

            PredicatesSelectorWidget.load("lineageCreateResource_objectDiv", self.currentSource, {}, function () {
                $("#editPredicate_propertyDiv").css("display", "none");
                $("#editPredicate_controlsDiv").css("display", "none");

                self.onSelectResourceType("owl:Class");
                self.init();
            });
        });
    };

    /**
     * Initializes the resource creation form.
     * Resets stored triples, clears input fields, and adjusts UI visibility.
     *
     * @function
     * @name init
     * @memberof Lineage_createResource
     */
    self.init = function () {
        self.currentResourceTriples = [];
        self.currentResourceUri = null;
        $("#lineageCreateResource_triplesDiv").css("display", "none");
        $("#lineageCreateResource_mainDiv").css("display", "block");
        $("#lineageCreateResource_additionalTripleBtn").css("display", "none");
        $("#lineageCreateResource_basicTripleBtn").css("display", "block");
        $("#editPredicate_propertyDiv").css("display", "none");

        $("#editPredicate_objectValue").val("");
        $("#lineageCreateResource_labelInput").val("");
    };

    /**
     * Handles the selection of a resource type (e.g., owl:Class or owl:NamedIndividual).
     * Adjusts UI elements and predicate settings accordingly.
     *
     * @function
     * @name onSelectResourceType
     * @memberof Lineage_createResource
     * @param {string} type - The type of resource to be created (e.g., "owl:Class", "owl:NamedIndividual").
     */
    self.onSelectResourceType = function (type) {
        //  $("#editPredicate_propertyValue").val(type)
        self.currentResourceType = type;
        if (type == "owl:Class") {
            self.currentPredicate = "rdfs:subClassOf";
            $("#lineageCreateResource_predicateDiv").html("owl:subClassOf");
            PredicatesSelectorWidget.setVocabulariesSelect(self.currentSource, "_all");
            $("#editPredicate_vocabularySelect2").val(self.currentSource);
            PredicatesSelectorWidget.setCurrentVocabClassesSelect(self.currentSource);
            if (self.selectedNode) {
                $("#editPredicate_objectValue").val(self.selectedNode.id);
            }
        } else if (type == "owl:NamedIndividual") {
            self.currentPredicate = "rdf:type";
            $("#lineageCreateResource_predicateDiv").html("rdf:type");
            PredicatesSelectorWidget.setVocabulariesSelect(self.currentSource, "_curentSourceAndImports");
            $("#editPredicate_vocabularySelect2").val(self.currentSource);
            PredicatesSelectorWidget.setCurrentVocabClassesSelect(self.currentSource);
            if (self.selectedNode) {
                $("#editPredicate_objectValue").val(self.selectedNode.id);
            }
        }
    };

    /**
     * Generates RDF triples for defining a new resource in the ontology.
     * Creates metadata, type definitions, and relationships based on provided parameters.
     *
     * @function
     * @name getResourceTriples
     * @memberof Lineage_createResource
     * @param {string} source - The ontology source in which the resource is created.
     * @param {string} resourceType - The type of the resource (e.g., "owl:Class", "owl:NamedIndividual").
     * @param {string} resourceUri - The URI of the resource (if not provided, it will be generated).
     * @param {string} label - The label of the resource.
     * @param {string} superClass - The superclass of the resource, if applicable.
     * @param {string} predicate - The predicate defining the relationship of the resource.
     * @param {string} object - The object linked to the resource by the predicate.
     * @returns {Array<Object>} An array of RDF triples representing the new resource.
     */
    self.getResourceTriples = function (source, resourceType, resourceUri, label, superClass, predicate, object) {
        function getTriple(resourceUri, predicate, object) {
            var triple = {
                subject: resourceUri,
                predicate: predicate,
                object: object,
            };
            return triple;
        }

        var triples = [];

        if (!resourceUri) {
            var uriType = "fromLabel";
            if (!label) uriType = "randomHexaNumber";

            resourceUri = common.getURI(label, source, uriType);
        }

        if (!predicate) predicate = $("#lineageCreateResource_predicateDiv").html() || $("#editPredicate_propertyValue").val();
        if (!object) object = $("#editPredicate_objectValue").val();

        if (predicate) {
            // additional triple
            triples.push(getTriple(resourceUri, predicate, object));
        }

        triples.push(getTriple(resourceUri, "rdfs:label", Sparql_common.formatStringForTriple(label)));
        if (resourceType == "owl:Class") {
            triples.push(getTriple(resourceUri, "rdf:type", "owl:Class"));
            triples.push(getTriple(resourceUri, "rdfs:subClassOf", superClass));
        } else if (resourceType == "owl:NamedIndividual") {
            triples.push(getTriple(resourceUri, "rdf:type", "owl:NamedIndividual"));
            triples.push(getTriple(resourceUri, "rdf:type", superClass));
        }

        var origin = "Lineage_addNode";
        var status = "draft";
        var metaDataTriples = Lineage_createRelation.getCommonMetaDataTriples(resourceUri, origin, status, null);
        metaDataTriples.forEach(function (triple) {
            triples.push(getTriple(resourceUri, triple.predicate, triple.object));
        });
        //  $("#lineageCreateResource_basicTripleBtn").css("display", "none");
        self.basicDone = true;

        return triples;
    };

    // self.addAnnotationTriples=function(triples, callback){
    //     UserDataWidget.loadUserDatabyId  (162164, function(err, result){
    //         if(!err && result.length>0){
    //             var subject=triples[0].subject
    //             result.forEach(function(predicate){
    //                 triples.push({subject: subject,
    //                 predicate:predicate,
    //                 object:"?"})
    //             })

    //         }
    //         return callback(null,triples)
    // })

    // }

    /**
     * Retrieves the URI for the resource being created.
     * The URI is determined based on the selected type (specific or random) and the provided label or custom URI.
     *
     * @function
     * @name getResourceUri
     * @memberof Lineage_createResource
     * @returns {string} The URI of the resource being created.
     */
    self.getResourceUri = function () {
        var uriType = $("#lineageCreateResource_creatingNodeUriType").val();
        var specificUri = $("#lineageCreateResource_specificUri").val();
        var label = $("#lineageCreateResource_labelInput").val();
        if (specificUri) {
            uriType = "specific";
        }

        var uri = common.getURI(label, self.currentSource, uriType, specificUri);
        self.currentResourceUri = uri;
        return uri;
    };

    /**
     * Retrieves a list of possible named individuals from the ontology.
     * The individuals are returned as a key-value map where the key is the individual label, and the value is the URI.
     *
     * @function
     * @name getPossibleNamedIndividuals
     * @memberof Lineage_createResource
     * @param {Function} callback - The callback function to handle the result, with signature (error, individuals).
     */
    self.getPossibleNamedIndividuals = function (callback) {
        var individuals = {};
        //   return callback(null, individuals);
        Sparql_OWL.getNamedIndividuals(self.currentSource, null, null, function (err, result) {
            if (err) {
                return callback(err);
            }

            result.forEach(function (item) {
                individuals[item.subjectLabel.value] = item.subject.value;
            });
            return callback(null, individuals);
        });
    };

    /**
     * Sets the resource triples from the user interface.
     * Collects the values from the input fields and updates the current resource triples.
     *
     * @function
     * @name setResourceTriplesFromUI
     * @memberof Lineage_createResource
     */
    self.setResourceTriplesFromUI = function () {
        var label = $("#lineageCreateResource_labelInput").val();
        var predicate = $("#lineageCreateResource_predicateDiv").html() || $("#editPredicate_propertyValue").val();
        var object = $("#editPredicate_objectValue").val();

        var resourceUri = self.getResourceUri();

        var resourceType = self.currentResourceType;
        if (!resourceType) {
            return alert("no value for resourceType");
        }

        var superClass = $("#editPredicate_objectSelect").val();
        if (!superClass) {
            return alert("owl:Class is mandatory");
        }
        if (!predicate) {
            return alert("no value for predicate");
        }
        if (!object) {
            return alert("no value for object");
        }

        self.currentResourceTriples = self.getResourceTriples(self.currentSource, resourceType, resourceUri, label, superClass, predicate, object);
        self.showResourceTriples();
        $("#lineageCreateResource_additionalTripleBtn").css("display", "block");
    };

    /**
     * Displays the resource triples in the UI for review.
     * The triples are shown with a remove button for each triple.
     *
     * @function
     * @name showResourceTriples
     * @memberof Lineage_createResource
     * @returns {void}
     */
    self.showResourceTriples = function () {
        var num = 0;
        var html = "<b>" + self.currentResourceUri + "</b>";
        self.currentResourceTriples.forEach(function (triple) {
            html +=
                "<div id='triple_" +
                num +
                "' class='blendCreateNode_triplesDiv' >" +
                "&nbsp;&nbsp;<b>" +
                triple.predicate +
                " </b>&nbsp;&nbsp;   " +
                triple.object +
                "&nbsp;<button  style='font-size: 8px;' onclick='Lineage_createResource.removeTriple(" +
                num +
                ")'>X</button></div>";
            num++;
        });
        //  $("#lineageCreateResource_mainDiv").css("display", "none");
        $("#lineageCreateResource_triplesDiv").css("display", "block");
        $("#lineageCreateResource_newResourceTiplesDiv").html(html);
    };

    /**
     * Writes the resource from the UI to the backend by calling the writeResource function.
     * Displays a success message and adds the resource to the whiteboard once created.
     *
     * @function
     * @name writeResourceFromUI
     * @memberof Lineage_createResource
     */
    self.writeResourceFromUI = function () {
        self.writeResource(self.currentSource, self.currentResourceTriples, function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            UI.message("resource Created");
            var nodeData = {
                id: self.currentResourceUri,
                data: {
                    id: self.currentResourceUri,
                    source: self.currentSource,
                },
            };
            Lineage_whiteboard.drawNodesAndParents(nodeData, 2);
            $("#LineagePopup").dialog("close");
        });
    };

    /**
     * Writes the resource (defined by its triples) to the backend and indexes it.
     * If the URI already exists, the user is notified to choose a new one.
     *
     * @param {string} source
     * @param {Array<Object>} triples
     * @param {Function} callback
     */
    self.writeResource = function (source, triples, callback) {
        if (!triples || triples.length === 0) {
            return callback({ responseText: "no predicates for node" });
        }

        var createdResourceUri = triples[0].subject;

        Sparql_OWL.getNodeInfos(source, createdResourceUri, {}, function (err, existing) {
            if (err) {
            return callback(err);
            }
            if (existing && existing.length > 0) {
            $("#lineageCreateResource_creatingNodeUriType").val();
            return callback({ responseText: "this uri already exists, choose a new one" });
            }

            // Determine created resourceType from triples
            var createdResourceType = null;
            (triples || []).forEach(function (t) {
            if (
                t.predicate === "rdf:type" &&
                (t.object === "owl:Class" || t.object === "owl:NamedIndividual")
            ) {
                createdResourceType = t.object;
            }
            });

            // Add annotation template triples BEFORE inserting (single insert)
            self.addAnnotationTemplateTriplesOnCreation(
            source,
            createdResourceUri,
            createdResourceType,
            triples,
            function (_errTpl, tplResult) {
                // do not block on template errors
                var templateIds = (tplResult && tplResult.templateIds) ? tplResult.templateIds : [];
                var finalTriples = (tplResult && tplResult.triples) ? tplResult.triples : triples;

                Sparql_generic.insertTriples(source, finalTriples, {}, function (errInsert, _result) {
                if (errInsert) {
                    return callback(errInsert.responseText || errInsert);
                }

                // Optional "Applied marker"
                if (AnnotationTemplateAppliedService.isConcernedResourceType(finalTriples)) {
                    AnnotationTemplateAppliedService.createApplied(source, createdResourceUri, templateIds, function () {});
                }

                SearchUtil.generateElasticIndex(source, { ids: [createdResourceUri] }, function (errIndex) {
                    if (errIndex) {
                    return callback(errIndex);
                    }
                    UI.message("node Created and Indexed");
                });

                // Update ontology model cache
                var createdModelData = {};
                finalTriples.forEach(function (item) {
                    if (item.predicate === "rdfs:label") {
                    createdModelData.label = item.object;
                    createdModelData.id = item.subject;
                    }
                    if (item.predicate === "rdfs:subClassOf") {
                    createdModelData.superClass = item.object;
                    createdModelData.superClassLabel = Sparql_common.getLabelFromURI(item.object);
                    }
                });

                var modelPayload = {
                    classes: { [createdModelData.id]: createdModelData },
                };

                OntologyModels.updateModel(source, modelPayload, {}, function (errModel) {
                    if (callback) return callback(errModel, createdResourceUri);
                    return console.log(errModel || "ontologyModelCache updated");
                });
                });
            }
            );
        });
    };

    /**
     * Closes the resource creation dialog.
     *
     * @function
     * @name closeDialog
     * @memberof Lineage_createResource
     */
    self.closeDialog = function () {
        $("#LineagePopup").dialog("close");
    };

    /**
     * Removes a specific triple from the list of resource triples.
     * The triple is removed both from the data structure and the UI.
     *
     * @function
     * @name removeTriple
     * @memberof Lineage_createResource
     * @param {number} index - The index of the triple to remove.
     */
    self.removeTriple = function (index) {
        self.currentResourceTriples.splice(index, 1);
        $("#triple_" + index).remove();
    };

    /**
     * Handles the selection of the URI type (specific or random) for the resource.
     * Shows or hides the specific URI input field based on the selected type.
     *
     * @function
     * @name onselectNodeUriType
     * @memberof Lineage_createResource
     * @param {string} uriType - The selected URI type ("specific" or other).
     */
    self.onselectNodeUriType = function (uriType) {
        var display = uriType == "specific" ? "block" : "none";
        $("#lineageCreateResource_specificUri").css("display", display);
    };

    /**
     * Displays the form for adding a new predicate to the resource.
     * Resets the relevant input fields and UI elements to allow predicate creation.
     *
     * @function
     * @name addNewPredicate
     * @memberof Lineage_createResource
     */
    self.addNewPredicate = function () {
        $("#editPredicate_propertyDiv").css("display", "block");
        $("#editPredicate_controlsDiv").css("display", "block");
        $("#editPredicate_savePredicateButton").css("display", "none");

        $("#editPredicate_objectSelect").val("");
        $("#editPredicate_objectInput").val("");
        $("#lineageCreateResource_predicateDiv").html("");
    };

    self.drawNodeAxioms = function () {};

    /**
     * Starts the resource creation bot, which automates the creation of resources.
     * This function initiates the bot with the current source as a parameter.
     * @function
     * @name startCreateRessourceBot
     * @memberof Lineage_createResource
     */
    self.startCreateRessourceBot = function () {
        // reset precendent values to not add triples to another resource
        $("#editPredicate_objectValue").val("");
        $("#editPredicate_propertyValue").val("");
        CreateResource_bot.start(null, { source: Lineage_sources.activeSource });
    };

    /**
     * Helper function to create a triple object with subject, predicate and object.
     *
     * @function
     * @name getTriple
     * @param {string} resourceUri - The URI of the resource (subject)
     * @param {string} predicate - The predicate of the triple
     * @param {string} object - The object of the triple
     * @returns {Object} Triple object with subject, predicate and object properties
     */
    function getTriple(resourceUri, predicate, object) {
        var triple = {
            subject: resourceUri,
            predicate: predicate,
            object: object,
        };
        return triple;
    }

    self.createSubClass = function (source, label, superClassUri) {
        if (!label || !superClassUri) {
            return alert("missing parameters");
        }
        // verify if node is owl:Class
        Sparql_OWL.getNodeInfos(source, superClassUri, null, function (err, result) {
            if (err) {
                return MainController.errorAlert(err);
            }
            if (result.length == 0) {
                return alert("node is not a class");
            }
            var classTypeTriple = result.filter(function (item) {
                if (item.prop.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" && item.value.value == "http://www.w3.org/2002/07/owl#Class") {
                    return item;
                }
            });
            if (classTypeTriple.length == 0) {
                return alert("node is not a class");
            }
            var triples = Lineage_createResource.getResourceTriples(source, "owl:Class", null, label, superClassUri);
            Lineage_createResource.writeResource(source, triples, function (err, resourceId) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                UI.message("subClass created");
                var nodeData = {
                    id: resourceId,
                    data: {
                        id: resourceId,
                        source: source,
                    },
                };
                Lineage_whiteboard.drawNodesAndParents(nodeData, 2, { legendType: "individualClasses" });
            });
        });
    };

        /**
     * Load template userData records and extract annotation property URIs.
     * Expected template content structure (data_content):
     * {
     *   properties: [ "http://...", ... ],
     *   selections: [ { propertyUri: "...", ... }, ... ]
     * }
     *
     * @param {Array<number>} templateIds
     * @param {function(Error|null, Array<string>)} callback
     */
    self.getAnnotationPredicatesFromTemplateIds = function (templateIds, callback) {
        if (!templateIds || templateIds.length === 0) {
            return callback(null, []);
        }

        var propertyUriSet = {};

        async.eachSeries(
            templateIds,
            function (templateId, eachCb) {
            UserDataWidget.loadUserDatabyId(templateId, function (err, userDataItems) {
                if (err || !userDataItems || userDataItems.length === 0) {
                return eachCb(); // ignore template load errors (do not block creation)
                }

                var templateRecord = userDataItems[0];
                var templateContent = templateRecord.data_content;

                if (typeof templateContent === "string") {
                try {
                    templateContent = JSON.parse(templateContent);
                } catch (e) {}
                }

                var propertyUris = [];
                if (templateContent) {
                if (Array.isArray(templateContent.properties)) {
                    propertyUris = templateContent.properties;
                } else if (Array.isArray(templateContent.selections)) {
                    propertyUris = templateContent.selections
                    .map(function (s) { return s.propertyUri; })
                    .filter(Boolean);
                }
                }

                propertyUris.forEach(function (uri) {
                if (uri) propertyUriSet[uri] = 1;
                });

                return eachCb();
            });
            },
            function () {
            return callback(null, Object.keys(propertyUriSet));
            }
        );
    };

    /**
     * Add annotation template triples to the resource creation triples.
     * Note: RDF cannot store "empty" values; a placeholder literal is inserted.
     *
     * @param {string} source
     * @param {string} resourceUri
     * @param {string} resourceType - "owl:Class" or "owl:NamedIndividual"
     * @param {Array<Object>} triples
     * @param {function(Error|null, {triples:Array<Object>, templateIds:Array<number>})} callback
     */
    self.addAnnotationTemplateTriplesOnCreation = function (source, resourceUri, resourceType, triples, callback) {
        AnnotationTemplateAssignmentService.getAssignedTemplateIdsForCreation(
            { source: source, resourceType: resourceType },
            function (errAssign, templateIds) {
            // do not block creation flow
            templateIds = templateIds || [];

            if (templateIds.length === 0) {
                return callback(null, { triples: triples, templateIds: [] });
            }

            self.getAnnotationPredicatesFromTemplateIds(templateIds, function (err, predicates) {
                // ignore errors (do not block)
                predicates = predicates || [];

                // Avoid duplicates: if predicate already present in triples, skip it
                var existing = {};
                (triples || []).forEach(function (t) {
                existing[t.predicate] = 1;
                });

                predicates.forEach(function (p) {
                if (!p || existing[p]) {
                    return;
                }
                existing[p] = 1;

                // Placeholder choice:
                // - "?" to make it visible in NodeInfos
                // - or empty string: Sparql_common.formatStringForTriple("")
                triples.push({
                    subject: resourceUri,
                    predicate: p,
                    object: Sparql_common.formatStringForTriple("__TO_FILL__"),
                });
                });

                return callback(null, { triples: triples, templateIds: templateIds });
            });
            }
        );
    };

    return self;
})();

export default Lineage_createResource;
window.Lineage_createResource = Lineage_createResource;
