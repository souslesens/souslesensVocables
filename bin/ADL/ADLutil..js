, generateRdlTriples: function () {
    var filePath = "D:\\NLP\\ontologies\\quantum\\20210107_MDM_Rev04\\mainObjectsRequirements.txt"
    var json = util.csvToJson(filePath)
    var str = ""
    var graphUri = "http://data.total.com/resource/one-model/quantum-rdl/"
    var str = ""
    var typesMap = {

        /*  "attribute": "http://data.total.com/resource/one-model/ontology#TOTAL-Attribute",
          "physicalObject": "http://standards.iso.org/iso/15926/part14/PhysicalObject",
          "functionalObject": "http://standards.iso.org/iso/15926/part14/FunctionalObject",*/
        "discipline": "http://w3id.org/readi/z018-rdl/Discipline",
        /* "requirement": "https://w3id.org/requirement-ontology/rdl/REQ_0011"*/
    }


    var jsonSlices = util.sliceArray(json, 300);
    async.eachSeries(jsonSlices, function (json, callbackEach) {
        var triples = ""
        json.forEach(function (item) {
            if (!item.id)
                return;
            var subjectUri = graphUri + item.id;


            triples += "<" + subjectUri + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <" + typesMap[item.type] + ">.\n";
            triples += "<" + subjectUri + "> <http://www.w3.org/2000/01/rdf-schema#label> '" + util.formatStringForTriple(item.label) + "'.\n";
            if (item.parent && item.parent != "")
                triples += "<" + subjectUri + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <" + graphUri + item.parent + ">.\n";


        })

        var queryCreateGraph = "with <" + graphUri + ">" +
            "insert {"
        queryCreateGraph += triples;

        queryCreateGraph += "}"

        var params = {query: queryCreateGraph}
        var options = {sparqlServerUrl: "http://51.178.139.80:8890/sparql"}

        httpProxy.post(options.sparqlServerUrl, null, params, function (err, result) {
            if (err) {
                console.log(err)
                return callbackEach(err);
            }
            console.log(JSON.stringify(result))
            return callbackEach(null)
        })
    }, function (err) {
        if (err)
            return console.log(err)
        console.log("done")
    })

}

, formatTurboGenTags: function () {

    var filePath = "D:\\NLP\\ontologies\\assets\\turbogenerator\\tagAttributeD.txt"
    var json = util.csvToJson(filePath)
    //   var cols=["ID","TagNumber","FunctionalClassID","ServiceDescription","ValidationStatus","Status","CMMSRequired"]
    var cols = ["ID", "TagId", "TAG_ref", "Tag", "AttributeID", "Attributes", "UnitOfMeasureID", "Status", "Source"]
    // ID	TAG_Ref	Tag	TagID		Attributes	AttributeID	AttributeValue	UnitOfMeasureID	Status	Source
    //  ID	Tag_ID	TAG_Ref	Tag	AttributesID	Attributes	UnitOfMeasureID	Status	Source
    var str = ""
    cols.forEach(function (col, colIndex) {
        if (colIndex > 0)
            str += "\t"
        str += col
    })
    str += "\n"

    json.forEach(function (item, index) {
        cols.forEach(function (col, colIndex) {
            if (colIndex > 0)
                str += "\t"
            str += item[col] || ""
        })
        str += "\n"


    })
    console.log(str);


}