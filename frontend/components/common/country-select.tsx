"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { ICountry } from "@/app/types/types.utils"


export default function CountrySelect({
    countries,
    selectedCountry,
    onCountryChange,
    disabled = false,
    compact = false
}: {
    countries: ICountry[];
    selectedCountry: ICountry | null;
    onCountryChange: (country: ICountry | null) => void;
    disabled?: boolean;
    compact?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [filteredCountries, setFilteredCountries] = useState<ICountry[]>(countries)

    useEffect(() => {
        setFilteredCountries(
            !searchTerm
                ? countries
                : countries.filter(
                    (country) =>
                        country.name.common.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        country.cca2.toLowerCase().includes(searchTerm.toLowerCase())
                )
        )
    }, [searchTerm, countries])

    const getFlag = (cca2: string) =>
        String.fromCodePoint(...cca2.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))

    // NEW: Get country code for compact mode
    const getCountryCode = (country: ICountry) =>
        country.idd?.root
            ? `${country.idd.root}${country.idd.suffixes?.[0] || ""}`
            : ""

    return (
        <div className="relative">
            <Button
                disabled={disabled}
                type="button"
                variant="outline"
                className="w-full h-[48px] rounded-[14px] border justify-between"
                onClick={() => setIsOpen((v) => !v)}
            >
                <span className="flex items-center gap-2 truncate">
                    {selectedCountry ? (
                        <>
                            <span className="text-lg">{getFlag(selectedCountry.cca2)}</span>
                            {compact
                                ? getCountryCode(selectedCountry)
                                : selectedCountry.name.common}
                        </>
                    ) : (
                        compact ? (
                            <span className="text-gray-400">+Code</span>
                        ) : (
                            "Select country"
                        )
                    )}
                </span>
                <span className="ml-auto">
                    <svg width="16" height="16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" />
                    </svg>
                </span>
            </Button>
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                        <Input
                            placeholder="Search countries..."
                            disabled={disabled}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map((country) => (
                                <button
                                    key={country.cca2}
                                    type="button"
                                    onClick={() => {
                                        onCountryChange(country)
                                        setIsOpen(false)
                                        setSearchTerm("")
                                    }}
                                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${selectedCountry?.cca2 === country.cca2 ? "bg-blue-50 text-blue-600" : ""
                                        }`}
                                >
                                    <span className="text-lg">{getFlag(country.cca2)}</span>
                                    <span className="font-medium text-sm">{country.name.common}</span>
                                    <span className="ml-auto text-xs text-gray-400">{country.cca2}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                                No countries found matching "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

