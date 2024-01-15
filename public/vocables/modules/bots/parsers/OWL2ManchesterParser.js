// Generated from parser/OWL2Manchester.g4 by ANTLR 4.13.1
// jshint ignore: start
import antlr4 from 'antlr4';
import OWL2ManchesterListener from './OWL2ManchesterListener.js';
const serializedATN = [4,1,8,77,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,
2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,
1,2,1,2,1,2,1,2,1,2,1,3,1,3,1,3,1,3,1,3,1,4,1,4,1,4,1,4,4,4,43,8,4,11,4,
12,4,44,1,5,1,5,1,5,1,5,4,5,51,8,5,11,5,12,5,52,1,6,1,6,1,6,1,6,1,6,1,7,
1,7,1,8,1,8,1,9,1,9,1,9,1,9,1,9,1,9,1,9,4,9,71,8,9,11,9,12,9,72,1,9,1,9,
1,9,0,0,10,0,2,4,6,8,10,12,14,16,18,0,0,75,0,20,1,0,0,0,2,23,1,0,0,0,4,28,
1,0,0,0,6,33,1,0,0,0,8,38,1,0,0,0,10,46,1,0,0,0,12,54,1,0,0,0,14,59,1,0,
0,0,16,61,1,0,0,0,18,70,1,0,0,0,20,21,5,1,0,0,21,22,5,8,0,0,22,1,1,0,0,0,
23,24,5,1,0,0,24,25,5,8,0,0,25,26,5,2,0,0,26,27,5,8,0,0,27,3,1,0,0,0,28,
29,5,1,0,0,29,30,5,8,0,0,30,31,5,3,0,0,31,32,5,8,0,0,32,5,1,0,0,0,33,34,
5,1,0,0,34,35,5,8,0,0,35,36,5,4,0,0,36,37,5,8,0,0,37,7,1,0,0,0,38,39,5,1,
0,0,39,40,5,8,0,0,40,42,5,5,0,0,41,43,5,8,0,0,42,41,1,0,0,0,43,44,1,0,0,
0,44,42,1,0,0,0,44,45,1,0,0,0,45,9,1,0,0,0,46,47,5,1,0,0,47,48,5,8,0,0,48,
50,5,6,0,0,49,51,5,8,0,0,50,49,1,0,0,0,51,52,1,0,0,0,52,50,1,0,0,0,52,53,
1,0,0,0,53,11,1,0,0,0,54,55,5,1,0,0,55,56,5,8,0,0,56,57,5,7,0,0,57,58,5,
8,0,0,58,13,1,0,0,0,59,60,9,0,0,0,60,15,1,0,0,0,61,62,9,0,0,0,62,17,1,0,
0,0,63,71,3,0,0,0,64,71,3,2,1,0,65,71,3,4,2,0,66,71,3,6,3,0,67,71,3,8,4,
0,68,71,3,10,5,0,69,71,3,12,6,0,70,63,1,0,0,0,70,64,1,0,0,0,70,65,1,0,0,
0,70,66,1,0,0,0,70,67,1,0,0,0,70,68,1,0,0,0,70,69,1,0,0,0,71,72,1,0,0,0,
72,70,1,0,0,0,72,73,1,0,0,0,73,74,1,0,0,0,74,75,5,0,0,1,75,19,1,0,0,0,4,
44,52,70,72];


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.atn.PredictionContextCache();

export default class OWL2ManchesterParser extends antlr4.Parser {

    static grammarFileName = "OWL2Manchester.g4";
    static literalNames = [ null, "'Class'", "'SubClassOf'", "'EquivalentTo'", 
                            "'DisjointWith'", "'and'", "'or'", "'not'" ];
    static symbolicNames = [ null, "KW_CLASS", "KW_SUBCLASSOF", "KW_EQUIVALENTTO", 
                             "KW_DISJOINTWITH", "KW_AND", "KW_OR", "KW_NOT", 
                             "ID" ];
    static ruleNames = [ "classAxiom", "subclassAxiom", "equivalentAxiom", 
                         "disjointAxiom", "conjunctionAxiom", "disjunctionAxiom", 
                         "negationAxiom", "lexerError", "parserError", "axiom" ];

    constructor(input) {
        super(input);
        this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
        this.ruleNames = OWL2ManchesterParser.ruleNames;
        this.literalNames = OWL2ManchesterParser.literalNames;
        this.symbolicNames = OWL2ManchesterParser.symbolicNames;
    }



	classAxiom() {
	    let localctx = new ClassAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 0, OWL2ManchesterParser.RULE_classAxiom);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 20;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 21;
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



	subclassAxiom() {
	    let localctx = new SubclassAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 2, OWL2ManchesterParser.RULE_subclassAxiom);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 23;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 24;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 25;
	        this.match(OWL2ManchesterParser.KW_SUBCLASSOF);
	        this.state = 26;
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



	equivalentAxiom() {
	    let localctx = new EquivalentAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 4, OWL2ManchesterParser.RULE_equivalentAxiom);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 28;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 29;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 30;
	        this.match(OWL2ManchesterParser.KW_EQUIVALENTTO);
	        this.state = 31;
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



	disjointAxiom() {
	    let localctx = new DisjointAxiomContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 6, OWL2ManchesterParser.RULE_disjointAxiom);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 33;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 34;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 35;
	        this.match(OWL2ManchesterParser.KW_DISJOINTWITH);
	        this.state = 36;
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
	    this.enterRule(localctx, 8, OWL2ManchesterParser.RULE_conjunctionAxiom);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 38;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 39;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 40;
	        this.match(OWL2ManchesterParser.KW_AND);
	        this.state = 42; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 41;
	            this.match(OWL2ManchesterParser.ID);
	            this.state = 44; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while(_la===8);
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
	    this.enterRule(localctx, 10, OWL2ManchesterParser.RULE_disjunctionAxiom);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 46;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 47;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 48;
	        this.match(OWL2ManchesterParser.KW_OR);
	        this.state = 50; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 49;
	            this.match(OWL2ManchesterParser.ID);
	            this.state = 52; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while(_la===8);
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
	    this.enterRule(localctx, 12, OWL2ManchesterParser.RULE_negationAxiom);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 54;
	        this.match(OWL2ManchesterParser.KW_CLASS);
	        this.state = 55;
	        this.match(OWL2ManchesterParser.ID);
	        this.state = 56;
	        this.match(OWL2ManchesterParser.KW_NOT);
	        this.state = 57;
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



	lexerError() {
	    let localctx = new LexerErrorContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 14, OWL2ManchesterParser.RULE_lexerError);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 59;
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
	    this.enterRule(localctx, 16, OWL2ManchesterParser.RULE_parserError);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 61;
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
	    this.enterRule(localctx, 18, OWL2ManchesterParser.RULE_axiom);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 70; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 70;
	            this._errHandler.sync(this);
	            var la_ = this._interp.adaptivePredict(this._input,2,this._ctx);
	            switch(la_) {
	            case 1:
	                this.state = 63;
	                this.classAxiom();
	                break;

	            case 2:
	                this.state = 64;
	                this.subclassAxiom();
	                break;

	            case 3:
	                this.state = 65;
	                this.equivalentAxiom();
	                break;

	            case 4:
	                this.state = 66;
	                this.disjointAxiom();
	                break;

	            case 5:
	                this.state = 67;
	                this.conjunctionAxiom();
	                break;

	            case 6:
	                this.state = 68;
	                this.disjunctionAxiom();
	                break;

	            case 7:
	                this.state = 69;
	                this.negationAxiom();
	                break;

	            }
	            this.state = 72; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while(_la===1);
	        this.state = 74;
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
OWL2ManchesterParser.KW_CLASS = 1;
OWL2ManchesterParser.KW_SUBCLASSOF = 2;
OWL2ManchesterParser.KW_EQUIVALENTTO = 3;
OWL2ManchesterParser.KW_DISJOINTWITH = 4;
OWL2ManchesterParser.KW_AND = 5;
OWL2ManchesterParser.KW_OR = 6;
OWL2ManchesterParser.KW_NOT = 7;
OWL2ManchesterParser.ID = 8;

OWL2ManchesterParser.RULE_classAxiom = 0;
OWL2ManchesterParser.RULE_subclassAxiom = 1;
OWL2ManchesterParser.RULE_equivalentAxiom = 2;
OWL2ManchesterParser.RULE_disjointAxiom = 3;
OWL2ManchesterParser.RULE_conjunctionAxiom = 4;
OWL2ManchesterParser.RULE_disjunctionAxiom = 5;
OWL2ManchesterParser.RULE_negationAxiom = 6;
OWL2ManchesterParser.RULE_lexerError = 7;
OWL2ManchesterParser.RULE_parserError = 8;
OWL2ManchesterParser.RULE_axiom = 9;

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

	ID() {
	    return this.getToken(OWL2ManchesterParser.ID, 0);
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



class EquivalentAxiomContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_equivalentAxiom;
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


	KW_EQUIVALENTTO() {
	    return this.getToken(OWL2ManchesterParser.KW_EQUIVALENTTO, 0);
	};

	enterRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.enterEquivalentAxiom(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof OWL2ManchesterListener ) {
	        listener.exitEquivalentAxiom(this);
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

	classAxiom = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ClassAxiomContext);
	    } else {
	        return this.getTypedRuleContext(ClassAxiomContext,i);
	    }
	};

	subclassAxiom = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(SubclassAxiomContext);
	    } else {
	        return this.getTypedRuleContext(SubclassAxiomContext,i);
	    }
	};

	equivalentAxiom = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(EquivalentAxiomContext);
	    } else {
	        return this.getTypedRuleContext(EquivalentAxiomContext,i);
	    }
	};

	disjointAxiom = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(DisjointAxiomContext);
	    } else {
	        return this.getTypedRuleContext(DisjointAxiomContext,i);
	    }
	};

	conjunctionAxiom = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ConjunctionAxiomContext);
	    } else {
	        return this.getTypedRuleContext(ConjunctionAxiomContext,i);
	    }
	};

	disjunctionAxiom = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(DisjunctionAxiomContext);
	    } else {
	        return this.getTypedRuleContext(DisjunctionAxiomContext,i);
	    }
	};

	negationAxiom = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(NegationAxiomContext);
	    } else {
	        return this.getTypedRuleContext(NegationAxiomContext,i);
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




OWL2ManchesterParser.ClassAxiomContext = ClassAxiomContext; 
OWL2ManchesterParser.SubclassAxiomContext = SubclassAxiomContext; 
OWL2ManchesterParser.EquivalentAxiomContext = EquivalentAxiomContext; 
OWL2ManchesterParser.DisjointAxiomContext = DisjointAxiomContext; 
OWL2ManchesterParser.ConjunctionAxiomContext = ConjunctionAxiomContext; 
OWL2ManchesterParser.DisjunctionAxiomContext = DisjunctionAxiomContext; 
OWL2ManchesterParser.NegationAxiomContext = NegationAxiomContext; 
OWL2ManchesterParser.LexerErrorContext = LexerErrorContext; 
OWL2ManchesterParser.ParserErrorContext = ParserErrorContext; 
OWL2ManchesterParser.AxiomContext = AxiomContext; 
