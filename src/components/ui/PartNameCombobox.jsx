import { useEffect, useMemo, useState } from 'react'
import { inputClassName } from './formStyles'

function matchesPart(part, query) {
  const haystack = [
    part.partName,
    part.partNo,
    part.description,
    part.displayLabel,
    part.vendorName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

export default function PartNameCombobox({
  parts,
  value,
  onChange,
  disabled = false,
  inputRef,
  onKeyDown,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return parts.slice(0, 8)
    return parts.filter((part) => matchesPart(part, query)).slice(0, 8)
  }, [parts, value])

  useEffect(() => {
    setHighlightIndex(-1)
  }, [value, suggestions.length])

  function selectSuggestion(part) {
    onChange(part.partName, part)
    setIsOpen(false)
    setHighlightIndex(-1)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      if (!isOpen) {
        setIsOpen(true)
        setHighlightIndex(0)
      } else {
        setHighlightIndex((current) => Math.min(current + 1, suggestions.length - 1))
      }
      event.preventDefault()
      return
    }

    if (event.key === 'ArrowUp' && isOpen && suggestions.length > 0) {
      setHighlightIndex((current) => Math.max(current - 1, 0))
      event.preventDefault()
      return
    }

    if (event.key === 'Enter' && isOpen && suggestions.length > 0) {
      event.preventDefault()
      const index = highlightIndex >= 0 ? highlightIndex : 0
      selectSuggestion(suggestions[index])
      return
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      setIsOpen(false)
      setHighlightIndex(-1)
      return
    }

    onKeyDown?.(event)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setIsOpen(false)
            setHighlightIndex(-1)
          }, 120)
        }}
        onKeyDown={handleKeyDown}
        placeholder="Select or type part name"
        className={inputClassName}
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
          {suggestions.map((part, index) => (
            <li key={part.id}>
              <button
                type="button"
                className={`w-full px-4 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 ${
                  index === highlightIndex ? 'bg-neutral-50' : ''
                }`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectSuggestion(part)
                }}
              >
                <span className="block font-medium">{part.displayLabel || part.partName}</span>
                {part.vendorName ? (
                  <span className="mt-0.5 block text-xs text-neutral-500">{part.vendorName}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
