import React, { Fragment } from "react";
import { Check } from "lucide-react";

export interface StepItem {
	id: number;
	title: string;
	description?: string;
}

interface StepsProps {
	steps: StepItem[];
	currentStep: number;
	className?: string;
	setCurrentStep: (stepId: number) => void;
	completedSteps: number[];
}

export const Steps: React.FC<StepsProps> = ({
	steps,
	currentStep,
	className = "",
	completedSteps,
	setCurrentStep,
}) => {
	return (
		<div className={`w-full ${className}`}>
			{/* Mobile view - Simple progress bar */}
			<div className="block md:hidden mb-6">
				<div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
					<span>
						Step {currentStep} of {steps.length}
					</span>
					<span>{Math.round((currentStep / steps.length) * 100)}%</span>
				</div>
				<div className="w-full bg-gray-200 rounded-full h-2">
					<div
						className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
						style={{ width: `${(currentStep / steps.length) * 100}%` }}
					/>
				</div>
				<div className="mt-2">
					<h3 className="font-medium text-foreground">{steps[currentStep - 1]?.title}</h3>
					<p className="text-sm text-muted-foreground">{steps[currentStep - 1]?.description}</p>
				</div>
			</div>

			{/* Desktop view - Horizontal step indicator */}
			<div className="hidden md:flex items-center justify-between mb-8">
				{steps.map((step, index) => (
					<Fragment key={index}>
						<div className="flex items-center">
							<div className="flex items-center">
								<div
									className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 cursor-pointer
                  ${
										completedSteps.find((c_step) => c_step === step.id) || currentStep === step.id
											? "bg-primary/10 border-primary text-primary"
											: "bg-background border-muted-foreground/30 text-muted-foreground"
									}
                `}
									onClick={() => {
										if (
											completedSteps.find((c_step) => c_step === step.id || c_step === step.id - 1)
										) {
											setCurrentStep(step.id);
										}
									}}
								>
									{completedSteps.find((c_step) => c_step === step.id) ? (
										<Check className="w-4 h-4" />
									) : (
										<span className="text-sm font-medium">{step.id}</span>
									)}
								</div>
								<div className="ml-3">
									<h3
										className={`
                    text-sm font-medium transition-colors duration-200
                    ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}
                  `}
									>
										{step.title}
									</h3>
									{step.description && (
										<p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
									)}
								</div>
							</div>
						</div>
						{/* Connector line */}
						{index < steps.length - 1 && (
							<div
								className={`
                  flex-1 h-0.5 mx-4 transition-colors duration-200
                  ${currentStep > step.id ? "bg-primary" : "bg-muted-foreground/20"}
                `}
							/>
						)}
					</Fragment>
				))}
			</div>
		</div>
	);
};
