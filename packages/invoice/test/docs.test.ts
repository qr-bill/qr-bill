// The schema of docs/invoice.md is the reference users read: this test keeps its limits equal to INVOICE_LIMITS, in
// both directions. A field without a limit of its own shows "—".
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { INVOICE_LIMITS as L } from '../src/invoice/limits.js';

const DOCUMENTATION = readFileSync(new URL('../../../docs/invoice.md', import.meta.url), 'utf8');

/** The rows of the schema tables: the field and its limit. */
function schemaRows(): Map<string, string> {
  // From the heading "Schema" to the next heading of the same level.
  const start = DOCUMENTATION.indexOf('\n## Schema\n');
  const schema = DOCUMENTATION.slice(start, DOCUMENTATION.indexOf('\n## ', start + 1));
  const rows = new Map<string, string>();
  for (const line of schema.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    const field = /^`([^`]+)`$/.exec(cells[1] ?? '')?.[1];
    if (field !== undefined) rows.set(field, cells[4] ?? '');
  }
  return rows;
}

/** The limit each field of the schema must show, written from INVOICE_LIMITS. */
const EXPECTED: Readonly<Record<string, string>> = {
  title: `${L.title}`,
  number: `${L.number}`,
  servicePeriod: `${L.servicePeriod}`,
  customerReference: `${L.customerReference}`,
  extraFields: `${L.extraFields} × (${L.extraFieldLabel} + ${L.extraFieldValue})`,
  subject: `${L.subject}`,
  introduction: `${L.introduction}, ${L.introductionLines} lines`,
  closing: `${L.closing}, ${L.closingLines} lines`,
  'issuer.name': `${L.issuer.name}`,
  'issuer.street': `${L.issuer.street}`,
  'issuer.buildingNumber': `${L.issuer.buildingNumber}`,
  'issuer.postalCode': `${L.issuer.postalCode}`,
  'issuer.town': `${L.issuer.town}`,
  'issuer.logo': `${L.logoBytes / 1_000_000} MB`,
  'issuer.extraLines': `${L.issuer.extraLines} × ${L.issuer.extraLine}`,
  'issuer.phones': `${L.issuer.phones} × ${L.issuer.phone}`,
  'issuer.email': `${L.issuer.email}`,
  'issuer.contact': `${L.issuer.contact}`,
  'recipient.salutation': `${L.recipient.salutation}`,
  'recipient.name': `${L.recipient.name}`,
  'recipient.street': `${L.recipient.street}`,
  'recipient.buildingNumber': `${L.recipient.buildingNumber}`,
  'recipient.postalCode': `${L.recipient.postalCode}`,
  'recipient.town': `${L.recipient.town}`,
  'recipient.extraLines': `${L.recipient.extraLines} × ${L.recipient.extraLine}`,
  items: `1 to ${L.items}`,
  'items[].description': `${L.description}, ${L.descriptionLines} lines`,
  'items[].unit': `${L.unit}`,
  notes: `${L.notes} × ${L.note}, ${L.noteLines} lines each`,
};

describe('docs/invoice.md', () => {
  const rows = schemaRows();

  it('lists every field that has a limit, with the limit of the code', () => {
    for (const [field, limit] of Object.entries(EXPECTED)) {
      expect({ field, limit: rows.get(field) }).toEqual({ field, limit });
    }
  });

  it('shows no limit for the other fields', () => {
    for (const [field, limit] of rows) {
      if (!(field in EXPECTED)) expect({ field, limit }).toEqual({ field, limit: '—' });
    }
    expect(rows.size).toBeGreaterThan(Object.keys(EXPECTED).length);
  });
});
