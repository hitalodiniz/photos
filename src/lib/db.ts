import { PrismaClient } from '@prisma/client';

// Cria uma única instância do Prisma para evitar múltiplas conexões
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // log: ['query'], // Descomente para ver as queries SQL no console
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;