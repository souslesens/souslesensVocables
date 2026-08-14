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

let virtuosoPending = 0;
let maxPending = 50;
let maxLoadThreshold = 80;

const virtuosoSparqlPendingQueries = new client.Gauge({
    name: "virtuoso_sparql_pending_queries",
    help: "Number of SPARQL requests currently in-flight to the Virtuoso server",
    collect() {
        this.set(virtuosoPending);
    },
});

const virtuosoSparqlLoad = new client.Gauge({
    name: "virtuoso_sparql_load",
    help: "Virtuoso load ratio (0-100) derived from in-flight SPARQL requests; 0 at 0 pending, 100 at maxPending or more",
    collect() {
        const load = (virtuosoPending / maxPending) * 100;
        this.set(Math.min(100, load));
    },
});

register.registerMetric(virtuosoSparqlPendingQueries);
register.registerMetric(virtuosoSparqlLoad);

export function trackVirtuosoRequest() {
    virtuosoPending++;
}

export function endVirtuosoRequest() {
    if (virtuosoPending > 0) {
        virtuosoPending--;
    }
}

export function configureVirtuosoMetrics(max, maxLoad) {
    if (typeof max === "number" && max > 0) {
        maxPending = max;
    }
    if (typeof maxLoad === "number" && maxLoad > 0 && maxLoad <= 100) {
        maxLoadThreshold = maxLoad;
    }
}

export function getVirtuosoLoad() {
    const load = (virtuosoPending / maxPending) * 100;
    return Math.min(100, load);
}

export { register, httpRequestDuration, httpRequestsTotal, maxLoadThreshold };
