import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { FoodItem, MealSlotId } from '../../types';
import { AmountSelector } from '../common/AmountSelector';
import { setLastAmount } from '../../utils/amountMemory';
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Camera,
  CameraOff,
} from 'lucide-react';

interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_de?: string;
  product_name_it?: string;
  product_name_en?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    carbohydrates_100g?: number;
    proteins_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    salt_100g?: number;
  };
}

export const BarcodeLookupModal: React.FC = () => {
  const {
    isBarcodeOpen,
    setIsBarcodeOpen,
    addCustomFood,
    logFoodItem,
    targetMealSlot,
    t,
  } = useApp();

  const [barcode, setBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fetchedProduct, setFetchedProduct] = useState<FoodItem | null>(null);
  const [logAmount, setLogAmount] = useState<number>(100);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setErrorMsg(null);
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyWindow = window as any;
      if ('BarcodeDetector' in anyWindow) {
        const detector = new anyWindow.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
        });
        const interval = setInterval(async () => {
          if (!videoRef.current || !streamRef.current) {
            clearInterval(interval);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const detected = barcodes[0].rawValue;
              clearInterval(interval);
              stopCamera();
              setBarcode(detected);
              handleLookup(detected);
            }
          } catch {
            // frame skip
          }
        }, 500);
      }
    } catch {
      setIsCameraActive(false);
      setErrorMsg('Camera unavailable. Enter barcode manually.');
    }
  };

  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const sampleBarcodes = [
    { label: t.barcodeModal.sampleMilbona, code: '4056489063857' },
    { label: t.barcodeModal.sampleMilsani, code: '4061458022834' },
    { label: t.barcodeModal.sampleBarilla, code: '8076809513753' },
    { label: t.barcodeModal.sampleNutella, code: '8000500310427' },
  ];

  const handleLookup = async (codeToSearch?: string) => {
    const code = (codeToSearch || barcode).trim();
    if (!code) return;

    setIsLoading(true);
    setErrorMsg(null);
    setFetchedProduct(null);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 1 && data.product) {
        const p: OpenFoodFactsProduct = data.product;
        const name =
          p.product_name ||
          p.product_name_en ||
          p.product_name_de ||
          p.product_name_it ||
          `Product ${code}`;
        const nameDe = p.product_name_de || name;
        const nameIt = p.product_name_it || name;

        const nut = p.nutriments || {};
        const calories = nut['energy-kcal_100g'] ?? nut['energy-kcal'] ?? 0;

        const carbs =
          nut.carbohydrates_100g !== undefined
            ? Number(nut.carbohydrates_100g)
            : null;
        const protein =
          nut.proteins_100g !== undefined ? Number(nut.proteins_100g) : null;
        const fat = nut.fat_100g !== undefined ? Number(nut.fat_100g) : null;
        const fiber =
          nut.fiber_100g !== undefined ? Number(nut.fiber_100g) : null;
        const salt = nut.salt_100g !== undefined ? Number(nut.salt_100g) : null;

        const newFood: FoodItem = {
          id: `off-${code}-${Date.now()}`,
          name_de: nameDe,
          name_it: nameIt,
          name_en: name,
          brand: p.brands,
          store: 'Open Food Facts',
          category: 'prepared',
          unit: 'g',
          calories: Math.round(calories),
          carbs: carbs !== null ? Math.round(carbs * 10) / 10 : null,
          protein: protein !== null ? Math.round(protein * 10) / 10 : null,
          fat: fat !== null ? Math.round(fat * 10) / 10 : null,
          fiber: fiber !== null ? Math.round(fiber * 10) / 10 : null,
          salt: salt !== null ? Math.round(salt * 100) / 100 : null,
          barcode: code,
          isCustom: true,
        };

        setFetchedProduct(newFood);
      } else {
        setErrorMsg(t.barcodeModal.notFound);
      }
    } catch {
      setErrorMsg(t.barcodeModal.notFound);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndLog = (mealSlot: MealSlotId = targetMealSlot) => {
    if (!fetchedProduct) return;
    addCustomFood(fetchedProduct);
    const amt = logAmount > 0 ? logAmount : 100;
    setLastAmount(fetchedProduct.id, amt);
    logFoodItem(mealSlot, fetchedProduct, amt);
    setIsBarcodeOpen(false);
    setFetchedProduct(null);
    setBarcode('');
  };

  return (
    <Modal
      isOpen={isBarcodeOpen}
      onClose={() => setIsBarcodeOpen(false)}
      title={t.barcodeModal.title}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder={t.barcodeModal.inputPlaceholder}
            className="flex-1 bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-[var(--text)] placeholder-[var(--muted)] text-sm font-bold focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLookup();
            }}
          />

          <button
            type="button"
            onClick={isCameraActive ? stopCamera : startCamera}
            className={`px-3 py-2.5 rounded-2xl border flex items-center justify-center transition-colors shrink-0 ${
              isCameraActive
                ? 'bg-[#F6D0D0] text-[#7A2727] border-[#E8AEAE]'
                : 'bg-[var(--inset)] text-[var(--muted)] border-[var(--border)]'
            }`}
          >
            {isCameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
          </button>

          <button
            type="button"
            onClick={() => handleLookup()}
            disabled={isLoading || !barcode.trim()}
            className="px-4 py-2.5 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center gap-1.5 text-xs transition-colors disabled:opacity-40 shrink-0"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} strokeWidth={2.5} />
            )}
            <span>{t.barcodeModal.searchBtn}</span>
          </button>
        </div>

        {isCameraActive && (
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
          </div>
        )}

        <div>
          <span className="text-[11px] font-bold text-[var(--muted)] block mb-1.5">
            {t.barcodeModal.trySample}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sampleBarcodes.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => {
                  setBarcode(s.code);
                  handleLookup(s.code);
                }}
                className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--inset)] hover:bg-[var(--border)] text-[var(--text)] transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && !isLoading && (
          <div className="p-3 bg-[#F6D0D0] rounded-2xl flex items-center gap-2 text-xs font-bold text-[#7A2727]">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {fetchedProduct && !isLoading && (
          <div className="bg-[var(--inset)] rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[#174A2B] text-xs font-extrabold">
                  <CheckCircle2 size={15} />
                  <span>{t.barcodeModal.productFound}</span>
                </div>
                <h4 className="text-base font-extrabold text-[var(--text)] mt-0.5">
                  {fetchedProduct.name_en}
                </h4>
              </div>
              <span className="text-sm font-extrabold text-[#174A2B]">
                {fetchedProduct.calories} kcal/100g
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 text-center">
              <div className="bg-[#FAE0B4] p-1.5 rounded-2xl text-[#7D4E14]">
                <span className="text-[10px] font-bold block">C</span>
                <span className="text-xs font-extrabold">
                  {fetchedProduct.carbs !== null ? `${fetchedProduct.carbs}g` : '—'}
                </span>
              </div>
              <div className="bg-[#F6D0D0] p-1.5 rounded-2xl text-[#7A2727]">
                <span className="text-[10px] font-bold block">P</span>
                <span className="text-xs font-extrabold">
                  {fetchedProduct.protein !== null ? `${fetchedProduct.protein}g` : '—'}
                </span>
              </div>
              <div className="bg-[#E2D6FF] p-1.5 rounded-2xl text-[#4D3582]">
                <span className="text-[10px] font-bold block">F</span>
                <span className="text-xs font-extrabold">
                  {fetchedProduct.fat !== null ? `${fetchedProduct.fat}g` : '—'}
                </span>
              </div>
              <div className="bg-[var(--surface)] p-1.5 rounded-2xl text-[var(--muted)]">
                <span className="text-[10px] font-bold block">Fib</span>
                <span className="text-xs font-extrabold">
                  {fetchedProduct.fiber !== null ? `${fetchedProduct.fiber}g` : '—'}
                </span>
              </div>
              <div className="bg-[var(--surface)] p-1.5 rounded-2xl text-[var(--muted)]">
                <span className="text-[10px] font-bold block">Salt</span>
                <span className="text-xs font-extrabold">
                  {fetchedProduct.salt !== null ? `${fetchedProduct.salt}g` : '—'}
                </span>
              </div>
            </div>

            <AmountSelector
              value={logAmount}
              onChange={setLogAmount}
              unit={fetchedProduct.unit}
            />

            <button
              type="button"
              onClick={() => handleSaveAndLog(targetMealSlot)}
              className="w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>
                {t.barcodeModal.saveToDatabase} ({t.mealSlots[targetMealSlot]})
              </span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
