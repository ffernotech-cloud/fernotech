import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const appRole = pgEnum("app_role", [
  "administrateur",
  "responsable_atelier",
  "commercial_caissier",
  "lecteur",
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
