"use client";

import * as React from "react";
import { Upload } from "lucide-react";

interface FileUploadAreaProps {
	label: string;
	maxFileSizeMb: number;
	onFileChange: (file: File | null) => void;
	currentFile: File | null;
}

export default function FileUploadArea({
	label,
	maxFileSizeMb,
	onFileChange,
	currentFile,
}: FileUploadAreaProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		if (event.dataTransfer.files && event.dataTransfer.files[0]) {
			onFileChange(event.dataTransfer.files[0]);
		}
	};

	const handleClick = () => {
		inputRef.current?.click();
	};

	return (
		<div>
			<label
				htmlFor={`${label.toLowerCase().replace(/\s/g, "-")}-upload`}
				className="block text-sm font-medium text-gray-800 mb-2"
			>
				{label}
			</label>
			<div
				className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 text-center cursor-pointer hover:border-gray-400 transition-colors duration-200"
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				onClick={handleClick}
			>
				<input
					id={`${label.toLowerCase().replace(/\s/g, "-")}-upload`}
					type="file"
					className="sr-only"
					ref={inputRef}
					onChange={(e) => onFileChange(e.target.files?.[0] || null)}
					accept=".pdf,.doc,.docx"
				/>
				<Upload className="h-10 w-10 text-[#FF4D4D] mb-2" />
				<span className="text-sm font-medium text-[#FF4D4D]">Click to Upload or drag and drop</span>
				<span className="text-xs text-gray-500">(Max. File size: {maxFileSizeMb} MB)</span>
				{currentFile && <p className="text-sm text-gray-700 mt-2">{currentFile.name}</p>}
			</div>
		</div>
	);
}
