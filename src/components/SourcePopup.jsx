import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, ExternalLink, BookOpen, Building2, Newspaper, FlaskConical } from 'lucide-react';

/**
 * Source quality tiers for display
 */
const SOURCE_TIERS = {
  'peer-reviewed': {
    label: 'Peer-reviewed research',
    icon: FlaskConical,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Published in a peer-reviewed scientific journal',
  },
  'institution': {
    label: 'Medical institution',
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'From a reputable medical or health organization',
  },
  'guidelines': {
    label: 'Official guidelines',
    icon: BookOpen,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Based on official dietary or health guidelines',
  },
  'expert': {
    label: 'Expert opinion',
    icon: Newspaper,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Based on expert consensus (not peer-reviewed)',
    disclaimer: 'Note: This source is not peer-reviewed',
  },
};

/**
 * Single source item display
 */
function SourceItem({ source }) {
  const tier = SOURCE_TIERS[source.tier] || SOURCE_TIERS['institution'];
  const TierIcon = tier.icon;

  return (
    <div className={`p-3 rounded-lg border ${tier.borderColor} ${tier.bgColor}`}>
      <div className="flex items-start gap-2 mb-2">
        <TierIcon size={16} className={tier.color} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">{source.name}</p>
          <p className={`text-xs ${tier.color}`}>{tier.label}</p>
        </div>
      </div>

      {source.summary && (
        <p className="text-xs text-gray-600 mb-2">{source.summary}</p>
      )}

      {source.quote && (
        <blockquote className="text-xs text-gray-500 italic border-l-2 border-gray-300 pl-2 mb-2">
          "{source.quote}"
        </blockquote>
      )}

      {tier.disclaimer && (
        <p className="text-xs text-amber-600 italic mb-2">{tier.disclaimer}</p>
      )}

      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 hover:underline"
        >
          View source <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}

/**
 * Source popup component with question mark trigger
 */
export default function SourcePopup({
  sources = [],
  rationale,
  profileContext,
  title,
  size = 'sm',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef(null);
  const triggerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-0.5 text-gray-400 hover:text-primary-500 transition-colors rounded-full hover:bg-primary-50"
        aria-label="View source information"
      >
        <HelpCircle size={iconSize} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setIsOpen(false)} />

          {/* Popup */}
          <div
            ref={popupRef}
            className="absolute z-50 w-80 max-w-[90vw] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden
              bottom-full mb-2 left-1/2 -translate-x-1/2
              sm:bottom-auto sm:top-full sm:mt-2"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">
                {title || 'Source Information'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {/* Personalized rationale */}
              {rationale && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Why this applies to you
                  </p>
                  <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <p className="text-sm text-gray-700">{rationale}</p>
                    {profileContext && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Based on: {profileContext}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Sources */}
              {sources.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {sources.length === 1 ? 'Source' : 'Sources'}
                  </p>
                  <div className="space-y-2">
                    {sources.map((source, idx) => (
                      <SourceItem key={idx} source={source} />
                    ))}
                  </div>
                </div>
              )}

              {/* Placeholder when no sources */}
              {sources.length === 0 && !rationale && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Source information will be available when your profile is analyzed.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </span>
  );
}

/**
 * Common sources database - reusable across the app
 */
export const COMMON_SOURCES = {
  proteinRDA: {
    name: 'Dietary Reference Intakes for Protein',
    tier: 'institution',
    summary: 'Institute of Medicine recommends 0.8g protein per kg body weight for adults.',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK56068/',
  },
  proteinAthletes: {
    name: 'Journal of the International Society of Sports Nutrition',
    tier: 'peer-reviewed',
    summary: 'Active individuals and athletes benefit from 1.4-2.0g protein per kg body weight.',
    quote: 'Higher protein intakes (2.3-3.1 g/kg) may be needed during caloric restriction to preserve lean mass.',
    url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8',
  },
  usdaGuidelines: {
    name: 'USDA Dietary Guidelines for Americans',
    tier: 'guidelines',
    summary: 'Official federal dietary guidance updated every 5 years.',
    url: 'https://www.dietaryguidelines.gov/',
  },
  nihVitaminD: {
    name: 'NIH Office of Dietary Supplements - Vitamin D',
    tier: 'institution',
    summary: 'Comprehensive fact sheet on Vitamin D requirements and sources.',
    url: 'https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/',
  },
  nihIron: {
    name: 'NIH Office of Dietary Supplements - Iron',
    tier: 'institution',
    summary: 'Recommended daily allowances and food sources for iron.',
    url: 'https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/',
  },
  mayoClinicCalories: {
    name: 'Mayo Clinic - Calorie Calculator',
    tier: 'institution',
    summary: 'Evidence-based calorie needs estimation based on activity level.',
    url: 'https://www.mayoclinic.org/healthy-lifestyle/nutrition-and-healthy-eating/',
  },
  acsm: {
    name: 'American College of Sports Medicine',
    tier: 'institution',
    summary: 'Position stand on nutrition and athletic performance.',
    url: 'https://www.acsm.org/',
  },
  harvardNutritionSource: {
    name: 'Harvard T.H. Chan School of Public Health - The Nutrition Source',
    tier: 'institution',
    summary: 'Evidence-based nutrition information from Harvard researchers.',
    url: 'https://www.hsph.harvard.edu/nutritionsource/',
  },
};

/**
 * Helper to generate personalized rationale based on profile
 */
export function generateRationale(type, profile) {
  const parts = [];

  if (profile?.weight && profile?.weightUnit) {
    parts.push(`weight: ${profile.weight} ${profile.weightUnit}`);
  }
  if (profile?.age) {
    parts.push(`age: ${profile.age}`);
  }
  if (profile?.sex) {
    parts.push(`sex: ${profile.sex}`);
  }
  if (profile?.activityLevel) {
    parts.push(`activity: ${profile.activityLevel}`);
  }
  if (profile?.goals && Array.isArray(profile.goals) && profile.goals.length) {
    parts.push(`goals: ${profile.goals.join(', ')}`);
  }

  const profileContext = parts.length > 0 ? parts.join(', ') : null;

  switch (type) {
    case 'protein':
      if (Array.isArray(profile?.goals) && profile.goals.some(g => g.toLowerCase().includes('muscle'))) {
        return {
          rationale: `Based on your goal of building muscle and your current weight, you need higher protein intake than the general RDA. Research shows 1.6-2.2g per kg body weight optimizes muscle protein synthesis for resistance-trained individuals.`,
          profileContext,
        };
      }
      return {
        rationale: `Your protein needs are calculated based on your weight, activity level, and health goals. Active individuals typically need more than the baseline RDA of 0.8g/kg.`,
        profileContext,
      };

    case 'calories':
      return {
        rationale: `Your estimated calorie needs factor in your basal metabolic rate (based on age, sex, height, weight) plus your activity level and goals. This is a starting point - adjust based on how your body responds.`,
        profileContext,
      };

    case 'iron':
      if (profile?.sex === 'Female' || profile?.sex === 'female') {
        return {
          rationale: `As a woman, your iron needs are higher than men's due to menstrual losses. The RDA for women ages 19-50 is 18mg/day, compared to 8mg for men.`,
          profileContext,
        };
      }
      return {
        rationale: `Iron needs vary by age and sex. Regular monitoring through blood work can help identify if supplementation is needed.`,
        profileContext,
      };

    default:
      return { rationale: null, profileContext };
  }
}
