var $rdf = require("rdflib");
var rdfData = "";

var R2RMLTripleBuilder = {

    generateRDFDataFromR2RML: function (r2rmlMapping) {
        // Validate R2RML mapping using rdflib

        var rdfGraph = $rdf.graph();
        try {
            $rdf.parse(r2rmlMapping, rdfGraph, "<baseURI>", "text/turtle");
            // If the parsing is successful, the R2RML mapping is valid
        } catch (error) {
            // If the parsing fails, the R2RML mapping is invalid
            console.error("Error validating R2RML mapping:", error);
            return null; // You can return null or throw an error as per your preference
    }
       

        // Parse the R2RML mapping as RDF using rdflib
        $rdf.parse(r2rmlMapping, rdfGraph, "", "text/turtle");
    
        // Serialize the RDF graph to RDF/XML format
        var rdfData = $rdf.serialize(null, rdfGraph, "", "application/rdf+xml");
    
        // Return the generated RDF data
        return rdfData;

 
},

    saveRDFDataAsFile: function (rdfData) {
        // Convert the RDF data to a Blob
        var blob = new Blob([rdfData], { type: "application/rdf+xml" });

        // Create a download link element
        var downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = "rdf_data.rdf"; // Set the file name
        downloadLink.click(); // Trigger the download link
 
        // Clean up the download link
        setTimeout(function() {
            URL.revokeObjectURL(downloadLink.href);
            document.body.removeChild(downloadLink);
        }, 0);
},

};
module.exports = R2RMLTripleBuilder;

