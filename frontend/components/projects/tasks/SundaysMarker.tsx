import React from "react";
import { CustomMarker, TimelineMarkers } from "react-calendar-timeline";
import moment, { Moment } from "moment";

interface SundaysMarkerState {
	markerDates: { id: number; date: Moment }[];
}

class SundaysMarker extends React.Component<{}, SundaysMarkerState> {
	state: SundaysMarkerState = {
		markerDates: [],
	};

	componentDidMount() {
		const dates: { id: number; date: Moment }[] = [];
		for (let i = -52; i <= 52; i++) {
			dates.push({
				id: i + 52,
				date: moment()
					.startOf("week")
					.add(i * 7, "days"),
			});
		}
		this.setState({ markerDates: dates });
	}

	render() {
		return (
			<TimelineMarkers>
				{this.state.markerDates.map((marker) => (
					<CustomMarker key={marker.id} date={Number(marker.date)}>
						{({ styles }) => {
							const customStyles = {
								...styles,
								background: `repeating-linear-gradient(
                0deg, transparent, transparent 5px, white 5px, red 10px )`,
								width: "1px",
							};
							return <div style={customStyles} />;
						}}
					</CustomMarker>
				))}
			</TimelineMarkers>
		);
	}
}

export default SundaysMarker;
