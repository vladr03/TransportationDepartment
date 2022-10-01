const mysql = require("mysql2");
const express = require("express");

const app = express(); //like an object
const urlencodedParser = express.urlencoded({ extended: false });

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "transportation_departament"
});

app.set("view engine", "hbs");

//create account
app.get("/create", function (req, res) {
    res.render("create.hbs");
});

//login
app.get("/login", function (req, res) {
    res.render("login.hbs");
});

//leave an order
app.get("/main", function (req, res) {
    res.render("main.hbs");
});

//edit account
app.get("/edit/:id", function (req, res) {
    const id = req.params.id;
    console.log("id:", id);
    connection.execute("SELECT * FROM customers WHERE id=?", [id], function (err, data) {
        if (err) return console.log(err);
        res.render("edit.hbs", {
            customer: data[0]
        });
    });
});

//all accounts
app.get("/index", function (req, res) {
    connection.execute("SELECT * FROM customers", function (err, data) {
        if (err) return console.log(err);
        res.render("index.hbs", {
            customers: data
        });
    });
});

app.post("/main", urlencodedParser, function (req, res) {

    if (!req.body) return res.sendStatus(400);
    const name = req.body.name;
    const cargo = req.body.cargo;
    const truck = req.body.truck;
    const city = req.body.city;
    const delivery_date = req.body.delivery_date;
    connection.execute("INSERT INTO transportations (name, cargo, truck, city, delivery_date) VALUES (?, ?, ?, ?, ?)", [name, cargo, truck, city, delivery_date], function (err, data) {
        if (err) return console.log(err);
        res.redirect("/main");
    });
});

app.post("/create", urlencodedParser, function (req, res) {

    if (!req.body) return res.sendStatus(400);
    const name = req.body.name;
    const email = req.body.email;
    const number = req.body.number;
    const city = req.body.city;
    const password = req.body.password;
    connection.execute("INSERT INTO customers (name, email, number, city, password) VALUES (?, ?, ?, ?, ?)", [name, email, number, city, password], function (err, data) {
        if (err) return console.log(err);
        res.redirect("/index");
    });
});

app.post("/edit", urlencodedParser, function (req, res) {

    if (!req.body) return res.sendStatus(400);
    const id = req.body.id;
    const name = req.body.name;
    const email = req.body.email;
    const number = req.body.number;
    const city = req.body.city;
    const password = req.body.password;
    console.log("id: ", id);
    console.log("name", name);
    connection.execute("UPDATE customers SET name=?, email=?, number=?, city=?, password=? WHERE id=?", [name, email, number, city, password, id], function (err, data) {
        if (err) return console.log(err);
        res.redirect("/index");
    });
});

app.post('/login', urlencodedParser, function (req, res) {
    const email = req.body.email;
    const password = req.body.password;
    if (email && password) {
        connection.query('SELECT * FROM customers WHERE email = ? AND password = ?', [email, password], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                res.redirect('/index');
            } else {
                res.send('Incorrect Username and/or Password!');
            }
            res.end();
        });
    } else {
        res.send('Please enter Username and Password!');
        res.end();
    }
});

app.listen(3306, function () {
    console.log("Сервер ожидает подключения...");
});