# Task: Semantic Classification of CFIHOS–UNSPSC Label Matches

## Context

You classify the **non-exact matches** produced by the exact-match script that compares two sources: CFIHOS (the "source from") and UNSPSC (the "target source / cible").

You are given **two tables**:

1. **Non-exact matches table** — the rows you must classify. It has two columns:
   - **source (from)**: a CFIHOS class label
   - **target (cible)**: a UNSPSC class label

   Every row in this table is a *non-exact* match. The exact matches were already handled in a previous, separate pass and are **not** part of this task.

2. **Definitions table** — a lookup table giving the definition of each class label (for both the source-from classes and the target classes).

## Objective

For every row of the non-exact matches table, compare the **source (from)** label with the **target (cible)** label and assign exactly one category that best describes the semantic relationship between the two classes.

## Step-by-step process

1. For each label (in the source column and in the target column), look up its definition in the **definitions table** to understand precisely what object, concept, or service it refers to. Base your judgement on the **definitions**, not on the labels alone.
2. Compare the two definitions / meanings.
3. Assign one of the categories listed below based on the relationship between the two concepts.
4. Process the rows **one by one, manually**, using your own reasoning for each row. **Do not write or execute a script** to perform this classification — the classification itself must be done by you, row by row, based on your understanding of the definitions.

## Categories

Assign exactly one of the following values per row:

- **Exact match AI**: You are confident that the two labels refer to exactly the same object, concept, or service — i.e., they mean exactly the same thing.
- **SubclassOf**: The **source (from)** class is a subclass of the **target (cible)** class, in the ontological / taxonomic sense (rdfs:subClassOf) — i.e., the source class is a more specific concept than the target class.
- **SubclassOf inverse**: The **target (cible)** class is a subclass of the **source (from)** class, in the ontological / taxonomic sense (rdfs:subClassOf) — i.e., the target class is a more specific concept than the source class.
- **Not match**: There is no relationship of any of the types above between the two concepts.
- **Unknown**: Use this when you are not confident enough to choose one of the categories above. It is preferable to mark a row as "Unknown" rather than to wrongly declare an "Exact match AI" or a "Not match" when you are unsure.

## Output format and constraints

- Add a new column named **"AI Category"** to the non-exact matches table, containing, for each row, the single category you chose.
- Add a new column named **"AI Category Reason"**, placed **right after** "AI Category", containing a short (one or two sentences) justification explaining why this category was chosen, based on the comparison of the two definitions / meanings. This column makes it easier to assess the relevance of the classification.
- Keep the **order of the rows unchanged**.
- Do **not** modify, delete, reorder, or rewrite any existing row or column of the non-exact matches table — the **source (from)** and **target (cible)** columns and their content must stay exactly as they are. Only **add** the two new columns "AI Category" and "AI Category Reason".
