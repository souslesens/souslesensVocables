# Documentation

SousLeSens documentation, available at [souslesens.github.io/souslesensVocables](https://souslesens.github.io/souslesensVocables)

## Environment configuration

### Linux

```bash
python -m venv sls
. sls/bin/activate
pip install poetry
```

### Windows

```bash
python -m venv sls
.\sls\Scripts\activate.bat
pip install poetry
```

## Install

```bash
poetry install
```

## Autobuild

```bash
poetry run sphinx-autobuild docs docs/_build/html
```
