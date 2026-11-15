// ---------- Datas (em UTC, para evitar problema de fuso horário) ----------
function ultimoDiaDoMes(ano, mes) {
  // mes: 0 a 11
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

// Aceita mes > 11 e ajusta dia 31 em meses curtos (fechamento 31 em fevereiro vira 28)
function dataSegura(ano, mes, dia) {
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return new Date(Date.UTC(a, m, Math.min(dia, ultimoDiaDoMes(a, m))));
}

// ---------- Em que fatura cai uma compra (regra de fechamento do enunciado) ----------
// dataCompra: 'AAAA-MM-DD'; cartao: { diaFechamento, diaVencimento }
export function calcularFatura(dataCompra, cartao, numeroParcela = 1) {
  const [ano, mes, dia] = dataCompra.split('-').map(Number);
  const m = mes - 1;
  const fechamentoDoMes = Math.min(cartao.diaFechamento, ultimoDiaDoMes(ano, m));

  // antes do fechamento: fatura deste mês; no dia ou depois: mês seguinte
  let mesFechamento = dia < fechamentoDoMes ? m : m + 1;
  mesFechamento += numeroParcela - 1; // parcelas seguintes: meses seguintes

  const fechamento = dataSegura(ano, mesFechamento, cartao.diaFechamento);
  const mesVencimento =
    cartao.diaVencimento > cartao.diaFechamento ? mesFechamento : mesFechamento + 1;
  const vencimento = dataSegura(ano, mesVencimento, cartao.diaVencimento);

  const iso = (d) => d.toISOString().slice(0, 10);
  return {
    referencia: iso(vencimento).slice(0, 7),
    fechamento: iso(fechamento),
    vencimento: iso(vencimento),
  };
}

// ---------- Monta as faturas de um cartão ----------
const emCentavos = (valor) => Math.round(Number(valor) * 100);

// cartao: registro de fontes_destinos; lancamentos: saídas deste cartão;
// hoje: 'AAAA-MM-DD'; meses: quantas faturas futuras mostrar depois da aberta
export function montarFaturas(cartao, lancamentos, hoje, meses) {
  const config = { diaFechamento: cartao.dia_fechamento, diaVencimento: cartao.dia_vencimento };
  const faturas = new Map(); // referencia -> fatura

  // A fatura aberta e as próximas aparecem sempre, mesmo vazias
  for (let k = 1; k <= meses + 1; k++) {
    const f = calcularFatura(hoje, config, k);
    faturas.set(f.referencia, {
      ...f,
      situacao: k === 1 ? 'aberta' : 'futura',
      totalCentavos: 0,
      lancamentos: [],
    });
  }

  let limiteUtilizado = 0; // em centavos
  for (const l of lancamentos) {
    const f = calcularFatura(l.data, config, l.parcela_atual);
    if (f.vencimento < hoje) continue; // fatura já vencida: considerada paga

    const centavos = emCentavos(l.valor);
    limiteUtilizado += centavos; // compromete o limite até vencer

    if (!faturas.has(f.referencia)) {
      if (f.fechamento > hoje) continue; // fatura futura além dos meses pedidos
      // já fechou, mas ainda não venceu
      faturas.set(f.referencia, { ...f, situacao: 'fechada', totalCentavos: 0, lancamentos: [] });
    }

    const fatura = faturas.get(f.referencia);
    fatura.totalCentavos += centavos;
    fatura.lancamentos.push({
      id: l.id,
      descricao: l.descricao,
      valor: centavos / 100,
      dataCompra: l.data,
      parcela: l.total_parcelas > 1 ? `${l.parcela_atual}/${l.total_parcelas}` : null,
    });
  }

  const limite = emCentavos(cartao.limite);
  return {
    id: cartao.id,
    nome: cartao.nome,
    diaFechamento: cartao.dia_fechamento,
    diaVencimento: cartao.dia_vencimento,
    limite: limite / 100,
    limiteUtilizado: limiteUtilizado / 100,
    limiteDisponivel: (limite - limiteUtilizado) / 100,
    faturas: [...faturas.values()]
      .sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1))
      .map((f) => ({
        referencia: f.referencia,
        situacao: f.situacao,
        fechamento: f.fechamento,
        vencimento: f.vencimento,
        total: f.totalCentavos / 100,
        lancamentos: f.lancamentos,
      })),
  };
}