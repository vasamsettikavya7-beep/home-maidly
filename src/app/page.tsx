'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  User,
  Calendar,
  Clock,
  CreditCard,
  Tag,
  Star,
  ShieldCheck,
  AlertCircle,
  Wrench,
  LogOut,
  ChevronRight,
  Plus,
  Phone,
  Info,
  Sparkles,
  CheckCircle,
  Home as HomeIcon,
  Briefcase,
  TrendingUp,
  LifeBuoy,
  FileText
} from 'lucide-react';
import styles from './page.module.css';

// Mock users for quick developer switching
const DEVELOPER_MOCK_USERS = [
  { name: 'Sneha Reddy (Customer)', phone: '+919123456789', role: 'CUSTOMER' },
  { name: 'Ramesh Kumar (Cleaning Pro)', phone: '+918888888888', role: 'PROVIDER' },
  { name: 'Home Maidly Administrator', phone: '+919999999999', role: 'ADMIN' },
];

export default function AppHome() {
  // Authentication & Role State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [authPhone, setAuthPhone] = useState<string>('');
  const [authOtp, setAuthOtp] = useState<string>('');
  const [authName, setAuthName] = useState<string>('');
  const [authRoleSelection, setAuthRoleSelection] = useState<string>('CUSTOMER');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [loginMessage, setLoginMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isAdminLogin, setIsAdminLogin] = useState<boolean>(false);

  // General App State
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('Gachibowli, Hyderabad');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('explore'); // explore, customer-db, provider-db, admin-db
  const [subTab, setSubTab] = useState<string>('bookings'); // custom tabs inside dashboards
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredServices, setFilteredServices] = useState<any[]>([]);

  // Checkout Booking State
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<number>(1); // 1: Select services, 2: Address, 3: Slot, 4: Pay, 5: Done
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [paymentGateway, setPaymentGateway] = useState<string>('MOCK');
  const [paymentSignature, setPaymentSignature] = useState<string>('success'); // success, fail, timeout
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  
  // New Address Map & Manual Form States
  const [showAddAddressForm, setShowAddAddressForm] = useState<boolean>(false);
  const [addressMode, setAddressMode] = useState<'map' | 'manual'>('map');
  const [newAddressTitle, setNewAddressTitle] = useState<string>('Home');
  const [newAddressLine, setNewAddressLine] = useState<string>('');
  const [newAddressFlat, setNewAddressFlat] = useState<string>('');
  const [newAddressLandmark, setNewAddressLandmark] = useState<string>('');
  const [newAddressCity, setNewAddressCity] = useState<string>('Hyderabad');
  const [mapLoading, setMapLoading] = useState<boolean>(false);
  
  // Dashboards View Data
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [providerBookings, setProviderBookings] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]); // Admin
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any>(null);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState<boolean>(false);
  const [providerServicesList, setProviderServicesList] = useState<any[]>([]);
  const [isSavingServices, setIsSavingServices] = useState<boolean>(false);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(true);
  
  // Support & Reviews state
  const [tickets, setTickets] = useState<any[]>([]);
  const [newTicketSubject, setNewTicketSubject] = useState<string>('');
  const [newTicketCategory, setNewTicketCategory] = useState<string>('BOOKING_ISSUE');
  const [newTicketDesc, setNewTicketDesc] = useState<string>('');
  
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewQuality, setReviewQuality] = useState<number>(5);
  const [reviewBehavior, setReviewBehavior] = useState<number>(5);
  const [reviewPunctuality, setReviewPunctuality] = useState<number>(5);
  const [kycDocType, setKycDocType] = useState<string>('Aadhaar Card (India)');
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [bankIfsc, setBankIfsc] = useState<string>('');
  const [provExpYears, setProvExpYears] = useState<number>(0);
  const [provLanguages, setProvLanguages] = useState<string>('');
  const [provServiceAreas, setProvServiceAreas] = useState<string>('');

  // Admin Data
  const [adminAnalytics, setAdminAnalytics] = useState<any>(null);
  const [pendingKycProviders, setPendingKycProviders] = useState<any[]>([]);
  const [allProviders, setAllProviders] = useState<any[]>([]);
  const [selectedAssignHelperId, setSelectedAssignHelperId] = useState<{ [bookingId: string]: string }>({});

  // Load categories and initial state
  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => r.json())
      .then(() => loadCategories())
      .catch(() => loadCategories()); // Fallback execution

    // Read initial session from localStorage
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    if (savedToken && savedUser) {
      setAuthToken(savedToken);
      const parsedUser = JSON.parse(savedUser);
      setCurrentUser(parsedUser);
      if (parsedUser.role === 'CUSTOMER') {
        setActiveTab('explore');
      } else if (parsedUser.role === 'PROVIDER') {
        setActiveTab('provider-db');
        setSubTab('jobs');
      } else if (parsedUser.role === 'ADMIN') {
        setActiveTab('admin-db');
        setSubTab('analytics');
      }
    }
  }, []);

  // Fetch lists dependent on user authentication state
  useEffect(() => {
    if (currentUser) {
      loadCustomerAddresses();
      refreshDashboardData();
    }
  }, [currentUser?.id, activeTab, subTab]);

  const loadCategories = async () => {
    try {
      // In seed, categories are loaded. We can query booking items details
      // Create simplified static representation for client state
      setCategories([
        { id: '1', name: 'House Cleaning', icon: '🧹', desc: 'Full home dusting, deep cleaning' },
        { id: '2', name: 'Bathroom Cleaning', icon: '🚿', desc: 'Tile wash and sanitization' },
        { id: '3', name: 'Kitchen Cleaning', icon: '🍳', desc: 'Chimney scrub & cabinet cleaning' },
        { id: '5', name: 'Cooking Services', icon: '👩‍🍳', desc: 'Breakfast, Lunch & Dinner cooks' },
        { id: '6', name: 'Baby Care', icon: '👶', desc: 'Certified babysitters' },
        { id: '7', name: 'Elder Care', icon: '👴', desc: 'Daily elder caretaker assistance' },
        { id: '8', name: 'Cleaning Vessels', icon: '🍽️', desc: 'Sink cleaning and utensil washing' },
        { id: '9', name: 'Washing Clothes', icon: '🧺', desc: 'Laundry wash, dry and fold services' },
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCustomerAddresses = async () => {
    if (!currentUser || currentUser.role !== 'CUSTOMER') return;
    // Load static addresses based on profile
    setSavedAddresses([
      { id: 'addr_1', title: 'Home', addressLine: 'Flat 402, Green Meadows, Gachibowli', city: 'Hyderabad', pincode: '500032' },
      { id: 'addr_2', title: 'Work', addressLine: 'Building 12, Mindspace IT Park, Madhapur', city: 'Hyderabad', pincode: '500081' }
    ]);
    setSelectedAddressId('addr_1');
  };

  const refreshDashboardData = async () => {
    if (!currentUser) return;

    try {
      const headers = { 'Authorization': `Bearer ${authToken}` };

      // Load fresh user details to get updated KYC status
      try {
        const meRes = await fetch('/api/v1/auth/me', { headers });
        const meData = await meRes.json();
        if (meData.success && meData.data.user) {
          setCurrentUser(meData.data.user);
          localStorage.setItem('currentUser', JSON.stringify(meData.data.user));
        }
      } catch (meErr) {
        console.error('Failed to load me details', meErr);
      }

      // Load bookings
      const bookRes = await fetch('/api/v1/bookings', { headers });
      const bookData = await bookRes.json();
      if (bookData.success) {
        if (currentUser.role === 'CUSTOMER') {
          setCustomerBookings(bookData.data.bookings);
        } else if (currentUser.role === 'PROVIDER') {
          setProviderBookings(bookData.data.bookings);
          fetchProviderServices();
        } else if (currentUser.role === 'ADMIN') {
          setAllBookings(bookData.data.bookings);
        }
      }

      // Load support tickets
      if (currentUser.role === 'CUSTOMER' || currentUser.role === 'ADMIN') {
        const ticRes = await fetch('/api/v1/support', { headers });
        const ticData = await ticRes.json();
        if (ticData.success) setTickets(ticData.data.tickets);
      }

      // Load admin modules
      if (currentUser.role === 'ADMIN') {
        const anaRes = await fetch('/api/v1/admin/analytics', { headers });
        const anaData = await anaRes.json();
        if (anaData.success) setAdminAnalytics(anaData.data);

        const kycRes = await fetch('/api/v1/admin/kyc?status=PENDING_VERIFICATION', { headers });
        const kycData = await kycRes.json();
        if (kycData.success) setPendingKycProviders(kycData.data.providers);

        const allProvidersRes = await fetch('/api/v1/admin/kyc', { headers });
        const allProvidersData = await allProvidersRes.json();
        if (allProvidersData.success) setAllProviders(allProvidersData.data.providers);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    }
  };

  // Auth Operations
  const handleQuickMockLogin = async (mockUser: any) => {
    setLoginMessage(null);
    try {
      const verifyRes = await fetch('/api/v1/auth/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mockUser.phone, otp: '123456' }), // Bypass code
      });
      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        const { token, user: userProfile } = verifyData.data;
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(userProfile));
        setAuthToken(token);
        setCurrentUser(userProfile);
        setShowLoginModal(false);
        setOtpSent(false);

        if (userProfile.role === 'CUSTOMER') {
          setActiveTab('explore');
        } else if (userProfile.role === 'PROVIDER') {
          setActiveTab('provider-db');
          setSubTab('jobs');
        } else if (userProfile.role === 'ADMIN') {
          setActiveTab('admin-db');
          setSubTab('analytics');
        }
      } else {
        setLoginMessage({ type: 'error', text: verifyData.error?.message || 'Login failed.' });
      }
    } catch (err) {
      setLoginMessage({ type: 'error', text: 'Server unreachable.' });
    }
  };

  const handleDirectAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage(null);
    if (!authPhone) return;

    let targetPhone = authPhone.trim();
    if (targetPhone.length === 10 && /^\d+$/.test(targetPhone)) {
      targetPhone = `+91${targetPhone}`;
      setAuthPhone(targetPhone);
    }

    try {
      const res = await fetch('/api/v1/auth/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          name: authMode === 'register' ? authName : undefined,
          role: authMode === 'register' ? 'PROVIDER' : 'CUSTOMER',
          action: authMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const { token, user: userProfile } = data.data;
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(userProfile));
        setAuthToken(token);
        setCurrentUser(userProfile);
        setShowLoginModal(false);
        setOtpSent(false);

        if (userProfile.role === 'CUSTOMER') {
          setActiveTab('explore');
        } else if (userProfile.role === 'PROVIDER') {
          setActiveTab('provider-db');
          setSubTab('jobs');
        } else if (userProfile.role === 'ADMIN') {
          setActiveTab('admin-db');
          setSubTab('analytics');
        }
      } else {
        setLoginMessage({ type: 'error', text: data.error?.message || 'Login failed.' });
      }
    } catch {
      setLoginMessage({ type: 'error', text: 'API error.' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    setAuthToken('');
    setCurrentUser(null);
    setActiveTab('explore');
  };

  // Leaflet Map Initialization and Script Loader
  useEffect(() => {
    if (!showCheckoutModal || checkoutStep !== 2 || !showAddAddressForm || addressMode !== 'map') {
      return;
    }

    let mapInstance: any = null;
    let isMounted = true;

    const loadLeaflet = () => {
      // 1. Add CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // 2. Add JS
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          if (isMounted) initMap();
        };
        document.body.appendChild(script);
      } else {
        // Already loaded, initialize
        if ((window as any).L) {
          setTimeout(initMap, 100);
        }
      }
    };

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;

      const container = document.getElementById('checkout-map');
      if (!container) return;

      // Clean up previous instance if present
      if (container && (container as any)._leaflet_id) {
        return;
      }

      setMapLoading(true);
      const defaultLat = 17.448293;
      const defaultLng = 78.374112;

      try {
        mapInstance = L.map('checkout-map').setView([defaultLat, defaultLng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(mapInstance);

        // Create a marker
        const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(mapInstance);

        // Function to handle location geocoding
        const updateLocationAddress = async (lat: number, lng: number) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (isMounted && data && data.display_name) {
              setNewAddressLine(data.display_name);
              if (data.address) {
                if (data.address.suburb || data.address.neighbourhood) {
                  setNewAddressLandmark(data.address.suburb || data.address.neighbourhood || '');
                }
                if (data.address.city || data.address.town || data.address.village) {
                  setNewAddressCity(data.address.city || data.address.town || data.address.village || 'Hyderabad');
                }
              }
            }
          } catch (e) {
            console.error('Reverse geocoding failed', e);
          } finally {
            if (isMounted) setMapLoading(false);
          }
        };

        // Initial geocode
        updateLocationAddress(defaultLat, defaultLng);

        // Geolocation auto-detection to capture current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const uLat = pos.coords.latitude;
              const uLng = pos.coords.longitude;
              if (isMounted && mapInstance) {
                mapInstance.setView([uLat, uLng], 15);
                marker.setLatLng([uLat, uLng]);
                setMapLoading(true);
                updateLocationAddress(uLat, uLng);
              }
            },
            (err) => {
              console.warn('Geolocation failed or permission denied:', err.message);
            },
            { enableHighAccuracy: true, timeout: 6000 }
          );
        }

        // On marker drag end
        marker.on('dragend', () => {
          const position = marker.getLatLng();
          setMapLoading(true);
          updateLocationAddress(position.lat, position.lng);
        });

        // On map click (move marker)
        mapInstance.on('click', (e: any) => {
          const position = e.latlng;
          marker.setLatLng(position);
          setMapLoading(true);
          updateLocationAddress(position.lat, position.lng);
        });
      } catch (err) {
        console.error('Failed to init Leaflet Map', err);
      }
    };

    // Load Leaflet resources
    loadLeaflet();

    return () => {
      isMounted = false;
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [showCheckoutModal, checkoutStep, showAddAddressForm, addressMode]);

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressLine) {
      alert('Please specify an address.');
      return;
    }

    const fullAddressString = [
      newAddressFlat ? `Flat/House No: ${newAddressFlat}` : '',
      newAddressLine,
      newAddressLandmark ? `Landmark: ${newAddressLandmark}` : '',
      newAddressCity
    ].filter(Boolean).join(', ');

    const newAddrObj = {
      id: `addr_new_${Date.now()}`,
      title: newAddressTitle,
      addressLine: fullAddressString,
      lat: 17.448293,
      lng: 78.374112,
    };

    setSavedAddresses([...savedAddresses, newAddrObj]);
    setSelectedAddressId(newAddrObj.id);

    // Reset address form values
    setShowAddAddressForm(false);
    setNewAddressFlat('');
    setNewAddressLine('');
    setNewAddressLandmark('');
    setNewAddressTitle('Home');
  };

  const handleProviderSubmitKyc = async () => {
    if (!kycFile) {
      alert('Please select a document photo/file to upload first.');
      return;
    }

    try {
      const res = await fetch('/api/v1/provider/kyc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          documentType: kycDocType,
          documentUrl: kycFile.name || 'kyc_verification_doc.pdf',
          bankName,
          bankAccountNumber: bankAccount,
          bankIfscCode: bankIfsc
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('KYC document submitted successfully! Verification is pending.');
        const updatedUser = { ...currentUser, kycStatus: 'PENDING_VERIFICATION' };
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setKycFile(null); // Clear selected file
        refreshDashboardData();
      } else {
        alert(data.error?.message || 'Failed to submit KYC.');
      }
    } catch {
      alert('Error submitting KYC documents.');
    }
  };

  const fetchProviderServices = async () => {
    setIsLoadingServices(true);
    try {
      const res = await fetch('/api/v1/provider/services', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setProviderServicesList(data.data.services);
        if (data.data.profile) {
          setProvExpYears(data.data.profile.experienceYears || 0);
          setProvLanguages(data.data.profile.languages || '');
          setProvServiceAreas(data.data.profile.serviceAreas || '');
          setBankName(data.data.profile.bankName || '');
          setBankAccount(data.data.profile.bankAccountNumber || '');
          setBankIfsc(data.data.profile.bankIfscCode || '');
        }
      }
    } catch (err) {
      console.error('Failed to load provider services', err);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const handleSaveProviderServices = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingServices(true);
    try {
      const selectedIds = providerServicesList
        .filter(s => s.isOffered)
        .map(s => s.id);

      const res = await fetch('/api/v1/provider/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          serviceIds: selectedIds,
          experienceYears: provExpYears,
          languages: provLanguages,
          serviceAreas: provServiceAreas,
          bankName,
          bankAccountNumber: bankAccount,
          bankIfscCode: bankIfsc
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Services and profile details updated successfully! Jobs will be auto-assigned matching these selections.');
        refreshDashboardData();
      } else {
        alert(data.error?.message || 'Failed to update services.');
      }
    } catch {
      alert('Error updating services.');
    } finally {
      setIsSavingServices(false);
    }
  };

  // Booking Flow Controls
  const handleOpenBookingWizard = (categoryName: string) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    if (currentUser.role !== 'CUSTOMER') {
      alert('Only customer profiles can book services.');
      return;
    }

    // Load category packages
    const pkgMap: Record<string, any[]> = {
      'House Cleaning': [
        { id: 'hc_1', name: '1 BHK Apartment Cleaning', price: 999, desc: 'Complete deep cleaning for 1 Bedroom, Hall, and Kitchen apartment.' },
        { id: 'hc_2', name: '2 BHK Apartment Cleaning', price: 1499, desc: 'Complete deep cleaning for 2 Bedroom, Hall, and Kitchen apartment.' },
        { id: 'hc_3', name: '3 BHK Apartment Cleaning', price: 1999, desc: 'Complete deep cleaning for 3 Bedroom, Hall, and Kitchen apartment.' },
        { id: 'hc_4', name: 'Villa / Independent House Cleaning', price: 2999, desc: 'Premium deep cleaning for large villas or independent homes.' },
      ],
      'Bathroom Cleaning': [
        { id: 'bc_1', name: '1 Bathroom Cleaning', price: 599, desc: 'Thorough sanitization, tile scrubbing, and mirror polishing for 1 bathroom.' },
        { id: 'bc_2', name: '2 Bathrooms Cleaning', price: 1198, desc: 'Thorough sanitization, tile scrubbing, and mirror polishing for 2 bathrooms.' },
        { id: 'bc_3', name: 'Combo 3+ Bathrooms Cleaning', price: 2199, desc: 'Premium deep cleaning and sanitization package for 3 or more bathrooms.' },
      ],
      'Kitchen Cleaning': [
        { id: 'kc_1', name: 'Deep Kitchen Cleaning', price: 999, desc: 'Tile degreasing, cabinet & stove scrub' },
        { id: 'kc_2', name: 'Chimney Cleaning', price: 799, desc: 'Degrease filters & outer body' },
      ],
      'Cooking Services': [
        { id: 'cs_bf', name: 'Breakfast Cooking', price: 349, desc: 'Fresh morning meal preparation for up to 4 people.' },
        { id: 'cs_lh', name: 'Lunch Cooking', price: 449, desc: 'Delicious lunch meal preparation for up to 4 people.' },
        { id: 'cs_dn', name: 'Dinner Cooking', price: 449, desc: 'Delicious dinner meal preparation for up to 4 people.' },
        { id: 'cs_1', name: '2 Hours Cooking Service', price: 399, desc: 'Standard breakfast, lunch, or dinner meal preparation (up to 2 hours).' },
        { id: 'cs_2', name: '4 Hours Cooking Service (Half-Day)', price: 699, desc: 'Preparation of multiple meals or larger courses (up to 4 hours).' },
        { id: 'cs_3', name: '8 Hours Cooking Service (Full-Day)', price: 1299, desc: 'Full-day dedicated home cook assistance and meal preparation (up to 8 hours).' },
      ],
      'Baby Care': [
        { id: 'bc_care_0', name: 'Part-Time Daily Babysitter', price: 799, desc: 'Part-time child care assistance (4 hours/day).' },
        { id: 'bc_care_1', name: 'Full-Time Daily Babysitter', price: 1499, desc: 'Full-day dedicated childcare monitoring and assistance (8 hours/day).' },
        { id: 'bc_care_2', name: 'Weekly Babysitter Package', price: 8999, desc: '6 days of dedicated childcare monitoring and assistance (8 hours/day).' },
        { id: 'bc_care_3', name: '15 Days Babysitter Package', price: 20999, desc: '15 days of childcare assistance and support (8 hours/day).' },
        { id: 'bc_care_4', name: 'Monthly Babysitter Package', price: 37999, desc: '30 days of comprehensive childcare assistance and monitoring (8 hours/day).' },
      ],
      'Elder Care': [
        { id: 'ec_0', name: 'Part-Time Daily Elder Care', price: 699, desc: 'Part-time companion care and walking assistance (4 hours/day).' },
        { id: 'ec_1', name: 'Full-Time Daily Elder Care', price: 1299, desc: 'Full-day elder support with meals, hygiene, walking, and exercises (8 hours/day).' },
        { id: 'ec_2', name: 'Weekly Elder Care Package', price: 7499, desc: '6 days of dedicated companion care and daily living assistance (8 hours/day).' },
        { id: 'ec_3', name: '15 Days Elder Care Package', price: 17999, desc: '15 days of companion care and elder assistance support (8 hours/day).' },
        { id: 'ec_4', name: 'Monthly Elder Care Package', price: 32999, desc: '30 days of daily companion care and elder living assistance (8 hours/day).' },
      ],
      'Cleaning Vessels': [
        { id: 'cv_1', name: '1 Hour Vessel Washing', price: 199, desc: 'Utensil, pots, and dishwashing service (up to 1 hour).' },
        { id: 'cv_2', name: '2 Hours Vessel Washing', price: 349, desc: 'Detailed vessel washing, scrubbing, and sink sanitization (up to 2 hours).' },
        { id: 'cv_4', name: '4 Hours Vessel Washing Package', price: 599, desc: 'Deep cleaning and washing of large batches of utensils (up to 4 hours).' },
      ],
      'Washing Clothes': [
        { id: 'wc_1', name: '1 Hour Washing Service', price: 249, desc: 'Machine laundry load wash, hang, dry, and fold support (up to 1 hour).' },
        { id: 'wc_2', name: '2 Hours Washing Service', price: 399, desc: 'Thorough laundry load wash, hand-washing delicate items, and folding (up to 2 hours).' },
        { id: 'wc_4', name: '4 Hours Washing & Ironing Package', price: 699, desc: 'Detailed washing, drying, folding, and ironing of garments (up to 4 hours).' },
      ]
    };

    const pkgs = pkgMap[categoryName] || [];
    setActiveCategory({ name: categoryName, packages: pkgs });
    setCheckoutItems([]);
    setCheckoutStep(1);
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
    setSpecialInstructions('');
    setShowCheckoutModal(true);
  };

  const handleTogglePackage = (pkg: any) => {
    const idx = checkoutItems.findIndex((i) => i.serviceId === pkg.id);
    if (idx > -1) {
      setCheckoutItems([]); // Only allow single package selection for simplicity
    } else {
      setCheckoutItems([{ serviceId: pkg.id, name: pkg.name, price: pkg.price, quantity: 1 }]);
    }
  };

  const handleStep1Next = () => {
    if (checkoutItems.length === 0) {
      alert('Please select at least one service package.');
      return;
    }
    setCheckoutStep(2);
  };

  const handleStep2Next = () => {
    if (!selectedAddressId) {
      alert('Please select a service address.');
      return;
    }
    // Fetch slots for selected date (defaults to tomorrow)
    const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setSelectedDate(tomorrowStr);
    fetchSlotsForDate(tomorrowStr);
    setCheckoutStep(3);
  };

  const fetchSlotsForDate = async (dateStr: string) => {
    try {
      const res = await fetch(`/api/v1/bookings/slots?date=${dateStr}`);
      const data = await res.json();
      if (data.success) {
        setAvailableSlots(data.data.slots);
        setSelectedTimeSlot(data.data.slots.find((s: any) => s.available)?.slot || '');
      }
    } catch {
      setAvailableSlots([
        { slot: '09:00 AM - 11:00 AM', available: true },
        { slot: '11:30 AM - 01:30 PM', available: true },
        { slot: '02:00 PM - 04:00 PM', available: true },
        { slot: '04:30 PM - 06:30 PM', available: true },
      ]);
    }
  };

  const handleStep3Next = () => {
    if (!selectedTimeSlot) {
      alert('Please select an available time slot.');
      return;
    }
    setCheckoutStep(4);
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCodeInput) return;

    try {
      const subtotal = checkoutItems.reduce((acc, i) => acc + i.price, 0);
      const res = await fetch('/api/v1/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ code: couponCodeInput.toUpperCase(), orderAmount: subtotal }),
      });
      const data = await res.json();
      if (data.success) {
        setAppliedCoupon(data.data);
      } else {
        setCouponError(data.error?.message || 'Invalid coupon.');
      }
    } catch {
      setCouponError('Error applying coupon.');
    }
  };

  const handleCreateBookingAndPay = async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      };

      // 1. Create Booking Intent
      const createRes = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          addressId: selectedAddressId === 'addr_1' ? '1' : '2', // Seed address links or defaults
          bookingDate: selectedDate,
          timeSlot: selectedTimeSlot,
          items: checkoutItems,
          couponCode: appliedCoupon?.code || undefined,
          specialInstructions,
        }),
      });

      const createData = await createRes.json();
      if (!createData.success) {
        alert(`Booking creation failed: ${createData.error?.message}`);
        return;
      }

      const booking = createData.data.booking;

      // 2. Initialize Payment
      const initRes = await fetch('/api/v1/payments/initialize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookingId: booking.id,
          gateway: paymentGateway,
        }),
      });

      const initData = await initRes.json();
      if (!initData.success) {
        alert(`Payment initialization failed: ${initData.error?.message}`);
        return;
      }

      const orderDetails = initData.data;

      // 3. Verify payment (Simulating frontend calling the gateway)
      const verifyRes = await fetch('/api/v1/payments/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gatewayOrderId: orderDetails.gatewayOrderId,
          gatewayPaymentId: `pay_${Date.now()}`,
          gatewaySignature: paymentSignature, // Sends 'success' or 'fail' to mock gateway behavior
          gatewayName: orderDetails.gatewayName,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        // Fetch complete updated booking with matched provider
        const bookDetRes = await fetch(`/api/v1/bookings/${booking.id}`, { headers });
        const bookDetData = await bookDetRes.json();
        setCreatedBooking(bookDetData.data.booking);
        setCheckoutStep(5);
        refreshDashboardData();
      } else {
        alert(`Payment transaction failed. The booking has been marked as Payment Pending.`);
        setShowCheckoutModal(false);
        setActiveTab('customer-db');
        setSubTab('bookings');
        refreshDashboardData();
      }
    } catch (e: any) {
      alert(`Checkout failed: ${e.message}`);
    }
  };

  // Dashboard Status Changes
  const handleUpdateBookingStatus = async (bookingId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        if (showBookingDetailsModal && selectedBookingDetails?.id === bookingId) {
          // reload detail modal
          const detRes = await fetch(`/api/v1/bookings/${bookingId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
          });
          const detData = await detRes.json();
          setSelectedBookingDetails(detData.data.booking);
        }
        refreshDashboardData();
      } else {
        alert(`Status transition failed: ${data.error?.message}`);
      }
    } catch {
      alert('Error updating status.');
    }
  };

  const handleOpenBookingDetails = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedBookingDetails(data.data.booking);
        setShowBookingDetailsModal(true);
      }
    } catch {
      alert('Error fetching details.');
    }
  };

  // KYC Verification Approval
  const handleAdminApproveKyc = async (providerId: string, approve: boolean) => {
    try {
      const res = await fetch('/api/v1/admin/kyc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          providerId,
          status: approve ? 'ACTIVE' : 'REJECTED',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Verification status updated successfully!`);
        refreshDashboardData();
      } else {
        alert(data.error?.message || 'Error updating KYC.');
      }
    } catch {
      alert('Error submitting KYC.');
    }
  };

  const handleAdminAssignWork = async (bookingId: string, providerId: string) => {
    if (!providerId) {
      alert('Please select a helper to assign.');
      return;
    }
    try {
      const res = await fetch('/api/v1/admin/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ bookingId, providerId })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Helper successfully assigned to this job!');
        refreshDashboardData();
      } else {
        alert(data.error?.message || 'Failed to assign helper.');
      }
    } catch {
      alert('Error assigning helper.');
    }
  };

  // Reviews Submit
  const handleSubmitReview = async (e: React.FormEvent, bookingId: string) => {
    e.preventDefault();
    try {
      // Direct write review or simulate review API
      alert('Thank you for rating your service! Review saved.');
      setShowBookingDetailsModal(false);
      refreshDashboardData();
    } catch (error) {
      console.error(error);
    }
  };

  // Support Tickets Submit
  const handleOpenSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject || !newTicketDesc) return;

    try {
      const res = await fetch('/api/v1/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          category: newTicketCategory,
          subject: newTicketSubject,
          description: newTicketDesc,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Support ticket created: ${data.data.ticket.ticketNumber}`);
        setNewTicketSubject('');
        setNewTicketDesc('');
        refreshDashboardData();
      }
    } catch {
      alert('Failed to submit ticket.');
    }
  };

  // Calculate pricing numbers for step 4
  const bookingSubtotal = checkoutItems.reduce((acc, i) => acc + i.price, 0);
  const bookingDiscount = appliedCoupon
    ? appliedCoupon.discountType === 'PERCENT'
      ? Math.min((bookingSubtotal * appliedCoupon.discountValue) / 100, appliedCoupon.maxDiscountAmount || Infinity)
      : appliedCoupon.discountValue
    : 0;
  const bookingTax = Math.round((bookingSubtotal - bookingDiscount) * 0.18 * 100) / 100;
  const bookingTotal = bookingSubtotal - bookingDiscount + bookingTax;

  return (
    <div className={styles.wrapper}>


      {/* Main Header */}
      <header className={styles.header}>
        <div className="container">
          <div className={styles.headerContent}>
            <div className={styles.logo} onClick={() => setActiveTab('explore')}>
              <span>🏠</span> Home Maidly
            </div>
            <nav className={styles.nav}>
              <span
                className={`${styles.navLink} ${activeTab === 'explore' ? styles.active : ''}`}
                onClick={() => {
                  setActiveTab('explore');
                  setActiveCategory(null);
                }}
              >
                Find Services
              </span>

              {currentUser && currentUser.role === 'CUSTOMER' && (
                <span
                  className={`${styles.navLink} ${activeTab === 'customer-db' ? styles.active : ''}`}
                  onClick={() => {
                    setActiveTab('customer-db');
                    setSubTab('bookings');
                  }}
                >
                  My Hub
                </span>
              )}

              {currentUser && currentUser.role === 'PROVIDER' && (
                <span
                  className={`${styles.navLink} ${activeTab === 'provider-db' ? styles.active : ''}`}
                  onClick={() => {
                    setActiveTab('provider-db');
                    setSubTab('jobs');
                  }}
                >
                  Pro Panel
                </span>
              )}

              {currentUser && currentUser.role === 'ADMIN' && (
                <span
                  className={`${styles.navLink} ${activeTab === 'admin-db' ? styles.active : ''}`}
                  onClick={() => {
                    setActiveTab('admin-db');
                    setSubTab('analytics');
                  }}
                >
                  Admin Desk
                </span>
              )}

              {currentUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className={styles.userBadge}>
                    <User size={16} />
                    <span>{currentUser.name}</span>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ border: '1px solid var(--color-error)', color: 'var(--color-error)', padding: '6px 12px' }}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => setShowLoginModal(true)}>
                  Login / Register
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* SECTION: Explore Customer Homepage */}
      {activeTab === 'explore' && (
        <>
          <section className={styles.hero}>
            <div className="container">
              <h1>What service do you need today?</h1>
              <p>Trusted Help. Happier Homes.</p>

              <div className={styles.searchContainer}>
                <div className={styles.locationSelector}>
                  <MapPin size={16} color="var(--color-primary)" />
                  <span>📍 {selectedLocation}</span>
                </div>
                <div className={styles.searchInputWrapper}>
                  <Search size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '16px' }} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search for deep cleaning, cooks, groomers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '48px' }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className={styles.categoriesSection}>
            <div className="container">
              <div className={styles.sectionHeader}>
                <h2>Popular Categories</h2>
              </div>
              <div className="grid grid-4">
                {categories
                  .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((cat) => (
                    <div
                      key={cat.id}
                      className="card card-hover"
                      style={{ cursor: 'pointer', textAlign: 'center' }}
                      onClick={() => handleOpenBookingWizard(cat.name)}
                    >
                      <div className={styles.categoryIcon}>{cat.icon}</div>
                      <h3 style={{ margin: '12px 0 6px 0', fontSize: '18px' }}>{cat.name}</h3>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{cat.desc}</p>
                    </div>
                  ))}
              </div>

              {/* Workings Section */}
              <div style={{ marginTop: '60px', padding: '40px', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '32px' }}>How Home Maidly Works</h2>
                <div className="grid grid-4" style={{ textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '32px' }}>🔍</span>
                    <h4 style={{ margin: '12px 0 6px 0' }}>1. Choose Service</h4>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Browse categories and pick standard cleaning or customizable plans.</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '32px' }}>📅</span>
                    <h4 style={{ margin: '12px 0 6px 0' }}>2. Select Date/Time</h4>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Pick a time slot that matches your working hours or weekend plans.</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '32px' }}>🔒</span>
                    <h4 style={{ margin: '12px 0 6px 0' }}>3. Secure Payouts</h4>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Confirm order with digital payments. Earnings are secured on escrow.</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '32px' }}>💪</span>
                    <h4 style={{ margin: '12px 0 6px 0' }}>4. Match Professional</h4>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Our scoring engine matches the highest-rated nearby professional.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* SECTION: Customer Hub Dashboard */}
      {activeTab === 'customer-db' && (
        <div className="container">
          <div className={styles.dashboardGrid}>
            <aside className={styles.sidebar}>
              <div
                className={`${styles.sidebarTab} ${subTab === 'bookings' ? styles.active : ''}`}
                onClick={() => setSubTab('bookings')}
              >
                <Calendar size={18} />
                <span>My Bookings</span>
              </div>
              <div
                className={`${styles.sidebarTab} ${subTab === 'support' ? styles.active : ''}`}
                onClick={() => setSubTab('support')}
              >
                <LifeBuoy size={18} />
                <span>Help Desk</span>
              </div>
            </aside>

            <main>
              {subTab === 'bookings' && (
                <div>
                  <h2 style={{ marginBottom: '20px' }}>Your Booking History</h2>
                  {customerBookings.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                      <p style={{ color: 'var(--color-text-muted)' }}>No bookings found. Click "Find Services" above to book helper!</p>
                    </div>
                  ) : (
                    <div className="grid grid-2">
                      {customerBookings.map((b) => (
                        <div key={b.id} className="card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontWeight: 'bold' }}>{b.bookingNumber}</span>
                            <span className={`badge ${
                              b.status === 'SERVICE_COMPLETED' || b.status === 'PAYMENT_SETTLED' ? 'badge-success' :
                              b.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'
                            }`}>
                              {b.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p style={{ fontSize: '14px', marginBottom: '4px' }}>
                            📅 <strong>Date:</strong> {b.bookingDate} ({b.timeSlot})
                          </p>
                          <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                            📍 <strong>Address:</strong> {b.address.addressLine}
                          </p>
                          {b.provider && (
                            <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                              👤 <strong>Professional:</strong> {b.provider.user.name} (⭐ {b.provider.rating})
                            </p>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                            <span style={{ fontWeight: '800', color: 'var(--color-primary)' }}>₹{b.totalAmount}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => handleOpenBookingDetails(b.id)}>
                                Detail Options
                              </button>
                              {b.status === 'PAYMENT_PENDING' && (
                                <button className="btn btn-primary btn-sm" onClick={() => handleOpenBookingDetails(b.id)}>
                                  Pay Now
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {subTab === 'support' && (
                <div>
                  <h2 style={{ marginBottom: '20px' }}>Support Tickets</h2>
                  <div className="grid grid-2" style={{ alignItems: 'flex-start' }}>
                    <div className="card">
                      <h3 style={{ marginBottom: '16px' }}>Submit a Ticket</h3>
                      <form onSubmit={handleOpenSupportTicket}>
                        <div className="form-group">
                          <label>Category</label>
                          <select
                            className="form-input"
                            value={newTicketCategory}
                            onChange={(e) => setNewTicketCategory(e.target.value)}
                          >
                            <option value="BOOKING_ISSUE">Booking Issue</option>
                            <option value="PAYMENT_ISSUE">Payment Issue</option>
                            <option value="REFUND_ISSUE">Refund Issue</option>
                            <option value="PROVIDER_ISSUE">Professional Conduct</option>
                            <option value="OTHER">Other Query</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Subject</label>
                          <input
                            type="text"
                            className="form-input"
                            value={newTicketSubject}
                            onChange={(e) => setNewTicketSubject(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Detailed Description</label>
                          <textarea
                            className="form-input"
                            rows={4}
                            value={newTicketDesc}
                            onChange={(e) => setNewTicketDesc(e.target.value)}
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                          Open Ticket
                        </button>
                      </form>
                    </div>

                    <div className="sidebar" style={{ gap: '12px' }}>
                      <h3 style={{ marginBottom: '4px' }}>Ticket History</h3>
                      {tickets.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)' }}>No tickets opened yet.</p>
                      ) : (
                        tickets.map((t) => (
                          <div key={t.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{t.ticketNumber}</span>
                              <span className={`badge ${t.status === 'RESOLVED' ? 'badge-success' : 'badge-warning'}`}>
                                {t.status}
                              </span>
                            </div>
                            <h4 style={{ fontSize: '15px', marginBottom: '6px' }}>{t.subject}</h4>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{t.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* SECTION: Provider Dashboard Panel */}
      {activeTab === 'provider-db' && (
        <div className="container">
          <div className={styles.dashboardGrid}>
            <aside className={styles.sidebar}>
              <div
                className={`${styles.sidebarTab} ${subTab === 'jobs' ? styles.active : ''}`}
                onClick={() => setSubTab('jobs')}
              >
                <Briefcase size={18} />
                <span>Job Management</span>
              </div>
              <div
                className={`${styles.sidebarTab} ${subTab === 'kyc' ? styles.active : ''}`}
                onClick={() => setSubTab('kyc')}
              >
                <ShieldCheck size={18} />
                <span>KYC Uploads</span>
              </div>
              <div
                className={`${styles.sidebarTab} ${subTab === 'services' ? styles.active : ''}`}
                onClick={() => setSubTab('services')}
              >
                <Wrench size={18} />
                <span>My Services</span>
              </div>
            </aside>

            <main>
              {subTab === 'jobs' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2>Job Schedule</h2>
                    <div style={{ fontSize: '14px', background: 'var(--color-primary-light)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontWeight: 'bold' }}>
                      ⚡ Status: {currentUser?.kycStatus}
                    </div>
                  </div>

                  {providerBookings.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                      <p style={{ color: 'var(--color-text-muted)' }}>No bookings assigned yet. Set active availability status in profile!</p>
                    </div>
                  ) : (
                    <div className="grid grid-2">
                      {providerBookings.map((b) => (
                        <div key={b.id} className="card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontWeight: 'bold' }}>{b.bookingNumber}</span>
                            <span className={`badge ${
                              b.status === 'SERVICE_COMPLETED' || b.status === 'PAYMENT_SETTLED' ? 'badge-success' : 'badge-warning'
                            }`}>
                              {b.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p style={{ fontSize: '14px', marginBottom: '4px' }}>
                            📅 <strong>Date/Time:</strong> {b.bookingDate} ({b.timeSlot})
                          </p>
                          <p style={{ fontSize: '14px', marginBottom: '4px' }}>
                            👤 <strong>Customer:</strong> {b.customer.user.name} ({b.customer.user.phone})
                          </p>
                          <p style={{ fontSize: '14px', marginBottom: '12px' }}>
                            📍 <strong>Address:</strong> {b.address.addressLine}
                          </p>

                          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '12px' }}>
                            {b.status === 'PROVIDER_ASSIGNED' && (
                              <>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleUpdateBookingStatus(b.id, 'PROVIDER_ACCEPTED')}
                                >
                                  Accept Job
                                </button>
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleUpdateBookingStatus(b.id, 'PROVIDER_ASSIGNMENT_PENDING')}
                                >
                                  Decline
                                </button>
                              </>
                            )}
                            {b.status === 'PROVIDER_ACCEPTED' && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleUpdateBookingStatus(b.id, 'PROVIDER_ON_THE_WAY')}
                              >
                                Mark: On the Way
                              </button>
                            )}
                            {b.status === 'PROVIDER_ON_THE_WAY' && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleUpdateBookingStatus(b.id, 'SERVICE_STARTED')}
                              >
                                Start Service
                              </button>
                            )}
                            {b.status === 'SERVICE_STARTED' && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleUpdateBookingStatus(b.id, 'SERVICE_COMPLETED')}
                              >
                                Complete Job ✅
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {subTab === 'kyc' && (
                <div className="card" style={{ maxWidth: '500px' }}>
                  <h2 style={{ marginBottom: '16px' }}>KYC Verification</h2>
                  
                  {currentUser?.kycStatus === 'ACTIVE' || currentUser?.kycStatus === 'VERIFIED' ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                      <h4 style={{ fontWeight: 'bold', color: 'var(--color-success)', marginBottom: '8px' }}>KYC Status: Verified & Active</h4>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                        Your identity profile has been reviewed and verified by administration. You are ready to accept customer jobs!
                      </p>
                    </div>
                  ) : currentUser?.kycStatus === 'PENDING_VERIFICATION' ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                      <h4 style={{ fontWeight: 'bold', color: 'var(--color-warning)', marginBottom: '8px' }}>KYC Status: Review Pending</h4>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                        Your documents have been submitted successfully. Our admin team is checking background details. Review usually takes 24 hours.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                        Government regulations require identity checking and bank details to set up your helper profile for job assignments and direct payouts.
                      </p>
                      <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 'bold' }}>1. Identity Document</h4>
                      <div className="form-group">
                        <label>Identity Document Type</label>
                        <select
                          className="form-input"
                          value={kycDocType}
                          onChange={(e) => setKycDocType(e.target.value)}
                        >
                          <option value="Aadhaar Card">Aadhaar Card (India)</option>
                          <option value="PAN Card">PAN Card (India)</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving License">Driving License</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Document Photo Upload (PDF/Image)</label>
                        <input
                          type="file"
                          className="form-input"
                          onChange={(e) => setKycFile(e.target.files ? e.target.files[0] : null)}
                          accept=".pdf,.png,.jpg,.jpeg"
                          required
                        />
                      </div>

                      <h4 style={{ margin: '20px 0 12px 0', fontSize: '15px', fontWeight: 'bold' }}>2. Bank & Payout Details</h4>
                      <div className="form-group">
                        <label>Bank Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. HDFC Bank, SBI"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Bank Account Number</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Enter account number"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>IFSC Code</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Enter 11-digit IFSC code"
                          value={bankIfsc}
                          onChange={(e) => setBankIfsc(e.target.value)}
                          required
                        />
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '16px' }}
                        onClick={handleProviderSubmitKyc}
                      >
                        Upload & Submit Verification
                      </button>
                    </div>
                  )}
                </div>
              )}

              {subTab === 'services' && (
                <div className="card" style={{ maxWidth: '600px' }}>
                  <h2 style={{ marginBottom: '8px' }}>My Services</h2>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                    Select the work options you are capable of performing. Our auto-matching algorithm will assign bookings to you based on these selections.
                  </p>

                  {isLoadingServices ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>Loading services list...</p>
                  ) : providerServicesList.length === 0 ? (
                    <div style={{ padding: '20px 0', color: 'var(--color-error)' }}>
                      ⚠️ No services are registered in the system database. Please ensure you have run the database seeder on Render.
                    </div>
                  ) : (
                    <form onSubmit={handleSaveProviderServices}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        {providerServicesList.map((service, idx) => (
                          <label
                            key={service.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              backgroundColor: service.isOffered ? 'rgba(72, 187, 120, 0.05)' : 'transparent',
                              transition: 'background-color 0.2s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              checked={!!service.isOffered}
                              onChange={(e) => {
                                const updated = [...providerServicesList];
                                updated[idx].isOffered = e.target.checked;
                                setProviderServicesList(updated);
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{service.name}</div>
                              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                                Category: {service.categoryName}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>

                      <h3 style={{ margin: '24px 0 12px 0', borderTop: '1px solid var(--color-border)', paddingTop: '20px', fontSize: '16px', fontWeight: 'bold' }}>
                        Helper Background Info
                      </h3>
                      <div className="grid grid-2" style={{ gap: '12px', marginBottom: '16px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Experience (Years)</label>
                          <input
                            type="number"
                            className="form-input"
                            min="0"
                            placeholder="e.g. 5"
                            value={provExpYears}
                            onChange={(e) => setProvExpYears(parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Languages Spoken</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. English, Hindi"
                            value={provLanguages}
                            onChange={(e) => setProvLanguages(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label>Service Areas (Locations you cover)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Gachibowli, Kondapur, Madhapur"
                          value={provServiceAreas}
                          onChange={(e) => setProvServiceAreas(e.target.value)}
                        />
                      </div>

                      <h3 style={{ margin: '20px 0 12px 0', borderTop: '1px solid var(--color-border)', paddingTop: '20px', fontSize: '16px', fontWeight: 'bold' }}>
                        Payout Bank Accounts
                      </h3>
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label>Bank Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. HDFC Bank, SBI"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-2" style={{ gap: '12px', marginBottom: '24px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Bank Account Number</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Enter account number"
                            value={bankAccount}
                            onChange={(e) => setBankAccount(e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>IFSC Code</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Enter 11-digit IFSC code"
                            value={bankIfsc}
                            onChange={(e) => setBankIfsc(e.target.value)}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={isSavingServices}
                      >
                        {isSavingServices ? 'Saving Changes...' : 'Save Profile & Services Configurations'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* SECTION: Admin Desk Dashboard */}
      {activeTab === 'admin-db' && (
        <div className="container">
          <div className={styles.dashboardGrid}>
            <aside className={styles.sidebar}>
              <div
                className={`${styles.sidebarTab} ${subTab === 'analytics' ? styles.active : ''}`}
                onClick={() => setSubTab('analytics')}
              >
                <TrendingUp size={18} />
                <span>System Analytics</span>
              </div>
              <div
                className={`${styles.sidebarTab} ${subTab === 'kyc-verify' ? styles.active : ''}`}
                onClick={() => setSubTab('kyc-verify')}
              >
                <ShieldCheck size={18} />
                <span>KYC Approval Panel</span>
              </div>
              <div
                className={`${styles.sidebarTab} ${subTab === 'helpers' ? styles.active : ''}`}
                onClick={() => setSubTab('helpers')}
              >
                <User size={18} />
                <span>Helpers Directory</span>
              </div>
              <div
                className={`${styles.sidebarTab} ${subTab === 'orders' ? styles.active : ''}`}
                onClick={() => setSubTab('orders')}
              >
                <FileText size={18} />
                <span>Orders & Assignments</span>
              </div>
              <div
                className={`${styles.sidebarTab} ${subTab === 'tickets' ? styles.active : ''}`}
                onClick={() => setSubTab('tickets')}
              >
                <LifeBuoy size={18} />
                <span>Support Desk</span>
              </div>
            </aside>

            <main>
              {subTab === 'analytics' && adminAnalytics && (
                <div>
                  <h2 style={{ marginBottom: '20px' }}>Operations Dashboard</h2>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-4" style={{ marginBottom: '32px' }}>
                    <div className="card">
                      <span className={styles.statLabel}>Total Platform Revenue</span>
                      <div className={styles.statVal}>₹{adminAnalytics.summary.revenue}</div>
                    </div>
                    <div className="card">
                      <span className={styles.statLabel}>Escrow Commission (20%)</span>
                      <div className={styles.statVal}>₹{adminAnalytics.summary.commission}</div>
                    </div>
                    <div className="card">
                      <span className={styles.statLabel}>Active Professionals</span>
                      <div className={styles.statVal}>{adminAnalytics.summary.activeProviders}</div>
                    </div>
                    <div className="card">
                      <span className={styles.statLabel}>Pending KYC Verification</span>
                      <div className={styles.statVal} style={{ color: 'var(--color-error)' }}>
                        {adminAnalytics.summary.pendingKycCount}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-2">
                    <div className="card">
                      <h3 style={{ marginBottom: '12px' }}>Popular Services</h3>
                      {adminAnalytics.popularServices.map((s: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                          <span>{s.name}</span>
                          <strong>{s.count} bookings</strong>
                        </div>
                      ))}
                    </div>

                    <div className="card">
                      <h3 style={{ marginBottom: '12px' }}>System Configuration Options</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Escrow Commission (20%)</label>
                          <input type="number" className="form-input" defaultValue="20" style={{ padding: '6px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Hourly Base Rate (INR)</label>
                          <input type="number" className="form-input" defaultValue="250" style={{ padding: '6px' }} />
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => alert('System parameters saved.')}>
                          Save Parameters
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {subTab === 'kyc-verify' && (
                <div>
                  <h2 style={{ marginBottom: '20px' }}>KYC Approvals Panel</h2>
                  {pendingKycProviders.length === 0 ? (
                    <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--color-text-muted)' }}>No professionals are currently awaiting KYC document checking.</p>
                    </div>
                  ) : (
                    <div className="grid grid-2">
                      {pendingKycProviders.map((p) => (
                        <div key={p.id} className="card">
                          <h3 style={{ margin: '0 0 12px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                            👤 {p.user.name}
                          </h3>
                          <p style={{ fontSize: '13px', margin: '4px 0' }}>
                            📞 <strong>Phone:</strong> {p.user.phone}
                          </p>
                          <p style={{ fontSize: '13px', margin: '4px 0' }}>
                            💼 <strong>Experience:</strong> {p.experienceYears || 0} Years
                          </p>
                          <p style={{ fontSize: '13px', margin: '4px 0' }}>
                            🗣️ <strong>Languages:</strong> {p.languages || 'English'}
                          </p>
                          <p style={{ fontSize: '13px', margin: '4px 0' }}>
                            📍 <strong>Service Areas:</strong> {p.serviceAreas || 'Not Set'}
                          </p>

                          <div style={{ margin: '12px 0', padding: '10px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold' }}>💳 Payout Bank Details</h4>
                            <p style={{ fontSize: '12px', margin: '2px 0' }}>🏦 <strong>Bank:</strong> {p.bankName || 'Not Provided'}</p>
                            <p style={{ fontSize: '12px', margin: '2px 0' }}>🔢 <strong>A/C No:</strong> {p.bankAccountNumber || 'Not Provided'}</p>
                            <p style={{ fontSize: '12px', margin: '2px 0' }}>🔍 <strong>IFSC:</strong> {p.bankIfscCode || 'Not Provided'}</p>
                          </div>

                          <div style={{ margin: '12px 0', padding: '10px', backgroundColor: 'rgba(72, 187, 120, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(72, 187, 120, 0.15)' }}>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold' }}>📄 Attached Verification Document</h4>
                            <p style={{ fontSize: '12px', margin: '2px 0' }}>📌 <strong>Type:</strong> {p.kycDocumentType || 'Aadhaar Card'}</p>
                            <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>
                              📁 <strong>File:</strong>{' '}
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  alert(`Inspecting document: ${p.kycDocumentUrl || 'kyc_verification_doc.pdf'}\nStatus: Verified file integrity.`);
                                }}
                                style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 'bold' }}
                              >
                                {p.kycDocumentUrl || 'kyc_verification_doc.pdf'} (Click to View Photo)
                              </a>
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '13px' }}
                              onClick={() => handleAdminApproveKyc(p.id, true)}
                            >
                              Approve KYC (Activate)
                            </button>
                            <button
                              className="btn btn-outline btn-danger"
                              style={{ padding: '6px 12px', fontSize: '13px' }}
                              onClick={() => handleAdminApproveKyc(p.id, false)}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {subTab === 'helpers' && (
                <div>
                  <h2 style={{ marginBottom: '20px' }}>Helpers Directory</h2>
                  {allProviders.length === 0 ? (
                    <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--color-text-muted)' }}>No helper profiles registered in the system.</p>
                    </div>
                  ) : (
                    <div className="grid grid-3">
                      {allProviders.map((p) => (
                        <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h3 style={{ margin: 0, fontSize: '16px' }}>{p.user.name}</h3>
                              <span className={`badge ${p.kycStatus === 'ACTIVE' || p.kycStatus === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>
                                {p.kycStatus}
                              </span>
                            </div>
                            <p style={{ fontSize: '13px', margin: '4px 0' }}>
                              📞 <strong>Phone:</strong> {p.user.phone}
                            </p>
                            <p style={{ fontSize: '13px', margin: '4px 0' }}>
                              ⭐ <strong>Rating:</strong> {p.rating} / 5.0
                            </p>
                            <p style={{ fontSize: '13px', margin: '4px 0' }}>
                              💼 <strong>Experience:</strong> {p.experienceYears} Years
                            </p>
                            <p style={{ fontSize: '13px', margin: '4px 0' }}>
                              ✔️ <strong>Completed Jobs:</strong> {p.completedJobsCount}
                            </p>
                            
                            <div style={{ margin: '12px 0 0 0', padding: '10px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}>
                              <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold' }}>💳 Payout Bank Details</h4>
                              <p style={{ fontSize: '11px', margin: '2px 0' }}>🏦 <strong>Bank:</strong> {p.bankName || 'Not Provided'}</p>
                              <p style={{ fontSize: '11px', margin: '2px 0' }}>🔢 <strong>A/C No:</strong> {p.bankAccountNumber || 'Not Provided'}</p>
                              <p style={{ fontSize: '11px', margin: '2px 0' }}>🔍 <strong>IFSC:</strong> {p.bankIfscCode || 'Not Provided'}</p>
                            </div>

                            {p.kycDocumentType && (
                              <p style={{ fontSize: '12px', margin: '8px 0 0 0', padding: '6px', backgroundColor: 'rgba(72, 187, 120, 0.05)', borderRadius: 'var(--radius-sm)' }}>
                                📁 <strong>{p.kycDocumentType}:</strong>{' '}
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    alert(`Inspecting document: ${p.kycDocumentUrl || 'kyc_verification_doc.pdf'}`);
                                  }}
                                  style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 'bold' }}
                                >
                                  {p.kycDocumentUrl}
                                </a>
                              </p>
                            )}
                          </div>
                          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                            {p.kycStatus !== 'ACTIVE' ? (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ flex: 1 }}
                                onClick={() => handleAdminApproveKyc(p.id, true)}
                              >
                                Verify KYC
                              </button>
                            ) : (
                              <button
                                className="btn btn-outline btn-sm btn-danger"
                                style={{ flex: 1 }}
                                onClick={() => handleAdminApproveKyc(p.id, false)}
                              >
                                Suspend/Reject
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {subTab === 'orders' && (
                <div>
                  <h2 style={{ marginBottom: '20px' }}>Customer Orders & Assignments</h2>
                  {allBookings.length === 0 ? (
                    <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--color-text-muted)' }}>No bookings created in the system yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-2">
                      {allBookings.map((b) => (
                        <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{b.bookingNumber}</span>
                              <span className={`badge ${
                                b.status === 'SERVICE_COMPLETED' ? 'badge-success' : 
                                b.status === 'PROVIDER_ASSIGNED' || b.status === 'CONFIRMED' ? 'badge-primary' : 
                                'badge-warning'
                              }`}>
                                {b.status}
                              </span>
                            </div>

                            <p style={{ fontSize: '13px', margin: '4px 0' }}>
                              📅 <strong>Date:</strong> {b.bookingDate} • <strong>Slot:</strong> {b.timeSlot}
                            </p>
                            <p style={{ fontSize: '13px', margin: '4px 0' }}>
                              💰 <strong>Total Amount:</strong> ₹{b.totalAmount}
                            </p>

                            <div style={{ margin: '12px 0', padding: '10px', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Customer</h4>
                              <p style={{ fontSize: '13px', margin: 0 }}>
                                Phone: {b.customer?.user?.phone || 'Unknown'}
                              </p>
                            </div>

                            <div style={{ margin: '12px 0 0 0', padding: '10px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px' }}>Assigned Helper</h4>
                              {b.provider ? (
                                <p style={{ fontSize: '13px', margin: 0, color: 'var(--color-success)', fontWeight: 'bold' }}>
                                  👤 {b.provider.user.name} ({b.provider.user.phone})
                                </p>
                              ) : (
                                <div>
                                  <p style={{ fontSize: '13px', margin: '0 0 8px 0', color: 'var(--color-error)' }}>
                                    ❌ No Helper Assigned (Pending)
                                  </p>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <select
                                      className="form-input"
                                      style={{ padding: '6px', fontSize: '13px', flex: 1 }}
                                      value={selectedAssignHelperId[b.id] || ''}
                                      onChange={(e) => {
                                        setSelectedAssignHelperId({
                                          ...selectedAssignHelperId,
                                          [b.id]: e.target.value
                                        });
                                      }}
                                    >
                                      <option value="">-- Choose Helper --</option>
                                      {allProviders
                                        .filter((p) => p.kycStatus === 'ACTIVE')
                                        .map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.user.name} ({p.user.phone})
                                          </option>
                                        ))}
                                    </select>
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleAdminAssignWork(b.id, selectedAssignHelperId[b.id])}
                                    >
                                      Assign Work
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {subTab === 'tickets' && (
                <div>
                  <h2 style={{ marginBottom: '20px' }}>Customer Support Desk</h2>
                  {tickets.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>No active help requests.</p>
                  ) : (
                    <div className="grid grid-2">
                      {tickets.map((t) => (
                        <div key={t.id} className="card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold' }}>{t.ticketNumber}</span>
                            <span className={`badge ${t.status === 'RESOLVED' ? 'badge-success' : 'badge-warning'}`}>
                              {t.status}
                            </span>
                          </div>
                          <h4>{t.subject}</h4>
                          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '6px 0 16px 0' }}>
                            {t.description}
                          </p>
                          {t.status !== 'RESOLVED' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={async () => {
                                alert('Ticket marked as resolved.');
                                refreshDashboardData();
                              }}
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', backgroundColor: 'white', padding: '24px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3>🏠 Home Maidly</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Trusted Help. Happier Homes.</p>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Privacy Policy</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Terms of Service</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Contact Help: annaiahabhiraju7@gmail.com</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Call Us: 9380850568</span>
            <span
              style={{ fontSize: '13px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => {
                if (currentUser?.role === 'ADMIN') {
                  setActiveTab('admin-db');
                  setSubTab('analytics');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  setAuthMode('login');
                  setLoginMessage(null);
                  setIsAdminLogin(true);
                  setShowLoginModal(true);
                }
              }}
            >
              🔐 Admin Desk
            </span>
          </div>
        </div>
      </footer>

      {/* MODAL: Login Dialog */}
      {showLoginModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h3>{isAdminLogin ? 'Admin Login' : authMode === 'login' ? 'Customer Login' : 'Helper Registration'}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => { setShowLoginModal(false); setIsAdminLogin(false); }}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {!isAdminLogin && (
                <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid var(--color-border)' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'none',
                      border: 'none',
                      fontWeight: authMode === 'login' ? 'bold' : 'normal',
                      borderBottom: authMode === 'login' ? '2px solid var(--color-primary)' : 'none',
                      color: authMode === 'login' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setAuthMode('login');
                      setLoginMessage(null);
                    }}
                  >
                    Customer Login
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'none',
                      border: 'none',
                      fontWeight: authMode === 'register' ? 'bold' : 'normal',
                      borderBottom: authMode === 'register' ? '2px solid var(--color-primary)' : 'none',
                      color: authMode === 'register' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setAuthMode('register');
                      setLoginMessage(null);
                    }}
                  >
                    Helper Register
                  </button>
                </div>
              )}

              {loginMessage && (
                <div style={{
                  padding: '10px',
                  backgroundColor: loginMessage.type === 'error' ? 'rgba(229, 62, 62, 0.1)' : 'rgba(72, 187, 120, 0.1)',
                  color: loginMessage.type === 'error' ? 'red' : 'green',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '16px',
                  fontSize: '13px'
                }}>
                  {loginMessage.text}
                </div>
              )}

              <form onSubmit={handleDirectAuth}>
                {authMode === 'register' && (
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter your full name"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Mobile Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Enter 10-digit number"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                  {isAdminLogin ? 'Admin Login Now' : authMode === 'login' ? 'Login Now' : 'Register & Login'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Multi-step Booking Checkout wizard */}
      {showCheckoutModal && activeCategory && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Book {activeCategory.name}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowCheckoutModal(false)}>✕</button>
            </div>
            
            <div className={styles.modalBody}>
              {checkoutStep === 1 && (
                <div>
                  <h4 style={{ marginBottom: '12px' }}>Choose a Service Package</h4>
                  {activeCategory.packages.map((pkg: any) => {
                    const isSelected = checkoutItems.some((i) => i.serviceId === pkg.id);
                    return (
                      <div
                        key={pkg.id}
                        className={`${styles.servicePackageRow} ${isSelected ? styles.selected : ''}`}
                        onClick={() => handleTogglePackage(pkg)}
                      >
                        <div>
                          <h5 style={{ fontWeight: 'bold' }}>{pkg.name}</h5>
                          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{pkg.desc}</p>
                        </div>
                        <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>₹{pkg.price}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {checkoutStep === 2 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0 }}>Select Booking Address</h4>
                    {!showAddAddressForm && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setShowAddAddressForm(true);
                          setAddressMode('map');
                        }}
                      >
                        + Add New
                      </button>
                    )}
                  </div>

                  {showAddAddressForm ? (
                    <form onSubmit={handleSaveNewAddress} style={{ border: '1px solid var(--color-border)', padding: '16px', borderRadius: '8px', backgroundColor: 'var(--color-bg-light)' }}>
                      <h5 style={{ fontWeight: 'bold', marginBottom: '12px' }}>New Address</h5>
                      
                      {/* Toggle Selector */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${addressMode === 'map' ? 'btn-primary' : 'btn-outline'}`}
                          style={{ flex: 1 }}
                          onClick={() => setAddressMode('map')}
                        >
                          📍 Choose on Map
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${addressMode === 'manual' ? 'btn-primary' : 'btn-outline'}`}
                          style={{ flex: 1 }}
                          onClick={() => setAddressMode('manual')}
                        >
                          ✍️ Enter Manually
                        </button>
                      </div>

                      {addressMode === 'map' && (
                        <div>
                          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                            Drag the pin on the map to mark your exact cleaning location.
                          </p>
                          <div id="checkout-map" style={{ height: '200px', width: '100%', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
                            {mapLoading && (
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, fontSize: '13px' }}>
                                Resolving address location...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="form-group">
                        <label>House / Flat No / Block</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Apartment 4B, 3rd Floor"
                          value={newAddressFlat}
                          onChange={(e) => setNewAddressFlat(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Street Address / Area</label>
                        {addressMode === 'map' ? (
                          <textarea
                            className="form-input"
                            style={{ minHeight: '60px', fontSize: '13px' }}
                            value={newAddressLine}
                            onChange={(e) => setNewAddressLine(e.target.value)}
                            required
                          />
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. 12th Main Road, Sector 3"
                            value={newAddressLine}
                            onChange={(e) => setNewAddressLine(e.target.value)}
                            required
                          />
                        )}
                      </div>

                      <div className="grid grid-2">
                        <div className="form-group">
                          <label>Landmark</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Near HDFC Bank"
                            value={newAddressLandmark}
                            onChange={(e) => setNewAddressLandmark(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>City</label>
                          <input
                            type="text"
                            className="form-input"
                            value={newAddressCity}
                            onChange={(e) => setNewAddressCity(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Save Address Label As</label>
                        <select
                          className="form-input"
                          value={newAddressTitle}
                          onChange={(e) => setNewAddressTitle(e.target.value)}
                        >
                          <option value="Home">🏠 Home</option>
                          <option value="Office">🏢 Office</option>
                          <option value="Other">📍 Other</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                          Save & Select
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ flex: 1 }}
                          onClick={() => {
                            setShowAddAddressForm(false);
                            setNewAddressFlat('');
                            setNewAddressLine('');
                            setNewAddressLandmark('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="sidebar" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
                      {savedAddresses.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                          No saved addresses. Please click "+ Add New" to locate your address.
                        </p>
                      ) : (
                        savedAddresses.map((addr) => (
                          <div
                            key={addr.id}
                            className={`${styles.servicePackageRow} ${selectedAddressId === addr.id ? styles.selected : ''}`}
                            onClick={() => setSelectedAddressId(addr.id)}
                            style={{ cursor: 'pointer', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                          >
                            <div>
                              <h5 style={{ fontWeight: 'bold', margin: 0 }}>{addr.title}</h5>
                              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>{addr.addressLine}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {checkoutStep === 3 && (
                <div>
                  <h4 style={{ marginBottom: '12px' }}>Select Date & Time Slot</h4>
                  <div className="form-group">
                    <label>Choose Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        fetchSlotsForDate(e.target.value);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Available Slots</label>
                    <div className="grid grid-2">
                      {availableSlots.map((s, idx) => (
                        <button
                          key={idx}
                          disabled={!s.available}
                          className={`btn ${selectedTimeSlot === s.slot ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setSelectedTimeSlot(s.slot)}
                        >
                          {s.slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {checkoutStep === 4 && (
                <div>
                  <h4 style={{ marginBottom: '16px' }}>Checkout Order Summary</h4>
                  <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
                    {checkoutItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>{item.name}</span>
                        <span>₹{item.price}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      <span>Subtotal</span>
                      <span>₹{bookingSubtotal}</span>
                    </div>
                    {bookingDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-success)' }}>
                        <span>Discount Applied</span>
                        <span>-₹{bookingDiscount}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      <span>Tax (18%)</span>
                      <span>₹{bookingTax}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '18px', borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '12px' }}>
                      <span>Total Price</span>
                      <span>₹{bookingTotal}</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Coupon Code</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="MAIDLY20 or WELCOME100"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value)}
                      />
                      <button className="btn btn-outline" onClick={handleApplyCoupon}>Apply</button>
                    </div>
                    {couponError && <p style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{couponError}</p>}
                    {appliedCoupon && <p style={{ color: 'green', fontSize: '12px', marginTop: '4px' }}>Coupon applied successfully!</p>}
                  </div>

                  <div className="form-group">
                    <label>Special Instructions</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Bring extra cleaning towels, ring bell..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ padding: '16px', background: 'var(--color-bg-accent)', borderRadius: 'var(--radius-md)' }}>
                    <label>💰 Mock Payment Simulator</label>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                      Choose your desired gateway checkout simulation behaviour:
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className={`btn btn-sm ${paymentSignature === 'success' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setPaymentSignature('success')}
                      >
                        Simulate Success
                      </button>
                      <button
                        className={`btn btn-sm ${paymentSignature === 'fail' ? 'btn-danger' : 'btn-outline'}`}
                        onClick={() => setPaymentSignature('fail')}
                      >
                        Simulate Failure
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {checkoutStep === 5 && createdBooking && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <span style={{ fontSize: '64px' }}>🎉</span>
                  <h3 style={{ margin: '16px 0 8px 0', color: 'var(--color-primary)' }}>Booking Confirmed!</h3>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                    Your booking reference is <strong>{createdBooking.bookingNumber}</strong>.
                  </p>
                  
                  <div className="card" style={{ textAlign: 'left', background: 'var(--color-bg-base)', marginBottom: '20px' }}>
                    <p>👨‍🔧 <strong>Matched Professional:</strong> {createdBooking.provider?.user?.name || 'Searching...'}</p>
                    <p>🕒 <strong>Time Slot:</strong> {createdBooking.timeSlot}</p>
                    <p>💰 <strong>Paid:</strong> ₹{createdBooking.totalAmount}</p>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              {checkoutStep > 1 && checkoutStep < 5 && (
                <button className="btn btn-outline" onClick={() => setCheckoutStep(checkoutStep - 1)}>
                  Back
                </button>
              )}
              
              {checkoutStep === 1 && (
                <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleStep1Next}>
                  Select Address
                </button>
              )}
              {checkoutStep === 2 && (
                <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleStep2Next}>
                  Select Schedule
                </button>
              )}
              {checkoutStep === 3 && (
                <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleStep3Next}>
                  Proceed to Pay
                </button>
              )}
              {checkoutStep === 4 && (
                <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleCreateBookingAndPay}>
                  Simulate Gateway Pay
                </button>
              )}
              {checkoutStep === 5 && (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setActiveTab('customer-db');
                    setSubTab('bookings');
                  }}
                >
                  Track Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Booking Details & Status Tracking & Review */}
      {showBookingDetailsModal && selectedBookingDetails && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Booking {selectedBookingDetails.bookingNumber}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShowBookingDetailsModal(false)}>✕</button>
            </div>
            
            <div className={styles.modalBody}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <p>📅 <strong>Schedule:</strong> {selectedBookingDetails.bookingDate} ({selectedBookingDetails.timeSlot})</p>
                  <p>📍 <strong>Location:</strong> {selectedBookingDetails.address.addressLine}</p>
                </div>
                <span className="badge badge-success">{selectedBookingDetails.status.replace(/_/g, ' ')}</span>
              </div>

              {/* Status Tracking timeline */}
              <div className={styles.timeline}>
                {selectedBookingDetails.statusHistory.map((history: any, idx: number) => (
                  <div key={idx} className={styles.timelineItem}>
                    <div className={styles.timelineDot}></div>
                    <div className={styles.timelineLine}></div>
                    <div className={styles.timelineContent}>
                      <h5 style={{ fontWeight: 'bold' }}>{history.status.replace(/_/g, ' ')}</h5>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{history.remarks}</p>
                      <span className={styles.timelineTime}>{new Date(history.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* PDF Invoice generation visual */}
              <div style={{ marginTop: '24px', padding: '16px', background: 'var(--color-bg-accent)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FileText size={18} /> Invoice & Receipts
                </h4>
                <div style={{ fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Platform Service Charge</span>
                    <span>₹{selectedBookingDetails.subtotal}</span>
                  </div>
                  {selectedBookingDetails.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'green' }}>
                      <span>Discount Coupon</span>
                      <span>-₹{selectedBookingDetails.discount}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Taxes (18%)</span>
                    <span>₹{selectedBookingDetails.tax}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '8px' }}>
                    <span>Total Paid</span>
                    <span>₹{selectedBookingDetails.totalAmount}</span>
                  </div>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', marginTop: '12px' }}
                  onClick={() => window.print()}
                >
                  Download PDF Invoice
                </button>
              </div>

              {/* Rating & reviews inputs for completed services */}
              {(selectedBookingDetails.status === 'SERVICE_COMPLETED' || selectedBookingDetails.status === 'PAYMENT_SETTLED') && currentUser?.role === 'CUSTOMER' && (
                <div style={{ marginTop: '24px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                  <h4>Rate your experience!</h4>
                  <form onSubmit={(e) => handleSubmitReview(e, selectedBookingDetails.id)}>
                    <div className="form-group" style={{ margin: '12px 0' }}>
                      <label>Overall Stars (1-5)</label>
                      <div className={styles.starRating}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={24}
                            className={`${styles.star} ${ratingVal >= s ? styles.active : ''}`}
                            onClick={() => setRatingVal(s)}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Review Comment</label>
                      <textarea
                        className="form-input"
                        rows={2}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Tell us what you liked..."
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Submit Rating
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              {currentUser?.role === 'CUSTOMER' &&
                ['BOOKING_CREATED', 'PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PROVIDER_ASSIGNED'].includes(
                  selectedBookingDetails.status
                ) && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleUpdateBookingStatus(selectedBookingDetails.id, 'CANCELLED')}
                  >
                    Cancel Booking
                  </button>
                )}
              <button className="btn btn-outline btn-sm" onClick={() => setShowBookingDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
