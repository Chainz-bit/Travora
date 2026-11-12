import { useState, useEffect, type FormEvent } from 'react';
import { Select } from '../../../components/ui/Select';
import { DatePicker } from '../../../components/ui/DatePicker';
import { Button } from '../../../components/ui/Button';
import { ArrowUpDownIcon, SearchIcon, MapPinIcon, AlertCircleIcon } from '../../../components/ui/Icons';
import { apiClient } from '../../../services/api';
import { getTodayDateString } from '../../../lib/utils';
import type {
  CityOption,
  SearchTicketFormValues,
  SearchTicketFormErrors,
} from '../../../types/index';

export interface SearchFormProps {
  initialValues?: Partial<SearchTicketFormValues>;
  onSearch: (values: SearchTicketFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

export function SearchForm({
  initialValues,
  onSearch,
  isLoading = false,
  className = '',
}: SearchFormProps) {
  const today = getTodayDateString();

  const [originCities, setOriginCities] = useState<CityOption[]>([]);
  const [destCities, setDestCities] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState<boolean>(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  const [values, setValues] = useState<SearchTicketFormValues>({
    originCityId: initialValues?.originCityId || '101',
    destinationCityId: initialValues?.destinationCityId || '201',
    departureDate: initialValues?.departureDate || today,
  });

  const [errors, setErrors] = useState<SearchTicketFormErrors>({});

  // Muat data master kota langsung dari Go REST API Backend
  useEffect(() => {
    let isMounted = true;
    async function loadMasterCities() {
      try {
        setCitiesLoading(true);
        setCitiesError(null);
        const [origins, destinations] = await Promise.all([
          apiClient.getOriginCities(),
          apiClient.getDestinationCities(),
        ]);

        if (isMounted) {
          setOriginCities(origins);
          setDestCities(destinations);
          setCitiesLoading(false);

          // Sinkronisasi nilai default jika kota tersedia
          setValues((prev) => {
            const hasOrigin = origins.some((o) => o.id === prev.originCityId);
            const hasDest = destinations.some((d) => d.id === prev.destinationCityId);

            return {
              ...prev,
              originCityId: hasOrigin ? prev.originCityId : (origins[0]?.id || '101'),
              destinationCityId: hasDest ? prev.destinationCityId : (destinations[0]?.id || '201'),
            };
          });
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Gagal memuat master kota dari backend Go API.';
          setCitiesError(message);
          setCitiesLoading(false);
        }
      }
    }

    loadMasterCities();

    return () => {
      isMounted = false;
    };
  }, []);

  function validate(formValues: SearchTicketFormValues): boolean {
    const newErrors: SearchTicketFormErrors = {};

    if (!formValues.originCityId) {
      newErrors.originCityId = 'Pilih kota asal keberangkatan.';
    }

    if (!formValues.destinationCityId) {
      newErrors.destinationCityId = 'Pilih kota tujuan perjalanan.';
    }

    // Periksa apakah nama kota asal dan tujuan sama
    const originObj = originCities.find((o) => o.id === formValues.originCityId);
    const destObj = destCities.find((d) => d.id === formValues.destinationCityId);

    if (originObj && destObj && originObj.name.toLowerCase() === destObj.name.toLowerCase()) {
      newErrors.destinationCityId = 'Kota tujuan tidak boleh sama dengan kota asal.';
    }

    if (!formValues.departureDate) {
      newErrors.departureDate = 'Pilih tanggal keberangkatan.';
    } else if (formValues.departureDate < today) {
      newErrors.departureDate = 'Tanggal keberangkatan tidak boleh di masa lalu.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (validate(values)) {
      onSearch(values);
    }
  }

  function handleSwap() {
    const currentOrigin = originCities.find((o) => o.id === values.originCityId);
    const currentDest = destCities.find((d) => d.id === values.destinationCityId);

    let newOriginId = values.destinationCityId;
    let newDestId = values.originCityId;

    // Cari pasangan kota berdasarkan kesamaan nama
    if (currentDest) {
      const matchedOrigin = originCities.find(
        (o) => o.name.toLowerCase() === currentDest.name.toLowerCase()
      );
      if (matchedOrigin) newOriginId = matchedOrigin.id;
    }

    if (currentOrigin) {
      const matchedDest = destCities.find(
        (d) => d.name.toLowerCase() === currentOrigin.name.toLowerCase()
      );
      if (matchedDest) newDestId = matchedDest.id;
    }

    setValues((prev) => ({
      ...prev,
      originCityId: newOriginId,
      destinationCityId: newDestId,
    }));
    setErrors({});
  }

  const originOptions = originCities.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const destOptions = destCities.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`bg-white rounded-2xl border border-stone-200/90 shadow-md p-5 sm:p-7 ${className}`}
    >
      <div className="space-y-4.5">
        {/* Banner Error jika master data kota dari API gagal */}
        {citiesError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircleIcon className="size-4 shrink-0 text-red-600" />
            <span>{citiesError}</span>
          </div>
        )}

        {/* Baris 1: Rute Asal & Tujuan */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3.5 sm:gap-4 items-end">
          {/* Kota Asal */}
          <div className="md:col-span-5">
            <Select
              label="Kota Asal"
              value={values.originCityId}
              options={originOptions}
              disabled={citiesLoading}
              error={errors.originCityId}
              leftIcon={<MapPinIcon className="size-4 text-primary" />}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, originCityId: e.target.value }));
                if (errors.originCityId || errors.destinationCityId) {
                  setErrors((prev) => ({
                    ...prev,
                    originCityId: undefined,
                    destinationCityId: undefined,
                  }));
                }
              }}
            />
          </div>

          {/* Tombol Swap Desktop */}
          <div className="hidden md:flex md:col-span-1 justify-center pb-0.5">
            <button
              type="button"
              onClick={handleSwap}
              disabled={citiesLoading}
              aria-label="Tukar kota asal dan tujuan"
              title="Tukar kota asal dan tujuan"
              className="size-11 rounded-xl border border-stone-300 bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 active:scale-95 flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <ArrowUpDownIcon className="size-4" />
            </button>
          </div>

          {/* Kota Tujuan */}
          <div className="md:col-span-5">
            <Select
              label="Kota Tujuan"
              value={values.destinationCityId}
              options={destOptions}
              disabled={citiesLoading}
              error={errors.destinationCityId}
              leftIcon={<MapPinIcon className="size-4 text-slate-800" />}
              onChange={(e) => {
                setValues((prev) => ({
                  ...prev,
                  destinationCityId: e.target.value,
                }));
                if (errors.destinationCityId) {
                  setErrors((prev) => ({
                    ...prev,
                    destinationCityId: undefined,
                  }));
                }
              }}
            />
          </div>
        </div>

        {/* Tombol Swap Mobile */}
        <div className="flex md:hidden justify-end">
          <button
            type="button"
            onClick={handleSwap}
            disabled={citiesLoading}
            className="text-xs text-primary font-semibold flex items-center gap-1.5 hover:underline py-1 px-2 rounded cursor-pointer disabled:opacity-50"
          >
            <ArrowUpDownIcon className="size-3.5" />
            Tukar Asal & Tujuan
          </button>
        </div>

        {/* Baris 2: Tanggal Keberangkatan & Tombol Submit */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pt-1">
          <div className="sm:col-span-6 lg:col-span-7">
            <DatePicker
              label="Tanggal Keberangkatan"
              value={values.departureDate}
              error={errors.departureDate}
              onChange={(e) => {
                setValues((prev) => ({
                  ...prev,
                  departureDate: e.target.value,
                }));
                if (errors.departureDate) {
                  setErrors((prev) => ({ ...prev, departureDate: undefined }));
                }
              }}
            />
          </div>

          <div className="sm:col-span-6 lg:col-span-5 flex sm:justify-end">
            <Button
              type="submit"
              size="lg"
              variant="primary"
              isLoading={isLoading || citiesLoading}
              leftIcon={<SearchIcon className="size-5" />}
              className="w-full h-11 justify-center text-sm sm:text-base px-4 sm:px-6"
            >
              Cari Jadwal Perjalanan
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
