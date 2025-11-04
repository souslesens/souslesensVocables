# Documentation

SousLeSens documentation, available at [souslesens.github.io/souslesensVocables](https://souslesens.github.io/souslesensVocables)

## Installation

Install `uv` following the [doc](https://docs.astral.sh/uv/getting-started/installation/).

## autobuild

```shell
uv run sphinx-autobuild --port 8076 --open-browser docs _build/html
```

and open browser to [localhost:8076](http://localhost:8076/).

## build (production)

```shell
uv run sphinx-build docs _build/html
```

HTML files are generated in `_build/html`.
