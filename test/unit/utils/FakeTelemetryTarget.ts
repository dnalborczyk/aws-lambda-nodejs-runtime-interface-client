/** Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

import * as assert from 'node:assert'
import { closeSync, mkdtempSync, openSync, readSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { env } from 'node:process'

const _LOG_IDENTIFIER = Buffer.from('a55a0001', 'hex')

/**
 * A fake implementation of the multilne logging protocol.
 * Read and write log frames to a temp file and provide an asserting helper for
 * reading individual log statements from the file.
 */
export default class FakeTelemetryTarget {
  readTarget = 0
  writeTarget = 0

  openFile(): void {
    const tempTelemetryDir = mkdtempSync(
      join(tmpdir(), 'LambdyBYOLNodeJs12xTelemetry-'),
    )
    this.writeTarget = openSync(join(tempTelemetryDir, 'log'), 'as+')
    this.readTarget = openSync(join(tempTelemetryDir, 'log'), 'rs+')
    console.log(
      'Generate new telemetry file',
      tempTelemetryDir,
      'with file descriptor',
      this.readTarget,
    )
  }

  closeFile(): void {
    console.log(`Close telemetry filedescriptor ${this.readTarget}`)
    closeSync(this.readTarget)
    closeSync(this.writeTarget)
    this.readTarget = 0
    this.writeTarget = 0
  }

  updateEnv(): void {
    env['_LAMBDA_TELEMETRY_LOG_FD'] = this.writeTarget.toString()
  }

  /**
   * Read a single line from the telemetry file.
   * Explodes when:
   * - no line is present
   * - the prefix is malformed
   * - there aren't enough bytes
   */
  readLine(): string {
    const readLength = () => {
      const logPrefix = Buffer.alloc(8)
      const actualReadBytes = readSync(
        this.readTarget,
        logPrefix,
        0,
        logPrefix.length,
        null,
      )
      assert.strictEqual(
        actualReadBytes,
        logPrefix.length,
        `Expected actualReadBytes[${actualReadBytes}] = ${logPrefix.length}`,
      )
      assert.strictEqual(
        logPrefix.lastIndexOf(_LOG_IDENTIFIER),
        0,
        `log prefix ${logPrefix.toString(
          'hex',
        )} should start with ${_LOG_IDENTIFIER.toString('hex')}`,
      )
      return logPrefix.readInt32BE(4)
    }

    const lineLength = readLength()
    const lineBytes = Buffer.alloc(lineLength)
    const actualLineSize = readSync(
      this.readTarget,
      lineBytes,
      0,
      lineBytes.length,
      null,
    )
    assert.strictEqual(
      actualLineSize,
      lineBytes.length,
      'The log line must match the length specified in the frame header',
    )
    return lineBytes.toString('utf8')
  }
}
