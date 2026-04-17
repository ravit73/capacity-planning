import { createContext, useContext } from "react";
import { AppUser } from "../types";

export interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  getAccessToken: () => Promise<string | null>;
  login: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAuthenticated: false,
  getAccessToken: async () => null,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);
