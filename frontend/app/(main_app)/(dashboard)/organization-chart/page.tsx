"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft, Users, Building2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { OrganizationChart } from "primereact/organizationchart";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { showErrorToast } from "@/lib/utils";
import apiRequest from "@/lib/apiRequest";

import type {
	IOrganizationNode,
	IOrganizationChart,
	IApiPosition,
	IDepartment,
} from "@/types/types.utils";

export default function OrganizationChartPage() {
	const [chartData, setChartData] = useState<IOrganizationChart | null>(null);
	const [loading, setLoading] = useState(true);
	const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
	const [allDepartments, setAllDepartments] = useState<IDepartment[]>([]);
	const [primeChartData, setPrimeChartData] = useState<any[]>([]);

	const router = useRouter();
	const selectedInstitution = useSelector(selectSelectedInstitution);

	useEffect(() => {
		fetchOrganizationChart();
	}, [selectedInstitution]);

	useEffect(() => {
		if (chartData?.root) {
			const primeData = transformToPrimeReactData(chartData.root);
			setPrimeChartData(primeData);
		}
	}, [expandedNodes, chartData]);

	const fetchAllDepartments = async (): Promise<IDepartment[]> => {
		if (!selectedInstitution) {
			return [];
		}
		const allDepartments: IDepartment[] = [];
		let nextUrl: string | null = `/institution/${selectedInstitution.id}/department/`;

		try {
			while (nextUrl) {
				const response = await apiRequest.get(nextUrl);

				if (response.data.results && Array.isArray(response.data.results)) {
					allDepartments.push(...response.data.results);
					nextUrl = response.data.next;

					if (nextUrl && nextUrl.startsWith("http")) {
						const url = new URL(nextUrl);
						nextUrl = `/institution/${selectedInstitution.id}/department/${url.search}`;
					} else if (nextUrl && nextUrl.includes("/api/")) {
						nextUrl = nextUrl.replace("/api/", "/");
					}
				} else if (Array.isArray(response.data)) {
					allDepartments.push(...response.data);
					nextUrl = null;
				} else {
					nextUrl = null;
				}
			}
			setAllDepartments(allDepartments);
			return allDepartments;
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Error fetching departments" });
			return [];
		}
	};

	const getDepartmentName = (departmentId: number, departments: IDepartment[]): string => {
		const department = departments.find((dept) => dept.id === departmentId);
		if (department) {
			return department.name;
		}
		return "Unknown department";
	};

	const fetchAllPositions = async (): Promise<IApiPosition[]> => {
		const allPositions: IApiPosition[] = [];
		let nextUrl: string | null = "/institution/organization-chart/";

		while (nextUrl) {
			const response = await apiRequest.get(nextUrl);

			if (response.data.results && Array.isArray(response.data.results)) {
				allPositions.push(...response.data.results);
			}

			nextUrl = response.data.next;

			if (nextUrl) {
				if (nextUrl.startsWith("http")) {
					const url = new URL(nextUrl);
					nextUrl = `/institution/organization-chart/${url.search}`;
				} else if (nextUrl.includes("/api/")) {
					nextUrl = nextUrl.replace("/api/", "/");
				}
			}
		}

		return allPositions;
	};

	const transformToOrganizationChart = (
		positions: IApiPosition[],
		departments: IDepartment[],
	): IOrganizationChart => {
		const countAllPositions = (position: IApiPosition): number => {
			let count = 1;
			if (position.subordinates && position.subordinates.length > 0) {
				position.subordinates.forEach((sub) => {
					count += countAllPositions(sub);
				});
			}
			return count;
		};

		const buildHierarchy = (position: IApiPosition): IOrganizationNode => {
			const departmentName = getDepartmentName(position.department, departments);

			return {
				id: position.id,
				name: position.name,
				position: position.name,
				department: departmentName,
				profile_picture: undefined,
				subordinates: position.subordinates?.map(buildHierarchy) || [],
				subordinate_count: position.subordinates?.length || 0,
			};
		};

		const rootNodes = positions.filter((pos) => pos.reports_to === null);

		const totalPositions = rootNodes.reduce((total, rootNode) => {
			return total + countAllPositions(rootNode);
		}, 0);

		const virtualRoot: IOrganizationNode = {
			id: -1,
			name: selectedInstitution?.institution_name || "Organization",
			position: "CEO/Executive",
			profile_picture: undefined,
			subordinates: rootNodes.map(buildHierarchy),
			subordinate_count: rootNodes.length,
		};

		const calculateLevels = (node: IOrganizationNode): number => {
			if (!node.subordinates || node.subordinates.length === 0) return 1;
			return 1 + Math.max(...node.subordinates.map(calculateLevels));
		};

		const uniqueDepartments = new Set(
			positions.map((p) => getDepartmentName(p.department, departments)),
		).size;

		return {
			root: virtualRoot,
			total_employees: totalPositions,
			total_departments: uniqueDepartments,
			levels: calculateLevels(virtualRoot),
		};
	};

	const transformToPrimeReactData = (node: IOrganizationNode): any[] => {
		const transformNode = (currentNode: IOrganizationNode): any => {
			return {
				label: currentNode.name,
				expanded: expandedNodes.has(currentNode.id),
				data: {
					id: currentNode.id,
					name: currentNode.name,
					position: currentNode.position,
					department: currentNode.department,
					profile_picture: currentNode.profile_picture,
					subordinate_count: currentNode.subordinate_count,
				},
				children: currentNode.subordinates?.map(transformNode) || [],
			};
		};

		return [transformNode(node)];
	};

	const fetchOrganizationChart = async () => {
		if (!selectedInstitution) {
			toast.error("No organization selected");
			return;
		}

		setLoading(true);
		try {
			const departments = await fetchAllDepartments();
			const allPositions = await fetchAllPositions();

			const transformedData = transformToOrganizationChart(allPositions, departments);
			setChartData(transformedData);

			if (transformedData?.root) {
				const firstLevelIds =
					transformedData.root.subordinates?.map((node: IOrganizationNode) => node.id) || [];
				setExpandedNodes(new Set(firstLevelIds));
			}
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load organization chart" });
		} finally {
			setLoading(false);
		}
	};

	const toggleNode = (nodeData: any) => {
		const nodeId = nodeData.data.id;

		setExpandedNodes((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(nodeId)) {
				newSet.delete(nodeId);
			} else {
				newSet.add(nodeId);
			}
			return newSet;
		});
	};

	const expandAll = () => {
		const allIds = new Set<number>();
		const collectIds = (node: IOrganizationNode) => {
			allIds.add(node.id);
			node.subordinates?.forEach(collectIds);
		};
		if (chartData?.root) {
			collectIds(chartData.root);
		}
		setExpandedNodes(allIds);
	};

	const collapseAll = () => {
		setExpandedNodes(new Set());
	};

	const nodeTemplate = (node: any) => {
		const isVirtualRoot = node.data.id === -1;
		const hasSubordinates = node.children && node.children.length > 0;

		return (
			<Card
				className={`
          shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer
          ${node.level === 0 ? "border-2 border-primary" : ""}
          ${isVirtualRoot ? "bg-primary/5 border-primary/30" : ""}
          min-w-[200px] mx-2
        `}
				onClick={() => {
					if (hasSubordinates) {
						toggleNode(node);
					}
				}}
			>
				<CardContent className="p-4">
					<div className="flex items-start gap-3">
						<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
							{node.data.profile_picture ? (
								<img
									src={node.data.profile_picture}
									alt={node.data.name}
									className="w-full h-full rounded-full object-cover"
								/>
							) : (
								<Users className="h-6 w-6 text-primary" />
							)}
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="font-semibold text-sm truncate">{node.data.name}</h3>
							{!isVirtualRoot && node.data.position && (
								<p className="text-xs text-muted-foreground truncate">{node.data.position}</p>
							)}
							{node.data.department && (
								<p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-1">
									<Building2 className="h-3 w-3" />
									{node.data.department}
								</p>
							)}
							{isVirtualRoot && (
								<p className="text-xs text-primary font-medium mt-1">Executive Leadership</p>
							)}
							{hasSubordinates && (
								<p className="text-xs text-primary font-medium mt-2">
									{node.data.subordinate_count || node.children.length} direct report
									{(node.data.subordinate_count || node.children.length) !== 1 ? "s" : ""}
								</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		);
	};

	if (loading) {
		return (
			<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg">
				<div className="flex items-center gap-2 mb-6">
					<Skeleton className="h-10 w-10 rounded-full" />
					<div className="space-y-2">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-64" />
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
					{[...Array(3)].map((_, i) => (
						<Skeleton key={i} className="h-24" />
					))}
				</div>
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						className="rounded-full aspect-square"
						variant="outline"
						onClick={() => router.push("/admin")}
					>
						<ArrowLeft />
					</Button>
					<div className="ml-2">
						<h1 className="text-2xl font-bold">Organization Chart</h1>
						{selectedInstitution && (
							<p className="text-muted-foreground">
								{selectedInstitution.institution_name} - Hierarchical Structure
							</p>
						)}
					</div>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={fetchOrganizationChart} disabled={loading}>
						<RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
					<Button variant="outline" size="sm" onClick={expandAll}>
						Expand All
					</Button>
					<Button variant="outline" size="sm" onClick={collapseAll}>
						Collapse All
					</Button>
				</div>
			</div>

			{chartData && (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
					<Card className="shadow-sm">
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-2xl font-bold">{chartData.total_employees}</div>
									<p className="text-sm text-muted-foreground">Total Positions</p>
								</div>
								<Users className="h-8 w-8 text-primary" />
							</div>
						</CardContent>
					</Card>
					<Card className="shadow-sm">
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div>
									<div className="text-2xl font-bold">{allDepartments.length || 0}</div>
									<p className="text-sm text-muted-foreground">Departments</p>
								</div>
								<Building2 className="h-8 w-8 text-primary" />
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			<div className="bg-muted/30 rounded-lg p-6 overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)]">
				{primeChartData.length > 0 ? (
					<div className="min-w-max">
						<OrganizationChart value={primeChartData} nodeTemplate={nodeTemplate} />
					</div>
				) : (
					<div className="text-center py-12">
						<Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">No organization data</h3>
						<p className="text-muted-foreground">
							No organizational structure found for this institution.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
