const SATUAN = [
  "", "satu", "dua", "tiga", "empat", "lima",
  "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas",
];

/** Spells 0..999 in Bahasa Indonesia ("" for 0). */
function underThousand(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${SATUAN[n - 10]} belas`;
  if (n < 100) {
    const rest = underThousand(n % 10);
    return `${SATUAN[Math.floor(n / 10)]} puluh${rest ? ` ${rest}` : ""}`;
  }
  const head = n < 200 ? "seratus" : `${SATUAN[Math.floor(n / 100)]} ratus`;
  const rest = underThousand(n % 100);
  return rest ? `${head} ${rest}` : head;
}

const SCALES = ["", "ribu", "juta", "miliar", "triliun"];

/**
 * Spells a non-negative whole number in Bahasa Indonesia, e.g.
 * 3400000 -> "tiga juta empat ratus ribu". 1000 is "seribu" (not "satu ribu").
 */
export function terbilang(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "nol";

  const parts: string[] = [];
  let rest = n;
  let scale = 0;
  while (rest > 0) {
    const chunk = rest % 1000;
    if (chunk > 0) {
      if (scale === 1 && chunk === 1) parts.unshift("seribu");
      else parts.unshift([underThousand(chunk), SCALES[scale]].filter(Boolean).join(" "));
    }
    rest = Math.floor(rest / 1000);
    scale += 1;
  }
  return parts.join(" ");
}

/** `terbilang` + " rupiah", for the kwitansi "Terbilang:" line. */
export function terbilangRupiah(value: number): string {
  return `${terbilang(value)} rupiah`;
}
