export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Select/Dropdown con label y opciones
 *
 * @example
 * <Select
 *   label="Estado"
 *   value={status}
 *   onChange={setStatus}
 *   options={[
 *     { value: '', label: 'Todos' },
 *     { value: 'nuevo', label: 'Nuevo' },
 *     { value: 'preparando', label: 'Preparando' },
 *   ]}
 * />
 */
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  className = '',
  disabled = false,
}: SelectProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
