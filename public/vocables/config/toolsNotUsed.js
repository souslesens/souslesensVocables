self.tools["sourceMatcher"] = {
    label: "Match",
    multiSources: 0,
    controller: SourceMatcher,
    toolDescriptionImg: null,
}; //"images/match.png"}
self.tools["evaluate"] = { label: "Evaluate", noSource: 1, controller: Evaluate, toolDescriptionImg: null }; //"images/evaluate.png"}
self.tools["ancestors"] = { label: "Genealogy", multiSources: 1, controller: Genealogy, toolDescriptionImg: null }; //"images/taxonomy.png"}

self.tools["KGmappings"] = {
    label: "KGmappings",
    multiSources: 0,
    controller: KGmappings,
    toolDescriptionImg: null,
};

self.tools["KGbrowser"] = { label: "KGbrowser", multiSources: 0, controller: KGbrowser, toolDescriptionImg: null }; //"images/taxonomy.png"}
