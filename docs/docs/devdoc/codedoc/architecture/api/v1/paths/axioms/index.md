<!-- AUTO-GENERATED: do not edit by hand -->
# Axioms

<!-- AUTO-DESC:START -->

## Overview

In-process axiom helpers (`bin/axioms/manchesterSyntaxEngine.js`) used by the Manchester editor when round-tripping to the JOWL server is overkill. Complement the `jowl/*` routes for fast, local autocomplete/validation.

## Modules

### 1. Suggestion (`suggestion.js`)
Returns the list of valid follow-up tokens for the in-progress Manchester expression (`getSuggestion(lastToken, options)`).

### 2. Validation (`validator.js`)
Parses the full Manchester axiom and returns the parse tree or the error position (`validateAxiom(axiom)`).

### 3. Manchester rendering (`manchester.js`)
Optional in-process Manchester rendering of an axiom triple set (currently delegated to the JOWL endpoint by default — kept for legacy callers).

<!-- AUTO-DESC:END -->

```{toctree}
:maxdepth: 5
:caption: Contents

```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `suggestion.js`
- `validator.js`

<!-- AUTO-INLINE-FILES:END -->
