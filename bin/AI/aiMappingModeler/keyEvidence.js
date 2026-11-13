import { getColumnProfile, getDistinctTextValues, getMissingTextValues, getRowsHoldingTextValues, getSharedDistinctValueCount } from "../../databases/dbConnector.js";
import { databaseModel } from "../../../model/databases.js";

// the missing values whose shapes are described, and the key values the shapes are compared with
const missingValueLimit = 1000;
const keyValueLimit = 5000;
const shownShapeCount = 4;
const shapeExampleCount = 3;
const foundSampleRowCount = 3;
const missingSampleRowCount = 2;
// the distinct values read to find a few found ones
const sampleValueCount = 50;
const missingKinds = ["trimmed", "keyShape", "otherShape"];
const lettersRegex = /[A-Za-z]+/g;
const digitsRegex = /[0-9]+/g;
const spacesRegex = / /g;

// letters as A, digits as 9, spaces left out, every other character kept: PAZ/FPSOH/HU-T_-2711A gives A/A/A-A_-9A
function getValueShape(value) {
    const valueWithoutSpaces = value.replace(spacesRegex, "");
    const lettersShape = valueWithoutSpaces.replace(lettersRegex, "A");
    const valueShape = lettersShape.replace(digitsRegex, "9");
    return valueShape;
}

// the edits turning one shape into the other
function getShapeDistance(leftShape, rightShape) {
    let previousRow = Array.from({ length: rightShape.length + 1 }, (unused, rightIndex) => rightIndex);
    for (let leftIndex = 1; leftIndex <= leftShape.length; leftIndex++) {
        const currentRow = [leftIndex];
        for (let rightIndex = 1; rightIndex <= rightShape.length; rightIndex++) {
            const substitutionCost = leftShape[leftIndex - 1] == rightShape[rightIndex - 1] ? 0 : 1;
            currentRow.push(Math.min(previousRow[rightIndex] + 1, currentRow[rightIndex - 1] + 1, previousRow[rightIndex - 1] + substitutionCost));
        }
        previousRow = currentRow;
    }
    const shapeDistance = previousRow[rightShape.length];
    return shapeDistance;
}

// the key shape nearest to a shape, the most frequent on a tie, then the first in text order
function getClosestKeyShape(shape, keyShapeCounts) {
    const keyShapes = Object.keys(keyShapeCounts);
    const rankedShapes = keyShapes.map((keyShape) => ({ keyShape: keyShape, distance: getShapeDistance(shape, keyShape), count: keyShapeCounts[keyShape] }));
    rankedShapes.sort((leftShape, rightShape) => leftShape.distance - rightShape.distance || rightShape.count - leftShape.count || leftShape.keyShape.localeCompare(rightShape.keyShape));
    const closestKeyShape = rankedShapes.length > 0 ? rankedShapes[0].keyShape : null;
    return closestKeyShape;
}

// the missing values grouped by shape: { missingCountsByKind, shapeGroups: the most frequent groups of each kind
// [{ kind, shape, closestKeyShape, count, examples }] }; kind is trimmed when the value without its end spaces is a key
// value, keyShape when key values have its shape, otherShape otherwise
function getMissingShapeGroups(missingValues, trimmedKeyValues, keyShapeCounts) {
    const shapeGroupsById = {};
    const missingCountsByKind = {};
    missingValues.forEach(function (missingValue) {
        const shape = getValueShape(missingValue);
        const trimmedValue = missingValue.trim();
        const isTrimmedKeyValue = trimmedKeyValues.indexOf(trimmedValue.toLowerCase()) > -1;
        let kind = shape in keyShapeCounts ? "keyShape" : "otherShape";
        if (isTrimmedKeyValue) {
            kind = "trimmed";
        }
        missingCountsByKind[kind] = (missingCountsByKind[kind] || 0) + 1;
        const groupId = kind + " " + shape;
        if (!shapeGroupsById[groupId]) {
            shapeGroupsById[groupId] = { kind: kind, shape: shape, trimmedShape: getValueShape(trimmedValue), count: 0, examples: [] };
        }
        const shapeGroup = shapeGroupsById[groupId];
        shapeGroup.count++;
        if (shapeGroup.examples.length < shapeExampleCount) {
            shapeGroup.examples.push(missingValue);
        }
    });
    const allShapeGroups = Object.values(shapeGroupsById);
    allShapeGroups.sort((leftGroup, rightGroup) => rightGroup.count - leftGroup.count || leftGroup.shape.localeCompare(rightGroup.shape));
    // the closest shape, measured against every key shape, only for the groups shown
    const shapeGroups = [];
    missingKinds.forEach(function (kind) {
        const kindGroups = allShapeGroups.filter((shapeGroup) => shapeGroup.kind == kind);
        const shownGroups = kindGroups.slice(0, shownShapeCount);
        shownGroups.forEach(function (shapeGroup) {
            const { trimmedShape, ...shownGroup } = shapeGroup;
            shownGroup.closestKeyShape = kind == "trimmed" ? trimmedShape : getClosestKeyShape(shapeGroup.shape, keyShapeCounts);
            shapeGroups.push(shownGroup);
        });
    });
    return { missingCountsByKind: missingCountsByKind, shapeGroups: shapeGroups };
}

// the first row holding each value, the value as read in the database next to it: [{ value, row }]
async function readValueRows(connection, clientDriver, table, column, values) {
    const valueRows = [];
    // one read per value: the rows of one value may fill a read of several
    for (const value of values) {
        const rows = await getRowsHoldingTextValues(connection, clientDriver, table, column, [value], 1);
        if (rows.length > 0) {
            valueRows.push({ value: value, row: rows[0] });
        }
    }
    return valueRows;
}

// a few rows of the referring table holding a value found in the key column, a few holding a missing one, and the rows of
// the key table holding the found values; one row per value
async function readKeySamples(connection, clientDriver, foreignKey, missingValues) {
    const { table, column, referencedTable, referencedColumn } = foreignKey;
    const sampleValues = await getDistinctTextValues(connection, clientDriver, table, column, sampleValueCount);
    const foundSampleValues = sampleValues.filter((sampleValue) => missingValues.indexOf(sampleValue) < 0 && sampleValue.trim() != "");
    const foundValues = foundSampleValues.slice(0, foundSampleRowCount);
    const missingSampleValues = missingValues.slice(0, missingSampleRowCount);
    const foundValueRows = await readValueRows(connection, clientDriver, table, column, foundValues);
    const missingValueRows = await readValueRows(connection, clientDriver, table, column, missingSampleValues);
    const foundReferringRows = foundValueRows.map((valueRow) => ({ row: valueRow.row, isMissing: false }));
    const missingReferringRows = missingValueRows.map((valueRow) => ({ row: valueRow.row, isMissing: true }));
    const referringRows = foundReferringRows.concat(missingReferringRows);
    const keyValueRows = await readValueRows(connection, clientDriver, referencedTable, referencedColumn, foundValues);
    const referencedRows = keyValueRows.map((valueRow) => valueRow.row);
    return { referringRows: referringRows, referencedRows: referencedRows };
}

// what a person needs to judge a foreign key: how many of its distinct values the key column holds, the shapes of the
// missing ones next to the closest key shape, and a sample of both tables; values compared as text, like the overlaps,
// a blank value left out as the samples do
async function getForeignKeyEvidence(databaseId, userInfo, foreignKey) {
    const { table, column, referencedTable, referencedColumn } = foreignKey;
    const database = await databaseModel.getDatabase(databaseId);
    const connection = await databaseModel.getUserConnection(userInfo.user, databaseId);
    const clientDriver = databaseModel.getClientDriver(database.driver);
    const columnProfile = await getColumnProfile(connection, clientDriver, table, [column]);
    const distinctCount = columnProfile.columnsByName[column].distinctCount;
    // EXCEPT returns its values in no set order
    const unorderedMissingValues = await getMissingTextValues(connection, clientDriver, table, column, referencedTable, referencedColumn, missingValueLimit);
    const readMissingValues = unorderedMissingValues.sort();
    const missingValues = readMissingValues.filter((missingValue) => missingValue.trim() != "");
    const blankCount = readMissingValues.length - missingValues.length;
    let foundCount = distinctCount - readMissingValues.length;
    if (readMissingValues.length == missingValueLimit) {
        foundCount = await getSharedDistinctValueCount(connection, clientDriver, table, column, referencedTable, referencedColumn);
    }
    const readCount = distinctCount - blankCount;
    const keyValues = await getDistinctTextValues(connection, clientDriver, referencedTable, referencedColumn, keyValueLimit);
    const keyShapeCounts = {};
    keyValues.forEach(function (keyValue) {
        const keyShape = getValueShape(keyValue);
        keyShapeCounts[keyShape] = (keyShapeCounts[keyShape] || 0) + 1;
    });
    // a value padded with spaces matches nothing in a text comparison, though its trimmed text may be a key value; sqlserver
    // already ignores the end spaces and the case, leaving only the start spaces to this check
    const paddedValues = missingValues.filter((missingValue) => missingValue.trim() != missingValue);
    const trimmedValues = paddedValues.map((paddedValue) => paddedValue.trim());
    const trimmedKeyValues = await getDistinctTextValues(connection, clientDriver, referencedTable, referencedColumn, trimmedValues.length, trimmedValues);
    const lowerCaseTrimmedKeyValues = trimmedKeyValues.map((trimmedKeyValue) => trimmedKeyValue.toLowerCase());
    const missingShapes = getMissingShapeGroups(missingValues, lowerCaseTrimmedKeyValues, keyShapeCounts);
    const keySamples = await readKeySamples(connection, clientDriver, foreignKey, missingValues);
    const foreignKeyEvidence = {
        foundCount: foundCount,
        readCount: readCount,
        missingCountsByKind: missingShapes.missingCountsByKind,
        shapeGroups: missingShapes.shapeGroups,
        referringRows: keySamples.referringRows,
        referencedRows: keySamples.referencedRows,
    };
    return foreignKeyEvidence;
}

export { getForeignKeyEvidence };
