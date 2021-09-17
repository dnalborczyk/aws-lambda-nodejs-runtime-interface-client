/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/** Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

import { writeSync } from 'fs'
import process, { env } from 'process'
import { format } from 'util'

const { freeze } = Object

const levels = freeze({
  INFO: { name: 'INFO' },
  DEBUG: { name: 'DEBUG' },
  WARN: { name: 'WARN' },
  ERROR: { name: 'ERROR' },
  TRACE: { name: 'TRACE' },
  FATAL: { name: 'FATAL' },
})

/* Use a unique symbol to provide global access without risk of name clashes. */
const REQUEST_ID_SYMBOL = Symbol.for('aws.lambda.runtime.requestId')
const _currentRequestId = {
  get: () => (global as any)[REQUEST_ID_SYMBOL],
  set: (id: any) => ((global as any)[REQUEST_ID_SYMBOL] = id),
}

/**
 * Write logs to stdout.
 */
function _logToStdout(level: any, message: any) {
  const time = new Date().toISOString()
  const requestId = _currentRequestId.get()
  let line = `${time}\t${requestId}\t${level.name}\t${message}`
  line = line.replace(/\n/g, '\r')
  process.stdout.write(line + '\n')
}

/**
 * Write logs to filedescriptor.
 * Implements the logging contract between runtimes and the platform.
 * Each entry is framed as:
 *    +----------------------+------------------------+-----------------------+
 *    | Frame Type - 4 bytes | Length (len) - 4 bytes | Message - 'len' bytes |
 *    +----------------------+------------------------+-----------------------+
 * The frist 4 bytes are the frame type. For logs this is always 0xa55a0001.
 * The second 4 bytes are the length of the message.
 * The remaining bytes ar ethe message itself. Byte order is big-endian.
 */
function _logToFd(logTarget: any) {
  const typeAndLength = Buffer.alloc(8)
  typeAndLength.writeUInt32BE(0xa55a0001, 0)
  typeAndLength.writeUInt32BE(0x00000000, 4)

  return (level: any, message: any) => {
    const time = new Date().toISOString()
    const requestId = _currentRequestId.get()
    const enrichedMessage = `${time}\t${requestId}\t${level.name}\t${message}\n`
    const messageBytes = Buffer.from(enrichedMessage, 'utf8')
    typeAndLength.writeInt32BE(messageBytes.length, 4)
    writeSync(logTarget, typeAndLength)
    writeSync(logTarget, messageBytes)
  }
}

/**
 * Replace console functions with a log function.
 * @param {Function(level, String)} log
 */
function _patchConsoleWith(log: any) {
  console.log = (msg, ...params) => {
    log(levels.INFO, format(msg, ...params))
  }
  console.debug = (msg, ...params) => {
    log(levels.DEBUG, format(msg, ...params))
  }
  console.info = (msg, ...params) => {
    log(levels.INFO, format(msg, ...params))
  }
  console.warn = (msg, ...params) => {
    log(levels.WARN, format(msg, ...params))
  }
  console.error = (msg, ...params) => {
    log(levels.ERROR, format(msg, ...params))
  }
  console.trace = (msg, ...params) => {
    log(levels.TRACE, format(msg, ...params))
  }
  ;(console as any).fatal = (msg: any, ...params: any[]) => {
    log(levels.FATAL, format(msg, ...params))
  }
}

function _patchConsole(): void {
  if (
    env['_LAMBDA_TELEMETRY_LOG_FD'] != null &&
    env['_LAMBDA_TELEMETRY_LOG_FD'] != undefined
  ) {
    const logFd = parseInt(env['_LAMBDA_TELEMETRY_LOG_FD'])
    _patchConsoleWith(_logToFd(logFd))
    delete env['_LAMBDA_TELEMETRY_LOG_FD']
  } else {
    _patchConsoleWith(_logToStdout)
  }
}

export default {
  setCurrentRequestId: _currentRequestId.set,
  patchConsole: _patchConsole,
}
