"use client";

import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { showErrorToast } from "@/lib/utils";
import { ISignature } from "@/types/documents.types";

interface SignaturePadProps {
	onSave?: (data: string) => Promise<void>;
	onOpenChange: (open: boolean) => void;
	isOpen: boolean;
	width?: number;
	height?: number;
	signatureData?: ISignature | null;
	mode: "view" | "edit" | "create";
}

export default function SignaturePad({
	onSave,
	onOpenChange,
	isOpen,
	width,
	height,
	signatureData,
	mode,
}: SignaturePadProps) {
	const sigCanvas = useRef<SignatureCanvas>(null);
	const [penColor, setPenColor] = useState("black");
	const colors = [
		"black",
		// "green", "red"
	];
	const [canvasReady, setCanvasReady] = useState(false);

	const clearSignature = () => {
		sigCanvas.current?.clear();
	};

	const handleCanvasRef = (canvas: SignatureCanvas | null) => {
		sigCanvas.current = canvas;
		if (mode === "view") {
			sigCanvas.current?.off();
		}
		if (canvas) {
			setCanvasReady(true);
		} else {
			setCanvasReady(false);
		}
	};

	useEffect(() => {
		if (!canvasReady || !signatureData?.signature) return;
		const parsedData = JSON.parse(signatureData?.signature);
		sigCanvas.current?.fromData(parsedData);
	}, [signatureData?.signature, canvasReady]);

	//Clear canvas when opening for new signature
	useEffect(() => {
		if (isOpen && canvasReady && !signatureData?.signature) {
			sigCanvas.current?.clear();
		}
	}, [isOpen, canvasReady, signatureData?.signature]);

	const saveSignature = () => {
		if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
			const signatureData = sigCanvas.current.toData();
			onSave?.(JSON.stringify(signatureData))
				.then(() => {
					clearSignature();
					onOpenChange(false);
				})
				.catch((error) => {
					showErrorToast({ error, defaultMessage: "Failed to save signature" });
				});
		}
	};

	//Reset canvasReady when dialog closes
	useEffect(() => {
		if (!isOpen) {
			setCanvasReady(false);
		}
	}, [isOpen]);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
				<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
					<DialogTitle className="text-2xl font-bold text-gray-900 capitalize">
						{mode + " Signature"}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-6 py-6">
					{mode !== "view" && (
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
					)}

					<div
						className="border border-gray-200 rounded-xl overflow-hidden"
						aria-disabled
						onMouseDown={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
					>
						<SignatureCanvas
							penColor={penColor}
							canvasProps={{
								className: "signature-render",
								width: width || 620,
								height: height || 200,
							}}
							ref={handleCanvasRef}
							minWidth={0.5}
							maxWidth={2.5}
							velocityFilterWeight={0.7}
						/>
					</div>
				</div>
				{mode !== "view" && (
					<DialogFooter className="flex gap-3">
						<Button variant="outline" onClick={clearSignature} className="rounded-full flex-1">
							Clear
						</Button>
						<Button onClick={saveSignature} className="rounded-full bg-primary flex-1">
							Save
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
