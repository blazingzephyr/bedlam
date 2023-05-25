
import * as config from "./config.json" assert { type: "json" };

// Runs the application depending on the threading mode.
// @ts-expect-error is used because of an error of the TypeScript analyser.
if (config.default.use_workers)
{
	await import("./use_workers.js");
}
else
{
	await import("./no_workers.js");
}