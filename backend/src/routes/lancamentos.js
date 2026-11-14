import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { validarLancamento, validarFiltrosLancamentos } from '../middlewares/validacao.js';
import { buscarCategoria } from '../models/Categoria.js';
import { buscarFonteDestino } from '../models/FonteDestino.js';
import {
  criarLancamentos,
  listarLancamentos,
  buscarLancamento,
  atualizarLancamento,
  excluirLancamento,
  formatarLancamento,
} from '../models/Lancamento.js';
import { dividirEmParcelas } from '../models/parcelas.js';

const router = Router();
router.use(autenticar);

router.param('id', (req, res, next, valor) => {
  if (!/^\d+$/.test(valor)) {
    return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  }
  next();
});

const rotulo = { entrada: 'entrada', saida: 'saída' };

// Primeiro e último dia do mês atual, no formato AAAA-MM-DD
function mesCorrente() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const pad = (n) => String(n).padStart(2, '0');
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return {
    inicio: `${ano}-${pad(mes + 1)}-01`,
    fim: `${ano}-${pad(mes + 1)}-${pad(ultimoDia)}`,
  };
}

// Confere se categoria e fonte/destino são do usuário (RF3) e se o tipo bate.
// Devolve { categoria, fonte } ou { falha: { status, corpo } }
async function conferirReferencias(usuarioId, { tipo, categoriaId, fonteDestinoId }) {
  const categoria = await buscarCategoria(categoriaId, usuarioId);
  if (!categoria) {
    return {
      falha: {
        status: 404,
        corpo: {
          erro: 'Categoria não encontrada.',
          campos: { categoriaId: 'A categoria informada não existe.' },
        },
      },
    };
  }

  const fonte = await buscarFonteDestino(fonteDestinoId, usuarioId);
  if (!fonte) {
    return {
      falha: {
        status: 404,
        corpo: {
          erro: 'Fonte/destino não encontrada.',
          campos: { fonteDestinoId: 'A fonte/destino informada não existe.' },
        },
      },
    };
  }

  if (categoria.tipo !== tipo) {
    return {
      falha: {
        status: 400,
        corpo: {
          erro: 'Dados inválidos.',
          campos: {
            categoriaId: `A categoria informada é de ${rotulo[categoria.tipo]}, mas o lançamento é de ${rotulo[tipo]}.`,
          },
        },
      },
    };
  }

  return { categoria, fonte };
}

// Listagem com filtros, paginação e totais
router.get('/', validarFiltrosLancamentos, async (req, res, next) => {
  try {
    const { tipo, categoriaId, fonteDestinoId } = req.query;
    const periodo =
      req.query.inicio === undefined
        ? mesCorrente()
        : { inicio: req.query.inicio, fim: req.query.fim };
    const pagina = Number(req.query.pagina ?? 1);
    const porPagina = Number(req.query.porPagina ?? 20);

    const { lancamentos, total, entradas, saidas } = await listarLancamentos(
      req.usuarioId,
      {
        ...periodo,
        tipo,
        categoriaId: categoriaId && Number(categoriaId),
        fonteDestinoId: fonteDestinoId && Number(fonteDestinoId),
      },
      pagina,
      porPagina
    );

    return res.json({
      periodo,
      totais: { entradas, saidas, saldo: Math.round((entradas - saidas) * 100) / 100 },
      paginacao: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
      lancamentos: lancamentos.map(formatarLancamento),
    });
  } catch (erro) {
    return next(erro);
  }
});

// Criação (com parcelas, se houver)
router.post('/', validarLancamento, async (req, res, next) => {
  try {
    const { tipo, descricao, valor, data, categoriaId, fonteDestinoId } = req.body;
    const p = req.body.parcelas;
    const numeroParcelas = p === undefined || p === null || p === '' ? 1 : Number(p);

    const ref = await conferirReferencias(req.usuarioId, { tipo, categoriaId, fonteDestinoId });
    if (ref.falha) return res.status(ref.falha.status).json(ref.falha.corpo);
    const { categoria, fonte } = ref;

    // Parcelamento: só saídas no cartão de crédito
    if (numeroParcelas > 1) {
      if (tipo !== 'saida' || fonte.tipo !== 'cartao_credito') {
        return res.status(400).json({
          erro: 'Dados inválidos.',
          campos: { parcelas: 'Só é possível parcelar saídas em cartão de crédito.' },
        });
      }
      if (Math.round(Number(valor) * 100) < numeroParcelas) {
        return res.status(400).json({
          erro: 'Dados inválidos.',
          campos: { parcelas: 'O valor é pequeno demais para este número de parcelas.' },
        });
      }
    }

    const valoresParcelas = dividirEmParcelas(Number(valor), numeroParcelas);
    const criados = await criarLancamentos(
      req.usuarioId,
      {
        tipo,
        descricao: descricao.trim(),
        data,
        categoria_id: categoria.id,
        fonte_destino_id: fonte.id,
      },
      valoresParcelas
    );
    return res.status(201).json(criados.map(formatarLancamento));
  } catch (erro) {
    return next(erro);
  }
});

// Detalhe
router.get('/:id', async (req, res, next) => {
  try {
    const lancamento = await buscarLancamento(req.params.id, req.usuarioId);
    if (!lancamento) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    return res.json(formatarLancamento(lancamento));
  } catch (erro) {
    return next(erro);
  }
});

// Edição (o campo "parcelas" é ignorado aqui)
router.put('/:id', validarLancamento, async (req, res, next) => {
  try {
    const lancamento = await buscarLancamento(req.params.id, req.usuarioId);
    if (!lancamento) return res.status(404).json({ erro: 'Lançamento não encontrado.' });

    const { tipo, descricao, valor, data, categoriaId, fonteDestinoId } = req.body;
    const ref = await conferirReferencias(req.usuarioId, { tipo, categoriaId, fonteDestinoId });
    if (ref.falha) return res.status(ref.falha.status).json(ref.falha.corpo);

    const dados = {
      tipo,
      descricao: descricao.trim(),
      valor: Number(valor),
      data,
      categoria_id: ref.categoria.id,
      fonte_destino_id: ref.fonte.id,
    };

    // Compra parcelada: só descrição e categoria podem mudar
    if (lancamento.total_parcelas > 1) {
      const mudouAlgoProibido =
        dados.tipo !== lancamento.tipo ||
        dados.valor !== Number(lancamento.valor) ||
        dados.data !== lancamento.data ||
        dados.fonte_destino_id !== lancamento.fonte_destino_id;
      if (mudouAlgoProibido) {
        return res.status(409).json({
          erro: 'Em compra parcelada só é possível alterar descrição e categoria. Para mudar valor, data, tipo ou cartão, exclua todas as parcelas e lance de novo.',
        });
      }
    }

    const atualizado = await atualizarLancamento(lancamento, dados);
    return res.json(formatarLancamento(atualizado));
  } catch (erro) {
    return next(erro);
  }
});

// Exclusão: só esta parcela, ou todas com ?todasParcelas=true
router.delete('/:id', async (req, res, next) => {
  try {
    const lancamento = await buscarLancamento(req.params.id, req.usuarioId);
    if (!lancamento) return res.status(404).json({ erro: 'Lançamento não encontrado.' });

    await excluirLancamento(lancamento, req.query.todasParcelas === 'true');
    return res.status(204).send();
  } catch (erro) {
    return next(erro);
  }
});

export default router;