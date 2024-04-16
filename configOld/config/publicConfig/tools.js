self.tools = {};

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

self.tools["KGcreator"] = {
    label: "KGcreator",
    noSource: 1,
    controller: KGcreator,
    toolDescriptionImg: null,
};

self.tools["admin"] = { label: "Admin", multiSources: 1, controller: Admin, toolDescriptionImg: null }; //"images/taxonomy.png"}

self.tools["ConfigEditor"] = {
    label: "ConfigEditor",
    noSource: 1,
    controller: ConfigEditor,
    toolDescriptionImg: null,
};

Config.tools = self.tools;
