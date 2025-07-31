"use client";

import {useState, useEffect} from "react";
import {FileText} from "lucide-react";
import {PDFDownloadLink} from "@react-pdf/renderer";
import DocumentPreviewPDF from "./document-preview-pdf";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Skeleton} from "@/components/ui/skeleton";
import {toast} from "sonner";
import {
  getDocumentTemplates,
  generateDocument,
  getGeneratedDocumentTemplate,
  getDocumentPreview,
  sendDocuments,
} from "@/lib/document-utils";
import {IDocumentTemplate, IGeneratedDocumentTemplate} from "@/app/types/types.utils";

import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {number} from "framer-motion";

interface DocumentGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextId: number;
  context: "onboarding" | "employee" | "leave";
}

export function DocumentGenerationDialog({
  open,
  onOpenChange,
  contextId,
  context,
}: DocumentGenerationDialogProps) {
  const [templates, setTemplates] = useState<IDocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [generatedTemplate, setGeneratedTemplate] = useState<IGeneratedDocumentTemplate | null>(
    null,
  );
  const [generatedDocumentId, setGeneratedDocumentId] = useState<number | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const currentInstitution = useSelector(selectSelectedInstitution);
  const [canSendDocument, setCanSendDocument] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    console.log("\n\n Loading document templates...");
    if (!currentInstitution) {
      return;
    }
    setLoading(true);
    try {
      const data = await getDocumentTemplates({institutionId: currentInstitution.id});
      if (data) {
        setTemplates(data);
      }
    } catch (error) {
      toast.error("Failed to load document templates");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplate(templateId);
    setLoading(true);
    try {
      const response = await getGeneratedDocumentTemplate(parseInt(templateId), context, contextId);

      if (response?.placeholders) {
        setGeneratedTemplate(response);
        const initialPlaceholders: {[key: string]: string} = {};
        Object.keys(response.placeholders).forEach((key) => {
          if (response.placeholders && response.placeholders[key]) {
            initialPlaceholders[key] = response.placeholders[key].value || "";
          }
        });
        setPlaceholders(initialPlaceholders);
      }
    } catch (error) {
      toast.error("Failed to load template placeholders");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDocument = async () => {
    setLoading(true);
    setCanSendDocument(false);
    try {
      const response = await generateDocument(
        parseInt(selectedTemplate),
        context,
        contextId,
        placeholders,
      );
      
      if (response?.status === "success" && response.document_id) {
        setGeneratedDocumentId(response.document_id);
        setCanSendDocument(true);
        
        const preview = await getDocumentPreview(response.document_id);
        if (preview) {
          setPreviewContent(preview);
          toast.success("Document generated successfully");
        }
      } else {
        toast.error("Failed to generate document");
      }
    } catch (error) {
      toast.error("Failed to generate document");
      setCanSendDocument(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSendDocument = async () => {
    if (!generatedDocumentId) {
      toast.error("No document generated to send");
      return;
    }
    setLoading(true);
    try {
      await sendDocuments({documentId: generatedDocumentId, context, contextId});
      toast.success("Document sent successfully");
    } catch (error) {
      toast.error("Failed to send document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[500px] md:max-w-2xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generate Document</DialogTitle>
          <DialogDescription>
            Select a template and fill in the required information.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4  p-8 overflow-y-auto max-h-[70svh]">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select onValueChange={handleTemplateSelect} value={selectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          )}

          {!loading && selectedTemplate && generatedTemplate?.placeholders && (
            <div className="space-y-4">
              {Object.entries(generatedTemplate.placeholders).map(([key, placeholder]) => (
                <div key={key} className="space-y-2">
                  <Label>{key}</Label>
                  <Input
                    value={placeholders[key] || ""}
                    onChange={(e) =>
                      setPlaceholders({
                        ...placeholders,
                        [key]: e.target.value,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {previewContent && (
            <div className="mt-6 space-y-4">
              <div className="border rounded-lg p-4 bg-muted/50 mb-8">
                <Label className="mb-2 block">Document Preview</Label>
                <div className="prose prose-sm max-h-[200px] overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap">{previewContent}</pre>
                </div>
              </div>
              <PDFDownloadLink
                document={
                  <DocumentPreviewPDF
                    content={previewContent}
                    templateName={
                      templates.find((t) => t.id.toString() === selectedTemplate)?.name ||
                      "Document"
                    }
                  />
                }
                fileName={`${templates.find((t) => t.id.toString() === selectedTemplate)?.name || "document"}.pdf`}
                className="w-full"
              >
                {({loading: pdfLoading}) => (
                  <Button variant="secondary" className="w-full" disabled={pdfLoading}>
                    <FileText className="h-4 w-4 mr-2" />
                    {pdfLoading ? "Preparing PDF..." : "Preview PDF"}
                  </Button>
                )}
              </PDFDownloadLink>
            </div>
          )}
        </div>
        <DialogFooter>
          <div className="flex items-center justify-end gap-8">
            <Button onClick={handleGenerateDocument} disabled={loading || !selectedTemplate}>
              {loading ? "Generating..." : "Generate Document"}
            </Button>
            <Button
              onClick={handleSendDocument}
              disabled={loading || !generatedDocumentId || !canSendDocument}
            >
              Send Document
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
