/**
 * Onboarding Page with DPA Step
 * Route: /onboarding
 * Ticket: REMY-257
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  Circle, 
  Shield, 
  User, 
  Settings,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import DpaStep from './DpaStep';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<{ onComplete: () => void; onSkip?: () => void; userId: string }>;
}

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string>('mock-user-id');
  const [loading, setLoading] = useState(true);

  // Check if user has already completed onboarding or has DPA
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Check if DPA is already signed
      const dpaRes = await fetch('/api/v1/dpa', {
        headers: { 'Authorization': `Bearer ${userId}` },
      });
      const dpaData = await dpaRes.json();

      if (dpaData.success && dpaData.data?.hasSignedDpa) {
        // Skip DPA step if already signed
        setCompletedSteps(prev => new Set([...prev, 'dpa']));
        setCurrentStep(1);
      }
    } catch (err) {
      console.error('Failed to check onboarding status:', err);
    } finally {
      setLoading(false);
    }
  };

  const steps: OnboardingStep[] = [
    {
      id: 'dpa',
      title: 'Data Processing Agreement',
      description: 'Review and sign GDPR Article 28 compliant DPA',
      icon: <Shield className="w-5 h-5" />,
      component: DpaStep,
    },
    {
      id: 'profile',
      title: 'Complete Profile',
      description: 'Add your organization details',
      icon: <User className="w-5 h-5" />,
      component: ({ onComplete }) => (
        <div className="max-w-2xl mx-auto py-12 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-6">Profile setup placeholder. In production, this would collect organization details.</p>
          <button
            onClick={onComplete}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </div>
      ),
    },
    {
      id: 'projects',
      title: 'Create First Project',
      description: 'Set up your first analytics project',
      icon: <Briefcase className="w-5 h-5" />,
      component: ({ onComplete }) => (
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-6">You're ready to create your first project!</p>
          <button
            onClick={onComplete}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Complete Onboarding
          </button>
        </div>
      ),
    },
  ];

  const handleStepComplete = () => {
    const currentStepId = steps[currentStep].id;
    setCompletedSteps(prev => new Set([...prev, currentStepId]));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // All steps complete - redirect to dashboard
      navigate('/dashboard');
    }
  };

  const handleSkip = () => {
    // Skip current step (except DPA which is required)
    if (steps[currentStep].id === 'dpa') {
      // DPA cannot be skipped - show alert
      alert('The Data Processing Agreement is required before you can create projects.');
      return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      navigate('/dashboard');
    }
  };

  const goToStep = (index: number) => {
    // Can only navigate to completed steps or the current step
    if (index <= currentStep || completedSteps.has(steps[index].id)) {
      setCurrentStep(index);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">REMY Analytics</span>
          </div>
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = index === currentStep;
              const isClickable = index <= currentStep || isCompleted;

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => isClickable && goToStep(index)}
                    disabled={!isClickable}
                    className={`flex flex-col items-center transition-all ${
                      isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                        isCompleted
                          ? 'bg-green-100 text-green-600'
                          : isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : step.icon}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isCompleted
                          ? 'text-green-600'
                          : isCurrent
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.title}
                    </span>
                  </button>

                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-colors ${
                        isCompleted ? 'bg-green-300' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px]">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                {steps[currentStep].icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{steps[currentStep].title}</h2>
                <p className="text-gray-600">{steps[currentStep].description}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <CurrentStepComponent
              onComplete={handleStepComplete}
              onSkip={steps[currentStep].id !== 'dpa' ? handleSkip : undefined}
              userId={userId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
