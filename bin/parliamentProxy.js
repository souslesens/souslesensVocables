var request = require("request");


var Parliament={

    post:function(params,callback) {


        var url = "http://51.178.39.209:8089/parliament/sparql";
        var headers = {

           "Content-Type": "application/x-www-form-urlencoded",
            "Postman-Token": "540a963c-d583-41ef-80fd-a71f0df6f3e1",
            Host: "51.178.39.209:8089",
            "Content-Length": 2083
        }

        var formData = {
            query: "%0D%0APREFIX+afn%3A+%3Chttp%3A%2F%2Fjena.hpl.hp.com%2FARQ%2Ffunction%23%3E%0D%0APREFIX+dc%3A+%3Chttp%3A%2F%2Fpurl.org%2Fdc%2Felements%2F1.1%2F%3E%0D%0APREFIX+dul%3A+%3Chttp%3A%2F%2Fwww.loa-cnr.it%2Fontologies%2FDUL.owl%23%3E%0D%0APREFIX+fn%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2005%2Fxpath-functions%23%3E%0D%0APREFIX+geo%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fgeosparql%23%3E%0D%0APREFIX+geof%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Fdef%2Ffunction%2Fgeosparql%2F%3E%0D%0APREFIX+geor%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Fdef%2Frule%2Fgeosparql%2F%3E%0D%0APREFIX+gml%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fgml%23%3E%0D%0APREFIX+ja%3A+%3Chttp%3A%2F%2Fjena.hpl.hp.com%2F2005%2F11%2FAssembler%23%3E%0D%0APREFIX+ogc%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2F%3E%0D%0APREFIX+owl%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2002%2F07%2Fowl%23%3E%0D%0APREFIX+par%3A+%3Chttp%3A%2F%2Fparliament.semwebcentral.org%2Fparliament%23%3E%0D%0APREFIX+par-fxn%3A+%3Chttp%3A%2F%2Fparliament.semwebcentral.org%2Fpfunction%23%3E%0D%0APREFIX+pt%3A+%3Chttp%3A%2F%2Fbbn.com%2FParliamentTime%23%3E%0D%0APREFIX+rdf%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%3E%0D%0APREFIX+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0D%0APREFIX+rss%3A+%3Chttp%3A%2F%2Fpurl.org%2Frss%2F1.0%2F%3E%0D%0APREFIX+sf%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fsf%23%3E%0D%0APREFIX+skos%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2004%2F02%2Fskos%2Fcore%23%3E%0D%0APREFIX+ssn%3A+%3Chttp%3A%2F%2Fpurl.oclc.org%2FNET%2Fssnx%2Fssn%23%3E%0D%0APREFIX+time%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2006%2Ftime%23%3E%0D%0APREFIX+uom%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Fdef%2Fuom%2FOGC%2F1.0%2F%3E%0D%0APREFIX+vcard%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2Fvcard-rdf%2F3.0%23%3E%0D%0APREFIX+xml%3A+%3Chttp%3A%2F%2Fwww.w3.org%2FXML%2F1998%2Fnamespace%3E%0D%0APREFIX+xsd%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema%23%3E%0D%0A%0D%0A%0D%0ASELECT+*+%0D%0Awhere+%7B%3Fs+%3Fp+%3Fo%7D%0D%0A+limit+100%0D%0A",

            display: "json",
            output: "json"
        }

        var optionsX={
            url:url,
            headers:headers,
            form:formData,
            json: true,   // <--Very important!!!


        }




        // Import the http module
        const http = require('http');

// Create an options object
        const options = {
            hostname: '51.178.39.209',
            port: 8089,
            path: '/parliament/sparql',
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Postman-Token": "540a963c-d583-41ef-80fd-a71f0df6f3e1",
              //  Host: "51.178.39.209:8089",
            }
        };

// Create a data object
        const data = {
            query: 'PREFIX afn: <http://jena.hpl.hp.com/ARQ/function#>\n' +
                'PREFIX dc: <http://purl.org/dc/elements/1.1/>\n' +
                'PREFIX dul: <http://www.loa-cnr.it/ontologies/DUL.owl#>\n' +
                'PREFIX fn: <http://www.w3.org/2005/xpath-functions#>\n' +
                'PREFIX geo: <http://www.opengis.net/ont/geosparql#>\n' +
                'PREFIX geof: <http://www.opengis.net/def/function/geosparql/>\n' +
                'PREFIX geor: <http://www.opengis.net/def/rule/geosparql/>\n' +
                'PREFIX gml: <http://www.opengis.net/ont/gml#>\n' +
                'PREFIX ja: <http://jena.hpl.hp.com/2005/11/Assembler#>\n' +
                'PREFIX ogc: <http://www.opengis.net/>\n' +
                'PREFIX owl: <http://www.w3.org/2002/07/owl#>\n' +
                'PREFIX par: <http://parliament.semwebcentral.org/parliament#>\n' +
                'PREFIX par-fxn: <http://parliament.semwebcentral.org/pfunction#>\n' +
                'PREFIX pt: <http://bbn.com/ParliamentTime#>\n' +
                'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n' +
                'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
                'PREFIX rss: <http://purl.org/rss/1.0/>\n' +
                'PREFIX sf: <http://www.opengis.net/ont/sf#>\n' +
                'PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n' +
                'PREFIX ssn: <http://purl.oclc.org/NET/ssnx/ssn#>\n' +
                'PREFIX time: <http://www.w3.org/2006/time#>\n' +
                'PREFIX uom: <http://www.opengis.net/def/uom/OGC/1.0/>\n' +
                'PREFIX vcard: <http://www.w3.org/2001/vcard-rdf/3.0#>\n' +
                'PREFIX xml: <http://www.w3.org/XML/1998/namespace>\n' +
                'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n' +
                'SELECT * \n' +
                'where {?s ?p ?o}\n' +
                ' limit 100',
            display: "json",
            output: "json"
        };

// Stringify the data object
        const dataString = JSON.stringify(data);

// Update the options object with the data length
        options.headers['Content-Length'] = dataString.length;

// Create a request object
        const request = http.request(options, (response) => {
            // Initialize a variable to store the response data
            let data = '';

            // Listen to the data event
            response.on('data', (chunk) => {
                // Append the chunk to the data variable
                data += chunk.toString();
            });

            // Listen to the end event
            response.on('end', () => {
                // Log the status code and the headers
                console.log(`Status code: ${response.statusCode}`);
                console.log(`Headers: ${JSON.stringify(response.headers)}`);

                // Parse the data as JSON
                const post = JSON.parse(data);

                // Log the post information
                console.log(`Post ID: ${post.id}`);
                console.log(`Post Title: ${post.title}`);
                console.log(`Post Body: ${post.body}`);
                console.log(`Post User ID: ${post.userId}`);
            });

            // Listen to the error event
            response.on('error', (error) => {
                // Throw the error
                throw error;
            });
        });

// Write the data to the request object
        request.write(dataString);

// End the request object
        request.end();
return;

        request(options, function (error, response, body) {
            if (error) {
                console.log(error);
                //  console.log("HTTP_PROXY_ERROR"+JSON.stringify(error, null, 2))

            } else {
                return callback(null, body);
            }
        })








    }


}
module.exports = Parliament;

Parliament.post()