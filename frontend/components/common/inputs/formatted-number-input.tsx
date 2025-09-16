import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/helpers";
import { InputHTMLAttributes, useEffect, useRef, useState } from "react";

interface FormattedNumberInputProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
	value: string | number;
	onValueChange: (val: number) => void;
	className?: string;
}

export function FormattedNumberInput({
	value,
	onValueChange,
	className = "",
	type,
	inputMode,
	...props
}: FormattedNumberInputProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [inputValue, setInputValue] = useState<string>(() => {
		return value !== undefined && value !== null && String(value) !== "0"
			? formatCurrency(value)
			: "";
	});

	useEffect(() => {
		const formatted =
			value !== undefined && value !== null && String(value) !== "0" ? formatCurrency(value) : "";
		setInputValue(formatted);
	}, [value]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const v = e.target.value;
		setInputValue(v);

		// Remove commas and spaces
		const raw = v.replace(/,/g, "").trim();

		// If the user cleared the input, allow that and send 0 to parent so the model can reset
		if (raw === "") {
			onValueChange(0);
			return;
		}

		// Remove non-digit characters to ensure whole numbers only
		const digits = raw.replace(/\D+/g, "");
		if (digits === "") {
			onValueChange(0);
			return;
		}

		const parsed = parseInt(digits, 10);
		if (!isNaN(parsed)) {
			onValueChange(parsed);
		}
	};

	const handleBlur = () => {
		// Format the displayed value on blur based on the numeric prop
		const formatted =
			value !== undefined && value !== null && String(value) !== "0" ? formatCurrency(value) : "";
		setInputValue(formatted);
	};

	return (
		<Input
			{...props}
			ref={inputRef}
			type="text"
			inputMode="numeric"
			className={className}
			value={inputValue}
			onChange={handleChange}
			onBlur={handleBlur}
		/>
	);
}

export default FormattedNumberInput;
