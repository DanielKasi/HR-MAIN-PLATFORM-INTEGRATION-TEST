"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { IInterviewStage } from "@/types/types.utils";
import { INTERVIEW_STAGES_API } from "@/lib/api/interviews.utils";

interface InterviewStagesSearchableSelectProps {
	value: (string | number)[];
	onValueChange: (value: (string | number)[]) => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
	triggerClassName?: string;
	multiple?: boolean;
	hideSelectedFromList?: boolean;
	showSelectedItems?: boolean;
}

export const InterviewStagesSearchableSelect = memo(
	({
		value,
		onValueChange,
		disabled = false,
		showSelectedItems = true,
		placeholder = "Select employee(s)",
		className,
		triggerClassName,
		multiple = false,
		hideSelectedFromList = false,
	}: InterviewStagesSearchableSelectProps) => {
		const currentInstitution = useSelector(selectSelectedInstitution);
		const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value);

		useEffect(() => {
			setSelectedItems(value);
		}, [value]);

		const fetchFirstPage = useCallback(
			async (query?: { search?: string; page?: number }) => {
				if (!currentInstitution) {
					throw new Error("No institution found!");
				}
				return await INTERVIEW_STAGES_API.getPaginatedInterviewStages({
					institutionId: currentInstitution.id,
					...query,
				});
			},
			[currentInstitution],
		);

		const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
			return await INTERVIEW_STAGES_API.getPaginatedStagesFromUrl({ url });
		}, []);

		const handleSelect = useCallback(
			(itemId: string | number, _item: PaginatedSelectItem<IInterviewStage>) => {
				if (!selectedItems.includes(itemId)) {
					if (multiple) {
						onValueChange([...selectedItems, itemId]);
					} else {
						onValueChange([itemId]);
					}
				}
			},
			[multiple, selectedItems, onValueChange],
		);

		const handleRemove = useCallback(
			(itemId: string | number, _item: PaginatedSelectItem<IInterviewStage>) => {
				const newItems = selectedItems.filter((id) => String(id) !== String(itemId));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);

		return (
			<div className={className}>
				<PaginatedSearchableSelect<IInterviewStage, { search?: string; page?: number }>
					paginated
					fetchFirstPage={fetchFirstPage}
					fetchFromUrl={fetchFromUrl}
					getItemId={(stage) => stage.id}
					getItemLabel={(stage) => stage.name || ""}
					getItemValue={(stage) => stage.id.toString()}
					selectedItems={selectedItems}
					onSelect={handleSelect}
					onRemove={handleRemove}
					showSelectedItems={showSelectedItems}
					multiple={multiple}
					disabled={disabled}
					placeholder={placeholder}
					searchPlaceholder="Search templates by name"
					triggerClassName={`w-full justify-between focus:ring-orange-500 focus:border-orange-500 ${triggerClassName || ""}`}
					popoverClassName="w-full"
					hideSelectedFromList={hideSelectedFromList}
				/>
			</div>
		);
	},
);

InterviewStagesSearchableSelect.displayName = "InterviewStagesSearchableSelect";

export default InterviewStagesSearchableSelect;
