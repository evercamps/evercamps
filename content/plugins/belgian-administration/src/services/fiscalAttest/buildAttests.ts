import { ageOn, resolveCarePeriod, type CarePeriod, type PeriodOption } from '../../lib/carePeriod.js';
import { isValidNationalNumber } from '../../lib/nationalNumber.js';

// Pure: turns the collected registrations of one income year into draft
// fiscal attests (one per child per payer) plus a list of issues
// (core/.docs/fiscal-attests.md, Phase 3). Writes nothing; no I/O, so it's
// unit-tested in buildAttests.test.ts.

export interface Address {
  street?: string;
  postcode?: string;
  city?: string;
  country?: string;
}

export interface PayerShare {
  customerId: number | null;
  fullName: string;
  nationalNumber: string | null;
  address: Address;
  sharePercent: number;
}

export interface CandidateRegistration {
  registrationId: number;
  participantId: number;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  nationalNumber: string | null;
  nationalNumberNotApplicable: boolean;
  productId: number;
  productName: string;
  variantTitle: string | null;
  suggestedPrice: number | null;
  periodOptions: PeriodOption[];
  order: { orderId: number; orderNumber: string; paymentStatus: string; amount: number | null } | null;
  overrideAmount: number | null;
  // active fiscal_attest_payer rows; empty = 100% defaultPayer
  payers: PayerShare[];
  defaultPayer: PayerShare | null;
}

export type IssueSeverity = 'blocking' | 'warning';

export interface Issue {
  registrationId: number | null;
  participantId: number | null;
  participantName: string;
  severity: IssueSeverity;
  code:
    | 'no_dates'
    | 'ambiguous_dates'
    | 'no_end_date'
    | 'invalid_dates'
    | 'no_birth_date'
    | 'too_old'
    | 'no_amount'
    | 'amount_not_positive'
    | 'shares_not_100'
    | 'no_payer'
    | 'unpaid'
    | 'no_child_national_number'
    | 'invalid_child_national_number'
    | 'no_payer_national_number'
    | 'invalid_payer_national_number'
    | 'days_derived'
    | 'amount_override'
    | 'not_eligible'
    | 'above_ceiling';
  message: string;
}

export interface AttestPeriodLine {
  registrationId: number;
  label: string;
  productName: string;
  startDate: string;
  endDate: string;
  days: number;
  amount: number; // the payer's share, in euro
  dailyRate: number;
}

export interface AttestDraft {
  key: string; // participantId + payer, stable within a year
  incomeYear: number;
  child: {
    participantId: number;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    nationalNumber: string | null;
  };
  payer: PayerShare;
  periods: AttestPeriodLine[];
  totalAmount: number;
  totalDays: number;
}

export interface RegistrationPreview {
  registrationId: number;
  participantId: number;
  participantName: string;
  productName: string;
  label: string;
  period: CarePeriod | null;
  amount: number | null;
  amountSource: 'override' | 'order' | 'none';
  suggestedPrice: number | null;
  orderNumber: string | null;
  payers: PayerShare[];
  splitIsDefault: boolean;
  issues: Issue[];
}

export interface BuildResult {
  attests: AttestDraft[];
  registrations: RegistrationPreview[];
  issues: Issue[];
}

export interface BuildOptions {
  // maximum deductible amount per day for the year, or null when not set
  maxDailyRate: number | null;
  // a child must be younger than this on the first care day
  maxAge?: number;
}

const PAID = new Set(['paid', 'partial_refunded']);

/** Round to cents. */
export function cents(value: number): number {
  return Math.round(value * 100) / 100;
}

function payerKey(payer: PayerShare): string {
  return payer.customerId
    ? `c${payer.customerId}`
    : `n${(payer.nationalNumber ?? '').replace(/\D/g, '') || payer.fullName.trim().toLowerCase()}`;
}

/**
 * Split an amount over payers by share. Each share is rounded to the cent and
 * any rounding difference goes to the first payer (the order customer), so
 * the parts always add up to the amount.
 */
export function splitAmount(amount: number, payers: PayerShare[]): number[] {
  const parts = payers.map((p) => cents((amount * p.sharePercent) / 100));
  const diff = cents(amount - parts.reduce((sum, p) => sum + p, 0));
  if (parts.length > 0) {
    parts[0] = cents(parts[0] + diff);
  }
  return parts;
}

export function buildAttests(
  year: number,
  candidates: CandidateRegistration[],
  options: BuildOptions
): BuildResult {
  const maxAge = options.maxAge ?? 14;
  const issues: Issue[] = [];
  const registrations: RegistrationPreview[] = [];
  const attests = new Map<string, AttestDraft>();

  const sorted = [...candidates].sort(
    (a, b) =>
      a.lastName.localeCompare(b.lastName, 'nl') ||
      a.firstName.localeCompare(b.firstName, 'nl') ||
      a.registrationId - b.registrationId
  );

  for (const c of sorted) {
    const name = `${c.firstName} ${c.lastName}`;
    const own: Issue[] = [];
    const issue = (severity: IssueSeverity, code: Issue['code'], message: string) =>
      own.push({ registrationId: c.registrationId, participantId: c.participantId, participantName: name, severity, code, message });

    // Not paid (and no manual amount): not part of the attests at all.
    if (c.order && !PAID.has(String(c.order.paymentStatus)) && c.overrideAmount === null) {
      issue('warning', 'unpaid', `Order ${c.order.orderNumber} is not paid (${c.order.paymentStatus}); left out`);
      registrations.push(preview(c, name, null, null, 'none', own));
      issues.push(...own);
      continue;
    }

    // Care period
    const resolved = resolveCarePeriod(c.periodOptions);
    let period: CarePeriod | null = null;
    if (!resolved.ok) {
      const messages = {
        no_dates: 'The camp week has no start/end date',
        ambiguous: 'More than one dated option on this registration',
        no_end_date: 'The camp week has a start date but no end date',
        invalid_dates: 'The camp week dates are invalid'
      } as const;
      const codes = {
        no_dates: 'no_dates',
        ambiguous: 'ambiguous_dates',
        no_end_date: 'no_end_date',
        invalid_dates: 'invalid_dates'
      } as const;
      issue('blocking', codes[resolved.reason], messages[resolved.reason]);
    } else {
      period = resolved.period;
      if (period.daysDerived) {
        issue('warning', 'days_derived', `Days not set; using ${period.days} weekdays`);
      }
      if (period.days < 1) {
        issue('blocking', 'invalid_dates', 'The camp week has no care days');
      }
    }

    // Age on the first care day
    if (!c.birthDate) {
      issue('blocking', 'no_birth_date', 'No date of birth');
    } else if (period) {
      const age = ageOn(c.birthDate, period.startDate);
      if (age !== null && age >= maxAge) {
        issue('blocking', 'too_old', `${age} years old on the first care day (must be under ${maxAge})`);
      }
    }

    // Child national number (warning: the attest can be made without it)
    if (!c.nationalNumberNotApplicable) {
      if (!c.nationalNumber) {
        issue('warning', 'no_child_national_number', 'No national number for the child');
      } else if (!isValidNationalNumber(c.nationalNumber)) {
        issue('warning', 'invalid_child_national_number', 'Invalid national number for the child');
      }
    }

    // Amount: manual > order line > none
    let amount: number | null = null;
    let amountSource: RegistrationPreview['amountSource'] = 'none';
    if (c.overrideAmount !== null) {
      amount = cents(c.overrideAmount);
      amountSource = 'override';
      issue('warning', 'amount_override', 'Amount entered by hand');
    } else if (c.order && c.order.amount !== null) {
      amount = cents(c.order.amount);
      amountSource = 'order';
    }
    if (amount === null) {
      issue('blocking', 'no_amount', 'No amount (no paid order line); enter it by hand');
    } else if (amount <= 0) {
      issue('blocking', 'amount_not_positive', 'Amount is 0');
    }

    // Payers
    const payers = c.payers.length > 0 ? c.payers : c.defaultPayer ? [c.defaultPayer] : [];
    if (payers.length === 0) {
      issue('blocking', 'no_payer', 'No payer (no order and no customer)');
    } else {
      const total = cents(payers.reduce((sum, p) => sum + p.sharePercent, 0));
      if (total !== 100) {
        issue('blocking', 'shares_not_100', `Payer shares add up to ${total}%, not 100%`);
      }
      for (const p of payers) {
        if (!p.nationalNumber) {
          issue('warning', 'no_payer_national_number', `No national number for payer ${p.fullName || '?'}`);
        } else if (!isValidNationalNumber(p.nationalNumber)) {
          issue('warning', 'invalid_payer_national_number', `Invalid national number for payer ${p.fullName}`);
        }
      }
    }

    if (period && amount !== null && amount > 0 && period.days > 0 && options.maxDailyRate) {
      const rate = amount / period.days;
      if (rate > options.maxDailyRate) {
        issue(
          'warning',
          'above_ceiling',
          `€${cents(rate).toFixed(2)} per day is above the €${options.maxDailyRate.toFixed(2)} maximum (information only)`
        );
      }
    }

    registrations.push(preview(c, name, period, amount, amountSource, own, payers));
    issues.push(...own);

    // Only registrations without blocking issues go on an attest.
    if (own.some((i) => i.severity === 'blocking') || !period || amount === null || amount <= 0) {
      continue;
    }

    const parts = splitAmount(amount, payers);
    payers.forEach((payer, index) => {
      const key = `${c.participantId}:${payerKey(payer)}`;
      const attest =
        attests.get(key) ??
        ({
          key,
          incomeYear: year,
          child: {
            participantId: c.participantId,
            firstName: c.firstName,
            lastName: c.lastName,
            birthDate: c.birthDate,
            nationalNumber: c.nationalNumberNotApplicable ? null : c.nationalNumber
          },
          payer: { ...payer, sharePercent: 100 },
          periods: [],
          totalAmount: 0,
          totalDays: 0
        } as AttestDraft);
      const share = parts[index];
      attest.periods.push({
        registrationId: c.registrationId,
        label: period!.label,
        productName: c.productName,
        startDate: period!.startDate,
        endDate: period!.endDate,
        days: period!.days,
        amount: share,
        dailyRate: cents(share / period!.days)
      });
      attest.totalAmount = cents(attest.totalAmount + share);
      attest.totalDays += period!.days;
      attests.set(key, attest);
    });
  }

  return { attests: [...attests.values()], registrations, issues };
}

function preview(
  c: CandidateRegistration,
  name: string,
  period: CarePeriod | null,
  amount: number | null,
  amountSource: RegistrationPreview['amountSource'],
  issues: Issue[],
  payers: PayerShare[] = []
): RegistrationPreview {
  return {
    registrationId: c.registrationId,
    participantId: c.participantId,
    participantName: name,
    productName: c.productName,
    label: period?.label ?? c.variantTitle ?? c.productName,
    period,
    amount,
    amountSource,
    suggestedPrice: c.suggestedPrice,
    orderNumber: c.order?.orderNumber ?? null,
    payers,
    splitIsDefault: c.payers.length === 0,
    issues
  };
}
