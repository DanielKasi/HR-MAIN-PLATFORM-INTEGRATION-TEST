import React, { Component } from "react";
import moment from "moment";
import Timeline, {
	TimelineMarkers,
	TodayMarker,
	TimelineItemBase,
	TimelineGroupBase,
	ReactCalendarItemRendererProps,
} from "react-calendar-timeline";
import "./timeline.scss";
import "./style.css";
import itemRender from "./itemRender";
import SundaysMarker from "./SundaysMarker";
import keys from "./keys";

export interface Group extends TimelineGroupBase {
	id: number;
	title: string;
	rightTitle: string;
}

export interface Item extends TimelineItemBase<number> {
	id: number;
	group: number;
	title: string;
	className: string;
	start_time: number;
	end_time: number;
	canMove?: boolean;
	canResize?: boolean | "left" | "right" | "both";
	canChangeGroup?: boolean;
	tip?: string;
	selectedBgColor?: string;
	bgColor?: string;
	color?: string;
}

export interface Keys {
	groupIdKey: string;
	groupTitleKey: string;
	groupRightTitleKey: string;
	itemIdKey: string;
	itemTitleKey: string;
	itemDivTitleKey: string;
	itemGroupKey: string;
	itemTimeStartKey: string;
	itemTimeEndKey: string;
	groupLabelKey: string;
}

interface ItemContext {
	selected: boolean;
	dragging?: boolean;
	resizing?: boolean;
	dimensions: { height: number };
	title: string;
	useResizeHandle?: boolean;
}

interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
	key?: string | number;
}

export interface ItemRenderProps {
	item: Item;
	itemContext: ItemContext;
	getItemProps: (props: React.HTMLAttributes<HTMLDivElement>) => ItemProps;
	getResizeProps: () => {
		left?: React.HTMLAttributes<HTMLDivElement>;
		right?: React.HTMLAttributes<HTMLDivElement>;
	};
}

interface CalenderState {
	keys: Keys;
	groups: Group[];
	items: Item[];
	defaultStart: Date;
}

interface CalenderProps {
	groups?: Group[];
	items?: Item[];
	onItemMove?: (itemId: number, dragTime: number, newGroupOrder: number) => void;
	onItemResize?: (itemId: number, time: number, edge: "left" | "right") => void;
}

export default class Calender extends Component<CalenderProps, CalenderState> {
	constructor(props: CalenderProps) {
		super(props);
		this.state = {
			keys,
			groups: props.groups || [],
			items: props.items || [],
			defaultStart: new Date(),
		};
	}

	componentDidUpdate(prevProps: CalenderProps) {
		if (prevProps.groups !== this.props.groups || prevProps.items !== this.props.items) {
			this.setState({
				groups: this.props.groups || [],
				items: this.props.items || [],
			});
		}
	}

	toTimestamp = (strDate: string): number => {
		return Date.parse(strDate);
	};

	addItemHandler = (item: {
		assignee: number;
		task_name: string;
		status: string;
		start: string;
		end: string;
		description?: string;
	}) => {
		const currentTime = new Date().getTime(); // Current date as per query
		const startTime = this.toTimestamp(item.start);
		const endTime = this.toTimestamp(item.end);

		const newItem: Item = {
			id: 1 + this.state.items.reduce((max, value) => (value.id > max ? value.id : max), 0),
			group: item.assignee,
			title: item.task_name,
			className: item.status,
			start_time: startTime < currentTime ? currentTime : startTime,
			end_time: endTime < currentTime ? currentTime + (endTime - startTime) : endTime,
			tip: item.description,
		};

		this.setState((state) => ({
			items: [...state.items, newItem],
		}));
	};

	handleItemMove = (itemId: number, dragTime: number, newGroupOrder: number) => {
		const { items, groups, onItemMove } = this.props;
		const currentTime = new Date().getTime(); // Current date as per query

		let adjustedDragTime = dragTime;
		if (adjustedDragTime < currentTime) {
			adjustedDragTime = currentTime;
		}

		const group = groups![newGroupOrder];

		const updatedItems = items!.map((item) =>
			item.id === itemId
				? {
						...item,
						start_time: adjustedDragTime,
						end_time: adjustedDragTime + (item.end_time - item.start_time),
						group: group.id,
					}
				: item,
		);

		this.setState({ items: updatedItems });

		if (onItemMove) {
			onItemMove(itemId, adjustedDragTime, newGroupOrder);
		}
	};

	handleItemResize = (itemId: number, time: number, edge: "left" | "right") => {
		const { items, onItemResize } = this.props;
		const currentTime = new Date().getTime(); // Current date as per query

		let adjustedTime = time;
		if (edge === "left" && adjustedTime < currentTime) {
			adjustedTime = currentTime;
		}

		const updatedItems = items!.map((item) =>
			item.id === itemId
				? {
						...item,
						start_time: edge === "left" ? adjustedTime : item.start_time,
						end_time: edge === "right" ? adjustedTime : item.end_time,
					}
				: item,
		);

		this.setState({ items: updatedItems });

		if (onItemResize) {
			onItemResize(itemId, adjustedTime, edge);
		}
	};

	render() {
		const { keys, groups, items, defaultStart } = this.state;
		return (
			<Timeline
				keys={keys}
				groups={groups}
				items={items}
				rightSidebarWidth={200}
				rightSidebarContent="Status"
				sidebarContent="Tasks"
				lineHeight={75}
				itemRenderer={
					itemRender as (props: ReactCalendarItemRendererProps<Item>) => React.ReactNode
				}
				defaultTimeStart={moment(defaultStart).add(-1, "month")}
				defaultTimeEnd={moment(defaultStart).add(1.5, "month")}
				maxZoom={1.5 * 365.24 * 86400 * 1000}
				minZoom={1.24 * 86400 * 1000 * 7 * 3}
				itemTouchSendsClick={false}
				stackItems
				itemHeightRatio={0.6}
				canMove
				canResize="both"
				onItemMove={this.handleItemMove}
				onItemResize={this.handleItemResize}
			>
				<TimelineMarkers>
					<TodayMarker date={moment(new Date()).valueOf()}>
						{({ styles }) => (
							<div style={{ ...styles, width: "0.5rem", backgroundColor: "rgba(255,0,0,0.5)" }} />
						)}
					</TodayMarker>
					<SundaysMarker />
				</TimelineMarkers>
			</Timeline>
		);
	}
}
