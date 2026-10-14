"use client";

import { useActionState } from "react";
import {
  createCollector,
  recordDelivery,
  updateCollector,
  updateCollectorActiveStatus,
} from "@/app/collecteurs/actions";
import {
  collectorTypeLabels,
  type CollectorType,
} from "@/lib/auth/roles";
import { acceptanceRate, kilogramsLabel } from "@/lib/collectors/metrics";
import { defaultPlasticTypes } from "@/lib/sorting/plastic-types";
import type { CollectorActionState } from "@/lib/collectors/validation";

type CollectorSummary = {
  id: string;
  name: string;
  type: CollectorType;
  phone: string | null;
  zone: string | null;
  notes: string | null;
  isActive: boolean;
  receivedKg: number;
  acceptedKg: number;
  deliveryCount: number;
};

type DeliverySummary = {
  id: string;
  collectorName: string;
  deliveryDate: string;
  collectionPoint: string;
  plasticType: string;
  receivedKg: number;
  acceptedKg: number | null;
  rejectedKg: number | null;
  status: "recue" | "triee" | "integree_au_stock";
};

type ActiveCollector = { id: string; name: string };

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#d9e4da] bg-white px-4 text-sm text-[#193b29] outline-none focus:border-[#286542] focus:ring-2 focus:ring-[#286542]/15";
const labelClass = "mb-2 block text-sm font-semibold text-[#314a39]";

function ActionFeedback({ state }: { state: CollectorActionState }) {
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

function CreateCollectorForm() {
  const [state, formAction, pending] = useActionState(createCollector, {});

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="collector-name">
          Nom du collecteur
        </label>
        <input
          autoComplete="name"
          className={fieldClass}
          id="collector-name"
          maxLength={120}
          name="name"
          placeholder="Nom et prénom ou nom de l’organisation"
          required
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="collector-type">
          Type
        </label>
        <select
          className={fieldClass}
          defaultValue="individuel"
          id="collector-type"
          name="type"
        >
          {Object.entries(collectorTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="collector-phone">
          Téléphone
        </label>
        <input
          autoComplete="tel"
          className={fieldClass}
          id="collector-phone"
          maxLength={40}
          name="phone"
          placeholder="+237…"
          type="tel"
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="collector-zone">
          Zone habituelle
        </label>
        <input
          className={fieldClass}
          id="collector-zone"
          maxLength={120}
          name="zone"
          placeholder="Quartier, ville ou zone d’activité"
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="collector-notes">
          Notes
        </label>
        <textarea
          className={`${fieldClass} min-h-24 py-3`}
          id="collector-notes"
          maxLength={2000}
          name="notes"
          rows={3}
        />
      </div>
      <div className="sm:col-span-2">
        <ActionFeedback state={state} />
        <button
          className="mt-2 min-h-12 w-full rounded-xl bg-[#205d39] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60 sm:w-auto"
          disabled={pending}
          type="submit"
        >
          {pending ? "Ajout…" : "Ajouter le collecteur"}
        </button>
      </div>
    </form>
  );
}

function RecordDeliveryForm({
  collectors,
}: {
  collectors: ActiveCollector[];
}) {
  const [state, formAction, pending] = useActionState(recordDelivery, {});

  if (collectors.length === 0) {
    return (
      <p className="rounded-xl bg-[#f6f9f6] px-4 py-3 text-sm leading-6 text-[#65736a]">
        Ajoutez ou réactivez un collecteur avant d’enregistrer un apport.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelClass} htmlFor="delivery-collector">
          Collecteur
        </label>
        <select
          className={fieldClass}
          defaultValue=""
          id="delivery-collector"
          name="collectorId"
          required
        >
          <option disabled value="">
            Choisir un collecteur
          </option>
          {collectors.map((collector) => (
            <option key={collector.id} value={collector.id}>
              {collector.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="delivery-date">
          Date de l’apport
        </label>
        <input
          className={fieldClass}
          id="delivery-date"
          name="deliveryDate"
          required
          type="date"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="delivery-point">
          Point de collecte
        </label>
        <input
          className={fieldClass}
          id="delivery-point"
          maxLength={160}
          name="collectionPoint"
          placeholder="Lieu de dépôt"
          required
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="delivery-plastic">
          Type de plastique
        </label>
        <input
          className={fieldClass}
          id="delivery-plastic"
          list="plastic-types"
          maxLength={80}
          name="plasticType"
          placeholder="PET, PEHD, sachets…"
          required
        />
        <datalist id="plastic-types">
          {defaultPlasticTypes.map((plasticType) => (
            <option key={plasticType} value={plasticType} />
          ))}
        </datalist>
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="delivery-weight">
          Poids reçu (kg)
        </label>
        <input
          className={fieldClass}
          id="delivery-weight"
          inputMode="decimal"
          maxLength={12}
          name="receivedKg"
          placeholder="Ex. 15 ou 12,500"
          required
          type="text"
        />
        <p className="mt-1 text-xs leading-5 text-[#758178]">
          L’apport sera enregistré comme reçu. Seul le poids accepté après
          l’étape de tri alimentera le stock.
        </p>
      </div>
      <div className="sm:col-span-2">
        <ActionFeedback state={state} />
        <button
          className="mt-2 min-h-12 w-full rounded-xl bg-[#205d39] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60 sm:w-auto"
          disabled={pending}
          type="submit"
        >
          {pending ? "Enregistrement…" : "Enregistrer l’apport reçu"}
        </button>
      </div>
    </form>
  );
}

function CollectorCard({
  collector,
  rank,
}: {
  collector: CollectorSummary;
  rank: number;
}) {
  const [editState, editAction, editPending] = useActionState(updateCollector, {});
  const [activeState, activeAction, activePending] = useActionState(
    updateCollectorActiveStatus,
    {},
  );

  return (
    <li className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              aria-label={`Rang ${rank}`}
              className="flex size-7 items-center justify-center rounded-full bg-[#edf5ef] text-xs font-bold text-[#286542]"
            >
              {rank}
            </span>
            <h3 className="text-base font-semibold text-[#193b29]">
              {collector.name}
            </h3>
          </div>
          <p className="mt-1 text-sm text-[#65736a]">
            {collectorTypeLabels[collector.type]}
            {collector.zone ? ` · ${collector.zone}` : ""}
          </p>
          {collector.phone ? (
            <a
              className="mt-1 inline-block text-sm font-medium text-[#286542] hover:underline"
              href={`tel:${collector.phone}`}
            >
              {collector.phone}
            </a>
          ) : null}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            collector.isActive
              ? "bg-[#edf5ef] text-[#286542]"
              : "bg-[#f2f2f0] text-[#70756f]"
          }`}
        >
          {collector.isActive ? "Actif" : "Inactif"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#f6f9f6] p-3 text-center">
        <div>
          <dt className="text-xs text-[#758178]">Livraisons</dt>
          <dd className="mt-1 font-semibold text-[#193b29]">
            {collector.deliveryCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#758178]">Reçu</dt>
          <dd className="mt-1 text-sm font-semibold text-[#193b29]">
            {kilogramsLabel(collector.receivedKg)} kg
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#758178]">Accepté</dt>
          <dd className="mt-1 text-sm font-semibold text-[#193b29]">
            {kilogramsLabel(collector.acceptedKg)} kg
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-[#758178]">
        Taux d’acceptation :{" "}
        {acceptanceRate(collector).toLocaleString("fr-FR", {
          maximumFractionDigits: 1,
        })}
        %
      </p>
      {collector.notes ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#65736a]">
          {collector.notes}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={activeAction}>
          <input name="collectorId" type="hidden" value={collector.id} />
          <input
            name="isActive"
            type="hidden"
            value={collector.isActive ? "false" : "true"}
          />
          <button
            className="min-h-11 rounded-xl border border-[#d9e4da] px-3 py-2 text-sm font-semibold text-[#526258] hover:bg-[#f6f9f6] disabled:opacity-60"
            disabled={activePending}
            type="submit"
          >
            {collector.isActive ? "Désactiver" : "Réactiver"}
          </button>
          <ActionFeedback state={activeState} />
        </form>
      </div>

      <details className="mt-3 border-t border-[#e8eee8] pt-3">
        <summary className="cursor-pointer py-2 text-sm font-semibold text-[#286542]">
          Modifier la fiche
        </summary>
        <form action={editAction} className="mt-3 grid gap-4 sm:grid-cols-2">
          <input name="collectorId" type="hidden" value={collector.id} />
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor={`name-${collector.id}`}>
              Nom
            </label>
            <input
              className={fieldClass}
              defaultValue={collector.name}
              id={`name-${collector.id}`}
              maxLength={120}
              name="name"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`type-${collector.id}`}>
              Type
            </label>
            <select
              className={fieldClass}
              defaultValue={collector.type}
              id={`type-${collector.id}`}
              name="type"
            >
              {Object.entries(collectorTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`phone-${collector.id}`}>
              Téléphone
            </label>
            <input
              className={fieldClass}
              defaultValue={collector.phone ?? ""}
              id={`phone-${collector.id}`}
              maxLength={40}
              name="phone"
              type="tel"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor={`zone-${collector.id}`}>
              Zone
            </label>
            <input
              className={fieldClass}
              defaultValue={collector.zone ?? ""}
              id={`zone-${collector.id}`}
              maxLength={120}
              name="zone"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor={`notes-${collector.id}`}>
              Notes
            </label>
            <textarea
              className={`${fieldClass} min-h-24 py-3`}
              defaultValue={collector.notes ?? ""}
              id={`notes-${collector.id}`}
              maxLength={2000}
              name="notes"
              rows={3}
            />
          </div>
          <div className="sm:col-span-2">
            <ActionFeedback state={editState} />
            <button
              className="min-h-11 rounded-xl bg-[#205d39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60"
              disabled={editPending}
              type="submit"
            >
              {editPending ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </details>
    </li>
  );
}

function displayDate(value: string): string {
  return value.split("-").reverse().join("/");
}

function DeliveryHistory({ deliveries }: { deliveries: DeliverySummary[] }) {
  if (deliveries.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-[#f6f9f6] px-4 py-5 text-sm leading-6 text-[#65736a]">
        Aucun apport enregistré pour le moment. Les nouveaux apports
        apparaîtront ici et seront pris en compte dans les totaux des
        collecteurs.
      </p>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-[#e8eee8]">
      {deliveries.map((delivery) => (
        <li
          className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
          key={delivery.id}
        >
          <div>
            <p className="font-semibold text-[#193b29]">
              {delivery.collectorName}
              <span className="font-normal text-[#758178]">
                {" "}
                · {displayDate(delivery.deliveryDate)}
              </span>
            </p>
            <p className="mt-1 text-sm text-[#65736a]">
              {delivery.collectionPoint} · {delivery.plasticType}
            </p>
            <p className="mt-1 text-xs text-[#758178]">
              {delivery.status === "recue"
                ? "À trier"
                : delivery.status === "triee"
                  ? "Triée"
                  : "Intégrée au stock"}
              {delivery.acceptedKg !== null
                ? ` · ${kilogramsLabel(delivery.acceptedKg)} kg acceptés`
                : ""}
              {delivery.rejectedKg !== null
                ? ` · ${kilogramsLabel(delivery.rejectedKg)} kg rejetés`
                : ""}
            </p>
          </div>
          <p className="text-base font-semibold text-[#193b29]">
            {kilogramsLabel(delivery.receivedKg)} kg reçus
          </p>
        </li>
      ))}
    </ul>
  );
}

export function CollectorManagement({
  collectors,
  deliveries,
  activeCollectors,
}: {
  collectors: CollectorSummary[];
  deliveries: DeliverySummary[];
  activeCollectors: ActiveCollector[];
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-semibold text-[#193b29]">
            Ajouter un collecteur
          </h2>
          <p className="mb-5 mt-1 text-sm leading-6 text-[#758178]">
            Créez la fiche d’une personne, d’une association ou d’un groupe.
          </p>
          <CreateCollectorForm />
        </div>
        <div className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-semibold text-[#193b29]">
            Enregistrer un apport reçu
          </h2>
          <p className="mb-5 mt-1 text-sm leading-6 text-[#758178]">
            Consignez la date, le point de collecte, le type de plastique et le
            poids mesuré.
          </p>
          <RecordDeliveryForm collectors={activeCollectors} />
        </div>
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#193b29]">
              Classement des collecteurs
            </h2>
            <p className="mt-1 text-sm text-[#758178]">
              Classés selon le poids accepté après tri.
            </p>
          </div>
          <span className="text-xs text-[#758178]">
            {collectors.length} fiche{collectors.length > 1 ? "s" : ""}
          </span>
        </div>
        {collectors.length === 0 ? (
          <p className="mt-4 rounded-xl bg-[#f6f9f6] px-4 py-5 text-sm text-[#65736a]">
            Aucun collecteur pour le moment. Ajoutez votre premier collecteur
            ci-dessus.
          </p>
        ) : (
          <ol className="mt-4 grid gap-4 md:grid-cols-2">
            {collectors.map((collector, index) => (
              <CollectorCard
                collector={collector}
                key={collector.id}
                rank={index + 1}
              />
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Historique des apports
        </h2>
        <p className="mt-1 text-sm text-[#758178]">
          Les 30 apports les plus récents. Un apport reçu n’est pas encore du
          stock disponible.
        </p>
        <DeliveryHistory deliveries={deliveries} />
      </section>
    </div>
  );
}
