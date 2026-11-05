import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { formatarMoeda, formatarData, hojeISO } from '../utils/formatters.js';

const FORM_INICIAL = {
  tipo: 'saida',
  descricao: '',
  valor: '',
  data: hojeISO(),
  categoriaId: '',
  fonteDestinoId: '',
  totalParcelas: '1',
};

const FILTROS_INICIAIS = {
  dataInicio: '',
  dataFim: '',
  tipo: '',
  categoriaId: '',
  fonteDestinoId: '',
  pagina: 1,
  limite: 10,
};

function calcularPreviewParcelas(valorTotal, qtd) {
  const n = Number(qtd) || 1;
  const totalCentavos = Math.round(Number(valorTotal || 0) * 100);
  if (n <= 1 || totalCentavos <= 0) return [];
  const base = Math.floor(totalCentavos / n);
  const resto = totalCentavos - base * n;
  return Array.from({ length: n }, (_, i) => {
    const centavos = i === 0 ? base + resto : base;
    return centavos / 100;
  });
}

export default function Lancamentos() {
  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);

  const [lancamentos, setLancamentos] = useState([]);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [errosForm, setErrosForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  // Carrega categorias e contas/cartões para os selects
  useEffect(() => {
    async function carregarAuxiliares() {
      try {
        const [catsRes, contasRes] = await Promise.all([
          api.get('/categorias').catch(() => []),
          api.get('/contas').catch(() => []),
        ]);
        const listaCats = Array.isArray(catsRes)
          ? catsRes
          : catsRes?.itens || catsRes?.categorias || [];
        const listaContas = Array.isArray(contasRes)
          ? contasRes
          : contasRes?.itens || contasRes?.contas || contasRes?.fontesDestinos || [];

        setCategorias(listaCats);
        setContas(listaContas);
      } catch {
        // Silencioso; erros principais aparecem na listagem
      }
    }
    carregarAuxiliares();
  }, []);

  const carregarLancamentos = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const params = new URLSearchParams();
      if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
      if (filtros.tipo) params.set('tipo', filtros.tipo);
      if (filtros.categoriaId) params.set('categoriaId', filtros.categoriaId);
      if (filtros.fonteDestinoId) params.set('fonteDestinoId', filtros.fonteDestinoId);
      params.set('page', String(filtros.pagina));
      params.set('limit', String(filtros.limite));

      const qs = params.toString() ? `?${params.toString()}` : '';
      const dados = await api.get(`/lancamentos${qs}`);

      const itens = Array.isArray(dados)
        ? dados
        : dados?.itens || dados?.lancamentos || dados?.data || [];

      setLancamentos(itens);

      // Se o backend enviar os totais agregados, usa; caso contrário calcula da página atual
      if (dados?.totais || dados?.resumo) {
        const t = dados.totais || dados.resumo;
        const ent = Number(t.entradas ?? t.totalEntradas ?? 0);
        const sai = Number(t.saidas ?? t.totalSaidas ?? 0);
        setTotais({
          entradas: ent,
          saidas: sai,
          saldo: Number(t.saldo ?? ent - sai),
        });
      } else {
        const ent = itens
          .filter((l) => l.tipo === 'entrada')
          .reduce((acc, l) => acc + Number(l.valor || 0), 0);
        const sai = itens
          .filter((l) => l.tipo === 'saida')
          .reduce((acc, l) => acc + Number(l.valor || 0), 0);
        setTotais({ entradas: ent, saidas: sai, saldo: ent - sai });
      }

      const pag = dados?.paginacao || dados?.meta || dados;
      const totPag = Number(pag?.totalPaginas ?? pag?.totalPages ?? 1) || 1;
      const totReg = Number(pag?.total ?? pag?.totalItens ?? itens.length) || 0;
      setTotalPaginas(totPag);
      setTotalRegistros(totReg);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar lançamentos.');
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => {
    carregarLancamentos();
  }, [carregarLancamentos]);

  // Categorias compatíveis com o tipo selecionado no formulário (checklist: saída não aceita entrada)
  const categoriasDoTipo = categorias.filter((c) => c.tipo === form.tipo);

  // Verifica se a fonte/destino selecionada é um cartão de crédito
  const contaSelecionada = contas.find((c) => String(c.id) === String(form.fonteDestinoId));
  const ehCompraCartao =
    form.tipo === 'saida' &&
    Boolean(
      contaSelecionada &&
        (contaSelecionada.tipo === 'cartao_credito' ||
          contaSelecionada.ehCartao ||
          contaSelecionada.limite)
    );

  function alterarTipoForm(novoTipo) {
    // Limpa categoria se não for compatível com o novo tipo
    const catAtual = categorias.find((c) => String(c.id) === String(form.categoriaId));
    const novaCatId = catAtual && catAtual.tipo === novoTipo ? form.categoriaId : '';
    setForm({
      ...form,
      tipo: novoTipo,
      categoriaId: novaCatId,
      totalParcelas: novoTipo === 'entrada' ? '1' : form.totalParcelas,
    });
  }

  function limparFormulario() {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setErrosForm({});
  }

  function iniciarEdicao(lanc) {
    setErro('');
    setSucesso('');
    setEditandoId(lanc.id);
    setForm({
      tipo: lanc.tipo || 'saida',
      descricao: lanc.descricao || '',
      valor: String(lanc.valor ?? ''),
      data: (lanc.data || hojeISO()).slice(0, 10),
      categoriaId: String(lanc.categoriaId ?? lanc.categoria_id ?? lanc.categoria?.id ?? ''),
      fonteDestinoId: String(
        lanc.fonteDestinoId ?? lanc.contaId ?? lanc.fonte_destino_id ?? lanc.conta?.id ?? ''
      ),
      totalParcelas: String(lanc.totalParcelas ?? lanc.total_parcelas ?? 1),
    });
    setErrosForm({});
  }

  function validar() {
    const e = {};
    const v = Number(form.valor);
    if (!form.descricao.trim()) e.descricao = 'Informe uma descrição.';
    if (!form.valor || Number.isNaN(v) || v <= 0) e.valor = 'Informe um valor maior que zero.';
    if (!form.data) e.data = 'Informe a data.';
    if (!form.categoriaId) {
      e.categoriaId = 'Selecione uma categoria compatível.';
    } else {
      const cat = categorias.find((c) => String(c.id) === String(form.categoriaId));
      if (cat && cat.tipo !== form.tipo) {
        e.categoriaId = `Um lançamento de ${form.tipo} não aceita categoria de ${cat.tipo}.`;
      }
    }
    if (!form.fonteDestinoId) e.fonteDestinoId = 'Selecione a conta ou cartão.';
    const parc = Number(form.totalParcelas || 1);
    if (parc < 1 || parc > 48) e.totalParcelas = 'Parcelas devem ser entre 1 e 48.';
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
        tipo: form.tipo,
        descricao: form.descricao.trim(),
        valor: Number(form.valor),
        data: form.data,
        categoriaId: Number(form.categoriaId),
        fonteDestinoId: Number(form.fonteDestinoId),
        contaId: Number(form.fonteDestinoId),
        totalParcelas: ehCompraCartao ? Number(form.totalParcelas || 1) : 1,
      };

      if (editandoId) {
        await api.put(`/lancamentos/${editandoId}`, payload);
        setSucesso('Lançamento atualizado com sucesso.');
      } else {
        await api.post('/lancamentos', payload);
        setSucesso('Lançamento registrado com sucesso.');
      }
      limparFormulario();
      await carregarLancamentos();
    } catch (err) {
      setErro(err.message || 'Erro ao salvar lançamento.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(lanc) {
    if (!window.confirm(`Deseja realmente excluir o lançamento "${lanc.descricao}"?`)) return;
    setErro('');
    setSucesso('');
    try {
      await api.delete(`/lancamentos/${lanc.id}`);
      setSucesso('Lançamento excluído com sucesso.');
      if (editandoId === lanc.id) limparFormulario();
      await carregarLancamentos();
    } catch (err) {
      setErro(err.message || 'Erro ao excluir lançamento.');
    }
  }

  const previewParcelas = ehCompraCartao
    ? calcularPreviewParcelas(form.valor, form.totalParcelas)
    : [];

  const nomeCategoria = (l) => {
    if (l.categoria?.nome) return l.categoria.nome;
    if (l.categoriaNome || l.categoria_nome) return l.categoriaNome || l.categoria_nome;
    const c = categorias.find(
      (cat) => String(cat.id) === String(l.categoriaId ?? l.categoria_id)
    );
    return c?.nome || '-';
  };

  const nomeFonte = (l) => {
    if (l.fonteDestino?.nome || l.conta?.nome) return l.fonteDestino?.nome || l.conta?.nome;
    if (l.fonteDestinoNome || l.contaNome) return l.fonteDestinoNome || l.contaNome;
    const f = contas.find(
      (ct) =>
        String(ct.id) === String(l.fonteDestinoId ?? l.contaId ?? l.fonte_destino_id)
    );
    return f?.nome || '-';
  };

  return (
    <section>
      <div className="page-header">
        <h1>Lançamentos (Entradas e Saídas)</h1>
      </div>

      {/* Resumo / Totais da listagem (Critério 7) */}
      <div className="grid-kpis">
        <div className="kpi-card">
          <div className="kpi-label">Total de Entradas</div>
          <div className="kpi-value valor-entrada">{formatarMoeda(totais.entradas)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total de Saídas</div>
          <div className="kpi-value valor-saida">{formatarMoeda(totais.saidas)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Saldo do Período</div>
          <div
            className={`kpi-value ${totais.saldo >= 0 ? 'valor-entrada' : 'valor-saida'}`}
          >
            {formatarMoeda(totais.saldo)}
          </div>
        </div>
      </div>

      {erro && <div className="alert alert-erro" role="alert">{erro}</div>}
      {sucesso && <div className="alert alert-sucesso" role="status">{sucesso}</div>}

      <div className="grid-2">
        {/* Formulário de Criação/Edição */}
        <form className="card" onSubmit={salvar} noValidate>
          <h2>{editandoId ? 'Editar lançamento' : 'Novo lançamento'}</h2>

          <label>
            Tipo de lançamento
            <select value={form.tipo} onChange={(e) => alterarTipoForm(e.target.value)}>
              <option value="saida">Saída (Despesa)</option>
              <option value="entrada">Entrada (Receita)</option>
            </select>
          </label>

          <label>
            Descrição
            <input
              type="text"
              placeholder="Ex.: Compra no mercado, Salário..."
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
            {errosForm.descricao && <span className="msg msg-erro">{errosForm.descricao}</span>}
          </label>

          <div className="form-row">
            <label>
              Valor total (R$)
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
              {errosForm.valor && <span className="msg msg-erro">{errosForm.valor}</span>}
            </label>

            <label>
              Data
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
              {errosForm.data && <span className="msg msg-erro">{errosForm.data}</span>}
            </label>
          </div>

          <label>
            Categoria ({form.tipo === 'entrada' ? 'Entradas' : 'Saídas'})
            <select
              value={form.categoriaId}
              onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
            >
              <option value="">Selecione...</option>
              {categoriasDoTipo.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {errosForm.categoriaId && (
              <span className="msg msg-erro">{errosForm.categoriaId}</span>
            )}
          </label>

          <label>
            Fonte / Destino (Conta ou Cartão)
            <select
              value={form.fonteDestinoId}
              onChange={(e) => setForm({ ...form, fonteDestinoId: e.target.value })}
            >
              <option value="">Selecione...</option>
              {contas.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.nome}
                </option>
              ))}
            </select>
            {errosForm.fonteDestinoId && (
              <span className="msg msg-erro">{errosForm.fonteDestinoId}</span>
            )}
          </label>

          {ehCompraCartao && !editandoId && (
            <label>
              Número de parcelas (Cartão de Crédito)
              <input
                type="number"
                min="1"
                max="48"
                value={form.totalParcelas}
                onChange={(e) => setForm({ ...form, totalParcelas: e.target.value })}
              />
              {errosForm.totalParcelas && (
                <span className="msg msg-erro">{errosForm.totalParcelas}</span>
              )}
              {previewParcelas.length > 1 && (
                <div className="alert alert-info" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                  <strong>Divisão exata de centavos ({previewParcelas.length}x):</strong>
                  <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    1ª parcela: <strong>{formatarMoeda(previewParcelas[0])}</strong> • Demais (
                    {previewParcelas.length - 1}x):{' '}
                    <strong>{formatarMoeda(previewParcelas[1])}</strong> (Soma:{' '}
                    {formatarMoeda(
                      previewParcelas.reduce((acc, v) => acc + v, 0)
                    )}
                    )
                  </div>
                </div>
              )}
            </label>
          )}

          <div className="form-actions">
            {editandoId && (
              <button type="button" className="btn btn-secondary" onClick={limparFormulario}>
                Cancelar
              </button>
            )}
            <button type="submit" className="btn" disabled={salvando}>
              {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Registrar'}
            </button>
          </div>
        </form>

        {/* Listagem com Filtros e Paginação */}
        <div className="card">
          <h2>Histórico e Filtros</h2>

          <div className="form-row" style={{ marginBottom: '1rem' }}>
            <label style={{ marginBottom: 0 }}>
              De
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) =>
                  setFiltros({ ...filtros, dataInicio: e.target.value, pagina: 1 })
                }
              />
            </label>
            <label style={{ marginBottom: 0 }}>
              Até
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) =>
                  setFiltros({ ...filtros, dataFim: e.target.value, pagina: 1 })
                }
              />
            </label>
            <label style={{ marginBottom: 0 }}>
              Tipo
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value, pagina: 1 })}
              >
                <option value="">Todos</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
              </select>
            </label>
            <label style={{ marginBottom: 0 }}>
              Categoria
              <select
                value={filtros.categoriaId}
                onChange={(e) =>
                  setFiltros({ ...filtros, categoriaId: e.target.value, pagina: 1 })
                }
              >
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ marginBottom: 0 }}>
              Conta / Cartão
              <select
                value={filtros.fonteDestinoId}
                onChange={(e) =>
                  setFiltros({ ...filtros, fonteDestinoId: e.target.value, pagina: 1 })
                }
              >
                <option value="">Todas</option>
                {contas.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {carregando ? (
            <div className="empty-state">Carregando lançamentos...</div>
          ) : lancamentos.length === 0 ? (
            <div className="empty-state">Nenhum lançamento encontrado para os filtros aplicados.</div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Fonte / Destino</th>
                      <th className="th-right">Valor</th>
                      <th className="th-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lancamentos.map((l) => {
                      const numParc = l.numeroParcela ?? l.numero_parcela;
                      const totParc = l.totalParcelas ?? l.total_parcelas;
                      return (
                        <tr key={l.id}>
                          <td>{formatarData(l.data)}</td>
                          <td>
                            <strong>{l.descricao}</strong>
                            {totParc > 1 && (
                              <span
                                className="badge badge-cartao"
                                style={{ marginLeft: '0.4rem' }}
                              >
                                {numParc ? `${numParc}/${totParc}` : `${totParc}x`}
                              </span>
                            )}
                          </td>
                          <td>{nomeCategoria(l)}</td>
                          <td>{nomeFonte(l)}</td>
                          <td
                            className={`td-right ${
                              l.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida'
                            }`}
                          >
                            <strong>
                              {l.tipo === 'entrada' ? '+ ' : '- '}
                              {formatarMoeda(l.valor)}
                            </strong>
                          </td>
                          <td>
                            <div className="td-actions">
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => iniciarEdicao(l)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => excluir(l)}
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

              <div className="pagination">
                <span>
                  Página {filtros.pagina} de {totalPaginas}
                  {totalRegistros ? ` (${totalRegistros} registro(s))` : ''}
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={filtros.pagina <= 1}
                    onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina - 1 })}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={filtros.pagina >= totalPaginas}
                    onClick={() => setFiltros({ ...filtros, pagina: filtros.pagina + 1 })}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
