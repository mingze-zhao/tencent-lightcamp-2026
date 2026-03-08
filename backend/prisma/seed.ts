import demoData from '../../src/data/demo/interviews.json' with { type: 'json' };
import type { DemoDataset } from '../src/contracts.js';
import { ingestDataset } from '../src/ingest.js';
import { prisma } from '../src/prisma.js';

async function main() {
  await ingestDataset(prisma, demoData as DemoDataset);
  console.log('Seed completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
