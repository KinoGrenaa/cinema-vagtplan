import { payrollVersionLockKey } from './payroll-version-lock';

describe('payroll version advisory lock', () => {
  it('pakker namespace og scope i én bigint-nøgle', () => {
    expect(payrollVersionLockKey(123)).toBe((8_302_026n << 32n) | 123n);
  });

  it('giver forskellige låsenøgler for forskellige scopes', () => {
    expect(payrollVersionLockKey(1)).not.toBe(payrollVersionLockKey(2));
  });

  it('understøtter de store scopes, der bruges til lønregler og særlige dage', () => {
    expect(payrollVersionLockKey(3_000_000_123)).toBeGreaterThan(0n);
  });

  it('afviser scopes uden for den reserverede 32-bit-del', () => {
    expect(() => payrollVersionLockKey(0x1_0000_0000)).toThrow(RangeError);
  });
});
