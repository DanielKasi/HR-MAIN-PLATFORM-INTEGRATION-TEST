"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { ArrowLeft, Upload, FileText, File, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getDocumentTemplates, getDocumentTypes, updateDocumentTemplate } from "@/lib/utils";
import { IDocumentType, IDocumentTemplate, IDocumentTemplateFormData } from "@/types/types.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";

export default function EditTemplatePage() {
	const params = useParams();
	const router = useRouter();
	const [documentTypes, setDocumentTypes] = useState<IDocumentType[]>([]);
	const [template, setTemplate] = useState<IDocumentTemplate | null>(null);
	const [formData, setFormData] = useState<IDocumentTemplateFormData>({
		document_type: 0,
		name: "",
		template_type: "text",
		file: null,
		content: "",
		placeholders: [],
	});
	const [newPlaceholder, setNewPlaceholder] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const INSTITUTION_ID = selectedInstitution?.id;

	useEffect(() => {
		loadData();
	}, [params.id]);

	const loadData = async () => {
		setIsLoading(true);
		try {
			// Load document types and templates in parallel
			const [types, templates] = await Promise.all([
				getDocumentTypes({ institutionId: Number(INSTITUTION_ID) }),
				getDocumentTemplates({ institutionId: Number(INSTITUTION_ID) }),
			]);

			setDocumentTypes(types);

      // Find the specific template
      const currentTemplate = templates.find((t) => t.id === Number.parseInt(params.id as string));
      if (currentTemplate) {
        setTemplate(currentTemplate);
        setFormData({
          document_type:
            typeof currentTemplate.document_type === "number"
              ? currentTemplate.document_type
              : currentTemplate.document_type.id,
          name: currentTemplate.name,
          template_type: currentTemplate.template_type,
          content: currentTemplate.content,
          placeholders: currentTemplate.placeholders || [],
        });
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

	const handleTemplateTypeChange = (type: "pdf" | "word" | "text") => {
		setFormData((prev) => ({
			...prev,
			template_type: type,
			file: null,
			content: type === "text" ? prev.content : null,
		}));
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;

		setFormData((prev) => ({ ...prev, file }));
	};

	const addPlaceholder = () => {
		if (newPlaceholder.trim() && !formData.placeholders?.includes(newPlaceholder.trim())) {
			setFormData((prev) => ({
				...prev,
				placeholders: [...(prev.placeholders || []), newPlaceholder.trim()],
			}));
			setNewPlaceholder("");
		}
	};

	const removePlaceholder = (placeholder: string) => {
		setFormData((prev) => ({
			...prev,
			placeholders: prev.placeholders?.filter((p) => p !== placeholder) || [],
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const result = await updateDocumentTemplate({
				institutionId: Number(INSTITUTION_ID),
				documentTemplateId: Number.parseInt(params.id as string),
				documentTemplateData: formData,
			});

      if (result) {
        
        router.push("/documents/templates?success=true");;
      } else {
        console.error("Failed to update template");
      }
    } catch (error) {
      console.error("Failed to update template:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

	const isFormValid =
		formData.name &&
		formData.document_type &&
		((formData.template_type === "text" && formData.content) ||
			(formData.template_type !== "text" && (formData.file || template?.file)));

	if (isLoading) {
		return (
			<div className="container mx-auto py-8 px-4 max-w-2xl">
				<div className="flex justify-center items-center min-h-[400px]">
					<div className="text-center">
						<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
						<p className="text-muted-foreground">Loading template...</p>
					</div>
				</div>
			</div>
		);
	}

	if (!template) {
		return (
			<div className="container mx-auto py-8 px-4 max-w-2xl">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-4">Template Not Found</h1>
					<Link href="/documents/templates">
						<Button>Back to Templates</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full py-8 px-4 bg-white">
			<div className="flex items-center gap-2 -mt-6">
				<Button
					size="sm"
					className="rounded-full aspect-square"
					variant="outline"
					onClick={() => router.push("/documents/templates")}
				>
					<ArrowLeft />
				</Button>
				<div className="mt-7 ml-2">
					<h1 className="text-3xl font-bold">Edit Template</h1>
					<p className="text-muted-foreground mt-2">Update your document template</p>
				</div>
			</div>
			<form onSubmit={handleSubmit} className="space-y-6 mt-10">
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>Update basic details about your template</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Template Name</Label>
							<Input
								id="name"
								placeholder="Enter template name"
								value={formData.name}
								onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
								required
							/>
						</div>

            <div className="space-y-2">
              <Label htmlFor="document_type">Document Type</Label>
              <Select
                value={formData.document_type ? formData.document_type.toString() : ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({...prev, document_type: Number.parseInt(value)}))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

				{/* Rest of the form remains the same as create page */}
				<Card>
					<CardHeader>
						<CardTitle>Template Type</CardTitle>
						<CardDescription>Choose how you want to update your template</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-3 gap-4">
							<button
								type="button"
								onClick={() => handleTemplateTypeChange("text")}
								className={`p-4 border rounded-lg text-center transition-colors ${
									formData.template_type === "text"
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/50"
								}`}
							>
								<FileText className="h-8 w-8 mx-auto mb-2" />
								<div className="font-medium">Text</div>
								<div className="text-sm text-muted-foreground">Rich text editor</div>
							</button>

							<button
								type="button"
								onClick={() => handleTemplateTypeChange("pdf")}
								className={`p-4 border rounded-lg text-center transition-colors ${
									formData.template_type === "pdf"
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/50"
								}`}
							>
								<File className="h-8 w-8 mx-auto mb-2 text-red-500" />
								<div className="font-medium">PDF</div>
								<div className="text-sm text-muted-foreground">Upload PDF file</div>
							</button>

							<button
								type="button"
								onClick={() => handleTemplateTypeChange("word")}
								className={`p-4 border rounded-lg text-center transition-colors ${
									formData.template_type === "word"
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/50"
								}`}
							>
								<File className="h-8 w-8 mx-auto mb-2 text-blue-500" />
								<div className="font-medium">Word</div>
								<div className="text-sm text-muted-foreground">Upload Word file</div>
							</button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Template Content</CardTitle>
						<CardDescription>
							{formData.template_type === "text"
								? "Update your template content with placeholders"
								: "Upload a new template file or keep the existing one"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{formData.template_type === "text" ? (
							<div className="space-y-2">
								<Label htmlFor="content">Content</Label>
								<Textarea
									id="content"
									placeholder="Enter your template content here. Use {{placeholder}} for dynamic values."
									value={formData.content || ""}
									onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
									className="min-h-[200px]"
									required
								/>
								<p className="text-sm text-muted-foreground">
									Use double curly braces for placeholders, e.g., {"{{employee_name}}"},{" "}
									{"{{company_name}}"}
								</p>
							</div>
						) : (
							<div className="space-y-4">
								{template.file && !formData.file && (
									<div className="p-4 bg-muted rounded-lg">
										<p className="text-sm font-medium mb-2">Current File:</p>
										<p className="text-sm text-muted-foreground">
											{template.file.split("/").pop()}
										</p>
									</div>
								)}

								<div className="space-y-2">
									<Label htmlFor="file">Upload New File (Optional)</Label>
									<div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
										<input
											id="file"
											type="file"
											accept={formData.template_type === "pdf" ? ".pdf" : ".doc,.docx"}
											onChange={handleFileChange}
											className="hidden"
										/>
										<label htmlFor="file" className="cursor-pointer">
											<Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
											<div className="font-medium">
												{formData.file
													? formData.file.name
													: `Upload new ${formData.template_type.toUpperCase()} file`}
											</div>
											<div className="text-sm text-muted-foreground">
												Click to browse or drag and drop
											</div>
										</label>
									</div>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* <Card>
          <CardHeader>
            <CardTitle>Placeholders</CardTitle>
            <CardDescription>
              Update placeholders that will be replaced with actual values when generating documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter placeholder (e.g., {{employee_name}})"
                value={newPlaceholder}
                onChange={(e) => setNewPlaceholder(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPlaceholder())}
              />
              <Button type="button" onClick={addPlaceholder} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {formData.placeholders && formData.placeholders.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Current Placeholders:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.placeholders.map((placeholder, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {placeholder}
                      <button
                        type="button"
                        onClick={() => removePlaceholder(placeholder)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card> */}

				<div className="flex gap-4">
					<Button type="submit" disabled={!isFormValid || isSubmitting} className="flex-1">
						{isSubmitting ? "Updating..." : "Update Template"}
					</Button>
					<Link href="/documents/templates">
						<Button type="button" variant="outline">
							Cancel
						</Button>
					</Link>
				</div>
			</form>
		</div>
	);
}
