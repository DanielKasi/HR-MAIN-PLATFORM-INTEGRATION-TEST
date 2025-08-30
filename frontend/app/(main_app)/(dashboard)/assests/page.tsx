"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Package, 
  User, 
  FileText, 
  RotateCcw, 
  FolderOpen,
  ArrowRight,
  Plus,
  Search,
  Settings
} from "lucide-react";

export default function AssetsMainPage() {
  const router = useRouter();

  const assetFeatures = [
    {
      title: "Assets",
      description: "Manage and track all institutional assets including equipment, furniture, and technology",
      icon: Package,
      href: "/assests/assets",
      color: "bg-blue-500",
      stats: "Total Assets",
      action: "View Assets"
    },
    {
      title: "Asset Categories",
      description: "Organize assets into logical groups and categories for better management",
      icon: FolderOpen,
      href: "/assests/asset-categories",
      color: "bg-green-500",
      stats: "Categories",
      action: "Manage Categories"
    },
    {
      title: "Asset Requests",
      description: "Handle employee requests for asset allocation and track approval workflows",
      icon: FileText,
      href: "/assests/asset-requests",
      color: "bg-yellow-500",
      stats: "Pending Requests",
      action: "View Requests"
    },
    {
      title: "Asset Allocations",
      description: "Track which assets are allocated to employees and manage assignments",
      icon: User,
      href: "/assests/asset-allocations",
      color: "bg-purple-500",
      stats: "Active Allocations",
      action: "View Allocations"
    },
    {
      title: "Asset Returns",
      description: "Process asset returns, update status, and maintain return records",
      icon: RotateCcw,
      href: "/assests/asset-returns",
      color: "bg-red-500",
      stats: "Returns",
      action: "View Returns"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6 overflow-x-hidden w-full max-w-full">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Asset Management</h1>
          <p className="text-lg text-muted-foreground">
            Comprehensive asset tracking, allocation, and management system
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={() => router.push('/assests/assets/create')}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Asset
          </Button>
          <Button 
            onClick={() => router.push('/assests/asset-requests/create')}
            variant="outline"
          >
            <FileText className="mr-2 h-4 w-4" />
            Create Asset Request
          </Button>
          <Button 
            onClick={() => router.push('/assests/asset-allocations/create')}
            variant="outline"
          >
            <User className="mr-2 h-4 w-4" />
            Allocate Asset
          </Button>
          <Button 
            onClick={() => router.push('/assests/asset-returns/create')}
            variant="outline"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Return Asset
          </Button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assetFeatures.map((feature) => (
            <Card 
              key={feature.title} 
              className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
              onClick={() => router.push(feature.href)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${feature.color} text-white`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform duration-200" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{feature.stats}</span>
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                    {feature.action}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Quick Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Use the search functionality in each section to quickly find specific assets, requests, or allocations.
              </p>
              <div className="space-y-2 text-sm">
                <p>• Search assets by name, serial number, or batch number</p>
                <p>• Filter requests by status and requester</p>
                <p>• Find allocations by employee or asset</p>
                <p>• Track returns by condition and date</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The asset management system provides comprehensive tracking and workflow management.
              </p>
              <div className="space-y-2 text-sm">
                <p>• Automated approval workflows for requests</p>
                <p>• Asset status tracking and history</p>
                <p>• Employee allocation management</p>
                <p>• Return processing and condition tracking</p>
                <p>• Comprehensive audit trails</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
