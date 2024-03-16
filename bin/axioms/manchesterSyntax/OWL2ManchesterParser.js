// Generated from parser/OWL2Manchester.g4 by ANTLR 4.13.1
// jshint ignore: start
const antlr4 =require( 'antlr4');
const OWL2ManchesterListener =require( './OWL2ManchesterListener.js');
const serializedATN = [4,1,22,86,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,1,0,1,0,
1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,3,0,25,8,0,1,0,1,
0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,
0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,
0,1,0,1,0,1,0,3,0,68,8,0,5,0,70,8,0,10,0,12,0,73,9,0,1,1,1,1,1,2,1,2,1,3,
4,3,80,8,3,11,3,12,3,81,1,3,1,3,1,3,0,1,0,4,0,2,4,6,0,0,97,0,24,1,0,0,0,
2,74,1,0,0,0,4,76,1,0,0,0,6,79,1,0,0,0,8,9,6,0,-1,0,9,25,5,22,0,0,10,11,
5,20,0,0,11,12,3,0,0,0,12,13,5,21,0,0,13,25,1,0,0,0,14,15,5,1,0,0,15,16,
3,0,0,0,16,17,5,7,0,0,17,18,5,2,0,0,18,19,3,0,0,0,19,20,1,0,0,0,20,21,5,
8,0,0,21,22,5,2,0,0,22,23,3,0,0,0,23,25,1,0,0,0,24,8,1,0,0,0,24,10,1,0,0,
0,24,14,1,0,0,0,25,71,1,0,0,0,26,27,10,13,0,0,27,28,5,9,0,0,28,70,3,0,0,
14,29,30,10,12,0,0,30,31,5,10,0,0,31,70,3,0,0,13,32,33,10,11,0,0,33,34,5,
11,0,0,34,70,3,0,0,12,35,36,10,10,0,0,36,37,5,12,0,0,37,70,3,0,0,11,38,39,
10,9,0,0,39,40,5,13,0,0,40,70,3,0,0,10,41,42,10,8,0,0,42,43,5,14,0,0,43,
44,5,3,0,0,44,70,3,0,0,9,45,46,10,7,0,0,46,47,5,15,0,0,47,48,5,3,0,0,48,
70,3,0,0,8,49,50,10,6,0,0,50,51,5,16,0,0,51,52,5,3,0,0,52,70,3,0,0,7,53,
54,10,5,0,0,54,55,5,4,0,0,55,70,3,0,0,6,56,57,10,4,0,0,57,58,5,5,0,0,58,
70,3,0,0,5,59,60,10,3,0,0,60,61,5,6,0,0,61,70,3,0,0,4,62,63,10,2,0,0,63,
64,5,17,0,0,64,65,5,18,0,0,65,67,5,3,0,0,66,68,3,0,0,0,67,66,1,0,0,0,67,
68,1,0,0,0,68,70,1,0,0,0,69,26,1,0,0,0,69,29,1,0,0,0,69,32,1,0,0,0,69,35,
1,0,0,0,69,38,1,0,0,0,69,41,1,0,0,0,69,45,1,0,0,0,69,49,1,0,0,0,69,53,1,
0,0,0,69,56,1,0,0,0,69,59,1,0,0,0,69,62,1,0,0,0,70,73,1,0,0,0,71,69,1,0,
0,0,71,72,1,0,0,0,72,1,1,0,0,0,73,71,1,0,0,0,74,75,9,0,0,0,75,3,1,0,0,0,
76,77,9,0,0,0,77,5,1,0,0,0,78,80,3,0,0,0,79,78,1,0,0,0,80,81,1,0,0,0,81,
79,1,0,0,0,81,82,1,0,0,0,82,83,1,0,0,0,83,84,5,0,0,1,84,7,1,0,0,0,5,24,67,
69,71,81];


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.atn.PredictionContextCache();

export default class OWL2ManchesterParser extends antlr4.Parser {

    static grammarFileName = "OWL2Manchester.g4";
    static literalNames = [ null, "'ObjectProperty:'", "':'", null, "'SubClassOf'", 
                            "'EquivalentTo'", "'DisjointWith'", "'domain'", 
                            "'range'", "'and'", "'or'", "'not'", "'some'", 
                            "'only'", "'min'", "'max'", "'exactly'", "'value'", 
                            null, null, "'('", "')'" ];
    static symbolicNames = [ null, null, null, "INT", "KW_SUBCLASSOF", "KW_EQUIVALENTTO", 
                             "KW_DISJOINTWITH", "KW_DOMAIN", "KW_RANGE", 
                             "KW_AND", "KW_OR", "KW_NOT", "KW_SOME", "KW_ONLY", 
                             "KW_MIN", "KW_MAX", "KW_EXACTLY", "KW_VALUE", 
                             "KW_COMPARISONOPERATOR", "WS", "LPAREN", "RPAREN", 
                             "ID" ];
    static ruleNames = [ "classExpression", "lexerError", "parserError", 
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
    	case 0:
    	    		return this.classExpression_sempred(localctx, predIndex);
        default:
            throw "No predicate with index:" + ruleIndex;
       }
    }

    classExpression_sempred(localctx, predIndex) {
    	switch(predIndex) {
    		case 0:
    			return this.precpred(this._ctx, 13);
    		case 1:
    			return this.precpred(this._ctx, 12);
    		case 2:
    			return this.precpred(this._ctx, 11);
    		case 3:
    			return this.precpred(this._ctx, 10);
    		case 4:
    			return this.precpred(this._ctx, 9);
    		case 5:
    			return this.precpred(this._ctx, 8);
    		case 6:
    			return this.precpred(this._ctx, 7);
    		case 7:
    			return this.precpred(this._ctx, 6);
    		case 8:
    			return this.precpred(this._ctx, 5);
    		case 9:
    			return this.precpred(this._ctx, 4);
    		case 10:
    			return this.precpred(this._ctx, 3);
    		case 11:
    			return this.precpred(this._ctx, 2);
    		default:
    			throw "No predicate with index:" + predIndex;
    	}
    };



	classExpression(_p) {
		if(_p===undefined) {
		    _p = 0;
		}
	    const _parentctx = this._ctx;
	    const _parentState = this.state;
	    let localctx = new ClassExpressionContext(this, this._ctx, _parentState);
	    let _prevctx = localctx;
	    const _startState = 0;
	    this.enterRecursionRule(localctx, 0, OWL2ManchesterParser.RULE_classExpression, _p);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 24;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 22:
	            this.state = 9;
	            this.match(OWL2ManchesterParser.ID);
	            break;
	        case 20:
	            this.state = 10;
	            this.match(OWL2ManchesterParser.LPAREN);
	            this.state = 11;
	            this.classExpression(0);
	            this.state = 12;
	            this.match(OWL2ManchesterParser.RPAREN);
	            break;
	        case 1:
	            this.state = 14;
	            this.match(OWL2ManchesterParser.T__0);
	            this.state = 15;
	            this.classExpression(0);

	            this.state = 16;
	            this.match(OWL2ManchesterParser.KW_DOMAIN);
	            this.state = 17;
	            this.match(OWL2ManchesterParser.T__1);
	            this.state = 18;
	            this.classExpression(0);

	            this.state = 20;
	            this.match(OWL2ManchesterParser.KW_RANGE);
	            this.state = 21;
	            this.match(OWL2ManchesterParser.T__1);
	            this.state = 22;
	            this.classExpression(0);
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	        this._ctx.stop = this._input.LT(-1);
	        this.state = 71;
	        this._errHandler.sync(this);
	        var _alt = this._interp.adaptivePredict(this._input,3,this._ctx)
	        while(_alt!=2 && _alt!=antlr4.atn.ATN.INVALID_ALT_NUMBER) {
	            if(_alt===1) {
	                if(this._parseListeners!==null) {
	                    this.triggerExitRuleEvent();
	                }
	                _prevctx = localctx;
	                this.state = 69;
	                this._errHandler.sync(this);
	                var la_ = this._interp.adaptivePredict(this._input,2,this._ctx);
	                switch(la_) {
	                case 1:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 26;
	                    if (!( this.precpred(this._ctx, 13))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 13)");
	                    }
	                    this.state = 27;
	                    this.match(OWL2ManchesterParser.KW_AND);
	                    this.state = 28;
	                    this.classExpression(14);
	                    break;

	                case 2:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 29;
	                    if (!( this.precpred(this._ctx, 12))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 12)");
	                    }
	                    this.state = 30;
	                    this.match(OWL2ManchesterParser.KW_OR);
	                    this.state = 31;
	                    this.classExpression(13);
	                    break;

	                case 3:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 32;
	                    if (!( this.precpred(this._ctx, 11))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 11)");
	                    }
	                    this.state = 33;
	                    this.match(OWL2ManchesterParser.KW_NOT);
	                    this.state = 34;
	                    this.classExpression(12);
	                    break;

	                case 4:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 35;
	                    if (!( this.precpred(this._ctx, 10))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 10)");
	                    }
	                    this.state = 36;
	                    this.match(OWL2ManchesterParser.KW_SOME);
	                    this.state = 37;
	                    this.classExpression(11);
	                    break;

	                case 5:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 38;
	                    if (!( this.precpred(this._ctx, 9))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 9)");
	                    }
	                    this.state = 39;
	                    this.match(OWL2ManchesterParser.KW_ONLY);
	                    this.state = 40;
	                    this.classExpression(10);
	                    break;

	                case 6:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 41;
	                    if (!( this.precpred(this._ctx, 8))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 8)");
	                    }
	                    this.state = 42;
	                    this.match(OWL2ManchesterParser.KW_MIN);
	                    this.state = 43;
	                    this.match(OWL2ManchesterParser.INT);
	                    this.state = 44;
	                    this.classExpression(9);
	                    break;

	                case 7:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 45;
	                    if (!( this.precpred(this._ctx, 7))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 7)");
	                    }
	                    this.state = 46;
	                    this.match(OWL2ManchesterParser.KW_MAX);
	                    this.state = 47;
	                    this.match(OWL2ManchesterParser.INT);
	                    this.state = 48;
	                    this.classExpression(8);
	                    break;

	                case 8:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 49;
	                    if (!( this.precpred(this._ctx, 6))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 6)");
	                    }
	                    this.state = 50;
	                    this.match(OWL2ManchesterParser.KW_EXACTLY);
	                    this.state = 51;
	                    this.match(OWL2ManchesterParser.INT);
	                    this.state = 52;
	                    this.classExpression(7);
	                    break;

	                case 9:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 53;
	                    if (!( this.precpred(this._ctx, 5))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 5)");
	                    }
	                    this.state = 54;
	                    this.match(OWL2ManchesterParser.KW_SUBCLASSOF);
	                    this.state = 55;
	                    this.classExpression(6);
	                    break;

	                case 10:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 56;
	                    if (!( this.precpred(this._ctx, 4))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 4)");
	                    }
	                    this.state = 57;
	                    this.match(OWL2ManchesterParser.KW_EQUIVALENTTO);
	                    this.state = 58;
	                    this.classExpression(5);
	                    break;

	                case 11:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 59;
	                    if (!( this.precpred(this._ctx, 3))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 3)");
	                    }
	                    this.state = 60;
	                    this.match(OWL2ManchesterParser.KW_DISJOINTWITH);
	                    this.state = 61;
	                    this.classExpression(4);
	                    break;

	                case 12:
	                    localctx = new ClassExpressionContext(this, _parentctx, _parentState);
	                    this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
	                    this.state = 62;
	                    if (!( this.precpred(this._ctx, 2))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 2)");
	                    }
	                    this.state = 63;
	                    this.match(OWL2ManchesterParser.KW_VALUE);
	                    this.state = 64;
	                    this.match(OWL2ManchesterParser.KW_COMPARISONOPERATOR);
	                    this.state = 65;
	                    this.match(OWL2ManchesterParser.INT);
	                    this.state = 67;
	                    this._errHandler.sync(this);
	                    var la_ = this._interp.adaptivePredict(this._input,1,this._ctx);
	                    if(la_===1) {
	                        this.state = 66;
	                        this.classExpression(0);

	                    }
	                    break;

	                } 
	            }
	            this.state = 73;
	            this._errHandler.sync(this);
	            _alt = this._interp.adaptivePredict(this._input,3,this._ctx);
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



	lexerError() {
	    let localctx = new LexerErrorContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 2, OWL2ManchesterParser.RULE_lexerError);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 74;
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
	    this.enterRule(localctx, 4, OWL2ManchesterParser.RULE_parserError);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 76;
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
	    this.enterRule(localctx, 6, OWL2ManchesterParser.RULE_axiom);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 79; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 78;
	            this.classExpression(0);
	            this.state = 81; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while((((_la) & ~0x1f) === 0 && ((1 << _la) & 5242882) !== 0));
	        this.state = 83;
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
OWL2ManchesterParser.INT = 3;
OWL2ManchesterParser.KW_SUBCLASSOF = 4;
OWL2ManchesterParser.KW_EQUIVALENTTO = 5;
OWL2ManchesterParser.KW_DISJOINTWITH = 6;
OWL2ManchesterParser.KW_DOMAIN = 7;
OWL2ManchesterParser.KW_RANGE = 8;
OWL2ManchesterParser.KW_AND = 9;
OWL2ManchesterParser.KW_OR = 10;
OWL2ManchesterParser.KW_NOT = 11;
OWL2ManchesterParser.KW_SOME = 12;
OWL2ManchesterParser.KW_ONLY = 13;
OWL2ManchesterParser.KW_MIN = 14;
OWL2ManchesterParser.KW_MAX = 15;
OWL2ManchesterParser.KW_EXACTLY = 16;
OWL2ManchesterParser.KW_VALUE = 17;
OWL2ManchesterParser.KW_COMPARISONOPERATOR = 18;
OWL2ManchesterParser.WS = 19;
OWL2ManchesterParser.LPAREN = 20;
OWL2ManchesterParser.RPAREN = 21;
OWL2ManchesterParser.ID = 22;

OWL2ManchesterParser.RULE_classExpression = 0;
OWL2ManchesterParser.RULE_lexerError = 1;
OWL2ManchesterParser.RULE_parserError = 2;
OWL2ManchesterParser.RULE_axiom = 3;

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

	LPAREN() {
	    return this.getToken(OWL2ManchesterParser.LPAREN, 0);
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

	RPAREN() {
	    return this.getToken(OWL2ManchesterParser.RPAREN, 0);
	};

	KW_DOMAIN() {
	    return this.getToken(OWL2ManchesterParser.KW_DOMAIN, 0);
	};

	KW_RANGE() {
	    return this.getToken(OWL2ManchesterParser.KW_RANGE, 0);
	};

	KW_AND() {
	    return this.getToken(OWL2ManchesterParser.KW_AND, 0);
	};

	KW_OR() {
	    return this.getToken(OWL2ManchesterParser.KW_OR, 0);
	};

	KW_NOT() {
	    return this.getToken(OWL2ManchesterParser.KW_NOT, 0);
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

	KW_COMPARISONOPERATOR() {
	    return this.getToken(OWL2ManchesterParser.KW_COMPARISONOPERATOR, 0);
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




OWL2ManchesterParser.ClassExpressionContext = ClassExpressionContext; 
OWL2ManchesterParser.LexerErrorContext = LexerErrorContext; 
OWL2ManchesterParser.ParserErrorContext = ParserErrorContext; 
OWL2ManchesterParser.AxiomContext = AxiomContext; 
