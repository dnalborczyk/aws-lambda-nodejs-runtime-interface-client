/**
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This module defines the Runtime client which is responsible for all HTTP
 * interactions with the Runtime layer.
 */

import { createRequire } from 'node:module'
import {
  Agent,
  ClientRequest,
  IncomingMessage,
  OutgoingHttpHeaders,
  RequestOptions,
} from 'node:http'
import { version } from 'node:process'
import type { URL } from 'node:url'
import type { InvocationResponse } from '../Common/index.js'
import * as Errors from '../Errors/index.js'
import * as XRayError from '../Errors/XRayError.js'

const { stringify } = JSON
const { assign } = Object

const ERROR_TYPE_HEADER = 'Lambda-Runtime-Function-Error-Type'
const XRAY_ERROR_CAUSE = 'Lambda-Runtime-Function-XRay-Error-Cause'

interface HttpModule {
  Agent: typeof Agent
  request(
    options: RequestOptions | string | URL,
    callback?: (res: IncomingMessage) => void,
  ): ClientRequest
}

export interface IRuntimeClient {
  nextInvocation: () => Promise<InvocationResponse>

  postInvocationError: (
    error: unknown,
    id: string,
    callback: () => void,
  ) => void

  postInvocationResponse: (
    response: unknown,
    id: string,
    callback: () => void,
  ) => void
}

function userAgent(): string {
  const legacyRequire = createRequire(import.meta.url)
  const { version: pkgVersion } = legacyRequire('../../package.json')

  return `aws-lambda-nodejs/${version}-${pkgVersion}`
}

/**
 * Objects of this class are responsible for all interactions with the Runtime
 * API.
 */
export default class RuntimeClient implements IRuntimeClient {
  #agent: Agent
  #hostname: string
  #http: HttpModule
  #port: number
  #userAgent: string

  // TODO FIXME http module is only a parameter for testing, should be removed
  constructor(hostnamePort: string, httpClient: HttpModule) {
    this.#agent = new Agent({
      keepAlive: true,
      maxSockets: 1,
    })
    this.#http = httpClient
    this.#userAgent = userAgent()

    const [hostname, port] = hostnamePort.split(':')
    this.#hostname = hostname
    this.#port = +port
  }

  /**
   * Complete and invocation with the provided response.
   * @param {Object} response
   *   An arbitrary object to convert to JSON and send back as as response.
   * @param {String} id
   *   The invocation ID.
   * @param {function()} callback
   *   The callback to run after the POST response ends
   */
  postInvocationResponse(
    response: unknown,
    id: string,
    callback: () => void,
  ): void {
    this.#post(
      `/2018-06-01/runtime/invocation/${id}/response`,
      response,
      {},
      callback,
    )
  }

  /**
   * Post an initialization error to the Runtime API.
   * @param {Error} error
   * @param {function()} callback
   *   The callback to run after the POST response ends
   */
  postInitError(error: unknown, callback: () => void): void {
    const response = Errors.toRuntimeResponse(error)
    this.#post(
      `/2018-06-01/runtime/init/error`,
      response,
      { [ERROR_TYPE_HEADER]: response.errorType },
      callback,
    )
  }

  /**
   * Post an invocation error to the Runtime API
   * @param {Error} error
   * @param {String} id
   *   The invocation ID for the in-progress invocation.
   * @param {function()} callback
   *   The callback to run after the POST response ends
   */
  postInvocationError(error: unknown, id: string, callback: () => void): void {
    const response = Errors.toRuntimeResponse(error)
    const xrayString = XRayError.toFormatted(error)

    this.#post(
      `/2018-06-01/runtime/invocation/${id}/error`,
      response,
      {
        [ERROR_TYPE_HEADER]: response.errorType,
        [XRAY_ERROR_CAUSE]: xrayString,
      },
      callback,
    )
  }

  /**
   * Get the next invocation.
   * @return {PromiseLike.<Object>}
   *   A promise which resolves to an invocation object that contains the body
   *   as json and the header array. e.g. {bodyJson, headers}
   */
  async nextInvocation(): Promise<InvocationResponse> {
    const options = {
      agent: this.#agent,
      headers: {
        'User-Agent': this.#userAgent,
      },
      hostname: this.#hostname,
      method: 'GET',
      path: '/2018-06-01/runtime/invocation/next',
      port: this.#port,
    }

    return new Promise((resolve, reject) => {
      const request = this.#http.request(options, (response) => {
        let data = ''
        response
          .setEncoding('utf-8')
          .on('data', (chunk) => {
            data += chunk
          })
          .on('end', () => {
            resolve({
              bodyJson: data,
              headers: response.headers,
            })
          })
      })
      request
        .on('error', (err) => {
          reject(err)
        })
        .end()
    })
  }

  /**
   * HTTP Post to a path.
   * @param {String} path
   * @param {Object} body
   *   The body is serialized into JSON before posting.
   * @param {Object} headers
   *   The http headers
   * @param {function()} callback
   *   The callback to run after the POST response ends
   */
  #post(
    path: string,
    body: unknown,
    headers: OutgoingHttpHeaders,
    callback: () => void,
  ): void {
    const bodyString = _trySerializeResponse(body)
    const options: RequestOptions = {
      agent: this.#agent,
      headers: assign(
        {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.from(bodyString).length,
        },
        headers ?? {},
      ),
      hostname: this.#hostname,
      method: 'POST',
      path: path,
      port: this.#port,
    }

    const request = this.#http.request(options, (response) => {
      response
        .on('end', () => {
          callback()
        })
        .on('error', (err) => {
          throw err
        })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .on('data', () => {})
    })
    request
      .on('error', (err) => {
        throw err
      })
      .end(bodyString, 'utf-8')
  }
}

/**
 * Attempt to serialize an object as json. Capture the failure if it occurs and
 * throw one that's known to be serializable.
 */
function _trySerializeResponse(body: unknown): string {
  try {
    return stringify(body === undefined ? null : body)
  } catch (err) {
    throw new Error('Unable to stringify response body')
  }
}
