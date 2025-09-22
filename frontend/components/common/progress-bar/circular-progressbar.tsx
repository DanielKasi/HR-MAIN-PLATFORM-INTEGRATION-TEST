const Circle = ({ colour, percentage = 0 }: { colour: string; percentage?: number }) => {
	const r = 70;
	const circ = 2 * Math.PI * r;
	const strokePct = ((100 - percentage) * circ) / 100;
	return (
		<circle
			r={r}
			cx={100}
			cy={100}
			className={`${strokePct !== circ ? "!stroke-primary" : ""}`}
			fill="transparent"
			// stroke={strokePct !== circ ? colour : ""} // remove colour as 0% sets full circumference
			strokeWidth={"1rem"}
			strokeLinecap="round"
			strokeDasharray={circ}
			strokeDashoffset={percentage ? strokePct : 0}
		></circle>
	);
};

const ProgressText = ({ percentage }: { percentage: number }) => {
	return (
		<text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={"1.5em"}>
			{percentage.toFixed(0)}%
		</text>
	);
};

export const CircularProgress = ({
	percentage,
	colour = "var(--primary)",
}: {
	colour?: string;
	percentage: number;
}) => {
	const pct = percentage > 100 ? 100 : percentage < 0 ? 0 : percentage;
	return (
		<svg width={200} height={200}>
			<g transform={`rotate(-90 ${"100 100"})`}>
				<Circle colour="#e5e7eb" />
				<Circle colour={colour} percentage={pct} />
			</g>
			<ProgressText percentage={pct} />
		</svg>
	);
};
