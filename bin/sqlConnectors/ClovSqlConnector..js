var mysql = require('./mySQLproxy..js')

var ClovSqlConnector = {

    connection: {
        host: "localhost",
        user: "root",
        password: "vi0lon",
        database: 'clov'
    },

    queries: {
        tag: "select * from tag,tag_attribute where tag.ID=tag_attribute.TagId "
    },

    get: function ( objectName,paramsMap,callback){
        var query=ClovSqlConnector.queries[objectName];

        for(var key in paramsMap){
            query+=" and "
            if(Array.isArray(paramsMap[key])){
                query+=""+key+" in ("
                paramsMap[key].value.forEach(function(id,indexId){
                    if(indexId>0){
                        query+=","
                    }
                    query+="'"+id+"'"
                })
                query+=" )"
            }
            else{
                query+=""+key+"='"+paramsMap[key]+"'"
            }

        }
        mysql.exec(ClovSqlConnector.connection,query,function(err, result){

        })

    }


}
module.exports=ClovSqlConnector;


if(true){
    ClovSqlConnector.get("tag",
        {
            AttributeID:"XXXX",
            FunctionalClassID:"YYYYY"

        }


        )
}

