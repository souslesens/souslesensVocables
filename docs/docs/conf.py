# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = "SousLeSens documentation"
copyright = "2024, SousLeSens contributors"
author = "SousLeSens contributors"

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = ["myst_parser", "sphinxnotes.isso"]
suppress_warnings = ["myst.xref_missing"]

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

# -- isso config -------------------------------------------------------------
# https://sphinx.silverrainz.me/isso/index.html
isso_url = "https://isso.tsf.logilab.fr"
isso_include_patterns = ['**']
isso_exclude_patterns = []

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = "sphinx_book_theme"
# html_static_path = ["_static"]
# html_theme_options = {
#     # "home_page_in_toc": True,
#     "show_navbar_depth": 20,
#     "repository_url": "https://github.com/souslesens/souslesensVocables",
#     "use_repository_button": True,
#     "logo": {
#         "text": "Sous Le Sens",
#     },
# }

html_theme_options = {
    "show_navbar_depth": 2,
    "max_navbar_depth": 20,
    "collapse_navbar": False,
    "repository_url": "https://github.com/souslesens/souslesensVocables",
    "use_repository_button": True,
    "logo": {"text": "Sous Le Sens"},
}
html_logo = "logo.png"
html_favicon = "logo.png"
html_css_files= ['custom.css']


master_doc = "index"
