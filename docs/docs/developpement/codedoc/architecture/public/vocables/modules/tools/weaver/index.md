<!-- AUTO-GENERATED: do not edit by hand -->
# Weaver tool documentation

<!-- AUTO-DESC:START -->

## Overview

The Weaver module manages the loading, visualization, and interaction with ontology “lineage” data.

## Module

### 1. weaver

It acts as a controller orchestrating the loading, visualization, and interaction with ontology “lineage” data inside a graphical whiteboard environment. It relies on several other modules such as Lineage_sources, Lineage_whiteboard, SearchWidget, and UI components to display ontology classes, browse them, and draw graph structures. It is implemented as an IIFE (Immediately Invoked Function Expression) that returns an object (self) exposing its public interface.

## Features

- **Source Loading and UI Initialization**: Loads ontology sources, injects UI panels, initializes the whiteboard, and prepares all tools for interaction.
- **Automatic Detection of “Top Classes**: Analyzes the ontology hierarchy to identify a meaningful set of top-level classes based on parent-depth and class count thresholds.
- **AGraph Rendering of Ontology Structures**: Draws classes, their parents, and their children on a visual whiteboard graph, using iterative expansion until reaching a limit.
- **Hierarchical Layout Toggle**: Users can switch between a hierarchical (left‑to‑right tree) layout and a free layout for more flexible exploration.

## Usage

- Load an Ontology Source.
- Draw the Top Classes.
- Expand the graph.
- Process to the require search.>

<!-- AUTO-DESC:END -->


```{toctree}
:maxdepth: 5
:caption: Contents


```

<!-- AUTO-INLINE-FILES:START -->

## Files in this directory

- `weaver.js`

<!-- AUTO-INLINE-FILES:END -->

