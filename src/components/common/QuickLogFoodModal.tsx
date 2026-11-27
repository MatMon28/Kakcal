import type { FoodItem, MealSlotId } from '../../types';
import { AmountSelector } from './AmountSelector';
import { FoodMacroGrid } from './FoodMacroGrid';
import { MealSlotPicker, type MealSlotOption } from './MealSlotPicker';
import { Modal } from './Modal';
import { WorkflowFooter } from './WorkflowFooter';

interface QuickLogFoodModalProps<TSlot extends string = MealSlotId> {
  food: FoodItem | null;
  title: string;
  onClose: () => void;
  onBack?: () => void;
  mealSlots: ReadonlyArray<MealSlotOption<TSlot>>;
  slot: TSlot;
  onSlotChange: (slot: TSlot) => void;
  amount: number;
  onAmountChange: (amount: number) => void;
  primaryLabel: string;
  onConfirm: () => void;
  moreLabel?: string;
  onMore?: () => void;
}

/** Shared quick-log food modal used by both FoodDatabaseView and CustomFoodsQuick. */
export function QuickLogFoodModal<TSlot extends string = MealSlotId>({
  food,
  title,
  onClose,
  onBack,
  mealSlots,
  slot,
  onSlotChange,
  amount,
  onAmountChange,
  primaryLabel,
  onConfirm,
  moreLabel,
  onMore,
}: QuickLogFoodModalProps<TSlot>) {
  const validAmount = Number.isFinite(amount) && amount > 0;

  return (
    <Modal
      isOpen={food !== null}
      onClose={onClose}
      onBack={onBack}
      title={title}
      maxWidth="max-w-md"
      footer={
        <WorkflowFooter
          primary={primaryLabel}
          onPrimary={onConfirm}
          disabled={!validAmount}
          more={moreLabel}
          onMore={onMore}
          moreDisabled={!validAmount}
        />
      }
    >
      {food && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-intake rounded-2xl px-4 py-3 tabular-nums">
            <span className="text-xs font-bold text-intake-ink">
              {food.calories} kcal / 100{food.unit}
            </span>
            <span className="text-xl font-extrabold text-intake-ink">
              {Math.round((food.calories * amount) / 100)} kcal
            </span>
          </div>

          <MealSlotPicker
            slots={mealSlots}
            value={slot}
            onChange={onSlotChange}
            layout="grid"
            tone="intake"
          />

          <AmountSelector
            value={amount}
            onChange={onAmountChange}
            unit={food.unit || 'g'}
            food={food}
          />

          <FoodMacroGrid food={food} amount={amount} />
        </div>
      )}
    </Modal>
  );
}
