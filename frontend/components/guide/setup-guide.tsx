"use client";

import type {SetupGuideProps} from "./types";

import {useState} from "react";
import {ChevronDown, ChevronUp} from "lucide-react";

import {SetupGuideStep} from "./setup-guide-step";
import {useSetupProgress} from "./use-setup-progress";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";

export function SetupGuide({
  InstitutionId,
  collapsible = true,
  showCompleteButton = true,
  maxVisibleSteps = 4,
  className = "",
}: SetupGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const normalizedInstitutionId = InstitutionId ? String(InstitutionId) : undefined;

  const {steps, isLoading, InstitutionSetupComplete, isSetupComplete, markSetupAsComplete} =
    useSetupProgress(normalizedInstitutionId);

  if (InstitutionSetupComplete) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex justify-center items-center">
          <p>Loading setup guide...</p>
        </CardContent>
      </Card>
    );
  }

  // Don't render if no InstitutionId is provided
  if (!normalizedInstitutionId) {
    return null;
  }

  // Determine which steps to display based on expanded state
  const visibleSteps = isExpanded ? steps : steps.slice(0, maxVisibleSteps);

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Organisation Setup Guide</h3>
          {isSetupComplete() && showCompleteButton && (
            <Button onClick={markSetupAsComplete}>Mark Setup as Complete</Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {visibleSteps.map((step, index) => (
            <SetupGuideStep
              key={step.id}
              isActive={step.status === "in-progress"}
              step={step}
              stepNumber={index + 1}
              totalSteps={visibleSteps.length}
            />
          ))}
        </div>

        {steps.length > maxVisibleSteps && collapsible && (
          <Button
            className="mt-4 w-full justify-center"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Show All Steps ({steps.length - maxVisibleSteps} more)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
