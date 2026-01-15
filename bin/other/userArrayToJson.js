import fs from 'fs';

var path = "C:\\Users\\claud\\Downloads\\classeur3.csv";
var str = "" + fs.readFileSync(path);

var lines = str.split("\n");

lines.forEach(function (line) {
    var cells = line.split("\t");

    var user = {
        [cells[1]]: {
            id: "01HPZ3YREQPN2NCVF5YHJVXFNF",
            _type: "user",
            login: cells[1],
            password: "$2b$10$ct4GGLWG7lsaEv6skZBHYu/bvy4i9bCyu3WzkgcLmi9huJKzYktXi",
            groups: ["admin"],
            source: "json",
            allowSourceCreation: true,
            maxNumberCreatedSource: 5,
            token: "sls-01hpz3zx3e6h221fkd77y5cpf2a4f0e",
        },
    };
});
