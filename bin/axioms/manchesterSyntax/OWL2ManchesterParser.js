// Generated from parser/OWL2Manchester.g4 by ANTLR 4.13.1
// jshint ignore: start
// import antlr4 from 'antlr4';
// import OWL2ManchesterListener from './OWL2ManchesterListener.js';

import antlr4 from 'antlr4';

import OWL2ManchesterListener from './OWL2ManchesterListener.js';

const serializedATN = [
    4, 1, 17, 62, 2, 0, 7, 0, 2, 1, 7, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 3, 0, 28, 8, 0, 1,
    0, 1, 0, 1, 0, 1, 0, 3, 0, 34, 8, 0, 1, 0, 1, 0, 1, 0, 1, 0, 3, 0, 40, 8, 0, 3, 0, 42, 8, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 5, 0, 50, 8, 0, 10, 0, 12, 0, 53, 9, 0, 1, 1, 4, 1, 56, 8, 1, 11,
    1, 12, 1, 57, 1, 1, 1, 1, 1, 1, 0, 1, 0, 2, 0, 2, 0, 0, 74, 0, 41, 1, 0, 0, 0, 2, 55, 1, 0, 0, 0, 4, 5, 6, 0, -1, 0, 5, 42, 5, 13, 0, 0, 6, 7, 5, 16, 0, 0, 7, 8, 3, 0, 0, 0, 8, 9, 5, 17, 0, 0, 9,
    42, 1, 0, 0, 0, 10, 11, 5, 5, 0, 0, 11, 42, 3, 0, 0, 8, 12, 13, 5, 14, 0, 0, 13, 14, 5, 6, 0, 0, 14, 42, 3, 0, 0, 7, 15, 16, 5, 14, 0, 0, 16, 17, 5, 7, 0, 0, 17, 42, 3, 0, 0, 6, 18, 19, 5, 14, 0,
    0, 19, 20, 5, 8, 0, 0, 20, 42, 5, 13, 0, 0, 21, 22, 5, 14, 0, 0, 22, 42, 5, 12, 0, 0, 23, 24, 5, 14, 0, 0, 24, 25, 5, 9, 0, 0, 25, 27, 5, 2, 0, 0, 26, 28, 3, 0, 0, 0, 27, 26, 1, 0, 0, 0, 27, 28,
    1, 0, 0, 0, 28, 42, 1, 0, 0, 0, 29, 30, 5, 14, 0, 0, 30, 31, 5, 10, 0, 0, 31, 33, 5, 2, 0, 0, 32, 34, 3, 0, 0, 0, 33, 32, 1, 0, 0, 0, 33, 34, 1, 0, 0, 0, 34, 42, 1, 0, 0, 0, 35, 36, 5, 14, 0, 0,
    36, 37, 5, 11, 0, 0, 37, 39, 5, 2, 0, 0, 38, 40, 3, 0, 0, 0, 39, 38, 1, 0, 0, 0, 39, 40, 1, 0, 0, 0, 40, 42, 1, 0, 0, 0, 41, 4, 1, 0, 0, 0, 41, 6, 1, 0, 0, 0, 41, 10, 1, 0, 0, 0, 41, 12, 1, 0, 0,
    0, 41, 15, 1, 0, 0, 0, 41, 18, 1, 0, 0, 0, 41, 21, 1, 0, 0, 0, 41, 23, 1, 0, 0, 0, 41, 29, 1, 0, 0, 0, 41, 35, 1, 0, 0, 0, 42, 51, 1, 0, 0, 0, 43, 44, 10, 10, 0, 0, 44, 45, 5, 3, 0, 0, 45, 50, 3,
    0, 0, 11, 46, 47, 10, 9, 0, 0, 47, 48, 5, 4, 0, 0, 48, 50, 3, 0, 0, 10, 49, 43, 1, 0, 0, 0, 49, 46, 1, 0, 0, 0, 50, 53, 1, 0, 0, 0, 51, 49, 1, 0, 0, 0, 51, 52, 1, 0, 0, 0, 52, 1, 1, 0, 0, 0, 53,
    51, 1, 0, 0, 0, 54, 56, 3, 0, 0, 0, 55, 54, 1, 0, 0, 0, 56, 57, 1, 0, 0, 0, 57, 55, 1, 0, 0, 0, 57, 58, 1, 0, 0, 0, 58, 59, 1, 0, 0, 0, 59, 60, 5, 0, 0, 1, 60, 3, 1, 0, 0, 0, 7, 27, 33, 39, 41,
    49, 51, 57,
];

const atn = new antlr4.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map((ds, index) => new antlr4.DFA(ds, index));

const sharedContextCache = new antlr4.PredictionContextCache();

class OWL2ManchesterParser extends antlr4.Parser {
    static grammarFileName = "OWL2Manchester.g4";
    static literalNames = [null, null, null, "'and'", "'or'", "'not'", "'some'", "'only'", "'value'", "'min'", "'max'", "'exactly'", "'self'", null, null, null, "'('", "')'"];
    static symbolicNames = [null, "DIGIT", "NONNEGATIVEINTEGER", "AND", "OR", "NOT", "SOME", "ONLY", "VALUE", "MIN", "MAX", "EXACTLY", "SELF", "CONCEPT", "OBJECT_PROPERTY", "WS", "LPAREN", "RPAREN"];
    static ruleNames = ["classExpression", "axiom"];

    constructor(input) {
        super(input);
        this._interp = new antlr4.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
        this.ruleNames = OWL2ManchesterParser.ruleNames;
        this.literalNames = OWL2ManchesterParser.literalNames;
        this.symbolicNames = OWL2ManchesterParser.symbolicNames;
    }

    sempred(localctx, ruleIndex, predIndex) {
        switch (ruleIndex) {
            case 0:
                return this.classExpression_sempred(localctx, predIndex);
            default:
                throw "No predicate with index:" + ruleIndex;
        }
    }

    classExpression_sempred(localctx, predIndex) {
        switch (predIndex) {
            case 0:
                return this.precpred(this._ctx, 10);
            case 1:
                return this.precpred(this._ctx, 9);
            default:
                throw "No predicate with index:" + predIndex;
        }
    }

    classExpression(_p) {
        if (_p === undefined) {
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
            this.state = 41;
            this._errHandler.sync(this);
            var la_ = this._interp.adaptivePredict(this._input, 3, this._ctx);
            switch (la_) {
                case 1:
                    this.state = 5;
                    this.match(OWL2ManchesterParser.CONCEPT);
                    break;

                case 2:
                    this.state = 6;
                    this.match(OWL2ManchesterParser.LPAREN);
                    this.state = 7;
                    this.classExpression(0);
                    this.state = 8;
                    this.match(OWL2ManchesterParser.RPAREN);
                    break;

                case 3:
                    this.state = 10;
                    this.match(OWL2ManchesterParser.NOT);
                    this.state = 11;
                    this.classExpression(8);
                    break;

                case 4:
                    this.state = 12;
                    this.match(OWL2ManchesterParser.OBJECT_PROPERTY);
                    this.state = 13;
                    this.match(OWL2ManchesterParser.SOME);
                    this.state = 14;
                    this.classExpression(7);
                    break;

                case 5:
                    this.state = 15;
                    this.match(OWL2ManchesterParser.OBJECT_PROPERTY);
                    this.state = 16;
                    this.match(OWL2ManchesterParser.ONLY);
                    this.state = 17;
                    this.classExpression(6);
                    break;

                case 6:
                    this.state = 18;
                    this.match(OWL2ManchesterParser.OBJECT_PROPERTY);
                    this.state = 19;
                    this.match(OWL2ManchesterParser.VALUE);
                    this.state = 20;
                    this.match(OWL2ManchesterParser.CONCEPT);
                    break;

                case 7:
                    this.state = 21;
                    this.match(OWL2ManchesterParser.OBJECT_PROPERTY);
                    this.state = 22;
                    this.match(OWL2ManchesterParser.SELF);
                    break;

                case 8:
                    this.state = 23;
                    this.match(OWL2ManchesterParser.OBJECT_PROPERTY);
                    this.state = 24;
                    this.match(OWL2ManchesterParser.MIN);
                    this.state = 25;
                    this.match(OWL2ManchesterParser.NONNEGATIVEINTEGER);
                    this.state = 27;
                    this._errHandler.sync(this);
                    var la_ = this._interp.adaptivePredict(this._input, 0, this._ctx);
                    if (la_ === 1) {
                        this.state = 26;
                        this.classExpression(0);
                    }
                    break;

                case 9:
                    this.state = 29;
                    this.match(OWL2ManchesterParser.OBJECT_PROPERTY);
                    this.state = 30;
                    this.match(OWL2ManchesterParser.MAX);
                    this.state = 31;
                    this.match(OWL2ManchesterParser.NONNEGATIVEINTEGER);
                    this.state = 33;
                    this._errHandler.sync(this);
                    var la_ = this._interp.adaptivePredict(this._input, 1, this._ctx);
                    if (la_ === 1) {
                        this.state = 32;
                        this.classExpression(0);
                    }
                    break;

                case 10:
                    this.state = 35;
                    this.match(OWL2ManchesterParser.OBJECT_PROPERTY);
                    this.state = 36;
                    this.match(OWL2ManchesterParser.EXACTLY);
                    this.state = 37;
                    this.match(OWL2ManchesterParser.NONNEGATIVEINTEGER);
                    this.state = 39;
                    this._errHandler.sync(this);
                    var la_ = this._interp.adaptivePredict(this._input, 2, this._ctx);
                    if (la_ === 1) {
                        this.state = 38;
                        this.classExpression(0);
                    }
                    break;
            }
            this._ctx.stop = this._input.LT(-1);
            this.state = 51;
            this._errHandler.sync(this);
            var _alt = this._interp.adaptivePredict(this._input, 5, this._ctx);
            while (_alt != 2 && _alt != antlr4.ATN.INVALID_ALT_NUMBER) {
                if (_alt === 1) {
                    if (this._parseListeners !== null) {
                        this.triggerExitRuleEvent();
                    }
                    _prevctx = localctx;
                    this.state = 49;
                    this._errHandler.sync(this);
                    var la_ = this._interp.adaptivePredict(this._input, 4, this._ctx);
                    switch (la_) {
                        case 1:
                            localctx = new ClassExpressionContext(this, _parentctx, _parentState);
                            this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
                            this.state = 43;
                            if (!this.precpred(this._ctx, 10)) {
                                throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 10)");
                            }
                            this.state = 44;
                            this.match(OWL2ManchesterParser.AND);
                            this.state = 45;
                            this.classExpression(11);
                            break;

                        case 2:
                            localctx = new ClassExpressionContext(this, _parentctx, _parentState);
                            this.pushNewRecursionContext(localctx, _startState, OWL2ManchesterParser.RULE_classExpression);
                            this.state = 46;
                            if (!this.precpred(this._ctx, 9)) {
                                throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 9)");
                            }
                            this.state = 47;
                            this.match(OWL2ManchesterParser.OR);
                            this.state = 48;
                            this.classExpression(10);
                            break;
                    }
                }
                this.state = 53;
                this._errHandler.sync(this);
                _alt = this._interp.adaptivePredict(this._input, 5, this._ctx);
            }
        } catch (error) {
            if (error instanceof antlr4.error.RecognitionException) {
                localctx.exception = error;
                this._errHandler.reportError(this, error);
                this._errHandler.recover(this, error);
            } else {
                throw error;
            }
        } finally {
            this.unrollRecursionContexts(_parentctx);
        }
        return localctx;
    }

    axiom() {
        let localctx = new AxiomContext(this, this._ctx, this.state);
        this.enterRule(localctx, 2, OWL2ManchesterParser.RULE_axiom);
        var _la = 0;
        try {
            this.enterOuterAlt(localctx, 1);
            this.state = 55;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
            do {
                this.state = 54;
                this.classExpression(0);
                this.state = 57;
                this._errHandler.sync(this);
                _la = this._input.LA(1);
            } while ((_la & ~0x1f) === 0 && ((1 << _la) & 90144) !== 0);
            this.state = 59;
            this.match(OWL2ManchesterParser.EOF);
        } catch (re) {
            if (re instanceof antlr4.error.RecognitionException) {
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
OWL2ManchesterParser.DIGIT = 1;
OWL2ManchesterParser.NONNEGATIVEINTEGER = 2;
OWL2ManchesterParser.AND = 3;
OWL2ManchesterParser.OR = 4;
OWL2ManchesterParser.NOT = 5;
OWL2ManchesterParser.SOME = 6;
OWL2ManchesterParser.ONLY = 7;
OWL2ManchesterParser.VALUE = 8;
OWL2ManchesterParser.MIN = 9;
OWL2ManchesterParser.MAX = 10;
OWL2ManchesterParser.EXACTLY = 11;
OWL2ManchesterParser.SELF = 12;
OWL2ManchesterParser.CONCEPT = 13;
OWL2ManchesterParser.OBJECT_PROPERTY = 14;
OWL2ManchesterParser.WS = 15;
OWL2ManchesterParser.LPAREN = 16;
OWL2ManchesterParser.RPAREN = 17;

OWL2ManchesterParser.RULE_classExpression = 0;
OWL2ManchesterParser.RULE_axiom = 1;

class ClassExpressionContext extends antlr4.ParserRuleContext {
    constructor(parser, parent, invokingState) {
        if (parent === undefined) {
            parent = null;
        }
        if (invokingState === undefined || invokingState === null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_classExpression;
    }

    CONCEPT() {
        return this.getToken(OWL2ManchesterParser.CONCEPT, 0);
    }

    LPAREN() {
        return this.getToken(OWL2ManchesterParser.LPAREN, 0);
    }

    classExpression = function (i) {
        if (i === undefined) {
            i = null;
        }
        if (i === null) {
            return this.getTypedRuleContexts(ClassExpressionContext);
        } else {
            return this.getTypedRuleContext(ClassExpressionContext, i);
        }
    };

    RPAREN() {
        return this.getToken(OWL2ManchesterParser.RPAREN, 0);
    }

    NOT() {
        return this.getToken(OWL2ManchesterParser.NOT, 0);
    }

    OBJECT_PROPERTY() {
        return this.getToken(OWL2ManchesterParser.OBJECT_PROPERTY, 0);
    }

    SOME() {
        return this.getToken(OWL2ManchesterParser.SOME, 0);
    }

    ONLY() {
        return this.getToken(OWL2ManchesterParser.ONLY, 0);
    }

    VALUE() {
        return this.getToken(OWL2ManchesterParser.VALUE, 0);
    }

    SELF() {
        return this.getToken(OWL2ManchesterParser.SELF, 0);
    }

    MIN() {
        return this.getToken(OWL2ManchesterParser.MIN, 0);
    }

    NONNEGATIVEINTEGER() {
        return this.getToken(OWL2ManchesterParser.NONNEGATIVEINTEGER, 0);
    }

    MAX() {
        return this.getToken(OWL2ManchesterParser.MAX, 0);
    }

    EXACTLY() {
        return this.getToken(OWL2ManchesterParser.EXACTLY, 0);
    }

    AND() {
        return this.getToken(OWL2ManchesterParser.AND, 0);
    }

    OR() {
        return this.getToken(OWL2ManchesterParser.OR, 0);
    }

    enterRule(listener) {
        if (listener instanceof OWL2ManchesterListener) {
            listener.enterClassExpression(this);
        }
    }

    exitRule(listener) {
        if (listener instanceof OWL2ManchesterListener) {
            listener.exitClassExpression(this);
        }
    }
}

class AxiomContext extends antlr4.ParserRuleContext {
    constructor(parser, parent, invokingState) {
        if (parent === undefined) {
            parent = null;
        }
        if (invokingState === undefined || invokingState === null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = OWL2ManchesterParser.RULE_axiom;
    }

    EOF() {
        return this.getToken(OWL2ManchesterParser.EOF, 0);
    }

    classExpression = function (i) {
        if (i === undefined) {
            i = null;
        }
        if (i === null) {
            return this.getTypedRuleContexts(ClassExpressionContext);
        } else {
            return this.getTypedRuleContext(ClassExpressionContext, i);
        }
    };

    enterRule(listener) {
        if (listener instanceof OWL2ManchesterListener) {
            listener.enterAxiom(this);
        }
    }

    exitRule(listener) {
        if (listener instanceof OWL2ManchesterListener) {
            listener.exitAxiom(this);
        }
    }
}

OWL2ManchesterParser.ClassExpressionContext = ClassExpressionContext;
OWL2ManchesterParser.AxiomContext = AxiomContext;

export default OWL2ManchesterParser;