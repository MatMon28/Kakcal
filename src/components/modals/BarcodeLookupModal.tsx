import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { FoodItem, MealSlotId } from '../../types';
import { AmountSelector } from '../common/AmountSelector';
import { getDefaultAmount, setLastAmount } from '../../utils/amountMemory';
import { getLoadedOffCatalog, loadOffCatalog } from '../../data/offCatalog';
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Check,
  Camera,
  CameraOff,
  X,
} from 'lucide-react';

interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_de?: string;
  product_name_it?: string;
  product_name_en?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: {
    sugars_100g?: number;
    'energy-kcal_100g'?: number;
    'energy-kj_100g'?: number;
    energy_100g?: number;
    carbohydrates_100g?: number;
    proteins_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    salt_100g?: number;
  };
}

type BarcodeScanner = {
  detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
type BarcodeScannerConstructor = new (options: { formats: string[] }) => BarcodeScanner;
/** Open Food Facts `serving_quantity` (g/ml) as the product's classic portion. */
const classicPortion = (value: number | string | undefined) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 2000 ? Math.round(n) : undefined;
};
const reported = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

const SLOTS: MealSlotId[] = [
  'breakfast',
  'mid_morning',
  'lunch',
  'midday_snack',
  'dinner',
  'extra',
];

export const BarcodeLookupModal: React.FC = () => {
  const {
    isBarcodeOpen,
    setIsBarcodeOpen,
    setIsCustomFoodOpen,
    allFoods,
    rememberFood,
    language,
    addCustomFood,
    logFoodItem,
    targetMealSlot,
    setTargetMealSlot,

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
  const scanIntervalRef = React.useRef<number | null>(null);
  const lookupRef = React.useRef<AbortController | null>(null);
  const cameraRun = React.useRef(0);
  const foundLocally = fetchedProduct !== null && allFoods.some((food) => food.id === fetchedProduct.id);

  const releaseCamera = () => {
    cameraRun.current += 1;
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const stopCamera = () => {
    releaseCamera();
    setIsCameraActive(false);
  };

  const close = () => {
    stopCamera();
    setIsBarcodeOpen(false);
  };

  const startCamera = async () => {
    const run = ++cameraRun.current;
    try {
      const Detector = (window as Window & { BarcodeDetector?: BarcodeScannerConstructor }).BarcodeDetector;
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setErrorMsg(t.barcodeModal.cameraUnavailable);
        return;
      }
      setErrorMsg(null);
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (run !== cameraRun.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      let detecting = false;
      scanIntervalRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || run !== cameraRun.current || detecting) return;
        if (video.srcObject !== stream) video.srcObject = stream;
        if (video.readyState < 2) return;
        detecting = true;
        try {
          const [match] = await detector.detect(video);
          if (match && run === cameraRun.current) {
            stopCamera();
            setBarcode(match.rawValue);
            void handleLookup(match.rawValue);
          }
        } catch { /* Skip frames the detector cannot read. */ }
        finally { detecting = false; }
      }, 450);
    } catch {
      if (run === cameraRun.current) {
        stopCamera();
        setErrorMsg(t.barcodeModal.cameraUnavailable);
      }
    }
  };

  React.useEffect(() => {
    return () => {
      releaseCamera();
      lookupRef.current?.abort();
      lookupRef.current = null;
    };
  }, []);

  const sampleBarcodes = [
    { label: t.barcodeModal.sampleMilbona, code: '4056489063857' },
    { label: t.barcodeModal.sampleMilsani, code: '4061458022834' },
    { label: t.barcodeModal.sampleBarilla, code: '8076809513753' },
    { label: t.barcodeModal.sampleNutella, code: '8000500310427' },
  ];

  const handleLookup = async (codeToSearch?: string) => {
    const code = (codeToSearch ?? barcode).replace(/\s/g, '');
    if (!code || lookupRef.current) return;

    setErrorMsg(null);
    setFetchedProduct(null);
    if (!/^\d{8,14}$/.test(code)) {
      setErrorMsg(t.barcodeModal.invalidCode);
      return;
    }
    setBarcode(code);
    // Own foods first, then the 130,000 products bundled for offline use.
    const localFood = allFoods.find((food) => food.barcode === code) ??
      (getLoadedOffCatalog() ?? (await loadOffCatalog()))?.findByBarcode(code) ?? undefined;
    if (localFood) {
      rememberFood(localFood);
      setFetchedProduct(localFood);
      setLogAmount(getDefaultAmount(localFood));
      return;
    }
    if (!navigator.onLine) {
      setErrorMsg(t.barcodeModal.offline);
      return;
    }

    const request = new AbortController();
    lookupRef.current = request;
    setIsLoading(true);
    const timeout = window.setTimeout(() => request.abort(), 8000);
    try {
      const fields = 'product_name,product_name_de,product_name_it,product_name_en,brands,serving_quantity,nutriments';
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`,
        { signal: request.signal },
      );

      if (lookupRef.current !== request) return;
      if (response.status === 404) {
        setErrorMsg(t.barcodeModal.notFound);
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (lookupRef.current !== request) return;

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
        const kilojoules = reported(nut['energy-kj_100g']) ?? reported(nut.energy_100g);
        const calories = reported(nut['energy-kcal_100g']) ?? (kilojoules === null ? null : kilojoules / 4.184);
        if (calories === null) {
          setErrorMsg(t.barcodeModal.missingNutrition);
          return;
        }

        const newFood: FoodItem = {
          id: `off-${code}`,
          name_de: nameDe,
          name_it: nameIt,
          name_en: p.product_name_en || name,
          brand: p.brands,
          store: 'Open Food Facts',
          category: 'prepared',
          unit: 'g',
          calories: Math.round(calories),
          carbs: reported(nut.carbohydrates_100g),
          protein: reported(nut.proteins_100g),
          fat: reported(nut.fat_100g),
          fiber: reported(nut.fiber_100g),
          salt: reported(nut.salt_100g),
          sugar: reported(nut.sugars_100g),
          portion: classicPortion(p.serving_quantity),
          source: { label: 'Open Food Facts', url: `https://world.openfoodfacts.org/product/${code}` },
          barcode: code,
          isCustom: true,
        };

        setFetchedProduct(newFood);
        setLogAmount(getDefaultAmount(newFood));
      } else {
        setErrorMsg(t.barcodeModal.notFound);
      }
    } catch {
      if (lookupRef.current === request) {
        setErrorMsg(navigator.onLine ? t.barcodeModal.connectionError : t.barcodeModal.offline);
      }
    } finally {
      window.clearTimeout(timeout);
      if (lookupRef.current === request) {
        lookupRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleSaveOnly = () => {
    if (!fetchedProduct) return;
    addCustomFood(fetchedProduct);
    close();
    setFetchedProduct(null);
    setBarcode('');
  };

  const handleSaveAndLog = (mealSlot: MealSlotId = targetMealSlot) => {
    if (!fetchedProduct || !Number.isFinite(logAmount) || logAmount <= 0) return;
    if (!foundLocally) addCustomFood(fetchedProduct);
    setLastAmount(fetchedProduct.id, logAmount);
    logFoodItem(mealSlot, fetchedProduct, logAmount);
    close();
    setFetchedProduct(null);
    setBarcode('');
  };

  return (
    <Modal
      isOpen={isBarcodeOpen}
      onClose={close}
      title={t.barcodeModal.title}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="numeric"
              enterKeyHint="search"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder={t.barcodeModal.inputPlaceholder}
              className="w-full bg-[var(--inset)] border border-[var(--border)] rounded-2xl pl-3.5 pr-9 py-2.5 text-[var(--text)] placeholder-[var(--muted)] text-sm font-bold tabular-nums focus:outline-none focus:border-[var(--muted)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLookup();
              }}
            />
            {barcode && (
              <button
                type="button"
                onClick={() => setBarcode('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
                aria-label={t.common.clear}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={isCameraActive ? stopCamera : startCamera}
            aria-label={isCameraActive ? 'Stop camera' : 'Start camera'}
            className={`pressable px-3 py-2.5 rounded-2xl border flex items-center justify-center shrink-0 ${
              isCameraActive
                ? 'bg-[#F6D0D0] text-[#7A2727] border-[#E8AEAE]'
                : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] border-[var(--border)]'
            }`}
          >
            {isCameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
          </button>

          <button
            type="button"
            onClick={() => handleLookup()}
            disabled={isLoading || !barcode.trim()}
            className="pressable px-4 py-2.5 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center gap-1.5 text-xs disabled:opacity-40 shrink-0"
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
            <div className="pointer-events-none absolute inset-6 border-2 border-dashed border-white/60 rounded-2xl" />
          </div>
        )}

        <p className="text-xs text-[var(--muted)]">{t.barcodeModal.onlineHint}</p>

        <div>
          <span className="text-[11px] font-bold text-[var(--muted)] block mb-1.5">
            {t.barcodeModal.trySample}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sampleBarcodes.map((s) => (
              <button
                key={s.code}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setBarcode(s.code);
                  handleLookup(s.code);
                }}
                className="pressable text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)]"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && !isLoading && (
          <div className="p-3 bg-[#F6D0D0] rounded-2xl space-y-2 text-xs font-bold text-[#7A2727]">
            <p role="status" className="flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0" /> {errorMsg}
            </p>
            <button type="button" onClick={() => { close(); setIsCustomFoodOpen(true); }} className="pressable rounded-full bg-[#FBF8F2] px-3 py-2">
              {t.foodModal.addCustomFood}
            </button>
          </div>
        )}

        {fetchedProduct && !isLoading && (
          <div className="bg-[var(--inset)] border border-[var(--border)] rounded-3xl p-4 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C9EFD3] text-[#174A2B] text-[11px] font-extrabold">
                  <CheckCircle2 size={13} />
                  <span>{foundLocally ? t.barcodeModal.foundLocally : t.barcodeModal.productFound}</span>
                </span>
                <h4 className="text-base font-extrabold text-[var(--text)] mt-1.5 leading-snug">
                  {language === 'it' ? fetchedProduct.name_it : fetchedProduct.name_en}
                </h4>
                {fetchedProduct.brand && (
                  <p className="text-xs font-medium text-[var(--muted)]">{fetchedProduct.brand}</p>
                )}
              </div>
              <span className="text-sm font-extrabold tabular-nums text-[var(--text)] shrink-0">
                {fetchedProduct.calories} kcal/100{fetchedProduct.unit}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 text-center tabular-nums">
              <div className="bg-[#CFE7FE] p-1.5 rounded-2xl text-[#1A4670]">
                <span className="text-[10px] font-bold block">C</span>
                <span className="text-xs font-extrabold">
                  {fetchedProduct.carbs !== null ? `${fetchedProduct.carbs}g` : '—'}
                </span>
              </div>
              <div className="bg-[#FAE0B4] p-1.5 rounded-2xl text-[#7D4E14]">
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
                <span className="text-[10px] font-bold block">{t.macros.fiber}</span>
                <span className="text-xs font-extrabold">
                  {fetchedProduct.fiber !== null ? `${fetchedProduct.fiber}g` : '—'}
                </span>
              </div>
              <div className="bg-[var(--surface)] p-1.5 rounded-2xl text-[var(--muted)]">
                <span className="text-[10px] font-bold block">{t.macros.salt}</span>
                <span className="text-xs font-extrabold">
                  {fetchedProduct.salt !== null ? `${fetchedProduct.salt}g` : '—'}
                </span>
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTargetMealSlot(s)}
                  className={`pressable px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border ${
                    targetMealSlot === s
                      ? 'bg-[#C9EFD3] text-[#174A2B] border-[#9ADBB0]'
                      : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {t.mealSlots[s]}
                </button>
              ))}
            </div>

            <AmountSelector
              value={logAmount}
              onChange={setLogAmount}
              unit={fetchedProduct.unit}
            />

            <div className={`grid grid-cols-1 gap-2 ${foundLocally ? '' : 'sm:grid-cols-2'}`}>
              {!foundLocally && (
                <button
                  type="button"
                  onClick={handleSaveOnly}
                  className="pressable w-full py-3 bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                >
                  <Check size={16} strokeWidth={2.5} />
                  <span>{t.barcodeModal.saveOnly}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSaveAndLog(targetMealSlot)}
                disabled={logAmount <= 0}
                className="pressable w-full py-3 bg-[#C9EFD3] hover:bg-[#B8E6C4] text-[#174A2B] font-extrabold rounded-2xl flex items-center justify-center gap-1.5 text-xs sm:text-sm tabular-nums disabled:opacity-40"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>
                  {foundLocally ? t.foodModal.addBtn : t.barcodeModal.saveToDatabase} · {Math.round((fetchedProduct.calories * logAmount) / 100)} kcal
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
