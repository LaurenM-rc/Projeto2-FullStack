import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const { login, loginDemo, autenticado } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  if (autenticado) return <Navigate to="/" replace />;

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.');
      return;
    }
    setCarregando(true);
    try {
      await login(email.trim(), senha);
      navigate('/', { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  function entrarDemo() {
    loginDemo();
    navigate('/', { replace: true });
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={enviar} noValidate>
        <h1>Entrar</h1>

        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {erro && (
          <p className="msg msg-erro" role="alert">
            {erro}
          </p>
        )}

        <button className="btn" disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: '0.5rem' }}
          onClick={entrarDemo}
        >
          Visualizar telas (Modo Demonstração)
        </button>

        <p className="auth-link">
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}
