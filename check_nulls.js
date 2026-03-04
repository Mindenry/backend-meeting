const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNulls() {
  const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !['$on', '$connect', '$disconnect', '$use', '$executeRaw', '$executeRawUnsafe', '$queryRaw', '$queryRawUnsafe', '$transaction', '$extends'].includes(k));
  
  for (const model of models) {
    if (typeof prisma[model]?.findMany !== 'function') continue;
    const records = await prisma[model].findMany({ take: 5 });
    if (records.length === 0) continue;
    
    let nullFields = new Set();
    records.forEach(r => {
      Object.keys(r).forEach(k => {
        if (r[k] === null) nullFields.add(k);
      });
    });
    
    if (nullFields.size > 0) {
      console.log(`Model ${model} has null fields:`, Array.from(nullFields).join(', '));
    }
  }
}
checkNulls().catch(console.error).finally(()=>prisma.$disconnect());
