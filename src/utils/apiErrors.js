/**
 * @file src/utils/apiErrors.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

// Pequena heurística para evitar mostrar ao utilizador mensagens cruas em inglês
// vindas de middlewares/validadores genéricos do backend (Zod, express, etc.)
// numa interface que é PT-PT. Sempre que a mensagem da API parece inglesa,
// usamos antes a fallback PT-PT do call-site.

// Padrões característicos de mensagens em inglês que costumam aparecer cruas
// nos erros do backend (auth middleware, validações Zod, parsing, etc.).
const ENGLISH_PATTERNS = [
  /\binvalid\b/i,
  /\brequired\b/i,
  /\bmissing\b/i,
  /\bnot\s+(authenticated|found|allowed|configured|authorized)\b/i,
  /\bforbidden\b/i,
  /\bunauthor[iz]ed\b/i,
  /\bcannot\b/i,
  /\bcould\s+not\b/i,
  /\bmust\s+(be|have)\b/i,
  /\bshould\s+(be|have)\b/i,
  /\bexpected\b/i,
  /\bunexpected\b/i,
  /\binternal\s+server\s+error\b/i,
  /\bbad\s+request\b/i,
];

// Heurísticas que indicam fortemente uma mensagem PT-PT (diacríticos típicos
// ou palavras comuns sem ambiguidade com inglês).
const PORTUGUESE_HINTS = [
  /[ãõáéíóúâêôûçÃÕÁÉÍÓÚÂÊÔÛÇ]/,
  /\b(não|já|sessão|pedido|aluno|professor|direção|gestão|estado|hora|inválid|aprovad|rejeitad|cancelad|finaliz|validaç|inscrição|inscrit)/i,
];

function isLikelyPortuguese(message) {
  return PORTUGUESE_HINTS.some((re) => re.test(message));
}

function looksLikeEnglish(message) {
  if (isLikelyPortuguese(message)) {
    return false;
  }
  return ENGLISH_PATTERNS.some((re) => re.test(message));
}

function extractApiMessage(error) {
  const data = error?.response?.data;
  const candidate = data?.error ?? data?.message ?? error?.message;
  if (typeof candidate !== 'string') {
    return '';
  }
  return candidate.trim();
}

/**
 * Devolve uma mensagem de erro adequada para exibir ao utilizador.
 *
 * - Se a API devolveu uma mensagem em PT-PT (ou plausivelmente PT-PT), usa-a.
 * - Se a mensagem parece em inglês (validação Zod, middleware genérico, etc.),
 *   ignora-a e usa a fallback PT-PT do call-site.
 * - Sem mensagem da API → usa a fallback.
 */
export function localizeApiError(error, fallback) {
  const apiMessage = extractApiMessage(error);
  if (!apiMessage) {
    return fallback;
  }
  if (looksLikeEnglish(apiMessage)) {
    return fallback;
  }
  return apiMessage;
}
