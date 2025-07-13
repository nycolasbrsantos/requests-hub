import { db } from '../src/db';

async function applySchemaChanges() {
  try {
    console.log('Aplicando mudanças no schema...');

    // Adicionar novas colunas na tabela requests
    await db.execute(`
      ALTER TABLE "requests" 
      ADD COLUMN IF NOT EXISTS "po_number" varchar(20)
    `);
    console.log('✓ Coluna po_number adicionada');

    await db.execute(`
      ALTER TABLE "requests" 
      ADD COLUMN IF NOT EXISTS "need_approved_by" varchar(256)
    `);
    console.log('✓ Coluna need_approved_by adicionada');

    await db.execute(`
      ALTER TABLE "requests" 
      ADD COLUMN IF NOT EXISTS "finance_approved_by" varchar(256)
    `);
    console.log('✓ Coluna finance_approved_by adicionada');

    await db.execute(`
      ALTER TABLE "requests" 
      ADD COLUMN IF NOT EXISTS "executed_by" varchar(256)
    `);
    console.log('✓ Coluna executed_by adicionada');

    console.log('✅ Todas as mudanças aplicadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao aplicar mudanças:', error);
  } finally {
    process.exit(0);
  }
}

applySchemaChanges(); 