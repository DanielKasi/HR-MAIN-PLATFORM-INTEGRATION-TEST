"use client";

import React, {useState} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {ArrowLeft, Save, Calendar, Users, MapPin, Video, Repeat, Clock} from "lucide-react";
import Link from "next/link";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {Badge} from "@/components/ui/badge";
import {Checkbox} from "@/components/ui/checkbox";
import {apiPost} from "@/lib/apiRequest";

export default function AddEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const selectedInstitution = useSelector(selectSelectedInstitution);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    target_audience: "all" as const,
    event_mode: "physical" as const,
    department: "",
    specific_employees: [] as string[],
    frequency: "once" as const,
    repeat_until: "",
    institution: selectedInstitution?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiPost("/calendar/events/", formData);
      router.push("/calendar");
    } catch (error) {
      console.error("Error creating event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const steps = [
    {id: 1, title: "Event Details", icon: Calendar},
    {id: 2, title: "Audience & Mode", icon: Users},
    {id: 3, title: "Schedule", icon: Clock},
  ];

  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return formData.title && formData.description && formData.date;
      case 2:
        return formData.target_audience && formData.event_mode;
      case 3:
        return formData.frequency && (formData.frequency === "once" || formData.repeat_until);
      default:
        return false;
    }
  };

  const getEventModeIcon = (mode: string) => {
    switch (mode) {
      case "online":
        return <Video className="h-4 w-4" />;
      case "physical":
        return <MapPin className="h-4 w-4" />;
      case "hybrid":
        return <Users className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // Mock data - in real app, fetch from API
  const departments = [
    {id: "1", name: "Engineering"},
    {id: "2", name: "Marketing"},
    {id: "3", name: "Sales"},
    {id: "4", name: "HR"},
  ];

  const employees = [
    {id: "1", name: "John Doe", department: "Engineering"},
    {id: "2", name: "Jane Smith", department: "Marketing"},
    {id: "3", name: "Mike Johnson", department: "Sales"},
    {id: "4", name: "Sarah Wilson", department: "HR"},
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-6">
          <Link href="/calendar">
            <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calendar
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Create New Event
            </h1>
            <p className="text-slate-600 text-lg">Schedule an event for your organization</p>
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = isStepComplete(step.id);

                return (
                  <React.Fragment key={step.id}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                        ${
                          isActive
                            ? "bg-blue-600 text-white shadow-lg"
                            : isCompleted
                              ? "bg-green-600 text-white"
                              : "bg-slate-200 text-slate-600"
                        }
                      `}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="hidden sm:block">
                        <p
                          className={`font-medium ${isActive ? "text-blue-600" : "text-slate-600"}`}
                        >
                          {step.title}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`
                        flex-1 h-0.5 mx-4 transition-all duration-300
                        ${isStepComplete(step.id) ? "bg-green-600" : "bg-slate-200"}
                      `}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {steps.find((s) => s.id === currentStep)?.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="title" className="text-base font-medium">
                          Event Title *
                        </Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => handleInputChange("title", e.target.value)}
                          placeholder="Enter event title"
                          className="h-12 text-base border-slate-200 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="description" className="text-base font-medium">
                          Event Description *
                        </Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => handleInputChange("description", e.target.value)}
                          placeholder="Describe the event, agenda, and important details..."
                          rows={6}
                          className="text-base border-slate-200 focus:border-blue-500 resize-none"
                          required
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="date" className="text-base font-medium">
                          Event Date *
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleInputChange("date", e.target.value)}
                          className="h-12 text-base border-slate-200 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Target Audience *</Label>
                        <Select
                          value={formData.target_audience}
                          onValueChange={(value) => handleInputChange("target_audience", value)}
                        >
                          <SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
                            <SelectValue placeholder="Select target audience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                All Employees
                              </div>
                            </SelectItem>
                            <SelectItem value="department">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Specific Department
                              </div>
                            </SelectItem>
                            <SelectItem value="individual">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Individual
                              </div>
                            </SelectItem>
                            <SelectItem value="specific_employees">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Specific Employees
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.target_audience === "department" && (
                        <div className="space-y-3">
                          <Label className="text-base font-medium">Select Department</Label>
                          <Select
                            value={formData.department}
                            onValueChange={(value) => handleInputChange("department", value)}
                          >
                            <SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
                              <SelectValue placeholder="Choose department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {formData.target_audience === "specific_employees" && (
                        <div className="space-y-3">
                          <Label className="text-base font-medium">Select Employees</Label>
                          <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                            {employees.map((employee) => (
                              <div
                                key={employee.id}
                                className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded"
                              >
                                <Checkbox
                                  id={`employee-${employee.id}`}
                                  checked={formData.specific_employees.includes(employee.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      handleInputChange("specific_employees", [
                                        ...formData.specific_employees,
                                        employee.id,
                                      ]);
                                    } else {
                                      handleInputChange(
                                        "specific_employees",
                                        formData.specific_employees.filter(
                                          (id) => id !== employee.id,
                                        ),
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`employee-${employee.id}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="font-medium text-slate-900">{employee.name}</div>
                                  <div className="text-sm text-slate-600">
                                    {employee.department}
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <Label className="text-base font-medium">Event Mode *</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                            {
                              value: "physical",
                              label: "Physical",
                              icon: MapPin,
                              desc: "In-person event",
                            },
                            {
                              value: "online",
                              label: "Online",
                              icon: Video,
                              desc: "Virtual meeting",
                            },
                            {
                              value: "hybrid",
                              label: "Hybrid",
                              icon: Users,
                              desc: "Both online & physical",
                            },
                          ].map((mode) => {
                            const Icon = mode.icon;
                            return (
                              <div
                                key={mode.value}
                                className={`
                                  p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                                  ${
                                    formData.event_mode === mode.value
                                      ? "border-blue-500 bg-blue-50"
                                      : "border-slate-200 hover:border-slate-300"
                                  }
                                `}
                                onClick={() => handleInputChange("event_mode", mode.value)}
                              >
                                <div className="flex items-center gap-3 mb-2">
                                  <Icon className="h-5 w-5 text-slate-600" />
                                  <span className="font-medium text-slate-900">{mode.label}</span>
                                </div>
                                <p className="text-sm text-slate-600">{mode.desc}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Event Frequency *</Label>
                        <Select
                          value={formData.frequency}
                          onValueChange={(value) => handleInputChange("frequency", value)}
                        >
                          <SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                One-time Event
                              </div>
                            </SelectItem>
                            <SelectItem value="daily">
                              <div className="flex items-center gap-2">
                                <Repeat className="h-4 w-4" />
                                Daily
                              </div>
                            </SelectItem>
                            <SelectItem value="weekly">
                              <div className="flex items-center gap-2">
                                <Repeat className="h-4 w-4" />
                                Weekly
                              </div>
                            </SelectItem>
                            <SelectItem value="monthly">
                              <div className="flex items-center gap-2">
                                <Repeat className="h-4 w-4" />
                                Monthly
                              </div>
                            </SelectItem>
                            <SelectItem value="yearly">
                              <div className="flex items-center gap-2">
                                <Repeat className="h-4 w-4" />
                                Yearly
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.frequency !== "once" && (
                        <div className="space-y-3">
                          <Label htmlFor="repeat_until" className="text-base font-medium">
                            Repeat Until *
                          </Label>
                          <Input
                            id="repeat_until"
                            type="date"
                            value={formData.repeat_until}
                            onChange={(e) => handleInputChange("repeat_until", e.target.value)}
                            className="h-12 text-base border-slate-200 focus:border-blue-500"
                            min={formData.date}
                            required={formData.frequency !== "once"}
                          />
                        </div>
                      )}

                      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <h3 className="font-semibold text-slate-900 mb-3">Event Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Title:</span>
                            <span className="font-medium">{formData.title || "Not set"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Date:</span>
                            <span className="font-medium">
                              {formData.date
                                ? new Date(formData.date).toLocaleDateString()
                                : "Not set"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Mode:</span>
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              {getEventModeIcon(formData.event_mode)}
                              <span className="ml-1">{formData.event_mode}</span>
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Audience:</span>
                            <span className="font-medium">
                              {formData.target_audience.replace("_", " ")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Frequency:</span>
                            <span className="font-medium">{formData.frequency}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6 border-t border-slate-200">
                    <div>
                      {currentStep > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep(currentStep - 1)}
                          className="shadow-sm"
                        >
                          Previous
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Link href="/calendar">
                        <Button
                          variant="outline"
                          type="button"
                          className="shadow-sm bg-transparent"
                        >
                          Cancel
                        </Button>
                      </Link>

                      {currentStep < 3 ? (
                        <Button
                          type="button"
                          onClick={() => setCurrentStep(currentStep + 1)}
                          disabled={!isStepComplete(currentStep)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                        >
                          Next Step
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={loading}
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {loading ? "Creating..." : "Create Event"}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Preview */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Event Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Mode</span>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      {getEventModeIcon(formData.event_mode)}
                      <span className="ml-1">{formData.event_mode}</span>
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Audience</span>
                    <span className="font-medium text-slate-900">
                      {formData.target_audience.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Frequency</span>
                    <span className="font-medium text-slate-900">{formData.frequency}</span>
                  </div>

                  {formData.specific_employees.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Selected</span>
                      <span className="font-medium text-slate-900">
                        {formData.specific_employees.length} employees
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Calendar className="h-5 w-5" />
                  Event Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-green-800 text-sm space-y-2">
                  <li>• Use clear, descriptive event titles</li>
                  <li>• Include agenda and important details</li>
                  <li>• Set appropriate audience targeting</li>
                  <li>• Choose the right event mode</li>
                  <li>• Consider recurring events for regular meetings</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
