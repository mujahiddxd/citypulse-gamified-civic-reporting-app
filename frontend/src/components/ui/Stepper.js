import React, { useState, Children } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Step = ({ children }) => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
      {children}
    </div>
  );
};

export default function Stepper({
  initialStep = 1,
  onStepChange,
  onFinalStepCompleted,
  backButtonText = "Previous",
  nextButtonText = "Next",
  children,
  disableStepIndicators = false
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(1);

  const steps = Children.toArray(children);
  const totalSteps = steps.length;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
      if (onStepChange) onStepChange(currentStep + 1);
    } else {
      if (onFinalStepCompleted) onFinalStepCompleted();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
      if (onStepChange) onStepChange(currentStep - 1);
    }
  };

  const variants = {
    initial: (dir) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
  };

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '800px', 
      margin: '0 auto', background: '#ffffff', border: '3px solid #111111', 
      borderRadius: '16px', padding: '2rem', boxShadow: '8px 8px 0px #111111' 
    }}>
      
      {!disableStepIndicators && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', marginBottom: '2rem' }}>
          {steps.map((_, idx) => (
            <div 
              key={idx} 
              style={{
                width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #111',
                background: currentStep === idx + 1 ? 'var(--accent)' : currentStep > idx + 1 ? 'var(--primary-blue)' : '#e5e7eb',
                transition: 'all 0.3s'
              }} 
            />
          ))}
        </div>
      )}

      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ width: '100%' }}
          >
            {steps[currentStep - 1]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
        <button 
          onClick={handleBack} 
          disabled={currentStep === 1}
          style={{ 
            opacity: currentStep === 1 ? 0 : 1, 
            pointerEvents: currentStep === 1 ? 'none' : 'auto', 
            background: '#e0e0e0', color: '#111',
            padding: '0.75rem 1.5rem', borderRadius: '8px', border: '2px solid #111',
            fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          {backButtonText}
        </button>
        <button 
          onClick={handleNext}
          style={{
            background: currentStep === totalSteps ? '#10B981' : 'var(--primary-blue)', 
            color: 'white',
            padding: '0.75rem 1.5rem', borderRadius: '8px', border: '2px solid #111',
            fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          {currentStep === totalSteps ? 'Finish Tutorial' : nextButtonText}
        </button>
      </div>
    </div>
  );
}
