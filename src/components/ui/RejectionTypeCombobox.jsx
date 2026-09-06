import { useEffect, useMemo, useState } from 'react'
import { inputClassName } from './formStyles'

export default function RejectionTypeCombobox({
  rejectionTypes,
  value,
  onChange,
  disabled = false,
  inputRef,
  onKeyDown,
}) {
  const selectedType = rejectionTypes.find((type) => String(type.id) === String(value))
  const [inputValue, setInputValue] = useState(selectedType?.typeName ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)

  useEffect(() => {
    const type = rejectionTypes.find((item) => String(item.id) === String(value))
    setInputValue(type?.typeName ?? '')
  }, [value, rejectionTypes])

  const suggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query) return rejectionTypes.slice(0, 8)
    return rejectionTypes
      .filter((type) => type.typeName.toLowerCase().includes(query))
      .slice(0, 8)
  }, [rejectionTypes, inputValue])

  useEffect(() => {
    setHighlightIndex(-1)
  }, [inputValue, suggestions.length])

  function selectSuggestion(type) {
    onChange(String(type.id))
    setInputValue(type.typeName)
    setIsOpen(false)
    setHighlightIndex(-1)
  }

  function handleInputChange(event) {
    const nextValue = event.target.value
    setInputValue(nextValue)
    setIsOpen(true)

    const exactMatch = rejectionTypes.find(
      (type) => type.typeName.toLowerCase() === nextValue.trim().toLowerCase(),
    )
    onChange(exactMatch ? String(exactMatch.id) : '')
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
        value={inputValue}
        disabled={disabled}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setIsOpen(false)
            setHighlightIndex(-1)
          }, 120)
        }}
        onKeyDown={handleKeyDown}
        placeholder="Select or type rejection type"
        className={inputClassName}
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
          {suggestions.map((type, index) => (
            <li key={type.id}>
              <button
                type="button"
                className={`w-full px-4 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 ${
                  index === highlightIndex ? 'bg-neutral-50' : ''
                }`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectSuggestion(type)
                }}
              >
                {type.typeName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
