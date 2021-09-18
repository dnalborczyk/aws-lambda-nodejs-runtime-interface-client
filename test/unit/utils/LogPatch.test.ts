/** Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

import process, { env } from 'process'
import LogPatch from '../../../src/utils/LogPatch'
import * as Errors from '../../../src/Errors/index'
import { captureStream, consoleSnapshot } from './LoggingGlobals'
import FakeTelemetryTarget from './FakeTelemetryTarget'

const { parse } = JSON

describe('Apply the default console log patch', () => {
  const restoreConsole = consoleSnapshot()
  const capturedStdout = captureStream(process.stdout)

  // capture stdout
  beforeEach(() => capturedStdout.hook())
  // apply console patch
  beforeEach(() => LogPatch.patchConsole())
  // remove console patch
  afterEach(() => restoreConsole())
  // unhook stdout
  afterEach(() => capturedStdout.unhook())

  it('should have four tab-separated fields on a normal line', () => {
    console.log('anything')

    expect(capturedStdout.captured()).toMatch(/.*\t.*\t.*\t.*\n/)
  })

  it('should have five tab-separated fields when logging an error', () => {
    console.error('message', Errors.toFormatted(new Error('garbage')))

    expect(capturedStdout.captured()).toMatch(/.*\t.*\t.*\t.*\t.*\n/)
  })

  describe('When the global requestId is set', () => {
    const EXPECTED_ID = 'some fake request id'

    // set the request id
    beforeEach(() => {
      LogPatch.setCurrentRequestId(EXPECTED_ID)
    })
    // unset the request id
    afterEach(() => {
      LogPatch.setCurrentRequestId(undefined)
    })

    it('should include the requestId as the second field', () => {
      console.info('something')

      expect(capturedStdout.captured()).toMatch(
        new RegExp(`.*\t${EXPECTED_ID}\t.*\t.*\n`),
      )
    })
  })

  it('should include the level field as the third field', () => {
    console.warn('content')

    expect(capturedStdout.captured()).toMatch(new RegExp(`.*\t.*\tWARN\t.*\n`))
  })

  it('should include the message as the fourth field', () => {
    const message = 'my turbo message'
    console.trace(message)

    expect(capturedStdout.captured()).toMatch(
      new RegExp(`.*\t.*\t.*\t${message}\n`),
    )
  })

  describe('Each console.* method should include a level value', () => {
    it('should use INFO for console.log', () => {
      console.log('hello')

      expect(capturedStdout.captured()).toContain('INFO')
    })

    it('should use INFO for console.info', () => {
      console.info('hello')

      expect(capturedStdout.captured()).toContain('INFO')
    })

    it('should use WARN for console.warn', () => {
      console.warn('hello')

      expect(capturedStdout.captured()).toContain('WARN')
    })

    it('should use ERROR for console.error', () => {
      console.error('hello')

      expect(capturedStdout.captured()).toContain('ERROR')
    })

    it('should use TRACE for console.trace', () => {
      console.trace('hello')

      expect(capturedStdout.captured()).toContain('TRACE')
    })

    it('should use FATAL for console.fatal', () => {
      ;(console as any).fatal('hello')

      expect(capturedStdout.captured()).toContain('FATAL')
    })
  })

  it('should log an error as json', () => {
    const expected = new Errors.ExtendedError('some error')
    expected.code = 1234
    expected.custom = 'my custom field'

    console.error('message', Errors.toFormatted(expected))

    const errorString = capturedStdout.captured().split('\t')[4]
    const recoveredError = parse(errorString)

    expect(recoveredError).toHaveProperty('errorType', expected.name)
    expect(recoveredError).toHaveProperty('errorMessage', expected.message)
    expect(recoveredError).toHaveProperty('stack', expected.stack?.split('\n'))
    expect(recoveredError).toHaveProperty('code', expected.code)
    expect(recoveredError).toHaveProperty('custom', expected.custom)
  })
})

describe('The multiline log patch', () => {
  const restoreConsole = consoleSnapshot()
  const telemetryTarget = new FakeTelemetryTarget()

  // create a new telemetry file and patch the console
  beforeEach(() => {
    telemetryTarget.openFile()
    telemetryTarget.updateEnv()
    LogPatch.patchConsole()
  })
  // close the telemetry file and unpatch the console
  afterEach(() => {
    restoreConsole()
    telemetryTarget.closeFile()
  })

  it('should clear the telemetry env var', () => {
    expect(env).not.toHaveProperty('_LAMBDA_TELEMETRY_LOG_FD')
  })

  it('should write a line', () => {
    console.log('a line')

    expect(telemetryTarget.readLine()).toContain('a line')
  })

  it('should have four tab-separated fields on a normal line', () => {
    console.log('anything')

    expect(telemetryTarget.readLine()).toMatch(/.*\t.*\t.*\t.*/)
  })

  it('should end with a newline', () => {
    console.log('lol')

    expect(telemetryTarget.readLine()).toMatch(/.*\n$/)
  })

  it('should have five tab-separated fields when logging an error', () => {
    console.error('message', Errors.toFormatted(new Error('garbage')))

    expect(telemetryTarget.readLine()).toMatch(/.*\t.*\t.*\t.*\t.*/)
  })

  describe('When the global requestId is set', () => {
    const EXPECTED_ID = 'some fake request id'

    // set the request id
    beforeEach(() => {
      LogPatch.setCurrentRequestId(EXPECTED_ID)
    })
    // unset the request id
    afterEach(() => {
      LogPatch.setCurrentRequestId(EXPECTED_ID)
    })

    it('should include the requestId as the second field', () => {
      console.info('something')

      expect(telemetryTarget.readLine()).toMatch(
        new RegExp(`.*\t${EXPECTED_ID}\t.*\t.*`),
      )
    })
  })

  it('should include the level field as the third field', () => {
    console.warn('content')

    expect(telemetryTarget.readLine()).toMatch(new RegExp(`.*\t.*\tWARN\t.*`))
  })

  it('should include the message as the fourth field', () => {
    const message = 'my turbo message'
    console.trace(message)

    expect(telemetryTarget.readLine()).toMatch(
      new RegExp(`.*\t.*\t.*\t${message}`),
    )
  })

  describe('Each console.* method should include a level value', () => {
    it('should use INFO for console.log', () => {
      console.log('hello')

      expect(telemetryTarget.readLine()).toContain('INFO')
    })

    it('should use INFO for console.info', () => {
      console.info('hello')

      expect(telemetryTarget.readLine()).toContain('INFO')
    })

    it('should use WARN for console.warn', () => {
      console.warn('hello')

      expect(telemetryTarget.readLine()).toContain('WARN')
    })

    it('should use ERROR for console.error', () => {
      console.error('hello')

      expect(telemetryTarget.readLine()).toContain('ERROR')
    })

    it('should use TRACE for console.trace', () => {
      console.trace('hello')

      expect(telemetryTarget.readLine()).toContain('TRACE')
    })

    it('should use FATAL for console.fatal', () => {
      ;(console as any).fatal('hello')

      expect(telemetryTarget.readLine()).toContain('FATAL')
    })
  })

  it('should log an error as json', () => {
    const expected = new Errors.ExtendedError('some error')
    expected.code = 1234
    expected.custom = 'my custom field'

    console.error('message', Errors.toFormatted(expected))

    const errorString = telemetryTarget.readLine().split('\t')[4]
    const recoveredError = parse(errorString)

    expect(recoveredError).toHaveProperty('errorType', expected.name)
    expect(recoveredError).toHaveProperty('errorMessage', expected.message)
    expect(recoveredError).toHaveProperty('stack', expected.stack?.split('\n'))
    expect(recoveredError).toHaveProperty('code', expected.code)
    expect(recoveredError).toHaveProperty('custom', expected.custom)
  })
})
