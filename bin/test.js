var fs = require("fs");
var sources = fs.readFileSync("../config/public_sources.json");
sources = JSON.parse(sources);
for (var key in sources) {
    var source = sources[key];
    if (!source.graphUri) str += key + "\n";
}

var str =
    "ROMAIN\n" +
    "QUDT\n" +
    "UNIK\n" +
    "WFA\n" +
    "IMF-VOCABULARY\n" +
    "LML\n" +
    "UNSPSC\n" +
    "GEOSCMIL\n" +
    "INT_CHRONOSTRATIGRAPHIC_CHART\n" +
    "LOTERRE\n" +
    "BFO\n" +
    "IAO\n" +
    "DOLCE\n" +
    "GUFO\n" +
    "SUMO\n" +
    "DATA_KNOWLEDGE\n" +
    "NPD\n" +
    "CIDOC\n" +
    "IOF-CORE\n" +
    "plant_ontology\n" +
    "cido_coronavirus\n" +
    "ONTO_WIND\n" +
    "EMMO\n" +
    "o3po_PRODUCTION_PLANT\n" +
    "IDO\n" +
    "AnnotationVocabulary\n" +
    "O3PO\n" +
    "PIZZA\n" +
    "iof-av\n";

var data = str.split("\n");
var yyy = {};
for (var key in sources) {
    if (data.indexOf(key) > -1) yyy[key] = sources[key];
}

var xx = JSON.stringify(yyy, null, 2);
var y = xx;
