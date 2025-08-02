"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, FileText, File, Plus, X, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getDocumentTypes, createDocumentTemplate } from "@/lib/utils"
import { IDocumentTemplateFormData, IDocumentType } from "@/app/types/types.utils"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { RichEditorField } from "@/components/common/rich-editor"
// import dynamic from "next/dynamic"

// const QuillRichTextEditor = dynamic(
//   () => import("@/components/common/rich-editor").then((mod) => mod.RichEditorField),
//   { ssr: false, loading: () => <p>Loading Text Editor...</p> }
// );


export default function CreateTemplatePage() {
  const [documentTypes, setDocumentTypes] = useState<IDocumentType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = useState(true)
  const [formData, setFormData] = useState<IDocumentTemplateFormData>({
    document_type: 0,
    name: "",
    template_type: "text",
    file: null,
    content: "",
  })
  const [newPlaceholder, setNewPlaceholder] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const INSTITUTION_ID = selectedInstitution?.id;

  useEffect(() => {
    loadDocumentTypes()
  }, [])

  const loadDocumentTypes = async () => {
    setIsLoadingTypes(true)
    try {
      const types = await getDocumentTypes({ institutionId: Number(INSTITUTION_ID) })
      setDocumentTypes(types)
    } catch (error) {
      console.error("Failed to load document types:", error)
    } finally {
      setIsLoadingTypes(false)
    }
  }

  const handleTemplateTypeChange = (type: "pdf" | "word" | "text") => {
    setFormData((prev) => ({
      ...prev,
      template_type: type,
      file: null,
      content: type === "text" ? "" : null,
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({ ...prev, file }))
  }

  const addPlaceholder = () => {
    if (newPlaceholder.trim() && !formData.placeholders?.includes(newPlaceholder.trim())) {
      setFormData((prev) => ({
        ...prev,
        placeholders: [...(prev.placeholders || []), newPlaceholder.trim()],
      }))
      setNewPlaceholder("")
    }
  }

  const removePlaceholder = (placeholder: string) => {
    setFormData((prev) => ({
      ...prev,
      placeholders: prev.placeholders?.filter((p) => p !== placeholder) || [],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await createDocumentTemplate({
        institutionId: Number(INSTITUTION_ID),
        documentTemplateData: formData,
      })

      if (result) {
        router.push("/documents/templates")
      } else {
        console.error("Failed to create template")
      }
    } catch (error) {
      console.error("Failed to create template:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid =
    formData.name &&
    formData.document_type &&
    ((formData.template_type === "text" && formData.content) || (formData.template_type !== "text" && formData.file))

  if (isLoadingTypes) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading document types...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full py-8 px-4 ">
      <div className="mb-8">
        <div className="flex items-center justify-start gap-6">
          <Link
            href="/documents/templates"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          ><Button variant={"ghost"} className="rounded-full aspect-square">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Create Document Template</h1>
        </div>
        <p className="text-muted-foreground mt-2">Create a new template for generating documents</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Provide basic details about your template</CardDescription>
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
                value={formData.document_type.toString()}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, document_type: Number.parseInt(value) }))}
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

        {/* Rest of the form remains the same */}
        <Card>
          <CardHeader>
            <CardTitle>Template Type</CardTitle>
            <CardDescription>Choose how you want to create your template</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handleTemplateTypeChange("text")}
                className={`p-4 border rounded-lg text-center transition-colors ${formData.template_type === "text"
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
                className={`p-4 border rounded-lg text-center transition-colors ${formData.template_type === "pdf"
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
                className={`p-4 border rounded-lg text-center transition-colors ${formData.template_type === "word"
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
                ? "Enter your template content with placeholders"
                : "Upload your template file"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formData.template_type === "text" ? (
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                {/* <Textarea
                  id="content"
                  placeholder="Enter your template content here. Use {{placeholder}} for dynamic values."
                  value={formData.content || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  className="min-h-[200px]"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Use double curly braces for placeholders, e.g., {"{{employee_name}}"}, {"{{company_name}}"}
                </p> */}
                <RichEditorField
                  value={formData.content || ""}
                  onChange={(value) => setFormData((prev) => ({ ...prev, content: value }))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="file">Upload File</Label>
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
                      {formData.file ? formData.file.name : `Upload ${formData.template_type.toUpperCase()} file`}
                    </div>
                    <div className="text-sm text-muted-foreground">Click to browse or drag and drop</div>
                  </label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={!isFormValid || isSubmitting} className="flex-1">
            {isSubmitting ? "Creating..." : "Create Template"}
          </Button>
          <Link href="/documents/templates">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
