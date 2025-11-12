"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

interface SettingsPanelProps {
  isOpen: boolean
  onToggle: () => void
  credentials: {
    apiKey: string
    dyid: string
    dyidServer: string
  }
  onCredentialsChange: (credentials: any) => void
  presets: { [key: string]: string }
}

export function SettingsPanel({ isOpen, onToggle, credentials, onCredentialsChange, presets }: SettingsPanelProps) {
  return (
    <>
      <Button variant="outline" onClick={onToggle} className="flex items-center gap-2 border-gray-200">
        <Settings className="h-4 w-4" />
        Settings
      </Button>

      {isOpen && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>API Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-gray-600">PRESET</label>
                <Select
                  value={Object.keys(presets).find((key) => presets[key] === credentials.apiKey) || "custom"}
                  onValueChange={(value) => {
                    onCredentialsChange({
                      apiKey: presets[value] || "",
                      dyid: credentials.dyid,
                      dyidServer: credentials.dyidServer,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(presets).map((preset) => (
                      <SelectItem key={preset} value={preset}>
                        {preset === "custom" ? "Custom" : preset}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-xs font-semibold tracking-wider text-gray-600">DY API KEY</label>
                <Input
                  value={credentials.apiKey}
                  onChange={(e) => onCredentialsChange({ ...credentials, apiKey: e.target.value })}
                  placeholder="Enter API key"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-gray-600">DYID</label>
                <Input
                  value={credentials.dyid}
                  onChange={(e) => onCredentialsChange({ ...credentials, dyid: e.target.value })}
                  placeholder="Enter DYID"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-gray-600">DYID_SERVER</label>
                <Input
                  value={credentials.dyidServer}
                  onChange={(e) => onCredentialsChange({ ...credentials, dyidServer: e.target.value })}
                  placeholder="Enter DYID Server"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
