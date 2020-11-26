var fs = require("fs")
var DOMParser = require('xmldom').DOMParser;
var skoReader = require("../backoffice/skosReader..js");
var async = require('async');

var xsdToSkos = {





    xsdElementsTree: function (xsdPath, options, callback) {


        function formatString(str,options) {
            if (!str.replace)
                var x = 3

            str = str.replace(/"/gm, "\\\"")
            str = str.replace(/;/gm, " ")
            str = str.replace(/\n/gm, "\\\\n")
            str = str.replace(/\r/gm, "")
            str = str.replace(/\t/gm, " ")
            str = str.replace(/\(/gm, "-")
            str = str.replace(/\)/gm, "-")
            str = str.replace(/\\xa0/gm, " ")

            if(options && options.replaceSpaces)
                str=str.replace(/\s/g,"_")
            return str;
        }


        var maxRecurseLevels = 60;
        var p = xsdPath.lastIndexOf("\\");
        var q = xsdPath.lastIndexOf(".");
        var rootEltName = xsdPath.substring(p + 1, q);
        var str = "" + fs.readFileSync(xsdPath);
        var fileTitle = xsdPath.substring(xsdPath.lastIndexOf("\\") + 1, xsdPath.lastIndexOf("."))
        var doc = new DOMParser().parseFromString(str, 'text/xml');
        if(!doc || !doc.documentElement)
            var x=3;
        var schema = doc.documentElement.getElementsByTagName("xs:schema");
        schema = schema._node;
        var strElements = "";
        var graphURI = options.graphURI;
        function recurseElements(node, parentId) {
            if (node.tagName && node.tagName == "xs:schema") {
              /*  var name = node.getAttribute("name");
                strElements += "<" + graphURI + name + ">" + " <http://www.w3.org/2004/02/skos/core#prefLabel> \"" +name+"\".\n";
                strElements += "<" + graphURI + name + ">" + " <http://www.w3.org/2004/02/skos/core#broader> " + parentId + ".\n";
                parentId = "<" + graphURI + name + ">"*/

            }

            if (node.tagName && node.tagName == "xs:complexType") {
                var name = node.getAttribute("name");
                strElements += "<" + graphURI + name + ">" + " <http://www.w3.org/2004/02/skos/core#prefLabel> \"" +name+"\".\n";
                strElements += "<" + graphURI + name + ">" + " <http://www.w3.org/2004/02/skos/core#broader> " + parentId + ".\n";
                parentId = "<" + graphURI + name + ">"

            }
            if (node.tagName && node.tagName == "xs:sequence") {

            }
            if (node.tagName && node.tagName == "xs:simpleType") {
                var name = node.getAttribute("name");
                strElements += "<" + graphURI + name + ">" + " <http://www.w3.org/2004/02/skos/core#prefLabel> \"" +name+"\".\n";
                strElements += "<" + graphURI + name + ">" + " <http://www.w3.org/2004/02/skos/core#broader> " + parentId + ".\n";
                parentId = "<" + graphURI + name + ">"

            }


            http://www.w3.org/2002/07/owl#oneOf

                if (node.tagName && node.tagName == "xs:restriction") {
                    parentId = "<" + graphURI + node.parentNode.getAttribute("name") + ">"


                }
            if (node.tagName && node.tagName == "xs:enumeration") {
                var value = node.getAttribute("value");
                strElements += parentId + " <http://schema.org/ListItem> \"" + formatString(value) + "\" .\n";
                strElements += "<" + graphURI+ formatString(value,{replaceSpaces:1}) + ">" + " <http://www.w3.org/2004/02/skos/core#prefLabel> \"" +formatString(value)+"\".\n";
                strElements += "<"+ graphURI+  formatString(value,{replaceSpaces:1})  + ">" + " <http://www.w3.org/2004/02/skos/core#broader> " + parentId + ".\n";

            }


            if (node.tagName && node.tagName == "xs:element") {
                var name = node.getAttribute("name");
                strElements += "<" + graphURI + name + ">" + " <http://www.w3.org/2004/02/skos/core#prefLabel> \"" +name+"\".\n";
                strElements += "<" + graphURI + name + ">" + " <http://www.w3.org/2004/02/skos/core#broader> " + parentId + ".\n";
                parentId = "<" + graphURI + name + ">"

                var typeId = "<" + graphURI + node.getAttribute("type") + ">";
                strElements += parentId + " <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> \"" + typeId + "\" .\n"
            }


            if (node.tagName && node.tagName == "xs:annotation") {
                var name = node.getAttribute("name");
                var definition = node.getElementsByTagName("xs:documentation").item(0).childNodes.item(0).data;
                definition = formatString(definition);

                if (node.parentNode.tagName == "xs:enumeration") {
                    var enumName = node.parentNode.parentNode.parentNode.getAttribute("name") + "/" + node.parentNode.getAttribute("value")
                    strElements += "<" + graphURI + "enumeration/" + formatString(enumName,{replaceSpaces:1}) + ">" + " <http://www.w3.org/2004/02/skos/core#definition> \"" + definition + "\".\n";
                } else if(node.parentNode.tagName == "xs:schema") {
                    strElements +=parentId+ " <http://www.w3.org/2004/02/skos/core#definition> \"" + definition + "\".\n";

                }else{
                    var parentName =  node.parentNode.getAttribute("name");
                    if (parentName == "")
                        parentName = node.parentNode.parentNode.getAttribute("name");
                    if (parentName == "")
                        parentName =  node.parentNode.parentNode.parentNode.getAttribute("name");
                    if (parentName == "")
                        var x = 3
                    parentId = "<" + graphURI + parentName + ">";

                    strElements += parentId + " <http://www.w3.org/2004/02/skos/core#definition> \"" + definition + "\" .\n"
                }
                //   strElements += "<http://www.w3.org/2004/02/skos/core#definition>"
            }
            if (node.childNodes) {
                for (var i = 0; i < node.childNodes.length; i++) {

                    var child = node.childNodes.item(i);
                    recurseElements(child, parentId)
                }
            }
        }
        strElements +=  "<" + graphURI + fileTitle + ">" + " <http://www.w3.org/2004/02/skos/core#prefLabel> \"" +fileTitle+"\".\n";
        strElements += "<" + graphURI + fileTitle + ">" + " <http://www.w3.org/2004/02/skos/core#topConceptOf> " + "<" + graphURI+"scheme/" + options.scheme + "/>" + " .\n"
        recurseElements(schema, "<" + graphURI + fileTitle + ">")

      return callback(null,strElements)


    },




    parseXsdToSkos: function (xsdPath, options, callback) {
        if (!options)
            options = {};

        var files = [];
        var fileTitle = xsdPath.substring(xsdPath.lastIndexOf("\\") + 1);

        function recurseDir(xsdPath) {
            if (fs.lstatSync(xsdPath).isDirectory()) {
                var dirFiles = fs.readdirSync(xsdPath);
                dirFiles.forEach(function (file) {
                 if ( fs.lstatSync(xsdPath + file).isDirectory()) {
                        recurseDir(xsdPath + file+"\\")

                    }
                    else {
                        if(file.indexOf(".xsd")>-1)
                        files.push(xsdPath + file);
                    }
                })

            } else if (fs.lstatSync(xsdPath).isFile()) {
                files.push(xsdPath)
            }
        }

        recurseDir(xsdPath)


        var allElementsStr="";
        async.eachSeries(files,function (xsdFilePath, callbackEach) {

            xsdToSkos.xsdElementsTree(xsdFilePath, options, function (err, result) {
                if (err) {
                    console.log(err)
                    return callbackEach(err)
                }
                allElementsStr+=result

                callbackEach()
            })
        }, function (err) {
            if (err)
                return console.log(err);
            fs.writeFileSync("D:\\NLP\\importedResources\\energistics\\" + options.scheme + ".rdf.nt", allElementsStr)

        })



    }



}


module.exports = xsdToSkos


var xsdPath = "D:\\NLP\\importedResources\\energistics\\resqmlv2\\v2.0.1\\xsd_schemas\\";var scheme="Reservoir"
//var xsdPath = "D:\\NLP\\importedResources\\energistics\\common\\v2.1\\xsd_schemas\\";var scheme="Common"
//var xsdPath = "D:\\NLP\\importedResources\\energistics\\witsml\\v2.0\\xsd_schemas\\";var scheme="Well"
//var xsdPath = "D:\\NLP\\importedResources\\energistics\\prodml\\v2.1\\xsd_schemas\\";var scheme="Production"



var includeFiles = [""]
xsdToSkos.parseXsdToSkos(xsdPath, {scheme:scheme,graphURI:"http://www.energistics.org/energyml/data/"+scheme+"/"},function (err, result) {
    var x = err
})

//var commonEnums=xsdToSkos.getCommonEnumeration();




