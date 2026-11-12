/**
 * SHARED LOCAL MOCK STORE — TRAVORA
 *
 * Catatan Arsitektur & Batasan Demonstrasi:
 * 1. Penyimpanan Lokal Browser: Seluruh data master, jadwal, pesanan, konfirmasi,
 *    dan keluhan dikelola di dalam localStorage peramban (browser) yang sama.
 * 2. Pembaruan Dalam Aplikasi: Mutasi data memancarkan CustomEvent ('travora_store_changed')
 *    untuk re-render komponen secara sinkron dalam satu tab/jendela.
 * 3. Sinkronisasi Antar-Tab: Event 'storage' dari window ditangani agar perubahan
 *    pada tab lain dapat diperbarui secara otomatis.
 * 4. BUKAN Database Real-Time / Server Produksi: Data TIDAK tersinkronisasi lintas
 *    perangkat atau browser yang berbeda, dan belum tersimpan pada server backend produksi.
 * 5. Kredensial & Keamanan: Password pengguna TIDAK PERNAH disimpan ke dalam shared store ini.
 * 6. Pemisahan View Model & Status Mock:
 *    Atribut berikut murni merupakan mock field / view model frontend / metadata
 *    demonstrasi UI, dan BUKAN merupakan atribut DDL database resmi yang final:
 *    - Kota_Asal.code & Kota_Tujuan.code (singkatan visual nama kota untuk UI)
 *    - Kendaraan.status (status kesiapan operasional armada demonstrasi)
 *    - Jadwal.isActive (flag keaktifan tampilan jadwal di UI)
 *    - Pesan.totalPrice, Pesan.bookingDate, Pesan.status (alur status demonstrasi)
 *    - Konfirmasi_Pesanan.bookingId, Konfirmasi_Pesanan.status (status penelaahan loket)
 *    - Keluhan.subject, Keluhan.adminResponse (uraian tanggapan demonstrasi)
 */

import type {
  CityEntity,
  CityFormValues,
  VehicleEntity,
  VehicleFormValues,
  ScheduleEntity,
  ScheduleFormValues,
  ScheduleViewModel,
  BookingViewModel,
  BookingStatus,
  PaymentConfirmationViewModel,
  PaymentConfirmationValues,
  ComplaintViewModel,
  ComplaintFormValues,
  AdminComplaintReplyValues,
  MemberProfile,
  AdminDashboardMetrics,
  OperatorDashboardMetrics,
  MemberDashboardMetrics,
} from '../../../types/index';

// Storage keys
const ORIGIN_CITIES_KEY = 'travora_demo_origin_cities';
const DEST_CITIES_KEY = 'travora_demo_destination_cities';
const VEHICLES_KEY = 'travora_demo_vehicles';
const SCHEDULES_KEY = 'travora_demo_schedules';
const BOOKINGS_KEY = 'travora_demo_bookings';
const CONFIRMATIONS_KEY = 'travora_demo_confirmations';
const COMPLAINTS_KEY = 'travora_demo_complaints';

// Default initial fixtures
const DEFAULT_ORIGIN_CITIES: CityEntity[] = [
  { id: 'city-bdg', name: 'Bandung', code: 'BDG' },
  { id: 'city-jkt', name: 'Jakarta', code: 'JKT' },
  { id: 'city-ygy', name: 'Yogyakarta', code: 'YGY' },
  { id: 'city-smg', name: 'Semarang', code: 'SMG' },
  { id: 'city-sby', name: 'Surabaya', code: 'SBY' },
  { id: 'city-mlg', name: 'Malang', code: 'MLG' },
  { id: 'city-crb', name: 'Cirebon', code: 'CRB' },
  { id: 'city-slo', name: 'Solo', code: 'SLO' },
];

const DEFAULT_DEST_CITIES: CityEntity[] = [
  { id: 'city-jkt', name: 'Jakarta', code: 'JKT' },
  { id: 'city-bdg', name: 'Bandung', code: 'BDG' },
  { id: 'city-smg', name: 'Semarang', code: 'SMG' },
  { id: 'city-ygy', name: 'Yogyakarta', code: 'YGY' },
  { id: 'city-mlg', name: 'Malang', code: 'MLG' },
  { id: 'city-sby', name: 'Surabaya', code: 'SBY' },
  { id: 'city-crb', name: 'Cirebon', code: 'CRB' },
  { id: 'city-slo', name: 'Solo', code: 'SLO' },
];

const DEFAULT_VEHICLES: VehicleEntity[] = [
  { id: 'VH-01', name: 'HiAce Executive Shuttle', plateNumber: 'D 7102 TRV', status: 'aktif' },
  { id: 'VH-02', name: 'HiAce Commuter', plateNumber: 'D 7104 TRV', status: 'aktif' },
  { id: 'VH-03', name: 'Isuzu Elf Premier', plateNumber: 'D 7188 TRV', status: 'aktif' },
  { id: 'VH-04', name: 'HiAce Executive Shuttle', plateNumber: 'B 2011 TRV', status: 'aktif' },
  { id: 'VH-05', name: 'Trans-Jawa Minibus', plateNumber: 'AB 1890 TRV', status: 'aktif' },
  { id: 'VH-06', name: 'Bromo Shuttle Line', plateNumber: 'L 1945 TRV', status: 'aktif' },
];

const DEFAULT_SCHEDULE_ENTITIES: ScheduleEntity[] = [
  {
    id: 'SCH-BDG-JKT-01',
    originCityId: 'city-bdg',
    destinationCityId: 'city-jkt',
    vehicleId: 'VH-01',
    departureDate: '2026-11-12',
    departureTime: '06:00 WIB',
    price: 135000,
    isActive: true,
  },
  {
    id: 'SCH-BDG-JKT-02',
    originCityId: 'city-bdg',
    destinationCityId: 'city-jkt',
    vehicleId: 'VH-02',
    departureDate: '2026-11-12',
    departureTime: '09:30 WIB',
    price: 135000,
    isActive: true,
  },
  {
    id: 'SCH-BDG-JKT-03',
    originCityId: 'city-bdg',
    destinationCityId: 'city-jkt',
    vehicleId: 'VH-03',
    departureDate: '2026-11-12',
    departureTime: '14:00 WIB',
    price: 145000,
    isActive: true,
  },
  {
    id: 'SCH-JKT-BDG-01',
    originCityId: 'city-jkt',
    destinationCityId: 'city-bdg',
    vehicleId: 'VH-04',
    departureDate: '2026-11-12',
    departureTime: '07:00 WIB',
    price: 135000,
    isActive: true,
  },
  {
    id: 'SCH-JKT-BDG-02',
    originCityId: 'city-jkt',
    destinationCityId: 'city-bdg',
    vehicleId: 'VH-03',
    departureDate: '2026-11-12',
    departureTime: '13:30 WIB',
    price: 145000,
    isActive: true,
  },
  {
    id: 'SCH-YGY-SMG-01',
    originCityId: 'city-ygy',
    destinationCityId: 'city-smg',
    vehicleId: 'VH-05',
    departureDate: '2026-11-12',
    departureTime: '08:00 WIB',
    price: 95000,
    isActive: true,
  },
  {
    id: 'SCH-SBY-MLG-01',
    originCityId: 'city-sby',
    destinationCityId: 'city-mlg',
    vehicleId: 'VH-06',
    departureDate: '2026-11-12',
    departureTime: '06:30 WIB',
    price: 85000,
    isActive: true,
  },
];

// Seed bookings
const DEFAULT_INITIAL_BOOKINGS: BookingViewModel[] = [
  {
    id: 'TRV-202611-001',
    scheduleId: 'SCH-BDG-JKT-01',
    schedule: {
      id: 'SCH-BDG-JKT-01',
      originCityId: 'city-bdg',
      originCityName: 'Bandung',
      destinationCityId: 'city-jkt',
      destinationCityName: 'Jakarta',
      departureDate: '2026-11-12',
      departureTime: '06:00 WIB',
      vehicleName: 'HiAce Executive Shuttle',
      vehiclePlate: 'D 7102 TRV',
      price: 135000,
      availableSeats: 4,
    },
    memberId: 'MBR-001',
    memberName: 'Budi Pratama',
    memberPhone: '081234567890',
    seatNumber: '04',
    totalPrice: 135000,
    bookingDate: '2026-11-10 14:22 WIB',
    status: 'terkonfirmasi',
    paymentConfirmationId: 'KNF-001',
  },
  {
    id: 'TRV-202611-002',
    scheduleId: 'SCH-JKT-BDG-02',
    schedule: {
      id: 'SCH-JKT-BDG-02',
      originCityId: 'city-jkt',
      originCityName: 'Jakarta',
      destinationCityId: 'city-bdg',
      destinationCityName: 'Bandung',
      departureDate: '2026-11-12',
      departureTime: '13:30 WIB',
      vehicleName: 'Isuzu Elf Premier',
      vehiclePlate: 'D 7188 TRV',
      price: 145000,
      availableSeats: 6,
    },
    memberId: 'MBR-001',
    memberName: 'Budi Pratama',
    memberPhone: '081234567890',
    seatNumber: '02',
    totalPrice: 145000,
    bookingDate: '2026-11-11 09:15 WIB',
    status: 'menunggu_verifikasi',
    paymentConfirmationId: 'KNF-002',
  },
  {
    id: 'TRV-202611-003',
    scheduleId: 'SCH-YGY-SMG-01',
    schedule: {
      id: 'SCH-YGY-SMG-01',
      originCityId: 'city-ygy',
      originCityName: 'Yogyakarta',
      destinationCityId: 'city-smg',
      destinationCityName: 'Semarang',
      departureDate: '2026-11-08',
      departureTime: '08:00 WIB',
      vehicleName: 'Trans-Jawa Minibus',
      vehiclePlate: 'AB 1890 TRV',
      price: 95000,
      availableSeats: 4,
    },
    memberId: 'MBR-001',
    memberName: 'Budi Pratama',
    memberPhone: '081234567890',
    seatNumber: '06',
    totalPrice: 95000,
    bookingDate: '2026-11-06 11:00 WIB',
    status: 'selesai',
    paymentConfirmationId: 'KNF-000',
  },
];

const DEFAULT_CONFIRMATIONS: PaymentConfirmationViewModel[] = [
  {
    id: 'KNF-001',
    bookingId: 'TRV-202611-001',
    bankName: 'BCA (Bank Central Asia)',
    accountHolder: 'Budi Pratama',
    accountNumber: '8271092811',
    transferAmount: 135000,
    transferDate: '2026-11-10',
    status: 'terverifikasi',
    submittedAt: '2026-11-10 15:00 WIB',
  },
  {
    id: 'KNF-002',
    bookingId: 'TRV-202611-002',
    bankName: 'Bank Mandiri',
    accountHolder: 'Budi Pratama',
    accountNumber: '13700192811',
    transferAmount: 145000,
    transferDate: '2026-11-11',
    status: 'menunggu_verifikasi',
    submittedAt: '2026-11-11 10:00 WIB',
  },
];

const DEFAULT_COMPLAINTS: ComplaintViewModel[] = [
  {
    id: 'KLP-001',
    memberId: 'MBR-001',
    memberName: 'Budi Pratama',
    bookingId: 'TRV-202611-003',
    bookingCode: 'TRV-202611-003',
    subject: 'Kondisi pendingin ruangan armada minibus',
    message:
      'Pada perjalanan dari Yogyakarta menuju Semarang tanggal 9 November, hembusan AC terasa kurang dingin di baris kursi belakang saat siang hari.',
    status: 'selesai',
    createdAt: '2026-11-09 18:30 WIB',
    adminResponse:
      '[Respon Demonstrasi Admin] Terima kasih atas laporan Bapak Budi. Laporan keluhan telah ditinjau oleh tim Admin dan diteruskan ke bagian pemeliharaan armada untuk pengecekan unit kompresor.',
    resolvedAt: '2026-11-10 10:15 WIB',
  },
];

// Helper to notify subscribers across the frontend
function emitStoreChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('travora_store_changed'));
  }
}

// Local storage reader/writer helpers
function getFromStorage<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // fallback
  }
  localStorage.setItem(key, JSON.stringify(defaultVal));
  return defaultVal;
}

function setToStorage<T>(key: string, val: T): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(val));
    emitStoreChange();
  }
}

export const sharedStore = {
  // ==========================================
  // KOTA ASAL & KOTA TUJUAN (Kota_Asal, Kota_Tujuan)
  // ==========================================
  getOriginCities(): CityEntity[] {
    return getFromStorage<CityEntity[]>(ORIGIN_CITIES_KEY, DEFAULT_ORIGIN_CITIES);
  },

  getOriginCityById(id: string): CityEntity | null {
    const list = this.getOriginCities();
    return list.find((c) => c.id === id) || null;
  },

  addOriginCity(values: CityFormValues): { success: boolean; data?: CityEntity; error?: string } {
    const cleanName = values.name.trim();
    const cleanCode = values.code.trim().toUpperCase();
    if (!cleanName || !cleanCode) {
      return { success: false, error: 'Nama dan kode kota asal wajib diisi.' };
    }

    const list = this.getOriginCities();
    if (list.some((c) => c.name.toLowerCase() === cleanName.toLowerCase() || c.code === cleanCode)) {
      return { success: false, error: 'Kota asal dengan nama atau kode tersebut sudah terdaftar.' };
    }

    const newCity: CityEntity = {
      id: `city-${cleanCode.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      name: cleanName,
      code: cleanCode,
    };

    list.push(newCity);
    setToStorage(ORIGIN_CITIES_KEY, list);
    return { success: true, data: newCity };
  },

  updateOriginCity(id: string, values: CityFormValues): { success: boolean; data?: CityEntity; error?: string } {
    const cleanName = values.name.trim();
    const cleanCode = values.code.trim().toUpperCase();
    if (!cleanName || !cleanCode) {
      return { success: false, error: 'Nama dan kode kota asal wajib diisi.' };
    }

    const list = this.getOriginCities();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return { success: false, error: 'Kota asal tidak ditemukan.' };

    if (list.some((c, i) => i !== index && (c.name.toLowerCase() === cleanName.toLowerCase() || c.code === cleanCode))) {
      return { success: false, error: 'Nama atau kode kota sudah digunakan oleh kota asal lain.' };
    }

    list[index].name = cleanName;
    list[index].code = cleanCode;
    setToStorage(ORIGIN_CITIES_KEY, list);
    return { success: true, data: list[index] };
  },

  deleteOriginCity(id: string): { success: boolean; error?: string } {
    // Check if any schedule references this originCityId
    const schedules = this.getScheduleEntities();
    const isUsed = schedules.some((s) => s.originCityId === id && s.isActive);
    if (isUsed) {
      return {
        success: false,
        error: 'Kota asal tidak dapat dihapus karena masih digunakan dalam jadwal aktif. Nonaktifkan jadwal terkait terlebih dahulu.',
      };
    }

    const list = this.getOriginCities();
    const filtered = list.filter((c) => c.id !== id);
    if (filtered.length === list.length) {
      return { success: false, error: 'Kota asal tidak ditemukan.' };
    }

    setToStorage(ORIGIN_CITIES_KEY, filtered);
    return { success: true };
  },

  // Destination Cities
  getDestinationCities(): CityEntity[] {
    return getFromStorage<CityEntity[]>(DEST_CITIES_KEY, DEFAULT_DEST_CITIES);
  },

  getDestinationCityById(id: string): CityEntity | null {
    const list = this.getDestinationCities();
    return list.find((c) => c.id === id) || null;
  },

  addDestinationCity(values: CityFormValues): { success: boolean; data?: CityEntity; error?: string } {
    const cleanName = values.name.trim();
    const cleanCode = values.code.trim().toUpperCase();
    if (!cleanName || !cleanCode) {
      return { success: false, error: 'Nama dan kode kota tujuan wajib diisi.' };
    }

    const list = this.getDestinationCities();
    if (list.some((c) => c.name.toLowerCase() === cleanName.toLowerCase() || c.code === cleanCode)) {
      return { success: false, error: 'Kota tujuan dengan nama atau kode tersebut sudah terdaftar.' };
    }

    const newCity: CityEntity = {
      id: `city-${cleanCode.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      name: cleanName,
      code: cleanCode,
    };

    list.push(newCity);
    setToStorage(DEST_CITIES_KEY, list);
    return { success: true, data: newCity };
  },

  updateDestinationCity(id: string, values: CityFormValues): { success: boolean; data?: CityEntity; error?: string } {
    const cleanName = values.name.trim();
    const cleanCode = values.code.trim().toUpperCase();
    if (!cleanName || !cleanCode) {
      return { success: false, error: 'Nama dan kode kota tujuan wajib diisi.' };
    }

    const list = this.getDestinationCities();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return { success: false, error: 'Kota tujuan tidak ditemukan.' };

    if (list.some((c, i) => i !== index && (c.name.toLowerCase() === cleanName.toLowerCase() || c.code === cleanCode))) {
      return { success: false, error: 'Nama atau kode kota sudah digunakan oleh kota tujuan lain.' };
    }

    list[index].name = cleanName;
    list[index].code = cleanCode;
    setToStorage(DEST_CITIES_KEY, list);
    return { success: true, data: list[index] };
  },

  deleteDestinationCity(id: string): { success: boolean; error?: string } {
    const schedules = this.getScheduleEntities();
    const isUsed = schedules.some((s) => s.destinationCityId === id && s.isActive);
    if (isUsed) {
      return {
        success: false,
        error: 'Kota tujuan tidak dapat dihapus karena masih digunakan dalam jadwal aktif. Nonaktifkan jadwal terkait terlebih dahulu.',
      };
    }

    const list = this.getDestinationCities();
    const filtered = list.filter((c) => c.id !== id);
    if (filtered.length === list.length) {
      return { success: false, error: 'Kota tujuan tidak ditemukan.' };
    }

    setToStorage(DEST_CITIES_KEY, filtered);
    return { success: true };
  },

  // ==========================================
  // KENDARAAN (Kendaraan)
  // ==========================================
  getVehicles(): VehicleEntity[] {
    return getFromStorage<VehicleEntity[]>(VEHICLES_KEY, DEFAULT_VEHICLES);
  },

  getVehicleById(id: string): VehicleEntity | null {
    const list = this.getVehicles();
    return list.find((v) => v.id === id) || null;
  },

  addVehicle(values: VehicleFormValues): { success: boolean; data?: VehicleEntity; error?: string } {
    const cleanName = values.name.trim();
    const cleanPlate = values.plateNumber.trim().toUpperCase();
    if (!cleanName || !cleanPlate) {
      return { success: false, error: 'Nama kendaraan dan nomor plat wajib diisi.' };
    }

    const list = this.getVehicles();
    if (list.some((v) => v.plateNumber === cleanPlate)) {
      return { success: false, error: 'Nomor plat kendaraan tersebut sudah terdaftar.' };
    }

    const newVehicle: VehicleEntity = {
      id: `VH-${String(list.length + 1).padStart(2, '0')}`,
      name: cleanName,
      plateNumber: cleanPlate,
      status: values.status,
    };

    list.push(newVehicle);
    setToStorage(VEHICLES_KEY, list);
    return { success: true, data: newVehicle };
  },

  updateVehicle(id: string, values: VehicleFormValues): { success: boolean; data?: VehicleEntity; error?: string } {
    const cleanName = values.name.trim();
    const cleanPlate = values.plateNumber.trim().toUpperCase();
    if (!cleanName || !cleanPlate) {
      return { success: false, error: 'Nama kendaraan dan nomor plat wajib diisi.' };
    }

    const list = this.getVehicles();
    const index = list.findIndex((v) => v.id === id);
    if (index === -1) return { success: false, error: 'Kendaraan tidak ditemukan.' };

    if (list.some((v, i) => i !== index && v.plateNumber === cleanPlate)) {
      return { success: false, error: 'Nomor plat kendaraan sudah digunakan armada lain.' };
    }

    list[index].name = cleanName;
    list[index].plateNumber = cleanPlate;
    list[index].status = values.status;
    setToStorage(VEHICLES_KEY, list);
    return { success: true, data: list[index] };
  },

  deleteVehicle(id: string): { success: boolean; error?: string } {
    const schedules = this.getScheduleEntities();
    const isUsed = schedules.some((s) => s.vehicleId === id && s.isActive);
    if (isUsed) {
      return {
        success: false,
        error: 'Kendaraan tidak dapat dihapus karena masih ditugaskan pada jadwal aktif.',
      };
    }

    const list = this.getVehicles();
    const filtered = list.filter((v) => v.id !== id);
    if (filtered.length === list.length) {
      return { success: false, error: 'Kendaraan tidak ditemukan.' };
    }

    setToStorage(VEHICLES_KEY, filtered);
    return { success: true };
  },

  // ==========================================
  // JADWAL (Jadwal)
  // ==========================================
  getScheduleEntities(): ScheduleEntity[] {
    return getFromStorage<ScheduleEntity[]>(SCHEDULES_KEY, DEFAULT_SCHEDULE_ENTITIES);
  },

  getSchedules(onlyActive = false): ScheduleViewModel[] {
    const entities = this.getScheduleEntities();
    const originCities = this.getOriginCities();
    const destCities = this.getDestinationCities();
    const vehicles = this.getVehicles();

    const filtered = onlyActive ? entities.filter((e) => e.isActive) : entities;

    return filtered.map((e) => {
      const origin = originCities.find((c) => c.id === e.originCityId);
      const dest = destCities.find((c) => c.id === e.destinationCityId);
      const vehicle = vehicles.find((v) => v.id === e.vehicleId);

      return {
        id: e.id,
        originCityId: e.originCityId,
        originCityName: origin?.name || 'Kota Asal',
        destinationCityId: e.destinationCityId,
        destinationCityName: dest?.name || 'Kota Tujuan',
        departureDate: e.departureDate,
        departureTime: e.departureTime,
        vehicleName: vehicle?.name || 'Shuttle Travel',
        vehiclePlate: vehicle?.plateNumber || 'D 0000 TRV',
        price: e.price,
        availableSeats: 4,
      };
    });
  },

  getScheduleById(id: string): ScheduleViewModel | null {
    const list = this.getSchedules(false);
    return list.find((s) => s.id === id) || null;
  },

  addSchedule(values: ScheduleFormValues): { success: boolean; data?: ScheduleViewModel; error?: string } {
    if (!values.originCityId || !values.destinationCityId || !values.vehicleId) {
      return { success: false, error: 'Kota asal, kota tujuan, dan kendaraan wajib dipilih.' };
    }
    if (values.originCityId === values.destinationCityId) {
      return { success: false, error: 'Kota asal dan kota tujuan tidak boleh sama.' };
    }
    if (!values.departureDate || !values.departureTime) {
      return { success: false, error: 'Tanggal dan jam keberangkatan wajib diisi.' };
    }
    if (values.price <= 0) {
      return { success: false, error: 'Tarif tiket harus bernilai positif (lebih besar dari 0).' };
    }

    const entities = this.getScheduleEntities();
    // Duplicate check
    const isDuplicate = entities.some(
      (e) =>
        e.originCityId === values.originCityId &&
        e.destinationCityId === values.destinationCityId &&
        e.departureDate === values.departureDate &&
        e.departureTime.trim().toLowerCase() === values.departureTime.trim().toLowerCase() &&
        e.vehicleId === values.vehicleId
    );
    if (isDuplicate) {
      return { success: false, error: 'Jadwal serupa pada tanggal, rute, dan kendaraan yang sama sudah terdaftar.' };
    }

    const newId = `SCH-${Date.now().toString().slice(-6)}`;
    const newEntity: ScheduleEntity = {
      id: newId,
      originCityId: values.originCityId,
      destinationCityId: values.destinationCityId,
      vehicleId: values.vehicleId,
      departureDate: values.departureDate,
      departureTime: values.departureTime.trim(),
      price: values.price,
      isActive: values.isActive,
    };

    entities.unshift(newEntity);
    setToStorage(SCHEDULES_KEY, entities);

    const view = this.getScheduleById(newId);
    return { success: true, data: view || undefined };
  },

  updateSchedule(id: string, values: ScheduleFormValues): { success: boolean; data?: ScheduleViewModel; error?: string } {
    if (!values.originCityId || !values.destinationCityId || !values.vehicleId) {
      return { success: false, error: 'Kota asal, kota tujuan, dan kendaraan wajib dipilih.' };
    }
    if (values.originCityId === values.destinationCityId) {
      return { success: false, error: 'Kota asal dan kota tujuan tidak boleh sama.' };
    }
    if (!values.departureDate || !values.departureTime) {
      return { success: false, error: 'Tanggal dan jam keberangkatan wajib diisi.' };
    }
    if (values.price <= 0) {
      return { success: false, error: 'Tarif tiket harus bernilai positif.' };
    }

    const entities = this.getScheduleEntities();
    const index = entities.findIndex((e) => e.id === id);
    if (index === -1) return { success: false, error: 'Jadwal tidak ditemukan.' };

    entities[index] = {
      ...entities[index],
      originCityId: values.originCityId,
      destinationCityId: values.destinationCityId,
      vehicleId: values.vehicleId,
      departureDate: values.departureDate,
      departureTime: values.departureTime.trim(),
      price: values.price,
      isActive: values.isActive,
    };

    setToStorage(SCHEDULES_KEY, entities);
    const view = this.getScheduleById(id);
    return { success: true, data: view || undefined };
  },

  toggleScheduleActive(id: string): boolean {
    const entities = this.getScheduleEntities();
    const item = entities.find((e) => e.id === id);
    if (!item) return false;
    item.isActive = !item.isActive;
    setToStorage(SCHEDULES_KEY, entities);
    return true;
  },

  deleteSchedule(id: string): { success: boolean; error?: string } {
    const entities = this.getScheduleEntities();
    // Check if bookings exist for this schedule
    const bookings = this.getBookings();
    const hasBookings = bookings.some((b) => b.scheduleId === id);

    if (hasBookings) {
      // Soft deactivate instead of destroying booking foreign key references
      const item = entities.find((e) => e.id === id);
      if (item) {
        item.isActive = false;
        setToStorage(SCHEDULES_KEY, entities);
        return {
          success: true,
          error: 'Jadwal telah dinonaktifkan karena terdapat riwayat pesanan tiket terkait.',
        };
      }
    }

    const filtered = entities.filter((e) => e.id !== id);
    setToStorage(SCHEDULES_KEY, filtered);
    return { success: true };
  },

  // ==========================================
  // PESAN (Pesan / Bookings)
  // ==========================================
  getBookings(filter?: { memberId?: string; date?: string }): BookingViewModel[] {
    const all = getFromStorage<BookingViewModel[]>(BOOKINGS_KEY, DEFAULT_INITIAL_BOOKINGS);
    let result = all;
    if (filter?.memberId) {
      result = result.filter((b) => b.memberId === filter.memberId);
    }
    if (filter?.date) {
      result = result.filter((b) => b.schedule.departureDate === filter.date);
    }
    return result;
  },

  getBookingById(id: string): BookingViewModel | null {
    const all = this.getBookings();
    return all.find((b) => b.id === id) || null;
  },

  createBooking(input: {
    scheduleId: string;
    seatNumber: string;
    member: MemberProfile;
  }): BookingViewModel {
    const all = this.getBookings();
    const schedule = this.getScheduleById(input.scheduleId) || this.getSchedules()[0];

    const count = all.length + 1;
    const bookingCode = `TRV-202611-${String(count).padStart(3, '0')}`;

    const newBooking: BookingViewModel = {
      id: bookingCode,
      scheduleId: schedule.id,
      schedule,
      memberId: input.member.id,
      memberName: input.member.name,
      memberPhone: input.member.phone || '081234567890',
      seatNumber: input.seatNumber,
      totalPrice: schedule.price,
      bookingDate: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      status: 'menunggu_pembayaran',
    };

    all.unshift(newBooking);
    setToStorage(BOOKINGS_KEY, all);
    return newBooking;
  },

  updateBookingStatus(bookingId: string, status: BookingStatus, paymentConfirmationId?: string): boolean {
    const all = this.getBookings();
    const index = all.findIndex((b) => b.id === bookingId);
    if (index === -1) return false;

    all[index].status = status;
    if (paymentConfirmationId) {
      all[index].paymentConfirmationId = paymentConfirmationId;
    }
    setToStorage(BOOKINGS_KEY, all);
    return true;
  },

  /**
   * Validasi Keberangkatan Penumpang di Loket Resmi.
   * Catatan Semantik: Mengubah status UI mock workflow pesanan menjadi 'selesai'
   * yang ditampilkan di antarmuka sebagai 'Keberangkatan Tervalidasi' (Sudah Check-in).
   */
  validateDeparture(bookingId: string): { success: boolean; error?: string } {
    const all = this.getBookings();
    const index = all.findIndex((b) => b.id === bookingId);
    if (index === -1) {
      return { success: false, error: 'Pesanan tidak ditemukan.' };
    }
    if (all[index].status !== 'terkonfirmasi') {
      return {
        success: false,
        error: `Pesanan belum berstatus terkonfirmasi (status saat ini: ${all[index].status}). Hanya tiket terkonfirmasi yang dapat divalidasi keberangkatannya.`,
      };
    }

    all[index].status = 'selesai';
    setToStorage(BOOKINGS_KEY, all);
    return { success: true };
  },

  // ==========================================
  // KONFIRMASI PESANAN (Konfirmasi_Pesanan)
  // ==========================================
  getConfirmations(): PaymentConfirmationViewModel[] {
    return getFromStorage<PaymentConfirmationViewModel[]>(CONFIRMATIONS_KEY, DEFAULT_CONFIRMATIONS);
  },

  getConfirmationByBookingId(bookingId: string): PaymentConfirmationViewModel | null {
    const list = this.getConfirmations();
    return list.find((c) => c.bookingId === bookingId) || null;
  },

  submitConfirmation(values: PaymentConfirmationValues): PaymentConfirmationViewModel {
    const list = this.getConfirmations();
    const newId = `KNF-${String(list.length + 1).padStart(3, '0')}`;
    const newConfirmation: PaymentConfirmationViewModel = {
      id: newId,
      bookingId: values.bookingId,
      bankName: values.bankName,
      accountHolder: values.accountHolder,
      accountNumber: values.accountNumber,
      transferAmount: values.transferAmount,
      transferDate: values.transferDate,
      status: 'menunggu_verifikasi',
      submittedAt: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
    };

    list.unshift(newConfirmation);
    setToStorage(CONFIRMATIONS_KEY, list);

    // Update corresponding booking status to 'menunggu_verifikasi'
    this.updateBookingStatus(values.bookingId, 'menunggu_verifikasi', newId);
    return newConfirmation;
  },

  verifyConfirmation(confirmationId: string, approved: boolean): { success: boolean; error?: string } {
    const list = this.getConfirmations();
    const index = list.findIndex((c) => c.id === confirmationId);
    if (index === -1) {
      return { success: false, error: 'Data konfirmasi pembayaran tidak ditemukan.' };
    }

    const conf = list[index];
    const newStatus = approved ? 'terverifikasi' : 'ditolak';
    conf.status = newStatus;
    setToStorage(CONFIRMATIONS_KEY, list);

    // Update corresponding booking
    const bookingStatus: BookingStatus = approved ? 'terkonfirmasi' : 'menunggu_pembayaran';
    this.updateBookingStatus(conf.bookingId, bookingStatus, conf.id);
    return { success: true };
  },

  // ==========================================
  // KELUHAN (Keluhan)
  // ==========================================
  getComplaints(memberId?: string): ComplaintViewModel[] {
    const all = getFromStorage<ComplaintViewModel[]>(COMPLAINTS_KEY, DEFAULT_COMPLAINTS);
    if (!memberId) return all;
    return all.filter((c) => c.memberId === memberId);
  },

  getComplaintById(id: string): ComplaintViewModel | null {
    const all = this.getComplaints();
    return all.find((c) => c.id === id) || null;
  },

  submitComplaint(values: ComplaintFormValues, member: MemberProfile): ComplaintViewModel {
    const all = this.getComplaints();
    const newId = `KLP-${String(all.length + 1).padStart(3, '0')}`;
    const newComplaint: ComplaintViewModel = {
      id: newId,
      memberId: member.id,
      memberName: member.name,
      bookingId: values.bookingId || undefined,
      bookingCode: values.bookingId || undefined,
      subject: values.subject.trim(),
      message: values.message.trim(),
      status: 'diajukan',
      createdAt: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
    };

    all.unshift(newComplaint);
    setToStorage(COMPLAINTS_KEY, all);
    return newComplaint;
  },

  replyComplaint(id: string, reply: AdminComplaintReplyValues): { success: boolean; error?: string } {
    const all = this.getComplaints();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) {
      return { success: false, error: 'Data keluhan tidak ditemukan.' };
    }

    const cleanReply = reply.adminResponse.trim();
    if (!cleanReply) {
      return { success: false, error: 'Uraian tanggapan admin wajib diisi.' };
    }

    all[index].adminResponse = cleanReply;
    all[index].status = reply.status;
    all[index].resolvedAt = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

    setToStorage(COMPLAINTS_KEY, all);
    return { success: true };
  },

  // ==========================================
  // METRICS COMPUTATION (Live from Shared State)
  // ==========================================
  getAdminMetrics(): AdminDashboardMetrics {
    const schedules = this.getScheduleEntities();
    const vehicles = this.getVehicles();
    const complaints = this.getComplaints();

    return {
      activeSchedulesCount: schedules.filter((s) => s.isActive).length,
      vehiclesCount: vehicles.length,
      pendingComplaintsCount: complaints.filter((c) => c.status === 'diajukan' || c.status === 'diproses').length,
    };
  },

  getOperatorMetrics(todayDate?: string): OperatorDashboardMetrics {
    const queryDate = todayDate || new Date().toISOString().split('T')[0];
    const schedules = this.getScheduleEntities();
    const bookings = this.getBookings();
    const confirmations = this.getConfirmations();

    const todaySchedules = schedules.filter((s) => s.isActive && s.departureDate === queryDate);
    const todayBookings = bookings.filter((b) => b.schedule.departureDate === queryDate);
    const pendingConfirmations = confirmations.filter((c) => c.status === 'menunggu_verifikasi');

    return {
      todaySchedulesCount: todaySchedules.length,
      todayBookingsCount: todayBookings.length,
      pendingConfirmationsCount: pendingConfirmations.length,
    };
  },

  getMemberMetrics(memberId?: string): MemberDashboardMetrics {
    const list = this.getBookings({ memberId });
    return {
      activeTicketsCount: list.filter((b) => b.status === 'terkonfirmasi').length,
      pendingPaymentCount: list.filter((b) => b.status === 'menunggu_pembayaran' || b.status === 'menunggu_verifikasi').length,
      totalTripsCount: list.filter((b) => b.status === 'selesai' || b.status === 'terkonfirmasi').length,
    };
  },

  resetDemoData(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ORIGIN_CITIES_KEY, JSON.stringify(DEFAULT_ORIGIN_CITIES));
      localStorage.setItem(DEST_CITIES_KEY, JSON.stringify(DEFAULT_DEST_CITIES));
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(DEFAULT_VEHICLES));
      localStorage.setItem(SCHEDULES_KEY, JSON.stringify(DEFAULT_SCHEDULE_ENTITIES));
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(DEFAULT_INITIAL_BOOKINGS));
      localStorage.setItem(CONFIRMATIONS_KEY, JSON.stringify(DEFAULT_CONFIRMATIONS));
      localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(DEFAULT_COMPLAINTS));
      emitStoreChange();
    }
  },
};
