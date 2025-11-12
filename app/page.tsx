import { Suspense } from "react"
import Component from "../search-listing"

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Component />
    </Suspense>
  )
}
