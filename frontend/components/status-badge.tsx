interface StatusBadgeProps {
	status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
	const getStatusColor = (status: string) => {
		const statusLower = status.toLowerCase();

		if (statusLower.includes("complete") || statusLower.includes("delivered")) {
			return "bg-green-100 text-green-800";
		}
		if (statusLower.includes("pending") || statusLower.includes("processing")) {
			return "bg-blue-100 text-blue-800";
		}
		if (statusLower.includes("cancel")) {
			return "bg-red-100 text-red-800";
		}

		return "bg-gray-100 text-gray-800";
	};

	return (
		<span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(status)}`}>{status}</span>
	);
}
