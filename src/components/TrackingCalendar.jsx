import { useState } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, UtensilsCrossed, Scale, Heart } from 'lucide-react';

const TYPE_ICONS = { weight: Scale, workout: Dumbbell, meal: UtensilsCrossed, feeling: Heart };
const TYPE_COLORS = { weight: 'bg-purple-400', workout: 'bg-blue-400', meal: 'bg-green-400', feeling: 'bg-amber-400' };

export default function TrackingCalendar({ entries }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }
  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  // Group entries by date string
  const entriesByDate = {};
  entries.forEach(e => {
    const key = new Date(e.date).toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (!entriesByDate[key]) entriesByDate[key] = [];
    entriesByDate[key].push(e);
  });

  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const selectedKey = selectedDate ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}` : null;
  const selectedEntries = selectedKey ? (entriesByDate[selectedKey] || []) : [];

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-sm font-semibold text-gray-800">{monthName}</h3>
        <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEntries = entriesByDate[dateKey] || [];
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const isSelected = day === selectedDate;
          const types = [...new Set(dayEntries.map(e => e.type))];

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(day === selectedDate ? null : day)}
              className={`relative p-1.5 rounded-lg text-sm transition-all ${
                isSelected ? 'bg-primary-100 text-primary-700 font-semibold' :
                isToday ? 'bg-gray-100 font-semibold text-gray-800' :
                'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="block text-center">{day}</span>
              {types.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {types.slice(0, 4).map(t => (
                    <div key={t} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[t]}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day details */}
      {selectedDate && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {new Date(year, month, selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </h4>
          {selectedEntries.length === 0 ? (
            <p className="text-xs text-gray-400">No entries this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEntries.map(entry => {
                const Icon = TYPE_ICONS[entry.type] || Heart;
                return (
                  <div key={entry.id} className="flex items-start gap-2 text-sm">
                    <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-gray-800">{formatEntry(entry)}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {new Date(entry.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatEntry(entry) {
  switch (entry.type) {
    case 'weight':
      return `${entry.value} ${entry.unit || 'lbs'}`;
    case 'workout':
      return `${entry.workoutType}${entry.duration ? ` · ${entry.duration} min` : ''}${entry.notes ? ` — ${entry.notes}` : ''}`;
    case 'meal':
      return entry.description;
    case 'feeling':
      return `Energy ${entry.energy}/10 · Motivation ${entry.motivation}/10 · ${entry.mood}${entry.notes ? ` — ${entry.notes}` : ''}`;
    default:
      return JSON.stringify(entry);
  }
}
