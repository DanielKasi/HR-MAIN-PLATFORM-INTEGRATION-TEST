"use client";

import Link from "next/link";
import {fetchAndSetData, fetchInstitutionBranchesFromAPI} from "@/lib/helpers";
import {useEffect, useState} from "react";
import type {Branch} from "@/types";
import {Icon} from "@iconify/react";

import {
  Users,
  UserCog,
  Mail,
  Store,
  Code,
  FileText,
  Database,
  ShieldAlert,
  ClipboardList,
  Palette,
  Package,
  FolderTree,
  Ruler,
  UserPlus,
  ShoppingCart,
  GitBranch,
  BookOpen,
  LucideHouse,
  BriefcaseBusinessIcon,
  Cog,
  Book,
  BookAIcon,
  Landmark,
  CreditCard,
  LampDesk,
} from "lucide-react";
import {Separator} from "@/components/ui/separator";
import ProtectedComponent from "@/components/ProtectedComponent";
import ProtectedPage from "@/components/ProtectedPage";
import {PERMISSION_CODES} from "@/types/types.utils";

export default function AdminPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [showJournalEntries, setShowJournalEntries] = useState(false);

  const fetchBranches = () => {
    fetchAndSetData(
      fetchInstitutionBranchesFromAPI,
      setBranches,
      setErrorMessage,
      "Failed to fetch branches",
    );
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // Handle successful theme color update
  const handleThemeUpdateSuccess = () => {
    // We could show a success toast/notification here
    console.log("Theme color updated successfully");
  };

  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_ADMIN_PAGE}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        </div>

        <div className="bg-white rounded-lg p-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Manage Staff Section */}
            <div>
              <h2 className="text-lg font-semibold mb-6">Manage Staff</h2>
              <Separator className="my-6" />

              <div className="space-y-4">
                <Link
                  href="/users"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <Users className="w-5 h-5 text-gray-500" />
                  <span>Staff</span>
                </Link>
                <Link
                  href="/users/roles"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <UserCog className="w-5 h-5 text-gray-500" />
                  <span>Staff Roles</span>
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <Mail className="w-5 h-5 text-gray-500" />
                  <span>Staff Email Notification</span>
                </Link>
              </div>
            </div>

            {/* Settings Section */}
            <div>
              <h2 className="text-lg font-semibold mb-6">Settings</h2>

              <Separator className="my-6" />

              <div className="space-y-4">
                <Link
                  href="#"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <Code className="w-5 h-5 text-gray-500" />
                  <span>API Settings</span>
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <FileText className="w-5 h-5 text-gray-500" />
                  <span>Web Form Builder and Api</span>
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <Database className="w-5 h-5 text-gray-500" />
                  <span>Custom Fields</span>
                </Link>
              </div>
            </div>

            {/* Special Functions Section */}
            <div>
              <h2 className="text-lg font-semibold mb-6">Special Functions</h2>
              <Separator className="my-6" />

              <div className="space-y-4">
                <Link
                  href="#"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <ShieldAlert className="w-5 h-5 text-gray-500" />
                  <span>Blacklist</span>
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <ClipboardList className="w-5 h-5 text-gray-500" />
                  <span>Audit Management</span>
                </Link>
                <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CHANGE_THEME_COLOR}>
                  <Link
                    href="/theme_color_customization"
                    className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                  >
                    <Palette className="w-5 h-5 text-gray-500" />
                    <span>Theme Color Customization</span>
                  </Link>
                </ProtectedComponent>
              </div>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Branch Management Section */}
            <div>
              <h2 className="text-lg font-semibold mb-6">Organization Management</h2>
              <Separator className="my-6" />
              <div className="flex flex-col items-start justify-center gap-6">
                <div className="">
                  <Link
                    href="/branches"
                    className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                  >
                    <GitBranch className="w-5 h-5 text-gray-500" />
                    <span>Branches</span>
                  </Link>
                </div>
                <div className="space-y-4">
                  <Link
                    href="/admin/institution-approval-steps/"
                    className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                  >
                    <Store className="w-5 h-5 text-gray-500" />
                    <span>Organization Approval Steps</span>
                  </Link>
                </div>

                <div className="">
                  <Link
                    href="/admin/departments"
                    className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                  >
                    <LucideHouse className="w-5 h-5 text-gray-500" />
                    <span>Departments</span>
                  </Link>
                </div>

                <div className="">
                  <Link
                    href="/job-positions"
                    className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                  >
                    <BriefcaseBusinessIcon className="w-5 h-5 text-gray-500" />
                    <span>Job Positions / Titles</span>
                  </Link>
                </div>

                <div className="">
                  <Link
                    href="/admin/working-days"
                    className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                  >
                    <LampDesk className="w-5 h-5 text-gray-500" />
                    <span>Working days</span>
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-6">Bank Management</h2>
              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="">
                  <Link
                    href="/admin/bank-types"
                    className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                  >
                    <Landmark className="w-5 h-5 text-gray-500" />
                    <span>Attached Banks</span>
                  </Link>
                </div>
                <div className="">
                  <Link
                    href="/admin/bank-accounts"
                    className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                  >
                    <CreditCard className="w-5 h-5 text-gray-500" />
                    <span>Bank Accounts</span>
                  </Link>
                </div>
                <div className="">
                  <Link
                    href="/admin/taxes"
                    className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                  >
                    <Mail className="w-5 h-5 text-gray-500" />
                    <span>Taxes</span>
                  </Link>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-6">Documents Management</h2>
              <Separator className="my-6" />

              <div className="space-y-4">
                <Link
                  href="/documents/document_types"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <Book className="w-5 h-5 text-gray-500" />
                  {/* <Icon icon={"hugeicons:notebook"}  className="w-5 h-5 text-gray-500" /> */}
                  <span>Document Types</span>
                </Link>
                <Link
                  href="/documents/templates"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <BookAIcon className="w-5 h-5 text-gray-500" />
                  <span>Document Templates</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
