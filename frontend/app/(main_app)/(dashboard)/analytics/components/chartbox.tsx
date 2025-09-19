"use strict";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { useMobile } from "@/hooks/use-mobile";
import { ReactElement, useEffect, useState } from "react";

type Entry = {
	name: string;
	value: number;
};

interface Props<T> {
	title: string;
	data: Record<string, T[]>;
	label?: boolean;
	colors: string[];
	renderContent(props: { items: T[]; total: number }): ReactElement;
}

export default function Chartbox<T extends Entry>(props: Props<T>) {
	const { data, title, renderContent } = props;
	const currentYear = new Date().getFullYear().toString();
	const [keys] = useState(Object.keys(data));
	const [category, setCategory] = useState(currentYear);
	const [items, setItems] = useState([] as T[]);
	useEffect(() => {
		if (category) setItems(data[category] || []);
	}, [category, data]);
	const isMobile = useMobile();
	const total = items.reduce((p, x) => p + x.value, 0);
	return (
		<Card className="shadow-none border">
			<CardHeader>
				<div className="flex items-center gap-4">
					<CardTitle className="text-xl flex-grow">{title}</CardTitle>
					<div className="flex items-center gap-4">
						<Select onValueChange={(d) => setCategory(d)}>
							<SelectTrigger className="text-slate-900">
								<SelectValue placeholder={currentYear} />
							</SelectTrigger>
							<SelectContent>
								{keys
									.sort()
									.reverse()
									.map((k, i) => (
										<SelectItem key={`item-${i}`} value={k}>
											{k}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{items.length > 0 ? (
					renderContent({ items, total })
				) : (
					<div className="flex items-center justify-center h-[300px] text-slate-500">
						No application data available
					</div>
				)}
			</CardContent>
		</Card>
	);
}
