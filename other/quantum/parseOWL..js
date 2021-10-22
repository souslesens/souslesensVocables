var fs = require("fs");
const async = require("async");
var sax = require("sax");

var distinctTags = {};
var parseOWL = {
    parse: function (sourcePath, options, callback) {
        function toShortURI(uri) {
            //  http://ltts.org/GS_EP_DEV_002_003_Appendix_5_Rev3.owl#
            if (uri.indexOf("GS_EP_DEV") > 0) return "http://QUANTUM#" + uri.substring(54);
            else return uri;
        }

        var saxStream = sax.createStream(false);
        var topParentTag;
        var triples = "";
        var currentTriple = "";
        var currentUri = "";
        saxStream.on("error", function (e) {
            console.error("error!", e);
            // clear the error
            this._parser.error = null;
            this._parser.resume();
        });

        saxStream.on("opentag", function (node) {
            var x = node;
            if (!distinctTags[node.name]) distinctTags[node.name] = 1;
            else distinctTags[node.name] += 1;

            if (topParentTag == "SUBCLASSOF") {
                if (node.name == "CLASS") {
                    if (currentTriple == "")
                        currentTriple += "<" + toShortURI(node.attributes["IRI"]) + ">";
                    else {
                        currentTriple +=
                            " rdfs:subclassOf <" + toShortURI(node.attributes["IRI"]) + ">.\n";
                        //  console.log(currentTriple)
                        //   triples+=currentTriple
                        currentTriple = "";
                        topParentTag = null;
                    }
                }
            }
            if (topParentTag == "CLASSASSERTION") {
                if (node.name == "CLASS") {
                    if (currentTriple == "")
                        currentTriple += "<" + toShortURI(node.attributes["IRI"]) + ">";
                } else if (node.name == "NAMEDINDIVIDUAL") {
                    currentTriple =
                        "<" +
                        toShortURI(node.attributes["IRI"]) +
                        "> rdf:type " +
                        currentTriple +
                        ".\n";
                    //  console.log(currentTriple)
                    //  triples+=currentTriple
                    currentTriple = "";
                    topParentTag = null;
                }
            }

            if (topParentTag == "DATAPROPERTYDOMAIN") {
                if (node.name == "DATAPROPERTY") {
                    currentUri = "<" + toShortURI(node.attributes["IRI"]) + ">";
                    //  triples += currentUri +" rdf:type owl:DatatypeProperty.\n ";
                } else if (node.name == "CLASS") {
                    currentTriple =
                        currentUri + " rdfs:domain <" + toShortURI(node.attributes["IRI"]) + ">.\n";
                    //   triples += currentTriple;
                    topParentTag = null;
                }
            }

            if (topParentTag == "DATAPROPERTYRANGE") {
                if (node.name == "DATATYPE") {
                    //   triples += currentUri + " rdfs:range <" + node.attributes["IRI"] + ">.\n";
                    currentTriple = "";
                    currentUri = "";
                    topParentTag = null;
                }
            }
            if (topParentTag == "OBJECTPROPERTYDOMAIN") {
                if (node.name == "OBJECTPROPERTY") {
                    currentUri = "<" + toShortURI(node.attributes["IRI"]) + ">";
                    triples += currentUri + " rdf:type owl:ObjectProperty.\n ";
                } else if (node.name == "CLASS") {
                    currentTriple =
                        currentUri + " rdfs:domain <" + toShortURI(node.attributes["IRI"]) + ">.\n";
                    triples += currentTriple;
                    topParentTag = null;
                }
            }

            if (topParentTag == "OBJECTPROPERTYRANGE") {
                if (node.name == "CLASS") {
                    triples += currentUri + " rdfs:range <" + node.attributes["IRI"] + ">.\n";
                    currentTriple = "";
                    currentUri = "";
                    topParentTag = null;
                }
            }

            if (node.name == "SUBCLASSOF") {
                currentTriple = "";
                topParentTag = node.name;
            }

            if (node.name == "CLASSASSERTION") {
                currentTriple = "";
                topParentTag = node.name;
            }
            if (node.name == "DATAPROPERTYDOMAIN") {
                currentTriple = "";
                topParentTag = node.name;
            }
            if (node.name == "DATAPROPERTYRANGE") {
                currentTriple = "";
                topParentTag = node.name;
            }
            if (node.name == "OBJECTPROPERTYDOMAIN") {
                currentTriple = "";
                topParentTag = node.name;
            }
            if (node.name == "OBJECTPROPERTYRANGE") {
                currentTriple = "";
                topParentTag = node.name;
            }
        });

        saxStream.on("text", function (text) {});

        saxStream.on("closetag", function (node) {});
        saxStream.on("end", function (node) {
            fs.writeFileSync("D:\\NLP\\ontologies\\quantum\\triples.nt", triples);
            //console.log(JSON.stringify(triples, null, 2))
        });

        fs.createReadStream(sourcePath).pipe(saxStream);
    },
};

module.exports = parseOWL;

parseOWL.parse("C:\\Users\\claud\\Downloads\\GS_EP_DEV_002_003_Appendix_5_Rev3.owl");
