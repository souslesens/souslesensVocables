# Convert docx to markdown
Install pandadoc

Put in.docx in docs/tools

Convert with pandoc

```bash
pandoc --extract-media images in.docx -o out.md --shift-heading-level-by=1 --lua-filter=filter.lua -t markdown_strict
```
You must add the title of the document by hand at the beginning of the document

```markdown
# Title
```

Ad add the content

```markdown
```{contents} Table of Contents
:depth: 2
```
```

