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
    self.serverUrl = "/slsv";
    if (window.location.href.indexOf("localhost") < 0)
      self.serverUrl = "../slsv";
 //   self.default_sparql_url = "http://51.178.139.80:8890/sparql"
    //  self.default_sparql_url = "http://10.28.171.139:8890/sparql"
//    self.default_sparql_url="http://opeppa-updtlb03.main.glb.corp.local:8890/sparql"

    self.wikiCategoriesGraphUri = "http://souslesens.org/data/total/ep/"

    self.defaultNewUriRoot = "http://souslesens.org/resource/"
 self.loginMode = "json";

   self.loginMode = "none";

    self.appName = "VOCABLES";
    self.debug = {query: 1}
    self.enableCollections = false;
    self.showAssetQueyMenu = true;
    self.preferredSchemaType = "OWL"
    self.queryLimit = 10000;
    self.searchLimit = 500;
    self.searchDepth = 6
    self.Blender = {
        openTaxonomyTreeOnLoad: 3,
        pasteDescendantsMaxDepth: 6,
        prefLang: "en"
    }
    self.evaluate = {
        maxZipFileSize: 30000000 //30MO
    }

    self.KG = {
        dictionaries: {
            "CFIHOS_READI": {fileName: "dictionary_READI.json"}
        },

        elasticIndexSourceMap: {
            "cfihos": "CFIHOS-ISO",
            "pca": "ISO_15926-PCA",
            "readi": "CFIHOS_READI"
        },
        palette: [
            '#1f77b4',
            '#9467bd',
            '#2ca02c',

            '#8c564b',
            '#aec7e8',
            '#98df8a']
        ,


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
                type: "http://standards.iso.org/iso/15926/part14/FunctionalObject"
            },
            "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-P0000001723": {
                label: "Physical Objects",
                type: "http://standards.iso.org/iso/15926/part14/PhysicalObject"
            },
            "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-B0000000000": {
                label: "Disciplines",
                type: "http://w3id.org/readi/z018-rdl/Discipline"
            },
            "http://data.total.com/resource/one-model/quantum-rdl/TOTAL-A0000000000": {
                label: "Attributes",
                type: "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute"
            }

        }
    },

        self.Standardizer = {
            elasticIndexesSourcesMap: {
                "readi": "CFIHOS_READI",
                "pca": "ISO_15926-PCA",
                "cfihos": "CFIHOS-ISO"
            }


        }


    self.sources = {}
    self.tools = {};


    self.tools["sourceBrowser"] = {
        label: "Browse",
        multiSources: 0,
        controller: SourceBrowser,
        toolDescriptionImg: null,
    }//"images/browse.png"}
    //  self.tools["sourceEditor"] = {label: "Edit", multiSources: 0, controller: SourceEditor,toolDescriptionImg:null},
    self.tools["sourceMatcher"] = {label: "Match", multiSources: 0, controller: SourceMatcher, toolDescriptionImg: null}//"images/match.png"}
    self.tools["evaluate"] = {label: "Evaluate", noSource: 1, controller: Evaluate, toolDescriptionImg: null}//"images/evaluate.png"}
    self.tools["ancestors"] = {label: "Genealogy", multiSources: 1, controller: Genealogy, toolDescriptionImg: null}//"images/taxonomy.png"}


    self.tools["lineage"] = {label: "Lineage", noSource: 0, controller: Lineage_classes, toolDescriptionImg: null}//"images/taxonomy.png"}

    self.tools["SPARQL"] = {
        label: "SPARQL endpoint",
        multiSources: 0,
        controller: SPARQL_endpoint,
        toolDescriptionImg: null
    }

    self.tools["KGmappings"] = {
        label: "KGmappings",
        multiSources: 0,
        controller: KGmappings,
        toolDescriptionImg: null
    }

    self.tools["KGbrowser"] = {label: "KGbrowser", multiSources: 0, controller: KGbrowser, toolDescriptionImg: null}//"images/taxonomy.png"}

    self.tools["Standardizer"] = {
        label: "Standardizer",
        multiSources: 0,
        controller: Standardizer,
        toolDescriptionImg: null
    }//"images/taxonomy.png"}

    self.tools["SQLquery"] = {
        label: "SQLquery",
        multiSources: 0,
        controller: SQLquery,
        toolDescriptionImg: null
    }//"images/taxonomy.png"}

    self.tools["admin"] = {label: "Admin", multiSources: 1, controller: Admin, toolDescriptionImg: null}//"images/taxonomy.png"}

    self.tools["Config"] = {
        label: "Config",
        noSource: 1,
        controller: Config,
        toolDescriptionImg: null
    }





    return self;

})()
    
    
    
    
    
    
    
    
    
    
    
