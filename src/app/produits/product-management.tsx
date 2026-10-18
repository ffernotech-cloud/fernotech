"use client";

import { useActionState } from "react";
import {
  createProduct,
  createTechnicalSpec,
  updateProduct,
  updateProductActiveStatus,
} from "@/app/produits/actions";
import type { ProductActionState } from "@/lib/products/validation";

type ProductRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unitLabel: string;
  alertThreshold: number | null;
  isActive: boolean;
};

type TechnicalSpecRow = {
  id: string;
  productId: string;
  version: number;
  effectiveFrom: string | null;
  standardBandsKgPerUnit: string | null;
  specifications: Record<string, unknown>;
  notes: string | null;
};

const fieldClass =
  "min-h-11 w-full rounded-xl border border-[#d9e4da] bg-white px-3 text-sm text-[#193b29] outline-none focus:border-[#286542] focus:ring-2 focus:ring-[#286542]/15";
const labelClass = "mb-1.5 block text-sm font-semibold text-[#314a39]";
const buttonClass =
  "min-h-11 rounded-xl bg-[#205d39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60";

function ActionFeedback({ state }: { state: ProductActionState }) {
  if (state.error) {
    return (
      <p aria-live="polite" className="text-sm text-[#9a342a]" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p aria-live="polite" className="text-sm text-[#286542]" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

function CreateProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, {});
  return (
    <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#193b29]">Ajouter un produit</h2>
      <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="new-product-code">
            Code unique
          </label>
          <input
            className={fieldClass}
            id="new-product-code"
            maxLength={40}
            name="code"
            placeholder="Ex. BROSSE"
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-product-name">
            Nom
          </label>
          <input
            className={fieldClass}
            id="new-product-name"
            maxLength={120}
            name="name"
            placeholder="Nom du produit"
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-product-unit">
            Unité
          </label>
          <input
            className={fieldClass}
            defaultValue="unité"
            id="new-product-unit"
            maxLength={40}
            name="unitLabel"
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-product-threshold">
            Seuil d’alerte (facultatif)
          </label>
          <input
            className={fieldClass}
            id="new-product-threshold"
            inputMode="numeric"
            min="0"
            name="alertThreshold"
            type="number"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="new-product-description">
            Description
          </label>
          <textarea
            className={`${fieldClass} min-h-20 py-3`}
            id="new-product-description"
            maxLength={2000}
            name="description"
            rows={2}
          />
        </div>
        <div className="sm:col-span-2">
          <ActionFeedback state={state} />
          <button className={`${buttonClass} mt-3`} disabled={pending} type="submit">
            {pending ? "Création…" : "Créer le produit"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ProductCard({
  product,
  specs,
}: {
  product: ProductRow;
  specs: TechnicalSpecRow[];
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateProduct,
    {},
  );
  const [activeState, activeAction, activePending] = useActionState(
    updateProductActiveStatus,
    {},
  );
  const [specState, specAction, specPending] = useActionState(
    createTechnicalSpec,
    {},
  );
  const productSpecs = specs
    .filter((spec) => spec.productId === product.id)
    .sort((left, right) => right.version - left.version);
  const latestSpec = productSpecs[0];
  return (
    <article className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#758178]">
            {product.code}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[#193b29]">
            {product.name}
          </h3>
          <p className="mt-1 text-sm text-[#758178]">
            {product.isActive ? "Actif" : "Inactif"} · Unité : {product.unitLabel}
          </p>
        </div>
        <form action={activeAction}>
          <input name="productId" type="hidden" value={product.id} />
          <input
            name="isActive"
            type="hidden"
            value={product.isActive ? "false" : "true"}
          />
          <button
            className="min-h-10 rounded-lg border border-[#d9e4da] px-3 py-2 text-xs font-semibold text-[#205d39] hover:bg-[#edf5ef] disabled:opacity-60"
            disabled={activePending}
            type="submit"
          >
            {activePending
              ? "Mise à jour…"
              : product.isActive
                ? "Désactiver"
                : "Réactiver"}
          </button>
          <ActionFeedback state={activeState} />
        </form>
      </header>

      <details className="mt-5 border-t border-[#edf1ed] pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-[#205d39]">
          Modifier la fiche produit
        </summary>
        <form action={updateAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="productId" type="hidden" value={product.id} />
          <div>
            <label className={labelClass} htmlFor={`name-${product.id}`}>
              Nom
            </label>
            <input
              className={fieldClass}
              defaultValue={product.name}
              id={`name-${product.id}`}
              maxLength={120}
              name="name"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`unit-${product.id}`}>
              Unité
            </label>
            <input
              className={fieldClass}
              defaultValue={product.unitLabel}
              id={`unit-${product.id}`}
              maxLength={40}
              name="unitLabel"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`threshold-${product.id}`}>
              Seuil d’alerte (facultatif)
            </label>
            <input
              className={fieldClass}
              defaultValue={product.alertThreshold ?? ""}
              id={`threshold-${product.id}`}
              inputMode="numeric"
              min="0"
              name="alertThreshold"
              type="number"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor={`description-${product.id}`}>
              Description
            </label>
            <textarea
              className={`${fieldClass} min-h-20 py-3`}
              defaultValue={product.description ?? ""}
              id={`description-${product.id}`}
              maxLength={2000}
              name="description"
              rows={2}
            />
          </div>
          <div className="sm:col-span-2">
            <ActionFeedback state={updateState} />
            <button
              className={`${buttonClass} mt-2`}
              disabled={updatePending}
              type="submit"
            >
              {updatePending ? "Enregistrement…" : "Enregistrer les changements"}
            </button>
          </div>
        </form>
      </details>

      <section className="mt-5 border-t border-[#edf1ed] pt-4">
        <h4 className="text-sm font-semibold text-[#264432]">
          Fiches techniques
        </h4>
        {latestSpec ? (
          <div className="mt-2 rounded-xl bg-[#f6f9f6] p-3 text-sm text-[#52685a]">
            <p className="font-semibold">
              Version {latestSpec.version}
              {latestSpec.effectiveFrom
                ? ` · applicable le ${latestSpec.effectiveFrom.split("-").reverse().join("/")}`
                : ""}
            </p>
            <p className="mt-1">
              Bandes standard par unité :{" "}
              {latestSpec.standardBandsKgPerUnit
                ? `${latestSpec.standardBandsKgPerUnit} kg`
                : "non renseigné"}
            </p>
            {typeof latestSpec.specifications.description === "string" ? (
              <p className="mt-1 whitespace-pre-wrap">
                {latestSpec.specifications.description}
              </p>
            ) : null}
            {latestSpec.notes ? (
              <p className="mt-1 whitespace-pre-wrap">{latestSpec.notes}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#758178]">
            Aucune fiche technique enregistrée.
          </p>
        )}
        {productSpecs.length > 1 ? (
          <div className="mt-2">
            <p className="text-xs text-[#758178]">
              {productSpecs.length} versions conservées; les anciennes fiches
              ne sont pas écrasées.
            </p>
            {productSpecs.slice(1).map((spec) => (
              <details className="mt-2 rounded-lg border border-[#e3ebe4] p-3" key={spec.id}>
                <summary className="cursor-pointer text-sm font-semibold text-[#52685a]">
                  Version {spec.version}
                  {spec.effectiveFrom
                    ? ` · applicable le ${spec.effectiveFrom.split("-").reverse().join("/")}`
                    : ""}
                </summary>
                <p className="mt-2 text-sm text-[#52685a]">
                  Bandes standard par unité:{" "}
                  {spec.standardBandsKgPerUnit
                    ? `${spec.standardBandsKgPerUnit} kg`
                    : "non renseigné"}
                </p>
                {typeof spec.specifications.description === "string" ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#52685a]">
                    {spec.specifications.description}
                  </p>
                ) : null}
                {spec.notes ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#52685a]">
                    {spec.notes}
                  </p>
                ) : null}
              </details>
            ))}
          </div>
        ) : null}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#205d39]">
            Ajouter une nouvelle version
          </summary>
          <form action={specAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input name="productId" type="hidden" value={product.id} />
            <div>
              <label className={labelClass} htmlFor={`effective-${product.id}`}>
                Date d’effet (facultative)
              </label>
              <input
                className={fieldClass}
                id={`effective-${product.id}`}
                name="effectiveFrom"
                type="date"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`bands-${product.id}`}>
                Bandes standard par unité (kg, facultatif)
              </label>
              <input
                className={fieldClass}
                id={`bands-${product.id}`}
                inputMode="decimal"
                name="standardBandsKgPerUnit"
                placeholder="À renseigner si connu"
                type="text"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor={`spec-description-${product.id}`}>
                Description technique
              </label>
              <textarea
                className={`${fieldClass} min-h-20 py-3`}
                id={`spec-description-${product.id}`}
                maxLength={4000}
                name="description"
                rows={3}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor={`spec-notes-${product.id}`}>
                Notes
              </label>
              <textarea
                className={`${fieldClass} min-h-16 py-3`}
                id={`spec-notes-${product.id}`}
                maxLength={2000}
                name="notes"
                rows={2}
              />
            </div>
            <div className="sm:col-span-2">
              <ActionFeedback state={specState} />
              <button
                className={`${buttonClass} mt-2`}
                disabled={specPending}
                type="submit"
              >
                {specPending ? "Enregistrement…" : "Enregistrer cette version"}
              </button>
            </div>
          </form>
        </details>
      </section>
    </article>
  );
}

export function ProductManagement({
  products,
  technicalSpecs,
}: {
  products: ProductRow[];
  technicalSpecs: TechnicalSpecRow[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <CreateProductForm />
      <section aria-labelledby="catalogue-list-title">
        <h2
          className="mb-3 text-lg font-semibold text-[#193b29]"
          id="catalogue-list-title"
        >
          Produits du catalogue ({products.length})
        </h2>
        {products.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                specs={technicalSpecs}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-white p-5 text-sm text-[#758178]">
            Aucun produit dans le catalogue.
          </p>
        )}
      </section>
    </div>
  );
}
