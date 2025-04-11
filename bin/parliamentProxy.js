var request = require("request");


var Parliament={

    post:function(params,callback) {


        var url = "http://51.178.39.209:8089/parliament/sparql";
        var headers = {
            "Content-Type": "application/sparql-results+json; charset=utf-8",
            accept: "application/json"
        }

        var formData = {
            query: "%0D%0APREFIX+afn%3A+%3Chttp%3A%2F%2Fjena.hpl.hp.com%2FARQ%2Ffunction%23%3E%0D%0APREFIX+dc%3A+%3Chttp%3A%2F%2Fpurl.org%2Fdc%2Felements%2F1.1%2F%3E%0D%0APREFIX+dul%3A+%3Chttp%3A%2F%2Fwww.loa-cnr.it%2Fontologies%2FDUL.owl%23%3E%0D%0APREFIX+fn%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2005%2Fxpath-functions%23%3E%0D%0APREFIX+geo%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fgeosparql%23%3E%0D%0APREFIX+geof%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Fdef%2Ffunction%2Fgeosparql%2F%3E%0D%0APREFIX+geor%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Fdef%2Frule%2Fgeosparql%2F%3E%0D%0APREFIX+gml%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fgml%23%3E%0D%0APREFIX+ja%3A+%3Chttp%3A%2F%2Fjena.hpl.hp.com%2F2005%2F11%2FAssembler%23%3E%0D%0APREFIX+ogc%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2F%3E%0D%0APREFIX+owl%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2002%2F07%2Fowl%23%3E%0D%0APREFIX+par%3A+%3Chttp%3A%2F%2Fparliament.semwebcentral.org%2Fparliament%23%3E%0D%0APREFIX+par-fxn%3A+%3Chttp%3A%2F%2Fparliament.semwebcentral.org%2Fpfunction%23%3E%0D%0APREFIX+pt%3A+%3Chttp%3A%2F%2Fbbn.com%2FParliamentTime%23%3E%0D%0APREFIX+rdf%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%3E%0D%0APREFIX+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0D%0APREFIX+rss%3A+%3Chttp%3A%2F%2Fpurl.org%2Frss%2F1.0%2F%3E%0D%0APREFIX+sf%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fsf%23%3E%0D%0APREFIX+skos%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2004%2F02%2Fskos%2Fcore%23%3E%0D%0APREFIX+ssn%3A+%3Chttp%3A%2F%2Fpurl.oclc.org%2FNET%2Fssnx%2Fssn%23%3E%0D%0APREFIX+time%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2006%2Ftime%23%3E%0D%0APREFIX+uom%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Fdef%2Fuom%2FOGC%2F1.0%2F%3E%0D%0APREFIX+vcard%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2Fvcard-rdf%2F3.0%23%3E%0D%0APREFIX+xml%3A+%3Chttp%3A%2F%2Fwww.w3.org%2FXML%2F1998%2Fnamespace%3E%0D%0APREFIX+xsd%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema%23%3E%0D%0A%0D%0A%0D%0ASELECT+*+%0D%0Awhere+%7B%3Fs+%3Fp+%3Fo%7D%0D%0A+limit+100%0D%0A",

            display: "json",
            output: "json"
        }

        var options={
            url:url,
            headers:headers,
            form:formData
        }


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