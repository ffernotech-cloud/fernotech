import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { collectorTypes } from "@/lib/auth/roles";

export const appRole = pgEnum("app_role", [
  "administrateur",
  "responsable_atelier",
  "commercial_caissier",
  "lecteur",
]);

export const collectorType = pgEnum("collector_type", collectorTypes);

export const deliveryStatus = pgEnum("delivery_status", [
  "recue",
  "triee",
  "integree_au_stock",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: varchar("identifier", { length: 32 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: appRole("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const collectors = pgTable("collectors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  type: collectorType("type").notNull(),
  phone: varchar("phone", { length: 40 }),
  zone: varchar("zone", { length: 120 }),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const deliveries = pgTable("deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  collectorId: uuid("collector_id")
    .notNull()
    .references(() => collectors.id, { onDelete: "restrict" }),
  deliveryDate: date("delivery_date").notNull(),
  collectionPoint: varchar("collection_point", { length: 160 }).notNull(),
  plasticType: varchar("plastic_type", { length: 80 }).notNull(),
  receivedKg: numeric("received_kg", { precision: 10, scale: 3 }).notNull(),
  acceptedKg: numeric("accepted_kg", { precision: 10, scale: 3 }),
  rejectedKg: numeric("rejected_kg", { precision: 10, scale: 3 }),
  rejectionReason: text("rejection_reason"),
  status: deliveryStatus("status").notNull().default("recue"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  check("deliveries_received_kg_positive", sql`${table.receivedKg} > 0`),
  check(
    "deliveries_sort_balance",
    sql`(${table.status} = 'recue' AND ${table.acceptedKg} IS NULL AND ${table.rejectedKg} IS NULL) OR (${table.status} IN ('triee', 'integree_au_stock') AND ${table.acceptedKg} IS NOT NULL AND ${table.rejectedKg} IS NOT NULL AND ${table.acceptedKg} >= 0 AND ${table.rejectedKg} >= 0 AND ${table.acceptedKg} + ${table.rejectedKg} = ${table.receivedKg})`,
  ),
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
