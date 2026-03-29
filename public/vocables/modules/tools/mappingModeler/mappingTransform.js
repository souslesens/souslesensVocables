import common from "../../shared/common.js";
import DataSourceManager from "./dataSourcesManager.js";
import MappingModeler from "./mappingModeler.js";
import UIcontroller from "./uiController.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";

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

        var source = MappingModeler && MappingModeler.currentSLSsource ? MappingModeler.currentSLSsource : null;
        var baseName = "mapping_" + (source || "export");

        // Pre-fetch rdfs:subClassOf links to parent ontology classes (BFO, IOF-CORE, etc.)
        // so that TBox TriplesMaps include class hierarchy, enabling SousLeSens to display
        // the hierarchy panel after import.
        // Build a preview model to know which tables/datasources are involved,
        // then fetch non-nullable columns from the actual CSV files so that
        // blankNode and VirtualColumn templates can use per-row unique IDs
        // (e.g. RowId, DataActorGainOfRole) instead of nullable composite keys.
        var previewModel = self.buildExportModel();
        console.log("[MappingTransform v2] getNonNullableColsMap start, triplesMaps=", previewModel.triplesMaps ? previewModel.triplesMaps.length : 0);
        self.getNonNullableColsMap(previewModel, function (_err, nonNullableColsMap) {
            console.log("[MappingTransform v2] nonNullableColsMap=", JSON.stringify(nonNullableColsMap));
            self.fetchDirectSuperClasses(source, function (subClassOfMap) {
                // Detect whether all datasources in the model are CSV.
                // R2RML does not support CSV sources, so the R2RML option is hidden
                // when every TriplesMap in the model comes from a CSV datasource.
                var allCsv = previewModel.triplesMaps && previewModel.triplesMaps.length > 0;
                if (allCsv) {
                    for (var tmIndex = 0; tmIndex < previewModel.triplesMaps.length; tmIndex++) {
                        if (!self.isCsvDatasource(previewModel.triplesMaps[tmIndex].dsId)) {
                            allCsv = false;
                            break;
                        }
                    }
                }

                var jstreeData = [
                    { id: "export_root", parent: "#", text: "Export mappings", type: "Folder", data: { kind: "root" } },
                    { id: "export_rml", parent: "export_root", text: "RML (SQL + CSV)", type: "Property", data: { format: "rml" } },
                ];
                if (!allCsv) {
                    jstreeData.splice(1, 0, { id: "export_r2rml", parent: "export_root", text: "R2RML (SQL only - Ontop)", type: "Property", data: { format: "r2rml" } });
                }

                var options = {
                    openAll: true,
                    withCheckboxes: true,
                    tie_selection: false,
                    cascade: "xxx",

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
                            var alertMessage;
                            if (allCsv) {
                                alertMessage = "Check RML, then click OK";
                            } else {
                                alertMessage = "Check one option (RML or R2RML), then click OK";
                            }
                            return alert(alertMessage);
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
                            var noSelectionMessage;
                            if (allCsv) {
                                noSelectionMessage = "Check RML, then click OK";
                            } else {
                                noSelectionMessage = "Check RML or R2RML, then click OK";
                            }
                            return alert(noSelectionMessage);
                        }

                        var ttl = self.generateRmlOrR2rmlTurtle(fmt, subClassOfMap, nonNullableColsMap || {});
                        var ext = fmt === "r2rml" ? ".r2rml.ttl" : ".rml.ttl";
                        self.downloadTextFile(baseName + ext, ttl, "text/turtle;charset=utf-8");
                    },
                };

                JstreeWidget.loadJsTree(null, jstreeData, options, function () {});
            });
        });
    };

    /**
     * Queries the triplestore for direct rdfs:subClassOf links to non-restriction parent classes
     * for all class nodes present in the current Vis.js graph.
     * Used to enrich TBox TriplesMaps with class hierarchy (BFO, IOF-CORE, etc.).
     *
     * @function
     * @name fetchDirectSuperClasses
     * @memberof module:MappingTransform
     * @param {string|null} source - SousLeSens source label
     * @param {function} callback - function(subClassOfMap) where subClassOfMap is { classUri: [parentUri, ...] }
     * @returns {void}
     */
    self.fetchDirectSuperClasses = function (source, callback) {
        if (!source) {
            return callback({});
        }

        var nodes = self.getAllVisNodes();
        var classIris = [];
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (!n || !n.id) continue;
            var nid = String(n.id);
            if (nid.startsWith("http")) {
                classIris.push(nid);
            }
        }

        if (classIris.length === 0) {
            return callback({});
        }

        Sparql_OWL.getFilteredTriples(source, classIris, ["http://www.w3.org/2000/01/rdf-schema#subClassOf"], null, { withoutImports: true }, function (err, results) {
            var map = {};
            if (!err && results) {
                for (var ri = 0; ri < results.length; ri++) {
                    var row = results[ri];
                    var cls = row.subject && row.subject.value ? row.subject.value : null;
                    var parent = row.object && row.object.value ? row.object.value : null;
                    if (!cls || !parent) continue;
                    // Skip blank nodes and urn:souslesens: restriction IRIs
                    if (parent.indexOf("urn:souslesens:") === 0) continue;
                    if (parent.startsWith("_:")) continue;
                    if (!map[cls]) {
                        map[cls] = [];
                    }
                    map[cls].push(parent);
                }
            }
            callback(map);
        });
    };

    /**
     * Reads CSV files for all CSV datasources in the model and returns a map of
     * non-nullable columns (columns that have a non-empty value in every row).
     * Used to build composite IRI templates that won't cause RMLMapper to skip rows
     * where optional columns (e.g. dates) are empty.
     *
     * @function
     * @name getNonNullableColsMap
     * @memberof module:MappingTransform
     * @param {object} model - The export model from buildExportModel()
     * @param {Function} callback - Called with (err, map) where map is { [table]: string[] }
     * @returns {void}
     */
    self.getNonNullableColsMap = function (model, callback) {
        var result = {};
        var tasks = [];
        var seen = {};
        for (var i = 0; i < model.triplesMaps.length; i++) {
            var tm = model.triplesMaps[i];
            if (!self.isCsvDatasource(tm.dsId)) continue;
            var key = tm.table + "|" + tm.dsId;
            if (seen[key]) continue;
            seen[key] = true;
            tasks.push({ dsId: tm.dsId, table: tm.table });
        }
        if (tasks.length === 0) {
            return callback(null, result);
        }
        var pending = tasks.length;
        var done = false;
        tasks.forEach(function (task) {
            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/data/csv",
                data: { dir: "CSV/" + (MappingModeler && MappingModeler.currentSLSsource ? MappingModeler.currentSLSsource : task.dsId), fileName: task.table },
                dataType: "json",
                success: function (csvResult) {
                    if (!done) {
                        if (csvResult && csvResult.headers && csvResult.data) {
                            var headers = csvResult.headers;
                            // csvResult.data is an array of batches ([[row1,row2,...],[...]])
                            // flatten to a single array of row objects before processing
                            var rows = [];
                            for (var bi = 0; bi < csvResult.data.length; bi++) {
                                rows = rows.concat(csvResult.data[bi]);
                            }
                            var colHasNull = {};
                            for (var r = 0; r < rows.length; r++) {
                                var row = rows[r];
                                for (var c = 0; c < headers.length; c++) {
                                    var col = headers[c];
                                    if (!row[col] || String(row[col]).trim() === "") {
                                        colHasNull[col] = true;
                                    }
                                }
                            }
                            result[task.table] = headers
                                .filter(function (col) {
                                    return !colHasNull[col];
                                })
                                .sort();
                        } else {
                            result[task.table] = [];
                        }
                        pending--;
                        if (pending === 0) {
                            callback(null, result);
                        }
                    }
                },
                error: function () {
                    if (!done) {
                        done = true;
                        callback(null, result);
                    }
                },
            });
        });
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

    self.generateRmlOrR2rmlTurtle = function (format, subClassOfMap, nonNullableColsMap) {
        // format: "rml" | "r2rml"
        // subClassOfMap: optional { classUri: [parentUri, ...] } from fetchDirectSuperClasses
        // nonNullableColsMap: optional { tableName: [colName, ...] } — columns guaranteed non-null in every CSV row
        var model = self.buildExportModel(); // canonical ids + TriplesMaps index

        var out = "";
        out += self.prefixBlock();
        out += "# Generated by SousLeSens (" + (format === "rml" ? "RML" : "R2RML") + " export)\n";
        out += "# Source: " + self.escapeTurtleString(MappingModeler && MappingModeler.currentSLSsource ? MappingModeler.currentSLSsource : "") + "\n\n";

        // TBox declarations (owl:Class, restrictions, and parent class hierarchy)
        out += self.writeTBoxDeclarations(format, model, subClassOfMap || {});

        // TriplesMaps "entites"
        for (var i = 0; i < model.triplesMaps.length; i++) {
            out += self.writeTriplesMapProper(format, model.triplesMaps[i], model, nonNullableColsMap || {});
            out += "\n";
        }

        // URI constant nodes (ancres par table)
        out += self.writeUriConstantTriplesMaps(format, model);

        return out;
    };

    /**
     * Generates owl:Class TBox declarations for all entity types found in the model.
     * These declarations are needed for SousLeSens to display the semantic model after import.
     *
     * @function
     * @name writeTBoxDeclarations
     * @memberof module:MappingTransform
     * @param {object} model - The export model built by buildExportModel()
     * @returns {string} Turtle snippet with owl:Class declarations
     */
    self.writeTBoxDeclarations = function (format, model, subClassOfMap) {
        var ttl = "# TBox declarations (TriplesMaps)\n";
        var seenClasses = {};
        var gUri = self.getGraphUri();
        var nodesById = model.nodesById;
        var parentMap = subClassOfMap || {};

        // Find reference tmInfo: for R2RML skip CSV-only datasources
        var refTmInfo = null;
        for (var ri = 0; ri < model.triplesMaps.length; ri++) {
            var candidate = model.triplesMaps[ri];
            if (format === "r2rml" && self.isCsvDatasource(candidate.dsId)) continue;
            refTmInfo = candidate;
            break;
        }
        if (!refTmInfo) {
            return ttl + "\n";
        }

        /**
         * Returns the format-specific logical source tag and block string for TBox TriplesMaps.
         * For R2RML: uses rr:logicalTable with rr:tableName.
         * For RML: uses rml:logicalSource with source path and reference formulation.
         * @param {string} table - Table name
         * @param {string} dsId - Datasource ID
         * @returns {{ tag: string, block: string }} tag and block content
         */
        var getTboxLogical = function (table, dsId) {
            if (format === "r2rml") {
                return { tag: "rr:logicalTable", block: self.logicalBlockR2RML(table) };
            }
            return { tag: "rml:logicalSource", block: self.logicalBlockRML(table, dsId) };
        };

        var refLogicalInfo = getTboxLogical(refTmInfo.table, refTmInfo.dsId);

        // Case 1: rdfType on entity node is a business class (not owl:NamedIndividual, not owl:Class)
        for (var i = 0; i < model.triplesMaps.length; i++) {
            var tmInfo = model.triplesMaps[i];
            // R2RML: skip CSV datasources
            if (format === "r2rml" && self.isCsvDatasource(tmInfo.dsId)) continue;
            var subjNode = tmInfo.subjNode;
            if (!subjNode || !subjNode.data) continue;
            var rdfType = subjNode.data.rdfType;
            if (!rdfType || rdfType === "owl:Class" || rdfType === "owl:NamedIndividual") continue;
            if (seenClasses[rdfType]) continue;
            seenClasses[rdfType] = true;
            var classIri = self.resolveIri(rdfType);
            var classLabel1 = self.iriLocalName(rdfType).replace(/_/g, " ");
            var tboxTmId = self.makeTriplesMapId("TM_TBOX", tmInfo.table, rdfType.replace(/[^a-zA-Z0-9_]/g, "_"));
            var logicalInfo1 = getTboxLogical(tmInfo.table, tmInfo.dsId);
            ttl += tboxTmId + " a rr:TriplesMap ;\n";
            ttl += "  " + logicalInfo1.tag + " [\n" + logicalInfo1.block + "\n  ] ;\n";
            ttl += "  rr:subjectMap [\n";
            if (gUri) {
                ttl += "    rr:graph <" + self.escapeTurtleString(gUri) + "> ;\n";
            }
            ttl += "    rr:constant " + classIri + " ;\n";
            ttl += "    rr:termType rr:IRI ;\n";
            ttl += "    rr:class owl:Class\n";
            ttl += "  ] ;\n";
            ttl += "  rr:predicateObjectMap [\n";
            ttl += "    rr:predicate rdfs:label ;\n";
            ttl += '    rr:objectMap [ rr:constant "' + self.escapeTurtleString(classLabel1) + '" ]\n';
            ttl += "  ] .\n\n";
        }

        // Case 2: Class nodes (rdfType comes from rdf:type edges to Class nodes in the graph)
        for (var nodeId in nodesById) {
            var node = nodesById[nodeId];
            if (!node || !node.data) continue;
            if (node.data.type !== "Class") continue;
            var classUri = nodeId;
            if (!classUri || seenClasses[classUri]) continue;
            seenClasses[classUri] = true;
            var classLabel2 = self.iriLocalName(classUri).replace(/_/g, " ");
            var tboxTmId2 = self.makeTriplesMapId("TM_TBOX_URI", refTmInfo.table, classUri.replace(/[^a-zA-Z0-9_]/g, "_"));
            ttl += tboxTmId2 + " a rr:TriplesMap ;\n";
            ttl += "  " + refLogicalInfo.tag + " [\n" + refLogicalInfo.block + "\n  ] ;\n";
            ttl += "  rr:subjectMap [\n";
            if (gUri) {
                ttl += "    rr:graph <" + self.escapeTurtleString(gUri) + "> ;\n";
            }
            ttl += "    rr:constant <" + self.escapeTurtleString(classUri) + "> ;\n";
            ttl += "    rr:termType rr:IRI ;\n";
            ttl += "    rr:class owl:Class\n";
            ttl += "  ] ;\n";
            ttl += "  rr:predicateObjectMap [\n";
            ttl += "    rr:predicate rdfs:label ;\n";
            ttl += '    rr:objectMap [ rr:constant "' + self.escapeTurtleString(classLabel2) + '" ]\n';
            ttl += "  ] .\n\n";
        }

        // Case 3: owl:ObjectProperty declarations for predicate edges between entity nodes.
        // Build nodeToClass: entityNodeId -> classIRI via rdf:type edges.
        var nodeToClass = {};
        for (var ei = 0; ei < model.edges.length; ei++) {
            var typeEdge = model.edges[ei];
            if (!typeEdge || !typeEdge.data) continue;
            if (typeEdge.data.type !== "rdf:type") continue;
            nodeToClass[typeEdge.from] = typeEdge.to;
        }

        var seenProps = {};
        for (var ej = 0; ej < model.edges.length; ej++) {
            var propEdge = model.edges[ej];
            if (!propEdge || !propEdge.data) continue;
            if (!propEdge.data.id) continue;
            if (propEdge.data.type === "rdf:type") continue;
            if (propEdge.data.type === "tableToColumn") continue;

            var predUri = propEdge.data.id;
            var fromClass = nodeToClass[propEdge.from];
            var toClass = nodeToClass[propEdge.to];

            if (!fromClass || !toClass) continue;

            var propKey = predUri + "|" + fromClass + "|" + toClass;
            if (seenProps[propKey]) continue;
            seenProps[propKey] = true;

            var propSafeId = predUri.replace(/[^a-zA-Z0-9_]/g, "_");
            var fromClassSafe = fromClass.replace(/[^a-zA-Z0-9_]/g, "_");
            var toClassSafe = toClass.replace(/[^a-zA-Z0-9_]/g, "_");
            // Include toClassSafe in restrictionIri so each (fromClass, prop, toClass) combo is unique
            var restrictionIri = "urn:souslesens:restriction:" + fromClassSafe + "_" + propSafeId + "_" + toClassSafe;

            // TriplesMap A: owl:ObjectProperty with rdfs:domain / rdfs:range
            // Include fromClassSafe + toClassSafe to avoid ID collision when same prop has multiple domain/range pairs
            var propTmId = self.makeTriplesMapId("TM_TBOX_PROP", refTmInfo.table, fromClassSafe + "_" + propSafeId + "_" + toClassSafe);
            ttl += propTmId + " a rr:TriplesMap ;\n";
            ttl += "  " + refLogicalInfo.tag + " [\n" + refLogicalInfo.block + "\n  ] ;\n";
            ttl += "  rr:subjectMap [\n";
            if (gUri) {
                ttl += "    rr:graph <" + self.escapeTurtleString(gUri) + "> ;\n";
            }
            ttl += "    rr:constant <" + self.escapeTurtleString(predUri) + "> ;\n";
            ttl += "    rr:termType rr:IRI ;\n";
            ttl += "    rr:class owl:ObjectProperty\n";
            ttl += "  ] ;\n";
            ttl += "  rr:predicateObjectMap [\n";
            ttl += "    rr:predicate rdfs:domain ;\n";
            ttl += "    rr:objectMap [ rr:constant <" + self.escapeTurtleString(fromClass) + "> ; rr:termType rr:IRI ]\n";
            ttl += "  ] ;\n";
            ttl += "  rr:predicateObjectMap [\n";
            ttl += "    rr:predicate rdfs:range ;\n";
            ttl += "    rr:objectMap [ rr:constant <" + self.escapeTurtleString(toClass) + "> ; rr:termType rr:IRI ]\n";
            ttl += "  ] .\n\n";

            // TriplesMap B: OWL restriction node (owl:Restriction + owl:onProperty + owl:someValuesFrom)
            var restrTmId = self.makeTriplesMapId("TM_TBOX_RESTR", refTmInfo.table, fromClassSafe + "_" + propSafeId + "_" + toClassSafe);
            ttl += restrTmId + " a rr:TriplesMap ;\n";
            ttl += "  " + refLogicalInfo.tag + " [\n" + refLogicalInfo.block + "\n  ] ;\n";
            ttl += "  rr:subjectMap [\n";
            if (gUri) {
                ttl += "    rr:graph <" + self.escapeTurtleString(gUri) + "> ;\n";
            }
            ttl += "    rr:constant <" + self.escapeTurtleString(restrictionIri) + "> ;\n";
            ttl += "    rr:termType rr:IRI ;\n";
            ttl += "    rr:class owl:Restriction\n";
            ttl += "  ] ;\n";
            ttl += "  rr:predicateObjectMap [\n";
            ttl += "    rr:predicate owl:onProperty ;\n";
            ttl += "    rr:objectMap [ rr:constant <" + self.escapeTurtleString(predUri) + "> ; rr:termType rr:IRI ]\n";
            ttl += "  ] ;\n";
            ttl += "  rr:predicateObjectMap [\n";
            ttl += "    rr:predicate owl:someValuesFrom ;\n";
            ttl += "    rr:objectMap [ rr:constant <" + self.escapeTurtleString(toClass) + "> ; rr:termType rr:IRI ]\n";
            ttl += "  ] .\n\n";

            // TriplesMap C: fromClass rdfs:subClassOf restrictionNode
            var subclsTmId = self.makeTriplesMapId("TM_TBOX_SUBCLS", refTmInfo.table, fromClassSafe + "_" + propSafeId + "_" + toClassSafe);
            ttl += subclsTmId + " a rr:TriplesMap ;\n";
            ttl += "  " + refLogicalInfo.tag + " [\n" + refLogicalInfo.block + "\n  ] ;\n";
            ttl += "  rr:subjectMap [\n";
            if (gUri) {
                ttl += "    rr:graph <" + self.escapeTurtleString(gUri) + "> ;\n";
            }
            ttl += "    rr:constant <" + self.escapeTurtleString(fromClass) + "> ;\n";
            ttl += "    rr:termType rr:IRI\n";
            ttl += "  ] ;\n";
            ttl += "  rr:predicateObjectMap [\n";
            ttl += "    rr:predicate rdfs:subClassOf ;\n";
            ttl += "    rr:objectMap [ rr:constant <" + self.escapeTurtleString(restrictionIri) + "> ; rr:termType rr:IRI ]\n";
            ttl += "  ] .\n\n";
        }

        // Case 4: rdfs:subClassOf to external parent classes (BFO, IOF-CORE, etc.)
        // These links give SousLeSens the class hierarchy in "node infos" after import.
        for (var classUri4 in parentMap) {
            var parents4 = parentMap[classUri4];
            if (!parents4 || parents4.length === 0) continue;
            for (var pi = 0; pi < parents4.length; pi++) {
                var parentUri4 = parents4[pi];
                var classSafe4 = classUri4.replace(/[^a-zA-Z0-9_]/g, "_");
                var parentSafe4 = parentUri4.replace(/[^a-zA-Z0-9_]/g, "_");
                var parentTmId = self.makeTriplesMapId("TM_TBOX_PARENT", refTmInfo.table, classSafe4 + "_" + parentSafe4);
                ttl += parentTmId + " a rr:TriplesMap ;\n";
                ttl += "  " + refLogicalInfo.tag + " [\n" + refLogicalInfo.block + "\n  ] ;\n";
                ttl += "  rr:subjectMap [\n";
                if (gUri) {
                    ttl += "    rr:graph <" + self.escapeTurtleString(gUri) + "> ;\n";
                }
                ttl += "    rr:constant <" + self.escapeTurtleString(classUri4) + "> ;\n";
                ttl += "    rr:termType rr:IRI\n";
                ttl += "  ] ;\n";
                ttl += "  rr:predicateObjectMap [\n";
                ttl += "    rr:predicate rdfs:subClassOf ;\n";
                ttl += "    rr:objectMap [ rr:constant <" + self.escapeTurtleString(parentUri4) + "> ; rr:termType rr:IRI ]\n";
                ttl += "  ] .\n\n";
            }
        }

        ttl += "\n";
        return ttl;
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
    self.writeTriplesMapProper = function (format, tmInfo, model, nonNullableColsMap) {
        var nodesById = model.nodesById;
        var nodes = model.nodes;
        var outgoing = model.outgoing;

        var table = tmInfo.table;
        var dsId = tmInfo.dsId;

        // Compute deduplicated list of real CSV Column node IDs for this table.
        // Used by writeSubjectMapProper for blankNode composite URI templates.
        // We compute it here because tmInfo.table is always set, while
        // subjectData.dataTable may be null for some blankNode subject nodes.
        var tmRealCols = [];
        var tmColSeen = {};
        if (table && nodesById) {
            var tmAllNodeIds = Object.keys(nodesById);
            for (var tmci = 0; tmci < tmAllNodeIds.length; tmci++) {
                var tmcNode = nodesById[tmAllNodeIds[tmci]];
                if (!tmcNode || !tmcNode.data) continue;
                var tmcd = tmcNode.data;
                if (tmcd.type === "Column" && tmcd.dataTable === table && tmcd.id && !tmColSeen[String(tmcd.id)]) {
                    tmColSeen[String(tmcd.id)] = true;
                    tmRealCols.push(String(tmcd.id));
                }
            }
            tmRealCols.sort();
        }

        // Compute the list of non-nullable CSV columns for this table.
        // This list is passed separately to writeSubjectMapProper so that blankNode
        // and VirtualColumn templates can use per-row unique ID columns
        // (e.g. RowId, DataActorGainOfRole) even when they are not MappingModeler nodes.
        // Keeping tmRealCols unchanged avoids polluting the mapped-column list with
        // CSV-only columns that would break other template logic.
        var tmNonNullCols = nonNullableColsMap && table && nonNullableColsMap[table] ? nonNullableColsMap[table] : null;

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
            addPo(
                self.writePredicateObjectMapProper(format, "rdfs:label", {
                    kind: "literalColumn",
                    value: sData.rdfsLabel,
                    language: labelLang,
                    datatype: labelLang ? null : "xsd:string",
                }),
            );
        }

        // (A1) KGcreator#mappingFile — required by MappingModeler getTriplesStats query to display triple count
        if (table) {
            addPo(
                self.writePredicateObjectMapProper(format, "http://souslesens.org/KGcreator#mappingFile", {
                    kind: "literalConstant",
                    value: table,
                    datatype: null,
                }),
            );
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
                addPo(self.edgeToObjectMap(format, table, n, toNode, pred2, model, tmNonNullCols));
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

        ttl += self.writeSubjectMapProper(format, sData, businessClass, model.nodesById, tmInfo.tmId, tmRealCols, tmNonNullCols);

        if (po) ttl += po;

        ttl += "  .\n";
        return ttl;
    };

    // Convert an edge target into objectMap (proper join if possible)
    self.edgeToObjectMap = function (format, currentTable, fromNode, toNode, predicate, model, tmNonNullCols) {
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
            (canonData.type === "URI" || canonData.isMainColumn === true || canonData.uriType === "blankNode" || canonData.uriType === "randomIdentifier");

        // If target is an entity and there is a TriplesMap for it, do parentTriplesMap+joinCondition
        // child = FK column in the source (current) table
        // parent = column in the target TriplesMap's source that holds the matching value
        //   → use toData.id (the actual target column pointed to by the edge, e.g. FK column in books.csv)
        //   → fallback to canonData.id (PK of the canonical node) if toData.id is absent
        if (isEntity) {
            var parentTm = model.tmByCanonicalNodeId[canonToId];
            var childCol;
            var parentCol;

            // Bug fix: cross-table join column resolution.
            // fromNode is an alias node of the current entity that lives in the TARGET table.
            // Its data.id is the FK column in the target table (e.g. "publisher_id" in books.csv).
            // The canonical source entity's data.id is the PK column in the current table.
            if (toData.dataTable && toData.dataTable !== currentTable) {
                // parentCol = FK column in the target table = the column fromNode represents there
                if (fromNode && fromNode.data && fromNode.data.id) {
                    parentCol = String(fromNode.data.id);
                } else {
                    parentCol = null;
                }
                // childCol = PK column in current (source) table = canonical source entity's main column
                var canonFromNodeId = model.getCanonicalNodeId(fromNode ? fromNode.id : "");
                var canonFromNodeData = nodesById[canonFromNodeId] ? nodesById[canonFromNodeId].data : null;
                if (canonFromNodeData && canonFromNodeData.id) {
                    childCol = String(canonFromNodeData.id);
                } else if (fromNode && fromNode.data && fromNode.data.id) {
                    childCol = String(fromNode.data.id);
                } else {
                    childCol = null;
                }
            } else {
                // Same-table join.
                // The join key depends on the nature of the source and target nodes:
                //
                // Case A — source is VirtualColumn (e.g. Data_actor_gain_of_role):
                //   Use the VirtualColumn's own key column (DataActorGainOfRole / RowId).
                //   Using toData.id (e.g. "ActorRoleStartDate") would create a cross-join
                //   on the date value, linking one event to all rows with the same date.
                //
                // Case B — target is blankNode Column (e.g. RoleAsDefinedInDataGovernanceModel,
                //   ActorRoleStartDate): its subject template uses RowId, not its own column
                //   value. Joining on the target column value (e.g. "RoleAsDefinedInDataGovernanceModel")
                //   would link the source to ALL rows that share the same role string instead
                //   of only the rows belonging to the same entity.
                //   Fix: join on the canonical source entity's column (fromNode.data.id),
                //   e.g. "DataActor = DataActor" links each actor to only its own rows' roles.
                //
                // Case C — normal fromLabel-to-fromLabel join (e.g. MainEntity → DataActor):
                //   Use toData.id as before.
                var fromNodeData = fromNode && fromNode.data ? fromNode.data : null;
                if (fromNodeData && fromNodeData.type === "VirtualColumn") {
                    // Case A
                    var vcJoinKey = self.findVirtualColumnKey(fromNodeData, nodesById, tmNonNullCols);
                    childCol = vcJoinKey;
                    parentCol = vcJoinKey;
                } else if (canonData.uriType === "blankNode") {
                    // Case B: target blankNode — join on the source entity's own column
                    var canonFromNodeId = model.getCanonicalNodeId(fromNode ? fromNode.id : "");
                    var canonFromNodeData = nodesById[canonFromNodeId] ? nodesById[canonFromNodeId].data : null;
                    if (canonFromNodeData && canonFromNodeData.id) {
                        childCol = String(canonFromNodeData.id);
                        parentCol = String(canonFromNodeData.id);
                    } else if (fromNodeData && fromNodeData.id) {
                        childCol = String(fromNodeData.id);
                        parentCol = String(fromNodeData.id);
                    } else {
                        childCol = null;
                        parentCol = null;
                    }
                } else if (toData.id) {
                    // Case C: normal join on the target column value
                    parentCol = String(toData.id);
                    childCol = String(toData.id);
                } else if (canonData.id) {
                    parentCol = String(canonData.id);
                    childCol = String(canonData.id);
                } else {
                    parentCol = null;
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
        // In RML, replicate with rr:parentTriplesMap + joinCondition on the VirtualColumn's
        // own key column (e.g. DataActorGainOfRole or RowId).
        // Using findPrimaryKeyColumn here was wrong: it returned the first isMainColumn node
        // in graph order (e.g. "MainEntity"), causing all actors in the same entity to be
        // linked to every gain_of_role of that entity instead of only their own.
        if (canonData.type === "VirtualColumn") {
            var vcParentTm = model.tmByCanonicalNodeId[canonToId];
            if (vcParentTm) {
                var vcPkCol = self.findVirtualColumnKey(canonData, nodesById, tmNonNullCols);
                if (vcPkCol) {
                    return self.writePredicateObjectMapProper(format, predicate, {
                        kind: "parentTriplesMap",
                        parentTriplesMap: vcParentTm,
                        child: vcPkCol,
                        parent: vcPkCol,
                    });
                }
            }
            return "  # NOTE: predicate <" + predicate + "> → VirtualColumn '" + canonData.id + "' blank node — no key column found in table '" + (canonData.dataTable || "?") + "', skipped\n";
        }

        // literal columns
        if (toData.type === "Column") {
            // Bug fix: if the Column node has an rdf:type edge pointing to a Class node,
            // it is an entity reference (not a data property). Since there is no TriplesMap
            // for it (e.g. Author not materialized as instances), skip to avoid generating
            // a spurious literal value (e.g. "A001" instead of an Author IRI).
            var toNodeOutgoing = model.outgoing[toNode.id] ? model.outgoing[toNode.id] : [];
            var isEntityRef = false;
            for (var litI = 0; litI < toNodeOutgoing.length; litI++) {
                var litEdge = toNodeOutgoing[litI];
                if (!litEdge || !litEdge.data || litEdge.data.type !== "rdf:type") continue;
                var targetClassNode = nodesById[litEdge.to];
                if (targetClassNode && targetClassNode.data && targetClassNode.data.type === "Class") {
                    isEntityRef = true;
                    break;
                }
            }
            if (isEntityRef) {
                return "";
            }
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

                var logical = format === "r2rml" ? self.logicalBlockR2RML(t) : self.logicalBlockRML(t, dsId);

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
    self.writeSubjectMapProper = function (_format, subjectData, businessClass, _nodesById, _tmId, _tmRealCols, _tmNonNullCols) {
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
            // To make the blank node joinable from other TriplesMaps (parentTriplesMap),
            // use an IRI template scoped by node id + a per-row unique column.
            // Preference order:
            //   1. Column whose normalized name matches the VirtualColumn node's safeId
            //      (e.g. node "Data_actor_gain_of_role" → column "DataActorGainOfRole")
            //      This allows users to add a dedicated per-row column for each VirtualColumn.
            //   2. "RowId" column — generic synthetic row identifier
            //   3. Primary key column — fallback
            var safeId = self.escapeTurtleString(String(subjectData.id)).replace(/[^a-zA-Z0-9_]/g, "_");
            var safeIdNorm = safeId.replace(/_/g, "").toLowerCase();
            var matchedCol = null;
            // Search order: non-nullable CSV columns first (may contain synthetic ID columns
            // like DataActorGainOfRole/RowId not present as MappingModeler nodes),
            // then fall back to mapped real columns.
            var colListsToSearch = [];
            if (_tmNonNullCols && _tmNonNullCols.length > 0) {
                colListsToSearch.push(_tmNonNullCols);
            }
            if (_tmRealCols && _tmRealCols.length > 0) {
                colListsToSearch.push(_tmRealCols);
            }
            for (var cli = 0; cli < colListsToSearch.length && !matchedCol; cli++) {
                var colList = colListsToSearch[cli];
                for (var rvi = 0; rvi < colList.length; rvi++) {
                    if (colList[rvi].toLowerCase() === safeIdNorm) {
                        matchedCol = colList[rvi];
                        break;
                    }
                }
                if (!matchedCol && colList.indexOf("RowId") !== -1) {
                    matchedCol = "RowId";
                }
            }
            var pkForBNode = matchedCol || self.findPrimaryKeyColumn(subjectData.dataTable, _nodesById);
            if (pkForBNode) {
                ttl += '    rr:template "http://souslesens.org/bnode/' + safeId + "/{" + pkForBNode + '}" ;\n';
                // rr:template requires rr:IRI — BlankNode is incompatible with templates
                ttl += "    rr:termType rr:IRI";
            } else {
                // no primary key available: true blank node per row (no template)
                ttl += "    rr:termType rr:BlankNode";
            }
        } else if (subjectData && subjectData.uriType === "blankNode") {
            // Blank node semantics: rr:termType rr:BlankNode does NOT work with
            // parentTriplesMap+joinCondition in RMLMapper (blank nodes cannot be resolved
            // across TriplesMaps). Instead we use a composite IRI template that is:
            //   - namespaced by the TriplesMap ID (unique per TriplesMap) to prevent URI
            //     collisions between TriplesMaps with different rdf:type on the same row
            //   - built from all real CSV Column nodes of the table to ensure per-row
            //     uniqueness within each TriplesMap
            // Joins (parentTriplesMap+joinCondition) still work because they match on column
            // VALUES, not on the generated IRI.
            var bnNs = _tmId
                ? String(_tmId)
                      .replace(/[^a-zA-Z0-9_]/g, "_")
                      .replace(/^_+/, "")
                : "bnode";
            // Strategy for choosing template columns (in order):
            //   1. _tmNonNullCols from CSV: all columns are guaranteed non-null, so RMLMapper
            //      will never skip a row. If RowId exists → use it alone. Otherwise use all
            //      non-nullable columns (unique combination per row in practice).
            //   2. _tmRealCols fallback: mapped node columns. May include nullable columns
            //      (e.g. ActorRoleEndDate) which cause RMLMapper to skip rows.
            //      Apply RowId / VirtualColumn-pattern reduction to minimise skipped rows.
            var bnRealCols = [];
            if (_tmNonNullCols && _tmNonNullCols.length > 0) {
                // Use the non-nullable CSV columns directly.
                if (_tmNonNullCols.indexOf("RowId") !== -1) {
                    bnRealCols = ["RowId"];
                } else {
                    bnRealCols = _tmNonNullCols.slice();
                }
            } else {
                bnRealCols = _tmRealCols && _tmRealCols.length > 0 ? _tmRealCols : [];
                // Prefer per-row synthetic ID columns over the full composite template.
                if (bnRealCols.indexOf("RowId") !== -1) {
                    bnRealCols = ["RowId"];
                } else {
                    var bnVcCols = bnRealCols.filter(function (c) {
                        var cn = c.toLowerCase();
                        return cn.indexOf("gainofrole") !== -1 || cn.indexOf("lossofrole") !== -1 || cn.indexOf("rowid") !== -1;
                    });
                    if (bnVcCols.length > 0) {
                        bnRealCols = bnVcCols;
                    }
                }
            }
            if (bnRealCols.length === 0 && subjectData.dataTable && _nodesById) {
                // Fallback: compute from nodesById using subjectData.dataTable
                var bnTable = String(subjectData.dataTable);
                var bnColSeen = {};
                var bnNodeIds = Object.keys(_nodesById);
                for (var bni = 0; bni < bnNodeIds.length; bni++) {
                    var bnNode = _nodesById[bnNodeIds[bni]];
                    if (!bnNode || !bnNode.data) continue;
                    var bnd = bnNode.data;
                    if (bnd.type === "Column" && bnd.dataTable === bnTable && bnd.id && !bnColSeen[String(bnd.id)]) {
                        bnColSeen[String(bnd.id)] = true;
                        bnRealCols.push(String(bnd.id));
                    }
                }
                bnRealCols.sort();
            }
            if (bnRealCols.length > 0) {
                var bnTemplate = bnRealCols
                    .map(function (c) {
                        return "{" + c + "}";
                    })
                    .join("_");
                ttl += '    rr:template "http://souslesens.org/bnode/' + bnNs + "/" + bnTemplate + '" ;\n';
            } else {
                var bnCol = subjectData.id ? String(subjectData.id) : "id";
                ttl += '    rr:template "http://souslesens.org/bnode/' + bnNs + "/{" + bnCol + '}" ;\n';
            }
            ttl += "    rr:termType rr:IRI";
        } else {
            var template = self.subjectTemplateForColumn(subjectData);
            // Namespace the URI by column name to prevent inter-TriplesMap URI collisions.
            // Two TMs sharing the same graphUri prefix (e.g. DataDomain and ActorRoleEndDate)
            // can produce the same IRI when column values happen to match — for example when
            // the ActorRoleEndDate column contains a value identical to a DataDomain value.
            // Using the column name (subjectData.id) as a path segment guarantees uniqueness
            // because column names are distinct across TMs: DataDomain/{DataDomain} can never
            // collide with ActorRoleEndDate/{ActorRoleEndDate}.
            var colNameNs = subjectData && subjectData.id ? String(subjectData.id) : null;
            if (colNameNs) {
                var nsSep = Math.max(template.lastIndexOf("/"), template.lastIndexOf("#"));
                if (nsSep !== -1) {
                    template = template.slice(0, nsSep + 1) + colNameNs + "/" + template.slice(nsSep + 1);
                }
            }
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
                classes = String(businessClass)
                    .split(",")
                    .map(function (c) {
                        return c.trim();
                    })
                    .filter(function (c) {
                        return c.length > 0;
                    });
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
                ttl += ' ;\n      rml:language "' + self.escapeTurtleString(spec.language) + '"';
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

        var host = ds && ds.host ? ds.host : "YOUR_HOST";
        var database = ds && ds.database ? ds.database : "YOUR_DATABASE";
        var port;

        if (sqlType === "postgres" || sqlType === "postgresql") {
            port = ds && ds.port ? ds.port : 5432;
            return {
                jdbcDSN: "jdbc:postgresql://" + host + ":" + port + "/" + database,
                jdbcDriver: "org.postgresql.Driver",
            };
        }
        if (sqlType === "sqlserver" || sqlType === "mssql") {
            port = ds && ds.port ? ds.port : 1433;
            return {
                jdbcDSN: "jdbc:sqlserver://" + host + ":" + port + ";databaseName=" + database,
                jdbcDriver: "com.microsoft.sqlserver.jdbc.SQLServerDriver",
            };
        }
        if (sqlType === "oracle") {
            port = ds && ds.port ? ds.port : 1521;
            return {
                jdbcDSN: "jdbc:oracle:thin:@" + host + ":" + port + ":" + database,
                jdbcDriver: "oracle.jdbc.OracleDriver",
            };
        }
        if (sqlType === "sqlite") {
            return {
                jdbcDSN: "jdbc:sqlite:" + database,
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

    /**
     * Extracts the local name from an IRI (the part after the last # or /).
     * Example: "http://testClasses_Shirelle/Author" -> "Author"
     *
     * @function
     * @name iriLocalName
     * @memberof module:MappingTransform
     * @param {string} iri - The IRI string.
     * @returns {string} The local name, or the full IRI if no separator found.
     */
    self.iriLocalName = function (iri) {
        if (!iri) return "";
        var s = String(iri);
        var hashPos = s.lastIndexOf("#");
        var slashPos = s.lastIndexOf("/");
        var sep = hashPos > slashPos ? hashPos : slashPos;
        if (sep >= 0 && sep < s.length - 1) {
            return s.substring(sep + 1);
        }
        return s;
    };

    self.escapeTurtleString = function (s) {
        if (s === null || s === undefined) return "";
        return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
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
            var src = MappingModeler && MappingModeler.currentSLSsource ? String(MappingModeler.currentSLSsource) : "source";
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

    /**
     * Returns the join key column for a VirtualColumn node.
     * Uses the same resolution order as writeSubjectMapProper for VirtualColumn subjects:
     *   1. Column in nonNullCols whose normalized name matches the VirtualColumn's safeId
     *      (e.g. "Data actor gain of role" → "dataactorgainofrole" → matches "DataActorGainOfRole")
     *   2. "RowId" if present in nonNullCols or graph nodes
     *   3. findPrimaryKeyColumn fallback
     * @function
     * @name findVirtualColumnKey
     * @memberof module:MappingTransform
     * @param {Object} vcData - The VirtualColumn node's data object.
     * @param {Object} nodesById - Map of all graph nodes keyed by ID.
     * @param {string[]|null} nonNullCols - Non-nullable CSV column names for the table.
     * @returns {string|null} The column name to use as join key, or null.
     */
    self.findVirtualColumnKey = function (vcData, nodesById, nonNullCols) {
        var safeId = String(vcData.id || "").replace(/[^a-zA-Z0-9_]/g, "_");
        var safeIdNorm = safeId.replace(/_/g, "").toLowerCase();
        var table = vcData.dataTable;

        // Build the list of candidate columns: nonNullCols first, then graph nodes.
        var colsToSearch = [];
        if (nonNullCols && nonNullCols.length > 0) {
            colsToSearch = nonNullCols.slice();
        }
        if (nodesById) {
            var nodeIds = Object.keys(nodesById);
            for (var i = 0; i < nodeIds.length; i++) {
                var n = nodesById[nodeIds[i]];
                if (!n || !n.data) continue;
                var d = n.data;
                if (d.type === "Column" && d.dataTable === table && d.id) {
                    var cid = String(d.id);
                    if (colsToSearch.indexOf(cid) === -1) {
                        colsToSearch.push(cid);
                    }
                }
            }
        }

        // 1. Exact normalized-name match (e.g. "DataActorGainOfRole" → "dataactorgainofrole")
        for (var j = 0; j < colsToSearch.length; j++) {
            if (colsToSearch[j].replace(/_/g, "").toLowerCase() === safeIdNorm) {
                return colsToSearch[j];
            }
        }

        // 2. RowId
        if (colsToSearch.indexOf("RowId") !== -1) {
            return "RowId";
        }

        // 3. Fallback: standard primary-key column
        return self.findPrimaryKeyColumn(table, nodesById);
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
            string: "xsd:string",
            integer: "xsd:integer",
            int: "xsd:integer",
            float: "xsd:float",
            double: "xsd:double",
            decimal: "xsd:decimal",
            boolean: "xsd:boolean",
            date: "xsd:date",
            dateTime: "xsd:dateTime",
            datetime: "xsd:dateTime",
            time: "xsd:time",
            long: "xsd:long",
            short: "xsd:short",
            byte: "xsd:byte",
            anyURI: "xsd:anyURI",
            anyuri: "xsd:anyURI",
            gYear: "xsd:gYear",
            gyear: "xsd:gYear",
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
        var refKeyword = format === "rml" ? "rml:reference" : "rr:column";

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
