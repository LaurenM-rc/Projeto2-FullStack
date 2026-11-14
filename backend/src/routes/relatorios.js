import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { validarPeriodo } from '../middlewares/validacao.js';
import { totaisPorCategoria } from '../models/Relatorio.js';
import { periodoAnterior } from '../models/datas.js';

const router = Router();
router.use(autenticar);

// Arredonda em centavos (evita 0.1 + 0.2 = 0.30000000000000004)
const dinheiro = (x) => Math.round(Number(x) * 100) / 100;
const porcentagem = (parte, todo) => (todo > 0 ? Math.round((parte / todo) * 10000) / 100 : 0);

router.get('/categorias', validarPeriodo, async (req, res, next) => {
  try {
    const { inicio, fim } = req.query;
    const comparado = periodoAnterior(inicio, fim);

    const [saidasAtual, saidasAnterior, entradasAtual] = await Promise.all([
      totaisPorCategoria(req.usuarioId, 'saida', inicio, fim),
      totaisPorCategoria(req.usuarioId, 'saida', comparado.inicio, comparado.fim),
      totaisPorCategoria(req.usuarioId, 'entrada', inicio, fim),
    ]);

    const totalSaidas = dinheiro(saidasAtual.reduce((soma, c) => soma + Number(c.total), 0));
    const totalEntradas = dinheiro(entradasAtual.reduce((soma, c) => soma + Number(c.total), 0));

    // Junta as categorias que aparecem no período atual ou no anterior
    const atualPorId = new Map(saidasAtual.map((c) => [c.id, c]));
    const anteriorPorId = new Map(saidasAnterior.map((c) => [c.id, c]));
    const ids = new Set([...atualPorId.keys(), ...anteriorPorId.keys()]);

    const categorias = [...ids]
      .map((id) => {
        const atual = atualPorId.get(id);
        const anterior = anteriorPorId.get(id);
        const total = dinheiro(atual?.total ?? 0);
        const totalAnterior = dinheiro(anterior?.total ?? 0);
        return {
          id,
          nome: (atual ?? anterior).nome,
          total,
          percentual: porcentagem(total, totalSaidas),
          periodoAnterior: totalAnterior,
          variacao: dinheiro(total - totalAnterior),
          variacaoPercentual:
            totalAnterior > 0 ? porcentagem(total - totalAnterior, totalAnterior) : null,
        };
      })
      .sort((a, b) => b.total - a.total);

    const entradas = entradasAtual
      .map((c) => ({ id: c.id, nome: c.nome, total: dinheiro(c.total) }))
      .sort((a, b) => b.total - a.total);

    return res.json({
      periodo: { inicio, fim },
      periodoComparado: comparado,
      totalSaidas,
      totalEntradas,
      categorias,
      entradas,
    });
  } catch (erro) {
    return next(erro);
  }
});

export default router;