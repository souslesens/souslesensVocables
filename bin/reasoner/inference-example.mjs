import { run } from "./owl-inference.mjs";
import { createSparqlRequest } from "./http-proxy.mjs";

try {
    const report = await run(createSparqlRequest(), {
        graphs: process.argv.slice(2),
        limit: 100,
    });
    console.log(JSON.stringify(report, null, 2));
} catch (error) {
    console.error(error.message);
    if (error.cause) console.error(error.cause.message);
    process.exitCode = 2;
}
