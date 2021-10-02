var Codification = {};
var sqlServer = require("./SQLserverConnector.");
var fs = require("fs");
var codeRegex = {
    "6.2	Main equipment tag structure  (TOTAL-T0000000001) ":
        /^(?<sector>[\w\d]{2})-(?<item>\w{1,5})-(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,4})(?<suffix>\w{0,1})$/g,
    "7.2	Switchgears and MCC compartments tag structure (TOTAL-T0000000003)":
        /^(?<sector>[\w\d]{2})-(?<item>\w{1,5})-(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,5})(?<suffix>\w{0,1})-(?<busBar>\w{1,2})(?<column>\d{0,2})(?<row>\d{0,2})$/g,
    "7.3	Lighting and small power equipment tag structure (TOTAL-T0000000018))":
        /^(?<sector>[\w\d]{2})-(?<item>\w{1,5})-(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,4})-(?<circuitBreaker>\d{2})(?<seqNumber>[\d\w]{0,2})$/g,
    "11.1	Piping tag structure (TOTAL-T0000000009)":
        /^(?<sector>[\w\d]{2})-(?<pipingSize>\d\d\{0,3}\d)-(?<fluid>\w{2,3})(?<system>\w)(?<subSystem>\d)-(?<seqNum>\d{1,4})-(?<pipingClass>\w\d{2}\w{0,1}\d{0,1})-(?<insulationCode>\w{0.2})$/gm,
    FL: /([^\/][\d\w]+)\/*([^\/][\d\w]*)\/*([^\/][-\d\w]*)\/*([^\/][-\d\w]*)/g,
};

var codeRegex501 = {
    equipment:
        /^(?<sector>[\d]{2})[-\s]{0,1}(?<equipmentType>\w{2})[-\s]{0,1}(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,2})-*(?<discriminationCode>[\w]{0,4})$/,
    AFtwin: /^(?<sector>[\w\d]{1,2})-*(?<item>\w{1,3})-*(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,2})-*(?<suffix>[\w\d]{0,5})-*.*$/g,
    "Equipment":
        /^(?<sector>[\w\d]{2})-(?<item>\w{1,5})-(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,4})(?<suffix>\w{0,1})$/g,
    "7.2	Switchgears and MCC compartments tag structure (TOTAL-T0000000003)":
        /^(?<sector>[\w\d]{2})-(?<item>\w{1,5})-(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,5})(?<suffix>\w{0,1})-(?<busBar>\w{1,2})(?<column>\d{0,2})(?<row>\d{0,2})$/g,
    "7.3	Lighting and small power equipment tag structure (TOTAL-T0000000018))":
        /^(?<sector>[\w\d]{2})-(?<item>\w{1,5})-(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,4})-(?<circuitBreaker>\d{2})(?<seqNumber>[\d\w]{0,2})$/g,
    "11.1	Piping tag structure (TOTAL-T0000000009)":
        /^(?<sector>[\w\d]{2})-(?<pipingSize>\d\d\{0,3}\d)-(?<fluid>\w{2,3})(?<system>\w)(?<subSystem>\d)-(?<seqNum>\d{1,4})-(?<pipingClass>\w\d{2}\w{0,1}\d{0,1})-(?<insulationCode>\w{0.2})$/gm,
    FL: /([^\/][\d\w]+)\/*([^\/][\d\w]*)\/*([^\/][-\d\w]*)\/*([^\/][-\d\w]*)/g,
};

var codeRegExTEPDK = {
    //   "general": /^(?<Location>[\w]{4})-(?<Function>\w{1,5})-(?<SeqNumber>\d+)(?<SubSeqIndex>\w)-?(?<Pos>\w{0,1})(?<optional>\w{0,1})$/,
    //  "well":/^(?<Location>\w{4})-(?<Function>\w{4})-(?<System>[\w\d]{1,2}) (?<WellSlot>\d{0,2}) (?<SeqNumber>\d{0,2})$/g,
    //  "valves_PSV_Vent":/^(?<Location>\w{2,4})-(?<Function>\w{1,5})-(?<SeqNumber>\d+)(?<PSVsubSeqNumber>\w)-?(?<position>\w?) ?(?<optional>\d?)$/g,
    ExistingFields1: /(?<Location>\w{2,4})-(?<Function>\w{1,5})-(?<MaintenaceCodeNumber>[\d\w]+)/g,
};

var decodeFunctionalLocation = function () {
    //  var sql = "SELECT [dbo].[tblTagFormat_UK].name format,[dbo].[tblTagFormatGroup_UK].name meaning,[dbo].[tblTagFormatGroup_UK].[order]  FROM [codification].[dbo].[tblTagFormatGroup_UK],[dbo].[tblTagFormat_UK] where [dbo].[tblTagFormat_UK].ID=TagFormatID order by    [dbo].[tblTagFormat_UK].name ,[dbo].[tblTagFormatGroup_UK].[order]"
    var dbName = "codification";

    var sql =
        "   SELECT [dbo].[tblTagFormat_UK].name format,[dbo].[tblTagFormatGroup_UK].name positionMeaning,[dbo].[tblTagFormatGroup_UK].[order] ,[dbo].[tblTagFormatPermittedValue_UK].[PermittedValue],[Meaning] valueMeaning\n" +
        "\n" +
        "        FROM [codification].[dbo].[tblTagFormatGroup_UK],[dbo].[tblTagFormat_UK] ,[dbo].[tblTagFormatPermittedValue_UK]\n" +
        "\n" +
        "        where [dbo].[tblTagFormat_UK].ID=TagFormatID\n" +
        "\n" +
        "        and  [dbo].[tblTagFormatPermittedValue_UK].[TagFormatGroupID]=[dbo].[tblTagFormatGroup_UK].id\n" +
        "\n" +
        "\n" +
        "        order by    [dbo].[tblTagFormat_UK].name ,[dbo].[tblTagFormatGroup_UK].[order]";

    sqlServer.getData(dbName, sql, function (err, result2) {
        if (err) if (err) console.log(err);

        var formatMap = {};
        result2.forEach(function (item) {
            if (!formatMap[item.format]) formatMap[item.format] = {};
            if (!formatMap[item.format][item.order]) formatMap[item.format][item.order] = {};
            if (!formatMap[item.format][item.order][item.positionMeaning])
                formatMap[item.format][item.order][item.positionMeaning] = {};
            formatMap[item.format][item.order][item.positionMeaning][item.PermittedValue] =
                item.valueMeaning;
        });

        fs.writeFileSync(
            "D:\\NLP\\ontologies\\codification\\EF_formatMap",
            JSON.stringify(formatMap, null, 2)
        );
        //   console.log(JSON.stringify(formatMap, null, 2))
    });
};
processBreakDown = function () {
    var dbName = "EF_SAP";

    var sql = "SELECT Functional_Location\n" + "  FROM [EF_SAP].[dbo].[QUANTUM_BOMST_TPUK_ELFR] ";

    /*  var sql = "SELECT Functional_Location\n" +
          "  [EF_SAP].[dbo].[Functional_Locations_IH06] "*/

    sqlServer.getData(dbName, sql, function (err, result2) {
        if (err) if (err) console.log(err);

        var map = {};
        var maxLength = 0;
        result2.forEach(function (item) {
            var array = item.Functional_Location.split("/");
            if (array.length == 4) {
                var v0 = array[0];
                var v1 = array[1];
                var v2 = array[2];
                var v3 = array[3];
                if (!map[v0]) map[v0] = {};
                if (!map[v0][v1]) map[v0][v1] = {};
                if (!map[v0][v1][v2]) map[v0][v1][v2] = {};
                if (!map[v0][v1][v2][v3]) map[v0][v1][v2][v3] = {};
            }
        });
        fs.writeFileSync(
            "D:\\NLP\\ontologies\\codification\\EF_FL.json",
            JSON.stringify(map, null, 2)
        );
        //   var x = maxLength
    });
};
var processADLtagsBreakDown = function () {
    var dbName = "MDM_2.3_AFTWIN";

    var sql =
        "SELECT  [parentTagId]\n" +
        "      ,[parentClassId]\n" +
        "      ,[childTagId]\n" +
        "      ,[childClassId]\n" +
        "      ,[parentName]\n" +
        "      ,[childName]\n" +
        "      ,[parentAliasNumber]\n" +
        "      ,[parentAliasSystem]\n" +
        "      ,[childtAliasNumber]\n" +
        "      ,[childAliasSystem]\n" +
        "  FROM [MDM_2.3_AFTWIN].[dbo].[tagBreakdowns]";

    var sql =
        "SELECT distinct  " +
        "      [parentName]\n" +
        "      ,[childName]\n" +
        "  FROM [MDM_2.3_AFTWIN].[dbo].[tagBreakdowns]";
    /*  var sql = "SELECT Functional_Location\n" +
          "  [EF_SAP].[dbo].[Functional_Locations_IH06] "*/

    sqlServer.getData(dbName, sql, function (err, result) {
        var array = [];
        result.forEach(function (item) {
            if (item.childName == item.parentName) item.parentName = "XX";
            array.push({ id: item.childName, parentid: item.parentName });
        });

        function unflatten(arr) {
            var tree = [],
                mappedArr = {},
                arrElem,
                mappedElem;

            // First map the nodes of the array to an object -> create a hash table.
            for (var i = 0, len = arr.length; i < len; i++) {
                arrElem = arr[i];
                mappedArr[arrElem.id] = arrElem;
                mappedArr[arrElem.id]["children"] = [];
            }

            for (var id in mappedArr) {
                if (mappedArr.hasOwnProperty(id)) {
                    mappedElem = mappedArr[id];
                    if (mappedElem["parentid"] == "Turbo Expander") var x = 3;
                    // If the element is not at the root level, add it to its parent array of children.
                    if (mappedArr[mappedElem["parentid"]]) {
                        mappedArr[mappedElem["parentid"]]["children"].push(mappedElem);
                    }
                    // If the element is at the root level, add it to first level elements array.
                    else {
                        tree.push(mappedElem);
                    }
                }
            }
            return tree;
        }

        var tree = unflatten(array);

        var tree2 = {};

        function recurse(parentNode, item) {
            if (!parentNode[item.id]) parentNode[item.id] = {};
            item.children.forEach(function (child) {
                recurse(parentNode[item.id], child);
            });
        }

        tree.forEach(function (item) {
            recurse(tree2, item);
        });
        var x = tree2;

        return;

        fs.writeFileSync(
            "D:\\NLP\\ontologies\\codification\\EF_FL.json",
            JSON.stringify(map, null, 2)
        );
        //   var x = maxLength
    });
};

var processTEPDKtags = function () {
    var str = "";
    var count = 0;
    var processor = function (data, codesMap, fetchedCount, callback) {
        count += data.length;
        console.log(count);
        data.forEach(function (item) {
            for (var key in codeRegExTEPDK) {
                var regex = codeRegExTEPDK[key];
                var array = regex.exec(item.TagNumber);
                if (array) {
                    var functionCode = array.groups["Function"];
                    if (functionCode && codesMap[functionCode])
                        str +=
                            key +
                            "\t" +
                            functionCode +
                            "\t" +
                            codesMap[functionCode] +
                            "\t" +
                            item.TagNumber +
                            "\t" +
                            item.FunctionalClassID +
                            "\t" +
                            item.FunctionalClassLabel +
                            "\t" +
                            item.ServiceDescription +
                            "\n";

                    for (var group in array.groups) {
                        var x = 3;
                    }
                }
            }
        });
        callback();
    };
    var query = "SELECT  * FROM [TEPDK].[dbo].[functionCode] ";
    sqlServer.getFetchedData("TEPDK", query, processor, 1000, null, function (err, result) {
        var codesMap = {};
        result.forEach(function (item) {
            codesMap[item.Code];
            codesMap[item.Code] = item.Description;
            /*    codesMap[item.function][item.code]=item.label
            if(!codesMap[item.function]){
                codesMap[item.function]={}
                if(!codesMap[item.function][item.code]){
                    codesMap[item.function][item.code]=item.label
                }
            }*/
        });
        var query =
            "SELECT [TagNumber]\n" +
            "      ,[FunctionalClassID]\n" +
            "      ,[FunctionalClassLabel]\n" +
            "      ,[ServiceDescription] FROM [TEPDK].[dbo].[tblTag] ";
        sqlServer.getFetchedData("TEPDK", query, processor, 1000, codesMap, function (err, result) {
            fs.writeFileSync("D:\\NLP\\ontologies\\TEPDK\\tagDescriptor.csv", str);
        });
    });
};

//processADLtagsBreakDown()
//processBreakDown()
//decodeFunctionalLocation();

var sql2 =
    "SELECT *\n" +
    "  FROM [rdlquantum].[rdl].[tblAttribute] ,[rdlquantum].[rdl].[tblAttributePickListValue] where [rdlquantum].[rdl].[tblAttributePickListValue].[PickListValueGroupingID] in ('TOTAL-G0000000133',\n" +
    "'TOTAL-G0000000134',\n" +
    "'TOTAL-G0000000135',\n" +
    "'TOTAL-G0000000136',\n" +
    "'TOTAL-G0000000137',\n" +
    "'TOTAL-G0000000138',\n" +
    "'TOTAL-G0000000139',\n" +
    "'TOTAL-G0000000140',\n" +
    "'TOTAL-G0000000141',\n" +
    "'TOTAL-G0000000142',\n" +
    "'TOTAL-G0000000143')\n" +
    "\n" +
    "and [rdlquantum].[rdl].[tblAttributePickListValue].PickListValueGroupingID= [rdlquantum].[rdl].[tblAttribute].PickListValueGroupingID";

processTEPDKtags();
