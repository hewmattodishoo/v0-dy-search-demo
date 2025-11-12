"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ImageCropperProps {
  imageUrl: string
  onCropComplete: (croppedImageBase64: string) => void
  onCancel: () => void
  open: boolean
}

export function ImageCropper({ imageUrl, onCropComplete, onCancel, open }: ImageCropperProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [cropArea, setCropArea] = useState({ x: 220, y: 100, width: 200, height: 200 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState<string | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Initialize crop area based on container size and image position
  useEffect(() => {
    if (containerRef.current && open) {
      // Create a function to update crop area
      const updateCropArea = () => {
        const container = containerRef.current
        const img = imgRef.current
        if (!container || !img) return

        // Wait for image to be fully loaded
        if (!img.complete) {
          img.onload = updateCropArea
          return
        }

        // Get container dimensions
        const containerWidth = container.offsetWidth
        const containerHeight = container.offsetHeight

        // Set crop area size based on container (smaller for mobile)
        const cropSize = isMobile
          ? Math.min(containerWidth, containerHeight) * 0.5
          : Math.min(containerWidth, containerHeight) * 0.6

        // Center the crop area in the container
        setCropArea({
          x: (containerWidth - cropSize) / 2,
          y: (containerHeight - cropSize) / 2,
          width: cropSize,
          height: cropSize,
        })
      }

      // Run immediately and after a short delay to ensure DOM is ready
      updateCropArea()
      const timeoutId = setTimeout(updateCropArea, 300)

      // Add resize listener
      const handleResize = () => {
        setTimeout(updateCropArea, 100)
      }

      window.addEventListener("resize", handleResize)
      return () => {
        window.removeEventListener("resize", handleResize)
        clearTimeout(timeoutId)
      }
    }
  }, [open, isMobile])

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeDirection(direction)

    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

      setDragStart({
        x: clientX - rect.left,
        y: clientY - rect.top,
      })
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      setIsDragging(true)

      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

        setDragStart({
          x: clientX - rect.left - cropArea.x,
          y: clientY - rect.top - cropArea.y,
        })
      }
    },
    [cropArea],
  )

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

      const currentX = clientX - rect.left
      const currentY = clientY - rect.top

      if (isDragging) {
        const newX = Math.max(0, Math.min(currentX - dragStart.x, rect.width - cropArea.width))
        const newY = Math.max(0, Math.min(currentY - dragStart.y, rect.height - cropArea.height))
        setCropArea((prev) => ({ ...prev, x: newX, y: newY }))
      } else if (isResizing && resizeDirection) {
        let newX = cropArea.x
        let newY = cropArea.y
        let newWidth = cropArea.width
        let newHeight = cropArea.height

        // Handle different resize directions
        if (resizeDirection.includes("n")) {
          const deltaY = currentY - dragStart.y
          newY = Math.max(0, cropArea.y + deltaY)
          newHeight = Math.max(50, cropArea.height - deltaY)
        }

        if (resizeDirection.includes("s")) {
          newHeight = Math.max(50, Math.min(currentY - cropArea.y, rect.height - cropArea.y))
        }

        if (resizeDirection.includes("w")) {
          const deltaX = currentX - dragStart.x
          newX = Math.max(0, cropArea.x + deltaX)
          newWidth = Math.max(50, cropArea.width - deltaX)
        }

        if (resizeDirection.includes("e")) {
          newWidth = Math.max(50, Math.min(currentX - cropArea.x, rect.width - cropArea.x))
        }

        setCropArea({ x: newX, y: newY, width: newWidth, height: newHeight })
        setDragStart({ x: currentX, y: currentY })
      }
    },
    [isDragging, isResizing, resizeDirection, dragStart, cropArea],
  )

  const handleEnd = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeDirection(null)
  }, [])

  const getCroppedImg = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return

    const img = imgRef.current
    const container = containerRef.current
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Get the actual displayed image dimensions
    const imgRect = img.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    // Calculate the scale between displayed image and natural image
    const displayedWidth = imgRect.width
    const displayedHeight = imgRect.height
    const scaleX = img.naturalWidth / displayedWidth
    const scaleY = img.naturalHeight / displayedHeight

    // Calculate the offset of the image within the container
    const imgOffsetX = (container.offsetWidth - displayedWidth) / 2
    const imgOffsetY = (container.offsetHeight - displayedHeight) / 2

    // Adjust crop area relative to the actual image position
    const adjustedCropX = Math.max(0, (cropArea.x - imgOffsetX) * scaleX)
    const adjustedCropY = Math.max(0, (cropArea.y - imgOffsetY) * scaleY)
    const adjustedCropWidth = Math.min(cropArea.width * scaleX, img.naturalWidth - adjustedCropX)
    const adjustedCropHeight = Math.min(cropArea.height * scaleY, img.naturalHeight - adjustedCropY)

    // Set canvas size to crop area
    canvas.width = adjustedCropWidth
    canvas.height = adjustedCropHeight

    // Draw the cropped portion
    ctx.drawImage(
      img,
      adjustedCropX,
      adjustedCropY,
      adjustedCropWidth,
      adjustedCropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    // Get base64 of the cropped image
    const base64Image = canvas.toDataURL("image/jpeg", 0.8).split(",")[1]
    onCropComplete(base64Image) // This will trigger the search
  }, [cropArea, onCropComplete])

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4 p-4">
          <div
            ref={containerRef}
            className="relative flex justify-center items-center bg-black rounded-lg overflow-hidden"
            style={{ height: isMobile ? "300px" : "400px" }}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            onTouchCancel={handleEnd}
          >
            {/* Semi-transparent overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-50 z-10"></div>

            <img
              ref={imgRef}
              src={imageUrl || "/placeholder.svg"}
              alt="Upload to crop"
              className="max-w-full max-h-full object-contain z-0"
              draggable={false}
            />

            {/* Crop area with corner brackets */}
            <div
              className="absolute z-20"
              style={{
                left: cropArea.x,
                top: cropArea.y,
                width: cropArea.width,
                height: cropArea.height,
                cursor: isDragging ? "grabbing" : "grab",
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            >
              {/* Clear the overlay inside crop area */}
              <div className="absolute inset-0 bg-transparent flex items-center justify-center border-0"></div>

              {/* Corner brackets */}
              <div className="absolute -left-1 -top-1 w-8 h-8 border-white border-t-[3px] border-l-[3px]"></div>
              <div className="absolute -right-1 -top-1 w-8 h-8 border-white border-r-[3px] border-t-[3px]"></div>
              <div className="absolute -left-1 -bottom-1 w-8 h-8 border-white border-l-[3px] border-b-[3px]"></div>
              <div className="absolute -right-1 -bottom-1 w-8 h-8 border-white border-r-[3px] border-b-[3px]"></div>

              {/* Resize handles - larger for mobile */}
              <div
                className="absolute -top-3 -left-3 w-6 h-6 cursor-nw-resize z-30"
                onMouseDown={(e) => handleResizeStart(e, "nw")}
                onTouchStart={(e) => handleResizeStart(e, "nw")}
              ></div>
              <div
                className="absolute -top-3 -right-3 w-6 h-6 cursor-ne-resize z-30"
                onMouseDown={(e) => handleResizeStart(e, "ne")}
                onTouchStart={(e) => handleResizeStart(e, "ne")}
              ></div>
              <div
                className="absolute -bottom-3 -left-3 w-6 h-6 cursor-sw-resize z-30"
                onMouseDown={(e) => handleResizeStart(e, "sw")}
                onTouchStart={(e) => handleResizeStart(e, "sw")}
              ></div>
              <div
                className="absolute -bottom-3 -right-3 w-6 h-6 cursor-se-resize z-30"
                onMouseDown={(e) => handleResizeStart(e, "se")}
                onTouchStart={(e) => handleResizeStart(e, "se")}
              ></div>
            </div>
          </div>

          <div className="flex justify-center gap-2 pt-4 border-t">
            <Button onClick={getCroppedImg} className="bg-black hover:bg-gray-800 text-white">
              Crop
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
