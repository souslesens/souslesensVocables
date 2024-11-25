import common from "../../shared/common.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Lineage_whiteboard from "./lineage_whiteboard.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import OntologyModels from "../../shared/ontologyModels.js";
import Lineage_createRelation from "./lineage_createRelation.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";

var Lineage_createResource = (function () {
    var self = {};

    self.showAddNodeGraphDialog = function () {
        self.currentResourceTriples = [];
        self.currentResourceUri = null;
        self.selectedNode = Lineage_whiteboard.currentGraphNode;
        self.currentSource = Lineage_sources.activeSource;

        $("#LineagePopup").dialog("option", "title", "Create resource in source " + self.currentSource);

        $("#LineagePopup").load("modules/tools/lineage/html/createResourceDialog.html", function () {
            $("#LineagePopup").dialog("open");
            $("#editPredicate_mainDiv").remove();
            //AxiomEditor.init(Lineage_sources.activeSource)
            // $("#lineageCreateResource_labelInput").focus();

            PredicatesSelectorWidget.load("lineageCreateResource_objectDiv", self.currentSource, {}, function () {
                $("#editPredicate_propertyDiv").css("display", "none");
                $("#editPredicate_controlsDiv").css("display", "none");

                self.onSelectResourceType("owl:Class");
                self.init();
            });
        });
    };
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

    self.writeResourceFromUI = function () {
        self.writeResource(self.currentSource, self.currentResourceTriples, function (err, result) {
            if (err) {
                return alert(err.responseText);
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

    self.writeResource = function (source, triples, callback) {
        if (!triples || triples.length == 0) {
            return callback({ responseText: "no predicates for node" });
        }

        var resourceUri = triples[0].subject;

        Sparql_OWL.getNodeInfos(source, resourceUri, {}, function (err, result) {
            if (err) {
                return callback(err);
            }
            if (result.length > 0) {
                resourceUri = null;
                $("#lineageCreateResource_creatingNodeUriType").val();
                return callback({ responseText: "this uri already exists, choose a new one" });
            }

            Sparql_generic.insertTriples(source, triples, {}, function (err, _result) {
                if (err) {
                    return callback(err.responseText);
                }

                SearchUtil.generateElasticIndex(source, { ids: [resourceUri] }, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    UI.message("node Created and Indexed");
                });

                var modelData = {};
                triples.forEach(function (item) {
                    if (item.predicate == "rdfs:label") {
                        modelData.label = item.object;
                        modelData.id = item.subject;
                    }
                    if(item.predicate == 'rdfs:subClassOf'){
                        modelData.superClass=item.object;
                        modelData.superClassLabel=Sparql_common.getLabelFromURI(item.object);
                    }
                });
               
                var modelData = {
                    classes: { [modelData.id]: modelData },
                };
                OntologyModels.updateModel(source, modelData, {}, function (err, result) {
                    if (callback) return callback(err, resourceUri);
                    return console.log(err || "ontologyModelCache updated");
                });
            });
        });
    };

    self.closeDialog = function () {
        $("#LineagePopup").dialog("close");
    };

    self.removeTriple = function (index) {
        self.currentResourceTriples.splice(index, 1);
        $("#triple_" + index).remove();
    };

    self.onselectNodeUriType = function (uryType) {
        var display = uriType == "specific" ? "block" : "none";
        $("#lineageCreateResource_specificUri").css("display", display);
    };

    self.addNewPredicate = function () {
        $("#editPredicate_propertyDiv").css("display", "block");
        $("#editPredicate_controlsDiv").css("display", "block");
        $("#editPredicate_savePredicateButton").css("display", "none");

        $("#editPredicate_objectSelect").val("");
        $("#editPredicate_objectInput").val("");
        $("#lineageCreateResource_predicateDiv").html("");
    };
    self.drawNodeAxioms = function () {};

    return self;
})();

export default Lineage_createResource;
window.Lineage_createResource = Lineage_createResource;
