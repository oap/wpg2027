import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency, formatPercent } from './utils/csvParser';
import { Property, FilterState, SortOption, SortDirection } from './types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import {
  LayoutDashboard,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  AlertCircle,
  Globe
} from 'lucide-react';
import { useLanguage } from './context/LanguageContext';

// Components defined within App.tsx to keep file count low as requested

const StatCard = ({ title, value, subtext, trend }: { title: string, value: string, subtext?: string, trend?: 'up' | 'down' | 'neutral' }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-1">
      <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">{title}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-red-50 text-red-700' :
            trend === 'down' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
            }`}>
            {trend === 'up' ? <ArrowUpRight className="inline w-3 h-3 mr-1" /> : <ArrowDownRight className="inline w-3 h-3 mr-1" />}
            {t('trend')}
          </span>
        )}
      </div>
      {subtext && <span className="text-slate-400 text-xs">{subtext}</span>}
    </div>
  );
};

const PropertyModal = ({ property, onClose, neighborhoodAverage }: { property: Property | null, onClose: () => void, neighborhoodAverage: number }) => {
  const { t } = useLanguage();
  if (!property) return null;

  const diffFromAvg = property.percentChange - neighborhoodAverage;
  const isHigh = diffFromAvg > 2; // 2% higher than average
  const isLow = diffFromAvg < -2; // 2% lower than average

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{property.address}</h2>
            <p className="text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" /> {property.neighborhood}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('modalAssessmentChange')}</h3>
              <div className="flex items-end gap-3 mb-1">
                <span className="text-4xl font-bold text-slate-900">{formatPercent(property.percentChange)}</span>
                <span className={`text-sm mb-1 font-medium ${property.valueChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ({property.valueChange > 0 ? '+' : ''}{formatCurrency(property.valueChange)})
                </span>
              </div>
              <div className="text-sm text-slate-500">
                {t('modalCurrentProposed', {
                  current: formatCurrency(property.currentValue),
                  proposed: formatCurrency(property.proposedValue)
                })}
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${isHigh ? 'bg-red-50 border-red-100' : isLow ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 mt-0.5 ${isHigh ? 'text-red-500' : isLow ? 'text-green-500' : 'text-slate-400'}`} />
                <div>
                  <p className={`text-sm font-medium ${isHigh ? 'text-red-800' : isLow ? 'text-green-800' : 'text-slate-700'}`}>
                    {t('modalFairnessAnalysis')}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {t('modalFairnessDesc', {
                      avg: formatPercent(neighborhoodAverage),
                      diff: Math.abs(diffFromAvg).toFixed(1),
                      dir: diffFromAvg > 0 ? t('higher') : t('lower')
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('modalPropertyDetails')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-500">{t('detailLivingArea')}</span>
                <span className="font-semibold text-slate-800">{property.livingArea.toLocaleString()} sq ft</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-500">{t('detailYearBuilt')}</span>
                <span className="font-semibold text-slate-800">{property.yearBuilt}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-500">{t('detailBuildingType')}</span>
                <span className="font-semibold text-slate-800 truncate" title={property.buildingType}>{property.buildingType}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <span className="block text-xs text-slate-500">{t('detailBasement')}</span>
                <span className="font-semibold text-slate-800">{property.hasBasement ? t('yes') : t('no')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


import { dbService } from './src/services/DatabaseService';

export default function App() {
  const { t, language, setLanguage } = useLanguage();
  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    neighborhood: 'All',
    streetName: 'All',
    buildingType: 'All',
    minArea: 0,
    maxArea: 10000,
    search: '',
  });
  const [sortConfig, setSortConfig] = useState<{ key: SortOption, direction: SortDirection }>({
    key: SortOption.PercentChange,
    direction: 'desc'
  });
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Metadata state
  const [uniqueNeighborhoods, setUniqueNeighborhoods] = useState<string[]>([]);
  const [uniqueStreets, setUniqueStreets] = useState<string[]>([]);
  const [uniqueBuildingTypes, setUniqueBuildingTypes] = useState<string[]>([]);

  // Pre-calculated stats
  const [neighborhoodAvg, setNeighborhoodAvg] = useState(0);

  useEffect(() => {
    document.title = t('appTitle');
  }, [t]);

  useEffect(() => {
    const initDb = async () => {
      console.time("AppInit");
      try {
        await dbService.init();
        const meta = dbService.getMeta();
        setUniqueNeighborhoods(meta.neighborhoods);
        setUniqueStreets(meta.streets);
        setUniqueBuildingTypes(meta.buildingTypes);
        setLoading(false);
        console.timeEnd("AppInit");
      } catch (err) {
        console.error("Failed to init DB", err);
        console.timeEnd("AppInit");
      }
    };
    initDb();
  }, []);

  // Update stats when neighborhood filter changes
  useEffect(() => {
    if (filters.neighborhood !== 'All') {
      const avg = dbService.getNeighborhoodAvg(filters.neighborhood);
      setNeighborhoodAvg(avg);
    } else {
      setNeighborhoodAvg(0); // Uses dynamic avg if All
    }
  }, [filters.neighborhood]);

  // Filtered Data is now a result of querying the DB
  const filteredData = useMemo(() => {
    if (loading) return [];
    try {
      return dbService.queryProperties(filters, sortConfig);
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [loading, filters, sortConfig]);

  // Update streets when neighborhood changes (Cascading Filters)
  useEffect(() => {
    if (loading) return;
    const streets = dbService.getStreets(filters.neighborhood);
    setUniqueStreets(streets);

    // Optional: Reset street filter if the current street is not in the new list
    // Ideally we should do this, but 'All' is safe.
    // If user switches neighborhood, we assume they want to clear the street filter anyway in most UX patterns
    // except when they selected 'All'. if they selected a specific street that doesn't exist in new neighborhood, it yields 0 results.
    // Let's explicitly loop back to 'All' if the neighborhood changes? 
    // Actually, let's keep it simple: just update the list. 
    // The user will see their old street selection is invalid or just 0 results and pick a new one from the new list.
    // But better UX: if I switch neighborhood, reset street to 'All' automatically?
    // Let's do that in the handleFilterChange instead.
  }, [filters.neighborhood, loading]);

  // Separate stats calculation to be accurate for full dataset
  const [stats, setStats] = useState({ avgChange: 0, count: 0, avgValue: 0 });

  useEffect(() => {
    if (loading) return;
    try {
      const dbStats = dbService.getStats(filters);

      // If a specific neighborhood is selected, we can optionally use its pre-calculated global average from metadata
      // But user requested "All data" accuracy, so generally running getStats is safer and more dynamic unless we want to "fix" the benchmark.
      // The previous logic used 'neighborhoodAvg' (pre-calculated) as the 'avgChange' if a neighborhood was selected.
      // Let's preserve that "Fairness Benchmark" intent for the Fairness Card, but usually stats should reflect the View.
      // However, if the user filters to a street, they probably want the street's stats.
      // Let's stick to true dynamic stats from the DB.

      setStats({
        avgChange: dbStats.avgChange,
        count: dbStats.count,
        avgValue: dbStats.avgValue
      });
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
  }, [loading, filters]); // Re-run when filters change

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // If neighborhood changes, reset street to 'All'
      if (key === 'neighborhood') {
        newFilters.streetName = 'All';
      }
      return newFilters;
    });
  };
  const handleSort = (key: SortOption) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const histogramData = useMemo(() => {
    const buckets: Record<string, number> = {};
    const step = 5; // 5% buckets
    filteredData.forEach(p => {
      const bucket = Math.floor(p.percentChange / step) * step;
      const label = `${bucket}% - ${bucket + step}%`;
      buckets[label] = (buckets[label] || 0) + 1;
    });
    return Object.entries(buckets)
      .map(([name, count]) => ({ name, count, sortKey: parseInt(name) }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [filteredData]);

  // Scatter plot data - subsample if too large for performance
  const scatterData = useMemo(() => {
    return filteredData.map(p => ({
      x: p.livingArea,
      y: p.proposedValue,
      z: p.percentChange, // For color intensity or tooltip
      name: p.address,
      fullObj: p
    }));
  }, [filteredData]);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3">{t('loading')}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row font-sans text-slate-900">

      {/* Sidebar Filter Panel */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 p-6 flex flex-col h-auto md:h-screen sticky top-0 overflow-y-auto shrink-0 z-10">
        <div className="flex items-center justify-between mb-8 text-indigo-700">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight">{t('sidebarTitle')}</h1>
          </div>
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors font-medium text-sm"
            title="Switch Language / 切换语言"
          >
            <Globe className="w-4 h-4" />
            <span>{language === 'en' ? '中文' : 'English'}</span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">{t('neighborhood')}</label>
            <select
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
              value={filters.neighborhood}
              onChange={e => setFilters({ ...filters, neighborhood: e.target.value })}
            >
              <option value="All">{t('allNeighborhoods')}</option>
              {uniqueNeighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">{t('street')}</label>
            <select
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
              value={filters.streetName}
              onChange={e => setFilters({ ...filters, streetName: e.target.value })}
            >
              <option value="All">{t('allStreets')}</option>
              {uniqueStreets.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">{t('buildingType')}</label>
            <select
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
              value={filters.buildingType}
              onChange={e => setFilters({ ...filters, buildingType: e.target.value })}
            >
              <option value="All">{t('allTypes')}</option>
              {uniqueBuildingTypes.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 block">{t('livingArea')}</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="w-full p-2 text-xs border border-slate-200 rounded"
                placeholder={t('min')}
                value={filters.minArea}
                onChange={e => setFilters({ ...filters, minArea: Number(e.target.value) })}
              />
              <span className="text-slate-300 self-center">-</span>
              <input
                type="number"
                className="w-full p-2 text-xs border border-slate-200 rounded"
                placeholder={t('max')}
                value={filters.maxArea}
                onChange={e => setFilters({ ...filters, maxArea: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8 text-xs text-slate-400 space-y-2">
          <p>{t('footerCopyright')}</p>
          <p>{t('footerDisclaimer')}</p>
          <p>
            <a href="https://data.winnipeg.ca/Assessment-Taxation-Corporate/Assessment-Parcels/d4mq-wa44/about_data"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-500 underline decoration-dotted"
            >
              {t('footerSource')}
            </a>
          </p>
          <p className="font-medium text-slate-500">{t('footerAffiliation')}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto h-screen">

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title={t('avgChange')}
            value={formatPercent(stats.avgChange)}
            trend={stats.avgChange > 15 ? 'up' : 'neutral'}
            subtext={t('comparedToPrev')}
          />
          <StatCard
            title={t('avgProposedValue')}
            value={formatCurrency(stats.avgValue)}
            subtext={t('acrossProperties', { count: stats.count })}
          />
          <StatCard
            title={t('propertiesAnalyzed')}
            value={stats.count.toString()}
            subtext={t('matchingFilters')}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">{t('valueVsSize')}</h3>
              <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">{t('darkerHigherIncrease')}</span>
            </div>
            <div className="h-64" style={{ height: '16rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Living Area"
                    unit=" sqft"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Value"
                    tickFormatter={(val) => `$${val / 1000}k`}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-800 text-white text-xs p-2 rounded shadow-xl">
                            <p className="font-bold mb-1">{data.name}</p>
                            <p>{t('tooltipSize', { val: data.x })}</p>
                            <p>{t('tooltipValue', { val: formatCurrency(data.y) })}</p>
                            <p className="text-indigo-300">{t('tooltipChange', { val: formatPercent(data.z) })}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Properties" data={scatterData} fill="#6366f1" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6">{t('assessmentDist')}</h3>
            <div className="h-64" style={{ height: '16rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">{t('propertyList')}</h3>
            <span className="text-xs text-slate-400 font-medium">{t('recordsFound', { count: filteredData.length })}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th
                    className="p-4 font-semibold cursor-pointer hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort(SortOption.Address)}
                  >
                    {t('colAddress')}
                  </th>
                  <th
                    className="p-4 font-semibold cursor-pointer hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort(SortOption.LivingArea)}
                  >
                    {t('colSqFt')}
                  </th>
                  <th
                    className="p-4 font-semibold cursor-pointer hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort(SortOption.CurrentValue)}
                  >
                    {t('colCurrent')}
                  </th>
                  <th
                    className="p-4 font-semibold cursor-pointer hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort(SortOption.ProposedValue)}
                  >
                    {t('colProposed')}
                  </th>
                  <th
                    className="p-4 font-semibold cursor-pointer hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort(SortOption.PercentChange)}
                  >
                    {t('colChange')}
                  </th>
                  <th className="p-4 font-semibold">{t('colFairness')}</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-50">
                {filteredData.map((prop) => {
                  const isFair = Math.abs(prop.percentChange - stats.avgChange) < 2; // within 2% of avg
                  const isHigh = prop.percentChange > stats.avgChange + 2;

                  return (
                    <tr
                      key={prop.id}
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                      onClick={() => setSelectedProperty(prop)}
                    >
                      <td className="p-4 font-medium text-slate-700 group-hover:text-indigo-700">
                        {prop.address}
                        <span className="block text-xs text-slate-400 font-normal mt-0.5">{prop.neighborhood}</span>
                      </td>
                      <td className="p-4 text-slate-600">{prop.livingArea.toLocaleString()}</td>
                      <td className="p-4 text-slate-600">{formatCurrency(prop.currentValue)}</td>
                      <td className="p-4 text-slate-900 font-medium">{formatCurrency(prop.proposedValue)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${prop.percentChange > 15 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                          {formatPercent(prop.percentChange)}
                        </span>
                      </td>
                      <td className="p-4">
                        {isHigh ? (
                          <span className="flex items-center text-red-500 text-xs font-medium" title="Higher increase than average">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> {t('statusHigh')}
                          </span>
                        ) : isFair ? (
                          <span className="flex items-center text-slate-400 text-xs" title="Consistent with average">
                            {t('statusAvg')}
                          </span>
                        ) : (
                          <span className="flex items-center text-green-500 text-xs font-medium" title="Lower increase than average">
                            <ArrowDownRight className="w-3 h-3 mr-1" /> {t('statusLow')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedProperty && (
        <PropertyModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          neighborhoodAverage={stats.avgChange}
        />
      )}
    </div>
  );
}