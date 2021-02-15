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
    self.serverUrl = "/elastic";
    if (window.location.href.indexOf("localhost") < 0)
        self.serverUrl = "../elastic";
    self.default_sparql_url = "http://51.178.139.80:8890/sparql"
//    self.default_sparql_url = "http://10.28.171.139:8890/sparql"
    self.wikiCategoriesGraphUri = "http://souslesens.org/data/total/ep/"
    self.loginMode = "json";
   self.loginMode = "none";
    self.appName = "VOCABLES";
    self.debug = {query: 1}
    self.enableCollections = false;
    self.showAssetQueyMenu = true;
    self.preferredSchemaType = "OWL"
    self.queryLimit = 10000;
    self.searchLimit = 500;
    self.searchDepth = 8






    self.sources = {}
    self.tools = {};


    self.tools["thesaurusBrowser"] = {label: "Browse", multiSources: 0, controller: ThesaurusBrowser, toolDescriptionImg: null}//"images/browse.png"}
    //  self.tools["sourceEditor"] = {label: "Edit", multiSources: 0, controller: SourceEditor,toolDescriptionImg:null},
    self.tools["thesauriMatcher"] = {label: "Match", multiSources: 0, controller: ThesaurusMatcher, toolDescriptionImg: null}//"images/match.png"}
    self.tools["nerEvaluator"] = {label: "Evaluate", multiSources: 1, controller: NerEvaluator, toolDescriptionImg: null}//"images/evaluate.png"}
    self.tools["termTaxonomy"] = {label: "Taxonomy", multiSources: 1, controller: TermTaxonomy, toolDescriptionImg: null}//"images/taxonomy.png"}


    self.tools["lineage"] = {label: "Lineage", noSource: 1, controller: Lineage_classes, toolDescriptionImg: null}//"images/taxonomy.png"}

    self.tools["SPARQL"] = {label: "SPARQL endpoint", multiSources: 0, controller: SPARQL_endpoint, toolDescriptionImg: null}//"images/taxonomy.png"}

    self.tools["xlsx2mappings"] = {label: "Xlsx2mappings", multiSources: 0, controller: Xlsx2mappings, toolDescriptionImg: null}//"images/taxonomy.png"}

    // self.tools["AssetQuery"] = {label: "Ontology", multiSources: 0, controller: AssetQuery,toolDescriptionImg:null}

    //  self.tools["annotator"] = {label: "Annotate", multiSources: 1, controller: Annotator, toolDescriptionImg: null}
    // self.tools["childHood"] = {label: "ChildHood", multiSources: 1, controller: ChildHood, toolDescriptionImg: null}//"images/taxonomy.png"}
    //  self.tools["importCSV"] = {label: "importCSV",controller: ImportCSV}

    // self.tools["blender"] = {label: "Blender", multiSources: 0, controller: Blender, toolDescriptionImg: null}



    self.profiles= {
        admin: {
            allowedSourceSchemas: ["SKOS", "OWL", "INDIVIDUAL"],
            allowedSources: "ALL",
            forbiddenSources: [],
            allowedTools: "ALL",
            forbiddenTools:  [],
            blender: {contextMenuActionStartLevel: 0}
        },
        admin_skos: {
            allowedSourceSchemas: ["SKOS"],
            allowedSources: "ALL",
            forbiddenSources: [],
            allowedTools: "ALL",
            forbiddenTools: ["xlsx2mappings","nerEvaluator"],
            blender: {contextMenuActionStartLevel: 0}
        },
        blender_skos: {
            allowedSourceSchemas: ["SKOS"],
            allowedSources: "ALL",
            forbiddenSources: [],
            allowedTools: "ALL",
            forbiddenTools: ["xlsx2mappings","nerEvaluator"],
            blender: {contextMenuActionStartLevel: 3}
        },
        reader_skos: {
            allowedSourceSchemas: ["SKOS"],
            allowedSources: "ALL",
            forbiddenSources: [],
            allowedTools: "ALL",
            forbiddenTools: ["xlsx2mappings","nerEvaluator","BLENDER"],
            blender: {contextMenuActionStartLevel: 3}
        },
        reader_all: {
            allowedSourceSchemas: ["SKOS","OWL"],
            allowedSources: "ALL",
            forbiddenSources: [],
            allowedTools: "ALL",
            forbiddenTools: ["xlsx2mappings","nerEvaluator","INDIVIDUALS","BLENDER"],
            blender: {contextMenuActionStartLevel: 3}
        }
    }


    self.currentProfile = self.profiles["admin"]





    return self;

})()
    
    
    
    
    
    
    
    
    
    
    
