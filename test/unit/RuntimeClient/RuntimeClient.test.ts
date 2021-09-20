/** Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

import * as runtimeErrors from '../../../src/Errors/index'
import RuntimeClient from '../../../src/RuntimeClient/index'
import { StubHttp } from '../utils/StubHttp'

class EvilError extends Error {
  get name(): string {
    throw 'gotcha'
  }
}

const EXPECTED_ERROR_HEADER = 'Lambda-Runtime-Function-Error-Type'

describe('building error requests with the RuntimeClient', () => {
  const stubHttp = new StubHttp()
  const client = new RuntimeClient('notUsed:1337', stubHttp)

  const errors: Array<[Error, string]> = [
    [new Error('generic failure'), 'Error'],
    [new runtimeErrors.ImportModuleError(), 'Runtime.ImportModuleError'],
    [new runtimeErrors.HandlerNotFound(), 'Runtime.HandlerNotFound'],
    [new runtimeErrors.MalformedHandlerName(), 'Runtime.MalformedHandlerName'],
    [new runtimeErrors.UserCodeSyntaxError(), 'Runtime.UserCodeSyntaxError'],
    [{ data: 'some random object' } as unknown as Error, 'object'],
    [new EvilError(), 'handled'],
  ]

  describe('the error header in postInitError', () => {
    errors.forEach(([error, name]) => {
      it(`should be ${name} for ${error.constructor.name}`, () => {
        client.postInitError(error, () => {
          // No op
        })

        expect(stubHttp.lastUsedOptions).toMatchObject({
          headers: {
            [EXPECTED_ERROR_HEADER]: name,
          },
        })
      })
    })
  })
})
