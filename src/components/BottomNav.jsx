import { Home, MessageCircle, Salad, Dumbbell } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'advisor', label: 'Advisor', icon: MessageCircle },
  { id: 'nutrition', label: 'Nutrition', icon: Salad },
  { id: 'training', label: 'Training', icon: Dumbbell },
];

export default function BottomNav({ currentView, onNavigate }) {
  // Map old view names to new ones for compatibility
  const normalizedView = currentView === 'dashboard' ? 'home' : currentView;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 safe-area-bottom"
      data-testid="bottom-nav"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto" role="menubar">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = normalizedView === item.id ||
            (item.id === 'advisor' && ['chat', 'bookmarks', 'activity'].includes(normalizedView));

          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              role="menuitem"
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'mb-0.5' : 'mb-0.5'}
                aria-hidden="true"
              />
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
