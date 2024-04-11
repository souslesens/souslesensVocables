grammar OWL2Manchester;

// Lexer rules
DIGIT : [0-9];
NONNEGATIVEINTEGER : DIGIT+;

AND : 'and';
OR : 'or';
NOT : 'not';

SOME : 'some';
ONLY : 'only';
VALUE : 'value';
MIN : 'min';
MAX : 'max';
EXACTLY : 'exactly';
SELF : 'self';

CONCEPT : '_'[a-zA-Z0-9_]*; // Concept identifier
OBJECT_PROPERTY : [a-zA-Z][a-zA-Z0-9_]*; // Object property identifier (can't start with an underscore)
WS : [ \t\r\n]+ -> skip;

LPAREN : '(';
RPAREN : ')';

// Parser rules

classExpression: CONCEPT
                | LPAREN classExpression RPAREN
                | classExpression AND classExpression
                | classExpression OR classExpression
               // | NOT classExpression
                | OBJECT_PROPERTY SOME classExpression
                | OBJECT_PROPERTY ONLY classExpression
                | OBJECT_PROPERTY VALUE CONCEPT
                | OBJECT_PROPERTY SELF
                | OBJECT_PROPERTY MIN NONNEGATIVEINTEGER classExpression?
                | OBJECT_PROPERTY MAX NONNEGATIVEINTEGER classExpression?
                | OBJECT_PROPERTY EXACTLY NONNEGATIVEINTEGER classExpression?
; 

axiom: classExpression+ EOF;