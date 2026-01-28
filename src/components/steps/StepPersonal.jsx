import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function StepPersonal({ data, onChange }) {
  const [showFullAddress, setShowFullAddress] = useState(
    !!(data.streetAddress || data.city || data.stateProvince || data.postalCode || data.country)
  );

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="What should I call you?"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
        <input
          type="text"
          value={data.location}
          onChange={e => onChange({ location: e.target.value })}
          placeholder="City, state/country"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
        />
        <p className="text-xs text-gray-400 mt-1">Helps tailor advice to your climate and seasons</p>
      </div>

      {/* Expandable full address section */}
      <div>
        <button
          type="button"
          onClick={() => setShowFullAddress(!showFullAddress)}
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
        >
          {showFullAddress ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showFullAddress ? 'Hide full address' : 'Add full address (optional)'}
        </button>

        {showFullAddress && (
          <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
              <input
                type="text"
                value={data.streetAddress || ''}
                onChange={e => onChange({ streetAddress: e.target.value })}
                placeholder="123 Main St, Apt 4B"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                <input
                  type="text"
                  value={data.city || ''}
                  onChange={e => onChange({ city: e.target.value })}
                  placeholder="Denver"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">State/Province</label>
                <input
                  type="text"
                  value={data.stateProvince || ''}
                  onChange={e => onChange({ stateProvince: e.target.value })}
                  placeholder="CO"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={data.postalCode || ''}
                  onChange={e => onChange({ postalCode: e.target.value })}
                  placeholder="80202"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                <input
                  type="text"
                  value={data.country || ''}
                  onChange={e => onChange({ country: e.target.value })}
                  placeholder="USA"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">Full address helps with local gym/facility recommendations</p>
          </div>
        )}
      </div>

      {/* Age and Sex - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Age</label>
          <input
            type="number"
            value={data.age}
            onChange={e => onChange({ age: e.target.value })}
            placeholder="Years"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Sex</label>
          <select
            value={data.sex}
            onChange={e => onChange({ sex: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white"
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Height and Weight - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Height</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={data.height}
              onChange={e => onChange({ height: e.target.value })}
              placeholder={data.heightUnit === 'cm' ? '175' : '69'}
              className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            />
            <select
              value={data.heightUnit}
              onChange={e => onChange({ heightUnit: e.target.value })}
              className="px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm flex-shrink-0"
            >
              <option value="in">in</option>
              <option value="cm">cm</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Weight</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={data.weight}
              onChange={e => onChange({ weight: e.target.value })}
              placeholder={data.weightUnit === 'kg' ? '75' : '165'}
              className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            />
            <select
              value={data.weightUnit}
              onChange={e => onChange({ weightUnit: e.target.value })}
              className="px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm flex-shrink-0"
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>
      </div>

      {/* Body Fat and Resting HR - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Body Fat % <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="number"
            value={data.bodyFat}
            onChange={e => onChange({ bodyFat: e.target.value })}
            placeholder="e.g., 20"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Resting HR <span className="text-gray-400 font-normal">(bpm)</span>
          </label>
          <input
            type="number"
            value={data.restingHeartRate}
            onChange={e => onChange({ restingHeartRate: e.target.value })}
            placeholder="e.g., 65"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
        </div>
      </div>

      {/* Occupation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
        <textarea
          value={data.occupation}
          onChange={e => onChange({ occupation: e.target.value })}
          placeholder="e.g., Software engineer, nurse, teacher..."
          rows={1}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all resize-none overflow-hidden"
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />
        <p className="text-xs text-gray-400 mt-1">Helps understand your daily demands and schedule</p>
      </div>

      {/* Income & Budget - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Income range</label>
          <select
            value={data.income}
            onChange={e => onChange({ income: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-sm"
          >
            <option value="">Select</option>
            <option value="under_30k">Under $30k</option>
            <option value="30k_60k">$30k–$60k</option>
            <option value="60k_100k">$60k–$100k</option>
            <option value="100k_150k">$100k–$150k</option>
            <option value="150k_plus">$150k+</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Health spending</label>
          <select
            value={data.budgetWillingness}
            onChange={e => onChange({ budgetWillingness: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white text-sm"
          >
            <option value="">Select</option>
            <option value="budget">Budget-conscious</option>
            <option value="moderate">Willing to invest some</option>
            <option value="generous">Happy to spend for quality</option>
            <option value="unlimited">Money isn't a factor</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Helps tailor recommendations</p>
        </div>
      </div>
    </div>
  );
}
