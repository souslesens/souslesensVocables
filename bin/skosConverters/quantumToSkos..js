var fs = require('fs');
var async = require('async')


var generateRdf = function (entitiesArray) {


    console.log(entitiesArray.length);
    var stats = {}
    async.eachSeries(["all"], function (scheme, callbackSeries) {
        //   async.eachSeries(tulsaToSkos.topConcepts, function (scheme, callbackSeries) {


        //  var scheme = "all"
        var str = "";
        str += "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n" +
            "<rdf:RDF xmlns:skos=\"http://www.w3.org/2004/02/skos/core#\"  xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">"

        str += "<skos:ConceptScheme rdf:about='http://PetroleumAbstractsThesaurus/" + scheme + "'>"
        str += "  <skos:prefLabel xml:lang='en'>" + scheme + "</skos:prefLabel>"
        str += "</skos:ConceptScheme>";


        entitiesArray.forEach(function (entity, index) {


            if (!entity.inScheme) {
                if (!stats["noScheme"])
                    stats["noScheme"] = 0
                stats["noScheme"] += 1
            } else {
                if (!stats[entity.inScheme])
                    stats[entity.inScheme] = 0
                stats[entity.inScheme] += 1
            }


            if (scheme == "all") {
                if (!entity.inScheme)
                    return;
            } else {

                if (entity.inScheme != scheme)
                    return;
            }


            str += "<skos:Concept rdf:about='http://PetroleumAbstractsThesaurus/" + entity.prefLabel + "'>\n"
            str += "  <skos:inScheme rdf:resource='http://PetroleumAbstractsThesaurus/" + entity.inScheme + "'/>\n"

            str += "  <skos:prefLabel xml:lang='en'>" + entity.prefLabel + "</skos:prefLabel>\n"

            entity.altLabels.forEach(function (altLabel) {
                str += "  <skos:altLabel xml:lang='en'>" + altLabel.replace(/&/g, " ") + "</skos:altLabel>\n"
            })

            if (entity.broader)
                str += "  <skos:broader rdf:resource='http://PetroleumAbstractsThesaurus/" + entity.broader + "'/>\n"

            if (entity.relateds) {
                entity.relateds.forEach(function (related) {
                    str += "  <skos:related rdf:resource='http://PetroleumAbstractsThesaurus/" + related + "'/>\n"
                })
            }
            str += "</skos:Concept>\n"

        })
        str += "</rdf:RDF>"


        fs.writeFileSync("D:\\NLP\\quantum_F_" + scheme + ".rdf", str);
        return callbackSeries();

    }, function (err) {
        console.log("done")

        console.log(JSON.stringify(stats, null, 2))
    })


}


var quantumPath = "D:\\NLP\\quantum\\quantum_functional.txt"

var data = "" + fs.readFileSync(quantumPath);
var lines = data.split("\n")
//ID	Name	FunctionalClass_Hierarchy_Output	synonyms	Definition


var entities = []
lines.forEach(function (line, index) {
    line = xmlEncode(line)
    if (index == 0)
        return;

    var cols = line.split("\t");
    if (cols.length != 5)
        return;
    var ancestors = cols[2].split("|");

    var parent = ancestors[ancestors.length - 2]
    var grandparent = ancestors[ancestors.length - 3]
    if(!grandparent ||grandparent=="")
       // return;
    if (parent) {
        if (parent == "")
            return;
        if (parent == "Root")
            parent = null;
        else
            parent = parent.trim();
    }

    var scheme = null;
   // if (ancestors[1])
        scheme = "quantum_F"

    var synsArray = cols[3].split("|");
    var syns = [];
    synsArray.forEach(function (syn) {
        if (syn == "")
            return;
        if (syns.indexOf(syn) < 0)
            syns.push(syn)
    })

    function xmlEncode(str) {
        str = str.replace(/[',\&/<>=\(\)]/g, " ")
        return str
    }

    var entity = {
        prefLabel: cols[1],
        id: cols[0],
        altLabels: syns,
        broader: parent,
        inScheme: scheme

    }
    entities.push(entity)

})

if(false) {
    var dir="D:\\\\NLP\\\\cgi\\\\";
 //   var dir="D:\\\\NLP\\\\";
    var dirs = fs.readdirSync(dir);
    dirs.forEach(function (file) {
        if (file.indexOf(".rdf") > -1)
            console.log("\"" + dir+file + "\",")
    })
}
generateRdf(entities)
var x = entities


