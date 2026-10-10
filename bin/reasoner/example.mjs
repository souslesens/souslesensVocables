import { run } from './owl-consistency.mjs';

try {
  const username = process.env.SPARQL_USERNAME;
  const password = process.env.SPARQL_PASSWORD;
  if (username === undefined || password === undefined) {
    throw new Error('Set SPARQL_USERNAME and SPARQL_PASSWORD before running this example.');
  }
  if (username.includes(':')) {
    throw new Error('A Basic authentication username cannot contain a colon.');
  }
  const credentials = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');

  const report = await run({
    endpoint: 'http://51.178.139.80:8890/sparql?format=json&query=',
    // Omit graphs to use the store's default dataset.
    graphs: [
      'https://spec.industrialontologies.org/ontology/core/Core/'
    ],
    limit: 2000,
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  console.log('Status:', report.status);

  for (const check of report.checks) {
    if (check.violationDetected) {
      console.log(`Violation: ${check.description}`);
      console.dir(check.examples, { depth: null });
    }
  }
} catch (error) {
  console.error('Check failed:', error.message);
}
