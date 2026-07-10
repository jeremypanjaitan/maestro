"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, signIn } from "@/lib/auth";

const credentialsSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type AuthenticateState = {
  error?: string;
} | undefined;

/**
 * Server Action used by the login form (via `useActionState`).
 *
 * We call `signIn('credentials', { redirect: false })` so we can inspect
 * the resulting session and redirect by role. `signIn` still throws
 * `AuthError` (in this case a `CredentialsSignin`) on invalid credentials
 * even with `redirect: false` — the error is thrown inside the underlying
 * `@auth/core` callback handler before the redirect branch is reached, so
 * the try/catch below is required regardless of the redirect option.
 */
export async function authenticate(
  _prevState: AuthenticateState,
  formData: FormData,
): Promise<AuthenticateState> {
  const parsed = credentialsSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Email atau password salah" };
  }

  const { email, password } = parsed.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email atau password salah" };
    }
    // Not an auth error (e.g. a genuine unexpected failure) — rethrow so
    // it surfaces normally instead of being swallowed as a login error.
    throw error;
  }

  // signIn succeeded: read the freshly-created session to branch by role.
  // `redirect()` throws a NEXT_REDIRECT error by design — it must not be
  // caught above, which is why it happens outside the try/catch.
  const session = await auth();
  const role = session?.user?.role;

  if (role === "ADMIN") {
    redirect("/admin/dashboard");
  }
  if (role === "GURU") {
    redirect("/guru/dashboard");
  }

  redirect("/");
}
