import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { mascararCpf, somenteDigitos } from '../utils/formatters.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', cpf: '', senha: '', confirmar: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [carregando, setCarregando] = useState(false);

  const alterar = (campo) => (e) => {
    const valor = campo === 'cpf' ? mascararCpf(e.target.value) : e.target.value;
    setForm({ ...form, [campo]: valor });
  };

  // A validação definitiva (incluindo dígitos do CPF) é feita no servidor.
  function validar() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Informe o nome.';
    if (!EMAIL_REGEX.test(form.email)) e.email = 'Informe um e-mail válido.';
    if (somenteDigitos(form.cpf).length !== 11) e.cpf = 'O CPF deve ter 11 dígitos.';
    if (form.senha.length < 6) e.senha = 'A senha deve ter ao menos 6 caracteres.';
    if (form.senha !== form.confirmar) e.confirmar = 'As senhas não coincidem.';
    return e;
  }

  async function enviar(ev) {
    ev.preventDefault();
    setErroGeral('');
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) return;

    setCarregando(true);
    try {
      await cadastrar({
        nome: form.nome.trim(),
        email: form.email.trim(),
        cpf: form.cpf,
        senha: form.senha,
      });
      navigate('/login', { replace: true });
    } catch (err) {
      // 409: e-mail ou CPF já cadastrado
      setErroGeral(
        err.status === 409 ? err.message || 'E-mail ou CPF já cadastrado.' : err.message
      );
    } finally {
      setCarregando(false);
    }
  }

  const campo = (nome, rotulo, tipo = 'text', extra = {}) => (
    <label>
      {rotulo}
      <input type={tipo} value={form[nome]} onChange={alterar(nome)} {...extra} />
      {erros[nome] && <span className="msg msg-erro">{erros[nome]}</span>}
    </label>
  );

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={enviar} noValidate>
        <h1>Criar conta</h1>
        {campo('nome', 'Nome', 'text', { autoComplete: 'name' })}
        {campo('email', 'E-mail', 'email', { autoComplete: 'email' })}
        {campo('cpf', 'CPF', 'text', { inputMode: 'numeric', placeholder: '000.000.000-00' })}
        {campo('senha', 'Senha', 'password', { autoComplete: 'new-password' })}
        {campo('confirmar', 'Confirmar senha', 'password', { autoComplete: 'new-password' })}

        {erroGeral && <p className="msg msg-erro" role="alert">{erroGeral}</p>}

        <button className="btn" disabled={carregando}>
          {carregando ? 'Cadastrando...' : 'Cadastrar'}
        </button>
        <p className="auth-link">Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </div>
  );
}
