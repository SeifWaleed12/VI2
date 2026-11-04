import { clx, Divider, Popover, Text } from "@medusajs/ui"
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react"

export type Category = { id: string, name: string, parent_category_id: string | null, rank: number | null }

type Props = {
  id: string
  categories: Category[]
  value: string[]
  onChange: (value: string[]) => void
  invalid?: boolean
}

type Row = { kind: "up", label: string } | { kind: "category", category: Category, hasChildren: boolean }

const byRank = (a: Category, b: Category) => (a.rank ?? Number.MAX_VALUE) - (b.rank ?? Number.MAX_VALUE) || a.name.localeCompare(b.name)

// Medusa's category picker from its own product form (not exported to admin
// extensions): main categories first, an arrow opens a category's children,
// a back row returns to the parent, and searching lists matches from every level.
export const CategoryCombobox = ({ id, categories, value, onChange, invalid }: Props) => {
  const anchor = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [level, setLevel] = useState<Category[]>([])
  const [active, setActive] = useState(-1)

  const typed = search.trim().toLowerCase()
  const parent = level[level.length - 1]
  const hasChildren = (category: Category) => categories.some((child) => child.parent_category_id === category.id)
  const shown = typed
    ? categories.filter((category) => category.name.toLowerCase().includes(typed))
    : categories.filter((category) => category.parent_category_id === (parent?.id ?? null))
  const rows: Row[] = [
    ...(parent && !typed ? [{ kind: "up" as const, label: parent.name }] : []),
    ...[...shown].sort(byRank).map((category) => ({ kind: "category" as const, category, hasChildren: !typed && hasChildren(category) })),
  ]
  const rowId = (index: number) => `${id}-row-${index}`
  const listId = `${id}-list`

  const openChange = (next: boolean) => {
    if (!next) {
      setSearch("")
      setLevel([])
    }
    setActive(-1)
    setOpen(next)
  }
  const toggle = (category: Category) =>
    onChange(value.includes(category.id) ? value.filter((item) => item !== category.id) : [...value, category.id])
  const goDown = (category: Category) => {
    setLevel([...level, category])
    setActive(-1)
    input.current?.focus()
  }
  const goUp = () => {
    setLevel(level.slice(0, -1))
    setActive(-1)
    input.current?.focus()
  }
  const choose = (row: Row) => (row.kind === "up" ? goUp() : toggle(row.category))

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (event.key === "ArrowDown") openChange(true)
      return
    }
    const row = rows[active]
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      setActive((current) => Math.max(0, Math.min(rows.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))))
    } else if (event.key === "ArrowRight" && row?.kind === "category" && row.hasChildren) {
      event.preventDefault()
      goDown(row.category)
    } else if (event.key === "Enter" && row) {
      event.preventDefault()
      choose(row)
    } else if (event.key === "Escape") {
      // Close the list only, not the whole form.
      event.stopPropagation()
      openChange(false)
    }
  }
  const keep = (event: MouseEvent) => event.preventDefault()

  return (
    <Popover open={open} onOpenChange={openChange}>
      <Popover.Anchor asChild>
        <div
          ref={anchor}
          onClick={() => { if (!open) openChange(true) }}
          className={clx(
            "bg-ui-bg-field shadow-borders-base transition-fg relative flex h-8 w-full cursor-pointer items-center gap-x-2 overflow-hidden rounded-md",
            "has-[input:focus]:shadow-borders-interactive-with-active",
            open && "shadow-borders-interactive-with-active",
            invalid && "shadow-borders-error"
          )}
        >
          {value.length > 0 && (
            <button
              type="button"
              aria-label={`Clear ${value.length} selected categories`}
              onClick={(event) => { event.stopPropagation(); onChange([]) }}
              className="bg-ui-bg-base hover:bg-ui-bg-base-hover txt-compact-small-plus text-ui-fg-subtle transition-fg ms-0.5 flex h-[28px] shrink-0 items-center gap-x-1 rounded-[4px] border py-[3px] pe-1 ps-1.5 outline-none"
            >
              <span className="tabular-nums">{value.length}</span>
              <span className="text-ui-fg-muted" aria-hidden>×</span>
            </button>
          )}
          <input
            ref={input}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls={open ? listId : undefined}
            aria-activedescendant={open && rows[active] ? rowId(active) : undefined}
            aria-invalid={invalid}
            autoComplete="off"
            value={search}
            placeholder={!open && value.length ? "Selected" : undefined}
            onChange={(event) => { setSearch(event.target.value); setActive(-1); setOpen(true) }}
            onKeyDown={onKeyDown}
            className={clx(
              "txt-compact-small size-full cursor-pointer appearance-none bg-transparent pe-8 outline-none focus:cursor-text",
              "hover:bg-ui-bg-field-hover placeholder:text-ui-fg-base",
              !value.length && "ps-2"
            )}
          />
          <span className="text-ui-fg-muted pointer-events-none absolute end-0 flex size-8 items-center justify-center" aria-hidden>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor"><path d="M7.5 3 10 6H5zM7.5 12 5 9h5z" /></svg>
          </span>
        </div>
      </Popover.Anchor>
      <Popover.Content
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => { if (anchor.current?.contains(event.target as Node)) event.preventDefault() }}
        className="max-h-[200px] w-[var(--radix-popper-anchor-width)] overflow-y-auto p-0"
      >
        <div id={listId} role="listbox" aria-multiselectable>
          {rows.map((row, index) => row.kind === "up" ? (
            <div key="up" role="presentation">
              <div role="presentation" className="p-1">
                <div
                  id={rowId(index)}
                  role="option"
                  aria-selected={false}
                  aria-label={`Back to ${row.label}`}
                  data-active={active === index}
                  onMouseDown={keep}
                  onMouseEnter={() => setActive(index)}
                  onClick={goUp}
                  className="txt-compact-small data-[active=true]:bg-ui-bg-field-hover grid cursor-pointer grid-cols-[20px_1fr] items-center gap-2 rounded-md px-2 py-1.5"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ui-fg-muted" aria-hidden>
                    <path d="M4.5 3.5 2 6l2.5 2.5" /><path d="M2 6h7a3.5 3.5 0 0 1 0 7H7" />
                  </svg>
                  {row.label}
                </div>
              </div>
              <Divider />
            </div>
          ) : (
            <div key={row.category.id} role="presentation" className={clx("grid items-center gap-2 px-1 first:pt-1 last:pb-1", row.hasChildren ? "grid-cols-[1fr_32px]" : "grid-cols-1")}>
              <div
                id={rowId(index)}
                role="option"
                aria-selected={value.includes(row.category.id)}
                data-active={active === index}
                onMouseDown={keep}
                onMouseEnter={() => setActive(index)}
                onClick={() => toggle(row.category)}
                className="txt-compact-small data-[active=true]:bg-ui-bg-field-hover grid cursor-pointer grid-cols-[20px_1fr] items-center gap-2 overflow-hidden rounded-md px-2 py-1.5"
              >
                <span className="flex size-5 items-center justify-center" aria-hidden>
                  {value.includes(row.category.id) && <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor"><circle cx="7.5" cy="7.5" r="2.5" /></svg>}
                </span>
                <span className="truncate">{row.category.name}</span>
              </div>
              {row.hasChildren && (
                // Mouse only; the keyboard opens a category with the Right arrow.
                <div
                  aria-hidden
                  onMouseDown={keep}
                  onClick={() => goDown(row.category)}
                  className="text-ui-fg-muted hover:bg-ui-bg-base-hover active:bg-ui-bg-base-pressed flex size-8 cursor-pointer items-center justify-center rounded-md"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor" className="rtl:rotate-180"><path d="M6 4.5v6l4-3z" /></svg>
                </div>
              )}
            </div>
          ))}
          {!rows.length && <Text size="small" leading="compact" className="px-3 py-2.5">No results</Text>}
        </div>
      </Popover.Content>
    </Popover>
  )
}
