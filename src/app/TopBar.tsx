import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID, renderGoogleButton, signOut, type User } from "./auth";

interface Props {
  user: User | null;
  onUser: (u: User | null) => void;
  onHome: () => void;
  onStudio: () => void;
  hasDeck: boolean;
}

export function TopBar({ user, onUser, onHome, onStudio, hasDeck }: Props) {
  const btn = useRef<HTMLDivElement>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (!user && btn.current) renderGoogleButton(btn.current, onUser).catch(() => {});
  }, [user, onUser]);

  return (
    <header className="topbar">
      <button className="brand" onClick={onHome}>
        <span className="brand-mark">🧭</span> MapDeck
      </button>
      <nav>
        <button className="link" onClick={onHome}>New / my decks</button>
        {hasDeck && <button className="link" onClick={onStudio}>Studio</button>}
      </nav>
      <div className="account">
        {user ? (
          <>
            {user.picture && <img src={user.picture} alt="" referrerPolicy="no-referrer" />}
            <span className="hide-sm">{user.name}</span>
            <button
              className="link"
              onClick={() => {
                signOut();
                onUser(null);
              }}
            >
              Sign out
            </button>
          </>
        ) : GOOGLE_CLIENT_ID ? (
          <div ref={btn} />
        ) : (
          <div className="pop-wrap">
            <button className="btn ghost small" onClick={() => setHelp((h) => !h)}>
              Sign in with Google
            </button>
            {help && (
              <div className="pop">
                Google sign-in is built in but needs a Google OAuth client ID. Set <code>VITE_GOOGLE_CLIENT_ID</code> and
                rebuild. Until then decks are saved in this browser.
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
