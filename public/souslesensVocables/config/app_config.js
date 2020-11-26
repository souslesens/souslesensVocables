var Config = (function () {
    var self = {};
    self.serverUrl = "/elastic";
    self.default_sparql_url = "http://51.178.139.80:8890/sparql"
    self.wikiCategoriesGraphUri = "http://souslesens.org/data/total/ep/"

    self.currentProfile = {
        allowedSourceSchemas: "SKOS"
    }


    self.sources = {}
    self.tools = {};


    self.tools["thesaurusBrowser"] = {label: "Browse", multiSources: 0, controller: ThesaurusBrowser, toolDescriptionImg: null}//"images/browse.png"}
    //  self.tools["sourceEditor"] = {label: "Edit", multiSources: 0, controller: SourceEditor,toolDescriptionImg:null},
    self.tools["thesauriMatcher"] = {label: "Match", multiSources: 0, controller: ThesaurusMatcher, toolDescriptionImg: null}//"images/match.png"}
    self.tools["nerEvaluator"] = {label: "Evaluate", multiSources: 1, controller: NerEvaluator, toolDescriptionImg: null}//"images/evaluate.png"}
    self.tools["termTaxonomy"] = {label: "Taxonomy", multiSources: 1, controller: TermTaxonomy, toolDescriptionImg: null}//"images/taxonomy.png"}
    // self.tools["ontologyBrowser"] = {label: "Ontology", multiSources: 0, controller: OntologyBrowser,toolDescriptionImg:null}

    self.tools["annotator"] = {label: "Annotate", multiSources: 1, controller: Annotator, toolDescriptionImg: null}


    // moved self.tools["blender"] = {label: "Blender", multiSources: 0, controller: Blender,toolDescriptionImg:null}


    return self;

})()
    
    
    
    
    
    
    
    
    
    
    
