import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AUTH_API_BASE_URL } from "./config";
import { getItem, removeItem, setItem } from "./secureStorage";

const TOKEN_KEY = "ru_session_token";
const EMAIL_KEY = "ru_session_email";

type AuthState =
  | { status: "checking" }
  | { status: "anonymous" }
  | { status: "authenticated"; token: string; email: string };

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "checking" });

  useEffect(() => {
    (async () => {
      const [token, email] = await Promise.all([
        getItem(TOKEN_KEY),
        getItem(EMAIL_KEY),
      ]);
      if (token && email) {
        setState({ status: "authenticated", token, email });
      } else {
        setState({ status: "anonymous" });
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${AUTH_API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.token) {
        return { error: body.error || "Connexion impossible." };
      }
      await Promise.all([
        setItem(TOKEN_KEY, body.token),
        setItem(EMAIL_KEY, body.email || email),
      ]);
      setState({
        status: "authenticated",
        token: body.token,
        email: body.email || email,
      });
      return {};
    } catch {
      return { error: "Connexion impossible (réseau)." };
    }
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([removeItem(TOKEN_KEY), removeItem(EMAIL_KEY)]);
    setState({ status: "anonymous" });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth hors AuthProvider");
  return ctx;
}
