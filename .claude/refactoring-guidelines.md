# SousLeSens Vocables - Refactoring Guidelines

## DRY Principle - MANDATORY WORKFLOW

**Before implementing ANY new feature, Claude Code MUST:**

### Step 1: Consult the Function Index
```
Read .claude/function-index.md FIRST
```
- Search for existing functions that might fulfill your needs
- Check if similar functionality already exists in the codebase

### Step 2: Search Key Utility Files
If not found in the index, search these files:
- `public/vocables/modules/shared/common.js` - General utilities
- `public/vocables/modules/shared/UI.js` - UI helpers
- `public/vocables/modules/sparqlProxies/sparql_proxy.js` - SPARQL execution
- `public/vocables/modules/sparqlProxies/sparql_generic.js` - SPARQL CRUD
- `public/vocables/modules/uiWidgets/*.js` - UI widgets

### Step 3: Reuse or Create
- **If function exists**: Use it. Do NOT recreate it.
- **If function is similar**: Extend it or use composition.
- **If function doesn't exist**: Create it with proper JSDoc, then add to function-index.md.

### Step 4: Update the Index
When creating a new public function:
1. Add JSDoc to the function in the source file
2. Add entry to `.claude/function-index.md` with:
   - Full signature
   - Description
   - Parameters with types
   - Return value
   - Usage example

---

## Code Style Rules

### Language
- **All code and comments must be in English**
- No French in variable names, function names, or comments

### Comments
- **Minimize unnecessary comments** - only add comments for subtle/complex logic
- **Do NOT comment obvious code** - if the code is self-descriptive, no comment needed
- **Use JSDoc** for function documentation (parameters, returns, description)
- Examples of unnecessary comments to avoid:
  ```javascript
  // BAD - obvious from code
  str += "<tr>";  // Add table row

  // GOOD - explains subtle behavior
  // URI shortened to last segment for readability, full URI in tooltip
  ```

### Naming Conventions
- Use `callback` instead of `callbackAsync`, `callbackSeries`, etc.
- Be consistent with existing codebase naming patterns
- Use descriptive variable names

### Code Structure
- **Methods belong to the module** - avoid defining functions inside functions
- **Exception**: Standard JavaScript array methods like `.forEach()`, `.map()`, `.filter()` are fine
- Keep functions focused and single-purpose
- Extract complex logic into separate module methods

### Async Patterns
- Use `async.series()` for sequential operations
- Use `callback` as the standard name for callback parameters
- Handle errors consistently: `if(err) { return callback(err); }`

### HTML Generation
- Build HTML strings progressively with `+=`
- Keep HTML generation methods simple and focused
- Use consistent class names matching existing styles

## Examples

### Good Pattern
```javascript
self.generateResultsTable = function(title, data) {
    var str = "<div class='NodesInfos_tableDiv'>";
    str += "<table class='infosTable'><tbody>";
    str += "<tr><td class='NodesInfos_CardId'>" + title + "</td></tr>";

    data.forEach(function(item) {
        str += self.generateRow(item);
    });

    str += "</tbody></table></div>";
    return str;
}
```

### Bad Pattern
```javascript
self.generateResultsTable = function(title, data) {
    // Create a div element - UNNECESSARY COMMENT
    var str = "<div class='NodesInfos_tableDiv'>";

    // Helper function inside method - AVOID THIS
    var generateRow = function(item) {
        return "<tr><td>" + item + "</td></tr>";
    }

    // Loop through data - UNNECESSARY COMMENT
    data.forEach(function(item) {
        str += generateRow(item);
    });

    return str;
}
```

## History

### 2025-01-12 - DRY Principle Implementation
- Added mandatory DRY workflow before implementing features
- Claude Code must consult function-index.md FIRST
- New functions must be added to the index with JSDoc

### 2025-11-28 - Initial Guidelines
- Established English-only rule
- Defined comment guidelines (minimal, only for subtleties)
- Standardized on `callback` naming
- Module-level methods preferred over nested functions
