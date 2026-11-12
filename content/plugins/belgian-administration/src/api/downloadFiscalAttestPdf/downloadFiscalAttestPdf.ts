import type { Request, Response } from 'express';
import { requireYear } from '../../lib/apiHandler.js';
import { getFiche, listFiches } from '../../services/fiscalAttest/batches.js';
import type { FicheData } from '../../services/fiscalAttest/fiches.js';
import { renderFichesPdf } from '../../services/fiscalAttest/pdf.js';

// GET /api/fiscal-attests/pdf?uuid=...     one attest                    (admin)
// GET /api/fiscal-attests/pdf?year=2026    all current attests of a year (admin)
export default async (request: Request, response: Response) => {
  try {
    let fileName: string;
    let fiches: FicheData[];
    if (request.query.uuid) {
      const fiche = await getFiche(String(request.query.uuid));
      if (!fiche || fiche.status === 'cancelled') {
        throw new Error('Attest not found');
      }
      fiches = [fiche.data];
      fileName = `fiscaal-attest-${fiche.data.incomeYear}-${fiche.sequenceNumber}.pdf`;
    } else {
      const year = requireYear(request.query.year);
      fiches = (await listFiches(year)).filter((f) => f.status === 'final').map((f) => f.data);
      fileName = `fiscale-attesten-${year}.pdf`;
    }
    const pdf = await renderFichesPdf(fiches);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    response.status(200).send(pdf);
  } catch (e) {
    response.status(400).json({ error: { status: 400, message: e instanceof Error ? e.message : String(e) } });
  }
};
