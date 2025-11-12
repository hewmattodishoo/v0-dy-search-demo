"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Upload } from "lucide-react"
import { ImageCropper } from "./image-cropper"

interface VisualSearchUploadProps {
  onImageUpload: (base64: string) => void
  className?: string
}

export function VisualSearchUpload({ onImageUpload, className = "" }: VisualSearchUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [originalImage, setOriginalImage] = useState<string | null>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB")
      return
    }

    setIsUploading(true)

    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file)
      setOriginalImage(previewUrl)

      // Show cropper
      setShowCropper(true)
    } catch (error) {
      console.error("Error processing image:", error)
      alert("Error processing image. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleCropComplete = (croppedImageBase64: string) => {
    setShowCropper(false)
    onImageUpload(croppedImageBase64)
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setOriginalImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={className}>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <Button
        variant="ghost"
        onClick={handleButtonClick}
        disabled={isUploading}
        className="h-8 w-8 p-0 hover:bg-gray-100"
        size="sm"
      >
        {isUploading ? <Upload className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 text-gray-400" />}
      </Button>

      {showCropper && originalImage && (
        <ImageCropper
          imageUrl={originalImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          open={showCropper}
        />
      )}
    </div>
  )
}
