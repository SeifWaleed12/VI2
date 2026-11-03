import { clx, Popover, Text } from "@medusajs/ui"
import { useRef, useState, type KeyboardEvent } from "react"

export type Choice = { value: string, label: string, hint?: string }

type Props = {
  id: string
  choices: Choice[]
  value: string[]
  onChange: (value: string[]) => void
  // When given, typing a label that is not in the list offers to create it.
  onCreate?: (label: string) => void
  placeholder?: string
  invalid?: boolean
}

// A search box with chips, styled like the Combobox in Medusa's own product
// form (Medusa does not export that component to admin extensions).
export const ChipCombobox = ({ id, choices, value, onChange, onCreate, placeholder, invalid }: Props) => {
  const anchor = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [active, setActive] = useState(0)

  const typed = search.trim()
  const matches = choices.filter((choice) => choice.label.toLowerCase().includes(typed.toLowerCase()))
  const canCreate = !!onCreate && !!typed && !choices.some((choice) => choice.label.toLowerCase() === typed.toLowerCase())
  const rows = matches.length + (canCreate ? 1 : 0)
  const listId = `${id}-list`
  const rowId = (index: number) => `${id}-row-${index}`
  const selected = value.map((key) => choices.find((choice) => choice.value === key)).filter((choice): choice is Choice => !!choice)

  const toggle = (key: string) => onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key])
  const pick = (index: number) => {
    if (index < matches.length) toggle(matches[index].value)
    else if (canCreate) onCreate!(typed)
    setSearch("")
    setActive(0)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      // The first press only opens the list, with its first row highlighted.
      if (!open) return setOpen(true)
      if (rows) setActive((current) => (current + (event.key === "ArrowDown" ? 1 : rows - 1)) % rows)
    } else if (event.key === "Enter") {
      event.preventDefault()
      if (open && rows) pick(Math.min(active, rows - 1))
    } else if (event.key === "Backspace" && !search && value.length) {
      onChange(value.slice(0, -1))
    } else if (event.key === "Escape" && open) {
      // Close the list only, not the whole form.
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div
          ref={anchor}
          onClick={() => setOpen(true)}
          className={clx(
            "bg-ui-bg-field shadow-borders-base hover:bg-ui-bg-field-hover flex min-h-8 w-full cursor-text flex-wrap items-center gap-1 rounded-md px-1.5 py-1",
            "focus-within:shadow-borders-interactive-with-active",
            invalid && "shadow-borders-error"
          )}
        >
          {selected.map((choice) => (
            <span key={choice.value} className="bg-ui-bg-component shadow-borders-base txt-compact-small-plus text-ui-fg-subtle flex items-center gap-x-1 rounded-md py-0.5 pl-2 pr-0.5">
              {choice.label}
              {choice.hint && <span className="text-ui-fg-muted txt-compact-small">{choice.hint}</span>}
              <button
                type="button"
                aria-label={`Remove ${choice.label}`}
                className="text-ui-fg-muted hover:text-ui-fg-subtle hover:bg-ui-bg-component-hover rounded px-1"
                onClick={(event) => { event.stopPropagation(); toggle(choice.value) }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls={open ? listId : undefined}
            // The input keeps focus, so the highlighted row is announced through it.
            aria-activedescendant={open && rows ? rowId(Math.min(active, rows - 1)) : undefined}
            aria-invalid={invalid}
            autoComplete="off"
            value={search}
            placeholder={selected.length ? undefined : placeholder}
            onChange={(event) => { setSearch(event.target.value); setActive(0); setOpen(true) }}
            onKeyDown={onKeyDown}
            className="txt-compact-small text-ui-fg-base placeholder:text-ui-fg-muted min-w-[80px] flex-1 bg-transparent px-1 py-0.5 outline-none"
          />
        </div>
      </Popover.Anchor>
      <Popover.Content
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => { if (anchor.current?.contains(event.target as Node)) event.preventDefault() }}
        className="max-h-[300px] w-[var(--radix-popper-anchor-width)] overflow-y-auto p-1"
      >
        <div id={listId} role="listbox" aria-multiselectable>
          {matches.map((choice, index) => (
            <div
              key={choice.value}
              id={rowId(index)}
              role="option"
              aria-selected={value.includes(choice.value)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(index)}
              className={clx("txt-compact-small flex w-full cursor-pointer items-center gap-x-2 rounded-md px-2 py-1.5", index === active && "bg-ui-bg-component-hover")}
            >
              <span className="w-4 text-ui-fg-interactive">{value.includes(choice.value) ? "✓" : ""}</span>
              {choice.label}
              {choice.hint && <span className="text-ui-fg-muted">{choice.hint}</span>}
            </div>
          ))}
          {canCreate && (
            <div
              id={rowId(matches.length)}
              role="option"
              aria-selected={false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(matches.length)}
              className={clx("txt-compact-small text-ui-fg-interactive flex w-full cursor-pointer items-center gap-x-2 rounded-md px-2 py-1.5", active === matches.length && "bg-ui-bg-component-hover")}
            >
              <span className="w-4">+</span>Add "{typed}"
            </div>
          )}
          {!rows && <Text size="small" className="text-ui-fg-muted px-2 py-1.5">No results</Text>}
        </div>
      </Popover.Content>
    </Popover>
  )
}
