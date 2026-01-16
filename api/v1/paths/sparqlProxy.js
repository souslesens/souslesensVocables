import { processResponse } from './utils.js';
import httpProxy from '../../../bin/httpProxy.js';
import ConfigManager from '../../../bin/configManager.js';
import UserRequestFiltering from '../../../bin/userRequestFiltering.js';
import Parliament from '../../../bin/parliamentProxy.js';

export default function () {
    let operations = {
        POST,
        GET,
    };

    async function POST(req, res, next) {
        try {
            if (req.body.POST) {
                var body = JSON.parse(req.body.body);
                var query = body.params.query;
                if (false && (query.indexOf("http://purl.obolibrary.org/obo/vo.owl") > -1 || query.indexOf("http://purl.obolibrary.org/obo") > -1)) {
                    try {
                        Parliament.execPostQuery(query, function (err, result) {
                            processResponse(res, err, result);
                        });
                    } catch (e) {
                        next(e);
                    }
                    return;
                }

                if (ConfigManager.config && req.body.url.indexOf(ConfigManager.config.sparql_server.url) == 0) {
                    if (ConfigManager.config.sparql_server.user) {
                        body.params.auth = {
                            user: ConfigManager.config.sparql_server.user,
                            pass: ConfigManager.config.sparql_server.password,
                            sendImmediately: false,
                        };
                    }
                    ConfigManager.getUser(req, res, function (err, user) {
                        ConfigManager.getUserSources(req, res, function (err, userSources) {
                            if (err) {
                                return processResponse(res, err, userSources);
                            }
                            UserRequestFiltering.filterSparqlRequest(body.params.query, userSources, user, function (parsingError, filteredQuery) {
                                if (parsingError) {
                                    return processResponse(res, parsingError, null);
                                }
                                body.params.query = filteredQuery;

                                httpProxy.post(req.body.url, body.headers, body.params, function (err, result) {
                                    processResponse(res, err, result);
                                });
                            });

                            return;
                        });
                    });
                } else {
                    httpProxy.post(req.body.url, body.headers, body.params, function (err, result) {
                        processResponse(res, err, result);
                    });
                }
            } else {
                var options = {};
                if (req.body.options) {
                    if (typeof req.body.options == "string") {
                        options = JSON.parse(req.body.options);
                    } else {
                        options = req.body.options;
                    }
                }
                options.host = req.headers.host;
                httpProxy.get(req.body.url, options, function (err, result) {
                    processResponse(res, err, result);
                });
            }
        } catch (err) {
            res.status(err.status || 500).json(err);
            next(err);
        }
    }

    POST.apiDoc = {
        summary: "Send a request to a different domain",
        security: [{ restrictLoggedUser: [] }],
        operationId: "httpProxy",
        parameters: [],
        responses: {
            default: {
                description: "Response provided by the proxied server",
            },
        },
        tags: ["Sparql"],
    };

    function GET(req, res, next) {
        var options = JSON.parse(req.query.options);

        if (ConfigManager.config && req.query.url.indexOf(ConfigManager.config.sparql_server.url) == 0) {
            if (ConfigManager.config.sparql_server.user) {
                options.auth = {
                    user: ConfigManager.config.sparql_server.user,
                    pass: ConfigManager.config.sparql_server.password,
                    sendImmediately: false,
                };
            }
            ConfigManager.getUser(req, res, function (err, user) {
                ConfigManager.getUserSources(req, res, function (err, userSources) {
                    if (err) {
                        return processResponse(res, err, userSources);
                    }
                    UserRequestFiltering.filterSparqlRequest(req.query.url, userSources, user, function (parsingError, filteredQuery) {
                        if (parsingError) {
                            return processResponse(res, parsingError, null);
                        }
                        req.query.url = filteredQuery;

                        try {
                            httpProxy.get(req.query.url, options, function (err, result) {
                                processResponse(res, err, result);
                            });
                        } catch (e) {
                            res.status(err.status || 500).json(e);
                            next(e);
                        }
                    });
                });
            });
        }
    }

    GET.apiDoc = {
        summary: "Retrieve a request from a different domain",
        security: [{ restrictLoggedUser: [] }],
        operationId: "httpProxy",
        parameters: [],
        responses: {
            default: {
                description: "Response provided by the proxied server",
            },
        },
        tags: ["Sparql"],
    };

    return operations;
};
