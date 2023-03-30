/**
 The MIT License
 The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var Config = (function() {
  var self = {};

  self.apiUrl = "/api/v1";


  self.logSparqlQueries = false;
  if (location.hostname == "localhost") {
    self.logSparqlQueries = true;
  }

  self.wikiCategoriesGraphUri = "http://souslesens.org/data/total/ep/";

  self.defaultNewUriRoot = "http://souslesens.org/resource/";
  self.linkedData_mappings_graphUri = "http://souslesens.org/resource/linkedData_mappings/";

  self.styles_graphUri = "http://souslesens.org/resource/styles/";
  self.loginMode = "json";

  self.appName = "VOCABLES";
  self.debug = { query: 1 };
  self.enableCollections = false;
  self.showAssetQueyMenu = true;
  self.preferredSchemaType = "OWL";
  self.queryLimit = 10000;
  self.searchLimit = 500;
  self.searchDepth = 6;
  self.maxSelectListSize = 500;
  self.minSelectListSize=200
  self.whiteBoardMaxLabelLength = 20;

  self.dataTableOutputLimit = 500;
  self.defaultGraphTheme = "white"; //dark
  self.predicatesSource = "TSF-PREDICATES";
  self.dictionarySource = "TSF-DICTIONARY";

  self._defaultSource = {
    graphUri: null,
    sparql_server: {
      url: "_default"
    },
    imports: [],
    controller: "Sparql_OWL",
    topClassFilter: "?topConcept rdf:type  owl:Class ",
    schemaType: "OWL"
  };

  self.sousLeSensVocablesGraphUri = "http://data.souslesens.org/";
  self.formalOntologySourceLabel = "ISO_15926-part-14_PCA";

  self.CRUDsources = {
    STORED_QUERIES: {
      graphUri: "http://souslesens.org/resource/stored-queries/",
      sparql_server: { url: "_default" },
      type: "slsv:StoredQuery"
    },
    STORED_GRAPHS: {
      graphUri: "http://souslesens.org/resource/stored-graphs/",
      sparql_server: { url: "_default" },
      type: "slsv:StoredGraph"
    }
  };

  self.topLevelOntologies = {
    IDO: { uriPattern: "lis14", prefix: "ido", prefixtarget: "http://rds.posccaesar.org/ontology/lis14/rdl/" },
    "ISO_15926-part-14_PCA": { uriPattern: "lis14", prefix: "part14", prefixtarget: "http://rds.posccaesar.org/ontology/lis14/rdl/" },
    BFO: { uriPattern: "obo", prefix: "bfo", prefixtarget: "http://purl.obolibrary.org/obo/" },
    "BFO-2020": { uriPattern: "obo", prefix: "bfo", prefixtarget: "http://purl.obolibrary.org/obo/" },
    // "bfo.owl": { uriPattern: "obo", prefix: "bfo", prefixtarget: "http://purl.obolibrary.org/obo/" },

    DOLCE: { uriPattern: "dul", prefix: "dul", prefixtarget: "http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#" },
    LML: { uriPattern: "lml", prefix: "lml", prefixtarget: "http://souslesens.org/ontology/lml/" }
  };

  self.basicVocabularies = {
    rdf: { graphUri: "https://www.w3.org/1999/02/22-rdf-syntax-ns" },
    rdfs: { graphUri: "https://www.w3.org/2000/01/rdf-schema" },
    owl: { graphUri: "https://www.w3.org/2002/07/owl" },
    "iof-av": { graphUri: "https://spec.industrialontologies.org/ontology/core/meta/AnnotationVocabulary/" },
    skos: { graphUri: "http://www.w3.org/2004/02/skos/core/" }
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
    dcterms: "<http://purl.org/dc/terms/>"
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
    creationDate: "http://purl.org/dc/terms/created"
  };
  self.dictionaryStatusMap = {
    promote: "OK",
    unPromote: "Candidate",
    trash: "KO",
    delete: "DELETED"
  };

  self.Standardizer = {
    elasticIndexesSourcesMap: {
      readi: "CFIHOS_READI",
      pca: "ISO_15926-PCA",
      cfihos: "CFIHOS-ISO"
    }
  };

self.selectListsCache={}

  self.Lineage = {
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
        type: "dataTypeProperty"
      },
      { id: "http://www.w3.org/2004/02/skos/core#prefLabel", label: "skos:prefLabel", type: "dataTypeProperty" }
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
      "https://www.w3.org/1999/02/22-rdf-syntax-ns#equivalentProperty": "≡"
      //End of Logicial operators/
    }
  };

  self.topLevelOntologyFixedlegendMap = {
    IDO: {
      "http://rds.posccaesar.org/ontology/lis14/rdl/Location": "#F90EDD",
      "http://rds.posccaesar.org/ontology/lis14/rdl/PhysicalObject": "#00AFEF",
      "http://rds.posccaesar.org/ontology/lis14/rdl/FunctionalObject": "#FDBF01",
      "http://rds.posccaesar.org/ontology/lis14/rdl/InformationObject": "#70AC47",
      "http://rds.posccaesar.org/ontology/lis14/rdl/Activity": "#70309f",
      "http://rds.posccaesar.org/ontology/lis14/rdl/Aspect": "#cb6601"
    },
    "ISO_15926-part-14_PCA": {
      "http://rds.posccaesar.org/ontology/lis14/rdl/Location": "#F90EDD",
      "http://rds.posccaesar.org/ontology/lis14/rdl/PhysicalObject": "#00AFEF",
      "http://rds.posccaesar.org/ontology/lis14/rdl/FunctionalObject": "#FDBF01",
      "http://rds.posccaesar.org/ontology/lis14/rdl/InformationObject": "#70AC47",
      "http://rds.posccaesar.org/ontology/lis14/rdl/Activity": "#70309f",
      "http://rds.posccaesar.org/ontology/lis14/rdl/Aspect": "#cb6601"
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
      "http://purl.obolibrary.org/obo/BFO_0000008": "#70309f"
    },
    DOLCE: {}
  };

  /*****************************************************************************/
  self.sources = {};
  self.tools = {};

  return self;
})();
