import rdflib from "rdflib";
import { getAnswerTurtle } from "../../bin/AI/ontologyFromDb/ontology/ontologyAnswer.js";
import { getGraphAnswer, getGraphChange } from "../../bin/AI/ontologyFromDb/ontology/draftGraph.js";

const sourceGraphUri = "http://example.org/source/";
const draftGraphUri = sourceGraphUri + "semanticvirtualdb/";
const sourceConfig = { graphUri: sourceGraphUri };
const upperClass = "http://example.org/upper/Thing";
const upperProperty = "http://example.org/upper/partOf";
const provenanceTriple = "<" + sourceGraphUri + 'Pump> <http://purl.org/dc/terms/creator> "karim" .';

const answer = {
    ontologyComment: "pumps",
    classes: [
        {
            label: "Pump",
            parent: upperClass,
            definition: "a pump",
            sourceColumns: ["pump.id"],
            restrictions: [{ property: upperProperty, kind: "someValuesFrom", target: "Plant" }],
            datatypeProperties: [{ label: "power", range: "decimal", columns: ["pump.power"] }],
        },
        { label: "Plant", parent: upperClass },
    ],
};

function getStoreTriples(graphTriples) {
    const store = rdflib.graph();
    rdflib.parse(graphTriples, store, draftGraphUri, "text/turtle");
    return store.statements.map((statement) => statement.toNT()).sort();
}

function readAnswer(graphTriples) {
    return getGraphAnswer(graphTriples, draftGraphUri, sourceGraphUri, [], null);
}

function getTurtle(ontologyAnswer, graphTerms) {
    return getAnswerTurtle(ontologyAnswer, "SOURCE", sourceConfig, sourceGraphUri, [], graphTerms).turtle;
}

// what a graph holds once a change is applied to it
function applyChange(graphTriples, graphChange) {
    const remainingTriples = getStoreTriples(graphTriples).filter((triple) => !graphChange.deletedTriples.includes(triple));
    return [...remainingTriples, ...graphChange.insertedTriples].sort();
}

describe("getGraphChange", () => {
    const generatedTriples = getStoreTriples(getTurtle(answer)).join("\n");

    it("writes restrictions as named <_:b...> nodes, the same for one restriction", () => {
        expect(generatedTriples).toMatch(/<_:br[0-9a-f]{40}>/);
        expect(getStoreTriples(getTurtle(answer)).join("\n")).toEqual(generatedTriples);
    });

    it("reads a restriction node as a restriction, not as a parent", () => {
        const pump = readAnswer(generatedTriples).ontologyAnswer.classes.find((ontologyClass) => ontologyClass.label == "Pump");
        expect(pump.parent).toEqual(upperClass);
        expect(pump.restrictions).toEqual([{ property: upperProperty, kind: "someValuesFrom", target: "Plant" }]);
    });

    it("changes nothing when the answer does not change", () => {
        const graphAnswer = readAnswer(generatedTriples);
        const graphChange = getGraphChange(graphAnswer, getTurtle(graphAnswer.ontologyAnswer, graphAnswer.graphTerms), draftGraphUri);
        expect(graphChange.insertedTriples).toEqual([]);
        expect(graphChange.deletedTriples).toEqual([]);
    });

    it("touches only the triples of what changed", () => {
        const graphAnswer = readAnswer(generatedTriples);
        const revisedAnswer = structuredClone(graphAnswer.ontologyAnswer);
        revisedAnswer.classes.find((ontologyClass) => ontologyClass.label == "Plant").definition = "a plant";
        const graphChange = getGraphChange(graphAnswer, getTurtle(revisedAnswer, graphAnswer.graphTerms), draftGraphUri);
        expect(graphChange.deletedTriples).toEqual([]);
        expect(graphChange.insertedTriples).toHaveLength(1);
        expect(graphChange.insertedTriples[0]).toContain("a plant");
    });

    it("keeps what the answer cannot hold, and an edit of the whiteboard with it", () => {
        const editedTriples = generatedTriples + "\n" + provenanceTriple;
        const graphAnswer = readAnswer(editedTriples);
        const revisedAnswer = structuredClone(graphAnswer.ontologyAnswer);
        revisedAnswer.classes.find((ontologyClass) => ontologyClass.label == "Plant").definition = "a plant";
        const graphChange = getGraphChange(graphAnswer, getTurtle(revisedAnswer, graphAnswer.graphTerms), draftGraphUri);
        expect(applyChange(editedTriples, graphChange)).toContain(provenanceTriple);
        expect(graphChange.droppedTriples).toEqual([]);
    });

    it("drops what the answer cannot hold with its removed term, and says so", () => {
        const editedTriples = generatedTriples + "\n" + provenanceTriple;
        const graphAnswer = readAnswer(editedTriples);
        const revisedAnswer = structuredClone(graphAnswer.ontologyAnswer);
        revisedAnswer.classes = revisedAnswer.classes.filter((ontologyClass) => ontologyClass.label != "Pump");
        const graphChange = getGraphChange(graphAnswer, getTurtle(revisedAnswer, graphAnswer.graphTerms), draftGraphUri);
        expect(graphChange.droppedTriples).toEqual([provenanceTriple]);
        expect(applyChange(editedTriples, graphChange).join("\n")).not.toContain(sourceGraphUri + "Pump>");
    });

    it("keeps the IRI and the restriction node a term has in the graph", () => {
        const whiteboardClass = draftGraphUri + "b1a2";
        const whiteboardNode = "_:bdeadbeef";
        const editedTriples = [
            generatedTriples,
            "<" + whiteboardClass + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2002/07/owl#Class> .",
            "<" + whiteboardClass + '> <http://www.w3.org/2000/01/rdf-schema#label> "Valve"@en .',
            "<" + whiteboardClass + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <" + upperClass + "> .",
            "<" + whiteboardClass + "> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <" + whiteboardNode + "> .",
            "<" + whiteboardNode + "> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2002/07/owl#Restriction> .",
            "<" + whiteboardNode + "> <http://www.w3.org/2002/07/owl#onProperty> <" + upperProperty + "> .",
            "<" + whiteboardNode + "> <http://www.w3.org/2002/07/owl#someValuesFrom> <" + upperClass + "> .",
        ].join("\n");
        const graphAnswer = readAnswer(editedTriples);
        const graphChange = getGraphChange(graphAnswer, getTurtle(graphAnswer.ontologyAnswer, graphAnswer.graphTerms), draftGraphUri);
        expect(graphChange.insertedTriples).toEqual([]);
        expect(graphChange.deletedTriples).toEqual([]);
    });

    it("leaves alone a restriction the answer format cannot hold", () => {
        const expressionNode = "_:bexpression";
        const expressionTriples = [
            "<" + sourceGraphUri + "Plant> <http://www.w3.org/2000/01/rdf-schema#subClassOf> <" + expressionNode + "> .",
            "<" + expressionNode + "> <http://www.w3.org/2002/07/owl#unionOf> <" + upperClass + "> .",
        ];
        const editedTriples = generatedTriples + "\n" + expressionTriples.join("\n");
        const graphAnswer = readAnswer(editedTriples);
        expect(graphAnswer.notCarried.join(" ")).toContain("unionOf");
        const graphChange = getGraphChange(graphAnswer, getTurtle(graphAnswer.ontologyAnswer, graphAnswer.graphTerms), draftGraphUri);
        expect(graphChange.deletedTriples).toEqual([]);
        expect(graphChange.insertedTriples).toEqual([]);
    });
});
