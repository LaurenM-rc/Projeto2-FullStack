const MS_DIA = 24 * 60 * 60 * 1000;

const paraMs = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};
const paraISO = (ms) => new Date(ms).toISOString().slice(0, 10);

// Verdadeiro se o período vai do dia 1 ao último dia de um mesmo mês
function ehMesCompleto(inicio, fim) {
  const [a, m, d] = inicio.split('-').map(Number);
  if (d !== 1) return false;
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return fim === paraISO(Date.UTC(a, m - 1, ultimo));
}

// Mês inteiro -> mês anterior inteiro. Outro período -> período anterior de mesmo tamanho.
export function periodoAnterior(inicio, fim) {
  if (ehMesCompleto(inicio, fim)) {
    const [a, m] = inicio.split('-').map(Number);
    return {
      inicio: paraISO(Date.UTC(a, m - 2, 1)),
      fim: paraISO(Date.UTC(a, m - 1, 0)),
    };
  }
  const dias = Math.round((paraMs(fim) - paraMs(inicio)) / MS_DIA) + 1;
  const fimAnterior = paraMs(inicio) - MS_DIA;
  return {
    inicio: paraISO(fimAnterior - (dias - 1) * MS_DIA),
    fim: paraISO(fimAnterior),
  };
}

// Data de hoje no formato AAAA-MM-DD (fuso do servidor)
export function hojeISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}