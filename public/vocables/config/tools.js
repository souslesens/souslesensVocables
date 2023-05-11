
self.tools = {};

self.tools["lineage"] = { label: "Lineage", noSource: 0, controller: Lineage_classes, toolDescriptionImg: null }; //"images/taxonomy.png"}
self.tools["KGcreatorOld"] = {
    label: "KGcreatorOld",
    noSource: 1,
    controller: KGcreatorOld,
    toolDescriptionImg: null,
};
self.tools["KGcreator"] = {
    label: "KGcreator",
    noSource: 1,
    controller: KGcreator,
    toolDescriptionImg: null,
};


self.tools["Standardizer"] = {
    label: "Standardizer",
    multiSources: 0,
    controller: Standardizer,
    toolDescriptionImg: null,
}; //"images/taxonomy.png"}

self.tools["TSF_Dictionary"] = {
    label: "TSF_Dictionary",
    noSource: 1,
    controller: Lineage_dictionary,
    toolDescriptionImg: null,
};

self.tools["KGpropertyFilter"] = {
    label: "KGpropertyFilter",
    noSource: 1,
    controller: KGpropertyFilter,
    toolDescriptionImg: null,
};

self.tools["Composer"] = {
    label: "Composer",
    noSource: 1,
    controller: Composer,
    toolDescriptionImg: null,
};

self.tools["TE_14224_browser"] = {
    label: "TE_14224_browser",
    multiSources: 0,
    noSource: true,
    controller: TE_14224_browser,
    toolDescriptionImg: null,
};

self.tools["TE_AssetConfigurator"] = {
    label: "TE_AssetConfigurator",
    multiSources: 0,
    noSource: true,
    controller: TE_AssetConfigurator,
    toolDescriptionImg: null,
};
self.tools["SQLquery"] = {
    label: "SQLquery",
    multiSources: 0,
    controller: SQLquery,
    toolDescriptionImg: null,
}; //"images/taxonomy.png"}

self.tools["SPARQL"] = {
    label: "SPARQL endpoint",
    multiSources: 0,
    controller: SPARQL_endpoint,
    toolDescriptionImg: null,
};

self.tools["admin"] = { label: "Admin", multiSources: 0, controller: Admin, toolDescriptionImg: null }; //"images/taxonomy.png"}

self.tools["ConfigEditor"] = {
    label: "ConfigEditor",
    noSource: 1,
    controller: ConfigEditor,
    toolDescriptionImg: null,
};

Config.tools = self.tools;
