import client from "prom-client";

const register = new client.Registry();

const httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP API requests in seconds",
    labelNames: ["method", "route", "status", "authenticated"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP API requests",
    labelNames: ["method", "route", "status", "authenticated"],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);

export { register, httpRequestDuration, httpRequestsTotal };
