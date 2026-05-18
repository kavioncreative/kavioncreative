import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Country {
    code: string;
    name: string;
    dialCode: string;
    flag: string;
}

interface PhoneInputProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    className?: string;
}

const countries: Country[] = [
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
    { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
    { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
    { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
    { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
];

export const PhoneInput: React.FC<PhoneInputProps> = ({
    label,
    value,
    onChange,
    error,
    required,
    placeholder = '(555) 000-0000',
    className = ''
}) => {
    const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredCountries = countries.filter(country =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.dialCode.includes(searchQuery)
    );

    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    };

    const handleToggle = () => {
        if (!isOpen) {
            updateCoords();
        }
        setIsOpen(!isOpen);
        if (isOpen) setSearchQuery('');
    };

    const handleCountrySelect = (country: Country) => {
        setSelectedCountry(country);
        setIsOpen(false);
        setSearchQuery('');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isInsideTrigger = dropdownRef.current?.contains(target);
            const isInsideMenu = menuRef.current?.contains(target);

            if (!isInsideTrigger && !isInsideMenu) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        if (isOpen) {
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const dropdownMenu = (
        <div
            ref={menuRef}
            className="fixed z-[99999] bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150 origin-top flex flex-col"
            style={{
                top: `${coords.top + 8}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`
            }}
        >
            <div className="p-2 border-b border-surface-border flex-shrink-0">
                <input
                    type="text"
                    autoFocus
                    placeholder="Search countries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-input border border-surface-border transition-all duration-200 outline-none rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-brand-primary"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            <div className="max-h-60 overflow-y-auto py-1.5 px-1.5 space-y-0.5
                [&::-webkit-scrollbar]:w-1.5 
                [&::-webkit-scrollbar-track]:bg-transparent 
                [&::-webkit-scrollbar-thumb]:bg-white/10 
                [&::-webkit-scrollbar-thumb]:rounded-full 
                hover:[&::-webkit-scrollbar-thumb]:bg-white/25">

                {filteredCountries.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 text-sm">
                        No countries found
                    </div>
                ) : (
                    filteredCountries.map((country) => (
                        <button
                            key={country.code}
                            type="button"
                            onClick={() => handleCountrySelect(country)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 rounded-lg ${selectedCountry.code === country.code
                                ? 'bg-brand-primary/10 text-brand-primary'
                                : 'text-gray-300 hover:bg-white/[0.08] hover:text-white'
                                }`}
                        >
                            <span className="text-2xl">{country.flag}</span>
                            <div className="flex-1 flex items-center justify-between">
                                <span className="font-medium text-sm">{country.name}</span>
                                <span className="text-xs text-gray-500">{country.dialCode}</span>
                            </div>
                            {selectedCountry.code === country.code && (
                                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col gap-2 w-full ${className}`} ref={dropdownRef}>
            {label && <label className="text-sm font-medium text-gray-400 ml-1">{label}</label>}

            <div className="flex gap-2">
                {/* Country Code Selector */}
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={handleToggle}
                    className={`flex items-center gap-2 px-4 py-3 bg-surface-input border-2 rounded-xl transition-all duration-300 outline-none hover:border-brand-primary/50 ${isOpen ? 'border-brand-primary' : 'border-surface-border'
                        }`}
                >
                    <span className="text-2xl">{selectedCountry.flag}</span>
                    <span className="text-sm font-medium text-white">{selectedCountry.dialCode}</span>
                    <svg
                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-primary' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Phone Number Input */}
                <input
                    type="tel"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    className={`flex-1 px-4 py-3 bg-surface-input border-2 rounded-xl text-white placeholder:text-gray-600 transition-all duration-300 outline-none focus:border-brand-primary ${error ? 'border-brand-error' : 'border-surface-border'
                        }`}
                />
            </div>

            {isOpen && createPortal(dropdownMenu, document.body)}

            {error && <span className="text-xs ml-1 text-brand-error">{error}</span>}
        </div>
    );
};
