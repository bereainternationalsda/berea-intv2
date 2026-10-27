"use client";

import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getClientAuth } from "@/lib/firebase/client";

function describeError(error: unknown): string | null {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return null; // the user changed their mind; not an error
      case "auth/popup-blocked":
        return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
      case "auth/operation-not-allowed":
      case "auth/configuration-not-found":
        return "Google sign-in isn't switched on for this Firebase project yet. In the Firebase console go to Authentication → Sign-in method and enable Google.";
      case "auth/unauthorized-domain":
        return "This website's address isn't on Firebase's list of authorised domains. Add it under Authentication → Settings → Authorised domains.";
      case "auth/network-request-failed":
        return "Couldn't reach Google. Check your internet connection and try again.";
    }
  }
  return "Something went wrong signing in. Please try again.";
}

export function GoogleSignInButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setBusy(true);
    setError(null);

    const auth = getClientAuth();
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      // The server now holds the session in an httpOnly cookie, so the
      // browser doesn't need to stay signed in to Firebase itself.
      await signOut(auth);

      if (response.status === 403) {
        setError(
          `${credential.user.email} isn't authorised to manage this site. Ask an existing admin to add your email.`,
        );
        return;
      }
      if (!response.ok) {
        setError("Couldn't start your session. Please try again.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-navy-100 bg-white px-4 py-3 text-sm font-semibold text-navy-900 shadow-sm transition-colors hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.3 5.7c4.3-4 6.9-9.9 6.9-17z" />
          <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.3-5.7c-2 1.4-4.7 2.2-7.9 2.2-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {busy ? "Signing in…" : "Sign in with Google"}
      </button>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
