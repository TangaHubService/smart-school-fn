import { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SearchableOption {
  id: string;
  label: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  selectedId: string;
  options: SearchableOption[];
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
  onInputChange: (value: string) => void;
  onOptionSelect: (option: SearchableOption) => void;
}

export function updateSearchableSelection(
  value: string,
  options: SearchableOption[],
  onText: (value: string) => void,
  onId: (value: string) => void
) {
  onText(value);
  const normalized = value.trim().toLowerCase();
  const exact = options.find((item) => item.label.toLowerCase() === normalized);
  onId(exact?.id ?? '');
}

export function SearchableSelect({
  label,
  value,
  selectedId,
  options,
  placeholder,
  ariaLabel,
  disabled,
  onInputChange,
  onOptionSelect,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return options;
    }

    return options.filter((item) => item.label.toLowerCase().includes(query));
  }, [options, value]);

  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <div className="relative">
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onInputChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 120);
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 disabled:bg-slate-50 disabled:text-slate-400"
          aria-label={ariaLabel}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsOpen((current) => !current)}
          className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-slate-500 hover:bg-brand-50 disabled:hover:bg-transparent"
          aria-label={`Toggle ${label} options`}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && !disabled ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-56 w-full overflow-auto rounded-xl border border-brand-200 bg-white shadow-lg">
            {filtered.length ? (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onOptionSelect(item);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-brand-50"
                >
                  <span className="truncate">{item.label}</span>
                  {selectedId === item.id ? <Check className="h-4 w-4 text-brand-600" /> : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-slate-500">No matching options.</p>
            )}
          </div>
        ) : null}
      </div>
    </label>
  );
}
