var Shacl=(function(){

    var self={}


    self.prefixMap = {
        cfihos: "http://w3id.org/readi/rdl/",
        ido: "http://rds.posccaesar.org/ontology/lis14/rdl/",
        dash: "http://datashapes.org/dash#",
        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        sh: "http://www.w3.org/ns/shacl#"
    };
    self.getPrefixes=function() {
        var prefixes = ""
        for (var prefix in self.prefixMap) {
            prefixes += "@prefix " + prefix + ": <" + self.prefixMap[prefix] + ">.\n"

        }
        return prefixes

    }

    self.turtleToRdfsStream=function(turtleStr){
        const rdfParser = import("rdf-parse").default;
        const textStream = import('streamify-string')(`
<http://ex.org/s> <http://ex.org/p> <http://ex.org/o1>, <http://ex.org/o2>.`);

        rdfParser.parse(textStream, { contentType: 'text/turtle', baseIRI: 'http://example.org' })
            .on('data', (quad) => console.log(quad))
            .on('error', (error) => console.error(error))
            .on('end', () => console.log('All done!'));
    }

    self.initSourceLabelPrefixes=function(sourceLabel){
        self.prefixMap[Config.sources[sourceLabel].prefix]=Config.sources[sourceLabel].graphUri
    }

    self.uriToPrefixedUri = function (uri) {
        if(uri.indexOf(":")<0)
            return "\""+uri+"\""
        for (var prefix in self.prefixMap) {
            var uri2 = uri.replace(self.prefixMap[prefix], prefix + ":");
            if (uri2 != uri) {
                return uri2;
            }
        }

        if(uri2==uri){
            var p = uri.lastIndexOf("#");
            if (p<0)
                 p = uri.lastIndexOf("/");

            if(p>-1){
                var prefix=uri.substring(0,p+1)
                var suffix=uri.substring(p+1)
                var prefixId="ns"+ Object.keys(self.prefixMap).length
                self.prefixMap[prefixId]=prefix;
                return prefixId+":"+suffix
            }

        }

        return uri;
    }


   self.getShacl=function(sourceClassUri,targetClassUri,shaclProperties) {
        var shacl = ""
        shacl += sourceClassUri+ "\n" +
            "    a sh:NodeShape ;\n"
       if(targetClassUri)
           shacl +=   "    sh:self.targetClass  " + self.uriToPrefixedUri(targetClassUri) + ";\n"
       shaclProperties.forEach(function (property, index) {
            shacl += "  sh:property [\n" + property + "]"
            if (index == shaclProperties.length - 1) {
                shacl += ".\n"
            } else {
                shacl += ";\n"
            }

        })
        return shacl;

    }






    return self;

})()

export default Shacl
window.Shacl=Shacl