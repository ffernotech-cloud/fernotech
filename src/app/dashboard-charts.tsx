"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyDashboardPoint } from "@/lib/dashboard/data";

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 3,
});

function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));
}

function formatKilograms(value: number): string {
  return `${numberFormat.format(value)} kg`;
}


export function DashboardCharts({
  data,
}: {
  data: ReadonlyArray<MonthlyDashboardPoint>;
}) {
  const chartData = data.map((point) => ({
    ...point,
    monthLabel: formatMonth(point.month),
  }));

  return (
    <section aria-labelledby="evolution-title">
      <div className="mb-4">
        <h2
          className="text-lg font-semibold text-[#17212b]"
          id="evolution-title"
        >
          Évolution mensuelle
        </h2>
        <p className="mt-1 text-sm text-[#758178]">
          Les graphiques suivent la période sélectionnée.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#e3e9f0] bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-[#26374b]">
            Plastique accepté et transformé
          </h3>
          <div aria-label="Courbes mensuelles des kilogrammes acceptés et transformés" role="img">
            <ResponsiveContainer height={260} minWidth={0} width="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid stroke="#e8eee9" strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  dataKey="monthLabel"
                  tickLine={false}
                  tick={{ fill: "#758178", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#758178", fontSize: 12 }}
                  tickFormatter={(value: number) => numberFormat.format(value)}
                />
                <Tooltip
                  formatter={(value) => formatKilograms(Number(value))}
                  labelStyle={{ color: "#17212b" }}
                  contentStyle={{
                    borderColor: "#dbe3ec",
                    borderRadius: 12,
                  }}
                />
                <Legend />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="acceptedKg"
                  name="Accepté"
                  stroke="#2d8a55"
                  strokeWidth={3}
                  type="monotone"
                />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="transformedKg"
                  name="Transformé"
                  stroke="#e29b35"
                  strokeWidth={3}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-2xl border border-[#e3e9f0] bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-[#26374b]">
            Produits fabriqués et vendus (unités)
          </h3>
          <div aria-label="Courbes mensuelles des produits fabriqués et vendus" role="img">
            <ResponsiveContainer height={260} minWidth={0} width="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid stroke="#e8eee9" strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  dataKey="monthLabel"
                  tickLine={false}
                  tick={{ fill: "#758178", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#758178", fontSize: 12 }}
                  tickFormatter={(value: number) => numberFormat.format(value)}
                />
                <Tooltip
                  formatter={(value) => `${numberFormat.format(Number(value))} unité(s)`}
                  labelStyle={{ color: "#17212b" }}
                  contentStyle={{
                    borderColor: "#dbe3ec",
                    borderRadius: 12,
                  }}
                />
                <Legend />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="producedUnits"
                  name="Fabriqués"
                  stroke="#2d8a55"
                  strokeWidth={3}
                  type="monotone"
                />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="soldUnits"
                  name="Vendus"
                  stroke="#556ac7"
                  strokeWidth={3}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
}
