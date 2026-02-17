var TriplesToManchester = (function () {
    var self = {};

    var OWL = "http://www.w3.org/2002/07/owl#";
    var RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
    var RDFS = "http://www.w3.org/2000/01/rdf-schema#";

    var AXIOM_KEYWORDS = {};
    AXIOM_KEYWORDS[RDFS + "subClassOf"] = "SubClassOf:";
    AXIOM_KEYWORDS[OWL + "equivalentClass"] = "EquivalentTo:";
    AXIOM_KEYWORDS[OWL + "disjointWith"] = "DisjointWith:";
    AXIOM_KEYWORDS[OWL + "disjointUnionOf"] = "DisjointUnionOf:";

    var RESTRICTION_KEYWORDS = {};
    RESTRICTION_KEYWORDS[OWL + "someValuesFrom"] = "some";
    RESTRICTION_KEYWORDS[OWL + "allValuesFrom"] = "only";
    RESTRICTION_KEYWORDS[OWL + "hasValue"] = "value";

    var CARDINALITY_KEYWORDS = {};
    CARDINALITY_KEYWORDS[OWL + "minCardinality"] = "min";
    CARDINALITY_KEYWORDS[OWL + "maxCardinality"] = "max";
    CARDINALITY_KEYWORDS[OWL + "cardinality"] = "exactly";
    CARDINALITY_KEYWORDS[OWL + "minQualifiedCardinality"] = "min";
    CARDINALITY_KEYWORDS[OWL + "maxQualifiedCardinality"] = "max";
    CARDINALITY_KEYWORDS[OWL + "qualifiedCardinality"] = "exactly";

    self.convert = function (triples) {
        if (!triples || triples.length === 0) {
            return "";
        }

        var subjectIndex = self._buildSubjectIndex(triples);
        self._labelsMap = subjectIndex.labelsMap || {};
        var rootAxioms = self._findAllRootAxioms(subjectIndex);

        if (!rootAxioms || rootAxioms.length === 0) {
            throw new Error("No root axiom subject found in triples");
        }

        var bySubject = {};
        rootAxioms.forEach(function (axiom) {
            if (!bySubject[axiom.uri]) {
                bySubject[axiom.uri] = {};
            }
            var keyword = AXIOM_KEYWORDS[axiom.axiomPredicate] || "SubClassOf:";
            if (!bySubject[axiom.uri][keyword]) {
                bySubject[axiom.uri][keyword] = [];
            }
            var expression = self._resolveNode(axiom.targetNode, subjectIndex, new Set());
            bySubject[axiom.uri][keyword].push(self._renderExpression(expression));
        });

        var labelsMap = self._labelsMap;
        var lines = [];
        for (var uri in bySubject) {
            var classLabel = labelsMap[uri] || "<" + uri + ">";
            lines.push("Class: " + classLabel);
            var sections = bySubject[uri];
            for (var keyword in sections) {
                lines.push("    " + keyword);
                var expressions = sections[keyword];
                for (var i = 0; i < expressions.length; i++) {
                    var separator = i < expressions.length - 1 ? "," : "";
                    lines.push("        " + expressions[i] + separator);
                }
            }
        }
        return lines.join("\n");
    };

    self._buildSubjectIndex = function (triples) {
        var index = new Map();
        var labelsMap = {};
        triples.forEach(function (triple) {
            var s = triple.subject;
            var p = triple.predicate;
            var o = triple.object;
            if (!s || !p || !o) {
                return;
            }
            if (triple.sLabel) {
                labelsMap[s] = triple.sLabel;
            }
            if (triple.pLabel) {
                labelsMap[p] = triple.pLabel;
            }
            if (triple.oLabel) {
                labelsMap[o] = triple.oLabel;
            }
            if (!index.has(s)) {
                index.set(s, []);
            }
            index.get(s).push({ predicate: p, object: o });
        });
        index.labelsMap = labelsMap;
        return index;
    };

    self._findAllRootAxioms = function (subjectIndex) {
        var axiomPredicates = Object.keys(AXIOM_KEYWORDS);
        var results = [];

        for (var [subjectId, predicates] of subjectIndex) {
            if (subjectId.indexOf("_:") === 0) {
                continue;
            }
            for (var i = 0; i < predicates.length; i++) {
                if (axiomPredicates.indexOf(predicates[i].predicate) > -1) {
                    results.push({
                        uri: subjectId,
                        axiomPredicate: predicates[i].predicate,
                        targetNode: predicates[i].object,
                    });
                }
            }
        }
        return results;
    };

    self._resolveNode = function (nodeId, subjectIndex, visited) {
        if (!nodeId || nodeId === RDF + "nil") {
            return null;
        }

        if (visited.has(nodeId)) {
            return { type: "namedClass", uri: nodeId };
        }

        if (nodeId.indexOf("_:") !== 0 && !subjectIndex.has(nodeId)) {
            return { type: "namedClass", uri: nodeId };
        }

        var predicates = subjectIndex.get(nodeId);
        if (!predicates) {
            return { type: "namedClass", uri: nodeId };
        }

        visited.add(nodeId);

        var typeTriple = predicates.find(function (p) {
            return p.predicate === RDF + "type";
        });
        var nodeType = typeTriple ? typeTriple.object : null;

        if (nodeType === OWL + "Restriction") {
            return self._resolveRestriction(predicates, subjectIndex, visited);
        }

        var intersectionOf = predicates.find(function (p) {
            return p.predicate === OWL + "intersectionOf";
        });
        if (intersectionOf) {
            var operands = self._resolveList(intersectionOf.object, subjectIndex, visited);
            return { type: "intersection", operands: operands };
        }

        var unionOf = predicates.find(function (p) {
            return p.predicate === OWL + "unionOf";
        });
        if (unionOf) {
            var operands = self._resolveList(unionOf.object, subjectIndex, visited);
            return { type: "union", operands: operands };
        }

        var complementOf = predicates.find(function (p) {
            return p.predicate === OWL + "complementOf";
        });
        if (complementOf) {
            var operand = self._resolveNode(complementOf.object, subjectIndex, visited);
            return { type: "complement", operand: operand };
        }

        var inverseOf = predicates.find(function (p) {
            return p.predicate === OWL + "inverseOf";
        });
        if (inverseOf) {
            return { type: "inverseOf", operand: { type: "namedClass", uri: inverseOf.object } };
        }

        var members = predicates.find(function (p) {
            return p.predicate === OWL + "members";
        });
        if (members) {
            var memberList = self._resolveList(members.object, subjectIndex, visited);
            return { type: "disjointClasses", operands: memberList };
        }

        if (nodeId.indexOf("_:") === 0) {
            var firstTriple = predicates.find(function (p) {
                return p.predicate === RDF + "first";
            });
            if (firstTriple) {
                var items = self._resolveList(nodeId, subjectIndex, visited);
                if (items.length > 0) {
                    return { type: "intersection", operands: items };
                }
            }
        }

        return { type: "namedClass", uri: nodeId };
    };

    self._resolveRestriction = function (predicates, subjectIndex, visited) {
        var onPropertyTriple = predicates.find(function (p) {
            return p.predicate === OWL + "onProperty";
        });
        var property = onPropertyTriple ? onPropertyTriple.object : "?";

        var propertyPredicates = subjectIndex.get(property);
        var resolvedProperty = property;
        if (propertyPredicates) {
            var inverseTriple = propertyPredicates.find(function (p) {
                return p.predicate === OWL + "inverseOf";
            });
            if (inverseTriple) {
                resolvedProperty = { type: "inverseOf", operand: { type: "namedClass", uri: inverseTriple.object } };
            }
        }

        for (var predUri in RESTRICTION_KEYWORDS) {
            var match = predicates.find(function (p) {
                return p.predicate === predUri;
            });
            if (match) {
                var filler = self._resolveNode(match.object, subjectIndex, visited);
                return {
                    type: "restriction",
                    property: resolvedProperty,
                    restrictionType: RESTRICTION_KEYWORDS[predUri],
                    filler: filler,
                };
            }
        }

        for (var cardUri in CARDINALITY_KEYWORDS) {
            var match = predicates.find(function (p) {
                return p.predicate === cardUri;
            });
            if (match) {
                var cardValue = self._parseLiteral(match.object);
                var onClassTriple = predicates.find(function (p) {
                    return p.predicate === OWL + "onClass";
                });
                var onClass = onClassTriple ? self._resolveNode(onClassTriple.object, subjectIndex, visited) : null;
                return {
                    type: "restriction",
                    property: resolvedProperty,
                    restrictionType: CARDINALITY_KEYWORDS[cardUri],
                    cardinality: cardValue,
                    filler: onClass,
                };
            }
        }

        return {
            type: "restriction",
            property: resolvedProperty,
            restrictionType: "some",
            filler: { type: "namedClass", uri: OWL + "Thing" },
        };
    };

    self._resolveList = function (listNodeId, subjectIndex, visited) {
        var items = [];
        var current = listNodeId;
        var listVisited = new Set();

        while (current && current !== RDF + "nil") {
            if (listVisited.has(current)) {
                break;
            }
            listVisited.add(current);

            var predicates = subjectIndex.get(current);
            if (!predicates) {
                break;
            }

            var firstTriple = predicates.find(function (p) {
                return p.predicate === RDF + "first";
            });
            if (firstTriple) {
                var resolved = self._resolveNode(firstTriple.object, subjectIndex, new Set(visited));
                if (resolved) {
                    items.push(resolved);
                }
            }

            var restTriple = predicates.find(function (p) {
                return p.predicate === RDF + "rest";
            });
            current = restTriple ? restTriple.object : null;
        }

        return items;
    };

    self._formatUri = function (uri) {
        var labelsMap = self._labelsMap;
        if (labelsMap && labelsMap[uri]) {
            return labelsMap[uri];
        }
        return "<" + uri + ">";
    };

    self._isComplex = function (expr) {
        return expr.type !== "namedClass" && expr.type !== "inverseOf";
    };

    self._wrapIfComplex = function (expr) {
        var rendered = self._renderExpression(expr);
        if (self._isComplex(expr)) {
            return "(" + rendered + ")";
        }
        return rendered;
    };

    self._renderExpression = function (expr) {
        if (!expr) {
            return "Thing";
        }

        switch (expr.type) {
            case "namedClass":
                return self._formatUri(expr.uri);

            case "inverseOf":
                return "inverse(" + self._renderExpression(expr.operand) + ")";

            case "restriction": {
                var propStr = typeof expr.property === "string" ? self._formatUri(expr.property) : self._renderExpression(expr.property);
                var fillerStr = self._wrapIfComplex(expr.filler);

                if (expr.cardinality !== undefined) {
                    var result = propStr + " " + expr.restrictionType + " " + expr.cardinality;
                    if (expr.filler) {
                        result += " " + fillerStr;
                    }
                    return result;
                }

                return propStr + " " + expr.restrictionType + " " + fillerStr;
            }

            case "intersection": {
                var parts = expr.operands.map(function (op) {
                    return self._wrapIfComplex(op);
                });
                return parts.join(" and ");
            }

            case "union": {
                var parts = expr.operands.map(function (op) {
                    return self._wrapIfComplex(op);
                });
                return parts.join(" or ");
            }

            case "complement":
                return "not " + self._renderExpression(expr.operand);

            case "disjointClasses": {
                var parts = expr.operands.map(function (op) {
                    return self._renderExpression(op);
                });
                return "DisjointClasses: " + parts.join(", ");
            }

            default:
                return expr.uri ? self._formatUri(expr.uri) : "unknown";
        }
    };

    self._parseLiteral = function (str) {
        if (!str) {
            return "0";
        }
        var caretIndex = str.indexOf("^^");
        if (caretIndex > -1) {
            var val = str.substring(0, caretIndex).replace(/"/g, "");
            return val;
        }
        return str.replace(/"/g, "");
    };

    return self;
})();

export default TriplesToManchester;

window.TriplesToManchester = TriplesToManchester;
