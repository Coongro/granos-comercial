CREATE TABLE "module_granos_comercial_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_date" timestamp NOT NULL,
	"client_id" text NOT NULL,
	"pallets" numeric,
	"package_type" text NOT NULL,
	"package_quantity" numeric,
	"caliber" text NOT NULL,
	"product" text NOT NULL,
	"load_date" timestamp,
	"kg" numeric,
	"delivered" boolean NOT NULL,
	"remito" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_granos_comercial_invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"invoice_number" integer NOT NULL,
	"invoice_date" timestamp NOT NULL,
	"client_id" text NOT NULL,
	"mani_type" text NOT NULL,
	"invoice_type" text NOT NULL,
	"remito" text,
	"kg" numeric NOT NULL,
	"unit_price" numeric NOT NULL,
	"subtotal" numeric,
	"iva_amount" numeric,
	"total" numeric,
	"paid" boolean NOT NULL,
	"payment_method" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
