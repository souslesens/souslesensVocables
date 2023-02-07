const ParsingClient = require('D:\\webstorm\\souslesensVocables\\node_modules\\jena-tdb\\ParsingClient.js')


 const client = new ParsingClient({
    bin: 'D:\\apache-jena-4.7.0',
  //  db: 'tbbt-db'
  })



client.on("data", function (quad) {
 console.log(quad)
});
client.on("end", function (quad) {
 console.log("x")
  });

client.on("error", function (err) {
  console.log(err)
});