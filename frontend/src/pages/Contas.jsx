import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

// Fontes/destinos que não são cartão (cartões ficam na página "Cartões e Faturas")
const TIPOS = [
  { valor: 'conta', rotulo: 'Conta (banco, carteira...)' },
  { valor: 'renda', rotulo: 'Fonte de renda' },
];

const FORM_INICIAL = { nome: '', tipo: 'conta' };

export default function Contas() {
  const [contas, setContas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [errosForm, setErrosForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const dados = await api.get('/fontes-destinos');
      setContas(dados.filter((f) => f.tipo !== 'cartao_credito'));
    } catch (err) {
      setErro(err.message || 'Erro ao carregar fontes e destinos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function limparFormulario() {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setErrosForm({});
  }

  function iniciarEdicao(conta) {
    setErro('');
    setSucesso('');
    setEditandoId(conta.id);
    setForm({ nome: conta.nome, tipo: conta.tipo });
    setErrosForm({});
  }

  function validar() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Informe o nome.';
    else if (form.nome.trim().length > 60) e.nome = 'O nome deve ter no máximo 60 caracteres.';
    return e;
  }

  async function salvar(ev) {
    ev.preventDefault();
    setErro('');
    setSucesso('');
    const e = validar();
    setErrosForm(e);
    if (Object.keys(e).length) return;

    setSalvando(true);
    try {
      const payload = { nome: form.nome.trim(), tipo: form.tipo };
      if (editandoId) {
        await api.put(`/fontes-destinos/${editandoId}`, payload);
        setSucesso('Fonte/destino atualizada com sucesso.');
      } else {
        await api.post('/fontes-destinos', payload);
        setSucesso('Fonte/destino cadastrada com sucesso.');
      }
      limparFormulario();
      await carregar();
    } catch (err) {
      setErrosForm(err.campos || {});
      setErro(err.message || 'Erro ao salvar fonte/destino.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(conta) {
    if (!window.confirm(`Deseja realmente excluir "${conta.nome}"?`)) return;
    setErro('');
    setSucesso('');
    try {
      await api.delete(`/fontes-destinos/${conta.id}`);
      setSucesso('Fonte/destino excluída com sucesso.');
      if (editandoId === conta.id) limparFormulario();
      await carregar();
    } catch (err) {
      setErro(err.message || 'Não foi possível excluir.');
    }
  }

  const rotuloTipo = (t) => TIPOS.find((x) => x.valor === t)?.rotulo || t;

  return (
    <section>
      <div className="page-header">
        <h1>Fontes e Destinos</h1>
      </div>

      {erro && <div className="alert alert-erro" role="alert">{erro}</div>}
      {sucesso && <div className="alert alert-sucesso" role="status">{sucesso}</div>}

      <div className="grid-2">
        <form className="card" onSubmit={salvar} noValidate>
          <h2>{editandoId ? 'Editar registro' : 'Nova fonte / destino'}</h2>

          <label>
            Nome
            <input
              type="text"
              placeholder="Ex.: Conta corrente, Carteira, Salário..."
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
            {errosForm.nome && <span className="msg msg-erro">{errosForm.nome}</span>}
          </label>

          <label>
            Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
            {errosForm.tipo && <span className="msg msg-erro">{errosForm.tipo}</span>}
          </label>

          <div className="form-actions">
            {editandoId && (
              <button type="button" className="btn btn-secondary" onClick={limparFormulario}>
                Cancelar
              </button>
            )}
            <button type="submit" className="btn" disabled={salvando}>
              {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Adicionar'}
            </button>
          </div>
        </form>

        <div className="card">
          <h2>Fontes e destinos cadastrados</h2>

          {carregando ? (
            <div className="empty-state">Carregando...</div>
          ) : contas.length === 0 ? (
            <div className="empty-state">Nenhuma fonte ou destino cadastrado.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th className="th-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contas.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.nome}</strong></td>
                      <td><span className="badge badge-neutro">{rotuloTipo(c.tipo)}</span></td>
                      <td>
                        <div className="td-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => iniciarEdicao(c)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => excluir(c)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
