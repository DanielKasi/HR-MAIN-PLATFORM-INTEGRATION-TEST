"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/react";
import { FormattedNumberInput } from "@/components/common/inputs/formatted-number-input";

interface SpotcheckConfigFormData {
  lower_threshold: number;
  upper_threshold: number;
  expires_after_minutes: number;
  late_starts_after_minutes: number;
}

interface SpotcheckConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  formData: SpotcheckConfigFormData;
  onInputChange: (field: keyof SpotcheckConfigFormData, value: number) => void;
  isLoading: boolean;
  isEditing: boolean;
  title: string;
}

export const SpotcheckConfigModal = ({
  isOpen,
  onClose,
  onSave,
  formData,
  onInputChange,
  isLoading,
  isEditing,
  title,
}: SpotcheckConfigModalProps) => {
  const [validationErrors, setValidationErrors] = useState<{
    upper_threshold?: string;
    expires_after_minutes?: string;
    late_starts_after_minutes?: string;
  }>({});

  // Validate all fields
  useEffect(() => {
    const errors: {
      upper_threshold?: string;
      expires_after_minutes?: string;
      late_starts_after_minutes?: string;
    } = {};
    
    // Upper threshold validation
    if (formData.upper_threshold < formData.lower_threshold) {
      errors.upper_threshold = "Upper threshold must be greater than lower threshold";
    } else if (formData.upper_threshold > 50) {
      errors.upper_threshold = "Upper threshold cannot exceed 50";
    }
    
    // Expires after validation (6 hours = 360 minutes)
    if (formData.expires_after_minutes > 360) {
      errors.expires_after_minutes = "Expires after cannot exceed 6 hours (360 minutes)";
    }
    
    // Late starts after validation
    if (formData.late_starts_after_minutes > formData.expires_after_minutes) {
      errors.late_starts_after_minutes = "Late starts after cannot be greater than expires after";
    }
    
    setValidationErrors(errors);
  }, [formData.lower_threshold, formData.upper_threshold, formData.expires_after_minutes, formData.late_starts_after_minutes]);

  const handleInputChange = (field: keyof SpotcheckConfigFormData, value: number) => {
    onInputChange(field, value);
  };

  const isFormValid = Object.keys(validationErrors).length === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <Icon icon="hugeicons:close-01" className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="lower_threshold">Lower Threshold(Minimum spot check frequency)</Label>
            <FormattedNumberInput
              id="lower_threshold"
              min="0"
              step="1"
              value={formData.lower_threshold || ""}
              onValueChange={(val) => handleInputChange("lower_threshold", val)}
              placeholder="Enter lower threshold"
              disabled={isLoading}
              className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
            />
          </div>

          <div>
            <Label htmlFor="upper_threshold">Upper Threshold(Maximum spot check frequency)</Label>
            <FormattedNumberInput
              id="upper_threshold"
              min={formData.lower_threshold + 1}
              max="50"
              step="1"
              value={formData.upper_threshold || ""}
              onValueChange={(val) => handleInputChange("upper_threshold", val)}
              placeholder="Enter upper threshold (max 50)"
              disabled={isLoading}
              className={`rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
                validationErrors.upper_threshold ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
              }`}
            />
            {validationErrors.upper_threshold && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.upper_threshold}</p>
            )}
          </div>

          <div>
            <Label htmlFor="expires_after_minutes">Expires After (minutes)</Label>
            <FormattedNumberInput
              id="expires_after_minutes"
              min="0"
              max="360"
              value={formData.expires_after_minutes || ""}
              onValueChange={(val) => handleInputChange("expires_after_minutes", val)}
              placeholder="Enter expiration time (max 360 minutes)"
              disabled={isLoading}
              className={`rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
                validationErrors.expires_after_minutes ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
              }`}
            />
            {validationErrors.expires_after_minutes && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.expires_after_minutes}</p>
            )}
          </div>

          <div>
            <Label htmlFor="late_starts_after_minutes">Late Starts After (How long a respondant will be termed late)</Label>
            <FormattedNumberInput
              id="late_starts_after_minutes"
              min="0"
              max={formData.expires_after_minutes}
              value={formData.late_starts_after_minutes || ""}
              onValueChange={(val) => handleInputChange("late_starts_after_minutes", val)}
              placeholder="Enter late start threshold"
              disabled={isLoading}
              className={`rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base ${
                validationErrors.late_starts_after_minutes ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
              }`}
            />
            {validationErrors.late_starts_after_minutes && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.late_starts_after_minutes}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-full bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isLoading || !isFormValid}
            className="bg-primary hover:bg-primary text-white flex-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
};
 