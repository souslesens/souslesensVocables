# SousLeSens

Read-only access to the SousLeSens ontology platform: OWL and SKOS sources held in a triple store,
with their taxonomies, properties, OWL restrictions, mappings and a full-text label index.

Everything below is true of every tool here. What is true of one tool is in that tool's own
description, which is worth reading before you give up on a call.

## Ground every claim

Never invent a URI, a label, a definition or a hierarchical link. Anything you assert about an
ontology must come from a tool result in this conversation. Quote a definition verbatim, and follow
it with the source name and the URI. When a lookup finds nothing, say so plainly.

## Start from a URI

Almost every tool takes a node URI, not a word. `sls_search_labels` turns a phrase into ranked
candidates and is the normal first call on any domain term; `sls_list_indexes` gives it the index
names, which are lowercase and do not always match the source name.

Two different questions, two different tools. "Does this exist, and where is the best match" is a
ranked search: `sls_search_labels` over every index at once, since one call over ten indices costs
what one call over one costs. "Which sources talk about this" is `sls_count_labels_by_source`, also
one call over every index.

Never answer the second question with the first. A ranked search returns a single global top-K, so
one index whose label is exactly the searched word takes every slot and the other sources drop out
with no trace. A `totalMatches` far above the hits you received means exactly that: you are looking
at a fraction. Count by source first, then search the indices worth reading, one at a time if their
hits matter.

`totalMatchesIsLowerBound: true` means the search engine stopped counting: the real total is at
least `totalMatches`, never exactly it. Say "more than N", never "N". The per-source counts of
`sls_count_labels_by_source` are exact regardless: only the grand total is capped.

Once a node is resolved, reuse the source it came from for every later call about that URI. Asking
the wrong source is the most common way to get nothing back.

A label match is not a classification. `sls_search_labels` returns everything whose label contains
the word, so searching "pump" also returns properties, requirements and dimensional specifications
that merely mention pumps. "What kinds of X are there" is answered by resolving X to a URI and
walking `sls_node_descendants` from it, then listing what the hierarchy returned and nothing else. If
that hierarchy comes back short, say so; do not top it up with search hits that share the word, and
never hand a search result set to the user as a list of subtypes.

## Read the model before writing SPARQL

Never assemble a URI out of a source name and a local name. A source's own graph URI and the
namespace of the classes it instantiates are routinely different: `PAZFLOR_ABOX` holds 470468
instances of `http://totalenergies/resources/tsf/ontology/lifex_fpso/Notification`, and both
`pazflor-abox/Notification` and `pazflor-tbox/Notification`, the two a reader would guess from the
source name, exist nowhere.

`sls_kgquery_model` is the shortest way to the real ones. It names each class with its actual URI,
its datatype properties and the object properties that join it to the others, which is exactly what a
query needs. Call it on the source you are about to query, before the first SELECT.
`sls_ontology_model` covers classes and restrictions when a user has opened the source in the web UI.
When neither answers, `sls_source_taxonomy` and `sls_search_labels` still hand you a URI you did not
invent.

A query against a guessed URI returns zero rows and says nothing about why, so it reads exactly like
a genuinely empty class. That is how a wrong namespace survives several turns unnoticed.

## An empty result is not an absence

These tools answer with an empty list, not an error, when a query matches nothing. Before telling
the user a concept is missing, suspect in this order: the wrong source, then a filter the source
needs turned off, then a relation expressed in a form the tool does not walk. In OWL a class often
states what it can be linked to through a restriction rather than a direct triple.

## Truncation is not a smaller answer

`truncation.truncated: true` means the reply was cut to fit a byte budget, and what was cut cannot
be fetched afterwards from this same answer. Raising `options.limit` does not help, since several of
the underlying queries ignore it, which is precisely why the cut happens here. What it does carry is
a `resultId` and a `nextOffset`: pass those to `sls_result_page`, which works for every tool here, not
only `sls_sparql_select`, and can also `grep` the held rows for a term instead of paging through them
by hand.

For rows, `totalRows` says how many rows the tool handed back and `returnedRows` how many of them
fitted. If a narrower query can still answer the question, run it. If it cannot, because that figure
is simply how large the answer is, say it to the user and ask what to restrict it to. Never present a
truncated prefix as if it were the whole set.

`totalRows` counts the payload, never the result set. Two cuts can hit the same answer: the query can
be capped before it ever reaches this server, and the rows it returned can then be too many to send
you. `truncation` is the second cut only. When `rowCeiling` says `complete: false`, or when
`totalRowsIsItselfCut` is set, `totalRows` is a limit wearing the costume of a count and quoting it to
the user is the error this file exists to prevent.

For a document, half of it is broken JSON, so you receive `oversizedDocumentStructure` instead: one
line per top-level key with its size. Use it to tell the user what the document holds and to pick a
more specific tool for the part that matters.

When the user asks for the whole set, an export or a CSV, do not page it by hand: hand the same
query to `sls_sparql_select` with `collect: true` and it walks every block for you. Two rules make
that walk possible. No LIMIT or OFFSET of your own, and **no ORDER BY**: Virtuoso refuses a sorted
query once LIMIT plus OFFSET passes 10000, so an ordered walk fails on its second block and never
reaches the rest. Sort the rows after collecting them if the user needs them ordered.

### `rowCeiling` is on every answer that can be cut, not only on `sls_sparql_select`

Any tool that queries a triple store or a search index reports a `rowCeiling` block, and reading it
is not optional. It has one key that decides what you may say:

- `complete: true` means the whole set is in front of you. Quote it.
- `complete: false` means you are holding a prefix. Never present it as the set. The `hint` names the
  way to the rest.
- `complete: "unknown"` means nothing here proves either way, usually because the endpoint's own cap
  could not be established. It is not a soft yes. Treat it as a prefix until a count says otherwise.

The tool that returned the rows does not know what bounded them, and this block is why you do: a
catalog function may carry `limit 10000` in its own query text, page internally until it reaches a
configured ceiling, or run under an endpoint that truncates at `ResultSetMaxRows` and announces
nothing. `atKnownCeiling` says the answer landed exactly on the lowest of those, which is a cut.
`sparqlRows` and `sparqlQueries`, when present, say how many rows were actually read and how many
queries it took, which is how a function returning 50 grouped rows can still be sitting on a cut.

Round figures deserve the same suspicion on their own: 1000, 10000 and 20000 are limits, not counts.
Establish the real number with `sls_sparql_select` and `SELECT (COUNT(*) AS ?total)` on the same
pattern before quoting one to the user. This is not hypothetical: 10000 notifications were once
announced as the complete list, out of 100741.

### `depthCeiling` says whether `descendantsDepth` actually reached, not just whether rows came back

`sls_node_children` reports a `depthCeiling` block alongside `rowCeiling` whenever you passed a
`descendantsDepth`. A hierarchy that runs out one level below your request looks identical to a
depth parameter that did nothing: both return the same rows, with no `child2` key anywhere. This
block is the only way to tell them apart, so read it before concluding a branch is empty.

- `depthReached >= requestedDepth`: the depth you asked for was actually walked. No `hint` — nothing
  more to check.
- `depthReached < requestedDepth` and a `hint` is present: the walk stopped early. The hint names the
  exact node URIs to re-query (`sls_node_children` again on the `childN` URIs at `depthReached`)
  before you report the hierarchy as ending there. Do not treat the shorter result as proof the
  hierarchy is shallow.

## A refused query is a query to repair, not a result to report

The triple store's error names what to change. Change it and run it again, in the same turn. Handing
the user a corrected query you did not run leaves the work undone: they asked for the answer, not for
the SPARQL.

Three failures, three different repairs, and they are not interchangeable.

**A sort refused.** `SR353: Sorted TOP clause specifies more then N rows to sort. Only 10000 are
allowed.` Nothing here is too large. The ceiling counts the rows the endpoint is _asked_ to sort,
which is your LIMIT plus your OFFSET, never the rows the query returns, so a sorted query asking for
20000 rows is refused even when its whole answer is 170. An `ORDER BY` carrying no LIMIT of its own is
not refused: nothing is appended to it here, and it sorts up to the endpoint's own row ceiling. Lower
your LIMIT to 10000 or less, or leave it out entirely, or drop the `ORDER BY` and sort the rows
yourself once you have them.

**A timeout, meaning nothing came back at all.** The pattern is the problem, not the size, so a
smaller LIMIT changes nothing: the endpoint walks the pattern before it applies one. Bind it, with an
`rdf:type`, a known predicate or a single graph. If it still will not finish, split it on an indexed
value and run the parts one call at a time, one class, one property or one graph each, then merge
them yourself. A sequence of cheap queries answers what one expensive query cannot.

Splitting is how an answer is computed, never how it is delivered. The parts are one result to the
user, so present them as one: give the client's display tool every part rather than the last one, and
do not offer the rest as pasted text.

Find the cost, do not guess it. Every answer carries `elapsedMs`, what the endpoint actually spent,
so a query is measurable and not merely alive or dead. `SELECT (COUNT(*) AS ?total)` on the bare
pattern, with the projection, the functions and the DISTINCT stripped off, says how many matches the
endpoint is walking underneath: that number is the work, and the rows you asked for are only what
survives it. A query returning a few hundred rows over millions of matches is normal, and it is why
the row count tells you nothing about the price.

Then take the query apart one element at a time and watch `elapsedMs`. Drop a DISTINCT, a function
applied to a variable the pattern leaves unbound, an OPTIONAL, a UNION branch, a filter no index can
serve, and re-run. The element whose removal collapses the time is the one to work around, and it is
rarely the one that looks heaviest: anything evaluated once per match, before a DISTINCT or a GROUP
BY can reduce anything, costs the whole scan whatever the final row count.

Once you know which element it is, ask for it separately. The cheap query answers the part that does
not need it, and a second query, narrowed by a filter that makes the expensive element apply to far
fewer matches, answers the rest. Before merging the parts, check they recompose the whole: the row
counts have to add up against the COUNT you took first, and if they do not, you are missing a case
rather than looking at a faster query.

**A result cut at a ceiling.** Neither of the above: the query ran and the rest of the rows exist.
`collect: true`, with no ORDER BY.

Repair at most three times, each attempt changing something the error actually named. Then say what
you tried and quote what the endpoint answered.

## Read the sibling keys

A flattened row carries `<column>Lang` when a literal has a language tag, `<column>Datatype` for a
typed literal, and `<column>IsBlankNode: true` when an identifier is a blank node. A blank node
cannot be queried directly by URI; reach what it says by looking for triples that point **at** it.

## An option that holds SPARQL holds a whole clause

`options.filter` and `options.distinct` are pasted into the generated query verbatim. Nothing wraps
them, nothing validates them, so a fragment that is merely close to right is a syntax error rather
than a narrower answer.

`filter` lands where a group graph pattern goes. Give it a complete `FILTER (...)` clause, or a
triple pattern ending in a period, never a bare expression. `regex(str(?label), "pump", "i")` fails;
`FILTER (regex(str(?label), "pump", "i"))` is what was meant. Some functions, `getDictionary` among
them, paste the same string into two places at once; a complete clause survives that unharmed, which
is another reason to give one.

`distinct` is the SELECT projection. Name the variables with their question mark, `?subject ?object`,
not `subject`. Use only the variables the function's `returns` documents, since those are the ones
its `WHERE` actually binds.

Both belong to the function you called, not to a query you write: there is no place here to send raw
SPARQL of your own except `sls_sparql_select`.

## Cost

Most tools accept several URIs at once. Batch them rather than looping one call per URI, and do not
fetch what the question did not ask for.

When the dedicated tools do not cover what you need, `sls_list_query_functions` lists the rest of
the ontology API and `sls_run_query_function` runs any of it. Copy `name` and `module` together from
one catalog entry: the same name often lives in several modules, and a pairing you assembled yourself
is refused. Both are read-only: write operations are not reachable from this server at all, so never
promise the user a change to the data.
