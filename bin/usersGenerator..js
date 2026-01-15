import csvCrawler from './_csvCrawler.';
var filePath = "D:\\Total\\2021\\JeanCharles\\users.csv";

csvCrawler.readCsv({ filePath: filePath }, 500000, function (err, result) {
    if (err) return callbackseries(err);
    data = result.data;
    headers = result.headers;

    var users = {};
    var passwordPrefix = "!ONE-owl_";
    data[0].forEach(function (item) {
        //   item=item[0]
        var login = (item.prenom[0] + "." + item.nom).toUpperCase();
        var password = passwordPrefix + item.prenom[0] + "." + item.nom[0];
        var obj = {
            login: login,
            password: password,
            groups: [item.group],
        };
        users[login] = obj;
    });
    console.log(JSON.stringify(users, null, 2));
});
