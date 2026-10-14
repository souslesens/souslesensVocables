import { Parser } from 'n3';

/** RDF namespaces used by the converter. */
export const NS = Object.freeze({
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  sh: 'http://www.w3.org/ns/shacl#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
});
const key = t => JSON.stringify([t.termType, t.value, t.language ?? '', t.datatype?.value ?? '']);
const is = (t, iri) => t?.termType === 'NamedNode' && t.value === iri;
function blankNode(value) {
  if (typeof value !== 'string') throw new TypeError('Blank-node label must be a string.');
  const label = value.startsWith('_:') ? value.slice(2) : value;
  if (!label) throw new TypeError('Blank-node label is empty.');
  return { termType: 'BlankNode', value: label };
}
const normalizeBlankNode = t => t?.termType === 'BlankNode' ? blankNode(t.value) : t;
const restrictionKinds = [
  'allValuesFrom', 'someValuesFrom', 'hasValue', 'cardinality',
  'minCardinality', 'maxCardinality', 'qualifiedCardinality',
  'minQualifiedCardinality', 'maxQualifiedCardinality', 'hasSelf',
];
const formats = new Map([
  ['turtle', 'Turtle'], ['text/turtle', 'Turtle'],
  ['n-triples', 'N-Triples'], ['application/n-triples', 'N-Triples'],
  ['trig', 'TriG'], ['application/trig', 'TriG'],
  ['n-quads', 'N-Quads'], ['application/n-quads', 'N-Quads'],
]);

/** Read SELECT triple results or restriction-detail rows as RDF/JS triples.
 * Variable names may be changed with { variables: { subject, predicate, object } }.
 * Blank-node labels must come from a single result set.
 */
export function sparqlResultsToQuads(results, { variables, layout = 'auto' } = {}) {
  if (typeof results === 'string') results = JSON.parse(results);
  const rows = Array.isArray(results) ? results : results?.results?.bindings;
  if (!Array.isArray(rows) || (!Array.isArray(results) &&
      (!Array.isArray(results?.head?.vars) || Object.hasOwn(results, 'boolean')))) {
    throw new TypeError('Expected SPARQL SELECT JSON with head.vars and results.bindings, or a bindings array.');
  }
  const declared = Array.isArray(results) ? Object.keys(rows[0] ?? {}) : results.head.vars;
  if (!['auto', 'triples', 'restriction-rows'].includes(layout)) throw new TypeError(`Unknown SPARQL layout: ${layout}`);
  const restrictionColumns = ['subject', 'node', 'prop', 'constraintType', 'value'];
  const restrictionRows = layout === 'restriction-rows' ||
      (layout === 'auto' && !variables && restrictionColumns.every(v => declared.includes(v)));
  const longNames = ['subject', 'predicate', 'object'].every(v => declared.includes(v));
  const names = variables ?? (longNames ?
      { subject: 'subject', predicate: 'predicate', object: 'object' } :
      { subject: 's', predicate: 'p', object: 'o' });
  const columns = ['subject', 'predicate', 'object'].map(role => {
    if (typeof names[role] !== 'string' || !names[role].replace(/^\?/, '')) {
      throw new TypeError(`Missing SPARQL variable name for ${role}.`);
    }
    return names[role].replace(/^\?/, '');
  });
  if (new Set(columns).size !== 3) throw new TypeError('Triple variables must be distinct.');
  const requiredColumns = restrictionRows ? restrictionColumns : columns;
  if (!Array.isArray(results) && requiredColumns.some(v => !declared.includes(v))) {
    throw new TypeError(`SPARQL results must declare variables: ${requiredColumns.join(', ')}.`);
  }
  const named = value => ({ termType: 'NamedNode', value });
  function term(binding, row, column) {
    const fail = message => { throw new TypeError(`SPARQL row ${row + 1}, ?${column}: ${message}`); };
    // Some clients expose blank nodes as strings or as uri bindings with _: IDs.
    if (typeof binding === 'string' && binding.startsWith('_:')) return blankNode(binding);
    if (!binding || typeof binding !== 'object' || typeof binding.value !== 'string') {
      fail('missing or invalid RDF term binding');
    }
    if (Object.hasOwn(binding, 'its:dir')) fail('directional literals are unsupported');
    if (binding.type === 'uri' || binding.type === 'bnode') {
      if (Object.hasOwn(binding, 'datatype') || Object.hasOwn(binding, 'xml:lang')) fail('resource has literal metadata');
      if (binding.type === 'bnode' || binding.value.startsWith('_:')) return blankNode(binding.value);
      return named(binding.value);
    }
    if (!['literal', 'typed-literal'].includes(binding.type)) fail(`unsupported binding type ${binding.type}`);
    const language = binding['xml:lang'];
    if (language !== undefined && (typeof language !== 'string' || !language)) fail('invalid language tag');
    if (binding.datatype !== undefined && typeof binding.datatype !== 'string') fail('invalid datatype');
    if (language !== undefined && binding.datatype !== undefined) fail('literal has both language and datatype');
    if (binding.type === 'typed-literal' && !binding.datatype) fail('typed literal needs a datatype');
    return { termType: 'Literal', value: binding.value, language: language ?? '',
      datatype: named(language ? NS.rdf + 'langString' : binding.datatype ?? NS.xsd + 'string') };
  }
  if (restrictionRows) {
    const triples = [];
    const add = (subject, predicate, object) => triples.push({ subject, predicate: named(predicate), object });
    const allowedConstraints = [...restrictionKinds, 'onClass', 'onDataRange'].map(k => NS.owl + k);
    const allowedCardinalities = restrictionKinds.filter(k => k.toLowerCase().includes('cardinality')).map(k => NS.owl + k);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new TypeError(`Invalid SPARQL row ${i + 1}.`);
      const [subject, node, prop, constraintType, value] = restrictionColumns.map(v => term(row[v], i, v));
      if (subject.termType !== 'NamedNode' || !['NamedNode', 'BlankNode'].includes(node.termType) ||
          !['NamedNode', 'BlankNode'].includes(prop.termType) || constraintType.termType !== 'NamedNode' ||
          !allowedConstraints.includes(constraintType.value)) {
        throw new TypeError(`SPARQL row ${i + 1}: invalid subject, restriction node, property, or constraintType.`);
      }
      add(subject, NS.rdfs + 'subClassOf', node);
      add(node, NS.rdf + 'type', named(NS.owl + 'Restriction'));
      add(node, NS.owl + 'onProperty', prop);
      add(node, constraintType.value, value);
      const hasCardinalityType = Object.hasOwn(row, 'cardinalityType');
      const hasCardinalityValue = Object.hasOwn(row, 'cardinalityValue');
      if (hasCardinalityType !== hasCardinalityValue) {
        throw new TypeError(`SPARQL row ${i + 1}: cardinalityType and cardinalityValue must be bound together.`);
      }
      if (hasCardinalityType) {
        const type = term(row.cardinalityType, i, 'cardinalityType');
        const cardinality = term(row.cardinalityValue, i, 'cardinalityValue');
        if (type.termType !== 'NamedNode' || !allowedCardinalities.includes(type.value)) {
          throw new TypeError(`SPARQL row ${i + 1}: unsupported cardinalityType.`);
        }
        add(node, type.value, cardinality);
      }
    }
    return triples;
  }
  return rows.map((row, i) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new TypeError(`Invalid SPARQL row ${i + 1}.`);
    const [subject, predicate, object] = columns.map(v => term(row[v], i, v));
    if (!['NamedNode', 'BlankNode'].includes(subject.termType) || predicate.termType !== 'NamedNode') {
      throw new TypeError(`SPARQL row ${i + 1}: subject must be a resource and predicate must be an IRI.`);
    }
    return { subject, predicate, object };
  });
}

/**
 * Convert OWL restriction triples into SHACL Core validation shapes.
 * @param {string|Iterable<object>|object} rdf RDF text, triples, or SPARQL SELECT JSON.
 * @param {{format?: string, baseIRI?: string, variables?: object, layout?: string}} options
 * Default text format: Turtle. SPARQL JSON objects and binding arrays are detected.
 * @returns {{turtle:string, restrictionCount:number, propertyShapeCount:number, shapeCount:number,
 * warnings:string[], shapes:Array<{targetClass:object,nodeShape:string}>}}
 * Parsing and conversion are synchronous. Named graphs are merged.
 * This is a closed-world validation policy, not OWL entailment or sh:rule.
 */
export function transformOwlRestrictions(rdf, { format = 'Turtle', baseIRI, variables, layout } = {}) {
  let quads = rdf;
  const sparqlFormat = ['sparql-json', 'application/sparql-results+json'].includes(String(format).toLowerCase());
  const sparqlObject = rdf && typeof rdf === 'object' && !rdf[Symbol.iterator];
  const bindingArray = Array.isArray(rdf) && rdf.length > 0 && !rdf[0]?.subject?.termType;
  if (sparqlFormat || sparqlObject || bindingArray) {
    quads = sparqlResultsToQuads(rdf, { variables, layout });
  } else if (typeof rdf === 'string') {
    const selected = formats.get(String(format).toLowerCase());
    if (!selected) throw new TypeError(`Unsupported RDF format: ${format}. Use Turtle, N-Triples, TriG or N-Quads.`);
    quads = new Parser({ format: selected, ...(baseIRI === undefined ? {} : { baseIRI }) }).parse(rdf);
  }
  if (!quads?.[Symbol.iterator]) throw new TypeError('Expected RDF text or an RDF/JS iterable of triples or quads.');
  const index = new Map(), terms = new Map(), blankLabels = new Map();
  let serial = 0;
  const fresh = () => `_:shape${++serial}`;
  const iri = value => {
    if (typeof value !== 'string' || !/^[a-z][a-z0-9+.-]*:/i.test(value) ||
        /[\u0000-\u0020<>"{}|^`\\]/u.test(value)) throw new TypeError(`Invalid absolute IRI: ${value}`);
    return `<${value}>`;
  };
  function render(t) {
    if (!t || typeof t.value !== 'string') throw new TypeError('Invalid RDF/JS term.');
    if (t.termType === 'NamedNode') return iri(t.value);
    if (t.termType === 'BlankNode') {
      if (!blankLabels.has(t.value)) blankLabels.set(t.value, `_:input${blankLabels.size + 1}`);
      return blankLabels.get(t.value);
    }
    if (t.termType === 'Literal') {
      const text = JSON.stringify(t.value);
      if (t.language) {
        if (!/^[a-z]+(?:-[a-z0-9]+)*$/i.test(t.language)) throw new TypeError('Invalid language tag.');
        return `${text}@${t.language}`;
      }
      if (t.datatype?.termType !== 'NamedNode') throw new TypeError('Literal needs a datatype.');
      return `${text}^^${iri(t.datatype.value)}`;
    }
    throw new TypeError(`Unsupported RDF term type: ${t.termType}`);
  }
  for (let q of quads) {
    if (!q || !['NamedNode', 'BlankNode'].includes(q.subject?.termType) ||
        q.predicate?.termType !== 'NamedNode') throw new TypeError('Invalid RDF triple.');
    q = { subject: normalizeBlankNode(q.subject), predicate: q.predicate, object: normalizeBlankNode(q.object) };
    render(q.subject); render(q.predicate); render(q.object);
    const s = key(q.subject);
    terms.set(s, q.subject);
    if (!index.has(s)) index.set(s, new Map());
    const predicates = index.get(s);
    if (!predicates.has(q.predicate.value)) predicates.set(q.predicate.value, new Map());
    predicates.get(q.predicate.value).set(key(q.object), q.object);
  }
  const values = (s, p) => [...(index.get(key(s))?.get(p)?.values() ?? [])];
  const hasType = (s, type) => values(s, NS.rdf + 'type').some(t => is(t, type));
  function one(s, p, required = true) {
    const v = values(s, p);
    if (v.length > 1 || (required && v.length !== 1)) throw new Error(`${render(s)} must have exactly one <${p}> value.`);
    return v[0];
  }
  function filler(t, data = false) {
    if (t.termType !== 'NamedNode') throw new Error('Anonymous class/data-range fillers are unsupported.');
    if (is(t, NS.owl + 'Thing')) return 'sh:nodeKind sh:BlankNodeOrIRI';
    if (is(t, NS.owl + 'Nothing')) return 'sh:in ()';
    if (is(t, NS.rdfs + 'Literal')) return 'sh:nodeKind sh:Literal';
    const datatype = data || t.value.startsWith(NS.xsd) ||
        ['XMLLiteral', 'langString', 'PlainLiteral', 'HTML', 'JSON'].some(name => is(t, NS.rdf + name)) ||
        hasType(t, NS.rdfs + 'Datatype');
    return `${datatype ? 'sh:datatype' : 'sh:class'} ${render(t)}`;
  }
  function count(t) {
    const integerTypes = ['integer', 'nonNegativeInteger', 'positiveInteger', 'long', 'int',
      'short', 'byte', 'unsignedLong', 'unsignedInt', 'unsignedShort', 'unsignedByte'];
    if (t.termType !== 'Literal' || t.language ||
        !integerTypes.some(type => is(t.datatype, NS.xsd + type)) ||
        !/^\+?\d+$/.test(t.value.trim())) throw new Error('Cardinality must be a non-negative integer literal.');
    return BigInt(t.value.trim()).toString();
  }
  const restrictions = new Map(), output = [];
  for (const s of terms.values()) {
    if (!hasType(s, NS.owl + 'Restriction')) continue;
    const p = one(s, NS.owl + 'onProperty');
    let path;
    if (p.termType === 'NamedNode') path = render(p);
    else if (p.termType === 'BlankNode') {
      const inverse = one(p, NS.owl + 'inverseOf');
      if (inverse.termType !== 'NamedNode') throw new Error('Inverse path must reference a named property.');
      path = `[ sh:inversePath ${render(inverse)} ]`;
    } else throw new Error('owl:onProperty must reference a property.');
    const kinds = restrictionKinds.filter(k => values(s, NS.owl + k).length);
    if (!kinds.length) throw new Error(`${render(s)} needs at least one supported restriction predicate.`);
    const onClass = one(s, NS.owl + 'onClass', false), onDataRange = one(s, NS.owl + 'onDataRange', false);
    const isQualified = kind => kind.includes('Qualified') || kind === 'qualifiedCardinality';
    if (kinds.some(isQualified) ? Boolean(onClass) === Boolean(onDataRange) : Boolean(onClass || onDataRange)) {
      throw new Error('Qualified cardinality needs exactly one owl:onClass or owl:onDataRange; other restrictions need neither.');
    }
    const dataProperty = hasType(p, NS.owl + 'DatatypeProperty');
    const propertyShapes = [];
    for (const kind of kinds) {
      const v = one(s, NS.owl + kind), qualified = isQualified(kind);
      if (kind === 'hasSelf') throw new Error('owl:hasSelf requires SHACL-SPARQL and is unsupported.');
      let constraint;
      if (kind === 'allValuesFrom') constraint = filler(v, dataProperty);
      else if (kind === 'someValuesFrom') {
        constraint = `sh:qualifiedValueShape [ ${filler(v, dataProperty)} ] ; sh:qualifiedMinCount 1`;
      } else if (kind === 'hasValue') {
        if (v.termType === 'BlankNode') throw new Error('Blank-node owl:hasValue cannot preserve identity in a separate shapes graph.');
        constraint = `sh:hasValue ${render(v)}`;
      } else {
        const n = count(v), min = kind.toLowerCase().startsWith('min'), max = kind.toLowerCase().startsWith('max');
        const pieces = [];
        if (qualified) pieces.push(`sh:qualifiedValueShape [ ${filler(onClass ?? onDataRange, Boolean(onDataRange))} ]`);
        if (!max) pieces.push(`sh:${qualified ? 'qualifiedMinCount' : 'minCount'} ${n}`);
        if (!min) pieces.push(`sh:${qualified ? 'qualifiedMaxCount' : 'maxCount'} ${n}`);
        constraint = pieces.join(' ; ');
      }
      const shape = fresh();
      propertyShapes.push(shape);
      output.push(`${shape} a sh:PropertyShape ; sh:path ${path} ; ${constraint} .`);
    }
    restrictions.set(key(s), propertyShapes);
  }
  // Necessary superclass links only; never impose every member of a union.
  const parents = new Map();
  function edge(a, b) {
    const k = key(a);
    if (!parents.has(k)) parents.set(k, new Map());
    parents.get(k).set(key(b), b);
  }
  function list(head) {
    const result = [], seen = new Set();
    while (!is(head, NS.rdf + 'nil')) {
      if (!['NamedNode', 'BlankNode'].includes(head.termType) || seen.has(key(head))) throw new Error('Invalid or cyclic owl:intersectionOf list.');
      seen.add(key(head));
      result.push(one(head, NS.rdf + 'first'));
      head = one(head, NS.rdf + 'rest');
    }
    return result;
  }
  for (const s of terms.values()) {
    for (const p of values(s, NS.rdfs + 'subClassOf')) edge(s, p);
    for (const p of values(s, NS.owl + 'equivalentClass')) { edge(s, p); edge(p, s); }
    const intersection = one(s, NS.owl + 'intersectionOf', false);
    if (intersection) for (const p of list(intersection)) edge(s, p);
  }
  const shapes = [], used = new Set(), candidates = new Map(terms);
  for (const edges of parents.values()) for (const t of edges.values()) candidates.set(key(t), t);
  for (const target of candidates.values()) {
    if (target.termType !== 'NamedNode') continue;
    const seen = new Set(), found = new Set(), stack = [target];
    while (stack.length) {
      const t = stack.pop(), k = key(t);
      if (seen.has(k)) continue;
      seen.add(k);
      if (restrictions.has(k)) {
        for (const shape of restrictions.get(k)) found.add(shape);
        used.add(k);
      }
      stack.push(...(parents.get(k)?.values() ?? []));
    }
    if (!found.size) continue;
    const nodeShape = fresh();
    output.push(`${nodeShape} a sh:NodeShape ; sh:targetClass ${render(target)} ; sh:property ${[...found].join(', ')} .`);
    shapes.push({ targetClass: target, nodeShape });
  }
  const warnings = [...restrictions.keys()].filter(k => !used.has(k)).map(k =>
      `Restriction ${render(terms.get(k))} has no named class target; its property shape is emitted without a target.`);
  return { turtle: `@prefix sh: <${NS.sh}> .\n\n${output.join('\n')}\n`,
    restrictionCount: restrictions.size, propertyShapeCount: [...restrictions.values()].reduce((n, v) => n + v.length, 0),
    shapeCount: shapes.length, warnings, shapes };
}

export default transformOwlRestrictions;


var results={
  "head": {
    "link": [],
    "vars": [
      "subject",
      "node",
      "prop",
      "propLabel",
      "subjectLabel",
      "constraintType",
      "value",
      "cardinalityType",
      "cardinalityValue",
      "valueLabel"
    ]
  },
  "results": {
    "distinct": false,
    "ordered": true,
    "bindings": [
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment"
        },
        "node": {
          "type": "uri",
          "value": "_:b1372f55a2e"
        },
        "prop": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/madeBy"
        },
        "propLabel": {
          "type": "literal",
          "value": "madeBy"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "equipment"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/supplier"
        },
        "valueLabel": {
          "type": "literal",
          "value": "supplier"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/property"
        },
        "node": {
          "type": "uri",
          "value": "_:bd2cbd3b7f6"
        },
        "prop": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/classified_by"
        },
        "propLabel": {
          "type": "literal",
          "value": "classified by"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "property"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/property_category"
        },
        "valueLabel": {
          "type": "literal",
          "value": "property category"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/tag_class"
        },
        "node": {
          "type": "uri",
          "value": "_:b56aafd6057"
        },
        "prop": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/requires"
        },
        "propLabel": {
          "type": "literal",
          "value": "requires"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "tag class"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/document_type"
        },
        "valueLabel": {
          "type": "literal",
          "value": "document type"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment_class"
        },
        "node": {
          "type": "uri",
          "value": "_:b8b785339c5"
        },
        "prop": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/requires"
        },
        "propLabel": {
          "type": "literal",
          "value": "requires"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "equipment class"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/document_type"
        },
        "valueLabel": {
          "type": "literal",
          "value": "document type"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/document_type"
        },
        "node": {
          "type": "uri",
          "value": "_:b9814e18868"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000084"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "document type"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/discipline"
        },
        "valueLabel": {
          "type": "literal",
          "value": "discipline"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/operating"
        },
        "node": {
          "type": "uri",
          "value": "_:ba24ee59bf2"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000167"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "operating"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment"
        },
        "valueLabel": {
          "type": "literal",
          "value": "equipment"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/manufacturing"
        },
        "node": {
          "type": "uri",
          "value": "_:bd0318e391f"
        },
        "prop": {
          "type": "uri",
          "value": "https://spec.industrialontologies.org/ontology/construct/hasOutput"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "manufacturing"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment"
        },
        "valueLabel": {
          "type": "literal",
          "value": "equipment"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/plant_construction"
        },
        "node": {
          "type": "uri",
          "value": "_:bdc5ac3270e"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000167"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "plant construction"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment"
        },
        "valueLabel": {
          "type": "literal",
          "value": "equipment"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/model_part"
        },
        "node": {
          "type": "uri",
          "value": "_:b0a3ee045ad"
        },
        "prop": {
          "type": "uri",
          "value": "https://spec.industrialontologies.org/ontology/construct/denotes"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "model part"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment_class"
        },
        "valueLabel": {
          "type": "literal",
          "value": "equipment class"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/manufacturing"
        },
        "node": {
          "type": "uri",
          "value": "_:bc712822356"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000062"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "manufacturing"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/procurement"
        },
        "valueLabel": {
          "type": "literal",
          "value": "procurement"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/tag_requirement"
        },
        "node": {
          "type": "uri",
          "value": "_:b8ebe6f7753"
        },
        "prop": {
          "type": "uri",
          "value": "https://spec.industrialontologies.org/ontology/construct/hasValueExpressionAtSomeTime"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "tag requirement"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/property_value"
        },
        "valueLabel": {
          "type": "literal",
          "value": "property value"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/manufacturing"
        },
        "node": {
          "type": "uri",
          "value": "_:b17a9cf7c94"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000167"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "manufacturing"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/supplier"
        },
        "valueLabel": {
          "type": "literal",
          "value": "supplier"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment"
        },
        "node": {
          "type": "uri",
          "value": "_:b580343992b"
        },
        "prop": {
          "type": "uri",
          "value": "https://spec.industrialontologies.org/ontology/construct/designatedBy"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "equipment"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/tag"
        },
        "valueLabel": {
          "type": "literal",
          "value": "tag"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/tag_requirement"
        },
        "node": {
          "type": "uri",
          "value": "_:b61294c04e0"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000110"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "tag requirement"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/tag"
        },
        "valueLabel": {
          "type": "literal",
          "value": "tag"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/property_value"
        },
        "node": {
          "type": "uri",
          "value": "_:bc2a85c5aba"
        },
        "prop": {
          "type": "uri",
          "value": "https://spec.industrialontologies.org/ontology/construct/denotes"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "property value"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/tag_class_property"
        },
        "valueLabel": {
          "type": "literal",
          "value": "tag class property"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/tag_requirement"
        },
        "node": {
          "type": "uri",
          "value": "_:b7c82f9cb53"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000178"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "tag requirement"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/tag_class_property"
        },
        "valueLabel": {
          "type": "literal",
          "value": "tag class property"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/tag_class"
        },
        "node": {
          "type": "uri",
          "value": "_:be3bc33d31f"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000220"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "tag class"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/tag_class_property"
        },
        "valueLabel": {
          "type": "literal",
          "value": "tag class property"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/model_part"
        },
        "node": {
          "type": "uri",
          "value": "_:bce1f8ed2a4"
        },
        "prop": {
          "type": "uri",
          "value": "https://spec.industrialontologies.org/ontology/construct/satisfiesRequirement"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "model part"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/tag_requirement"
        },
        "valueLabel": {
          "type": "literal",
          "value": "tag requirement"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/property_value"
        },
        "node": {
          "type": "uri",
          "value": "_:b416db44521"
        },
        "prop": {
          "type": "uri",
          "value": "https://spec.industrialontologies.org/ontology/construct/denotedBy"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "property value"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/unit_of_dimension"
        },
        "valueLabel": {
          "type": "literal",
          "value": "unit of dimension"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment_class"
        },
        "node": {
          "type": "uri",
          "value": "_:b9513b06f27"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000220"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "equipment class"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment_class_property"
        },
        "valueLabel": {
          "type": "literal",
          "value": "equipment class property"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment_quality"
        },
        "node": {
          "type": "uri",
          "value": "_:b8300ff9da3"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000059"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "equipment quality"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment_class_property"
        },
        "valueLabel": {
          "type": "literal",
          "value": "equipment class property"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/model_part"
        },
        "node": {
          "type": "uri",
          "value": "_:b4d67847eff"
        },
        "prop": {
          "type": "uri",
          "value": "https://spec.industrialontologies.org/ontology/construct/denotes"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "model part"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment_class_property"
        },
        "valueLabel": {
          "type": "literal",
          "value": "equipment class property"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment"
        },
        "node": {
          "type": "uri",
          "value": "_:b37328fb17b"
        },
        "prop": {
          "type": "uri",
          "value": "https://spec.industrialontologies.org/ontology/construct/hasQuality"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "equipment"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment_quality"
        },
        "valueLabel": {
          "type": "literal",
          "value": "equipment quality"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/plant_construction"
        },
        "node": {
          "type": "uri",
          "value": "_:b08b24a7d94"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000062"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "plant construction"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/manufacturing"
        },
        "valueLabel": {
          "type": "literal",
          "value": "manufacturing"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/property_value"
        },
        "node": {
          "type": "uri",
          "value": "_:b355fc471d0"
        },
        "prop": {
          "type": "uri",
          "value": "https://spec.industrialontologies.org/ontology/construct/prescribedBy"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "property value"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/picklist"
        },
        "valueLabel": {
          "type": "literal",
          "value": "picklist"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/equipment"
        },
        "node": {
          "type": "uri",
          "value": "_:bbf36c4bd41"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000164"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "equipment"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/model_part"
        },
        "valueLabel": {
          "type": "literal",
          "value": "model part"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/supplier"
        },
        "node": {
          "type": "uri",
          "value": "_:b9fa3274543"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000101"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "supplier"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/model_part"
        },
        "valueLabel": {
          "type": "literal",
          "value": "model part"
        }
      },
      {
        "subject": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/operating"
        },
        "node": {
          "type": "uri",
          "value": "_:b2d62f838f4"
        },
        "prop": {
          "type": "uri",
          "value": "http://purl.obolibrary.org/obo/BFO_0000062"
        },
        "subjectLabel": {
          "type": "literal",
          "value": "operating"
        },
        "constraintType": {
          "type": "uri",
          "value": "http://www.w3.org/2002/07/owl#someValuesFrom"
        },
        "value": {
          "type": "uri",
          "value": "https://jip36-cfihos/rdl-iof/plant_construction"
        },
        "valueLabel": {
          "type": "literal",
          "value": "plant construction"
        }
      }
    ]
  }
}


const { turtle, warnings } = transformOwlRestrictions(results);

console.log()




