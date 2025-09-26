"use client";

import { useSelector } from "react-redux";
import { useEffect, useState, useCallback, memo } from "react";
import PaginatedSearchableSelect, {
	PaginatedSelectItem,
} from "@/components/generic/paginated-searchable-select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { IDocumentTemplate } from "@/types/types.utils";
import { DOCUMENTS_API } from "@/lib/document-utils";

interface DocumentTemplateSearchableSelectProps {
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

export const DocumentTemplateSearchableSelect = memo(
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
	}: DocumentTemplateSearchableSelectProps) => {
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
				return await DOCUMENTS_API.getPaginatedDocumentTemplates({
					institutionId: currentInstitution.id,
					...query,
				});
			},
			[currentInstitution],
		);

		const fetchFromUrl = useCallback(async ({ url }: { url: string }) => {
			return await DOCUMENTS_API.getDocumentsTemplateFromUrl({ url });
		}, []);

		const handleSelect = useCallback(
			(itemId: string | number, _item: PaginatedSelectItem<IDocumentTemplate>) => {
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
			(itemId: string | number, _item: PaginatedSelectItem<IDocumentTemplate>) => {
				const newItems = selectedItems.filter((id) => String(id) !== String(itemId));
				setSelectedItems(newItems);
				onValueChange(newItems);
			},
			[selectedItems, onValueChange],
		);

		return (
			<div className={className}>
				<PaginatedSearchableSelect<IDocumentTemplate, { search?: string; page?: number }>
					paginated
					fetchFirstPage={fetchFirstPage}
					fetchFromUrl={fetchFromUrl}
					getItemId={(doc_template) => doc_template.id}
					getItemLabel={(doc_template) => doc_template.name || ""}
					getItemValue={(doc_template) => doc_template.id.toString()}
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

DocumentTemplateSearchableSelect.displayName = "DocumentTemplateSearchableSelect";

export default DocumentTemplateSearchableSelect;
