const async = require("async");

const fs = require("fs");
const csv = require("csv-parser");
const util = require("../../bin/util.");

var crawler = {


    readCsv: function (filePath,separator, lines,processor, callback) {
        if (!fs.existsSync(filePath)) return callback("file does not exists :" + filePath);
        var headers=[]
        var jsonData=[];
        var jsonDataFetch=[]

            fs.createReadStream(filePath,{encoding : 'utf8'}).pipe(
                csv({
                    separator: separator,
               mapHeaders: ({ header }) =>
                 util.normalizeHeader(headers, header),
                })
                    .on("header", function (header) {
                        headers.push(header);
                    })

                    .on("data", function (data) {
                        var emptyLine = true;
                        for (var i = 0; i < headers.length; i++) {
                            if (data[headers[i]]) {
                                emptyLine = false;
                                break;
                            }
                        }
                        if (emptyLine) return;

                        jsonDataFetch.push(data);

                        if (lines && jsonDataFetch.length >= lines) {
                            if(processor){
                                processor(jsonDataFetch,headers,filePath,function(err){

                                })


                            }

                            jsonData.push(jsonDataFetch);
                            jsonDataFetch = [];
                        }
                    })
                    .on("end", function () {
                        jsonData.push(jsonDataFetch);
                        return callback(null, { headers: headers, data: jsonData });
                    })
                    .on("error", function (error) {
                        return callback(error);
                    })
            );

    },
};
module.exports = crawler;







function convertSep(filePath,fromsep,tosep,targetPath){
    var c=String.fromCharCode(65533)
   var   regex=new RegExp(c,"g")

    var index=0;
    var rs = fs.createReadStream(filePath);
    var ws = fs.createWriteStream(targetPath,'UTF8');
    var Transform = require('stream').Transform;
    var transformer = new Transform();
    const replace = require('buffer-replace');
    transformer._transform = function(data, encoding, cb) {
        var c=String.fromCharCode(65533)
 // data2=  replace(data, c, tosep)
  //  return    cb(null,data2);

     var str=""+data

     var   str2=str.replace(regex,"\t")
          var data2=Buffer.from(str2)
        if(index++==0)
            fs.writeFileSync(filePath+"extract.txt",str2)

        cb(null,data2);
    }

    rs.pipe(transformer)
      .pipe(ws);

}


var dir="D:\\NLP\\ontologies\\TEPDK2\\OMS\\Final Extract\\"





var file="floc_mou_structures_01052021.txt"
var file="floc_omobjc_01052021.txt"
var file="Mou_char_values_all_01052021.txt"
var file="Mou_functional_locations_all_01052021.txt"
/*convertSep(dir+file,'¤',",",dir+file+"_sep")
return;*/


if( false) {

  var file="Mou_char_values_all_01052021.txt"
  var distinctMou_char_values = {}
  var str = "OBJ_CLASS\tCHR_CHAR"
  var Mou_char_values_processor = function(lines, headers, filePath) {

    lines.forEach(function(item) {
      var key = item.OBJ_CLASS + "\t" + item.CHR_CHAR
      if (!distinctMou_char_values[key])
        distinctMou_char_values[key] = 1
      str += key + "\n"

    })
    console.log(Object.keys(distinctMou_char_values).length)
  }
  crawler.readCsv(dir+file+"_sep",'\t',1000,Mou_char_values_processor,function(err,result){
    var  outputFile="D:\\NLP\\ontologies\\TEPDK2\\OMS\\Final Extract\\Mou_char_values_distinct.txt"
    fs.writeFileSync(outputFile,str)
  })
}






/*
Mou_functional_locations_all_01052021.txt
	FL_CODE		FL_STATUS		FL_USER_STATUS		EQ_CODE		EQ_STATUS		EQ_USER_STATUS
	HBDA-HTJB-1871-0002-L2-3	CRTE	APPR	400200795	CRTE
	GOFC-HCV-50539A-D	CRTE	APPR NOPM	400160241	INST
	GOFC-FO-50325	CRTE	APPR	400125434	INST
	GOFC-HCV-34102	CRTE	APPR NOPM	400186513	INST
	DB-HCV-54623	CRTE	APPR NOPM

"Mou_char_values_all_01052021.txt"
CHR_OBJCTOBJ_CLASSOBJ_STATUSOBJ_USR_STATUSCHR_CHARCHR_VALU
400075019"�"ZMOG_	QUI_APU	"�"INST"�"�
400075057"�"ZMOG_	QUI_A	XC"�"INST"�"�"MWF"�"6 KG CONTAIN	R VOLUM	 8.04 L
400075040"�"ZMOG_	QUI_ASDT"�"INST"�"�"BODM"�"PLASTIC
400075040"�"ZMOG_	QUI_ASDT"�"INST"�"�"SIOU"�"100 MICRO TO 100MA
400075040"�"ZMOG_	QUI_ASDT"�"INST"�"�"DIM"�"112 X 136MM
400075044"�"ZMOG_	QUI_APU	"�"INST"�"�"BABM"�"CS
400075047"�"ZMOG_	QUI_APU	"�"INST"�"�"BABM"�"CS
400075066"�"ZMOG_	QUI_A	XC"�"INST"�"�"MWF"�"6 KG CONTAIN	R VOLUM	 8.04 L
400075075"�"ZMOG_	QUI_AILU"�"INST"�"�"RV"�"220 - 254 V +/- 10%
400075075"�"ZMOG_	QUI_AILU"�"INST"�"�"TYP	"�"2X36 W BI PINS LAMPS WITH G13
400075095"�"ZMOG_	QUI_A	XC"�"INST"�"�"MWF"�"6 KG CONTAIN	R VOLUM	 8.04 L
400075092"�"ZMOG_	QUI_A	XC"�"INST"�"�"MWF"�"6 KG CONTAIN	R VOLUM	 8.04 L
400075123"�"ZMOG_	QUI_ATIN"�"INST"�"�"BABM"�"304SST /
400075123"�"ZMOG_	QUI_ATIN"�"INST"�"�
400075131"�"ZMOG_	QUI_A	XC"�"INST"�"�"MWF"�"6 KG CONTAIN	R VOLUM	 8.04 L
400075136"�"ZMOG_	QUI_A	XC"�"INST"�"�"MWF"�"6 KG CONTAIN	R VOLUM	 8.04 L
400075147"�"ZMOG_	QUI_A	XC"�"INST"�"�"MWF"�"6 KG CONTAIN	R VOLUM	 8.04 L
400075144"�"ZMOG_	QUI_A	XC"�"INST"�"�"MWF"�"6 KG CONTAIN	R VOLUM	 8.04 L


 */