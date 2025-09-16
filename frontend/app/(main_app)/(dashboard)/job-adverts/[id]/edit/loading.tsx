import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
	return (
		<div className="w-full h-full p-6">
			<div className="w-full max-w-6xl mx-auto space-y-6">
				{/* Header Skeleton */}
				<div className="flex items-center gap-4">
					<Skeleton className="h-9 w-32" />
				</div>

				<Card className="w-full">
					<CardHeader>
						<div className="flex items-center gap-3">
							<Skeleton className="h-10 w-10 rounded-full" />
							<div className="space-y-2">
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-4 w-64" />
							</div>
						</div>
					</CardHeader>

					<CardContent className="space-y-6">
						<Skeleton className="h-16 w-full" />
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{[...Array(4)].map((_, i) => (
								<div key={i} className="space-y-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-10 w-full" />
								</div>
							))}
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="h-24 w-full" />
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
