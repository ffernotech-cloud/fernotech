"use client";

import { useActionState, useState } from "react";
import { createProductionOrder } from "@/app/production/actions";
import { kilogramsLabel } from "@/lib/collectors/metrics";
import { CURRENCY_LABEL, formatCurrency } from "@/lib/currency";
import { productionLossRate } from "@/lib/production/calculations";
import type { ProductionActionState } from "@/lib/production/validation";

type MaterialStockRow = {
  plasticType: string;
  quantityKg: number;
};

type ProductStockRow = {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
};

type ProductSpecOption = {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  version: number;
};

type ProductionLineRow = {
  productName: string;
  productCode: string;
  specVersion: number;
  quantityProduced: number;
  bandsPreparedKg: string;
  materialCost: string;
  laborCost: string;
  energyCost: string;
  accessoriesCost: string;
  totalCost: string;
};

type ProductionOrderRow = {
  id: string;
  productionDate: string;
  plasticType: string;
  materialUsedKg: string;
  bandsPreparedKg: string;
  lossKg: string;
  lossReason: string | null;
  totalCost: string;
  supervisorName: string;
  lines: ProductionLineRow[];
};

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#d9e4da] bg-white px-4 text-sm text-[#193b29] outline-none focus:border-[#286542] focus:ring-2 focus:ring-[#286542]/15";
const labelClass = "mb-2 block text-sm font-semibold text-[#314a39]";
const costFields = [
  ["materialCost", "Matière"],
  ["laborCost", "Main-d’œuvre"],
  ["energyCost", "Énergie"],
  ["accessoriesCost", "Accessoires"],
] as const;

function moneyLabel(value: number): string {
  return formatCurrency(value);
}

function displayDate(value: string): string {
  return value.split("-").reverse().join("/");
}

function ActionFeedback({ state }: { state: ProductionActionState }) {
  if (state.error) {
    return (
      <p aria-live="polite" className="mt-3 text-sm text-[#9a342a]" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p
        aria-live="polite"
        className="mt-3 text-sm text-[#286542]"
        role="status"
      >
        {state.message}
      </p>
    );
  }
  return null;
}

function CreateProductionForm({
  defaultDate,
  materialStock,
  productSpecs,
}: {
  defaultDate: string;
  materialStock: MaterialStockRow[];
  productSpecs: ProductSpecOption[];
}) {
  const [state, formAction, pending] = useActionState(createProductionOrder, {});
  const [lineCount, setLineCount] = useState(1);
  const availableStock = materialStock.filter((row) => row.quantityKg > 0);

  if (availableStock.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-[#f6f9f6] px-4 py-5 text-sm leading-6 text-[#65736a]">
        Aucun stock matière disponible. Triez puis intégrez un apport avant
        d’enregistrer une fabrication.
      </p>
    );
  }

  if (productSpecs.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-[#fff8e8] px-4 py-5 text-sm leading-6 text-[#73521d]">
        Aucun produit actif avec une fiche technique. Activez un produit et
        ajoutez sa fiche dans le catalogue avant la fabrication.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-5 grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="production-date">
            Date de fabrication
          </label>
          <input
            className={fieldClass}
            defaultValue={defaultDate}
            id="production-date"
            name="productionDate"
            required
            type="date"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="production-plastic">
            Type de plastique consommé
          </label>
          <select
            className={fieldClass}
            defaultValue={availableStock[0].plasticType}
            id="production-plastic"
            name="plasticType"
            required
          >
            {availableStock.map((row) => (
              <option key={row.plasticType} value={row.plasticType}>
                {row.plasticType} · {kilogramsLabel(row.quantityKg)} kg
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="production-used">
            Matière utilisée (kg)
          </label>
          <input
            className={fieldClass}
            id="production-used"
            inputMode="decimal"
            maxLength={12}
            name="materialUsedKg"
            placeholder="Ex. 15"
            required
            type="text"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="production-loss">
            Pertes matière (kg)
          </label>
          <input
            className={fieldClass}
            defaultValue="0"
            id="production-loss"
            inputMode="decimal"
            maxLength={12}
            name="lossKg"
            required
            type="text"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="production-material-cost">
            Coût matière par kg ({CURRENCY_LABEL})
          </label>
          <input
            className={fieldClass}
            defaultValue="0"
            id="production-material-cost"
            inputMode="decimal"
            maxLength={16}
            name="materialCostPerKg"
            required
            type="text"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="production-loss-reason">
            Motif des pertes (obligatoire si pertes supérieures à 0)
          </label>
          <input
            className={fieldClass}
            id="production-loss-reason"
            maxLength={1000}
            name="lossReason"
            placeholder="Ex. chutes de découpe"
            type="text"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#d9e4da] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[#193b29]">Produits fabriqués</h3>
            <p className="mt-1 text-xs leading-5 text-[#758178]">
              Ajoutez une ligne par produit; les coûts sont ventilés
              manuellement sur chaque ligne.
            </p>
          </div>
          <button
            className="min-h-11 rounded-xl border border-[#286542] px-4 text-sm font-semibold text-[#286542] hover:bg-[#f0f6f1]"
            disabled={pending || lineCount >= 20}
            onClick={() => setLineCount((count) => Math.min(count + 1, 20))}
            type="button"
          >
            Ajouter un produit
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          {Array.from({ length: lineCount }, (_, index) => (
            <fieldset
              className="grid gap-4 rounded-xl bg-[#f6f9f6] p-4 sm:grid-cols-2 lg:grid-cols-3"
              key={index}
            >
              <legend className="px-1 text-sm font-semibold text-[#286542]">
                Ligne {index + 1}
              </legend>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={labelClass} htmlFor={`product-spec-${index}`}>
                  Produit · fiche technique
                </label>
                <select
                  className={fieldClass}
                  defaultValue={productSpecs[0].id}
                  id={`product-spec-${index}`}
                  name="technicalSpecId"
                  required
                >
                  {productSpecs.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.productName} ({spec.productCode}) · fiche v
                      {spec.version}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className={labelClass}
                  htmlFor={`quantity-produced-${index}`}
                >
                  Quantité fabriquée
                </label>
                <input
                  className={fieldClass}
                  id={`quantity-produced-${index}`}
                  inputMode="numeric"
                  maxLength={7}
                  name="quantityProduced"
                  placeholder="Ex. 10"
                  required
                  type="text"
                />
              </div>
              <div>
                <label
                  className={labelClass}
                  htmlFor={`bands-prepared-${index}`}
                >
                  Bandes préparées (kg)
                </label>
                <input
                  className={fieldClass}
                  id={`bands-prepared-${index}`}
                  inputMode="decimal"
                  maxLength={12}
                  name="bandsPreparedKg"
                  placeholder="Ex. 12,5"
                  required
                  type="text"
                />
              </div>
              {costFields.map(([field, label]) => (
                <div key={field}>
                  <label className={labelClass} htmlFor={`${field}-${index}`}>
                    {label} ({CURRENCY_LABEL})
                  </label>
                  <input
                    className={fieldClass}
                    defaultValue="0"
                    id={`${field}-${index}`}
                    inputMode="decimal"
                    maxLength={16}
                    name={field}
                    required
                    type="text"
                  />
                </div>
              ))}
              {lineCount > 1 ? (
                <button
                  className="min-h-10 justify-self-start text-sm font-semibold text-[#9a342a] underline underline-offset-2"
                  disabled={pending}
                  onClick={() =>
                    setLineCount((count) => Math.max(count - 1, 1))
                  }
                  type="button"
                >
                  Retirer la dernière ligne
                </button>
              ) : null}
            </fieldset>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#758178]">
          Bilan obligatoire au gramme près : matière utilisée = bandes de toutes
          les lignes + pertes. Le coût matière calculé doit correspondre à la
          somme saisie dans les lignes.
        </p>
      </div>

      <div>
        <ActionFeedback state={state} />
        <button
          className="mt-3 min-h-12 w-full rounded-xl bg-[#205d39] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60 sm:w-auto"
          disabled={pending}
          type="submit"
        >
          {pending ? "Enregistrement…" : "Enregistrer la fabrication"}
        </button>
      </div>
    </form>
  );
}

function ProductionHistory({ orders }: { orders: ProductionOrderRow[] }) {
  if (orders.length === 0) {
    return (
      <p className="mt-4 text-sm text-[#758178]">
        Aucun ordre de fabrication enregistré.
      </p>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-[#e8eee8]">
      {orders.map((order) => {
        const lossRate = productionLossRate({
          materialUsedKg: order.materialUsedKg,
          lossKg: order.lossKg,
        });

        return (
          <li className="py-5 first:pt-0 last:pb-0" key={order.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#193b29]">
                  Fabrication · {displayDate(order.productionDate)}
                </h3>
                <p className="mt-1 text-sm text-[#65736a]">
                  Plastique : {order.plasticType} · Responsable :{" "}
                  {order.supervisorName}
                </p>
              </div>
              <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-semibold text-[#286542]">
                {order.lines.reduce(
                  (total, line) => total + line.quantityProduced,
                  0,
                )}{" "}
                unités ajoutées au stock
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#f6f9f6] p-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-[#758178]">Matière utilisée</dt>
                <dd className="mt-1 font-semibold text-[#193b29]">
                  {kilogramsLabel(Number(order.materialUsedKg))} kg
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#758178]">Bandes préparées</dt>
                <dd className="mt-1 font-semibold text-[#193b29]">
                  {kilogramsLabel(Number(order.bandsPreparedKg))} kg
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#758178]">Pertes · taux</dt>
                <dd className="mt-1 font-semibold text-[#193b29]">
                  {kilogramsLabel(Number(order.lossKg))} kg ·{" "}
                  {new Intl.NumberFormat("fr-FR", {
                    maximumFractionDigits: 2,
                  }).format(lossRate)}
                  %
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#758178]">Coût total</dt>
                <dd className="mt-1 font-semibold text-[#193b29]">
                  {moneyLabel(Number(order.totalCost))}
                </dd>
              </div>
              {order.lossReason ? (
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-xs text-[#758178]">Motif des pertes</dt>
                  <dd className="mt-1 font-semibold text-[#193b29]">
                    {order.lossReason}
                  </dd>
                </div>
              ) : null}
            </dl>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {order.lines.map((line, index) => (
                <li
                  className="rounded-xl border border-[#e3ebe4] p-4"
                  key={`${order.id}-${index}`}
                >
                  <div className="flex justify-between gap-3">
                    <h4 className="font-semibold text-[#193b29]">
                      {line.productName}
                    </h4>
                    <span className="text-sm font-semibold text-[#286542]">
                      × {line.quantityProduced}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#758178]">
                    {line.productCode} · fiche v{line.specVersion} ·{" "}
                    {kilogramsLabel(Number(line.bandsPreparedKg))} kg de bandes
                  </p>
                  <p className="mt-2 text-sm text-[#314a39]">
                    Coût ligne : {moneyLabel(Number(line.totalCost))} · coût
                    unitaire :{" "}
                    {moneyLabel(
                      Number(line.totalCost) / line.quantityProduced,
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

export function ProductionManagement({
  defaultDate,
  finishedStock,
  materialStock,
  totalProductsProduced,
  productSpecs,
  orders,
}: {
  defaultDate: string;
  finishedStock: ProductStockRow[];
  materialStock: MaterialStockRow[];
  totalProductsProduced: number;
  productSpecs: ProductSpecOption[];
  orders: ProductionOrderRow[];
}) {
  const totalMaterialKg = materialStock.reduce(
    (total, row) => total + row.quantityKg,
    0,
  );
  return (
    <>
      <section
        aria-label="Indicateurs de production et stocks"
        className="grid gap-3 sm:grid-cols-2"
      >
        {[
          {
            label: "Stock matière disponible",
            value: `${kilogramsLabel(totalMaterialKg)} kg`,
          },
          {
            label: "Produits fabriqués",
            value: String(totalProductsProduced),
          },
        ].map((indicator) => (
          <article
            className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm"
            key={indicator.label}
          >
            <p className="text-sm font-medium text-[#65736a]">
              {indicator.label}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[#193b29]">
              {indicator.value}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Stock matière par type
        </h2>
        {materialStock.length === 0 ? (
          <p className="mt-4 text-sm text-[#758178]">
            Aucun plastique disponible.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {materialStock.map((row) => (
              <li className="rounded-xl bg-[#f6f9f6] p-4" key={row.plasticType}>
                <p className="text-sm font-medium text-[#65736a]">
                  {row.plasticType}
                </p>
                <p className="mt-2 text-xl font-semibold text-[#193b29]">
                  {kilogramsLabel(row.quantityKg)} kg
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Stock de produits finis
        </h2>
        {finishedStock.length === 0 ? (
          <p className="mt-4 text-sm text-[#758178]">
            Aucun produit au catalogue.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {finishedStock.map((row) => (
              <li
                className="rounded-xl bg-[#f6f9f6] p-4"
                key={row.productId}
              >
                <p className="text-sm font-medium text-[#65736a]">
                  {row.productName} · {row.productCode}
                </p>
                <p className="mt-2 text-xl font-semibold text-[#193b29]">
                  {row.quantity} unités
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Nouvel ordre de fabrication
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#758178]">
          La matière est débitée et chaque produit est ajouté à son stock dans
          une même transaction. Les fiches techniques utilisées sont conservées
          sur chaque ligne.
        </p>
        <CreateProductionForm
          defaultDate={defaultDate}
          materialStock={materialStock}
          productSpecs={productSpecs}
        />
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Historique de production
        </h2>
        <ProductionHistory orders={orders} />
      </section>
    </>
  );
}
