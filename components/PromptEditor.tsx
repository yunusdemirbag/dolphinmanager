"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Edit3, RotateCcw, Save } from "lucide-react"
import { getPromptById, updatePrompt, resetPrompt } from "@/lib/prompts"

interface PromptEditorProps {
  promptId: string
  onPromptUpdate?: (newPrompt: string) => void
}

export function PromptEditor({ promptId, onPromptUpdate }: PromptEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const promptConfig = getPromptById(promptId)
  const [currentPrompt, setCurrentPrompt] = useState(promptConfig?.prompt || '')
  
  if (!promptConfig) {
    return null
  }

  const handleSave = () => {
    updatePrompt(promptId, currentPrompt)
    onPromptUpdate?.(currentPrompt)
    setIsOpen(false)
  }

  const handleReset = () => {
    const defaultPrompt = promptConfig.defaultPrompt
    setCurrentPrompt(defaultPrompt)
    updatePrompt(promptId, defaultPrompt)
    onPromptUpdate?.(defaultPrompt)
  }

  const isModified = currentPrompt !== promptConfig.defaultPrompt

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
          onClick={() => {
            setCurrentPrompt(promptConfig.prompt)
            setIsOpen(true)
          }}
        >
          <Edit3 className="w-3 h-3 mr-1" />
          Prompt Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            {promptConfig.name}
          </DialogTitle>
          <DialogDescription>
            {promptConfig.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Prompt İçeriği
            </label>
            <Textarea
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              placeholder="Prompt içeriğini düzenleyin..."
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              Değişkenler: ${"${title}"}, ${"${categoryNames}"} gibi değişkenler kullanabilirsiniz
            </p>
          </div>
          
          {isModified && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ℹ️ Bu prompt varsayılan ayarlardan farklı. Sıfırla butonuna basarak varsayılan haline döndürebilirsiniz.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!isModified}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Sıfırla
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              İptal
            </Button>
            <Button
              type="button"
              onClick={handleSave}
            >
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}