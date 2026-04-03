import createError from "http-errors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import passport from "passport";
import cookieParser from "cookie-parser";
import morganLogger from "morgan";
import fileUpload from "express-fileupload";
import openapi from "express-openapi";
import swaggerUi from "swagger-ui-express";
import querystring from "querystring";
import httpProxy from "./bin/httpProxy.js";
import userManager from "./bin/user.js";
import "./bin/authentication.js";
import { checkMainConfig, readMainConfig } from "./model/config.js";
import util from "./bin/util.js";
import { register, httpRequestDuration, httpRequestsTotal } from "./bin/metrics.js";

const app = express();
import * as Sentry from "@sentry/node";
import { userModel } from "./model/users.js";
import { profileModel } from "./model/profiles.js";
import { sourceModel } from "./model/sources.js";
import { rdfDataModel } from "./model/rdfData.js";
import { quotaModel } from "./model/quota.js";
import apiDoc from "./api/v1/api-doc.js";
import session from "express-session";

const config = readMainConfig();
checkMainConfig(config).then((isValid) => {
    if (!isValid) {
        process.exit(1);
    }
});

// sentry/glitchtip
if (config.sentryDsnNode) {
    Sentry.init({ dsn: config.sentryDsnNode });
}

// body parsers
app.use(express.json({ limit: "10mb" }));

//app.use(express.urlencoded({ extended: true }));
//ajout CF
app.use(express.urlencoded({ extended: true, limit: "20mb", parameterLimit: 10000 }));

/*
import bodyParser from "body-parser";
import express_session_module from "express-session";
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
    session({
        secret: config.cookieSecret ? config.cookieSecret : "S3cRet!",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: config.cookieMaxAge ? config.cookieMaxAge : config.cookieMaxAge,
            sameSite: config.cookieSameSite ? config.cookieSameSite : false,
            secure: config.cookieSecure ? config.cookieSecure : false,
        },
    }),
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
app.use("/upload/rdf", express.static(path.join(__dirname, "data/uploaded_rdf_data")));
app.use("/vocables/classIcons", express.static(path.join(__dirname, "data/classIcons")));

async function loggedIn(req, _res, next) {
    if (config.auth === "disabled" || req.isAuthenticated()) {
        // TODO: check allowedTools and forbiddenTools
        next();
    } else {
        throw {
            status: 401,
            message: "You must authenticate to access this resource.",
        };
    }
}

async function isPluginAllowed(tool, req, _res, next) {
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
}

app.get("/plugins/:plugin/*", async (req, res) => {
    try {
        await loggedIn(req, res, () => {});
        const plugin = req.params.plugin;
        await isPluginAllowed(plugin, req, res, () => {});
        const file = req.params["0"];
        const filePath = path.join(__dirname, `plugins/${plugin}/public`, file);
        if (!fs.existsSync(filePath)) {
            res.status(404).send("Not found");
        } else {
            res.sendFile(file, { root: path.join(__dirname, `plugins/${plugin}/public`) });
        }
    } catch (error) {
        res.status(error.status).send(error.message);
    }
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
httpProxy.app = app;

// API
app.use("/api/v1", (req, res, next) => {
    const startTime = Date.now();

    res.on("finish", () => {
        // Normalize the route: remove the trailing / (except for /)
        const rawRoute = req.baseUrl + req.path;
        const route = util.normalizeRoute(rawRoute);

        // Filter out irrelevant routes (static assets, documentation, etc.)
        if (!util.shouldTrackRoute(route)) {
            return;
        }

        const duration = (Date.now() - startTime) / 1000;
        const authenticated = req.user?.login ? "true" : "false";

        const labels = {
            method: req.method,
            route: route,
            status: res.statusCode,
            authenticated,
        };

        httpRequestDuration.observe(labels, duration);
        httpRequestsTotal.inc(labels);
    });

    next();
});

// Prometheus endpoint (controlled by metrics.enabled)
app.get("/metrics", async (req, res) => {
    // If metrics.enabled is false, disable the route
    if (!config.metrics?.enabled) {
        return res.status(404).send("Metrics endpoint disabled");
    }

    // Check if authentication is enabled
    if (config.metrics.auth?.enabled) {
        const auth = req.headers.authorization;
        const expectedAuth = Buffer.from(`${config.metrics.auth.username}:${config.metrics.auth.password}`).toString("base64");

        if (!auth || auth !== `Basic ${expectedAuth}`) {
            res.set("WWW-Authenticate", "Basic realm='Prometheus Metrics'");
            return res.status(401).send("Unauthorized");
        }
    }

    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});

openapi.initialize({
    apiDoc: apiDoc,
    app: app,
    paths: "./api/v1/paths",
    securityHandlers: {
        restrictQuota: async function (req, scope, definition) {
            if (config.auth != "disabled") {
                const token = req.headers.authorization;
                if (token !== undefined) {
                    const output = util.parseAuthorizationFromHeader(token);

                    // Only accept the Bearer scheme from the Authorization header
                    if (output !== null && output[0] === "Bearer") {
                        const user = await userModel.findUserAccountFromToken(output[1]);
                        if (user) {
                            req.user = user[1];
                        }
                    }
                }

                const user = await userManager.getUser(req.user);
                const route = req.baseUrl + req.path;
                const method = req.method;

                // store quota in db
                const quotaId = await quotaModel.add(route, method, user.user);

                // get quota from profile
                const { maxQuota: profileQuota, profile: profileName, wholeProfile } = await profileModel.getMaxQuotaForRoute(route, method, user.user);

                // check profile quota (with wholeProfile logic)
                if (profileQuota !== undefined) {
                    const usage = await quotaModel.getRouteUsage(route, method, user.user, 1, wholeProfile, profileName);
                    if (usage > profileQuota) {
                        throw {
                            status: 429,
                            message: `Too many requests, you exceeded your profile quota (${profileQuota} for route ${route} ${method})`,
                        };
                    }
                }

                // check generalQuota (applies to ALL users globally, always checked)
                if (config.generalQuota?.[route]?.[method]) {
                    const generalQuota = config.generalQuota[route][method];
                    const generalUsage = await quotaModel.getGlobalRouteUsage(route, method, 1);
                    if (generalUsage > generalQuota) {
                        throw {
                            status: 429,
                            message: `Too many requests, the general quota has been exceeded (${generalQuota} for route ${route} ${method})`,
                        };
                    }
                }
            }
            return Promise.resolve(true);
        },
        restrictLoggedUser: async function (req, _scopes, _definition) {
            if (config.auth != "disabled") {
                const token = req.headers.authorization;
                if (token !== undefined) {
                    const output = util.parseAuthorizationFromHeader(token);

                    // Only accept the Bearer scheme from the Authorization header
                    if (output !== null && output[0] === "Bearer") {
                        const user = await userModel.findUserAccountFromToken(output[1]);
                        if (user) {
                            req.user = user[1];
                        }
                    }
                }

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

            if (req.url.indexOf("/sources") > 0 && currentUser.allowSourceCreation) {
                return Promise.resolve(true);
            }

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
    }),
);

// Home (redirect to /vocables)
app.get("/", function (req, res, next) {
    const query = querystring.stringify(req.query);
    const redirect = query ? `vocables?${query}` : "/vocables";
    res.redirect(redirect);
});

// Login routes
if (config.auth == "disabled") {
    app.get("/login", function (req, res, _next) {
        res.redirect("vocables");
    });
} else if (config.auth == "keycloak" || config.auth == "auth0") {
    app.get("/login", function (req, res, next) {
        passport.authenticate(config.auth, { scope: ["openid", "email", "profile"] })(req, res, next);
    });
    app.get("/login/callback", function (req, res, next) {
        passport.authenticate(config.auth, { successRedirect: "/vocables", failureRedirect: "/login" })(req, res, next);
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
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

/**
 * Error handlers
 */

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

// load basic vocabularies
const basicVocabularies = [
    { prefix: "rdf", graphUri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#", graphUrl: "https://www.w3.org/1999/02/22-rdf-syntax-ns" },
    { prefix: "rdfs", graphUri: "http://www.w3.org/2000/01/rdf-schema#", graphUrl: "https://www.w3.org/2000/01/rdf-schema" },
    { prefix: "owl", graphUri: "http://www.w3.org/2002/07/owl#", graphUrl: "https://www.w3.org/2002/07/owl" },
    { prefix: "iof", graphUri: "https://www.industrialontologies.org/core/", graphUrl: "https://rdf.tsf.logilab.fr/iof.rdf" },
    { prefix: "skos", graphUri: "http://www.w3.org/2004/02/skos/core#", graphUrl: "https://rdf.tsf.logilab.fr/skos.rdf" },
    {
        prefix: "dce",
        graphUri: "http://purl.org/dc/elements/1.1/",
        graphUrl: "https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_elements.nt",
    },
    {
        prefix: "dcterms",
        graphUri: "http://purl.org/dc/terms/",
        graphUrl: "https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.nt",
    },
];

async function loadBasicVocabularies() {
    const existingGraphs = await rdfDataModel.getGraphs();
    try {
        for (const ontology of basicVocabularies) {
            const matchingGraph = existingGraphs.find((g) => g.name === ontology.graphUri);
            const hasGraph = !!matchingGraph?.count;
            if (!hasGraph) {
                console.log(`Loading ontology ${ontology.graphUri}`);
                await rdfDataModel.loadGraph(ontology.graphUri, ontology.graphUrl);
            }
        }
    } catch (e) {
        console.error("Could not load default ontologies: " + e);
    }
}

// Load default graph available in the "graphDownloadUrl" key
// if no graph is already available in the Virtuoso
async function loadDefaultGraphs() {
    const sources = await sourceModel.getAllSources();
    try {
        const graphs = await rdfDataModel.getGraphs();
        for (const [, source] of Object.entries(sources)) {
            const graphDownloadUrl = source.graphDownloadUrl;
            if (graphDownloadUrl) {
                const graphURI = source.graphUri;
                const matchingGraph = graphs.find((g) => g.name === graphURI);
                const hasGraph = !!matchingGraph?.count;
                if (!hasGraph) {
                    console.log(`Loading graph ${source.graphUri}`);
                    await rdfDataModel.loadGraph(source.graphUri, graphDownloadUrl);
                }
            }
        }
    } catch (e) {
        console.error("Could not load default graphs: " + e);
    }
}

void loadBasicVocabularies();
void loadDefaultGraphs();

export default app;
