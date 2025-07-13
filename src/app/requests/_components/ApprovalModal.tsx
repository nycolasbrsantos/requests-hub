"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAction } from 'next-safe-action/hooks';
import { updateRequestStatus } from '@/actions/update-request-status';
// Remover import direto - agora usamos API Route
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { POFileUpload } from './POFileUpload';
import { useRef } from 'react';

interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  currentStatus: string;
  userRole: string;
  userName: string;
}

export function ApprovalModal({ 
  open, 
  onOpenChange, 
  requestId, 
  currentStatus, 
  userRole, 
  userName 
}: ApprovalModalProps) {
  const [comment, setComment] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [isGeneratingPO, setIsGeneratingPO] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [purchaseProof, setPurchaseProof] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchDriveFolderId() {
      if (open && requestId) {
        try {
          const res = await fetch(`/api/request-drive-folder?customId=${requestId}`);
          const data = await res.json();
          setDriveFolderId(data.driveFolderId || null);
        } catch {
          setDriveFolderId(null);
        }
      }
    }
    fetchDriveFolderId();
  }, [open, requestId]);

  const { execute, isExecuting } = useAction(updateRequestStatus, {
    onSuccess: (result) => {
      if (result?.data?.success) {
        toast.success(result.data.success);
        onOpenChange(false);
        setComment('');
        setPoNumber('');
      } else if (result?.data?.error) {
        toast.error(result.data.error);
      }
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + (error?.error?.serverError || 'Erro desconhecido'));
    },
  });

  const handleGeneratePO = async () => {
    setIsGeneratingPO(true);
    try {
      const response = await fetch('/api/generate-po-number');
      const data = await response.json();
      if (data.poNumber) {
        setPoNumber(data.poNumber);
      } else {
        toast.error('Erro ao gerar número da PO');
      }
    } catch {
      toast.error('Erro ao gerar número da PO');
    } finally {
      setIsGeneratingPO(false);
    }
  };

  const handleApprove = async () => {
    if (!comment.trim()) {
      toast.error('Comentário é obrigatório');
      return;
    }

    let newStatus: string;
    const poNumberToUse = poNumber;

    // Determinar o próximo status baseado no status atual e role do usuário
    if (currentStatus === 'pending' && (userRole === 'admin' || userRole === 'supervisor')) {
      newStatus = 'need_approved';
    } else if (currentStatus === 'need_approved' && userRole === 'admin') {
      newStatus = 'finance_approved';
      if (!poNumberToUse) {
        toast.error('Número da PO é obrigatório para aprovação financeira');
        return;
      }
    } else {
      toast.error('Você não tem permissão para aprovar esta requisição');
      return;
    }

    await execute({
      customId: requestId,
      status: newStatus as 'pending' | 'need_approved' | 'finance_approved' | 'rejected' | 'in_progress' | 'completed',
      changedBy: userName,
      comment: comment.trim(),
      poNumber: poNumberToUse || undefined,
    });
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast.error('Comentário é obrigatório');
      return;
    }

    await execute({
      customId: requestId,
      status: 'rejected',
      changedBy: userName,
      comment: comment.trim(),
    });
  };

  const handleExecute = async () => {
    if (!comment.trim()) {
      toast.error('Comentário é obrigatório');
      return;
    }

    await execute({
      customId: requestId,
      status: 'in_progress',
      changedBy: userName,
      comment: comment.trim(),
    });
  };

  const handleComplete = async () => {
    if (!comment.trim()) {
      toast.error('Comentário é obrigatório');
      return;
    }
    if (!purchaseProof) {
      toast.error('Comprovante de compra (PDF) é obrigatório');
      return;
    }
    let uploadedProof = null;
    try {
      const formData = new FormData();
      formData.append('file', purchaseProof);
      formData.append('uploadedBy', userName);
      formData.append('poNumber', poNumber || '');
      const uploadRes = await fetch(`/api/requests/${requestId}/po-upload`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success || !uploadData.file) {
        toast.error('Falha ao enviar comprovante de compra');
        return;
      }
      uploadedProof = uploadData.file;
    } catch (err) {
      toast.error('Erro ao enviar comprovante de compra');
      return;
    }
    // Se houver transportadora ou rastreio, status vai para awaiting_delivery
    const newStatus = (carrier.trim() || trackingCode.trim()) ? 'awaiting_delivery' : 'completed';
    await execute({
      customId: requestId,
      status: newStatus,
      changedBy: userName,
      comment: comment.trim(),
      carrier: carrier.trim() || undefined,
      trackingCode: trackingCode.trim() || undefined,
      deliveryProof: uploadedProof ? [uploadedProof] : [],
    });
  };

  // Determinar quais ações estão disponíveis
  const canApproveNeed = currentStatus === 'pending' && (userRole === 'admin' || userRole === 'supervisor');
  const canApproveFinance = currentStatus === 'need_approved' && userRole === 'admin';
  const canExecute = currentStatus === 'finance_approved' && (userRole === 'admin' || userRole === 'manager');
  const canComplete = currentStatus === 'in_progress' && (userRole === 'admin' || userRole === 'manager');
  const canReject = ['pending', 'need_approved'].includes(currentStatus) && (userRole === 'admin' || userRole === 'supervisor');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Aprovação de Requisição
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p><strong>Status atual:</strong> {currentStatus}</p>
            <p><strong>Seu papel:</strong> {userRole}</p>
          </div>

          {/* Campo para número da PO (apenas para aprovação financeira) */}
          {canApproveFinance && (
            <div className="space-y-2">
              <Label htmlFor="poNumber">Número da PO</Label>
              <div className="flex gap-2">
                <Input
                  id="poNumber"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="PO-2024-0001"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePO}
                  disabled={isGeneratingPO}
                >
                  {isGeneratingPO ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Gerar'
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comment">Comentário *</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Adicione um comentário sobre sua decisão..."
              rows={3}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {canApproveNeed && (
              <Button
                onClick={handleApprove}
                disabled={isExecuting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Aprovar Necessidade
              </Button>
            )}

            {canApproveFinance && (
              <Button
                onClick={handleApprove}
                disabled={isExecuting || !poNumber.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Aprovar Financeiramente
              </Button>
            )}

            {canExecute && (
              <Button
                onClick={handleExecute}
                disabled={isExecuting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Iniciar Execução
              </Button>
            )}

            {canComplete && (
              <Button
                onClick={handleComplete}
                disabled={isExecuting}
                className="bg-gray-600 hover:bg-gray-700"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Marcar como Concluída
              </Button>
            )}

            {canReject && (
              <Button
                onClick={handleReject}
                disabled={isExecuting}
                variant="destructive"
              >
                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                Rejeitar
              </Button>
            )}
          </div>

          {/* Campos adicionais para finalização */}
          {canComplete && (
            <div className="space-y-2">
              <Label>Comprovante de compra (PDF)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={e => setPurchaseProof(e.target.files?.[0] || null)}
                className="block w-full border rounded px-2 py-1"
              />
              <Label>Transportadora (opcional)</Label>
              <Input
                value={carrier}
                onChange={e => setCarrier(e.target.value)}
                placeholder="Nome da transportadora"
              />
              <Label>Código de rastreio (opcional)</Label>
              <Input
                value={trackingCode}
                onChange={e => setTrackingCode(e.target.value)}
                placeholder="Código de rastreio"
              />
            </div>
          )}

          {/* Seção de upload de arquivos da PO */}
          {currentStatus === 'finance_approved' && poNumber && driveFolderId && (
            <div className="mt-6">
              <POFileUpload
                poNumber={poNumber}
                prFolderId={driveFolderId}
                onUploadComplete={(fileIds) => {
                  console.log('Arquivos da PO enviados:', fileIds);
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 