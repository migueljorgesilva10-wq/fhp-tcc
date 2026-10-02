// Senhas (scrypt) e tokens de sessão — apenas módulos nativos do Node
const crypto = require('crypto');

function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(senha, salt, 64).toString('hex')}`;
}
function confereSenha(senha, guardado) {
  const [salt, hash] = String(guardado).split(':');
  if (!salt || !hash) return false;
  const esperado = Buffer.from(hash, 'hex');
  const atual = crypto.scryptSync(senha, salt, esperado.length);
  return crypto.timingSafeEqual(esperado, atual);
}
const novoToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = t => crypto.createHash('sha256').update(t).digest('hex');

module.exports = { hashSenha, confereSenha, novoToken, hashToken };
