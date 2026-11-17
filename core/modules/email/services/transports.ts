import { addProcessor, getValueSync } from '../../../lib/util/registry.js';
import type { EmailTransport } from '../types.js';

/**
 * Register an email transport (call from a bootstrap file). Core registers
 * `smtp`; plugins can add more, for example `brevo`.
 */
export function registerEmailTransport(transport: EmailTransport): void {
  addProcessor<EmailTransport[]>('emailTransports', (transports) => [
    ...(transports || []).filter((t) => t.code !== transport.code),
    transport
  ]);
}

export function getEmailTransports(): EmailTransport[] {
  return getValueSync<EmailTransport[]>('emailTransports', []) || [];
}

/**
 * The transport chosen in the settings. Falls back to `smtp` when the chosen
 * one is not registered (for example its plugin was disabled).
 */
export function getTransport(code: string): EmailTransport | undefined {
  const transports = getEmailTransports();
  return transports.find((t) => t.code === code) || transports.find((t) => t.code === 'smtp');
}
