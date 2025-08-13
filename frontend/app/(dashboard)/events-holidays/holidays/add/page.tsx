"use client";

import type React from "react";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

import {Save, Star} from "lucide-react";
import Link from "next/link";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {apiPost} from "@/lib/apiRequest";
import {Icon} from "@iconify/react";

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
      alert("Holiday created successfully!");
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
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-6">
          <Link href="/events-holidays">
            <Button variant="outline" size="sm" className="shadow-sm bg-transparent rounded-full w-8 h-8 p-4 flex items-center justify-center">
              <Icon icon="hugeicons:arrow-left-02" className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-[20px] bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Public Holiday
            </h1>
  
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Form */}
          <div className="flex-1">
            <div className="">
              <h2 className="text-[20px] text-slate-900 mb-6">Holiday Details</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-[16px]">
                    Holiday Name *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Enter holiday name"
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="date" className="text-[16px]">
                    Holiday Date *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    className="h-12 "
                    required
                  />
                </div>

               
                <div className="flex gap-4 pt-4">
                  <Button type="submit" disabled={loading} className="w-[463px] rounded-full">
            
                    {loading ? "Creating..." : "Create Holiday"}
                  </Button>
                 
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
