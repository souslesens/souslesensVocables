// Generated from parser/OWL2Manchester.g4 by ANTLR 4.13.1
// jshint ignore: start
import antlr4 from 'antlr4';


const serializedATN = [4,0,8,87,6,-1,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,
7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,1,0,1,0,1,1,1,1,1,2,1,2,1,2,
1,2,1,2,1,2,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,3,1,4,1,4,1,4,1,4,
1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,4,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,
1,5,1,5,1,5,1,5,1,6,1,6,1,6,1,6,1,7,1,7,1,7,1,8,1,8,1,8,1,8,1,9,1,9,1,9,
5,9,83,8,9,10,9,12,9,86,9,9,0,0,10,1,0,3,0,5,1,7,2,9,3,11,4,13,5,15,6,17,
7,19,8,1,0,2,2,0,65,90,97,122,1,0,48,57,86,0,5,1,0,0,0,0,7,1,0,0,0,0,9,1,
0,0,0,0,11,1,0,0,0,0,13,1,0,0,0,0,15,1,0,0,0,0,17,1,0,0,0,0,19,1,0,0,0,1,
21,1,0,0,0,3,23,1,0,0,0,5,25,1,0,0,0,7,31,1,0,0,0,9,42,1,0,0,0,11,55,1,0,
0,0,13,68,1,0,0,0,15,72,1,0,0,0,17,75,1,0,0,0,19,79,1,0,0,0,21,22,7,0,0,
0,22,2,1,0,0,0,23,24,7,1,0,0,24,4,1,0,0,0,25,26,5,67,0,0,26,27,5,108,0,0,
27,28,5,97,0,0,28,29,5,115,0,0,29,30,5,115,0,0,30,6,1,0,0,0,31,32,5,83,0,
0,32,33,5,117,0,0,33,34,5,98,0,0,34,35,5,67,0,0,35,36,5,108,0,0,36,37,5,
97,0,0,37,38,5,115,0,0,38,39,5,115,0,0,39,40,5,79,0,0,40,41,5,102,0,0,41,
8,1,0,0,0,42,43,5,69,0,0,43,44,5,113,0,0,44,45,5,117,0,0,45,46,5,105,0,0,
46,47,5,118,0,0,47,48,5,97,0,0,48,49,5,108,0,0,49,50,5,101,0,0,50,51,5,110,
0,0,51,52,5,116,0,0,52,53,5,84,0,0,53,54,5,111,0,0,54,10,1,0,0,0,55,56,5,
68,0,0,56,57,5,105,0,0,57,58,5,115,0,0,58,59,5,106,0,0,59,60,5,111,0,0,60,
61,5,105,0,0,61,62,5,110,0,0,62,63,5,116,0,0,63,64,5,87,0,0,64,65,5,105,
0,0,65,66,5,116,0,0,66,67,5,104,0,0,67,12,1,0,0,0,68,69,5,97,0,0,69,70,5,
110,0,0,70,71,5,100,0,0,71,14,1,0,0,0,72,73,5,111,0,0,73,74,5,114,0,0,74,
16,1,0,0,0,75,76,5,110,0,0,76,77,5,111,0,0,77,78,5,116,0,0,78,18,1,0,0,0,
79,84,3,1,0,0,80,83,3,1,0,0,81,83,3,3,1,0,82,80,1,0,0,0,82,81,1,0,0,0,83,
86,1,0,0,0,84,82,1,0,0,0,84,85,1,0,0,0,85,20,1,0,0,0,86,84,1,0,0,0,3,0,82,
84,0];


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

export default class OWL2ManchesterLexer extends antlr4.Lexer {

    static grammarFileName = "OWL2Manchester.g4";
    static channelNames = [ "DEFAULT_TOKEN_CHANNEL", "HIDDEN" ];
	static modeNames = [ "DEFAULT_MODE" ];
	static literalNames = [ null, "'Class'", "'SubClassOf'", "'EquivalentTo'", 
                         "'DisjointWith'", "'and'", "'or'", "'not'" ];
	static symbolicNames = [ null, "KW_CLASS", "KW_SUBCLASSOF", "KW_EQUIVALENTTO", 
                          "KW_DISJOINTWITH", "KW_AND", "KW_OR", "KW_NOT", 
                          "ID" ];
	static ruleNames = [ "LETTER", "DIGIT", "KW_CLASS", "KW_SUBCLASSOF", "KW_EQUIVALENTTO", 
                      "KW_DISJOINTWITH", "KW_AND", "KW_OR", "KW_NOT", "ID" ];

    constructor(input) {
        super(input)
        this._interp = new antlr4.atn.LexerATNSimulator(this, atn, decisionsToDFA, new antlr4.atn.PredictionContextCache());
    }
}

OWL2ManchesterLexer.EOF = antlr4.Token.EOF;
OWL2ManchesterLexer.KW_CLASS = 1;
OWL2ManchesterLexer.KW_SUBCLASSOF = 2;
OWL2ManchesterLexer.KW_EQUIVALENTTO = 3;
OWL2ManchesterLexer.KW_DISJOINTWITH = 4;
OWL2ManchesterLexer.KW_AND = 5;
OWL2ManchesterLexer.KW_OR = 6;
OWL2ManchesterLexer.KW_NOT = 7;
OWL2ManchesterLexer.ID = 8;



