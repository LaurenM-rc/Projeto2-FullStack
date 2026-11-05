import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, tokenStorage, demoStorage, setUnauthorizedHandler } from '../services/api.js';

const AuthContext = createContext(null);
const USER_KEY = 'usuario';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      return tokenStorage.get() ? JSON.parse(localStorage.getItem(USER_KEY)) : null;
    } catch {
      return null;
    }
  });

  const logout = useCallback(() => {
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    setUsuario(null);
  }, []);

  // Token expirado: limpa a sessão e a ProtectedRoute leva ao login.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  async function login(email, senha) {
    demoStorage.desativar();
    // Ajustar rota e campos conforme o contrato da API.
    const data = await api.post('/auth/login', { email, senha });
    tokenStorage.set(data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
    setUsuario(data.usuario);
  }

  function loginDemo() {
    demoStorage.ativar();
    const userDemo = { id: 1, nome: 'Visitante (Modo Demo)', email: 'demo@utfpr.edu.br' };
    tokenStorage.set('demo-token');
    localStorage.setItem(USER_KEY, JSON.stringify(userDemo));
    setUsuario(userDemo);
  }

  async function cadastrar(dados) {
    // Ajustar rota e campos conforme o contrato da API.
    return api.post('/auth/cadastro', dados);
  }

  return (
    <AuthContext.Provider
      value={{ usuario, autenticado: !!usuario, login, loginDemo, cadastrar, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
