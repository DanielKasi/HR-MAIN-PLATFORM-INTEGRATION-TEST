"use client";

import { useState } from "react";
import { CustomField } from "@/types/types.utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Icon } from "@iconify/react";
import { Label } from "@/components/ui/label";

interface CustomFieldProps {
	field: CustomField;
	onEdit: (fieldId: string) => void;
	onDelete: (fieldId: string) => void;
	onValueChange: (fieldId: string, value: any) => void;
}

export function CustomFieldComponent({ field, onEdit, onDelete, onValueChange }: CustomFieldProps) {
	const [showTooltip, setShowTooltip] = useState(false);
	const [ratingValue, setRatingValue] = useState<number>(field.value || 5);

	// const renderField = () => {
	//   switch (field.type) {
	//     case "text":
	//       return (
	//         <Input
	//           type="text"
	//           value={field.value || ""}
	//           onChange={(e) => onValueChange(field.id, e.target.value)}
	//           className="flex-1 rounded-xl"
	//           placeholder={field.name}
	//         />
	//       )
	//     case "rating":
	//       return (
	//         <div className="space-y-2">
	//           <Label className="text-sm font-medium">{field.name}</Label>
	//           <Slider
	//             value={[ratingValue]}
	//             onValueChange={(value) => {
	//               setRatingValue(value[0])
	//               onValueChange(field.id, value[0])
	//             }}
	//             max={10}
	//             min={1}
	//             step={1}
	//             className="w-full"
	//           />
	//           <div className="flex justify-between text-xs text-slate-500">
	//             <span>1</span>
	//             <span>10</span>
	//           </div>
	//         </div>
	//       )
	//     case "multiple_choice":
	//       return (
	//         <Select value={field.value || ""} onValueChange={(value) => onValueChange(field.id, value)}>
	//           <SelectTrigger className="flex-1 rounded-xl">
	//             <SelectValue placeholder={`Select ${field.name}`} />
	//           </SelectTrigger>
	//           <SelectContent>
	//             {field.options && field.options.length > 0 ? (
	//               field.options.map((option) => (
	//                 <SelectItem key={option} value={option}>
	//                   {option}
	//                 </SelectItem>
	//               ))
	//             ) : (
	//               <SelectItem value="no-options" disabled>
	//                 No options available
	//               </SelectItem>
	//             )}
	//           </SelectContent>
	//         </Select>
	//       )
	//     case "yes_no":
	//       return (
	//         <div className="flex items-center space-x-2">
	//           <Switch
	//             checked={field.value || false}
	//             onCheckedChange={(checked) => onValueChange(field.id, checked)}
	//           />
	//           <Label className="text-sm font-medium">{field.name}</Label>
	//         </div>
	//       )
	//     default:
	//       return <Input type="text" placeholder="Unsupported field type" className="flex-1 rounded-xl" disabled />
	//   }
	// }

	return (
		<div className="flex items-center space-x-2 p-2 px-4 bg-gray-200 rounded-2xl w-full">
			<div className="flex-1">
				<div className="space-y-2">
					<div className="flex items-center space-x-2">
						{field.description && (
							<TooltipProvider>
								<Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											className="h-5 w-5 p-0 rounded-full bg-black !aspect-square italic hover:bg-black/90 text-sm text-white hover:text-white"
											onClick={() => setShowTooltip(!showTooltip)}
										>
											i
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										<p>{field.description}</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
						<span className="text-sm font-medium text-gray-700">{field.name}</span>
					</div>
					{/* {renderField()} */}
				</div>
			</div>

			<div className="flex space-x-1">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onEdit(field.id)}
					className="h-8 w-8 p-0 rounded-xl"
				>
					<Icon icon="hugeicons:edit-02" className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onDelete(field.id)}
					className="h-8 w-8 p-0 rounded-xl text-red-500 hover:text-red-700"
				>
					<Icon icon="hugeicons:delete-02" className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
