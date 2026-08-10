#!/usr/bin/env node
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const core = require.resolve("@awesome.me/buildawesome");
await import(pathToFileURL(resolve(dirname(core), "../cmd.js")));
