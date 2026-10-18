"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/db";
import { auditLogs, productTechnicalSpecs, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import {
  createProductSchema,
  createTechnicalSpecSchema,
  updateProductActiveSchema,
  updateProductSchema,
  type ProductActionState,
} from "@/lib/products/validation";

function refreshProductPages() {
  revalidatePath("/produits");
  revalidatePath("/production");
  revalidatePath("/ventes");
  revalidatePath("/");
}

export async function createProduct(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const actor = await requirePermission("products:manage");
  const parsed = createProductSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    unitLabel: formData.get("unitLabel"),
    alertThreshold: formData.get("alertThreshold"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Vérifiez la fiche produit.",
    };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<ProductActionState> => {
      const [created] = await transaction
        .insert(products)
        .values(parsed.data)
        .onConflictDoNothing({ target: products.code })
        .returning({ id: products.id });
      if (!created) {
        return {
          error: "Ce code produit est déjà utilisé. Choisissez-en un autre.",
        };
      }

      await transaction.insert(productTechnicalSpecs).values({
        productId: created.id,
        version: 1,
        specifications: {},
        createdBy: actor.id,
      });
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "product.created",
        entityType: "product",
        entityId: created.id,
        details: {
          code: parsed.data.code,
          name: parsed.data.name,
          initialTechnicalSpecVersion: 1,
        },
      });
      return { message: "Le produit et sa fiche technique initiale ont été créés." };
    },
  );

  if (result.error) {
    return result;
  }
  refreshProductPages();
  return result;
}

export async function updateProduct(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const actor = await requirePermission("products:manage");
  const parsed = updateProductSchema.safeParse({
    productId: formData.get("productId"),
    name: formData.get("name"),
    description: formData.get("description"),
    unitLabel: formData.get("unitLabel"),
    alertThreshold: formData.get("alertThreshold"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Vérifiez la fiche produit.",
    };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<ProductActionState> => {
      const [previous] = await transaction
        .select({ id: products.id, name: products.name, code: products.code })
        .from(products)
        .where(eq(products.id, parsed.data.productId))
        .limit(1)
        .for("update");
      if (!previous) {
        return { error: "Ce produit n’existe plus." };
      }

      const { productId, ...changes } = parsed.data;
      await transaction
        .update(products)
        .set(changes)
        .where(eq(products.id, productId));
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "product.updated",
        entityType: "product",
        entityId: productId,
        details: {
          code: previous.code,
          previousName: previous.name,
          name: changes.name,
        },
      });
      return { message: "La fiche produit a été mise à jour." };
    },
  );

  if (result.error) {
    return result;
  }
  refreshProductPages();
  return result;
}

export async function updateProductActiveStatus(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const actor = await requirePermission("products:manage");
  const parsed = updateProductActiveSchema.safeParse({
    productId: formData.get("productId"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    return { error: "L’état demandé n’est pas valide." };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<ProductActionState> => {
      const [previous] = await transaction
        .select({
          id: products.id,
          name: products.name,
          isActive: products.isActive,
        })
        .from(products)
        .where(eq(products.id, parsed.data.productId))
        .limit(1)
        .for("update");
      if (!previous) {
        return { error: "Ce produit n’existe plus." };
      }

      await transaction
        .update(products)
        .set({ isActive: parsed.data.isActive })
        .where(eq(products.id, previous.id));
      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: parsed.data.isActive ? "product.activated" : "product.deactivated",
        entityType: "product",
        entityId: previous.id,
        details: {
          name: previous.name,
          previousIsActive: previous.isActive,
          isActive: parsed.data.isActive,
        },
      });
      return {
        message: parsed.data.isActive
          ? "Le produit a été activé."
          : "Le produit a été désactivé; son historique est conservé.",
      };
    },
  );

  if (result.error) {
    return result;
  }
  refreshProductPages();
  return result;
}

export async function createTechnicalSpec(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const actor = await requirePermission("products:manage");
  const parsed = createTechnicalSpecSchema.safeParse({
    productId: formData.get("productId"),
    effectiveFrom: formData.get("effectiveFrom"),
    standardBandsKgPerUnit: formData.get("standardBandsKgPerUnit"),
    description: formData.get("description"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Vérifiez la fiche technique.",
    };
  }

  const database = getDatabase();
  const result = await database.transaction(
    async (transaction): Promise<ProductActionState> => {
      const [product] = await transaction
        .select({ id: products.id, name: products.name })
        .from(products)
        .where(eq(products.id, parsed.data.productId))
        .limit(1)
        .for("update");
      if (!product) {
        return { error: "Ce produit n’existe plus." };
      }

      const [latestSpec] = await transaction
        .select({ version: productTechnicalSpecs.version })
        .from(productTechnicalSpecs)
        .where(eq(productTechnicalSpecs.productId, product.id))
        .orderBy(desc(productTechnicalSpecs.version))
        .limit(1);
      const version = (latestSpec?.version ?? 0) + 1;
      const specificationDescription = parsed.data.description;
      const [created] = await transaction
        .insert(productTechnicalSpecs)
        .values({
          productId: product.id,
          version,
          effectiveFrom: parsed.data.effectiveFrom,
          standardBandsKgPerUnit: parsed.data.standardBandsKgPerUnit,
          specifications: specificationDescription
            ? { description: specificationDescription }
            : {},
          notes: parsed.data.notes,
          createdBy: actor.id,
        })
        .returning({ id: productTechnicalSpecs.id });

      await transaction.insert(auditLogs).values({
        actorId: actor.id,
        action: "product.technical_spec_created",
        entityType: "product_technical_spec",
        entityId: created.id,
        details: {
          productId: product.id,
          productName: product.name,
          version,
          standardBandsKgPerUnit: parsed.data.standardBandsKgPerUnit,
        },
      });
      return {
        message: `La fiche technique version ${version} a été ajoutée.`,
      };
    },
  );

  if (result.error) {
    return result;
  }
  refreshProductPages();
  return result;
}
