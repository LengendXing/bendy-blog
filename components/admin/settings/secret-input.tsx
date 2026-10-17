"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function SecretInput({ value, onChange, placeholder, disabled }: Props) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex h-10 w-full border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 py-2 pr-9 text-sm font-body placeholder:text-pixel-gray-400 focus:outline-none focus:ring-2 focus:ring-pixel-gray-400 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-pixel-gray-400 hover:text-pixel-black dark:hover:text-pixel-white"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}
