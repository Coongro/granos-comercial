import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/schema/order.ts', './src/schema/invoice.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
});
