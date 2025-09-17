import * as React from "react";

import { cn } from "@/lib/helpers";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				ref={ref}
				className={cn(
					"flex h-12 w-full rounded-2xl border-2 border-input bg-background px-3 py-2 text-base  file:border-2 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground  disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus:border-2 focus:border-solid focus:border-primary",
					className,
				)}
				type={type}
				{...props}
			/>
		);
	},
);

Input.displayName = "Input";

export { Input };
