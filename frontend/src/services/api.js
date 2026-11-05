import { atenderComMock } from './mockData.js';

// Cliente HTTP único: todas as chamadas à API passam por aqui.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'token';
const DEMO_KEY = 'modo_demo';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DEMO_KEY);
  },
};

export const demoStorage = {
  isAtivo: () => localStorage.getItem(DEMO_KEY) === '1',
  ativar: () => localStorage.setItem(DEMO_KEY, '1'),
  desativar: () => localStorage.removeItem(DEMO_KEY),
};

// O AuthContext registra aqui o que fazer quando o token expira (401).
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(method, path, body) {
  // Se o usuário entrou no Modo Demonstração (para visualizar as telas sem backend), responde com dados locais
  if (demoStorage.isAtivo()) {
    return atenderComMock(method, path, body);
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStorage.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw { status: 0, message: 'Não foi possível conectar ao servidor.' };
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    // 401 em rota privada = token inválido/expirado. No login, é senha errada.
    if (res.status === 401 && token) onUnauthorized();
    // Ajustar aqui conforme o padrão de erro definido no contrato da API.
    const message = data?.erro || data?.error || data?.message || 'Erro inesperado.';
    throw { status: res.status, message, details: data };
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
