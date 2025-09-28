"use client";

import type React from "react";
import type {
	ICreateEmployeeForm,
	IEmployeeFormData,
	IWorkType,
	IEmployeeType,
	IWorkTypeFormData,
	IEmployeeTypeFormData,
	ICountry,
	IChild,
	INextOfKin,
	IWorkExperience,
	IGender,
	IJobPosition,
	IBankAccount,
	IMaritalStatus,
	IEmployee,
	IEmployeeEducationFormData,
	IQualificationAward,
	IEmployeeBankAccountFormData,
	IBankType,
} from "@/types/types.utils";

import { useState, useEffect, useRef } from "react";
import { User, Loader2, Plus, MoreHorizontal, Edit, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneNumberInput from "@/components/phone-number-input";
import CountrySelect from "@/components/common/country-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import {
	createEmployeeType,
	getWorkTypes,
	getEmployeeTypes,
	showErrorToast,
	getEmployeeById,
	updateEmployee,
	EMPLOYEE_API,
} from "@/lib/utils";
import { useBranches } from "@/hooks/use-branches";
import { MultiSelectBranches } from "@/components/multi-select-branches";
import { PERMISSION_CODES } from "@/constants";
import JobPositionSearchableSelect from "@/components/selects/job-positions-select";
import ProtectedComponent from "@/components/ProtectedComponent";
import WorkTypeModal from "@/components/dialogs/work-type-dialog";
import { Steps } from "@/components/generic/steps";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BankAccountSearchableSelect } from "@/components/selects/bank-accounts-select";
import { formatCurrency } from "@/lib/helpers";
import FormattedNumberInput from "@/components/common/inputs/formatted-number-input";
import { BankTypeSearchableSelect } from "@/components/selects/bank-types-select";

interface Child extends IChild {}
interface NextOfKin extends INextOfKin {}

interface WorkExperience extends IWorkExperience {}

const maritalStatusOptions: Array<{ value: IMaritalStatus; label: string }> = [
	{ value: "single", label: "Single" },
	{ value: "married", label: "Married" },
	{ value: "divorced", label: "Divorced" },
	{ value: "widowed", label: "Widowed" },
];

const genderOptions: Array<{ value: IGender; label: string }> = [
	{ value: "male", label: "Male" },
	{ value: "female", label: "Female" },
];

const relationshipOptions = [
	{ value: "parent", label: "Parent" },
	{ value: "spouse", label: "Spouse" },
	{ value: "sibling", label: "Sibling" },
	{ value: "child", label: "Child" },
	{ value: "friend", label: "Friend" },
	{ value: "other", label: "Other" },
];

const steps = [
	{ id: 1, title: "Personal Information", description: "Basic details and profile" },
	{ id: 2, title: "Work Information", description: "Job details and experience" },
	{ id: 3, title: "Financial Information", description: "Banking and tax details" },
];

export default function UpdateEmployeeForm() {
	const router = useRouter();
	const params = useParams();
	const employeeId = params.id as string;
	const maxDateToDay = new Date().toISOString().split("T")[0];
	const Date18YearsOld = new Date();

	Date18YearsOld.setFullYear(new Date().getFullYear() - 18);
	const maxDate18 = Date18YearsOld.toISOString().split("T")[0];

	const [thisEmployee, setThisEmployee] = useState<IEmployee | null>(null);

	const [currentStep, setCurrentStep] = useState(1);
	const [completedSteps, setCompletedSteps] = useState<number[]>([]);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const [institutionBanks, setInstitutionBanks] = useState<IBankType[]>([]);
	const [selectedPayrollBranch, setSelectedPayrollBranch] = useState<number | null>(null);
	const [children, setChildren] = useState<Child[]>([]);
	const [nextOfKins, setNextOfKins] = useState<NextOfKin[]>([]);
	const [educations, setEducations] = useState<IEmployeeEducationFormData[]>([]);
	const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([]);

	const [isChildDialogOpen, setIsChildDialogOpen] = useState(false);
	const [isNextOfKinDialogOpen, setIsNextOfKinDialogOpen] = useState(false);
	const [isEducationDialogOpen, setIsEducationDialogOpen] = useState(false);
	const [isWorkExperienceDialogOpen, setIsWorkExperienceDialogOpen] = useState(false);
	const [isBankAccountDialogOpen, setIsBankAccountDialogOpen] = useState(false);

	const [editingChild, setEditingChild] = useState<Child | null>(null);
	const [editingNextOfKin, setEditingNextOfKin] = useState<NextOfKin | null>(null);
	const [editingEducation, setEditingEducation] = useState<IEmployeeEducationFormData | null>(null);
	const [editingWorkExperience, setEditingWorkExperience] = useState<WorkExperience | null>(null);
	const [editingBankAccount, setEditingBankAccount] = useState<IEmployeeBankAccountFormData | null>(
		null,
	);

	const [childFormData, setChildFormData] = useState<Omit<Child, "id">>({
		name: "",
		gender: "" as IGender,
		date_of_birth: "",
	});

	const [nextOfKinFormData, setNextOfKinFormData] = useState<Omit<NextOfKin, "id">>({
		name: "",
		relationship: "",
		phone_number: "",
		address: "",
	});

	const [educationFormData, setEducationFormData] = useState<
		Omit<IEmployeeEducationFormData, "id">
	>({
		name: "",
		institution: "",
		year: "",
		qualification_id: 0,
	});

	const [workExperienceFormData, setWorkExperienceFormData] = useState<Omit<WorkExperience, "id">>({
		company: "",
		position: "",
		duration: "",
		reason_of_leave: "",
	});

	const [bankAccountFormData, setBankAccountFormData] = useState<IEmployeeBankAccountFormData>({
		bank_id: 0,
		account_number: "",
		account_name: "",
	});

	// const [institutionId, setInstitutionId] = useState<number | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isValidating, setIsValidating] = useState(false);
	const [hasChildren, setHasChildren] = useState(false);
	const { branches, loading: branchesLoading, error: branchesError } = useBranches();

	const [positions, setPositions] = useState<IJobPosition[]>([]);
	const [selectedJobPositon, setSelectedJobPosition] = useState<IJobPosition | null>(null);
	const [workTypes, setWorkTypes] = useState<IWorkType[]>([]);
	const [employeeTypes, setEmployeeTypes] = useState<IEmployeeType[]>([]);
	const [loadingData, setLoadingData] = useState(false);
	const [employeeProfilePicture, setEmployeeProfilePicture] = useState<File | null>(null);
	const [phoneError, setPhoneError] = useState<string | null>(null);
	const [spousePhoneError, setSpousePhoneError] = useState<string | null>(null);

	const [isWorkTypeModalOpen, setIsWorkTypeModalOpen] = useState(false);
	const [isEmployeeTypeModalOpen, setIsEmployeeTypeModalOpen] = useState(false);
	const [isAddingWorkType, setIsAddingWorkType] = useState(false);
	const [isAddingEmployeeType, setIsAddingEmployeeType] = useState(false);
	const profilePicInputRef = useRef<HTMLInputElement | null>(null);
	const [qualifications, setQualifications] = useState<IQualificationAward[]>([]);
	const [workTypeFormData, setWorkTypeFormData] = useState<IWorkTypeFormData>({
		name: "",
		description: "",
		code: "",
		institution: selectedInstitution ? selectedInstitution.id : 0,
	});

	const [employeeTypeFormData, setEmployeeTypeFormData] = useState<IEmployeeTypeFormData>({
		name: "",
		description: "",
		code: "",
		institution: selectedInstitution ? selectedInstitution.id : 0,
	});

	// useEffect(()=>{
	// // console.log("\n\n Positions updated to : ", positions)
	// }, [positions])

	useEffect(() => {
		setWorkTypeFormData((prev) => ({
			...prev,
			institution: selectedInstitution ? selectedInstitution.id : 0,
		}));
		setEmployeeTypeFormData((prev) => ({
			...prev,
			institution: selectedInstitution ? selectedInstitution.id : 0,
		}));
	}, [selectedInstitution]);

	const [formData, setFormData] = useState<
		Omit<ICreateEmployeeForm, "phone_number_country_code" | "emergency_contact_phone_country_code">
	>({
		fullname: "",
		email: "",
		phone_number: "",
		position: 0,
		department: 0,
		work_type: 0,
		has_children: false,
		employee_type: 0,
		date_of_birth: "",
		date_of_joining: new Date().toISOString().split("T")[0],
		address: "",
		country: "",
		nin: "",
		tin: "",
		salary: 0,
		nssf_no: "",
		is_active: true,
		skills: "",
		selected_branches: [],
		marital_status: "single",
		gender: "male",
		children: [],
		next_of_kin: [],
		educations: [],
		bank_accounts: [],
		work_experiences: [],
	});

	const [previewUrl, setPreviewUrl] = useState<string>("");
	// const [uploadError, setUploadError] = useState<string | null>(null);

	const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
	const [phoneInput, setPhoneInput] = useState<{
		country: ICountry | null;
		countryCode: string;
		phoneNumber: string;
		isValid: boolean;
	}>({ country: null, countryCode: "", phoneNumber: "", isValid: false });

	// Add state for emergency contact phone input
	const [emergencyContactPhoneInput, setEmergencyContactPhoneInput] = useState<{
		country: ICountry | null;
		countryCode: string;
		phoneNumber: string;
		isValid: boolean;
	}>({ country: null, countryCode: "", phoneNumber: "", isValid: false });

	// Add state for spouse phone input if any
	const [spousePhoneInput, setSpousePhoneInput] = useState<{
		country: ICountry | null;
		countryCode: string;
		phoneNumber: string;
		isValid: boolean;
	}>({ country: null, countryCode: "", phoneNumber: "", isValid: false });

	const dispatch = useDispatch();

	const showSuccessToast = (message: string) => {
		toast.success(message);
	};

	const generateId = () => Math.random().toString(36).slice(2, 9);

	const handleAddChild = () => {
		if (!childFormData.name || !childFormData.gender || !childFormData.date_of_birth) return;

		if (editingChild) {
			setChildren((prev) =>
				prev.map((child) =>
					child.id === editingChild.id ? { ...childFormData, id: editingChild.id } : child,
				),
			);
			setEditingChild(null);
		} else {
			const newChild: Child = {
				...childFormData,
				id: generateId(),
			};

			setChildren((prev) => [...prev, newChild]);
		}

		setChildFormData({ name: "", gender: "" as IGender, date_of_birth: "" });
		setIsChildDialogOpen(false);
	};

	const handleEditChild = (child: Child) => {
		setEditingChild(child);
		setChildFormData({
			name: child.name,
			gender: child.gender,
			date_of_birth: child.date_of_birth,
		});
		setIsChildDialogOpen(true);
	};

	const handleDeleteChild = (id: string) => {
		setChildren((prev) => prev.filter((child) => child.id !== id));
	};

	const handleAddNextOfKin = () => {
		if (!nextOfKinFormData.name || !nextOfKinFormData.relationship) return;

		if (editingNextOfKin) {
			setNextOfKins((prev) =>
				prev.map((nok) =>
					nok.id === editingNextOfKin.id ? { ...nextOfKinFormData, id: editingNextOfKin.id } : nok,
				),
			);
			setEditingNextOfKin(null);
		} else {
			const newNextOfKin: NextOfKin = {
				...nextOfKinFormData,
				id: generateId(),
			};

			setNextOfKins((prev) => [...prev, newNextOfKin]);
		}

		setNextOfKinFormData({ name: "", relationship: "", phone_number: "", address: "" });
		setIsNextOfKinDialogOpen(false);
	};

	const handleEditNextOfKin = (nok: NextOfKin) => {
		setEditingNextOfKin(nok);
		setNextOfKinFormData({
			name: nok.name,
			relationship: nok.relationship,
			phone_number: nok.phone_number,
			address: nok.address,
		});
		setIsNextOfKinDialogOpen(true);
	};

	const handleDeleteNextOfKin = (id: string) => {
		setNextOfKins((prev) => prev.filter((nok) => nok.id !== id));
	};

	const handleAddEducation = () => {
		if (!educationFormData.qualification_id || !educationFormData.institution) return;

		if (editingEducation) {
			setEducations((prev) =>
				prev.map((edu) =>
					edu.id === editingEducation.id ? { ...educationFormData, id: editingEducation.id } : edu,
				),
			);
			setEditingEducation(null);
		} else {
			const newEducation: IEmployeeEducationFormData = {
				...educationFormData,
				id: generateId(),
			};

			setEducations((prev) => [...prev, newEducation]);
		}

		setEducationFormData({ qualification_id: 0, institution: "", year: "", name: "" });
		setIsEducationDialogOpen(false);
	};

	const handleEditEducation = (edu: IEmployeeEducationFormData) => {
		setEditingEducation(edu);
		setEducationFormData({
			qualification_id: edu.qualification_id,
			institution: edu.institution,
			year: edu.year,
			name: edu.name,
		});
		setIsEducationDialogOpen(true);
	};

	const handleDeleteEducation = (id: string) => {
		setEducations((prev) => prev.filter((edu) => edu.id !== id));
	};

	const handleAddWorkExperience = () => {
		if (!workExperienceFormData.company || !workExperienceFormData.position) return;

		if (editingWorkExperience) {
			setWorkExperiences((prev) =>
				prev.map((exp) =>
					exp.id === editingWorkExperience.id
						? { ...workExperienceFormData, id: editingWorkExperience.id }
						: exp,
				),
			);
			setEditingWorkExperience(null);
		} else {
			const newWorkExperience: WorkExperience = {
				...workExperienceFormData,
				id: generateId(),
			};

			setWorkExperiences((prev) => [...prev, newWorkExperience]);
		}

		setWorkExperienceFormData({ company: "", position: "", duration: "", reason_of_leave: "" });
		setIsWorkExperienceDialogOpen(false);
	};

	const handleEditWorkExperience = (exp: WorkExperience) => {
		setEditingWorkExperience(exp);
		setWorkExperienceFormData({
			company: exp.company,
			position: exp.position,
			duration: exp.duration,
			reason_of_leave: exp.reason_of_leave,
		});
		setIsWorkExperienceDialogOpen(true);
	};

	const handleDeleteWorkExperience = (id: string) => {
		setWorkExperiences((prev) => prev.filter((exp) => exp.id !== id));
	};

	useEffect(() => {
		if (employeeId && selectedInstitution) {
			loadEmployee();
		}
		loadDropdownData();
	}, [employeeId, selectedInstitution]);

	useEffect(() => {
		setFormData((prev) => ({ ...prev, selected_branches: branches.map((br) => br.id) }));
	}, [branches]);

	const loadEmployee = async () => {
		setLoadingData(true);
		try {
			const employee: IEmployee = await getEmployeeById({ employeeId: parseInt(employeeId) });
			setThisEmployee(employee);
			setFormData({
				fullname: employee?.name || employee.user?.fullname || "",
				email: employee.email,
				company_email: employee.company_email?.email || "",
				phone_number: employee.phone_number,
				position: employee.position.id,
				department: employee.department.id,
				work_type: employee.work_type.id,
				employee_type: employee.employee_type.id,
				date_of_birth: employee.date_of_birth,
				date_of_joining: employee.date_of_joining,
				address: employee.address,
				country: employee.country,
				nin: employee.nin,
				tin: employee.tin,
				nssf_no: employee.nssf_no,
				salary: parseFloat(employee.salary),
				is_active: employee.is_active,
				skills: employee.skills,
				has_children: employee.has_children,
				selected_branches:
					employee.user?.branches.map((b) => b.id) || employee?.payroll_branch?.id
						? [employee?.payroll_branch?.id as unknown as number]
						: [],
				marital_status: employee.marital_status,
				gender: employee.gender,
				children: employee.children,
				next_of_kin: employee.next_of_kin,
				educations: employee.educations,
				bank_accounts: employee.bank_accounts.map((acc) => ({
					bank_id: Number(employee.bank_accounts[0].bank.id),
					account_number: employee.bank_accounts[0].account_number,
					account_name: employee.bank_accounts[0].account_name,
				})),
				work_experiences: employee.work_experiences,
			});

			setChildren(employee.children);
			setHasChildren(employee.has_children);
			setNextOfKins(employee.next_of_kin);
			setSelectedPayrollBranch(employee.payroll_branch?.id || null);
			setEducations(
				employee.educations.map((ed) => ({
					name: ed.name,
					qualification_id: ed.qualification?.id || 0,
					year: ed.year,
					institution: ed.institution,
					id: ed.id,
				})),
			);
			setWorkExperiences(employee.work_experiences);
			if (employee.bank_accounts.length) {
				console.log("\n\n Setting bank account form data to : ", {
					bank_id: Number(employee.bank_accounts[0].bank.id),
					account_number: employee.bank_accounts[0].account_number,
					account_name: employee.bank_accounts[0].account_name,
				});
				setBankAccountFormData((prev) => ({
					...prev,
					bank_id: Number(employee.bank_accounts[0].bank.id),
					account_number: employee.bank_accounts[0].account_number,
					account_name: employee.bank_accounts[0].account_name,
				}));
			}

			if (employee.spouse) {
				setSpouseFormData({
					name: employee.spouse.name,
					phone_number: employee.spouse.phone_number,
					dateOfBirth: employee.spouse.date_of_birth,
				});
				// Set spousePhoneInput if needed
				setSpousePhoneInput({
					...spousePhoneInput,
					phoneNumber: employee.spouse.phone_number,
					// Assume default countryCode
				});
			}

			if (employee.employee_profile_picture) {
				setPreviewUrl(employee.employee_profile_picture);
			}

			setSelectedCountry({ name: { common: employee.country } } as ICountry);

			setPhoneInput({
				...phoneInput,
				phoneNumber: employee.phone_number,
				// Assume default country and countryCode, e.g., Uganda +256
				countryCode: "", // Adjust if backend provides phone_number_country_code
			});

			// Set emergencyContactPhoneInput for nextOfKins if needed
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : "Failed to load employee data";

			toast.error(errorMessage);
		} finally {
			setLoadingData(false);
		}
	};

	const loadDropdownData = async () => {
		if (!selectedInstitution) return;

		setLoadingData(true);
		try {
			const [workTypesData, employeeTypesData, qualification_awards] = await Promise.all([
				getWorkTypes({ institutionId: selectedInstitution.id }),
				getEmployeeTypes({ institutionId: selectedInstitution.id }),
				EMPLOYEE_API.getQualificationAwards(),
			]);

			setWorkTypes(workTypesData.results || []);
			setEmployeeTypes(Array.isArray(employeeTypesData.results) ? employeeTypesData.results : []);
			setQualifications(qualification_awards);
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An unknown error occurred while loading form data.";

			setSubmitError(errorMessage);
		} finally {
			setLoadingData(false);
		}
	};

	const handleInputChange = (
		field: keyof ICreateEmployeeForm,
		value: string | boolean | File | null | number | number[],
	) => {
		if (field == "position" && typeof value === "number") {
			const positionMatch = positions.find((pos) => pos.id === value);
			const updatedFormData: typeof formData = {
				...formData,
				position: value as number,
				department: positionMatch ? positionMatch.department : formData.department,
			};

			if (positionMatch) {
				setSelectedJobPosition(positionMatch);
			}
			setFormData(updatedFormData);
		} else if (field === "department") {
			// Clear position when department changes
			const departmentValue = typeof value === "number" ? value : Number(value);
			const updatedFormData = {
				...formData,
				department: departmentValue,
				position: 0,
			};

			setFormData(updatedFormData);
		} else {
			const updatedFormData = {
				...formData,
				[field]: value,
			};

			if (field === "fullname") {
				setBankAccountFormData((prev) => ({ ...prev, account_name: value as string }));
			}
			setFormData(updatedFormData);
		}
	};

	const handleProflePictureChange = (value: File | null) => {
		setEmployeeProfilePicture(value);

		// Also save the updated form data to Redux (without the profile picture)
		const updatedFormData = { ...formData };

		setFormData(updatedFormData);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];

		if (!file) {
			toast.error("No file selected");

			return;
		}

		const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

		if (!validImageTypes.includes(file.type)) {
			toast.error("Please upload a valid image (JPEG, PNG, GIF, or WebP)");

			return;
		}

		const maxSize = 10 * 1024 * 1024;

		if (file.size > maxSize) {
			toast.error("Image size exceeds 10MB limit");

			return;
		}

		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}

		try {
			handleProflePictureChange(file);
			const url = URL.createObjectURL(file);

			setPreviewUrl(url);
		} catch (error: unknown) {
			showErrorToast({
				error,
				defaultMessage: "An unknown error occurred while processing the image",
			});
		}
	};

	const handleRemoveImage = () => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		setPreviewUrl("");
		handleProflePictureChange(null);
		const fileInput = profilePicInputRef.current;

		if (fileInput) {
			fileInput.value = "";
		}

		// Save the updated form data to Redux after removing image
		const updatedFormData = { ...formData };

		setFormData(updatedFormData);
	};

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	const validateForm = () => {
		if (!formData.fullname || !formData.email) {
			setSubmitError("Please fill in all required fields");

			return false;
		}

		return true;
	};

	const isCurrentStepValid = () => {
		switch (currentStep) {
			case 1:
				const currentDate = new Date();
				const DOB = new Date(formData.date_of_birth);
				return !!(
					formData.fullname &&
					formData.email &&
					formData.country &&
					formData.marital_status &&
					formData.address &&
					formData.date_of_birth &&
					formData.nin &&
					formData.phone_number &&
					currentDate.getFullYear() - DOB.getFullYear() >= 18
				);
			case 2:
				return !!(
					formData.department &&
					formData.position &&
					formData.date_of_joining &&
					formData.employee_type &&
					formData.employee_type &&
					selectedPayrollBranch
				);
			case 3:
				return !!(
					// bankAccountFormData.account_name.trim() &&
					// bankAccountFormData.account_number &&
					// bankAccountFormData.account_number.trim() &&
					// bankAccountFormData.account_number.length <= 20 &&
					// bankAccountFormData.bank_id &&
					(
						formData.tin &&
						formData.tin.trim() &&
						formData.nssf_no &&
						formData.nssf_no.trim() &&
						formData.salary &&
						formData.salary > 0
					)
				);
			default:
				return false;
		}
	};

	const nextStep = () => {
		if (isCurrentStepValid() && currentStep < steps.length) {
			setCompletedSteps((prev) => [...prev.filter((s) => s !== currentStep), currentStep]);
			setCurrentStep((prev) => prev + 1 || 1);
			// return
		}
	};

	const prevStep = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleAddWorkType = async (workType: IWorkType) => {
		setWorkTypes((prev) => [...prev, workType]);
		handleInputChange("work_type", workType.id);
	};

	const handleAddEmployeeType = async () => {
		if (!selectedInstitution || !employeeTypeFormData.name.trim()) return;

		setIsAddingEmployeeType(true);
		try {
			const newEmployeeType = await createEmployeeType({
				institutionId: selectedInstitution.id,
				employeeTypeData: employeeTypeFormData,
			});

			setEmployeeTypes((prev) => [...prev, newEmployeeType]);
			handleInputChange("employee_type", newEmployeeType.id);

			setEmployeeTypeFormData({
				name: "",
				description: "",
				code: "",
				institution: selectedInstitution.id,
			});
			setIsEmployeeTypeModalOpen(false);

			toast.success("Employee type created successfully");
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to create employee type";

			toast.error(errorMessage);
		} finally {
			setIsAddingEmployeeType(false);
		}
	};

	const [phoneCountryCode, setPhoneCountryCode] = useState<string>("");
	const [spouseFormData, setSpouseFormData] = useState<{
		name: string;
		phone_number: string;
		dateOfBirth: string;
	}>({
		name: "",
		phone_number: "",
		dateOfBirth: "",
	});

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Only submit if we're on the last step
		if (currentStep === steps.length) {
			handleSubmit();
		}
	};

	const handleSubmit = async () => {
		if (!selectedInstitution) {
			showErrorToast({
				error: new Error("No institution selected"),
				defaultMessage: "Please select an institution",
			});

			return;
		}

		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const dataToSubmit: IEmployeeFormData = {
				user: {
					fullname: formData.fullname,
					email: formData.email,
				},
				email: formData.email,
				phone_number: formData.phone_number,
				phone_number_country_code: phoneCountryCode,
				gender: formData.gender || "male",
				date_of_birth: formData.date_of_birth,
				date_of_joining: formData.date_of_joining,
				address: formData.address,
				country: formData.country,
				nin: formData.nin,
				tin: formData.tin,
				nssf_no: formData.nssf_no,
				salary: formData.salary,
				is_active: formData.is_active,
				skills: formData.skills,
				marital_status: formData.marital_status,
				employee_profile_picture: employeeProfilePicture,
				selected_branches: formData.selected_branches,
				work_type: formData.work_type,
				employee_type: formData.employee_type,
				position: formData.position,
				department: formData.department,
				has_children: hasChildren,
				payroll_branch: selectedPayrollBranch,
				children: children.map((child, idx) => ({
					id: String(idx),
					name: child.name,
					gender: child.gender,
					date_of_birth: child.date_of_birth,
				})),
				next_of_kin: nextOfKins.map((nok, idx) => ({
					id: String(idx),
					name: nok.name,
					relationship: nok.relationship,
					phone_number: nok.phone_number,
					address: nok.address,
				})),
				educations: educations.map((edu, idx) => ({
					id: String(idx),
					qualification_id: edu.qualification_id,
					institution: edu.institution,
					year: edu.year,
					name: edu.name,
				})),
				work_experiences: workExperiences.map((exp, idx) => ({
					id: String(idx),
					company: exp.company,
					position: exp.position,
					duration: exp.duration,
					reason_of_leave: exp.reason_of_leave,
				})),
				bank_accounts: [bankAccountFormData],
			};
			if (formData.marital_status === "married") {
				dataToSubmit["spouse"] = {
					name: spouseFormData.name,
					phone_number: spouseFormData.phone_number,
					date_of_birth: spouseFormData.dateOfBirth,
				};
			}
			if (formData.company_email) {
				dataToSubmit["company_email"] = formData.company_email;
			}

			await updateEmployee({
				employeeId: parseInt(employeeId),
				employeeData: dataToSubmit,
			});
			router.push("/employees/employee-list");
			showSuccessToast("Employee created successfully");
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An unknown error occurred while creating the employee.";

			showErrorToast({ error, defaultMessage: "Failed to create employee" });
			setSubmitError(
				typeof error === "object" ? "An error occurred while creating the employee" : errorMessage,
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	useEffect(() => {
		let updatedFormData: typeof formData | null = null;

		const newPhoneNumber =
			phoneInput.countryCode && phoneInput.phoneNumber
				? `${phoneInput.phoneNumber}`
				: formData.phone_number;

		const newCountry = selectedCountry?.name?.common || formData.country;

		const newNextOfKinPhoneNUmber =
			emergencyContactPhoneInput.isValid && emergencyContactPhoneInput.phoneNumber
				? `${emergencyContactPhoneInput.phoneNumber}`
				: nextOfKinFormData.phone_number;

		const spousePhoneNUmber =
			spousePhoneInput.isValid && spousePhoneInput.phoneNumber
				? `${spousePhoneInput.phoneNumber}`
				: spouseFormData.phone_number;

		if (
			!formData.phone_number ||
			newPhoneNumber !== formData.phone_number ||
			newCountry !== formData.country
		) {
			updatedFormData = {
				...formData,
				phone_number: newPhoneNumber,
				country: newCountry,
			};
		}

		if (
			!nextOfKinFormData.phone_number ||
			newNextOfKinPhoneNUmber !== nextOfKinFormData.phone_number
		) {
			setNextOfKinFormData((prev) => ({ ...prev, phone_number: newNextOfKinPhoneNUmber }));
		}

		if (!spouseFormData.phone_number || spousePhoneNUmber !== spouseFormData.phone_number) {
			setSpouseFormData((prev) => ({ ...prev, phone_number: spousePhoneNUmber }));
		}

		if (updatedFormData) {
			setFormData(updatedFormData);
		}
	}, [phoneInput, selectedCountry?.name?.common, emergencyContactPhoneInput, spousePhoneInput]);

	// useEffect(() => {
	//   const newPhoneNumber =
	//     phoneInput.countryCode && phoneInput.phoneNumber
	//       ? `${phoneInput.phoneNumber}`
	//       : formData.phone_number;

	//   const newCountry = selectedCountry?.name?.common || formData.country;

	//   if (newPhoneNumber !== formData.phone_number || newCountry !== formData.country) {
	//     const updatedFormData: typeof formData = {
	//       ...formData,
	//       phone_number: newPhoneNumber,
	//       country: newCountry,
	//     };
	//     setFormData(updatedFormData);
	//   }
	// }, [phoneInput, selectedCountry?.name?.common, emergencyContactPhoneInput]);

	const renderStep = () => {
		if (loadingData) {
			return (
				<div className="flex justify-center items-center h-64">
					<Loader2 className="h-8 w-8 animate-spin" />
				</div>
			);
		}
		switch (currentStep) {
			case 1:
				return (
					<div className="space-y-8">
						{/* Personal Information */}
						<div className="space-y-6">
							<div className="space-y-6">
								<div>
									<h4 className="text-lg md:text-xl font-medium text-gray-800 mb-4 underline underline-offset-2">
										Basic Information
									</h4>
									<div className="flex flex-col md:flex-row items-center justify-start gap-8">
										{/* Profile Picture Upload */}
										<div className="flex flex-col items-center space-y-4">
											<div className="relative">
												<Avatar className="w-32 h-32">
													<AvatarImage
														src={previewUrl || "/placeholder.svg"}
														alt="Profile preview"
													/>
													<AvatarFallback className="bg-gray-100">
														<User className="w-16 h-16 text-gray-400" />
													</AvatarFallback>
												</Avatar>

												<Label
													htmlFor="profilePicture"
													className="cursor-pointer absolute right-2 bottom-2"
												>
													<Button
														size={"sm"}
														type="button"
														onClick={() => {
															profilePicInputRef.current?.click();
														}}
														className="!bg-gray-900 text-white rounded-full !h-8 !w-8 !aspect-square "
													>
														<Icon icon="hugeicons:image-add-01" className="!h-4 !w-4" />
													</Button>
												</Label>
											</div>
											{previewUrl && (
												<Button
													type="button"
													size={"sm"}
													onClick={handleRemoveImage}
													className=" rounded-3xl !bg-primary/10 !text-primary"
													title="Remove image"
												>
													Remove image
												</Button>
											)}
											<div className="text-center">
												<Input
													id="profilePicture"
													name="profilePicture"
													type="file"
													accept="image/jpeg,image/png,image/gif,image/webp"
													onChange={handleFileChange}
													className="hidden"
													ref={profilePicInputRef}
												/>
											</div>
										</div>
										<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
											<div className="space-y-2">
												<Label htmlFor="fullname" className="text-sm font-medium text-gray-700">
													Full Name *
												</Label>
												<Input
													id="fullname"
													value={formData.fullname || ""}
													onChange={(e) => handleInputChange("fullname", e.target.value)}
													placeholder="Enter full name"
													className="h-12 rounded-2xl"
													required
												/>
												{!formData.fullname && (
													<p className="text-red-400 text-xs">Employee full name is required</p>
												)}
											</div>
											<div className="space-y-2">
												<Label htmlFor="email" className="text-sm font-medium text-gray-700">
													Email *
												</Label>
												<Input
													id="email"
													type="email"
													value={formData.email}
													onChange={(e) => handleInputChange("email", e.target.value)}
													placeholder="email@email.com"
													className="h-12 rounded-2xl"
													required
												/>
												{!formData.email && (
													<p className="text-red-400 text-xs">Employee email is required</p>
												)}
											</div>
											<div className="space-y-2">
												<Label
													htmlFor="company_email"
													className="text-sm font-medium text-gray-700"
												>
													Company Email
												</Label>
												<Input
													id="company_email"
													type="email"
													value={formData.company_email || ""}
													onChange={(e) => handleInputChange("company_email", e.target.value)}
													placeholder="email@mycompany.com"
													className="h-12 rounded-2xl"
													required
												/>
											</div>
											<div className="space-y-2">
												<PhoneNumberInput
													label="Phone Number"
													required
													value={formData.phone_number || ""}
													country={phoneInput.country}
													onChange={setPhoneInput}
													setError={setPhoneError}
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700">
													Date of Birth
												</Label>
												<Input
													id="dateOfBirth"
													type="date"
													max={maxDate18 || ""}
													value={formData.date_of_birth}
													onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
													className="h-12 rounded-2xl"
												/>
												{!formData.date_of_birth && (
													<p className="text-red-400 text-xs">Employee date of birth is required</p>
												)}
											</div>
										</div>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
										<div className="space-y-2">
											<Label htmlFor="gender" className="text-sm font-medium text-gray-700">
												Gender
											</Label>
											<Select
												value={formData.gender}
												onValueChange={(value: string) => handleInputChange("gender", value)}
											>
												<SelectTrigger className="h-12 rounded-2xl">
													<SelectValue placeholder="Select Gender" />
												</SelectTrigger>
												<SelectContent>
													{genderOptions.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label htmlFor="nin" className="text-sm font-medium text-gray-700">
												National ID/Passport
											</Label>
											<Input
												id="nin"
												value={formData.nin || ""}
												onChange={(e) => handleInputChange("nin", e.target.value)}
												placeholder="Enter national ID number"
												className="h-12 rounded-2xl"
											/>
											{!formData.nin && (
												<p className="text-red-400 text-xs">National ID / Passport is required</p>
											)}
										</div>
										<div className="space-y-2">
											<Label htmlFor="country" className="text-sm font-medium text-gray-700">
												Nationality
											</Label>
											<CountrySelect
												selectedCountry={selectedCountry}
												onCountryChange={(country) => {
													setSelectedCountry(country);
													if (country) {
														handleInputChange("country", country.name.common);
													}
												}}
											/>
											{!formData.country && (
												<p className="text-red-400 text-xs">Please select a country</p>
											)}
										</div>
										<div className="space-y-2">
											<Label htmlFor="address" className="text-sm font-medium text-gray-700">
												Address
											</Label>
											<Input
												id="address"
												value={formData.address || ""}
												onChange={(e) => handleInputChange("address", e.target.value)}
												placeholder="Enter full address"
												className="h-12 rounded-2xl"
											/>
											{!formData.address && (
												<p className="text-red-400 text-xs">Please set an address</p>
											)}
										</div>

										<div className="space-y-2">
											<Label htmlFor="maritalStatus" className="text-sm font-medium text-gray-700">
												Marital Status
											</Label>
											<Select
												value={formData.marital_status}
												onValueChange={(value: string) =>
													handleInputChange("marital_status", value)
												}
											>
												<SelectTrigger className="h-12 rounded-2xl">
													<SelectValue placeholder="Single" />
												</SelectTrigger>
												<SelectContent>
													{maritalStatusOptions.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										{formData.marital_status === "married" && (
											<>
												<div className="space-y-2">
													<Label
														htmlFor="spouse_name"
														className="text-sm font-medium text-gray-700"
													>
														Spouse Name
													</Label>
													<Input
														id="spouse_name"
														value={spouseFormData.name || ""}
														onChange={(e) =>
															setSpouseFormData((prev) => ({ ...prev, name: e.target.value }))
														}
														placeholder="Enter spouse name"
														className="h-12 rounded-2xl"
													/>
													{!spouseFormData.name && (
														<p className="text-red-400 text-xs">Spouse name is required</p>
													)}
												</div>
												<div className="space-y-2">
													<Label htmlFor="childDob">Spouse's Date Of Birth</Label>
													<Input
														id="spouseDob"
														type="date"
														max={maxDate18 || ""}
														className="rounded-2xl h-12"
														value={spouseFormData.dateOfBirth}
														onChange={(e) =>
															setSpouseFormData((prev) => ({
																...prev,
																dateOfBirth: e.target.value,
															}))
														}
													/>
													{!spouseFormData.dateOfBirth && (
														<p className="text-red-400 text-xs">Spouse date of birth is required</p>
													)}
												</div>
												<div className="space-y-2">
													<PhoneNumberInput
														label="Spouse Phone Number"
														required
														value={spouseFormData.phone_number || ""}
														country={spousePhoneInput.country}
														onChange={setSpousePhoneInput}
														setError={setSpousePhoneError}
													/>
													{/* <PhoneNumberInput
                    label="Phone Number"
                    required
                    value={nextOfKinFormData.phone_number || ""}
                    country={emergencyContactPhoneInput.country}
                    onChange={setEmergencyContactPhoneInput}
                  /> */}
												</div>
											</>
										)}
									</div>
								</div>

								<RadioGroup
									defaultValue={hasChildren ? "Yes" : "No"}
									className="flex items-center justify-start gap-12"
								>
									<div className="flex items-center space-x-2">
										<RadioGroupItem
											value={"Yes"}
											id="has_children"
											onClick={() => setHasChildren(true)}
										/>
										<Label htmlFor="has_children" className="text-lg">
											Has Children
										</Label>
									</div>
									<div className="flex items-center space-x-2">
										<RadioGroupItem
											value={"No"}
											id="has_no_children"
											onClick={() => setHasChildren(false)}
										/>
										<Label htmlFor="has_no_children" className="text-lg">
											No Children
										</Label>
									</div>
								</RadioGroup>

								{/* Children Section */}
								{hasChildren && (
									<div className="space-y-4">
										<div className="flex items-center justify-start gap-8 mb-4">
											<h4 className="text-lg font-medium text-gray-800">Children</h4>
											{hasChildren ? (
												<Button
													type="button"
													onClick={() => setIsChildDialogOpen(true)}
													className="rounded-xl !bg-gray-900 !text-white"
													size="sm"
												>
													<Plus className="w-4 h-4" />
												</Button>
											) : (
												<></>
											)}
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
											{children.map((child, idx) => (
												<div
													key={idx}
													className="flex items-center justify-between p-4 bg-gray-100 rounded-lg"
												>
													<div className="">
														<div className="flex flex-col items-start justify-start gap-2 text-sm">
															<div className="flex items-center justify-start gap-2">
																<span className="font-medium">{child.name}</span>
																<span className="text-gray-600">{child.gender}</span>
															</div>
															<p className="text-gray-600 text-left w-full">
																D.OB - {child.date_of_birth}
															</p>
														</div>
													</div>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="sm">
																<MoreHorizontal className="w-4 h-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem onClick={() => handleEditChild(child)}>
																<Edit className="w-4 h-4 mr-2" />
																Edit
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => handleDeleteChild(String(child.id))}
																className="text-red-600"
															>
																<Trash2 className="w-4 h-4 mr-2" />
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Emergency Contact Section */}
								<div className="space-y-4">
									<div className="flex items-center justify-start gap-8">
										<h4 className="text-lg font-medium text-gray-800">
											Emergency Contact(s) / Next of kin
										</h4>
										<Button
											type="button"
											onClick={() => setIsNextOfKinDialogOpen(true)}
											className="rounded-xl !bg-gray-900 !text-white"
											size="sm"
										>
											<Plus className="w-4 h-4" />
										</Button>
									</div>

									<div className="space-y-3">
										{nextOfKins.map((nok) => (
											<div key={nok.id} className="p-4 bg-gray-50 rounded-lg">
												<div className="flex items-start justify-between">
													<div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 text-sm">
														<div>
															<span className="text-gray-600 block">Name</span>
															<span className="font-medium">{nok.name}</span>
														</div>
														<div>
															<span className="text-gray-600 block">Relationship</span>
															<span className="font-medium">{nok.relationship}</span>
														</div>
														<div>
															<span className="text-gray-600 block">Phone Number</span>
															<span className="font-medium">{nok.phone_number}</span>
														</div>
														<div>
															<span className="text-gray-600 block">Address</span>
															<span className="font-medium">{nok.address}</span>
														</div>
													</div>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="sm">
																<MoreHorizontal className="w-4 h-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem onClick={() => handleEditNextOfKin(nok)}>
																<Edit className="w-4 h-4 mr-2" />
																Edit
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => handleDeleteNextOfKin(nok.id)}
																className="text-red-600"
															>
																<Trash2 className="w-4 h-4 mr-2" />
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
										))}
									</div>
								</div>

								{/* Education Section */}
								<div className="space-y-4">
									<div className="flex items-center justify-start gap-8">
										<h4 className="text-lg font-medium text-gray-800">
											Education Background / Training
										</h4>
										<Button
											type="button"
											onClick={() => setIsEducationDialogOpen(true)}
											className="rounded-xl !bg-gray-900 !text-white"
											size="sm"
										>
											<Plus className="w-4 h-4" />
										</Button>
									</div>

									<div className="space-y-3">
										{educations.map((edu) => (
											<div key={edu.id} className="p-4 bg-gray-50 rounded-lg">
												<div className="flex items-start justify-between">
													<div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 text-sm">
														<div>
															<span className="text-gray-600 block">Qualification</span>

															<span className="font-medium">{edu.name}</span>
														</div>
														<div>
															<span className="text-gray-600 block">Institute</span>
															<span className="font-medium">{edu.institution}</span>
														</div>
														<div>
															<span className="text-gray-600 block">Year</span>
															<span className="font-medium">{edu.year}</span>
														</div>
														<div>
															<span className="text-gray-600 block">Award</span>
															<span className="font-medium">
																{qualifications.find((qual) => qual.id === edu.qualification_id)
																	?.name || ""}
															</span>
														</div>
													</div>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="sm">
																<MoreHorizontal className="w-4 h-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem onClick={() => handleEditEducation(edu)}>
																<Edit className="w-4 h-4 mr-2" />
																Edit
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => handleDeleteEducation(edu.id)}
																className="text-red-600"
															>
																<Trash2 className="w-4 h-4 mr-2" />
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				);
			case 2:
				return (
					<div className="space-y-8">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">Department *</Label>
								<Input
									value={
										selectedJobPositon?.department_details?.name ||
										thisEmployee?.department.name ||
										""
									}
									disabled
									className="h-12 rounded-2xl"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="position" className="text-sm font-medium text-gray-700">
									Position *
								</Label>
								<JobPositionSearchableSelect
									defaultLabel={
										selectedJobPositon ? selectedJobPositon.name : thisEmployee?.position.name
									}
									setPositions={setPositions}
									value={[formData.position.toString() || ""]}
									onValueChange={(values) => {
										if (values.length > 0) {
											handleInputChange("position", Number(values[0]));
										}
									}}
								/>
								{!formData.position && (
									<p className="text-red-400 text-xs">Job position is required</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="workType" className="text-sm font-medium text-gray-700">
									Work Type
								</Label>
								<div className="flex gap-2">
									<Select
										value={formData.work_type > 0 ? formData.work_type.toString() : ""}
										onValueChange={(value: string) =>
											handleInputChange("work_type", Number.parseInt(value))
										}
									>
										<SelectTrigger className="h-12 rounded-2xl">
											<SelectValue placeholder="Select work type" />
										</SelectTrigger>
										<SelectContent>
											{workTypes.length > 0 ? (
												workTypes.map((workType) => (
													<SelectItem key={workType.id} value={workType.id.toString()}>
														{workType.name}
													</SelectItem>
												))
											) : (
												<div className="px-2 py-1.5 text-sm text-gray-500">
													No work types available
												</div>
											)}
										</SelectContent>
									</Select>
									<Button
										type="button"
										onClick={() => setIsWorkTypeModalOpen(true)}
										variant="outline"
										size="icon"
										className="shrink-0 h-12 w-12 rounded-2xl"
										title="Add new work type"
									>
										<Plus className="w-4 h-4" />
									</Button>
								</div>
								{!formData.work_type && (
									<p className="text-red-400 text-xs">Work type is required</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="employeeType" className="text-sm font-medium text-gray-700">
									Employee Type Name
								</Label>
								<div className="flex gap-2">
									<Select
										value={formData.employee_type > 0 ? formData.employee_type.toString() : ""}
										onValueChange={(value) =>
											handleInputChange("employee_type", Number.parseInt(value))
										}
									>
										<SelectTrigger className="h-12 rounded-2xl">
											<SelectValue placeholder="Select employee type name" />
										</SelectTrigger>
										<SelectContent>
											{employeeTypes.length > 0 ? (
												employeeTypes.map((employeeType) => (
													<SelectItem key={employeeType.id} value={employeeType.id.toString()}>
														{employeeType.name}
													</SelectItem>
												))
											) : (
												<div className="px-2 py-1.5 text-sm text-gray-500">
													No employee type names available
												</div>
											)}
										</SelectContent>
									</Select>
									<Button
										type="button"
										onClick={() => setIsEmployeeTypeModalOpen(true)}
										variant="outline"
										size="icon"
										className="shrink-0 h-12 w-12 rounded-2xl"
										title="Add new employee type"
									>
										<Plus className="w-4 h-4" />
									</Button>
								</div>
								{!formData.employee_type && (
									<p className="text-red-400 text-xs">Employee type is required</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="dateOfJoining" className="text-sm font-medium text-gray-700">
									Date of Joining *
								</Label>
								<Input
									id="dateOfJoining"
									type="date"
									max={maxDateToDay}
									value={formData.date_of_joining || ""}
									onChange={(e) => handleInputChange("date_of_joining", e.target.value)}
									className="h-12 rounded-2xl"
									required
								/>
							</div>

							{/* <div className="space-y-2">
                <Label htmlFor="qualifications" className="text-sm font-medium text-gray-700">
                  Qualifications
                </Label>
                <Input
                  id="qualifications"
                  value={formData.qualifications}
                  onChange={(e) => handleInputChange("qualifications", e.target.value)}
                  placeholder="Enter qualifications"
                  className="h-12 rounded-2xl"
                />
              </div> */}

							<div className="space-y-2">
								<Label htmlFor="skills" className="text-sm font-medium text-gray-700">
									Skills
								</Label>
								<Input
									id="skills"
									value={formData.skills || ""}
									onChange={(e) => handleInputChange("skills", e.target.value)}
									placeholder="Enter skills"
									className="h-12 rounded-2xl"
								/>
							</div>
						</div>

						{/* Employee Branches */}
						<div className="space-y-4">
							<MultiSelectBranches
								className="!rounded-2xl !h-12"
								branches={branches}
								selectedBranches={formData.selected_branches}
								onSelectionChange={(selectedIds) =>
									handleInputChange("selected_branches", selectedIds)
								}
								loading={branchesLoading}
								error={branchesError}
								placeholder="Select branches for this employee"
								label="Employee Branches"
							/>
						</div>

						<div className="space-y-2">
							<Label className="text-sm font-medium text-black-700">Payroll Branch</Label>
							<Input
								value={thisEmployee?.payroll_branch?.branch_name || ""}
								disabled
								className="h-12 rounded-2xl text-gray-900 disabled:text-gray-900 disabled:opacity-100"
							/>
						</div>

						{/* Work Experience Section */}
						<div className="space-y-4">
							<div className="flex items-center justify-start gap-8">
								<h4 className="text-lg font-medium text-gray-800">Work Experience</h4>
								<Button
									type="button"
									onClick={() => setIsWorkExperienceDialogOpen(true)}
									className="rounded-xl !bg-gray-900 !text-white"
									size="sm"
								>
									<Plus className="w-4 h-4" />
								</Button>
							</div>

							<div className="space-y-3">
								{workExperiences.map((exp) => (
									<div key={exp.id} className="p-4 bg-gray-50 rounded-lg">
										<div className="flex items-start justify-between">
											<div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 text-sm">
												<div>
													<span className="text-gray-600 block">Company</span>
													<span className="font-medium">{exp.company}</span>
												</div>
												<div>
													<span className="text-gray-600 block">Position</span>
													<span className="font-medium">{exp.position}</span>
												</div>
												<div>
													<span className="text-gray-600 block">Duration</span>
													<span className="font-medium">{exp.duration}</span>
												</div>
												<div>
													<span className="text-gray-600 block">Reason of leave</span>
													<span className="font-medium">{exp.reason_of_leave}</span>
												</div>
											</div>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="sm">
														<MoreHorizontal className="w-4 h-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={() => handleEditWorkExperience(exp)}>
														<Edit className="w-4 h-4 mr-2" />
														Edit
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => handleDeleteWorkExperience(exp.id)}
														className="text-red-600"
													>
														<Trash2 className="w-4 h-4 mr-2" />
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				);
			case 3:
				return (
					<div className="space-y-8">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
							<div className="space-y-2">
								<Label htmlFor="bank" className="text-sm font-medium text-gray-700">
									Bank
								</Label>
								<BankTypeSearchableSelect
									defaultLabel={
										thisEmployee?.bank_accounts.length
											? thisEmployee.bank_accounts[0].bank.bank_fullname
											: ""
									}
									setAccounts={setInstitutionBanks}
									value={[
										bankAccountFormData.bank_id
											? bankAccountFormData.bank_id
											: thisEmployee?.bank_accounts.length
												? thisEmployee.bank_accounts[0].bank.id
												: 0,
									]}
									onValueChange={(values) => {
										// console.log("Selected bank accounts : ", values);
										setBankAccountFormData((prev) => ({
											...prev,
											bank_id: values.length ? Number(values[0]) : 0,
										}));
									}}
								/>
								{/* {!thisEmployee?.bank_accounts.length && !bankAccountFormData.bank_id && (
                  <p className="text-red-400 text-xs">Please select a bank</p>
                )} */}
							</div>
							<div className="space-y-2">
								<Label htmlFor="bankAccountName" className="text-sm font-medium text-gray-700">
									Bank Account Name
								</Label>
								<Input
									id="bankAccountName"
									value={bankAccountFormData.account_name || ""}
									onChange={(e) =>
										setBankAccountFormData((prev) => ({ ...prev, account_name: e.target.value }))
									}
									placeholder="Enter bank account name"
									className="h-12 rounded-2xl"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="bankAccountNumber" className="text-sm font-medium text-gray-700">
									Bank Account Number
								</Label>
								<Input
									id="bankAccountNumber"
									value={bankAccountFormData.account_number || ""}
									onChange={(e) =>
										setBankAccountFormData((prev) => ({ ...prev, account_number: e.target.value }))
									}
									placeholder="Enter bank account number"
									className="h-12 rounded-2xl"
								/>
								{/* {!bankAccountFormData.account_number && (
                  <p className="text-red-400 text-xs">A bank account number is required</p>
                )} */}
							</div>
							<div className="space-y-2">
								<Label htmlFor="nssf_no" className="text-sm font-medium text-gray-700">
									National Social Security Fund
								</Label>
								<Input
									id="nssf_no"
									value={formData.nssf_no || ""}
									onChange={(e) => handleInputChange("nssf_no", e.target.value)}
									placeholder="Enter NSSF"
									className="h-12 rounded-2xl"
								/>
								{!formData.nssf_no && (
									<p className="text-red-400 text-xs">
										A National Social Security Fund number is required
									</p>
								)}
								{formData.nssf_no?.length >= 13 && (
									<p className="text-red-400 text-xs">
										National Social Security Fund number can not exceed 12 characters
									</p>
								)}
							</div>
							<div className="space-y-2">
								<Label htmlFor="tin" className="text-sm font-medium text-gray-700">
									Tax Identification Number (TIN)
								</Label>
								<Input
									id="tin"
									value={formData.tin || ""}
									onChange={(e) => handleInputChange("tin", e.target.value)}
									placeholder="Enter TIN"
									className="h-12 rounded-2xl"
									max={12}
								/>
								{!formData.tin && (
									<p className="text-red-400 text-xs">
										A Tax Identification Number number is required
									</p>
								)}
								{formData.tin?.length > 12 && (
									<p className="text-red-400 text-xs">
										Tax Identification Number number cannot exceed 12 characters
									</p>
								)}
							</div>
							<div className="space-y-2">
								<Label htmlFor="tin" className="text-sm font-medium text-gray-700">
									Salary ({formatCurrency(selectedJobPositon?.salary_min || "0")} -{" "}
									{formatCurrency(selectedJobPositon?.salary_max || "0")})
								</Label>
								<FormattedNumberInput
									id="salary"
									value={formData.salary}
									onValueChange={(val) => handleInputChange("salary", val)}
									placeholder="Salary"
									className="h-12 rounded-2xl"
								/>
								{!formData.salary && (
									<p className="text-red-400 text-xs">Employee Salary is required</p>
								)}
							</div>
						</div>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen bg-white p-4 rounded-xl">
			<div className="xl:max-w-[90svw]">
				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEES}>
					{/* Header */}
					<div className="mb-4 flex flex-col gap-12">
						<div className="flex items-center space-x-4">
							<Link href="/employees/employee-list">
								<Button variant="outline" size="sm" className="p-2 !aspect-square !rounded-full">
									<ArrowLeft className="w-4 h-4" />
								</Button>
							</Link>
							<div>
								<h1 className="text-xl md:text-2xl font-semibold text-gray-900">Update Employee</h1>
							</div>
						</div>

						{/* Steps Component */}
						<Steps
							steps={steps}
							currentStep={currentStep}
							completedSteps={completedSteps}
							setCurrentStep={setCurrentStep}
							className="!w-full"
						/>
					</div>

					<Card className="shadow-none border-none bg-transparent">
						<CardContent className="p-2 ">
							{submitError && (
								<div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
									{submitError}
								</div>
							)}
							{phoneError && (
								<div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
									{phoneError}
								</div>
							)}

							<form onSubmit={handleFormSubmit} className="space-y-8">
								{renderStep()}

								{/* Navigation Buttons */}
								<div className="flex justify-between pt-8">
									{/* <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearLocalEmployeeCreateForm}
                      disabled={isSubmitting}
                    >
                      Clear Form
                    </Button>
                  </div> */}

									<div
										className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-8`}
									>
										{/* {currentStep > 1 && (
                      <Button
                        type="button"
                        onClick={prevStep}
                        variant="outline"
                        disabled={isSubmitting}
                        className="w-full md:w-56 lg:!w-72 rounded-full !h-12"
                      >
                        Previous
                      </Button>
                    )} */}
										{currentStep < steps.length ? (
											<>
												<Button
													type="button"
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														nextStep();
													}}
													className="w-full md:w-56 lg:!w-72 rounded-full !h-12"
													disabled={!isCurrentStepValid() || isValidating}
												>
													{isValidating ? (
														<>
															<Loader2 className="mr-2 h-4 w-4 animate-spin" />
															Validating...
														</>
													) : (
														"Next"
													)}
												</Button>
											</>
										) : (
											<Button
												type="submit"
												className=" text-white w-full md:w-56 lg:!w-72 rounded-full !h-12"
												disabled={isSubmitting || !isCurrentStepValid()}
											>
												{isSubmitting ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Creating Employee...
													</>
												) : (
													"Submit"
												)}
											</Button>
										)}
									</div>
								</div>
							</form>
						</CardContent>
					</Card>

					{/* Dialogs */}
					{/* Child Dialog */}
					<Dialog
						open={isChildDialogOpen}
						onOpenChange={(open) => {
							if (!open) {
								setIsChildDialogOpen(false);
								setEditingChild(null);
								setChildFormData({ name: "", gender: "" as IGender, date_of_birth: "" });
							} else {
								setIsChildDialogOpen(open);
							}
						}}
					>
						<DialogContent className="sm:max-w-[425px]">
							<DialogHeader>
								<DialogTitle>{editingChild ? "Edit Child" : "Add Child"}</DialogTitle>
								<DialogDescription>
									{editingChild
										? "Update child information"
										: "Add a new child to the employee record"}
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="childName">Child's Name</Label>
									<Input
										id="childName"
										value={childFormData.name || ""}
										onChange={(e) =>
											setChildFormData((prev) => ({ ...prev, name: e.target.value }))
										}
										placeholder="Child's Name"
										className="rounded-2xl h-12"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="childGender">Child's Gender</Label>
									<Select
										value={childFormData.gender}
										onValueChange={(value: IGender) =>
											setChildFormData((prev) => ({ ...prev, gender: value }))
										}
									>
										<SelectTrigger className="rounded-2xl h-12">
											<SelectValue placeholder="Select Gender" />
										</SelectTrigger>
										<SelectContent>
											{genderOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="childDob">Child's Date Of Birth</Label>
									<Input
										id="childDob"
										type="date"
										max={maxDateToDay}
										className="rounded-2xl h-12"
										value={childFormData.date_of_birth || ""}
										onChange={(e) =>
											setChildFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))
										}
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="button"
									onClick={handleAddChild}
									className=" text-white w-full rounded-full"
									disabled={
										!childFormData.name || !childFormData.gender || !childFormData.date_of_birth
									}
								>
									{editingChild ? "Update Child" : "Add Child"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Next of Kin Dialog */}
					<Dialog
						open={isNextOfKinDialogOpen}
						onOpenChange={(open) => {
							if (!open) {
								setIsNextOfKinDialogOpen(false);
								setEditingNextOfKin(null);
								setNextOfKinFormData({
									name: "",
									relationship: "",
									phone_number: "",
									address: "",
								});
							} else {
								setIsNextOfKinDialogOpen(open);
							}
						}}
					>
						<DialogContent className="sm:max-w-[500px]">
							<DialogHeader>
								<DialogTitle>
									{editingNextOfKin ? "Edit Emergency Contact" : "Add Emergency Contact"}
								</DialogTitle>
								<DialogDescription>
									{editingNextOfKin
										? "Update emergency contact information"
										: "Add a new emergency contact"}
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="nokName">Contact Name</Label>
									<Input
										id="nokName"
										value={nextOfKinFormData.name || ""}
										onChange={(e) =>
											setNextOfKinFormData((prev) => ({ ...prev, name: e.target.value }))
										}
										placeholder="Full name"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="nokRelationship">Relationship</Label>
									<Select
										value={nextOfKinFormData.relationship}
										onValueChange={(value) =>
											setNextOfKinFormData((prev) => ({ ...prev, relationship: value }))
										}
									>
										<SelectTrigger className="rounded-2xl h-12">
											<SelectValue placeholder="Select Relationship" />
										</SelectTrigger>
										<SelectContent>
											{relationshipOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<PhoneNumberInput
										label="Phone Number"
										required
										value={nextOfKinFormData.phone_number || ""}
										country={emergencyContactPhoneInput.country}
										onChange={setEmergencyContactPhoneInput}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="nokAddress">Address</Label>
									<Input
										id="nokAddress"
										value={nextOfKinFormData.address || ""}
										onChange={(e) =>
											setNextOfKinFormData((prev) => ({ ...prev, address: e.target.value }))
										}
										placeholder="Search Location"
										className="rounded-2xl h-12"
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="button"
									onClick={handleAddNextOfKin}
									className=" text-white w-full rounded-full"
									disabled={!nextOfKinFormData.name || !nextOfKinFormData.relationship}
								>
									{editingNextOfKin ? "Update Contact" : "Add emergency contact"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Education Dialog */}
					<Dialog
						open={isEducationDialogOpen}
						onOpenChange={(open) => {
							if (!open) {
								setIsEducationDialogOpen(false);
								setEditingEducation(null);
								setEducationFormData({ qualification_id: 0, institution: "", year: "", name: "" });
							} else {
								setIsEducationDialogOpen(open);
							}
						}}
					>
						<DialogContent className="sm:max-w-[500px]">
							<DialogHeader>
								<DialogTitle>
									{editingEducation ? "Edit Education" : "Add Education Background"}
								</DialogTitle>
								<DialogDescription>
									{editingEducation
										? "Update education information"
										: "Add education or training record"}
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="eduQualification">Qualification</Label>
									<Input
										id="eduQualification"
										value={educationFormData.name}
										onChange={(e) =>
											setEducationFormData((prev) => ({ ...prev, name: e.target.value }))
										}
										placeholder="Qualification"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="eduInstitute">Institute</Label>
									<Input
										id="eduInstitute"
										value={educationFormData.institution || ""}
										onChange={(e) =>
											setEducationFormData((prev) => ({ ...prev, institution: e.target.value }))
										}
										placeholder="Institute Name"
										className="rounded-2xl h-12"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="eduYear">Year</Label>
									<Input
										id="eduYear"
										value={educationFormData.year || ""}
										onChange={(e) =>
											setEducationFormData((prev) => ({ ...prev, year: e.target.value }))
										}
										placeholder="eg., 2001"
										className="rounded-2xl h-12"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="eduAward">Award</Label>
									<Select
										value={educationFormData.qualification_id.toString()}
										onValueChange={(value: string) =>
											setEducationFormData((prev) => ({ ...prev, qualification_id: Number(value) }))
										}
									>
										<SelectTrigger className="h-12 rounded-2xl">
											<SelectValue placeholder="Select Gender" />
										</SelectTrigger>
										<SelectContent>
											{qualifications.map((qual: IQualificationAward, idx) => (
												<SelectItem key={idx} value={qual.id.toString()}>
													{qual.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="button"
									onClick={handleAddEducation}
									className=" text-white rounded-full w-full"
									disabled={
										!educationFormData.qualification_id ||
										!educationFormData.name ||
										!educationFormData.institution ||
										!educationFormData.year
									}
								>
									{editingEducation ? "Update Education" : "Add Education Background"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Work Experience Dialog */}
					<Dialog
						open={isWorkExperienceDialogOpen}
						onOpenChange={(open) => {
							if (!open) {
								setIsWorkExperienceDialogOpen(false);
								setEditingWorkExperience(null);
								setWorkExperienceFormData({
									company: "",
									position: "",
									duration: "",
									reason_of_leave: "",
								});
							} else {
								setIsWorkExperienceDialogOpen(open);
							}
						}}
					>
						<DialogContent className="sm:max-w-[500px]">
							<DialogHeader>
								<DialogTitle>
									{editingWorkExperience ? "Edit Work Experience" : "Add Work Experience"}
								</DialogTitle>
								<DialogDescription>
									{editingWorkExperience
										? "Update work experience information"
										: "Add previous work experience"}
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="expCompany">Company</Label>
									<Input
										id="expCompany"
										value={workExperienceFormData.company || ""}
										onChange={(e) =>
											setWorkExperienceFormData((prev) => ({ ...prev, company: e.target.value }))
										}
										placeholder="Company name"
										className="rounded-2xl h-12"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="expPosition">Position</Label>
									<Input
										id="expPosition"
										value={workExperienceFormData.position || ""}
										onChange={(e) =>
											setWorkExperienceFormData((prev) => ({ ...prev, position: e.target.value }))
										}
										placeholder="Your position at that company"
										className="rounded-2xl h-12"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="expDuration">Duration</Label>
									<Input
										id="expDuration"
										value={workExperienceFormData.duration || ""}
										onChange={(e) =>
											setWorkExperienceFormData((prev) => ({ ...prev, duration: e.target.value }))
										}
										placeholder="eg., 5 Years"
										className="rounded-2xl h-12"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="expReason">Reason of leave</Label>
									<Input
										id="expReason"
										value={workExperienceFormData.reason_of_leave || ""}
										onChange={(e) =>
											setWorkExperienceFormData((prev) => ({
												...prev,
												reason_of_leave: e.target.value,
											}))
										}
										placeholder="Reason of leaving"
										className="rounded-2xl h-12"
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="button"
									onClick={handleAddWorkExperience}
									className=" text-white rounded-full w-full"
									disabled={!workExperienceFormData.company || !workExperienceFormData.position}
								>
									{editingWorkExperience ? "Update Experience" : "Add work experience"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Work Type Modal */}
					<WorkTypeModal
						isOpen={isWorkTypeModalOpen}
						onClose={() => setIsWorkTypeModalOpen(false)}
						editingType={null}
						onSaveSuccess={handleAddWorkType}
						isSubmitting={isSubmitting}
					/>

					{/* Employee Type Modal */}
					<Dialog
						open={isEmployeeTypeModalOpen}
						onOpenChange={(open) => {
							if (!open) {
								setIsEmployeeTypeModalOpen(false);
								setEmployeeTypeFormData((prev) => ({
									...prev,
									name: "",
									description: "",
									code: "",
								}));
							} else {
								setIsEmployeeTypeModalOpen(open);
							}
						}}
					>
						<DialogContent className="sm:max-w-[425px]">
							<DialogHeader>
								<DialogTitle>Add New Employee Type Name</DialogTitle>
								<DialogDescription>
									Create a new employee type name to add to your institution.
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="employeeTypeName">Name *</Label>
									<Input
										id="employeeTypeName"
										value={employeeTypeFormData.name || ""}
										onChange={(e) =>
											setEmployeeTypeFormData((prev) => ({ ...prev, name: e.target.value }))
										}
										placeholder="Enter employee type name"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="employeeTypeDescription">Description</Label>
									<Textarea
										id="employeeTypeDescription"
										value={employeeTypeFormData.description}
										onChange={(e) =>
											setEmployeeTypeFormData((prev) => ({
												...prev,
												description: e.target.value,
											}))
										}
										className="resize-none rounded-2xl"
										placeholder="Enter employee type description (optional)"
										rows={3}
									/>
								</div>
							</div>
							<DialogFooter>
								{/* <Button
                  type="button"
                  variant="outline"
                  onClick={() => {

                  }}
                  disabled={isAddingEmployeeType}
                >
                  Cancel
                </Button> */}
								<Button
									type="button"
									onClick={handleAddEmployeeType}
									disabled={isAddingEmployeeType || !employeeTypeFormData.name.trim()}
									className=" text-white w-full rounded-full"
								>
									{isAddingEmployeeType ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Adding...
										</>
									) : (
										"Add Employee Type"
									)}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</ProtectedComponent>
			</div>
		</div>
	);
}
