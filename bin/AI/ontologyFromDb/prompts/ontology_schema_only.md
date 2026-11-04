This run reads a schema file, not a database
The inputs hold the logical schema alone: tables, columns, types, nullability, declared keys and comments. Nothing was read in the data: no sample rows, no counts, no measured overlaps. These rules take precedence over what the prompt above says about them.
    • Meaning: a comment is the main evidence of what a table or a column holds. A meaning read from a name alone is a hypothesis: say so in the interpretationStatus of the class and list it in the assumptions of the report.
    • Links: only a declared foreign key links two tables. A link that names suggest is not modeled: it goes to uncheckedLinks.
    • Identifiers: the identifier of a class is a declared primary key, or a column a declared foreign key points to. Without one, the class gets no identifyingColumns and the report says so.
    • Code lists: their values are unknown. Declare no individual unless a comment lists the values, and report the code list as a gap.
    • Cardinalities: NOT NULL supports a minimum. A nullable column says nothing about how often it is filled, and no column can be shown empty: keep it, unless a comment says it is unused. A maximum comes from a key only.
    • Types: take the range of a datatype property from the SQL type. A code held in a numeric column cannot be told from a quantity without a comment: report the doubt.
    • Report: the first assumption of the report states that the ontology was built from the schema alone, and unresolvedDecisions lists what a look at the data would settle.
