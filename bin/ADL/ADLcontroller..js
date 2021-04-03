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
            callback(err,result)
            })
    },
    generateTriples:function(config){

    }




}

module.exports=ADLcontroller;