export interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Input de texto con label
 *
 * @example
 * <Input
 *   label="Buscar"
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Buscar por ID o cliente..."
 * />
 */
export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
}: InputProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
}
