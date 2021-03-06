/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Defines custom error types throwable by the runtime.
 */

import { types } from 'node:util'

const { stringify } = JSON
const { setPrototypeOf } = Object

export function isError(obj: any): obj is Error {
  return (
    obj &&
    obj.name &&
    obj.message &&
    obj.stack &&
    typeof obj.name === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.stack === 'string'
  )
}

interface RuntimeErrorResponse {
  errorMessage: string
  errorType: string
  trace: string[]
}

/**
 * Attempt to convert an object into a response object.
 * This method accounts for failures when serializing the error object.
 */
export function toRuntimeResponse(error: unknown): RuntimeErrorResponse {
  try {
    if (types.isNativeError(error) || isError(error)) {
      if (!error.stack) {
        throw new Error('Error stack is missing.')
      }
      return {
        errorType: error.name,
        errorMessage: error.message,
        trace: error.stack.split('\n'),
      }
    }

    return {
      errorType: typeof error,
      errorMessage: (error as any).toString(),
      trace: [],
    }
  } catch (_err) {
    return {
      errorType: 'handled',
      errorMessage:
        'callback called with Error argument, but there was a problem while retrieving one or more of its message, name, and stack',
      trace: [],
    }
  }
}

/**
 * Format an error with the expected properties.
 * For compatability, the error string always starts with a tab.
 */
export function toFormatted(error: unknown): string {
  try {
    return '\t' + stringify(error, (_k, v) => _withEnumerableProperties(v))
  } catch (err) {
    return '\t' + stringify(toRuntimeResponse(error))
  }
}

/**
 * Error name, message, code, and stack are all members of the superclass, which
 * means they aren't enumerable and don't normally show up in JSON.stringify.
 * This method ensures those interesting properties are available along with any
 * user-provided enumerable properties.
 */
function _withEnumerableProperties(error: any) {
  if (error instanceof Error) {
    const extendedError: ExtendedError = <ExtendedError>(<any>error)
    const ret: any = {
      errorType: extendedError.name,
      errorMessage: extendedError.message,
      code: extendedError.code,
      ...extendedError,
    }

    if (typeof extendedError.stack === 'string') {
      ret.stack = extendedError.stack.split('\n')
    }
    return ret
  }

  return error
}

export class ExtendedError extends Error {
  code?: number
  custom?: string
  promise?: Promise<any>
  reason?: string

  constructor(reason?: string) {
    super(reason) // 'Error' breaks prototype chain here
    setPrototypeOf(this, new.target.prototype) // restore prototype chain
  }
}

export class ImportModuleError extends ExtendedError {}
export class HandlerNotFound extends ExtendedError {}
export class MalformedHandlerName extends ExtendedError {}
export class UserCodeSyntaxError extends ExtendedError {}
export class UnhandledPromiseRejection extends ExtendedError {
  constructor(reason?: string, promise?: Promise<any>) {
    super(reason)
    this.reason = reason
    this.promise = promise
  }
}

;[
  ImportModuleError,
  HandlerNotFound,
  MalformedHandlerName,
  UserCodeSyntaxError,
  UnhandledPromiseRejection,
].forEach((err) => {
  // eslint-disable-next-line no-param-reassign
  err.prototype.name = `Runtime.${err.name}`
})
