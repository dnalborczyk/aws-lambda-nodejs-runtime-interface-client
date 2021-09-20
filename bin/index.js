#!/usr/bin/env node
/** Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

import { argv, cwd } from 'node:process'
import { run } from '../lib/index.js'

if (argv.length < 3) {
  throw new Error('No handler specified')
}

const appRoot = cwd()
const handler = argv[2]

console.log(`Executing '${handler}' in function directory '${appRoot}'`)
run(appRoot, handler)
