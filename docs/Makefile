# Minimal makefile for Sphinx documentation
SPHINXOPTS    ?=
SPHINXBUILD   ?= sphinx-build
SOURCEDIR     = docs
BUILDDIR      = _build

# ==== ajout pour chemin absolu ====
SERIALIZE_BIGINT := $(abspath scripts/serialize-bigint.js)
# ==================================

help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help Makefile

# Catch-all target
%: Makefile
	@mkdir -p docs/devdoc/codedoc
	@env NODE_OPTIONS="-r $(SERIALIZE_BIGINT)" npm run tools:jsdoc2md > docs/devdoc/codedoc/jsdoc.md
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)
