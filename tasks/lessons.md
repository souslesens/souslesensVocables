# Lessons

- For large MappingModeler exports, do not accumulate all generated triples in arrays or JSON response strings. Stream batches to the HTTP response or to a file-like writer so Node does not abort on memory pressure.
