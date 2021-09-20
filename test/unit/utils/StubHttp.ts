/** Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

import type { RequestOptions, ClientRequest } from 'node:http'
import type { URL } from 'node:url'

const { freeze } = Object

/**
 * Stub request object.
 * Provides no-op definitions of the request functions used by the Runtime Interface Client.
 */
export const noOpRequest = freeze({
  /* no op, return itself to allow continuations/chaining */
  on: () => noOpRequest,
  /* no op, return itself to allow continuations/chaninig */
  end: () => noOpRequest,
})

export class StubHttp {
  lastUsedOptions: RequestOptions | string | URL
  Agent: any

  constructor() {
    this.lastUsedOptions = {}
    this.Agent = class FakeAgent {}
  }

  request(options: RequestOptions | string | URL): ClientRequest {
    this.lastUsedOptions = options
    return noOpRequest as unknown as ClientRequest
  }
}
