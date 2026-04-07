import { sql } from 'drizzle-orm';
import { boolean, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const orderTable = pgTable('module_granos_comercial_orders', {
  id: uuid('id').primaryKey().notNull(),
  orderDate: timestamp('order_date', { mode: 'string' }).notNull(),
  clientId: text('client_id').notNull(),
  pallets: numeric('pallets'),
  packageType: text('package_type').notNull(),
  packageQuantity: numeric('package_quantity'),
  caliber: text('caliber').notNull(),
  product: text('product').notNull(),
  loadDate: timestamp('load_date', { mode: 'string' }),
  kg: numeric('kg'),
  delivered: boolean('delivered').notNull(),
  remito: text('remito'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type OrderRow = typeof orderTable.$inferSelect;
export type NewOrderRow = typeof orderTable.$inferInsert;
