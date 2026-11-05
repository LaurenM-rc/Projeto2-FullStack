import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nome: '', tipo: 'saida' });
  const [errosForm, setErrosForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const dados = await api.get('/categorias');
      setCategorias(Array.isArray(dados) ? dados : dados?.itens || dados?.categorias || []);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar categorias.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function limparFormulario() {
    setEditandoId(null);
    setForm({ nome: '', tipo: 'saida' });
    setErrosForm({});
  }

  function iniciarEdicao(cat) {
    setSucesso('');
    setErro('');
    setEditandoId(cat.id);
    setForm({ nome: cat.nome || '', tipo: cat.tipo || 'saida' });
    setErrosForm({});
  }

  function validar() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Informe o nome da categoria.';
    if (!['entrada', 'saida'].includes(form.tipo)) e.tipo = 'Selecione um tipo válido.';
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
        await api.put(`/categorias/${editandoId}`, payload);
        setSucesso('Categoria atualizada com sucesso.');
      } else {
        await api.post('/categorias', payload);
        setSucesso('Categoria cadastrada com sucesso.');
      }
      limparFormulario();
      await carregar();
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar a categoria.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(cat) {
    if (!window.confirm(`Deseja realmente excluir a categoria "${cat.nome}"?`)) return;
    setErro('');
    setSucesso('');
    try {
      await api.delete(`/categorias/${cat.id}`);
      setSucesso('Categoria excluída com sucesso.');
      if (editandoId === cat.id) limparFormulario();
      await carregar();
    } catch (err) {
      setErro(
        err.message ||
          'Não foi possível excluir a categoria. Verifique se existem lançamentos vinculados.'
      );
    }
  }

  const categoriasFiltradas = filtroTipo
    ? categorias.filter((c) => c.tipo === filtroTipo)
    : categorias;

  return (
    <section>
      <div className="page-header">
        <h1>Categorias</h1>
      </div>

      {erro && <div className="alert alert-erro" role="alert">{erro}</div>}
      {sucesso && <div className="alert alert-sucesso" role="status">{sucesso}</div>}

      <div className="grid-2">
        <form className="card" onSubmit={salvar} noValidate>
          <h2>{editandoId ? 'Editar categoria' : 'Nova categoria'}</h2>

          <label>
            Nome
            <input
              type="text"
              placeholder="Ex.: Alimentação, Salário..."
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
            {errosForm.nome && <span className="msg msg-erro">{errosForm.nome}</span>}
          </label>

          <label>
            Tipo
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="saida">Saída (Despesa)</option>
              <option value="entrada">Entrada (Receita)</option>
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
          <div className="page-header" style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Categorias cadastradas</h2>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos os tipos</option>
              <option value="entrada">Apenas Entradas</option>
              <option value="saida">Apenas Saídas</option>
            </select>
          </div>

          {carregando ? (
            <div className="empty-state">Carregando categorias...</div>
          ) : categoriasFiltradas.length === 0 ? (
            <div className="empty-state">Nenhuma categoria encontrada.</div>
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
                  {categoriasFiltradas.map((cat) => (
                    <tr key={cat.id}>
                      <td>{cat.nome}</td>
                      <td>
                        <span
                          className={`badge ${
                            cat.tipo === 'entrada' ? 'badge-entrada' : 'badge-saida'
                          }`}
                        >
                          {cat.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => iniciarEdicao(cat)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => excluir(cat)}
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
