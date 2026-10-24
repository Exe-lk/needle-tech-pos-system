const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
];

const TEENS = [
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertBelowThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(ONES[Math.floor(n / 100)], 'Hundred');
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]);
    if (n % 10) parts.push(ONES[n % 10]);
  } else if (n >= 10) {
    parts.push(TEENS[n - 10]);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

function convertInteger(value: number): string {
  if (value === 0) return 'Zero';

  const scales = [
    { value: 1_000_000_000, name: 'Billion' },
    { value: 1_000_000, name: 'Million' },
    { value: 1_000, name: 'Thousand' },
  ];

  let remaining = value;
  const parts: string[] = [];

  for (const scale of scales) {
    if (remaining >= scale.value) {
      const count = Math.floor(remaining / scale.value);
      parts.push(convertBelowThousand(count), scale.name);
      remaining %= scale.value;
    }
  }

  if (remaining > 0) {
    parts.push(convertBelowThousand(remaining));
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Convert an LKR amount to English words, e.g. "One Hundred Ninety Two Thousand Four Hundred Fifty Eight Only". */
export function amountInWords(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '';

  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded + Number.EPSILON);
  const cents = Math.round((rounded - rupees) * 100);

  if (rupees === 0 && cents === 0) return 'Zero Only';

  let result = convertInteger(rupees);
  if (cents > 0) {
    result = `${result} and Cents ${convertBelowThousand(cents)}`;
  }
  return `${result} Only`;
}
