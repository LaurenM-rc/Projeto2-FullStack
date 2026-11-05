import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { formatarMoeda, formatarData, mesAtualISO } from '../utils/formatters.js';

const FORM_INICIAL = {
  nome: '',
  limite: '',
  diaFechamento: '',
  diaVencimento: '',
};

export default function Cartoes() {
  const [cartoes, setCartoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [errosForm, setErrosForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  const [cartaoSelecionadoId, setCartaoSelecionadoId] = useState('');
  const [mesRef, setMesRef] = useState(mesAtualISO());
  const [faturaDados, setFaturaDados] = useState(null);
  const [carregandoFatura, setCarregandoFatura] = useState(false);
  const [erroFatura, setErroFatura] = useState('');

  const carregarCartoes = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      let lista = [];
      try {
        const res = await api.get('/cartoes');
        lista = Array.isArray(res) ? res : res?.itens || res?.cartoes || [];
      } catch {
        const resContas = await api.get('/contas');
        const todas = Array.isArray(resContas)
          ? resContas
          : resContas?.itens || resContas?.contas || [];
        lista = todas.filter(
          (c) => c.tipo === 'cartao_credito' || c.ehCartao || Boolean(c.limite)
        );
      }
      setCartoes(lista);
      setCartaoSelecionadoId((atual) => {
        if (atual && lista.some((c) => String(c.id) === String(atual))) return atual;
        return lista[0]?.id ? String(lista[0].id) : '';
      });
    } catch (err) {
      setErro(err.message || 'Erro ao carregar cartões.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarCartoes();
  }, [carregarCartoes]);

  const carregarFatura = useCallback(async () => {
    if (!cartaoSelecionadoId) {
      setFaturaDados(null);
      return;
    }
    setCarregandoFatura(true);
    setErroFatura('');
    try {
      const qs = mesRef ? `?mes=${encodeURIComponent(mesRef)}` : '';
      const dados = await api.get(`/cartoes/${cartaoSelecionadoId}/faturas${qs}`);
      setFaturaDados(dados);
    } catch (err) {
      setFaturaDados(null);
      setErroFatura(err.message || 'Não foi possível carregar a previsão de faturas.');
    } finally {
      setCarregandoFatura(false);
    }
  }, [cartaoSelecionadoId, mesRef]);

  useEffect(() => {
    carregarFatura();
  }, [carregarFatura]);

  function limparFormulario() {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setErrosForm({});
  }

  function iniciarEdicao(cartao) {
    setErro('');
    setSucesso('');
    setEditandoId(cartao.id);
    setForm({
      nome: cartao.nome || '',
      limite: cartao.limite != null ? String(cartao.limite) : '',
      diaFechamento: String(cartao.diaFechamento ?? cartao.dia_fechamento ?? ''),
      diaVencimento: String(cartao.diaVencimento ?? cartao.dia_vencimento ?? ''),
    });
    setErrosForm({});
  }

  function validar() {
    const e = {};
    const lim = Number(form.limite);
    const fech = Number(form.diaFechamento);
    const venc = Number(form.diaVencimento);
    if (!form.nome.trim()) e.nome = 'Informe o nome do cartão.';
    if (!form.limite || Number.isNaN(lim) || lim <= 0) e.limite = 'Informe um limite positivo.';
    if (!fech || fech < 1 || fech > 31) e.diaFechamento = 'Dia entre 1 e 31.';
    if (!venc || venc < 1 || venc > 31) e.diaVencimento = 'Dia entre 1 e 31.';
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
      const payload = {
        nome: form.nome.trim(),
        tipo: 'cartao_credito',
        ehCartao: true,
        limite: Number(form.limite),
        diaFechamento: Number(form.diaFechamento),
        diaVencimento: Number(form.diaVencimento),
      };

      if (editandoId) {
        await api.put(`/cartoes/${editandoId}`, payload);
        setSucesso('Cartão atualizado com sucesso.');
      } else {
        await api.post('/cartoes', payload);
        setSucesso('Cartão cadastrado com sucesso.');
      }
      limparFormulario();
      await carregarCartoes();
      await carregarFatura();
    } catch (err) {
      setErro(err.message || 'Erro ao salvar cartão.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(cartao) {
    if (!window.confirm(`Deseja realmente excluir o cartão "${cartao.nome}"?`)) return;
    setErro('');
    setSucesso('');
    try {
      await api.delete(`/cartoes/${cartao.id}`);
      setSucesso('Cartão excluído com sucesso.');
      if (editandoId === cartao.id) limparFormulario();
      await carregarCartoes();
    } catch (err) {
      setErro(
        err.message || 'Não foi possível excluir o cartão. Verifique se há compras vinculadas.'
      );
    }
  }

  const cartaoAtual = cartoes.find((c) => String(c.id) === String(cartaoSelecionadoId));
  const limiteTotal = Number(
    faturaDados?.limite ?? faturaDados?.limiteTotal ?? cartaoAtual?.limite ?? 0
  );
  const limiteUtilizado = Number(
    faturaDados?.limiteUtilizado ??
      faturaDados?.limite_utilizado ??
      cartaoAtual?.limiteUtilizado ??
      0
  );
  const limiteDisponivel = Number(
    faturaDados?.limiteDisponivel ??
      faturaDados?.limite_disponivel ??
      Math.max(0, limiteTotal - limiteUtilizado)
  );
  const percentualUso =
    limiteTotal > 0 ? Math.min(100, Math.round((limiteUtilizado / limiteTotal) * 100)) : 0;

  const previsoes = Array.isArray(faturaDados?.previsoes)
    ? faturaDados.previsoes
    : Array.isArray(faturaDados?.faturas)
    ? faturaDados.faturas
    : Array.isArray(faturaDados)
    ? faturaDados
    : [];

  const itensFaturaAtual =
    faturaDados?.itens ||
    faturaDados?.lancamentos ||
    faturaDados?.faturaAtual?.itens ||
    previsoes[0]?.itens ||
    [];

  return (
    <section>
      <div className="page-header">
        <h1>Cartões de Crédito e Previsão de Faturas</h1>
      </div>

      {erro && <div className="alert alert-erro" role="alert">{erro}</div>}
      {sucesso && <div className="alert alert-sucesso" role="status">{sucesso}</div>}

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <form className="card" onSubmit={salvar} noValidate>
          <h2>{editandoId ? 'Editar cartão' : 'Novo cartão'}</h2>

          <label>
            Nome do cartão
            <input
              type="text"
              placeholder="Ex.: Nubank, Inter Visa..."
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
            {errosForm.nome && <span className="msg msg-erro">{errosForm.nome}</span>}
          </label>

          <label>
            Limite total (R$)
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex.: 5000.00"
              value={form.limite}
              onChange={(e) => setForm({ ...form, limite: e.target.value })}
            />
            {errosForm.limite && <span className="msg msg-erro">{errosForm.limite}</span>}
          </label>

          <div className="form-row">
            <label>
              Dia de fechamento
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ex.: 10"
                value={form.diaFechamento}
                onChange={(e) => setForm({ ...form, diaFechamento: e.target.value })}
              />
              {errosForm.diaFechamento && (
                <span className="msg msg-erro">{errosForm.diaFechamento}</span>
              )}
            </label>

            <label>
              Dia de vencimento
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ex.: 17"
                value={form.diaVencimento}
                onChange={(e) => setForm({ ...form, diaVencimento: e.target.value })}
              />
              {errosForm.diaVencimento && (
                <span className="msg msg-erro">{errosForm.diaVencimento}</span>
              )}
            </label>
          </div>

          <div className="form-actions">
            {editandoId && (
              <button type="button" className="btn btn-secondary" onClick={limparFormulario}>
                Cancelar
              </button>
            )}
            <button type="submit" className="btn" disabled={salvando}>
              {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar cartão'}
            </button>
          </div>
        </form>

        <div className="card">
          <h2>Meus cartões</h2>
          {carregando ? (
            <div className="empty-state">Carregando cartões...</div>
          ) : cartoes.length === 0 ? (
            <div className="empty-state">Nenhum cartão cadastrado.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cartão</th>
                    <th>Fechamento / Vencimento</th>
                    <th className="th-right">Limite</th>
                    <th className="th-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cartoes.map((c) => {
                    const fech = c.diaFechamento ?? c.dia_fechamento;
                    const venc = c.diaVencimento ?? c.dia_vencimento;
                    return (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.nome}</strong>
                        </td>
                        <td>
                          Fecha dia {fech} • Vence dia {venc}
                        </td>
                        <td className="td-right">{formatarMoeda(c.limite)}</td>
                        <td>
                          <div className="td-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setCartaoSelecionadoId(String(c.id))}
                            >
                              Ver faturas
                            </button>
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

      {/* Seção de Faturas e Previsões */}
      <div className="card">
        <div className="page-header">
          <h2 style={{ margin: 0 }}>Faturas, Limite e Previsão de Parcelas Futuras</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={cartaoSelecionadoId}
              onChange={(e) => setCartaoSelecionadoId(e.target.value)}
              aria-label="Selecionar cartão"
            >
              {cartoes.length === 0 && <option value="">Nenhum cartão</option>}
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={mesRef}
              onChange={(e) => setMesRef(e.target.value)}
              aria-label="Mês de referência"
            />
          </div>
        </div>

        {!cartaoSelecionadoId ? (
          <div className="empty-state">
            Cadastre e selecione um cartão para consultar faturas e limite disponível.
          </div>
        ) : carregandoFatura ? (
          <div className="empty-state">Calculando faturas e limite...</div>
        ) : erroFatura ? (
          <div className="alert alert-erro">{erroFatura}</div>
        ) : (
          <>
            <div className="grid-kpis">
              <div className="kpi-card">
                <div className="kpi-label">Limite Total</div>
                <div className="kpi-value">{formatarMoeda(limiteTotal)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Limite Utilizado (Parcelas em aberto)</div>
                <div className="kpi-value valor-saida">{formatarMoeda(limiteUtilizado)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Limite Disponível</div>
                <div className="kpi-value valor-entrada">{formatarMoeda(limiteDisponivel)}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="chart-item-header">
                <span>Uso do limite ({percentualUso}%)</span>
                <span>
                  {formatarMoeda(limiteUtilizado)} de {formatarMoeda(limiteTotal)}
                </span>
              </div>
              <div className="chart-bar-bg">
                <div
                  className="chart-bar-fill saida"
                  style={{ width: `${percentualUso}%` }}
                />
              </div>
              {cartaoAtual && (
                <p style={{ fontSize: '0.82rem', color: 'var(--texto-suave)', marginTop: '0.4rem' }}>
                  Regra de fechamento: compras realizadas a partir do dia{' '}
                  <strong>{cartaoAtual.diaFechamento ?? cartaoAtual.dia_fechamento}</strong> entram
                  na fatura do mês seguinte.
                </p>
              )}
            </div>

            <h3>Previsão das próximas faturas</h3>
            {previsoes.length === 0 ? (
              <div className="empty-state">Nenhuma previsão de fatura retornada para o período.</div>
            ) : (
              <div className="grid-kpis" style={{ marginTop: '0.75rem' }}>
                {previsoes.map((f, idx) => (
                  <div key={f.mes || f.competencia || idx} className="kpi-card">
                    <div className="kpi-label">
                      Fatura {f.mes || f.competencia || f.referencia || `#${idx + 1}`}
                      {f.vencimento ? ` • Vence em ${formatarData(f.vencimento)}` : ''}
                    </div>
                    <div className="kpi-value valor-saida">
                      {formatarMoeda(f.total ?? f.valor ?? 0)}
                    </div>
                    {f.quantidadeItens != null && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--texto-suave)' }}>
                        {f.quantidadeItens} lançamento(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {itensFaturaAtual.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h3>Lançamentos / parcelas na fatura selecionada</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data da Compra</th>
                        <th>Descrição</th>
                        <th>Parcela</th>
                        <th className="th-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensFaturaAtual.map((item, i) => (
                        <tr key={item.id || i}>
                          <td>{formatarData(item.data || item.dataCompra)}</td>
                          <td>{item.descricao}</td>
                          <td>
                            {item.numeroParcela && item.totalParcelas
                              ? `${item.numeroParcela}/${item.totalParcelas}`
                              : item.parcela || 'À vista'}
                          </td>
                          <td className="td-right valor-saida">
                            {formatarMoeda(item.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
