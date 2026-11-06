"use client";

import { useActionState, useState } from "react";
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

type ProductRow = {
  id: string;
  code: string;
  name: string;
  unitLabel: string;
};

type ProductStockRow = ProductRow & {
  quantity: number;
};

type OrderLineRow = {
  productId: string;
  productCode: string;
  productName: string;
  unitLabel: string;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
};

type OrderRow = {
  id: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: "en_attente" | "preparee" | "livree" | "annulee";
  quantity: number;
  totalAmount: string;
  lines: OrderLineRow[];
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
  lines: OrderLineRow[];
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
  "min-h-12 w-full rounded-xl border border-[#dbe3ec] bg-white px-4 text-sm text-[#17212b] outline-none focus:border-[#0b428a] focus:ring-2 focus:ring-[#0b428a]/15";
const labelClass = "mb-2 block text-sm font-semibold text-[#28384d]";

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
        className="mt-3 text-sm text-[#0b428a]"
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
          className="mt-2 min-h-12 w-full rounded-xl bg-[#0b428a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#16345d] disabled:opacity-60 sm:w-auto"
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
  products,
}: {
  customers: CustomerRow[];
  defaultDate: string;
  products: ProductRow[];
}) {
  const [state, formAction, pending] = useActionState(createSalesOrder, {});
  const [lineCount, setLineCount] = useState(1);
  if (customers.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-[#f6f8fb] px-4 py-5 text-sm leading-6 text-[#65736a]">
        Ajoutez d’abord un client pour créer une commande.
      </p>
    );
  }
  if (products.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-[#f6f8fb] px-4 py-5 text-sm leading-6 text-[#65736a]">
        Aucun produit actif. Demandez à un administrateur d’activer un produit
        dans le catalogue.
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
      <div className="sm:col-span-2 rounded-2xl border border-[#dbe3ec] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[#17212b]">Produits commandés</h3>
            <p className="mt-1 text-xs leading-5 text-[#758178]">
              Indiquez une quantité et un prix unitaire pour chaque produit.
            </p>
          </div>
          <button
            className="min-h-11 rounded-xl border border-[#0b428a] px-4 text-sm font-semibold text-[#0b428a] hover:bg-[#f0f6f1]"
            disabled={pending || lineCount >= 20}
            onClick={() => setLineCount((count) => Math.min(count + 1, 20))}
            type="button"
          >
            Ajouter un produit
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {Array.from({ length: lineCount }, (_, index) => (
            <fieldset
              className="grid gap-3 rounded-xl bg-[#f6f8fb] p-4 sm:grid-cols-3"
              key={index}
            >
              <legend className="px-1 text-sm font-semibold text-[#0b428a]">
                Ligne {index + 1}
              </legend>
              <div>
                <label
                  className={labelClass}
                  htmlFor={`order-product-${index}`}
                >
                  Produit
                </label>
                <select
                  className={fieldClass}
                  defaultValue={products[0].id}
                  id={`order-product-${index}`}
                  name="productId"
                  required
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className={labelClass}
                  htmlFor={`order-quantity-${index}`}
                >
                  Quantité
                </label>
                <input
                  className={fieldClass}
                  id={`order-quantity-${index}`}
                  inputMode="numeric"
                  maxLength={8}
                  name="quantity"
                  placeholder="Ex. 10"
                  required
                  type="text"
                />
              </div>
              <div>
                <label
                  className={labelClass}
                  htmlFor={`order-unit-price-${index}`}
                >
                  Prix unitaire ({CURRENCY_LABEL})
                </label>
                <input
                  className={fieldClass}
                  id={`order-unit-price-${index}`}
                  inputMode="decimal"
                  maxLength={16}
                  name="unitPrice"
                  placeholder="Ex. 2500"
                  required
                  type="text"
                />
              </div>
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
          La commande ne réserve pas les stocks. Chaque produit sera vérifié et
          débité lors de la confirmation de livraison.
        </p>
      </div>
      <div className="sm:col-span-2">
        <ActionFeedback state={state} />
        <button
          className="mt-3 min-h-12 w-full rounded-xl bg-[#0b428a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#16345d] disabled:opacity-60 sm:w-auto"
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
        className="min-h-10 rounded-lg border border-[#dbe3ec] bg-white px-3 py-2 text-xs font-semibold text-[#0b428a] hover:bg-[#eaf1fa] disabled:opacity-60"
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
          className="mt-2 min-h-11 rounded-xl bg-[#0b428a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16345d] disabled:opacity-60"
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
            <h3 className="font-semibold text-[#17212b]">{order.customerName}</h3>
            <p className="mt-1 text-sm text-[#65736a]">
              {displayDate(order.orderDate)} · {order.quantity} unités ·{" "}
              Total {moneyLabel(order.totalAmount)}
            </p>
            <ul className="mt-2 grid gap-1 text-sm text-[#65736a] sm:grid-cols-2">
              {order.lines.map((line, index) => (
                <li key={`${order.id}-${index}`}>
                  {line.productName} ({line.productCode}) · {line.quantity}{" "}
                  {line.unitLabel} · {moneyLabel(line.totalAmount)}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#eaf1fa] px-3 py-1 text-xs font-semibold text-[#0b428a]">
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
                <h3 className="font-semibold text-[#17212b]">
                  {sale.customerName}
                </h3>
                <p className="mt-1 text-sm text-[#65736a]">
                  Vente du {displayDate(sale.saleDate)} · {sale.quantity} unités
                  · Total {moneyLabel(sale.totalAmount)}
                </p>
                <ul className="mt-2 grid gap-1 text-sm text-[#65736a] sm:grid-cols-2">
                  {sale.lines.map((line, index) => (
                    <li key={`${sale.id}-${index}`}>
                      {line.productName} ({line.productCode}) · {line.quantity}{" "}
                      {line.unitLabel}
                    </li>
                  ))}
                </ul>
              </div>
              <span className="rounded-full bg-[#eaf1fa] px-3 py-1 text-xs font-semibold text-[#0b428a]">
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
  products,
  defaultDate,
  orders,
  payments,
  sales,
  finishedStock,
  customerReceivables,
}: {
  customers: CustomerRow[];
  products: ProductRow[];
  defaultDate: string;
  orders: OrderRow[];
  payments: PaymentRow[];
  sales: SaleRow[];
  finishedStock: ProductStockRow[];
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
          {
            label: "Unités disponibles",
            value: String(
              finishedStock.reduce((total, product) => total + product.quantity, 0),
            ),
          },
          { label: "Clients enregistrés", value: String(customers.length) },
          {
            label: "Créances récentes",
            value: moneyLabel(totalReceivables),
          },
        ].map((indicator) => (
          <article
            className="rounded-2xl border border-[#e3e9f0] bg-white p-5 shadow-sm"
            key={indicator.label}
          >
            <p className="text-sm font-medium text-[#65736a]">
              {indicator.label}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[#17212b]">
              {indicator.value}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-[#e3e9f0] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#17212b]">
          Stock disponible par produit
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {finishedStock.map((product) => (
            <li className="rounded-xl bg-[#f6f8fb] p-4" key={product.id}>
              <p className="text-sm font-medium text-[#65736a]">
                {product.name} · {product.code}
              </p>
              <p className="mt-2 text-xl font-semibold text-[#17212b]">
                {product.quantity} {product.unitLabel}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#e3e9f0] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#17212b]">Clients</h2>
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
              <li className="rounded-xl bg-[#f6f8fb] p-4" key={customer.id}>
                <p className="font-semibold text-[#17212b]">{customer.name}</p>
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
                <p className="mt-2 text-sm font-medium text-[#0b428a]">
                  Créance :{" "}
                  {moneyLabel(receivablesByCustomer.get(customer.id) ?? 0)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-5 rounded-xl border border-[#e3e9f0] p-4">
          <summary className="cursor-pointer font-semibold text-[#0b428a]">
            Ajouter un client
          </summary>
          <CustomerForm />
        </details>
      </section>

      <section className="rounded-2xl border border-[#e3e9f0] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#17212b]">
          Nouvelle commande
        </h2>
        <SalesOrderForm
          customers={customers}
          defaultDate={defaultDate}
          products={products}
        />
      </section>

      <section className="rounded-2xl border border-[#e3e9f0] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#17212b]">
          Commandes récentes
        </h2>
        <OrdersList orders={orders} />
      </section>

      <section className="rounded-2xl border border-[#e3e9f0] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#17212b]">
          Ventes et créances
        </h2>
        <p className="mt-1 text-sm text-[#758178]">
          Un règlement peut être reçu en plusieurs fois. Le solde dû est recalculé
          après chaque encaissement.
        </p>
        <SalesList defaultDate={defaultDate} sales={sales} />
      </section>

      <section className="rounded-2xl border border-[#e3e9f0] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#17212b]">
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
                  <p className="font-semibold text-[#17212b]">
                    {payment.customerName}
                  </p>
                  <p className="mt-1 text-sm text-[#65736a]">
                    {displayDate(payment.paidAt)} ·{" "}
                    {paymentMethodLabels[payment.method]}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-[#0b428a]">
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
