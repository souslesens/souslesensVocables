var R2RMLTripleBuilder = require ('./R2RMLTripleBuilder');
var rdfData = "";

var RDFGenerator = {
    generateRDF: function () {
        // Get the R2RML mapping file from the textarea
        var r2rmlMapping = document.getElementById("r2rmlTextarea").value;

        // Generate RDF data from the R2RML mapping
        rdfData = R2RMLTripleBuilder.generateRDFDataFromR2RML(r2rmlMapping);

        // Save the RDF data as a file
        R2RMLTripleBuilder.saveRDFDataAsFile(rdfData);
},
}
module.exports = RDFGenerator;