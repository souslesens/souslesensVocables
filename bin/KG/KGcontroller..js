import fs from 'fs';
import path from 'path';
import async from 'async';
import ConfigManager from '../configManager.';

var KGcontroller = {
    getMappingsDirPath: function () {
        var filePath = ConfigManager.config.data_dir + "mappings";
        return path.resolve(filePath) + path.sep;
    },

    saveMappings: function (source, mappings, callback) {
        var filePath = KGcontroller.getMappingsDirPath() + source + ".json";
        fs.writeFile(filePath, JSON.stringify(mappings, null, 2), null, function (err, _result) {
            callback(err);
        });
    },
    getMappings: function (source, callback) {
        var filePath = KGcontroller.getMappingsDirPath() + source + ".json";
        console.log("filePath", filePath);
        if (!fs.existsSync(filePath)) return callback("file " + source + ".json not found", null);
        fs.readFile(filePath, function (err, result) {
            try {
                var json = JSON.parse(result);
                //  json.data.fileName=filePath
                callback(err, json);
            } catch (e) {
                console.error(e);
                return callback("file " + source + ".json not valid", null);
            }
        });
    },

    generateTriples: function (_config) {
        // do nothing ? XXX
    },
    getAssetGlobalMappings: function (source, callback) {
        var dir = KGcontroller.getMappingsDirPath();
        var files = fs.readdirSync(dir);
        var globalJson = {
            mappings: [],
            model: {},
            relationalKeysMap: KGcontroller.relationalKeysMap,
            data: {},
            infos: {},
        };
        async.eachSeries(
            files,
            function (file, callbackEach) {
                if (file.indexOf(source) == 0) {
                    fs.readFile(dir + "/" + file, function (err, result) {
                        try {
                            var json = JSON.parse(result);

                            globalJson.mappings = globalJson.mappings.concat(json.mappings);

                            for (var key in json.model) {
                                globalJson.model[key] = json.model[key];
                            }
                            globalJson.data[file] = json.data;
                            globalJson.infos[file] = json.infos;

                            callbackEach();
                        } catch (e) {
                            callbackEach(e);
                        }
                    });
                } else {
                    callbackEach();
                }
            },
            function (err) {
                return callback(err, globalJson);
            },
        );
    },

    getKGschema: function (source, callback) {
        KGcontroller.getAssetGlobalMappings(source, function (err, globalJson) {
            if (err) return callback(err);

            var predicatesMap = {};
            var typesMap = {};
            globalJson.mappings.forEach(function (item) {
                if (item.predicate == '"http://www.w3.org/1999/02/22-rdf-syntax-ns#type"') {
                    if (!typesMap[item.subject]) typesMap[item.subject] = item.object;
                }
            });

            globalJson.mappings.forEach(function (item) {
                if (!predicatesMap[item.predicate]) predicatesMap[item.predicate] = {};
                if (item.predicate != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                    var subjectType = typesMap[item.subject];
                    var objectType = typesMap[item.objectType];

                    if (!predicatesMap[subjectType]) predicatesMap[subjectType] = [];
                    predicatesMap[subjectType].push(objectType);
                }
            });
        });
    },

    relationalKeysMap: {
        "tblUnitOfMeasure.UnitOfMeasureDimensionID": "tblUnitOfMeasureDimension.ID",
        "tblUnitOfMeasure.BaseUnitID": "tblUnitOfMeasure.ID",
        "tblAttribute.UnitOfMeasureDimensionID": "tblUnitOfMeasureDimension.ID",
        "tblAttribute.PickListValueGroupingID": "tblPickListValueGrouping.ID",
        "tblAttributePickListValue.PickListValueGroupingID": "tblPickListValueGrouping.ID",
        "tblDisciplineDocumentType.DisciplineID": "tblDiscipline.ID",
        "tblDisciplineDocumentType.DocumentTypeID": "tblDocumentType.ID",
        "tblTagFormat.DefaultFunctionalClassID": "tblFunctionalClass.ID",
        "tblTagFormatGroup.TagFormatID": "tblTagFormat.ID",
        "tblTagFormatPermittedValue.TagFormatGroupID": "tblTagFormatGroup.ID",
        "tblFunctionalClass.ParentFunctionalClassID": "tblFunctionalClass.ID",
        "tblFunctionalClass.DisciplineID": "tblDiscipline.ID",
        "tblPhysicalClass.ParentPhysicalClassID": "tblPhysicalClass.ID",
        "tblPhysicalClass.DisciplineID": "tblDiscipline.ID",
        "tblFunctionalClassToPhysicalClass.FunctionalClassID": "tblFunctionalClass.ID",
        "tblFunctionalClassToPhysicalClass.PhysicalClassID": "tblPhysicalClass.ID",
        "tblCodification.TagFormatID": "tblTagFormat.ID",
        "tblCodification.FunctionalClassID": "tblFunctionalClass.ID",
        "tblCodification.PhysicalClassID": "tblPhysicalClass.ID",
        "tblCodification.AttributeID1": "tblAttribute.ID",
        "tblCodification.AttributePickListValueID1": "tblAttributePickListValue.ID",
        "tblCodification.AttributeID2": "tblAttribute.ID",
        "tblCodification.AttributePickListValueID2": "tblAttributePickListValue.ID",
        "tblFunctionalClassToAttribute.FunctionalClassID": "tblFunctionalClass.ID",
        "tblFunctionalClassToAttribute.AttributeID": "tblAttribute.ID",
        "tblPhysicalClassToAttribute.PhysicalClassID": "tblPhysicalClass.ID",
        "tblPhysicalClassToAttribute.AttributeID": "tblAttribute.ID",
        "tblFunctionalClassToDisciplineDocumentType.FunctionalClassID": "tblFunctionalClass.ID",
        "tblFunctionalClassToDisciplineDocumentType.DisciplineDocumentTypeID": "tblDisciplineDocumentType.ID",
        "tblPhysicalClassToDisciplineDocumentType.PhysicalClassID": "tblPhysicalClass.ID",
        "tblPhysicalClassToDisciplineDocumentType.DisciplineDocumentTypeID": "tblDisciplineDocumentType.ID",
        "tblCompany.ISOCountryCodeID": "tblAttributePickListValue.ID",
        "tblPurchaseOrder.IssuerID": "tblCompany.ID",
        "tblPurchaseOrder.ReceiverID": "tblCompany.ID",
        "tblDocument.DisciplineDocumentTypeID": "tblDisciplineDocumentType.ID",
        "tblDocument.PurchaseOrderID": "tblPurchaseOrder.ID",
        "tblTag.FunctionalClassID": "tblFunctionalClass.ID",
        "tblTag.PurchaseOrderID": "tblPurchaseOrder.ID",
        "tblTag.TagFormatID": "tblTagFormat.ID",
        "tblTag.AffiliateID": "tblAttributePickListValue.ID",
        "tblTag.AssetID": "tblAttributePickListValue.ID",
        "tblTag.SiteID": "tblAttributePickListValue.ID",
        "tblTag.FacilitySectorID": "tblAttributePickListValue.ID",
        "tblTag.AreaID": "tblAttributePickListValue.ID",
        "tblTag.ModuleUnitID": "tblAttributePickListValue.ID",
        "tblTag.DeckLevelSubUnitID": "tblAttributePickListValue.ID",
        "tblTag.ZoneID": "tblAttributePickListValue.ID",
        "tblTag.SubZoneRoomID": "tblAttributePickListValue.ID",
        "tblTag.SystemID": "tblAttributePickListValue.ID",
        "tblTag.SubSystemID": "tblAttributePickListValue.ID",
        "tblTag.ProcessUnitID": "tblAttributePickListValue.ID",
        "tblTag.ConstructionAssemblyID": "tblAttributePickListValue.ID",
        "tblTag.CommissioningSystemID": "tblAttributePickListValue.ID",
        "tblTag.LeafNodeCommissioningUnitID": "tblAttributePickListValue.ID",
        "tblTag.MaintenanceUnitID": "tblAttributePickListValue.ID",
        "tblTag.MaintenanceSystemID": "tblAttributePickListValue.ID",
        "tblTag.CorrosionLoopID": "tblAttributePickListValue.ID",
        "tblTag.CorrosionLoopTypeID": "tblAttributePickListValue.ID",
        "tblModel.OEMID": "tblOrganisation.ID",

        //   'tblModel.OEMID': 'tblCompany.ID',   !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!wrong table name
        "tblModel.PhysicalClassID": "tblPhysicalClass.ID",
        "tblModelItem.ModelID": "tblModel.ID",
        "tblDocumentAttribute.DocumentID": "tblDocument.ID",
        "tblDocumentAttribute.AttributeID": "tblAttribute.ID",
        "tblDocumentToDocument.PrimaryDocumentID": "tblDocument.ID",
        "tblDocumentToDocument.LinkDocumentID": "tblDocument.ID",
        "tblTagAttribute.TagID": "tblTag.ID",
        "tblTagAttribute.AttributeID": "tblAttribute.ID",
        "tblTagAttribute.UnitOfMeasureID": "tblUnitOfMeasure.ID",
        "tblTagToDocument.TagID": "tblTag.ID",
        "tblTagToDocument.DocumentID": "tblDocument.ID",
        "tblTagToTag.PrimaryTagID": "tblTag.ID",
        "tblTagToTag.LinkTagID": "tblTag.ID",
        "tblTagToModel.TagID": "tblTag.ID",
        "tblTagToModel.ModelID": "tblModel.ID",
        "tblTagToModelItem.TagID": "tblTag.ID",
        "tblTagToModelItem.ModelItemID": "tblModelItem.ID",
        "tblTagToAlias.TagID": "tblTag.ID",
        "tblModelAttribute.ModelID": "tblModel.ID",
        "tblModelAttribute.AttributeID": "tblAttribute.ID",
        "tblModelAttribute.UnitOfMeasureID": "tblUnitOfMeasure.ID",
        "tblModelToDocument.ModelID": "tblModel.ID",
        "tblModelToDocument.DocumentID": "tblDocument.ID",
        "tblModelItemAttribute.ModelItemID": "tblModelItem.ID",
        "tblModelItemAttribute.AttributeID": "tblAttribute.ID",
        "tblModelItemAttribute.UnitOfMeasureID": "tblUnitOfMeasure.ID",
        "tblModelItemToDocument.ModelItemID": "tblModelItem.ID",
        "tblModelItemToDocument.DocumentID": "tblDocument.ID",
        "tblSource.ItemID": "tblXXX.ID",
        "tblComments.ItemID": "tblXXX.ID",
        "tblTagToTagToTypicalAssemblyRequirement.TagToTagID": "tblTagToTag.ID",
        "tblTagToTagToTypicalAssemblyRequirement.TypicalAssemblyRequirementID": "tblTypicalAssemblyRequirement.ID",
        "tblBreakdownAttribute.BreakdownID": "tblAttributePickListValue.ID",
        "tblBreakdownAttribute.AttributeID": "tblAttribute.ID",
        "tblBreakdownAttribute.UnitOfMeasureID": "tblUnitOfMeasure.ID",
        "tblBreakdownToDocument.BreakdownID": "tblAttributePickListValue.ID",
        "tblBreakdownToDocument.DocumentID": "tblDocument.ID",
        "tblMappingSource.MappingSourceOriginID": "tblMappingSourceOrigin.ID",
        "tblMappingSource.EntitiesID": "tblEntities.ID",
        "tblMappingSource.FunctionalClassID": "tblFunctionalClass.ID",
        "tblMappingSource.PhysicalClassID": "tblPhysicalClass.ID",
        "tblMappingSource.AttributeID": "tblAttribute.ID",
        "tblMappingSource.AttributePickListValueID": "tblAttributePickListValue.ID",
        "tblMappingSource.AttributeID2": "tblAttribute.ID",
        "tblMappingSource.AttributePickListValueID2": "tblAttributePickListValue.ID",
        "tblMappingSource.PickListValueGroupingID": "tblPickListValueGrouping.ID",
        "tblMappingSource.UnitOfMeasureDimensionID": "tblUnitOfMeasureDimension.ID",
        "tblMappingSource.UnitOfMeasureID": "tblUnitOfMeasure.ID",
        "tblMappingSource.DisciplineID": "tblDiscipline.ID",
        "tblMappingSource.DocumentTypeID": "tblDocumentType.ID",
        "tblMappingSource.DisciplineDocumentTypeID": "tblDisciplineDocumentType.ID",
        "tblMappingSource.FunctionalClassToPhysicalClassID": "tblFunctionalClassToPhysicalClass.ID",
        "tblMappingSource.FunctionalClassToAttributeID": "tblFunctionalClassToAttribute.ID",
        "tblMappingSource.PhysicalClassToAttributeID": "tblPhysicalClassToAttribute.ID",
        "tblMappingSource.FunctionalClassToDisciplineDocumentTypeID": "tblFunctionalClassToDisciplineDocumentType.ID",
        "tblMappingSource.PhysicalClassToDisciplineDocumentTypeID": "tblPhysicalClassToDisciplineDocumentType.ID",
        "tblMappingSourceDetails.MappingSourceID": "tblMappingSource.ID",
        "tblRequirementOrigin.DisciplineID": "tblDiscipline.ID",
        "tblTypicalAssemblyRequirement.RequirementOriginID": "tblRequirementOrigin.ID",
        "tblTypicalAssemblyPattern.TypicalAssemblyRequirementID": "tblTypicalAssemblyRequirement.ID",
        "tblTypicalAssemblyPattern.PrimaryFunctionalClassID": "tblFunctionalClass.ID",
        "tblTypicalAssemblyPattern.PrimaryAttributeID": "tblAttribute.ID",
        "tblTypicalAssemblyPattern.LinkFunctionalClassID": "tblFunctionalClass.ID",
        "tblTypicalAssemblyPattern.LinkAttributeID": "tblAttribute.ID",
        "tblBreakdownToBreakdown.PrimaryBreakdownID": "tblAttribute.ID",
        "tblBreakdownToBreakdown.PrimaryBreakdownValueID": "tblAttributePickListValue.ID",
        "tblBreakdownToBreakdown.LinkBreakdownID": "tblAttribute.ID",
        "tblBreakdownToBreakdown.LinkBreakdownValueID": "tblAttributePickListValue.ID",
        "tblDocumentToProjectModification.DocumentID": "tblDocument.ID",
        "tblDocumentToProjectModification.ProjectModificationID": "tblProjectModification.ID",
        "tblTagToProjectModification.TagID": "tblTag.ID",
        "tblTagToProjectModification.ProjectModificationID": "tblProjectModification.ID",
        "tblTag.PreliminaryPhysicalClassID": "tblPhysicalClass.ID",
        "tblRegisterColumn.RegisterID": "tblRegister.ID",
        "tblRegisterTagToDocuments.RegisterColumnID": "tblRegisterColumn.ID",
        "tblRegisterTagToDocuments.TagID": "tblTag.ID",

        //views created in AFTWIN UK for child parent
        "tbltypicalassemblypatterntofunctionalclassparent.functionalclassid": "tblFunctionalClass.ID",
        "tbltypicalassemblypatterntofunctionalclasschild.functionalclassid": "tblFunctionalClass.ID",
        "dbo.tbltypicalassemblypatterntoattributechild.attributeid": "tblAttribute.ID",
        "dbo.tbltypicalassemblypatterntoattributeparent.attributeid": "tblAttribute.ID",

        "tbltypicalassemblypatterntofunctionalclassparent.typicalassemblypatternid": "tblTypicalAssemblyPattern.ID",
        "tbltypicalassemblypatterntofunctionalclasschild.typicalassemblypatternid": "tblTypicalAssemblyPattern.ID",
        "tbltypicalassemblypatterntoattributeparent.typicalassemblypatternid": "tblTypicalAssemblyPattern.ID",
        "tbltypicalassemblypatterntoattributeparent.attributeid": "tblAttribute.ID",
        "tbltypicalassemblypatterntoattributechild.typicalassemblypatternid": "tblTypicalAssemblyPattern.ID",
        "tbltypicalassemblypatterntoattributechild.attributeid": "tblAttribute.ID",
    },
};

/*var str='sdfdfsf(vdsfsf(sdgdgfdfg)dsgfdfg'

var c1=(str.match(/\(/g) || []).length
var c2=(str.match(/\)/g) || []).length
if(c1!=c2)
    var x=3

str = str.replace(/\$/gm, "\\\$")
console.log(str)*/
module.exports = KGcontroller;

KGcontroller.getKGschema("MDM_2.3_AFTWIN");
//KGcontroller.getAssetGlobalMappings("MDM")
