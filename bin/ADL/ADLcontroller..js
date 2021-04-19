var fs=require('fs')
var path=require('path')

var ADLcontroller={
    getSourceFilePath:function(source){
        var filePath = path.join(__dirname, "data/"+source+".json")
        return path.resolve(filePath)
    },


    saveMappings:function(source,jsonStr,callback){

        var filePath=ADLcontroller.getSourceFilePath(source);
        fs.writeFile(filePath,jsonStr,null,function(err, result){
            callback(err)
        })
    },
    getMappings:function(source,callback){
        var filePath=ADLcontroller.getSourceFilePath(source);
        if(!fs.existsSync(filePath))
            return callback(null,null)
        fs.readFile(filePath,function(err,result){
            try {
                var json = JSON.parse(result)
                callback(err,json)
            }catch(e){
                callback(e);
            }

            })
    },
    generateTriples:function(config){

    }




}

/*var str='sdfdfsf(vdsfsf(sdgdgfdfg)dsgfdfg'

var c1=(str.match(/\(/g) || []).length
var c2=(str.match(/\)/g) || []).length
if(c1!=c2)
    var x=3

str = str.replace(/\$/gm, "\\\$")
console.log(str)*/
module.exports=ADLcontroller;