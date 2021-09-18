/* eslint-disable no-console */
/**
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This module is the bootstrap entrypoint. It establishes the top-level event
 * listeners and loads the user's code.
 */

import http from 'http'
import process, { env, exit } from 'process'
import * as Errors from './Errors/index'
import RuntimeClient from './RuntimeClient/index'
import Runtime from './Runtime/index'
import BeforeExitListener from './Runtime/BeforeExitListener'
import LogPatch from './utils/LogPatch'
import * as UserFunction from './utils/UserFunction'

LogPatch.patchConsole()

export function run(appRoot: string, handler: string): void {
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

  const handlerFunc = UserFunction.load(appRoot, handler)
  const runtime = new Runtime(client, handlerFunc, errorCallbacks)

  runtime.scheduleIteration()
}
