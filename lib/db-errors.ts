/**
 * Detect Supabase/Postgres pool exhaustion and similar driver failures.
 * These must not be treated as auth failures (401).
 */
export function isDatabaseUnavailable(error: unknown): boolean {
  const err = error as {
    name?: string;
    message?: string;
    code?: string;
    cause?: { code?: string; message?: string; name?: string };
  };
  const message = `${err?.message ?? ''} ${err?.cause?.message ?? ''}`;
  const code = err?.code ?? err?.cause?.code ?? '';
  return (
    err?.name === 'DriverAdapterError' ||
    err?.cause?.name === 'DriverAdapterError' ||
    code === 'EMAXCONNSESSION' ||
    message.includes('EMAXCONNSESSION') ||
    message.includes('max clients reached') ||
    message.includes('too many clients') ||
    message.includes('connection timeout') ||
    message.includes('Connection terminated')
  );
}
