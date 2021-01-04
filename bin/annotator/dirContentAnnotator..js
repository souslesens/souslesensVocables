var fs=require('fs')
var path=require('path')
var TikaClient = require( 'tika-server-client' );



var acceptedExtensions = ["ttl","doc", "docx", "xls", "xslx", "pdf", "odt", "ods", "ppt", "pptx", "html", "htm", "txt", "csv"];
var maxDocSize=20*1000*1000;
var tikaServerUrl= 'http://vps475829.ovh.net:9998'
var DirContentAnnotator={

    socket:{
        message:function(text){
            console.log(text)
        }
    },


    getDocTextFromTika:function(filePath,callback){

        var tika = new TikaClient(tikaServerUrl );
        tika.tikaFromFile( filePath)
            .then( function( text ) {
                callback(null, text );
            }).error(function(err){
                callback(err);
        });

    },



   getDirContent:function(parent,dirPath) {
       var dirsArray = []
var dirFilesMap={}
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
                   dirFilesMap[fileName+"\\"]=[];
                   dirsArray.push({type: "dir", name: files[i], parent: parent})
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
                   if(!dirFilesMap[parent])
                       dirFilesMap[parent]=[]
                   dirFilesMap[parent].push({type: "file", parent: parent, name: files[i], infos: infos})
                  // dirsArray.push({type: "file", parent: parent, name: files[i], infos: infos})

               }


           }

       }


       recurse(dirPath, dirPath);
       var x = dirsArray;
       var y=dirFilesMap

       var dirMap = {}
       var parentsMap={}
       var topNodes=[]
       dirsArray.forEach(function (item) {
          var array=item.parent.substring(dirPath.length+1).split("\\")
           var parent
           array.forEach(function(child,index){
               if(child=="")
               return;

               if(index==0) {
                   parent = "#"
                   if(topNodes.indexOf(child)<0)
                   topNodes.push(child)
               }else
                   parent=array[index-1]
               if(!dirMap[parent] )
                   dirMap[parent]={level:index,childrenFiles:[],childrenDirs:[]}

                   if (dirMap[parent].childrenDirs.indexOf(child) < 0)
                       dirMap[parent].childrenDirs.push(child);




           })




       })

       for(var dir in dirFilesMap){
           var array=dir.split("\\")
           var dir2=array[array.length-2]
           if(! dirMap[dir2])
               var x=3
           dirMap[dir2].childrenFiles=dirFilesMap[dir]
       }



   var x=dirMap;
       var y=topNodes

       var recurse =function(parent) {
           if (!parent.dirs)
               parent.dirs = {}
           if (!parent.files)
               parent.files = []
if(! dirMap[parent.name])
    var x=3
           dirMap[parent.name].childrenDirs.forEach(function (item) {
               if (! parent.dirs[item])
                   parent.dirs[item]={name:item}
               recurse (parent.dirs[item])
           })

          dirMap[parent.name].childrenFiles.forEach(function (item) {
               if (! parent.files)
                   parent.files=[]
               parent.files.push(item)

           })

               }
var tree={};
       topNodes.forEach(function(item){

           var subTree={name:item}
           recurse(subTree);
           tree[item]=subTree
         //  console.log(JSON.stringify(subTree,null,2))
       })



       }







}

module.exports=DirContentAnnotator;
if(true){

    DirContentAnnotator.getDirContent({},"D:\\NLP\\ontologies")
}
if(false){
var filePath="D:\\NLP\\ontologies\\incose_ISO_TC67_MBSE_JCL.docx"
    var filePath="D:\\Total\\2020\\JeanCharles\\Proposition  de prestation Total EP Quantum-next-gen 1.pptx"
    DirContentAnnotator.getDocTextFromTika(filePath)


}
