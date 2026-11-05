export const somenteDigitos = (v) => String(v || '').replace(/\D/g, '');

export function mascararCpf(valor) {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export const formatarMoeda = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarData = (iso) => {
  if (!iso) return '-';
  const dataLimpa = String(iso).slice(0, 10);
  return new Date(dataLimpa + 'T00:00:00').toLocaleDateString('pt-BR');
};

export const hojeISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const mesAtualISO = () => hojeISO().slice(0, 7);
