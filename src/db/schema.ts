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

export const materialMovementType = pgEnum("material_movement_type", [
  "entree",
  "sortie",
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
  check(
    "deliveries_rejection_reason",
    sql`${table.rejectedKg} IS NULL OR ${table.rejectedKg} = 0 OR ${table.rejectionReason} IS NOT NULL`,
  ),
]);

export const materialStockMovements = pgTable(
  "material_stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    plasticType: varchar("plastic_type", { length: 80 }).notNull(),
    movementType: materialMovementType("movement_type").notNull(),
    quantityKg: numeric("quantity_kg", { precision: 10, scale: 3 }).notNull(),
    deliveryId: uuid("delivery_id").references(() => deliveries.id, {
      onDelete: "restrict",
    }).unique(),
    reason: text("reason"),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("material_movements_quantity_positive", sql`${table.quantityKg} > 0`),
    check(
      "material_movements_delivery_is_inbound",
      sql`${table.deliveryId} IS NULL OR ${table.movementType} = 'entree'`,
    ),
  ],
);

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
