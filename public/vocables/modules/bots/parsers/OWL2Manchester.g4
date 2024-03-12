// OWL2Manchester.g4

grammar OWL2Manchester;

// Lexer rules
WS: [ \t\r\n]+ -> skip;

fragment LETTER: [a-zA-Z];
fragment DIGIT: [0-9];

// Keywords
KW_PREFIX: 'Prefix';
KW_CLASS: 'Class';
KW_INDIVIDUAL: 'Individual';
KW_PROPERTY: 'Property';
KW_OBJECTPROPERTY: 'ObjectProperty';
KW_TYPES: 'Types';
KW_FACTS: 'Facts';
KW_SUBCLASSOF: 'SubClassOf';
KW_EQUIVALENTTO: 'EquivalentTo';
KW_DISJOINTWITH: 'DisjointWith';

KW_AND: 'and';
KW_OR: 'or';
KW_NOT: 'not';
KW_SOME: 'some';
KW_ONLY: 'only';
KW_MIN: 'min';
KW_MAX: 'max';
KW_EXACTLY: 'exactly';
KW_VALUE: 'value';
comparisonOperator: '>' | '<' | '>=' | '<=';


// Tokens explicitly defined in lexer
KW_DOMAIN: 'Domain';
KW_RANGE: 'Range';
STRING: '\'' ~[']* '\'';

// Identifier rule
ID: LETTER (LETTER | DIGIT | '_')*;



// Axiom rules
prefixAxiom: KW_PREFIX ID; 
classAxiom: KW_CLASS ID (KW_SUBCLASSOF ID)? (KW_EQUIVALENTTO classExpression)? | KW_CLASS ID (KW_EQUIVALENTTO classExpression)? (KW_SUBCLASSOF ID)?;
subclassAxiom: KW_CLASS ID KW_SUBCLASSOF ID;
equivalentClassAxiom: KW_CLASS ID KW_EQUIVALENTTO classExpression;
disjointAxiom: KW_CLASS ID KW_DISJOINTWITH ID;
conjunctionAxiom: KW_CLASS ID KW_AND ID+;
disjunctionAxiom: KW_CLASS ID KW_OR ID+;
negationAxiom: KW_CLASS ID KW_NOT ID;
propertyAxiom: KW_PROPERTY ID (KW_DOMAIN classExpression)? (KW_RANGE classExpression)?;
objectpropertyaxiom: KW_OBJECTPROPERTY ID (KW_DOMAIN classExpression)? (KW_RANGE classExpression)?;


classExpression: ID
               |'(' classExpression ')'                             // Parenthesized expression
               | classExpression KW_AND classExpression                     // Atomic class or conjunction
               | classExpression KW_OR classExpression
               | classExpression KW_SOME classExpression            // Existential quantification
               | classExpression KW_ONLY classExpression         // Universal quantification
               | classExpression KW_MIN INT classExpression  // Minimum cardinality restriction
               | classExpression KW_MAX INT classExpression  // Maximum cardinality restriction
               | classExpression KW_EXACTLY INT classExpression  // Exact cardinality restriction
               | classExpression KW_SUBCLASSOF classExpression
               | classExpression KW_EQUIVALENTTO classExpression
               | classExpression KW_DISJOINTWITH classExpression
               | classExpression KW_VALUE comparisonOperator INT classExpression
               ;


// New rules for individuals and properties
individualAxiom: KW_INDIVIDUAL ID (typeSection | factsSection | propertySection)*;

typeSection: KW_TYPES ID (ID ID*)?;  
factsSection: KW_FACTS (ID v)+;
propertySection: KW_PROPERTY ID KW_DOMAIN ID KW_RANGE ID;

BOOLEAN: 'true' | 'false'; 
INT: [0-9]+;
v: BOOLEAN | STRING | ID;

// Error handling for lexer errors
lexerError: . ;

// Error handling for parser errors
parserError : . ;
INVALID_TOKEN: .;

// Entry point
axiom: classExpression+ EOF;
