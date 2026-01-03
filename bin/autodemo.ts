#!/usr/bin/env bun

import { main } from "../src/cli/main.ts";
import { installSigintManager } from "../src/utils/sigintManager.ts";

installSigintManager();
await main(process.argv.slice(2));


