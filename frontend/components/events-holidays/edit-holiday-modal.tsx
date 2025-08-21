"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { IPublicHoliday } from "@/types/types.utils"

interface EditHolidayModalProps {
  isOpen: boolean
  holiday: IPublicHoliday | null
  onClose: () => void
  onSave: (holidayId: number, updatedData: Partial<IPublicHoliday>) => Promise<void>
}

export const EditHolidayModal: React.FC<EditHolidayModalProps> = ({
  isOpen,
  holiday,
  onClose,
  onSave
}) => {
  const [editFormData, setEditFormData] = useState({
    title: "",
    date: ""
  })

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Update form data when holiday changes
  useEffect(() => {
    if (holiday) {
      setEditFormData({
        title: holiday.title,
        date: holiday.date
      })
      setError(null) // Clear any previous errors
      setSuccess(false) // Clear any previous success
    }
  }, [holiday])

  const handleFormChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSave = async () => {
    if (!holiday) return

    // Basic validation
    if (!editFormData.title.trim()) {
      setError("Title is required")
      return
    }

    if (!editFormData.date) {
      setError("Date is required")
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(false)
    
    try {
      await onSave(holiday.id, editFormData)
      setSuccess(true)
      // Close modal after a brief success message
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error("Error saving holiday:", error)
      setError("Failed to save holiday. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !holiday) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Edit Public Holiday</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={editFormData.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Holiday title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={editFormData.date}
                onChange={(e) => handleFormChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm mt-2">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-500 text-sm mt-2">
                Holiday saved successfully!
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-primary text-white disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
