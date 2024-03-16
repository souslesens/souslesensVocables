const autosuggest =require( "antlr4-autosuggest");
const OWL2ManchesterParser= require("./manchesterSyntax/OWL2ManchesterParser.js");
const OWL2ManchesterLexer= require( "./manchesterSyntax/OWL2ManchesterLexer.js");



const ManchesterSyntaxEngine = {


    getSuggestion: function(source, lastToken, options, callback) {
        const autosuggester = autosuggest.autosuggester(OWL2ManchesterLexer, OWL2ManchesterParser);
        try {
            let suggestions = autosuggester.autosuggest(owlInput);
            console.log("suggestions: ", suggestions);
            callback(null, suggestions);
        } catch (err) {
            callback(err);
        }


    }


};

module.exports = ManchesterSyntaxEngine;