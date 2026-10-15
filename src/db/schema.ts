import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
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

export const finishedProductMovementType = pgEnum(
  "finished_product_movement_type",
  ["entree", "sortie"],
);

export const salesOrderStatus = pgEnum("sales_order_status", [
  "en_attente",
  "preparee",
  "livree",
  "annulee",
]);

export const paymentMethod = pgEnum("payment_method", [
  "especes",
  "mobile_money",
  "virement",
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

export const productionOrders = pgTable(
  "production_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productionDate: date("production_date").notNull(),
    supervisorId: uuid("supervisor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    plasticType: varchar("plastic_type", { length: 80 }).notNull(),
    materialUsedKg: numeric("material_used_kg", {
      precision: 10,
      scale: 3,
    }).notNull(),
    bandsPreparedKg: numeric("bands_prepared_kg", {
      precision: 10,
      scale: 3,
    }).notNull(),
    broomsProduced: integer("brooms_produced").notNull(),
    lossKg: numeric("loss_kg", { precision: 10, scale: 3 }).notNull(),
    lossReason: text("loss_reason"),
    materialCostPerKg: numeric("material_cost_per_kg", {
      precision: 14,
      scale: 2,
    }).notNull(),
    laborCost: numeric("labor_cost", { precision: 14, scale: 2 }).notNull(),
    energyCost: numeric("energy_cost", { precision: 14, scale: 2 }).notNull(),
    accessoriesCost: numeric("accessories_cost", {
      precision: 14,
      scale: 2,
    }).notNull(),
    materialCost: numeric("material_cost", {
      precision: 14,
      scale: 2,
    }).notNull(),
    totalCost: numeric("total_cost", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("production_material_used_positive", sql`${table.materialUsedKg} > 0`),
    check("production_bands_kg_non_negative", sql`${table.bandsPreparedKg} >= 0`),
    check("production_brooms_positive", sql`${table.broomsProduced} > 0`),
    check("production_loss_kg_non_negative", sql`${table.lossKg} >= 0`),
    check(
      "production_material_balance",
      sql`${table.materialUsedKg} = ${table.bandsPreparedKg} + ${table.lossKg}`,
    ),
    check(
      "production_loss_reason",
      sql`${table.lossKg} = 0 OR ${table.lossReason} IS NOT NULL`,
    ),
    check(
      "production_costs_non_negative",
      sql`${table.materialCostPerKg} >= 0 AND ${table.laborCost} >= 0 AND ${table.energyCost} >= 0 AND ${table.accessoriesCost} >= 0 AND ${table.materialCost} >= 0 AND ${table.totalCost} >= 0`,
    ),
  ],
);

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
    productionOrderId: uuid("production_order_id")
      .references(() => productionOrders.id, { onDelete: "restrict" })
      .unique(),
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
    check(
      "material_movements_production_is_outbound",
      sql`${table.productionOrderId} IS NULL OR ${table.movementType} = 'sortie'`,
    ),
    check(
      "material_movements_single_source",
      sql`${table.deliveryId} IS NULL OR ${table.productionOrderId} IS NULL`,
    ),
  ],
);

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  address: varchar("address", { length: 200 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const salesOrders = pgTable(
  "sales_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    orderDate: date("order_date").notNull(),
    status: salesOrderStatus("status").notNull().default("en_attente"),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("sales_order_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "sales_order_prices_non_negative",
      sql`${table.unitPrice} >= 0 AND ${table.totalAmount} >= 0`,
    ),
    check(
      "sales_order_total_matches_quantity",
      sql`${table.totalAmount} = ${table.quantity} * ${table.unitPrice}`,
    ),
  ],
);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => salesOrders.id, { onDelete: "restrict" })
      .unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    saleDate: date("sale_date").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("sales_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "sales_prices_non_negative",
      sql`${table.unitPrice} >= 0 AND ${table.totalAmount} >= 0`,
    ),
  ],
);

export const finishedProductStockMovements = pgTable(
  "finished_product_stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    movementType: finishedProductMovementType("movement_type").notNull(),
    quantity: integer("quantity").notNull(),
    productionOrderId: uuid("production_order_id")
      .references(() => productionOrders.id, { onDelete: "restrict" })
      .unique(),
    saleId: uuid("sale_id")
      .references(() => sales.id, { onDelete: "restrict" })
      .unique(),
    reason: text("reason"),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("finished_product_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "finished_product_production_is_inbound",
      sql`${table.productionOrderId} IS NULL OR ${table.movementType} = 'entree'`,
    ),
    check(
      "finished_product_sale_is_outbound",
      sql`${table.saleId} IS NULL OR ${table.movementType} = 'sortie'`,
    ),
    check(
      "finished_product_movement_single_source",
      sql`${table.productionOrderId} IS NULL OR ${table.saleId} IS NULL`,
    ),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    method: paymentMethod("method").notNull(),
    paidAt: date("paid_at").notNull(),
    reference: varchar("reference", { length: 120 }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("payment_amount_positive", sql`${table.amount} > 0`),
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
