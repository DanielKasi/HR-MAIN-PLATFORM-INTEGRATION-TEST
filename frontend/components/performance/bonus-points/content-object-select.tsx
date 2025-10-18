"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PROJECTS_API, PROJECTS_TASKS_API, OBJECTIVES_API } from "@/lib/utils";
import type { IProject, IProjectTask, IObjective } from "@/types/types.utils";
import { APPROVABLE_MODELS_API, APPROVAL_TASKS_API } from "@/lib/api/approvals/utils";
import { ApprovalTask } from "@/types/approvals.types";
export interface ContentObjectSelectProps {
	value: (string | number)[];
	onValueChange: (value: (string | number)[]) => void;
	contentType: number;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
	triggerClassName?: string;
	multiple?: boolean;
	hideSelectedFromList?: boolean;
	showSelectedItems?: boolean;
}

export const ContentObjectSelect = ({
	value,
	onValueChange,
	contentType,
	disabled = false,
	showSelectedItems = true,
	placeholder = "Select content object",
	className,
	triggerClassName,
	multiple = false,
	hideSelectedFromList = false,
}: ContentObjectSelectProps) => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [selectedItems, setSelectedItems] = useState<Array<string | number>>(value);
	const [contentTypeName, setContentTypeName] = useState<string>("");
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	const fetchContentTypeName = useCallback(async () => {
		if (!contentType) {
			setContentTypeName("");
			return;
		}
		try {
			const contentTypes = await APPROVABLE_MODELS_API.fetchAll();
			const ct = contentTypes.find((ct) => ct.id === contentType);
			setContentTypeName(ct?.model || "");
			setRefreshTrigger((prev) => prev + 1); // Trigger re-fetch of objects
		} catch (error) {
			console.error("Failed to fetch content types", error);
		}
	}, [contentType]);

	useEffect(() => {
		fetchContentTypeName();
	}, [fetchContentTypeName]);

	useEffect(() => {
		if (value !== selectedItems) {
			setSelectedItems(value);
		}
	}, [value]);

	const fetchFirstPage = useCallback(
		async (query?: { search?: string; page?: number }) => {
			if (!currentInstitution || !contentType || !contentTypeName) {
				return { results: [], count: 0, next: null, previous: null };
			}

			try {
				switch (contentTypeName) {
					case "project":
						return await PROJECTS_API.getPaginatedProjects({
							institutionId: currentInstitution.id,
							page: query?.page || 1,
							search: query?.search,
						});
					case "task":
						// Note: Using institutionId as placeholder for projectId. Adjust if specific projectId is needed.
						return await APPROVAL_TASKS_API.fetchAll({
							page: query?.page || 1,
							search: query?.search,
						});
					case "objective":
						return await OBJECTIVES_API.getPaginated({
							page: query?.page || 1,
							search: query?.search,
						});
					default:
						return { results: [], count: 0, next: null, previous: null };
				}
			} catch (error) {
				console.error(`Failed to fetch ${contentTypeName}`, error);
				return { results: [], count: 0, next: null, previous: null };
			}
		},
		[currentInstitution, contentType, contentTypeName, refreshTrigger],
	);

	const fetchFromUrl = useCallback(
		async ({ url }: { url: string }) => {
			if (!contentTypeName) {
				return { results: [], count: 0, next: null, previous: null };
			}
			try {
				switch (contentTypeName) {
					case "project":
						return await PROJECTS_API.getPaginatedProjectsFromUrl({ url });
					case "task":
						return await APPROVAL_TASKS_API.fetchPaginatedTasksFromUrl(url);
					case "objective":
						return await OBJECTIVES_API.getPaginatedFromUrl({ url });
					default:
						return { results: [], count: 0, next: null, previous: null };
				}
			} catch (error) {
				console.error(`Failed to fetch ${contentTypeName} from URL`, error);
				return { results: [], count: 0, next: null, previous: null };
			}
		},
		[contentTypeName],
	);

	const getItemLabel = useCallback(
		(item: IProject | ApprovalTask | IObjective) => {
			switch (contentTypeName) {
				case "project":
					return (item as IProject).project_name || "Unnamed Project";
				case "task":
					return (item as ApprovalTask).level.name || "Approval Task";

				case "objective":
					return (item as IObjective).name || "Unnamed Objective";
				default:
					return "Unknown";
			}
		},
		[contentTypeName],
	);

	const handleSelect = useCallback(
		(
			itemIds: (string | number)[],
			_items: PaginatedSelectItem<IProject | ApprovalTask | IObjective>[],
		) => {
			if (
				itemIds.filter((item) =>
					selectedItems.find((s_item) => s_item.toString() !== item.toString()),
				)
			) {
				if (multiple) {
					onValueChange([...selectedItems, ...itemIds]);
				} else {
					onValueChange(itemIds);
				}
			}
		},
		[multiple, selectedItems, onValueChange],
	);

	const handleRemove = useCallback(
		(
			itemIds: (string | number)[],
			_item: PaginatedSelectItem<IProject | ApprovalTask | IObjective>[],
		) => {
			const newItems = selectedItems.filter((id) => !itemIds.map(String).includes(id.toString()));
			setSelectedItems(newItems);
			onValueChange(newItems);
		},
		[selectedItems, onValueChange],
	);

	return (
		<div className={className}>
			<PaginatedSearchableSelect<
				IProject | ApprovalTask | IObjective,
				{ search?: string; page?: number }
			>
				paginated
				fetchFirstPage={fetchFirstPage}
				fetchFromUrl={fetchFromUrl}
				getItemId={(item) => item.id}
				getItemLabel={getItemLabel}
				getItemValue={(item) => item.id.toString()}
				selectedItems={selectedItems}
				onSelect={handleSelect}
				onRemove={handleRemove}
				showSelectedItems={showSelectedItems}
				multiple={multiple}
				disabled={disabled || !contentType || !contentTypeName}
				placeholder={placeholder}
				searchPlaceholder={`Search ${contentTypeName || "content"}`}
				triggerClassName={`w-full justify-between focus:ring-orange-500 focus:border-orange-500 ${triggerClassName || ""}`}
				popoverClassName="w-full"
				hideSelectedFromList={hideSelectedFromList}
				refreshTrigger={refreshTrigger}
			/>
		</div>
	);
};

export default ContentObjectSelect;
