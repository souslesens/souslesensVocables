const httpProxy=require ("../../bin/httpProxy.")
const rdfParser = require("rdf-parse").default;
const fs=require('fs')

var OneModelManager={

    refreshOntology:function(graphUri,file){








    },

   rdfXmlToNt:function(filePath){
       const textStream = require('streamify-string')(fs.readFileSync(filePath));

       rdfParser.parse(textStream, { contentType: 'text/turtle', baseIRI: '' })
           .on('data', (quad) =>{
       var objectValue;
               var subjectValue=quad.subject.value;
       var predicate = quad.predicate.value

            if(quad.subject.value.indexOf("n3-")>-1){
                subjectValue="_:b"+   quad.object.value.substring(3)
            }
            else if (quad.predicate.value == "http://www.w3.org/2004/02/skos/core#prefLabel") {
           objectValue = "'" + quad.object.value + "'"
           predicate = "http://www.w3.org/2000/01/rdf-schema#label"
       } else {
           objectValue = "<" + quad.object.value + ">"
       }
       console.log("<" + subjectValue + "> <" + predicate + "> " + objectValue + ".")
   })


           .on('error', (error) => console.error(error))
           .on('end', () => console.log('All done!'));



   }






}

module.exports=OneModelManager;

OneModelManager.rdfXmlToNt("D:\\NLP\\ontologies\\ONE MODEL\\TOTAL_OneModel4.ttl2.owl")
