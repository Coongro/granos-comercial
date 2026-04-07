import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq } from 'drizzle-orm';

import { invoiceTable } from '../schema/invoice.js';
import type { InvoiceRow, NewInvoiceRow } from '../schema/invoice.js';

export class InvoiceRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<InvoiceRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(invoiceTable));
  }

  async getById({ id }: { id: string }): Promise<InvoiceRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(invoiceTable).where(eq(invoiceTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewInvoiceRow }): Promise<InvoiceRow[]> {
    return this.db.ormQuery((tx) => tx.insert(invoiceTable).values(data).returning());
  }

  async update({ id, data }: { id: string; data: Partial<NewInvoiceRow> }): Promise<InvoiceRow[]> {
    return this.db.ormQuery((tx) =>
      tx.update(invoiceTable).set(data).where(eq(invoiceTable.id, id)).returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) => tx.delete(invoiceTable).where(eq(invoiceTable.id, id)));
  }
}
