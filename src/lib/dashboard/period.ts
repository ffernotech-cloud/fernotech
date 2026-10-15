import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La date doit respecter le format AAAA-MM-JJ.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.valueOf()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "La date saisie n’existe pas.");

const periodSchema = z
  .object({
    from: dateString,
    to: dateString,
  })
  .refine(({ from, to }) => from <= to, {
    message: "La date de début doit précéder ou égaler la date de fin.",
    path: ["to"],
  });

export type DashboardPeriod = {
  from: string;
  to: string;
  error: string | null;
};

function doualaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function defaultPeriod(now: Date): Pick<DashboardPeriod, "from" | "to"> {
  const to = doualaDate(now);
  return { from: `${to.slice(0, 7)}-01`, to };
}

export function resolveDashboardPeriod(
  searchParams: { from?: string | string[]; to?: string | string[] },
  now = new Date(),
): DashboardPeriod {
  const defaultValues = defaultPeriod(now);
  if (searchParams.from === undefined && searchParams.to === undefined) {
    return { ...defaultValues, error: null };
  }

  const from = Array.isArray(searchParams.from)
    ? searchParams.from[0]
    : searchParams.from;
  const to = Array.isArray(searchParams.to) ? searchParams.to[0] : searchParams.to;
  const result = periodSchema.safeParse({ from, to });
  if (!result.success) {
    return {
      ...defaultValues,
      error: result.error.issues[0]?.message ?? "La période saisie est invalide.",
    };
  }

  return { ...result.data, error: null };
}
