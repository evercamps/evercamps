import type { Request, Response } from 'express';
import { getBatchXml } from '../../services/fiscalAttest/batches.js';

// GET /api/fiscal-attests/batches/:uuid/xml  (admin) - the exported XML again
export default async (request: Request, response: Response) => {
  try {
    const { xml, fileName } = await getBatchXml(String(request.params.uuid));
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    response.status(200).send(xml);
  } catch (e) {
    response.status(404).json({ error: { status: 404, message: e instanceof Error ? e.message : String(e) } });
  }
};
