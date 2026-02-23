<!-- AUTO-GENERATED: do not edit by hand -->
# ManchesterSyntax

<!-- AUTO-DESC:START -->

This page summarizes the code structure for this directory and its immediate subdirectories. It focuses on the `bin / axioms / manchesterSyntax` area within the `bin` module. Use the table of contents below to navigate deeper.

<!-- AUTO-DESC:END -->

## Overview

The **manchesterSyntax** directory contains the **ANTLR4 grammar and auto-generated parser/lexer** for OWL 2 Manchester Syntax. These files are used by `manchesterSyntaxEngine.js` to parse and validate axiom expressions.

---

## Modules

### Grammar definition

1. **OWL2Manchester.g4** — ANTLR4 grammar file that defines the lexical and parser rules for parsing OWL 2 Manchester syntax expressions with keywords (`and`, `or`, `some`, `only`, `exactly`, `min`, `max`, etc.) and class/property identifiers.
2. **OWL2Manchester copy.g4** — Backup copy of the grammar file.

### Auto-generated parser (from ANTLR4)

3. **OWL2ManchesterLexer.js** — Auto-generated ANTLR4 lexer implementation that tokenizes Manchester syntax input by recognizing keywords, identifiers, operators, and whitespace according to the grammar.
4. **OWL2ManchesterParser.js** — Auto-generated ANTLR4 parser implementation that parses tokenized input into an abstract syntax tree following the Manchester syntax grammar rules.
5. **OWL2ManchesterListener.js** — Auto-generated ANTLR4 listener interface that defines event hooks (enter/exit callbacks) for parse tree nodes during Manchester syntax parsing.

### Support files

6. **util.js** — Utility module containing token/literal name mappings and symbolic names used by the lexer/parser for OWL 2 Manchester syntax tokens.
7. **OWL2Manchester.interp** / **OWL2Manchester.tokens** / **OWL2ManchesterLexer.interp** / **OWL2ManchesterLexer.tokens** — ANTLR4 interpreter and token metadata files generated alongside the parser/lexer.

---

## Usage

- These files are imported by `manchesterSyntaxEngine.js` in the parent directory.
- The grammar file (`OWL2Manchester.g4`) is the source of truth; the `.js` files are auto-generated via `antlr4` and should not be edited manually.
- To regenerate the parser after grammar changes, run the ANTLR4 tool on `OWL2Manchester.g4`.


```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `OWL2Manchester copy.g4`
- `OWL2Manchester.g4`
- `OWL2Manchester.interp`
- `OWL2Manchester.tokens`
- `OWL2ManchesterLexer.interp`
- `OWL2ManchesterLexer.js`
- `OWL2ManchesterLexer.tokens`
- `OWL2ManchesterListener.js`
- `OWL2ManchesterParser.js`
- `util.js`

<!-- AUTO-INLINE-FILES:END -->
