const autosuggest =require( "antlr4-autosuggest");
const OWL2ManchesterParser =require( "./manchesterSyntax/OWL2ManchesterParser.js");
const OWL2ManchesterLexer =require( "./manchesterSyntax/OWL2ManchesterLexer.js");


//import OWL2ManchesterListener from './manchesterSyntax/OWL2ManchesterListener.


/*
import autosuggest from "antlr4-autosuggest";
import OWL2ManchesterParser from "./manchesterSyntax/OWL2ManchesterParser.js";
import OWL2ManchesterLexer from "./manchesterSyntax/OWL2ManchesterLexer.js";
//import OWL2ManchesterListener from './manchesterSyntax/OWL2ManchesterListener.js';*/


const ManchesterSyntaxEngine = {


    getSuggestion: function(source, lastToken, options, callback) {


        const autosuggester = autosuggest.autosuggester(OWL2ManchesterLexer, OWL2ManchesterParser);
        try {
            let suggestions = autosuggester.autosuggest(lastToken);
            console.log("lastToken: ", lastToken);
            console.log("suggestions: ", suggestions);
            callback(null, suggestions);
        } catch (err) {
            console.log(err)
            callback(err);
        }


    }


};

module.exports = ManchesterSyntaxEngine;
//export default ManchesterSyntaxEngine;