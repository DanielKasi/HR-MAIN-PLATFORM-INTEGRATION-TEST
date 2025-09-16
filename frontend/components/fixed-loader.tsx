"use client";

import { Icon } from "@iconify/react";

type FixedLoaderProps = {
	className?: string;
	fixed?: boolean;
};
const FixedLoader = ({ className, fixed = true }: FixedLoaderProps) => {
	return (
		<div
			className={`${className} inset-0 ${fixed ? "fixed" : "absolute"} z-50 bg-gray-500/10 flex items-center justify-center`}
		>
			<span className="mx-auto">
				<Icon
					icon="icomoon-free:spinner10"
					width="16"
					height="16"
					className="h-8 w-8 animate-spin text-primary"
				/>
			</span>
		</div>
	);
};

export default FixedLoader;
