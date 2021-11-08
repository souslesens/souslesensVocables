var createError = require("http-errors");
var express = require("express");
var path = require("path");
var passport = require("passport");
var ensureLoggedIn = require("connect-ensure-login").ensureLoggedIn;
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var bodyParser = require("body-parser");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var httpProxy = require("./bin/httpProxy.");

const fileUpload = require("express-fileupload");

var app = express();

// App middleware for authentication and session handling
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
    require("express-session")({
        secret: "SY4PDsioYAbndfU8SIuk",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 2629800000 }, // 1 month
    })
);

app.use(function (req, res, next) {
    var msgs = req.session.messages || [];
    res.locals.messages = msgs;
    res.locals.hasMessages = !!msgs.length;
    req.session.messages = [];
    next();
});
app.use(passport.initialize());
app.use(passport.authenticate("session"));

// Static dirs
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "mainapp/static")));

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
httpProxy.app = app;

var jsonParser = bodyParser.json({ limit: 1024 * 1024 * 20, type: "application/json" });
var urlencodedParser = bodyParser.urlencoded({
    extended: true,
    limit: 1024 * 1024 * 20,
    type: "application/x-www-form-urlencoded",
});

app.use(jsonParser);
app.use(urlencodedParser);

app.use(fileUpload());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

module.exports = app;
