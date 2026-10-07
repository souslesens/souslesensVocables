// Loaded with --import by a server started under NODE_V8_COVERAGE: a server stopped by a kill never
// reaches the exit hook that writes the coverage, so it is written every two seconds instead.
import v8 from "v8";

const coverageWriteIntervalMilliseconds = 2000;

setInterval(() => v8.takeCoverage(), coverageWriteIntervalMilliseconds).unref();
