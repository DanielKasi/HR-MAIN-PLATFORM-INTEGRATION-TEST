"use client";

import type React from "react";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {
  Store,
  Building2,
  Mail,
  Phone,
  PhoneCall,
  Badge,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Upload,
  X,
} from "lucide-react";
import {useSelector} from "react-redux";
import {useDispatch} from "react-redux";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import apiRequest from "@/lib/apiRequest";
import {selectRefreshToken, selectSelectedInstitution, selectUser} from "@/store/auth/selectors";
import {
  logoutStart,
  setAccessToken,
  setAttachedInstitutions,
  setRefreshToken,
  setSelectedBranch,
  setSelectedInstitution,
  setUserAction,
} from "@/store/auth/actions";
import {toast} from "sonner";
import type {LoginResponse} from "@/utils/authUtils";
import axios from "axios";
import {LocationAutocomplete} from "@/components/location-autocomplete";
import {Textarea} from "@/components/ui/textarea";
import {Progress} from "@radix-ui/react-progress";

interface DocumentFile {
  id: string;
  title: string;
  file: File | null;
  fileName: string;
}

interface OrganisationFormData {
  // Step 1: Basic Info
  institutionName: string;
  institutionEmail: string;
  firstPhoneNumber: string;
  secondPhoneNumber: string;
  description: string;

  // Step 2: Location
  location: string;
  latitude: string;
  longitude: string;

  // Step 3: Documents
  documents: DocumentFile[];
}

const STEPS = [
  {
    id: 1,
    title: "Organisation Info",
    description: "Basic details about your supermarket",
  },
  {
    id: 2,
    title: "Location Details",
    description: "Where is your supermarket located",
  },
  {id: 3, title: "Documents", description: "Upload required documents"},
];

export default function CreateOrganisationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  // const [isCreated, setIsCreated] = useState(false);
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const userData = useSelector(selectUser);
  const refreshToken = useSelector(selectRefreshToken);
  const dispatch = useDispatch();

  const [formData, setFormData] = useState<OrganisationFormData>({
    institutionName: "",
    institutionEmail: "",
    firstPhoneNumber: "",
    secondPhoneNumber: "",
    description: "",
    location: "",
    latitude: "",
    longitude: "",
    documents: [],
  });

  useEffect(() => {
    if (userData) {
      try {
        const user = userData;
        setUserId(user.id);
        if (user.email) {
          setFormData((prev) => ({...prev, institutionEmail: user.email}));
        }
      } catch (error) {
        toast.error("Error retrieving user information. Please log out and log in again.");
      }
    } else {
      router.push("/login");
    }
  }, [userData, router]);

  useEffect(() => {
    if (selectedInstitution) {
      router.push("/dashboard");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const updateFormData = (field: keyof OrganisationFormData, value: any) => {
    setFormData((prev) => ({...prev, [field]: value}));
  };

  const addDocument = () => {
    const newDoc: DocumentFile = {
      id: Date.now().toString(),
      title: "",
      file: null,
      fileName: "",
    };
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, newDoc],
    }));
  };

  const updateDocument = (id: string, field: keyof DocumentFile, value: any) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) => (doc.id === id ? {...doc, [field]: value} : doc)),
    }));
  };

  const removeDocument = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((doc) => doc.id !== id),
    }));
  };

  const handleFileChange = (id: string, file: File | null) => {
    updateDocument(id, "file", file);
    updateDocument(id, "fileName", file ? file.name : "");
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.institutionName &&
          formData.institutionEmail &&
          formData.firstPhoneNumber
        );
      case 2:
        return !!(formData.location && formData.latitude && formData.longitude);
      case 3:
        // For step 3, we'll consider it valid if either:
        // 1. There are no documents (documents are optional)
        // 2. All documents have both title and file
        return (
          formData.documents.length === 0 ||
          formData.documents.every((doc) => doc.title && doc.file)
        );
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      setErrorMessage("");
    } else {
      setErrorMessage("Please fill in all required fields before proceeding.");
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setErrorMessage("");
  };

  const handleUserRefresh = (loginResponse: LoginResponse) => {
    dispatch(setAccessToken(loginResponse.tokens.access));
    dispatch(setRefreshToken(loginResponse.tokens.refresh));
    dispatch(setUserAction(loginResponse.user));

    if (loginResponse.institutionsAttached.length) {
      const defaultSelectedInstitution = loginResponse.institutionsAttached.find(
        (institution) =>
          institution.institution_name === formData.institutionName &&
          institution.first_phone_number === formData.firstPhoneNumber,
      );
      dispatch(setAttachedInstitutions(loginResponse.institutionsAttached));
      dispatch(
        setSelectedInstitution(defaultSelectedInstitution || loginResponse.institutionsAttached[0]),
      );
      if (
        defaultSelectedInstitution &&
        defaultSelectedInstitution.branches &&
        defaultSelectedInstitution.branches.length
      ) {
        dispatch(setSelectedBranch(defaultSelectedInstitution.branches[0]));
      } else if (loginResponse.institutionsAttached[0].branches?.length) {
        dispatch(setSelectedBranch(loginResponse.institutionsAttached[0].branches[0]));
      }
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      setErrorMessage("User information not available. Please log out and log in again.");
      return;
    }

    if (!validateStep(3)) {
      setErrorMessage("Please complete all required fields and documents.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const formdata = new FormData();

      formdata.append("institution_name", formData.institutionName);
      formdata.append("institution_email", formData.institutionEmail);
      formdata.append("first_phone_number", formData.firstPhoneNumber);
      if (formData.secondPhoneNumber) {
        formdata.append("second_phone_number", formData.secondPhoneNumber);
      }

      if (formData.description && formData.description.trim()) {
        formdata.append("description", formData.description);
      }

      // Institution owner
      formdata.append("institution_owner_id", userId.toString());

      // Location data
      formdata.append("location", formData.location);
      formdata.append("latitude", formData.latitude.toString());
      formdata.append("longitude", formData.longitude.toString());

      // Documents - Only add if we have valid documents
      const validDocuments = formData.documents.filter(
        (doc) => doc.file && doc.title && doc.title.trim(),
      );
      console.log("Valid documents count:", validDocuments.length);

      if (validDocuments.length > 0) {
        // Append document files and titles
        validDocuments.forEach((doc) => {
          if (doc.file && doc.title) {
            console.log(`Adding document: ${doc.title} - ${doc.file.name}`);
            formdata.append("document_files", doc.file);
            formdata.append("document_titles", doc.title.trim());
          }
        });
      }
      // Important: We don't add empty document fields at all if there are no valid documents

      // Log the complete form data
      console.log("=== Complete FormData Contents ===");
      for (const [key, value] of formdata.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File - ${value.name} (${value.size} bytes, ${value.type})`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      console.log("Making API request to create institution...");

      // Make the API request
      const response = await apiRequest.post("institution/", formdata);

      console.log("API Response:", response.status, response.data);

      if (response.status === 200 || response.status === 201) {
        console.log("Institution created successfully:", response.data);

        // Refresh user data to get updated institutions
        try {
          console.log("Refreshing user data...");
          const fetchedUserResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/user/token/refresh/`,
            {refresh: refreshToken},
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
          const responseData = {
            ...fetchedUserResponse.data,
            institutionsAttached: fetchedUserResponse.data.institutions_attached,
          } as LoginResponse;

          handleUserRefresh(responseData);
        } catch (refreshError) {
          toast.error(
            "Organisation created, but failed to refresh user data. Please log out and log in again.",
          );
          dispatch(logoutStart());
        }

        toast.success("Organisation created successfully! It's now pending approval.");
        // setIsCreated(true);
      }
    } catch (error: any) {
      toast.error("Failed to create supermarket. Please try again.");

      if (error.response) {
        toast.error(
          `Server error: ${error.response.status} - ${
            error.response.data?.detail || "Unknown error"
          }`,
        );

        if (error.response.data?.detail && typeof error.response.data.detail === "object") {
          const errorMessages = Object.entries(error.response.data.detail)
            .map(([field, messages]) => {
              if (typeof messages === "object" && messages !== null) {
                return Object.entries(messages as Record<string, any>)
                  .map(([subField, subMessages]) => {
                    const messageArray = Array.isArray(subMessages) ? subMessages : [subMessages];
                    return `${field} ${subField}: ${messageArray.join(", ")}`;
                  })
                  .join("\n");
              } else {
                const messageArray = Array.isArray(messages) ? messages : [messages];
                return `${field}: ${messageArray.join(", ")}`;
              }
            })
            .join("\n");
          setErrorMessage(`Validation errors:\n${errorMessages}`);
        } else if (error.response.data?.detail) {
          setErrorMessage(error.response.data.detail);
        } else if (error.response.data?.message) {
          setErrorMessage(error.response.data.message);
        } else {
          setErrorMessage(
            `Server error (${error.response.status}): ${JSON.stringify(error.response.data)}`,
          );
        }
      } else if (error.request) {
        toast.error(
          "No response from server. Please check your internet connection and try again.",
        );
      } else {
        toast.error("Request setup error. Please try again.");
      }

      toast.error("Something went wrong!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="institutionName" className="text-sm font-medium">
                Organisation Name *
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                </div>
                <Input
                  id="institutionName"
                  type="text"
                  placeholder="Eco Organisation"
                  value={formData.institutionName}
                  onChange={(e) => updateFormData("institutionName", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="institutionEmail" className="text-sm font-medium">
                Email *
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="institutionEmail"
                  type="email"
                  placeholder="contact@ecosupermarket.com"
                  value={formData.institutionEmail}
                  onChange={(e) => updateFormData("institutionEmail", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="firstPhoneNumber" className="text-sm font-medium">
                Primary Phone Number *
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                </div>
                <Input
                  id="firstPhoneNumber"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.firstPhoneNumber}
                  onChange={(e) => updateFormData("firstPhoneNumber", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secondPhoneNumber" className="text-sm font-medium">
                Secondary Phone Number (Optional)
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <Input
                  id="secondPhoneNumber"
                  type="tel"
                  placeholder="+1 (555) 987-6543"
                  value={formData.secondPhoneNumber}
                  onChange={(e) => updateFormData("secondPhoneNumber", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Tell us about your supermarket..."
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Organisation Location *</Label>
              <LocationAutocomplete
                value={formData.location}
                onChange={(value) => updateFormData("location", value)}
                onCoordinatesChange={(lat, lon) => {
                  updateFormData("latitude", lat);
                  updateFormData("longitude", lon);
                }}
                placeholder="Search for your supermarket location..."
                showCurrentLocationButton={true}
              />
              {formData.latitude && formData.longitude && (
                <div className="text-xs text-muted-foreground mt-1">
                  Coordinates: {formData.latitude}, {formData.longitude}
                </div>
              )}
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Location Tips</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Make sure to select the exact location of your supermarket. This will help
                    customers find you easily and enable location-based features.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Documents (Optional)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload any required documents for your supermarket registration
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDocument}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Add Document
              </Button>
            </div>

            {formData.documents.length === 0 ? (
              <div className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-medium mb-2">No documents uploaded</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Documents are optional. You can add them later from your dashboard.
                </p>
                <Button type="button" onClick={addDocument} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload First Document
                </Button>
              </div>
            ) : (
              <div className="w-full space-y-3">
                {formData.documents.map((doc, index) => (
                  <div key={doc.id} className="w-full border rounded-lg p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <Badge className="mb-1">Document {index + 1}</Badge>
                          <p className="text-xs text-muted-foreground">
                            {doc.fileName || "No file selected"}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Document Title *</Label>
                        <Input
                          placeholder="e.g., Business License, Tax Certificate"
                          value={doc.title}
                          onChange={(e) => updateDocument(doc.id, "title", e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Upload File *</Label>
                        <div className="relative">
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
                            className="w-full file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                          />
                        </div>
                      </div>
                    </div>

                    {doc.file && (
                      <div className="w-full p-2 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2 text-xs">
                          <Check className="h-3 w-3 text-green-600" />
                          <span className="font-medium">File uploaded:</span>
                          <span className="text-muted-foreground">{doc.fileName}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(doc.file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addDocument}
                  className="w-full h-10 border-dashed border-2 flex items-center gap-2 hover:bg-muted/50"
                >
                  <Upload className="h-4 w-4" />
                  Add Another Document
                </Button>
              </div>
            )}

            <div className="w-full bg-muted/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="w-full">
                  <h4 className="font-medium text-xs mb-1">Document Guidelines</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <ul className="space-y-0.5">
                      <li>• Accepted formats: PDF, DOC, DOCX, JPG, PNG</li>
                      <li>• Maximum file size: 10MB per document</li>
                    </ul>
                    <ul className="space-y-0.5">
                      <li>• Business license or registration</li>
                      <li>• Tax identification documents</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-[90vh] w-full p-4">
      <form
        encType="multipart/form-data"
        onSubmit={(e) => {
          e.preventDefault();
          if (currentStep === STEPS.length) {
            handleSubmit();
          } else {
            nextStep();
          }
        }}
      >
        <Card className="w-full border-none shadow-none overflow-hidden flex flex-col h-full">
          <CardHeader className="py-3 px-4 space-y-2 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xlg mb-3">Create Your Organisation</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.title}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <Progress value={progress} className="h-1.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                {STEPS.map((step) => (
                  <div key={step.id} className="flex items-center gap-1">
                    {currentStep > step.id ? (
                      <Check className="h-3 w-3 text-primary" />
                    ) : (
                      <div
                        className={`h-3 w-3 rounded-full ${
                          currentStep === step.id ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                    <span className={currentStep === step.id ? "font-medium" : ""}>
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-auto p-4">
            {errorMessage && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 p-2 rounded-md mb-4 whitespace-pre-line">
                {errorMessage}
              </div>
            )}

            {/* Step Content */}
            <div className="h-full">{renderStepContent()}</div>
          </CardContent>

          <CardFooter className="border-t p-4 flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="submit"
                disabled={!validateStep(currentStep)}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || !validateStep(currentStep)}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Organisation
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
