"use client";

import { useActionState } from "react";
import { integrateDelivery, sortDelivery } from "@/app/tri/actions";
import { kilogramsLabel } from "@/lib/collectors/metrics";
import type { SortingActionState } from "@/lib/sorting/validation";

type DeliveryRow = {
  id: string;
  collectorName: string;
  deliveryDate: string;
  collectionPoint: string;
  plasticType: string;
  receivedKg: string;
  acceptedKg: string | null;
  rejectedKg: string | null;
  rejectionReason: string | null;
  status: "recue" | "triee" | "integree_au_stock";
};

type MaterialStockRow = {
  plasticType: string;
  quantityKg: number;
};

type MovementRow = {
  id: string;
  plasticType: string;
  movementType: "entree" | "sortie";
  quantityKg: string;
  reason: string | null;
  createdAt: Date;
  deliveryDate: string | null;
  collectorName: string | null;
};

const inputClass =
  "min-h-12 w-full rounded-xl border border-[#d9e4da] bg-white px-4 text-sm text-[#193b29] outline-none focus:border-[#286542] focus:ring-2 focus:ring-[#286542]/15";
const labelClass = "mb-2 block text-sm font-semibold text-[#314a39]";

function Feedback({ state }: { state: SortingActionState }) {
  if (state.error) {
    return (
      <p aria-live="polite" className="mt-2 text-sm text-[#9a342a]" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p
        aria-live="polite"
        className="mt-2 text-sm text-[#286542]"
        role="status"
      >
        {state.message}
      </p>
    );
  }
  return null;
}

function SortForm({ delivery }: { delivery: DeliveryRow }) {
  const [state, formAction, pending] = useActionState(sortDelivery, {});

  return (
    <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
      <input name="deliveryId" type="hidden" value={delivery.id} />
      <div>
        <label className={labelClass} htmlFor={`accepted-${delivery.id}`}>
          Poids accepté (kg)
        </label>
        <input
          className={inputClass}
          id={`accepted-${delivery.id}`}
          inputMode="decimal"
          maxLength={12}
          name="acceptedKg"
          placeholder="Ex. 12,5"
          required
          type="text"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`rejected-${delivery.id}`}>
          Poids rejeté (kg)
        </label>
        <input
          className={inputClass}
          id={`rejected-${delivery.id}`}
          inputMode="decimal"
          maxLength={12}
          name="rejectedKg"
          placeholder="Ex. 2,5"
          required
          type="text"
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor={`reason-${delivery.id}`}>
          Motif du rejet (obligatoire si un poids est rejeté)
        </label>
        <textarea
          className={`${inputClass} min-h-20 py-3`}
          id={`reason-${delivery.id}`}
          maxLength={1000}
          name="rejectionReason"
          placeholder="Ex. plastique souillé ou non recyclable"
          rows={2}
        />
      </div>
      <div className="sm:col-span-2">
        <p className="text-xs leading-5 text-[#758178]">
          Bilan obligatoire : accepté + rejeté = {delivery.receivedKg} kg reçus.
        </p>
        <Feedback state={state} />
        <button
          className="mt-3 min-h-12 w-full rounded-xl bg-[#205d39] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60 sm:w-auto"
          disabled={pending}
          type="submit"
        >
          {pending ? "Enregistrement…" : "Valider le tri"}
        </button>
      </div>
    </form>
  );
}

function IntegrateButton({ delivery }: { delivery: DeliveryRow }) {
  const [state, formAction, pending] = useActionState(integrateDelivery, {});
  const acceptedKg = Number(delivery.acceptedKg);

  return (
    <form action={formAction} className="mt-4 border-t border-[#e8eee8] pt-4">
      <input name="deliveryId" type="hidden" value={delivery.id} />
      <p className="text-sm leading-6 text-[#65736a]">
        {acceptedKg > 0
          ? `${kilogramsLabel(acceptedKg)} kg de ${delivery.plasticType} seront ajoutés au stock.`
          : "Aucun poids accepté : cette clôture ne créera pas de mouvement de stock."}
      </p>
      <Feedback state={state} />
      <button
        className="mt-3 min-h-12 w-full rounded-xl bg-[#205d39] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60 sm:w-auto"
        disabled={pending}
        type="submit"
      >
        {pending ? "Intégration…" : "Intégrer au stock"}
      </button>
    </form>
  );
}

function displayDate(value: string): string {
  return value.split("-").reverse().join("/");
}

function displayTimestamp(value: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).format(value);
}

function DeliveryCard({ delivery }: { delivery: DeliveryRow }) {
  const status =
    delivery.status === "recue"
      ? "À trier"
      : delivery.status === "triee"
        ? "Triée · à intégrer"
        : "Intégrée au stock";

  return (
    <li className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#193b29]">
            {delivery.collectorName}
          </h3>
          <p className="mt-1 text-sm text-[#65736a]">
            {displayDate(delivery.deliveryDate)} · {delivery.collectionPoint}
          </p>
          <p className="mt-1 text-sm font-medium text-[#286542]">
            {delivery.plasticType}
          </p>
        </div>
        <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-semibold text-[#286542]">
          {status}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#f6f9f6] p-3 text-center">
        <div>
          <dt className="text-xs text-[#758178]">Reçu</dt>
          <dd className="mt-1 text-sm font-semibold text-[#193b29]">
            {kilogramsLabel(Number(delivery.receivedKg))} kg
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#758178]">Accepté</dt>
          <dd className="mt-1 text-sm font-semibold text-[#193b29]">
            {delivery.acceptedKg === null
              ? "—"
              : `${kilogramsLabel(Number(delivery.acceptedKg))} kg`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#758178]">Rejeté</dt>
          <dd className="mt-1 text-sm font-semibold text-[#193b29]">
            {delivery.rejectedKg === null
              ? "—"
              : `${kilogramsLabel(Number(delivery.rejectedKg))} kg`}
          </dd>
        </div>
      </dl>
      {delivery.status === "recue" ? (
        <SortForm delivery={delivery} />
      ) : null}
      {delivery.status === "triee" ? (
        <>
          {delivery.rejectionReason ? (
            <p className="mt-3 text-sm text-[#65736a]">
              Motif du rejet : {delivery.rejectionReason}
            </p>
          ) : null}
          <IntegrateButton delivery={delivery} />
        </>
      ) : null}
    </li>
  );
}

function StockSummary({ rows }: { rows: MaterialStockRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-[#f6f9f6] px-4 py-5 text-sm leading-6 text-[#65736a]">
        Aucun plastique accepté n’a encore été intégré au stock.
      </p>
    );
  }

  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <li
          className="rounded-xl bg-[#f6f9f6] p-4"
          key={row.plasticType}
        >
          <p className="text-sm font-medium text-[#65736a]">{row.plasticType}</p>
          <p className="mt-2 text-xl font-semibold text-[#193b29]">
            {kilogramsLabel(row.quantityKg)} kg
          </p>
        </li>
      ))}
    </ul>
  );
}

function MovementHistory({ movements }: { movements: MovementRow[] }) {
  if (movements.length === 0) {
    return (
      <p className="mt-4 text-sm text-[#758178]">
        Aucun mouvement de stock matière enregistré.
      </p>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-[#e8eee8]">
      {movements.map((movement) => (
        <li
          className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
          key={movement.id}
        >
          <div>
            <p className="font-semibold text-[#193b29]">
              {movement.plasticType} ·{" "}
              {movement.movementType === "entree" ? "Entrée" : "Sortie"}
            </p>
            <p className="mt-1 text-sm text-[#65736a]">
              {movement.reason ?? "Mouvement de stock"}
              {movement.collectorName ? ` · ${movement.collectorName}` : ""}
              {movement.deliveryDate
                ? ` · apport du ${displayDate(movement.deliveryDate)}`
                : ""}
            </p>
            <p className="mt-1 text-xs text-[#758178]">
              Enregistré le {displayTimestamp(movement.createdAt)}
            </p>
          </div>
          <p className="text-sm font-semibold text-[#193b29]">
            {movement.movementType === "entree" ? "+" : "−"}
            {kilogramsLabel(Number(movement.quantityKg))} kg
          </p>
        </li>
      ))}
    </ul>
  );
}

export function MaterialSorting({
  deliveries,
  materialStock,
  movements,
}: {
  deliveries: DeliveryRow[];
  materialStock: MaterialStockRow[];
  movements: MovementRow[];
}) {
  const awaitingSorting = deliveries.filter(
    (delivery) => delivery.status === "recue",
  );
  const awaitingIntegration = deliveries.filter(
    (delivery) => delivery.status === "triee",
  );
  const completed = deliveries.filter(
    (delivery) => delivery.status === "integree_au_stock",
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Stock matière disponible
        </h2>
        <p className="mt-1 text-sm text-[#758178]">
          Solde calculé exclusivement depuis le registre des mouvements.
        </p>
        <StockSummary rows={materialStock} />
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">À trier</h2>
        <p className="mt-1 text-sm text-[#758178]">
          Saisissez les kilos acceptés et rejetés et expliquez tout rejet.
        </p>
        {awaitingSorting.length === 0 ? (
          <p className="mt-4 text-sm text-[#758178]">
            Aucun apport ne nécessite de tri.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {awaitingSorting.map((delivery) => (
              <DeliveryCard delivery={delivery} key={delivery.id} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Triés · à intégrer au stock
        </h2>
        <p className="mt-1 text-sm text-[#758178]">
          L’intégration crée le mouvement d’entrée et clôture l’apport dans la
          même transaction.
        </p>
        {awaitingIntegration.length === 0 ? (
          <p className="mt-4 text-sm text-[#758178]">
            Aucun apport trié en attente d’intégration.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {awaitingIntegration.map((delivery) => (
              <DeliveryCard delivery={delivery} key={delivery.id} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Mouvements de stock matière
        </h2>
        <p className="mt-1 text-sm text-[#758178]">
          Historique traçable des entrées et sorties récentes.
        </p>
        <MovementHistory movements={movements} />
      </section>

      <details className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <summary className="cursor-pointer text-lg font-semibold text-[#193b29]">
          Apports déjà intégrés ({completed.length})
        </summary>
        {completed.length === 0 ? (
          <p className="mt-4 text-sm text-[#758178]">
            Aucun apport intégré pour le moment.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {completed.map((delivery) => (
              <DeliveryCard delivery={delivery} key={delivery.id} />
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
