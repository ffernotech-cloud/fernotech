"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { loginSchema } from "@/lib/auth/validation";

export type LoginState = {
  error?: string;
};

export async function authenticate(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Vérifiez les champs." };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          "Connexion impossible. Vérifiez vos identifiants et réessayez. Si le problème persiste, contactez l’administrateur.",
      };
    }
    throw error;
  }

  return { error: "La connexion n’a pas abouti. Réessayez." };
}
