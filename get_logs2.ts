import { prisma } from './lib/prisma';

async function main() {
  const logs = await prisma.transactionLog.findMany({
    take: 10,
    orderBy: { transactionDate: 'desc' }
  });
  console.log(JSON.stringify(logs, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
