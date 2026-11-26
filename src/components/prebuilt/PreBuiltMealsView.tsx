import React from 'react';
import { ActionDock } from '../common/ActionDock';
import { UtensilsCrossed, Plus, Search, ChefHat as ChefHatIcon, BookOpen, ScanBarcode, Link2 } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MealDiary } from '../journal/MealDiary';
import { MealPlanner } from '../journal/MealPlanner';
import { ShoppingLists } from '../journal/ShoppingLists';
import { CustomFoodsQuick } from './CustomFoodsQuick';
import { PhotoDiary } from '../journal/PhotoDiary';
import { LibrarySectionHeader } from '../common/LibrarySectionHeader';
import { MealsSection } from './MealsSection';
import { RecipesSection } from './RecipesSection';
import { LogMealToSlotModal, LogRecipeToSlotModal } from './LogToSlotModals';
import { CreateMealModal } from './CreateMealModal';
import { RecipeBuilderModal } from './RecipeBuilderModal';
import { RecipeImportModal } from './RecipeImportModal';
import { LazyBody } from '../common/LazyBody';
import { usePreBuiltMealsState } from './usePreBuiltMealsState';
import { useApp } from '../../context/AppContext';
import type { DockAction } from '../common/ActionDock';
import type { CustomFieldId } from '../../types';

export const PreBuiltMealsView: React.FC = () => {
  const s = usePreBuiltMealsState();
  const {
    deleteCustomFood, deletePreBuiltMeal, setTargetMealSlot, setActiveTab, t, autoMealSlot,
    journalDockActions, openBarcode, openCustomFood, ultraMinimal, sectionsOpen, toggleSection,
    pendingDelete, setPendingDelete, openNewMealModal, openRecipeModal, openImportModal, j,
  } = s;
  // Settings > Custom page: hidden sections and hidden creation buttons (the Plan / Photo buttons are in journalDockActions).
  const { settings } = useApp();
  const hideField = (key: CustomFieldId) => Boolean(settings.hideCustomFields[key]);
  const dockActions: DockAction[] = [
    ...(settings.hideCustomButtons.meal ? [] : [{ id: 'meal', icon: <UtensilsCrossed size={20} />, label: t.prebuilt.createNew, tone: 'bg-[#FAE0B4] text-[#7D4E14]', onClick: openNewMealModal }]),
    ...(settings.hideCustomButtons.recipe ? [] : [{ id: 'recipe', icon: <ChefHatIcon size={20} />, label: t.prebuilt.createRecipe, tone: 'bg-[#E2D6FF] text-[#4D3582]', onClick: openRecipeModal }]),
    ...(settings.hideCustomButtons.recipe ? [] : [{ id: 'recipe-import', icon: <Link2 size={20} />, label: j('Import recipe', 'Importa ricetta'), tone: 'bg-[#E2D6FF] text-[#4D3582]', onClick: openImportModal }]),
    ...(settings.hideCustomButtons.food ? [] : [{ id: 'food', icon: <BookOpen size={20} />, label: t.database.createCustom, tone: 'bg-[#C9EFD3] text-[#174A2B]', onClick: openCustomFood }]),
    ...journalDockActions,
  ];
  return (
    <>
    <div className={ultraMinimal ? 'journal-minimal-grid' : 'custom-library-grid'}>
      {!hideField('diary') && <MealDiary />}
      {/* Section colours are restored; the individual meal cards stay neutral. In ultra minimal, all 3 sit next to one another. */}
      {!hideField('meals') && <MealsSection s={s} />}

      {/* ============ RECIPES ============ */}
      {!hideField('recipes') && <RecipesSection s={s} />}

      {!hideField('planner') && <MealPlanner />}
      {!hideField('shopping') && <ShoppingLists />}
      {(!hideField('photos') || settings.showPhotoButton) && <PhotoDiary sectionHidden={hideField('photos')} />}

      {/* ============ FOODS ============ */}
      {!hideField('foods') && <section data-library-section="foods" className={`bg-[#C9EFD3] border border-[#9ADBB0] rounded-3xl ${ultraMinimal ? 'p-2 sm:p-3 space-y-2' : 'p-4 sm:p-5 space-y-3'}`} data-section-open={sectionsOpen.foods}>
        <LibrarySectionHeader
          title={t.database.title}
          tone="foods"
          icon={<BookOpen size={16} />}
          extraActions={<button type="button" className="library-browse-search" aria-label={t.database.browseAll} title={t.database.browseAll} onClick={() => { setTargetMealSlot(autoMealSlot()); setActiveTab('database'); }}><Search size={16} /></button>}
          createLabel={t.database.createCustom}
          onCreate={openCustomFood}
          open={sectionsOpen.foods}
          onToggle={() => toggleSection('foods')}
        />
        <div className="accordion-grid" data-open={sectionsOpen.foods} inert={!sectionsOpen.foods}>
        <div className="accordion-inner space-y-3">
        <LazyBody open={sectionsOpen.foods} defer>
        {/* Recent and favourite foods: one tap to log them. */}
        <CustomFoodsQuick />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-library-food-btn
            onClick={openBarcode}
            className="pressable w-full min-w-0 px-3 py-2.5 rounded-full bg-[#FBF8F2] hover:bg-white text-[#174A2B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5"
            title={t.prebuilt.barcode}
            aria-label={t.prebuilt.barcode}
          >
            <ScanBarcode size={16} className="shrink-0" />
            <span className={ultraMinimal ? 'sr-only' : 'truncate'}>{t.prebuilt.barcode}</span>
          </button>
          <button
            type="button"
            data-library-food-btn
            onClick={openCustomFood}
            className="pressable w-full min-w-0 px-3 py-2.5 rounded-full bg-[#FBF8F2] hover:bg-white text-[#174A2B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5"
            title={t.database.customFood}
            aria-label={t.database.customFood}
          >
            <Plus size={16} strokeWidth={2.5} className="shrink-0" />
            <span className={ultraMinimal ? 'sr-only' : 'truncate'}>{t.database.customFood}</span>
          </button>
          <button
            type="button"
            data-library-food-btn
            onClick={() => { setTargetMealSlot(autoMealSlot()); setActiveTab('database'); }}
            className="pressable col-span-2 w-full min-w-0 px-3 py-2.5 rounded-full bg-[#FBF8F2] hover:bg-white text-[#174A2B] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5"
            title={t.database.browseAll}
            aria-label={t.database.browseAll}
          >
            <Search size={16} className="shrink-0" />
            <span className={ultraMinimal ? 'sr-only' : 'truncate'}>{t.database.browseAll}</span>
          </button>
        </div>
        </LazyBody>
        </div>
        </div>
      </section>}

      <ConfirmDialog
        open={pendingDelete !== null}
        message={
          pendingDelete
            ? (pendingDelete.kind === 'meal' ? t.common.confirmDeleteMeal : t.common.confirmDeleteRecipe).replace('{name}', pendingDelete.name)
            : ''
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete?.kind === 'meal') deletePreBuiltMeal(pendingDelete.id);
          else if (pendingDelete) deleteCustomFood(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      {dockActions.length > 0 && (
        <ActionDock
          activeOn="prebuilt"
          label={t.prebuilt.creationDock}
          actions={dockActions}
        />
      )}

      <LogMealToSlotModal s={s} />

      <LogRecipeToSlotModal s={s} />

      {s.isCreateOpen && <CreateMealModal s={s} />}

      {s.isRecipeOpen && <RecipeBuilderModal s={s} />}
      <RecipeImportModal s={s} />
    </div>
    </>
  );
};
