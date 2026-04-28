import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // MAANG Optimization: Memoize the context value to prevent global re-render cascades
  const value = useMemo(
    () => ({ currentUser, loading }),
    [currentUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
