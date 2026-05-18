
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from '../components/Surfaces';
import { IconChartBar, IconCheckCircle, IconXCircle, IconTrendingUp, IconCalendar, IconX } from '../components/Icons';
import { DatePicker, formatDate as systemFormatDate } from '../components/DatePicker';
import { Skeleton } from '../components/Feedback';
export interface PerformanceMetric {
    id: string;
    date: string;
    impressions: number;
    clicks: number;
    orders: number;
    conversion_rate: number;
    ctr: number;
    success_score: number;
    rating: number;
    cancelled_orders: number;
    account_id?: string;
    accounts?: {
        prefix: string;
        name: string;
    };
    profiles?: {
        name: string;
    };
}

// Define the data type
interface ChartDataPoint {
    date: string;
    impressions: number;
    clicks: number;
    orders: number;
    conversionRate: number;
    clickThroughRate: number;
}





// --- SVG Chart Helpers ---

const formatNumber = (num: number) => {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    if (num > 0 && num < 100 && !Number.isInteger(num)) {
        return num.toFixed(1);
    }
    return Math.round(num).toString();
};

const getPath = (data: ChartDataPoint[], key: keyof ChartDataPoint, width: number, height: number, maxVal: number) => {
    if (data.length === 0) return '';
    // Width is now the full width of the SVG container

    const points = data.map((d, i) => {
        const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
        const val = Number(d[key]) || 0;
        // Clamp value to maxVal to prevent drawing outside
        const normalizedVal = Math.min(val, maxVal);
        const y = height - (normalizedVal / maxVal) * height;
        return [x, y];
    });

    return points.reduce((acc, point, i, a) => {
        if (i === 0) return `M ${point[0]},${point[1]}`;

        // Simple smoothing
        const [x, y] = point;
        const [prevX, prevY] = a[i - 1];
        const cp1x = prevX + (x - prevX) * 0.5;
        const cp1y = prevY;
        const cp2x = prevX + (x - prevX) * 0.5;
        const cp2y = y;

        return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
    }, '');
};

interface PerformanceChartProps {
    data: PerformanceMetric[];
    isLoading?: boolean;
}

// Skeleton shimmer that mirrors the chart card layout
const SkeletonChart: React.FC = () => (
    <div className="w-full rounded-2xl border border-surface-border bg-surface-card overflow-hidden shadow-nova">
        {/* Header skeleton */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 w-full p-6 sm:px-8 sm:py-6 border-b border-white/5">
            <div className="flex flex-col lg:flex-row items-center gap-6 w-full xl:w-auto">
                <Skeleton className="w-32 h-5" />
                <div className="flex items-center gap-6">
                    <Skeleton className="w-20 h-4" />
                    <Skeleton className="w-16 h-4" />
                    <Skeleton className="w-16 h-4" />
                </div>
            </div>
            <Skeleton className="w-48 h-10 rounded-2xl" />
        </div>
        {/* Chart area skeleton */}
        <div className="p-6 sm:p-8">
            <div className="flex w-full mt-2 h-[300px] gap-4">
                {/* Y-axis */}
                <div className="w-[56px] flex flex-col justify-between pb-2">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="w-8 h-3" />
                    ))}
                </div>
                {/* Chart lines skeleton */}
                <div className="flex-1 relative">
                    {/* Fake grid lines */}
                    {[0, 25, 50, 75, 100].map(pct => (
                        <div
                            key={pct}
                            className="absolute left-0 right-0 h-px bg-white/5"
                            style={{ top: `${pct}%` }}
                        />
                    ))}
                    {/* Fake trend lines as shimmer bars */}
                    <div className="absolute inset-0 flex flex-col justify-end gap-3 pb-4 pr-8">
                        <Skeleton className="w-full h-[2px] rounded-full opacity-60" />
                        <Skeleton className="w-[85%] h-[2px] rounded-full opacity-40" />
                        <Skeleton className="w-[70%] h-[2px] rounded-full opacity-30" />
                    </div>
                    {/* Main shimmer wave */}
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                        <div className="w-full h-full relative overflow-hidden bg-surface-overlay/20 rounded-xl">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                        </div>
                    </div>
                </div>
            </div>
            {/* X-axis skeleton */}
            <div className="flex justify-between mt-10 pl-16 pr-8">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="w-10 h-3" />
                ))}
            </div>
        </div>
    </div>
);

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, isLoading }) => {
    // Transform Data for Chart
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        return data.map((d) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            impressions: d.impressions || 0,
            clicks: d.clicks || 0,
            orders: d.orders || 0,
            conversionRate: d.conversion_rate || 0,
            clickThroughRate: d.ctr || 0
        }));
    }, [data]);

    // Metric Visibility Toggles
    const [visibleMetrics, setVisibleMetrics] = useState({
        impressions: true,
        clicks: true,
        orders: true,
        conversionRate: true,
        clickThroughRate: true
    });

    const [activeTab, setActiveTab] = useState<'performance' | 'conversion'>('performance');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate chart limits with Dual Axis support for Performance tab
    const primaryMaxVal = useMemo(() => {
        if (chartData.length === 0) return 10;
        if (activeTab === 'conversion') {
            const max = chartData.reduce((currMax, d) => Math.max(currMax, d.conversionRate, d.clickThroughRate), 0);
            return max === 0 ? 100 : Math.ceil(max / 5) * 5 || 5;
        }
        // Performance Tab Primary Axis: Impressions
        const max = chartData.reduce((currMax, d) => Math.max(currMax, visibleMetrics.impressions ? d.impressions : 0), 0);
        const raw = max * 1.1;
        // Round to a nice multiple to avoid messy decimals on left axis (e.g., multiples of 5, 50, 500)
        const magnitude = Math.pow(10, Math.floor(Math.log10(raw || 1)) - 1) || 1;
        return Math.ceil(raw / (5 * magnitude)) * (5 * magnitude) || 1000;
    }, [visibleMetrics, activeTab, chartData]);

    const secondaryMaxVal = useMemo(() => {
        if (chartData.length === 0 || activeTab === 'conversion') return 10;
        // Performance Tab Secondary Axis: Clicks & Orders (Rounded to 5 intervals)
        const max = chartData.reduce((currMax, d) => Math.max(
            currMax,
            visibleMetrics.clicks ? d.clicks : 0,
            visibleMetrics.orders ? d.orders : 0
        ), 0);
        const targetMax = Math.max(5, max);
        return Math.ceil(targetMax / 5) * 5;
    }, [visibleMetrics, activeTab, chartData]);

    const toggleMetric = (metric: keyof typeof visibleMetrics) => {
        setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
    };

    const toggleAll = () => {
        if (activeTab === 'performance') {
            const allVisible = visibleMetrics.impressions && visibleMetrics.clicks && visibleMetrics.orders;
            setVisibleMetrics(prev => ({
                ...prev,
                impressions: !allVisible,
                clicks: !allVisible,
                orders: !allVisible
            }));
        } else {
            const allVisible = visibleMetrics.conversionRate && visibleMetrics.clickThroughRate;
            setVisibleMetrics(prev => ({
                ...prev,
                conversionRate: !allVisible,
                clickThroughRate: !allVisible
            }));
        }
    };

    const isAllVisible = activeTab === 'performance'
        ? (visibleMetrics.impressions && visibleMetrics.clicks && visibleMetrics.orders)
        : (visibleMetrics.conversionRate && visibleMetrics.clickThroughRate);

    // Handle mouse move for tooltip
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // x is relative to the chart area (flex-1 container)
        const chartWidth = rect.width;

        if (x < 0 || x > chartWidth) {
            setHoveredIndex(null);
            return;
        }

        const index = Math.round((x / chartWidth) * (chartData.length - 1));
        if (index >= 0 && index < chartData.length) {
            setHoveredIndex(index);
        }
    };

    const handleMouseLeave = () => {
        setHoveredIndex(null);
    };

    // Y-Axis Ticks - Using 5 intervals (6 labels) for round integer steps
    const primaryTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map(r => r * primaryMaxVal);
    const secondaryTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map(r => Math.round(r * secondaryMaxVal));

    if (isLoading) {
        return <SkeletonChart />;
    }

    return (
        <Card
            isElevated={true}
            disableHover={true}
            className="flex flex-col p-0 border border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden shadow-nova w-full"
            bodyClassName="flex-1 py-0 px-0 overflow-visible"
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-50" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

            <div className="relative z-10 w-full">
                {/* Header Section */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-6 w-full p-4 sm:p-6 lg:px-8 lg:py-6 border-b border-white/5">
                    {/* Title & Filters */}
                    <div className="flex flex-col lg:flex-row items-center gap-4 sm:gap-6 w-full xl:w-auto">
                        <div className="flex items-center justify-between w-full lg:w-auto">
                            <h3 className="text-base sm:text-lg font-bold text-white whitespace-nowrap">Performance</h3>
                            <div className="lg:hidden h-px flex-1 bg-white/10 mx-4" />
                        </div>

                        <div className="hidden lg:block h-6 w-px bg-white/10" />

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-3 sm:gap-6 w-full lg:w-auto">
                            {/* All Checkbox */}
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAllVisible ? 'bg-gray-600 border-gray-600' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                    {isAllVisible && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                </div>
                                <input type="checkbox" className="hidden" checked={isAllVisible} onChange={toggleAll} />
                                <span className="text-sm font-bold text-gray-300 group-hover:text-white">All</span>
                            </label>

                            {activeTab === 'performance' ? (
                                <>
                                    {/* Impressions */}
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleMetrics.impressions ? 'bg-[#FF4D2D] border-[#FF4D2D]' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                            {visibleMetrics.impressions && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={visibleMetrics.impressions} onChange={() => toggleMetric('impressions')} />
                                        <span className="text-sm font-bold text-[#ff8f75] group-hover:text-[#FF4D2D]">Impressions</span>
                                    </label>

                                    {/* Clicks */}
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleMetrics.clicks ? 'bg-[#40C4FF] border-[#40C4FF]' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                            {visibleMetrics.clicks && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={visibleMetrics.clicks} onChange={() => toggleMetric('clicks')} />
                                        <span className="text-sm font-bold text-[#8bd1f0] group-hover:text-[#40C4FF]">Clicks</span>
                                    </label>

                                    {/* Orders */}
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleMetrics.orders ? 'bg-[#1DBF73] border-[#1DBF73]' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                            {visibleMetrics.orders && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={visibleMetrics.orders} onChange={() => toggleMetric('orders')} />
                                        <span className="text-sm font-bold text-[#7fe6b4] group-hover:text-[#1DBF73]">Orders</span>
                                    </label>
                                </>
                            ) : (
                                <>
                                    {/* Conversion Rate */}
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleMetrics.conversionRate ? 'bg-[#A855F7] border-[#A855F7]' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                            {visibleMetrics.conversionRate && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={visibleMetrics.conversionRate} onChange={() => toggleMetric('conversionRate')} />
                                        <span className="text-sm font-bold text-[#c4b5fd] group-hover:text-[#A855F7]">Conversion Rate</span>
                                    </label>

                                    {/* Click Through Rate */}
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${visibleMetrics.clickThroughRate ? 'bg-[#EAB308] border-[#EAB308]' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                            {visibleMetrics.clickThroughRate && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={visibleMetrics.clickThroughRate} onChange={() => toggleMetric('clickThroughRate')} />
                                        <span className="text-sm font-bold text-[#fde047] group-hover:text-[#EAB308]">Click Through Rate</span>
                                    </label>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Conversion / Performance Tabs */}
                    <div className="flex items-center gap-1.5 p-1.5 bg-black/40 border border-white/5 rounded-2xl w-fit shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] shrink-0 w-full md:w-auto">
                        <button
                            onClick={() => setActiveTab('conversion')}
                            className={`relative flex items-center justify-center flex-1 md:flex-none gap-2 px-6 py-2 rounded-xl transition-colors duration-200 text-sm font-medium outline-none overflow-hidden ${activeTab === 'conversion'
                                ? 'text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {/* Active State Background & Border */}
                            {activeTab === 'conversion' && (
                                <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2),0_10px_15px_-3px_rgba(255,77,45,0.3)] rounded-xl animate-in fade-in zoom-in-95 duration-200" />
                            )}

                            {/* Metallic Shine Overlay */}
                            {activeTab === 'conversion' && (
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50 z-10" />
                            )}

                            <span className="relative z-20">Conversion</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('performance')}
                            className={`relative flex items-center justify-center flex-1 md:flex-none gap-2 px-6 py-2 rounded-xl transition-colors duration-200 text-sm font-medium outline-none overflow-hidden ${activeTab === 'performance'
                                ? 'text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {/* Active State Background & Border */}
                            {activeTab === 'performance' && (
                                <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2),0_10px_15px_-3px_rgba(255,77,45,0.3)] rounded-xl animate-in fade-in zoom-in-95 duration-200" />
                            )}

                            {/* Metallic Shine Overlay */}
                            {activeTab === 'performance' && (
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50 z-10" />
                            )}

                            <span className="relative z-20">Performance</span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:pb-[88px]">
                    {/* Metric Filters Row */}


                    {/* Chart Layout: Y-Axes + Graph */}
                    <div className="flex w-full mt-6 h-[250px] sm:h-[300px] px-0 sm:px-2">
                        {/* Primary Y-Axis Labels (Left) */}
                        <div className="w-[44px] sm:w-[60px] relative text-[10px] sm:text-xs font-semibold text-white/90 h-full">
                            {primaryTicks.slice().reverse().map((tick, i) => (
                                <span
                                    key={i}
                                    className="absolute right-2 sm:right-4 transform -translate-y-1/2"
                                    style={{ top: `${(i / (primaryTicks.length - 1)) * 100}%` }}
                                >
                                    {activeTab === 'conversion'
                                        ? (tick < 10 ? `${tick.toFixed(1)}%` : `${Math.round(tick)}%`)
                                        : formatNumber(tick)}
                                </span>
                            ))}
                        </div>

                        {/* Chart Area */}
                        <div className="flex-1 relative h-full">
                            <div
                                className="w-full h-full relative group cursor-crosshair px-2"
                                ref={containerRef}
                                onMouseMove={handleMouseMove}
                                onMouseLeave={handleMouseLeave}
                            >
                                <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 300" preserveAspectRatio="none">
                                    {/* Grid Lines - sync with 5 intervals */}
                                    {[0, 60, 120, 180, 240, 300].map(y => (
                                        <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                                    ))}

                                    {/* Chart Lines */}
                                    {activeTab === 'performance' ? (
                                        <>
                                            {visibleMetrics.impressions && (
                                                <path
                                                    d={getPath(chartData, 'impressions', 1000, 300, primaryMaxVal)}
                                                    fill="none"
                                                    stroke="#FF4D2D"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            )}
                                            {visibleMetrics.clicks && (
                                                <path
                                                    d={getPath(chartData, 'clicks', 1000, 300, secondaryMaxVal)}
                                                    fill="none"
                                                    stroke="#40C4FF"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            )}
                                            {visibleMetrics.orders && (
                                                <path
                                                    d={getPath(chartData, 'orders', 1000, 300, secondaryMaxVal)}
                                                    fill="none"
                                                    stroke="#1DBF73"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {visibleMetrics.conversionRate && (
                                                <path
                                                    d={getPath(chartData, 'conversionRate', 1000, 300, primaryMaxVal)}
                                                    fill="none"
                                                    stroke="#A855F7"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            )}
                                            {visibleMetrics.clickThroughRate && (
                                                <path
                                                    d={getPath(chartData, 'clickThroughRate', 1000, 300, primaryMaxVal)}
                                                    fill="none"
                                                    stroke="#EAB308"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            )}
                                        </>
                                    )}

                                    {/* Hover Effects */}
                                    {hoveredIndex !== null && !isLoading && (
                                        <>
                                            {/* Vertical Line */}
                                            <line
                                                x1={(hoveredIndex / (chartData.length - 1)) * 1000}
                                                y1="0"
                                                x2={(hoveredIndex / (chartData.length - 1)) * 1000}
                                                y2="300"
                                                stroke="rgba(255,255,255,0.2)"
                                                strokeDasharray="4 4"
                                            />

                                        </>
                                    )}
                                </svg>

                                {/* Loading Overlay - removed, replaced by SkeletonChart above */}

                                {/* Hover Points (HTML for perfect roundness) */}
                                {hoveredIndex !== null && (
                                    <>
                                        {activeTab === 'performance' ? (
                                            <>
                                                {visibleMetrics.impressions && (
                                                    <div
                                                        className="absolute w-3 h-3 bg-[#FF4D2D] rounded-full border-2 border-white shadow-sm transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                                        style={{
                                                            left: `${(hoveredIndex / (chartData.length - 1)) * 100}%`,
                                                            top: `${(1 - chartData[hoveredIndex].impressions / primaryMaxVal) * 100}%`
                                                        }}
                                                    />
                                                )}
                                                {visibleMetrics.clicks && (
                                                    <div
                                                        className="absolute w-3 h-3 bg-[#40C4FF] rounded-full border-2 border-white shadow-sm transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                                        style={{
                                                            left: `${(hoveredIndex / (chartData.length - 1)) * 100}%`,
                                                            top: `${(1 - chartData[hoveredIndex].clicks / secondaryMaxVal) * 100}%`
                                                        }}
                                                    />
                                                )}
                                                {visibleMetrics.orders && (
                                                    <div
                                                        className="absolute w-3 h-3 bg-[#1DBF73] rounded-full border-2 border-white shadow-sm transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                                        style={{
                                                            left: `${(hoveredIndex / (chartData.length - 1)) * 100}%`,
                                                            top: `${(1 - chartData[hoveredIndex].orders / secondaryMaxVal) * 100}%`
                                                        }}
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {visibleMetrics.conversionRate && (
                                                    <div
                                                        className="absolute w-3 h-3 bg-[#A855F7] rounded-full border-2 border-white shadow-sm transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                                        style={{
                                                            left: `${(hoveredIndex / (chartData.length - 1)) * 100}%`,
                                                            top: `${(1 - chartData[hoveredIndex].conversionRate / primaryMaxVal) * 100}%`
                                                        }}
                                                    />
                                                )}
                                                {visibleMetrics.clickThroughRate && (
                                                    <div
                                                        className="absolute w-3 h-3 bg-[#EAB308] rounded-full border-2 border-white shadow-sm transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                                        style={{
                                                            left: `${(hoveredIndex / (chartData.length - 1)) * 100}%`,
                                                            top: `${(1 - chartData[hoveredIndex].clickThroughRate / primaryMaxVal) * 100}%`
                                                        }}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </>
                                )}

                                {/* Tooltip */}
                                {hoveredIndex !== null && !isLoading && (() => {
                                    const point = chartData[hoveredIndex];
                                    let val = 0;
                                    if (activeTab === 'performance') {
                                        if (visibleMetrics.impressions) val = Math.max(val, point.impressions);
                                        if (visibleMetrics.clicks) val = Math.max(val, point.clicks);
                                        if (visibleMetrics.orders) val = Math.max(val, point.orders);
                                    } else {
                                        if (visibleMetrics.conversionRate) val = Math.max(val, point.conversionRate);
                                        if (visibleMetrics.clickThroughRate) val = Math.max(val, point.clickThroughRate);
                                    }

                                    const yPercent = activeTab === 'performance'
                                        ? (visibleMetrics.impressions ? (1 - point.impressions / primaryMaxVal) * 100 : (1 - val / secondaryMaxVal) * 100)
                                        : (1 - val / primaryMaxVal) * 100;

                                    const isHigh = yPercent < 40;

                                    // Horizontal alignment logic
                                    const xPercent = hoveredIndex / (chartData.length - 1);
                                    let xAlignClass = '-translate-x-1/2';
                                    if (xPercent < 0.2) xAlignClass = 'translate-x-0';
                                    else if (xPercent > 0.8) xAlignClass = '-translate-x-full';

                                    return (
                                        <div
                                            className={`absolute z-30 pointer-events-none transform ${xAlignClass} ${isHigh ? 'translate-y-4' : '-translate-y-full -mt-4'} bg-[#1A1A1A] border border-white/10 p-3 rounded-xl shadow-xl min-w-[150px] backdrop-blur-xl transition-all duration-75 ease-out`}
                                            style={{
                                                left: `${xPercent * 100}%`,
                                                top: `${yPercent}%`
                                            }}
                                        >
                                            <p className="text-gray-400 text-xs mb-2 font-medium">{point.date}</p>
                                            {activeTab === 'performance' ? (
                                                <>
                                                    {visibleMetrics.impressions && (
                                                        <div className="flex items-center justify-between gap-4 mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-[#FF4D2D]" />
                                                                <span className="text-xs text-gray-300">Impressions</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-white">{point.impressions}</span>
                                                        </div>
                                                    )}
                                                    {visibleMetrics.clicks && (
                                                        <div className="flex items-center justify-between gap-4 mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-[#40C4FF]" />
                                                                <span className="text-xs text-gray-300">Clicks</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-white">{point.clicks}</span>
                                                        </div>
                                                    )}
                                                    {visibleMetrics.orders && (
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-[#1DBF73]" />
                                                                <span className="text-xs text-gray-300">Orders</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-white">{point.orders}</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {visibleMetrics.conversionRate && (
                                                        <div className="flex items-center justify-between gap-4 mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-[#A855F7]" />
                                                                <span className="text-xs text-gray-300">Conv. Rate</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-white">{point.conversionRate.toFixed(1)}%</span>
                                                        </div>
                                                    )}
                                                    {visibleMetrics.clickThroughRate && (
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-[#EAB308]" />
                                                                <span className="text-xs text-gray-300">CTR</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-white">{point.clickThroughRate.toFixed(1)}%</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* X-Axis Labels (Absolute Positioning) */}
                                <div className="absolute top-full w-full mt-6 sm:mt-8 h-6 left-0">
                                    {chartData.map((point, i) => {
                                        const step = Math.max(1, Math.ceil(chartData.length / (window.innerWidth < 640 ? 5 : 10)));
                                        if (i % step !== 0) return null;

                                        const xPercent = i / (chartData.length - 1);

                                        return (
                                            <div
                                                key={i}
                                                className="absolute w-0 flex justify-center overflow-visible tabular-nums"
                                                style={{ left: `${xPercent * 100}%` }}
                                            >
                                                <span className="text-xs font-semibold text-white/90 whitespace-nowrap">
                                                    {point.date}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Secondary Y-Axis Labels (Right) - Only for Performance Tab */}
                        {activeTab === 'performance' && (
                            <div className="w-[44px] sm:w-[60px] relative text-[10px] sm:text-xs font-semibold text-white/90 h-full pl-2 sm:pl-4">
                                {secondaryTicks.slice().reverse().map((tick, i) => (
                                    <span
                                        key={i}
                                        className="absolute left-2 sm:left-4 transform -translate-y-1/2 flex items-center gap-1 sm:gap-1.5"
                                        style={{ top: `${(i / (secondaryTicks.length - 1)) * 100}%` }}
                                    >
                                        <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-[#1DBF73]/50" />
                                        {formatNumber(tick)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default PerformanceChart;
