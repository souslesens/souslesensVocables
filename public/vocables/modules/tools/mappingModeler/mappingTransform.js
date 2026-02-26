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
    return self._generateRmlOrR2rmlTurtle("r2rml");
};

self.generateRMLTurtle = function () {
    return self._generateRmlOrR2rmlTurtle("rml");
};

self._generateRmlOrR2rmlTurtle = function (format) {
    // format: "rml" | "r2rml"
    var model = self._buildExportModel(); // canonical ids + TriplesMaps index
    return self._generateRmlEditorStyleTurtle(format, model);
};

// ---------------------------------------------------------------------------
// RML editor-style generator (separate resources)
// ---------------------------------------------------------------------------
self._generateRmlEditorStyleTurtle = function (format, model) {
    var out = "";
    out += self._prefixBlock();

    var base = "http://example.com#";
    var counters = {
        LogicalSource: 0,
        TriplesMap: 0,
        SM: 0,
        PM: 0,
        OM: 0,
        POM: 0,
        Id_SM: 0,
        Id_OM: 0,
        Id_POM: 0,
        Id_TM: 0,
        JC: 0,
    };

    var logicalSources = [];
    var joinConditions = [];
    var predicateMaps = [];
    var objectMaps = [];
    var predicateObjectMaps = [];
    var subjectMaps = [];
    var triplesMaps = [];

    var logicalSourceByKey = {};
    var tmIdByCanonical = {};

    var newIdentifier = function (kind) {
        counters[kind] = (counters[kind] || 0) + 1;
        return self._dctermsIdentifierTriple(counters[kind] - 1);
    };

    var getLogicalSourceId = function (table, dsId) {
        var key = String(table || "") + "|" + String(dsId || "") + "|" + format;
        if (logicalSourceByKey[key]) return logicalSourceByKey[key];

        var lsId = "<" + base + "LogicalSource" + (++counters.LogicalSource) + ">";
        logicalSourceByKey[key] = lsId;

        var lines = [];
        lines.push(lsId + " rml:referenceFormulation " + (self._isCsvDatasource(dsId) ? "ql:CSV" : "ql:SQL2008") + ";");
        if (self._isCsvDatasource(dsId)) {
            // editor style: source = file name only
            lines.push('    rml:source "' + self._escapeTurtleString(table) + '";');
        } else {
            lines.push('    rml:source "' + self._escapeTurtleString(dsId || "") + '";');
            lines.push('    rr:tableName "' + self._escapeTurtleString(table) + '";');
        }
        lines.push("    a rml:LogicalSource.");
        logicalSources.push(lines.join("\n"));
        return lsId;
    };

    var newJoinCondition = function (childData, parentData) {
        var childCol = self._getRealColumnName(childData) || (childData && childData.id ? childData.id : "");
        var parentCol = self._getRealColumnName(parentData) || (parentData && parentData.id ? parentData.id : "");
        var jcId = "<" + base + "JC" + (++counters.JC) + ">";
        var lines = [];
        lines.push(jcId + " a rr:Join;");
        lines.push('    rr:child "' + self._escapeTurtleString(childCol) + '";');
        lines.push('    rr:parent "' + self._escapeTurtleString(parentCol) + '".');
        joinConditions.push(lines.join("\n"));
        return jcId;
    };

    // pre-assign TriplesMap ids
    for (var i = 0; i < model.triplesMaps.length; i++) {
        var tmInfo = model.triplesMaps[i];
        if (format === "r2rml" && self._isCsvDatasource(tmInfo.dsId)) {
            continue;
        }
        var tmId = "<" + base + "TriplesMap" + (++counters.TriplesMap) + ">";
        tmIdByCanonical[tmInfo.subjectCanonicalId] = tmId;
        tmInfo._editorTmId = tmId;
    }

    // build TriplesMaps
    for (i = 0; i < model.triplesMaps.length; i++) {
        tmInfo = model.triplesMaps[i];
        if (format === "r2rml" && self._isCsvDatasource(tmInfo.dsId)) {
            continue;
        }

        var tmId2 = tmInfo._editorTmId;
        var lsId = getLogicalSourceId(tmInfo.table, tmInfo.dsId);

        var subjNode = model.nodesById[tmInfo.subjectNodeId];
        if (!subjNode || !subjNode.data) continue;

        var sData = subjNode.data;

        var businessClass = self._resolveBusinessClassForSubject(tmInfo, model, sData);
        var smId = "<" + base + "SM" + (++counters.SM) + ">";
        subjectMaps.push(self._buildEditorSubjectMap(smId, sData, newIdentifier("Id_SM"), businessClass));

        var poSpecs = [];

        // rdfs:label
        if (sData.rdfsLabel) {
            var colIds = model.tableColumnIds[tmInfo.table] ? model.tableColumnIds[tmInfo.table] : {};
            if (colIds[sData.rdfsLabel]) {
                poSpecs.push({ predicate: "rdfs:label", spec: { kind: "literalColumn", value: sData.rdfsLabel, datatype: "xsd:string", columnData: { id: sData.rdfsLabel, dataTable: tmInfo.table }, format: format } });
            } else {
                poSpecs.push({ predicate: "rdfs:label", spec: { kind: "literalConstant", value: sData.rdfsLabel, datatype: "xsd:string" } });
            }
        }

        // One business rdf:type only (exclude owl:NamedIndividual)
        if (businessClass) {
            poSpecs.push({ predicate: "rdf:type", spec: { kind: "iriConstant", value: businessClass } });
        }

        // transform
        if (sData.transform) {
            poSpecs.push({ predicate: ":sls_transform", spec: { kind: "literalConstant", value: sData.transform, datatype: "xsd:string" } });
        }

        // otherPredicates
        if (sData.otherPredicates && Array.isArray(sData.otherPredicates)) {
            var tableCols = model.tableColumnIds[tmInfo.table] ? model.tableColumnIds[tmInfo.table] : {};
            for (var opi = 0; opi < sData.otherPredicates.length; opi++) {
                var op = sData.otherPredicates[opi];
                if (!op || !op.property) continue;
                var pred = op.property;
                var obj = op.object;
                var dt = null;
                if (op.range) {
                    if (String(op.range).indexOf("Resource") > -1) dt = "xsd:string";
                    else dt = op.range;
                }
                if (obj && tableCols[obj]) {
                    poSpecs.push({ predicate: pred, spec: { kind: "literalColumn", value: obj, datatype: dt, columnData: { id: obj, dataTable: tmInfo.table }, format: format } });
                } else {
                    var iri = self._turtleIriOrCurie(obj);
                    if (iri) {
                        poSpecs.push({ predicate: pred, spec: { kind: "iriConstant", value: obj } });
                    } else {
                        poSpecs.push({ predicate: pred, spec: { kind: "literalConstant", value: obj, datatype: dt } });
                    }
                }
            }
        }

        // outgoing edges based on canonical(from)
        for (var ni = 0; ni < model.nodes.length; ni++) {
            var n = model.nodes[ni];
            if (!n || !n.id) continue;
            var canonFrom = model.getCanonicalNodeId(n.id);
            if (canonFrom !== tmInfo.subjectCanonicalId) continue;
            var outs = model.outgoing[n.id] ? model.outgoing[n.id] : [];
            for (var ei = 0; ei < outs.length; ei++) {
                var e = outs[ei];
                if (!e || !e.to) continue;
                if (e.data && e.data.type === "tableToColumn") continue;

                var pred2 = null;
                if (e.data && e.data.id) pred2 = e.data.id;
                if (!pred2 && e.data && e.data.type) pred2 = e.data.type;
                if (!pred2) continue;
                if (self._isTypePredicate(pred2)) continue;

                var toNode = model.nodesById[e.to];
                if (!toNode || !toNode.data) continue;

                var spec2 = self._edgeToObjectSpec(format, tmInfo.table, n, toNode, pred2, model, tmIdByCanonical);
                if (spec2) poSpecs.push({ predicate: pred2, spec: spec2 });
            }
        }

        var pomIds = [];
        for (var psi = 0; psi < poSpecs.length; psi++) {
            var po = poSpecs[psi];
            if (po.spec && po.spec.kind === "parentTriplesMap" && po.spec.childData && po.spec.parentData) {
                po.spec.joinConditionId = newJoinCondition(po.spec.childData, po.spec.parentData);
            }

            var pmId = "<" + base + "PM" + (++counters.PM) + ">";
            predicateMaps.push(self._buildEditorPredicateMap(pmId, po.predicate));

            var omId = "<" + base + "OM" + (++counters.OM) + ">";
            objectMaps.push(self._buildEditorObjectMap(omId, po.spec, newIdentifier("Id_OM")));

            var pomId = "<" + base + "POM" + (++counters.POM) + ">";
            predicateObjectMaps.push(self._buildEditorPredicateObjectMap(pomId, pmId, omId, newIdentifier("Id_POM")));
            pomIds.push(pomId);
        }

        triplesMaps.push(self._buildEditorTriplesMap(tmId2, lsId, smId, pomIds, newIdentifier("Id_TM")));
    }

    // URI constant nodes (anchored by table)
    var uriTriplesMaps = self._buildEditorUriConstantTriplesMaps(format, model, tmIdByCanonical, base, counters, newIdentifier, getLogicalSourceId, newJoinCondition);
    logicalSources = logicalSources.concat(uriTriplesMaps.logicalSources);
    subjectMaps = subjectMaps.concat(uriTriplesMaps.subjectMaps);
    predicateMaps = predicateMaps.concat(uriTriplesMaps.predicateMaps);
    objectMaps = objectMaps.concat(uriTriplesMaps.objectMaps);
    predicateObjectMaps = predicateObjectMaps.concat(uriTriplesMaps.predicateObjectMaps);
    triplesMaps = triplesMaps.concat(uriTriplesMaps.triplesMaps);

    out += joinConditions.join("\n") + "\n";
    out += logicalSources.join("\n") + "\n";
    out += objectMaps.join("\n") + "\n";
    out += predicateMaps.join("\n") + "\n";
    out += predicateObjectMaps.join("\n") + "\n";
    out += subjectMaps.join("\n") + "\n";
    out += triplesMaps.join("\n") + "\n";

    return out;
};

// ---------------------------------------------------------------------------
// MODEL: nodes/edges + canonicalisation + index TM
// ---------------------------------------------------------------------------
self._getAllVisNodes = function () {
    if (!window.MappingColumnsGraph) return [];
    if (!MappingColumnsGraph.visjsGraph) return [];
    if (!MappingColumnsGraph.visjsGraph.data) return [];
    if (!MappingColumnsGraph.visjsGraph.data.nodes) return [];
    return MappingColumnsGraph.visjsGraph.data.nodes.get();
};

self._getAllVisEdges = function () {
    if (!window.MappingColumnsGraph) return [];
    if (!MappingColumnsGraph.visjsGraph) return [];
    if (!MappingColumnsGraph.visjsGraph.data) return [];
    if (!MappingColumnsGraph.visjsGraph.data.edges) return [];
    return MappingColumnsGraph.visjsGraph.data.edges.get();
};

self._buildExportModel = function () {
    var nodes = self._getAllVisNodes();
    var edges = self._getAllVisEdges();

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

    // nodes that are actually mapped = have at least one non-tableToColumn edge
    var nodeHasEdge = {};
    for (i = 0; i < edges.length; i++) {
        var e2 = edges[i];
        if (!e2) continue;
        if (e2.data && e2.data.type === "tableToColumn") continue;
        if (e2.from) nodeHasEdge[e2.from] = true;
        if (e2.to) nodeHasEdge[e2.to] = true;
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

    var canonicalHasEdge = {};
    for (var nid in nodeHasEdge) {
        if (!nodeHasEdge.hasOwnProperty(nid)) continue;
        var canonNid = getCanonicalNodeId(nid);
        if (canonNid) canonicalHasEdge[canonNid] = true;
    }

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

            // 4) nom rÃ©el de colonne (si diffÃ©rent)
            if (d.columnName) tableColumnIds[table][String(d.columnName)] = 1;
        }
    }

    // add actual datasource columns (CSV headers / SQL columns)
    for (i = 0; i < tables.length; i++) {
        var tname = tables[i];
        var cols = self._getDatasourceTableColumns(tname);
        if (Array.isArray(cols)) {
            for (var ci = 0; ci < cols.length; ci++) {
                tableColumnIds[tname][String(cols[ci])] = 1;
            }
        }
    }

    // entities TriplesMaps: main columns + blankNode/randomIdentifier + URI constants
    var triplesMaps = [];
    var tmByCanonicalNodeId = {}; // canonNodeId -> :TM_xxx
    var tmInfoByTmId = {}; // tmId -> info
    var entityCanonicalIds = {}; // canon ids that are "entity" subjects

    var isEntitySubjectNode = function (nodeData) {
        if (!nodeData) return false;
        if (nodeData.type === "URI") return true;
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
        if (!canonicalHasEdge[canonId]) continue;
        if (entityCanonicalIds[canonId]) continue;

        var canonNode = nodesById[canonId];
        if (!canonNode || !canonNode.data) continue;

        entityCanonicalIds[canonId] = 1;

        var tableName = canonNode.data.dataTable;
        var tmId = self._makeTriplesMapId("TM", tableName, canonId);

        tmByCanonicalNodeId[canonId] = tmId;

        var tmInfo = {
            tmId: tmId,
            table: tableName,
            dsId: self._getTableDatasourceId(tableName),
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
self._writeTriplesMapProper = function (format, tmInfo, model) {
    var nodesById = model.nodesById;
    var nodes = model.nodes;
    var outgoing = model.outgoing;

    var table = tmInfo.table;
    var dsId = tmInfo.dsId;

    // R2RML = SQL only
    if (format === "r2rml" && self._isCsvDatasource(dsId)) {
        return "";
    }

    // logical source block
    var logical = "";
    if (format === "r2rml") logical = self._logicalBlockR2RML(table);
    else logical = self._logicalBlockRML(table, dsId);

    // subject node data
    var subjNode = nodesById[tmInfo.subjectNodeId];
    if (!subjNode || !subjNode.data) return "";

    var sData = subjNode.data;

    // infer rr:class (business class)
    // 1) prefer explicit rdfType on the subject node (if it is a class IRI/CURIE, not owl:NamedIndividual)
    // 2) else, look for an outgoing rdf:type edge from the subject node to a Class node
    var businessClass = null;
    if (sData.rdfType && sData.rdfType !== "owl:Class" && sData.rdfType !== "owl:NamedIndividual") {
        businessClass = sData.rdfType;
    }

    if (!businessClass) {
        var outs0 = outgoing[tmInfo.subjectNodeId] ? outgoing[tmInfo.subjectNodeId] : [];
        for (var bi = 0; bi < outs0.length; bi++) {
            var be = outs0[bi];
            if (!be || !be.to) continue;

            var bpred = null;
            if (be.data && be.data.id) bpred = be.data.id;
            if (!bpred && be.data && be.data.type) bpred = be.data.type;
            if (!bpred) continue;

            if (bpred !== "rdf:type" && bpred !== "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") continue;

            var bto = nodesById[be.to];
            if (bto && bto.data && bto.data.type === "Class") {
                businessClass = bto.id;
                break;
            }
        }
    }

    // build predicate-object maps from:
    // 1) node properties: rdfsLabel, otherPredicates, transform (optional)
    // 2) outgoing edges from any node whose canonical(from) == subjectCanonicalId
    var po = "";

    // (A) rdfs:label patch
    if (sData.rdfsLabel) {
        // if rdfsLabel equals a column name => column mapping
        var colIds = model.tableColumnIds[table] ? model.tableColumnIds[table] : {};
        if (colIds[sData.rdfsLabel]) {
            po += self._writePredicateObjectMapProper(format, "rdfs:label", {
                kind: "literalColumn",
                value: sData.rdfsLabel,
                datatype: "xsd:string",
                columnData: { id: sData.rdfsLabel, dataTable: table },
            });
        } else {
            po += self._writePredicateObjectMapProper(format, "rdfs:label", {
                kind: "literalConstant",
                value: sData.rdfsLabel,
                datatype: "xsd:string",
            });
        }
    }

    // (B) transform (si tu veux garder une trace)
    if (sData.transform) {
        po += self._writePredicateObjectMapProper(format, ":sls_transform", {
            kind: "literalConstant",
            value: sData.transform,
            datatype: "xsd:string",
        });
    }

    // (C) otherPredicates (IMPORTANT: object can be a column!)
    if (sData.otherPredicates && Array.isArray(sData.otherPredicates)) {
        var tableCols = model.tableColumnIds[table] ? model.tableColumnIds[table] : {};
        for (var opi = 0; opi < sData.otherPredicates.length; opi++) {
            var op = sData.otherPredicates[opi];
            if (!op || !op.property) continue;

            var pred = op.property;
            var obj = op.object;
            var dt = null;

            if (op.range) {
                // si range contient "Resource" on le traite comme string (ton code historique)
                if (String(op.range).indexOf("Resource") > -1) dt = "xsd:string";
                else dt = op.range;
            }

            // column ?
            if (obj && tableCols[obj]) {
                po += self._writePredicateObjectMapProper(format, pred, { kind: "literalColumn", value: obj, datatype: dt, columnData: { id: obj, dataTable: table } });
            } else {
                // iri ?
                var iri = self._turtleIriOrCurie(obj);
                if (iri) {
                    po += self._writePredicateObjectMapProper(format, pred, { kind: "iriConstant", value: obj });
                } else {
                    po += self._writePredicateObjectMapProper(format, pred, { kind: "literalConstant", value: obj, datatype: dt });
                }
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

            // rdf:type edges are represented by rr:class in the SubjectMap.
            // Do not emit them as predicateObjectMap.
            if (pred2 === "rdf:type" || pred2 === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                continue;
            }

            var toNode = nodesById[e.to];
            if (!toNode || !toNode.data) continue;

            var toData = toNode.data;

            // if target belongs to another table, skip unless you want cross-table
            // (we allow it if it has dataTable and datasource)
            if (toData.dataTable && toData.dataTable !== table) {
                // ok: join still possible
            }

            po += self._edgeToObjectMap(format, table, n, toNode, pred2, model);
        }
    }

    if (!po) {
        // still output TM with subject, useful for ontology alignment
    }

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

    ttl += self._writeSubjectMapProper(format, sData, businessClass, model.nodesById);

    if (po) ttl += po;

    ttl += "  .\n";
    return ttl;
};

// Convert an edge target into objectMap (proper join if possible)
self._edgeToObjectMap = function (format, currentTable, fromNode, toNode, predicate, model) {
    var nodesById = model.nodesById;

    var fromData = fromNode && fromNode.data ? fromNode.data : null;
    var toData = toNode && toNode.data ? toNode.data : null;
    if (!toData) return "";

    // canonical target
    var canonToId = model.getCanonicalNodeId(toNode.id);
    var canonToNode = nodesById[canonToId];
    if (!canonToNode || !canonToNode.data) canonToNode = toNode;

    var canonData = canonToNode.data;

    // detect if target is entity-like (so we can join)
    var isEntity =
        (canonData.type === "URI") ||
        (canonData.isMainColumn === true) ||
        (canonData.uriType === "blankNode" || canonData.uriType === "randomIdentifier");

    // If target is an entity and there is a TriplesMap for it, do parentTriplesMap+joinCondition
    // child = column holding FK (toData.id)
    // parent = PK column (canonData.id)
    if (isEntity) {
        var parentTm = model.tmByCanonicalNodeId[canonToId];
        var isColumnLike = function (d) {
            return d && (d.type === "Column" || d.type === "VirtualColumn" || d.type === "RowIndex");
        };
        var resolveColumnData = function (d) {
            if (isColumnLike(d)) return d;
            if (d && d.definedInColumn && nodesById[d.definedInColumn] && nodesById[d.definedInColumn].data) {
                var ref = nodesById[d.definedInColumn].data;
                if (isColumnLike(ref)) return ref;
            }
            return null;
        };

        // IMPORTANT:
        // child = the FK column in the current table (edge target column), NOT the subject/main column.
        // Example: Book(book_id) --prescribes--> books.author_id (FK) which joins to authors.author_id (PK)
        var childData = resolveColumnData(toData);
        var parentData = resolveColumnData(canonData);

        if (parentTm && childData && parentData) {
            return self._writePredicateObjectMapProper(format, predicate, {
                kind: "parentTriplesMap",
                parentTriplesMap: parentTm,
                childData: childData,
                parentData: parentData,
            });
        }

        // fallback: template (still IRI/BlankNode)
        var tmpl = self._subjectTemplateForColumn(canonData);
        if (canonData.uriType === "blankNode") {
            return self._writePredicateObjectMapProper(format, predicate, { kind: "blankNodeTemplate", value: tmpl });
        }
        if (canonData.type === "URI") {
            return self._writePredicateObjectMapProper(format, predicate, { kind: "iriConstant", value: canonData.id });
        }
        return self._writePredicateObjectMapProper(format, predicate, { kind: "iriTemplate", value: tmpl });
    }

    // literal columns
    if (toData.type === "Column" || toData.type === "VirtualColumn" || toData.type === "RowIndex") {
        return self._writePredicateObjectMapProper(format, predicate, { kind: "literalColumn", value: toData.id, datatype: null, columnData: toData });
    }

    // fallback constant literal
    return self._writePredicateObjectMapProper(format, predicate, { kind: "literalConstant", value: toData.id, datatype: null });
};

// ---------------------------------------------------------------------------
// URI constant TriplesMaps (optional, but keeps your previous behavior)
// ---------------------------------------------------------------------------
self._writeUriConstantTriplesMaps = function (format, model) {
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
            var dsId = self._getTableDatasourceId(t);

            if (format === "r2rml" && self._isCsvDatasource(dsId)) {
                continue;
            }

            var logical = (format === "r2rml") ? self._logicalBlockR2RML(t) : self._logicalBlockRML(t, dsId);

            var tmId = self._makeTriplesMapId("TM_URI", t, uriNode.id);

            ttl += tmId + " a rr:TriplesMap ;\n";
            if (format === "rml") {
                ttl += "  rml:logicalSource [\n" + logical + "\n  ] ;\n";
            } else {
                ttl += "  rr:logicalTable [\n" + logical + "\n  ] ;\n";
            }

            ttl += self._writeSubjectMapProper(format, uriNode.data, null, nodesById);

            // edges
            for (j = 0; j < perTable[t].length; j++) {
                var x = perTable[t][j];
                var pred = null;
                if (x.edge.data && x.edge.data.id) pred = x.edge.data.id;
                if (!pred && x.edge.data && x.edge.data.type) pred = x.edge.data.type;
                if (!pred) continue;

                // reuse edge handling
                ttl += self._edgeToObjectMap(format, t, uriNode, x.toNode, pred, model);
            }

            ttl += "  .\n\n";
        }
    }

    return ttl;
};

// ---------------------------------------------------------------------------
// Writers: subjectMap + predicateObjectMap (proper)
// ---------------------------------------------------------------------------
self._writeSubjectMapProper = function (_format, subjectData, businessClass, _nodesById) {
    var gUri = self._getGraphUri();
    var ttl = "";
    ttl += "  rr:subjectMap [\n";

    if (gUri) {
        ttl += "    rr:graph <" + self._escapeTurtleString(gUri) + "> ;\n";
    }

    if (subjectData && subjectData.type === "URI") {
        ttl += "    rr:constant <" + self._escapeTurtleString(subjectData.id) + "> ;\n";
        ttl += "    rr:termType rr:IRI";
    } else {
        var template = self._subjectTemplateForColumn(subjectData);
        ttl += '    rr:template "' + self._escapeTurtleString(template) + '" ;\n';
        if (subjectData && subjectData.uriType === "blankNode") {
            ttl += "    rr:termType rr:BlankNode";
        } else {
            ttl += "    rr:termType rr:IRI";
        }
    }

    if (businessClass) {
        ttl += " ;\n    rr:class " + self._turtleObject(businessClass);
    }

    ttl += "\n  ] ;\n";
    return ttl;
};

self._writePredicateObjectMapProper = function (format, predicate, spec) {
    var ttl = "";
    ttl += "  rr:predicateObjectMap [\n";
    ttl += "    rr:predicate " + self._turtleObject(predicate) + " ;\n";
    ttl += "    rr:objectMap [\n";

    if (spec.kind === "parentTriplesMap") {
        var childCol = self._getRealColumnName(spec.childData || { id: spec.child });
        var parentCol = self._getRealColumnName(spec.parentData || { id: spec.parent });

        ttl += "      rr:parentTriplesMap " + spec.parentTriplesMap + " ;\n";
        ttl += "      rr:joinCondition [\n";
        ttl += '        rr:child "' + self._escapeTurtleString(childCol) + '" ;\n';
        ttl += '        rr:parent "' + self._escapeTurtleString(parentCol) + '"\n';
        ttl += "      ]\n";

    } else if (spec.kind === "literalColumn") {
        var colData = spec.columnData || (typeof spec.value === "object" ? spec.value : { id: spec.value });
        var col = self._getRealColumnName(colData) || spec.value;

        if (format === "rml") {
            ttl += '      rml:reference "' + self._escapeTurtleString(col) + '"';
        } else {
            ttl += '      rr:column "' + self._escapeTurtleString(col) + '"';
        }
        if (spec.datatype) {
            ttl += " ;\n      rr:datatype " + self._turtleObject(spec.datatype);
        }
        ttl += "\n";

    } else if (spec.kind === "literalConstant") {
        ttl += "      rr:constant " + self._turtleObject(spec.value);
        if (spec.datatype) {
            ttl += " ;\n      rr:datatype " + self._turtleObject(spec.datatype);
        }
        ttl += "\n";

    } else if (spec.kind === "iriTemplate") {
        ttl += '      rr:template "' + self._escapeTurtleString(spec.value) + '" ;\n';
        ttl += "      rr:termType rr:IRI\n";

    } else if (spec.kind === "iriConstant") {
        ttl += "      rr:constant " + self._turtleObject(spec.value) + " ;\n";
        ttl += "      rr:termType rr:IRI\n";

    } else if (spec.kind === "blankNodeTemplate") {
        ttl += '      rr:template "' + self._escapeTurtleString(spec.value) + '" ;\n';
        ttl += "      rr:termType rr:BlankNode\n";

    } else {
        ttl += "      rr:constant " + self._turtleObject(spec.value) + "\n";
    }

    ttl += "    ]\n";
    ttl += "  ] ;\n";
    return ttl;
};

// ---------------------------------------------------------------------------
// Editor-style helpers
// ---------------------------------------------------------------------------
self._dctermsIdentifierTriple = function (n) {
    return '<http://purl.org/dc/terms/identifier> "' + String(n) + '"^^<http://www.w3.org/2001/XMLSchema#integer>;';
};

self._isTypePredicate = function (p) {
    if (!p) return false;
    var s = String(p).trim();
    if (s === "a") return true;
    if (s === "rdf:type") return true;
    if (s === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") return true;
    return false;
};

self._isNamedIndividualIri = function (v) {
    if (!v) return false;
    var iri = self._expandCurieToIriString(v);
    return iri === "http://www.w3.org/2002/07/owl#NamedIndividual";
};

self._resolveBusinessClassForSubject = function (tmInfo, model, sData) {
    if (sData && sData.rdfType && sData.rdfType !== "owl:Class" && !self._isNamedIndividualIri(sData.rdfType)) {
        return sData.rdfType;
    }

    for (var ni = 0; ni < model.nodes.length; ni++) {
        var n = model.nodes[ni];
        if (!n || !n.id) continue;
        var canonFrom = model.getCanonicalNodeId(n.id);
        if (canonFrom !== tmInfo.subjectCanonicalId) continue;
        var outs = model.outgoing[n.id] ? model.outgoing[n.id] : [];
        for (var ei = 0; ei < outs.length; ei++) {
            var e = outs[ei];
            if (!e || !e.to) continue;
            if (e.data && e.data.type === "tableToColumn") continue;

            var pred = null;
            if (e.data && e.data.id) pred = e.data.id;
            if (!pred && e.data && e.data.type) pred = e.data.type;
            if (!self._isTypePredicate(pred)) continue;

            var toNode = model.nodesById[e.to];
            if (!toNode || !toNode.data) continue;

            // In mapping graphs, business classes are often modeled as `Class` nodes
            // (not `URI` nodes). We accept both and resolve to their IRI id.
            var toType = toNode.data.type ? String(toNode.data.type) : "";
            if (toType !== "URI" && toType !== "Class") continue;

            var classIri = toNode.data.id || toNode.id || null;
            if (!classIri) continue;
            if (self._isNamedIndividualIri(classIri)) continue;
            return classIri;
        }
    }
    return null;
};

self._expandCurieToIriString = function (v) {
    if (!v) return "";
    var s = String(v).trim();
    if (s.indexOf(":") === 0) {
        return "urn:souslesens:mapping:" + s.substring(1);
    }
    if (s.indexOf("<") === 0 && s.lastIndexOf(">") === s.length - 1) {
        s = s.substring(1, s.length - 1);
    }
    if (self._isHttpIri(s)) return s;
    var idx = s.indexOf(":");
    if (idx > 0) {
        var prefix = s.substring(0, idx);
        var local = s.substring(idx + 1);
        var map = self._collectPrefixMap();
        map.rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
        map.rdfs = "http://www.w3.org/2000/01/rdf-schema#";
        map.owl = "http://www.w3.org/2002/07/owl#";
        map.xsd = "http://www.w3.org/2001/XMLSchema#";
        map.rr = "http://www.w3.org/ns/r2rml#";
        map.rml = "http://semweb.mmlab.be/ns/rml#";
        map.ql = "http://semweb.mmlab.be/ns/ql#";
        map.csvw = "http://www.w3.org/ns/csvw#";
        if (map[prefix]) return map[prefix] + local;
    }
    return s;
};

self._buildEditorPredicateMap = function (pmId, predicate) {
    var predIri = self._expandCurieToIriString(predicate);
    var rdfTypeIri = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    var isRdfType = false;
    if (predicate === "rdf:type") isRdfType = true;
    if (predIri === rdfTypeIri) isRdfType = true;

    var lines = [];
    lines.push(pmId + " a rr:PredicateMap;");
    if (isRdfType) {
        lines.push("    rr:constant rdf:type.");
    } else {
        var asAbsoluteIri = false;
        if (self._isHttpIri(predIri)) asAbsoluteIri = true;
        if (!asAbsoluteIri && /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(predIri)) asAbsoluteIri = true;
        if (asAbsoluteIri) {
            lines.push("    rr:constant <" + self._escapeTurtleString(predIri) + ">.");
        } else {
            lines.push('    rr:template "' + self._escapeTurtleString(predIri) + '".');
        }
    }
    return lines.join("\n");
};

self._buildEditorObjectMap = function (omId, spec, idTriple) {
    var lines = [];
    lines.push(omId + " " + idTriple);
    if (spec.kind === "parentTriplesMap") {
        lines.push("    a rr:RefObjectMap;");
    } else {
        lines.push("    a rr:ObjectMap;");
    }

    if (spec.kind === "parentTriplesMap") {
        lines.push("    rr:parentTriplesMap " + spec.parentTriplesMap + ";");
        if (spec.joinConditionId) {
            lines.push("    rr:joinCondition " + spec.joinConditionId + ";");
        } else if (spec.childData && spec.parentData) {
            var childCol = self._getRealColumnName(spec.childData);
            var parentCol = self._getRealColumnName(spec.parentData);
            lines.push("    rr:joinCondition [");
            lines.push('        rr:child "' + self._escapeTurtleString(childCol) + '" ;');
            lines.push('        rr:parent "' + self._escapeTurtleString(parentCol) + '"');
            lines.push("    ];");
        }
    } else if (spec.kind === "literalColumn") {
        var col = self._getRealColumnName(spec.columnData || { id: spec.value }) || spec.value;
        if (spec.format === "r2rml") lines.push('    rr:column "' + self._escapeTurtleString(col) + '";');
        else lines.push('    rml:reference "' + self._escapeTurtleString(col) + '";');
        if (spec.datatype) {
            var dtIri = self._expandCurieToIriString(spec.datatype);
            lines.push("    rr:datatype <" + self._escapeTurtleString(dtIri) + ">;");
        }
    } else if (spec.kind === "literalConstant") {
        lines.push("    rr:constant " + self._turtleObject(spec.value) + ";");
        if (spec.datatype) {
            var dtIri2 = self._expandCurieToIriString(spec.datatype);
            lines.push("    rr:datatype <" + self._escapeTurtleString(dtIri2) + ">;");
        }
    } else if (spec.kind === "iriTemplate") {
        lines.push('    rr:template "' + self._escapeTurtleString(spec.value) + '";');
        lines.push("    rr:termType rr:IRI;");
    } else if (spec.kind === "iriConstant") {
        var iri = self._expandCurieToIriString(spec.value);
        lines.push("    rr:constant <" + self._escapeTurtleString(iri) + ">;");
        lines.push("    rr:termType rr:IRI;");
    } else if (spec.kind === "blankNodeTemplate") {
        lines.push('    rr:template "' + self._escapeTurtleString(spec.value) + '";');
        lines.push("    rr:termType rr:BlankNode;");
    } else {
        lines.push("    rr:constant " + self._turtleObject(spec.value) + ";");
    }

    // finalize last line with "."
    if (lines.length > 0) {
        var last = lines[lines.length - 1];
        if (last.lastIndexOf(";") === last.length - 1) {
            lines[lines.length - 1] = last.substring(0, last.length - 1) + ".";
        } else if (last.lastIndexOf(".") !== last.length - 1) {
            lines[lines.length - 1] = last + ".";
        }
    }
    return lines.join("\n");
};

self._buildEditorPredicateObjectMap = function (pomId, pmId, omId, idTriple) {
    var lines = [];
    lines.push(pomId + " " + idTriple);
    lines.push("    a rr:PredicateObjectMap;");
    lines.push("    rr:objectMap " + omId + ";");
    lines.push("    rr:predicateMap " + pmId + ".");
    return lines.join("\n");
};

self._buildEditorSubjectMap = function (smId, subjectData, idTriple, businessClassIri) {
    var lines = [];
    lines.push(smId + " " + idTriple);
    lines.push("    a rr:SubjectMap;");
    if (subjectData && subjectData.type === "URI") {
        lines.push("    rr:constant <" + self._escapeTurtleString(subjectData.id) + ">;");
        lines.push("    rr:termType rr:IRI.");
        return lines.join("\n");
    }
    var template = self._subjectTemplateForColumn(subjectData, businessClassIri);
    lines.push('    rr:template "' + self._escapeTurtleString(template) + '";');
    if (subjectData && subjectData.uriType === "blankNode") {
        lines.push("    rr:termType rr:BlankNode.");
    } else {
        lines.push("    rr:termType rr:IRI.");
    }
    return lines.join("\n");
};

self._buildEditorTriplesMap = function (tmId, lsId, smId, pomIds, idTriple) {
    var lines = [];
    lines.push(tmId + " " + idTriple);
    lines.push("    rml:logicalSource " + lsId + ";");
    lines.push("    a rr:TriplesMap;");
    if (pomIds && pomIds.length > 0) {
        lines.push("    rr:predicateObjectMap " + pomIds.join(", ") + ";");
    }
    lines.push("    rr:subjectMap " + smId + ".");
    return lines.join("\n");
};

self._edgeToObjectSpec = function (format, currentTable, fromNode, toNode, _predicate, model, tmIdByCanonical) {
    var nodesById = model.nodesById;
    var fromData = fromNode && fromNode.data ? fromNode.data : null;
    var toData = toNode && toNode.data ? toNode.data : null;
    if (!toData) return null;

    var canonToId = model.getCanonicalNodeId(toNode.id);
    var canonToNode = nodesById[canonToId];
    if (!canonToNode || !canonToNode.data) canonToNode = toNode;
    var canonData = canonToNode.data;

    var isEntity =
        (canonData.type === "URI") ||
        (canonData.isMainColumn === true) ||
        (canonData.uriType === "blankNode" || canonData.uriType === "randomIdentifier");

    var isColumnLike = function (d) {
        return d && (d.type === "Column" || d.type === "VirtualColumn" || d.type === "RowIndex");
    };
    var resolveColumnData = function (d) {
        if (isColumnLike(d)) return d;
        if (d && d.definedInColumn && nodesById[d.definedInColumn] && nodesById[d.definedInColumn].data) {
            var ref = nodesById[d.definedInColumn].data;
            if (isColumnLike(ref)) return ref;
        }
        return null;
    };

    if (isEntity) {
        var parentTm = tmIdByCanonical[canonToId];
        // child = FK column in current table (edge target if it's a column), fallback to subject column
        var childData = resolveColumnData(toData) || resolveColumnData(fromData);
        var parentData = resolveColumnData(canonData);
        if (parentTm && childData && parentData) {
            return {
                kind: "parentTriplesMap",
                parentTriplesMap: parentTm,
                childData: childData,
                parentData: parentData,
            };
        }

        var tmpl = self._subjectTemplateForColumn(canonData);
        if (canonData.uriType === "blankNode") {
            return { kind: "blankNodeTemplate", value: tmpl };
        }
        if (canonData.type === "URI") {
            return { kind: "iriConstant", value: canonData.id };
        }
        return { kind: "iriTemplate", value: tmpl };
    }

    if (toData.type === "Column" || toData.type === "VirtualColumn" || toData.type === "RowIndex") {
        return { kind: "literalColumn", value: toData.id, datatype: null, columnData: toData, format: format };
    }

    var iri = self._turtleIriOrCurie(toData.id);
    if (iri) {
        return { kind: "iriConstant", value: toData.id };
    }
    return { kind: "literalConstant", value: toData.id, datatype: null };
};

self._buildEditorUriConstantTriplesMaps = function (format, model, tmIdByCanonical, base, counters, newIdentifier, getLogicalSourceId, newJoinCondition) {
    var logicalSources = [];
    var subjectMaps = [];
    var predicateMaps = [];
    var objectMaps = [];
    var predicateObjectMaps = [];
    var triplesMaps = [];

    var nodes = model.nodes;
    var nodesById = model.nodesById;

    var edgesByFrom = {};
    for (var i = 0; i < model.edges.length; i++) {
        var e = model.edges[i];
        if (!e || !e.from) continue;
        if (!edgesByFrom[e.from]) edgesByFrom[e.from] = [];
        edgesByFrom[e.from].push(e);
    }

    for (i = 0; i < nodes.length; i++) {
        var uriNode = nodes[i];
        if (!uriNode || !uriNode.data) continue;
        if (uriNode.data.type !== "URI") continue;

        var outs = edgesByFrom[uriNode.id] ? edgesByFrom[uriNode.id] : [];
        if (!outs || outs.length === 0) continue;

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
            var dsId = self._getTableDatasourceId(t);
            if (format === "r2rml" && self._isCsvDatasource(dsId)) {
                continue;
            }

            var tmId = "<" + base + "TriplesMap" + (++counters.TriplesMap) + ">";
            var lsId = getLogicalSourceId(t, dsId);

            var smId = "<" + base + "SM" + (++counters.SM) + ">";
            subjectMaps.push(self._buildEditorSubjectMap(smId, uriNode.data, newIdentifier("Id_SM")));

            var pomIds = [];
            for (j = 0; j < perTable[t].length; j++) {
                var x = perTable[t][j];
                var pred = null;
                if (x.edge.data && x.edge.data.id) pred = x.edge.data.id;
                if (!pred && x.edge.data && x.edge.data.type) pred = x.edge.data.type;
                if (!pred) continue;

                var spec = self._edgeToObjectSpec(format, t, uriNode, x.toNode, pred, model, tmIdByCanonical);
                if (!spec) continue;

                var pmId = "<" + base + "PM" + (++counters.PM) + ">";
                predicateMaps.push(self._buildEditorPredicateMap(pmId, pred));

                if (spec && spec.kind === "parentTriplesMap" && spec.childData && spec.parentData && newJoinCondition) {
                    spec.joinConditionId = newJoinCondition(spec.childData, spec.parentData);
                }

                var omId = "<" + base + "OM" + (++counters.OM) + ">";
                objectMaps.push(self._buildEditorObjectMap(omId, spec, newIdentifier("Id_OM")));

                var pomId = "<" + base + "POM" + (++counters.POM) + ">";
                predicateObjectMaps.push(self._buildEditorPredicateObjectMap(pomId, pmId, omId, newIdentifier("Id_POM")));
                pomIds.push(pomId);
            }

            triplesMaps.push(self._buildEditorTriplesMap(tmId, lsId, smId, pomIds, newIdentifier("Id_TM")));
        }
    }

    return {
        logicalSources: logicalSources,
        subjectMaps: subjectMaps,
        predicateMaps: predicateMaps,
        objectMaps: objectMaps,
        predicateObjectMaps: predicateObjectMaps,
        triplesMaps: triplesMaps,
    };
};

// ---------------------------------------------------------------------------
// Logical sources
// ---------------------------------------------------------------------------
self._logicalBlockR2RML = function (table) {
    return '    rr:tableName "' + self._escapeTurtleString(table) + '"';
};

self._logicalBlockRML = function (table, dsId) {
    // CSV
    if (self._isCsvDatasource(dsId)) {
        var csvPath = "data/CSV/" + (MappingModeler && MappingModeler.currentSLSsource ? MappingModeler.currentSLSsource : "") + "/" + table;
        if (csvPath.indexOf("data/data/") === 0) {
            csvPath = csvPath.replace("data/data/", "data/");
        }
        var s = "";
        s += '    rml:source "' + self._escapeTurtleString(csvPath) + '" ;\n';
        s += "    rml:referenceFormulation ql:CSV ;\n";
        s += '    csvw:dialect [ csvw:delimiter ";" ] ;\n';
        s += '    rml:iterator "$"';
        return s;
    }

    // SQL
    var s2 = "";
    s2 += '    rml:source "' + self._escapeTurtleString(dsId || "") + '" ;\n';
    s2 += "    rml:referenceFormulation ql:SQL2008 ;\n";
    s2 += '    rr:tableName "' + self._escapeTurtleString(table) + '"';
    return s2;
};

// ---------------------------------------------------------------------------
// Datasource helpers
// ---------------------------------------------------------------------------
self._getTableDatasourceId = function (table) {
    // try to find the "table" node in graph and read datasource field
    var nodes = self._getAllVisNodes();
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

self._isCsvDatasource = function (dsId) {
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

self._getDatasourceTableColumns = function (table) {
    if (!table) return null;

    // DataSourceManager current datasource tables
    if (DataSourceManager && DataSourceManager.currentConfig && DataSourceManager.currentConfig.currentDataSource) {
        var cds = DataSourceManager.currentConfig.currentDataSource;
        if (cds.tables && cds.tables[table] && Array.isArray(cds.tables[table])) {
            return cds.tables[table];
        }
        // sampleData keys as fallback
        if (cds.sampleData && typeof cds.sampleData === "object") {
            var keys = Object.keys(cds.sampleData);
            if (keys && keys.length > 0) return keys;
        }
    }

    // MappingModeler current table columns
    if (MappingModeler && MappingModeler.currentTable && MappingModeler.currentTable.columns && MappingModeler.currentTable.name) {
        if (String(MappingModeler.currentTable.name) === String(table)) {
            return MappingModeler.currentTable.columns;
        }
    }

    return null;
};

self._normalizeColumnName = function (v) {
    if (!v) return "";
    return String(v).toLowerCase().replace(/[^a-z0-9]/g, "");
};

self._resolveTableColumnName = function (table, name) {
    if (!table || !name) return null;
    var cols = self._getDatasourceTableColumns(table);
    if (!cols || !Array.isArray(cols)) return null;
    var sName = String(name);
    // exact match
    for (var i = 0; i < cols.length; i++) {
        if (String(cols[i]) === sName) return String(cols[i]);
    }
    // case-insensitive match
    var lower = sName.toLowerCase();
    for (i = 0; i < cols.length; i++) {
        if (String(cols[i]).toLowerCase() === lower) return String(cols[i]);
    }
    // normalized match (remove separators like '-' or '_' )
    var norm = self._normalizeColumnName(sName);
    for (i = 0; i < cols.length; i++) {
        if (self._normalizeColumnName(cols[i]) === norm) return String(cols[i]);
    }
    return null;
};

self._getRealColumnName = function (data) {
    if (!data) return null;

    var name = null;

    // prioritÃ© au nom rÃ©el de colonne
    if (data.columnName) name = String(data.columnName);

    // fallback sur label
    if (!name && data.label) name = String(data.label);

    // fallback sur id
    if (!name && data.id) name = String(data.id);

    if (name && data.dataTable) {
        var resolved = self._resolveTableColumnName(String(data.dataTable), name);
        if (resolved) return resolved;
    }

    return name;
};



// ---------------------------------------------------------------------------
// Turtle helpers
// ---------------------------------------------------------------------------
self._escapeTurtleString = function (s) {
    if (s === null || s === undefined) return "";
    return String(s)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t");
};

self._isHttpIri = function (v) {
    if (typeof v !== "string") return false;
    var s = v.trim();
    return s.indexOf("http://") === 0 || s.indexOf("https://") === 0 || s.indexOf("urn:") === 0;
};

self._isPrefixedName = function (v) {
    if (typeof v !== "string") return false;
    return /^[a-zA-Z_][a-zA-Z0-9_-]*:[^\s]+$/.test(v);
};

self._normalizePrefixUri = function (uri) {
    if (!uri) return null;
    var s = String(uri).trim();
    if (s.indexOf("<") === 0 && s.lastIndexOf(">") === s.length - 1) {
        s = s.substring(1, s.length - 1);
    }
    return s;
};

self._collectPrefixMap = function () {
    var map = {};

    var add = function (p, uri) {
        if (!p || !uri) return;
        var key = String(p);
        if (key.lastIndexOf(":") === key.length - 1) key = key.substring(0, key.length - 1);
        if (!key) return;
        var val = self._normalizePrefixUri(uri);
        if (!val) return;
        if (!map[key]) map[key] = val;
    };

    var addMap = function (obj) {
        if (!obj) return;
        for (var k in obj) {
            add(k, obj[k]);
        }
    };

    if (typeof Shacl !== "undefined" && Shacl.prefixMap) {
        addMap(Shacl.prefixMap);
    }
    if (window.Config && MappingModeler && MappingModeler.currentSLSsource && Config.sources && Config.sources[MappingModeler.currentSLSsource]) {
        var src = Config.sources[MappingModeler.currentSLSsource];
        if (src && src.prefix && (src.graphUri || src.baseUri)) {
            add(src.prefix, src.graphUri || src.baseUri);
        }
    }
    if (DataSourceManager && DataSourceManager.currentConfig && DataSourceManager.currentConfig.prefixes) {
        addMap(DataSourceManager.currentConfig.prefixes);
    }
    if (DataSourceManager && DataSourceManager.rawConfig && DataSourceManager.rawConfig.prefixes) {
        addMap(DataSourceManager.rawConfig.prefixes);
    }

    return map;
};

self._turtleIriOrCurie = function (v) {
    if (!v) return null;
    var s = String(v).trim();

    // 1) d'abord les URI complets
    if (self._isHttpIri(s)) return "<" + s + ">";

    // 2) ensuite seulement les CURIE/prefix (ex: rdf:type, rdfs:label)
    if (self._isPrefixedName(s)) return s;

    return null;
};


self._turtleObject = function (v) {
    if (v === null || v === undefined) return '""';

    // IMPORTANT : on nettoie la valeur
    var s = String(v).trim();

    var iri = self._turtleIriOrCurie(s);
    if (iri) return iri;

    return '"' + self._escapeTurtleString(s) + '"';
};


self._prefixBlock = function () {
    var baseOrder = ["tm", "pom", "ls", "pm", "om", "sm", "rdf", "rml", "ql", "rr"];
    var baseMap = {
        tm: "http://ex.com/triplesMap/",
        pom: "http://ex.com/preObjMap/",
        ls: "http://ex.com/logicalSource/",
        pm: "http://ex.com/predicateMap/",
        om: "http://ex.com/objectMap/",
        sm: "http://ex.com/subjectMap/",
        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rml: "http://semweb.mmlab.be/ns/rml#",
        ql: "http://semweb.mmlab.be/ns/ql#",
        rr: "http://www.w3.org/ns/r2rml#",
    };

    var map = {};
    baseOrder.forEach(function (p) {
        map[p] = baseMap[p];
    });

    var lines = [];
    baseOrder.forEach(function (p) {
        if (!map[p]) return;
        lines.push("@prefix " + p + ": <" + map[p] + "> .");
    });

    lines.push("");
    return lines.join("\n") + "\n";
};

// ---------------------------------------------------------------------------
// URI / Template helpers
// ---------------------------------------------------------------------------
self._getGraphUri = function () {
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

self._subjectTemplateForColumn = function (data, businessClassIri) {
    if (!data) return "urn:souslesens:unknown/{id}";

    // URI constant should not use template (handled elsewhere)
    if (data.type === "URI") return String(data.id);

    var base = data.baseURI ? String(data.baseURI) : null;
    if (!base && businessClassIri && !self._isNamedIndividualIri(businessClassIri)) {
        var bc = self._expandCurieToIriString(businessClassIri);
        if (bc && self._isHttpIri(bc)) {
            if (bc.lastIndexOf("#") > -1) {
                base = bc.substring(0, bc.lastIndexOf("#") + 1);
            } else if (bc.lastIndexOf("/") > -1) {
                base = bc.substring(0, bc.lastIndexOf("/") + 1);
            }
        }
    }
    if (!base && data.rdfType && !self._isNamedIndividualIri(data.rdfType)) {
        var rt = self._expandCurieToIriString(data.rdfType);
        if (rt && self._isHttpIri(rt)) {
            if (rt.lastIndexOf("#") > -1) {
                base = rt.substring(0, rt.lastIndexOf("#") + 1);
            } else if (rt.lastIndexOf("/") > -1) {
                base = rt.substring(0, rt.lastIndexOf("/") + 1);
            }
        }
    }
    if (!base && data.source) {
        base = "http://" + String(data.source) + "/";
    }
    if (!base) {
        // default base
        var src = (MappingModeler && MappingModeler.currentSLSsource) ? String(MappingModeler.currentSLSsource) : "source";
        var table = data.dataTable ? String(data.dataTable) : "table";
        base = "urn:souslesens:" + src + ":" + table + ":" + (data.id ? String(data.id) : "id");
    }

    // normalize base
    if (base.lastIndexOf("/") !== base.length - 1 && base.lastIndexOf("#") !== base.length - 1) {
        base += "/";
    }

    var col = self._getRealColumnName(data) || "id";


    // template pattern
    return base + "{" + col + "}";
};

self._makeTriplesMapId = function (prefix, table, nodeId) {
    var t = table ? String(table) : "table";
    var n = nodeId ? String(nodeId) : "node";
    var safeT = self._escapeTurtleString(t).replace(/[^a-zA-Z0-9_]/g, "_");
    var safeN = self._escapeTurtleString(n).replace(/[^a-zA-Z0-9_]/g, "_");
    return ":" + prefix + "_" + safeT + "_" + safeN;
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
                if (connection && connection.edge && connection.edge.data && connection.edge.data.type == "tableToColumn") {
                    return;
                }
                var property = connection && connection.edge && connection.edge.data ? connection.edge.data.id : null;
                if (!property) {
                    property = connection && connection.edge && connection.edge.data ? connection.edge.data.type : null;
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
            } else if (node && node.parents && node.parents.length == 3) {
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
                    return item && item.data && item.data.name == lookup;
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

