import fs from 'fs';
import async from 'async';
import SQLserverConnector from './SQLserverConnector.';

var TagAnalyzer = {
    analyzeTag: function (tag) {
        var pattern = "";
        for (var i = 0; i < tag.length; i++) {
            var c = tag.charCodeAt(i);
            if (c > 47 && c < 58) pattern += "N";
            else if (c > 64 && c < 91) pattern += "A";
            else if (c > 96 && c < 123) pattern += "A";
            else if (c == 45) pattern += "-";
            else if (c == 32) pattern += " ";
            else pattern = "ERROR";
        }
        return pattern;
    },

    processTags: function (callback) {
        var systemCodesMap = {};
        var subSystemCodesMap = {};
        var tags = [];
        var tagCodesMap = {};
        async.series(
            [
                //load systems and subSystems maps
                function (callbackSeries) {
                    var query = "select * from dbo.systemUnit_501_207";
                    SQLserverConnector.getData("MIE", query, function (err, result) {
                        if (err) return callback(err);
                        result.forEach(function (item) {
                            systemCodesMap[item.system_code_501] = item;
                            subSystemCodesMap[item.system_code_501 + item.subSystem_code_501] = item;
                        });

                        return callbackSeries();
                    });
                },
                //load tagCodes
                function (callbackSeries) {
                    var query = "select  TagNumber,FunctionalClassID  from  KG_tblTag ";
                    SQLserverConnector.getData("clov", query, function (err, result) {
                        if (err) return callback(err);
                        result.forEach(function (item) {
                            tagCodesMap[item.codification_CodeEP] = item;
                        });

                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    return callbackSeries();
                    /*
                     var str = "" + fs.readFileSync("D:\\NLP\\ontologies\\MIE\\distinctTags.txt");
                    tags = str.split(",");
                    return callbackSeries();
                    */
                },

                // load tags
                function (callbackSeries) {
                    var query = "select  TagNumber,FunctionalClassID from KG_tblTag";
                    SQLserverConnector.getData("clov", query, function (err, result) {
                        if (err) return callback(err);
                        result.forEach(function (item) {
                            tags.push({
                                number: item.TagNumber,
                                functionalClass: item.FunctionalClassID,
                            });
                        });

                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    var output = [];
                    var regexEquipment_501 = /^(?<sector>[\w\d]{1,2})-*(?<item>\w{1,3})-*(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,2})-*(?<suffix>[\w\d]{0,5})-*.*$/g;

                    tags.forEach(function (tag) {
                        var obj = TagAnalyzer.parseTag(tag.number, regexEquipment_501);
                        obj.functionalClass = tag.functionalClass;
                        if (obj) output.push(obj);
                    });

                    var keys = Object.keys(output[0]);
                    var str = "";
                    keys.forEach(function (key, _index) {
                        str += key + "\t";
                    });
                    str += "systemLabel\t";
                    str += "subSystemLabel\t";
                    str += "functionalClassLabel\t";

                    str += "\n";

                    output.forEach(function (item, _index0) {
                        if (!item["system"]) return (str += item.tag + "\n");
                        keys.forEach(function (key, _index) {
                            str += item[key] + "\t";
                        });
                        var systemCode = item["system"];

                        var systemName = "";
                        var system = systemCodesMap[systemCode];
                        if (system) systemName = system.System;
                        str += systemName + "\t";

                        var subSystemCode = item["system"] + item["subSystem"];
                        var subSystemName = "";
                        var subSystem = subSystemCodesMap[subSystemCode];
                        if (subSystem) subSystemName = subSystem.SubSystem;

                        str += subSystemName + "\t";

                        // var functionalClassName = tagCodesMap[item["equipmentType"]];
                        var functionalClassName = item.functionalClass;
                        /*   if (functionalClass)
                            functionalClassName = functionalClass.functionalClass_Name*/

                        str += functionalClassName + "\t";

                        str += "\n";
                    });
                    fs.writeFileSync("D:\\NLP\\ontologies\\MIE\\parseTagsClov.txt", str);

                    return callbackSeries();
                },

                /*             function (callbackSeries) {
return callbackSeries()
                    var patterns = {}
                    var output = []

                    var regexEquipment_501b = /^(?<sector>[\d]{0,1})-*(?<A>[A-Z]{0,4})(?<B>[0-9]{0,5})-*(?<C>[A-Z]{1,3})-*(?<D>[0-9]*)-*(?<E>.*)$/
                    tags.forEach(function (tag,) {
                        var obj = TagAnalyzer.parseTag(tag, regexEquipment_501b);
                        if (obj)
                            output.push(obj)
                    })
                    var keys = Object.keys(output[0])
                    var str = ""
                    keys.forEach(function (key, index) {
                        str += key + "\t"
                    })

                    str += "\n"


                    output.forEach(function (item, index0) {

                        keys.forEach(function (key, index) {
                            str += item[key] + "\t"
                        })
                        str += "\n"


                    })
                    fs.writeFileSync("D:\\NLP\\ontologies\\MIE\\parseTagsB.txt", str)
                }*/
            ],
            function (_err) {
                /* XXX do nothing ? */
            },
        );
    },

    parseTag: function (tag, regex) {
        var obj = regex.exec(tag);
        if (obj) {
            var groups = obj.groups;
            groups.tag = tag;
            return groups;
        } else {
            return { tag: tag };
        }
    },
    deconcat: function () {
        var str =
            "0 Critical & Safety,Systems,Main critical and safety equipment,1 Hydrocarbon extraction Equipment from crude oil/gas well to the treatment,units (treatment excluded),2 Produced liquid,processing,Equipment dedicated to treat and evacuate Oil,production,3 Produced Gas,processing,Equipment dedicated to treat and evacuate, dispose,or inject gas production,4 Produced gas liquid,processing,Equipment dedicated to treat and evacuate NGL,5 Water processing Equipment dedicated to treat, evacuate or inject,water,6 Electric Energy All general equipment for electrical production and,distribution,7 Common Facilities Topsides utilities, Subsea distribution systems,(umbilical, umbilical distribution modules…),8 Housing & Others Housing, building, structure and miscellaneous";
        var data = str.split(",");
        var output = "";
        data.forEach(function (str) {
            var p = str.indexOf(" ");
            output += str.substring(0, p) + "," + str.substring(p + 1) + "\n";
        });
        console.log(output);
    },

    clovFormats: [
        ["TOTAL-T0000000001", "XX-NN-AA(A)(A)-NNNN(A)", "Main equipments tag structure"],
        ["TOTAL-T0000000002", "XX-NN-AAAA-NNNN(A)", "Piping equipments (SP items) tagging specific requirements"],
        ["TOTAL-T0000000003", "XX-NN-AA(A)(A)-NNNN(A)-A(A)(N)(N)(N)(N)(N)", "Switchgears and MCC compartments"],
        ["TOTAL-T0000000004", "XX-NN-AA(A)(A)-NNNN(A)", "Electrical equipment related to other main equipment"],
        ["TOTAL-T0000000005", "XX-NN-XXXX-NNNN(A)", "Telecom equipments tagging specific requirements"],
        ["TOTAL-T0000000006", "XX-NN-A(A)(A)(A)(A)(A)-NNNN(A)", "Field instruments & instrumented functions tag structure"],
        ["TOTAL-T0000000007", "XX-NN-AA(A)(A)-NNNN(A)-AX(X)(X)(X)", "Electrical consumer controls"],
        ["TOTAL-T0000000008", "XX-NN-A(A)(A)(A)(A)(A)-NNNN(A)-AA", "Hardwired links between ICSS sub-systems"],
        ["TOTAL-T0000000009", "XX-NN-N(N)(N)(N)N-AA(A)-NNN-ANN(A)(X)-(A)(A)", "Piping tag structure"],
        ["TOTAL-T0000000010", "XX-NN-N(N)(N)(N)N-AA(A)-NNN-AANN", "Piping supports"],
        ["TOTAL-T0000000011", "XX-NN-AANN-AAA-NNNN", "Ducting tag structure"],
        ["TOTAL-T0000000012", "XX(X)(X)-NN-N(N)(N)(N)NAA(A)-(N)(N)NN(A)-(A)(A)", "Pipeline tag structure"],
        ["TOTAL-T0000000013", "XX-NN-AA-NNNN(A)", "Manual valves"],
        ["TOTAL-T0000000014", "XX-NN-AA(A)(A)-NNNN(A)-AA(X)(X)(X)", "Electrical & instrumentation cables tag structure"],
        ["TOTAL-T0000000015", "XX-NN-A(A)(A)(A)(A)(A)-NNNN(A)-AA(X)(X)(X)", "Tubing"],
    ],

    tagFormatsToRegex: function () {
        var formats = [];
        TagAnalyzer.clovFormats.forEach(function (item) {
            formats.push({
                name: item[2],
                id: item[0],
                value: item[1],
            });
        });
        var formatRegexmap = {};
        formats.forEach(function (item) {
            var regexStr = "";
            var array = item.value.split("-");
            //var okLetters = ["A", "N", "X"];
            const contents = [];

            array.forEach(function (str, _index) {
                var isOptional = false;

                var content = [];

                str = str.replace(/ /g, "");
                for (var i = 0; i < str.length; i++) {
                    var letter = str.charAt(i);
                    if (letter == "(") {
                        isOptional = true;
                        continue;
                    } else if (letter == ")") {
                        continue;
                    }

                    if (i == 0) {
                        content.push({ letter: letter, optional: isOptional, count: 1 });
                    } else if (letter != str.charAt(i - 1) || content[content.length - 1].optional != isOptional) {
                        content.push({ letter: letter, optional: isOptional, count: 1 });
                    } else {
                        content[content.length - 1].count += 1;
                    }
                }

                contents.push(content);

                regexStr += "-";
            });

            var map = {
                X: "[\\w\\d]",
                A: "\\w",
                N: "\\d",
            };
            regexStr = "";
            contents.forEach(function (content, index) {
                if (index > 0) regexStr += "-";
                regexStr += "(?<group" + index + ">";
                content.forEach(function (item) {
                    var cardinality = "{";
                    if (item.optional) cardinality += "0,";
                    cardinality += item.count;
                    cardinality += "}";
                    var exp = map[item.letter];
                    regexStr += exp + cardinality;
                });
                regexStr += ")";
            });

            regexStr += "";

            formatRegexmap[regexStr] = item;
        });
    },
    ClovRegexps: {
        501: /^(?<sector>[\w\d]{1,2})-*(?<item>\w{1,3})-*(?<system>\d)(?<subSystem>\d)(?<seqNum>\d{1,2})-*(?<suffix>[\w\d]{0,5})-*.*$/g,
    },
    ClovRegexpsXX: {
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\w{2}\\w{0,1}\\w{0,1})-(?<group3>\\d{4}\\w{0,1})": {
            name: "Electrical equipment related to other main equipment",
            id: "TOTAL-T0000000004",
            value: "XX-NN-AA(A)(A)-NNNN(A)",
        },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\w{4})-(?<group3>\\d{4}\\w{0,1})": {
            name: "Piping equipments (SP items) tagging specific requirements",
            id: "TOTAL-T0000000002",
            value: "XX-NN-AAAA-NNNN(A)",
        },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\w{2}\\w{0,1}\\w{0,1})-(?<group3>\\d{4}\\w{0,1})-(?<group4>\\w{1}\\w{0,1}\\d{0,1}\\d{0,1}\\d{0,1}\\d{0,1}\\d{0,1})": {
            name: "Switchgears and MCC compartments",
            id: "TOTAL-T0000000003",
            value: "XX-NN-AA(A)(A)-NNNN(A)-A(A)(N)(N)(N)(N)(N)",
        },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>[\\w\\d]{4})-(?<group3>\\d{4}\\w{0,1})": {
            name: "Telecom equipments tagging specific requirements",
            id: "TOTAL-T0000000005",
            value: "XX-NN-XXXX-NNNN(A)",
        },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\w{1}\\w{0,1}\\w{0,1}\\w{0,1}\\w{0,1}\\w{0,1})-(?<group3>\\d{4}\\w{0,1})": {
            name: "Field instruments & instrumented functions tag structure",
            id: "TOTAL-T0000000006",
            value: "XX-NN-A(A)(A)(A)(A)(A)-NNNN(A)",
        },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\w{2}\\w{0,1}\\w{0,1})-(?<group3>\\d{4}\\w{0,1})-(?<group4>\\w{1}[\\w\\d]{1}[\\w\\d]{0,1}[\\w\\d]{0,1}[\\w\\d]{0,1})": {
            name: "Electrical consumer controls",
            id: "TOTAL-T0000000007",
            value: "XX-NN-AA(A)(A)-NNNN(A)-AX(X)(X)(X)",
        },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\w{1}\\w{0,1}\\w{0,1}\\w{0,1}\\w{0,1}\\w{0,1})-(?<group3>\\d{4}\\w{0,1})-(?<group4>\\w{2})": {
            name: "Hardwired links between ICSS sub-systems",
            id: "TOTAL-T0000000008",
            value: "XX-NN-A(A)(A)(A)(A)(A)-NNNN(A)-AA",
        },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\d{1}\\d{0,1}\\d{0,1}\\d{0,1}\\d{0,1})-(?<group3>\\w{2}\\w{0,1})-(?<group4>\\d{3})-(?<group5>\\w{1}\\d{2}\\w{0,1}[\\w\\d]{0,1})-(?<group6>\\w{0,1}\\w{0,1})":
            {
                name: "Piping tag structure",
                id: "TOTAL-T0000000009",
                value: "XX-NN-N(N)(N)(N)N-AA(A)-NNN-ANN(A)(X)-(A)(A)",
            },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\d{1}\\d{0,1}\\d{0,1}\\d{0,1}\\d{0,1})-(?<group3>\\w{2}\\w{0,1})-(?<group4>\\d{3})-(?<group5>\\w{2}\\d{2})": {
            name: "Piping supports",
            id: "TOTAL-T0000000010",
            value: "XX-NN-N(N)(N)(N)N-AA(A)-NNN-AANN",
        },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\w{2}\\d{2})-(?<group3>\\w{3})-(?<group4>\\d{4})": {
            name: "Ducting tag structure",
            id: "TOTAL-T0000000011",
            value: "XX-NN-AANN-AAA-NNNN",
        },
        "(?<group0>[\\w\\d]{2}[\\w\\d]{0,1}[\\w\\d]{0,1})-(?<group1>\\d{2})-(?<group2>\\d{1}\\d{0,1}\\d{0,1}\\d{0,1}\\d{0,1}\\w{0,2}\\w{0,1})-(?<group3>\\d{0,1}\\d{0,1}\\d{0,2}\\w{0,1})-(?<group4>\\w{0,1}\\w{0,1})":
            {
                name: "Pipeline tag structure",
                id: "TOTAL-T0000000012",
                value: "XX(X)(X)-NN-N(N)(N)(N)NAA(A)-(N)(N)NN(A)-(A)(A)",
            },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\w{2})-(?<group3>\\d{4}\\w{0,1})": {
            name: "Manual valves",
            id: "TOTAL-T0000000013",
            value: "XX-NN-AA-NNNN(A)",
        },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\w{2}\\w{0,1}\\w{0,1})-(?<group3>\\d{4}\\w{0,1})-(?<group4>\\w{2}[\\w\\d]{0,1}[\\w\\d]{0,1}[\\w\\d]{0,1})": {
            name: "Electrical & instrumentation cables tag structure",
            id: "TOTAL-T0000000014",
            value: "XX-NN-AA(A)(A)-NNNN(A)-AA(X)(X)(X)",
        },
        "(?<group0>[\\w\\d]{2})-(?<group1>\\d{2})-(?<group2>\\w{1}\\w{0,1}\\w{0,1}\\w{0,1}\\w{0,1}\\w{0,1})-(?<group3>\\d{4}\\w{0,1})-(?<group4>\\w{2}[\\w\\d]{0,1}[\\w\\d]{0,1}[\\w\\d]{0,1})": {
            name: "Tubing",
            id: "TOTAL-T0000000015",
            value: "XX-NN-A(A)(A)(A)(A)(A)-NNNN(A)-AA(X)(X)(X)",
        },
    },

    parseClovTags: function () {
        var tags = {};

        async.series(
            [
                // load tags
                function (callbackSeries) {
                    var query = "select  TOP (1000) TagNumber from KG_tblTag";
                    SQLserverConnector.getData("clov", query, function (_err, result) {
                        result.forEach(function (item) {
                            tags[item.TagNumber] = {};
                        });

                        return callbackSeries();
                    });
                },
                // parse tags
                function (_callbackSeries) {
                    for (var key in TagAnalyzer.ClovRegexps) {
                        var regex = new RegExp(TagAnalyzer.ClovRegexps[key]);
                        for (var tag in tags) {
                            var array = regex.exec(tag);
                            if (array && array.length > 0) {
                                // XXX do nothing
                            }
                        }
                    }
                },
            ],
            function (_err) {
                /* XXX do nothing ? */
            },
        );
    },
};

module.exports = TagAnalyzer;

//TagAnalyzer.deconcat()
//TagAnalyzer.processTags("5FY1043")

//TagAnalyzer.parseClovTags()

TagAnalyzer.processTags();
