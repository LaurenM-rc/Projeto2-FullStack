import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatarMoeda, formatarData, mesAtualISO, periodoDoMes } from '../utils/formatters.js';

export default function Dashboard() {
  const [mes, setMes] = useState(mesAtualISO());
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [porCategoria, setPorCategoria] = useState([]);
  const [ultimosLancamentos, setUltimosLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const { inicio, fim } = periodoDoMes(mes);
      const qs = `?inicio=${inicio}&fim=${fim}`;
      // Totais e últimos lançamentos vêm da listagem; despesas por categoria, do relatório
      const [lancRes, catRes] = await Promise.all([
        api.get(`/lancamentos${qs}&pagina=1&porPagina=5`),
        api.get(`/relatorios/categorias${qs}`),
      ]);
      setUltimosLancamentos(lancRes.lancamentos);
      setResumo(lancRes.totais);
      setPorCategoria(catRes.categorias.filter((c) => c.total > 0));
    } catch (err) {
      setErro(err.message || 'Não foi possível carregar o resumo do dashboard.');
    } finally {
      setCarregando(false);
    }
  }, [mes]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totalCat = porCategoria.reduce(
    (acc, c) => acc + Number(c.total ?? c.valor ?? 0),
    0
  );

  return (
    <section>
      <div className="page-header">
        <h1>Dashboard Financeiro</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            Período:
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </label>
          <Link to="/lancamentos" className="btn">
            + Novo lançamento
          </Link>
        </div>
      </div>

      {erro && <div className="alert alert-erro" role="alert">{erro}</div>}

      {/* Indicadores principais */}
      <div className="grid-kpis">
        <div className="kpi-card">
          <div className="kpi-label">Entradas no Período</div>
          <div className="kpi-value valor-entrada">{formatarMoeda(resumo.entradas)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Saídas no Período</div>
          <div className="kpi-value valor-saida">{formatarMoeda(resumo.saidas)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Saldo Consolidado</div>
          <div
            className={`kpi-value ${
              resumo.saldo >= 0 ? 'valor-entrada' : 'valor-saida'
            }`}
          >
            {formatarMoeda(resumo.saldo)}
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="card empty-state">Carregando indicadores e resumo...</div>
      ) : (
        <div className="grid-equal">
          {/* Gráfico de despesas por categoria */}
          <div className="card">
            <div className="page-header" style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ margin: 0 }}>Despesas por Categoria</h2>
              <Link to="/relatorios" style={{ fontSize: '0.85rem', color: 'var(--primaria)' }}>
                Ver relatórios completos
              </Link>
            </div>

            {porCategoria.length === 0 ? (
              <div className="empty-state">Nenhuma despesa registrada neste período.</div>
            ) : (
              <div className="chart-list">
                {porCategoria.map((c, idx) => {
                  const nome = c.categoria || c.nome || `Categoria #${idx + 1}`;
                  const valor = Number(c.total ?? c.valor ?? 0);
                  const perc =
                    c.percentual != null
                      ? Number(c.percentual)
                      : totalCat > 0
                      ? (valor / totalCat) * 100
                      : 0;

                  return (
                    <div key={c.categoriaId || c.id || idx}>
                      <div className="chart-item-header">
                        <strong>{nome}</strong>
                        <span>
                          {formatarMoeda(valor)} ({perc.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="chart-bar-bg">
                        <div
                          className="chart-bar-fill saida"
                          style={{ width: `${Math.min(100, Math.max(2, perc))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Últimos lançamentos */}
          <div className="card">
            <div className="page-header" style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ margin: 0 }}>Últimos Lançamentos</h2>
              <Link to="/lancamentos" style={{ fontSize: '0.85rem', color: 'var(--primaria)' }}>
                Ver todos
              </Link>
            </div>

            {ultimosLancamentos.length === 0 ? (
              <div className="empty-state">Nenhum lançamento cadastrado ainda.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th className="th-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimosLancamentos.map((l) => (
                      <tr key={l.id}>
                        <td>{formatarData(l.data)}</td>
                        <td>{l.descricao}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
