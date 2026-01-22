

import fs from "fs";




//var dir="C:\\Users\\Karim.OUNNOUGHI\\OneDrive - AKKA\\Documents\\Akkodis\\Taff\\Total\\dalia\\planning doris topside\\"
var dir='C:\\Users\\Karim.OUNNOUGHI\\OneDrive - AKKA\\Documents\\Akkodis\\Taff\\Total\\dalia\\planning doris topside\\extract reza 17_07_2024\\xer\\'
//var path=dir+"DALFX-rev02.xer"
var path=dir+'DALFX-rev03_POST AFD (1).xer'


var str=""+fs.readFileSync(path)+"\n"

var lines=str.split("\n")

var files={}


var currentFileName=""
var currentHeaders=""
var currentbody=""
var nLines=0
lines.forEach(function(line){
    var cells=line.split("\t")



    if(cells[0]=="%T"){
        console.log(line)
        if(currentFileName){
            files[currentFileName]={
               header: currentHeaders,
                body:currentbody,
                lines:nLines
            }
        }
        var fileName=cells[1].trim()


        var currentFileName=fileName
       var currentHeaders=""
        var currentbody=""
        var nLines=0
    }else if(cells[0]=="%F"){

        currentHeaders=line.substring(3);
    }else if(cells[0]=="%R"){
        currentbody+=line.substring(3)
        nLines+=1
    }
})

if(currentFileName){
    files[currentFileName]={
        header: currentHeaders,
        body:currentbody,
        lines:nLines
    }
}

var allHearders=""

    for(var key in files){
    fs.writeFileSync(dir+key+".csv",files[key].header+files[key].body)

        allHearders+=key+"\t"+files[key].lines+"\t"+files[key].header

}

fs.writeFileSync(dir+"_allHeaders.csv",allHearders)


var model=""
for(var key in files){
var cols=files[key].header.split("\t")
    cols.forEach(function(col){
        model+=key+"\t"+col+"\n"
    })
    allHearders+=key+"\t"+files[key].lines+"\t"+files[key].header

}

fs.writeFileSync(dir+"_model.csv",model)