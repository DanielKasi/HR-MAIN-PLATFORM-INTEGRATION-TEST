import {PERMISSION_CODES} from "./types.utils";

export interface IProductCategoryDetail {
  id: number;
  institution: number;
  category_name: string;
  category_description: string | null;
}

export interface IUserInstitution {
  id: number;
  Institution_email: string;
  institution_owner_id: number;
  Institution_name: string;
  Institution_logo: string | null;
  theme_color: null | string;
  branches?: Branch[];
  first_phone_number: string;
  second_phone_number: string;
}

export interface IUnitOfMeasure {
  id: number;
  unit_name: string;
  unit_abbreviation: string;
  unit_description: string | null;
  institution: number | null;
}

export interface ICartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface Product {
  product: any;
  id: number;
  product_name: string;
  product_description: string | null;
  barcode: string | null;
  product_buying_price: number;
  product_selling_price: number;
  unallocated_stock: number;
  returned_stock: number;
  Institution_unallocated_stock_threshold: number;
  unit_of_measure?: number;
  unit_of_measure_details?: IUnitOfMeasure;
  categories?: number[];
  category_details?: IProductCategoryDetail[];
  is_out_of_stock: boolean;
  product_image: string | null;
  is_active: boolean;
  is_approved: boolean;
}

export interface IProductReturned {
  id: number;
  product: number;
  product_details: Product;
  quantity: string;
  condition: "GOOD" | "OPENED" | "DAMAGED" | "EXPIRED";
  reason: string;
}

export interface IReturnRequest {
  id: number;
  sale_transaction: number;
  sale_transaction_code: string;
  branch: number;
  request_date: string;
  return_status: "PENDING" | "APPROVED" | "REJECTED";
  notes: string;
  reference_code: string;
  replacement_transaction?: number;
  replacement_transaction_code?: string;
  created_by: number;
  products_returned: IProductReturned[];
  tasks: Array<ITask>;
  status: string;
}

export interface IBranchStoreProduct {
  id: number;
  branch: number;
  product: Product;
  quantity_in_stock: number;
  quantity_in_shelf: number;
  stock_threshold: number | null;
  shelf_threshold: number | null;
  branch_selling_price: number;
}

export interface IPurchaseOrderProduct {
  id: number;
  purchase_order: number;
  product: number;
  quantity: string;
  unit_price: string;
  total_price: string;
  product_details: Product;
}

export interface ISupplier {
  id: number;
  supplier_name: string;
  supplier_email: string;
  supplier_phone_number: string;
  institution: number;
}

export interface IPurchaseOrder {
  id: number;
  supplier: ISupplier;
  order_date: string;
  order_status: string;
  total_amount: string;
  purchase_order_products: IPurchaseOrderProduct[];
}

export interface ITask {
  id: number;
  step: ApprovalStep;
  status: string;
  object_id: number;
  content_object: string;
  updated_at: string;
  comment: string;
  approved_by: UserProfile | null;
}

export interface IApprovalProductDetails extends Product {
  id: number;
  institution: number;
  status: string;
  tasks: Array<ITask>;
}

export interface IApprovalPurchaseOrderDetails extends IPurchaseOrder {
  id: number;
  institution: number;
  status: string;
  tasks: Array<ITask>;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions_details?: IPermission[];
}

export type WorkflowAction = {
  id: number;
  code: string;
  label: string;
  category: {
    code: string;
    label: string;
  };
};

export interface Branch {
  id: number;
  institution: number;
  tills: ITill[];
  branch_name: string;
  branch_phone_number?: string;
  branch_location: string;
  branch_longitude: string;
  branch_latitude: string;
  branch_email?: string;
  branch_opening_time?: string;
  branch_closing_time?: string;
}

export interface IUser {
  id: number;
  fullname: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  roles: Role[];
  branches: Branch[];
}

export interface ICustomerProfile {
  user: IUser;
  phone_number: string;
  profile_picture: string;
  created_at: string;
}

export interface UserProfile {
  id: number;
  user: IUser;
  institution: number;
  bio: string | null;
}

export interface Permission {
  id: number;
  permission_name: string;
  permission_code: string;
  permission_description: string;
  category: {
    id: number;
    permission_category_name: string;
    permission_category_description: string;
  };
}

export interface RoleDetail {
  id: number;
  name: string;
  description: string;
  owner_user: number;
  permissions_details: Permission[];
}

export interface SalesTransactionProduct {
  product: number;
  product_details: Product;
  quantity: string;
  unit_price: string;
  total_price: string;
  discount: string;
}

export interface SalesTransaction {
  id: number;
  transaction_code: string;
  transaction_date: string;
  cashier_details: UserProfile;
  branch_details: Branch;
  payment_method?: "CARD" | "MOBILE_MONEY" | "CASH";
  payment_source?: "POS" | "ONLINE_MARKETPLACE";
  sub_total?: number;
  vat_amount?: number;
  total_amount: number;
  products: SalesTransactionProduct[];
}

export interface IMarketPlaceOrderProduct {
  product: IBranchStoreProduct;
  price: number;
  quantity: number;
}

export type IOrderStatus = {
  code: string;
  name: string;
  description: string;
};

export type IOrderSubStatus = {
  code: string;
  name: string;
  description: string;
  order_status: IOrderStatus;
};

export interface IMarketPlaceOrder {
  branch: Branch;
  order_id: string;
  order_date: string;
  order_sub_status: IOrderSubStatus;
  total_amount: number;
  is_to_be_delivered: boolean;
  delivery_address: string;
  created_at: string;
  products: IMarketPlaceOrderProduct[];
  updated_at: string;
  sale_transaction: SalesTransaction;
  customer_profile: ICustomerProfile;
  delivery_info: string | null;
  customer: IUser;
}

export interface StoredColorData {
  colors: string[];
  timestamp: number;
}

export type ApprovalStepApprover = {
  id: number;
  approver_user: UserProfile;
};

export type ApprovalStep = {
  id: number;
  step_name: string;
  roles: number[];
  roles_details: {
    name: string;
    id: number;
  }[];
  approvers?: number[];
  approvers_details?: ApprovalStepApprover[];
  institution: number;
  action: number;
  action_details: {
    id: number;
    code: string;
    label: string;
    category: {
      code: string;
      label: string;
    };
  };
  level: number;
};

// Interface for Permissions
export interface IPermission {
  permission_code: PERMISSION_CODES;
  name: string;
  description: string;
}

export interface ITill {
  id: number;
  name: string;
  branch: number;
}
