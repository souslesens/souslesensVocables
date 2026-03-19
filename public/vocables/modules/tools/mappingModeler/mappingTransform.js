import common from "../../shared/common.js";
import DataSourceManager from "./dataSourcesManager.js";
import MappingModeler from "./mappingModeler.js";
import UIcontroller from "./uiController.js";

/**
 * Module responsible for generating and managing mappings for the MappingTransform process.
 * It interacts with the Vis.js graph to retrieve mappings and formats them as JSON for use in the application.
 * It also provides functionality for generating SLS mappings and R2ML mappings (coming soon).
 * @module MappingTransform
 * @see [Tutorial: Overview]{@tutorial overview}
 */
var MappingTransform = (function () {
    var self = {};

    /**
     * Placeholder function for generating R2ML mappings. Currently displays an alert.
     *
     * @function
     * @name generateR2MLmappings
     * @memberof module:MappingTransform
     * @returns {void}
     */


/* ============================================================================
 *  RML / R2RML EXPORT (PROPER) - SousLeSens
 *  - UI: jsTree (RML or R2RML) + download
 *  - R2RML: SQL only (Ontop)
 *  - RML: SQL + CSV
 *  - Proper links: rr:parentTriplesMap + rr:joinCondition
 *  - Fix otherPredicates: column -> rml:reference/rr:column (NOT rr:constant)
 *  - No optional chaining
 * ========================================================================== */

// ---------------------------------------------------------------------------
// Public entry point (button/menu hook)
// ---------------------------------------------------------------------------

// garde ce nom si ton UI appelle generateR2MLmappings
self.generateR2MLmappings = function () {
    self.openExportMappingsDialog();
};

// si tu veux aussi un alias explicite
self.exportRmlR2rml = function () {
    self.openExportMappingsDialog();
};

// ---------------------------------------------------------------------------
// Dialog (jsTree) -> download file
// ---------------------------------------------------------------------------
self.openExportMappingsDialog = function () {
    if (typeof JstreeWidget === "undefined") {
        return alert("JstreeWidget not loaded");
    }

    var baseName = "mapping_" + (MappingModeler && MappingModeler.currentSLSsource ? MappingModeler.currentSLSsource : "export");

    var jstreeData = [
        { id: "export_root", parent: "#", text: "Export mappings", type: "Folder", data: { kind: "root" } },
        { id: "export_r2rml", parent: "export_root", text: "R2RML (SQL only - Ontop)", type: "Property", data: { format: "r2rml" } },
        { id: "export_rml", parent: "export_root", text: "RML (SQL + CSV)", type: "Property", data: { format: "rml" } },
    ];

    var options = {
        openAll: true,

        // validateSelfDialog du widget fait get_checked(true) -> donc checkbox plugin obligatoire
        withCheckboxes: true,
        tie_selection: false,
        cascade: "xxx",

        // Un seul choix (RML XOR R2RML)
        onCheckNodeFn: function (_evt, obj) {
            try {
                var tree = $("#jstreeWidget_treeDiv").jstree(true);
                if (!tree || !obj || !obj.node) return;
                var id = obj.node.id;
                if (id !== "export_rml" && id !== "export_r2rml") return;
                var other = id === "export_rml" ? "export_r2rml" : "export_rml";
                tree.uncheck_node(other);
            } catch (e) {}
        },

        validateFn: function (selectedNodes) {
            if (!selectedNodes || selectedNodes.length === 0) {
                return alert("Check one option (RML or R2RML), then click OK");
            }

            var fmt = null;
            for (var i = 0; i < selectedNodes.length; i++) {
                var n = selectedNodes[i];
                if (n && n.data && n.data.format) {
                    fmt = n.data.format;
                    break;
                }
            }
            if (!fmt) {
                return alert("Check RML or R2RML, then click OK");
            }

            var ttl = "";
            if (fmt === "r2rml") {
                ttl = self.generateR2RMLTurtle();
                self.downloadTextFile(baseName + ".r2rml.ttl", ttl, "text/turtle;charset=utf-8");
            } else if (fmt === "rml") {
                ttl = self.generateRMLTurtle();
                self.downloadTextFile(baseName + ".rml.ttl", ttl, "text/turtle;charset=utf-8");
            }
        },
    };

    JstreeWidget.loadJsTree(null, jstreeData, options, function () {});
};

self.downloadTextFile = function (fileName, content, mimeType) {
    var type = mimeType || "text/turtle;charset=utf-8";
    var blob = new Blob([content], { type: type });
    var url = window.URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// Main generators
// ---------------------------------------------------------------------------
self.generateR2RMLTurtle = function () {
    return self.generateRmlOrR2rmlTurtle("r2rml");
};

self.generateRMLTurtle = function () {
    return self.generateRmlOrR2rmlTurtle("rml");
};

self.generateRmlOrR2rmlTurtle = function (format) {
    // format: "rml" | "r2rml"
    var model = self.buildExportModel(); // canonical ids + TriplesMaps index

    var out = "";
    out += self.prefixBlock();
    out += "# Generated by SousLeSens (" + (format === "rml" ? "RML" : "R2RML") + " export)\n";
    out += "# Source: " + self.escapeTurtleString(MappingModeler && MappingModeler.currentSLSsource ? MappingModeler.currentSLSsource : "") + "\n\n";

    // TriplesMaps “entités”
    for (var i = 0; i < model.triplesMaps.length; i++) {
        out += self.writeTriplesMapProper(format, model.triplesMaps[i], model);
        out += "\n";
    }

    // URI constant nodes (ancrés par table)
    out += self.writeUriConstantTriplesMaps(format, model);

    return out;
};

// ---------------------------------------------------------------------------
// MODEL: nodes/edges + canonicalisation + index TM
// ---------------------------------------------------------------------------
self.getAllVisNodes = function () {
    if (!window.MappingColumnsGraph) return [];
    if (!MappingColumnsGraph.visjsGraph) return [];
    if (!MappingColumnsGraph.visjsGraph.data) return [];
    if (!MappingColumnsGraph.visjsGraph.data.nodes) return [];
    return MappingColumnsGraph.visjsGraph.data.nodes.get();
};

self.getAllVisEdges = function () {
    if (!window.MappingColumnsGraph) return [];
    if (!MappingColumnsGraph.visjsGraph) return [];
    if (!MappingColumnsGraph.visjsGraph.data) return [];
    if (!MappingColumnsGraph.visjsGraph.data.edges) return [];
    return MappingColumnsGraph.visjsGraph.data.edges.get();
};

self.buildExportModel = function () {
    var nodes = self.getAllVisNodes();
    var edges = self.getAllVisEdges();

    var nodesById = {};
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i] && nodes[i].id) nodesById[nodes[i].id] = nodes[i];
    }

    // outgoing edges
    var outgoing = {};
    for (i = 0; i < edges.length; i++) {
        var e = edges[i];
        if (!e || !e.from) continue;
        if (!outgoing[e.from]) outgoing[e.from] = [];
        outgoing[e.from].push(e);
    }

    // canonical id resolver: follow definedInColumn chain
    var canonicalCache = {};
    var getCanonicalNodeId = function (nodeId) {
        if (canonicalCache[nodeId]) return canonicalCache[nodeId];

        var n = nodesById[nodeId];
        if (!n || !n.data || !n.data.definedInColumn) {
            canonicalCache[nodeId] = nodeId;
            return nodeId;
        }
        var nextId = n.data.definedInColumn;
        if (!nextId || nextId === nodeId) {
            canonicalCache[nodeId] = nodeId;
            return nodeId;
        }
        var canon = getCanonicalNodeId(nextId);
        canonicalCache[nodeId] = canon;
        return canon;
    };

    // tables list
    var tables = [];
    if (window.MappingColumnsGraph && typeof MappingColumnsGraph.getDatasourceTablesFromVisjsGraph === "function") {
        tables = MappingColumnsGraph.getDatasourceTablesFromVisjsGraph();
    }
    if (!tables || tables.length === 0) {
        // fallback: infer from nodes
        var tmap = {};
        for (i = 0; i < nodes.length; i++) {
            var nd = nodes[i] && nodes[i].data ? nodes[i].data : null;
            if (nd && nd.dataTable) tmap[nd.dataTable] = 1;
        }
        tables = Object.keys(tmap);
    }

    // table -> column ids map
    var tableColumnIds = {};
    for (i = 0; i < tables.length; i++) tableColumnIds[tables[i]] = {};

    for (i = 0; i < nodes.length; i++) {
        var d = nodes[i] && nodes[i].data ? nodes[i].data : null;
        if (!d || !d.dataTable) continue;

        var table = d.dataTable;
        if (!tableColumnIds[table]) tableColumnIds[table] = {};

        if (d.type === "Column" || d.type === "VirtualColumn" || d.type === "RowIndex") {

            // 1) le nom de colonne est souvent dans data.id (ex: "tag")
            if (d.id) tableColumnIds[table][String(d.id)] = 1;

            // 2) le nom de colonne est aussi dans label (ex: "tag")
            if (nodes[i].label) tableColumnIds[table][String(nodes[i].label)] = 1;

            // 3) parfois aussi dans data.label
            if (d.label) tableColumnIds[table][String(d.label)] = 1;
        }
    }

    // entities TriplesMaps: main columns + blankNode/randomIdentifier + URI constants
    var triplesMaps = [];
    var tmByCanonicalNodeId = {}; // canonNodeId -> :TM_xxx
    var tmInfoByTmId = {}; // tmId -> info
    var entityCanonicalIds = {}; // canon ids that are "entity" subjects

    var isEntitySubjectNode = function (nodeData) {
        if (!nodeData) return false;
        // URI constant nodes are handled exclusively by _writeUriConstantTriplesMaps
        if (nodeData.type === "URI") return false;
        if (nodeData.isMainColumn === true) return true;
        if (nodeData.uriType === "blankNode" || nodeData.uriType === "randomIdentifier") return true;
        return false;
    };

    for (i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (!node || !node.data) continue;

        var nd = node.data;
        if (!nd.dataTable) continue;
        if (!isEntitySubjectNode(nd)) continue;

        var canonId = getCanonicalNodeId(node.id);
        if (entityCanonicalIds[canonId]) continue;

        var canonNode = nodesById[canonId];
        if (!canonNode || !canonNode.data) continue;

        entityCanonicalIds[canonId] = 1;

        var tableName = canonNode.data.dataTable;
        var tmId = self.makeTriplesMapId("TM", tableName, canonId);

        tmByCanonicalNodeId[canonId] = tmId;

        var tmInfo = {
            tmId: tmId,
            table: tableName,
            dsId: self.getTableDatasourceId(tableName),
            subjectCanonicalId: canonId,
            subjectNodeId: canonId,
        };
        tmInfoByTmId[tmId] = tmInfo;
        triplesMaps.push(tmInfo);
    }

    return {
        nodes: nodes,
        edges: edges,
        nodesById: nodesById,
        outgoing: outgoing,
        tables: tables,
        tableColumnIds: tableColumnIds,
        getCanonicalNodeId: getCanonicalNodeId,
        triplesMaps: triplesMaps,
        tmByCanonicalNodeId: tmByCanonicalNodeId,
        tmInfoByTmId: tmInfoByTmId,
        entityCanonicalIds: entityCanonicalIds,
    };
};

// ---------------------------------------------------------------------------
// TriplesMap writer (proper)
// ---------------------------------------------------------------------------
self.writeTriplesMapProper = function (format, tmInfo, model) {
    var nodesById = model.nodesById;
    var nodes = model.nodes;
    var outgoing = model.outgoing;

    var table = tmInfo.table;
    var dsId = tmInfo.dsId;

    // R2RML = SQL only
    if (format === "r2rml" && self.isCsvDatasource(dsId)) {
        return "";
    }

    // logical source block
    var logical = "";
    if (format === "r2rml") logical = self.logicalBlockR2RML(table);
    else logical = self.logicalBlockRML(table, dsId);

    // subject node data
    var subjNode = nodesById[tmInfo.subjectNodeId];
    if (!subjNode || !subjNode.data) return "";

    var sData = subjNode.data;

    // infer rr:class from rdfType if present (and not owl:Class)
    var businessClass = null;
    if (sData.rdfType && sData.rdfType !== "owl:Class") businessClass = sData.rdfType;

    // build predicate-object maps from:
    // 1) node properties: rdfsLabel, otherPredicates, transform (optional)
    // 2) outgoing edges from any node whose canonical(from) == subjectCanonicalId
    // poSeen deduplicates identical chunks (avoids duplicate rdf:type etc.)
    var poChunks = [];
    var poSeen = {};

    var addPo = function (chunk) {
        if (!chunk) return;
        if (poSeen[chunk]) return;
        poSeen[chunk] = true;
        poChunks.push(chunk);
    };

    // (A) rdfs:label — rdfsLabel is always a column name in SousLeSens
    if (sData.rdfsLabel) {
        var labelLang = sData.rdfsLabelLang ? String(sData.rdfsLabelLang).trim() : null;
        addPo(self.writePredicateObjectMapProper(format, "rdfs:label", {
            kind: "literalColumn",
            value: sData.rdfsLabel,
            language: labelLang,
            datatype: labelLang ? null : "xsd:string",
        }));
    }

    // (B) transform: emit FnO if a known GREL function exists, else comment + raw reference
    if (sData.transform && sData.rdfsLabel) {
        // rdfsLabel is used as the source column to transform
        var colIdsForTransform = model.tableColumnIds[table] ? model.tableColumnIds[table] : {};
        if (colIdsForTransform[sData.rdfsLabel]) {
            addPo(self.writeFnoTransformObjectMap(format, ":sls_transformedValue", sData.rdfsLabel, sData.transform, null));
        } else {
            addPo("  # NOTE: transform '" + sData.transform + "' — source column '" + sData.rdfsLabel + "' not found in table columns\n");
        }
    } else if (sData.transform) {
        addPo("  # NOTE: transform '" + sData.transform + "' defined on subject node but no rdfsLabel column to apply it to\n");
    }

    // (C) otherPredicates (IMPORTANT: object can be a column!)
    if (sData.otherPredicates && Array.isArray(sData.otherPredicates)) {
        for (var opi = 0; opi < sData.otherPredicates.length; opi++) {
            var op = sData.otherPredicates[opi];
            if (!op || !op.property) continue;

            var pred = op.property;
            var obj = op.object;
            var dt = null;

            if (op.range) {
                if (self.isIriRange(op.range)) {
                    dt = null; // object property => IRI, no datatype
                } else {
                    dt = self.mapXsdType(op.range);
                }
            }

            // IRI constant (http://, urn:, or prefixed name like rdf:type) ?
            var iri = self.turtleIriOrCurie(obj);
            if (iri || (op.range && self.isIriRange(op.range))) {
                addPo(self.writePredicateObjectMapProper(format, pred, { kind: "iriConstant", value: obj }));
            } else if (obj && self.isColumnName(obj)) {
                // simple identifier => column reference
                if (op.range && self.isIriRange(op.range)) {
                    addPo(self.writePredicateObjectMapProper(format, pred, { kind: "iriTemplate", value: "{" + obj + "}" }));
                } else {
                    addPo(self.writePredicateObjectMapProper(format, pred, { kind: "literalColumn", value: obj, datatype: dt }));
                }
            } else {
                addPo(self.writePredicateObjectMapProper(format, pred, { kind: "literalConstant", value: obj, datatype: dt }));
            }
        }
    }

    // (D) outgoing edges based on canonical(from)
    for (var ni = 0; ni < nodes.length; ni++) {
        var n = nodes[ni];
        if (!n || !n.id) continue;

        var canonFrom = model.getCanonicalNodeId(n.id);
        if (canonFrom !== tmInfo.subjectCanonicalId) continue;

        var outs = outgoing[n.id] ? outgoing[n.id] : [];
        for (var ei = 0; ei < outs.length; ei++) {
            var e = outs[ei];
            if (!e || !e.to) continue;

            // ignore tableToColumn
            if (e.data && e.data.type === "tableToColumn") continue;

            var pred2 = null;
            if (e.data && e.data.id) pred2 = e.data.id;
            if (!pred2 && e.data && e.data.type) pred2 = e.data.type;
            if (!pred2) continue;

            var toNode = nodesById[e.to];
            if (!toNode || !toNode.data) continue;

            var toData = toNode.data;

            // if target belongs to another table, skip unless you want cross-table
            // (we allow it if it has dataTable and datasource)
            if (toData.dataTable && toData.dataTable !== table) {
                // ok: join still possible
            }

            // pass n as fromNode so edgeToObjectMap can use its column as child FK
            addPo(self.edgeToObjectMap(format, table, n, toNode, pred2, model));
        }
    }

    var po = poChunks.join("");

    // Write TM
    var ttl = "";
    ttl += tmInfo.tmId + " a rr:TriplesMap ;\n";

    if (format === "rml") {
        ttl += "  rml:logicalSource [\n";
        ttl += logical + "\n";
        ttl += "  ] ;\n";
    } else {
        ttl += "  rr:logicalTable [\n";
        ttl += logical + "\n";
        ttl += "  ] ;\n";
    }

    ttl += self.writeSubjectMapProper(format, sData, businessClass, model.nodesById);

    if (po) ttl += po;

    ttl += "  .\n";
    return ttl;
};

// Convert an edge target into objectMap (proper join if possible)
self.edgeToObjectMap = function (format, currentTable, fromNode, toNode, predicate, model) {
    var nodesById = model.nodesById;

    var toData = toNode && toNode.data ? toNode.data : null;
    if (!toData) return "";

    // canonical target
    var canonToId = model.getCanonicalNodeId(toNode.id);
    var canonToNode = nodesById[canonToId];
    if (!canonToNode || !canonToNode.data) canonToNode = toNode;

    var canonData = canonToNode.data;

    // detect if target is entity-like (so we can join)
    // RowIndex and VirtualColumn are handled separately below (blank node semantics)
    var isEntity =
        canonData.type !== "RowIndex" &&
        canonData.type !== "VirtualColumn" &&
        (
            (canonData.type === "URI") ||
            (canonData.isMainColumn === true) ||
            (canonData.uriType === "blankNode" || canonData.uriType === "randomIdentifier")
        );

    // If target is an entity and there is a TriplesMap for it, do parentTriplesMap+joinCondition
    // child = FK column in the source (current) table
    // parent = column in the target TriplesMap's source that holds the matching value
    //   → use toData.id (the actual target column pointed to by the edge, e.g. FK column in books.csv)
    //   → fallback to canonData.id (PK of the canonical node) if toData.id is absent
    if (isEntity) {
        var parentTm = model.tmByCanonicalNodeId[canonToId];
        var childCol;
        var parentCol;

        if (toData.id) {
            parentCol = String(toData.id);
        } else if (canonData.id) {
            parentCol = String(canonData.id);
        } else {
            parentCol = null;
        }

        // child FK column:
        // - target in a DIFFERENT table: FK is in the source (from) node
        // - target in the SAME table (definedInColumn alias): toData.id is the FK
        if (toData.dataTable && toData.dataTable !== currentTable) {
            if (fromNode && fromNode.data && fromNode.data.id) {
                childCol = String(fromNode.data.id);
            } else {
                childCol = null;
            }
        } else {
            if (toData.id) {
                childCol = String(toData.id);
            } else {
                childCol = null;
            }
        }

        if (parentTm && childCol && parentCol) {
            return self.writePredicateObjectMapProper(format, predicate, {
                kind: "parentTriplesMap",
                parentTriplesMap: parentTm,
                child: childCol,
                parent: parentCol,
            });
        }

        // fallback: template (still IRI/BlankNode)
        var tmpl = self.subjectTemplateForColumn(canonData);
        if (canonData.uriType === "blankNode") {
            return self.writePredicateObjectMapProper(format, predicate, { kind: "blankNodeTemplate", value: tmpl });
        }
        if (canonData.type === "URI") {
            return self.writePredicateObjectMapProper(format, predicate, { kind: "iriConstant", value: canonData.id });
        }
        return self.writePredicateObjectMapProper(format, predicate, { kind: "iriTemplate", value: tmpl });
    }

    // RowIndex: SousLeSens creates a blank node per row using the row position as cache key.
    // In RML, replicate this with rr:parentTriplesMap + joinCondition on the primary key column.
    if (canonData.type === "RowIndex") {
        var rowIndexParentTm = model.tmByCanonicalNodeId[canonToId];
        if (rowIndexParentTm) {
            var rowIndexPkCol = self.findPrimaryKeyColumn(canonData.dataTable, nodesById);
            if (rowIndexPkCol) {
                return self.writePredicateObjectMapProper(format, predicate, {
                    kind: "parentTriplesMap",
                    parentTriplesMap: rowIndexParentTm,
                    child: rowIndexPkCol,
                    parent: rowIndexPkCol,
                });
            }
        }
        return "  # NOTE: predicate <" + predicate + "> → RowIndex blank node — no primary key column found in table '" + (canonData.dataTable || "?") + "', skipped\n";
    }

    // VirtualColumn: SousLeSens creates a blank node per (columnId, rowIndex).
    // In RML, replicate with rr:parentTriplesMap + joinCondition on the primary key column.
    if (canonData.type === "VirtualColumn") {
        var vcParentTm = model.tmByCanonicalNodeId[canonToId];
        if (vcParentTm) {
            var vcPkCol = self.findPrimaryKeyColumn(canonData.dataTable, nodesById);
            if (vcPkCol) {
                return self.writePredicateObjectMapProper(format, predicate, {
                    kind: "parentTriplesMap",
                    parentTriplesMap: vcParentTm,
                    child: vcPkCol,
                    parent: vcPkCol,
                });
            }
        }
        return "  # NOTE: predicate <" + predicate + "> → VirtualColumn '" + canonData.id + "' blank node — no primary key column found in table '" + (canonData.dataTable || "?") + "', skipped\n";
    }

    // literal columns
    if (toData.type === "Column") {
        return self.writePredicateObjectMapProper(format, predicate, { kind: "literalColumn", value: toData.id, datatype: null });
    }

    // fallback constant literal
    return self.writePredicateObjectMapProper(format, predicate, { kind: "literalConstant", value: toData.id, datatype: null });
};

// ---------------------------------------------------------------------------
// URI constant TriplesMaps (optional, but keeps your previous behavior)
// ---------------------------------------------------------------------------
self.writeUriConstantTriplesMaps = function (format, model) {
    var nodes = model.nodes;
    var nodesById = model.nodesById;

    var edgesByFrom = {};
    for (var i = 0; i < model.edges.length; i++) {
        var e = model.edges[i];
        if (!e || !e.from) continue;
        if (!edgesByFrom[e.from]) edgesByFrom[e.from] = [];
        edgesByFrom[e.from].push(e);
    }

    var ttl = "";
    for (i = 0; i < nodes.length; i++) {
        var uriNode = nodes[i];
        if (!uriNode || !uriNode.data) continue;
        if (uriNode.data.type !== "URI") continue;

        var outs = edgesByFrom[uriNode.id] ? edgesByFrom[uriNode.id] : [];
        if (!outs || outs.length === 0) continue;

        // group by target table
        var perTable = {};
        for (var j = 0; j < outs.length; j++) {
            var edge = outs[j];
            if (!edge || !edge.to) continue;
            if (edge.data && edge.data.type === "tableToColumn") continue;

            var toNode = nodesById[edge.to];
            if (!toNode || !toNode.data || !toNode.data.dataTable) continue;

            var table = toNode.data.dataTable;
            if (!perTable[table]) perTable[table] = [];
            perTable[table].push({ edge: edge, toNode: toNode });
        }

        var tables = Object.keys(perTable);
        for (var ti = 0; ti < tables.length; ti++) {
            var t = tables[ti];
            var dsId = self.getTableDatasourceId(t);

            if (format === "r2rml" && self.isCsvDatasource(dsId)) {
                continue;
            }

            var logical = (format === "r2rml") ? self.logicalBlockR2RML(t) : self.logicalBlockRML(t, dsId);

            var tmId = self.makeTriplesMapId("TM_URI", t, uriNode.id);

            ttl += tmId + " a rr:TriplesMap ;\n";
            if (format === "rml") {
                ttl += "  rml:logicalSource [\n" + logical + "\n  ] ;\n";
            } else {
                ttl += "  rr:logicalTable [\n" + logical + "\n  ] ;\n";
            }

            ttl += self.writeSubjectMapProper(format, uriNode.data, null, nodesById);

            // edges
            for (j = 0; j < perTable[t].length; j++) {
                var x = perTable[t][j];
                var pred = null;
                if (x.edge.data && x.edge.data.id) pred = x.edge.data.id;
                if (!pred && x.edge.data && x.edge.data.type) pred = x.edge.data.type;
                if (!pred) continue;

                // reuse edge handling
                // uriNode is the from node for all outgoing edges in this section
                ttl += self.edgeToObjectMap(format, t, uriNode, x.toNode, pred, model);
            }

            ttl += "  .\n\n";
        }
    }

    return ttl;
};

// ---------------------------------------------------------------------------
// Writers: subjectMap + predicateObjectMap (proper)
// ---------------------------------------------------------------------------
self.writeSubjectMapProper = function (_format, subjectData, businessClass, _nodesById) {
    var gUri = self.getGraphUri();
    var ttl = "";
    ttl += "  rr:subjectMap [\n";

    // rr:graph is supported in RML but not in R2RML (Ontop)
    if (gUri && _format === "rml") {
        ttl += "    rr:graph <" + self.escapeTurtleString(gUri) + "> ;\n";
    }

    if (subjectData && subjectData.type === "URI") {
        ttl += "    rr:constant <" + self.escapeTurtleString(subjectData.id) + "> ;\n";
        ttl += "    rr:termType rr:IRI";
    } else if (subjectData && (subjectData.type === "RowIndex" || subjectData.type === "VirtualColumn")) {
        // SousLeSens creates a blank node per row for RowIndex/VirtualColumn.
        // To make the blank node stable and joinable from other TriplesMaps, use a template
        // built from the primary key column of the same table (if available).
        var pkForBNode = self.findPrimaryKeyColumn(subjectData.dataTable, _nodesById);
        if (pkForBNode) {
            var safeId = self.escapeTurtleString(String(subjectData.id)).replace(/[^a-zA-Z0-9_]/g, "_");
            ttl += '    rr:template "http://souslesens.org/bnode/' + safeId + '/{' + pkForBNode + '}" ;\n';
            // rr:template requires rr:IRI — BlankNode is incompatible with templates
            ttl += "    rr:termType rr:IRI";
        } else {
            // no primary key available: true blank node per row (no template)
            ttl += "    rr:termType rr:BlankNode";
        }
    } else {
        var template = self.subjectTemplateForColumn(subjectData);
        ttl += '    rr:template "' + self.escapeTurtleString(template) + '" ;\n';
        // rr:template requires rr:IRI — BlankNode is incompatible with templates
        ttl += "    rr:termType rr:IRI";
    }

    if (businessClass) {
        // businessClass may be a comma-separated string or an array of class IRIs
        var classes = [];
        if (Array.isArray(businessClass)) {
            classes = businessClass;
        } else {
            // split on comma and clean whitespace
            classes = String(businessClass).split(",").map(function (c) { return c.trim(); }).filter(function (c) { return c.length > 0; });
        }
        for (var ci = 0; ci < classes.length; ci++) {
            ttl += " ;\n    rr:class " + self.turtleObject(classes[ci]);
        }
    }

    ttl += "\n  ] ;\n";
    return ttl;
};

self.writePredicateObjectMapProper = function (format, predicate, spec) {
    var ttl = "";
    ttl += "  rr:predicateObjectMap [\n";
    ttl += "    rr:predicate " + self.turtleObject(predicate) + " ;\n";
    ttl += "    rr:objectMap [\n";

    if (spec.kind === "parentTriplesMap") {
        ttl += "      rr:parentTriplesMap " + spec.parentTriplesMap + " ;\n";
        ttl += "      rr:joinCondition [\n";
        ttl += '        rr:child "' + self.escapeTurtleString(spec.child) + '" ;\n';
        ttl += '        rr:parent "' + self.escapeTurtleString(spec.parent) + '"\n';
        ttl += "      ]\n";
    } else if (spec.kind === "literalColumn") {
        // RML uses rml:reference ; R2RML uses rr:column
        if (format === "rml") {
            ttl += '      rml:reference "' + self.escapeTurtleString(spec.value) + '"';
        } else {
            ttl += '      rr:column "' + self.escapeTurtleString(spec.value) + '"';
        }
        if (spec.language) {
            // language tag takes precedence over datatype (they are mutually exclusive in RML)
            ttl += " ;\n      rml:language \"" + self.escapeTurtleString(spec.language) + "\"";
        } else if (spec.datatype) {
            ttl += " ;\n      rr:datatype " + self.turtleObject(spec.datatype);
        }
        ttl += "\n";
    } else if (spec.kind === "literalConstant") {
        ttl += "      rr:constant " + self.turtleObject(spec.value);
        if (spec.datatype) {
            ttl += " ;\n      rr:datatype " + self.turtleObject(spec.datatype);
        }
        ttl += "\n";
    } else if (spec.kind === "iriTemplate") {
        ttl += '      rr:template "' + self.escapeTurtleString(spec.value) + '" ;\n';
        ttl += "      rr:termType rr:IRI\n";
    } else if (spec.kind === "iriConstant") {
        ttl += "      rr:constant " + self.turtleObject(spec.value) + " ;\n";
        ttl += "      rr:termType rr:IRI\n";
    } else if (spec.kind === "blankNodeTemplate") {
        ttl += '      rr:template "' + self.escapeTurtleString(spec.value) + '" ;\n';
        ttl += "      rr:termType rr:BlankNode\n";
    } else {
        ttl += "      rr:constant " + self.turtleObject(spec.value) + "\n";
    }

    ttl += "    ]\n";
    ttl += "  ] ;\n";
    return ttl;
};

// ---------------------------------------------------------------------------
// Logical sources
// ---------------------------------------------------------------------------
self.logicalBlockR2RML = function (table) {
    return '    rr:tableName "' + self.escapeTurtleString(table) + '"';
};

self.logicalBlockRML = function (table, dsId) {
    // CSV
    if (self.isCsvDatasource(dsId)) {
        var csvPath = "CSV/" + (MappingModeler && MappingModeler.currentSLSsource ? MappingModeler.currentSLSsource : "") + "/" + table;
        var s = "";
        s += '    rml:source "' + self.escapeTurtleString(csvPath) + '" ;\n';
        s += "    rml:referenceFormulation ql:CSV";
        return s;
    }

    // SQL - generate a standard d2rq:Database block with JDBC placeholders
    var sqlInfo = self.getSqlDatasourceInfo(dsId);
    var q = String.fromCharCode(34);
    var s2 = "";
    s2 += "    rml:source [\n";
    s2 += "      a d2rq:Database ;\n";
    s2 += "      d2rq:jdbcDSN " + q + sqlInfo.jdbcDSN + q + " ;\n";
    s2 += "      d2rq:jdbcDriver " + q + sqlInfo.jdbcDriver + q + " ;\n";
    s2 += "      d2rq:username " + q + "YOUR_USERNAME" + q + " ;\n";
    s2 += "      d2rq:password " + q + "YOUR_PASSWORD" + q + "\n";
    s2 += "    ] ;\n";
    s2 += "    rml:referenceFormulation ql:SQL2008 ;\n";
    s2 += "    rr:tableName " + q + self.escapeTurtleString(table) + q;
    return s2;
};

// ---------------------------------------------------------------------------
// Datasource helpers
// ---------------------------------------------------------------------------
self.getTableDatasourceId = function (table) {
    // try to find the "table" node in graph and read datasource field
    var nodes = self.getAllVisNodes();
    for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!n || !n.data) continue;
        var d = n.data;
        if (d.type !== "table") continue;

        // table name can be in d.id or label
        if ((d.id && String(d.id) === String(table)) || (n.label && String(n.label) === String(table))) {
            if (d.dataSource) return d.dataSource;
            if (d.dataSourceId) return d.dataSourceId;
            if (d.datasource) return d.datasource;
            if (d.dataSourceName) return d.dataSourceName;
        }
    }

    // fallback: current datasource
    if (DataSourceManager && DataSourceManager.currentConfig && DataSourceManager.currentConfig.currentDataSource) {
        var cd = DataSourceManager.currentConfig.currentDataSource;
        if (cd.id) return cd.id;
        if (cd.name) return cd.name;
    }
    return null;
};

/**
 * Returns JDBC connection info (DSN template and driver class) for a SQL datasource.
 * Uses the sqlType stored in DataSourceManager to pick the correct driver.
 * @function
 * @name getSqlDatasourceInfo
 * @memberof module:MappingTransform
 * @param {string} dsId - The datasource identifier.
 * @returns {{jdbcDSN: string, jdbcDriver: string}} JDBC DSN template and driver class name.
 */
self.getSqlDatasourceInfo = function (dsId) {
    var sqlType = null;
    if (DataSourceManager && DataSourceManager.currentConfig && DataSourceManager.currentConfig.currentDataSource) {
        var ds = DataSourceManager.currentConfig.currentDataSource;
        if (!dsId || String(ds.id) === String(dsId) || String(ds.name) === String(dsId)) {
            sqlType = ds.sqlType ? String(ds.sqlType).toLowerCase() : null;
        }
    }

    if (sqlType === "postgres" || sqlType === "postgresql") {
        return {
            jdbcDSN: "jdbc:postgresql://YOUR_HOST:5432/YOUR_DATABASE",
            jdbcDriver: "org.postgresql.Driver",
        };
    }
    if (sqlType === "sqlserver" || sqlType === "mssql") {
        return {
            jdbcDSN: "jdbc:sqlserver://YOUR_HOST:1433;databaseName=YOUR_DATABASE",
            jdbcDriver: "com.microsoft.sqlserver.jdbc.SQLServerDriver",
        };
    }
    if (sqlType === "oracle") {
        return {
            jdbcDSN: "jdbc:oracle:thin:@YOUR_HOST:1521:YOUR_DATABASE",
            jdbcDriver: "oracle.jdbc.OracleDriver",
        };
    }
    if (sqlType === "sqlite") {
        return {
            jdbcDSN: "jdbc:sqlite:YOUR_DATABASE_FILE.db",
            jdbcDriver: "org.sqlite.JDBC",
        };
    }
    // default: MySQL
    return {
        jdbcDSN: "jdbc:mysql://YOUR_HOST:3306/YOUR_DATABASE",
        jdbcDriver: "com.mysql.cj.jdbc.Driver",
    };
};

self.isCsvDatasource = function (dsId) {
    if (!dsId) return false;

    // config
    if (DataSourceManager && DataSourceManager.currentConfig) {
        var cfg = DataSourceManager.currentConfig;
        if (cfg.csvSources && cfg.csvSources[dsId]) return true;
        if (cfg.currentDataSource && cfg.currentDataSource.type && String(cfg.currentDataSource.type).toLowerCase().indexOf("csv") > -1) {
            // only if current ds matches id
            if (cfg.currentDataSource.id && String(cfg.currentDataSource.id) === String(dsId)) return true;
        }
    }

    // heuristic
    var s = String(dsId).toLowerCase();
    if (s.indexOf("csv") > -1) return true;
    if (s.lastIndexOf(".csv") === s.length - 4) return true;

    return false;
};

// ---------------------------------------------------------------------------
// Turtle helpers
// ---------------------------------------------------------------------------
self.escapeTurtleString = function (s) {
    if (s === null || s === undefined) return "";
    return String(s)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t");
};

self.isHttpIri = function (v) {
    if (typeof v !== "string") return false;
    var s = v.trim();
    return s.indexOf("http://") === 0 || s.indexOf("https://") === 0 || s.indexOf("urn:") === 0;
};

self.isPrefixedName = function (v) {
    if (typeof v !== "string") return false;
    return /^[a-zA-Z_][a-zA-Z0-9_-]*:[^\s]+$/.test(v);
};

self.turtleIriOrCurie = function (v) {
    if (!v) return null;
    var s = String(v).trim();

    // 1) d'abord les URI complets
    if (self.isHttpIri(s)) return "<" + s + ">";

    // 2) ensuite seulement les CURIE/prefix (ex: rdf:type, rdfs:label)
    if (self.isPrefixedName(s)) return s;

    return null;
};


self.turtleObject = function (v) {
    if (v === null || v === undefined) return '""';

    // IMPORTANT : on nettoie la valeur
    var s = String(v).trim();

    var iri = self.turtleIriOrCurie(s);
    if (iri) return iri;

    return '"' + self.escapeTurtleString(s) + '"';
};


self.prefixBlock = function () {
    var lines = [];
    lines.push("@prefix rr: <http://www.w3.org/ns/r2rml#> .");
    lines.push("@prefix rml: <http://semweb.mmlab.be/ns/rml#> .");
    lines.push("@prefix ql: <http://semweb.mmlab.be/ns/ql#> .");
    lines.push("@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .");
    lines.push("@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .");
    lines.push("@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .");
    lines.push("@prefix owl: <http://www.w3.org/2002/07/owl#> .");
    lines.push("@prefix fnml: <http://semweb.mmlab.be/ns/fnml#> .");
    lines.push("@prefix fno: <https://w3id.org/function/ontology#> .");
    lines.push("@prefix grel: <http://users.ugent.be/~bjdmeest/function/grel.ttl#> .");
    lines.push("@prefix idlab-fn: <https://namespaces.ilabt.imec.be/idlab/function#> .");
    lines.push("@prefix d2rq: <http://www.wiwiss.fu-berlin.de/suhl/bizer/D2RQ/0.1#> .");
    lines.push("@prefix : <urn:souslesens:mapping:> .");
    lines.push("");
    return lines.join("\n") + "\n";
};

// ---------------------------------------------------------------------------
// URI / Template helpers
// ---------------------------------------------------------------------------
self.getGraphUri = function () {
    // prefer config graphUri if exists
    if (DataSourceManager && DataSourceManager.currentConfig && DataSourceManager.currentConfig.options && DataSourceManager.currentConfig.options.config) {
        if (DataSourceManager.currentConfig.options.config.graphUri) return DataSourceManager.currentConfig.options.config.graphUri;
    }
    if (window.Config && Config.sources && MappingModeler && MappingModeler.currentSLSsource) {
        var src = Config.sources[MappingModeler.currentSLSsource];
        if (src && src.graphUri) return src.graphUri;
    }
    return null;
};

self.subjectTemplateForColumn = function (data) {
    if (!data) return "urn:souslesens:unknown/{id}";

    // URI constant should not use template (handled elsewhere)
    if (data.type === "URI") return String(data.id);

    // baseURI: node-level > graphUri config > fallback urn:souslesens
    var base = data.baseURI ? String(data.baseURI) : null;
    if (!base) {
        base = self.getGraphUri();
    }
    if (!base) {
        var src = (MappingModeler && MappingModeler.currentSLSsource) ? String(MappingModeler.currentSLSsource) : "source";
        var table = data.dataTable ? String(data.dataTable) : "table";
        base = "urn:souslesens:" + src + ":" + table + ":";
    }

    // normalize base: ensure trailing / or #
    if (base.lastIndexOf("/") !== base.length - 1 && base.lastIndexOf("#") !== base.length - 1) {
        base += "/";
    }

    // prefixURI: SousLeSens adds separator if none present
    var prefix = data.prefixURI ? String(data.prefixURI) : "";
    if (prefix && prefix.slice(-1) !== "/" && prefix.slice(-1) !== "#" && prefix.slice(-1) !== "-" && prefix.slice(-1) !== "_" && prefix.slice(-1) !== ".") {
        prefix += "-";
    }

    // suffixURI
    var suffix = data.suffixURI ? String(data.suffixURI) : "";

    var col = data.id ? String(data.id) : "id";

    return base + prefix + "{" + col + "}" + suffix;
};

/**
 * Finds the primary key column name for a given table by looking for a node
 * with isMainColumn===true and type==="Column" in the same table.
 * Used to create join conditions for RowIndex and VirtualColumn blank nodes.
 * @function
 * @name _findPrimaryKeyColumn
 * @memberof module:MappingTransform
 * @param {string} table - The table name to search in.
 * @param {Object} nodesById - Map of all graph nodes keyed by ID.
 * @returns {string|null} The column name (node data id) or null if not found.
 */
/**
 * Returns true if the value looks like a plain column name (simple identifier,
 * no spaces, no http://, no colon-separated prefix).
 * Used to distinguish column references from literal constants in otherPredicates.
 * @function
 * @name isColumnName
 * @memberof module:MappingTransform
 * @param {string} v - The value to test.
 * @returns {boolean} True if the value is a plain column identifier.
 */
self.isColumnName = function (v) {
    if (!v) return false;
    var s = String(v).trim();
    if (s.length === 0) return false;
    // IRIs and prefixed names are not column names
    if (s.indexOf("http") === 0 || s.indexOf("urn:") === 0) return false;
    if (s.indexOf("://") > -1) return false;
    // prefixed names (rdf:type, xsd:string, etc.) are not column names
    if (/^[a-zA-Z_][a-zA-Z0-9_-]*:[^\s]+$/.test(s)) return false;
    // spaces = likely a literal string, not a column name
    if (s.indexOf(" ") > -1) return false;
    // plain identifier: letters, digits, underscores, hyphens, dots
    return /^[a-zA-Z0-9_\-\.]+$/.test(s);
};

self.findPrimaryKeyColumn = function (table, nodesById) {
    if (!table || !nodesById) return null;
    var nodeIds = Object.keys(nodesById);
    for (var i = 0; i < nodeIds.length; i++) {
        var node = nodesById[nodeIds[i]];
        if (!node || !node.data) continue;
        var d = node.data;
        if (d.dataTable === table && d.isMainColumn === true && d.type === "Column") {
            return String(d.id);
        }
    }
    return null;
};

self.makeTriplesMapId = function (prefix, table, nodeId) {
    var t = table ? String(table) : "table";
    var n = nodeId ? String(nodeId) : "node";
    var safeT = self.escapeTurtleString(t).replace(/[^a-zA-Z0-9_]/g, "_");
    var safeN = self.escapeTurtleString(n).replace(/[^a-zA-Z0-9_]/g, "_");
    return ":" + prefix + "_" + safeT + "_" + safeN;
};

/**
 * Maps a SousLeSens range/type string to an XSD datatype CURIE.
 * Returns null if the range represents an IRI/object property (not a literal).
 * @function
 * @name mapXsdType
 * @memberof module:MappingTransform
 * @param {string|null} range - The range string from the mapping model (e.g. "xsd:string", "http://...#integer", "Resource").
 * @returns {string|null} XSD datatype CURIE (e.g. "xsd:string") or null if the range is an IRI class.
 */
self.mapXsdType = function (range) {
    if (!range) return null;
    var r = String(range).trim();

    // Already a proper XSD CURIE
    if (r.indexOf("xsd:") === 0) return r;

    // Full XSD URI
    if (r.indexOf("http://www.w3.org/2001/XMLSchema#") === 0) {
        return "xsd:" + r.split("#")[1];
    }

    // "Resource" or anything containing "Resource" => IRI, not a literal datatype
    if (r.indexOf("Resource") > -1) return null;

    // Named types mapping
    var typeMap = {
        "string": "xsd:string",
        "integer": "xsd:integer",
        "int": "xsd:integer",
        "float": "xsd:float",
        "double": "xsd:double",
        "decimal": "xsd:decimal",
        "boolean": "xsd:boolean",
        "date": "xsd:date",
        "dateTime": "xsd:dateTime",
        "datetime": "xsd:dateTime",
        "time": "xsd:time",
        "long": "xsd:long",
        "short": "xsd:short",
        "byte": "xsd:byte",
        "anyURI": "xsd:anyURI",
        "anyuri": "xsd:anyURI",
        "gYear": "xsd:gYear",
        "gyear": "xsd:gYear",
    };

    var lower = r.toLowerCase();
    if (typeMap[r]) return typeMap[r];
    if (typeMap[lower]) return typeMap[lower];

    // If it looks like a full IRI (http:// or starts with known prefixes) => it's a class, not a datatype
    if (r.indexOf("http") === 0 || r.indexOf("owl:") === 0 || r.indexOf("rdf:") === 0 || r.indexOf("rdfs:") === 0) {
        return null;
    }

    // Otherwise treat as xsd:string
    return "xsd:string";
};

/**
 * Returns true if the range string represents an IRI/class (object property),
 * as opposed to a literal datatype.
 * @function
 * @name isIriRange
 * @memberof module:MappingTransform
 * @param {string|null} range - The range string to check.
 * @returns {boolean} True if the range is an IRI class reference.
 */
self.isIriRange = function (range) {
    if (!range) return false;
    var r = String(range).trim();
    if (r.indexOf("Resource") > -1) return true;
    if (r.indexOf("http") === 0) return true;
    if (r.indexOf("owl:") === 0 || r.indexOf("rdf:") === 0 || r.indexOf("rdfs:") === 0) return true;
    // xsd types are literal datatypes => not IRI
    if (r.indexOf("xsd:") === 0) return false;
    if (r.indexOf("http://www.w3.org/2001/XMLSchema#") === 0) return false;
    return false;
};

/**
 * Returns the GREL/idlab-fn function IRI for a known SousLeSens transform string.
 * Returns null for unknown transforms.
 * @function
 * @name getGrelFunctionForTransform
 * @memberof module:MappingTransform
 * @param {string} transform - The transform identifier (e.g. "toLowerCase", "toUpperCase", "trim").
 * @returns {string|null} A GREL/idlab-fn function CURIE, or null if not mapped.
 */
self.getGrelFunctionForTransform = function (transform) {
    if (!transform) return null;
    var t = String(transform).trim().toLowerCase();
    if (t === "tolowercase" || t === "lowercase") return "grel:toLowerCase";
    if (t === "touppercase" || t === "uppercase") return "grel:toUpperCase";
    if (t === "trim") return "grel:trim";
    if (t === "urlencode" || t === "encodeuri") return "grel:encodeForUri";
    if (t === "strip_html" || t === "striphtml") return "grel:htmlUnescape";
    if (t === "replace_spaces" || t === "replacespaces") return "idlab-fn:normalizeString";
    return null;
};

/**
 * Writes a full FnO-based predicateObjectMap that applies a GREL transformation to a column.
 * Falls back to a plain rml:reference with a comment if the transform is unknown.
 * @function
 * @name _writeFnoTransformObjectMap
 * @memberof module:MappingTransform
 * @param {string} format - "rml" or "r2rml".
 * @param {string} predicate - The predicate CURIE or IRI.
 * @param {string} columnRef - The source column name.
 * @param {string} transform - The transform identifier.
 * @param {string|null} datatype - Optional XSD datatype CURIE.
 * @returns {string} Turtle snippet for the predicateObjectMap.
 */
self.writeFnoTransformObjectMap = function (format, predicate, columnRef, transform, datatype) {
    var grelFn = self.getGrelFunctionForTransform(transform);
    if (!grelFn) {
        // Unknown transform: output column reference with a comment
        var ttl = "  # NOTE: transform '" + transform + "' not mapped to FnO — using raw column reference\n";
        ttl += self.writePredicateObjectMapProper(format, predicate, {
            kind: "literalColumn",
            value: columnRef,
            datatype: datatype,
        });
        return ttl;
    }

    // Build FnO execution map inline
    var refKeyword = (format === "rml") ? "rml:reference" : "rr:column";

    var ttl = "";
    ttl += "  rr:predicateObjectMap [\n";
    ttl += "    rr:predicate " + self.turtleObject(predicate) + " ;\n";
    ttl += "    rr:objectMap [\n";
    ttl += "      fnml:functionValue [\n";
    ttl += "        rr:predicateObjectMap [\n";
    ttl += "          rr:predicate fno:executes ;\n";
    ttl += "          rr:objectMap [ rr:constant " + grelFn + " ; rr:termType rr:IRI ]\n";
    ttl += "        ] ;\n";
    ttl += "        rr:predicateObjectMap [\n";
    ttl += "          rr:predicate grel:valueParameter ;\n";
    ttl += "          rr:objectMap [ " + refKeyword + ' "' + self.escapeTurtleString(columnRef) + '"';
    if (datatype) {
        ttl += " ; rr:datatype " + self.turtleObject(datatype);
    }
    ttl += " ]\n";
    ttl += "        ]\n";
    ttl += "      ]\n";
    ttl += "    ]\n";
    ttl += "  ] ;\n";
    return ttl;
};



    /**
     * Retrieves the SLS mappings for the current table from the Vis.js graph.
     * Filters nodes that belong to the specified table and exclude those with type "Class" or "table".
     * @function
     * @name getSLSmappingsFromVisjsGraph
     * @memberof module:MappingTransform
     * @param {string} [table] - The name of the table for which to retrieve the mappings. Defaults to the current table if not provided.
     * @returns {Object} The generated JSON object containing the SLS mappings for the specified table.
     */
    self.getSLSmappingsFromVisjsGraph = function (table) {
        if (!table) {
            table = MappingModeler.currentTable.name;
        }
        var nodesMap = {};
        var nodes = MappingColumnsGraph.visjsGraph.data.nodes.get();

        nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        });

        var columnsMap = {};
        nodes.forEach(function (node, callbackEach) {
            if (node.data.dataTable !== table) {
                return;
            }
            if (node.data.type == "Class") {
                return;
            }
            if (node.data.type == "table") {
                return;
            }

            columnsMap[node.id] = node;
        });

        var json = self.mappingsToKGcreatorJson(columnsMap);
        return json;
    };

    /**
     * Converts a node's data to a KGcreator-compatible column name based on its URI type and data type.
     * It generates column names based on different conditions such as blankNode, randomIdentifier, or URI.
     * Virtual columns and URI columns have specific suffixes added to the column name
     * @function
     * @name nodeToKGcreatorColumnName
     * @memberof module:MappingTransform
     * @param {Object} data - The node's data containing the URI type and other properties.
     * @returns {string} The generated column name in KGcreator format.
     */
    self.nodeToKGcreatorColumnName = function (data) {
        var colname = data.id;
        if (data.baseURI) {
            colname = "[" + data.baseURI + "]" + colname;
        }

        if (data.uriType == "blankNode") {
            colname = colname + "_$";
        } else if (data.uriType == "randomIdentifier") {
            colname = colname + "_£";
        }

        if (colname && data.type == "VirtualColumn") {
            colname = "@" + colname + "_$";
        }
        if (data.type == "RowIndex") {
            colname = "_rowIndex";
        }
        if (data.type == "URI") {
            colname = data.id + "_#";
        }
        return colname;
    };

    /**
     * Transforms a columns map into KGcreator-compatible JSON format, generating mappings between columns, predicates, and objects.
     * This function handles RDF types, labels, transformations, and other predicates for each column.
     * It also processes connections between nodes and generates appropriate triples for each mapping
     * @function
     * @name mappingsToKGcreatorJson
     * @memberof module:MappingTransform
     * @param {Object} columnsMap - A map of nodes containing columns to be transformed.
     * @returns {Array} An array of mapping objects in KGcreator JSON format.
     */
    self.mappingsToKGcreatorJson = function (columnsMap, options) {
        if (!options) {
            options = {};
        }
        if (!options.getColumnMappingsOnly) {
            options.getColumnMappingsOnly = false;
        }
        var columnsMapLabels = Object.values(columnsMap).map(function (column) {
            return column.label;
        });
        var allMappings = [];

        for (var nodeId in columnsMap) {
            var data = columnsMap[nodeId].data;
            var subject = self.nodeToKGcreatorColumnName(data);

            if (!subject) {
                return alert("Error in column " + nodeId);
            }

            if (!options.getColumnMappingsOnly) {
                if (data.rdfType) {
                    var predicate = "rdf:type";

                    allMappings.push({
                        s: subject,
                        p: predicate,
                        o: data.rdfType,
                    });
                }

                if (data.rdfsLabel) {
                    allMappings.push({
                        s: subject,
                        p: "rdfs:label",
                        o: data.rdfsLabel,
                        dataType: "xsd:string",
                    });
                }

                if (data.transform) {
                    allMappings.push({
                        s: subject,
                        p: "transform",
                        o: data.transform,
                    });
                }
            }
            if (nodeId == "7ce40e6a") var w = 3;
            var connections = MappingColumnsGraph.visjsGraph.getFromNodeEdgesAndToNodes(nodeId);

            connections.forEach(function (connection) {
                if (connection.edge?.data?.type == "tableToColumn") {
                    return;
                }
                var property = connection.edge?.data?.id;
                if (!property) {
                    property = connection?.edge?.data?.type;
                }
                if (!property) {
                    return;
                }
                var object = connection.toNode.data.id;
                if (columnsMapLabels.includes(object)) {
                    object = self.nodeToKGcreatorColumnName(
                        Object.values(columnsMap).filter(function (node) {
                            return object == node.label;
                        })[0].data,
                    );
                }

                var mapping = {
                    s: subject,
                    p: property,
                    o: object,
                };

                allMappings.push(mapping);
            });
            if (data.otherPredicates && !options.getColumnMappingsOnly) {
                data.otherPredicates.forEach(function (predicate) {
                    var triple = {
                        s: subject,
                        p: predicate.property,
                        o: predicate.object,
                    };

                    if (predicate.range) {
                        if (predicate.range.indexOf("Resource") > -1) {
                            triple.dataType = "xsd:string";
                        } else {
                            triple.dataType = predicate.range;
                        }
                    } else {
                        // triple.dataType = "xsd:string";
                    }
                    if (predicate.dateFormat) {
                        triple.dateFormat = predicate.dateFormat;
                    }

                    allMappings.push(triple);
                });
            }
        }

        allMappings = self.addMappingsRestrictions(allMappings);
        // allMappings add lookups_s and lookups_o for each mapping if there is lookup
        allMappings = self.addLookupsToMappings(allMappings, columnsMap);

        return allMappings;
    };
    self.addLookupsToMappings = function (allMappings, columnsMap) {
        if (Object.keys(DataSourceManager.currentConfig.lookups).length == 0) {
            return allMappings;
        }

        Object.keys(DataSourceManager.currentConfig.lookups).forEach(function (lookup) {
            if (lookup.split("|")[0] == DataSourceManager.currentConfig.currentDataSource.currentTable && columnsMap[lookup.split("|")[0] + "|lookup"]) {
                var lookupObj = DataSourceManager.currentConfig.lookups[lookup];
                var lookupColumn = lookupObj.name.split("|")[1];
                var is_object_lookup = false;
                var is_subject_lookup = false;
                if (lookupObj.targetMapping == "both") {
                    is_object_lookup = true;
                    is_subject_lookup = true;
                }
                if (lookupObj.targetMapping == "object") {
                    is_object_lookup = true;
                }
                if (lookupObj.targetMapping == "subject") {
                    is_subject_lookup = true;
                }
                /* 
                allMappings.push({
                    s:lookupColumn,
                    p:'lookup',
                    o:JSON.stringify(lookupObj)
                });*/
                allMappings.forEach(function (mapping) {
                    if (mapping.s == lookupColumn && is_subject_lookup) {
                        mapping.lookup_s = lookupObj.name;
                    }
                    if (mapping.o == lookupColumn && is_object_lookup) {
                        mapping.lookup_o = lookupObj.name;
                    }
                });
            }
        });
        return allMappings;
    };

    /**
     * Adds restrictions to the mappings if both subject and object are classes and are different from each other.
     * This function checks if the subject and object in a mapping are OWL classes, and if they are, it marks the mapping as a restriction.
     * @function
     * @name addMappingsRestrictions
     * @memberof module:MappingTransform
     * @param {Array} allMappings - The array of mappings to which restrictions will be added.
     * @returns {Array} The modified array of mappings with restrictions added where applicable.
     */
    self.addMappingsRestrictions = function (allMappings) {
        var isClass = function (nodeId) {
            var isClass = false;
            allMappings.forEach(function (mapping) {
                if (mapping.s == nodeId) {
                    if (mapping.p == "rdf:type" && mapping.o == "owl:Class") {
                        isClass = true;
                    }
                }
            });
            return isClass;
        };
        allMappings.forEach(function (mapping) {
            if (!mapping.p.startsWith("http")) return;
            if (isClass(mapping.s) && isClass(mapping.o) && mapping.p != "rdfs:subClassOf" && mapping.p != "rdf:member") {
                if (mapping.s != mapping.o) {
                    mapping.isRestriction = true;
                }
            }
        });

        return allMappings;
    };

    /**
     * Copies the KGcreator mappings from the textarea to the clipboard.
     * It retrieves the current mappings as text from the UI and uses a common utility to copy the content to the clipboard.
     *
     * @function
     * @name copyKGcreatorMappings
     * @memberof module:MappingTransform
     */
    self.copyKGcreatorMappings = function () {
        var text = $("#mappingModeler_infosTA").val();
        $("#mappingModeler_infosTA").trigger("focus");
        common.copyTextToClipboard(text);
    };
    self.getFilteredMappings = function (checkedNodes) {
        var filteredMappings = [];
        var columnsSelection = {};
        var checkedNodeAttrs = [];
        checkedNodes.forEach(function (node) {
            if (node.data && node.data.type == "ColumnMapping") {
                checkedNodeAttrs.push(node.id);
            } else if (node?.parents?.length == 3) {
                // attrs
                checkedNodeAttrs.push(node.id);
                columnsSelection[node.id] = MappingColumnsGraph.visjsGraph.data.nodes.get(node.parent);
            } else if (node.data && node.data.type == "Column") {
                // filter only mapping nodes
                columnsSelection[node.id] = MappingColumnsGraph.visjsGraph.data.nodes.get(node.id);
            } else if (node.data && node.data.type == "VirtualColumn") {
                columnsSelection[node.id] = MappingColumnsGraph.visjsGraph.data.nodes.get(node.id);
            } else if (node.data && node.data.type == "RowIndex") {
                columnsSelection[node.id] = MappingColumnsGraph.visjsGraph.data.nodes.get(node.id);
            } else if (node.data && node.data.type == "URI") {
                columnsSelection[node.id] = MappingColumnsGraph.visjsGraph.data.nodes.get(node.id);
            }
        });

        var mappings = MappingTransform.mappingsToKGcreatorJson(columnsSelection);
        var columnMappings = MappingTransform.mappingsToKGcreatorJson(columnsSelection, { getColumnMappingsOnly: true });
        var uniqueFilteredMappings = {};
        var transforms = {};
        // checkedNodeAttrs work only for technical mappings we need to also add structural column mappings
        mappings.forEach(function (mapping) {
            var mappingS = mapping.s.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "");
            var mappingO = mapping.o.replaceAll("_$", "").replaceAll("_£", "").replaceAll("@", "");
            // columnsMapping
            var mappingInColumnMapping = columnMappings.filter(function (item) {
                return item.s == mapping.s && item.p == mapping.p && item.o == mapping.o;
            });

            if (mappingInColumnMapping.length > 0) {
                checkedNodeAttrs.forEach(function (treeNodeId) {
                    if (treeNodeId == mappingS + "-->" + mapping.p + "-->" + mappingO) {
                        filteredMappings.push(mapping);
                    }
                });
            } else {
                checkedNodeAttrs.forEach(function (treeNodeId) {
                    //not enough we need object is the third
                    //if (treeNodeId.indexOf(mapping.o) > -1) {
                    var treeNodeSplit = treeNodeId.split("|");
                    if (treeNodeSplit.length === 3) {
                        var objectId = treeNodeSplit[2];
                    } else {
                        return;
                    }
                    if (!objectId) {
                        return;
                    }
                    if (objectId == mapping.o) {
                        if (treeNodeId.indexOf("transform") > -1 && mapping.p == "transform") {
                            transforms[mapping.s] = mapping.o;
                        } else if (!uniqueFilteredMappings[mapping.s + "|" + mapping.p + "|" + mapping.o]) {
                            uniqueFilteredMappings[mapping.s + "|" + mapping.p + "|" + mapping.o] = 1;
                            filteredMappings.push(mapping);
                        }
                    }
                });
            }
        });

        // add transforms to the mappings

        // add transform
        var slsMappings = self.getSLSmappingsFromVisjsGraph();
        var transformMappingsMap = {};
        slsMappings.forEach(function (mapping) {
            if (mapping.p == "transform") {
                transformMappingsMap[mapping.s] = mapping;
            }
        });

        filteredMappings.forEach(function (mapping) {
            if (transformMappingsMap[mapping.s]) filteredMappings.push(transformMappingsMap[mapping.s]);
            if (transformMappingsMap[mapping.o]) filteredMappings.push(transformMappingsMap[mapping.o]);
        });

        // selection isn't concerned for column mappings select all
        //filteredMappings=filteredMappings.concat(columnMappings);
        var table = MappingModeler.currentTable.name;

        filteredMappings = { [table]: { tripleModels: filteredMappings, transform: transforms, lookups: {} } };
        // Add checked lookups
        if (Object.keys(DataSourceManager.currentConfig.lookups)) {
            Object.keys(DataSourceManager.currentConfig.lookups).forEach(function (lookup) {
                var checkedLookup = checkedNodes.filter(function (item) {
                    return item?.data?.name == lookup;
                });
                if (checkedLookup.length > 0) {
                    filteredMappings[table].lookups[lookup] = DataSourceManager.currentConfig.lookups[lookup];
                }
            });
        }

        return filteredMappings;
    };
    return self;
})();
export default MappingTransform;
window.MappingTransform = MappingTransform;
