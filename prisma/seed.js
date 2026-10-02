// Popula o banco com dados demonstrativos: node prisma/seed.js
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
const { PrismaClient } = require('@prisma/client');
const { hashSenha } = require('../server/auth');
const prisma = new PrismaClient();

async function main() {
  const usuarios = [
    { usuario: 'admin', nome: 'Administrador FHP', nivel: 'admin', senha: 'admin123' },
    { usuario: 'funcionario', nome: 'Equipe FHP', nivel: 'funcionario', senha: '123456' },
    { usuario: 'cliente', nome: 'Cliente FHP', nivel: 'cliente', senha: '123456' },
  ];
  const u = {};
  for (const x of usuarios) {
    u[x.usuario] = await prisma.usuario.upsert({
      where: { usuario: x.usuario }, update: {},
      create: { usuario: x.usuario, nome: x.nome, nivel: x.nivel, senhaHash: hashSenha(x.senha) },
    });
  }

  const planos = [
    { nome: 'FHP Start', categoria: 'RESIDENCIAL', velocidade: 300, preco: 79.9, ordem: 1 },
    { nome: 'FHP Turbo', categoria: 'RESIDENCIAL', velocidade: 500, preco: 99.9, ordem: 2, destaque: true },
    { nome: 'FHP Ultra', categoria: 'RESIDENCIAL', velocidade: 700, preco: 119.9, ordem: 3 },
    { nome: 'FHP Gamer', categoria: 'RESIDENCIAL', velocidade: 1000, preco: 149.9, ordem: 4 },
    { nome: 'FHP Business 500', categoria: 'EMPRESARIAL', velocidade: 500, ordem: 1 },
    { nome: 'FHP Business 700', categoria: 'EMPRESARIAL', velocidade: 700, ordem: 2 },
    { nome: 'FHP Business 1 Giga', categoria: 'EMPRESARIAL', velocidade: 1000, ordem: 3 },
  ];
  const p = {};
  for (const x of planos) p[x.nome] = await prisma.plano.upsert({ where: { nome: x.nome }, update: {}, create: x });

  if ((await prisma.cliente.count()) === 0) {
    const demo = await prisma.cliente.create({
      data: { usuarioId: u.cliente.id, nome: 'Cliente Demonstrativo', email: 'cliente@exemplo.com', telefone: '(21) 90000-0000', bairro: 'Campo Grande' },
    });
    await prisma.contrato.create({ data: { clienteId: demo.id, planoId: p['FHP Turbo'].id } });
    const emp = await prisma.cliente.create({ data: { nome: 'Empresa Demonstrativa', email: 'contato@empresa.exemplo', bairro: 'Bangu' } });
    await prisma.contrato.create({ data: { clienteId: emp.id, planoId: p['FHP Business 700'].id } });
    await prisma.chamado.create({
      data: { clienteId: demo.id, atendenteId: u.funcionario.id, assunto: 'Dúvida sobre instalação', descricao: 'Chamado demonstrativo.', status: 'EM_ANDAMENTO' },
    });
  }
  console.log('Seed concluído. Logins: admin/admin123, funcionario/123456, cliente/123456');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
