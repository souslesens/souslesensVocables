var fs = require("fs");

var str = "" + fs.readFileSync("D:\\NLP\\ontologies\\LIFEX_DALIA\\database\\ScriptFile.sql");
str = str.replace(/\r/gm, " ");
str = str.replace(/\n/gm, " ");
str = str.replace(/\t/gm, " ");
str = str.replace(/GO/gm, "|");
var array = str.split("|");

var x = array;

var tables = [];
var views = [];

var regexTable = /(CREATE TABLE +.*)(, {2}PRIMARY KEY CLUSTERED)/gm;
/*
var match=[];
while((match=regexTable.exec(str))!=null) {

    tables.push(match[1] + ") \nGO\n")
}*/

array.forEach(function (item) {
    if (item.indexOf("CREATE TABLE") > -1) {
        var match = regexTable.exec(item);
        if (match) tables.push(match[1] + ") \nGO\n");
        else var x = 3;
    }
    if (item.toLowerCase().indexOf("create view") > -1) views.push(item + "\n");
});

var x = tables;

var y = views;
