import React, {useState, useEffect} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {IProgressType, IKeyResult, IKeyResultFormData} from "@/types/types.utils";
import type {IUserInstitution} from "@/types/index";

interface KeyResultFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: IKeyResultFormData) => void;
  editingKeyResult?: IKeyResult | null;
  institutions: IUserInstitution[];
  progressTypes: IProgressType[];
  isLoading?: boolean;
}
const validateDurationFormat = (duration: string): boolean => {
  const timeRegex = /^(\d+\s)?\d{1,2}:\d{2}:\d{2}$/;
  return timeRegex.test(duration);
};

export const KeyResultForm: React.FC<KeyResultFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  editingKeyResult,
  institutions,
  progressTypes,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<IKeyResultFormData>({
    institution: 0,
    title: "",
    description: "",
    target_value: 0,
    duration: "",
    progress_type: "percentage",
  });

  useEffect(() => {
    if (editingKeyResult) {
      setFormData({
        institution: editingKeyResult.institution.id,
        title: editingKeyResult.title,
        description: editingKeyResult.description,
        target_value: editingKeyResult.target_value,
        duration: editingKeyResult.duration,
        progress_type: editingKeyResult.progress_type,
      });
    } else {
      setFormData({
        institution: institutions.length > 0 ? institutions[0].id : 0,
        title: "",
        description: "",
        target_value: 0,
        duration: "",
        progress_type: "percentage",
      });
    }
  }, [editingKeyResult, open, institutions]);

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const isFormValid = () => {
    return (
      formData.title.trim() !== "" &&
      formData.description.trim() !== "" &&
      formData.target_value > 0 &&
      formData.duration !== "" &&
      formData.progress_type &&
      formData.institution > 0
    );
  };

  const handleClose = () => {
    onOpenChange(false);
  };
  const [durationParts, setDurationParts] = useState({days: 0, hours: 0, minutes: 0});

  const updateDuration = (part: "days" | "hours" | "minutes", value: string) => {
    const numValue = parseInt(value) || 0;
    const newParts = {...durationParts, [part]: numValue};
    setDurationParts(newParts);

    const duration = `${newParts.days} ${String(newParts.hours).padStart(2, "0")}:${String(newParts.minutes).padStart(2, "0")}:00`;
    setFormData((prev) => ({...prev, duration: duration.trim()}));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editingKeyResult ? "Edit Key Result" : "Add Key Result"}</DialogTitle>
          <DialogDescription>
            {editingKeyResult
              ? "Update key result information"
              : "Create a new key result to track your progress"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Institution Selection */}
          <div className="space-y-2">
            <Label htmlFor="institution">Institution</Label>
            <Select
              value={formData.institution.toString()}
              onValueChange={(value) =>
                setFormData((prev) => ({...prev, institution: parseInt(value)}))
              }
            >
              <SelectTrigger className="rounded-2xl h-12">
                <SelectValue placeholder="Select Institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((institution) => (
                  <SelectItem key={institution.id} value={institution.id.toString()}>
                    {institution.institution_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({...prev, title: e.target.value}))}
              placeholder="Enter key result title"
              className="rounded-2xl h-12"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({...prev, description: e.target.value}))}
              placeholder="Describe your key result"
              className="rounded-2xl min-h-[100px]"
              rows={4}
            />
          </div>

          {/* Target Value */}
          <div className="space-y-2">
            <Label htmlFor="targetValue">Target Value *</Label>
            <Input
              id="targetValue"
              type="number"
              min="0"
              step="0.01"
              value={formData.target_value || ""}
              onChange={(e) => {
                const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
                setFormData((prev) => ({...prev, target_value: value}));
              }}
              placeholder="Enter target value"
              className="rounded-2xl h-12"
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration *</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={formData.duration}
              onChange={(e) => setFormData((prev) => ({...prev, duration: e.target.value}))}
              placeholder="Enter duration"
              className="rounded-2xl h-12"
            />
            <p className="text-xs text-slate-500">Duration in hours</p>
          </div>

          {/* Progress Type */}
          <div className="space-y-2">
            <Label htmlFor="progressType">Progress Type *</Label>
            <Select
              value={formData.progress_type}
              onValueChange={(value: IProgressType) =>
                setFormData((prev) => ({...prev, progress_type: value}))
              }
            >
              <SelectTrigger className="rounded-2xl h-12">
                <SelectValue placeholder="Select Progress Type" />
              </SelectTrigger>
              <SelectContent>
                {progressTypes.map((progressType) => (
                  <SelectItem key={progressType} value={progressType}>
                    {progressType === "percentage" ? "Percentage" : "Number"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="text-white rounded-full"
            disabled={!isFormValid() || isLoading}
          >
            {isLoading
              ? "Processing..."
              : editingKeyResult
                ? "Update Key Result"
                : "Create Key Result"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
