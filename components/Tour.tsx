import React, { useState, useEffect, useLayoutEffect } from 'react';
import { TourStep } from '../types';
import { ChevronRight, ChevronLeft, X, Circle } from 'lucide-react';

interface TourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
}

export const Tour: React.FC<TourProps> = ({ steps, isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Update rect when step changes or window resizes
  const updateRect = () => {
    const step = steps[currentStep];
    if (step.targetId) {
      const element = document.getElementById(step.targetId);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [isOpen, currentStep, steps]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Calculate Tooltip Position
  const getTooltipStyle = () => {
    if (!targetRect) {
      // Center if no target
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const gap = 16; // distance from target
    const tooltipWidth = 320; // approximate width
    
    // Default fallback
    let style: React.CSSProperties = { top: 0, left: 0 };

    switch (step.position) {
      case 'right':
        style = {
          top: targetRect.top + (targetRect.height / 2) - 100, // slightly offset up
          left: targetRect.right + gap,
        };
        break;
      case 'left':
        style = {
          top: targetRect.top + (targetRect.height / 2) - 100,
          left: targetRect.left - tooltipWidth - gap,
        };
        break;
      case 'bottom':
        style = {
          top: targetRect.bottom + gap,
          left: targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2),
        };
        break;
      case 'top':
        style = {
          bottom: (window.innerHeight - targetRect.top) + gap,
          left: targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2),
        };
        break;
      default:
         style = {
          top: targetRect.bottom + gap,
          left: targetRect.left,
        };
    }
    return style;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop with "hole" effect via clip-path would be complex dynamically. 
          We'll use a semi-transparent overlay and a "spotlight" border for simplicity/performance. */}
      <div className="absolute inset-0 bg-black/60 transition-colors duration-500" />

      {/* Highlight Box */}
      {targetRect && (
        <div 
          className="absolute border-2 border-white rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5),0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300 ease-out pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip Card */}
      <div 
        className="absolute bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-80 transition-all duration-300 animate-fadeIn"
        style={getTooltipStyle()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
             <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-xs font-bold">
               {currentStep + 1}
             </span>
             <h3 className="font-bold text-white text-lg">{step.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={16} />
          </button>
        </div>
        
        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
          {step.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-colors ${idx === currentStep ? 'bg-indigo-500' : 'bg-slate-700'}`} 
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};