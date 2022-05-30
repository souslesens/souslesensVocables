const createError = require("http-errors");
const express = require("express");
const path = require("path");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const morganLogger = require("morgan");
const fileUpload = require("express-fileupload");
const openapi = require("express-openapi");
const swaggerUi = require("swagger-ui-express");

const legacyRoutes = require("./legacy_routes");
const httpProxy = require(path.resolve("bin/httpProxy."));
const userManager = require(path.resolve("bin/user."));

const { config } = require("./model/config");

const app = express();
const Sentry = require("@sentry/node");

// sentry/glitchtip
if (config.sentryDsnNode) {
    Sentry.init({ dsn: config.sentryDsnNode });
    app.use(Sentry.Handlers.requestHandler());
}

// body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// logger
app.use(morganLogger("dev"));

/**
 * App middleware for authentication and session handling
 */
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
    res.locals.hasMessages = msgs.length > 0;
    req.session.messages = [];
    next();
});

if (config.auth !== "disabled") {
    app.use(passport.initialize());
    app.use(passport.authenticate("session"));
}

/**
 * Routes
 */

// Static content
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "mainapp/static")));

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
httpProxy.app = app;

// API
openapi.initialize({
    apiDoc: require("./api/v1/api-doc.js"),
    app: app,
    paths: "./api/v1/paths",
    securityHandlers: {
        loginScheme: function (req, _scopes, _definition) {
            if (config.auth == "keycloak") {
                passport.authenticate("keycloak", { failureRedirect: "/login" });
            } else if (config.auth == "local") {
                // TODO: what ?
            }
            if (!req.isAuthenticated || !req.isAuthenticated()) {
                throw {
                    status: 401,
                    message: "You must authenticate to access this resource.",
                };
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

// OpenAPI UI and documentation
app.use(
    "/api/v1",
    swaggerUi.serve,
    swaggerUi.setup(null, {
        swaggerOptions: {
            url: "/api/v1/api-docs",
        },
    })
);

/**
 * Router
 */
const router = express.Router();

// Home (redirect to /vocables)
router.get("/", function (req, res, _next) {
    res.redirect("vocables");
});

// Login
router.get("/login", function (req, res, next) {
    if (config.auth == "disabled") {
        res.redirect("vocables");
    } else if (config.auth == "keycloak") {
        passport.authenticate("provider", { scope: ["openid", "email", "profile"] })(req, res, next);
    } else if (config.auth == "local") {
        res.render("login", { title: "souslesensVocables - Login" });
    } else {
        throw Error("bad configuration");
    }
});
app.use("/", router);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

/**
 * Error handlers
 */

// sentry/glitchtip
// (this error handler must be before any other error middleware and after all controllers)
if (config.sentryDsnNode) {
    app.use(Sentry.Handlers.errorHandler());
}

// openapi error handler
app.use("/api/v1/*", function (err, req, res, _next) {
    console.debug("API error", err);
    const error = err.status ? err : err.stack;

    if (req.app.get("env") === "development") {
        res.status(err.status || 500).json(error);
    } else {
        res.status(err.status || 500);
    }
});

// default error handler
app.use(function (err, req, res, _next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

module.exports = app;
