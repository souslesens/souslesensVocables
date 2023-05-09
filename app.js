const createError = require("http-errors");
const express = require("express");
const path = require("path");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const morganLogger = require("morgan");
const fileUpload = require("express-fileupload");
const openapi = require("express-openapi");
const swaggerUi = require("swagger-ui-express");
const httpProxy = require(path.resolve("bin/httpProxy."));
const userManager = require(path.resolve("bin/user."));
const querystring = require("querystring");
require("./bin/authentication.");
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
app.use("/vocables", express.static(path.join(__dirname, "public/vocables/dist")));
app.use("/assets", express.static(path.join(__dirname, "public/vocables/dist/assets")));
app.use("/mainapp/assets", express.static(path.join(__dirname, "mainapp/static/assets")));
app.use("/vocables/images", express.static(path.join(__dirname, "public/vocables/images")));
app.use("/vocables/snippets", express.static(path.join(__dirname, "public/vocables/snippets")));
app.use("/icons", express.static(path.join(__dirname, "public/vocables/icons")));
app.use("/vocables/icons", express.static(path.join(__dirname, "public/vocables/icons")));
app.use("/vocables/scripts", express.static(path.join(__dirname, "public/vocables/js/external")));

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
            if (config.auth != "disabled") {
                if (config.auth == "keycloak") {
                    passport.authenticate("keycloak", { failureRedirect: "/login" });
                }
                if (!req.isAuthenticated || !req.isAuthenticated()) {
                    throw {
                        status: 401,
                        message: "You must authenticate to access this resource.",
                    };
                }
            }
            return Promise.resolve(true);
        },
        restrictAdmin: async function (req, _scopes, _definition) {
            const currentUser = await userManager.getUser(req.user);

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

// Home (redirect to /vocables)
app.get("/", function (req, res, next) {
    const query = querystring.stringify(req.query);
    const redirect = query ? `vocables?${query}` : "/vocables";
    res.redirect(redirect);
});

// Login routes
if (config.auth !== "disabled") {
    if (config.auth == "keycloak") {
        app.get("/login", function (req, res, next) {
            passport.authenticate("keycloak", { scope: ["openid", "email", "profile"] })(req, res, next);
        });
        app.get("/login/callback", function (req, res, next) {
            passport.authenticate("keycloak", { successRedirect: "/vocables", failureRedirect: "/login" })(req, res, next);
        });
    } else {
        app.get("/login", function (req, res, next) {
            const redirect = formatRedirectPath(req.query.redirect);
            res.render("login", { title: "souslesensVocables - Login", redirect: redirect });
        });
        app.post("/auth/login", function (req, res, next) {
            const redirect = formatRedirectPath(req.query.redirect);
            passport.authenticate("local", { successRedirect: redirect, failureRedirect: "/login", failureMessage: true })(req, res, next);
        });
    }
} else {
    app.get("/login", function (req, res, _next) {
        res.redirect("vocables");
    });
}
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

function formatRedirectPath(path) {
    if (!path) {
        return "/vocables";
    }
    if (!path.startsWith("/")) {
        return `/${path}`;
    }
    return path;
}

module.exports = app;
