// Cliente único do Prisma (usa DATABASE_URL do .env)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
const { PrismaClient } = require('@prisma/client');
module.exports = { prisma: new PrismaClient() };
