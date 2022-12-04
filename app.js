const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const mysql = require('mysql')
const crypto = require('crypto')
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session)
const hbs = require("hbs");



app.use(express.static(__dirname + '/public'));

app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    store: new MySQLStore({
        host: 'localhost',
        port: 3306,
        user: 'root',
        database: 'cookie_user'
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}))

app.use(passport.initialize())
app.use(passport.session())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(express.static('public'))
app.set('view engine', 'ejs', 'hbs')

hbs.registerHelper("when", function (operand_1, operator, operand_2, options) {
    var operators = {
        'eq': function (l, r) { return l == r; },
        'noteq': function (l, r) { return l != r; },
        'gt': function (l, r) { return Number(l) > Number(r); },
        'or': function (l, r) { return l || r; },
        'and': function (l, r) { return l && r; },
        '%': function (l, r) { return (l % r) === 0; }
    }
        , result = operators[operator](operand_1, operand_2);

    if (result) return options.fn(this);
    else return options.inverse(this);
});

var pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'transportation_departament',
    multipleStatements: true
})

const customFields = {
    usernameField: 'email',
    passwordField: 'password'
}

// Passport JS
const verifyCallback = (email, password, done) => {
    pool.query('SELECT * FROM customers WHERE email = ?', [email], function (error, results, fields) {
        if (error) {
            return done(error);
        }

        if (results.length == 0) {
            return done(null, false)
        }
        console.log('email: ', email)
        console.log('password: ', password)
        const isValid = validPassword(password, results[0].hash, results[0].salt)
        user = { customer_id: results[0].customer_id, name: results[0].name, email: results[0].email, number: results[0].number, city: results[0].city, hash: results[0].hash, salt: results[0].salt }
        if (isValid) {
            return done(null, user)
        }
        else {
            return done(null, false)
        }
    })
}

const strategy = new LocalStrategy(customFields, verifyCallback)
passport.use(strategy)

passport.serializeUser((user, done) => {
    done(null, user.customer_id)
})

passport.deserializeUser(function (userId, done) {
    console.log('deserializeUser: ' + userId)
    pool.query('SELECT * FROM customers WHERE customer_id = ?', [userId], function (error, results) {
        done(null, results[0])
    })
})

function validPassword(password, hash, salt) {
    var hasVerify = crypto.pbkdf2Sync(password, salt, 10000, 60, 'sha512').toString('hex')
    return hash === hasVerify
}

function genPassword(password) {
    var salt = crypto.randomBytes(32).toString('hex');
    var genhash = crypto.pbkdf2Sync(password, salt, 10000, 60, 'sha512').toString('hex')
    return { salt: salt, hash: genhash }
}

function isAuth(req, res, next) {
    if (req.isAuthenticated()) {
        next()
    }
    else {
        res.redirect('/notAuthorized')
    }
}

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.isAdmin == 1) {
        next()
    }
    else {
        res.redirect('/notAuthorizedAdmin')
    }
}

function userExists(req, res, next) {
    pool.query('SELECT * FROM customers WHERE email = ?', [req.body.email], function (error, results, fields) {
        if (error) {
            console.log('Error')
        }
        else if (results.length > 0) {
            res.redirect('/userAlreadyExists')
        } else {
            next()
        }
    })
}

app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/login')
    })
})

app.get('/main', isAuth, function (req, res) {
    console.log('user:', req.user)
    res.render("main.hbs", { isAdmin: req.user.isAdmin, name: req.user.name, customer_id: req.user.customer_id });
});

app.post("/main", isAuth, function (req, res) {
    if (!req.body) return res.sendStatus(400);
    const customer_id = req.body.customer_id;
    const truck = req.body.truck;
    const service = req.body.service;
    const sending_address = req.body.sending_address;
    const destination_address = req.body.destination_address;
    const delivery_date = req.body.delivery_date;
    pool.query("INSERT INTO orders (service, truck, sending_address, destination_address, delivery_date, customer_id) VALUES (?, ?, ?, ?, ?, ?)", [service, truck, sending_address, destination_address, delivery_date, customer_id], function (err, data) {
        if (err) return console.log(err);
        res.redirect("/main");
    });
});

app.get('/login-failure', (req, res, next) => {
    res.send('You entered the wrong password or email.')
})

app.get("/register", function (req, res) {
    res.render("register.hbs");
});

app.post('/register', userExists, (req, res, next) => {
    console.log(req.body.password)
    const saltHash = genPassword(req.body.password)
    console.log(saltHash)
    const salt = saltHash.salt
    const hash = saltHash.hash
    const name = req.body.name;
    const email = req.body.email;
    const number = req.body.number;
    const city = req.body.city;

    pool.query('INSERT INTO customers(name, email, number, city, hash, salt, isAdmin) VALUES(?, ?, ?, ?, ?, ?, 0) ', [name, email, number, city, hash, salt], function (error, results, fields) {
        if (error) {
            console.log('Error')
        } else {
            console.log('Successfully Entered')
        }
    })
    // pool.query('INSERT INTO cities(city) VALUES(?)', [city], function (error, results, fields) {
    //     if (error) {
    //         console.log('Error')
    //     } else {
    //         console.log('Successfully Entered')
    //     }
    // })
    res.redirect('/login')
})

app.get('/login', function (req, res) {
    res.render('login.hbs');
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login-failure', successRedirect: '/main' }))

app.get('/admin-route', isAdmin, (req, res, next) => {
    res.send('<p>You are admin<a href="/logout">Logout and reload</a></p>')
})

app.get('/notAuthorized', (req, res, next) => {
    // res.send('<h1>You are not authorized to view the resource </h1><p><a href="/login">Retry Login</a></p>')
    res.render('notauth')
})

app.get('/notAuthorizedAdmin', (req, res, next) => {
    res.send('<h1>You are not authorized to view the resource as you are not the admin of the page</h1><p><a href="/login">Retry to Login as admin</a></p>')
})

app.get('/userAlreadyExists', (req, res, next) => {
    res.send('<h1>Sorry This username is taken </h1><p><a href="/register">Register with diffrent username</a></p>')
})

//format date
hbs.registerHelper('date', require('helper-date'));

//customer's orders
app.get("/orders", isAuth, function (req, res) {
    pool.query("SELECT * FROM orders WHERE customer_id=?", [req.user.customer_id], function (err, data) {
        console.log(data.length)
        if (err) return console.log(err);
        res.render("orders.hbs", {
            orders: data
        });
    });
});

app.post("/delete/:id", function (req, res) {
    const id = req.params.id;
    console.log(id);
    pool.query("DELETE FROM orders WHERE order_id=?", [id], function (err, data) {
        if (err) return console.log(err);
        res.redirect("/orders");
    });
});

app.post("/delete", function (req, res) {
    pool.query("DELETE FROM orders", function (err, data) {
        if (err) return console.log(err);
        res.redirect("/orders");
    })
});

app.get("/edit/:id", isAuth, function (req, res) {
    const id = req.params.id;
    console.log(id)
    pool.query("SELECT * FROM orders WHERE order_id=?", [id], function (err, data) {
        if (err) return console.log(err);
        console.log(data[0])
        res.render("edit.hbs", {
            order: data[0]
        });
    });
});

app.post("/edit", isAuth, function (req, res) {
    if (!req.body) return res.sendStatus(400);
    const order_id = req.body.order_id;
    const service = req.body.service;
    const truck = req.body.truck;
    const sending_address = req.body.sending_address;
    const destination_address = req.body.destination_address;
    const delivery_date = req.body.delivery_date;
    pool.query("UPDATE orders SET service=?, truck=?, sending_address=?, destination_address = ?, delivery_date=? WHERE order_id=?", [service, truck, sending_address, destination_address, delivery_date, order_id], function (err, data) {
        if (err) return console.log(err);
        res.redirect("/orders");
    });
});

app.get('/details/:truck', isAuth, function (req, res) {
    const truck = req.params.truck
    console.log(truck)
    pool.query("SELECT driver, truck_number FROM trucks WHERE truck=?", [truck], function (err, result) {
        if (err) return console.log(err);
        res.render('details.hbs', {
            details: result[0]
        });
    });

})


app.listen(3306, function () {
    console.log("Сервер ожидает подключения...");
});