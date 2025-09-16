"use client";

import { Label } from "@/components/ui/label";
import { SearchableSelectInfinite } from "@/components/ui/scroll-searchable-select";
import { bankTypesAPI } from "@/lib/utils";
import type { IBankType } from "@/types/types.utils";

interface BankTypeSelectProps {
	value?: string | number;
	onValueChange: (value: string | number) => void;
	error?: string;
	disabled?: boolean;
	required?: boolean;
}

export function BankTypeSelect({
	value,
	onValueChange,
	error,
	disabled = false,
	required = false,
}: BankTypeSelectProps) {
	const fetchBankTypes = async (searchTerm: string, pageUrl?: string | null) => {
		let searchParams = "";
		if (pageUrl) {
			const url = new URL(pageUrl);
			searchParams = url.search;
		} else if (searchTerm) {
			searchParams = `?search=${encodeURIComponent(searchTerm)}`;
		}

		return await bankTypesAPI.getAll(searchParams);
	};

	const getItemValue = (bankType: IBankType) => bankType.id;
	const getItemLabel = (bankType: IBankType) => `${bankType.bank_fullname} (${bankType.bank_code})`;
	const getItemSearchText = (bankType: IBankType) =>
		`${bankType.bank_fullname} ${bankType.bank_code} ${bankType.br_code}`;

	return (
		<div className="space-y-2">
			<Label htmlFor="institution_bank">
				Bank Type {required && <span className="text-red-500">*</span>}
			</Label>
			<SearchableSelectInfinite<IBankType>
				value={value}
				onValueChange={onValueChange}
				placeholder="Select a bank type..."
				searchPlaceholder="Search attached banks ..."
				emptyText="No attached banks  found"
				loadingText="Loading attached banks ..."
				fetchData={fetchBankTypes}
				getItemValue={getItemValue}
				getItemLabel={getItemLabel}
				getItemSearchText={getItemSearchText}
				disabled={disabled}
				error={!!error}
				className="w-full"
			/>
			{error && <p className="text-sm text-red-500">{error}</p>}
		</div>
	);
}
