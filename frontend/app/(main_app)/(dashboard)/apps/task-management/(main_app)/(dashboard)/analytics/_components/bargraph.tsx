// "use strict";

// import Chartbox from "./chartbox";
// import {
// 	ResponsiveContainer,
// 	CartesianGrid,
// 	XAxis,
// 	YAxis,
// 	Tooltip,
// 	Bar,
// 	Cell,
// 	BarChart,
// 	Rectangle,
// 	LabelList,
// 	Legend,
// } from "recharts";

// type Entry = { name: string; value: number };

// interface Props {
// 	title: string;
// 	data: Record<string, Entry[]>;
// 	label?: boolean;
// 	colors: string[];
// }

// export default function Bargraph(props: Props) {
// 	return (
// 		<Chartbox
// 			{...props}
// 			renderContent={(p) => (
// 				<ResponsiveContainer width="100%" height={400}>
// 					<BarChart data={p.items} cx="50%" cy="50%" barCategoryGap={10}>
// 						<CartesianGrid strokeDasharray="1 1 0" vertical={false} />
// 						<Tooltip
// 							active
// 							content={(p) =>
// 								p.payload?.length ? (
// 									<div className="rounded-xl bg-slate-900 text-white px-2 py-1 grid gap-0.5 text-center">
// 										<span className="">{p.payload[0].name}</span>
// 										<span className="font-bold">{p.payload[0].value}</span>
// 									</div>
// 								) : null
// 							}
// 						/>
// 						<XAxis dataKey="name" axisLine={false} tickMargin={10} />

// 						<Bar dataKey="value" shape={(p: any) => <Rectangle {...p} radius={[10, 10, 0, 0]} />}>
// 							{p.items.map((_, index) => (
// 								<Cell key={`cell-${index}`} fill={props.colors[index]} />
// 							))}
// 						</Bar>
// 					</BarChart>
// 				</ResponsiveContainer>
// 			)}
// 		></Chartbox>
// 	);
// }
