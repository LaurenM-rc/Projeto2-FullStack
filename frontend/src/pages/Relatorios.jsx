import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { formatarMoeda, mesAtualISO } from '../utils/formatters.js';

export default function Relatorios() {
  const [aba, setAba] = useState('categorias');
  const [mes, setMes] = useState(mesAtualISO());
  const [tipoCat, setTipoCat] = useState('saida');

  const [relCategorias, setRelCategorias] = useState([]);
  const [relFontes, setRelFontes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const qsCat = `?mes=${encodeURIComponent(mes)}&tipo=${encodeURIComponent(tipoCat)}`;
      const qsFonte = `?mes=${encodeURIComponent(mes)}`;

      const [resCat, resFontes] = await Promise.all([
        api.get(`/relatorios/categorias${qsCat}`),
        api.get(`/relatorios/fontes-destinos${qsFonte}`).catch(() =>
          api.get(`/relatorios/contas${qsFonte}`)
        ),
      ]);

      const listaCat = Array.isArray(resCat)
        ? resCat
        : resCat?.itens || resCat?.categorias || [];
      const listaFontes = Array.isArray(resFontes)
        ? resFontes
        : resFontes?.itens || resFontes?.fontesDestinos || resFontes?.contas || [];

      setRelCategorias(listaCat);
      setRelFontes(listaFontes);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar dados dos relatórios.');
    } finally {
      setCarregando(false);
    }
  }, [mes, tipoCat]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const totalGeralCat = relCategorias.reduce(
    (acc, item) => acc + Number(item.total ?? item.valor ?? 0),
    0
  );

  const maxValorFonte = relFontes.reduce((max, f) => {
    const ent = Number(f.entradas ?? f.totalEntradas ?? 0);
    const sai = Number(f.saidas ?? f.totalSaidas ?? 0);
    return Math.max(max, ent, sai);
  }, 0);

  return (
    <section>
      <div className="page-header">
        <h1>Relatórios e Análises</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            Período:
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${aba === 'categorias' ? 'active' : ''}`}
          onClick={() => setAba('categorias')}
        >
          Por Categoria (com Comparativo)
        </button>
        <button
          type="button"
          className={`tab-btn ${aba === 'fontes' ? 'active' : ''}`}
          onClick={() => setAba('fontes')}
        >
          Por Fonte / Destino (Contas e Cartões)
        </button>
      </div>

      {erro && <div className="alert alert-erro" role="alert">{erro}</div>}

      {aba === 'categorias' ? (
        <div className="card">
          <div className="page-header">
            <h2 style={{ margin: 0 }}>
              Relatório por Categoria ({tipoCat === 'saida' ? 'Saídas' : 'Entradas'})
            </h2>
            <select value={tipoCat} onChange={(e) => setTipoCat(e.target.value)}>
              <option value="saida">Saídas (Despesas)</option>
              <option value="entrada">Entradas (Receitas)</option>
            </select>
          </div>

          {carregando ? (
            <div className="empty-state">Gerando relatório por categoria...</div>
          ) : relCategorias.length === 0 ? (
            <div className="empty-state">Nenhum dado encontrado para o período selecionado.</div>
          ) : (
            <div className="grid-equal">
              {/* Gráfico de barras proporcionais */}
              <div>
                <h3>Distribuição gráfica (%)</h3>
                <div className="chart-list" style={{ marginTop: '0.75rem' }}>
                  {relCategorias.map((item, idx) => {
                    const nome = item.categoria || item.nome || `Categoria #${idx + 1}`;
                    const total = Number(item.total ?? item.valor ?? 0);
                    const perc =
                      item.percentual != null
                        ? Number(item.percentual)
                        : totalGeralCat > 0
                        ? (total / totalGeralCat) * 100
                        : 0;

                    return (
                      <div key={item.categoriaId || item.id || idx}>
                        <div className="chart-item-header">
                          <strong>{nome}</strong>
                          <span>
                            {formatarMoeda(total)} ({perc.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="chart-bar-bg">
                          <div
                            className={`chart-bar-fill ${
                              tipoCat === 'entrada' ? 'entrada' : 'saida'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(2, perc))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabela com totais, percentuais e comparação com período anterior */}
              <div>
                <h3>Tabela comparativa com período anterior</h3>
                <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Categoria</th>
                        <th className="th-right">Atual</th>
                        <th className="th-right">%</th>
                        <th className="th-right">Período Ant.</th>
                        <th className="th-right">Variação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relCategorias.map((item, idx) => {
                        const nome = item.categoria || item.nome || `Categoria #${idx + 1}`;
                        const total = Number(item.total ?? item.valor ?? 0);
                        const anterior = Number(
                          item.totalAnterior ??
                            item.periodoAnterior ??
                            item.valorAnterior ??
                            0
                        );
                        const perc =
                          item.percentual != null
                            ? Number(item.percentual)
                            : totalGeralCat > 0
                            ? (total / totalGeralCat) * 100
                            : 0;
                        const variacao =
                          item.variacaoPercentual != null
                            ? Number(item.variacaoPercentual)
                            : anterior > 0
                            ? ((total - anterior) / anterior) * 100
                            : total > 0
                            ? 100
                            : 0;

                        return (
                          <tr key={item.categoriaId || item.id || idx}>
                            <td><strong>{nome}</strong></td>
                            <td className="td-right">{formatarMoeda(total)}</td>
                            <td className="td-right">{perc.toFixed(1)}%</td>
                            <td className="td-right">{formatarMoeda(anterior)}</td>
                            <td className="td-right">
                              <span
                                className={`badge ${
                                  variacao > 0
                                    ? tipoCat === 'saida'
                                      ? 'badge-saida'
                                      : 'badge-entrada'
                                    : variacao < 0
                                    ? tipoCat === 'saida'
                                      ? 'badge-entrada'
                                      : 'badge-saida'
                                    : 'badge-neutro'
                                }`}
                              >
                                {variacao > 0 ? '+' : ''}
                                {variacao.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h2>Relatório por Fonte / Destino (Entradas, Saídas e Saldo)</h2>

          {carregando ? (
            <div className="empty-state">Gerando relatório por fonte/destino...</div>
          ) : relFontes.length === 0 ? (
            <div className="empty-state">Nenhum dado encontrado para o período selecionado.</div>
          ) : (
            <div className="grid-equal">
              {/* Gráfico comparativo de entradas vs saídas por fonte/destino */}
              <div>
                <h3>Gráfico Entradas vs. Saídas</h3>
                <div className="chart-list" style={{ marginTop: '0.75rem' }}>
                  {relFontes.map((f, idx) => {
                    const nome = f.nome || f.fonteDestino || f.conta || `Conta #${idx + 1}`;
                    const ent = Number(f.entradas ?? f.totalEntradas ?? 0);
                    const sai = Number(f.saidas ?? f.totalSaidas ?? 0);
                    const wEnt = maxValorFonte > 0 ? (ent / maxValorFonte) * 100 : 0;
                    const wSai = maxValorFonte > 0 ? (sai / maxValorFonte) * 100 : 0;

                    return (
                      <div key={f.id || f.fonteDestinoId || idx}>
                        <div className="chart-item-header">
                          <strong>{nome}</strong>
                          <span>
                            <span className="valor-entrada">+{formatarMoeda(ent)}</span> •{' '}
                            <span className="valor-saida">-{formatarMoeda(sai)}</span>
                          </span>
                        </div>
                        <div
                          style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}
                        >
                          <div className="chart-bar-bg">
                            <div
                              className="chart-bar-fill entrada"
                              style={{ width: `${wEnt}%` }}
                              title={`Entradas: ${formatarMoeda(ent)}`}
                            />
                          </div>
                          <div className="chart-bar-bg">
                            <div
                              className="chart-bar-fill saida"
                              style={{ width: `${wSai}%` }}
                              title={`Saídas: ${formatarMoeda(sai)}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabela consolidada */}
              <div>
                <h3>Consolidado por Fonte / Destino</h3>
                <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Fonte / Destino</th>
                        <th className="th-right">Entradas</th>
                        <th className="th-right">Saídas</th>
                        <th className="th-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relFontes.map((f, idx) => {
                        const nome = f.nome || f.fonteDestino || f.conta || `Conta #${idx + 1}`;
                        const ent = Number(f.entradas ?? f.totalEntradas ?? 0);
                        const sai = Number(f.saidas ?? f.totalSaidas ?? 0);
                        const saldo = Number(f.saldo ?? ent - sai);

                        return (
                          <tr key={f.id || f.fonteDestinoId || idx}>
                            <td><strong>{nome}</strong></td>
                            <td className="td-right valor-entrada">{formatarMoeda(ent)}</td>
                            <td className="td-right valor-saida">{formatarMoeda(sai)}</td>
                            <td
                              className={`td-right ${
                                saldo >= 0 ? 'valor-entrada' : 'valor-saida'
                              }`}
                            >
                              <strong>{formatarMoeda(saldo)}</strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
