const mysql = require("mysql2");

const connection = mysql.createConnection({
    connectionLimit: 5,
    host: "localhost",
    user: "root",
    password: "",
    database: "transportation_departament"
});

const sql = "INSERT INTO customers(id, name) VALUES(?, ?)";
 
connection.query(sql, user, function(err, results) {
    if(err) console.log(err);
    else console.log("Данные добавлены");
});

const ROLE = {
    ADMIN: "admin",
    BASIC: "basic"
}

module.exports = {
    ROLE: ROLE
}