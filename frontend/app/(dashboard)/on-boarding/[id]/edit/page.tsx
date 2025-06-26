"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

import { getOnBoardingById, updateOnBoarding } from "@/lib/utils"
import type { IOnBoarding, IOnBoardingFormData } from "@/app/types/types.utils"
import { toast } from "sonner"

const onboardingSchema = z.object({
  remarks: z.string().optional(),
  status: z.enum(["initial", "training", "issued_contract", "declined_offer", "accepted_offer"]),
})

export default function EditOnboardingForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const params = useParams();
  const onboardingId = params.id as unknown as number;
  const [onboarding, setOnboarding] = useState<IOnBoarding | null>(null)

  const router = useRouter()

  const form = useForm<IOnBoardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      remarks: "",
      status: "initial",
    },
  })

  useEffect(() => {
    fetchOnboarding()
  }, [onboardingId])

  const fetchOnboarding = async () => {
    try {
      const data = await getOnBoardingById({ onboardingId })

      if (data) {
        setOnboarding(data)
        // Populate form with existing data
        form.reset({
          remarks: data.remarks || "",
          status: (data.status as any) || "initial",
        })
      } else {
        toast.error("Failed to load onboarding record")
        router.push("/on-boarding")
      }
    } catch (error) {
      toast.error("Failed to load onboarding record")
    }
  }

  const onSubmit = async (data: IOnBoardingFormData) => {
    try {
      setIsSubmitting(true)

      const updateData: Partial<IOnBoardingFormData> = {
        remarks: data.remarks,
        status: data.status as "initial" | "training" | "issued_contract" | "declined_offer" | "accepted_offer",
      }

      const result = await updateOnBoarding({
        onboardingId,
        onboardingData: updateData,
      })

      if (result) {
        toast.success("Onboarding record updated successfully")
        router.push("/on-boarding")
      } else {
        toast.error("Failed to update onboarding record")
      }
    } catch (error) {
      toast.error("Failed to update onboarding record")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!onboarding) {
    return (
      <div className="w-full h-full p-6 text-center">
        <p>Onboarding record not found</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Onboarding</h1>
          <p className="text-muted-foreground">
            Update onboarding details for {onboarding.application_name?.applicant_name || "Unknown Applicant"}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/on-boarding")}>
          Back to Onboarding
        </Button>
      </div>

      {/* Candidate Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Candidate Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Name</Label>
            <p className="text-sm text-muted-foreground">{onboarding.application_name?.applicant_name || "N/A"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <p className="text-sm text-muted-foreground">{onboarding.application_name?.applicant_email || "N/A"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Phone</Label>
            <p className="text-sm text-muted-foreground">{onboarding.application_name?.applicant_phone || "N/A"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Position</Label>
            <p className="text-sm text-muted-foreground">
              {onboarding.application_name?.job_position_advert_job_details?.name || "N/A"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={"training"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="issued_contract">Issued Contract</SelectItem>
                          <SelectItem value="declined_offer">Declined Offer</SelectItem>
                          <SelectItem value="accepted_offer">Accepted Offer</SelectItem>
                          
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter any remarks..." className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/on-boarding")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Onboarding"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}