"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Search, X, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VisualSearchUpload } from "./visual-search-upload"
import Image from "next/image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface NoFocusInputProps {
  value: string
  onChange: (value: string) => void
  onKeyPress?: (e: React.KeyboardEvent) => void
  onSearchClick?: () => void
  onVisualSearch?: (base64: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  visualSearchImage?: string | null
  onClearVisualSearch?: () => void
  onAISearch?: () => void
}

export function NoFocusInput({
  value,
  onChange,
  onKeyPress,
  onSearchClick,
  onVisualSearch,
  placeholder,
  className = "",
  style = {},
  visualSearchImage = null,
  onClearVisualSearch,
  onAISearch,
}: NoFocusInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLDivElement>(null)

  // Sync the value with the div content
  useEffect(() => {
    if (inputRef.current && inputRef.current.textContent !== value) {
      inputRef.current.textContent = value
    }
  }, [value])

  const handleInput = () => {
    if (inputRef.current) {
      onChange(inputRef.current.textContent || "")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onKeyPress) {
      e.preventDefault()
      onKeyPress(e)
    }
  }

  return (
    <div className="relative">
      {/* Search button on the right */}
      <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
        <Button variant="ghost" onClick={onSearchClick} className="h-8 w-8 p-0 hover:bg-gray-100" size="sm">
          <Search className="h-4 w-4 text-gray-400" />
        </Button>
      </div>

      {/* AI search button on the right, before visual search */}
      {onAISearch && (
        <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
          <Button variant="ghost" onClick={onAISearch} className="h-8 w-8 p-0 hover:bg-gray-100" size="sm">
            <Bot className="h-4 w-4 text-gray-400" />
          </Button>
        </div>
      )}

      {/* Visual search upload on the right, after AI button */}
      <div className="absolute right-24 top-1/2 transform -translate-y-1/2">
        {onVisualSearch && <VisualSearchUpload onImageUpload={onVisualSearch} />}
      </div>

      {/* Visual search thumbnail on the left */}
      {visualSearchImage && (
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative w-8 h-8 rounded-md overflow-hidden border border-gray-200 mr-2">
                  <Image
                    src={`data:image/jpeg;base64,${visualSearchImage}`}
                    alt="Visual search"
                    fill
                    className="object-cover"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-0 overflow-hidden">
                <div className="w-48 h-48 relative">
                  <Image
                    src={`data:image/jpeg;base64,${visualSearchImage}`}
                    alt="Visual search preview"
                    fill
                    className="object-contain"
                  />
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {onClearVisualSearch && (
            <Button
              variant="ghost"
              onClick={onClearVisualSearch}
              className="h-4 w-4 p-0 absolute -top-1 -right-1 bg-white rounded-full border border-gray-200"
              size="sm"
            >
              <X className="h-2 w-2" />
            </Button>
          )}
        </div>
      )}

      <div
        ref={inputRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`${className} ${
          visualSearchImage ? "pl-10" : ""
        } pr-32 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0`}
        style={{
          ...style,
          outline: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        data-placeholder={!value && !isFocused && !onAISearch ? placeholder : ""}
      />
    </div>
  )
}
