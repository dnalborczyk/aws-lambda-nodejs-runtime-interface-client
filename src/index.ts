/* eslint-disable no-console */
/**
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This module is the bootstrap entrypoint. It establishes the top-level event
 * listeners and loads the user's code.
 */

import http from 'node:http'
import process, { env, exit } from 'node:process'
import * as Errors from './Errors/index.js'
import RuntimeClient from './RuntimeClient/index.js'
import Runtime from './Runtime/index.js'
import BeforeExitListener from './Runtime/BeforeExitListener.js'
import LogPatch from './utils/LogPatch.js'
import * as UserFunction from './utils/UserFunction.js'

LogPatch.patchConsole()

export async function run(appRoot: string, handler: string): Promise<void> {
  if (!env.AWS_LAMBDA_RUNTIME_API) {
    throw new Error('Missing Runtime API Server configuration.')
  }
  const client = new RuntimeClient(env.AWS_LAMBDA_RUNTIME_API, http)

  const errorCallbacks = {
    uncaughtException: (error: Error) => {
      client.postInitError(error, () => exit(129))
    },
    unhandledRejection: (error: Error) => {
      client.postInitError(error, () => exit(128))
    },
  }

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception', Errors.toFormatted(error))
    errorCallbacks.uncaughtException(error)
  })

  process.on('unhandledRejection', (reason, promise) => {
    const error = new Errors.UnhandledPromiseRejection(
      reason?.toString(),
      promise,
    )
    console.error('Unhandled Promise Rejection', Errors.toFormatted(error))
    errorCallbacks.unhandledRejection(error)
  })

  BeforeExitListener.reset()
  process.on('beforeExit', BeforeExitListener.invoke)

  const handlerFunc = await UserFunction.load(appRoot, handler)
  const runtime = new Runtime(client, handlerFunc, errorCallbacks)

  runtime.scheduleIteration()
}
