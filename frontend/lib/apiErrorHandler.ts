import { toast } from "sonner";

export function handleApiError(error: { message: string }) {
	let message = "An unexpected error occurred";

	// Axios-style error: error.response.data
	if (error?.message) {
		const data = error.message;

		// Case: { email: ["This field is required."] }
		if (typeof data === "object" && !Array.isArray(data)) {
			const firstKey = Object.keys(data)[0];
			const firstMessage = data[firstKey]?.[0];

			if (firstMessage) {
				message = firstMessage;
			}
		}

		// Case: data is a string
		else if (typeof data === "string") {
			message = data;
		}
	}

	toast.error(message);
}
