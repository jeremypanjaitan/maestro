import { describe, it, expect } from 'vitest';
import { terbilang, terbilangRupiah } from './terbilang';

describe('terbilang', () => {
  it.each([
    [0, 'nol'],
    [1, 'satu'],
    [10, 'sepuluh'],
    [11, 'sebelas'],
    [15, 'lima belas'],
    [20, 'dua puluh'],
    [99, 'sembilan puluh sembilan'],
    [100, 'seratus'],
    [111, 'seratus sebelas'],
    [250, 'dua ratus lima puluh'],
    [1000, 'seribu'],
    [1500, 'seribu lima ratus'],
    [11000, 'sebelas ribu'],
    [100000, 'seratus ribu'],
    [225000, 'dua ratus dua puluh lima ribu'],
    [1000000, 'satu juta'],
    [1001000, 'satu juta seribu'],
    [3400000, 'tiga juta empat ratus ribu'],
    [2000000000, 'dua miliar'],
  ])('%i -> %s', (n, expected) => {
    expect(terbilang(n)).toBe(expected);
  });

  it('appends rupiah', () => {
    expect(terbilangRupiah(3400000)).toBe('tiga juta empat ratus ribu rupiah');
  });
});
