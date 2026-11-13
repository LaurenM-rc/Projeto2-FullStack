import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { validarFonteDestino } from '../middlewares/validacao.js';
import {
  listarFontesDestinos,
  buscarFonteDestino,
  criarFonteDestino,
  atualizarFonteDestino,
  excluirFonteDestino,
  contarLancamentosDaFonte,
} from '../models/FonteDestino.js';

const router = Router();
router.use(autenticar);

router.param('id', (req, res, next, valor) => {
  if (!/^\d+$/.test(valor)) {
    return res.status(404).json({ erro: 'Fonte/destino não encontrada.' });
  }
  next();
});

// Monta os dados já limpos; para quem não é cartão, os campos do cartão ficam vazios
function montarDados(body) {
  const cartao = body.tipo === 'cartao_credito';
  return {
    nome: body.nome.trim(),
    tipo: body.tipo,
    dia_fechamento: cartao ? Number(body.dia_fechamento) : null,
    dia_vencimento: cartao ? Number(body.dia_vencimento) : null,
    limite: cartao ? Number(body.limite) : null,
  };
}

// O Sequelize devolve DECIMAL como texto; aqui o limite volta como número
const formatar = (fonte) => ({
  ...fonte.toJSON(),
  limite: fonte.limite === null ? null : Number(fonte.limite),
});

const duplicada = (erro) => erro.original?.code === '23505';
const respostaDuplicada = (res) =>
  res.status(409).json({
    erro: 'Fonte/destino já existe.',
    campos: { nome: 'Já existe uma fonte/destino com este nome.' },
  });
const respostaEmUso = (res) =>
  res.status(409).json({
    erro: 'Não é possível excluir uma fonte/destino que tem lançamentos associados.',
  });

router.get('/', async (req, res) => {
  const lista = await listarFontesDestinos(req.usuarioId);
  res.json(lista.map(formatar));
});

router.post('/', validarFonteDestino, async (req, res, next) => {
  try {
    const fonte = await criarFonteDestino(req.usuarioId, montarDados(req.body));
    return res.status(201).json(formatar(fonte));
  } catch (erro) {
    if (duplicada(erro)) return respostaDuplicada(res);
    return next(erro);
  }
});

router.put('/:id', validarFonteDestino, async (req, res, next) => {
  try {
    const fonte = await buscarFonteDestino(req.params.id, req.usuarioId);
    if (!fonte) return res.status(404).json({ erro: 'Fonte/destino não encontrada.' });

    if (req.body.tipo !== fonte.tipo && (await contarLancamentosDaFonte(fonte.id, req.usuarioId)) > 0) {
      return res.status(409).json({
        erro: 'Não é possível mudar o tipo de uma fonte/destino que já tem lançamentos.',
        campos: { tipo: 'Esta fonte/destino já tem lançamentos.' },
      });
    }

    const atualizada = await atualizarFonteDestino(fonte, montarDados(req.body));
    return res.json(formatar(atualizada));
  } catch (erro) {
    if (duplicada(erro)) return respostaDuplicada(res);
    return next(erro);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const fonte = await buscarFonteDestino(req.params.id, req.usuarioId);
    if (!fonte) return res.status(404).json({ erro: 'Fonte/destino não encontrada.' });

    if ((await contarLancamentosDaFonte(fonte.id, req.usuarioId)) > 0) {
      return respostaEmUso(res);
    }

    await excluirFonteDestino(fonte);
    return res.status(204).send();
  } catch (erro) {
    if (erro.original?.code === '23503') return respostaEmUso(res);
    return next(erro);
  }
});

export default router;