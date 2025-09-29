import React from "react";
import { ItemRenderProps } from "./calender";

const itemRender = ({ item, itemContext, getItemProps, getResizeProps }: ItemRenderProps) => {
	const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();
	const backgroundColor = itemContext.selected
		? itemContext.dragging
			? "red"
			: item.selectedBgColor || "#fff"
		: item.bgColor || "#fff";
	const borderColor = itemContext.resizing ? "red" : item.color || "#000";

	// Get props and extract key separately to avoid spreading it
	const {
		key,
		style: baseStyle,
		...otherProps
	} = getItemProps({
		className: item.className,
		style: {
			backgroundColor, // Use non-shorthand property
			color: item.color || "#000",
			border: itemContext.selected ? "dashed 1px rgba(0,0,0,0.3)" : "none",
			borderRadius: "4px",
			boxShadow:
				"0 1px 5px 0 rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.12)",
		},
		onMouseDown: () => {
			console.log("on item click", item);
		},
	});

	// Merge styles, prioritizing our backgroundColor to avoid shorthand conflicts
	const mergedStyle = {
		...baseStyle,
		background: "none", // Explicitly clear any background shorthand
		backgroundColor, // Ensure backgroundColor takes precedence
		color: item.color || "#fff",
		border: itemContext.selected ? "dashed 1px rgba(0,0,0,0.3)" : "none",
		borderRadius: "0.7rem",
		boxShadow:
			"0 1px 5px 0 rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.12)",
	};

	return (
		<div key={key} {...otherProps} style={mergedStyle}>
			{itemContext.useResizeHandle ? <div {...leftResizeProps} /> : null}

			<div
				className="ripple !z-[40]"
				title={item.tip || itemContext.title}
				style={{
					height: itemContext.dimensions.height,
					overflow: "hidden",
					paddingLeft: 3,
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					fontSize: "1rem",
					marginLeft: "1rem",
					zIndex: "40 !important",
				}}
			>
				{itemContext.title}
			</div>

			{itemContext.useResizeHandle ? <div {...rightResizeProps} /> : null}
		</div>
	);
};

export default itemRender;
