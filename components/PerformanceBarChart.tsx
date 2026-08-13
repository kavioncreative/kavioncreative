import React, { useState, useMemo } from 'react';
import { Card } from './Surfaces';
import { DatePicker, formatDate as systemFormatDate } from './DatePicker';
import { Dropdown } from './Dropdown';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { PerformanceMetric } from './PerformanceChart';
import { IconCalendar, IconX } from './Icons';

interface PerformanceBarChartProps {
    rawData: PerformanceMetric[];
    accountsList: any[];
    isLoading?: boolean;
}

const METRIC_OPTIONS = [
    { label: 'Impressions', value: 'impressions' },
    { label: 'Clicks', value: 'clicks' },
    { label: 'Orders', value: 'orders' },
    { label: 'Cancelled Orders', value: 'cancelled_orders' },
    { label: 'Conversion Rate (%)', value: 'conversion_rate' },
    { label: 'Click Through Rate (%)', value: 'ctr' },
    { label: 'On-Time Delivery (%)', value: 'on_time_delivery' },
    { label: 'Average Selling Price ($)', value: 'avg_selling_price' },
    { label: 'Response Rate (%)', value: 'response_rate' },
    { label: 'Repeat Business Score (%)', value: 'repeat_business_score' },
    { label: 'Fake Orders (FOs)', value: 'fos' },
    { label: 'Cancellation Rate (%)', value: 'cancellation_rate' }
];

// Account colors palette for grouped bars
const ACCOUNT_COLORS = [
    '#40C4FF', // Cyan
    '#EC4899', // Pink
    '#1DBF73', // Emerald
    '#A855F7', // Purple
    '#EAB308', // Yellow
    '#FF6B4B', // Coral
    '#3B82F6', // Blue
    '#10B981', // Green
];

const getAccountColor = (index: number) => {
    return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
};

const CustomTooltip = ({ active, payload, label, selectedMetricLabel }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1A1A1A] border border-white/10 p-3 rounded-xl shadow-xl min-w-[160px] backdrop-blur-xl z-50">
                <p className="text-gray-400 text-xs mb-2 font-medium">{label}</p>
                {payload.map((entry: any) => {
                    const value = entry.value;
                    let formattedValue = value;
                    if (selectedMetricLabel.includes('$')) {
                        formattedValue = `$${value.toFixed(2)}`;
                    } else if (selectedMetricLabel.includes('%')) {
                        formattedValue = `${value.toFixed(2)}%`;
                    }
                    return (
                        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color || entry.fill }} />
                                <span className="text-xs text-gray-300 font-bold uppercase">{entry.name}</span>
                            </div>
                            <span className="text-xs font-bold text-white">
                                {formattedValue}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
};

export const PerformanceBarChart: React.FC<PerformanceBarChartProps> = ({ rawData, accountsList = [], isLoading }) => {
    // 1. Local States
    const [selectedMetric, setSelectedMetric] = useState('clicks');
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>(['all']);

    // Set default date range to last 14 days
    const [fromDate, setFromDate] = useState<Date | null>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 14);
        return d;
    });
    const [toDate, setToDate] = useState<Date | null>(() => new Date());

    // 2. Dropdown Options mapping
    const metricLabel = useMemo(() => {
        return METRIC_OPTIONS.find(m => m.value === selectedMetric)?.label || 'Value';
    }, [selectedMetric]);

    const accountOptions = useMemo(() => {
        const options = [
            { label: 'All Accounts', value: 'all' }
        ];
        accountsList.forEach(acc => {
            if (acc.prefix) {
                options.push({
                    label: `${acc.prefix.toUpperCase()} - ${acc.name}`,
                    value: acc.id
                });
            }
        });
        return options;
    }, [accountsList]);

    // Active accounts selected for rendering
    const activeAccounts = useMemo(() => {
        const isAllSelected = selectedAccounts.includes('all') || selectedAccounts.length === 0;
        if (isAllSelected) {
            return accountsList.map(a => ({
                id: a.id,
                prefix: a.prefix?.toLowerCase() || '',
                name: a.name
            }));
        }
        return accountsList
            .filter(a => selectedAccounts.includes(a.id))
            .map(a => ({
                id: a.id,
                prefix: a.prefix?.toLowerCase() || '',
                name: a.name
            }));
    }, [selectedAccounts, accountsList]);

    // 3. Process Data for BarChart
    const chartData = useMemo(() => {
        if (!rawData || rawData.length === 0) return [];

        // Filter raw data by date
        const filtered = rawData.filter(m => {
            const date = new Date(m.date);
            if (fromDate && date < fromDate) return false;
            if (toDate && date > toDate) return false;
            return true;
        });

        // Group by Date and build structured data points
        const dateMap = new Map<string, any>();
        filtered.forEach(m => {
            const dateStr = new Date(m.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            const prefix = m.accounts?.prefix?.toLowerCase() || '';

            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, { date: dateStr });
            }

            const dataPoint = dateMap.get(dateStr);
            let val = 0;
            if (selectedMetric === 'impressions') val = m.impressions || 0;
            else if (selectedMetric === 'clicks') val = m.clicks || 0;
            else if (selectedMetric === 'orders') val = m.orders || 0;
            else if (selectedMetric === 'cancelled_orders') val = m.cancelled_orders || 0;
            else if (selectedMetric === 'conversion_rate') {
                val = m.conversion_rate || (m.clicks > 0 ? ((m.orders || 0) / m.clicks) * 100 : 0);
            }
            else if (selectedMetric === 'ctr') {
                val = m.ctr || (m.impressions > 0 ? ((m.clicks || 0) / m.impressions) * 100 : 0);
            }
            else if (selectedMetric === 'on_time_delivery') val = m.on_time_delivery || 0;
            else if (selectedMetric === 'avg_selling_price') val = m.avg_selling_price || 0;
            else if (selectedMetric === 'response_rate') val = m.response_rate || 0;
            else if (selectedMetric === 'repeat_business_score') val = m.repeat_business_score || 0;
            else if (selectedMetric === 'fos') val = m.fos || 0;
            else if (selectedMetric === 'cancellation_rate') val = m.cancellation_rate || 0;

            if (prefix) {
                dataPoint[prefix] = val;
            }
        });

        // Convert Map to sorted array
        return Array.from(dateMap.values()).sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
    }, [rawData, fromDate, toDate, selectedMetric]);

    if (isLoading) {
        return (
            <Card className="w-full border border-white/10 bg-[#1A1A1A] p-6 rounded-2xl animate-pulse">
                <div className="h-6 w-1/4 bg-white/5 rounded mb-6" />
                <div className="h-[250px] bg-white/5 rounded" />
            </Card>
        );
    }

    return (
        <Card
            isElevated={true}
            disableHover={true}
            className="flex flex-col p-0 border border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden shadow-nova w-full"
            bodyClassName="flex-1 py-0 px-0 overflow-visible"
        >
            {/* Background Gradients */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />

            <div className="relative z-10 w-full">
                {/* Header Filter Controls */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 w-full p-4 sm:p-6 lg:px-8 border-b border-white/5">
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-white">Comparison Analytics</h3>
                        <p className="text-xs text-gray-400 mt-1">Compare accounts and metrics side-by-side</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                        {/* Metric Selector Dropdown */}
                        <div className="w-full sm:w-[220px]">
                            <Dropdown
                                variant="metallic"
                                size="sm"
                                options={METRIC_OPTIONS}
                                value={selectedMetric}
                                onChange={setSelectedMetric}
                                placeholder="Select Metric"
                            />
                        </div>

                        {/* Account Multi-select Dropdown */}
                        <div className="w-full sm:w-[220px]">
                            <Dropdown
                                variant="metallic"
                                size="sm"
                                isMulti={true}
                                options={accountOptions}
                                value={selectedAccounts}
                                onChange={setSelectedAccounts}
                                placeholder="All Accounts"
                            />
                        </div>

                        {/* Date Range Pickers */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                            <DatePicker
                                value={fromDate}
                                onChange={setFromDate}
                                placeholder="From Date"
                            >
                                <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-2 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden w-full sm:w-auto">
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <div className="flex items-center gap-2 relative z-10 shrink-0">
                                        <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                                        <span className="min-w-20 text-left">{systemFormatDate(fromDate) || 'From Date'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 relative z-10">
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {fromDate && (
                                            <div
                                                className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-brand-primary transition-all pointer-events-auto"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFromDate(null);
                                                }}
                                            >
                                                <IconX className="w-3 h-3" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DatePicker>
                            <DatePicker
                                value={toDate}
                                onChange={setToDate}
                                placeholder="To Date"
                            >
                                <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-2 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden w-full sm:w-auto">
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <div className="flex items-center gap-2 relative z-10 shrink-0">
                                        <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                                        <span className="min-w-20 text-left">{systemFormatDate(toDate) || 'To Date'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 relative z-10">
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {toDate && (
                                            <div
                                                className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-brand-primary transition-all pointer-events-auto"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setToDate(null);
                                                }}
                                            >
                                                <IconX className="w-3 h-3" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DatePicker>
                        </div>
                    </div>
                </div>

                {/* Graph Area */}
                <div className="p-4 sm:p-6 lg:p-8">
                    {chartData.length === 0 ? (
                        <div className="h-[250px] sm:h-[300px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl">
                            <span className="text-gray-400 text-sm font-medium">No performance records found for the selected filter range.</span>
                        </div>
                    ) : (
                        <div className="w-full h-[250px] sm:h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#9CA3AF"
                                        fontSize={11}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#9CA3AF"
                                        fontSize={11}
                                        tickLine={false}
                                        tickFormatter={(v) => {
                                            if (selectedMetric === 'avg_selling_price') return `$${v}`;
                                            if (selectedMetric === 'conversion_rate' || selectedMetric === 'ctr' || selectedMetric === 'on_time_delivery' || selectedMetric === 'response_rate' || selectedMetric === 'repeat_business_score' || selectedMetric === 'cancellation_rate') {
                                                return `${v}%`;
                                            }
                                            return v;
                                        }}
                                    />
                                    <RechartsTooltip
                                        content={<CustomTooltip selectedMetricLabel={metricLabel} />}
                                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        height={36}
                                        formatter={(value) => <span className="text-xs text-gray-300 font-bold uppercase">{value}</span>}
                                    />
                                    {activeAccounts.map((acc, index) => (
                                        <Bar
                                            key={acc.id}
                                            dataKey={acc.prefix}
                                            fill={getAccountColor(index)}
                                            radius={[4, 4, 0, 0]}
                                            name={acc.prefix}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};
