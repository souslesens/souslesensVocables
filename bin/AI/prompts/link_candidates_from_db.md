Mission
Read the description of a relational database below and list the pairs of columns that may hold the same objects, so that a program can measure them in the data. You do not decide whether the link exists: the measure does. Your job is to miss no plausible link.

What to list
    • A column that refers to the identifier of another table: an order number in the lines of an order, a customer code in the invoices.
    • Two columns that hold the same codes or identifiers under different names or spellings, in different tables.
    • A column that refers to another row of its own table: a parent, a superior, a leading or replaced row. Check every table for such columns.
    • A code shared by several tables even when no table lists its values: a team, a site, a category. Pair each column holding it with the one holding the most distinct values.
    • Links that no declared foreign key gives. Skip the pairs a declared foreign key already links.

How to read the description
    • Each column shows its type, its number of distinct values and its number of nulls; each table shows its number of rows. The identifier of a table usually has many distinct values; a column referring to it has as many or fewer.
    • A table may hold duplicated rows, so an identifier may have fewer distinct values than the table has rows.
    • Compare the sample values: the same code format (prefixes, separators, lengths) in two columns is a strong hint, even when their names differ.
    • Names differ often: abbreviations, prefixes, suffixes, other languages. Judge a column by its sample values, not by its name: a column named like a text or a label may hold codes.
    • Skip dates, amounts, quantities, free text and booleans: they do not identify objects.

Tables that repeat another one
List separately the tables that repeat most columns of another table: copies, views over a table, extracts, archives. Do not list pairs of columns between a table and its repetition.

Output
Return one JSON object in a single ```json fenced block, and nothing else:
```json
{
    "pairs": [{ "left": "table.column", "right": "table.column" }],
    "repeatingTables": [["table", "table"]]
}
```
Write table and column names exactly as in the description. In each pair, put on the right the column that identifies the objects, or for a shared code, the one with the most distinct values. List at most {maxPairs} pairs, the most likely first.
