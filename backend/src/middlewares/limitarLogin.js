import rateLimit from 'express-rate-limit';

// Bloqueia depois de 10 tentativas de login FALHAS em 15 minutos (por IP)
export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});