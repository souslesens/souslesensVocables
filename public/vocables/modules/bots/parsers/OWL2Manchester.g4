// OWL2Manchester.g4

grammar OWL2Manchester;

// Lexer rules
fragment LETTER: [a-zA-Z];
fragment DIGIT: [0-9];

// Keywords
KW_CLASS: 'Class';
KW_SUBCLASSOF: 'SubClassOf';
KW_EQUIVALENTTO: 'EquivalentTo';
KW_DISJOINTWITH: 'DisjointWith';
KW_AND: 'and';
KW_OR: 'or';
KW_NOT: 'not';

// Identifier rule
ID: LETTER (LETTER | DIGIT)*;

// Axiom rules
classAxiom: KW_CLASS ID;
subclassAxiom: KW_CLASS ID KW_SUBCLASSOF ID;
equivalentAxiom: KW_CLASS ID KW_EQUIVALENTTO ID;
disjointAxiom: KW_CLASS ID KW_DISJOINTWITH ID;
conjunctionAxiom: KW_CLASS ID KW_AND ID+;
disjunctionAxiom: KW_CLASS ID KW_OR ID+;
negationAxiom: KW_CLASS ID KW_NOT ID;

// Error handling for lexer errors
lexerError : . ;

// Error handling for parser errors
parserError : . ;

// Entry point
axiom: (classAxiom | subclassAxiom | equivalentAxiom | disjointAxiom | conjunctionAxiom | disjunctionAxiom | negationAxiom)+ EOF;
