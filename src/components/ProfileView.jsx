/**
 * ProfileView - Display and edit user profile information
 * Shows personal info, goals, exercise preferences, and learned insights
 */

import { useState, useEffect } from 'react';
import {
  User,
  Edit3,
  ChevronRight,
  Target,
  Dumbbell,
  Utensils,
  MapPin,
  Calendar,
  Ruler,
  Scale,
  Brain,
  Heart,
  Coffee,
  Home,
  Sparkles,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import LearnedInsights from './LearnedInsights';
import { getRecentCheckIns, formatWeekOf } from '../checkInStore';

export default function ProfileView({
  profile,
  onEditProfile,
  onNavigateToChat,
}) {
  const [showAllInsights, setShowAllInsights] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!profile) {
    return (
      <div className="flex-1 bg-gray-50/50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <User size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No profile found</p>
            <button
              onClick={onEditProfile}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Format exercise data
  const exercises = [];
  if (profile.exerciseTypes) {
    for (const [type, freq] of Object.entries(profile.exerciseTypes)) {
      if (freq && freq !== 'none') {
        exercises.push({ type, frequency: freq });
      }
    }
  }

  // Format goals
  const goals = [];
  if (profile.primaryGoal) goals.push(profile.primaryGoal);
  if (profile.secondaryGoals?.length) {
    goals.push(...profile.secondaryGoals);
  }

  return (
    <div className="bg-gray-50/50 pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <button
            onClick={onEditProfile}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Edit3 size={16} />
            Edit Profile
          </button>
        </div>

        {/* Personal Info Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-900">Personal Info</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={User} label="Name" value={profile.name} />
            <InfoItem icon={Calendar} label="Age" value={profile.age ? `${profile.age} years` : null} />
            <InfoItem icon={Ruler} label="Height" value={formatHeight(profile.height)} />
            <InfoItem icon={Scale} label="Weight" value={profile.weight ? `${profile.weight} lbs` : null} />
            <InfoItem icon={MapPin} label="Location" value={profile.location} />
          </div>
        </div>

        {/* Goals Card */}
        {goals.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Target size={18} className="text-emerald-600" />
              <h2 className="font-semibold text-gray-900">Goals</h2>
            </div>

            <div className="space-y-2">
              {goals.map((goal, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ChevronRight size={12} className="text-emerald-600" />
                  </div>
                  <span className="text-gray-700">{goal}</span>
                </div>
              ))}
            </div>

            {profile.targetWeight && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Target weight: </span>
                <span className="text-sm font-medium text-gray-700">{profile.targetWeight} lbs</span>
              </div>
            )}
          </div>
        )}

        {/* Exercise Card */}
        {exercises.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell size={18} className="text-blue-600" />
              <h2 className="font-semibold text-gray-900">Exercise</h2>
            </div>

            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-gray-700 capitalize">{formatExerciseType(ex.type)}</span>
                  <span className="text-sm text-gray-500">{formatFrequency(ex.frequency)}</span>
                </div>
              ))}
            </div>

            {profile.fitnessLevel && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Fitness level: </span>
                <span className="text-sm font-medium text-gray-700 capitalize">{profile.fitnessLevel}</span>
              </div>
            )}
          </div>
        )}

        {/* Nutrition Card */}
        {(profile.dietaryRestrictions?.length > 0 || profile.mealCadence) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Utensils size={18} className="text-orange-600" />
              <h2 className="font-semibold text-gray-900">Nutrition</h2>
            </div>

            {profile.mealCadence && (
              <div className="mb-3">
                <span className="text-sm text-gray-500">Meal cadence: </span>
                <span className="text-sm text-gray-700">{profile.mealCadence}</span>
              </div>
            )}

            {profile.dietaryRestrictions?.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">Dietary restrictions: </span>
                <span className="text-sm text-gray-700">{profile.dietaryRestrictions.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Sleep & Stress Card */}
        {(profile.sleepHours || profile.stressLevel) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Heart size={18} className="text-violet-600" />
              <h2 className="font-semibold text-gray-900">Wellbeing</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {profile.sleepHours && (
                <div>
                  <span className="text-sm text-gray-500">Sleep: </span>
                  <span className="text-sm text-gray-700">{profile.sleepHours} hours/night</span>
                </div>
              )}
              {profile.stressLevel && (
                <div>
                  <span className="text-sm text-gray-500">Stress: </span>
                  <span className="text-sm text-gray-700 capitalize">{profile.stressLevel}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Learned Insights Section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-600" />
              <h2 className="font-semibold text-gray-900">What I've Learned About You</h2>
            </div>
          </div>

          <LearnedInsights
            compact={!showAllInsights}
            maxItems={showAllInsights ? undefined : 5}
            onNavigateToChat={onNavigateToChat}
          />

          <button
            onClick={() => setShowAllInsights(!showAllInsights)}
            className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {showAllInsights ? 'Show less' : 'See all insights'}
          </button>
        </div>

        {/* Past Weekly Check-ins Section */}
        <PastCheckIns />

        {/* Bottom spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}

// Helper component for info items
function InfoItem({ icon: Icon, label, value }) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-gray-400" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-700">{value}</p>
      </div>
    </div>
  );
}

// Format height from inches to ft'in"
function formatHeight(inches) {
  if (!inches) return null;
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
}

// Format exercise type for display
function formatExerciseType(type) {
  const labels = {
    weightlifting: 'Weightlifting',
    running: 'Running',
    yoga: 'Yoga',
    swimming: 'Swimming',
    cycling: 'Cycling',
    hiit: 'HIIT',
    walking: 'Walking',
    sports: 'Sports',
    pilates: 'Pilates',
    dance: 'Dance',
  };
  return labels[type] || type;
}

// Format frequency for display
function formatFrequency(freq) {
  const labels = {
    daily: 'Daily',
    '5-6x': '5-6x/week',
    '3-4x': '3-4x/week',
    '1-2x': '1-2x/week',
    occasionally: 'Occasionally',
    none: 'None',
  };
  return labels[freq] || freq;
}

// Past Check-ins component
function PastCheckIns() {
  const checkIns = getRecentCheckIns(8);

  if (checkIns.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardCheck size={18} className="text-indigo-600" />
          <h2 className="font-semibold text-gray-900">Weekly Check-ins</h2>
        </div>
        <p className="text-sm text-gray-500">No check-ins yet. Complete your first weekly check-in on Sunday!</p>
      </div>
    );
  }

  // Get trend icon based on mood/energy comparison
  function getTrendIcon(current, previous) {
    if (!previous) return null;
    const currentVal = parseInt(current) || 0;
    const prevVal = parseInt(previous) || 0;
    if (currentVal > prevVal) return <TrendingUp size={12} className="text-emerald-500" />;
    if (currentVal < prevVal) return <TrendingDown size={12} className="text-red-400" />;
    return <Minus size={12} className="text-gray-400" />;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck size={18} className="text-indigo-600" />
        <h2 className="font-semibold text-gray-900">Weekly Check-ins</h2>
        <span className="text-xs text-gray-400 ml-auto">{checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-3">
        {checkIns.slice(0, 4).map((checkIn, idx) => {
          const prevCheckIn = checkIns[idx + 1];
          return (
            <div key={checkIn.id} className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Week of {formatWeekOf(checkIn.weekOf)}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(checkIn.date).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                {checkIn.mood && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Mood:</span>
                    <span className="font-medium text-gray-700">{checkIn.mood}/5</span>
                    {getTrendIcon(checkIn.mood, prevCheckIn?.mood)}
                  </div>
                )}
                {checkIn.energyLevel && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Energy:</span>
                    <span className="font-medium text-gray-700">{checkIn.energyLevel}/5</span>
                    {getTrendIcon(checkIn.energyLevel, prevCheckIn?.energyLevel)}
                  </div>
                )}
                {checkIn.activitiesCount > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Activities:</span>
                    <span className="font-medium text-gray-700">{checkIn.activitiesCount}</span>
                  </div>
                )}
              </div>

              {checkIn.wins && (
                <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                  Win: {checkIn.wins.length > 60 ? checkIn.wins.slice(0, 60) + '...' : checkIn.wins}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {checkIns.length > 4 && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          + {checkIns.length - 4} more check-in{checkIns.length - 4 !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
