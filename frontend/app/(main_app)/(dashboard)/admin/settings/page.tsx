"use client";

import type React from "react";

import {useState, useEffect, useRef} from "react";
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
import {Upload, FileText, X, Check, Plus, Edit, Trash2} from "lucide-react";
import {DocumentsList} from "@/components/documents-list";
import Image from "next/image";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Badge} from "@/components/ui/badge";
import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";
import {TableSkeleton} from "@/components/common/table-skeleton";
import {penaltyConfigAPI, branchLocationComparisonConfigAPI} from "@/lib/utils";
import type {IInstitutionPenaltyConfig, IInstitutionPenaltyConfigFormData, IBranchPenaltyConfig, IBranchPenaltyConfigFormData, IBranchLocationComparisonConfig, IBranchLocationComparisonConfigFormData} from "@/types/types.utils";
import Link from "next/link";
import {formatCurrency} from "@/lib/helpers";

interface DocumentFile {
  id: string;
  title: string;
  file: File | null;
  fileName: string;
}

export default function SettingsPage() {
  const institution = useSelector(selectSelectedInstitution);
  const attachedInstitutions = useSelector(selectAttachedInstitutions);
  const [activeTab, setActiveTab] = useState<'institution' | 'kyc' | 'penalties' | 'branch_penalties' | 'location_comparison'>('institution');
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
  
  // Penalty Configuration state
  const [penaltyConfigs, setPenaltyConfigs] = useState<IInstitutionPenaltyConfig[]>([]);
  const [penaltyFormData, setPenaltyFormData] = useState<IInstitutionPenaltyConfigFormData>({
    penalty_type: "late_coming",
    penalty_value: 0,
    penalty_value_type: "fixed",
    percentage: undefined,
    institution: institution?.id || 0,
  });
  const [isPenaltyFormOpen, setIsPenaltyFormOpen] = useState(false);
  const [editingPenaltyConfig, setEditingPenaltyConfig] = useState<IInstitutionPenaltyConfig | null>(null);
  const [penaltySearchTerm, setPenaltySearchTerm] = useState("");
  const [penaltyTypeFilter, setPenaltyTypeFilter] = useState<string>("all");

  // Branch Penalty Configuration state
  const [branchPenaltyConfigs, setBranchPenaltyConfigs] = useState<IBranchPenaltyConfig[]>([]);
  const [branchPenaltyFormData, setBranchPenaltyFormData] = useState<IBranchPenaltyConfigFormData>({
    branch: 0,
    penalty_type: "late_coming",
    penalty_value: 0,
    penalty_value_type: "fixed",
    percentage: undefined,
  });
  const [isBranchPenaltyFormOpen, setIsBranchPenaltyFormOpen] = useState(false);
  const [editingBranchPenaltyConfig, setEditingBranchPenaltyConfig] = useState<IBranchPenaltyConfig | null>(null);
  const [branchPenaltySearchTerm, setBranchPenaltySearchTerm] = useState("");
  const [branchPenaltyTypeFilter, setBranchPenaltyTypeFilter] = useState<string>("all");
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  
  // Location Comparison Config state
  const [locationComparisonConfigs, setLocationComparisonConfigs] = useState<IBranchLocationComparisonConfig[]>([]);
  const [locationComparisonFormData, setLocationComparisonFormData] = useState<IBranchLocationComparisonConfigFormData>({
    branch: 0,
    radius_in_meters: 100,
  });
  const [isLocationComparisonFormOpen, setIsLocationComparisonFormOpen] = useState(false);
  const [editingLocationComparisonConfig, setEditingLocationComparisonConfig] = useState<IBranchLocationComparisonConfig | null>(null);
  const [locationComparisonSearchTerm, setLocationComparisonSearchTerm] = useState("");
  const [selectedLocationComparisonBranchId, setSelectedLocationComparisonBranchId] = useState<number | null>(null);
  
  // Refs for table refresh functions
  const institutionPenaltyRefreshRef = useRef<(() => void) | null>(null);
  const branchPenaltyRefreshRef = useRef<(() => void) | null>(null);
  const locationComparisonRefreshRef = useRef<(() => void) | null>(null);

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

  // Penalty Configuration helper functions
  const handlePenaltyInputChange = (field: keyof IInstitutionPenaltyConfigFormData, value: string | number) => {
    setPenaltyFormData((prev) => ({...prev, [field]: value}));
  };

  const resetPenaltyForm = () => {
    setPenaltyFormData({
      penalty_type: "late_coming",
      penalty_value: 0,
      penalty_value_type: "fixed",
      percentage: undefined,
      institution: institution?.id || 0,
    });
    setEditingPenaltyConfig(null);
    setIsPenaltyFormOpen(false);
  };

  const handleCreatePenaltyConfig = () => {
    resetPenaltyForm();
    setIsPenaltyFormOpen(true);
  };

  const handleEditPenaltyConfig = (config: IInstitutionPenaltyConfig) => {
    setPenaltyFormData({
      penalty_type: config.penalty_type,
      penalty_value: config.penalty_value,
      penalty_value_type: config.penalty_value_type,
      percentage: config.percentage || undefined,
      institution: institution?.id || 0,
    });
    setEditingPenaltyConfig(config);
    setIsPenaltyFormOpen(true);
  };

  const handleSavePenaltyConfig = async () => {
    if (!institution?.id) return;

    setIsLoading(true);
    try {
      if (editingPenaltyConfig) {
        await penaltyConfigAPI.updateInstitutionPenaltyConfig(editingPenaltyConfig.id, penaltyFormData);
        toast.success("Penalty configuration updated successfully");
      } else {
        await penaltyConfigAPI.createInstitutionPenaltyConfig(penaltyFormData);
        toast.success("Penalty configuration created successfully");
      }
      resetPenaltyForm();
      // Trigger table refresh
      institutionPenaltyRefreshRef.current?.();
    } catch (error) {
      showErrorToast({error, defaultMessage: "Failed to save penalty configuration"});
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePenaltyConfig = async (config: IInstitutionPenaltyConfig) => {
    setConfirmationDialog({
      isOpen: true,
      title: "Delete Penalty Configuration",
      description: `Are you sure you want to delete the penalty configuration for ${config.penalty_type}?`,
      onConfirm: async () => {
        try {
          await penaltyConfigAPI.deleteInstitutionPenaltyConfig(config.id);
          toast.success("Penalty configuration deleted successfully");
          // Trigger table refresh
          institutionPenaltyRefreshRef.current?.();
        } catch (error) {
          showErrorToast({error, defaultMessage: "Failed to delete penalty configuration"});
        }
        setConfirmationDialog((prev) => ({...prev, isOpen: false}));
      },
    });
  };

  const getPenaltyTypeDisplay = (type: string) => {
    const types: {[key: string]: string} = {
      late_coming: "Late Coming",
      early_leaving: "Early Leaving",
      absent: "Absent",
      no_response_spotcheck: "No Response for Spotcheck",
      late_spotcheck_response: "Late Spotcheck Response",
    };
    return types[type] || type;
  };

  const getPenaltyValueTypeDisplay = (type: string) => {
    return type === "fixed" ? "Fixed Amount" : "Percentage";
  };

  const formatPenaltyValue = (config: IInstitutionPenaltyConfig) => {
    if (config.penalty_value_type === "percentage") {
      return `${config.percentage}%`;
    }
    return `${formatCurrency(config.penalty_value)}`;
  };

  // Branch Penalty Configuration helper functions
  const handleBranchPenaltyInputChange = (field: keyof IBranchPenaltyConfigFormData, value: string | number) => {
    setBranchPenaltyFormData((prev) => ({...prev, [field]: value}));
  };

  const resetBranchPenaltyForm = () => {
    setBranchPenaltyFormData({
      branch: selectedBranchId || 0,
      penalty_type: "late_coming",
      penalty_value: 0,
      penalty_value_type: "fixed",
      percentage: undefined,
    });
    setEditingBranchPenaltyConfig(null);
    setIsBranchPenaltyFormOpen(false);
  };

  const handleCreateBranchPenaltyConfig = () => {
    if (!selectedBranchId) {
      toast.error("Please select a branch first");
      return;
    }
    resetBranchPenaltyForm();
    setIsBranchPenaltyFormOpen(true);
  };

  const handleEditBranchPenaltyConfig = (config: IBranchPenaltyConfig) => {
    setBranchPenaltyFormData({
      branch: config.branch,
      penalty_type: config.penalty_type,
      penalty_value: config.penalty_value,
      penalty_value_type: config.penalty_value_type,
      percentage: config.percentage || undefined,
    });
    setEditingBranchPenaltyConfig(config);
    setIsBranchPenaltyFormOpen(true);
  };

  const handleSaveBranchPenaltyConfig = async () => {
    if (!selectedBranchId) return;

    setIsLoading(true);
    try {
      if (editingBranchPenaltyConfig) {
        await penaltyConfigAPI.updateBranchPenaltyConfig(editingBranchPenaltyConfig.id, branchPenaltyFormData);
        toast.success("Branch penalty configuration updated successfully");
      } else {
        await penaltyConfigAPI.createBranchPenaltyConfig(branchPenaltyFormData);
        toast.success("Branch penalty configuration created successfully");
      }
      resetBranchPenaltyForm();
      // Trigger table refresh
      branchPenaltyRefreshRef.current?.();
    } catch (error) {
      showErrorToast({error, defaultMessage: "Failed to save branch penalty configuration"});
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBranchPenaltyConfig = async (config: IBranchPenaltyConfig) => {
    setConfirmationDialog({
      isOpen: true,
      title: "Delete Branch Penalty Configuration",
      description: `Are you sure you want to delete the penalty configuration for ${config.penalty_type}?`,
      onConfirm: async () => {
        try {
          await penaltyConfigAPI.deleteBranchPenaltyConfig(config.id);
          toast.success("Branch penalty configuration deleted successfully");
          // Trigger table refresh
          branchPenaltyRefreshRef.current?.();
        } catch (error) {
          showErrorToast({error, defaultMessage: "Failed to delete branch penalty configuration"});
        }
        setConfirmationDialog((prev) => ({...prev, isOpen: false}));
      },
    });
  };

  const formatBranchPenaltyValue = (config: IBranchPenaltyConfig) => {
    if (config.penalty_value_type === "percentage") {
      return `${config.percentage}%`;
    }
    return `$${Number(config.penalty_value).toFixed(2)}`;
  };

  // Location Comparison Config helper functions
  const handleLocationComparisonInputChange = (field: keyof IBranchLocationComparisonConfigFormData, value: string | number) => {
    setLocationComparisonFormData((prev) => ({...prev, [field]: value}));
  };

  const resetLocationComparisonForm = () => {
    setLocationComparisonFormData({
      branch: selectedLocationComparisonBranchId || 0,
      radius_in_meters: 100,
    });
    setEditingLocationComparisonConfig(null);
    setIsLocationComparisonFormOpen(false);
  };

  const handleCreateLocationComparisonConfig = () => {
    if (!selectedLocationComparisonBranchId) {
      toast.error("Please select a branch first");
      return;
    }
    resetLocationComparisonForm();
    setIsLocationComparisonFormOpen(true);
  };

  const handleEditLocationComparisonConfig = (config: IBranchLocationComparisonConfig) => {
    setLocationComparisonFormData({
      branch: config.branch,
      radius_in_meters: config.radius_in_meters,
    });
    setEditingLocationComparisonConfig(config);
    setIsLocationComparisonFormOpen(true);
  };

  const handleSaveLocationComparisonConfig = async () => {
    if (!selectedLocationComparisonBranchId) return;

    setIsLoading(true);
    try {
      if (editingLocationComparisonConfig) {
        await branchLocationComparisonConfigAPI.updateBranchLocationComparisonConfig(editingLocationComparisonConfig.id, locationComparisonFormData);
        toast.success("Location comparison configuration updated successfully");
      } else {
        await branchLocationComparisonConfigAPI.createBranchLocationComparisonConfig(locationComparisonFormData);
        toast.success("Location comparison configuration created successfully");
      }
      resetLocationComparisonForm();
      // Trigger table refresh
      locationComparisonRefreshRef.current?.();
    } catch (error) {
      showErrorToast({error, defaultMessage: "Failed to save location comparison configuration"});
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLocationComparisonConfig = async (config: IBranchLocationComparisonConfig) => {
    setConfirmationDialog({
      isOpen: true,
      title: "Delete Location Comparison Configuration",
      description: `Are you sure you want to delete the location comparison configuration for ${config.branch_name}?`,
      onConfirm: async () => {
        try {
          await branchLocationComparisonConfigAPI.deleteBranchLocationComparisonConfig(config.id);
          toast.success("Location comparison configuration deleted successfully");
          // Trigger table refresh
          locationComparisonRefreshRef.current?.();
        } catch (error) {
          showErrorToast({error, defaultMessage: "Failed to delete location comparison configuration"});
        }
        setConfirmationDialog((prev) => ({...prev, isOpen: false}));
      },
    });
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

  const renderPenaltyConfigurations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Penalty Configurations</h2>
                  <Button
          onClick={handleCreatePenaltyConfig}
          className="bg-primary hover:bg-primary text-white rounded-lg px-4 py-2 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Penalty</span>
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Icon icon="hugeicons:search-01" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 !h-5 !w-5" />
          <Input
            placeholder="Search penalty types"
            value={penaltySearchTerm}
            onChange={(e) => setPenaltySearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={penaltyTypeFilter} onValueChange={setPenaltyTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="late_coming">Late Coming</SelectItem>
            <SelectItem value="early_leaving">Early Leaving</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="no_response_spotcheck">No Response for Spotcheck</SelectItem>
            <SelectItem value="late_spotcheck_response">Late Spotcheck Response</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Penalty Configurations Table */}
      <div className="">
        <PaginatedTableWrapper<IInstitutionPenaltyConfig>
          fetchFirstPage={async () => {
            if (!institution) throw new Error("No institution selected");
            return await penaltyConfigAPI.getInstitutionPenaltyConfigs({
              institutionId: institution.id,
              page: 1,
              search: penaltySearchTerm || undefined,
              penalty_type: penaltyTypeFilter !== "all" ? penaltyTypeFilter : undefined,
            });
          }}
          fetchFromUrl={penaltyConfigAPI.getInstitutionPenaltyConfigsFromUrl}
          deps={[institution?.id, penaltySearchTerm, penaltyTypeFilter]}
          className="space-y-4"
          footerClassName="pt-4"
        >
          {({data, loading, refresh}) => {
            // Store refresh function in ref when component mounts/updates
            useEffect(() => {
              institutionPenaltyRefreshRef.current = refresh;
            }, [refresh]);

            if (loading) {
              return <TableSkeleton rows={5} columns={4} />;
            }

            if (!data || data.results.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  {penaltySearchTerm ? "No penalty configurations found matching your search criteria" : "No penalty configurations found"}
                </div>
              );
            }

            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Penalty Type</TableHead>
                    <TableHead>Value Type</TableHead>
                    <TableHead>Penalty Value</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        {getPenaltyTypeDisplay(config.penalty_type)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getPenaltyValueTypeDisplay(config.penalty_value_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatPenaltyValue(config)}
                      </TableCell>
                      <TableCell>
                      <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPenaltyConfig(config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePenaltyConfig(config)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          }}
        </PaginatedTableWrapper>
      </div>

      {/* Penalty Configuration Form Modal */}
      {isPenaltyFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingPenaltyConfig ? "Edit Penalty Configuration" : "Add Penalty Configuration"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetPenaltyForm}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <Icon icon="hugeicons:close-01" className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="penalty_type">Penalty Type</Label>
                <Select
                  value={penaltyFormData.penalty_type}
                  onValueChange={(value) => handlePenaltyInputChange("penalty_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select penalty type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="late_coming">Late Coming</SelectItem>
                    <SelectItem value="early_leaving">Early Leaving</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="no_response_spotcheck">No Response for Spotcheck</SelectItem>
                    <SelectItem value="late_spotcheck_response">Late Spotcheck Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="penalty_value_type">Value Type</Label>
                <Select
                  value={penaltyFormData.penalty_value_type}
                  onValueChange={(value) => handlePenaltyInputChange("penalty_value_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select value type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">Percentage of Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {penaltyFormData.penalty_value_type === "fixed" ? (
                <div>
                  <Label htmlFor="penalty_value">Penalty Amount ($)</Label>
                  <Input
                    id="penalty_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={penaltyFormData.penalty_value}
                    onChange={(e) => handlePenaltyInputChange("penalty_value", parseFloat(e.target.value) || 0)}
                    placeholder="Enter penalty amount"
                  />
                      </div>
                    ) : (
                <div>
                  <Label htmlFor="percentage">Percentage (%)</Label>
                  <Input
                    id="percentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={penaltyFormData.percentage || ""}
                    onChange={(e) => handlePenaltyInputChange("percentage", parseFloat(e.target.value) || 0)}
                    placeholder="Enter percentage"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={resetPenaltyForm}
                    disabled={isLoading}
                className="flex-1 rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePenaltyConfig}
                disabled={isLoading}
                className="bg-primary hover:bg-primary text-white flex-1 rounded-full"
              >
                {isLoading ? "Saving..." : editingPenaltyConfig ? "Update" : "Create"}
              </Button>
            </div>
              </div>
        </div>
      )}
      </div>
  );

  const renderBranchPenaltyConfigurations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Branch Penalty Configurations</h2>
        <Button
          onClick={handleCreateBranchPenaltyConfig}
          className="bg-primary hover:bg-primary text-white rounded-lg px-4 py-2 flex items-center space-x-2"
          disabled={!selectedBranchId}
        >
          <Plus className="w-4 h-4" />
          <span>Add Branch Penalty</span>
        </Button>
      </div>

      {/* Branch Selection */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Icon icon="hugeicons:info-circle" className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-medium text-blue-900">Select Branch</h3>
            <p className="text-sm text-blue-700">
              Choose a branch to manage its penalty configurations. Each branch can have different penalty settings.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Select value={selectedBranchId?.toString() || ""} onValueChange={(value) => setSelectedBranchId(parseInt(value))}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {institution?.branches?.map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.branch_name}
                </SelectItem>
              )) || []}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedBranchId && (
        <>
          {/* Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Icon icon="hugeicons:search-01" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 !h-5 !w-5" />
              <Input
                placeholder="Search penalty types"
                value={branchPenaltySearchTerm}
                onChange={(e) => setBranchPenaltySearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={branchPenaltyTypeFilter} onValueChange={setBranchPenaltyTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="late_coming">Late Coming</SelectItem>
                <SelectItem value="early_leaving">Early Leaving</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="no_response_spotcheck">No Response for Spotcheck</SelectItem>
                <SelectItem value="late_spotcheck_response">Late Spotcheck Response</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Branch Penalty Configurations Table */}
          <div className="">
            <PaginatedTableWrapper<IBranchPenaltyConfig>
              fetchFirstPage={async () => {
                if (!selectedBranchId) throw new Error("No branch selected");
                return await penaltyConfigAPI.getBranchPenaltyConfigs({
                  branchId: selectedBranchId,
                  page: 1,
                  search: branchPenaltySearchTerm || undefined,
                  penalty_type: branchPenaltyTypeFilter !== "all" ? branchPenaltyTypeFilter : undefined,
                });
              }}
              fetchFromUrl={penaltyConfigAPI.getBranchPenaltyConfigsFromUrl}
              deps={[selectedBranchId, branchPenaltySearchTerm, branchPenaltyTypeFilter]}
              className="space-y-4"
              footerClassName="pt-4"
            >
              {({data, loading, refresh}) => {
                // Store refresh function in ref when component mounts/updates
                useEffect(() => {
                  branchPenaltyRefreshRef.current = refresh;
                }, [refresh]);

                if (loading) {
                  return <TableSkeleton rows={5} columns={4} />;
                }

                if (!data || data.results.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      {branchPenaltySearchTerm ? "No branch penalty configurations found matching your search criteria" : "No branch penalty configurations found"}
                    </div>
                  );
                }

                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Penalty Type</TableHead>
                        <TableHead>Value Type</TableHead>
                        <TableHead>Penalty Value</TableHead>
                        <TableHead className="w-12">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.results.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">
                            {getPenaltyTypeDisplay(config.penalty_type)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getPenaltyValueTypeDisplay(config.penalty_value_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatBranchPenaltyValue(config)}
                          </TableCell>
                          <TableCell>
                      <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditBranchPenaltyConfig(config)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteBranchPenaltyConfig(config)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
              }}
            </PaginatedTableWrapper>
          </div>
        </>
      )}

      {/* Branch Penalty Configuration Form Modal */}
      {isBranchPenaltyFormOpen && selectedBranchId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingBranchPenaltyConfig ? "Edit Branch Penalty Configuration" : "Add Branch Penalty Configuration"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetBranchPenaltyForm}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <Icon icon="hugeicons:close-01" className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="branch_penalty_type">Penalty Type</Label>
                <Select
                  value={branchPenaltyFormData.penalty_type}
                  onValueChange={(value) => handleBranchPenaltyInputChange("penalty_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select penalty type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="late_coming">Late Coming</SelectItem>
                    <SelectItem value="early_leaving">Early Leaving</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="no_response_spotcheck">No Response for Spotcheck</SelectItem>
                    <SelectItem value="late_spotcheck_response">Late Spotcheck Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="branch_penalty_value_type">Value Type</Label>
                <Select
                  value={branchPenaltyFormData.penalty_value_type}
                  onValueChange={(value) => handleBranchPenaltyInputChange("penalty_value_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select value type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">Percentage of Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {branchPenaltyFormData.penalty_value_type === "fixed" ? (
                <div>
                  <Label htmlFor="branch_penalty_value">Penalty Amount ($)</Label>
                  <Input
                    id="branch_penalty_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={branchPenaltyFormData.penalty_value}
                    onChange={(e) => handleBranchPenaltyInputChange("penalty_value", parseFloat(e.target.value) || 0)}
                    placeholder="Enter penalty amount"
                  />
                      </div>
                    ) : (
                <div>
                  <Label htmlFor="branch_percentage">Percentage (%)</Label>
                  <Input
                    id="branch_percentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={branchPenaltyFormData.percentage || ""}
                    onChange={(e) => handleBranchPenaltyInputChange("percentage", parseFloat(e.target.value) || 0)}
                    placeholder="Enter percentage"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={resetBranchPenaltyForm}
                disabled={isLoading}
                className="flex-1 rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBranchPenaltyConfig}
                disabled={isLoading}
                className="bg-primary hover:bg-primary text-white flex-1 rounded-full"
              >
                {isLoading ? "Saving..." : editingBranchPenaltyConfig ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
        </div>
      )}
      </div>
  );

  const renderLocationComparisonConfigurations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Branch Location Comparison Configurations</h2>
        <Button
          onClick={handleCreateLocationComparisonConfig}
          className="bg-primary hover:bg-primary text-white rounded-lg px-4 py-2 flex items-center space-x-2"
          disabled={!selectedLocationComparisonBranchId}
        >
          <Plus className="w-4 h-4" />
          <span>Add Location Config</span>
        </Button>
      </div>

      {/* Branch Selection */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Icon icon="hugeicons:info-circle" className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="font-medium text-green-900">Select Branch</h3>
            <p className="text-sm text-green-700">
              Choose a branch to manage its location comparison settings. Each branch can have different location parameters.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Select value={selectedLocationComparisonBranchId?.toString() || ""} onValueChange={(value) => setSelectedLocationComparisonBranchId(parseInt(value))}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {institution?.branches?.map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.branch_name}
                </SelectItem>
              )) || []}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedLocationComparisonBranchId && (
        <>
          {/* Search */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Icon icon="hugeicons:search-01" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by branch name..."
                value={locationComparisonSearchTerm}
                onChange={(e) => setLocationComparisonSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Location Comparison Configurations Table */}
          <div className="">
            <PaginatedTableWrapper<IBranchLocationComparisonConfig>
              fetchFirstPage={async () => {
                if (!institution) throw new Error("No institution selected");
                return await branchLocationComparisonConfigAPI.getBranchLocationComparisonConfigs({
                  institutionId: institution.id,
                  page: 1,
                  search: locationComparisonSearchTerm || undefined,
                });
              }}
              fetchFromUrl={branchLocationComparisonConfigAPI.getBranchLocationComparisonConfigsFromUrl}
              deps={[institution?.id, locationComparisonSearchTerm]}
              className="space-y-4"
              footerClassName="pt-4"
            >
              {({data, loading, refresh}) => {
                // Store refresh function in ref when component mounts/updates
                useEffect(() => {
                  locationComparisonRefreshRef.current = refresh;
                }, [refresh]);

                if (loading) {
                  return <TableSkeleton rows={5} columns={5} />;
                }

                if (!data || data.results.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      {locationComparisonSearchTerm ? "No location comparison configurations found matching your search criteria" : "No location comparison configurations found"}
                    </div>
                  );
                }

                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Branch Name</TableHead>
                        <TableHead>Radius (meters)</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.results.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">{config.branch_name}</TableCell>
                          <TableCell>{config.radius_in_meters}m</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLocationComparisonConfig(config)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLocationComparisonConfig(config)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
              }}
            </PaginatedTableWrapper>
          </div>
        </>
      )}

      {/* Location Comparison Configuration Form Modal */}
      {isLocationComparisonFormOpen && selectedLocationComparisonBranchId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingLocationComparisonConfig ? "Edit Location Comparison Configuration" : "Add Location Comparison Configuration"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetLocationComparisonForm}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <Icon icon="hugeicons:close-01" className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={locationComparisonFormData}
                  onChange={(e) => handleLocationComparisonInputChange("latitude", parseFloat(e.target.value) || 0)}
                  placeholder="Enter latitude"
                />
              </div>

              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={locationComparisonFormData.longitude}
                  onChange={(e) => handleLocationComparisonInputChange("longitude", parseFloat(e.target.value) || 0)}
                  placeholder="Enter longitude"
                />
              </div> */}

              <div>
                <Label htmlFor="radius">Radius (meters)</Label>
                <Input
                  id="radius"
                  type="number"
                  min="1"
                  value={locationComparisonFormData.radius_in_meters}
                  onChange={(e) => handleLocationComparisonInputChange("radius_in_meters", parseInt(e.target.value) || 100)}
                  placeholder="Enter radius in meters"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={resetLocationComparisonForm}
                disabled={isLoading}
                className="flex-1 rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveLocationComparisonConfig}
                disabled={isLoading}
                className="bg-primary hover:bg-primary text-white flex-1 rounded-full"
              >
                {isLoading ? "Saving..." : editingLocationComparisonConfig ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 rounded-lg">
      {/* Header */}
      <div className="bg-white border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4 ">
            <Link href="/admin" className="border rounded-full p-3">
                <Icon icon="hugeicons:arrow-left-02" className="w-5 h-5" />
            </Link>
          
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

              <button
                onClick={() => setActiveTab('penalties')}
                className={`w-full flex items-center space-x-3 p-4 rounded-lg text-left transition-colors ${
                  activeTab === 'penalties'
                    ? 'bg-red-50 border border-red-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Icon 
                  icon="hugeicons:settings-02" 
                  className={`w-5 h-5 ${
                    activeTab === 'penalties' ? 'text-primary' : 'text-gray-500'
                  }`} 
                />
                <div>
                  <div className={`font-medium ${
                    activeTab === 'penalties' ? 'text-primary' : 'text-gray-900'
                  }`}>
                    Institution Penalties
                  </div>
                  <div className={`text-sm ${
                    activeTab === 'penalties' ? 'text-[#6B7280]' : 'text-[#6B7280]'
                  }`}>
                    Manage institution-level penalty settings
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('branch_penalties')}
                className={`w-full flex items-center space-x-3 p-4 rounded-lg text-left transition-colors ${
                  activeTab === 'branch_penalties'
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Icon 
                  icon="hugeicons:building-04" 
                  className={`w-5 h-5 ${
                    activeTab === 'branch_penalties' ? 'text-primary' : 'text-gray-500'
                  }`} 
                />
                <div>
                  <div className={`font-medium ${
                    activeTab === 'branch_penalties' ? 'text-primary' : 'text-gray-900'
                  }`}>
                    Branch Penalties
                  </div>
                  <div className={`text-sm ${
                    activeTab === 'branch_penalties' ? 'text-[#6B7280]' : 'text-[#6B7280]'
                  }`}>
                    Manage branch-specific penalty settings
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('location_comparison')}
                className={`w-full flex items-center space-x-3 p-4 rounded-lg text-left transition-colors ${
                  activeTab === 'location_comparison'
                    ? 'bg-green-50 border border-green-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <Icon 
                  icon="hugeicons:location-01" 
                  className={`w-5 h-5 ${
                    activeTab === 'location_comparison' ? 'text-primary' : 'text-gray-500'
                  }`} 
                />
                <div>
                  <div className={`font-medium ${
                    activeTab === 'location_comparison' ? 'text-primary' : 'text-gray-900'
                  }`}>
                    Location Comparison
                  </div>
                  <div className={`text-sm ${
                    activeTab === 'location_comparison' ? 'text-[#6B7280]' : 'text-[#6B7280]'
                  }`}>
                    Manage branch location comparison settings
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-[7.0] p-6 bg-white">
          {activeTab === 'institution' ? renderInstitutionSettings() : 
           activeTab === 'kyc' ? renderKYCDocuments() : 
           activeTab === 'penalties' ? renderPenaltyConfigurations() :
           activeTab === 'branch_penalties' ? renderBranchPenaltyConfigurations() :
           renderLocationComparisonConfigurations()}
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