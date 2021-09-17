#!/usr/bin/env node
/** Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

const { argv, cwd } = require('process')
const lambda = require('../lib/index')

if (argv.length < 3) {
  throw new Error('No handler specified')
}

const appRoot = cwd()
const handler = argv[2]

console.log(`Executing '${handler}' in function directory '${appRoot}'`)
lambda.run(appRoot, handler)
