/** Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

import * as Errors from '../../../src/Errors/index'

const { parse } = JSON

class CircularError extends Error {
  backlink: Error

  constructor(message?: string) {
    super(message)

    this.backlink = this
    this.name = 'CircularError'
  }
}

class ExtendedError extends Error {
  code?: number
  customProperty?: string

  constructor(message?: string) {
    super(message)

    this.name = 'ExtendedError'
    this.stack = 'ExtendedErrorStack'
    this.code = 100
    this.customProperty = 'ExtendedErrorCustomProperty'
  }
}

describe('Formatting CircularError Logging', () => {
  it('should fall back to a minimal error format when an exception occurs', () => {
    const error = new CircularError('custom message')
    error.backlink = error

    const loggedError = parse(Errors.toFormatted(error).trim())

    expect(loggedError).toHaveProperty('errorType', 'CircularError')
    expect(loggedError).toHaveProperty('errorMessage', 'custom message')
    expect(loggedError).toHaveProperty('trace')
    expect(loggedError.trace.length).toBeGreaterThanOrEqual(1)
  })
})

describe('Formatting Error Logging', () => {
  it('should fall back to an extended error format when an exception occurs', () => {
    const error = new ExtendedError('custom message')

    const loggedError = parse(Errors.toFormatted(error).trim())

    expect(loggedError).toHaveProperty('errorType', 'ExtendedError')
    expect(loggedError).toHaveProperty('errorMessage', 'custom message')
    expect(loggedError).toHaveProperty('stack', ['ExtendedErrorStack'])
    expect(loggedError).toHaveProperty('code', 100)
    expect(loggedError).toHaveProperty(
      'customProperty',
      'ExtendedErrorCustomProperty',
    )
  })
})

describe('Converting an Error to a Runtime response', () => {
  it('should create a RuntimeErrorResponse object when an Error object is given', () => {
    const error = new Error('custom message')
    error.name = 'Runtime.TestError'

    const errorResponse = Errors.toRuntimeResponse(error)

    expect(errorResponse).toHaveProperty('errorType', 'Runtime.TestError')
    expect(errorResponse).toHaveProperty('errorMessage', 'custom message')
    expect(errorResponse).toHaveProperty('trace')
    expect(errorResponse.trace.length).toBeGreaterThanOrEqual(1)
  })

  it('should return a handled error response when the trace is missing', () => {
    const error = new Error('custom message')
    error.name = 'Runtime.TestError'
    error.stack = undefined

    const errorResponse = Errors.toRuntimeResponse(error)

    expect(errorResponse).toHaveProperty('errorType', 'handled')
    expect(errorResponse).toHaveProperty(
      'errorMessage',
      expect.stringMatching(/message, name, and stack/),
    )
    expect(errorResponse).toHaveProperty('trace')
    expect(errorResponse).toHaveProperty('errorType', 'handled')
    expect(errorResponse.trace.length).toEqual(0)
  })

  it('should handle strings by setting them as the message and assigning error type to string', () => {
    const error = 'custom message'
    const errorResponse = Errors.toRuntimeResponse(error)

    expect(errorResponse).toHaveProperty('errorType', 'string')
    expect(errorResponse).toHaveProperty('errorMessage', 'custom message')
    expect(errorResponse).toHaveProperty('trace')
    expect(errorResponse.trace.length).toEqual(0)
  })

  it('should handle arbitrary objects by converting them to string', () => {
    const error = {
      text: 'custom message',
    }

    const errorResponse = Errors.toRuntimeResponse(error)

    expect(errorResponse).toHaveProperty('errorType', 'object')
    expect(errorResponse).toHaveProperty('errorMessage', '[object Object]')
    expect(errorResponse).toHaveProperty('trace')
    expect(errorResponse.trace.length).toEqual(0)
  })

  it('should handle arbitrary objects by converting them to string by calling the toString method', () => {
    const error = {
      text: 'custom message',
    }
    error.toString = () => error.text
    const errorResponse = Errors.toRuntimeResponse(error)

    expect(errorResponse).toHaveProperty('errorType', 'object')
    expect(errorResponse).toHaveProperty('errorMessage', 'custom message')
    expect(errorResponse).toHaveProperty('trace')
    expect(errorResponse.trace.length).toEqual(0)
  })
})
