import { run } from './owl-consistency.mjs';
import request from "request";


// This callback owns the endpoint, authentication and HTTP request.
async function request(query) {




}

///try {
  const report = await run({
    request,
    // Omit graphs to use the store's default dataset.
    graphs: [
      'https://spec.industrialontologies.org/ontology/core/Core/'
    ],
    limit: 20,
  });

  console.log('Status:', report.status);

  for (const check of report.checks) {
    if (check.violationDetected) {
      console.log(`Violation: ${check.description}`);
      console.dir(check.examples, { depth: null });
    }
  }
/*} catch (error) {
  console.error('Check failed:', error.message);
  if (error.cause) console.error('Details:', error.cause.message);
  process.exitCode = 2;
}*/



