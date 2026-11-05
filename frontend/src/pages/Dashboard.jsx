import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatarMoeda, formatarData, mesAtualISO } from '../utils/formatters.js';

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
      const qs = `?mes=${encodeURIComponent(mes)}`;
      // Tenta buscar de /relatorios/resumo ou /dashboard, com fallback para /lancamentos e /relatorios/categorias
      const [resumoRes, catRes, lancRes] = await Promise.all([
        api.get(`/relatorios/resumo${qs}`).catch(() => api.get(`/dashboard${qs}`).catch(() => null)),
        api.get(`/relatorios/categorias${qs}&tipo=saida`).catch(() => []),
        api.get(`/lancamentos?limit=5&page=1`).catch(() => []),
      ]);

      const listaLanc = Array.isArray(lancRes)
        ? lancRes
        : lancRes?.itens || lancRes?.lancamentos || lancRes?.data || [];
      setUltimosLancamentos(listaLanc.slice(0, 5));

      const listaCat = Array.isArray(catRes)
        ? catRes
        : catRes?.itens || catRes?.categorias || [];
      setPorCategoria(listaCat);

      if (resumoRes) {
        const ent = Number(resumoRes.entradas ?? resumoRes.totalEntradas ?? 0);
        const sai = Number(resumoRes.saidas ?? resumoRes.totalSaidas ?? 0);
        setResumo({
          entradas: ent,
          saidas: sai,
          saldo: Number(resumoRes.saldo ?? ent - sai),
        });
      } else if (lancRes?.totais || lancRes?.resumo) {
        const t = lancRes.totais || lancRes.resumo;
        const ent = Number(t.entradas ?? t.totalEntradas ?? 0);
        const sai = Number(t.saidas ?? t.totalSaidas ?? 0);
        setResumo({ entradas: ent, saidas: sai, saldo: Number(t.saldo ?? ent - sai) });
      } else {
        const ent = listaLanc
          .filter((l) => l.tipo === 'entrada')
          .reduce((acc, l) => acc + Number(l.valor || 0), 0);
        const sai = listaLanc
          .filter((l) => l.tipo === 'saida')
          .reduce((acc, l) => acc + Number(l.valor || 0), 0);
        setResumo({ entradas: ent, saidas: sai, saldo: ent - sai });
      }
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
