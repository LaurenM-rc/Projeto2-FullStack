// Divide o valor em n parcelas, trabalhando em centavos (inteiros).
// A sobra do arredondamento vai para a primeira parcela.
// Ex.: dividirEmParcelas(100, 3) -> [33.34, 33.33, 33.33]
export function dividirEmParcelas(valor, n) {
  const totalCentavos = Math.round(valor * 100);
  const base = Math.floor(totalCentavos / n);
  const sobra = totalCentavos - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? sobra : 0)) / 100);
}