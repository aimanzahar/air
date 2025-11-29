'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  UserIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  ShieldCheckIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface HealthProfileFormData {
  name?: string;
  age?: string;
  gender?: string;
  hasRespiratoryCondition: boolean;
  conditions: string[];
  conditionSeverity?: string;
  activityLevel?: string;
  outdoorExposure?: string;
  smokingStatus?: string;
  livesNearTraffic?: boolean;
  hasAirPurifier?: boolean;
  isPregnant?: boolean;
  hasHeartCondition?: boolean;
  medications: string[];
}

const RESPIRATORY_CONDITIONS = [
  'Asthma',
  'COPD',
  'Allergies',
  'Bronchitis',
  'Emphysema',
  'Pneumonia',
  'Sleep Apnea',
  'Other',
];

const MEDICATION_OPTIONS = [
  'Inhaler (SABA)',
  'Inhaler (ICS/LABA)',
  'Nebulizer',
  'Antihistamines',
  'Steroids',
  'Bronchodilators',
  'Oxygen Therapy',
  'Other',
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const AGE_OPTIONS = [
  { value: 'child', label: 'Child (0-12)', range: '0-12 years' },
  { value: 'teen', label: 'Teen (13-18)', range: '13-18 years' },
  { value: 'adult', label: 'Adult (19-64)', range: '19-64 years' },
  { value: 'senior', label: 'Senior (65+)', range: '65+ years' },
];

export default function HealthProfileForm({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const userKey = user?.email || '';

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');

  const [formData, setFormData] = useState<HealthProfileFormData>({
    name: '',
    age: '',
    gender: '',
    hasRespiratoryCondition: false,
    conditions: [],
    conditionSeverity: '',
    activityLevel: '',
    outdoorExposure: '',
    smokingStatus: '',
    livesNearTraffic: false,
    hasAirPurifier: false,
    isPregnant: false,
    hasHeartCondition: false,
    medications: [],
  });

  const saveHealthProfile = useMutation(api.healthProfile.saveHealthProfile);

  const steps = [
    { title: 'Basic Profile', icon: UserIcon },
    { title: 'Respiratory Health', icon: HeartIcon },
    { title: 'Lifestyle', icon: ExclamationTriangleIcon },
    { title: 'Living Environment', icon: HomeIcon },
    { title: 'Additional Health Info', icon: ShieldCheckIcon },
  ];

  const handleInputChange = (field: keyof HealthProfileFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleCondition = (condition: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter(c => c !== condition)
        : [...prev.conditions, condition],
    }));
  };

  const addCustomCondition = () => {
    if (newCondition.trim() && !formData.conditions.includes(newCondition.trim())) {
      setFormData(prev => ({
        ...prev,
        conditions: [...prev.conditions, newCondition.trim()],
      }));
      setNewCondition('');
    }
  };

  const toggleMedication = (medication: string) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.includes(medication)
        ? prev.medications.filter(m => m !== medication)
        : [...prev.medications, medication],
    }));
  };

  const addCustomMedication = () => {
    if (newMedication.trim() && !formData.medications.includes(newMedication.trim())) {
      setFormData(prev => ({
        ...prev,
        medications: [...prev.medications, newMedication.trim()],
      }));
      setNewMedication('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userKey) return;

    setIsSubmitting(true);
    try {
      await saveHealthProfile({
        userKey,
        ...formData,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Error saving health profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile Complete!</h2>
          <p className="text-slate-600 mb-6">
            Your health profile has been saved. We'll now provide personalized health insights based on your information.
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-200 border-t-purple-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Complete Your Health Profile</h2>
            <button
              onClick={onComplete}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isCompleted ? 'bg-emerald-500' : isActive ? 'bg-purple-500' : 'bg-slate-200'
                  } transition-colors`}>
                    <Icon className={`w-4 h-4 ${isCompleted || isActive ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <span className={`ml-2 text-xs font-medium ${
                    isActive ? 'text-purple-600' : isCompleted ? 'text-emerald-600' : 'text-slate-500'
                  } hidden sm:block`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step 1: Basic Profile */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Age Group <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AGE_OPTIONS.map(option => (
                    <label key={option.value} className="relative">
                      <input
                        type="radio"
                        name="age"
                        value={option.value}
                        checked={formData.age === option.value}
                        onChange={(e) => handleInputChange('age', e.target.value)}
                        className="sr-only peer"
                        required
                      />
                      <div className="px-3 py-2 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:bg-slate-50">
                        <div className="text-sm font-medium text-slate-900">{option.label}</div>
                        <div className="text-xs text-slate-500">{option.range}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.map(option => (
                    <label key={option.value} className="relative">
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        checked={formData.gender === option.value}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="sr-only peer"
                      />
                      <div className="px-3 py-2 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:bg-slate-50 text-center">
                        <div className="text-sm font-medium text-slate-900">{option.label}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Respiratory Health */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Respiratory Health Passport</h3>

              <div>
                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.hasRespiratoryCondition}
                    onChange={(e) => handleInputChange('hasRespiratoryCondition', e.target.checked)}
                    className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-medium text-slate-900">I have a respiratory condition</div>
                    <div className="text-sm text-slate-500">This helps us provide personalized air quality recommendations</div>
                  </div>
                </label>
              </div>

              {formData.hasRespiratoryCondition && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select your conditions
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {RESPIRATORY_CONDITIONS.map(condition => (
                        <label key={condition} className="relative">
                          <input
                            type="checkbox"
                            checked={formData.conditions.includes(condition)}
                            onChange={() => toggleCondition(condition)}
                            className="sr-only peer"
                          />
                          <div className="px-3 py-2 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:bg-slate-50 text-center">
                            <div className="text-sm font-medium text-slate-900">{condition}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Custom condition input */}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={newCondition}
                        onChange={(e) => setNewCondition(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCondition())}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Add custom condition"
                      />
                      <button
                        type="button"
                        onClick={addCustomCondition}
                        className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        <PlusIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {formData.conditions.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Condition Severity
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['mild', 'moderate', 'severe'].map(severity => (
                          <label key={severity} className="relative">
                            <input
                              type="radio"
                              name="severity"
                              value={severity}
                              checked={formData.conditionSeverity === severity}
                              onChange={(e) => handleInputChange('conditionSeverity', e.target.value)}
                              className="sr-only peer"
                            />
                            <div className="px-3 py-2 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:bg-slate-50 text-center">
                              <div className="text-sm font-medium text-slate-900 capitalize">{severity}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Current medications (if any)
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {MEDICATION_OPTIONS.map(medication => (
                        <label key={medication} className="relative">
                          <input
                            type="checkbox"
                            checked={formData.medications.includes(medication)}
                            onChange={() => toggleMedication(medication)}
                            className="sr-only peer"
                          />
                          <div className="px-3 py-2 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:bg-slate-50 text-center">
                            <div className="text-sm font-medium text-slate-900">{medication}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Custom medication input */}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomMedication())}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Add custom medication"
                      />
                      <button
                        type="button"
                        onClick={addCustomMedication}
                        className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        <PlusIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Lifestyle */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Lifestyle & Activities</h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Daily Activity Level <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'sedentary', label: 'Sedentary', desc: 'Mostly sitting' },
                    { value: 'light', label: 'Light', desc: 'Light activity' },
                    { value: 'moderate', label: 'Moderate', desc: 'Regular exercise' },
                    { value: 'active', label: 'Very Active', desc: 'Intense activity' },
                  ].map(option => (
                    <label key={option.value} className="relative">
                      <input
                        type="radio"
                        name="activityLevel"
                        value={option.value}
                        checked={formData.activityLevel === option.value}
                        onChange={(e) => handleInputChange('activityLevel', e.target.value)}
                        className="sr-only peer"
                        required
                      />
                      <div className="px-3 py-2 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:bg-slate-50">
                        <div className="text-sm font-medium text-slate-900">{option.label}</div>
                        <div className="text-xs text-slate-500">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Outdoor Exposure Time <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: 'low', label: 'Low', desc: 'Less than 1 hour/day' },
                    { value: 'medium', label: 'Medium', desc: '1-3 hours/day' },
                    { value: 'high', label: 'High', desc: 'More than 3 hours/day' },
                  ].map(option => (
                    <label key={option.value} className="relative">
                      <input
                        type="radio"
                        name="outdoorExposure"
                        value={option.value}
                        checked={formData.outdoorExposure === option.value}
                        onChange={(e) => handleInputChange('outdoorExposure', e.target.value)}
                        className="sr-only peer"
                        required
                      />
                      <div className="px-3 py-2 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:bg-slate-50">
                        <div className="text-sm font-medium text-slate-900">{option.label}</div>
                        <div className="text-xs text-slate-500">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Smoking Status
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: 'never', label: 'Never smoked' },
                    { value: 'former', label: 'Former smoker' },
                    { value: 'current', label: 'Current smoker' },
                  ].map(option => (
                    <label key={option.value} className="relative">
                      <input
                        type="radio"
                        name="smokingStatus"
                        value={option.value}
                        checked={formData.smokingStatus === option.value}
                        onChange={(e) => handleInputChange('smokingStatus', e.target.value)}
                        className="sr-only peer"
                      />
                      <div className="px-3 py-2 border-2 rounded-lg cursor-pointer transition-all peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:bg-slate-50">
                        <div className="text-sm font-medium text-slate-900">{option.label}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Living Environment */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Living Environment</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.livesNearTraffic}
                    onChange={(e) => handleInputChange('livesNearTraffic', e.target.checked)}
                    className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-medium text-slate-900">I live near heavy traffic</div>
                    <div className="text-sm text-slate-500">Within 500 meters of major roads or highways</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.hasAirPurifier}
                    onChange={(e) => handleInputChange('hasAirPurifier', e.target.checked)}
                    className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-medium text-slate-900">I use an air purifier</div>
                    <div className="text-sm text-slate-500">Indoor air filtration device at home or work</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 5: Additional Health Info */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Additional Health Information</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isPregnant}
                    onChange={(e) => handleInputChange('isPregnant', e.target.checked)}
                    className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-medium text-slate-900">I am pregnant</div>
                    <div className="text-sm text-slate-500">For specialized air quality recommendations</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.hasHeartCondition}
                    onChange={(e) => handleInputChange('hasHeartCondition', e.target.checked)}
                    className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-medium text-slate-900">I have a heart condition</div>
                    <div className="text-sm text-slate-500">Heart disease, hypertension, or other cardiovascular issues</div>
                  </div>
                </label>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Why we collect this information</p>
                    <p>
                      Your health profile helps us provide personalized air quality recommendations and alerts.
                      This information is kept secure and private, and used only to generate health insights
                      tailored to your specific needs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !formData.age || !formData.activityLevel || !formData.outdoorExposure}
                className="px-6 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Complete Profile'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}