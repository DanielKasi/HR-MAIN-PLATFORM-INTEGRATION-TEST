export { cn } from "@/lib/utils";
export { formatDate, formatNumberByMagnitude, capitalizeEachWord } from "@/lib/helpers";

export const formatCurrency = (amount: number, currency = "USD"): string => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(amount);
};

export const debounce = <T extends (...args: any[]) => any>(
	func: T,
	wait: number,
): ((...args: Parameters<T>) => void) => {
	let timeout: NodeJS.Timeout;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
};

export const throttle = <T extends (...args: any[]) => any>(
	func: T,
	limit: number,
): ((...args: Parameters<T>) => void) => {
	let inThrottle: boolean;
	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
};
