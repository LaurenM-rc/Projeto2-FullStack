import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { formatarMoeda } from '../utils/formatters.js';

const TIPOS_CONTA = [
  { valor: 'conta_corrente', rotulo: 'Conta Corrente' },
  { valor: 'poupanca', rotulo: 'Poupança / Reserva' },
  { valor: 'carteira', rotulo: 'Carteira / Dinheiro' },
  { valor: 'investimento', rotulo: 'Investimento' },
  { valor: 'cartao_credito', rotulo: 'Cartão de Crédito' },
];

const FORM_INICIAL = {
  nome: '',
  tipo: 'conta_corrente',
  saldoInicial: '0',
  limite: '',
  diaFechamento: '',
  diaVencimento: '',
};

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
      const dados = await api.get('/contas');
      setContas(
        Array.isArray(dados) ? dados : dados?.itens || dados?.contas || dados?.fontesDestinos || []
      );
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
    const ehCartao = conta.tipo === 'cartao_credito' || conta.ehCartao || Boolean(conta.limite);
    setForm({
      nome: conta.nome || '',
      tipo: ehCartao ? 'cartao_credito' : conta.tipo || 'conta_corrente',
      saldoInicial: String(conta.saldoInicial ?? conta.saldo_inicial ?? 0),
      limite: conta.limite != null ? String(conta.limite) : '',
      diaFechamento:
        conta.diaFechamento ?? conta.dia_fechamento
          ? String(conta.diaFechamento ?? conta.dia_fechamento)
          : '',
      diaVencimento:
        conta.diaVencimento ?? conta.dia_vencimento
          ? String(conta.diaVencimento ?? conta.dia_vencimento)
          : '',
    });
    setErrosForm({});
  }

  function validar() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Informe o nome da conta ou fonte/destino.';
    if (form.tipo === 'cartao_credito') {
      const lim = Number(form.limite);
      const fech = Number(form.diaFechamento);
      const venc = Number(form.diaVencimento);
      if (!form.limite || Number.isNaN(lim) || lim <= 0) {
        e.limite = 'Informe um limite maior que zero.';
      }
      if (!fech || fech < 1 || fech > 31) {
        e.diaFechamento = 'Dia entre 1 e 31.';
      }
      if (!venc || venc < 1 || venc > 31) {
        e.diaVencimento = 'Dia entre 1 e 31.';
      }
    }
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
      const ehCartao = form.tipo === 'cartao_credito';
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        ehCartao,
        saldoInicial: ehCartao ? 0 : Number(form.saldoInicial || 0),
        ...(ehCartao
          ? {
              limite: Number(form.limite),
              diaFechamento: Number(form.diaFechamento),
              diaVencimento: Number(form.diaVencimento),
            }
          : {}),
      };

      if (editandoId) {
        await api.put(`/contas/${editandoId}`, payload);
        setSucesso('Fonte/destino atualizada com sucesso.');
      } else {
        await api.post('/contas', payload);
        setSucesso('Fonte/destino cadastrada com sucesso.');
      }
      limparFormulario();
      await carregar();
    } catch (err) {
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
      await api.delete(`/contas/${conta.id}`);
      setSucesso('Fonte/destino excluída com sucesso.');
      if (editandoId === conta.id) limparFormulario();
      await carregar();
    } catch (err) {
      setErro(
        err.message ||
          'Não foi possível excluir. Verifique se existem lançamentos vinculados a este registro.'
      );
    }
  }

  const rotuloTipo = (t) => TIPOS_CONTA.find((x) => x.valor === t)?.rotulo || t || 'Conta';

  return (
    <section>
      <div className="page-header">
        <h1>Contas (Fontes e Destinos)</h1>
      </div>

      {erro && <div className="alert alert-erro" role="alert">{erro}</div>}
      {sucesso && <div className="alert alert-sucesso" role="status">{sucesso}</div>}

      <div className="grid-2">
        <form className="card" onSubmit={salvar} noValidate>
          <h2>{editandoId ? 'Editar registro' : 'Nova conta / fonte'}</h2>

          <label>
            Nome
            <input
              type="text"
              placeholder="Ex.: Banco Itaú, Carteira, Nubank..."
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
              {TIPOS_CONTA.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>

          {form.tipo !== 'cartao_credito' ? (
            <label>
              Saldo inicial (R$)
              <input
                type="number"
                step="0.01"
                value={form.saldoInicial}
                onChange={(e) => setForm({ ...form, saldoInicial: e.target.value })}
              />
            </label>
          ) : (
            <>
              <label>
                Limite do cartão (R$)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex.: 3500.00"
                  value={form.limite}
                  onChange={(e) => setForm({ ...form, limite: e.target.value })}
                />
                {errosForm.limite && <span className="msg msg-erro">{errosForm.limite}</span>}
              </label>

              <div className="form-row">
                <label>
                  Dia fechamento
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="1 a 31"
                    value={form.diaFechamento}
                    onChange={(e) => setForm({ ...form, diaFechamento: e.target.value })}
                  />
                  {errosForm.diaFechamento && (
                    <span className="msg msg-erro">{errosForm.diaFechamento}</span>
                  )}
                </label>

                <label>
                  Dia vencimento
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="1 a 31"
                    value={form.diaVencimento}
                    onChange={(e) => setForm({ ...form, diaVencimento: e.target.value })}
                  />
                  {errosForm.diaVencimento && (
                    <span className="msg msg-erro">{errosForm.diaVencimento}</span>
                  )}
                </label>
              </div>
            </>
          )}

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
            <div className="empty-state">Carregando contas...</div>
          ) : contas.length === 0 ? (
            <div className="empty-state">Nenhuma fonte ou destino cadastrado.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Detalhes / Saldo</th>
                    <th className="th-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contas.map((c) => {
                    const ehCartao =
                      c.tipo === 'cartao_credito' || c.ehCartao || Boolean(c.limite);
                    const fech = c.diaFechamento ?? c.dia_fechamento;
                    const venc = c.diaVencimento ?? c.dia_vencimento;
                    const saldo = c.saldoAtual ?? c.saldo ?? c.saldoInicial ?? c.saldo_inicial ?? 0;

                    return (
                      <tr key={c.id}>
                        <td><strong>{c.nome}</strong></td>
                        <td>
                          <span className={`badge ${ehCartao ? 'badge-cartao' : 'badge-neutro'}`}>
                            {rotuloTipo(c.tipo)}
                          </span>
                        </td>
                        <td>
                          {ehCartao ? (
                            <span>
                              Limite: {formatarMoeda(c.limite)}
                              {fech ? ` • Fecha dia ${fech}` : ''}
                              {venc ? ` • Vence dia ${venc}` : ''}
                            </span>
                          ) : (
                            <span>Saldo: {formatarMoeda(saldo)}</span>
                          )}
                        </td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
