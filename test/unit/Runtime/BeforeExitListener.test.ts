/** Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. */

describe('Invoke the BeforeExitListener', () => {
  it('should not fail if a listerner has not been set', async () => {
    const { default: beforeExitListener } = await import(
      '../../../src/Runtime/BeforeExitListener'
    )

    beforeExitListener.invoke()
  })

  it('should use the listener', async () => {
    let count = 0
    const listener = () => {
      count++
    }

    const { default: beforeExitListener } = await import(
      '../../../src/Runtime/BeforeExitListener'
    )

    beforeExitListener.set(listener)

    beforeExitListener.invoke()
    expect(count).toEqual(1)

    beforeExitListener.invoke()
    expect(count).toEqual(2)
  })

  it('should use the same listener even when imported again', async () => {
    let count = 0
    const listener = () => {
      count++
    }

    const { default: beforeExitListener } = await import(
      '../../../src/Runtime/BeforeExitListener'
    )

    beforeExitListener.set(listener)
    beforeExitListener.invoke()

    const { default: secondBeforeExitListener } = await import(
      '../../../src/Runtime/BeforeExitListener'
    )

    secondBeforeExitListener.invoke()

    expect(count).toEqual(2)
  })
})
