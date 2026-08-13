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

Once a node is resolved, reuse the source it came from for every later call about that URI. Asking
the wrong source is the most common way to get nothing back.

## An empty result is not an absence

These tools answer with an empty list, not an error, when a query matches nothing. Before telling
the user a concept is missing, suspect in this order: the wrong source, then a filter the source
needs turned off, then a relation expressed in a form the tool does not walk — in OWL a class often
states what it can be linked to through a restriction rather than a direct triple.

## Truncation is not a smaller answer

`truncation.truncated: true` means the reply was cut to fit a byte budget, and what was cut cannot
be fetched afterwards. Raising `options.limit` does not help, since several of the underlying
queries ignore it, which is precisely why the cut happens here.

For rows, `totalRows` says how many exist and `returnedRows` how many you got. If a narrower query
can still answer the question, run it. If it cannot — because that total is simply how large the
answer is — say the figure to the user and ask what to restrict it to. Never present a truncated
prefix as if it were the whole set.

For a document, half of it is broken JSON, so you receive `oversizedDocumentStructure` instead: one
line per top-level key with its size. Use it to tell the user what the document holds and to pick a
more specific tool for the part that matters.

## Read the sibling keys

A flattened row carries `<column>Lang` when a literal has a language tag, `<column>Datatype` for a
typed literal, and `<column>IsBlankNode: true` when an identifier is a blank node. A blank node
cannot be queried directly by URI; reach what it says by looking for triples that point **at** it.

## Cost

Most tools accept several URIs at once. Batch them rather than looping one call per URI, and do not
fetch what the question did not ask for.

When the dedicated tools do not cover what you need, `sls_list_query_functions` lists the rest of
the ontology API and `sls_run_query_function` runs any of it. Both are read-only: write operations
are not reachable from this server at all, so never promise the user a change to the data.
