import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { productTechnicalSpecs, products } from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { ProductManagement } from "@/app/produits/product-management";

export const instant = false;

export default async function ProductsPage() {
  await requirePermission("products:manage");
  const database = getDatabase();
  const [productRows, specRows] = await Promise.all([
    database
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        description: products.description,
        unitLabel: products.unitLabel,
        alertThreshold: products.alertThreshold,
        isActive: products.isActive,
      })
      .from(products)
      .orderBy(asc(products.name)),
    database
      .select({
        id: productTechnicalSpecs.id,
        productId: productTechnicalSpecs.productId,
        version: productTechnicalSpecs.version,
        effectiveFrom: productTechnicalSpecs.effectiveFrom,
        standardBandsKgPerUnit: productTechnicalSpecs.standardBandsKgPerUnit,
        specifications: productTechnicalSpecs.specifications,
        notes: productTechnicalSpecs.notes,
      })
      .from(productTechnicalSpecs)
      .innerJoin(
        products,
        eq(productTechnicalSpecs.productId, products.id),
      )
      .orderBy(desc(productTechnicalSpecs.version)),
  ]);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              className="text-sm font-semibold text-[#286542] hover:underline"
              href="/"
            >
              ← Tableau de bord
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-[#193b29]">
              Catalogue des produits
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#758178]">
              Gérez les produits et conservez leurs fiches techniques
              versionnées. Les données techniques facultatives peuvent être
              complétées ultérieurement.
            </p>
          </div>
        </header>
        <ProductManagement products={productRows} technicalSpecs={specRows} />
      </div>
    </main>
  );
}
