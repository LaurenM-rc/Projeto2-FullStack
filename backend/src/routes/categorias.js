import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { validarCategoria } from '../middlewares/validacao.js';
import {
  listarCategorias,
  buscarCategoria,
  criarCategoria,
  atualizarCategoria,
  excluirCategoria,
  contarLancamentos,
} from '../models/Categoria.js';

const router = Router();
router.use(autenticar);

// id inválido (ex.: /api/categorias/abc) vira 404 em vez de erro do banco
router.param('id', (req, res, next, valor) => {
  if (!/^\d+$/.test(valor)) {
    return res.status(404).json({ erro: 'Categoria não encontrada.' });
  }
  next();
});

const duplicada = (erro) => erro.original?.code === '23505';
const respostaDuplicada = (res) =>
  res.status(409).json({
    erro: 'Categoria já existe.',
    campos: { nome: 'Já existe uma categoria com este nome e tipo.' },
  });

router.get('/', async (req, res) => {
  res.json(await listarCategorias(req.usuarioId));
});

router.post('/', validarCategoria, async (req, res, next) => {
  try {
    const categoria = await criarCategoria(req.usuarioId, {
      nome: req.body.nome.trim(),
      tipo: req.body.tipo,
    });
    return res.status(201).json(categoria);
  } catch (erro) {
    if (duplicada(erro)) return respostaDuplicada(res);
    return next(erro);
  }
});

router.put('/:id', validarCategoria, async (req, res, next) => {
  try {
    const categoria = await buscarCategoria(req.params.id, req.usuarioId);
    if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' });

    const { nome, tipo } = req.body;
    if (tipo !== categoria.tipo && (await contarLancamentos(categoria.id, req.usuarioId)) > 0) {
      return res.status(409).json({
        erro: 'Não é possível mudar o tipo de uma categoria que já tem lançamentos.',
        campos: { tipo: 'Esta categoria já tem lançamentos.' },
      });
    }

    const atualizada = await atualizarCategoria(categoria, { nome: nome.trim(), tipo });
    return res.json(atualizada);
  } catch (erro) {
    if (duplicada(erro)) return respostaDuplicada(res);
    return next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const categoria = await buscarCategoria(req.params.id, req.usuarioId);
    if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' });

    if ((await contarLancamentos(categoria.id, req.usuarioId)) > 0) {
      return res.status(409).json({
        erro: 'Não é possível excluir uma categoria que tem lançamentos associados.',
      });
    }

    await excluirCategoria(categoria);
    return res.status(204).send();
  } catch (erro) {
    if (erro.original?.code === '23503') {
      return res.status(409).json({
        erro: 'Não é possível excluir uma categoria que tem lançamentos associados.',
      });
    }
    return next(erro);
  }
});

export default router;