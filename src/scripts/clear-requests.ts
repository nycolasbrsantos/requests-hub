import { db } from '../db';
import { requests } from '../db/schema';

async function clearRequests() {
  await db.delete(requests);
  console.log('Todas as requisições foram apagadas!');
}

clearRequests().then(() => process.exit(0)); 