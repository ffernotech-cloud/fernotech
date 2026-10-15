"use client";

import { useActionState } from "react";
import { createProductionOrder } from "@/app/production/actions";
import { kilogramsLabel } from "@/lib/collectors/metrics";
import { CURRENCY_LABEL, formatCurrency } from "@/lib/currency";
import { productionLossRate } from "@/lib/production/calculations";
import type { ProductionActionState } from "@/lib/production/validation";

type MaterialStockRow = {
  plasticType: string;
  quantityKg: number;
};

type ProductionOrderRow = {
  id: string;
  productionDate: string;
  plasticType: string;
  materialUsedKg: string;
  bandsPreparedKg: string;
  broomsProduced: number;
  lossKg: string;
  lossReason: string | null;
  materialCostPerKg: string;
  laborCost: string;
  energyCost: string;
  accessoriesCost: string;
  materialCost: string;
  totalCost: string;
  supervisorName: string;
};

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#d9e4da] bg-white px-4 text-sm text-[#193b29] outline-none focus:border-[#286542] focus:ring-2 focus:ring-[#286542]/15";
const labelClass = "mb-2 block text-sm font-semibold text-[#314a39]";

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
}: {
  defaultDate: string;
  materialStock: MaterialStockRow[];
}) {
  const [state, formAction, pending] = useActionState(createProductionOrder, {});
  const availableStock = materialStock.filter((row) => row.quantityKg > 0);

  if (availableStock.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-[#f6f9f6] px-4 py-5 text-sm leading-6 text-[#65736a]">
        Aucun stock matière disponible. Triez puis intégrez un apport avant
        d’enregistrer une fabrication.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-5 grid gap-4 sm:grid-cols-2">
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
          Plastique utilisé (kg)
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
        <label className={labelClass} htmlFor="production-bands">
          Bandes préparées (kg)
        </label>
        <input
          className={fieldClass}
          id="production-bands"
          inputMode="decimal"
          maxLength={12}
          name="bandsPreparedKg"
          placeholder="Ex. 12,5"
          required
          type="text"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="production-brooms">
          Nombre de balais fabriqués
        </label>
        <input
          className={fieldClass}
          id="production-brooms"
          inputMode="numeric"
          maxLength={7}
          name="broomsProduced"
          placeholder="Ex. 10"
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
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="production-loss-reason">
          Motif des pertes (obligatoire si pertes supérieures à 0)
        </label>
        <textarea
          className={`${fieldClass} min-h-20 py-3`}
          id="production-loss-reason"
          maxLength={1000}
          name="lossReason"
          placeholder="Ex. chutes de découpe"
          rows={2}
        />
        <p className="mt-1 text-xs leading-5 text-[#758178]">
          Bilan obligatoire : kg utilisés = kg de bandes + kg de pertes.
        </p>
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
        <label className={labelClass} htmlFor="production-labor-cost">
          Main-d’œuvre ({CURRENCY_LABEL})
        </label>
        <input
          className={fieldClass}
          defaultValue="0"
          id="production-labor-cost"
          inputMode="decimal"
          maxLength={16}
          name="laborCost"
          required
          type="text"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="production-energy-cost">
          Énergie ({CURRENCY_LABEL})
        </label>
        <input
          className={fieldClass}
          defaultValue="0"
          id="production-energy-cost"
          inputMode="decimal"
          maxLength={16}
          name="energyCost"
          required
          type="text"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="production-accessory-cost">
          Manches et accessoires ({CURRENCY_LABEL})
        </label>
        <input
          className={fieldClass}
          defaultValue="0"
          id="production-accessory-cost"
          inputMode="decimal"
          maxLength={16}
          name="accessoriesCost"
          required
          type="text"
        />
      </div>
      <div className="sm:col-span-2">
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
        const unitCost = Number(order.totalCost) / order.broomsProduced;
        const lossRate = productionLossRate({
          materialUsedKg: order.materialUsedKg,
          lossKg: order.lossKg,
        });

        return (
          <li className="py-5 first:pt-0 last:pb-0" key={order.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#193b29]">
                  {order.broomsProduced} balais · {order.plasticType}
                </h3>
                <p className="mt-1 text-sm text-[#65736a]">
                  {displayDate(order.productionDate)} · Responsable :{" "}
                  {order.supervisorName}
                </p>
              </div>
              <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-semibold text-[#286542]">
                Stock fini +{order.broomsProduced}
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
                <dt className="text-xs text-[#758178]">Coût matière</dt>
                <dd className="mt-1 font-semibold text-[#193b29]">
                  {moneyLabel(Number(order.materialCost))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#758178]">Coût total</dt>
                <dd className="mt-1 font-semibold text-[#193b29]">
                  {moneyLabel(Number(order.totalCost))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#758178]">Coût par balai</dt>
                <dd className="mt-1 font-semibold text-[#193b29]">
                  {moneyLabel(unitCost)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#758178]">Coût matière/kg saisi</dt>
                <dd className="mt-1 font-semibold text-[#193b29]">
                  {moneyLabel(Number(order.materialCostPerKg))}
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
  totalBroomsProduced,
  orders,
}: {
  defaultDate: string;
  finishedStock: number;
  materialStock: MaterialStockRow[];
  totalBroomsProduced: number;
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
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          {
            label: "Stock matière disponible",
            value: `${kilogramsLabel(totalMaterialKg)} kg`,
          },
          { label: "Balais en stock fini", value: String(finishedStock) },
          {
            label: "Balais fabriqués",
            value: String(totalBroomsProduced),
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
          Nouvel ordre de fabrication
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#758178]">
          Le stock matière est débité et les balais sont ajoutés au stock fini
          dans la même transaction. Le coût matière/kg est saisi pour chaque
          fabrication.
        </p>
        <CreateProductionForm
          defaultDate={defaultDate}
          materialStock={materialStock}
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
