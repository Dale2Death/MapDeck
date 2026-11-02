import { getPref, setPref } from "./storage";

export interface User {
  name: string;
  email: string;
  picture?: string;
}

/** Set VITE_GOOGLE_CLIENT_ID to turn on Google sign-in. */
export const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function currentUser(): User | null {
  return getPref<User | null>("user", null);
}

export function signOut() {
  setPref("user", null);
  (window as any).google?.accounts?.id?.disableAutoSelect?.();
}

function decodeJwt(token: string): any {
  const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(part)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
  return JSON.parse(json);
}

let loading: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if ((window as any).google?.accounts?.id) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Google sign-in"));
    document.head.appendChild(s);
  });
  return loading;
}

/** Render Google's sign-in button into `el`. Calls onUser after sign-in. */
export async function renderGoogleButton(el: HTMLElement, onUser: (u: User) => void) {
  if (!GOOGLE_CLIENT_ID) return;
  await loadGis();
  const g = (window as any).google;
  g.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp: { credential: string }) => {
      const p = decodeJwt(resp.credential);
      const user: User = { name: p.name ?? p.email, email: p.email, picture: p.picture };
      setPref("user", user);
      onUser(user);
    },
  });
  g.accounts.id.renderButton(el, { theme: "filled_black", size: "medium", shape: "pill", text: "signin_with" });
}
