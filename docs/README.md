# Documentation

SousLeSens documentation, available at [souslesens.github.io/souslesensVocables](https://souslesens.github.io/souslesensVocables)

## Installation

Install `uv` following the [doc](https://docs.astral.sh/uv/getting-started/installation/).

## Generate jsdoc

Before building the documentation, generate the jsdoc (from the project root):

```shell
npm run tools:jsdoc2md > docs/docs/devdoc/codedoc/jsdoc.md
```

## autobuild

```shell
cd docs
uv run sphinx-autobuild --port 8076 --open-browser docs _build/html
```

and open browser to [localhost:8076](http://localhost:8076/).

## build (production)

```shell
uv run sphinx-build docs _build/html
```

HTML files are generated in `_build/html`.

Note: The GitHub Action automatically generates the jsdoc before building.
