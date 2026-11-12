import PDFDocument from 'pdfkit';
import { formatNationalNumber } from '../../lib/nationalNumber.js';
import type { FicheData } from './fiches.js';
import { AUTHORITY_TYPES } from './settings.js';

// The paper attest (core/.docs/fiscal-attests.md, Phase 4): one A4 page per
// fiche, following the official model "Attest inzake uitgaven voor de opvang
// van kinderen jonger dan 14 jaar". Built from the stored snapshot only.

const MARGIN = 50;
const WIDTH = 595.28 - MARGIN * 2;

function euro(amount: number): string {
  return `€ ${Number(amount).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function date(value: string | null | undefined): string {
  if (!value) return '-';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function companyNumber(value: string | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '').padStart(10, '0');
  return value ? `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}` : '-';
}

function nn(value: string | null | undefined): string {
  return value ? formatNationalNumber(value) : '-';
}

function section(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(10).text(title.toUpperCase(), MARGIN, doc.y, { width: WIDTH });
  const y = doc.y + 2;
  doc.moveTo(MARGIN, y).lineTo(MARGIN + WIDTH, y).lineWidth(0.5).strokeColor('#999999').stroke();
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9.5).fillColor('#000000');
}

function row(doc: PDFKit.PDFDocument, label: string, value: string) {
  const y = doc.y;
  doc.font('Helvetica').fillColor('#555555').text(label, MARGIN, y, { width: 170 });
  const labelBottom = doc.y;
  doc.fillColor('#000000').text(value || '-', MARGIN + 175, y, { width: WIDTH - 175 });
  doc.y = Math.max(labelBottom, doc.y) + 1;
}

function page(doc: PDFKit.PDFDocument, f: FicheData) {
  const address = f.payer.address ?? {};
  doc.font('Helvetica-Bold').fontSize(14).text('Attest inzake uitgaven voor de opvang van kinderen', MARGIN, MARGIN, {
    width: WIDTH
  });
  doc.font('Helvetica').fontSize(10).fillColor('#555555');
  doc.text(
    `Fiscaal attest 281.86 – inkomstenjaar ${f.incomeYear} – aanslagjaar ${f.incomeYear + 1} – volgnummer ${f.sequenceNumber}`,
    { width: WIDTH }
  );
  if (f.changeType === 'modification') {
    doc.fillColor('#b00020').text('Dit attest vervangt het eerder uitgereikte attest met hetzelfde volgnummer.');
  }
  doc.fillColor('#000000');

  section(doc, '1. Opvanginstantie / organisator');
  row(doc, 'Naam', f.organiser.legalName);
  row(doc, 'Adres', `${f.organiser.address}, ${f.organiser.postcode} ${f.organiser.city}`);
  row(doc, 'Ondernemingsnummer', companyNumber(f.organiser.companyNumber));

  section(doc, '2. Erkenning / toezicht');
  row(doc, 'Soort', AUTHORITY_TYPES[f.authority.type] ?? f.authority.type);
  row(doc, 'Instantie', f.authority.name);
  if (f.authority.address) {
    row(doc, 'Adres', `${f.authority.address}, ${f.authority.postcode} ${f.authority.city}`);
  }
  if (f.authority.companyNumber) row(doc, 'Ondernemingsnummer', companyNumber(f.authority.companyNumber));
  if (f.authority.reference) row(doc, 'Referentie', f.authority.reference);

  section(doc, '3. Schuldenaar (persoon die de opvang betaalde)');
  row(doc, 'Naam', f.payer.fullName);
  row(doc, 'Adres', [address.street, [address.postcode, address.city].filter(Boolean).join(' ')].filter(Boolean).join(', '));
  row(doc, 'Rijksregisternummer', nn(f.payer.nationalNumber));

  section(doc, '4. Kind');
  row(doc, 'Naam', `${f.child.firstName} ${f.child.lastName}`);
  row(doc, 'Geboortedatum', date(f.child.birthDate));
  row(doc, 'Rijksregisternummer', nn(f.child.nationalNumber));

  section(doc, '5. Opvangperiodes en betaalde bedragen');
  const cols = [0, 215, 290, 360, 430];
  const headers = ['Periode', 'Van', 'Tot', 'Dagen / dagtarief', 'Bedrag'];
  let y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((h, i) => doc.text(h, MARGIN + cols[i], y, { width: i === 4 ? WIDTH - cols[4] : cols[i + 1] - cols[i] - 5, align: i === 4 ? 'right' : 'left' }));
  doc.font('Helvetica').fontSize(9);
  for (const p of f.periods) {
    y = doc.y + 4;
    doc.text(`${p.productName} – ${p.label}`, MARGIN + cols[0], y, { width: cols[1] - 5 });
    const bottom = doc.y;
    doc.text(date(p.startDate), MARGIN + cols[1], y);
    doc.text(date(p.endDate), MARGIN + cols[2], y);
    doc.text(`${p.days} x ${euro(p.dailyRate)}`, MARGIN + cols[3], y);
    doc.text(euro(p.amount), MARGIN + cols[4], y, { width: WIDTH - cols[4], align: 'right' });
    doc.y = Math.max(bottom, doc.y);
  }
  y = doc.y + 6;
  doc.moveTo(MARGIN, y - 2).lineTo(MARGIN + WIDTH, y - 2).lineWidth(0.5).stroke();
  doc.font('Helvetica-Bold').text(`Totaal (${f.totalDays} dagen)`, MARGIN, y, { width: 300 });
  doc.text(euro(f.totalAmount), MARGIN + cols[4], y, { width: WIDTH - cols[4], align: 'right' });

  section(doc, '6. Verklaring');
  doc.text(
    'Ondergetekende verklaart dat de hierboven vermelde bedragen werden betaald voor de opvang van het ' +
      'vermelde kind, dat de opvang gebeurde door een instantie die erkend is, gesubsidieerd wordt of ' +
      'onder toezicht staat van de hierboven vermelde instantie, en dat de bedragen geen kosten bevatten ' +
      'voor school, maaltijden of uitstappen die niet tot de opvang behoren.',
    MARGIN,
    doc.y,
    { width: WIDTH, align: 'justify' }
  );
  doc.moveDown(1.2);
  row(doc, 'Datum', date(f.generatedAt));
  row(doc, 'Naam ondertekenaar', f.signatory.name);
  if (f.signatory.function) row(doc, 'Functie', f.signatory.function);
  doc.moveDown(2);
  doc.fontSize(7.5).fillColor('#777777').text(
    'Dit attest wordt ook elektronisch aan de FOD Financiën bezorgd (Belcotax-on-web). Bewaar het bij uw ' +
      'belastingdocumenten.',
    MARGIN,
    doc.y,
    { width: WIDTH }
  );
  doc.fillColor('#000000');
}

/** One or more fiches in one PDF (one page each). */
export function renderFichesPdf(fiches: FicheData[]): Promise<Buffer> {
  if (fiches.length === 0) {
    return Promise.reject(new Error('No attests to print'));
  }
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: false, info: { Title: 'Fiscaal attest 281.86' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    for (const f of fiches) {
      doc.addPage();
      page(doc, f);
    }
    doc.end();
  });
}
