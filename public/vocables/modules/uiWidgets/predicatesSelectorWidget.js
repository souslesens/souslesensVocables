import common from "../shared/common.js";
import PromptedSelectWidget from "./promptedSelectWidget.js";
import OntologyModels from "../shared/ontologyModels.js";
import DateWidget from "./dateWidget.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import IndividualValueFilterWidget from "./individualValuefilterWidget.js";

var PredicatesSelectorWidget = (function () {
    var self = {};

    self.usualProperties = [
        "rdf:type",
        "rdfs:subClassOf",
        "rdfs:label",
        "rdfs:isDefinedBy",
        "rdfs:comment",
        "rdfs:member",
        "slsv:next",
        "owl:sameAs",
        "owl:equivalentClass",

        "",
        "xsd:string",
        "xsd:dateTime",
        "xsd:boolean",
        "xsd:integer",
        "xsd:float",
        "xsd:double",
        "xsd:decimal",
        "rdf:XMLLiteral",

        "",

        "skos:altLabel",
        "skos:prefLabel",
        "skos:definition",
        "skos:example",
        "skos:member",
        "dcterms:format",
        "",
        "_function",
        "_restriction",
        // "_part14Predefined",
        "",
        "owl:onProperty",
        "owl:someValuesFrom",
        "owl:allValuesFrom",
        "owl:hasValue",
        "rdfs:subPropertyOf",
        "owl:inverseOf",

        "",
    ];

    self.usualObjectClasses = [
        "owl:Thing",
        "owl:Class",
        "owl:NamedIndividual",
        "owl:Thing",
        "owl:ObjectProperty",
        "owl:DatatypeProperty",
        "owl:Restriction",
        "rdf:Bag",
        "rdf:List",
        "skos:Concept",
        "skos:Collection",
        "slsv:TopConcept",
        "_function",
        // "_blankNode",
        "_virtualColumn",
        // "_rowIndex",
        "",
    ];

    self.predicatesIdsMap = {};

    self.load = function (divId, source, options, configureFn, callback) {
        self.options = options || {};
        $("#" + divId).html("");
        $("#editPredicate_mainDiv").parent().empty();
        $("#" + divId).load("./modules/uiWidgets/html/predicatesSelectorWidgetDialog.html", function (a, b, c) {
            var x = a + b + c;
            self.init(source, configureFn, function (err, result) {
                if (callback) {
                    return callback();
                }
            });
        });
    };

    self.init = function (source, configureFn, callback) {
        $("#sourceBrowser_addPropertyDiv").css("display", "flex");
        if (self.options["flex-direction"]) {
            $("#editPredicate_mainDiv").css("flex-direction", self.options["flex-direction"]);
        }

        $("#editPredicate_currentVocabPredicateSelect").prop("disabled", false);
        $("#editPredicate_vocabularySelect").prop("disabled", false);
        $("#editPredicate_propertyValue").prop("disabled", false);

        self.setVocabulariesSelect(source);
        self.setCurrentVocabClassesSelect("usual", "editPredicate_objectSelect");
        self.setCurrentVocabPropertiesSelect("usual", "editPredicate_currentVocabPredicateSelect");

        // var properties = Config.Lineage.basicObjectProperties;

        self.configure(configureFn, function (err, result) {
            if (callback) {
                return callback();
            }
        });
    };

    self.configure = function (configureFn, callback) {
        self.onSelectPropertyFn = null;
        self.onSelectObjectFn = null;
        $("#editPredicate_vocabularySelect").val("usual");
        $("#editPredicate_vocabularySelect2").val("usual");
        if (configureFn) {
            configureFn();
            if (callback) {
                return callback();
            }
        }
    };

    self.setVocabulariesSelect = function (source, filter) {
        var vocabularies = [];
        if (!filter || filter == "_all") {
            vocabularies = ["usual"];
            //vocabularies = vocabularies.concat(Config.sources[source].imports);
            vocabularies = vocabularies.concat(Object.keys(Config.ontologiesVocabularyModels));
        } else if (filter == "_loadedSources") {
            vocabularies = Lineage_sources.loadedSources;
            vocabularies = vocabularies.concat(Config.sources[source].imports);
        } else if (filter == "_basicVocabularies") {
            vocabularies = Object.keys(Config.basicVocabularies);
        } else if (filter == "_curentSourceAndImports") {
            vocabularies = [source];
            vocabularies = vocabularies.concat(Config.sources[source].imports);
        } else {
            if (!Array.isArray(filter)) {
                filter = [filter];
            }
            vocabularies = filter;
        }
        common.fillSelectOptions("editPredicate_vocabularySelect", vocabularies, true);
        common.fillSelectOptions("editPredicate_vocabularySelect2", vocabularies, true);
    };

    self.setCurrentVocabPropertiesSelect = function (vocabulary, selectId) {
        var properties = [];

        if (vocabulary == "usual") {
            self.usualProperties.forEach(function (item) {
                properties.push({ label: item, id: item });
            });
            properties.push({ label: "-------", id: "" });
            common.fillSelectOptions(selectId, properties, true, "label", "id");
        } else {
            OntologyModels.registerSourcesModel([vocabulary], function (err, result) {
                properties = OntologyModels.getPropertiesArray(vocabulary);
                var datatypeProperties = OntologyModels.getAnnotationProperties(vocabulary);
                properties = properties.concat(datatypeProperties);
                common.array.sort(properties, "label");

                common.fillSelectOptions(selectId, properties, true, "label", "id");
            });
        }
    };

    self.onSelectPredicateProperty = function (value) {
        $("#editPredicate_objectSelect").val("");
        $("#editPredicate_objectValue").val("");
        $("#editPredicate_propertyValue").val(value);
        $("#editPredicate_vocabularySelect2").css("display", "inline");
        DateWidget.unsetDatePickerOnInput("editPredicate_objectValue");
        if (self.onSelectPropertyFn) {
            self.onSelectPropertyFn(value);
        }

        if (!self.options.withOperators) {
            return;
        }
        self.operators = {
            String: ["contains", "not contains", "="],
            Number: ["=", "!=", "<", "<=", ">", ">="],
        };

        if (value.indexOf("xsd:") > -1) {
            $("#editPredicate_vocabularySelect2").css("display", "none");
            if (value == "xsd:dateTime") {
                common.fillSelectOptions("editPredicate_objectSelect", self.operators.Number);
                DateWidget.setDatePickerOnInput("editPredicate_objectValue");
            } else if (value == "xsd:string") {
                common.fillSelectOptions("editPredicate_objectSelect", self.operators.String);
            } else {
                common.fillSelectOptions("editPredicate_objectSelect", self.operators["Number"]);
            }
        } else if (Sparql_common.isTripleObjectString(value)) {
            $("#editPredicate_vocabularySelect2").css("display", "none");
            common.fillSelectOptions("editPredicate_objectSelect", self.operators.String);
        } else {
            $("#editPredicate_vocabularySelect2").css("display", "inline");
            $("#editPredicate_vocabularySelect2").val("usual");
            self.setCurrentVocabClassesSelect("usual", "editPredicate_objectSelect");
        }
    };

    self.onSelectCurrentVocabObject = function (value) {
        if (value == "_searchClass") {
            return PromptedSelectWidget.prompt("owl:Class", "editPredicate_objectSelect", self.currentVocabulary);
        }
        if (value == "_search") {
            return PromptedSelectWidget.prompt(null, "editPredicate_objectSelect", self.currentVocabulary);
        }
        $("#editPredicate_objectValue").val(value);
        if (self.onSelectObjectFn) {
            self.onSelectObjectFn(value);
        }
    };

    self.setCurrentVocabClassesSelect = function (vocabulary, selectId) {
        self.currentVocabulary = vocabulary;
        if (!selectId) {
            selectId = "editPredicate_objectSelect";
        }
        var classes = [];

        if (vocabulary == "usual") {
            self.usualObjectClasses.forEach(function (item) {
                classes.push({
                    id: item,
                    label: item,
                });
            });
            common.fillSelectOptions(selectId, classes, true, "label", "id");
        } else {
            OntologyModels.registerSourcesModel([vocabulary], function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                if (Config.ontologiesVocabularyModels[vocabulary] && Config.ontologiesVocabularyModels[vocabulary].classesCount <= Config.ontologyModelMaxClasses) {
                    var classes = [];
                    for (var classId in Config.ontologiesVocabularyModels[vocabulary].classes) {
                        var classObj = Config.ontologiesVocabularyModels[vocabulary].classes[classId];
                        classes.push({
                            id: classObj.id,
                            label: classObj.label,
                        });
                    }

                    common.fillSelectOptions(selectId, classes, true, "label", "id");
                } else {
                    //PromptedSelectWidget
                    return PromptedSelectWidget.prompt("owl:Class", "editPredicate_objectSelect", vocabulary);
                }
            });
        }
    };

    self.getSelectedProperty = function () {
        var property = $("#editPredicate_propertyValue").val();

        if (property.indexOf("xsd:") == 0) {
            // get operator
            return "owl:hasValue";
        } else {
            if (property.indexOf("http") == 0) {
                return "<" + property + ">";
            } else {
                return property;
            }
        }
    };
    self.getSelectedObjectValue = function () {
        var property = $("#editPredicate_propertyValue").val();
        var value = $("#editPredicate_objectValue").val().trim();

        if (property.indexOf("xsd") > -1) {
            if (property == "xsd:dateTime") {
                var date = $("#editPredicate_objectValue").datepicker("getDate");
                return "'" + common.dateToRDFString(date) + "'^^xsd:dateTime";
            } else {
                return "'" + value + "'^^" + property;
            }
        } else if (value.indexOf("http") == 0) {
            return "<" + value + ">";
        } else {
            return value;
        }
    };

    self.getSelectedOperator = function () {
        var property = $("#editPredicate_propertyValue").val();
        if (property.indexOf("xsd") > -1) {
            return $("#editPredicate_objectSelect").val();
        }
        return null;
    };

    self.getSparqlFilter = function () {
        var property = self.getSelectedProperty();
        var value = self.getSelectedObjectValue();
        var operator = self.getSelectedOperator();
        var operator = null;
        if (Sparql_common.isTripleObjectString(property, value)) {
            operator = $("#editPredicate_objectSelect").val();
        }
        IndividualValueFilterWidget.getSparqlFilter(varName, property, operator, value);
    };

    return self;
})();

export default PredicatesSelectorWidget;
window.PredicatesSelectorWidget = PredicatesSelectorWidget;
