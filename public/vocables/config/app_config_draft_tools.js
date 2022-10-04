Config.KG = {
  dictionaries: {
    CFIHOS_READI: { fileName: "dictionary_READI.json" },
  },

  elasticIndexSourceMap: {
    cfihos: "CFIHOS-ISO",
    pca: "ISO_15926-PCA",
    readi: "CFIHOS_READI",
  },
  palette: ["#1f77b4", "#9467bd", "#2ca02c", "#8c564b", "#aec7e8", "#98df8a"],
  RDLsource: "RDL-QUANTUM-MIN",
  OneModelSource: "ONE-MODEL",
  mappingAlternativeSource: "CFIHOS_READI",
  adlQueryMode: "SPARQL", //or SQL
  queryLimit: 10000,
  maxDistinctValuesForAdvancedMapping: 200000,
  browserMaxClassesToDrawClassesGraph: 15,
  oneModelDictionaryGraphURI: "http://data.total.com/resource/one-model/dictionary/",
  topRdlObjects: {
    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-F0000000801": {
      label: "Functional Objects",
      type: "http://rds.posccaesar.org/ontology/lis14/FunctionalObject",
    },
    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-P0000001723": {
      label: "Physical Objects",
      type: "http://rds.posccaesar.org/ontology/lis14/PhysicalObject",
    },
    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-B0000000000": {
      label: "Disciplines",
      type: "http://w3id.org/readi/z018-rdl/Discipline",
    },
    "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-A0000000000": {
      label: "Attributes",
      type: "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute",
    },
  },
}

Config.Blender = {
  openTaxonomyTreeOnLoad: 3,
  pasteDescendantsMaxDepth: 6,
  prefLang: "en",
};
Config.evaluate = {
  maxZipFileSize: 30000000, //30MO
};

Config.KGpropertyFilter = {
  tsfPropertyFilterPrefix: "http://data.total.com/resource/tsf/property-filtering/",
  sources: ["CFIHOS_1_5_PLUS", "TSF_TEPDK_TEST", "TSF_TEPDK_PHUSION"],
};