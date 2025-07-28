"use client";

import type React from "react";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {ArrowLeft, Save, Star, Calendar} from "lucide-react";
import Link from "next/link";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {apiPost} from "@/lib/apiRequest";

export default function AddHolidayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const selectedInstitution = useSelector(selectSelectedInstitution);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    institution: selectedInstitution?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiPost("/calendar/public-holidays/", formData);
      router.push("/events-holidays");
    } catch (error) {
      console.error("Error creating holiday:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Common holidays for suggestions
  const commonHolidays = [
    "New Year's Day",
    "Independence Day",
    "Christmas Day",
    "Easter Sunday",
    "Labor Day",
    "Thanksgiving",
    "Memorial Day",
    "Veterans Day",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-6">
          <Link href="/events-holidays">
            <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Add Public Holiday
            </h1>
            <p className="text-slate-600 text-lg">
              Create a new public holiday for your organization
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-slate-900">Holiday Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-base font-medium">
                      Holiday Name *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      placeholder="Enter holiday name"
                      className="h-12 text-base border-slate-200 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="date" className="text-base font-medium">
                      Holiday Date *
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

                  <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Star className="h-5 w-5 text-red-600" />
                      Holiday Summary
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Name:</span>
                        <span className="font-medium">{formData.title || "Not set"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Date:</span>
                        <span className="font-medium">
                          {formData.date ? new Date(formData.date).toLocaleDateString() : "Not set"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Institution:</span>
                        <span className="font-medium">
                          {selectedInstitution?.institution_name || "Current"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 border-t border-slate-200">
                    <Button type="submit" disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Creating..." : "Create Holiday"}
                    </Button>
                    <Link href="/events-holidays">
                      <Button variant="outline" type="button" className="shadow-sm bg-transparent">
                        Cancel
                      </Button>
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Common Holidays */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Common Holidays
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {commonHolidays.map((holiday) => (
                    <Button
                      key={holiday}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left bg-transparent"
                      onClick={() => handleInputChange("title", holiday)}
                    >
                      {holiday}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Holiday Info */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <Calendar className="h-5 w-5" />
                  About Public Holidays
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-red-800 text-sm space-y-2">
                  <p>Public holidays are non-working days for your organization.</p>
                  <p>They will appear on the calendar and can be used for scheduling purposes.</p>
                  <p>Employees typically don't work on these days unless specified otherwise.</p>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-slate-600 text-sm space-y-2">
                  <li>• Use official holiday names</li>
                  <li>• Check local regulations for mandatory holidays</li>
                  <li>• Consider cultural and religious holidays</li>
                  <li>• Plan holidays well in advance</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
