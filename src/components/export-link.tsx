import Link from "next/link";

export function ExportLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#c9ddcd] bg-white px-4 py-2 text-sm font-semibold text-[#205d39] hover:bg-[#edf5ef]"
      href={href}
    >
      {children}
    </Link>
  );
}
