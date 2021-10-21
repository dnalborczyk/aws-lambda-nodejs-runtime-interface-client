/* eslint-disable no-console */
/** Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

import BeforeExitListener from './BeforeExitListener.js'
import type {
  CallbackFunction,
  ErrorStringOrUndefined,
  ErrorStringOrUndefinedOrNull,
  ICallbackContext,
} from '../Common/index.js'
import * as Errors from '../Errors/index.js'
import type { IRuntimeClient } from '../RuntimeClient/index.js'

/**
 * Construct the base-context object which includes the required flags and
 * callback methods for the Node programming model.
 *
 * @param client {Client}
 *   The Runtime client used to post results/errors.
 * @param id {string}
 *   The invokeId for the current invocation.
 * @param scheduleNext {function}
 *   A function which takes no params and immediately schedules the next
 *   iteration of the invoke loop.
 * @returns [callback, context]
 *   The same function and context object, but wrapped such that only the
 *   first call to any function will be successful. All subsequent calls are
 *   a no-op.
 */
export function build(
  client: IRuntimeClient,
  id: string,
  scheduleNext: () => void,
): [CallbackFunction, ICallbackContext] {
  const [callback, context] = _rawCallbackContext(client, id, scheduleNext)
  return _wrappedCallbackContext(callback, context)
}

function _homogeneousError(err: ErrorStringOrUndefined) {
  if (err instanceof Error) {
    return err
  }

  return new Error(err)
}

/**
 * Build the callback function and the part of the context which exposes
 * the succeed/fail/done callbacks.
 * @param client {Client}
 *   The Runtime client used to post results/errors.
 * @param id {string}
 *   The invokeId for the current invocation.
 * @param scheduleNext {function}
 *   A function which takes no params and immediately schedules the next
 *   iteration of the invoke loop.
 */
function _rawCallbackContext(
  client: IRuntimeClient,
  id: string,
  scheduleNext: () => void,
): [CallbackFunction, ICallbackContext] {
  const postError = (err: ErrorStringOrUndefined, callback: () => void) => {
    const homogeneousError = _homogeneousError(err)
    console.error('Invoke Error', Errors.toFormatted(homogeneousError))
    client.postInvocationError(err, id, callback)
  }

  const complete = (result: unknown, callback: () => void) => {
    client.postInvocationResponse(result, id, callback)
  }

  let waitForEmptyEventLoop = true

  const callback = (
    err: ErrorStringOrUndefinedOrNull,
    result: unknown,
  ): void => {
    BeforeExitListener.reset()
    if (err !== undefined && err !== null) {
      postError(err, scheduleNext)
    } else {
      complete(result, () => {
        if (!waitForEmptyEventLoop) {
          scheduleNext()
        } else {
          BeforeExitListener.set(scheduleNext)
        }
      })
    }
  }

  const done = (err: ErrorStringOrUndefinedOrNull, result?: unknown) => {
    BeforeExitListener.reset()
    if (err !== undefined && err !== null) {
      postError(err, scheduleNext)
    } else {
      complete(result, scheduleNext)
    }
  }

  const succeed = (result: unknown) => {
    done(null, result)
  }

  const fail = (err: ErrorStringOrUndefinedOrNull) => {
    if (err === undefined || err === null) {
      done('handled')
    } else {
      done(err)
    }
  }

  const callbackContext = {
    get callbackWaitsForEmptyEventLoop(): boolean {
      return waitForEmptyEventLoop
    },
    set callbackWaitsForEmptyEventLoop(value: boolean) {
      waitForEmptyEventLoop = value
    },
    succeed,
    fail,
    done,
  }

  return [callback, callbackContext]
}

/**
 * Wraps the callback and context so that only the first call to any callback
 * succeeds.
 * @param callback {function}
 *   the node-style callback function that was previously generated but not
 *   yet wrapped.
 * @param callbackContext {object}
 *   The previously generated callbackContext object that contains
 *   getter/setters for the contextWaitsForEmptyeventLoop flag and the
 *   succeed/fail/done functions.
 * @return [callback, context]
 */
function _wrappedCallbackContext(
  callback: CallbackFunction,
  callbackContext: ICallbackContext,
): [CallbackFunction, ICallbackContext] {
  let finished = false
  // eslint-disable-next-line @typescript-eslint/ban-types
  function onlyAllowFirstCall(toWrap: Function) {
    return function setFinished(...args: unknown[]) {
      if (!finished) {
        toWrap(...args)
        finished = true
      }
    }
  }

  // eslint-disable-next-line no-param-reassign
  callbackContext.succeed = onlyAllowFirstCall(callbackContext.succeed)
  // eslint-disable-next-line no-param-reassign
  callbackContext.fail = onlyAllowFirstCall(callbackContext.fail)
  // eslint-disable-next-line no-param-reassign
  callbackContext.done = onlyAllowFirstCall(callbackContext.done)

  return [onlyAllowFirstCall(callback), callbackContext]
}
