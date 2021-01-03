var fs=require('fs')
var path=require('path')



var acceptedExtensions = ["ttl","doc", "docx", "xls", "xslx", "pdf", "odt", "ods", "ppt", "pptx", "html", "htm", "txt", "csv"];
var maxDocSize=20*1000*1000;
var DirContentAnnotator={

    socket:{
        message:function(text){
            console.log(text)
        }
    },

   getDirContent:function(parent,dirPath) {
       var outputFiles = []

       function recurse(parent) {
           parent = path.normalize(parent);
           if (!fs.existsSync(parent))
               return ("dir doesnt not exist :" + parent)
           if (parent.charAt(parent.length - 1) != path.sep)
               parent += path.sep;


           var files = fs.readdirSync(parent);
           for (var i = 0; i < files.length; i++) {
               var fileName = parent + files[i];
               var stats = fs.statSync(fileName);
               var infos = {lastModified: stats.mtimeMs};//fileInfos.getDirInfos(dir);

               if (stats.isDirectory()) {
                   outputFiles.push({type: "dir", name: files[i], parent: parent})
                   recurse(fileName)
               } else {
                   var p = fileName.lastIndexOf(".");
                   if (p < 0)
                       continue;
                   var extension = fileName.substring(p + 1).toLowerCase();
                   if (acceptedExtensions.indexOf(extension) < 0) {
                       DirContentAnnotator.socket.message("!!!!!!  refusedExtension " + fileName);
                       continue;
                   }
                   if (stats.size > maxDocSize) {
                       DirContentAnnotator.socket.message("!!!!!! " + fileName + " file  too big " + Math.round(stats.size / 1000) + " Ko , not indexed ");
                       continue;
                   }
                   outputFiles.push({type: "file", parent: parent, name: files[i], infos: infos})

               }


           }

       }


       recurse(dirPath, dirPath);
       var x = outputFiles;

       var map = {}
       var parentsMap={}
       var topNodes=[]
       outputFiles.forEach(function (item) {
           if (item.type == "dir")
               map[item.name] = item
           parentsMap[item.parent]=item
       })


   var x=parentsMap;
       var y=map;

   }




}

module.exports=DirContentAnnotator;
if(true){

    DirContentAnnotator.getDirContent({},"D:\\NLP\\ontologies")
}
