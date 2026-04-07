import { sql } from 'drizzle-orm';
import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const invoiceTable = pgTable('module_granos_comercial_invoices', {
  id: uuid('id').primaryKey().notNull(),
  invoiceNumber: integer('invoice_number').notNull(),
  invoiceDate: timestamp('invoice_date', { mode: 'string' }).notNull(),
  clientId: text('client_id').notNull(),
  maniType: text('mani_type').notNull(),
  invoiceType: text('invoice_type').notNull(),
  remito: text('remito'),
  kg: numeric('kg').notNull(),
  unitPrice: numeric('unit_price').notNull(),
  subtotal: numeric('subtotal'),
  ivaAmount: numeric('iva_amount'),
  total: numeric('total'),
  paid: boolean('paid').notNull(),
  paymentMethod: text('payment_method'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type InvoiceRow = typeof invoiceTable.$inferSelect;
export type NewInvoiceRow = typeof invoiceTable.$inferInsert;
