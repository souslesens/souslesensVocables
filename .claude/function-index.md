# Function Index - SousLeSens Vocables (Frontend)

## Purpose

This index catalogs all public functions in the **frontend codebase** (`public/vocables/modules/`) with their signatures. Before implementing new features, Claude Code MUST consult this index to:
1. Avoid duplicating existing functionality (DRY principle)
2. Reuse existing methods when appropriate
3. Understand available utilities

**Scope:** This index covers frontend JavaScript modules only (browser-side code).

## How to Use This Index

### When Implementing a Feature
1. **Search this index first** for relevant functions
2. Check if similar functionality already exists
3. Reuse existing functions instead of creating new ones
4. If creating a new public function, add it to this index

### Index Format
Each entry follows this format:
```
### ModuleName.functionName
**File:** `path/to/file.js`
**Signature:** `functionName(param1, param2, callback)`
**Description:** Brief description of what the function does
**Parameters:**
- `param1` {Type} - Description
**Returns:** {Type} Description (if applicable)
```

---

# SPARQL Utilities

## Sparql_proxy (`public/vocables/modules/sparqlProxies/sparql_proxy.js`)

### Sparql_proxy.querySPARQL_GET_proxy
**Signature:** `querySPARQL_GET_proxy(url, query, queryOptions, options, callback)`
**Description:** Primary method to execute SPARQL SELECT queries via proxy
**Parameters:**
- `url` {string} - SPARQL endpoint URL with format parameter
- `query` {string} - SPARQL query string
- `queryOptions` {string} - Additional URL parameters (can be empty string)
- `options` {Object} - Options object containing `source`, `caller`, `dontCacheCurrentQuery`, `acceptHeader`
- `callback` {Function} - Error-first callback (err, result)
**Returns:** SPARQL results with `results.bindings` array
**Example:**
```javascript
var url = Config.sources[source].sparql_server.url + "?format=json&query=";
Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: source}, function(err, result) {
    if (err) return callback(err);
    result.results.bindings.forEach(function(item) {
        console.log(item.s.value);
    });
});
```

### Sparql_proxy.executeAsyncQuery
**Signature:** `executeAsyncQuery(url, query, queryOptions, options)`
**Description:** Promise-based wrapper for querySPARQL_GET_proxy
**Parameters:**
- `url` {string} - SPARQL endpoint URL
- `query` {string} - SPARQL query string
- `queryOptions` {string} - Additional URL parameters
- `options` {Object} - Options object
**Returns:** {Promise} Resolves with SPARQL results

### Sparql_proxy.exportGraph
**Signature:** `exportGraph(source)`
**Description:** Export a graph as Turtle and copy to clipboard
**Parameters:**
- `source` {string} - Source name

---

## Sparql_generic (`public/vocables/modules/sparqlProxies/sparql_generic.js`)

### Sparql_generic.getSourceVariables
**Signature:** `getSourceVariables(sourceLabel)`
**Description:** Get source-specific SPARQL variables (prefixes, predicates, URL)
**Parameters:**
- `sourceLabel` {string} - Source name
**Returns:** {Object} Object with graphUri, prefixesStr, fromStr, broaderPredicate, etc.

### Sparql_generic.getTopConcepts
**Signature:** `getTopConcepts(sourceLabel, options, callback)`
**Description:** Get top-level concepts from a source
**Parameters:**
- `sourceLabel` {string} - Source name
- `options` {Object} - Query options
- `callback` {Function} - Error-first callback (err, result)

### Sparql_generic.getNodeInfos
**Signature:** `getNodeInfos(sourceLabel, conceptId, options, callback)`
**Description:** Get all information about a specific node
**Parameters:**
- `sourceLabel` {string} - Source name
- `conceptId` {string|Array} - Node URI(s)
- `options` {Object} - Query options
- `callback` {Function} - Error-first callback (err, result)

### Sparql_generic.getItems
**Signature:** `getItems(sourceLabel, options, callback)`
**Description:** Get items from a source with optional filters
**Parameters:**
- `sourceLabel` {string} - Source name
- `options` {Object} - Query options (filter, limit, etc.)
- `callback` {Function} - Error-first callback (err, result)

### Sparql_generic.getNodeChildren
**Signature:** `getNodeChildren(sourceLabel, words, ids, descendantsDepth, options, callback)`
**Description:** Get children of specified nodes
**Parameters:**
- `sourceLabel` {string} - Source name
- `words` {Array|null} - Words to filter by
- `ids` {Array|string} - Node URI(s)
- `descendantsDepth` {number} - Depth of descendants to retrieve
- `options` {Object} - Query options
- `callback` {Function} - Error-first callback (err, result)

### Sparql_generic.getNodeParents
**Signature:** `getNodeParents(sourceLabel, words, ids, ancestorsDepth, options, callback)`
**Description:** Get parents/ancestors of specified nodes
**Parameters:**
- `sourceLabel` {string} - Source name
- `words` {Array|null} - Words to filter by
- `ids` {Array|string} - Node URI(s)
- `ancestorsDepth` {number} - Depth of ancestors to retrieve
- `options` {Object} - Query options
- `callback` {Function} - Error-first callback (err, result)

### Sparql_generic.deleteTriples
**Signature:** `deleteTriples(sourceLabel, subjectUri, predicateUri, object, callback)`
**Description:** Delete triples matching the given pattern
**Parameters:**
- `sourceLabel` {string} - Source name
- `subjectUri` {string|null} - Subject URI or null for wildcard
- `predicateUri` {string|null} - Predicate URI or null for wildcard
- `object` {string|null} - Object URI/literal or null for wildcard
- `callback` {Function} - Error-first callback

### Sparql_generic.insertTriples
**Signature:** `insertTriples(sourceLabel, triples, options, callback)`
**Description:** Insert triples into the graph
**Parameters:**
- `sourceLabel` {string} - Source name
- `triples` {Array} - Array of triple objects {subject, predicate, object}
- `options` {Object} - Insert options (graphUri, getSparqlOnly, sparqlPrefixes)
- `callback` {Function} - Error-first callback (err, count)

### Sparql_generic.triplesObjectToString
**Signature:** `triplesObjectToString(item)`
**Description:** Convert a triple object to SPARQL string format
**Parameters:**
- `item` {Object} - Triple object with subject, predicate, object
**Returns:** {string} SPARQL triple string

### Sparql_generic.getDefaultSparqlPrefixesStr
**Signature:** `getDefaultSparqlPrefixesStr()`
**Description:** Get string with all default SPARQL prefixes
**Returns:** {string} PREFIX declarations string

### Sparql_generic.getDistinctPredicates
**Signature:** `getDistinctPredicates(sourceLabel, options, callback)`
**Description:** Get all distinct predicates used in a source
**Parameters:**
- `sourceLabel` {string} - Source name
- `options` {Object} - Query options
- `callback` {Function} - Error-first callback (err, predicates)

### Sparql_generic.sortBindings
**Signature:** `sortBindings(bindings, field, options)`
**Description:** Sort SPARQL bindings by a field
**Parameters:**
- `bindings` {Array} - SPARQL bindings array
- `field` {string} - Field name to sort by
- `options` {Object} - Sort options
**Returns:** {Array} Sorted bindings

### Sparql_generic.setMissingLabels
**Signature:** `setMissingLabels(bindings, fields, options)`
**Description:** Add missing labels extracted from URIs
**Parameters:**
- `bindings` {Array} - SPARQL bindings array
- `fields` {Array|string} - Field name(s) to add labels for
- `options` {Object} - Options
**Returns:** {Array} Bindings with added labels

### Sparql_generic.setBindingsOptionalProperties
**Signature:** `setBindingsOptionalProperties(bindings, fields, options)`
**Description:** Set optional properties (type, label) on bindings
**Parameters:**
- `bindings` {Array} - SPARQL bindings array
- `fields` {Array|string} - Field name(s)
- `options` {Object} - Options (noType, type)
**Returns:** {Array} Bindings with added properties

### Sparql_generic.getSourceTaxonomy
**Signature:** `getSourceTaxonomy(sourceLabel, options, callback)`
**Description:** Get complete taxonomy of a source
**Parameters:**
- `sourceLabel` {string} - Source name
- `options` {Object} - Options (filter, ids, withoutImports, parentsTopDown)
- `callback` {Function} - Error-first callback (err, {classesMap, labels})

### Sparql_generic.copyNodes
**Signature:** `copyNodes(fromSourceLabel, toGraphUri, sourceIds, options, callback)`
**Description:** Copy nodes from one source to another graph
**Parameters:**
- `fromSourceLabel` {string} - Source to copy from
- `toGraphUri` {string} - Target graph URI
- `sourceIds` {Array} - Node URIs to copy
- `options` {Object} - Copy options
- `callback` {Function} - Error-first callback

---

# Common Utilities

## common (`public/vocables/modules/shared/common.js`)

### common.fillSelectOptions
**Signature:** `fillSelectOptions(selectId, data, withBlankOption, textField, valueField, selectedValue)`
**Description:** Populate a select element with options from data array
**Parameters:**
- `selectId` {string|jQuery} - ID of the select element (without #) or jQuery object
- `data` {Array|Object} - Array of option objects or object map
- `withBlankOption` {boolean} - Whether to include empty first option
- `textField` {string} - Property name for option text
- `valueField` {string} - Property name for option value
- `selectedValue` {string} - Value to pre-select
**Example:**
```javascript
common.fillSelectOptions("mySelect", [{id: "1", label: "Option 1"}], true, "label", "id");
```

### common.fillSelectWithColorPalette
**Signature:** `fillSelectWithColorPalette(selectId, colors)`
**Description:** Fill a select with color options showing colored backgrounds
**Parameters:**
- `selectId` {string} - Select element ID
- `colors` {Array} - Array of color hex codes (defaults to paletteIntense)

### common.getAllsourcesWithType
**Signature:** `getAllsourcesWithType(type)`
**Description:** Get all sources matching a schema type
**Parameters:**
- `type` {string} - Schema type (e.g., "OWL", "SKOS")
**Returns:** {Array} Sorted array of source names

### common.formatStringForTriple
**Signature:** `formatStringForTriple(str, forUri)`
**Description:** Escape and format a string for use in SPARQL triple literals
**Parameters:**
- `str` {string} - String to format
- `forUri` {boolean} - If true, format for URI (replace spaces, special chars)
**Returns:** {string} Escaped string safe for SPARQL

### common.getUriLabel
**Signature:** `getUriLabel(uri)`
**Description:** Extract local name from a URI (part after last # or /)
**Parameters:**
- `uri` {string} - Full URI
**Returns:** {string} Local name portion of the URI

### common.getItemLabel
**Signature:** `getItemLabel(item, varName, lang)`
**Description:** Get label from SPARQL binding item
**Parameters:**
- `item` {Object} - SPARQL binding object
- `varName` {string} - Variable name (will look for varNameLabel)
- `lang` {string} - Language filter
**Returns:** {string} Label value

### common.getRandomHexaId
**Signature:** `getRandomHexaId(length)`
**Description:** Generate random hexadecimal ID string
**Parameters:**
- `length` {number} - Length of the ID
**Returns:** {string} Random hex string

### common.getRandomInt
**Signature:** `getRandomInt()`
**Description:** Generate random integer between 0 and 100000
**Returns:** {number} Random integer

### common.getRandomString
**Signature:** `getRandomString(length)`
**Description:** Generate random lowercase letter string
**Parameters:**
- `length` {number} - Length of the string
**Returns:** {string} Random string

### common.getNewUri
**Signature:** `getNewUri(sourceLabel, length)`
**Description:** Generate new URI for a source
**Parameters:**
- `sourceLabel` {string} - Source name
- `length` {number} - Length of random suffix (default 10)
**Returns:** {string} New URI

### common.getNewId
**Signature:** `getNewId(prefix, length)`
**Description:** Generate new ID with prefix
**Parameters:**
- `prefix` {string} - ID prefix
- `length` {number} - Length of random suffix (default 10)
**Returns:** {string} New ID

### common.copyTextToClipboard
**Signature:** `copyTextToClipboard(text, callback)`
**Description:** Copy text to clipboard
**Parameters:**
- `text` {string} - Text to copy
- `callback` {Function} - Optional callback (err, message)

### common.pasteTextFromClipboard
**Signature:** `pasteTextFromClipboard(callback)`
**Description:** Paste text from clipboard
**Parameters:**
- `callback` {Function} - Callback with pasted text

### common.colorToRgba
**Signature:** `colorToRgba(hex, alpha)`
**Description:** Convert hex color to RGBA
**Parameters:**
- `hex` {string} - Hex color code
- `alpha` {number} - Alpha value (0-1)
**Returns:** {string} RGBA color string

### common.RGBtoHexColor
**Signature:** `RGBtoHexColor(color)`
**Description:** Convert RGB color string to hex
**Parameters:**
- `color` {string} - RGB color string like "rgb(255,0,0)"
**Returns:** {string} Hex color code

### common.getResourceColor
**Signature:** `getResourceColor(resourceType, resourceId, palette)`
**Description:** Get consistent color for a resource
**Parameters:**
- `resourceType` {string} - Resource type category
- `resourceId` {string} - Resource identifier
- `palette` {string} - Palette name (default "paletteIntense")
**Returns:** {string} Color hex code

### common.getUrlParamsMap
**Signature:** `getUrlParamsMap()`
**Description:** Parse URL query parameters into object
**Returns:** {Object} Map of parameter names to values

### common.getURI
**Signature:** `getURI(label, source, uriType, specific)`
**Description:** Generate URI for a label
**Parameters:**
- `label` {string} - Label to convert
- `source` {string} - Source name
- `uriType` {string} - "fromLabel", "randomHexaNumber", or "specific"
- `specific` {string} - Specific URI if uriType is "specific"
**Returns:** {string} Generated URI

### common.decapitalizeLabel
**Signature:** `decapitalizeLabel(label)`
**Description:** Add spaces before capital letters in camelCase labels
**Parameters:**
- `label` {string} - Label to decapitalize
**Returns:** {string} Decapitalized label

### common.capitalizeFirstLetter
**Signature:** `capitalizeFirstLetter(string)`
**Description:** Capitalize first letter of string
**Parameters:**
- `string` {string} - Input string
**Returns:** {string} Capitalized string

### common.isNumber
**Signature:** `isNumber(n)`
**Description:** Check if value is a number
**Parameters:**
- `n` {any} - Value to check
**Returns:** {boolean}

### common.isInt
**Signature:** `isInt(value)`
**Description:** Check if value is an integer
**Parameters:**
- `value` {any} - Value to check
**Returns:** {boolean}

### common.isFloat
**Signature:** `isFloat(value)`
**Description:** Check if value is a float
**Parameters:**
- `value` {any} - Value to check
**Returns:** {boolean}

### common.convertNumStringToNumber
**Signature:** `convertNumStringToNumber(value)`
**Description:** Convert numeric string to number type
**Parameters:**
- `value` {string} - String value
**Returns:** {number|boolean|string} Converted value

### common.dateToRDFString
**Signature:** `dateToRDFString(date, withHours)`
**Description:** Convert Date to RDF date string format
**Parameters:**
- `date` {Date} - JavaScript Date object
- `withHours` {boolean} - Include time component
**Returns:** {string} RDF date string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)

### common.ISODateStrToRDFString
**Signature:** `ISODateStrToRDFString(isoStringdate)`
**Description:** Convert ISO date string to RDF format
**Parameters:**
- `isoStringdate` {string} - ISO date string
**Returns:** {string} RDF date string

### common.getSimpleDateStrFromDate
**Signature:** `getSimpleDateStrFromDate(date)`
**Description:** Get simple date string YYYY-MM-DD from Date
**Parameters:**
- `date` {Date} - JavaScript Date object
**Returns:** {string} Date string

### common.storeLocally
**Signature:** `storeLocally(stringToStore, localStorageVar, stackSize)`
**Description:** Store string in localStorage with stack limit
**Parameters:**
- `stringToStore` {string} - String to store
- `localStorageVar` {string} - localStorage key name
- `stackSize` {number} - Maximum stack size

### common.encodeToJqueryId
**Signature:** `encodeToJqueryId(myId)`
**Description:** Encode ID for use as jQuery selector
**Parameters:**
- `myId` {string} - ID to encode
**Returns:** {string} Encoded ID

### common.decodeFromJqueryId
**Signature:** `decodeFromJqueryId(jqueryId)`
**Description:** Decode jQuery-safe ID back to original
**Parameters:**
- `jqueryId` {string} - Encoded ID
**Returns:** {string} Original ID

### common.getVocabularyFromURI
**Signature:** `getVocabularyFromURI(uri)`
**Description:** Get vocabulary name from URI
**Parameters:**
- `uri` {string} - Full URI
**Returns:** {Array|null} [vocabulary, localPart] or null

### common.getRestrictionCardinalityLabel
**Signature:** `getRestrictionCardinalityLabel(type, value)`
**Description:** Format cardinality restriction for display
**Parameters:**
- `type` {string} - Restriction type
- `value` {string} - Cardinality value
**Returns:** {string} Formatted cardinality label

---

## common.array (Array Utilities)

### common.array.slice
**Signature:** `slice(array, sliceSize)`
**Description:** Split array into chunks
**Parameters:**
- `array` {Array} - Array to slice
- `sliceSize` {number} - Size of each chunk
**Returns:** {Array} Array of slices

### common.array.distinctValues
**Signature:** `distinctValues(array, key)`
**Description:** Get array with unique values only
**Parameters:**
- `array` {Array} - Input array
- `key` {string} - Key to check for uniqueness (optional)
**Returns:** {Array} Array with unique items

### common.array.sort
**Signature:** `sort(array, key, order)`
**Description:** Sort array by key
**Parameters:**
- `array` {Array} - Array to sort
- `key` {string} - Key to sort by (optional)
- `order` {string} - "asc" or "desc"
**Returns:** {Array} Sorted array

### common.array.sortObjectArray
**Signature:** `sortObjectArray(array, field, options)`
**Description:** Sort array of objects by field
**Parameters:**
- `array` {Array} - Array to sort
- `field` {string} - Field name to sort by
- `options` {Object} - Sort options
**Returns:** {Array} Sorted array

### common.array.moveItem
**Signature:** `moveItem(arr, fromIndex, toIndex)`
**Description:** Move item within array
**Parameters:**
- `arr` {Array} - Array to modify
- `fromIndex` {number} - Source index
- `toIndex` {number} - Destination index

### common.array.unduplicateArray
**Signature:** `unduplicateArray(array, key)`
**Description:** Remove duplicates from array
**Parameters:**
- `array` {Array} - Input array
- `key` {string} - Key to check for duplicates
**Returns:** {Array} Array without duplicates

### common.array.intersection
**Signature:** `intersection(a, b)`
**Description:** Get intersection of two arrays
**Parameters:**
- `a` {Array} - First array
- `b` {Array} - Second array
**Returns:** {Array} Common elements

### common.array.union
**Signature:** `union(a, b)`
**Description:** Get union of two arrays (no duplicates)
**Parameters:**
- `a` {Array} - First array
- `b` {Array} - Second array
**Returns:** {Array} Combined unique elements

### common.array.difference
**Signature:** `difference(a, b)`
**Description:** Get elements in a that are not in b
**Parameters:**
- `a` {Array} - First array
- `b` {Array} - Second array
**Returns:** {Array} Difference

### common.array.toMap
**Signature:** `toMap(array, key)`
**Description:** Convert array to map using key
**Parameters:**
- `array` {Array} - Input array
- `key` {string} - Property to use as map key
**Returns:** {Object} Map object

### common.array.moveItemToFirst
**Signature:** `moveItemToFirst(array, first)`
**Description:** Move item to beginning of array
**Parameters:**
- `array` {Array} - Array to modify
- `first` {any} - Item to move to front

### common.array.fullOuterJoin
**Signature:** `fullOuterJoin(array1, array2, keys)`
**Description:** Perform full outer join on two arrays
**Parameters:**
- `array1` {Array} - First array
- `array2` {Array} - Second array
- `keys` {Array|string} - Join key(s)
**Returns:** {Array} Joined result

### common.array.arrayByCategory
**Signature:** `arrayByCategory(array, column)`
**Description:** Group array by column value
**Parameters:**
- `array` {Array} - Input array
- `column` {string} - Column to group by
**Returns:** {Array} Array of grouped arrays

### common.array.removeColumn
**Signature:** `removeColumn(array, column)`
**Description:** Remove column from all items in array
**Parameters:**
- `array` {Array} - Input array
- `column` {string} - Column to remove
**Returns:** {Array} Modified array

### common.array.deepCloneWithFunctions
**Signature:** `deepCloneWithFunctions(obj)`
**Description:** Deep clone object including functions
**Parameters:**
- `obj` {Object} - Object to clone
**Returns:** {Object} Cloned object

### common.concatArraysWithoutDuplicate
**Signature:** `concatArraysWithoutDuplicate(array, addedArray, key)`
**Description:** Concatenate arrays avoiding duplicates
**Parameters:**
- `array` {Array} - Base array
- `addedArray` {Array} - Array to add
- `key` {string} - Key to check for duplicates
**Returns:** {Array} Combined array

### common.removeDuplicatesFromArray
**Signature:** `removeDuplicatesFromArray(array, key, uniques)`
**Description:** Remove duplicates from array
**Parameters:**
- `array` {Array} - Input array
- `key` {string} - Key to check for duplicates
- `uniques` {Array} - Optional existing uniques array
**Returns:** {Array} Array without duplicates

---

# UI Utilities

## UI (`public/vocables/modules/shared/UI.js`)

### UI.message
**Signature:** `message(message, stopWaitImg, startWaitImg)`
**Description:** Display a message to the user
**Parameters:**
- `message` {string} - Message to display
- `stopWaitImg` {boolean} - Hide loading indicator
- `startWaitImg` {boolean} - Show loading indicator

### UI.openDialog
**Signature:** `openDialog(divId, options)`
**Description:** Open a jQuery UI dialog
**Parameters:**
- `divId` {string} - ID of the div to use as dialog content
- `options` {Object} - Dialog options (title, etc.)

### UI.setDialogTitle
**Signature:** `setDialogTitle(div, title)`
**Description:** Set title of an open dialog
**Parameters:**
- `div` {string} - Dialog div ID
- `title` {string} - New title

### UI.resetWindowSize
**Signature:** `resetWindowSize()`
**Description:** Recalculate and apply window layout dimensions

### UI.init
**Signature:** `init()`
**Description:** Initialize UI components and event listeners

### UI.initMenuBar
**Signature:** `initMenuBar(callback)`
**Description:** Initialize the menu bar
**Parameters:**
- `callback` {Function} - Called when complete

### UI.openTab
**Signature:** `openTab(tabGroup, tabId, actionFn, buttonClicked)`
**Description:** Open a tab in a tab group
**Parameters:**
- `tabGroup` {string} - Tab group class name
- `tabId` {string} - ID of tab to open
- `actionFn` {Function} - Action to execute
- `buttonClicked` {Element} - Button element that was clicked

### UI.ApplySelectedTabCSS
**Signature:** `ApplySelectedTabCSS(buttonClicked, tabGroup)`
**Description:** Apply selected styling to tab button
**Parameters:**
- `buttonClicked` {Element} - Button element
- `tabGroup` {string} - Tab group name

### UI.changeTheme
**Signature:** `changeTheme(themeName)`
**Description:** Change application color theme
**Parameters:**
- `themeName` {string} - Theme name from Config.slsvColorThemes

### UI.themeList
**Signature:** `themeList()`
**Description:** Populate theme selector with available themes

### UI.setSlsvCssClasses
**Signature:** `setSlsvCssClasses(callback)`
**Description:** Initialize CSS classes from Less
**Parameters:**
- `callback` {Function} - Called when complete

### UI.hideShowMenuBar
**Signature:** `hideShowMenuBar(button)`
**Description:** Toggle menu bar visibility
**Parameters:**
- `button` {Element} - Toggle button element

### UI.hideShowLateralPanel
**Signature:** `hideShowLateralPanel(button)`
**Description:** Toggle lateral panel visibility
**Parameters:**
- `button` {Element} - Toggle button element

### UI.showHideRightPanel
**Signature:** `showHideRightPanel(showOrHide)`
**Description:** Show or hide right panel
**Parameters:**
- `showOrHide` {string} - "show" or "hide" or null to toggle

### UI.homePage
**Signature:** `homePage(options)`
**Description:** Navigate to home page
**Parameters:**
- `options` {Object} - Options (notRefresh: true to just update URL)

### UI.disableEditButtons
**Signature:** `disableEditButtons(source, hide)`
**Description:** Disable graph editing buttons
**Parameters:**
- `source` {string} - Source name
- `hide` {boolean} - Whether to hide

### UI.adjustSelectListSize
**Signature:** `adjustSelectListSize(selectListDivId, maxSize)`
**Description:** Adjust select element size based on options count
**Parameters:**
- `selectListDivId` {string|jQuery} - Select element ID or jQuery object
- `maxSize` {number} - Maximum number of visible options

### UI.sideBySideTwoWindows
**Signature:** `sideBySideTwoWindows(existingWindow, newWindow)`
**Description:** Arrange two dialogs side by side
**Parameters:**
- `existingWindow` {string} - First dialog selector
- `newWindow` {string} - Second dialog selector

### UI.cleanPage
**Signature:** `cleanPage()`
**Description:** Clear main content areas and show credits

### UI.setCredits
**Signature:** `setCredits()`
**Description:** Display application credits/logo

### UI.copyCurrentQuery
**Signature:** `copyCurrentQuery()`
**Description:** Copy current SPARQL query to clipboard

---

# Color Palettes (common module)

### common.palette
**Type:** {Array} - Standard color palette array

### common.paletteIntense
**Type:** {Array} - Intense color palette array

---

# Adding New Functions to This Index

When you create a new public function:

1. **Add the entry** following the format above
2. **Include JSDoc** in the source file:
```javascript
/**
 * Brief description of function
 * @param {Type} paramName - Parameter description
 * @returns {Type} Return description
 */
self.functionName = function(paramName) {
    // Implementation
};
```

3. **Place in correct section** based on module location
4. **Update this index** immediately after creating the function

---

## Index Maintenance

- **Last Updated:** 2025-01-12
- **Maintainer:** Claude Code (automated)
- **Scope:** Frontend modules only (`public/vocables/modules/`)

### Update Log
| Date | Changes |
|------|---------|
| 2025-01-12 | Major update: Added comprehensive common.js, UI.js, sparql_proxy.js, sparql_generic.js functions |
| 2025-01-12 | Initial index creation with core functions |

---

*This index should be consulted before implementing ANY new frontend functionality to ensure DRY compliance.*
