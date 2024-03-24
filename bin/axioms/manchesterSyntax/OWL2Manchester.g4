// OWL2Manchester.g4

grammar OWL2Manchester;

fragment LETTER: [a-zA-Z];
fragment DIGIT: [0-9];

INT: [0-9]+;

// Keywords
KW_SUBCLASSOF: 'SubClassOf';
KW_EQUIVALENTTO: 'EquivalentTo';
KW_DISJOINTWITH: 'DisjointWith';

KW_DOMAIN: 'domain';
KW_RANGE: 'range';

KW_AND: 'and';
KW_OR: 'or';
KW_NOT: 'not';
KW_SOME: 'some';
KW_ONLY: 'only';
KW_MIN: 'min';
KW_MAX: 'max';
KW_EXACTLY: 'exactly';
KW_VALUE: 'value';
KW_COMPARISONOPERATOR: '<' | '<=' | '>' | '>=';

WS: [ \t\r\n]+ -> skip;

LPAREN: '(';
RPAREN: ')';

// Identifier rule
ID: LETTER (LETTER | DIGIT | '_')*;

classExpression: ID
               | LPAREN classExpression RPAREN                     
               | classExpression KW_AND classExpression               
               | classExpression KW_OR classExpression
               | classExpression KW_NOT classExpression
               | classExpression KW_SOME classExpression     
               | classExpression KW_ONLY classExpression       
               | classExpression KW_MIN INT classExpression 
               | classExpression KW_MAX INT classExpression  
               | classExpression KW_EXACTLY INT classExpression  
               | classExpression KW_SUBCLASSOF classExpression
               | classExpression KW_EQUIVALENTTO classExpression
               | classExpression KW_DISJOINTWITH classExpression
               | classExpression KW_VALUE KW_COMPARISONOPERATOR INT classExpression?
               | 'ObjectProperty:' classExpression (KW_DOMAIN':' classExpression) (KW_RANGE':' classExpression)
               ;

// Error handling for lexer errors
lexerError: . ;

// Error handling for parser errors
parserError : . ;

// Entry point
axiom: classExpression+ EOF;
