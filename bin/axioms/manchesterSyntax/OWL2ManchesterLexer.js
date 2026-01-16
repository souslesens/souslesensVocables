// Generated from parser/OWL2Manchester.g4 by ANTLR 4.13.1
// jshint ignore: start
// import * as antlr4 from 'antlr4';

import * as antlr4 from 'antlr4';

const serializedATN = [
    4, 0, 17, 115, 6, -1, 2, 0, 7, 0, 2, 1, 7, 1, 2, 2, 7, 2, 2, 3, 7, 3, 2, 4, 7, 4, 2, 5, 7, 5, 2, 6, 7, 6, 2, 7, 7, 7, 2, 8, 7, 8, 2, 9, 7, 9, 2, 10, 7, 10, 2, 11, 7, 11, 2, 12, 7, 12, 2, 13, 7,
    13, 2, 14, 7, 14, 2, 15, 7, 15, 2, 16, 7, 16, 1, 0, 1, 0, 1, 1, 4, 1, 39, 8, 1, 11, 1, 12, 1, 40, 1, 2, 1, 2, 1, 2, 1, 2, 1, 3, 1, 3, 1, 3, 1, 4, 1, 4, 1, 4, 1, 4, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1,
    6, 1, 6, 1, 6, 1, 6, 1, 6, 1, 7, 1, 7, 1, 7, 1, 7, 1, 7, 1, 7, 1, 8, 1, 8, 1, 8, 1, 8, 1, 9, 1, 9, 1, 9, 1, 9, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 10, 1, 11, 1, 11, 1, 11, 1, 11,
    1, 11, 1, 12, 1, 12, 5, 12, 93, 8, 12, 10, 12, 12, 12, 96, 9, 12, 1, 13, 1, 13, 5, 13, 100, 8, 13, 10, 13, 12, 13, 103, 9, 13, 1, 14, 4, 14, 106, 8, 14, 11, 14, 12, 14, 107, 1, 14, 1, 14, 1, 15,
    1, 15, 1, 16, 1, 16, 0, 0, 17, 1, 1, 3, 2, 5, 3, 7, 4, 9, 5, 11, 6, 13, 7, 15, 8, 17, 9, 19, 10, 21, 11, 23, 12, 25, 13, 27, 14, 29, 15, 31, 16, 33, 17, 1, 0, 4, 1, 0, 48, 57, 4, 0, 48, 57, 65,
    90, 95, 95, 97, 122, 2, 0, 65, 90, 97, 122, 3, 0, 9, 10, 13, 13, 32, 32, 118, 0, 1, 1, 0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 5, 1, 0, 0, 0, 0, 7, 1, 0, 0, 0, 0, 9, 1, 0, 0, 0, 0, 11, 1, 0, 0, 0, 0, 13, 1,
    0, 0, 0, 0, 15, 1, 0, 0, 0, 0, 17, 1, 0, 0, 0, 0, 19, 1, 0, 0, 0, 0, 21, 1, 0, 0, 0, 0, 23, 1, 0, 0, 0, 0, 25, 1, 0, 0, 0, 0, 27, 1, 0, 0, 0, 0, 29, 1, 0, 0, 0, 0, 31, 1, 0, 0, 0, 0, 33, 1, 0, 0,
    0, 1, 35, 1, 0, 0, 0, 3, 38, 1, 0, 0, 0, 5, 42, 1, 0, 0, 0, 7, 46, 1, 0, 0, 0, 9, 49, 1, 0, 0, 0, 11, 53, 1, 0, 0, 0, 13, 58, 1, 0, 0, 0, 15, 63, 1, 0, 0, 0, 17, 69, 1, 0, 0, 0, 19, 73, 1, 0, 0,
    0, 21, 77, 1, 0, 0, 0, 23, 85, 1, 0, 0, 0, 25, 90, 1, 0, 0, 0, 27, 97, 1, 0, 0, 0, 29, 105, 1, 0, 0, 0, 31, 111, 1, 0, 0, 0, 33, 113, 1, 0, 0, 0, 35, 36, 7, 0, 0, 0, 36, 2, 1, 0, 0, 0, 37, 39, 3,
    1, 0, 0, 38, 37, 1, 0, 0, 0, 39, 40, 1, 0, 0, 0, 40, 38, 1, 0, 0, 0, 40, 41, 1, 0, 0, 0, 41, 4, 1, 0, 0, 0, 42, 43, 5, 97, 0, 0, 43, 44, 5, 110, 0, 0, 44, 45, 5, 100, 0, 0, 45, 6, 1, 0, 0, 0, 46,
    47, 5, 111, 0, 0, 47, 48, 5, 114, 0, 0, 48, 8, 1, 0, 0, 0, 49, 50, 5, 110, 0, 0, 50, 51, 5, 111, 0, 0, 51, 52, 5, 116, 0, 0, 52, 10, 1, 0, 0, 0, 53, 54, 5, 115, 0, 0, 54, 55, 5, 111, 0, 0, 55, 56,
    5, 109, 0, 0, 56, 57, 5, 101, 0, 0, 57, 12, 1, 0, 0, 0, 58, 59, 5, 111, 0, 0, 59, 60, 5, 110, 0, 0, 60, 61, 5, 108, 0, 0, 61, 62, 5, 121, 0, 0, 62, 14, 1, 0, 0, 0, 63, 64, 5, 118, 0, 0, 64, 65, 5,
    97, 0, 0, 65, 66, 5, 108, 0, 0, 66, 67, 5, 117, 0, 0, 67, 68, 5, 101, 0, 0, 68, 16, 1, 0, 0, 0, 69, 70, 5, 109, 0, 0, 70, 71, 5, 105, 0, 0, 71, 72, 5, 110, 0, 0, 72, 18, 1, 0, 0, 0, 73, 74, 5,
    109, 0, 0, 74, 75, 5, 97, 0, 0, 75, 76, 5, 120, 0, 0, 76, 20, 1, 0, 0, 0, 77, 78, 5, 101, 0, 0, 78, 79, 5, 120, 0, 0, 79, 80, 5, 97, 0, 0, 80, 81, 5, 99, 0, 0, 81, 82, 5, 116, 0, 0, 82, 83, 5,
    108, 0, 0, 83, 84, 5, 121, 0, 0, 84, 22, 1, 0, 0, 0, 85, 86, 5, 115, 0, 0, 86, 87, 5, 101, 0, 0, 87, 88, 5, 108, 0, 0, 88, 89, 5, 102, 0, 0, 89, 24, 1, 0, 0, 0, 90, 94, 5, 95, 0, 0, 91, 93, 7, 1,
    0, 0, 92, 91, 1, 0, 0, 0, 93, 96, 1, 0, 0, 0, 94, 92, 1, 0, 0, 0, 94, 95, 1, 0, 0, 0, 95, 26, 1, 0, 0, 0, 96, 94, 1, 0, 0, 0, 97, 101, 7, 2, 0, 0, 98, 100, 7, 1, 0, 0, 99, 98, 1, 0, 0, 0, 100,
    103, 1, 0, 0, 0, 101, 99, 1, 0, 0, 0, 101, 102, 1, 0, 0, 0, 102, 28, 1, 0, 0, 0, 103, 101, 1, 0, 0, 0, 104, 106, 7, 3, 0, 0, 105, 104, 1, 0, 0, 0, 106, 107, 1, 0, 0, 0, 107, 105, 1, 0, 0, 0, 107,
    108, 1, 0, 0, 0, 108, 109, 1, 0, 0, 0, 109, 110, 6, 14, 0, 0, 110, 30, 1, 0, 0, 0, 111, 112, 5, 40, 0, 0, 112, 32, 1, 0, 0, 0, 113, 114, 5, 41, 0, 0, 114, 34, 1, 0, 0, 0, 5, 0, 40, 94, 101, 107,
    1, 6, 0, 0,
];

const atn = new antlr4.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map((ds, index) => new antlr4.DFA(ds, index));

class OWL2ManchesterLexer extends antlr4.Lexer {
    static grammarFileName = "OWL2Manchester.g4";
    static channelNames = ["DEFAULT_TOKEN_CHANNEL", "HIDDEN"];
    static modeNames = ["DEFAULT_MODE"];
    static literalNames = [null, null, null, "'and'", "'or'", "'not'", "'some'", "'only'", "'value'", "'min'", "'max'", "'exactly'", "'self'", null, null, null, "'('", "')'"];
    static symbolicNames = [null, "DIGIT", "NONNEGATIVEINTEGER", "AND", "OR", "NOT", "SOME", "ONLY", "VALUE", "MIN", "MAX", "EXACTLY", "SELF", "CONCEPT", "OBJECT_PROPERTY", "WS", "LPAREN", "RPAREN"];
    static ruleNames = ["DIGIT", "NONNEGATIVEINTEGER", "AND", "OR", "NOT", "SOME", "ONLY", "VALUE", "MIN", "MAX", "EXACTLY", "SELF", "CONCEPT", "OBJECT_PROPERTY", "WS", "LPAREN", "RPAREN"];

    constructor(input) {
        super(input);
        this._interp = new antlr4.LexerATNSimulator(this, atn, decisionsToDFA, new antlr4.PredictionContextCache());
    }
}

OWL2ManchesterLexer.EOF = antlr4.Token.EOF;
OWL2ManchesterLexer.DIGIT = 1;
OWL2ManchesterLexer.NONNEGATIVEINTEGER = 2;
OWL2ManchesterLexer.AND = 3;
OWL2ManchesterLexer.OR = 4;
OWL2ManchesterLexer.NOT = 5;
OWL2ManchesterLexer.SOME = 6;
OWL2ManchesterLexer.ONLY = 7;
OWL2ManchesterLexer.VALUE = 8;
OWL2ManchesterLexer.MIN = 9;
OWL2ManchesterLexer.MAX = 10;
OWL2ManchesterLexer.EXACTLY = 11;
OWL2ManchesterLexer.SELF = 12;
OWL2ManchesterLexer.CONCEPT = 13;
OWL2ManchesterLexer.OBJECT_PROPERTY = 14;
OWL2ManchesterLexer.WS = 15;
OWL2ManchesterLexer.LPAREN = 16;
OWL2ManchesterLexer.RPAREN = 17;

export default OWL2ManchesterLexer;