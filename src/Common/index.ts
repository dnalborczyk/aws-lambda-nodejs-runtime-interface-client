/**
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This module defines types, enums and interfaces common to the other modules.
 */

import type { IncomingHttpHeaders } from 'node:http'

const { freeze } = Object

export interface InvocationResponse {
  bodyJson: string
  headers: IncomingHttpHeaders
}

export const INVOKE_HEADER = freeze({
  ARN: 'lambda-runtime-invoked-function-arn',
  AWSRequestId: 'lambda-runtime-aws-request-id',
  ClientContext: 'lambda-runtime-client-context',
  CognitoIdentity: 'lambda-runtime-cognito-identity',
  DeadlineMs: 'lambda-runtime-deadline-ms',
  XRayTrace: 'lambda-runtime-trace-id',
})

export interface IEnvironmentData {
  functionName?: string
  functionVersion?: string
  memoryLimitInMB?: string
  logGroupName?: string
  logStreamName?: string
}

export interface IHeaderData {
  awsRequestId?: string
  clientContext?: string
  getRemainingTimeInMillis: () => number
  identity?: string
  invokedFunctionArn?: string
}

export type ErrorStringOrUndefined = Error | string | undefined

export type ErrorStringOrUndefinedOrNull = ErrorStringOrUndefined | null

/**
 *
 */
export interface ICallbackContext {
  callbackWaitsForEmptyEventLoop: boolean
  done: (err: ErrorStringOrUndefinedOrNull, result?: unknown) => void
  fail: (err: ErrorStringOrUndefinedOrNull) => void
  succeed: (result: unknown) => void
}

export type CallbackFunction = (
  err: ErrorStringOrUndefinedOrNull,
  result?: unknown,
) => void

export interface IBeforeExitListener {
  invoke: () => void
  reset: () => () => void
  set: (listener: () => void) => () => void
}

export interface IErrorCallbacks {
  uncaughtException: (err: Error) => void
  unhandledRejection: (err: Error) => void
}

export type HandlerFunction = (
  body: unknown,
  data: IEnvironmentData & IHeaderData,
  callback: CallbackFunction,
) => PromiseLike<unknown> | unknown
