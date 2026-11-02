import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { ontologyModelId, ontologyReasoningEffort, modelMaxOutputTokens, jsonBlockRegex, createMessage, getCutAnswerError, getAnswerText, toJsonBlock } from "./ontologyAnswer.js";
import { getNotAllowedRestrictionText } from "./restrictionCheck.js";

// the second turn of a generation: the model picks, for each refused restriction, a property among those that fit, or its removal
const restrictionFixPromptPath = join(dirname(fileURLToPath(import.meta.url)), "../prompts/ontology_restriction_fix.md");

// each refused restriction found in the answer, with its place there and the check that refused it
function findRefusedRestrictions(ontologyAnswer, notAllowedChecks) {
    const refusedRestrictions = [];
    for (const restrictionCheck of notAllowedChecks) {
        const classIndex = (ontologyAnswer.classes || []).findIndex((ontologyClass) => ontologyClass.label == restrictionCheck.classLabel);
        const classRestrictions = ontologyAnswer.classes?.[classIndex]?.restrictions || [];
        // the answer names a local target by its label, an imported one by its IRI
        const restrictionIndex = classRestrictions.findIndex(
            (restriction) => restriction.property == restrictionCheck.property && (restriction.target == restrictionCheck.targetLabel || restriction.target == restrictionCheck.target),
        );
        if (restrictionIndex < 0) {
            continue;
        }
        refusedRestrictions.push({ classIndex: classIndex, restrictionIndex: restrictionIndex, restrictionCheck: restrictionCheck });
    }
    return refusedRestrictions;
}

// the answer with the chosen fixes applied, null when none applies, and the record of the turn the run file keeps
async function fixNotAllowedRestrictions(ontologyAnswer, notAllowedChecks) {
    const restrictionFix = {
        // the only trace of what the first check refused once the version is fixed
        refusedRestrictions: notAllowedChecks.map(getNotAllowedRestrictionText),
        model: null,
        usage: { input_tokens: 0, output_tokens: 0 },
        answer: null,
        error: null,
        replacedCount: 0,
        removedCount: 0,
        rejectedFixes: [],
    };
    const refusedRestrictions = findRefusedRestrictions(ontologyAnswer, notAllowedChecks);
    if (refusedRestrictions.length == 0) {
        restrictionFix.error = "no refused restriction found in the answer";
        return { fixedAnswer: null, restrictionFix: restrictionFix };
    }
    const restrictionFixInput = refusedRestrictions.map(function (refusedRestriction, refusedId) {
        const restrictionCheck = refusedRestriction.restrictionCheck;
        const answerRestriction = ontologyAnswer.classes[refusedRestriction.classIndex].restrictions[refusedRestriction.restrictionIndex];
        return {
            refusedId: refusedId,
            class: restrictionCheck.classLabel,
            kind: answerRestriction.kind,
            property: { iri: restrictionCheck.property, label: restrictionCheck.propertyLabel },
            target: { iri: restrictionCheck.target, label: restrictionCheck.targetLabel },
            fittingProperties: restrictionCheck.fittingProperties ?? [],
        };
    });
    const prompt = readFileSync(restrictionFixPromptPath, "utf8") + "\n\n" + toJsonBlock(restrictionFixInput);
    const restrictionFixMessage = { messages: [{ role: "user", content: prompt }], maxTokens: modelMaxOutputTokens, model: ontologyModelId, reasoningEffort: ontologyReasoningEffort };
    let completion = null;
    try {
        completion = await createMessage(restrictionFixMessage, restrictionFix.usage);
    } catch (llmError) {
        restrictionFix.error = llmError.message;
        return { fixedAnswer: null, restrictionFix: restrictionFix };
    }
    restrictionFix.model = completion.model;
    restrictionFix.answer = getAnswerText(completion);
    const fixMatch = restrictionFix.answer.match(jsonBlockRegex);
    restrictionFix.error = getCutAnswerError(completion, restrictionFix.answer) ?? (fixMatch ? null : "the answer holds no JSON block");
    if (restrictionFix.error) {
        return { fixedAnswer: null, restrictionFix: restrictionFix };
    }
    let fixes = null;
    try {
        fixes = JSON.parse(fixMatch[1]).fixes;
    } catch (parseError) {
        restrictionFix.error = "the JSON of the answer could not be read: " + parseError.message;
        return { fixedAnswer: null, restrictionFix: restrictionFix };
    }

    const fixedAnswer = structuredClone(ontologyAnswer);
    const removedRestrictions = new Set();
    for (const fix of Array.isArray(fixes) ? fixes : []) {
        const refusedRestriction = refusedRestrictions[fix?.refusedId];
        if (!refusedRestriction) {
            restrictionFix.rejectedFixes.push("no refused restriction " + fix?.refusedId);
            continue;
        }
        const answerRestriction = fixedAnswer.classes[refusedRestriction.classIndex].restrictions[refusedRestriction.restrictionIndex];
        const fittingPropertyIris = (refusedRestriction.restrictionCheck.fittingProperties ?? []).map((fittingProperty) => fittingProperty.iri);
        if (fix.newProperty === null) {
            removedRestrictions.add(answerRestriction);
        } else if (fittingPropertyIris.includes(fix.newProperty)) {
            answerRestriction.property = fix.newProperty;
            restrictionFix.replacedCount++;
        } else {
            restrictionFix.rejectedFixes.push(getNotAllowedRestrictionText(refusedRestriction.restrictionCheck) + ", " + fix.newProperty + " is not among those that fit");
        }
    }
    // removed once every fix is read: the indices of the refused restrictions hold until then
    for (const refusedRestriction of refusedRestrictions) {
        const fixedClass = fixedAnswer.classes[refusedRestriction.classIndex];
        fixedClass.restrictions = fixedClass.restrictions.filter((restriction) => !removedRestrictions.has(restriction));
    }
    restrictionFix.removedCount = removedRestrictions.size;
    if (restrictionFix.replacedCount + restrictionFix.removedCount == 0) {
        restrictionFix.error = "the answer applied no fix";
        return { fixedAnswer: null, restrictionFix: restrictionFix };
    }
    return { fixedAnswer: fixedAnswer, restrictionFix: restrictionFix };
}

export { fixNotAllowedRestrictions };
