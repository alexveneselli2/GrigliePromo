// Compact numeric stepper for counting promo slot assignments.
// Variants: 'inline' (compact, in tables) | 'chip' (pill-shaped, for cards)

export default function Stepper({
  value = 0,
  onChange,
  onIncrement,
  onDecrement,
  variant = 'inline',
  color = 'red',
  label,
  size = 'md',
  disabled = false,
  max,
  title,
}) {
  const v = value || 0;
  const isActive = v > 0;

  const handleInc = (e) => {
    e?.stopPropagation();
    if (disabled) return;
    if (max != null && v >= max) return;
    if (onIncrement) onIncrement();
    else if (onChange) onChange(v + 1);
  };
  const handleDec = (e) => {
    e?.stopPropagation();
    if (disabled || v <= 0) return;
    if (onDecrement) onDecrement();
    else if (onChange) onChange(v - 1);
  };

  const colorMap = {
    red:     { bg: 'bg-dimar-red',    text: 'text-dimar-red',    ring: 'ring-dimar-red/30',    border: 'border-dimar-red',    soft: 'bg-red-50' },
    rose:    { bg: 'bg-rose-500',     text: 'text-rose-600',     ring: 'ring-rose-500/30',     border: 'border-rose-500',     soft: 'bg-rose-50' },
    orange:  { bg: 'bg-orange-600',   text: 'text-orange-600',   ring: 'ring-orange-500/30',   border: 'border-orange-600',   soft: 'bg-orange-50' },
    amber:   { bg: 'bg-amber-600',    text: 'text-amber-600',    ring: 'ring-amber-500/30',    border: 'border-amber-600',    soft: 'bg-amber-50' },
    green:   { bg: 'bg-emerald-600',  text: 'text-emerald-600',  ring: 'ring-emerald-500/30',  border: 'border-emerald-600',  soft: 'bg-emerald-50' },
    teal:    { bg: 'bg-teal-600',     text: 'text-teal-600',     ring: 'ring-teal-500/30',     border: 'border-teal-600',     soft: 'bg-teal-50' },
    blue:    { bg: 'bg-blue-600',     text: 'text-blue-600',     ring: 'ring-blue-500/30',     border: 'border-blue-600',     soft: 'bg-blue-50' },
  };
  const cc = colorMap[color] || colorMap.red;

  if (variant === 'inline') {
    // Compact table cell stepper
    const sizes = {
      sm: { h: 'h-6', btn: 'w-5', txt: 'text-[10px]', num: 'text-[10px]' },
      md: { h: 'h-7', btn: 'w-6', txt: 'text-[11px]', num: 'text-xs' },
    };
    const sz = sizes[size] || sizes.md;
    return (
      <div
        className={`inline-flex items-stretch ${sz.h} rounded border overflow-hidden transition-all ${
          isActive ? `${cc.border} ${cc.soft}` : 'border-gray-200 bg-white'
        }`}
        title={title}
      >
        <button
          onClick={handleDec}
          disabled={v <= 0 || disabled}
          className={`${sz.btn} flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${isActive ? `${cc.text} hover:bg-white/60` : 'text-gray-300'}`}
        >
          <span className={sz.txt}>−</span>
        </button>
        <div className={`flex items-center justify-center px-1 min-w-[18px] font-mono font-bold tabular-nums ${sz.num} ${isActive ? cc.text : 'text-gray-300'} border-x border-current/10`}>
          {v}
        </div>
        <button
          onClick={handleInc}
          disabled={disabled || (max != null && v >= max)}
          className={`${sz.btn} flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${isActive ? `${cc.text} hover:bg-white/60` : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
        >
          <span className={sz.txt}>+</span>
        </button>
      </div>
    );
  }

  // chip variant: rounded full pill with label + stepper
  return (
    <div
      className={`inline-flex items-stretch h-7 rounded-full border overflow-hidden transition-all text-[10px] font-semibold shadow-sm ${
        isActive
          ? `${cc.bg} text-white border-transparent`
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
      }`}
      title={title || label}
    >
      <button
        onClick={handleDec}
        disabled={v <= 0 || disabled}
        className={`w-5 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
          isActive ? 'hover:bg-black/10' : 'hover:bg-gray-50'
        }`}
      >
        <span>−</span>
      </button>
      <div className={`px-2 flex items-center gap-1 ${isActive ? 'border-x border-white/20' : 'border-x border-gray-100'}`}>
        {label && <span className="font-bold tracking-tight whitespace-nowrap">{label}</span>}
        <span className={`font-mono tabular-nums font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>
          {v}
        </span>
      </div>
      <button
        onClick={handleInc}
        disabled={disabled || (max != null && v >= max)}
        className={`w-5 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
          isActive ? 'hover:bg-black/10' : 'hover:bg-gray-50'
        }`}
      >
        <span>+</span>
      </button>
    </div>
  );
}
