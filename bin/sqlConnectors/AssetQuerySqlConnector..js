var mysql = require('./mySQLproxy..js')

var AssetQuerySqlConnector = {

    connection: {
        host: "localhost",
        user: "root",
        password: "vi0lon",
        database: 'clov'
    },

    queries: {
        tag: "select * from tag,tag_attribute where tag.ID=tag_attribute.TagId "
    },

    get: function (objectName,quantumArray,callback){

        var  assetQueryMap={}
        var QuantumTypesMap={
            F:"FunctionalClassID",
            A:"AttributeID"
        }

        quantumArray.forEach(function(item) {
            var quantumId = item.id
            var p = quantumId.indexOf("TOTAL-") + 6
            var quantumTypeLetter = quantumId.substring(p, p + 1)
            var quantumTotalId=quantumId.substring(p)
            var quantumType = QuantumTypesMap[quantumTypeLetter]
            if (quantumType) {
                if (!assetQueryMap[quantumType])
                    assetQueryMap[quantumType] = []
                assetQueryMap[quantumType].push(quantumTotalId)
            }
        })





        var query=AssetQuerySqlConnector.queries[objectName];

        for(var key in assetQueryMap){
            query+=" and "

            if(true){
                ""+key+" is not null"
            }
            if(Array.isArray(assetQueryMap[key])){
                query+=""+key+" in ("
                assetQueryMap[key].forEach(function(quantumTotalId,indexId){
                    if(indexId>0){
                        query+=","
                    }
                    query+="'"+quantumTotalId+"'"
                })
                query+=" )"
            }
            else{
                query+=""+key+"='"+paramsMap[key].id+"'"
            }
            query+=" limit 1000"

        }
        mysql.exec(AssetQuerySqlConnector.connection,query,function(err, result){

        })

    }


}
module.exports=AssetQuerySqlConnector;


if(false){
    AssetQuerySqlConnector.get("tag",
        {
            AttributeID:"XXXX",
            FunctionalClassID:"YYYYY"

        }


        )
}

