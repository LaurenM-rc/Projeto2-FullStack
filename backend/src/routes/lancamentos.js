import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { validarLancamento } from '../middlewares/validacao.js';
import { buscarCategoria } from '../models/Categoria.js';
import { buscarFonteDestino } from '../models/FonteDestino.js';
import { criarLancamento, formatarLancamento } from '../models/Lancamento.js';

const router = Router();
router.use(autenticar);

const rotulo = { entrada: 'entrada', saida: 'saída' };

router.post('/', validarLancamento, async (req, res, next) => {
  try {
    const { tipo, descricao, valor, data, categoriaId, fonteDestinoId } = req.body;

    // Categoria e fonte/destino precisam ser do usuário logado (RF3)
    const categoria = await buscarCategoria(categoriaId, req.usuarioId);
    if (!categoria) {
      return res.status(404).json({
        erro: 'Categoria não encontrada.',
        campos: { categoriaId: 'A categoria informada não existe.' },
      });
    }

    const fonte = await buscarFonteDestino(fonteDestinoId, req.usuarioId);
    if (!fonte) {
      return res.status(404).json({
        erro: 'Fonte/destino não encontrada.',
        campos: { fonteDestinoId: 'A fonte/destino informada não existe.' },
      });
    }

    if (categoria.tipo !== tipo) {
      return res.status(400).json({
        erro: 'Dados inválidos.',
        campos: {
          categoriaId: `A categoria informada é de ${rotulo[categoria.tipo]}, mas o lançamento é de ${rotulo[tipo]}.`,
        },
      });
    }

    const lancamento = await criarLancamento(req.usuarioId, {
      tipo,
      descricao: descricao.trim(),
      valor: Number(valor),
      data,
      categoria_id: categoria.id,
      fonte_destino_id: fonte.id,
    });
    return res.status(201).json(formatarLancamento(lancamento));
  } catch (erro) {
    return next(erro);
  }
});

export default router;