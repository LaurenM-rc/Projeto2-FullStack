import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { formatarMoeda, formatarData } from '../utils/formatters.js';

const FORM_INICIAL = { nome: '', limite: '', dia_fechamento: '', dia_vencimento: '' };

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
  const [faturaDados, setFaturaDados] = useState(null);
  const [carregandoFatura, setCarregandoFatura] = useState(false);
  const [erroFatura, setErroFatura] = useState('');

  const carregarCartoes = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const todas = await api.get('/fontes-destinos');
      const lista = todas.filter((f) => f.tipo === 'cartao_credito');
      setCartoes(lista);
      setCartaoSelecionadoId((atual) => {
        if (atual && lista.some((c) => String(c.id) === String(atual))) return atual;
        return lista[0] ? String(lista[0].id) : '';
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

  // Previsão das faturas de todos os cartões (calculadas no back-end); a tela mostra o selecionado
  const carregarFatura = useCallback(async () => {
    if (!cartaoSelecionadoId) {
      setFaturaDados(null);
      return;
    }
    setCarregandoFatura(true);
    setErroFatura('');
    try {
      const resposta = await api.get('/relatorios/faturas');
      const encontrado = resposta.cartoes.find((c) => String(c.id) === String(cartaoSelecionadoId));
      setFaturaDados(encontrado ?? null);
    } catch (err) {
      setFaturaDados(null);
      setErroFatura(err.message || 'Não foi possível carregar a previsão de faturas.');
    } finally {
      setCarregandoFatura(false);
    }
  }, [cartaoSelecionadoId]);

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
      nome: cartao.nome,
      limite: String(cartao.limite ?? ''),
      dia_fechamento: String(cartao.dia_fechamento ?? ''),
      dia_vencimento: String(cartao.dia_vencimento ?? ''),
    });
    setErrosForm({});
  }

  function validar() {
    const e = {};
    const lim = Number(form.limite);
    const fech = Number(form.dia_fechamento);
    const venc = Number(form.dia_vencimento);
    if (!form.nome.trim()) e.nome = 'Informe o nome do cartão.';
    if (!form.limite || Number.isNaN(lim) || lim <= 0) e.limite = 'Informe um limite maior que zero.';
    if (!Number.isInteger(fech) || fech < 1 || fech > 31) e.dia_fechamento = 'Dia entre 1 e 31.';
    if (!Number.isInteger(venc) || venc < 1 || venc > 31) e.dia_vencimento = 'Dia entre 1 e 31.';
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
        limite: Number(form.limite),
        dia_fechamento: Number(form.dia_fechamento),
        dia_vencimento: Number(form.dia_vencimento),
      };
      if (editandoId) {
        await api.put(`/fontes-destinos/${editandoId}`, payload);
        setSucesso('Cartão atualizado com sucesso.');
      } else {
        await api.post('/fontes-destinos', payload);
        setSucesso('Cartão cadastrado com sucesso.');
      }
      limparFormulario();
      await carregarCartoes();
      await carregarFatura();
    } catch (err) {
      setErrosForm(err.campos || {});
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
      await api.delete(`/fontes-destinos/${cartao.id}`);
      setSucesso('Cartão excluído com sucesso.');
      if (editandoId === cartao.id) limparFormulario();
      await carregarCartoes();
    } catch (err) {
      setErro(err.message || 'Não foi possível excluir o cartão.');
    }
  }

  const cartaoAtual = cartoes.find((c) => String(c.id) === String(cartaoSelecionadoId));
  const limiteTotal = Number(faturaDados?.limite ?? cartaoAtual?.limite ?? 0);
  const limiteUtilizado = Number(faturaDados?.limiteUtilizado ?? 0);
  const limiteDisponivel = Number(faturaDados?.limiteDisponivel ?? limiteTotal - limiteUtilizado);
  const percentualUso =
    limiteTotal > 0 ? Math.min(100, Math.round((limiteUtilizado / limiteTotal) * 100)) : 0;
  const faturas = faturaDados?.faturas || [];
  const fechamentoAtual = cartaoAtual?.dia_fechamento;

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
                value={form.dia_fechamento}
                onChange={(e) => setForm({ ...form, dia_fechamento: e.target.value })}
              />
              {errosForm.dia_fechamento && (
                <span className="msg msg-erro">{errosForm.dia_fechamento}</span>
              )}
            </label>

            <label>
              Dia de vencimento
              <input
                type="number"
                min="1"
                max="31"
                placeholder="Ex.: 17"
                value={form.dia_vencimento}
                onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
              />
              {errosForm.dia_vencimento && (
                <span className="msg msg-erro">{errosForm.dia_vencimento}</span>
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
                  {cartoes.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.nome}</strong></td>
                      <td>Fecha dia {c.dia_fechamento} • Vence dia {c.dia_vencimento}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="page-header">
          <h2 style={{ margin: 0 }}>Faturas, limite e previsão das próximas faturas</h2>
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
                <div className="kpi-label">Limite Utilizado</div>
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
                <div className="chart-bar-fill saida" style={{ width: `${percentualUso}%` }} />
              </div>
              {cartaoAtual && (
                <p style={{ fontSize: '0.82rem', color: 'var(--texto-suave)', marginTop: '0.4rem' }}>
                  Regra de fechamento: compras feitas a partir do dia{' '}
                  <strong>{cartaoAtual.dia_fechamento}</strong> (inclusive) entram na fatura do mês
                  seguinte.
                </p>
              )}
            </div>

            <h3>Próximas faturas</h3>
            {faturas.length === 0 ? (
              <div className="empty-state">Nenhuma fatura prevista para este cartão.</div>
            ) : (
              faturas.map((f) => (
                <div key={f.referencia} style={{ marginTop: '1rem' }}>
                  <div className="chart-item-header">
                    <strong>
                      Fatura {f.referencia}
                      {f.situacao === 'aberta' ? ' (aberta)' : f.situacao === 'fechada' ? ' (fechada)' : ''}
                      {f.vencimento ? ` • vence em ${formatarData(f.vencimento)}` : ''}
                    </strong>
                    <strong className="valor-saida">{formatarMoeda(f.total)}</strong>
                  </div>
                  {f.lancamentos?.length > 0 ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Data da compra</th>
                            <th>Descrição</th>
                            <th>Parcela</th>
                            <th className="th-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {f.lancamentos.map((item) => (
                            <tr key={item.id}>
                              <td>{formatarData(item.dataCompra)}</td>
                              <td>{item.descricao}</td>
                              <td>{item.parcela ?? 'À vista'}</td>
                              <td className="td-right valor-saida">{formatarMoeda(item.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--texto-suave)', margin: '0.4rem 0 0' }}>
                      Sem lançamentos nesta fatura.
                    </p>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </section>
  );
      }
