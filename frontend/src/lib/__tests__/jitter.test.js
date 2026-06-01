// @vitest-environment node
//
// Node env: crypto.subtle + TextEncoder are present (Node 20+), and we need the
// real SHA-256 to prove the port matches the backend byte-for-byte.
import { describe, it, expect } from 'vitest'
import { jitterParams, IDENTITY_JITTER } from '../jitter'

const SIG = '00000000-0000-4000-8000-000000000000'

describe('jitterParams (mirrors backend _jitter_params)', () => {
  it('is identity at intensity 0', async () => {
    expect(await jitterParams(SIG, 0, 0, 0)).toEqual(IDENTITY_JITTER)
  })

  it('matches the backend reference for seed SIG:0:0 @ 1.0', async () => {
    // Reference computed from backend services.composer._jitter_params.
    const j = await jitterParams(SIG, 0, 0, 1.0)
    expect(j.dAngle).toBeCloseTo(2.9607843137254894, 10)
    expect(j.scaleX).toBeCloseTo(0.9486274509803921, 10)
    expect(j.scaleY).toBeCloseTo(0.9768627450980392, 10)
    expect(j.skewX).toBeCloseTo(-0.17576470588235293, 10)
    expect(j.opacity).toBeCloseTo(0.9774117647058823, 10)
    expect(j.dx).toBe(4)
    expect(j.dy).toBe(-2)
  })

  it('is deterministic', async () => {
    expect(await jitterParams(SIG, 2, 1, 0.7)).toEqual(await jitterParams(SIG, 2, 1, 0.7))
  })

  it('respects the documented bounds at full intensity', async () => {
    const j = await jitterParams(SIG, 3, 2, 1.0)
    expect(Math.abs(j.dAngle)).toBeLessThanOrEqual(5.0)
    expect(j.scaleX).toBeGreaterThanOrEqual(0.9)
    expect(j.scaleX).toBeLessThanOrEqual(1.1)
    expect(j.scaleY).toBeGreaterThanOrEqual(0.9)
    expect(j.scaleY).toBeLessThanOrEqual(1.1)
    expect(Math.abs(j.skewX)).toBeLessThanOrEqual(0.18)
    expect(j.opacity).toBeGreaterThanOrEqual(0.92)
    expect(j.opacity).toBeLessThanOrEqual(1.0)
    expect(Math.abs(j.dx)).toBeLessThanOrEqual(4)
    expect(Math.abs(j.dy)).toBeLessThanOrEqual(4)
  })

  it('differs across instances (index and page)', async () => {
    expect(await jitterParams(SIG, 0, 0, 0.7)).not.toEqual(await jitterParams(SIG, 0, 1, 0.7))
    expect(await jitterParams(SIG, 0, 0, 0.7)).not.toEqual(await jitterParams(SIG, 1, 0, 0.7))
  })
})
