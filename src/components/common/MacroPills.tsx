import { useApp } from '../../context/AppContext';

interface MacroPillsProps {
  carbs: number | null | undefined;
  protein: number | null | undefined;
  fat: number | null | undefined;
  /** Stretch across the available space; otherwise use a compact inline group. */
  stretch?: boolean;
}

/** Numeric-only macro pills. Colours/order identify macros visually; labels retain the names and units. */
export function MacroPills({ carbs, protein, fat, stretch = false }: MacroPillsProps) {
  const { t } = useApp();
  const macros = [
    { id: 'carbs', label: t.macros.carbs, value: carbs, tone: 'bg-[#CFE7FE] text-[#1A4670]' },
    { id: 'protein', label: t.macros.protein, value: protein, tone: 'bg-[#FAE0B4] text-[#7D4E14]' },
    { id: 'fat', label: t.macros.fat, value: fat, tone: 'bg-[#E2D6FF] text-[#4D3582]' },
  ];

  return (
    <span data-macro-pills className={`flex items-center gap-1.5 ${stretch ? 'min-w-0 flex-1 w-full' : 'shrink-0'}`}>
      {macros.map(({ id, label, value, tone }) => {
        const amount = value == null ? '—' : Math.round(value);
        const description = `${label}: ${amount} g`;
        return (
          <span
            key={id}
            data-macro={id}
            role="img"
            aria-label={description}
            title={description}
            className={`${tone} ${stretch ? 'flex-1 min-w-0' : 'min-w-8'} rounded-lg px-1.5 py-1.5 text-center text-[11px] font-extrabold tabular-nums leading-none whitespace-nowrap`}
          >
            {amount}
          </span>
        );
      })}
    </span>
  );
}
