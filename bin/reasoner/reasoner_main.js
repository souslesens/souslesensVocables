


var ReasonerMain={
    consistencyRules: [
        {
            id: 'same-and-different',
            description: 'Individuals asserted equal are also explicitly different.',
            pattern: `?a ${SAME} ?b . { ${different('?a', '?b')} }`,
        },
        {
            id: 'disjoint-classes',
            description: 'An individual belongs to two disjoint classes.',
            pattern: `?x ${SAME} ?x1, ?x2 .
      ?x1 a ?type1 . ?x2 a ?type2 .
      ?type1 ${SUPER} ?class1 . ?type2 ${SUPER} ?class2 .
      {
        ?class1 (owl:disjointWith|^owl:disjointWith) ?class2 .
      } UNION {
        ?set a owl:AllDisjointClasses ; owl:members ?list .
        ?list rdf:rest* ?cell1, ?cell2 .
        ?cell1 rdf:first ?class1 . ?cell2 rdf:first ?class2 .
        FILTER(?cell1 != ?cell2)
      }`,
        },
        {
            id: 'nothing-membership',
            description: 'An individual belongs to owl:Nothing.',
            pattern: `?x a ?type . ?type ${SUPER} owl:Nothing .`,
        },
        {
            id: 'complement-classes',
            description: 'An individual belongs to a class and its complement.',
            pattern: `?x ${SAME} ?x1, ?x2 .
      ?x1 a ?type1 . ?x2 a ?type2 .
      ?type1 ${SUPER} ?class1 . ?type2 ${SUPER} ?class2 .
      ?class1 (owl:complementOf|^owl:complementOf) ?class2 .`,
        },
        {
            id: 'negative-assertion',
            description: 'A positive property assertion contradicts a negative assertion.',
            pattern: `?negative a owl:NegativePropertyAssertion ;
      owl:sourceIndividual ?source ; owl:assertionProperty ?property .
      ?source ${SAME} ?s . ?s ?property ?value .
      {
        ?negative owl:targetIndividual ?target .
        ?value ${SAME} ?target .
      } UNION {
        ?negative owl:targetValue ?target .
        FILTER(isLiteral(?value) && ?value = ?target)
      }`,
        },
        {
            id: 'irreflexive-property',
            description: 'An irreflexive property relates an individual to itself.',
            pattern: `?property a owl:IrreflexiveProperty .
      ?s ?property ?o . ?s ${SAME} ?o .`,
        },
        {
            id: 'asymmetric-property',
            description: 'An asymmetric property has edges in both directions.',
            pattern: `?property a owl:AsymmetricProperty .
      ?s ?property ?o . ?o ${SAME} ?o2 . ?s ${SAME} ?s2 .
      ?o2 ?property ?s2 .`,
        },
        {
            id: 'disjoint-properties',
            description: 'Two disjoint properties relate the same pair of individuals.',
            pattern: `?s ?property1 ?o . ?s ${SAME} ?s2 .
      ?s2 ?property2 ?o2 .
      FILTER(sameTerm(?o, ?o2) || (isLiteral(?o) && isLiteral(?o2) && ?o = ?o2))
      {
        ?property1 (owl:propertyDisjointWith|^owl:propertyDisjointWith) ?property2 .
      } UNION {
        ?set a owl:AllDisjointProperties ; owl:members ?list .
        ?list rdf:rest* ?cell1, ?cell2 .
        ?cell1 rdf:first ?property1 . ?cell2 rdf:first ?property2 .
        FILTER(?cell1 != ?cell2)
      }`,
        },
        {
            id: 'functional-object-property',
            description: 'A functional object property has explicitly different fillers.',
            pattern: `?property a owl:FunctionalProperty, owl:ObjectProperty .
      ?s ${SAME} ?s2 . ?s ?property ?a0 . ?s2 ?property ?b0 .
      ?a0 ${SAME} ?a . ?b0 ${SAME} ?b .
      { ${different('?a', '?b')} }`,
        },
        {
            id: 'inverse-functional-property',
            description: 'An inverse-functional property has explicitly different subjects sharing a filler.',
            pattern: `?property a owl:InverseFunctionalProperty .
      ?a0 ?property ?o . ?b0 ?property ?o2 . ?o ${SAME} ?o2 .
      ?a0 ${SAME} ?a . ?b0 ${SAME} ?b .
      { ${different('?a', '?b')} }`,
        },
    ]

    ,





}

export default ReasonerMain;