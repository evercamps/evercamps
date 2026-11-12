// National numbers are GDPR special identifiers. The camp module's
// participant queries are also reachable through the storefront GraphQL
// endpoint, so only an admin user (admin endpoint) or the participant's own
// customer gets the value; everyone else gets null.

interface ParticipantRow {
  customerId?: number | null;
  nationalNumber?: string | null;
  nationalNumberNotApplicable?: boolean | null;
}

interface Context {
  user?: unknown;
  customer?: { customer_id?: number; customerId?: number } | null;
}

export function canSeeParticipantFiscalData(participant: ParticipantRow, context: Context): boolean {
  if (context?.user) {
    return true;
  }
  const customerId = context?.customer?.customer_id ?? context?.customer?.customerId;
  return !!customerId && !!participant.customerId && Number(customerId) === Number(participant.customerId);
}

export default {
  Participant: {
    nationalNumber: (participant: ParticipantRow, _: unknown, context: Context) =>
      canSeeParticipantFiscalData(participant, context) ? participant.nationalNumber ?? null : null,
    nationalNumberNotApplicable: (participant: ParticipantRow, _: unknown, context: Context) =>
      canSeeParticipantFiscalData(participant, context)
        ? participant.nationalNumberNotApplicable ?? null
        : null
  }
};
