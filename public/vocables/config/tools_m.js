import Lineage_classes from "../modules/tools/lineage/lineage_classes.js";
import KGcreator from "../modules/tools/KGcreator.js";
import Standardizer from "../modules/tools/Standardizer.js";
import Lineage_dictionary from "../modules/tools/lineage/lineage_dictionary.js";
import SPARQL_endpoint from "../modules/tools/SPARQL_endpoint.js";
import Admin from "../modules/tools/admin.js";
import ConfigEditor from "../modules/tools/ConfigEditor.js";
import Idcp from "../modules/tools/TSF_plugins/IDCP.js";

var Tools = {};

Tools["lineage"] = { label: "Lineage", noSource: 0, controller: Lineage_classes, toolDescriptionImg: null }; //"images/taxonomy.png"}
Tools["KGcreator"] = {
    label: "KGcreator",
    noSource: 1,
    controller: KGcreator,
    toolDescriptionImg: null,
};
/*
Tools["sourceBrowser"] = {
    label: "Browse",
    multiSources: 0,
    controller: SourceBrowser,
    toolDescriptionImg: null,
};*/

Tools["Standardizer"] = {
    label: "Standardizer",
    multiSources: 0,
    controller: Standardizer,
    toolDescriptionImg: null,
}; //"images/taxonomy.png"}

Tools["TSF_Dictionary"] = {
    label: "TSF_Dictionary",
    noSource: 1,
    controller: Lineage_dictionary,
    toolDescriptionImg: null,
};
/*
Tools["KGpropertyFilter"] = {
    label: "KGpropertyFilter",
    noSource: 1,
    controller: KGpropertyFilter,
    toolDescriptionImg: null,
};

Tools["Composer"] = {
    label: "Composer",
    noSource: 1,
    controller: Composer,
    toolDescriptionImg: null,
};

Tools["TE_14224_browser"] = {
    label: "TE_14224_browser",
    multiSources: 0,
    noSource: true,
    controller: TE_14224_browser,
    toolDescriptionImg: null,
};

Tools["TE_AssetConfigurator"] = {
    label: "TE_AssetConfigurator",
    multiSources: 0,
    noSource: true,
    controller: TE_AssetConfigurator,
    toolDescriptionImg: null,
};
Tools["SQLquery"] = {
    label: "SQLquery",
    multiSources: 0,
    controller: SQLquery,
    toolDescriptionImg: null,
}; //"images/taxonomy.png"}
*/
Tools["SPARQL"] = {
    label: "SPARQL endpoint",
    multiSources: 0,
    controller: SPARQL_endpoint,
    toolDescriptionImg: null,
};

Tools["admin"] = { label: "Admin", multiSources: 0, controller: Admin, toolDescriptionImg: null }; //"images/taxonomy.png"}

Tools["ConfigEditor"] = {
    label: "ConfigEditor",
    noSource: 1,
    controller: ConfigEditor,
    toolDescriptionImg: null,
};
Tools["IDCP"] = {
    label: "IDCP",
    noSource: 1,
    controller: Idcp,
    toolDescriptionImg: null,
};

Config.tools = Tools;

export default Tools;
