import autosuggest from "antlr4-autosuggest";
//import antlr4, { ParseTreeVisitor, ParseTreeWalker } from 'antlr4';
import OWL2ManchesterParser from "./manchesterSyntax/OWL2ManchesterParser.js";
import OWL2ManchesterLexer from "./manchesterSyntax/OWL2ManchesterLexer.js";
//import OWL2ManchesterListener from './manchesterSyntax/OWL2ManchesterListener.js';


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