import { useState } from 'react';
import { X } from 'lucide-react';
import StepPersonal from './steps/StepPersonal';
import StepLifestyle from './steps/StepLifestyle';
import StepSleep from './steps/StepSleep';
import StepStress from './steps/StepStress';
import StepHydration from './steps/StepHydration';
import StepTraining from './steps/StepTraining';
import StepNutrition from './steps/StepNutrition';
import StepBehavioral from './steps/StepBehavioral';
import StepGoals from './steps/StepGoals';

const SECTION_COMPONENTS = {
  personal: StepPersonal,
  lifestyle: StepLifestyle,
  sleep: StepSleep,
  stress: StepStress,
  hydration: StepHydration,
  training: StepTraining,
  nutrition: StepNutrition,
  behavioral: StepBehavioral,
  goals: StepGoals,
};

const SECTION_TITLES = {
  personal: 'Personal',
  lifestyle: 'Lifestyle',
  sleep: 'Sleep & Recovery',
  stress: 'Stress & Mental Health',
  hydration: 'Hydration',
  training: 'Training',
  nutrition: 'Nutrition',
  behavioral: 'Behavioral',
  goals: 'Goals',
};

export default function EditModal({ section, profile, onSave, onClose }) {
  const [editData, setEditData] = useState({ ...profile });

  const StepComponent = SECTION_COMPONENTS[section];
  if (!StepComponent) return null;

  function handleChange(fields) {
    setEditData(prev => ({ ...prev, ...fields }));
  }

  function handleSave() {
    onSave(editData);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Edit {SECTION_TITLES[section]}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <StepComponent data={editData} onChange={handleChange} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
