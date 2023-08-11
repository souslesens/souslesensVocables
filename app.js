const createError = require("http-errors");
const express = require("express");
const path = require("path");
const fs = require("fs");
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
const { userModel } = require("./model/users");
const { profileModel } = require("./model/profiles");

// sentry/glitchtip
if (config.sentryDsnNode) {
    Sentry.init({ dsn: config.sentryDsnNode });
    app.use(Sentry.Handlers.requestHandler());
}

// body parsers
app.use(express.json());
//app.use(express.urlencoded({ extended: true }));
//ajout CF
app.use(express.urlencoded({ extended: true, limit: "20mb", parameterLimit: 10000 }));
/*
const bodyParser = require('body-parser');
app.use(bodyParser.json({
    limit: '20mb'
}));

app.use(bodyParser.urlencoded({
    limit: '20mb',
    parameterLimit: 100000,
    extended: true
}));*/

app.use(fileUpload());

// logger
app.use(morganLogger("dev"));

/**
 * App middleware for authentication and session handling
 */
app.use(cookieParser());
if (config.cookieSecureTrustProxy) {
    app.set("trust proxy", 1);
}
app.use(
    require("express-session")({
        secret: config.cookieSecret ? config.cookieSecret : "S3cRet!",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: config.cookieMaxAge ? config.cookieMaxAge : config.cookieMaxAge,
            sameSite: config.cookieSameSite ? config.cookieSameSite : false,
            secure: config.cookieSecure ? config.cookieSecure : false,
        },
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

async function loggedIn(req, _res, next) {
    if (req.isAuthenticated || config.auth === "disabled") {
        // TODO: check allowedTools and forbiddenTools
        next();
    } else {
        throw {
            status: 401,
            message: "You must authenticate to access this resource.",
        };
    }
}

function isPluginAllowed(tool) {
    return async (req, res, next) => {
        try {
            const userInfo = await userManager.getUser(req.user);
            const userTools = await profileModel.getUserTools(userInfo.user);

            if (userTools.map((i) => i.name).includes(tool)) {
                next();
            } else {
                throw {
                    status: 401,
                    message: "You must authenticate to access this resource.",
                };
            }
        } catch (error) {
            console.log(error);
        }
    };
}

const pluginDir = path.join(__dirname, "plugins");
try {
    const dirs = fs.readdirSync(pluginDir);
    dirs.forEach((plugin) => {
        app.use(`/plugins/${plugin}`, loggedIn, isPluginAllowed(plugin), express.static(path.join(__dirname, `plugins/${plugin}/public`)));
    });
} catch {
    console.warn("No plugins directory available");
}

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
