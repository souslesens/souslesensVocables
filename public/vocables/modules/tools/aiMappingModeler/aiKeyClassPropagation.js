import CommonBotFunctions from "../../bots/_commonBotFunctions.js";
import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import AIDataSourceManager from "./aiDataSourcesManager.js";
import AIMappingColumnsGraph from "./aiMappingColumnsGraph.js";
import AIMappingsDetails from "./aiMappingsDetails.js";
import AIMappingModeler from "./aiMappingModeler.js";

// A column mapped to a class carries that class to its key group: the column its foreign key refers to, as main column,
// and the other columns referring to it, defined in that main column. The user checks each proposal before it is mapped.
var AIKeyClassPropagation = (function () {
    var self = {};

    self.dialogDivId = "mainDialogDiv";
    self.compareDialogDivId = "smallDialogDiv";
    self.treeDivId = "keyPropagation_treeDiv";
    // the AI foreign keys whose evidence is read at the same time
    self.evidenceReadLimit = 2;
    // share of the distinct values found in the key column: green from the first, orange from the second, red below
    self.strongEvidenceShare = 0.9;
    self.partialEvidenceShare = 0.5;
    self.sampleCellLength = 40;
    self.whitespaceRunRegex = /\s+/g;
    // words of a column name: split on underscores and digits, short and generic words left out
    self.nameSplitRegex = /[_0-9]+/;
    self.genericNameWords = ["code", "number", "table"];
    self.minimumNameWordLength = 4;
    // the missing values of an AI foreign key by kind, as the server groups them, with the level they give the key
    self.missingKinds = [
        { kind: "trimmed", level: "partial", text: " only because of the spaces at the end" },
        { kind: "keyShape", level: "partial", text: ", but written like its values" },
        { kind: "otherShape", level: "weak", text: ", written like none of its values" },
    ];
    // { classNode, mappedColumnNode, referencedKey, proposals, isReferencedInConflict }, kept from the dialog opening to its validation
    self.currentPropagation = null;
    // the AI foreign key shown in the comparison dialog, refreshed when its evidence arrives
    self.comparedProposal = null;

    // the foreign keys of the open database, one column each, the declared ones then the AI ones;
    // [{ table, column, referencedTable, referencedColumn, aiReason }]
    self.getForeignKeys = function (tableKeys) {
        var declaredColumnCounts = {};
        tableKeys.foreignKeys.forEach(function (keyColumn) {
            var constraintKey = keyColumn.table_name + "|" + keyColumn.constraint_name;
            declaredColumnCounts[constraintKey] = (declaredColumnCounts[constraintKey] || 0) + 1;
        });
        // a composite foreign key names no single column holding the object
        var singleColumnKeys = tableKeys.foreignKeys.filter(function (keyColumn) {
            return declaredColumnCounts[keyColumn.table_name + "|" + keyColumn.constraint_name] == 1;
        });
        var foreignKeys = singleColumnKeys.map(function (keyColumn) {
            return { table: keyColumn.table_name, column: keyColumn.column_name, referencedTable: keyColumn.referenced_table, referencedColumn: keyColumn.referenced_column, aiReason: null };
        });
        AIDataSourceManager.getUndeclaredAiForeignKeys().forEach(function (aiForeignKey) {
            foreignKeys.push({
                table: aiForeignKey.table,
                column: aiForeignKey.column,
                referencedTable: aiForeignKey.referencedTable,
                referencedColumn: aiForeignKey.referencedColumn,
                aiReason: aiForeignKey.reason,
            });
        });
        return foreignKeys;
    };

    // { isDeclared, aiReason } when the column alone identifies its table, declared or found by the AI, null otherwise
    self.getPrimaryKey = function (tableKeys, table, column) {
        var tablePrimaryKeyColumns = tableKeys.primaryKeys.filter(function (keyColumn) {
            return keyColumn.table_name == table;
        });
        if (tablePrimaryKeyColumns.length == 1 && tablePrimaryKeyColumns[0].column_name == column) {
            return { isDeclared: true, aiReason: null };
        }
        var aiPrimaryKey = AIDataSourceManager.getColumnAiKeys(table, column).primaryKey;
        var primaryKey = aiPrimaryKey && aiPrimaryKey.columns.length == 1 ? { isDeclared: false, aiReason: aiPrimaryKey.reason } : null;
        return primaryKey;
    };

    // the key group of a column holding a foreign key, or a primary key other columns refer to:
    // { referencedKey: { table, column, primaryKey }, referringKeys }, null outside every key
    self.getKeyGroup = function (table, column) {
        var tableKeys = AIDataSourceManager.currentConfig.currentDataSource ? AIDataSourceManager.currentConfig.currentDataSource.tableKeys : null;
        if (!tableKeys) {
            return null;
        }
        var foreignKeys = self.getForeignKeys(tableKeys);
        var columnForeignKey = foreignKeys.find(function (foreignKey) {
            return foreignKey.table == table && foreignKey.column == column;
        });
        var referencedKey = columnForeignKey ? { table: columnForeignKey.referencedTable, column: columnForeignKey.referencedColumn } : { table: table, column: column };
        var referringKeys = foreignKeys.filter(function (foreignKey) {
            return foreignKey.referencedTable == referencedKey.table && foreignKey.referencedColumn == referencedKey.column;
        });
        if (referringKeys.length == 0) {
            return null;
        }
        referencedKey.primaryKey = self.getPrimaryKey(tableKeys, referencedKey.table, referencedKey.column);
        var keyGroup = { referencedKey: referencedKey, referringKeys: referringKeys };
        return keyGroup;
    };

    // a column of the group: left out when it has the class already, the mapped column included, a conflict when it has
    // another one
    self.getProposal = function (table, column, classNode) {
        var columnNode = AIMappingColumnsGraph.findColumnNode(table, column);
        var columnClass = columnNode ? AIMappingColumnsGraph.getColumnClass(columnNode) : null;
        if (columnClass == classNode.id) {
            return null;
        }
        var conflictClass = columnClass ? AIMappingModeler.allResourcesMap[columnClass] : null;
        var conflictText = columnClass ? "mapped to " + (conflictClass ? conflictClass.label : columnClass) : null;
        var proposal = { table: table, column: column, conflictText: conflictText };
        return proposal;
    };

    self.proposeClassPropagation = function (mappedColumnNode, classNode) {
        if (!mappedColumnNode || !mappedColumnNode.data || mappedColumnNode.data.type != "Column") {
            return;
        }
        var keyGroup = self.getKeyGroup(mappedColumnNode.data.dataTable, mappedColumnNode.label);
        if (!keyGroup) {
            return;
        }
        var referencedKey = keyGroup.referencedKey;
        var primaryKey = referencedKey.primaryKey;
        var candidateProposals = [];
        var referencedProposal = self.getProposal(referencedKey.table, referencedKey.column, classNode);
        if (referencedProposal) {
            referencedProposal.isReferenced = true;
            referencedProposal.isMainColumn = true;
            referencedProposal.keyText = "referenced";
            if (primaryKey) {
                referencedProposal.keyText = primaryKey.isDeclared ? "PK" : "AI PK";
            }
            var tableWithoutIdentifier = AIDataSourceManager.getTableWithoutIdentifier(referencedKey.table);
            var hoverTexts = [];
            if (primaryKey && primaryKey.aiReason) {
                hoverTexts.push("AI: " + primaryKey.aiReason);
            }
            if (tableWithoutIdentifier) {
                hoverTexts.push("AI: no column identifies the objects of " + referencedKey.table + ". " + tableWithoutIdentifier.reason);
            }
            referencedProposal.hoverText = hoverTexts.join("\n");
            candidateProposals.push(referencedProposal);
        }
        keyGroup.referringKeys.forEach(function (referringKey) {
            var referringProposal = self.getProposal(referringKey.table, referringKey.column, classNode);
            if (!referringProposal) {
                return;
            }
            // the existing rule makes two columns of one class in the same table both main columns
            referringProposal.isMainColumn = referringKey.table == referencedKey.table;
            referringProposal.keyText = referringKey.aiReason ? "AI FK" : "FK";
            referringProposal.aiReason = referringKey.aiReason;
            referringProposal.isAiForeignKey = Boolean(referringKey.aiReason);
            candidateProposals.push(referringProposal);
        });
        if (candidateProposals.length == 0) {
            return;
        }
        // a referenced column of another class makes the class of its foreign keys doubtful
        var isReferencedInConflict = Boolean(referencedProposal && referencedProposal.conflictText);
        candidateProposals.forEach(function (proposal, proposalIndex) {
            proposal.isChecked = !isReferencedInConflict && !proposal.conflictText;
            proposal.proposalId = "keyPropagation_proposal_" + proposalIndex;
        });
        self.currentPropagation = {
            classNode: classNode,
            mappedColumnNode: mappedColumnNode,
            referencedKey: referencedKey,
            proposals: candidateProposals,
            isReferencedInConflict: isReferencedInConflict,
        };
        self.showPropagationDialog();
    };

    self.getProposalRowText = function (proposal) {
        var rowText =
            "<span class='keyPropagation-column'>" +
            CommonBotFunctions.escapeHtml(proposal.table + "." + proposal.column) +
            "</span> <span class='keyPropagation-keyText'>" +
            proposal.keyText +
            "</span>";
        return rowText;
    };

    // an AI foreign key row: its evidence color and measure once read, and the link opening the comparison
    self.getAiKeyRowText = function (proposal) {
        var evidenceHtml = "<span class='keyPropagation-keyText'>&#9679; reading</span>";
        if (proposal.evidenceError) {
            evidenceHtml = "<span class='keyPropagation-weak'>not read</span>";
        } else if (proposal.evidence) {
            evidenceHtml = "<span class='keyPropagation-" + self.getKeyConfidence(proposal) + "'>&#9679; " + proposal.evidence.foundCount + "/" + proposal.evidence.readCount + "</span>";
        }
        var aiKeyRowText = self.getProposalRowText(proposal) + " " + evidenceHtml + " <span class='keyPropagation-compareLink'>compare values</span>";
        return aiKeyRowText;
    };

    self.getGroupNode = function (groupId, title, isCheckable) {
        var groupNode = {
            id: groupId,
            parent: "#",
            text: "<span class='keyPropagation-groupTitle'>" + title + "</span>",
            state: { opened: groupId != "keyPropagation_declared" },
        };
        if (!isCheckable) {
            groupNode.a_attr = { class: "keyPropagation-noCheckbox" };
        }
        return groupNode;
    };

    // the referenced column, the declared foreign keys, sure, folded, the AI ones, then the columns of another class, left as
    // they are
    self.getTreeData = function () {
        var propagation = self.currentPropagation;
        var primaryKey = propagation.referencedKey.primaryKey;
        var referencedTitle = "Referenced column";
        if (primaryKey) {
            referencedTitle = primaryKey.isDeclared ? "Primary key" : "Primary key found by the AI";
        }
        var groups = [
            { id: "keyPropagation_referenced", title: referencedTitle, isCheckable: false },
            { id: "keyPropagation_declared", title: "Declared foreign keys", isCheckable: true },
            { id: "keyPropagation_ai", title: "Foreign keys found by the AI", isCheckable: true },
            { id: "keyPropagation_conflict", title: "Already mapped to another class", isCheckable: false },
        ];
        var groupProposals = {};
        propagation.proposals.forEach(function (proposal) {
            var groupId = "keyPropagation_declared";
            if (proposal.conflictText) {
                groupId = "keyPropagation_conflict";
            } else if (proposal.isReferenced) {
                groupId = "keyPropagation_referenced";
            } else if (proposal.isAiForeignKey) {
                groupId = "keyPropagation_ai";
            }
            groupProposals[groupId] = (groupProposals[groupId] || []).concat([proposal]);
        });
        var treeData = [];
        groups.forEach(function (group) {
            var proposals = groupProposals[group.id];
            if (!proposals) {
                return;
            }
            treeData.push(self.getGroupNode(group.id, group.title, group.isCheckable));
            proposals.forEach(function (proposal) {
                var proposalNode = { id: proposal.proposalId, parent: group.id, text: self.getProposalRowText(proposal), state: { checked: proposal.isChecked }, a_attr: {} };
                if (proposal.isAiForeignKey && !proposal.conflictText) {
                    proposalNode.text = self.getAiKeyRowText(proposal);
                }
                if (proposal.conflictText) {
                    proposalNode.text += " <span class='keyPropagation-weak'>" + CommonBotFunctions.escapeHtml(proposal.conflictText) + "</span>";
                    proposalNode.a_attr.class = "keyPropagation-noCheckbox";
                }
                if (proposal.hoverText) {
                    proposalNode.a_attr.title = proposal.hoverText;
                }
                treeData.push(proposalNode);
            });
        });
        return treeData;
    };

    self.showPropagationDialog = function () {
        var propagation = self.currentPropagation;
        var referencedKey = propagation.referencedKey;
        var classLabelHtml = CommonBotFunctions.escapeHtml(propagation.classNode.label);
        var mappedColumnHtml = CommonBotFunctions.escapeHtml(propagation.mappedColumnNode.data.dataTable + "." + propagation.mappedColumnNode.label);
        // the dialog title of SLS holds a few words: the question heads the content
        var questionText = "Map the other " + referencedKey.column + " columns to " + propagation.classNode.label + "?";
        var introHtml =
            "<div class='keyPropagation-question'>" +
            CommonBotFunctions.escapeHtml(questionText) +
            "</div>You mapped <span class='keyPropagation-column'>" +
            mappedColumnHtml +
            "</span>, a key also used by " +
            propagation.proposals.length +
            " other columns. Map them to <b>" +
            classLabelHtml +
            "</b> too?";
        $("#" + self.dialogDivId).load("./modules/tools/aiMappingModeler/html/keyClassPropagationDialog.html", function () {
            $("#keyPropagation_introDiv").html(introHtml);
            var treeOptions = {
                withCheckboxes: true,
                notTypes: true,
                noScroll: true,
                onCheckNodeFn: self.showCheckedCount,
                onUncheckNodeFn: self.showCheckedCount,
                selectTreeNodeFn: function (event, selection) {
                    // only the link opens the comparison: a click elsewhere on the row stays a selection
                    var isCompareClick = selection.event && $(selection.event.target).hasClass("keyPropagation-compareLink");
                    var proposal = self.getProposalById(selection.node.id);
                    if (isCompareClick && proposal) {
                        self.showComparison(proposal);
                    }
                },
            };
            JstreeWidget.loadJsTree(self.treeDivId, self.getTreeData(), treeOptions, function () {
                self.showCheckedCount();
                UI.openDialog(self.dialogDivId, { title: "Same key in other columns" });
                self.readAiKeyEvidence(propagation);
            });
        });
    };

    self.getProposalById = function (proposalId) {
        var proposal = self.currentPropagation.proposals.find(function (candidateProposal) {
            return candidateProposal.proposalId == proposalId;
        });
        return proposal;
    };

    self.getCheckedProposals = function () {
        var checkedNodeIds = $("#" + self.treeDivId).jstree(true).get_checked();
        var checkedProposals = self.currentPropagation.proposals.filter(function (proposal) {
            return checkedNodeIds.indexOf(proposal.proposalId) > -1 && !proposal.conflictText;
        });
        return checkedProposals;
    };

    self.showCheckedCount = function () {
        var checkedCount = self.getCheckedProposals().length;
        $("#keyPropagation_mapButton").text("Map " + checkedCount + " columns").prop("disabled", checkedCount == 0);
    };

    // each AI foreign key gets what decides it, read in the database; the row shows its color once read
    self.readAiKeyEvidence = function (propagation) {
        var referencedKey = propagation.referencedKey;
        var aiProposals = propagation.proposals.filter(function (proposal) {
            return proposal.isAiForeignKey && !proposal.conflictText;
        });
        async.eachLimit(aiProposals, self.evidenceReadLimit, function (proposal, callbackEach) {
            var evidenceParams = new URLSearchParams({
                databaseId: AIDataSourceManager.currentConfig.currentDataSource.id,
                table: proposal.table,
                column: proposal.column,
                referencedTable: referencedKey.table,
                referencedColumn: referencedKey.column,
            });
            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/ai/aiMappingModeler/keyEvidence?" + evidenceParams.toString(),
                dataType: "json",
                success: function (foreignKeyEvidence) {
                    proposal.evidence = foreignKeyEvidence;
                    self.showAiKeyEvidence(propagation, proposal);
                    callbackEach();
                },
                error: function (error) {
                    proposal.evidenceError = error.responseJSON ? error.responseJSON.error : error.statusText;
                    self.showAiKeyEvidence(propagation, proposal);
                    callbackEach();
                },
            });
        });
    };

    // an answer arriving after its dialog was validated, replaced or closed is dropped
    self.showAiKeyEvidence = function (propagation, proposal) {
        var keyTree = $("#" + self.treeDivId).jstree(true);
        if (self.currentPropagation !== propagation || !keyTree) {
            return;
        }
        keyTree.rename_node(proposal.proposalId, self.getAiKeyRowText(proposal));
        var compareDialog = $("#" + self.compareDialogDivId);
        var isCompareDialogOpen = compareDialog.hasClass("ui-dialog-content") && compareDialog.dialog("isOpen");
        if (self.comparedProposal === proposal && isCompareDialogOpen) {
            self.showComparison(proposal);
        }
    };

    self.getNameWords = function (name) {
        var lowerCaseName = name.toLowerCase();
        var nameParts = lowerCaseName.split(self.nameSplitRegex);
        var nameWords = nameParts.filter(function (namePart) {
            return namePart.length >= self.minimumNameWordLength && self.genericNameWords.indexOf(namePart) < 0;
        });
        return nameWords;
    };

    // close names: the same name, a name too short to say anything, or a word of one name holding a word of the other, as
    // functionalloc in functionallocation
    self.areNamesClose = function (columnName, keyColumnName, keyTableName) {
        var columnWords = self.getNameWords(columnName);
        var keyWords = self.getNameWords(keyColumnName).concat(self.getNameWords(keyTableName));
        if (columnName.toLowerCase() == keyColumnName.toLowerCase() || columnWords.length == 0 || keyWords.length == 0) {
            return true;
        }
        var isClose = columnWords.some(function (columnWord) {
            return keyWords.some(function (keyWord) {
                return columnWord.indexOf(keyWord) > -1 || keyWord.indexOf(columnWord) > -1;
            });
        });
        return isClose;
    };

    self.getShapeHtml = function (shape) {
        var shapeHtml = "<span class='keyPropagation-shape' title='A letters, 9 digits'>(" + CommonBotFunctions.escapeHtml(shape) + ")</span>";
        return shapeHtml;
    };

    // each signal a fact read in the database: red when missing values take a shape the key column never has, orange when
    // they look like key values, match a key value once trimmed, or when the names share no word; [{ level, html }]
    self.getKeySignals = function (proposal) {
        var referencedKey = self.currentPropagation.referencedKey;
        var keyTableHtml = CommonBotFunctions.escapeHtml(referencedKey.table);
        var shapeGroups = proposal.evidence.shapeGroups;
        var signals = [];
        self.missingKinds.forEach(function (missingKind) {
            var kindGroups = shapeGroups.filter(function (shapeGroup) {
                return shapeGroup.kind == missingKind.kind;
            });
            if (kindGroups.length == 0) {
                return;
            }
            var missingCount = proposal.evidence.missingCountsByKind[missingKind.kind];
            var shapeLines = [];
            kindGroups.forEach(function (shapeGroup) {
                var alikeText = shapeGroup.count > 1 ? ", <span class='keyPropagation-keyText'>+" + (shapeGroup.count - 1) + " alike</span>" : "";
                var shapeLine =
                    "<li><span class='keyPropagation-value'>" +
                    CommonBotFunctions.escapeHtml(shapeGroup.examples[0]) +
                    "</span> " +
                    self.getShapeHtml(shapeGroup.shape) +
                    ", <span class='keyPropagation-keyText'>" +
                    keyTableHtml +
                    "</span> " +
                    self.getShapeHtml(shapeGroup.closestKeyShape) +
                    alikeText +
                    "</li>";
                shapeLines.push(shapeLine);
            });
            var signalHtml = missingCount + " not in " + keyTableHtml + missingKind.text + "<ul class='keyPropagation-shapes'>" + shapeLines.join("") + "</ul>";
            signals.push({ level: missingKind.level, html: signalHtml });
        });
        if (shapeGroups.length == 0) {
            signals.push({ level: "strong", html: "All values in " + keyTableHtml });
        }
        if (!self.areNamesClose(proposal.column, referencedKey.column, referencedKey.table)) {
            var namesHtml = "Names differ: <b>" + CommonBotFunctions.escapeHtml(proposal.column) + "</b> / <b>" + CommonBotFunctions.escapeHtml(referencedKey.column) + "</b>";
            signals.push({ level: "partial", html: namesHtml });
        }
        return signals;
    };

    self.getMeasureLevel = function (evidence) {
        var foundShare = evidence.readCount > 0 ? evidence.foundCount / evidence.readCount : 0;
        var measureLevel = "weak";
        if (foundShare >= self.strongEvidenceShare) {
            measureLevel = "strong";
        } else if (foundShare >= self.partialEvidenceShare) {
            measureLevel = "partial";
        }
        return measureLevel;
    };

    self.getKeyConfidence = function (proposal) {
        var signals = self.getKeySignals(proposal);
        var signalLevels = signals.map(function (signal) {
            return signal.level;
        });
        signalLevels.push(self.getMeasureLevel(proposal.evidence));
        var confidence = "strong";
        if (signalLevels.indexOf("weak") > -1) {
            confidence = "weak";
        } else if (signalLevels.indexOf("partial") > -1) {
            confidence = "partial";
        }
        return confidence;
    };

    // a small sample table, the compared column first; the value of a row missing from the key column in red
    self.getSampleTableHtml = function (rows, firstColumn, missingRowIndexes) {
        if (rows.length == 0) {
            return "<div class='keyPropagation-keyText'>no row</div>";
        }
        var rowColumns = Object.keys(rows[0]);
        var otherColumns = rowColumns.filter(function (columnName) {
            return columnName != firstColumn;
        });
        var columns = [firstColumn].concat(otherColumns);
        var headerCells = columns.map(function (columnName) {
            var headerCell = "<th>" + CommonBotFunctions.escapeHtml(columnName) + "</th>";
            return headerCell;
        });
        var bodyRows = rows.map(function (row, rowIndex) {
            var cells = columns.map(function (columnName, columnIndex) {
                var cellValue = row[columnName];
                var cellText = cellValue === null || cellValue === undefined ? "" : String(cellValue);
                // the compared value keeps its spaces, the other cells hold on one line
                var shownText = columnIndex == 0 ? cellText : cellText.replace(self.whitespaceRunRegex, " ");
                if (shownText.length > self.sampleCellLength) {
                    shownText = shownText.slice(0, self.sampleCellLength) + "...";
                }
                var cellClass = "";
                if (columnIndex == 0) {
                    cellClass = missingRowIndexes.indexOf(rowIndex) > -1 ? "keyPropagation-missingValue" : "keyPropagation-value";
                }
                var cell = "<td class='" + cellClass + "'>" + CommonBotFunctions.escapeHtml(shownText) + "</td>";
                return cell;
            });
            var bodyRow = "<tr>" + cells.join("") + "</tr>";
            return bodyRow;
        });
        var tableHtml =
            "<div class='keyPropagation-sampleBox'><table class='keyPropagation-sample'><thead><tr>" + headerCells.join("") + "</tr></thead><tbody>" + bodyRows.join("") + "</tbody></table></div>";
        return tableHtml;
    };

    // the measure, the signals, a sample of both tables, then the reason of the AI
    self.getComparisonHtml = function (proposal) {
        var referencedKey = self.currentPropagation.referencedKey;
        var aiReasonHtml = "<div class='keyPropagation-aiReason'>AI: " + CommonBotFunctions.escapeHtml(proposal.aiReason) + "</div>";
        if (proposal.evidenceError) {
            var errorHtml = "<div class='keyPropagation-weak'>Not read in the database: " + CommonBotFunctions.escapeHtml(proposal.evidenceError) + "</div>" + aiReasonHtml;
            return errorHtml;
        }
        if (!proposal.evidence) {
            var readingHtml = "<div class='keyPropagation-keyText'>Reading the database...</div>" + aiReasonHtml;
            return readingHtml;
        }
        var evidence = proposal.evidence;
        var keyTableHtml = CommonBotFunctions.escapeHtml(referencedKey.table);
        var measureHtml =
            "<span class='keyPropagation-" + self.getMeasureLevel(evidence) + "'>" + evidence.foundCount + "/" + evidence.readCount + "</span> <span class='keyPropagation-keyText'>values found in " + keyTableHtml + "</span>";
        var signals = self.getKeySignals(proposal);
        var signalLines = signals.map(function (signal) {
            var signalLine = "<li class='keyPropagation-signal-" + signal.level + "'>" + signal.html + "</li>";
            return signalLine;
        });
        var referringRows = evidence.referringRows.map(function (referringRow) {
            return referringRow.row;
        });
        var missingRowIndexes = [];
        evidence.referringRows.forEach(function (referringRow, rowIndex) {
            if (referringRow.isMissing) {
                missingRowIndexes.push(rowIndex);
            }
        });
        var comparisonHtml =
            "<div class='keyPropagation-compare'>" +
            measureHtml +
            "<ul class='keyPropagation-signals'>" +
            signalLines.join("") +
            "</ul>" +
            "<div class='keyPropagation-sampleTitle'>Sample of " +
            CommonBotFunctions.escapeHtml(proposal.table) +
            "</div>" +
            self.getSampleTableHtml(referringRows, proposal.column, missingRowIndexes) +
            "<div class='keyPropagation-sampleTitle'>Rows of " +
            keyTableHtml +
            " holding the same values</div>" +
            self.getSampleTableHtml(evidence.referencedRows, referencedKey.column, []) +
            aiReasonHtml +
            "</div>";
        return comparisonHtml;
    };

    self.showComparison = function (proposal) {
        var referencedKey = self.currentPropagation.referencedKey;
        self.comparedProposal = proposal;
        // the dialog title of SLS holds a few words: the compared columns head the content
        var questionText = proposal.table + "." + proposal.column + " = " + referencedKey.table + "." + referencedKey.column + " ?";
        var questionHtml = "<div class='keyPropagation-question'>" + CommonBotFunctions.escapeHtml(questionText) + "</div>";
        $("#" + self.compareDialogDivId).html(questionHtml + self.getComparisonHtml(proposal));
        var isOpen = $("#" + self.compareDialogDivId).hasClass("ui-dialog-content") && $("#" + self.compareDialogDivId).dialog("isOpen");
        if (!isOpen) {
            UI.openDialog(self.compareDialogDivId, { title: "Compare values" });
        }
    };

    // each checked column mapped to the class, created in its table when missing; the referenced column becomes the main
    // column once it has the class, and the existing rule defines the other columns of the class in it
    self.applyCheckedProposals = function () {
        var propagation = self.currentPropagation;
        var checkedProposals = self.getCheckedProposals();
        $("#" + self.dialogDivId).dialog("close");
        if (checkedProposals.length == 0) {
            return;
        }
        var graphData = AIMappingColumnsGraph.visjsGraph.data;
        checkedProposals.forEach(function (proposal) {
            var columnNode = AIMappingColumnsGraph.findColumnNode(proposal.table, proposal.column);
            if (!columnNode) {
                if (!graphData.nodes.get(proposal.table)) {
                    graphData.nodes.add(AIMappingColumnsGraph.getVisjsTableNode(proposal.table));
                }
                columnNode = AIMappingColumnsGraph.getVisjsColumnNode(proposal.table, proposal.column);
                graphData.nodes.add(columnNode);
                graphData.edges.add(AIMappingColumnsGraph.getTableColumnEdge(proposal.table, columnNode.id));
            }
            graphData.edges.add(AIMappingColumnsGraph.getClassEdge(columnNode.id, propagation.classNode.id, "", "rdf:type"));
            if (proposal.isMainColumn) {
                columnNode.data.isMainColumn = true;
                delete columnNode.data.definedInColumn;
            }
        });
        var referencedColumnNode = AIMappingColumnsGraph.findColumnNode(propagation.referencedKey.table, propagation.referencedKey.column);
        var isReferencedMapped = referencedColumnNode && AIMappingColumnsGraph.getColumnClass(referencedColumnNode) == propagation.classNode.id;
        var ruleColumnNode = isReferencedMapped ? referencedColumnNode : graphData.nodes.get(propagation.mappedColumnNode.id);
        AIMappingsDetails.isColumnAllreadyMappedInAnotherTable(ruleColumnNode, propagation.classNode.id);
        self.currentPropagation = null;
        self.comparedProposal = null;
        AIMappingColumnsGraph.saveVisjsGraph(function () {
            UI.message(checkedProposals.length + " columns mapped to " + propagation.classNode.label);
        });
    };

    return self;
})();

export default AIKeyClassPropagation;
window.AIKeyClassPropagation = AIKeyClassPropagation;
