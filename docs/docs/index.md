# Documentation

![sousLeSensVocables large](https://user-images.githubusercontent.com/1880078/130787939-adf887d3-0054-4aa7-9867-0fbcd5bfc7a2.png)

SousLesensVocables is a set of tools developed to manage Thesaurus and Ontologies resources through SKOS , OWL and RDF standards and graph visualisation approaches.

It has functionalities to :

- read : visualize, navigate and export SKOS or OWL resources
- edit : create , modify, aggregate OWL resources

A key feature of SLSV is graph visualization and interaction performed using excellent visjs/vis-network open source solution.

Annotate tool allows annotate textual corpus with several registered lexical resources and identify missing terms.

## User documentation

Learn how to use SousLeSens.

### Overview

```{toctree}
:maxdepth: 1
userdoc/index.md
userdoc/lineage.md
userdoc/mappingmodeler.md
userdoc/kgquery.md
```

### Tutorials

```{toctree}
:maxdepth: 1
tutorials/mappingmodeler.md
tutorials/KGQuery.md
```

## Admin documentation

How to install, configure and manage your own SousLeSens instance.

### Architecture

```{toctree}
:maxdepth: 1
architecture/index.md
architecture/docker.md
```

### Installation

```{toctree}
:maxdepth: 1
installation/deploy-a-production-instance.md
installation/install-a-development-instance.md
```

### Configuration

```{toctree}
:maxdepth: 1
configuration/souslesens.md
configuration/sls-py-api.md
configuration/jowl.md
```

### Migrations

```{toctree}
:maxdepth: 1
migrations/migrate-to-v2.md
```

## Developper documentation

How to install a development instance and to contribute to the code.

### Contributing

```{toctree}
:maxdepth: 1
contribute/contribute-to-development.md
```

### Code documentation

The following docs is generated from Javascript docstrings.

```{toctree}
:maxdepth: 1
code documentation/codeDocumentation.md
```
