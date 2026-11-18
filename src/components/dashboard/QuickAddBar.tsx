import { UtensilsCrossed, Footprints, Droplets, Scale, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActionDock, type DockAction } from '../common/ActionDock';
import { PoopIcon } from '../common/PoopIcon';

/** Food, activity and tracker shortcuts for the Today page only. */
export function QuickAddBar() {
  const {
    settings, activeTab, t, setIsAddFoodOpen, setIsLogActivityOpen, setIsWaterOpen,
    setIsPoopOpen, setIsWeightOpen, setCustomButtonOpenId, setIsCustomPickerOpen,
  } = useApp();
  if (activeTab !== 'today') return null;

  const quick = settings.quickAdd;
  const actions: DockAction[] = [];
  if (quick.food) actions.push({ id: 'food', icon: <UtensilsCrossed size={20} />, tone: 'bg-[#C9EFD3] text-[#174A2B]', onClick: () => setIsAddFoodOpen(true), label: t.quickAdd.food });
  if (quick.movement) actions.push({ id: 'activity', icon: <Footprints size={20} />, tone: 'bg-[#E2D6FF] text-[#4D3582]', onClick: () => setIsLogActivityOpen(true), label: t.quickAdd.movement });
  if (quick.water) actions.push({ id: 'water', icon: <Droplets size={20} />, tone: 'bg-[#CFE7FE] text-[#183F66]', onClick: () => setIsWaterOpen(true), label: t.quickAdd.water });
  if (quick.poop && !settings.hidePoop) actions.push({ id: 'poop', icon: <PoopIcon size={20} />, tone: 'bg-[#FAE0B4] text-[#7D4E14]', onClick: () => setIsPoopOpen(true), label: t.quickAdd.poop });
  if (quick.weight) actions.push({ id: 'weight', icon: <Scale size={20} />, tone: 'bg-[#F6D0D0] text-[#7A2727]', onClick: () => setIsWeightOpen(true), label: t.quickAdd.weight });
  if (quick.custom && settings.customButtons.length) {
    const single = settings.customButtons.length === 1 ? settings.customButtons[0] : undefined;
    actions.push({
      id: 'custom', icon: <Sparkles size={20} />, tone: 'bg-[#F7E9AA] text-[#6E5B14]',
      onClick: () => single ? setCustomButtonOpenId(single.id) : setIsCustomPickerOpen(true),
      label: single?.name ?? t.quickAdd.custom,
    });
  }

  return <ActionDock label={t.settings.quickAdd} actions={actions} />;
}
