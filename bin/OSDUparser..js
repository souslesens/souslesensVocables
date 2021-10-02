var fs = require("fs");
const async = require("async");
var sax = require("sax");

var saxStream = sax.createStream(false);
var topParentTag;
var triples = "";
var currentTriple = "";
var currentUri = "";

var line = 0



var currentParent;

var sourcePath = "D:\\NLP\\ontologies\\OSDU\\OSDU.xmi"

saxStream.on("error", function (e) {
    console.error("error!", e);
    // clear the error
    this._parser.error = null;
    this._parser.resume();
});

var json={classes:[],generalizations:[]}
saxStream.on("opentag", function (node) {
    line++
    //  console.log(node.name)
    var name = node.attributes["NAME"]
    var id = node.attributes["XMI.ID"]



    if (node.name == "UML:CLASS") {
       // console.log("Class" + name)
        currentParent = {type: "CLASS", name: name, id: id, attributes:[]}

    }



    if(node.name=="UML:ATTRIBUTE" && currentParent.type=="CLASS"){
        var attrId = node.attributes["id"]
        currentParent.attributes.push({name:name,id:attrId})
    }
    if(node.name=="UML:GENERALIZATION" ){
        var id= node.attributes["id"]
        currentParent = {type: "GENERALIZATION", id: id, attributes:[]}

     //   console.log("Class" + name)
    }
    if(currentParent && currentParent.type=="GENERALIZATION" && node.name=="UML:TAGGEDVALUE" ) {
        var tag=node.attributes["TAG"]
        var value=node.attributes["VALUE"]
        if( tag=="ea_sourceName")
        currentParent.source=value;
        if( tag=="ea_targetName")
            currentParent.target=value;


    }
});

saxStream.on("text", function (text) {
});

saxStream.on("closetag", function (node) {
   // var name = node.attributes["NAME"]
    if(node=="UML:CLASS"){
        json.classes.push(currentParent)
        currentParent=null;
    }
    if(node=="UML:GENERALIZATION"){
        json.generalizations.push(currentParent)
        currentParent=null;
    }

});
saxStream.on("end", function (node) {
 fs.writeFileSync(sourcePath+".json",JSON.stringify(json,null,2))
});



fs.createReadStream(sourcePath).pipe(saxStream);