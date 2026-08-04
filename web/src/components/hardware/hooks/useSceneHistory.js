import { useCallback, useMemo, useReducer } from 'react';

/**
 * Sahna obyektlari uchun bekor qilish / qaytarish (undo / redo) tarixi.
 *
 * Nega alohida hook: sahnani o'zgartiradigan joy o'ntadan ortiq (detal
 * qo'shish, o'chirish, sudrash, yig'ma yuklash, import, tozalash...). Har
 * biriga alohida "avval snapshot ol" qatorini yozish — bittasini unutib
 * qo'yish uchun ideal sharoit. Shuning uchun tarix state'ning o'zini o'rab
 * oladi: `setSceneObjects` chaqirilgan joyning hammasi avtomatik yoziladi.
 *
 * Nega useReducer: o'tmish, hozir va kelajak — bitta bo'linmas holat. Ularni
 * uchta alohida useState bilan yuritganda "hozirgi qiymat" ni o'qish uchun ref
 * kerak bo'lardi, refni esa render paytida o'qish ham, yozish ham mumkin emas.
 * Reducer'da esa oldingi holat updater'ga o'zi kelib tushadi.
 *
 * ─── Sudrash muammosi ───
 * Detalni gizmo bilan sudrash har kadrda `onUpdate` chaqiradi. Har kadrni
 * tarixga yozsak, bitta sudrashdan keyin Ctrl+Z ni 60 marta bosish kerak
 * bo'lardi. Shuning uchun bir xil obyektga tegishli, ketma-ket va tez
 * (COALESCE_MS ichida) kelgan o'zgarishlar bitta yozuvga birlashtiriladi —
 * ya'ni bitta sudrash = bitta bekor qilish.
 */

const HISTORY_LIMIT = 60;
const COALESCE_MS = 600;

const initialState = (value) => ({
  past: [],
  present: value,
  future: [],
  lastAt: 0,
  lastTag: null,
});

function reducer(state, action) {
  switch (action.type) {
    case 'set': {
      const next =
        typeof action.updater === 'function' ? action.updater(state.present) : action.updater;
      if (next === state.present) return state;

      // Bir xil tag bilan tez kelgan o'zgarish — bitta qadam.
      const coalesce =
        action.tag !== null &&
        action.tag === state.lastTag &&
        action.now - state.lastAt < COALESCE_MS;

      return {
        past: coalesce ? state.past : [...state.past.slice(-(HISTORY_LIMIT - 1)), state.present],
        present: next,
        future: coalesce ? state.future : [],
        lastAt: action.now,
        lastTag: action.tag,
      };
    }

    case 'reset':
      return initialState(action.value);

    case 'undo': {
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
        lastAt: 0,
        lastTag: null,
      };
    }

    case 'redo': {
      if (state.future.length === 0) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
        lastAt: 0,
        lastTag: null,
      };
    }

    default:
      return state;
  }
}

export function useSceneHistory(initial = []) {
  const [state, dispatch] = useReducer(reducer, initial, initialState);

  /**
   * Sahnani o'zgartiradi va tarixga yozadi.
   *
   * @param updater  Yangi ro'yxat yoki (prev) => yangi ro'yxat
   * @param options.tag  Birlashtirish kaliti (odatda obyekt id'si). Bir xil
   *                     tag bilan tez kelgan o'zgarishlar bitta qadam bo'ladi.
   */
  const setSceneObjects = useCallback((updater, options = {}) => {
    // Date.now() reducer ichida chaqirilsa reducer nopok bo'lardi, shuning
    // uchun vaqt tashqarida olinib, amal bilan birga uzatiladi.
    dispatch({ type: 'set', updater, tag: options.tag ?? null, now: Date.now() });
  }, []);

  /** Tarixni tozalab o'rnatish — fayldan yuklangan loyiha yangi boshlanish. */
  const resetSceneObjects = useCallback((value) => {
    dispatch({ type: 'reset', value });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  return useMemo(
    () => ({
      sceneObjects: state.present,
      setSceneObjects,
      resetSceneObjects,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [state.present, state.past.length, state.future.length, setSceneObjects, resetSceneObjects, undo, redo]
  );
}
