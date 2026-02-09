import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  ShoppingCart,
  TrendingUp,
  Lightbulb,
  History,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Check,
  ArrowRight,
  PieChart,
  Plus,
  X,
  Search,
  Sparkles,
  Trophy,
  Star,
  Camera,
} from 'lucide-react';
import {
  getGroceryData,
  addGroceryOrder,
  updatePatterns,
  updateRecommendations,
  updateHabitsAndWins,
  getFrequentItems,
  getRecentOrders,
  formatOrderDate,
  getHabitsFormed,
  getWins,
} from '../groceryStore';
import { getPendingSuggestions } from '../playbookSuggestionsStore';
import { recordSwapPurchase, getActiveSwaps, getSwaps, logSwap, detectCategory, SWAP_STATUS, SWAP_SOURCES, activatePendingSwap } from '../swapStore';
import GrocerySwaps from './GrocerySwaps';
import DailyNutritionProfile from './DailyNutritionProfile';

const SOURCES = ['Shipt', 'Instacart', 'Amazon Fresh', 'Walmart', 'Costco', 'Kroger', 'Other'];

export default function Nutrition({ profile, playbook, onGroceryDataChange, onPlaybookSuggestion, onSuggestionCountChange, initialSection, onSectionClear }) {
  const [groceryData, setGroceryData] = useState(getGroceryData());
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualItems, setManualItems] = useState('');
  const [selectedSource, setSelectedSource] = useState('Shipt');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [swapNotification, setSwapNotification] = useState(null);
  const [selectedAlternatives, setSelectedAlternatives] = useState({});
  const [selectedSmartSwaps, setSelectedSmartSwaps] = useState({});
  const [swapToast, setSwapToast] = useState(null);
  const [swapsRefreshKey, setSwapsRefreshKey] = useState(0);
  const fileInputRef = useRef(null);
  const swapsSectionRef = useRef(null);

  // Scroll to top on mount, or to swaps section if navigated with initialSection='swaps'
  useEffect(() => {
    if (initialSection === 'swaps' && swapsSectionRef.current) {
      setTimeout(() => {
        swapsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        onSectionClear?.();
      }, 100);
    } else {
      // Scroll to top of page on mount
      window.scrollTo(0, 0);
    }
  }, [initialSection, onSectionClear]);

  const frequentItems = getFrequentItems(10);
  const recentOrders = getRecentOrders(10);
  const hasData = groceryData.allItems && groceryData.allItems.length > 0;

  // Check grocery items against active swaps
  function checkSwapsInPurchase(items) {
    const notifications = { confirmed: [], potentialReverts: [], pendingPurchased: [] };

    for (const item of items) {
      const result = recordSwapPurchase(item);
      if (result) {
        if (result.type === 'confirmed') {
          notifications.confirmed.push(result.swap);
        } else if (result.type === 'potential_revert') {
          notifications.potentialReverts.push(result.swap);
        } else if (result.type === 'pending_purchased') {
          notifications.pendingPurchased.push(result.swap);
        }
      }
    }

    if (notifications.confirmed.length > 0 || notifications.potentialReverts.length > 0 || notifications.pendingPurchased?.length > 0) {
      setSwapNotification(notifications);
      // Auto-dismiss after 8 seconds
      setTimeout(() => setSwapNotification(null), 8000);
    }
  }

  // Toggle alternative selection
  function toggleAlternative(idx) {
    setSelectedAlternatives(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  }

  // Add selected alternatives as pending swaps
  function addSelectedAsPending() {
    if (!searchResult?.alternatives) return;

    const selected = Object.entries(selectedAlternatives)
      .filter(([_, isSelected]) => isSelected)
      .map(([idx]) => searchResult.alternatives[parseInt(idx)]);

    if (selected.length === 0) return;

    for (const alt of selected) {
      logSwap({
        originalProduct: searchResult.originalProduct,
        newProduct: alt.name,
        reason: alt.whyHealthier,
        category: searchResult.category ? detectCategory(searchResult.originalProduct) : undefined,
        source: SWAP_SOURCES.ADVISOR,
        status: SWAP_STATUS.PENDING,
      });
    }

    // Show toast
    setSwapToast(`Added ${selected.length} swap${selected.length > 1 ? 's' : ''} to pending`);
    setTimeout(() => setSwapToast(null), 3000);

    // Clear selections and refresh
    setSelectedAlternatives({});
    setSwapsRefreshKey(k => k + 1);
  }

  // Add smart swap recommendation to My Swaps
  function addSmartSwapToMySwaps(swap, status) {
    logSwap({
      originalProduct: swap.current,
      newProduct: swap.suggestion,
      reason: swap.reason,
      category: detectCategory(swap.current) || detectCategory(swap.suggestion),
      source: SWAP_SOURCES.ADVISOR,
      status: status,
    });

    const statusLabel = status === SWAP_STATUS.PENDING ? 'pending' : 'active';
    setSwapToast(`Added to My Swaps as ${statusLabel}`);
    setTimeout(() => setSwapToast(null), 3000);
    setSelectedSmartSwaps({});
    setSwapsRefreshKey(k => k + 1);
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      // Convert file to base64 — the API expects { fileData, fileType }
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // strip data:...;base64, prefix
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse', fileData, fileType: file.type, source: selectedSource }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const result = await res.json();

      if (result.needsManualInput) {
        setShowManualInput(true);
        setUploadError(result.error);
      } else if (result.items && result.items.length > 0) {
        const newData = addGroceryOrder({
          items: result.items,
          source: result.source || selectedSource,
        });
        setGroceryData(newData);
        onGroceryDataChange?.(newData);

        // Check for swap confirmations/reversions
        checkSwapsInPurchase(result.items);

        // Auto-analyze after upload if we have enough data
        if (newData.allItems.length >= 5) {
          analyzeGroceries(newData);
        }
      } else {
        setUploadError('No items found in the file. Try pasting your items manually.');
        setShowManualInput(true);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Failed to process file. Try pasting your items manually.');
      setShowManualInput(true);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleManualSubmit() {
    const items = manualItems
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.length > 1);

    if (items.length === 0) {
      setUploadError('Please enter at least one item');
      return;
    }

    const newData = addGroceryOrder({
      items,
      source: selectedSource,
    });
    setGroceryData(newData);
    onGroceryDataChange?.(newData);
    setManualItems('');
    setShowManualInput(false);
    setUploadError(null);

    // Check for swap confirmations/reversions
    checkSwapsInPurchase(items);

    // Auto-analyze after manual input
    if (newData.allItems.length >= 5) {
      analyzeGroceries(newData);
    }
  }

  async function syncWithPlaybook(data) {
    try {
      const res = await fetch('/api/sync-grocery-playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groceryData: data,
          playbook,
          profile,
          pendingSuggestions: getPendingSuggestions(),
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const result = await res.json();

      // Handle playbook suggestions
      if (result.suggestions && result.suggestions.length > 0) {
        for (const suggestion of result.suggestions) {
          onPlaybookSuggestion?.(suggestion);
        }
        onSuggestionCountChange?.();
      }

      // Handle additional wins and habits
      if (result.wins || result.habitsToAdd) {
        const updatedData = updateHabitsAndWins(result.habitsToAdd, result.wins);
        setGroceryData(updatedData);
        onGroceryDataChange?.(updatedData);
      }
    } catch (err) {
      console.error('Playbook sync error:', err);
    }
  }

  async function searchHealthierOption() {
    if (!searchQuery.trim() || searching) return;

    setSearching(true);
    setSearchResult(null);

    try {
      const res = await fetch('/api/find-healthier-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: searchQuery.trim(),
          profile,
          playbook,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const result = await res.json();
      if (result.error) {
        setSearchResult({ error: result.error });
      } else {
        setSearchResult(result);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResult({ error: 'Failed to find alternatives. Please try again.' });
    } finally {
      setSearching(false);
    }
  }

  async function analyzeGroceries(data = groceryData) {
    setAnalyzing(true);
    try {
      // Step 1: Analyze grocery patterns
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          groceryData: data,
          profile,
          playbook,
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const result = await res.json();
      let updatedData = data;

      if (result.patterns || result.recommendations) {
        if (result.patterns) {
          updatedData = updatePatterns(result.patterns);
        }
        if (result.recommendations) {
          updatedData = updateRecommendations(result.recommendations);
        }
      }

      // Step 2: Update wins and habits from analysis
      if (result.wins || result.habitsFormed) {
        updatedData = updateHabitsAndWins(result.habitsFormed, result.wins);
      }

      setGroceryData(updatedData);
      onGroceryDataChange?.(updatedData);

      // Step 3: Sync with playbook - check for playbook updates based on purchases
      if (playbook) {
        await syncWithPlaybook(updatedData);
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nutrition</h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload your grocery orders and get personalized shopping recommendations.
          </p>
        </div>

        {/* Daily Nutritional Profile - Locked or Unlocked */}
        <DailyNutritionProfile profile={profile} />

        {/* Swap Toast */}
        {swapToast && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <Check size={16} className="text-emerald-400" />
            <span className="text-sm">{swapToast}</span>
          </div>
        )}

        {/* Swap Notification */}
        {swapNotification && (
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-emerald-600" />
                <span className="font-semibold text-gray-800 text-sm">Swap Tracker</span>
              </div>
              <button
                type="button"
                onClick={() => setSwapNotification(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>

            {swapNotification.pendingPurchased?.length > 0 && (
              <div className="mb-2">
                {swapNotification.pendingPurchased.map((swap, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 bg-sky-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-sky-700">
                      <Check size={14} />
                      <span>You bought <strong>{swap.newProduct}</strong>!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        activatePendingSwap(swap.id);
                        setSwapsRefreshKey(k => k + 1);
                        setSwapNotification(prev => ({
                          ...prev,
                          pendingPurchased: prev.pendingPurchased.filter(s => s.id !== swap.id),
                          confirmed: [...(prev.confirmed || []), { ...swap, purchaseCount: 1 }]
                        }));
                      }}
                      className="px-2 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                    >
                      Mark as Active
                    </button>
                  </div>
                ))}
              </div>
            )}

            {swapNotification.confirmed.length > 0 && (
              <div className="mb-2">
                {swapNotification.confirmed.map((swap, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-emerald-700">
                    <Check size={14} />
                    <span>Still going strong with <strong>{swap.newProduct}</strong>! (#{swap.purchaseCount})</span>
                  </div>
                ))}
              </div>
            )}

            {swapNotification.potentialReverts.length > 0 && (
              <div>
                {swapNotification.potentialReverts.map((swap, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-amber-700">
                    <AlertCircle size={14} />
                    <span>Spotted <strong>{swap.originalProduct}</strong> - still committed to the swap?</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Upload size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-800">Upload Groceries</h2>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Upload digital orders or snap a photo of paper receipts - PDFs, screenshots, and photos all work.
          </p>

          {/* Source selector */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Order Source</label>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(source => (
                <button
                  key={source}
                  type="button"
                  onClick={() => setSelectedSource(source)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedSource === source
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          {/* Upload buttons */}
          <div className="flex gap-3">
            <label className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                uploading ? 'border-gray-200 bg-gray-50' : 'border-primary-200 hover:border-primary-400 hover:bg-primary-50'
              }`}>
                {uploading ? (
                  <Loader2 size={18} className="animate-spin text-gray-400" />
                ) : (
                  <div className="flex items-center gap-1">
                    <Upload size={16} className="text-primary-600" />
                    <span className="text-primary-400">/</span>
                    <Camera size={16} className="text-primary-600" />
                  </div>
                )}
                <span className={`text-sm font-medium ${uploading ? 'text-gray-400' : 'text-primary-600'}`}>
                  {uploading ? 'Processing...' : 'Upload or Snap Photo'}
                </span>
              </div>
            </label>

            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {showManualInput ? 'Cancel' : 'Enter Manually'}
            </button>
          </div>

          {/* Error message */}
          {uploadError && (
            <div className="mt-3 flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{uploadError}</span>
            </div>
          )}

          {/* Manual input */}
          {showManualInput && (
            <div className="mt-4 space-y-3">
              <textarea
                value={manualItems}
                onChange={e => setManualItems(e.target.value)}
                placeholder="Paste your grocery items here, one per line:&#10;&#10;Organic Bananas&#10;Chobani Greek Yogurt&#10;Chicken Breast&#10;..."
                rows={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <button
                type="button"
                onClick={handleManualSubmit}
                className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                Add Items
              </button>
            </div>
          )}
        </div>

        {/* Find a Healthier Option Section */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Search size={18} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-800">Find a Healthier Option</h2>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Enter any product you buy and get healthier alternatives in the same category.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  searchHealthierOption();
                }
              }}
              placeholder="e.g., Honey Nut Cheerios, Lay's Chips, Wonder Bread..."
              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={searching}
            />
            <button
              type="button"
              onClick={searchHealthierOption}
              disabled={!searchQuery.trim() || searching}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {searching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {searching ? 'Searching...' : 'Find'}
            </button>
          </div>

          {/* Search Results */}
          {searchResult && (
            <div className="mt-4">
              {searchResult.error ? (
                <div className="flex items-start justify-between gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{searchResult.error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchResult(null)}
                    className="text-amber-500 hover:text-amber-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : searchResult.noAlternatives ? (
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{searchResult.originalProduct}</span> is already a good choice!
                      </p>
                      {searchResult.noAlternativesReason && (
                        <p className="text-xs text-gray-500 mt-1">{searchResult.noAlternativesReason}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSearchResult(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header with dismiss */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Select any to add to My Swaps
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchResult(null);
                        setSelectedAlternatives({});
                      }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={12} />
                      Dismiss
                    </button>
                  </div>

                  {searchResult.alternatives?.map((alt, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleAlternative(idx)}
                      className={`bg-white rounded-xl p-4 border cursor-pointer transition-all ${
                        selectedAlternatives[idx]
                          ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-200'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          selectedAlternatives[idx]
                            ? 'bg-amber-500 border-amber-500'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {selectedAlternatives[idx] && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-emerald-700">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{alt.name}</h4>
                          {/* Why rationale - made to stand out */}
                          <div className="mt-1.5 pl-2 border-l-2 border-emerald-400">
                            <p className="text-sm font-medium text-emerald-700">{alt.whyHealthier}</p>
                          </div>
                          {alt.goalConnection && (
                            <p className="text-xs text-gray-500 mt-1.5">
                              <span className="font-medium">For your goals:</span> {alt.goalConnection}
                            </p>
                          )}
                          {alt.tasteSimilarity && (
                            <p className="text-xs text-gray-400 mt-1 italic">{alt.tasteSimilarity}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add to pending button */}
                  {Object.values(selectedAlternatives).some(v => v) && (
                    <button
                      type="button"
                      onClick={addSelectedAsPending}
                      className="w-full py-2.5 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add {Object.values(selectedAlternatives).filter(v => v).length} to My Swaps (Pending)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* My Swaps Section */}
        <div ref={swapsSectionRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <GrocerySwaps key={swapsRefreshKey} />
        </div>

        {/* Wins & Habits Section */}
        {((groceryData.wins && groceryData.wins.length > 0) || (groceryData.habitsFormed && groceryData.habitsFormed.length > 0)) && (
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-amber-600" />
              <h2 className="font-semibold text-gray-800">Your Wins</h2>
            </div>

            {/* Habits Formed */}
            {groceryData.habitsFormed && groceryData.habitsFormed.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Star size={14} className="text-amber-500" />
                  Habits You've Built
                </h3>
                <div className="space-y-2">
                  {groceryData.habitsFormed.map((habit, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 border border-amber-100 flex items-start gap-3">
                      <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={14} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{habit.text}</p>
                        {habit.formedDate && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Since {new Date(habit.formedDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Wins */}
            {groceryData.wins && groceryData.wins.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Wins</h3>
                <div className="space-y-2">
                  {groceryData.wins.slice(0, 5).map((win, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 border border-gray-100 flex items-start gap-2">
                      <Sparkles size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">{win.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommendations Section */}
        {groceryData.recommendations && (
          <div className="bg-gradient-to-br from-primary-50 to-white rounded-2xl border border-primary-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={18} className="text-primary-600" />
              <h2 className="font-semibold text-gray-800">Advisor Recommendations</h2>
            </div>

            {/* Smart Swaps */}
            {(() => {
              const mySwaps = getSwaps();
              const filteredSmartSwaps = (groceryData.recommendations.smartSwaps || []).filter(rec =>
                !mySwaps.some(s =>
                  s.originalProduct?.toLowerCase() === rec.current?.toLowerCase() &&
                  s.newProduct?.toLowerCase() === rec.suggestion?.toLowerCase()
                )
              );
              return filteredSmartSwaps.length > 0 ? (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Smart Swaps</h3>
                <div className="space-y-2">
                  {filteredSmartSwaps.map((swap, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 border border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="text-gray-500 line-through">{swap.current}</span>
                            <ArrowRight size={14} className="text-primary-500 shrink-0" />
                            <span className="font-semibold text-primary-700">{swap.suggestion}</span>
                          </div>
                          <div className="mt-1.5 pl-2 border-l-2 border-emerald-400">
                            <p className="text-sm italic text-emerald-700">{swap.reason}</p>
                          </div>
                        </div>
                        {/* Add to My Swaps dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setSelectedSmartSwaps(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Add to My Swaps"
                          >
                            <Plus size={16} />
                          </button>
                          {selectedSmartSwaps[idx] && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]">
                              <button
                                type="button"
                                onClick={() => addSmartSwapToMySwaps(swap, SWAP_STATUS.PENDING)}
                                className="w-full px-3 py-1.5 text-left text-sm text-sky-700 hover:bg-sky-50 flex items-center gap-2"
                              >
                                <Search size={12} />
                                Add as Pending
                              </button>
                              <button
                                type="button"
                                onClick={() => addSmartSwapToMySwaps(swap, SWAP_STATUS.ACTIVE)}
                                className="w-full px-3 py-1.5 text-left text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                              >
                                <Check size={12} />
                                Already did this
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              ) : groceryData.recommendations.smartSwaps?.length > 0 ? (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Smart Swaps</h3>
                <p className="text-sm text-gray-500 italic">All caught up! No new recommendations.</p>
              </div>
              ) : null;
            })()}

            {/* Potential Gaps */}
            {groceryData.recommendations.potentialGaps?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Potential Gaps</h3>
                <div className="space-y-2">
                  {groceryData.recommendations.potentialGaps.map((gap, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 border border-gray-100">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-500" />
                        <span className="text-sm font-medium text-gray-700">{gap.gap}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{gap.suggestion}</p>
                      {gap.relevance && (
                        <p className="text-xs text-gray-400 mt-1">{gap.relevance}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cart Suggestions */}
            {groceryData.recommendations.cartSuggestions?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Add to Your Cart</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groceryData.recommendations.cartSuggestions.map((suggestion, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 border border-gray-100 flex items-start gap-2">
                      <Plus size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-gray-700">{suggestion.item}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{suggestion.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Re-analyze button */}
            <button
              type="button"
              onClick={() => analyzeGroceries()}
              disabled={analyzing}
              className="mt-4 w-full py-2 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1"
            >
              {analyzing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Updating...
                </>
              ) : (
                'Refresh Recommendations'
              )}
            </button>
          </div>
        )}

        {/* Shopping Patterns Section - Removed per user request */}

        {/* Grocery History Section */}
        {recentOrders.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-primary-600" />
              <h2 className="font-semibold text-gray-800">Grocery History</h2>
            </div>

            <div className="space-y-2">
              {recentOrders.map(order => (
                <div key={order.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-800">
                        {formatOrderDate(order.date)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {order.itemCount} items from {order.source}
                      </span>
                    </div>
                    {expandedOrder === order.id ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </button>

                  {expandedOrder === order.id && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                      <div className="flex flex-wrap gap-1.5">
                        {order.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-50 rounded text-xs text-gray-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasData && (
          <div className="text-center py-12 text-gray-400">
            <ShoppingCart size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No grocery data yet. Upload your first order to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
