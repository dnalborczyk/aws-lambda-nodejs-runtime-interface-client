/** Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

import type { IncomingHttpHeaders } from 'node:http'
import BeforeExitListener from '../../../src/Runtime/BeforeExitListener'
import type { IRuntimeClient } from '../../../src/RuntimeClient/index'
import type {
  InvocationResponse,
  CallbackFunction,
  ICallbackContext,
} from '../../../src/Common/index'
import { build as buildCallBackContext } from '../../../src/Runtime/CallbackContext'

const { stringify } = JSON

class RuntimeClientStub implements IRuntimeClient {
  lastId?: string
  lastError?: any
  lastResponse?: string

  nextInvocation(): Promise<InvocationResponse> {
    return Promise.resolve({
      bodyJson: "{ 'this': 'is a test' }",
      headers: {} as IncomingHttpHeaders,
    })
  }
  postInvocationError(error: unknown, id: string, callback: () => void): void {
    this.lastId = id
    this.lastError = error
    callback()
  }

  postInvocationResponse(
    response: unknown,
    id: string,
    callback: () => void,
  ): void {
    this.lastId = id
    this.lastResponse = stringify(response)
    callback()
  }
}

describe('Executing the callback', () => {
  let scheduledNextCalled = false
  const scheduleNext = () => {
    scheduledNextCalled = true
  }

  const dummyExecutionId = 'some id'
  let callback: CallbackFunction
  let context: ICallbackContext
  let client: RuntimeClientStub

  beforeEach(() => {
    scheduledNextCalled = false
    client = new RuntimeClientStub()
    ;[callback, context] = buildCallBackContext(
      client,
      dummyExecutionId,
      scheduleNext,
    )
  })

  it('should call the client with the correct response.', async () => {
    callback(null, 'response')

    expect(scheduledNextCalled).toEqual(false)
    expect(client.lastResponse).toEqual('"response"')
    expect(client.lastId).toEqual(dummyExecutionId)
    expect(client.lastError).toEqual(undefined)

    BeforeExitListener.invoke()
    expect(scheduledNextCalled).toEqual(true)
  })

  it('should not allow the callback to be executed more than once.', async () => {
    callback(null, 'response')
    callback(null, 'Second time')

    expect(client.lastResponse).toEqual('"response"')
  })

  it('should immediatelly schedule the next invocation when setting the callbackWaitsForEmptyEventLoop to false.', async () => {
    context.callbackWaitsForEmptyEventLoop = false
    callback(null, 'response when not waiting')

    expect(client.lastResponse).toEqual('"response when not waiting"')
    expect(scheduledNextCalled).toEqual(true)
  })

  it('should call the client with correct error when the error is defined.', () => {
    const myError = new Error('This is an error')

    callback(myError)

    expect(client.lastResponse).toEqual(undefined)
    expect(client.lastError).toEqual(myError)
  })

  it('should not wrap an error string into a generic Error.', () => {
    callback('This is an error')

    expect(client.lastResponse).toEqual(undefined)
    expect(client.lastError).toEqual('This is an error')
  })
})
