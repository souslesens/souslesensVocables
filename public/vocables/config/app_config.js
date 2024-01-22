/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var Config = (function () {
    var self = {};

    self.apiUrl = "/api/v1";

    self.UIprofile = "KG"; //ontology
    self.logSparqlQueries = false;
    if (location.hostname == "localhost") {
        self.logSparqlQueries = true;
    }
    self.labelsGraphUri = "http://souslesens.org/vocables/resource/labels/";
    self.wikiCategoriesGraphUri = "http://souslesens.org/data/total/ep/";

    self.defaultNewUriRoot = "http://souslesens.org/resource/";
    self.linkedData_mappings_graphUri = "http://souslesens.org/resource/linkedData_mappings/";

    self.styles_graphUri = "http://souslesens.org/resource/styles/";
    self.loginMode = "json";

    self.appName = "VOCABLES";

    self.whiteBoardDivId = "graphDiv";
    self.debug = { query: 1 };
    self.enableCollections = false;
    self.showAssetQueyMenu = true;
    self.preferredSchemaType = "OWL";
    self.queryLimit = 10000;
    self.searchLimit = 500;
    self.searchDepth = 6;
    self.maxSelectListSize = 500;
    self.minSelectListSize = 200;
    self.whiteBoardMaxLabelLength = 20;
    self.slicedArrayLength = 100;

    self.dataTableOutputLimit = 500;
    self.defaultGraphTheme = "white"; //dark
    self.predicatesSource = "TSF-PREDICATES";
    self.dictionarySource = "TSF-DICTIONARY";

    self._defaultSource = {
        graphUri: null,
        sparql_server: {
            url: "_default",
        },
        imports: [],
        controller: "Sparql_OWL",
        topClassFilter: "?topConcept rdf:type  owl:Class ",
        schemaType: "OWL",
    };

    self.sousLeSensVocablesGraphUri = "http://data.souslesens.org/";
    self.formalOntologySourceLabel = "ISO_15926-part-14_PCA";

    self.CRUDsources = {
        STORED_LINEAGE_QUERIES: {
            graphUri: "http://souslesens.org/resource/stored-lineage-queries/",
            sparql_server: { url: "_default" },
            type: "slsv:StoredLineageQuery",
        },
        STORED_KGQUERY_QUERIES: {
            graphUri: "http://souslesens.org/resource/stored-kgqueries-queries/",
            sparql_server: { url: "_default" },
            type: "slsv:StoredKGqueryQuery",
        },
        STORED_TIMELINE_QUERIES: {
            graphUri: "http://souslesens.org/resource/stored-timeline-queries/",
            sparql_server: { url: "_default" },
            type: "slsv:StoredTimelineQuery",
        },
        STORED_VISJS_GRAPHS: {
            graphUri: "http://souslesens.org/resource/stored-visjs-graphs/",
            sparql_server: { url: "_default" },
            type: "slsv:StoredGraph",
        },
    };
    self.ontologyModelMaxClasses = 20000; // max classes loaded in ontologyModel.classes  (if more not used)
    self.topLevelOntologies = {
        IDO: { uriPattern: "lis14", prefix: "ido", prefixtarget: "http://rds.posccaesar.org/ontology/lis14/rdl/" },
        "ISO_15926-part-14_PCA": { uriPattern: "lis14", prefix: "part14", prefixtarget: "http://rds.posccaesar.org/ontology/lis14/rdl/" },
        BFO: { uriPattern: "obo", prefix: "bfo", prefixtarget: "http://purl.obolibrary.org/obo/" },
        "BFO-2020": { uriPattern: "obo", prefix: "bfo", prefixtarget: "http://purl.obolibrary.org/obo/" },
        // "bfo.owl": { uriPattern: "obo", prefix: "bfo", prefixtarget: "http://purl.obolibrary.org/obo/" },

        DOLCE: { uriPattern: "dul", prefix: "dul", prefixtarget: "http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#" },
        LML: { uriPattern: "lml", prefix: "lml", prefixtarget: "http://souslesens.org/ontology/lml/" },
    };

    self.basicVocabularies = {
        rdf: { graphUri: "https://www.w3.org/1999/02/22-rdf-syntax-ns" },
        rdfs: { graphUri: "https://www.w3.org/2000/01/rdf-schema" },
        owl: { graphUri: "https://www.w3.org/2002/07/owl" },
        "iof-av": { graphUri: "https://spec.industrialontologies.org/ontology/core/meta/AnnotationVocabulary/" },
        skos: { graphUri: "http://www.w3.org/2004/02/skos/core/" },
    };

    self.ontologiesVocabularyModels = JSON.parse(JSON.stringify(self.basicVocabularies));

    self.namedSetsThesaurusGraphUri = "http://souslesens.org/resource/named-triple-sets/";

    self.defaultSparqlPrefixes = {
        xs: "<http://www.w3.org/2001/XMLSchema#>",
        rdf: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
        rdfs: "<http://www.w3.org/2000/01/rdf-schema#>",
        owl: "<http://www.w3.org/2002/07/owl#>",
        skos: "<http://www.w3.org/2004/02/skos/core#>",
        iso14224: "<http://data.total.com/resource/tsf/iso_14224#>",
        req: "<https://w3id.org/requirement-ontology/rdl/>",
        part14: "<http://rds.posccaesar.org/ontology/lis14/rdl/>",
        iso81346: "<http://data.total.com/resource/tsf/IEC_ISO_81346/>",
        bfo: "<http://purl.obolibrary.org/obo/bfo.owl>",
        dul: "<http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#>",
        slsv: "<http://souslesens.org/resource/vocabulary/>",
        dcterms: "<http://purl.org/dc/terms/>",
    };
    self.dictionaryMetaDataPropertiesMap = {
        prop: "http://www.w3.org/2002/07/owl#onProperty",
        range: "http://www.w3.org/2002/07/owl#someValuesFrom",
        domain: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
        status: "https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status",
        domainSourceLabel: "http://data.souslesens.org/property#domainSourceLabel",
        rangeSourceLabel: "http://data.souslesens.org/property#rangeSourceLabel",
        author: "http://purl.org/dc/terms/creator",
        provenance: "http://purl.org/dc/terms/source",
        creationDate: "http://purl.org/dc/terms/created",
    };
    self.dictionaryStatusMap = {
        promote: "OK",
        unPromote: "Candidate",
        trash: "KO",
        delete: "DELETED",
    };

    self.Standardizer = {
        elasticIndexesSourcesMap: {
            readi: "CFIHOS_READI",
            pca: "ISO_15926-PCA",
            cfihos: "CFIHOS-ISO",
        },
    };

    self.selectListsCache = {};

    self.Lineage = {
        disabledButtons: [
            // "lineage_actionDiv_similars",
            "lineage_actionDiv_equivClass",
            "lineage_actionDiv_linkedData",
            "lineage_actionDiv_reasoner",
            "lineage_actionDiv_rules",
            "lineage_actionDiv_newAxiom",

            //"lineage_actionDiv_clearLast",
            // "lineage_actionDiv_last"
        ],

        numberOfContainersLevel: 3,
        showSourceNodesInGraph: false,
        basicObjectProperties: [
            { id: "http://www.w3.org/2002/07/owl#sameAs", label: "owl:sameAs", type: "ObjectProperty" },
            { id: "http://www.w3.org/2000/01/rdf-schema#label", label: "rdfs:label", type: "dataTypeProperty" },
            { id: "http://www.w3.org/2000/01/rdf-schema#comment", label: "rdfs:comment", type: "dataTypeProperty" },
            { id: "http://www.w3.org/2000/01/rdf-schema#subClassOf", label: "rdfs:subClassOf", type: "ObjectProperty" },
            { id: "http://rds.posccaesar.org/ontology/lis14/partOf", label: "part14:partOf", type: "ObjectProperty" },
            { id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", label: "rdf:type", type: "ObjectProperty" },
            {
                id: "http://rds.posccaesar.org/ontology/lis14/representedBy",
                label: "part14:representedBy",
                type: "dataTypeProperty",
            },
            { id: "http://www.w3.org/2004/02/skos/core#prefLabel", label: "skos:prefLabel", type: "dataTypeProperty" },
        ],
        logicalOperatorsMap: {
            // Owl Class Constructors
            "http://www.w3.org/2002/07/owl#complementOf": "┓",
            "https://www.w3.org/2002/07/owl#complementOf": "┓",
            "http://www.w3.org/2002/07/owl#intersectionOf": "⊓",
            "https://www.w3.org/2002/07/owl#intersectionOf": "⊓",
            "https://www.w3.org/2002/07/owl#unionOf": "⨆",
            "http://www.w3.org/2002/07/owl#unionOf": "⨆",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#intersectionOf": "⊓",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#unionOf": "⨆",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#complementOf": "┓",
            "https://www.w3.org/1999/02/22-rdf-syntax-ns#intersectionOf": "⊓",
            "https://www.w3.org/1999/02/22-rdf-syntax-ns#unionOf": "⨆",
            "https://www.w3.org/1999/02/22-rdf-syntax-ns#complementOf": "┓",
            "http://www.w3.org/2002/07/owl#someValuesFrom": "∃",
            "https://www.w3.org/2002/07/owl#someValuesFrom": "∃",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#someValuesFrom": "∃",
            "https://www.w3.org/1999/02/22-rdf-syntax-ns#someValuesFrom": "∃",
            "http://www.w3.org/2002/07/owl#allValuesFrom": "∀",
            "https://www.w3.org/2002/07/owl#allValuesFrom": "∀",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#allValuesFrom": "∀",
            "https://www.w3.org/1999/02/22-rdf-syntax-ns#allValuesFrom": "∀",

            "http://www.w3.org/2002/07/owl#onProperty": "∃",

            "http://www.w3.org/1999/02/22-rdf-syntax-ns#first": "f",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest": "r",

            "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil": "∅",
            "http://www.w3.org/2000/01/rdf-schema#domain": "d->",
            "http://www.w3.org/2000/01/rdf-schema#range": "->r",
            "http://www.w3.org/2002/07/owl#inverseOf": "f-1",

            // Owl Axioms
            "http://www.w3.org/2002/07/owl#subClassOf": "⊑",
            "https://www.w3.org/2002/07/owl#subClassOf": "⊑",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#subClassOf": "⊑",
            "https://www.w3.org/1999/02/22-rdf-syntax-ns#subClassOf": "⊑",
            "https://www.w3.org/2000/01/rdf-schema#subClassOf": "⊑",
            "http://www.w3.org/2000/01/rdf-schema#subClassOf": "⊑",
            "http://www.w3.org/2002/07/owl#equivalentClass": "≡",
            "https://www.w3.org/2002/07/owl#equivalentClass": "≡",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#equivalentClass": "≡",
            "https://www.w3.org/1999/02/22-rdf-syntax-ns#equivalentClass": "≡",
            "http://www.w3.org/2002/07/owl#disjointWith": "⊑ ┓",
            "https://www.w3.org/2002/07/owl#disjointWith": "⊑ ┓",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#disjointWith": "⊑ ┓",
            "https://www.w3.org/1999/02/22-rdf-syntax-ns#disjointWith": "⊑ ┓",
            "http://www.w3.org/2002/07/owl#sameIndividualAs": "≡",
            "https://www.w3.org/2002/07/owl#sameIndividualAs": "≡",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#sameIndividualAs": "≡",
            "https://www.w3.org/1999/02/22-rdf-syntax-ns#sameIndividualAs": "≡",
            "http://www.w3.org/2002/07/owl#differentFrom": "⊑ ┓",
            "https://www.w3.org/2002/07/owl#differentFrom": "⊑ ┓",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#differentFrom": "⊑ ┓",
            "http://www.w3.org/2002/07/owl#subPropertyOf": "⊑",
            "https://www.w3.org/2002/07/owl#subPropertyOf": "⊑",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#subPropertyOf": "⊑",
            "https://www.w3.org/1999/02/22-rdf-syntax-ns#subPropertyOf": "⊑",
            "http://www.w3.org/2000/01/rdf-schema#subPropertyOf": "⊑",
            "https://www.w3.org/2000/01/rdf-schema#subPropertyOf": "⊑",
            "http://www.w3.org/2002/07/owl#equivalentProperty": "≡",
            "https://www.w3.org/2002/07/owl#equivalentProperty": "≡",
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#equivalentProperty": "≡",
            "https://www.w3.org/1999/02/22-rdf-syntax-ns#equivalentProperty": "≡",

            ObjectIntersectionOf: "⊓",
            //End of Logicial operators/
        },
    };

    self.topLevelOntologyFixedlegendMap = {
        IDO: {
            "http://rds.posccaesar.org/ontology/lis14/rdl/Dependent": "#FCA53D",
            "	http://rds.posccaesar.org/ontology/lis14/rdl/Object": "#8CC1C7",
            "http://rds.posccaesar.org/ontology/lis14/rdl/Location": "#ED008C",
            "http://rds.posccaesar.org/ontology/lis14/rdl/PhysicalObject": "#00B5EC",
            "http://rds.posccaesar.org/ontology/lis14/rdl/FunctionalObject": "#FEF200",
            "http://rds.posccaesar.org/ontology/lis14/rdl/InformationObject": "#AFD46B",
            "http://rds.posccaesar.org/ontology/lis14/rdl/Activity": "#00AE8D",
            "http://rds.posccaesar.org/ontology/lis14/rdl/Temporal": "#8F52A0",
            "http://rds.posccaesar.org/ontology/lis14/rdl/Prescriptive": "#E86549",
        },
        "ISO_15926-part-14_PCA": {
            "http://rds.posccaesar.org/ontology/lis14/rdl/Location": "#ED008C",
            "http://rds.posccaesar.org/ontology/lis14/rdl/PhysicalObject": "#00B5EC",
            "http://rds.posccaesar.org/ontology/lis14/rdl/FunctionalObject": "#FEF200",
            "http://rds.posccaesar.org/ontology/lis14/rdl/InformationObject": "#AFD46B",
            "http://rds.posccaesar.org/ontology/lis14/rdl/Activity": "#70309f",
            "http://rds.posccaesar.org/ontology/lis14/rdl/Aspect": "#cb6601",
        },
        BFO: {
            "http://purl.obolibrary.org/obo/BFO_0000030": "#00AFEF",
            "http://purl.obolibrary.org/obo/BFO_0000024": "#00AFEF",
            "http://purl.obolibrary.org/obo/BFO_0000027": "#00AFEF",
            "http://purl.obolibrary.org/obo/BFO_0000145": "#cb6601",
            "http://purl.obolibrary.org/obo/BFO_0000023": "#cb6601",
            "http://purl.obolibrary.org/obo/BFO_0000016": "#cb6601",
            "http://purl.obolibrary.org/obo/BFO_0000019": "#cb6601",
            "http://purl.obolibrary.org/obo/BFO_0000017": "#cb6601",
            "http://purl.obolibrary.org/obo/BFO_0000006": "#F90EDD",
            "http://purl.obolibrary.org/obo/BFO_0000029": "#F90EDD",
            "http://purl.obolibrary.org/obo/BFO_0000140": "#F90EDD",
            "http://purl.obolibrary.org/obo/BFO_0000182": "#70309f",
            "http://purl.obolibrary.org/obo/BFO_0000144": "#70309f",
            "http://purl.obolibrary.org/obo/BFO_0000148": "#70309f",
            "http://purl.obolibrary.org/obo/BFO_0000038": "#70309f",
            "http://purl.obolibrary.org/obo/BFO_0000203": "#70309f",
            "http://purl.obolibrary.org/obo/BFO_0000015": "#70309f",
            "http://purl.obolibrary.org/obo/BFO_0000008": "#70309f",
        },
        DOLCE: {},
    };

    self.slsvColorThemes = {
        "bluish violet": {
            "@source-color": "#8757de",
            "@button1-color": "#1A28BF",
            "@button2-color": "#079abe",
            "@button3-color": "#52c1b9",
            "@legend-color": "#4CAD8C",
            "@background-color": "#e9f0ff",
            "@dark-background-color": "#BFD4F5",
            "@arrow-icon": "../icons/BluishVioletTheme/caret-right-bluishViolet.png",
            "@moreOptions-icon": "../icons/BluishVioletTheme/MoreOptionsIcon-bluishViolet.png",
            "@search-icon": "../icons/BluishVioletTheme/SearchIcon-bluishViolet.png",
            "@lineage-logo": "../icons/BluishVioletTheme/lineageLogo-bluishViolet.png",
            "@KGquery-logo": "../icons/BluishVioletTheme/Kgquery-bluishViolet.png",
            "@KGcreator-logo": "../icons/BluishVioletTheme/Kgcreator-bluishViolet.png",
            "@saveIcon": "../icons/BluishVioletTheme/SaveIcon-bluishViolet.png",
            "@deleteIcon": "../icons/BluishVioletTheme/DeleteIcon-bluishViolet.png",
            "@jqueryClose": "../icons/BluishVioletTheme/CrossIcon-bluishViolet.png",
        },
        KGA: {
            "@source-color": "#6B77E5",
            "@button1-color": "#003366",
            "@button2-color": "#434E8C",
            "@button3-color": "#6b77e5",
            "@legend-color": "#7da6de",
            "@background-color": "#F4F4F4",
            "@dark-background-color": "#E4E4E4",
            "@logoInstance-icon": "../icons/KGATheme/KGALogo.png",
            "@arrow-icon": "../icons/KGATheme/caret-right-KGA.png",
            "@moreOptions-icon": "../icons/KGATheme/MoreOptionsIcon-KGA.png",
            "@search-icon": "../icons/KGATheme/SearchIcon-KGA.png",
            "@lineage-logo": "../icons/KGATheme/lineageLogo-KGA.png",
            "@KGquery-logo": "../icons/KGATheme/Kgquery-KGA.png",
            "@KGcreator-logo": "../icons/KGATheme/Kgcreator-KGA.png",
            "@saveIcon": "../icons/KGATheme/SaveIcon-KGA.png",
            "@deleteIcon": "../icons/KGATheme/DeleteIcon-KGA.png",
            "@jqueryClose": "../icons/KGATheme/CrossIcon-KGA.png",
        },
        "Total Energies": {
            "@source-color": "#374649",
            "@button1-color": "#3E3EFC",
            "@button2-color": "#7FD444",
            "@button3-color": "#00A965",
            "@legend-color": "#FFB301",
            "@background-color": "#F8F8F8",
            "@dark-background-color": "#E9EEEF",
            "@logoInstance-icon": "../icons/TotalEnergiesTheme/TotalEnergiesLogo.png",
            "@isGradient": true,
            "@gradient-color1": "linear-gradient(to right,#009CEA,#4139FD)",
            "@gradient-color2": "linear-gradient(to right,#82D442,#0BC9A5)",
            "@gradient-color3": "linear-gradient(to right,#3CA704, #018849)",
            "@gradient-color-source": "linear-gradient(to right,#FFBC6D,#ED2C2B)",
            "@border-color": "#374649",
            "@arrow-icon": "../icons/TotalEnergiesTheme/caret-right-TotalEnergies.png",
            "@moreOptions-icon": "../icons/TotalEnergiesTheme/MoreOptionsIcon-TotalEnergies.png",
            "@search-icon": "../icons/TotalEnergiesTheme/SearchIcon-TotalEnergies.png",
            "@lineage-logo": "../icons/TotalEnergiesTheme/lineageLogo-TotalEnergies.png",
            "@KGquery-logo": "../icons/TotalEnergiesTheme/Kgquery-TotalEnergies.png",
            "@KGcreator-logo": "../icons/TotalEnergiesTheme/Kgcreator-TotalEnergies.png",
            "@saveIcon": "../icons/TotalEnergiesTheme/SaveIcon-TotalEnergies.png",
            "@deleteIcon": "../icons/TotalEnergiesTheme/DeleteIcon-TotalEnergies.png",
            "@jqueryClose": "../icons/TotalEnergiesTheme/CrossIcon-TotalEnergies.png",
        },

        "Sea Breeze": {
            "@source-color": "#278ECC",
            "@button1-color": "#023451",
            "@button2-color": "#2F4365",
            "@button3-color": "#567488",
            "@legend-color": "#8A8C7D",
            "@background-color": "#F2EEE9",
            "@dark-background-color": "#DBCFBD",
            "@arrow-icon": "../icons/SeaBreezeTheme/caret-right-SeaBreeze.png",
            "@moreOptions-icon": "../icons/SeaBreezeTheme/MoreOptionsIcon-SeaBreeze.png",
            "@search-icon": "../icons/SeaBreezeTheme/SearchIcon-SeaBreeze.png",
            "@lineage-logo": "../icons/SeaBreezeTheme/lineageLogo-SeaBreeze.png",
            "@KGquery-logo": "../icons/SeaBreezeTheme/Kgquery-SeaBreeze.png",
            "@KGcreator-logo": "../icons/SeaBreezeTheme/Kgcreator-SeaBreeze.png",
            "@saveIcon": "../icons/SeaBreezeTheme/SaveIcon-SeaBreeze.png",
            "@deleteIcon": "../icons/SeaBreezeTheme/DeleteIcon-SeaBreeze.png",
            "@jqueryClose": "../icons/SeaBreezeTheme/CrossIcon-SeaBreeze.png",
        },

        "Fig colors ": {
            "@source-color": "#B64E74",
            "@button1-color": "#3B3C56",
            "@button2-color": "#585485",
            "@button3-color": "#495B99",
            "@legend-color": "#9E8E75",
            "@background-color": "#E9E5E7",
            "@dark-background-color": "#C9C8C9",
            "@arrow-icon": "../icons/FigColorsTheme/caret-right-FigColors.png",
            "@moreOptions-icon": "../icons/FigColorsTheme/MoreOptionsIcon-FigColors.png",
            "@search-icon": "../icons/FigColorsTheme/SearchIcon-FigColors.png",
            "@lineage-logo": "../icons/FigColorsTheme/lineageLogo-FigColors.png",
            "@KGquery-logo": "../icons/FigColorsTheme/Kgquery-FigColors.png",
            "@KGcreator-logo": "../icons/FigColorsTheme/Kgcreator-FigColors.png",
            "@saveIcon": "../icons/FigColorsTheme/SaveIcon-FigColors.png",
            "@deleteIcon": "../icons/FigColorsTheme/DeleteIcon-FigColors.png",
            "@jqueryClose": "../icons/FigColorsTheme/CrossIcon-FigColors.png",
        },
        Ocean: {
            "@source-color": "#0099B7",
            "@button1-color": "#1EBEBB",
            "@button2-color": "#009E68",
            "@button3-color": "#62AD00",
            "@legend-color": "#CBCB41",
            "@background-color": "#002B36",
            "@dark-background-color": "#00212B",
            "@arrow-icon": "../icons/OceanTheme/caret-right-Ocean.png",
            "@moreOptions-icon": "../icons/OceanTheme/MoreOptionsIcon-Ocean.png",
            "@search-icon": "../icons/OceanTheme/SearchIcon-Ocean.png",
            "@lineage-logo": "../icons/OceanTheme/lineageLogo-Ocean.png",
            "@KGquery-logo": "../icons/OceanTheme/Kgquery-Ocean.png",
            "@KGcreator-logo": "../icons/OceanTheme/Kgcreator-Ocean.png",
            "@saveIcon": "../icons/OceanTheme/SaveIcon-Ocean.png",
            "@deleteIcon": "../icons/OceanTheme/DeleteIcon-Ocean.png",
            "@jqueryClose": "../icons/OceanTheme/CrossIcon-Ocean.png",
        },
        DarkTheme: {
            "@source-color": "#F7606B",
            "@button1-color": "#FF9A8F",
            "@button2-color": "#769EE3",
            "@button3-color": "#1EBEBB",
            "@legend-color": "#EECBAB",
            "@background-color": "#2D2D2D",
            "@dark-background-color": "#1E1E1E",
            "@arrow-icon": "../icons/DarkTheme/caret-right-Dark.png",
            "@moreOptions-icon": "../icons/DarkTheme/MoreOptionsIcon-Dark.png",
            "@search-icon": "../icons/DarkTheme/SearchIcon-Dark.png",
            "@lineage-logo": "../icons/DarkTheme/lineageLogo-Dark.png",
            "@KGquery-logo": "../icons/DarkTheme/Kgquery-Dark.png",
            "@KGcreator-logo": "../icons/DarkTheme/Kgcreator-Dark.png",
            "@saveIcon": "../icons/DarkTheme/SaveIcon-Dark.png",
            "@deleteIcon": "../icons/DarkTheme/DeleteIcon-Dark.png",
            "@jqueryClose": "../icons/DarkTheme/CrossIcon-Dark.png",
        },

        SpatialTheme: {
            "@source-color": "#C32A58",
            "@button1-color": "#791A5D",
            "@button2-color": "#ED6269",
            "@button3-color": "#FEAF4A",
            "@legend-color": "#FCADCC",
            "@background-color": "#180725",
            "@dark-background-color": "#080112",
            "@arrow-icon": "../icons/SpatialTheme/caret-right-Spatial.png",
            "@moreOptions-icon": "../icons/SpatialTheme/MoreOptionsIcon-Spatial.png",
            "@search-icon": "../icons/SpatialTheme/SearchIcon-Spatial.png",
            "@lineage-logo": "../icons/SpatialTheme/lineageLogo-Spatial.png",
            "@KGquery-logo": "../icons/SpatialTheme/Kgquery-Spatial.png",
            "@KGcreator-logo": "../icons/SpatialTheme/Kgcreator-Spatial.png",
            "@saveIcon": "../icons/SpatialTheme/SaveIcon-Spatial.png",
            "@deleteIcon": "../icons/SpatialTheme/DeleteIcon-Spatial.png",
            "@jqueryClose": "../icons/SpatialTheme/CrossIcon-Spatial.png",
        },
    };

    self.toolsLogo = {
        lineage: "./icons/lineageLogo-BluePurple.png",
        KGcreator: "./icons/KGcreatorLogo-BluePurple.png",
        KGquery: "./icons/Kgquery-BluePurple.png",
    };
    self.defaultTheme="Sea Breeze";
    self.sources = {};
    self.tools = {};

    return self;
})();
