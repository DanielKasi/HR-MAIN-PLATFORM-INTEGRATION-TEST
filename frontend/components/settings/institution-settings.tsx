"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors";
import { setSelectedInstitution, setAttachedInstitutions } from "@/store/auth/actions";
import { institutionAPI, showErrorToast } from "@/lib/utils";
import type { IUserInstitutionFormData } from "@/types";

interface InstitutionSettingsProps {
  onSave?: () => void;
}

export const InstitutionSettings = ({ onSave }: InstitutionSettingsProps) => {
  const dispatch = useDispatch();
  const institution = useSelector(selectSelectedInstitution);
  const attachedInstitutions = useSelector(selectAttachedInstitutions);

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
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState({
    institution_name: false,
    institution_email: false,
    first_phone_number: false,
    location: false,
    is_attendance_penalties_enabled: false,
    latitude: 0,
    longitude: 0,
    logo: false,
  });

  // Initialize form data when institution changes
  useEffect(() => {
    if (institution) {
      setFormData({
        institution_name: institution.institution_name || "",
        institution_email: institution.institution_email || "",
        first_phone_number: institution.first_phone_number || "",
        location: institution.location || "",
        is_attendance_penalties_enabled: institution.is_attendance_penalties_enabled || false,
        latitude: institution.latitude || 0,
        longitude: institution.longitude || 0,
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
      setLogoFile(file);
    }
  };

  const toggleEdit = (field: keyof typeof isEditing) => {
    setIsEditing((prev) => ({...prev, [field]: !prev[field]}));
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleInputChange("latitude", position.coords.latitude);
          handleInputChange("longitude", position.coords.longitude);
          toast.success("Location updated successfully");
        },
        (error) => {
          toast.error("Failed to get current location");
        },
      );
    } else {
      toast.error("Geolocation is not supported by this browser");
    }
  };

  const handleSubmit = async () => {
    if (!institution) {
      return;
    }
    setIsLoading(true);
    try {
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

      setIsEditing({
        institution_name: false,
        institution_email: false,
        first_phone_number: false,
        location: false,
        is_attendance_penalties_enabled: false,
        latitude: 0,
        longitude: 0,
        logo: false,
      });

      setLogoFile(null);
      toast.success("Settings updated successfully");
      onSave?.();
    } catch (error) {
      showErrorToast({ error, defaultMessage: "Failed to update settings" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    handleSubmit();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Institution Settings</h2>
      </div>

      {/* Institution Logo */}
      <div className="flex flex-col items-center justify-center">
        <div className="relative">
          {institution?.institution_logo || logoFile ? (
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden relative">
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
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-primary/30 to-primary/50 rounded-lg flex items-center justify-center">
              <Icon
                icon="hugeicons:building-04"
                className="w-10 h-10 md:w-12 md:h-12 text-white"
              />
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
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
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
              className="rounded-lg border-gray-200 hover:bg-gray-50 w-full sm:w-auto"
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
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
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
              className="rounded-lg border-gray-200 hover:bg-gray-50 w-full sm:w-auto"
            >
              {isEditing.first_phone_number ? "Cancel" : "Change"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium text-gray-700">
            Location
          </Label>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
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
              className="rounded-lg border-gray-200 hover:bg-gray-50 w-full sm:w-auto"
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
          className="bg-primary hover:bg-primary text-white px-6 py-2 font-medium w-full sm:w-auto sm:min-w-[300px] rounded-full"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
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
};
