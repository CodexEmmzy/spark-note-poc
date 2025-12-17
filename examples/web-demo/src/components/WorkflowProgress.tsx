import React from 'react';
import './WorkflowProgress.css';

type Step = 'idle' | 'created' | 'nullifier' | 'spent' | 'verified';

interface WorkflowProgressProps {
  currentStep: Step;
}

const steps: Array<{ key: Step; label: string; number: number }> = [
  { key: 'idle', label: 'Create Note', number: 1 },
  { key: 'created', label: 'Generate Nullifier', number: 2 },
  { key: 'nullifier', label: 'Mark as Spent', number: 3 },
  { key: 'spent', label: 'Verify', number: 4 },
];

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ currentStep }) => {
  const getStepStatus = (stepKey: Step): 'pending' | 'active' | 'completed' => {
    const stepIndex = steps.findIndex(s => s.key === stepKey);
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <nav className="workflow" aria-label="Workflow progress">
      <ol className="workflow__list">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);
          const isLast = index === steps.length - 1;
          
          return (
            <li key={step.key} className="workflow__item">
              <div className={`workflow__step workflow__step--${status}`}>
                <div className="workflow__indicator">
                  {status === 'completed' ? (
                    <svg className="workflow__check" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <span className="workflow__number">{step.number}</span>
                  )}
                </div>
                <span className="workflow__label">{step.label}</span>
              </div>
              {!isLast && (
                <div className={`workflow__connector workflow__connector--${status === 'completed' ? 'completed' : 'pending'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

