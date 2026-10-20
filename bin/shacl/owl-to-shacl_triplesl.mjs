import { Parser } from 'n3';
import { createHash, randomUUID } from 'node:crypto';

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

function prefixDeclarations(prefixes = {}) {
  if (!prefixes || typeof prefixes !== 'object' || Array.isArray(prefixes)) throw new TypeError('prefixes must be a namespace map.');
  return Object.entries({ ...NS, ...prefixes }).map(([prefix, namespace]) => {
    if (!/^(?:[A-Za-z][A-Za-z0-9_-]*)?$/.test(prefix) || typeof namespace !== 'string' ||
        !/^[a-z][a-z0-9+.-]*:/i.test(namespace) || /[\u0000-\u0020<>"{}|^`\\]/u.test(namespace)) {
      throw new TypeError(`Invalid namespace declaration: ${prefix}`);
    }
    return `@prefix ${prefix}: <${namespace}> .`;
  }).join('\n');
}

// Normalize client triple strings without modifying literal text or IRI contents.
function normalizeTripleEntry(text) {
  let result = '', i = 0;
  while (i < text.length) {
    const start = i, ch = text[i];
    if (ch === '"' || ch === "'") {
      const delimiter = text.slice(i, i + 3) === ch.repeat(3) ? ch.repeat(3) : ch;
      i += delimiter.length;
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text.startsWith(delimiter, i)) { i += delimiter.length; break; }
        i++;
      }
      result += text.slice(start, i);
    } else if (ch === '<') {
      const end = text.indexOf('>', i + 1);
      if (end === -1) { result += text.slice(i); break; }
      const token = text.slice(i, end + 1);
      result += /^<_:[^\s<>]+>$/.test(token) ? token.slice(1, -1) : token;
      i = end + 1;
    } else if (ch === '#') {
      while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i++;
    } else {
      result += ch;
      i++;
    }
  }
  result = result.trim();
  return !result || result.endsWith('.') ? result : result + ' .';
}

/** Read string-valued triples, SELECT triple results or restriction-detail rows.
 * Variable names may be changed with { variables: { subject, predicate, object } }.
 * Blank-node labels must come from a single result set.
 */
export function sparqlResultsToQuads(results, { variables, layout = 'auto', prefixes = {} } = {}) {
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
  const stringTerms = new Map();
  let declarations;
  function stringTerm(text) {
    text = text.trim();
    if (stringTerms.has(text)) return stringTerms.get(text);
    // The client's <_:id> notation is not an IRI: it denotes a blank node.
    const blank = text.startsWith('<_:') && text.endsWith('>') ? text.slice(1, -1) : text;
    if (blank.startsWith('_:')) return blankNode(blank);
    if (declarations === undefined) declarations = prefixDeclarations(prefixes);
    // Parse one Turtle term so typed literals, escaping and prefixes retain
    // their RDF meaning. Extra statements and property lists are rejected.
    const parsed = new Parser({ format: 'Turtle' }).parse(
        `${declarations}\n<urn:owl-to-shacl:subject> <urn:owl-to-shacl:predicate> ${text} .`);
    if (parsed.length !== 1 || !is(parsed[0].subject, 'urn:owl-to-shacl:subject') ||
        !is(parsed[0].predicate, 'urn:owl-to-shacl:predicate') || parsed[0].graph.termType !== 'DefaultGraph' ||
        parsed[0].object.termType === 'BlankNode') {
      throw new TypeError('Expected one RDF term, not extra triples or anonymous expressions.');
    }
    stringTerms.set(text, parsed[0].object);
    return parsed[0].object;
  }
  function term(binding, row, column) {
    const fail = message => { throw new TypeError(`SPARQL row ${row + 1}, ?${column}: ${message}`); };
    if (typeof binding === 'string') {
      try { return stringTerm(binding); }
      catch (error) { fail(error.message); }
    }
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
 * @param {string|string[]|Iterable<object>|object} rdf RDF text, N-Triples strings, triples, or SPARQL SELECT JSON.
 * @param {{format?: string, baseIRI?: string, variables?: object, layout?: string, prefixes?: object, shapeIds?: 'random'|'hash'}} options
 * Default text format: Turtle. SPARQL JSON objects and binding arrays are detected.
 * @returns {{turtle:string, restrictionCount:number, propertyShapeCount:number, shapeCount:number,
 * warnings:string[], shapes:Array<{targetClass:object,nodeShape:string}>}}
 * Parsing and conversion are synchronous. Named graphs are merged.
 * This is a closed-world validation policy, not OWL entailment or sh:rule.
 */
export function transformOwlRestrictions(rdf, { format = 'Turtle', baseIRI, variables, layout, prefixes, shapeIds = 'random' } = {}) {
  if (!['random', 'hash'].includes(shapeIds)) throw new TypeError('shapeIds must be random or hash.');
  let quads = rdf;
  const sparqlFormat = ['json-triples', 'sparql-json', 'application/sparql-results+json'].includes(String(format).toLowerCase());
  const sparqlObject = rdf && typeof rdf === 'object' && !rdf[Symbol.iterator];
  const bindingArray = Array.isArray(rdf) && rdf.length > 0 && !rdf[0]?.subject?.termType;
  const ntArray = Array.isArray(rdf) && rdf.some(t => typeof t === 'string');
  if (ntArray) {
    if (!rdf.every(t => typeof t === 'string')) throw new TypeError('N-Triples arrays must contain only strings.');
    // Parse one document to preserve blank-node identity across array entries.
    const document = `${prefixDeclarations(prefixes)}\n${rdf.map(normalizeTripleEntry).join('\n')}`;
    quads = new Parser({ format: 'Turtle' }).parse(document);
  } else if (sparqlFormat || sparqlObject || bindingArray) {
    quads = sparqlResultsToQuads(rdf, { variables, layout, prefixes });
  } else if (typeof rdf === 'string') {
    const selected = formats.get(String(format).toLowerCase());
    if (!selected) throw new TypeError(`Unsupported RDF format: ${format}. Use Turtle, N-Triples, TriG or N-Quads.`);
    quads = new Parser({ format: selected, ...(baseIRI === undefined ? {} : { baseIRI }) }).parse(rdf);
  }
  if (!quads?.[Symbol.iterator]) throw new TypeError('Expected RDF text or an RDF/JS iterable of triples or quads.');
  const index = new Map(), terms = new Map(), blankLabels = new Map();
  const fresh = () => `_:shape_${randomUUID().replaceAll('-', '')}`;
  const hashId = (kind, content) => `<urn:shacl:${kind}:${createHash('sha256')
      .update(JSON.stringify(['owl-to-shacl:v1', kind, content])).digest('hex')}>`;
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
  const emitted = new Set(), emittedProperties = new Set();
  function emit(id, definition) {
    if (!emitted.has(id)) { output.push(definition); emitted.add(id); }
  }
  function valueShape(constraint) {
    if (shapeIds === 'random') return `[ ${constraint} ]`;
    const id = hashId('value', constraint);
    emit(id, `${id} a sh:NodeShape ; ${constraint} .`);
    return id;
  }
  for (const s of terms.values()) {
    if (!hasType(s, NS.owl + 'Restriction')) continue;
    if (!values(s, NS.owl + 'onProperty').length) {
      const id = s.termType === 'BlankNode' ? `_:${s.value}` : `<${s.value}>`;
      throw new Error(`Restriction ${id} is incomplete: missing owl:onProperty.`);
    }
    const p = one(s, NS.owl + 'onProperty');
    let path;
    if (p.termType === 'NamedNode') path = render(p);
    else if (p.termType === 'BlankNode') {
      const inverse = one(p, NS.owl + 'inverseOf');
      if (inverse.termType !== 'NamedNode') throw new Error('Inverse path must reference a named property.');
      path = `[ sh:inversePath ${render(inverse)} ]`;
      if (shapeIds === 'hash') {
        path = hashId('path', ['sh:inversePath', render(inverse)]);
        emit(path, `${path} sh:inversePath ${render(inverse)} .`);
      }
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
        constraint = `sh:qualifiedValueShape ${valueShape(filler(v, dataProperty))} ; sh:qualifiedMinCount 1`;
      } else if (kind === 'hasValue') {
        if (v.termType === 'BlankNode') throw new Error('Blank-node owl:hasValue cannot preserve identity in a separate shapes graph.');
        constraint = `sh:hasValue ${render(v)}`;
      } else {
        const n = count(v), min = kind.toLowerCase().startsWith('min'), max = kind.toLowerCase().startsWith('max');
        const pieces = [];
        if (qualified) pieces.push(`sh:qualifiedValueShape ${valueShape(filler(onClass ?? onDataRange, Boolean(onDataRange)))}`);
        if (!max) pieces.push(`sh:${qualified ? 'qualifiedMinCount' : 'minCount'} ${n}`);
        if (!min) pieces.push(`sh:${qualified ? 'qualifiedMaxCount' : 'maxCount'} ${n}`);
        constraint = pieces.join(' ; ');
      }
      const shape = shapeIds === 'hash' ? hashId('property', [path, constraint]) : fresh();
      propertyShapes.push(shape);
      emittedProperties.add(shape);
      emit(shape, `${shape} a sh:PropertyShape ; sh:path ${path} ; ${constraint} .`);
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
    const linked = [...found];
    if (shapeIds === 'hash') linked.sort();
    const nodeShape = shapeIds === 'hash' ? hashId('node', [render(target), linked]) : fresh();
    emit(nodeShape, `${nodeShape} a sh:NodeShape ; sh:targetClass ${render(target)} ; sh:property ${linked.join(', ')} .`);
    shapes.push({ targetClass: target, nodeShape });
  }
  const warnings = [...restrictions.keys()].filter(k => !used.has(k)).map(k =>
      `Restriction ${render(terms.get(k))} has no named class target; its property shape is emitted without a target.`);
  if (shapeIds === 'hash') output.sort();
  return { turtle: `@prefix sh: <${NS.sh}> .\n\n${output.join('\n')}\n`,
    restrictionCount: restrictions.size, propertyShapeCount: emittedProperties.size,
    shapeCount: shapes.length, warnings, shapes };
}

export default transformOwlRestrictions;
