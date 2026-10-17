import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDatabase } from "@/db";
import { users } from "@/db/schema";
import { requirePermission } from "@/lib/auth/guards";
import { UserManagement } from "@/app/utilisateurs/user-management";
import { BackupPanel } from "@/app/utilisateurs/backup-panel";

export const instant = false;

export default async function UsersPage() {
  const actor = await requirePermission("users:manage");

  const database = getDatabase();
  const userList = await database
    .select({
      id: users.id,
      identifier: users.identifier,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .orderBy(asc(users.displayName));

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              className="text-sm font-semibold text-[#286542] hover:underline"
              href="/"
            >
              ← Tableau de bord
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-[#193b29]">
              Gestion des utilisateurs
            </h1>
            <p className="mt-1 text-sm text-[#758178]">
              Réservez l’accès aux pages et actions selon le rôle de chacun.
            </p>
          </div>
        </header>
        <UserManagement currentUserId={actor.id} users={userList} />
        <BackupPanel />
      </div>
    </main>
  );
}
