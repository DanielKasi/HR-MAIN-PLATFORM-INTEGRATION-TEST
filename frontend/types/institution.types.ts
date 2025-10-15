import { IUser } from "./user.types";

export type ACCOUNT_FATE_CHOICES = "new_role" | "deactivate";

export interface IOwnerShipHistory {
	id: number;
	institution: number;
	previous_owner: IUser | null;
	new_owner: IUser | null;
	account_fate: ACCOUNT_FATE_CHOICES;
	transfer_reason: string | null;
	transfer_date: string;
}

export interface IOwnershipTransferFormData {
	new_role?: number | null | undefined;
	institution: number | undefined;
	previous_owner_id: number;
	new_owner_id: number;
	account_fate: ACCOUNT_FATE_CHOICES;
	transfer_reason: string;
}
