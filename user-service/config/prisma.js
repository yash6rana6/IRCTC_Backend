const { PrismaClient } = require('@prisma/client');
const  { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;

const globalPrisma = global;

if (!globalPrisma.prisma) {
    const adapter = new PrismaPg({connectionString});
    globalPrisma.prisma = new PrismaClient({ 
        adapter,
        log:[ 'error', 'warn', 'info' ],
     });
}