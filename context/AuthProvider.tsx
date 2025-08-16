import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { db } from '@/firebaseConfig';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';

type EmpresaMembership = {
  empresaId: string;
  role: 'owner' | 'member' | 'viewer';
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  empresaId: string | null;
  setEmpresaId: (empresaId: string | null) => void;
  empresas: EmpresaMembership[];
  refreshEmpresas: () => Promise<void>;
  // auth
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOutApp: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<EmpresaMembership[]>([]);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        setEmpresaId(null);
        setEmpresas([]);
        return;
      }
      await refreshEmpresasInternal(u.uid);
    });
    return () => unsub();
  }, []);

  const refreshEmpresasInternal = async (uid: string) => {
    try {
      const userEmpresasRef = collection(db, 'usuarios', uid, 'empresas');
      const snap = await getDocs(userEmpresasRef);
      const items: EmpresaMembership[] = snap.docs.map((d) => ({ empresaId: d.id, role: (d.data().role || 'member') as EmpresaMembership['role'] }));
      setEmpresas(items);
      if (items.length === 1) {
        setEmpresaId(items[0].empresaId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshEmpresas = async () => {
    if (!user) return;
    await refreshEmpresasInternal(user.uid);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const auth = getAuth();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const auth = getAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // create user doc
    await setDoc(doc(db, 'usuarios', cred.user.uid), {
      email: cred.user.email,
      creado: new Date(),
    });
  };

  const signOutApp = async () => {
    const auth = getAuth();
    await signOut(auth);
    setEmpresaId(null);
    setEmpresas([]);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    empresaId,
    setEmpresaId,
    empresas,
    refreshEmpresas,
    signInWithEmail,
    signUpWithEmail,
    signOutApp,
  }), [user, loading, empresaId, empresas]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};


