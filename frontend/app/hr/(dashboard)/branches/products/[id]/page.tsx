"use client";
import type React from "react";
import type {IBranchStoreProduct} from "@/app/types";

import {useState, useEffect} from "react";
import {useRouter, useParams} from "next/navigation";
import Image from "next/image";
import {ArrowLeft, Edit} from "lucide-react";
import {Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid} from "recharts";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import apiRequest from "@/lib/apiRequest";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {formatCurrency} from "@/lib/helpers";
import {handleApiError} from "@/lib/apiErrorHandler";

// Define interfaces for sales data
interface SalesDataPoint {
  month?: string;
  month_name?: string;
  week?: number;
  week_name?: string;
  day?: number;
  day_name?: string;
  date?: string;
  value: number;
  amount: number;
  formatted_amount: string;
  quantity: number;
  count: number;
  highlighted: boolean;
}

interface SalesHistoryItem {
  id: string;
  date: string;
  quantity: number;
  revenue: number;
  transaction_id: string;
}

interface TotalSales {
  quantity: number;
  revenue: number;
  formatted: string;
}

interface SalesResponse {
  total_sales: TotalSales;
  period: string;
  monthly_data?: SalesDataPoint[];
  weekly_data?: SalesDataPoint[];
  daily_data?: SalesDataPoint[];
  sales_history: SalesHistoryItem[];
}

export default function BranchProductDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<IBranchStoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    shelf_threshold: 0,
    stock_threshold: 0,
    branch_selling_price: 0,
  });

  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState("year");
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  useEffect(() => {
    // Update form data when product changes
    if (product) {
      setFormData({
        shelf_threshold: product.shelf_threshold || 0,
        stock_threshold: product.stock_threshold || 0,
        branch_selling_price:
          product.branch_selling_price || product.product.product_selling_price || 0,
      });
    }
  }, [product]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const response = await apiRequest.get(`/product/branch-product-store/${productId}/`);

      setProduct(response.data);
    } catch (err: any) {
      // setError(err.message || "Failed to load product details")
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setIsEditDialogOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("price") ? Number.parseFloat(value) : Number.parseInt(value, 10),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);

      const response = await apiRequest.patch(
        `/product/branch-product-store/by-branch/${product?.branch}/`,
        {
          id: product.id,
          product: product.product.id,
          shelf_threshold: formData.shelf_threshold,
          stock_threshold: formData.stock_threshold,
          branch_selling_price: formData.branch_selling_price,
        },
      );

      toast.success("Product thresholds and price have been updated successfully.");
      setProduct(response.data as IBranchStoreProduct);
      handleEditClose();
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchSalesData = async () => {
    if (!product) return;

    try {
      setChartLoading(true);
      // Fix the type error by using the correct type for the request options
      const response = await apiRequest.get(`/sale/product-sales/`, {
        params: {
          product_id: product.product.id,
          branch_id: product.branch,
          period: selectedPeriod,
        },
      } as any);


      // Set the appropriate data based on the period
      if (selectedPeriod === "year" && response.data.monthly_data) {
        setSalesData(response.data.monthly_data);
      } else if (selectedPeriod === "month" && response.data.weekly_data) {
        setSalesData(response.data.weekly_data);
      } else if (selectedPeriod === "week" && response.data.daily_data) {
        setSalesData(response.data.daily_data);
      } else {
        setSalesData([]);
      }

      setSalesHistory(response.data.sales_history || []);
      setTotalSales(response.data.total_sales?.revenue || 0);
    } catch (err: any) {
      handleApiError(err);
      setSalesData([]);
      setSalesHistory([]);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    if (product?.product?.id) {
      fetchSalesData();
    }
  }, [product, selectedPeriod]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-primary border-t-transparent h-12 w-12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center p-8">
        <h2 className="text-red-600 text-lg mb-4">Error</h2>
        <p>{error}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center p-8">
        <h2 className="text-gray-600 text-lg mb-4">Product Not Found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // Get the appropriate label key based on the selected period
  const getLabelKey = () => {
    if (selectedPeriod === "year") return "month";
    if (selectedPeriod === "month") return "week_name";
    if (selectedPeriod === "week") return "day_name";

    return "month"; // Default
  };

  const CustomTooltip = ({active, payload}: any) => {
    if (active && payload && payload.length) {
      const labelKey = getLabelKey();
      const label = payload[0].payload[labelKey] || "";
      const value = payload[0].value;
      const quantity = payload[0].payload.quantity;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-md">
          <p className="font-medium text-gray-900 mb-1">{label}</p>
          <div className="flex flex-col gap-1 text-sm">
            {value > 0 ? (
              <>
                <p className="text-emerald-600 font-semibold">UGX {formatCurrency(value)}</p>
                <p className="text-gray-600">
                  Quantity: {quantity} {quantity === 1 ? "unit" : "units"}
                </p>
              </>
            ) : (
              <p className="text-gray-500">No sales in this period</p>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto p-4 px-5">
      {/* Edit Product Dialog - Now inline in the page component */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Product Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="shelf_threshold">
                  Shelf Threshold
                </Label>
                <Input
                  required
                  className="col-span-3"
                  id="shelf_threshold"
                  min="0"
                  name="shelf_threshold"
                  type="number"
                  value={formData.shelf_threshold}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="stock_threshold">
                  Store Threshold
                </Label>
                <Input
                  required
                  className="col-span-3"
                  id="stock_threshold"
                  min="0"
                  name="stock_threshold"
                  type="number"
                  value={formData.stock_threshold}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right" htmlFor="branch_selling_price">
                  Selling Price (UGX)
                </Label>
                <Input
                  required
                  className="col-span-3"
                  id="branch_selling_price"
                  min="0"
                  name="branch_selling_price"
                  step="0.01"
                  type="number"
                  value={formData.branch_selling_price}
                  onChange={handleChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={isSubmitting}
                type="button"
                variant="outline"
                onClick={handleEditClose}
              >
                Cancel
              </Button>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 px-10 ">
        <div className="flex items-center mb-6">
          <Button className="mr-2" size="sm" variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Product details
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Product Image */}
          <div className="w-full md:w-1/5">
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
              {product.product.product_image ? (
                <Image
                  alt={product.product.product_name}
                  className="object-contain max-h-[200px]"
                  height={300}
                  src={`${process.env.NEXT_PUBLIC_BASE_URL || ""}${product.product.product_image}`}
                  width={200}
                />
              ) : (
                <div className="w-full h-[200px] bg-gray-200 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="w-full md:w-4/5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-xl font-semibold">{product.product.product_name}</h2>
                <p className="text-sm text-gray-500">{product.product.barcode}</p>
              </div>
              <Button
                className="flex items-center gap-1"
                size="sm"
                variant="ghost"
                onClick={handleEditClick}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">
                  {product.product.category_details?.[0]?.category_name || "Drinks, Soft Drinks"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Unit</p>
                <p className="font-medium">
                  {product.product.unit_of_measure_details?.unit_name || "Piece (PC)"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Buying Price</p>
                <p className="font-medium">
                  UGX {formatCurrency(product.product.product_buying_price)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Selling Price</p>
                <p className="font-medium">
                  UGX{" "}
                  {formatCurrency(
                    product.branch_selling_price || product.product.product_selling_price,
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
              <div>
                <p className="text-sm text-gray-500">Shelf Threshold</p>
                <p className="font-medium">{formatCurrency(product.shelf_threshold)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Shelf Stock</p>
                <div className="flex items-center">
                  <p className="font-medium">{formatCurrency(product.quantity_in_shelf)}</p>
                  {product && product.quantity_in_shelf < (product.shelf_threshold ?? 0) && (
                    <Badge className="ml-2 text-xs" variant="destructive">
                      Low stock
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Store Threshold</p>
                <p className="font-medium">{formatCurrency(product.stock_threshold)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Store Stock</p>
                <div className="flex items-center">
                  <p className="font-medium">{formatCurrency(product.quantity_in_stock)}</p>
                  {product && product.quantity_in_stock > (product.stock_threshold ?? 0) && (
                    <Badge className="ml-2 text-xs" variant="success">
                      In stock
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Sales</h3>
            <div className="flex items-center">
              <select
                className="border rounded-md px-3 py-1 text-sm"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="year">Year</option>
              </select>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-4">UGX {formatCurrency(totalSales)}</h2>

          {/* Sales Chart */}
          <div className="h-64 mb-8 border rounded-lg p-4">
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8" />
              </div>
            ) : salesData.length > 0 ? (
              <>
                {
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart
                      data={salesData}
                      dataKey={"value"}
                      margin={{top: 20, right: 30, left: 20, bottom: 10}}
                    >
                      <XAxis
                        axisLine={{stroke: "#e5e7eb"}}
                        dataKey={getLabelKey()}
                        interval={0} // Show all month labels
                        padding={{left: 10, right: 10}}
                        tick={{fontSize: 12, fill: "#6b7280"}}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={{stroke: "#e5e7eb"}}
                        domain={[
                          0,
                          (dataMax: number) => {
                            // For sparse data with many zeros, ensure we have a reasonable scale
                            if (dataMax <= 0) return 1000;
                            // For small values, don't add too much padding
                            if (dataMax < 20000) return Math.ceil((dataMax * 1.2) / 5000) * 5000;
                            const order = Math.floor(Math.log10(dataMax));
                            const magnitude = Math.pow(10, order);
                            const normalized = Math.ceil(dataMax / magnitude);

                            return normalized * magnitude * 1.1; // Add 10% padding
                          },
                        ]}
                        tick={{fontSize: 12, fill: "#6b7280"}}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;

                          return value.toString();
                        }}
                        tickLine={false}
                        width={60}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{stroke: "#f3f4f6", strokeWidth: 1}}
                        wrapperStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        }}
                      />
                      <CartesianGrid
                        horizontal={true}
                        stroke="#f3f4f6"
                        strokeDasharray="5 5"
                        vertical={false}
                      />

                      <Line
                        activeDot={{
                          r: 8,
                          fill: "#047857",
                          stroke: "#ffffff",
                          strokeWidth: 2,
                        }}
                        animationDuration={1000}
                        animationEasing="ease-in-out"
                        connectNulls={false}
                        dataKey="value"
                        dot={(props) => {
                          const {cx, cy, payload, index} = props;
                          const key = `dot-${index}`;

                          // Show all dots, but make non-zero values more prominent
                          if (payload.value > 0) {
                            return (
                              <g key={key}>
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  fill="#047857"
                                  r={6}
                                  stroke="#ffffff"
                                  strokeWidth={2}
                                />
                                <text
                                  fill="#047857"
                                  fontSize={11}
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  x={cx}
                                  y={cy - 15}
                                >
                                  {formatCurrency(payload.value)}
                                </text>
                              </g>
                            );
                          } else {
                            return (
                              <circle
                                key={key}
                                cx={cx}
                                cy={cy}
                                fill="#10B981"
                                r={3}
                                stroke="#ffffff"
                                strokeWidth={1}
                              />
                            );
                          }
                        }}
                        stroke="#10B981"
                        strokeWidth={2}
                        type="monotone"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                }
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No sales data available for this period
              </div>
            )}
          </div>

          {/* Sales History Table */}
          <div>
            <h3 className="font-semibold mb-4">Sales history</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-left py-2 font-medium">Quantity sold</th>
                    <th className="text-left py-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.length > 0 ? (
                    salesHistory.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-3">{item.date}</td>
                        <td className="py-3">{item.quantity}</td>
                        <td className="py-3">{formatCurrency(item.revenue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b">
                      <td className="py-3 text-center text-gray-500" colSpan={3}>
                        No sales data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm">
              <div>
                Showing 1-{salesHistory.length} of {salesHistory.length}
              </div>
              <div className="flex items-center gap-2">
                <Button disabled size="sm" variant="outline">
                  Previous
                </Button>
                <Button className="bg-primary text-white" size="sm" variant="outline">
                  1
                </Button>
                <Button disabled size="sm" variant="outline">
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
