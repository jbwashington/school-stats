'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryState } from 'nuqs'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GlobalSearchProps {
  placeholder?: string
  className?: string
}

export function GlobalSearch({ 
  placeholder = "Search schools, staff, data...", 
  className 
}: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useQueryState('q', {
    defaultValue: '',
    shallow: false
  })
  
  const [inputValue, setInputValue] = useState(query || '')

  // Sync input with URL state
  useEffect(() => {
    setInputValue(query || '')
  }, [query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setQuery(inputValue.trim())
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`)
    }
  }

  const handleClear = () => {
    setInputValue('')
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear()
    }
  }

  return (
    <form onSubmit={handleSearch} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-10 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-6 w-6 p-0 -translate-y-1/2 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </form>
  )
}