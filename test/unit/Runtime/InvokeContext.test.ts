/** Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

import { promisify } from 'util'

const sleep = promisify(setTimeout)

import InvokeContext from '../../../src/Runtime/InvokeContext'

describe('Getting remaining invoke time', () => {
  it('should reduce by at least elapsed time', async () => {
    const ctx = new InvokeContext({
      'lambda-runtime-deadline-ms': (Date.now() + 1000).toString(),
    })

    const timeout = 100 * 1.05 // 5% margin of error
    const before = ctx.headerData.getRemainingTimeInMillis()
    await sleep(timeout)
    const after = ctx.headerData.getRemainingTimeInMillis()

    expect(before - after).toBeGreaterThanOrEqual(100)
  })

  it('should return NaN when the deadline is not defined?', async () => {
    const ctx = new InvokeContext({})
    const remaining = ctx.headerData.getRemainingTimeInMillis()

    expect(remaining).toEqual(NaN)
  })

  it('should be within range.', () => {
    const ctx = new InvokeContext({
      'lambda-runtime-deadline-ms': (Date.now() + 1000).toString(),
    })

    const remainingTime = ctx.headerData.getRemainingTimeInMillis()

    expect(remainingTime).toBeGreaterThan(0)
    expect(remainingTime).toBeLessThanOrEqual(1000)
  })
})
