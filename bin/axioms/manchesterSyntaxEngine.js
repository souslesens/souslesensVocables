const autosuggest = require("antlr4-autosuggest");
const OWL2ManchesterParser = require("./manchesterSyntax/OWL2ManchesterParser.js");
const OWL2ManchesterLexer = require("./manchesterSyntax/OWL2ManchesterLexer.js");
const antlr4 = require("antlr4");

//const MyErrorListener=require("./manchesterSyntax/myErroListener.js")

//import OWL2ManchesterListener from './manchesterSyntax/OWL2ManchesterListener.

/*
import autosuggest from "antlr4-autosuggest";
import OWL2ManchesterParser from "./manchesterSyntax/OWL2ManchesterParser.js";
import OWL2ManchesterLexer from "./manchesterSyntax/OWL2ManchesterLexer.js";
//import OWL2ManchesterListener from './manchesterSyntax/OWL2ManchesterListener.js';*/

const ManchesterSyntaxEngine = {
    getSuggestion: function (axiomText, options, callback) {
        const autosuggester = autosuggest.autosuggester(OWL2ManchesterLexer, OWL2ManchesterParser);
        try {
            let suggestions = autosuggester.autosuggest(axiomText);
            /*    console.log("axiomText: ", axiomText);
            console.log("suggestions: ", suggestions);*/
            callback(null, suggestions);
        } catch (err) {
            console.log(err);
            callback(err);
        }
    },

    validateAxiom: function (axiomText, callback) {
        // Replace spaces within single-quoted strings with underscores and remove quotes
        const modifiedInput = axiomText.replace(/'([^']+?)'/g, (match, p1) => {
            // Remove spaces and replace them with underscores
            const modifiedName = p1.replace(/\s+/g, "_");
            return modifiedName;
        });

        // Create an ANTLR input stream
        const inputStream = new antlr4.InputStream(modifiedInput);

        // Create a lexer
        const lexer = new OWL2ManchesterLexer(inputStream);

        // Create a token stream//
        const tokenStream = new antlr4.CommonTokenStream(lexer);

        // Create a parser
        const parser = new OWL2ManchesterParser(tokenStream);

        parser.removeErrorListeners();
        /*   const errorListener = new MyErrorListener();
        parser.addErrorListener(new MyErrorListener());*/

        const parseTree = parser.axiom();

        if (parser._syntaxErrors > 0) {
            console.error("Number of syntax errors: ", parser._syntaxErrors);
            //console.error(parser.parserError.toString());

            return callback("syntax not valid :" + parser._syntaxErrors);
        } else {
            //console.log("parsing successful");
            return callback(null, "OK");
        }
    },
};

module.exports = ManchesterSyntaxEngine;
//export default ManchesterSyntaxEngine;
