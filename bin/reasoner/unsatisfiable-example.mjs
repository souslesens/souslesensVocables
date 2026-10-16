import { run } from "./owl-unsatisfiable.mjs";
import { createSparqlRequest } from "./http-proxy.mjs";

try {
    const request = createSparqlRequest();
    const report = await run(request, { graphs: process.argv.slice(2), limit: 20 });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.status === "unsatisfiable-predicates-detected" ? 1 : 0;
} catch (error) {
    console.error(error.message);
    if (error.cause) console.error(error.cause.message);
    process.exitCode = 2;
}
