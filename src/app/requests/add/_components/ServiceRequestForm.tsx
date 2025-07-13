"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { createRequest } from "@/actions/create-request";
import { createRequestSchema } from "@/actions/create-request/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import * as z from "zod";
import { Loader2, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ServiceRequestFormProps {
  requesterName: string;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

type ServiceFormValues = z.infer<typeof createRequestSchema>;

export function ServiceRequestForm({ requesterName, setIsLoading }: ServiceRequestFormProps) {
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      type: "service",
      requesterName: requesterName || "",
      serviceDescription: "",
      company: "",
      scheduledDate: "",
      technicalResponsible: "",
      priority: "medium",
      attachments: [],
      budgets: [],
    },
  });

  const { execute } = useAction(createRequest, {
    onSuccess: (result) => {
      if (result?.data?.success) {
        toast.success(result.data.success);
        form.reset();
      } else if (result?.data?.error) {
        toast.error(result.data.error);
      }
      setIsLoading(false);
    },
    onError: (error) => {
      const validation = error?.error?.validationErrors;
      const serverError = error?.error?.serverError || error?.error;
      let msg = '';
      function hasErrors(obj: unknown): obj is { _errors: string[] } {
        return !!obj && typeof obj === 'object' && '_errors' in obj && Array.isArray((obj as { _errors?: unknown })._errors);
      }
      if (validation) {
        msg = Object.values(validation)
          .map((v) => hasErrors(v) ? v._errors.join(', ') : undefined)
          .filter(Boolean)
          .join(' | ');
      } else if (serverError) {
        msg = typeof serverError === 'string' ? serverError : JSON.stringify(serverError);
      } else {
        msg = JSON.stringify(error);
      }
      toast.error('Error creating request: ' + msg);
      setIsLoading(false);
    },
  });

  const [attachmentsPreview, setAttachmentsPreview] = useState<File[]>([]);
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingSkeleton(false), 900);
    return () => clearTimeout(timer);
  }, []);

  async function onSubmit(values: ServiceFormValues) {
    setIsLoading(true);
    await execute({
      ...values,
      type: "service",
      requesterName: requesterName || "",
      attachments: attachmentsPreview,
    });
    form.reset();
    setAttachmentsPreview([]);
  }

  if (isLoadingSkeleton) {
    return (
      <div className="relative">
        <Card className="max-w-5xl mx-auto shadow-lg border-primary/20 rounded-2xl">
          <div className="pt-6" />
          <CardContent className="pt-0 pb-8 px-2 sm:px-10 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="serviceDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service description</FormLabel>
              <Textarea {...field} placeholder="Describe the service to be performed..." />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provider company</FormLabel>
              <Input {...field} placeholder="Company name" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scheduledDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scheduled date</FormLabel>
              <Input {...field} type="date" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="technicalResponsible"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Technical responsible</FormLabel>
              <Input {...field} placeholder="Name of the responsible person" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        {/* Attachments e Budgets podem ser implementados conforme padrão do projeto */}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
          ) : (
            <><Send className="mr-2 h-4 w-4" />Submit Request</>
          )}
        </Button>
      </form>
    </Form>
  );
} 