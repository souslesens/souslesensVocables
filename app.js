const createError = require("http-errors");
const express = require("express");
const path = require("path");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const openapi = require("express-openapi");
const swaggerUi = require("swagger-ui-express");

const indexRouter = require("./legacy_routes");
const httpProxy = require(path.resolve("bin/httpProxy."));
const userManager = require(path.resolve("bin/user."));

const { config } = require("./model/config");

var app = express();
const Sentry = require("@sentry/node");

// sentry/glitchtip
if (config.sentryDsnNode) {
    Sentry.init({ dsn: config.sentryDsnNode });
    app.use(Sentry.Handlers.requestHandler());
}

// App middleware for authentication and session handling
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
    require("express-session")({
        secret: config.cookieSecret ? config.cookieSecret : "S3cRet!",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: config.cookieMaxAge ? config.cookieMaxAge : 2629800000 },
    })
);

app.use(function (req, res, next) {
    var msgs = req.session.messages || [];
    res.locals.messages = msgs;
    res.locals.hasMessages = !!msgs.length;
    req.session.messages = [];
    next();
});

if (!config.disableAuth) {
    app.use(passport.initialize());
    app.use(passport.authenticate("session"));
}

// Static dirs
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "mainapp/static")));

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
httpProxy.app = app;

var jsonParser = bodyParser.json({ limit: 1024 * 1024 * 20, type: "application/json" });
app.use(bodyParser({ limit: "50mb" }));
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

// API
openapi.initialize({
    apiDoc: require("./api/v1/api-doc.js"),
    app: app,
    paths: "./api/v1/paths",
    securityHandlers: {
        loginScheme: function (req, _scopes, _definition) {
            if (!config.disableAuth) {
                config.auth == "keycloak" ? passport.authenticate("keycloak", { failureRedirect: "/login" }) : null;
                if (!req.isAuthenticated || !req.isAuthenticated()) {
                    throw {
                        status: 401,
                        message: "You must authenticate to access this resource.",
                    };
                }
            }
            return Promise.resolve(true);
        },
        restrictAdmin: function (req, _scopes, _definition) {
            const currentUser = userManager.getUser(req.user);

            if (!currentUser.logged) {
                throw {
                    status: 401,
                    message: "You must authenticate to access this resource.",
                };
            }

            if (!currentUser.user.groups.includes("admin")) {
                throw {
                    status: 401,
                    message: "You must be admin to access this resource.",
                };
            }

            return Promise.resolve(true);
        },
    },
});

// OpenAPI UI
app.use(
    "/api/v1",
    swaggerUi.serve,
    swaggerUi.setup(null, {
        swaggerOptions: {
            url: "/api/v1/api-docs",
        },
    })
);
app.use("/api/v1/*", function (err, req, res, _next) {
    console.debug("GlobalErr", err);
    const error = err.status ? err : err.stack;

    if (req.app.get("env") === "development") {
        res.status(err.status || 500).json(error);
    } else {
        res.status(err.status || 500);
    }
});

// main router
app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// sentry/glitchtip
if (config.sentryDsnNode) {
    // The error handler must be before any other error middleware and after all controllers
    app.use(Sentry.Handlers.errorHandler());

    // Optional fallthrough error handler
    app.use(function onError(err, req, res, next) {
        // The error id is attached to `res.sentry` to be returned
        // and optionally displayed to the user for support.
        res.statusCode = 500;
        res.end(res.sentry + "\n");
    });
}

// error handler
app.use(function (err, req, res, _next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

module.exports = app;
