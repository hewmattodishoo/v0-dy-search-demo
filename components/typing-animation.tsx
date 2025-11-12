"use client"

import { useState, useEffect } from "react"

const queries = ["dress", "Long dress", "Long dress short sleeve", "Long dress short sleeve for cocktail party"]

export function TypingAnimation() {
  const [currentText, setCurrentText] = useState("")
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const [charIndex, setCharIndex] = useState(0)

  useEffect(() => {
    const currentQuery = queries[currentQueryIndex]

    if (isTyping) {
      if (charIndex < currentQuery.length) {
        const timeout = setTimeout(() => {
          setCurrentText(currentQuery.slice(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        }, 100) // Typing speed
        return () => clearTimeout(timeout)
      } else {
        // Finished typing, wait then start deleting
        const timeout = setTimeout(() => {
          setIsTyping(false)
        }, 2000) // Pause before deleting
        return () => clearTimeout(timeout)
      }
    } else {
      if (charIndex > 0) {
        const timeout = setTimeout(() => {
          setCurrentText(currentQuery.slice(0, charIndex - 1))
          setCharIndex(charIndex - 1)
        }, 50) // Deleting speed (faster)
        return () => clearTimeout(timeout)
      } else {
        // Finished deleting, move to next query
        const timeout = setTimeout(() => {
          setCurrentQueryIndex((prev) => (prev + 1) % queries.length)
          setIsTyping(true)
        }, 500) // Pause before next query
        return () => clearTimeout(timeout)
      }
    }
  }, [currentText, currentQueryIndex, isTyping, charIndex])

  return (
    <span className="text-gray-400">
      {currentText}
      <span className="animate-pulse">|</span>
    </span>
  )
}
