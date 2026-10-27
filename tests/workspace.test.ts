import { describe, expect, it } from 'vitest'
import { cn } from '../app/utils/cn'
describe('class composition', () => {
  it('merges conflicting Tailwind utilities', () => {
    expect(cn('px-2', false, 'px-4')).toBe('px-4')
  })
})
