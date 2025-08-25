import {Input} from "@/components/ui/input";
import {formatCurrency} from "@/lib/helpers";
import {InputHTMLAttributes} from "react";

interface FormattedNumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string | number;
  onValuChange: (val: number) => void;
  className?: string;
}

export function FormattedNumberInput({
  value,
  onValuChange,
  className = "",
  type,
  inputMode,
  ...props
}: FormattedNumberInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      className={className}
      value={formatCurrency(value)}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
          onValuChange(parsed);
        }
        console.log("\n\n Passing parsed value as : ", parsed)
      }}
    />
  );
}

export default FormattedNumberInput;
