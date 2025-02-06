const {processResponse} = require("./utils");


var JsonLdSerializer=null;

var dataFactory =null;
(async () => {
     await import('jsonld-streaming-serializer').then(function(obj){
         JsonLdSerializer=obj.JsonLdSerializer
         console.log(obj.JsonLdSerializer)
    })
    dataFactory =await import('@rdfjs/data-model').then(function(obj){
       // dataFactory=obj
        console.log(obj)
    })
    // YOUR CODE HERE
})().catch(console.error)

//const JsonLdSerializer = require("jsonld-streaming-serializer").JsonLdSerializer;


module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {




        const mySerializer = new JsonLdSerializer({ space: '  ' });
        mySerializer.pipe(process.stdout);

        mySerializer.write(
            '<http://bfdfggfg1> <http://bfdfggfg2> "http://bfdfggfg3"'

        )
     /*   mySerializer.write(dataFactory.triple(
            dataFactory.namedNode('http://ex.org/s1'),
            dataFactory.namedNode('http://ex.org/p1'),
            dataFactory.namedNode('http://ex.org/o2'),
        ));*/
        mySerializer.end();

                return processResponse(res, null, {output: str});


    }


    GET.apiDoc = {
        security: [{restrictLoggedUser: []}],
        summary: "transform sls triples to rdf",
        description: "transform turtle into json triples",
        operationId: "transform turtle into json triples",
        parameters: [
            {
                name: "triples",
                description: "triples Array in sls format {subjet:xx,predicate:fff, object : dddd}",
                type: "string",
                in: "query",
                required: false,
            },

        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
    };

    return operations;
};
