import { create } from "zustand";
import { ProjectElement } from "./projectStore";

export interface ValidationRule {
  id: string;
  description: string;
  type: "element_count" | "property_value" | "connection";
  targetType: "chassis" | "wheel" | "axle";
  count?: number;
  propertyName?: keyof ProjectElement;
  min?: number;
  max?: number;
}

export interface LessonStep {
  title: string;
  description: string;
  validationRules: ValidationRule[];
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  steps: LessonStep[];
}

interface TutorialState {
  lessons: Lesson[];
  currentLessonId: string | null;
  currentStepIndex: number;
  validationResults: Record<string, boolean>; // ruleId -> boolean
  isStepValid: boolean;
  
  loadLessons: (lessonsList: Lesson[]) => void;
  selectLesson: (lessonId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  runValidation: (elements: ProjectElement[]) => void;
  resetProgress: () => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  lessons: [],
  currentLessonId: null,
  currentStepIndex: 0,
  validationResults: {},
  isStepValid: false,

  loadLessons: (lessonsList) => {
    set({ lessons: lessonsList });
    if (lessonsList.length > 0 && !get().currentLessonId) {
      get().selectLesson(lessonsList[0].id);
    }
  },

  selectLesson: (lessonId) => {
    set({ 
      currentLessonId: lessonId,
      currentStepIndex: 0,
      validationResults: {},
      isStepValid: false
    });
  },

  nextStep: () => {
    const { currentLessonId, currentStepIndex, lessons } = get();
    if (!currentLessonId) return;
    const lesson = lessons.find(l => l.id === currentLessonId);
    if (lesson && currentStepIndex < lesson.steps.length - 1) {
      set({ 
        currentStepIndex: currentStepIndex + 1,
        validationResults: {},
        isStepValid: false
      });
    }
  },

  prevStep: () => {
    const { currentLessonId, currentStepIndex } = get();
    if (!currentLessonId) return;
    if (currentStepIndex > 0) {
      set({ 
        currentStepIndex: currentStepIndex - 1,
        validationResults: {},
        isStepValid: false
      });
    }
  },

  runValidation: (elements) => {
    const { currentLessonId, currentStepIndex, lessons } = get();
    if (!currentLessonId) return;
    
    const lesson = lessons.find(l => l.id === currentLessonId);
    if (!lesson) return;
    
    const step = lesson.steps[currentStepIndex];
    if (!step) return;
    
    const results: Record<string, boolean> = {};
    let allValid = true;
    
    step.validationRules.forEach((rule) => {
      let rulePassed = false;
      
      if (rule.type === "element_count") {
        const matchingCount = elements.filter(el => el.type === rule.targetType).length;
        rulePassed = matchingCount >= (rule.count || 1);
      } 
      else if (rule.type === "property_value" && rule.propertyName) {
        const matchingElements = elements.filter(el => el.type === rule.targetType);
        
        if (matchingElements.length > 0) {
          // Check if all elements of targetType satisfy the property boundaries
          rulePassed = matchingElements.every((el) => {
            const val = el[rule.propertyName!];
            if (typeof val === "number") {
              const meetsMin = rule.min === undefined || val >= rule.min;
              const meetsMax = rule.max === undefined || val <= rule.max;
              return meetsMin && meetsMax;
            }
            return false;
          });
        } else {
          rulePassed = false; // No matching elements to validate
        }
      }
      
      results[rule.id] = rulePassed;
      if (!rulePassed) {
        allValid = false;
      }
    });
    
    set({
      validationResults: results,
      isStepValid: allValid
    });
  },

  resetProgress: () => {
    set({
      currentStepIndex: 0,
      validationResults: {},
      isStepValid: false
    });
  }
}));
export type { Lesson as StoreLesson, LessonStep as StoreLessonStep, ValidationRule as StoreValidationRule };
