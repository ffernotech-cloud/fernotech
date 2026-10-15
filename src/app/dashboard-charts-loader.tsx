"use client";

import dynamic from "next/dynamic";
import type { MonthlyDashboardPoint } from "@/lib/dashboard/data";

const DashboardCharts = dynamic(
  () =>
    import("@/app/dashboard-charts").then((module) => module.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <section aria-labelledby="evolution-title">
        <h2
          className="text-lg font-semibold text-[#193b29]"
          id="evolution-title"
        >
          Évolution mensuelle
        </h2>
        <p className="mt-1 text-sm text-[#758178]" role="status">
          Chargement des graphiques…
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="h-[300px] animate-pulse rounded-2xl border border-[#e3ebe4] bg-white" />
          <div className="hidden h-[300px] animate-pulse rounded-2xl border border-[#e3ebe4] bg-white lg:block" />
        </div>
      </section>
    ),
  },
);

export function DashboardChartsLoader({
  data,
}: {
  data: ReadonlyArray<MonthlyDashboardPoint>;
}) {
  return <DashboardCharts data={data} />;
}
