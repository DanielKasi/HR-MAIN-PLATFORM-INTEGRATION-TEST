export default function Loading() {
	return (
		<div className="container mx-auto py-6 flex justify-center items-center h-[60vh] bg-gray-50 min-h-screen">
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
				<p className="text-muted-foreground">Loading role details...</p>
			</div>
		</div>
	);
}
