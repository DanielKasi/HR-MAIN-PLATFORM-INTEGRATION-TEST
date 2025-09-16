import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface TableSkeletonProps {
	rows?: number;
	columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 8 }: TableSkeletonProps) {
	return (
		<div className="animate-pulse">
			{/* Header skeleton */}
			<div className="px-6 py-4 border-b">
				<div className="flex flex-col sm:flex-row gap-4">
					<div className="flex-1">
						<div className="h-10 bg-gray-200 rounded-md max-w-sm"></div>
					</div>
					<div className="flex gap-2">
						<div className="h-10 w-32 bg-gray-200 rounded-md"></div>
						<div className="h-10 w-20 bg-gray-200 rounded-md"></div>
					</div>
				</div>
			</div>

			{/* Table info skeleton */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden mx-2">
				<div className="p-4 border-b border-gray-200">
					<div className="flex justify-between items-center">
						<div>
							<div className="h-6 bg-gray-200 rounded w-64 mb-2"></div>
							<div className="h-4 bg-gray-200 rounded w-48"></div>
						</div>
						<div className="h-4 bg-gray-200 rounded w-24"></div>
					</div>
				</div>

				<Table>
					<TableHeader>
						<TableRow className="bg-gray-50">
							{Array.from({ length: columns }).map((_, index) => (
								<TableHead key={index} className="py-4">
									<div className="h-4 bg-gray-200 rounded w-full"></div>
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: rows }).map((_, rowIndex) => (
							<TableRow
								key={rowIndex}
								className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
							>
								{/* Employee column with avatar */}
								<TableCell className="py-4">
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 bg-gray-200 rounded-full"></div>
										<div className="space-y-2">
											<div className="h-4 bg-gray-200 rounded w-32"></div>
											<div className="h-3 bg-gray-200 rounded w-24"></div>
										</div>
									</div>
								</TableCell>

								{/* Other columns */}
								{Array.from({ length: columns - 1 }).map((_, colIndex) => (
									<TableCell key={colIndex}>
										{colIndex === columns - 2 ? (
											// Status column with badge-like skeleton
											<div className="h-6 bg-gray-200 rounded-full w-16"></div>
										) : colIndex === columns - 3 ? (
											// Actions column with button skeleton
											<div className="flex justify-center">
												<div className="h-8 w-8 bg-gray-200 rounded-full"></div>
											</div>
										) : (
											// Regular data columns
											<div className="h-4 bg-gray-200 rounded w-20"></div>
										)}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>

				{/* Pagination skeleton */}
				<div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
					<div className="h-4 bg-gray-200 rounded w-48"></div>
					<div className="flex items-center space-x-2">
						<div className="h-8 w-20 bg-gray-200 rounded"></div>
						<div className="flex items-center space-x-1">
							{Array.from({ length: 5 }).map((_, index) => (
								<div key={index} className="h-8 w-8 bg-gray-200 rounded"></div>
							))}
						</div>
						<div className="h-8 w-16 bg-gray-200 rounded"></div>
					</div>
				</div>
			</div>
		</div>
	);
}
