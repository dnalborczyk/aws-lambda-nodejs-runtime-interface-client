/** Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

import * as XRayError from '../../../src/Errors/XRayError'

const { parse } = JSON

describe('Formatted Error Logging', () => {
  it('should fall back to a minimal error format when an exception occurs', () => {
    const error = new Error('custom message')
    error.name = 'CircularError'
    error.stack = `CircularError: custom message
                      at exports.handler (/var/function/node_modules/event_invoke.js:3:502)
                      at exports.handler (/var/function/node_modules/event_invoke.js:5:242)
                      at (/var/function/test_exec.js:4:123)`

    const loggedXRayError = parse(XRayError.toFormatted(error).trim())

    expect(loggedXRayError).toHaveProperty('working_directory')
    expect(loggedXRayError).toHaveProperty('exceptions')
    expect(loggedXRayError).toHaveProperty(
      'paths',
      expect.arrayContaining([
        '/var/function/node_modules/event_invoke.js',
        '/var/function/test_exec.js',
      ]),
    )

    const exceptions = loggedXRayError.exceptions

    expect(exceptions.length).toEqual(1)

    const loggedError = exceptions[0]

    expect(loggedError).toHaveProperty('type', 'CircularError')
    expect(loggedError).toHaveProperty('message', 'custom message')
    expect(loggedError).toHaveProperty(
      'stack',
      expect.arrayContaining([
        {
          path: '/var/function/node_modules/event_invoke.js',
          line: 3,
          label: 'exports.handler',
        },
        {
          path: '/var/function/node_modules/event_invoke.js',
          line: 5,
          label: 'exports.handler',
        },
        {
          path: '/var/function/test_exec.js',
          line: 4,
          label: 'anonymous',
        },
      ]),
    )
  })
})
