"use client";

import { useActionState } from "react";
import {
  createUser,
  updateUserActiveStatus,
  updateUserRole,
} from "@/app/utilisateurs/actions";
import type { AppRole } from "@/lib/auth/roles";
import { appRoles, roleLabels } from "@/lib/auth/roles";
import type { UserActionState } from "@/lib/auth/validation";

type UserSummary = {
  id: string;
  identifier: string;
  displayName: string;
  role: AppRole;
  isActive: boolean;
};

function ActionFeedback({ state }: { state: UserActionState }) {
  if (state.error) {
    return (
      <p aria-live="polite" className="mt-2 text-xs text-[#9a342a]" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p aria-live="polite" className="mt-2 text-xs text-[#286542]" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, {});

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor="displayName">
          Nom affiché
        </label>
        <input
          autoComplete="name"
          className="min-h-12 w-full rounded-xl border border-[#d9e4da] px-4 outline-none focus:border-[#286542] focus:ring-2 focus:ring-[#286542]/15"
          id="displayName"
          maxLength={100}
          name="displayName"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor="identifier">
          Identifiant
        </label>
        <input
          autoComplete="off"
          className="min-h-12 w-full rounded-xl border border-[#d9e4da] px-4 outline-none focus:border-[#286542] focus:ring-2 focus:ring-[#286542]/15"
          id="identifier"
          maxLength={32}
          name="identifier"
          pattern="[A-Za-z0-9._-]{3,32}"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor="new-password">
          Mot de passe provisoire
        </label>
        <input
          autoComplete="new-password"
          className="min-h-12 w-full rounded-xl border border-[#d9e4da] px-4 outline-none focus:border-[#286542] focus:ring-2 focus:ring-[#286542]/15"
          id="new-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
        <span className="mt-1 block text-xs text-[#758178]">
          12 caractères minimum. À transmettre à l’utilisateur de façon sûre.
        </span>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor="role">
          Rôle
        </label>
        <select
          className="min-h-12 w-full rounded-xl border border-[#d9e4da] bg-white px-4 outline-none focus:border-[#286542] focus:ring-2 focus:ring-[#286542]/15"
          defaultValue="lecteur"
          id="role"
          name="role"
        >
          {appRoles.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <ActionFeedback state={state} />
        <button
          className="mt-2 min-h-12 rounded-xl bg-[#205d39] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17472e] disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Création…" : "Créer le compte"}
        </button>
      </div>
    </form>
  );
}

function UserRow({
  currentUserId,
  user,
}: {
  currentUserId: string;
  user: UserSummary;
}) {
  const [roleState, roleAction, rolePending] = useActionState(updateUserRole, {});
  const [activeState, activeAction, activePending] = useActionState(
    updateUserActiveStatus,
    {},
  );

  return (
    <li className="grid gap-4 border-t border-[#e8eee8] py-5 lg:grid-cols-[1fr_auto_auto] lg:items-center">
      <div>
        <p className="font-semibold text-[#193b29]">{user.displayName}</p>
        <p className="mt-1 text-sm text-[#758178]">@{user.identifier}</p>
        <p
          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
            user.isActive
              ? "bg-[#edf5ef] text-[#286542]"
              : "bg-[#f2f2f0] text-[#70756f]"
          }`}
        >
          {user.isActive ? "Actif" : "Inactif"}
        </p>
      </div>
      <form action={roleAction} className="flex flex-wrap items-center gap-2">
        <input name="userId" type="hidden" value={user.id} />
        <label className="sr-only" htmlFor={`role-${user.id}`}>
          Rôle de {user.displayName}
        </label>
        <select
          className="min-h-11 rounded-xl border border-[#d9e4da] bg-white px-3 text-sm"
          defaultValue={user.role}
          id={`role-${user.id}`}
          name="role"
        >
          {appRoles.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
        <button
          className="min-h-11 rounded-xl border border-[#d9e4da] px-3 text-sm font-semibold text-[#205d39] hover:bg-[#edf5ef] disabled:opacity-60"
          disabled={rolePending || user.id === currentUserId}
          type="submit"
        >
          Modifier le rôle
        </button>
        <ActionFeedback state={roleState} />
      </form>
      <form action={activeAction}>
        <input name="userId" type="hidden" value={user.id} />
        <input
          name="isActive"
          type="hidden"
          value={user.isActive ? "false" : "true"}
        />
        <button
          className="min-h-11 rounded-xl border border-[#d9e4da] px-3 text-sm font-semibold text-[#526258] hover:bg-[#f6f9f6] disabled:opacity-60"
          disabled={activePending || user.id === currentUserId}
          type="submit"
        >
          {user.isActive ? "Désactiver" : "Réactiver"}
        </button>
        <ActionFeedback state={activeState} />
      </form>
    </li>
  );
}

export function UserManagement({
  currentUserId,
  users,
}: {
  currentUserId: string;
  users: UserSummary[];
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Ajouter un membre
        </h2>
        <p className="mb-5 mt-1 text-sm text-[#758178]">
          Chaque compte reçoit un rôle et un mot de passe haché avant stockage.
        </p>
        <CreateUserForm />
      </section>

      <section className="rounded-2xl border border-[#e3ebe4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-[#193b29]">
          Comptes utilisateurs
        </h2>
        {users.length === 0 ? (
          <p className="mt-4 text-sm text-[#758178]">
            Aucun compte utilisateur.
          </p>
        ) : (
          <ul className="mt-2">
            {users.map((user) => (
              <UserRow
                currentUserId={currentUserId}
                key={user.id}
                user={user}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
