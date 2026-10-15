"use client";

import { useActionState } from "react";
import {
  createCustomer,
  createSalesOrder,
  recordPayment,
  updateSalesOrderStatus,
} from "@/app/ventes/actions";
import { CURRENCY_LABEL, formatCurrency } from "@/lib/currency";
import type { SalesActionState } from "@/lib/sales/validation";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

type OrderRow = {
  id: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: "en_attente" | "preparee" | "livree" | "annulee";
  quantity: number;
  unitPrice: string;
  totalAmount: string;
};

type SaleRow = {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  saleDate: string;
  quantity: number;
  totalAmount: string;
  outstandingAmount: string;
};

type PaymentRow = {
  id: string;
  saleId: string;
  customerName: string;
  amount: string;
  method: "especes" | "mobile_money" | "virement";
  paidAt: string;
  reference: string | null;
  createdAt: Date;
};

type CustomerReceivableRow = {
  customerId: string;
  outstandingAmount: string;
};

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#d9e4da] bg-white px-4 text-sm text-[#193b29] outline-none focus:border-[#286542] focus:ring-2 focus:ring-[#286542]/15";
const labelClass = "mb-2 block text-sm font-semibold text-[#314a39]";

const paymentMethodLabels = {
  especes: "Espèces",
  mobile_money: "Mobile money",
  virement: "Virement",
} as const;

function moneyLabel(value: string | number): string {
  return formatCurrency(value);
}

function displayDate(value: string): string {
  return value.split("-").reverse().join("/");
}

function ActionFeedback({ state }: { state: SalesActionState }) {
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

function CustomerForm() {
  const [state, formAction, pending] = useActionState(createCustomer, {});
  return (
    <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelClass} htmlFor="customer-name">
          Nom du client
        </label>
        <input
          autoComplete="name"
          className={fieldClass}
          id="customer-name"
          maxLength={120}
          name="name"
          placeholder="Nom ou organisation"
          required
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="customer-phone">
          Téléphone
        </label>
        <input
          autoComplete="tel"
          className={fieldClass}
          id="customer-phone"
          maxLength={40}
          name="phone"
          placeholder="+237…"
          type="tel"
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="customer-address">
          Adresse ou zone
        </label>
        <input
          className={fieldClass}
          id="customer-address"
          maxLength={200}
          name="address"
          placeholder="Ville, quartier ou adresse"
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="customer-notes">
          Notes
        </label>
        <textarea
          className={`${fieldClass} min-h-20 py-3`}
          id="customer-notes"
          maxLength={1000}
          name="notes"
          rows={2}
        />
      </div>
      <div className="sm:col-span-2">
        <ActionFeedback state={state} />
        <button
          className="mt-2 min-h-12 w-full rounded-xl bg-[#205d39] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60 sm:w-auto"
          disabled={pending}
          type="submit"
        >
          {pending ? "Enregistrement…" : "Ajouter le client"}
        </button>
      </div>
    </form>
  );
}

function SalesOrderForm({
  customers,
  defaultDate,
}: {
  customers: CustomerRow[];
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState(createSalesOrder, {});
  if (customers.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-[#f6f9f6] px-4 py-5 text-sm leading-6 text-[#65736a]">
        Ajoutez d’abord un client pour créer une commande.
      </p>
    );
  }
  return (
    <form action={formAction} className="mt-5 grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelClass} htmlFor="order-customer">
          Client
        </label>
        <select
          className={fieldClass}
          defaultValue=""
          id="order-customer"
          name="customerId"
          required
        >
          <option disabled value="">
            Choisir un client
          </option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="order-date">
          Date de commande
        </label>
        <input
          className={fieldClass}
          defaultValue={defaultDate}
          id="order-date"
          name="orderDate"
          required
          type="date"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="order-quantity">
          Nombre de balais
        </label>
        <input
          className={fieldClass}
          id="order-quantity"
          inputMode="numeric"
          maxLength={7}
          name="quantity"
          placeholder="Ex. 10"
          required
          type="text"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="order-unit-price">
          Prix par balai ({CURRENCY_LABEL})
        </label>
        <input
          className={fieldClass}
          id="order-unit-price"
          inputMode="decimal"
          maxLength={16}
          name="unitPrice"
          placeholder="Ex. 2500"
          required
          type="text"
        />
      </div>
      <div className="sm:col-span-2">
        <p className="text-xs leading-5 text-[#758178]">
          La commande ne réserve pas le stock. Les balais seront débités à la
          confirmation de livraison.
        </p>
        <ActionFeedback state={state} />
        <button
          className="mt-3 min-h-12 w-full rounded-xl bg-[#205d39] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60 sm:w-auto"
          disabled={pending}
          type="submit"
        >
          {pending ? "Création…" : "Créer la commande"}
        </button>
      </div>
    </form>
  );
}

function OrderStatusForm({
  order,
  nextStatus,
  label,
}: {
  order: OrderRow;
  nextStatus: "preparee" | "livree" | "annulee";
  label: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateSalesOrderStatus,
    {},
  );
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input name="orderId" type="hidden" value={order.id} />
      <input name="status" type="hidden" value={nextStatus} />
      <button
        className="min-h-10 rounded-lg border border-[#d9e4da] bg-white px-3 py-2 text-xs font-semibold text-[#205d39] hover:bg-[#edf5ef] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "En cours…" : label}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

function PaymentForm({ sale, defaultDate }: { sale: SaleRow; defaultDate: string }) {
  const [state, formAction, pending] = useActionState(recordPayment, {});
  return (
    <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input name="saleId" type="hidden" value={sale.id} />
      <div>
        <label className={labelClass} htmlFor={`payment-amount-${sale.id}`}>
          Montant reçu ({CURRENCY_LABEL})
        </label>
        <input
          className={fieldClass}
          id={`payment-amount-${sale.id}`}
          inputMode="decimal"
          maxLength={16}
          name="amount"
          placeholder="Ex. 5000"
          required
          type="text"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`payment-method-${sale.id}`}>
          Mode de règlement
        </label>
        <select
          className={fieldClass}
          defaultValue="especes"
          id={`payment-method-${sale.id}`}
          name="method"
        >
          {Object.entries(paymentMethodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor={`payment-date-${sale.id}`}>
          Date du règlement
        </label>
        <input
          className={fieldClass}
          defaultValue={defaultDate}
          id={`payment-date-${sale.id}`}
          name="paidAt"
          required
          type="date"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`payment-reference-${sale.id}`}>
          Référence (facultatif)
        </label>
        <input
          className={fieldClass}
          id={`payment-reference-${sale.id}`}
          maxLength={120}
          name="reference"
          placeholder="Transaction ou reçu"
        />
      </div>
      <div className="sm:col-span-2">
        <ActionFeedback state={state} />
        <button
          className="mt-2 min-h-11 rounded-xl bg-[#205d39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Enregistrement…" : "Enregistrer le règlement"}
        </button>
      </div>
    </form>
  );
}

function OrdersList({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) {
    return (
      <p className="mt-4 text-sm text-[#758178]">Aucune commande enregistrée.</p>
    );
  }
  const labels: Record<OrderRow["status"], string> = {
    en_attente: "En attente",
    preparee: "Préparée",
    livree: "Livrée",
    annulee: "Annulée",
  };

  return (
    <ul className="mt-4 divide-y divide-[#e8eee8]">
      {orders.map((order) => (
        <li
          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          key={order.id}
        >
          <div>
            <h3 className="font-semibold text-[#193b29]">{order.customerName}</h3>
            <p className="mt-1 text-sm text-[#65736a]">
              {displayDate(order.orderDate)} · {order.quantity} balais ·{" "}
              {moneyLabel(order.totalAmount)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-semibold text-[#286542]">
              {labels[order.status]}
            </span>
            {order.status === "en_attente" ? (
              <>
                <OrderStatusForm
                  label="Préparer"
                  nextStatus="preparee"
                  order={order}
                />
                <OrderStatusForm
                  label="Annuler"
                  nextStatus="annulee"
                  order={order}
                />
              </>
            ) : null}
            {order.status === "preparee" ? (
              <>
                <OrderStatusForm
                  label="Confirmer la livraison"
                  nextStatus="livree"
                  order={order}
                />
                <OrderStatusForm
                  label="Annuler"
                  nextStatus="annulee"
                  order={order}
                />
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function SalesList({
  sales,
  defaultDate,
}: {
  sales: SaleRow[];
  defaultDate: string;
}) {
  if (sales.length === 0) {
    return (
      <p className="mt-4 text-sm text-[#758178]">
        Aucune vente livrée pour le moment.
      </p>
    );
  }
  return (
    <ul className="mt-4 divide-y divide-[#e8eee8]">
      {sales.map((sale) => {
        const isPaid = Number(sale.outstandingAmount) === 0;
        return (
          <li className="py-5 first:pt-0 last:pb-0" key={sale.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#193b29]">
                  {sale.customerName}
                </h3>
                <p className="mt-1 text-sm text-[#65736a]">
                  Vente du {displayDate(sale.saleDate)} · {sale.quantity} balais
                  · Total {moneyLabel(sale.totalAmount)}
                </p>
              </div>
              <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-semibold text-[#286542]">
                {isPaid
                  ? "Réglée"
                  : `Reste dû : ${moneyLabel(sale.outstandingAmount)}`}
              </span>
            </div>
            {!isPaid ? <PaymentForm defaultDate={defaultDate} sale={sale} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function SalesManagement({
  customers,
  defaultDate,
  orders,
  payments,
  sales,
  finishedStock,
  customerReceivables,
}: {
  customers: CustomerRow[];
  defaultDate: string;
  orders: OrderRow[];
  payments: PaymentRow[];
  sales: SaleRow[];
  finishedStock: number;
  customerReceivables: CustomerReceivableRow[];
}) {
  const receivablesByCustomer = new Map(
    customerReceivables.map((row) => [
      row.customerId,
      Number(row.outstandingAmount),
    ]),
  );
  const totalReceivables = [...receivablesByCustomer.values()].reduce(
    (total, amount) => total + amount,
    0,
  );

  return (
    <>
      <section
        aria-label="Indicateurs commerciaux"
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          { label: "Balais disponibles", value: String(finishedStock) },
          { label: "Clients enregistrés", value: String(customers.length) },
          {
            label: "Créances récentes",
            value: moneyLabel(totalReceivables),
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
        <h2 className="text-lg font-semibold text-[#193b29]">Clients</h2>
        <p className="mt-1 text-sm text-[#758178]">
          Fiches clients et historique de leurs commandes.
        </p>
        {customers.length === 0 ? (
          <p className="mt-4 text-sm text-[#758178]">
            Aucun client enregistré.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customers.map((customer) => (
              <li className="rounded-xl bg-[#f6f9f6] p-4" key={customer.id}>
                <p className="font-semibold text-[#193b29]">{customer.name}</p>
                {customer.phone ? (
                  <p className="mt-1 text-sm text-[#65736a]">
                    {customer.phone}
                  </p>
                ) : null}
                {customer.address ? (
                  <p className="mt-1 text-sm text-[#65736a]">
                    {customer.address}
                  </p>
                ) : null}
                <p className="mt-2 text-sm font-medium text-[#286542]">
                  Créance :{" "}
                  {moneyLabel(receivablesByCustomer.get(customer.id) ?? 0)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-5 rounded-xl border border-[#e3ebe4] p-4">
          <summary className="cursor-pointer font-semibold text-[#205d39]">
            Ajouter un client
          </summary>
          <CustomerForm />
        </details>
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Nouvelle commande
        </h2>
        <SalesOrderForm customers={customers} defaultDate={defaultDate} />
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Commandes récentes
        </h2>
        <OrdersList orders={orders} />
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Ventes et créances
        </h2>
        <p className="mt-1 text-sm text-[#758178]">
          Un règlement peut être reçu en plusieurs fois. Le solde dû est recalculé
          après chaque encaissement.
        </p>
        <SalesList defaultDate={defaultDate} sales={sales} />
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Historique des règlements
        </h2>
        {payments.length === 0 ? (
          <p className="mt-4 text-sm text-[#758178]">
            Aucun règlement enregistré.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[#e8eee8]">
            {payments.map((payment) => (
              <li
                className="flex flex-wrap items-start justify-between gap-2 py-3"
                key={payment.id}
              >
                <div>
                  <p className="font-semibold text-[#193b29]">
                    {payment.customerName}
                  </p>
                  <p className="mt-1 text-sm text-[#65736a]">
                    {displayDate(payment.paidAt)} ·{" "}
                    {paymentMethodLabels[payment.method]}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-[#286542]">
                  {moneyLabel(payment.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
