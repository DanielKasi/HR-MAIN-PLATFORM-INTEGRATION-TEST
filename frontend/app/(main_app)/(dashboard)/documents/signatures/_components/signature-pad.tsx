"use client";

import { useState, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";

interface SignaturePadProps {
	onSave?: (dataUrl: string) => void;
	onOpenChange: (open: boolean) => void;
	isOpen: boolean;
}

export default function SignaturePad({ onSave, isOpen, onOpenChange }: SignaturePadProps) {
	const sigCanvas = useRef<SignatureCanvas | null>(null);
	const [penColor, setPenColor] = useState("black");
	const colors = ["black", "green", "red"];

	const clearSignature = () => {
		sigCanvas.current?.clear();
	};

	const saveSignature = () => {
		if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
			const signatureData = sigCanvas.current.toData();
			onSave?.(JSON.stringify(signatureData));
			onOpenChange(false);
		}
	};

	return (
		<>
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
					<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
						<DialogTitle className="text-2xl font-bold text-gray-900">Create Signature</DialogTitle>
					</DialogHeader>
					<div className="space-y-6 py-6">
						<div className="space-y-3">
							<p className="text-sm text-gray-800">Pen Color:</p>
							<div className="flex gap-3">
								{colors.map((color) => (
									<button
										key={color}
										className="w-6 h-6 rounded-full border-2 cursor-pointer transition-all"
										style={{
											backgroundColor: color,
											borderColor: penColor === color ? color : "gray",
										}}
										onClick={() => setPenColor(color)}
										aria-label={`Select ${color} pen color`}
										type="button"
									/>
								))}
							</div>
						</div>
						<div className="border border-gray-200 rounded-xl overflow-hidden">
							<SignatureCanvas
								penColor={penColor}
								canvasProps={{
									className: "sigCanvas",
									width: 400,
									height: 200,
								}}
								ref={sigCanvas}
								minWidth={0.5}
								maxWidth={2.5}
								velocityFilterWeight={0.7}
							/>
						</div>
					</div>
					<DialogFooter className="flex gap-3">
						<Button variant="outline" onClick={clearSignature} className="rounded-full flex-1">
							Clear
						</Button>
						<Button onClick={saveSignature} className="rounded-full bg-primary flex-1">
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
