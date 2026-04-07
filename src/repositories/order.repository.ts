import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq } from 'drizzle-orm';

import { orderTable } from '../schema/order.js';
import type { OrderRow, NewOrderRow } from '../schema/order.js';

export class OrderRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<OrderRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(orderTable));
  }

  async getById({ id }: { id: string }): Promise<OrderRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(orderTable).where(eq(orderTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewOrderRow }): Promise<OrderRow[]> {
    return this.db.ormQuery((tx) => tx.insert(orderTable).values(data).returning());
  }

  async update({ id, data }: { id: string; data: Partial<NewOrderRow> }): Promise<OrderRow[]> {
    return this.db.ormQuery((tx) =>
      tx.update(orderTable).set(data).where(eq(orderTable.id, id)).returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) => tx.delete(orderTable).where(eq(orderTable.id, id)));
  }
}
