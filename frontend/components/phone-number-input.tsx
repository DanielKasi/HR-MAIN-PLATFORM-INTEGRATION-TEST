import {useState, useEffect, use} from "react";
import {countryAPI} from "@/lib/helpers";
import {CountryCode, isValidPhoneNumber} from "libphonenumber-js";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {toast} from "sonner";
import CountrySelect from "@/components/common/country-select";
import type {ICountry} from "@/types/types.utils";

interface PhoneNumberInputProps {
  label?: string;
  required?: boolean;
  value: string;
  country: ICountry | null;
  onChange: (data: {
    country: ICountry | null;
    countryCode: string;
    phoneNumber: string;
    isValid: boolean;
  }) => void;
  error?: string | null;
  setError?: (error: string | null) => void;
  defaultCountry?: ICountry | null;
  defaultCountryCode?:string|null;
  disabled?: boolean;
}

export default function PhoneNumberInput({
  label = "Phone Number",
  required = false,
  value,
  country,
  onChange,
  error,
  setError,
  defaultCountry = null,
  disabled = false,
  defaultCountryCode=null
}: PhoneNumberInputProps) {
  const [countries, setCountries] = useState<ICountry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(
    country || defaultCountry,
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(value || "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [passedDefaultCountryCode, setPassedDefaultCountryCode] = useState<string|null>(null)


  useEffect(() => {
    setIsLoadingCountries(true);
    countryAPI
      .getAll()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCountries(data);
          if(passedDefaultCountryCode){
            const match = data.find((c) => c.idd?.root === passedDefaultCountryCode);
            if(match){setSelectedCountry(match)}
          }
          else if (!selectedCountry) {
            const ug = data.find((c) => c.cca2 === "UG" || c.name.common === "Uganda");
            if (ug) setSelectedCountry(ug);
          }
          
        } else {
          toast.error("Failed to load countries data");
        }
      })
      .catch((error) => {
        toast.error("Failed to load countries");
      })
      .finally(() => setIsLoadingCountries(false));
  }, []);

  useEffect(() => {
    setSelectedCountry(country || defaultCountry || null);
  }, [country, defaultCountry]);


  useEffect(() => {
    if(value && value != phoneNumber){
      setPhoneNumber(value);
    }
    if(defaultCountryCode && value){
      setPassedDefaultCountryCode(defaultCountryCode)
      if(!isValidPhoneNumber(defaultCountryCode+value, defaultCountryCode as CountryCode)){
        setPhoneError("Invalid phone number");
      }else{
        setPhoneError(null)
      }
    }
  }, [value, defaultCountryCode]);

  useEffect(() => {
    if (setError) {
      setError(phoneError);
    }
  }, [phoneError]);

  const getCountryCode = () => {
    if (!selectedCountry?.idd?.root) return "";
    const suffix = selectedCountry.idd.suffixes?.[0] || "";
    return `${selectedCountry.idd.root}${suffix}`;
  };




  const getFlag = (cca2: string) =>
    String.fromCodePoint(...cca2.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

  const handleCountryChange = (country: ICountry | null) => {
    setSelectedCountry(country);
    setPhoneError(null);
    setPhoneNumber("");
    onChange({
      country,
      countryCode: country ? getCountryCode() : "",
      phoneNumber: "",
      isValid: false,
    });
  };

  const cleanPhoneNUmber = (value: string) => {
    let sanitizedValue = value.replace(/\D/g, "");
    const countryCode = getCountryCode().replace(/\D/g, "");

    if (sanitizedValue.startsWith(countryCode)) {
      sanitizedValue = sanitizedValue.slice(countryCode.length);
    }
    return sanitizedValue
  }

  const handlePhoneChange = (value: string) => {
    let sanitizedValue = cleanPhoneNUmber(value)
    setPhoneNumber(sanitizedValue);

    if (selectedCountry && sanitizedValue) {
      const code = selectedCountry.cca2 as CountryCode;
      const fullNumber = `${getCountryCode()}${sanitizedValue}`;

      try {
        const isValid = isValidPhoneNumber(fullNumber, code);
        setPhoneError(isValid ? null : "Invalid phone number for selected country");
        onChange({
          country: selectedCountry,
          countryCode: getCountryCode(),
          phoneNumber: sanitizedValue,
          isValid: isValid,
        });
      } catch (error) {
        setPhoneError("Invalid phone number format");
        onChange({
          country: selectedCountry,
          countryCode: getCountryCode(),
          phoneNumber: sanitizedValue,
          isValid: false,
        });
      }
    } else {
      setPhoneError(null);
      onChange({
        country: selectedCountry,
        countryCode: getCountryCode(),
        phoneNumber: sanitizedValue,
        isValid: false,
      });
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="phone-number-input">
          {label}
          {required && " *"}
        </Label>
      )}
      <div className="flex gap-2 items-center justify-start">
        <div className="min-w-fit">
          <CountrySelect
            countries={countries}
            selectedCountry={selectedCountry}
            onCountryChange={handleCountryChange}
            disabled={disabled}
            compact={true}
          />
        </div>
        {/* <Input
          id="country_code"
          value={getCountryCode()}
          disabled
          style={{width: "80px"}}
          className="hidden" // Hide this, as code is now in CountrySelect
        /> */}
        <div className="flex-1 flex items-center gap-0">
          <Input
            id="phone-number-input"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="Enter phone number"
            required={required}
            type="tel"
            disabled={disabled}
            className="min-w-[12rem]"
          />
        </div>
      </div>
      {phoneError && <span className="text-red-500 text-xs">{phoneError}</span>}
    </div>
  );
}
