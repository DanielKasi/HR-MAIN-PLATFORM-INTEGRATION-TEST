"use client";

import type React from "react";

import {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";
import {Icon} from "@iconify/react";
import {toast} from "sonner";
import {ConfirmationDialog} from "@/components/confirmation-dialog";
import {useSelector} from "react-redux";
import {selectAttachedInstitutions, selectSelectedInstitution} from "@/store/auth/selectors";
import {IUserInstitutionFormData} from "@/types";
import {institutionAPI, showErrorToast} from "@/lib/utils";
import {useDispatch} from "react-redux";
import {setAttachedInstitutions, setSelectedInstitution} from "@/store/auth/actions";
import {Upload, FileText, X, Check} from "lucide-react";
import {DocumentsList} from "@/components/documents-list";
import Image from "next/image";

interface DocumentFile {
  id: string;
  title: string;
  file: File | null;
  fileName: string;
}

export default function SettingsPage() {
  const institution = useSelector(selectSelectedInstitution);
  const attachedInstitutions = useSelector(selectAttachedInstitutions);
  const [activeTab, setActiveTab] = useState<'institution' | 'kyc'>('institution');
  const [formData, setFormData] = useState({
    institution_name: "",
    institution_email: "",
    first_phone_number: "",
    location: "",

    is_attendance_penalties_enabled: false,
    latitude: 0,
    longitude: 0,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState({
    institution_name: false,
    institution_email: false,
    first_phone_number: false,
    location: false,

    is_attendance_penalties_enabled: false,
    logo: false,
    documents: false,
  });
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0);

  const dispatch = useDispatch();

  useEffect(() => {
    if (institution) {
      setFormData({
        institution_name: institution.institution_name,
        institution_email: institution.institution_email,
        first_phone_number: institution.first_phone_number,
        location: institution.location,

        is_attendance_penalties_enabled: institution.is_attendance_penalties_enabled,
        latitude: institution.latitude,
        longitude: institution.longitude,
      });
    }
  }, [institution]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({...prev, [field]: value}));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo file size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }
      setLogoFile(file);
    }
  };

  const toggleEdit = (field: keyof typeof isEditing) => {
    setIsEditing((prev) => ({...prev, [field]: !prev[field]}));
  };

  const handleUseCurrentLocation = () => {
    setConfirmationDialog({
      isOpen: true,
      title: "Use Current Location",
      description:
        "This will set your current location as the institution's location. Make sure you are at the institution premises before proceeding.",
      onConfirm: () => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              handleInputChange("latitude", position.coords.latitude);
              handleInputChange("longitude", position.coords.longitude);
            },
            (error) => {
              toast.error(
                "Failed to get current location. Please check your location permissions.",
              );
            },
          );
        } else {
          toast.error("Geolocation is not supported by this browser");
        }
        setConfirmationDialog((prev) => ({...prev, isOpen: false}));
      },
    });
  };

  const handleSubmit = async () => {
    if (!institution) {
      return;
    }
    setIsLoading(true);
    try {
      const validDocuments = documents.filter((doc) => doc.file && doc.title.trim());
      if (validDocuments.length > 0) {
        // Handle KYC document upload
        const kycDocuments = validDocuments.map((doc) => ({
          document_title: doc.title.trim(),
          document_file: doc.file!,
        }));

        await institutionAPI.createKYCDocuments(kycDocuments);

        setDocuments([]); // Clear documents after successful submission
        setIsEditing((prev) => ({...prev, documents: false})); // Close document editing mode
        setDocumentsRefreshTrigger((prev) => prev + 1); // Trigger documents list refresh
        toast.success("KYC documents uploaded successfully");
      } else {
        // Handle institution settings update
        const updateData: Partial<IUserInstitutionFormData> & {
          institution_logo?: File;
        } = {
          institution_name: formData.institution_name,
          institution_email: formData.institution_email,
          first_phone_number: formData.first_phone_number,
          location: formData.location,

          is_attendance_penalties_enabled: formData.is_attendance_penalties_enabled,
          latitude: formData.latitude,
          longitude: formData.longitude,
        };

        if (logoFile) {
          updateData.institution_logo = logoFile;
        }

        const updatedInstitution = await institutionAPI.updateInstitution({
          institutionId: institution.id,
          data: updateData,
        });

        dispatch(setSelectedInstitution(updatedInstitution));
        dispatch(
          setAttachedInstitutions([
            ...attachedInstitutions.map((inst) =>
              inst.id === updatedInstitution.id ? updatedInstitution : inst,
            ),
          ]),
        );

        setLogoFile(null);
        toast.success("Settings updated successfully");
      }
    } catch (error) {
      showErrorToast({error, defaultMessage: "Failed to update settings"});
    } finally {
      setIsLoading(false);
    }
    setConfirmationDialog((prev) => ({...prev, isOpen: false}));
  };

  const handleSave = () => {
    // Check if we're uploading KYC documents
    const validDocuments = documents.filter((doc) => doc.file && doc.title.trim());
    const invalidDocuments = documents.filter((doc) => doc.file && !doc.title.trim());

    if (validDocuments.length > 0) {
      // Validate KYC documents
      if (invalidDocuments.length > 0) {
        toast.error("Please provide titles for all uploaded documents");
        return;
      }

      setConfirmationDialog({
        isOpen: true,
        title: "Upload KYC Documents",
        description: `Are you sure you want to upload ${validDocuments.length} KYC document(s)? This will add these documents to your institution's records.`,
        onConfirm: handleSubmit,
      });
    } else {
      // Validate institution settings

      setConfirmationDialog({
        isOpen: true,
        title: "Update Institution Settings",
        description:
          "Are you sure you want to update these institution settings? This will affect all users in your institution.",
        onConfirm: handleSubmit,
      });
    }
  };

  // Document management functions
  const addDocument = () => {
    const newDoc: DocumentFile = {
      id: Date.now().toString(),
      title: "",
      file: null,
      fileName: "",
    };
    setDocuments((prev) => [...prev, newDoc]);
  };

  const updateDocument = (id: string, field: keyof DocumentFile, value: any) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? {...doc, [field]: value} : doc)));
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleFileChange = (id: string, file: File | null) => {
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      const allowedTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      if (!fileExtension || !allowedTypes.includes(`.${fileExtension}`)) {
        toast.error("File type not allowed. Allowed types: PDF, DOC, DOCX, JPG, PNG");
        return;
      }
    }
    updateDocument(id, "file", file);
    updateDocument(id, "fileName", file ? file.name : "");
  };

  const renderInstitutionSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Institution Settings</h2>
      </div>

      {/* Institution Logo */}
      <div className="flex flex-col  items-center justify-center">
        <div className="relative">
          {institution?.institution_logo || logoFile ? (
            <div className="w-24 h-24 rounded-lg overflow-hidden relative">
              <Image
                fill
                src={
                  logoFile
                    ? URL.createObjectURL(logoFile)
                    : process.env.NEXT_PUBLIC_BASE_URL + institution?.institution_logo!
                }
                alt="Institution Logo"
                className="w-full h-full object-cover object-center"
              />
            </div>
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-primary/30 to-primary/50 rounded-lg flex items-center justify-center">
              <Icon icon="hugeicons:building-04" className="w-12 h-12 text-white" />
            </div>
          )}
          {isEditing.logo && (
            <div className="absolute -bottom-1 -right-1">
              <label htmlFor="logo-upload" className="cursor-pointer">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Icon icon="hugeicons:edit-01" className="w-3 h-3 text-white" />
                </div>
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleEdit("logo")}
          className="rounded-lg border-gray-200 hover:bg-gray-50 mt-2"
        >
          {isEditing.logo ? "Cancel" : "Change Logo"}
        </Button>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="institution_name" className="text-sm font-medium text-gray-700">
            Institution Name
          </Label>
          <div className="flex items-center space-x-3">
            {isEditing.institution_name ? (
              <Input
                id="institution_name"
                value={formData.institution_name}
                onChange={(e) => handleInputChange("institution_name", e.target.value)}
                className="flex-1 rounded-lg border-gray-200 focus:border-orange-400 focus:ring-orange-400"
              />
            ) : (
              <div className="flex-1 px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {formData.institution_name}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleEdit("institution_name")}
              className="rounded-lg border-gray-200 hover:bg-gray-50"
            >
              {isEditing.institution_name ? "Cancel" : "Change"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="institution_email" className="text-sm font-medium text-gray-700">
            Email Address
          </Label>
          <div className="flex items-center space-x-3">
            {isEditing.institution_email ? (
              <Input
                id="institution_email"
                type="email"
                disabled
                value={formData.institution_email}
                onChange={(e) => handleInputChange("institution_email", e.target.value)}
                className="flex-1 rounded-lg border-gray-200 focus:border-orange-400 focus:ring-orange-400"
              />
            ) : (
              <div className="flex-1 px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {formData.institution_email}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="first_phone_number" className="text-sm font-medium text-gray-700">
            Phone Number
          </Label>
          <div className="flex items-center space-x-3">
            {isEditing.first_phone_number ? (
              <Input
                id="first_phone_number"
                value={formData.first_phone_number}
                onChange={(e) => handleInputChange("first_phone_number", e.target.value)}
                className="flex-1 rounded-lg border-gray-200 focus:border-orange-400 focus:ring-orange-400"
              />
            ) : (
              <div className="flex-1 px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                {formData.first_phone_number || "Not set"}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleEdit("first_phone_number")}
              className="rounded-lg border-gray-200 hover:bg-gray-50"
            >
              {isEditing.first_phone_number ? "Cancel" : "Change"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium text-gray-700">
            Location
          </Label>
          <div className="flex items-center space-x-3">
            {isEditing.location ? (
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <Icon icon="hugeicons:location-01" className="w-4 h-4 text-gray-500" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    className="flex-1 rounded-lg border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                    placeholder="Enter institution address"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  className="rounded-lg border-gray-200 hover:bg-gray-50 flex items-center space-x-2 bg-transparent"
                >
                  <Icon icon="hugeicons:location-01" className="w-4 h-4" />
                  <span>Use Current Location</span>
                </Button>
              </div>
            ) : (
              <div className="flex-1 px-4 py-3 bg-gray-50 rounded-lg text-gray-900 flex items-center space-x-2">
                <Icon icon="hugeicons:location-01" className="w-4 h-4 text-gray-500" />
                <span>{formData.location || "Not set"}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleEdit("location")}
              className="rounded-lg border-gray-200 hover:bg-gray-50"
            >
              {isEditing.location ? "Cancel" : "Change"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Attendance Penalties</Label>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-900">
              {formData.is_attendance_penalties_enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={formData.is_attendance_penalties_enabled}
              onCheckedChange={(checked) =>
                handleInputChange("is_attendance_penalties_enabled", checked)
              }
            />
          </div>
        </div>
      </div>

      <div className="pt-6">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="bg-primary hover:bg-primary text-white px-6 py-2 font-medium w-[474px] rounded-full"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <Icon icon="hugeicons:loading-03" className="w-4 h-4 animate-spin" />
              <span>Updating Changes...</span>
            </div>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );

  const renderKYCDocuments = () => (
    <div className="space-y-6 ">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">KYC Documents</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleEdit("documents")}
          className="rounded-lg border-gray-200 hover:bg-gray-50"
        >
          {isEditing.documents ? "Cancel" : "Manage Documents"}
        </Button>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-4">
          Submit and review your KYC files
        </p>
        <DocumentsList
          refreshTrigger={documentsRefreshTrigger}
          onDocumentChange={() => setDocumentsRefreshTrigger((prev) => prev + 1)}
        />
      </div>

      {isEditing.documents && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Upload Documents</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDocument}
              className="rounded-lg border-gray-200 hover:bg-gray-50 flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Add Document</span>
            </Button>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No documents added yet</p>
              <p className="text-xs">Click "Add Document" to upload KYC documents</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Document title (e.g., Business License, Tax Certificate)"
                      value={doc.title}
                      onChange={(e) => updateDocument(doc.id, "title", e.target.value)}
                      className="rounded-lg border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                    />
                    <div className="flex items-center space-x-2">
                      <label htmlFor={`file-${doc.id}`} className="cursor-pointer">
                        <div className="flex items-center space-x-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <Upload className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {doc.fileName || "Choose file"}
                          </span>
                        </div>
                      </label>
                      <input
                        id={`file-${doc.id}`}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleFileChange(doc.id, e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                      {doc.file && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <Check className="w-4 h-4" />
                          <span className="text-xs">Selected</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDocument(doc.id)}
                    className="rounded-lg border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {documents.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <p>• Supported formats: PDF, DOC, DOCX, JPG, PNG</p>
                  <p>• Maximum file size: 10MB per document</p>
                </div>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary text-white rounded-lg px-6"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <Icon
                        icon="hugeicons:loading-03"
                        className="w-4 h-4 animate-spin"
                      />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    "Upload Documents"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 rounded-lg">
      {/* Header */}
      <div className="bg-white border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4 ">
            <div className="border rounded-full p-3">
                <Icon icon="hugeicons:arrow-left-02" className="w-5 h-5" />
            </div>
          
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="flex">
        {/* Left Sub-navigation Panel */}
        <div className="flex-[3.0] bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('institution')}
                className={`w-full flex items-center space-x-3 p-4 rounded-lg text-left transition-colors ${
                  activeTab === 'institution'
                    ? 'bg-red-50 border border-red-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Icon 
                  icon="hugeicons:building-06" 
                  className={`w-5 h-5 ${
                    activeTab === 'institution' ? 'text-primary' : 'text-gray-900'
                  }`} 
                />
                <div>
                  <div className={`font-medium ${
                    activeTab === 'institution' ? 'text-primary' : 'text-gray-900'
                  }`}>
                    Institution Settings
                  </div>
                  <div className={`text-sm ${
                    activeTab === 'institution' ? 'text-[#6B7280]' : 'text-[#6B7280]'
                  }`}>
                    Manage details of your institution.
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('kyc')}
                className={`w-full flex items-center space-x-3 p-4 rounded-lg text-left transition-colors ${
                  activeTab === 'kyc'
                    ? 'bg-red-50 border border-red-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Icon 
                  icon="hugeicons:document-attachment" 
                  className={`w-5 h-5 ${
                    activeTab === 'kyc' ? 'text-primary' : 'text-gray-500'
                  }`} 
                />
                <div>
                  <div className={`font-medium ${
                    activeTab === 'kyc' ? 'text-primary' : 'text-gray-900'
                  }`}>
                    KYC Documents
                  </div>
                  <div className={`text-sm ${
                    activeTab === 'kyc' ? 'text-[#6B7280]' : 'text-[#6B7280]'
                  }`}>
                    Submit and review your KYC files
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-[7.0] p-6 bg-white">
          {activeTab === 'institution' ? renderInstitutionSettings() : renderKYCDocuments()}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog((prev) => ({...prev, isOpen: false}))}
        onConfirm={confirmationDialog.onConfirm}
        title={confirmationDialog.title}
        description={confirmationDialog.description}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
}
