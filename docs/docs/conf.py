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

extensions = ["myst_parser"]

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]


# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = "sphinx_book_theme"
# html_static_path = ["_static"]
html_theme_options = {
    # "home_page_in_toc": True,
    "show_navbar_depth": 2,
    "repository_url": "https://github.com/souslesens/souslesensVocables",
    "use_repository_button": True,
    "logo": {
        "text": "Sous Le Sens",
    },
}
html_logo = "logo.png"
html_favicon = "logo.png"


master_doc = "index"
