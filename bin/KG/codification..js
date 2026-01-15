import sqlServer from './SQLserverConnector.js';
import fs from 'fs';
import async from 'async';

var codeRegExTEPDK = {
    //   "general": /^(?<Location>[\w]{4})-(?<Function>\w{1,5})-(?<SeqNumber>\d+)(?<SubSeqIndex>\w)-?(?<Pos>\w{0,1})(?<optional>\w{0,1})$/,
    //  "well":/^(?<Location>\w{4})-(?<Function>\w{4})-(?<System>[\w\d]{1,2}) (?<WellSlot>\d{0,2}) (?<SeqNumber>\d{0,2})$/g,
    //  "valves_PSV_Vent":/^(?<Location>\w{2,4})-(?<Function>\w{1,5})-(?<SeqNumber>\d+)(?<PSVsubSeqNumber>\w)-?(?<position>\w?) ?(?<optional>\d?)$/g,
    // "ExistingFields1":/(?<Location>\w{2,4})-(?<Function>\w{1,5})-(?<MaintenaceCodeNumber>[\d\w]+)/g,
    GORM: /^(?<Location>\w{2})-(?<Function>\w{1,5})-(?<Module>\d{2})(?<SeqNumber>\d*)/g,
};

var facilitiesMap = {
    "TOTAL-L0000008975": "DAB",
    "TOTAL-L0000009061": "DFC",
    "TOTAL-L0000009075": "GOC",
    "TOTAL-L0000009078": "GOE",
    "TOTAL-L0000009492": "RFA",
    "TOTAL-L0000009494": "SKA",
};

var modulesMap = {
    12: "Platform A - Wellhead",
    13: "Platform B - Wellhead",
    1: "Reinjection Compression Module",
    2: "Production Module",
    3: "Utilities Module",
    4: "Electrical Module",
    5: "Gas Compression Module",
    6: "Control and Workshops Module",
    7: "Quarters Module with Helideck Pac",
    8: "Diesel Distribution, Power / Emer",
    9: "Utilities, Cellar Deck",
    10: "Top of Module 02",
    11: "Drain Pot",
    15: "Lay-down Area Above Module 02",
    14: "Platform D – Flare",
};
var locationsMap = {
    GA: "Gorm Field Alpha Platform",
    GB: "Gorm Field Bravo Platform",
    GC: "Gorm Field Charlie Platform",
    GD: "Gorm Field Delta Platform",
};

var processTEPDKtags = function () {
    var str = "";
    str += "type\titem.TagNumber\t functionCode\tfunctionLabel\tmoduleCode\tmoduleLabel\tlocationCode\tlocationLabel\tKG.FunctionalClassID\tKG.FunctionalClassLabel\tKG.ServiceDescription\n";
    var GormCodesMap = {};
    var codesMap = {};
    var count = 0;
    var processor = function (data, GormCodesMap, fetchedCount, callback) {
        count += data.length;
        console.log(count);
        data.forEach(function (item) {
            for (var key in codeRegExTEPDK) {
                var regex = codeRegExTEPDK[key];
                //   var array = regex.exec(item.TagNumber);
                var array = regex.exec(item.tagName);
                if (array) {
                    var locationCode = array.groups["Location"];
                    var locationLabel = "";
                    if (locationCode && locationsMap[locationCode]) locationLabel = locationsMap[locationCode];

                    var moduleCode = array.groups["Module"];
                    var moduleLabel = "";
                    if (moduleCode && modulesMap[moduleCode]) moduleLabel = modulesMap[moduleCode];

                    var functionCode = array.groups["Function"];
                    var functionLabel = "";
                    if (functionCode) {
                        if (codesMap[functionCode]) {
                            functionLabel = codesMap[functionCode];
                        } else if (GormCodesMap[functionCode]) {
                            if (GormCodesMap[functionCode][item.FacilitySectorID]) {
                                functionLabel = "*" + GormCodesMap[functionCode][item.FacilitySectorID];
                            }
                        }
                    }
                    str +=
                        key +
                        "\t" +
                        item.tagName +
                        "\t" +
                        functionCode +
                        "\t" +
                        functionLabel +
                        "\t" +
                        moduleCode +
                        "\t" +
                        moduleLabel +
                        "\t" +
                        locationCode +
                        "\t" +
                        locationLabel +
                        "\t" +
                        item.Functional_Location_code +
                        "\t" +
                        item.Manufacturer +
                        "\t" +
                        item.Description +
                        "\n";
                }
            }
        });
        callback();
    };
    async.series(
        [
            //standard Codes
            function (callbackSeries) {
                var query = "SELECT  * FROM [TEPDK].[dbo].[functionCode]  ";

                sqlServer.getFetchedData("TEPDK", query, processor, 1000, null, function (err, result) {
                    result.forEach(function (item) {
                        var code = item["Code"];
                        codesMap[code] = item.Description;
                    });
                    callbackSeries();
                });
            },
            //sepecific GORM codes
            function (callbackSeries) {
                var query = "SELECT  * FROM [TEPDK].[dbo].[codesTEPDKexistingFields]  ";
                sqlServer.getFetchedData("TEPDK", query, processor, 1000, null, function (err, result) {
                    result.forEach(function (item) {
                        for (var totalId in facilitiesMap) {
                            var facilityCode = facilitiesMap[totalId];
                            var code = item[facilityCode];
                            if (!GormCodesMap[code]) GormCodesMap[code] = {};
                            GormCodesMap[code][totalId] = item.Description;
                        }
                    });
                    callbackSeries();
                });
            },

            // query tags
            function (callbackSeries) {
                var query =
                    "SELECT [TagNumber]\n" +
                    "      ,[FunctionalClassID]\n" +
                    "      ,[FunctionalClassLabel]\n" +
                    "      ,[FacilitySectorID]\n" +
                    "      ,[ServiceDescription] " +
                    "FROM [TEPDK].[dbo].[tblTag] ";

                query = " select * FROM [TEPDK].[dbo].[functional_location] " + " where SUBSTRING(tagName,1,2) in('GA','GB','GC','GD')";
                sqlServer.getFetchedData("TEPDK", query, processor, 1000, GormCodesMap, function (err, _result) {
                    if (err) return callbackSeries(err);

                    callbackSeries();
                });
            },
        ],
        function (err) {
            if (err) return console.log(err);
            fs.writeFileSync("D:\\NLP\\ontologies\\TEPDK\\tagDescriptorFL.csv", str);
        },
    );
};

processTEPDKtags();
