import { db } from '@/db';
import { requests } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface Attachment {
  filename: string;
  uploadedBy: string;
}

/**
 * Script para migrar dados existentes e garantir acesso aos arquivos
 * Este script deve ser executado uma vez após a implementação da nova API de arquivos
 */
async function migrateFileAccess() {
  try {
    console.log('Iniciando migração de acesso aos arquivos...');

    // Buscar todas as requisições que têm anexos
    const allRequests = await db.select().from(requests);
    
    let updatedCount = 0;
    
    for (const request of allRequests) {
      if (request.attachments && Array.isArray(request.attachments) && request.attachments.length > 0) {
        // Verificar se os anexos têm a estrutura correta
        const needsUpdate = request.attachments.some((att: unknown) => {
          return typeof att === 'string' || (typeof att === 'object' && att !== null && !('uploadedBy' in att));
        });

        if (needsUpdate) {
          // Migrar anexos antigos para a nova estrutura
          const migratedAttachments = request.attachments.map((att: unknown): Attachment => {
            if (typeof att === 'string') {
              // Se é apenas uma string (nome do arquivo), usar o criador da requisição
              return {
                filename: att,
                uploadedBy: request.requesterName || 'Sistema'
              };
            } else if (typeof att === 'object' && att !== null && 'filename' in att) {
              const attachmentObj = att as { filename: string; uploadedBy?: string };
              // Se tem filename mas não tem uploadedBy
              return {
                filename: attachmentObj.filename,
                uploadedBy: attachmentObj.uploadedBy || request.requesterName || 'Sistema'
              };
            }
            // Fallback para objetos já no formato correto
            return att as Attachment;
          });

          // Atualizar a requisição
          await db
            .update(requests)
            .set({ attachments: migratedAttachments })
            .where(eq(requests.id, request.id));

          updatedCount++;
          console.log(`Migrada requisição #${request.id} (${request.customId})`);
        }
      }
    }

    console.log(`Migração concluída! ${updatedCount} requisições atualizadas.`);
    
  } catch (error) {
    console.error('Erro durante a migração:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  migrateFileAccess()
    .then(() => {
      console.log('Script de migração finalizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro no script de migração:', error);
      process.exit(1);
    });
}

export { migrateFileAccess }; 