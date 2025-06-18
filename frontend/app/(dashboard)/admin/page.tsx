"use client";

import Link from "next/link";
import {fetchAndSetData, fetchInstitutionBranchesFromAPI} from "@/lib/helpers";
import {useEffect, useState} from "react";
import type {Branch} from "@/app/types";

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
  BadgeDollarSign,
} from "lucide-react";
import {Separator} from "@/components/ui/separator";
import ProtectedComponent from "@/components/ProtectedComponent";
import ProtectedPage from "@/components/ProtectedPage";
import {PERMISSION_CODES} from "@/app/types/types.utils";

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
                  <Store className="w-5 h-5 text-gray-500" />
                  <span>Organisation Settings</span>
                </Link>
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
              <h2 className="text-lg font-semibold mb-6">Branch Management</h2>
              <Separator className="my-6" />

              <div className="space-y-4">
                <Link
                  href="/branches"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <GitBranch className="w-5 h-5 text-gray-500" />
                  <span>Branches</span>
                </Link>
                {/* We'll keep the branch listing functionality but hide it since it's not in the image */}
                <div className="hidden">
                  {branches.map((branch) => (
                    <div key={branch.id} className="ml-4">
                      <span>{branch.branch_name}</span>
                      <div className="mt-1 ml-4">
                        <Link
                          href={`/products-mgt/${branch.id}?branchId=${
                            branch.id
                          }&branchName=${encodeURIComponent(branch.branch_name)}`}
                          className="text-blue-500 hover:underline mr-3"
                        >
                          Products
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Institution Management Section */}
            <div>
              <h2 className="text-lg font-semibold mb-6">Institution Management</h2>
              <Separator className="my-6" />

              <div className="space-y-4">
                <Link
                  href="/admin/Institution-approval-steps/"
                  className="flex items-center gap-3 text-gray-700 hover:text-gray-900"
                >
                  <Store className="w-5 h-5 text-gray-500" />
                  <span>Institution Approval Steps</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
