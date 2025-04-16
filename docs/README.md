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
cd docs
python -m venv sls .\sls\Scripts\activate.bat
pip install poetry




```
Install make for Windows user :
```bash
curl -L -o make-4.4.1-without-guile-w32-bin.zip https://downloads.sourceforge.net/project/ezwinports/make-4.4.1-without-guile-w32-bin.zip
unzip make-4.4.1-without-guile-w32-bin.zip -d /usr/local
rm make-4.4.1-without-guile-w32-bin.zip
```

Python 3.11 version needed,install python 3.11 then : 
```bash
poetry env use "C:\Users\[Name]\AppData\Local\Programs\Python\Python311\python.exe"
```

## Install

```bash
poetry install

```

## Autobuild


### Windows 
```bash 
poetry add -D myst-parser
poetry shell
````

```bash

make html
```
