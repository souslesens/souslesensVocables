# Getting Started

This guide provides step-by-step instructions to configure a SousLeSens instance from scratch. It covers the essential setup process: creating users, defining profiles, configuring data sources, and setting up access permissions.

For detailed information about any ConfigEditor feature, refer to the complete [ConfigEditor documentation](configeditor.md).

```{contents} Table of Contents
:depth: 3
```

## Prerequisites

- A working SousLeSens instance installed and accessible
- Administrator access to ConfigEditor

## Overview

The initial setup workflow consists of four main steps:

1. **Create Users** - Set up user accounts
2. **Create Profiles** - Define roles and permissions
3. **Configure Sources** - Add data sources and upload RDF graphs
4. **Set Access Permissions** - Grant profiles access to sources

## Step 1: Create Users

The first step is to create user accounts that will access the SousLeSens instance.

**Quick steps:**

1. Open **ConfigEditor** from the main navigation bar
2. Navigate to the **Users** tab
3. Click **"Create User"**
4. Fill in the login and password
5. Save the user (you can assign profiles later)

> **Tip**: Create at least one administrator user and regular users for day-to-day operations.

For detailed instructions, see [ConfigEditor - Creating a User](configeditor.md#creating-a-user).

## Step 2: Create Profiles

Profiles define roles and permissions that control what users can see and do in SousLeSens. Each user must have at least one profile assigned.

**Quick steps:**

1. Navigate to the **Profiles** tab in ConfigEditor
2. Click **"Create Profile"**
3. Configure the profile:
    - **Name**: Unique identifier (e.g., "Admin", "Editor", "Viewer")
    - **Allowed Source Schemas**: Select ontology types (SKOS, OWL, RDFS, etc.)
    - **Allowed Tools**: Choose which tools are available to this profile
4. Save the profile

**Common profile patterns:**

- **Admin profile**: All tools enabled, full source access
- **Editor profile**: Lineage, MappingModeler, KGQuery with read/write access
- **Viewer profile**: Read-only tools with read-only source access

5. **Assign profiles to users**:
    - Return to the **Users** tab
    - Edit each user
    - Select the appropriate profile(s)
    - Save changes

For detailed instructions, see [ConfigEditor - Profiles](configeditor.md#profiles).

## Step 3: Configure a Source

Sources are the knowledge graphs (RDF data) that SousLeSens will manage and visualize.

### 3.1 Add Source Configuration

**Quick steps:**

1. Navigate to the **Sources** tab in ConfigEditor
2. Click **"Create Source"**
3. Fill in the configuration:
    - **Name**: Unique source identifier
    - **Graph URI**: URI for the RDF graph
    - **Group**: Organizational group for categorization
    - **Schema Type**: Select ontology type (SKOS, OWL, RDFS, etc.)
    - **SPARQL Server**: Configure endpoint URL and authentication
4. Click **"Submit"** to save the source configuration

    > **Option**: Click **"Submit and Upload Graph"** to save the configuration and upload an RDF graph in one step

For detailed instructions, see [ConfigEditor - Creating a Source](configeditor.md#creating-a-source).

### 3.2 Upload a Graph

If you didn't upload the graph during source creation (Step 3.1), you can upload it later using GraphManagement.

1. Navigate to the **GraphManagement** tool
2. Select your source from the list
3. Upload your RDF graph:

    - Click **"Upload Graph"** or drag and drop your RDF file
    - Supported formats: RDF/XML, Turtle, N-Triples, JSON-LD
    - Wait for the upload to complete

4. Verify the upload:
    - The **Graph Size** should display the number of triples
    - The **Data** indicator should show a green circle (graph available)

For detailed instructions, see [GraphManagement documentation](graphmanagement.md).

> **Note**: Large graphs may take several minutes to upload and process.

## Step 4: Configure Source Access by Profile

Now that you have created sources, you need to define which profiles can access them and with what permissions.

**Quick steps:**

1. Navigate to **ConfigEditor** > **Profiles** tab
2. Click the **edit** icon for the profile you want to configure
3. In **Source Access Controle**, configure permissions using the tree view:

    - **Filter sources**: Use the search bar to find specific sources
    - **Expand the tree**: Navigate the source hierarchy
    - **Set access level** for each source:
        - **Forbidden**: Profile cannot access this source
        - **Read**: Profile can view but not modify the source
        - **Read & Write**: Profile can view and edit the source

4. Click **"Save"** to apply the permissions

5. **Repeat** for each profile that needs access to the source

## Verification

After completing all steps, verify your setup:

1. **Log in as a regular user** (not admin)
2. **Check that**:
    - The user can access only the tools allowed by their profile
    - The user can see only the sources they have permission for
    - Read/write permissions are enforced correctly

## Next Steps

Now that your SousLeSens instance is configured, you can explore:

- [Lineage](lineage.md): Track data lineage and transformations
- [Mappingmodeler](mappingmodeler.md): Create and manage data mappings
- [Kgquery](kgquery.md): Query knowledge graphs with SPARQL
