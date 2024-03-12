// Generated from parser/OWL2Manchester.g4 by ANTLR 4.13.1
// jshint ignore: start
import antlr4 from 'antlr4';
import OWL2ManchesterListener from './OWL2ManchesterListener.js';
const serializedATN = [4,1,32,224,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,
4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,
2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,17,7,17,2,18,7,18,2,19,7,19,1,
0,1,0,1,1,1,1,1,1,1,2,1,2,1,2,1,2,3,2,50,8,2,1,2,1,2,3,2,54,8,2,1,2,1,2,
1,2,1,2,3,2,60,8,2,1,2,1,2,3,2,64,8,2,3,2,66,8,2,1,3,1,3,1,3,1,3,1,3,1,4,
1,4,1,4,1,4,1,4,1,5,1,5,1,5,1,5,1,5,1,6,1,6,1,6,1,6,4,6,87,8,6,11,6,12,6,
88,1,7,1,7,1,7,1,7,4,7,95,8,7,11,7,12,7,96,1,8,1,8,1,8,1,8,1,8,1,9,1,9,1,
9,1,9,3,9,108,8,9,1,9,1,9,3,9,112,8,9,1,10,1,10,1,10,1,10,3,10,118,8,10,
1,10,1,10,3,10,122,8,10,1,11,1,11,1,11,1,11,1,11,1,11,3,11,130,8,11,1,11,
1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,
11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,
1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,1,11,5,11,171,8,11,10,11,12,11,174,
9,11,1,12,1,12,1,12,1,12,1,12,5,12,181,8,12,10,12,12,12,184,9,12,1,13,1,
13,1,13,1,13,5,13,190,8,13,10,13,12,13,193,9,13,3,13,195,8,13,1,14,1,14,
1,14,4,14,200,8,14,11,14,12,14,201,1,15,1,15,1,15,1,15,1,15,1,15,1,15,1,
16,1,16,1,17,1,17,1,18,1,18,1,19,4,19,218,8,19,11,19,12,19,219,1,19,1,19,
1,19,0,1,22,20,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,0,
2,1,0,1,4,1,0,29,31,233,0,40,1,0,0,0,2,42,1,0,0,0,4,65,1,0,0,0,6,67,1,0,
0,0,8,72,1,0,0,0,10,77,1,0,0,0,12,82,1,0,0,0,14,90,1,0,0,0,16,98,1,0,0,0,
18,103,1,0,0,0,20,113,1,0,0,0,22,129,1,0,0,0,24,175,1,0,0,0,26,185,1,0,0,
0,28,196,1,0,0,0,30,203,1,0,0,0,32,210,1,0,0,0,34,212,1,0,0,0,36,214,1,0,
0,0,38,217,1,0,0,0,40,41,7,0,0,0,41,1,1,0,0,0,42,43,5,8,0,0,43,44,5,30,0,
0,44,3,1,0,0,0,45,46,5,9,0,0,46,49,5,30,0,0,47,48,5,15,0,0,48,50,5,30,0,
0,49,47,1,0,0,0,49,50,1,0,0,0,50,53,1,0,0,0,51,52,5,16,0,0,52,54,3,22,11,
0,53,51,1,0,0,0,53,54,1,0,0,0,54,66,1,0,0,0,55,56,5,9,0,0,56,59,5,30,0,0,
57,58,5,16,0,0,58,60,3,22,11,0,59,57,1,0,0,0,59,60,1,0,0,0,60,63,1,0,0,0,
61,62,5,15,0,0,62,64,5,30,0,0,63,61,1,0,0,0,63,64,1,0,0,0,64,66,1,0,0,0,
65,45,1,0,0,0,65,55,1,0,0,0,66,5,1,0,0,0,67,68,5,9,0,0,68,69,5,30,0,0,69,
70,5,15,0,0,70,71,5,30,0,0,71,7,1,0,0,0,72,73,5,9,0,0,73,74,5,30,0,0,74,
75,5,16,0,0,75,76,3,22,11,0,76,9,1,0,0,0,77,78,5,9,0,0,78,79,5,30,0,0,79,
80,5,17,0,0,80,81,5,30,0,0,81,11,1,0,0,0,82,83,5,9,0,0,83,84,5,30,0,0,84,
86,5,18,0,0,85,87,5,30,0,0,86,85,1,0,0,0,87,88,1,0,0,0,88,86,1,0,0,0,88,
89,1,0,0,0,89,13,1,0,0,0,90,91,5,9,0,0,91,92,5,30,0,0,92,94,5,19,0,0,93,
95,5,30,0,0,94,93,1,0,0,0,95,96,1,0,0,0,96,94,1,0,0,0,96,97,1,0,0,0,97,15,
1,0,0,0,98,99,5,9,0,0,99,100,5,30,0,0,100,101,5,20,0,0,101,102,5,30,0,0,
102,17,1,0,0,0,103,104,5,11,0,0,104,107,5,30,0,0,105,106,5,27,0,0,106,108,
3,22,11,0,107,105,1,0,0,0,107,108,1,0,0,0,108,111,1,0,0,0,109,110,5,28,0,
0,110,112,3,22,11,0,111,109,1,0,0,0,111,112,1,0,0,0,112,19,1,0,0,0,113,114,
5,12,0,0,114,117,5,30,0,0,115,116,5,27,0,0,116,118,3,22,11,0,117,115,1,0,
0,0,117,118,1,0,0,0,118,121,1,0,0,0,119,120,5,28,0,0,120,122,3,22,11,0,121,
119,1,0,0,0,121,122,1,0,0,0,122,21,1,0,0,0,123,124,6,11,-1,0,124,130,5,30,
0,0,125,126,5,5,0,0,126,127,3,22,11,0,127,128,5,6,0,0,128,130,1,0,0,0,129,
123,1,0,0,0,129,125,1,0,0,0,130,172,1,0,0,0,131,132,10,11,0,0,132,133,5,
18,0,0,133,171,3,22,11,12,134,135,10,10,0,0,135,136,5,19,0,0,136,171,3,22,
11,11,137,138,10,9,0,0,138,139,5,21,0,0,139,171,3,22,11,10,140,141,10,8,
0,0,141,142,5,22,0,0,142,171,3,22,11,9,143,144,10,7,0,0,144,145,5,23,0,0,
145,146,5,32,0,0,146,171,3,22,11,8,147,148,10,6,0,0,148,149,5,24,0,0,149,
150,5,32,0,0,150,171,3,22,11,7,151,152,10,5,0,0,152,153,5,25,0,0,153,154,
5,32,0,0,154,171,3,22,11,6,155,156,10,4,0,0,156,157,5,15,0,0,157,171,3,22,
11,5,158,159,10,3,0,0,159,160,5,16,0,0,160,171,3,22,11,4,161,162,10,2,0,
0,162,163,5,17,0,0,163,171,3,22,11,3,164,165,10,1,0,0,165,166,5,26,0,0,166,
167,3,0,0,0,167,168,5,32,0,0,168,169,3,22,11,2,169,171,1,0,0,0,170,131,1,
0,0,0,170,134,1,0,0,0,170,137,1,0,0,0,170,140,1,0,0,0,170,143,1,0,0,0,170,
147,1,0,0,0,170,151,1,0,0,0,170,155,1,0,0,0,170,158,1,0,0,0,170,161,1,0,
0,0,170,164,1,0,0,0,171,174,1,0,0,0,172,170,1,0,0,0,172,173,1,0,0,0,173,
23,1,0,0,0,174,172,1,0,0,0,175,176,5,10,0,0,176,182,5,30,0,0,177,181,3,26,
13,0,178,181,3,28,14,0,179,181,3,30,15,0,180,177,1,0,0,0,180,178,1,0,0,0,
180,179,1,0,0,0,181,184,1,0,0,0,182,180,1,0,0,0,182,183,1,0,0,0,183,25,1,
0,0,0,184,182,1,0,0,0,185,186,5,13,0,0,186,194,5,30,0,0,187,191,5,30,0,0,
188,190,5,30,0,0,189,188,1,0,0,0,190,193,1,0,0,0,191,189,1,0,0,0,191,192,
1,0,0,0,192,195,1,0,0,0,193,191,1,0,0,0,194,187,1,0,0,0,194,195,1,0,0,0,
195,27,1,0,0,0,196,199,5,14,0,0,197,198,5,30,0,0,198,200,3,32,16,0,199,197,
1,0,0,0,200,201,1,0,0,0,201,199,1,0,0,0,201,202,1,0,0,0,202,29,1,0,0,0,203,
204,5,11,0,0,204,205,5,30,0,0,205,206,5,27,0,0,206,207,5,30,0,0,207,208,
5,28,0,0,208,209,5,30,0,0,209,31,1,0,0,0,210,211,7,1,0,0,211,33,1,0,0,0,
212,213,9,0,0,0,213,35,1,0,0,0,214,215,9,0,0,0,215,37,1,0,0,0,216,218,3,
22,11,0,217,216,1,0,0,0,218,219,1,0,0,0,219,217,1,0,0,0,219,220,1,0,0,0,
220,221,1,0,0,0,221,222,5,0,0,1,222,39,1,0,0,0,20,49,53,59,63,65,88,96,107,
111,117,121,129,170,172,180,182,191,194,201,219];


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.atn.PredictionContextCache();

export default class OWL2ManchesterParser extends antlr4.Parser {

    static grammarFileName = "OWL2Manchester.g4";
    static literalNames = [ null, "'>'", "'<'", "'>='", "'<='", "'('", "')'", 
                            null, "'Prefix'", "'Class'", "'Individual'", 
                            "'Property'", "'ObjectProperty'", "'Types'", 
                            "'Facts'", "'SubClassOf'", "'EquivalentTo'", 
                            "'DisjointWith'", "'and'", "'or'", "'not'", 
                            "'some'", "'only'", "'min'", "'max'", "'exactly'", 
                            "'value'", "'Domain'", "'Range'" ];
    static symbolicNames = [ null, null, null, null, null, null, null, "WS", 
                             "KW_PREFIX", "KW_CLASS", "KW_INDIVIDUAL", "KW_PROPERTY", 
                             "KW_OBJECTPROPERTY", "KW_TYPES", "KW_FACTS", 
                             "KW_SUBCLASSOF", "KW_EQUIVALENTTO", "KW_DISJOINTWITH", 
                             "KW_AND", "KW_OR", "KW_NOT", "KW_SOME", "KW_ONLY", 
                             "KW_MIN", "KW_MAX", "KW_EXACTLY", "KW_VALUE", 
                             "KW_DOMAIN", "KW_RANGE", "STRING", "ID", "BOOLEAN", 
                             "INT" ];
    static ruleNames = [ "comparisonOperator", "prefixAxiom", "classAxiom", 
                         "subclassAxiom", "equivalentClassAxiom", "disjointAxiom", 
                         "conjunctionAxiom", "disjunctionAxiom", "negationAxiom", 
                         "propertyAxiom", "objectpropertyaxiom", "classExpression", 
                         "individualAxiom", "typeSection", "factsSection", 
                         "propertySection", "v", "lexerError", "parserError", 
                         "axiom" ];

    constructor(input) {
        super(input);
        this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
        this.ruleNames = OWL2ManchesterParser.ruleNames;
        this.literalNames = OWL2ManchesterParser.literalNames;
        this.symbolicNames = OWL2ManchesterParser.symbolicNames;
    }

    sempred(localctx, ruleIndex, predIndex) {
    	switch(ruleIndex) {
    	case 11:
    	    		return this.classExpression_sempred(localctx, predIndex);
        default:
            throw "No predicate with index:" + ruleIndex;
       }
    }

    classExpression_sempred(localctx, predIndex) {
    	switch(predIndex) {
    		case 0:
    			return this.precpred(this._ctx, 11);
    		case 1:
    			return this.precpred(this._ctx, 10);
    		case 2:
    			return this.precpred(this._ctx, 9);
    		case 3:
    			return this.precpred(this._ctx, 8);
    		case 4:
    			return this.precpred(this._ctx, 7);
    		case 5:
    			return this.precpred(this._ctx, 6);
    		case 6:
    			return this.precpred(this._ctx, 5);
    		case 7:
    			return this.precpred(this._ctx, 4);
    		case 8:
    			return this.precpred(this._ctx, 3);
    		case 9:
    			return this.precpred(this._ctx, 2);
    		case 10:
    			return this.precpred(this._ctx, 1);
    		default:
    			throw "No predicate with index:" + predIndex;
    	}
    };




	comparisonOperator() {
	    let localctx = new ComparisonOperatorContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 0, OWL2ManchesterParser.RULE_comparisonOperator);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 40;
	        _la = this._input.LA(1);
	        if(!((((_la) & ~0x1f) === 0 && ((1 << _la) & 30) !== 0))) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	prefixAxiom() {
	    let localctx = new PrefixAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 2, OWL2ManchesterParser.RULE_prefixAxiom);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 42;
	        this.match(OWL2ManchesterParser.KW_PREFIX);
	        this.state = 43;
	        this.match(OWL2ManchesterParser.ID);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	classAxiom() {
	    let localctx = new ClassAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 4, OWL2ManchesterParser.RULE_classAxiom);
	    var _la = 0;
	    try {
	        this.state = 65;
	        this._errHandler.sync(this);
	        var la_ = this._interp.adaptivePredict(this._input,4,this._ctx);
	        switch(la_) {
	        case 1:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 45;
	            this.match(OWL2ManchesterParser.KW_CLASS);
	            this.state = 46;
	            this.match(OWL2ManchesterParser.ID);
	            this.state = 49;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            if(_la===15) {
	                this.state = 47;
	                this.match(OWL2ManchesterParser.KW_SUBCLASSOF);
	                this.state = 48;
	                this.match(OWL2ManchesterParser.ID);
	            }

	            this.state = 53;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            if(_la===16) {
	                this.state = 51;
	                this.match(OWL2ManchesterParser.KW_EQUIVALENTTO);
	                this.state = 52;
	                this.classExpression(0);
	            }

	            break;

	        case 2:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 55;
	            this.match(OWL2ManchesterParser.KW_CLASS);
	            this.state = 56;
	            this.match(OWL2ManchesterParser.ID);
	            this.state = 59;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            if(_la===16) {
	                this.state = 57;
	                this.match(OWL2ManchesterParser.KW_EQUIVALENTTO);
	                this.state = 58;
	                this.classExpression(0);
	            }

	            this.state = 63;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            if(_la===15) {
	                this.state = 61;
	                this.match(OWL2ManchesterParser.KW_SUBCLASSOF);
	                this.state = 62;
	                this.match(OWL2ManchesterParser.ID);
	            }

	            break;

	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	subclassAxiom() {
	    let localctx = new SubclassAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 6, OWL2ManchesterParser.RULE_subclassAxiom);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 67;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 68;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 69;
	        this.match(OWL2ManchesterParser.KW_SUBCLASSOF);
	        this.state = 70;
	        this.match(OWL2ManchesterParser.ID);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	equivalentClassAxiom() {
	    let localctx = new EquivalentClassAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 8, OWL2ManchesterParser.RULE_equivalentClassAxiom);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 72;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 73;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 74;
	        this.match(OWL2ManchesterParser.KW_EQUIVALENTTO);
	        this.state = 75;
	        this.classExpression(0);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	disjointAxiom() {
	    let localctx = new DisjointAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 10, OWL2ManchesterParser.RULE_disjointAxiom);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 77;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 78;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 79;
	        this.match(OWL2ManchesterParser.KW_DISJOINTWITH);
	        this.state = 80;
	        this.match(OWL2ManchesterParser.ID);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	conjunctionAxiom() {
	    let localctx = new ConjunctionAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 12, OWL2ManchesterParser.RULE_conjunctionAxiom);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 82;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 83;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 84;
	        this.match(OWL2ManchesterParser.KW_AND);
	        this.state = 86; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 85;
	            this.match(OWL2ManchesterParser.ID);
	            this.state = 88; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while(_la===30);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	disjunctionAxiom() {
	    let localctx = new DisjunctionAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 14, OWL2ManchesterParser.RULE_disjunctionAxiom);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 90;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 91;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 92;
	        this.match(OWL2ManchesterParser.KW_OR);
	        this.state = 94; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 93;
	            this.match(OWL2ManchesterParser.ID);
	            this.state = 96; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while(_la===30);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	negationAxiom() {
	    let localctx = new NegationAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 16, OWL2ManchesterParser.RULE_negationAxiom);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 98;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 99;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 100;
	        this.match(OWL2ManchesterParser.KW_NOT);
	        this.state = 101;
	        this.match(OWL2ManchesterParser.ID);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	propertyAxiom() {
	    let localctx = new PropertyAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 18, OWL2ManchesterParser.RULE_propertyAxiom);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 103;
	        this.match(OWL2ManchesterParser.KW_PROPERTY);
	        this.state = 104;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 107;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===27) {
	            this.state = 105;
	            this.match(OWL2ManchesterParser.KW_DOMAIN);
	            this.state = 106;
	            this.classExpression(0);
	        }

	        this.state = 111;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===28) {
	            this.state = 109;
	            this.match(OWL2ManchesterParser.KW_RANGE);
	            this.state = 110;
	            this.classExpression(0);
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	objectpropertyaxiom() {
	    let localctx = new ObjectpropertyaxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 20, OWL2ManchesterParser.RULE_objectpropertyaxiom);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 113;
	        this.match(OWL2ManchesterParser.KW_OBJECTPROPERTY);
	        this.state = 114;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 117;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===27) {
	            this.state = 115;
	            this.match(OWL2ManchesterParser.KW_DOMAIN);
	            this.state = 116;
	            this.classExpression(0);
	        }

	        this.state = 121;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===28) {
	            this.state = 119;
	            this.match(OWL2ManchesterParser.KW_RANGE);
	            this.state = 120;
	            this.classExpression(0);
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}


	classExpression(_p) {
		if(_p===undefined) {
		    _p = 0;
		}
	    const _parentctx = this._ctx;
	    const _parentState = this.state;
	    let localctx = new ClassExpressionContext(this, this._ctx, _parentState);
	    let _prevctx = localctx;
	    const _startState = 22;
	    this.enterRecursionRule(localctx, 22, OWL2ManchesterParser.RULE_classExpression, _p);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 129;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 30:
	            this.state = 124;
	            this.match(OWL2ManchesterParser.ID);
	            break;
	        case 5:
	            this.state = 125;
	            this.match(OWL2ManchesterParser.T__4);
	            this.state = 126;
	            this.classExpression(0);
	            this.state = 127;
	            this.match(OWL2ManchesterParser.T__5);
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	        this._ctx.stop = this._input.LT(-1);
	        this.state = 172;
	        this._errHandler.sync(this);
	        var _alt = this._interp.adaptivePredict(this._input,13,this._ctx)
	        while(_alt!=2 && _alt!=antlr4.atn.ATN.INVALID_ALT_NUMBER) {
	            if(_alt===1) {
	                if(this._parseListeners!==null) {
	                    this.triggerExitRuleEvent();
	                }
	                _prevctx = localctx;
	                this.state = 170;
	                this._errHandler.sync(this);
	                var la_ = this._interp.adaptivePredict(this._input,12,this._ctx);
	                switch(la_) {
	                case 1:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 131;
	                    if (!( this.precpred(this._ctx, 11))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 11)");
	                    }
	                    this.state = 132;
	                    this.match(OWL2ManchesterParser.KW_AND);
	                    this.state = 133;
	                    this.classExpression(12);
	                    break;

	                case 2:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 134;
	                    if (!( this.precpred(this._ctx, 10))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 10)");
	                    }
	                    this.state = 135;
	                    this.match(OWL2ManchesterParser.KW_OR);
	                    this.state = 136;
	                    this.classExpression(11);
	                    break;

	                case 3:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 137;
	                    if (!( this.precpred(this._ctx, 9))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 9)");
	                    }
	                    this.state = 138;
	                    this.match(OWL2ManchesterParser.KW_SOME);
	                    this.state = 139;
	                    this.classExpression(10);
	                    break;

	                case 4:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 140;
	                    if (!( this.precpred(this._ctx, 8))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 8)");
	                    }
	                    this.state = 141;
	                    this.match(OWL2ManchesterParser.KW_ONLY);
	                    this.state = 142;
	                    this.classExpression(9);
	                    break;

	                case 5:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 143;
	                    if (!( this.precpred(this._ctx, 7))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 7)");
	                    }
	                    this.state = 144;
	                    this.match(OWL2ManchesterParser.KW_MIN);
	                    this.state = 145;
	                    this.match(OWL2ManchesterParser.INT);
	                    this.state = 146;
	                    this.classExpression(8);
	                    break;

	                case 6:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 147;
	                    if (!( this.precpred(this._ctx, 6))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 6)");
	                    }
	                    this.state = 148;
	                    this.match(OWL2ManchesterParser.KW_MAX);
	                    this.state = 149;
	                    this.match(OWL2ManchesterParser.INT);
	                    this.state = 150;
	                    this.classExpression(7);
	                    break;

	                case 7:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 151;
	                    if (!( this.precpred(this._ctx, 5))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 5)");
	                    }
	                    this.state = 152;
	                    this.match(OWL2ManchesterParser.KW_EXACTLY);
	                    this.state = 153;
	                    this.match(OWL2ManchesterParser.INT);
	                    this.state = 154;
	                    this.classExpression(6);
	                    break;

	                case 8:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 155;
	                    if (!( this.precpred(this._ctx, 4))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 4)");
	                    }
	                    this.state = 156;
	                    this.match(OWL2ManchesterParser.KW_SUBCLASSOF);
	                    this.state = 157;
	                    this.classExpression(5);
	                    break;

	                case 9:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 158;
	                    if (!( this.precpred(this._ctx, 3))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 3)");
	                    }
	                    this.state = 159;
	                    this.match(OWL2ManchesterParser.KW_EQUIVALENTTO);
	                    this.state = 160;
	                    this.classExpression(4);
	                    break;

	                case 10:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 161;
	                    if (!( this.precpred(this._ctx, 2))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 2)");
	                    }
	                    this.state = 162;
	                    this.match(OWL2ManchesterParser.KW_DISJOINTWITH);
	                    this.state = 163;
	                    this.classExpression(3);
	                    break;

	                case 11:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 164;
	                    if (!( this.precpred(this._ctx, 1))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 1)");
	                    }
	                    this.state = 165;
	                    this.match(OWL2ManchesterParser.KW_VALUE);
	                    this.state = 166;
	                    this.comparisonOperator();
	                    this.state = 167;
	                    this.match(OWL2ManchesterParser.INT);
	                    this.state = 168;
	                    this.classExpression(2);
	                    break;

	                } 
	            }
	            this.state = 174;
	            this._errHandler.sync(this);
	            _alt = this._interp.adaptivePredict(this._input,13,this._ctx);
	        }

	    } catch( error) {
	        if(error instanceof antlr4.error.RecognitionException) {
		        localctx.exception = error;
		        this._errHandler.reportError(this, error);
		        this._errHandler.recover(this, error);
		    } else {
		    	throw error;
		    }
	    } finally {
	        this.unrollRecursionContexts(_parentctx)
	    }
	    return localctx;
	}



	individualAxiom() {
	    let localctx = new IndividualAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 24, OWL2ManchesterParser.RULE_individualAxiom);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 175;
	        this.match(OWL2ManchesterParser.KW_INDIVIDUAL);
	        this.state = 176;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 182;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while((((_la) & ~0x1f) === 0 && ((1 << _la) & 26624) !== 0)) {
	            this.state = 180;
	            this._errHandler.sync(this);
	            switch(this._input.LA(1)) {
	            case 13:
	                this.state = 177;
	                this.typeSection();
	                break;
	            case 14:
	                this.state = 178;
	                this.factsSection();
	                break;
	            case 11:
	                this.state = 179;
	                this.propertySection();
	                break;
	            default:
	                throw new antlr4.error.NoViableAltException(this);
	            }
	            this.state = 184;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	typeSection() {
	    let localctx = new TypeSectionContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 26, OWL2ManchesterParser.RULE_typeSection);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 185;
	        this.match(OWL2ManchesterParser.KW_TYPES);
	        this.state = 186;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 194;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===30) {
	            this.state = 187;
	            this.match(OWL2ManchesterParser.ID);
	            this.state = 191;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            while(_la===30) {
	                this.state = 188;
	                this.match(OWL2ManchesterParser.ID);
	                this.state = 193;
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            }
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	factsSection() {
	    let localctx = new FactsSectionContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 28, OWL2ManchesterParser.RULE_factsSection);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 196;
	        this.match(OWL2ManchesterParser.KW_FACTS);
	        this.state = 199; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 197;
	            this.match(OWL2ManchesterParser.ID);
	            this.state = 198;
	            this.v();
	            this.state = 201; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while(_la===30);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	propertySection() {
	    let localctx = new PropertySectionContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 30, OWL2ManchesterParser.RULE_propertySection);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 203;
	        this.match(OWL2ManchesterParser.KW_PROPERTY);
	        this.state = 204;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 205;
	        this.match(OWL2ManchesterParser.KW_DOMAIN);
	        this.state = 206;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 207;
	        this.match(OWL2ManchesterParser.KW_RANGE);
	        this.state = 208;
	        this.match(OWL2ManchesterParser.ID);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	v() {
	    let localctx = new VContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 32, OWL2ManchesterParser.RULE_v);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 210;
	        _la = this._input.LA(1);
	        if(!((((_la) & ~0x1f) === 0 && ((1 << _la) & 3758096384) !== 0))) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	lexerError() {
	    let localctx = new LexerErrorContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 34, OWL2ManchesterParser.RULE_lexerError);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 212;
	        this.matchWildcard();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	parserError() {
	    let localctx = new ParserErrorContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 36, OWL2ManchesterParser.RULE_parserError);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 214;
	        this.matchWildcard();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	axiom() {
	    let localctx = new AxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 38, OWL2ManchesterParser.RULE_axiom);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 217; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 216;
	            this.classExpression(0);
	            this.state = 219; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while(_la===5 || _la===30);
	        this.state = 221;
	        this.match(OWL2ManchesterParser.EOF);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}


}

OWL2ManchesterParser.EOF = antlr4.Token.EOF;
OWL2ManchesterParser.T__0 = 1;
OWL2ManchesterParser.T__1 = 2;
OWL2ManchesterParser.T__2 = 3;
OWL2ManchesterParser.T__3 = 4;
OWL2ManchesterParser.T__4 = 5;
OWL2ManchesterParser.T__5 = 6;
OWL2ManchesterParser.WS = 7;
OWL2ManchesterParser.KW_PREFIX = 8;
OWL2ManchesterParser.KW_CLASS = 9;
OWL2ManchesterParser.KW_INDIVIDUAL = 10;
OWL2ManchesterParser.KW_PROPERTY = 11;
OWL2ManchesterParser.KW_OBJECTPROPERTY = 12;
OWL2ManchesterParser.KW_TYPES = 13;
OWL2ManchesterParser.KW_FACTS = 14;
OWL2ManchesterParser.KW_SUBCLASSOF = 15;
OWL2ManchesterParser.KW_EQUIVALENTTO = 16;
OWL2ManchesterParser.KW_DISJOINTWITH = 17;
OWL2ManchesterParser.KW_AND = 18;
OWL2ManchesterParser.KW_OR = 19;
OWL2ManchesterParser.KW_NOT = 20;
OWL2ManchesterParser.KW_SOME = 21;
OWL2ManchesterParser.KW_ONLY = 22;
OWL2ManchesterParser.KW_MIN = 23;
OWL2ManchesterParser.KW_MAX = 24;
OWL2ManchesterParser.KW_EXACTLY = 25;
OWL2ManchesterParser.KW_VALUE = 26;
OWL2ManchesterParser.KW_DOMAIN = 27;
OWL2ManchesterParser.KW_RANGE = 28;
OWL2ManchesterParser.STRING = 29;
OWL2ManchesterParser.ID = 30;
OWL2ManchesterParser.BOOLEAN = 31;
OWL2ManchesterParser.INT = 32;

OWL2ManchesterParser.RULE_comparisonOperator = 0;
OWL2ManchesterParser.RULE_prefixAxiom = 1;
OWL2ManchesterParser.RULE_classAxiom = 2;
OWL2ManchesterParser.RULE_subclassAxiom = 3;
OWL2ManchesterParser.RULE_equivalentClassAxiom = 4;
OWL2ManchesterParser.RULE_disjointAxiom = 5;
OWL2ManchesterParser.RULE_conjunctionAxiom = 6;
OWL2ManchesterParser.RULE_disjunctionAxiom = 7;
OWL2ManchesterParser.RULE_negationAxiom = 8;
OWL2ManchesterParser.RULE_propertyAxiom = 9;
OWL2ManchesterParser.RULE_objectpropertyaxiom = 10;
OWL2ManchesterParser.RULE_classExpression = 11;
OWL2ManchesterParser.RULE_individualAxiom = 12;
OWL2ManchesterParser.RULE_typeSection = 13;
OWL2ManchesterParser.RULE_factsSection = 14;
OWL2ManchesterParser.RULE_propertySection = 15;
OWL2ManchesterParser.RULE_v = 16;
OWL2ManchesterParser.RULE_lexerError = 17;
OWL2ManchesterParser.RULE_parserError = 18;
OWL2ManchesterParser.RULE_axiom = 19;

class ComparisonOperatorContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_comparisonOperator;
    }


	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterComparisonOperator(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitComparisonOperator(this);
		}
	}


}



class PrefixAxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_prefixAxiom;
    }

	KW_PREFIX() {
	    return this.getToken(OWL2ManchesterParser.KW_PREFIX, 0);
	};

	ID() {
	    return this.getToken(OWL2ManchesterParser.ID, 0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterPrefixAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitPrefixAxiom(this);
		}
	}


}



class ClassAxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_classAxiom;
    }

	KW_CLASS() {
	    return this.getToken(OWL2ManchesterParser.KW_CLASS, 0);
	};

	ID = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(OWL2ManchesterParser.ID);
	    } else {
	        return this.getToken(OWL2ManchesterParser.ID, i);
	    }
	};


	KW_SUBCLASSOF() {
	    return this.getToken(OWL2ManchesterParser.KW_SUBCLASSOF, 0);
	};

	KW_EQUIVALENTTO() {
	    return this.getToken(OWL2ManchesterParser.KW_EQUIVALENTTO, 0);
	};

	classExpression() {
	    return this.getTypedRuleContext(ClassExpressionContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterClassAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitClassAxiom(this);
		}
	}


}



class SubclassAxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_subclassAxiom;
    }

	KW_CLASS() {
	    return this.getToken(OWL2ManchesterParser.KW_CLASS, 0);
	};

	ID = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(OWL2ManchesterParser.ID);
	    } else {
	        return this.getToken(OWL2ManchesterParser.ID, i);
	    }
	};


	KW_SUBCLASSOF() {
	    return this.getToken(OWL2ManchesterParser.KW_SUBCLASSOF, 0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterSubclassAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitSubclassAxiom(this);
		}
	}


}



class EquivalentClassAxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_equivalentClassAxiom;
    }

	KW_CLASS() {
	    return this.getToken(OWL2ManchesterParser.KW_CLASS, 0);
	};

	ID() {
	    return this.getToken(OWL2ManchesterParser.ID, 0);
	};

	KW_EQUIVALENTTO() {
	    return this.getToken(OWL2ManchesterParser.KW_EQUIVALENTTO, 0);
	};

	classExpression() {
	    return this.getTypedRuleContext(ClassExpressionContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterEquivalentClassAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitEquivalentClassAxiom(this);
		}
	}


}



class DisjointAxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_disjointAxiom;
    }

	KW_CLASS() {
	    return this.getToken(OWL2ManchesterParser.KW_CLASS, 0);
	};

	ID = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(OWL2ManchesterParser.ID);
	    } else {
	        return this.getToken(OWL2ManchesterParser.ID, i);
	    }
	};


	KW_DISJOINTWITH() {
	    return this.getToken(OWL2ManchesterParser.KW_DISJOINTWITH, 0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterDisjointAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitDisjointAxiom(this);
		}
	}


}



class ConjunctionAxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_conjunctionAxiom;
    }

	KW_CLASS() {
	    return this.getToken(OWL2ManchesterParser.KW_CLASS, 0);
	};

	ID = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(OWL2ManchesterParser.ID);
	    } else {
	        return this.getToken(OWL2ManchesterParser.ID, i);
	    }
	};


	KW_AND() {
	    return this.getToken(OWL2ManchesterParser.KW_AND, 0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterConjunctionAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitConjunctionAxiom(this);
		}
	}


}



class DisjunctionAxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_disjunctionAxiom;
    }

	KW_CLASS() {
	    return this.getToken(OWL2ManchesterParser.KW_CLASS, 0);
	};

	ID = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(OWL2ManchesterParser.ID);
	    } else {
	        return this.getToken(OWL2ManchesterParser.ID, i);
	    }
	};


	KW_OR() {
	    return this.getToken(OWL2ManchesterParser.KW_OR, 0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterDisjunctionAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitDisjunctionAxiom(this);
		}
	}


}



class NegationAxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_negationAxiom;
    }

	KW_CLASS() {
	    return this.getToken(OWL2ManchesterParser.KW_CLASS, 0);
	};

	ID = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(OWL2ManchesterParser.ID);
	    } else {
	        return this.getToken(OWL2ManchesterParser.ID, i);
	    }
	};


	KW_NOT() {
	    return this.getToken(OWL2ManchesterParser.KW_NOT, 0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterNegationAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitNegationAxiom(this);
		}
	}


}



class PropertyAxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_propertyAxiom;
    }

	KW_PROPERTY() {
	    return this.getToken(OWL2ManchesterParser.KW_PROPERTY, 0);
	};

	ID() {
	    return this.getToken(OWL2ManchesterParser.ID, 0);
	};

	KW_DOMAIN() {
	    return this.getToken(OWL2ManchesterParser.KW_DOMAIN, 0);
	};

	classExpression = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ClassExpressionContext);
	    } else {
	        return this.getTypedRuleContext(ClassExpressionContext,i);
	    }
	};

	KW_RANGE() {
	    return this.getToken(OWL2ManchesterParser.KW_RANGE, 0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterPropertyAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitPropertyAxiom(this);
		}
	}


}



class ObjectpropertyaxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_objectpropertyaxiom;
    }

	KW_OBJECTPROPERTY() {
	    return this.getToken(OWL2ManchesterParser.KW_OBJECTPROPERTY, 0);
	};

	ID() {
	    return this.getToken(OWL2ManchesterParser.ID, 0);
	};

	KW_DOMAIN() {
	    return this.getToken(OWL2ManchesterParser.KW_DOMAIN, 0);
	};

	classExpression = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ClassExpressionContext);
	    } else {
	        return this.getTypedRuleContext(ClassExpressionContext,i);
	    }
	};

	KW_RANGE() {
	    return this.getToken(OWL2ManchesterParser.KW_RANGE, 0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterObjectpropertyaxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitObjectpropertyaxiom(this);
		}
	}


}



class ClassExpressionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_classExpression;
    }

	ID() {
	    return this.getToken(OWL2ManchesterParser.ID, 0);
	};

	classExpression = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ClassExpressionContext);
	    } else {
	        return this.getTypedRuleContext(ClassExpressionContext,i);
	    }
	};

	KW_AND() {
	    return this.getToken(OWL2ManchesterParser.KW_AND, 0);
	};

	KW_OR() {
	    return this.getToken(OWL2ManchesterParser.KW_OR, 0);
	};

	KW_SOME() {
	    return this.getToken(OWL2ManchesterParser.KW_SOME, 0);
	};

	KW_ONLY() {
	    return this.getToken(OWL2ManchesterParser.KW_ONLY, 0);
	};

	KW_MIN() {
	    return this.getToken(OWL2ManchesterParser.KW_MIN, 0);
	};

	INT() {
	    return this.getToken(OWL2ManchesterParser.INT, 0);
	};

	KW_MAX() {
	    return this.getToken(OWL2ManchesterParser.KW_MAX, 0);
	};

	KW_EXACTLY() {
	    return this.getToken(OWL2ManchesterParser.KW_EXACTLY, 0);
	};

	KW_SUBCLASSOF() {
	    return this.getToken(OWL2ManchesterParser.KW_SUBCLASSOF, 0);
	};

	KW_EQUIVALENTTO() {
	    return this.getToken(OWL2ManchesterParser.KW_EQUIVALENTTO, 0);
	};

	KW_DISJOINTWITH() {
	    return this.getToken(OWL2ManchesterParser.KW_DISJOINTWITH, 0);
	};

	KW_VALUE() {
	    return this.getToken(OWL2ManchesterParser.KW_VALUE, 0);
	};

	comparisonOperator() {
	    return this.getTypedRuleContext(ComparisonOperatorContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterClassExpression(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitClassExpression(this);
		}
	}


}



class IndividualAxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_individualAxiom;
    }

	KW_INDIVIDUAL() {
	    return this.getToken(OWL2ManchesterParser.KW_INDIVIDUAL, 0);
	};

	ID() {
	    return this.getToken(OWL2ManchesterParser.ID, 0);
	};

	typeSection = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(TypeSectionContext);
	    } else {
	        return this.getTypedRuleContext(TypeSectionContext,i);
	    }
	};

	factsSection = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(FactsSectionContext);
	    } else {
	        return this.getTypedRuleContext(FactsSectionContext,i);
	    }
	};

	propertySection = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(PropertySectionContext);
	    } else {
	        return this.getTypedRuleContext(PropertySectionContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterIndividualAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitIndividualAxiom(this);
		}
	}


}



class TypeSectionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_typeSection;
    }

	KW_TYPES() {
	    return this.getToken(OWL2ManchesterParser.KW_TYPES, 0);
	};

	ID = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(OWL2ManchesterParser.ID);
	    } else {
	        return this.getToken(OWL2ManchesterParser.ID, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterTypeSection(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitTypeSection(this);
		}
	}


}



class FactsSectionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_factsSection;
    }

	KW_FACTS() {
	    return this.getToken(OWL2ManchesterParser.KW_FACTS, 0);
	};

	ID = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(OWL2ManchesterParser.ID);
	    } else {
	        return this.getToken(OWL2ManchesterParser.ID, i);
	    }
	};


	v = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(VContext);
	    } else {
	        return this.getTypedRuleContext(VContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterFactsSection(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitFactsSection(this);
		}
	}


}



class PropertySectionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_propertySection;
    }

	KW_PROPERTY() {
	    return this.getToken(OWL2ManchesterParser.KW_PROPERTY, 0);
	};

	ID = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(OWL2ManchesterParser.ID);
	    } else {
	        return this.getToken(OWL2ManchesterParser.ID, i);
	    }
	};


	KW_DOMAIN() {
	    return this.getToken(OWL2ManchesterParser.KW_DOMAIN, 0);
	};

	KW_RANGE() {
	    return this.getToken(OWL2ManchesterParser.KW_RANGE, 0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterPropertySection(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitPropertySection(this);
		}
	}


}



class VContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_v;
    }

	BOOLEAN() {
	    return this.getToken(OWL2ManchesterParser.BOOLEAN, 0);
	};

	STRING() {
	    return this.getToken(OWL2ManchesterParser.STRING, 0);
	};

	ID() {
	    return this.getToken(OWL2ManchesterParser.ID, 0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterV(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitV(this);
		}
	}


}



class LexerErrorContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_lexerError;
    }


	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterLexerError(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitLexerError(this);
		}
	}


}



class ParserErrorContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_parserError;
    }


	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterParserError(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitParserError(this);
		}
	}


}



class AxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_axiom;
    }

	EOF() {
	    return this.getToken(OWL2ManchesterParser.EOF, 0);
	};

	classExpression = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ClassExpressionContext);
	    } else {
	        return this.getTypedRuleContext(ClassExpressionContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitAxiom(this);
		}
	}


}




OWL2ManchesterParser.ComparisonOperatorContext = ComparisonOperatorContext; 
OWL2ManchesterParser.PrefixAxiomContext = PrefixAxiomContext; 
OWL2ManchesterParser.ClassAxiomContext = ClassAxiomContext; 
OWL2ManchesterParser.SubclassAxiomContext = SubclassAxiomContext; 
OWL2ManchesterParser.EquivalentClassAxiomContext = EquivalentClassAxiomContext; 
OWL2ManchesterParser.DisjointAxiomContext = DisjointAxiomContext; 
OWL2ManchesterParser.ConjunctionAxiomContext = ConjunctionAxiomContext; 
OWL2ManchesterParser.DisjunctionAxiomContext = DisjunctionAxiomContext; 
OWL2ManchesterParser.NegationAxiomContext = NegationAxiomContext; 
OWL2ManchesterParser.PropertyAxiomContext = PropertyAxiomContext; 
OWL2ManchesterParser.ObjectpropertyaxiomContext = ObjectpropertyaxiomContext; 
OWL2ManchesterParser.ClassExpressionContext = ClassExpressionContext; 
OWL2ManchesterParser.IndividualAxiomContext = IndividualAxiomContext; 
OWL2ManchesterParser.TypeSectionContext = TypeSectionContext; 
OWL2ManchesterParser.FactsSectionContext = FactsSectionContext; 
OWL2ManchesterParser.PropertySectionContext = PropertySectionContext; 
OWL2ManchesterParser.VContext = VContext; 
OWL2ManchesterParser.LexerErrorContext = LexerErrorContext; 
OWL2ManchesterParser.ParserErrorContext = ParserErrorContext; 
OWL2ManchesterParser.AxiomContext = AxiomContext; 
