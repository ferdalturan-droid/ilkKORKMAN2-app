import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import jsPDF from "jspdf";
import { 
  Truck, Users, Mail, FileText, CheckCircle2, MapPin,
  Wand2, Plus, Trash2, Clock, Weight, X, 
  Pause, RotateCcw, Download, Settings, ChevronDown, Calendar,
  Shield, Send, Eye, Phone, Car, BarChart3, Navigation, Edit2, LogOut,
  History, Building2, ChevronLeft, ChevronRight
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Get current time in HH:MM format
const getCurrentTime = () => {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
};

// Open address in maps
const openInMaps = (address) => {
  if (!address) return;
  const encodedAddress = encodeURIComponent(address + ", Denmark");
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
};

// ============= COMPONENTS =============

const StatCard = ({ icon: Icon, value, label, color = "primary", subtext = "" }) => {
  const colorClasses = {
    primary: "bg-slate-800 text-white",
    accent: "bg-amber-500 text-black",
    success: "bg-emerald-500 text-white",
    brand: "bg-red-600 text-white",
    info: "bg-blue-600 text-white",
  };

  return (
    <div 
      data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
      className={`stat-card ${colorClasses[color]} rounded-xl p-4 flex flex-col items-center justify-center min-w-[100px] shadow-lg transition-all hover:scale-105`}
    >
      <Icon className="w-5 h-5 mb-1 opacity-80" />
      <span className="font-heading font-black text-2xl">{value}</span>
      <span className="text-xs opacity-80 font-medium">{label}</span>
      {subtext && <span className="text-xs opacity-60 mt-1">{subtext}</span>}
    </div>
  );
};

const PladsButton = ({ name, isSelected, onClick, tourCount = 0 }) => (
  <button
    data-testid={`plads-${name.toLowerCase().replace(/\s/g, '-')}`}
    onClick={onClick}
    className={`
      relative px-4 py-2 rounded-lg text-sm font-medium transition-all
      ${isSelected 
        ? "bg-red-600 text-white shadow-lg scale-105" 
        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-red-400 hover:text-red-600"
      }
    `}
  >
    {name}
    {tourCount > 0 && (
      <span className={`absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${isSelected ? "bg-white text-red-600" : "bg-red-600 text-white"}`}>
        {tourCount}
      </span>
    )}
  </button>
);

const TourRow = ({ tour, onUpdate, onDelete, onToggleOnWay, onToggleComplete, driverName, isGroupStart, isGroupEnd, isInGroup }) => {
  const [weight, setWeight] = useState(tour.weight || "");
  const [time, setTime] = useState(tour.time || "");

  // Only update weight on Enter key or blur - not on every keystroke
  const handleWeightChange = (e) => {
    setWeight(e.target.value);
  };

  const handleWeightSubmit = () => {
    const val = parseFloat(weight);
    if (val && val > 0) {
      const currentTime = new Date().toTimeString().slice(0, 5);
      onUpdate(tour.id, { weight: val, completed: true, on_way: false, time: currentTime });
    }
  };

  const handleWeightKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleWeightSubmit();
    }
  };

  const handleTimeChange = (e) => {
    const val = e.target.value;
    setTime(val);
    onUpdate(tour.id, { time: val });
  };

  useEffect(() => {
    if (tour.time !== time) setTime(tour.time || "");
  }, [tour.time]); // eslint-disable-line

  useEffect(() => {
    if (tour.weight !== undefined && tour.weight !== parseFloat(weight)) setWeight(tour.weight || "");
  }, [tour.weight]); // eslint-disable-line

  if (tour.is_pause) {
    return (
      <tr className="bg-slate-100 dark:bg-slate-800 border-b border-border" data-testid={`tour-row-${tour.id}`}>
        <td colSpan="5" className="p-3 text-center font-bold text-slate-600 dark:text-slate-400">
          <Pause className="w-4 h-4 inline mr-2" />
          PAUSE
        </td>
        <td className="p-3 text-center font-mono text-sm">-</td>
        <td className="p-3 text-center font-mono text-sm font-bold">{tour.time || "45 min"}</td>
        <td className="p-3 text-center">
          <button onClick={() => onDelete(tour.id)} className="text-red-500 hover:text-red-600" data-testid={`delete-tour-${tour.id}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
    );
  }

  const rowClass = tour.completed 
    ? "bg-emerald-100 dark:bg-emerald-950/40" 
    : tour.on_way 
      ? "bg-yellow-100 dark:bg-yellow-950/40 border-l-4 border-l-yellow-500" 
      : tour.remark?.toLowerCase().includes("haster")
        ? "bg-red-50 dark:bg-red-950/30"
        : "";

  // Group border styling for same address tours - using box-shadow as border doesn't work well on tr
  const groupStyle = isInGroup 
    ? { boxShadow: 'inset 4px 0 0 0 #ef4444' }
    : {};

  // Add visual indicator for grouped rows
  const groupBgClass = isInGroup ? "bg-red-50/50 dark:bg-red-900/20" : "";

  return (
    <tr className={`${rowClass} ${groupBgClass} border-b border-border hover:bg-muted/50 transition-colors`} style={groupStyle} data-testid={`tour-row-${tour.id}`}>
      <td className="p-3 font-medium">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span>{tour.fraction}</span>
            {tour.is_same_day && (
              <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">SD</span>
            )}
            {tour.remark && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                tour.remark.toLowerCase().includes("haster") ? "bg-red-500 text-white" 
                : tour.remark.toLowerCase().includes("senere") ? "bg-orange-400 text-black"
                : "bg-slate-200 dark:bg-slate-700"
              }`}>{tour.remark}</span>
            )}
          </div>
          {tour.on_way && driverName && (
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
              <Truck className="w-3 h-3" /> {driverName} kører
            </span>
          )}
        </div>
      </td>
      <td className="p-3 text-sm">{tour.facility}</td>
      <td className="p-3 text-sm">
        <button 
          onClick={() => openInMaps(tour.address)}
          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          title={tour.address}
        >
          <Navigation className="w-4 h-4 flex-shrink-0" />
          <span className="hidden md:inline truncate max-w-[100px]">{tour.address?.split(",")[0] || tour.address}</span>
        </button>
      </td>
      <td className="p-3 font-mono text-sm">{tour.container}</td>
      <td className="p-3 font-mono text-xs text-muted-foreground">
        {tour.open_from && tour.open_to ? `${tour.open_from}-${tour.open_to}` : ""}
      </td>
      <td className="p-3">
        <input type="number" value={weight} onChange={handleWeightChange} 
          onKeyDown={handleWeightKeyDown}
          onBlur={handleWeightSubmit}
          placeholder="kg"
          className="w-20 px-2 py-1 text-sm font-mono bg-background border border-input rounded focus:ring-2 focus:ring-red-500"
          data-testid={`weight-input-${tour.id}`} />
      </td>
      <td className="p-3">
        <input type="time" value={time} onChange={handleTimeChange}
          className="w-24 px-2 py-1 text-sm font-mono bg-background border border-input rounded focus:ring-2 focus:ring-red-500"
          data-testid={`time-input-${tour.id}`} />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1">
          {!tour.completed && (
            <button onClick={() => onToggleOnWay(tour.id)}
              className={`p-1.5 rounded ${tour.on_way ? "bg-yellow-400 text-black ring-2 ring-yellow-500" : "bg-slate-200 dark:bg-slate-700"} hover:opacity-80`}
              title={tour.on_way ? "På vej" : "Start tur"} data-testid={`onway-btn-${tour.id}`}>
              <Truck className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => onToggleComplete(tour.id)}
            className={`p-1.5 rounded ${tour.completed ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700"} hover:opacity-80`}
            title={tour.completed ? "Færdig" : "Markér færdig"} data-testid={`complete-btn-${tour.id}`}>
            {tour.completed ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </button>
          <button onClick={() => onDelete(tour.id)}
            className="p-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200"
            data-testid={`delete-tour-${tour.id}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ============= ADMIN PAGE COMPONENT =============

const AdminPage = ({ onLogout }) => {
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [editingDriver, setEditingDriver] = useState(null);
  const [newDriver, setNewDriver] = useState({ name: "", plate: "", area: "", phone: "", email: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New state for plads management and history
  const [pladsList, setPladsList] = useState([]);
  const [newPladsName, setNewPladsName] = useState("");
  const [reportHistory, setReportHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("tours"); // tours, schedule, drivers, plads, history
  
  // Tour management state (moved from driver page)
  const [adminSelectedPlads, setAdminSelectedPlads] = useState("");
  const [mailText, setMailText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [adminTours, setAdminTours] = useState([]);
  const [adminReportId, setAdminReportId] = useState("");
  const [adminReportDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Driver schedule state - each driver's assigned plads for today
  const [driverSchedule, setDriverSchedule] = useState({}); // { driverId: "pladsName" or "FRI" }
  
  // Weekly schedule state
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  const [weeklySchedule, setWeeklySchedule] = useState({}); // { "driverId-date": "plads" }
  const [viewMode, setViewMode] = useState("daily"); // "daily" or "weekly"

  // Get week dates
  const getWeekDates = useCallback(() => {
    const dates = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }, [weekStart]);

  const fetchWeeklySchedule = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/schedule?week_start=${weekStart}`);
      const scheduleMap = {};
      res.data.forEach(s => {
        scheduleMap[`${s.driver_id}-${s.date}`] = s.plads;
      });
      setWeeklySchedule(scheduleMap);
    } catch (e) {
      console.error("Error fetching weekly schedule:", e);
    }
  }, [weekStart]);

  const fetchData = useCallback(async () => {
    try {
      const [driversRes, statsRes, messagesRes, pladsRes, historyRes] = await Promise.all([
        axios.get(`${API}/drivers`),
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/messages`),
        axios.get(`${API}/plads`),
        axios.get(`${API}/reports/history?days=30`)
      ]);
      setDrivers(driversRes.data);
      setStats(statsRes.data);
      setMessages(messagesRes.data);
      setPladsList(pladsRes.data);
      setReportHistory(historyRes.data);
      
      // Initialize driver schedule with their default area
      const initialSchedule = {};
      driversRes.data.forEach(d => {
        initialSchedule[d.id] = d.area || "";
      });
      setDriverSchedule(initialSchedule);
    } catch (e) {
      console.error("Error fetching admin data:", e);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchWeeklySchedule(); }, [fetchWeeklySchedule]);

  // Initialize admin report for today
  useEffect(() => {
    const initAdminReport = async () => {
      try {
        const existingRes = await axios.get(`${API}/reports?date=${adminReportDate}`);
        if (existingRes.data && existingRes.data.length > 0) {
          setAdminReportId(existingRes.data[0].id);
        } else {
          const res = await axios.post(`${API}/reports`, { report_date: adminReportDate, start_time: "07:00" });
          setAdminReportId(res.data.id);
        }
      } catch (e) {
        console.error("Error initializing admin report:", e);
      }
    };
    initAdminReport();
  }, [adminReportDate]);

  // Fetch tours for admin when report or plads changes
  const fetchAdminTours = useCallback(async () => {
    if (!adminReportId) return;
    try {
      const res = await axios.get(`${API}/tours?report_id=${adminReportId}`);
      setAdminTours(res.data);
    } catch (e) {
      console.error("Error fetching admin tours:", e);
    }
  }, [adminReportId]);

  useEffect(() => { if (adminReportId) fetchAdminTours(); }, [adminReportId, fetchAdminTours]);

  // Auto-refresh admin tours every 10 seconds
  useEffect(() => {
    if (!adminReportId) return;
    const interval = setInterval(() => { fetchAdminTours(); }, 10000);
    return () => clearInterval(interval);
  }, [adminReportId, fetchAdminTours]);

  // Admin mail parse handler
  const handleAdminParseMail = async () => {
    if (!mailText.trim()) { toast.error("Indsæt mail tekst først"); return; }
    if (!adminSelectedPlads) { toast.error("Vælg en genbrugsplads først"); return; }
    
    setParsing(true);
    try {
      const res = await axios.post(`${API}/parse-mail`, { text: mailText, report_id: adminReportId });
      
      if (res.data.success && res.data.tours.length > 0) {
        const sortedTours = [...res.data.tours].sort((a, b) => {
          if (a.facility === b.facility) return a.address.localeCompare(b.address);
          return a.facility.localeCompare(b.facility);
        });
        
        const toursToCreate = sortedTours.map(t => ({
          ...t,
          plads: adminSelectedPlads,
          driver_id: "",
          driver_name: "",
          report_id: adminReportId
        }));
        
        await axios.post(`${API}/tours/bulk`, toursToCreate);
        setMailText("");
        fetchAdminTours();
        
        const grouped = res.data.grouped_by_facility;
        const facilityCount = Object.keys(grouped).length;
        toast.success(`${res.data.count} ture tilføjet til ${adminSelectedPlads}! (${facilityCount} anlæg)`);
      } else {
        toast.error("Kunne ikke parse mail");
      }
    } catch (e) {
      toast.error("Fejl ved parsing af mail");
    } finally {
      setParsing(false);
    }
  };

  // Admin delete tour
  const handleAdminDeleteTour = async (tourId) => {
    try {
      await axios.delete(`${API}/tours/${tourId}`);
      setAdminTours(adminTours.filter(t => t.id !== tourId));
      toast.success("Tur slettet");
    } catch (e) {
      toast.error("Fejl ved sletning");
    }
  };

  // Admin clear all tours for selected plads
  const handleAdminClearPlads = async () => {
    if (!adminSelectedPlads) return;
    if (!window.confirm(`Slet alle ture i ${adminSelectedPlads}?`)) return;
    try {
      const toursToDelete = adminTours.filter(t => t.plads === adminSelectedPlads);
      await Promise.all(toursToDelete.map(t => axios.delete(`${API}/tours/${t.id}`)));
      fetchAdminTours();
      toast.success(`Alle ture i ${adminSelectedPlads} slettet`);
    } catch (e) {
      toast.error("Fejl ved sletning");
    }
  };

  const handleAddDriver = async () => {
    if (!newDriver.name || !newDriver.plate) {
      toast.error("Navn og nummerplade er påkrævet");
      return;
    }
    try {
      await axios.post(`${API}/drivers`, newDriver);
      setNewDriver({ name: "", plate: "", area: "", phone: "", email: "" });
      setShowAddForm(false);
      fetchData();
      toast.success("Chauffør tilføjet");
    } catch (e) {
      toast.error("Fejl ved tilføjelse");
    }
  };

  const handleUpdateDriver = async () => {
    if (!editingDriver) return;
    try {
      await axios.put(`${API}/drivers/${editingDriver.id}`, editingDriver);
      setEditingDriver(null);
      fetchData();
      toast.success("Chauffør opdateret");
    } catch (e) {
      toast.error("Fejl ved opdatering");
    }
  };

  const handleDeleteDriver = async (driverId) => {
    if (!window.confirm("Er du sikker?")) return;
    try {
      await axios.delete(`${API}/drivers/${driverId}`);
      fetchData();
      toast.success("Chauffør slettet");
    } catch (e) {
      toast.error("Fejl ved sletning");
    }
  };

  const handleSendMessage = async () => {
    if (!selectedDriver || !messageText.trim()) {
      toast.error("Vælg chauffør og skriv besked");
      return;
    }
    try {
      await axios.post(`${API}/messages`, {
        to_driver_id: selectedDriver,
        content: messageText
      });
      setMessageText("");
      fetchData();
      toast.success("Besked sendt");
    } catch (e) {
      toast.error("Fejl ved afsendelse");
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await axios.delete(`${API}/messages/${msgId}`);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPlads = async () => {
    if (!newPladsName.trim()) {
      toast.error("Indtast plads navn");
      return;
    }
    try {
      await axios.post(`${API}/plads`, { name: newPladsName.trim() });
      setNewPladsName("");
      fetchData();
      toast.success("Plads tilføjet");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Fejl ved tilføjelse");
    }
  };

  const handleDeletePlads = async (pladsId) => {
    if (!window.confirm("Er du sikker på at du vil slette denne plads?")) return;
    try {
      await axios.delete(`${API}/plads/${pladsId}`);
      fetchData();
      toast.success("Plads slettet");
    } catch (e) {
      toast.error("Fejl ved sletning");
    }
  };

  // Handle driver schedule change
  const handleScheduleChange = (driverId, plads) => {
    setDriverSchedule(prev => ({
      ...prev,
      [driverId]: plads
    }));
  };

  // Send email to single driver
  const sendEmailToDriver = (driver, plads) => {
    if (!driver.email) {
      toast.error(`${driver.name} har ingen email adresse`);
      return;
    }
    
    const today = new Date().toLocaleDateString("da-DK", { weekday: 'long', day: 'numeric', month: 'long' });
    const subject = encodeURIComponent(`Arbejdsplan - ${today}`);
    
    let body;
    if (plads === "FRI") {
      body = encodeURIComponent(`Hej ${driver.name},\n\nDu har fri i dag (${today}).\n\nMed venlig hilsen\nKORKMAN2 - ILK Company ApS`);
    } else {
      body = encodeURIComponent(`Hej ${driver.name},\n\nDu skal arbejde i ${plads} i dag (${today}).\n\nVogn: ${driver.plate}\n\nMed venlig hilsen\nKORKMAN2 - ILK Company ApS`);
    }
    
    window.open(`mailto:${driver.email}?subject=${subject}&body=${body}`, '_blank');
    toast.success(`Mail åbnet for ${driver.name}`);
  };

  // Send email to all drivers with assignments
  const sendEmailToAllDrivers = () => {
    const driversWithEmail = drivers.filter(d => d.email);
    if (driversWithEmail.length === 0) {
      toast.error("Ingen chauffører har email adresse");
      return;
    }
    
    const today = new Date().toLocaleDateString("da-DK", { weekday: 'long', day: 'numeric', month: 'long' });
    const subject = encodeURIComponent(`Arbejdsplan - ${today}`);
    
    // Build schedule list
    let scheduleList = drivers.map(d => {
      const plads = driverSchedule[d.id] || "Ikke tildelt";
      return `${d.name}: ${plads === "FRI" ? "FRI" : plads}`;
    }).join("\n");
    
    const body = encodeURIComponent(`Arbejdsplan for ${today}:\n\n${scheduleList}\n\nMed venlig hilsen\nKORKMAN2 - ILK Company ApS`);
    
    // Join all emails
    const emails = driversWithEmail.map(d => d.email).join(",");
    
    window.open(`mailto:${emails}?subject=${subject}&body=${body}`, '_blank');
    toast.success("Mail åbnet for alle chauffører");
  };

  // Navigate weeks
  const navigateWeek = (direction) => {
    const current = new Date(weekStart);
    current.setDate(current.getDate() + (direction * 7));
    setWeekStart(current.toISOString().split('T')[0]);
  };

  // Handle weekly schedule change
  const handleWeeklyScheduleChange = (driverId, date, plads) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [`${driverId}-${date}`]: plads
    }));
  };

  // Save weekly schedule
  const saveWeeklySchedule = async () => {
    const schedules = [];
    const weekDates = getWeekDates();
    
    drivers.forEach(driver => {
      weekDates.forEach(date => {
        const key = `${driver.id}-${date}`;
        const plads = weeklySchedule[key];
        if (plads) {
          schedules.push({
            driver_id: driver.id,
            driver_name: driver.name,
            date: date,
            plads: plads
          });
        }
      });
    });
    
    if (schedules.length === 0) {
      toast.error("Ingen ændringer at gemme");
      return;
    }
    
    try {
      await axios.post(`${API}/schedule/bulk`, { schedules });
      toast.success(`${schedules.length} planlægninger gemt!`);
      fetchWeeklySchedule();
    } catch (e) {
      toast.error("Fejl ved gemning");
    }
  };

  // Send weekly email
  const sendWeeklyEmailToAllDrivers = () => {
    const driversWithEmail = drivers.filter(d => d.email);
    if (driversWithEmail.length === 0) {
      toast.error("Ingen chauffører har email adresse");
      return;
    }
    
    const weekDates = getWeekDates();
    const dayNames = ["man", "tir", "ons", "tor", "fre", "lør", "søn"];
    
    const startDate = new Date(weekStart);
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 6);
    
    const subject = encodeURIComponent(`Ugeplan - Uge ${getWeekNumber(startDate)}`);
    
    // Build schedule for each driver
    let scheduleList = drivers.map(driver => {
      const driverSchedule = weekDates.map((date, idx) => {
        const plads = weeklySchedule[`${driver.id}-${date}`] || "-";
        return `${dayNames[idx]}: ${plads}`;
      }).join(", ");
      return `${driver.name}: ${driverSchedule}`;
    }).join("\n");
    
    const body = encodeURIComponent(`Ugeplan (${startDate.toLocaleDateString("da-DK")} - ${endDate.toLocaleDateString("da-DK")}):\n\n${scheduleList}\n\nMed venlig hilsen\nKORKMAN2 - ILK Company ApS`);
    
    const emails = driversWithEmail.map(d => d.email).join(",");
    window.open(`mailto:${emails}?subject=${subject}&body=${body}`, '_blank');
    toast.success("Ugeplan mail åbnet");
  };

  // Get week number
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900" data-testid="admin-page">
      {/* Admin Header */}
      <header className="bg-slate-800 text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-500" />
            <div>
              <h1 className="font-heading font-bold text-xl">KORKMAN2 Admin</h1>
              <p className="text-xs text-slate-400">ILK Company ApS</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700">
            <LogOut className="w-4 h-4" /> Log ud
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            <button 
              onClick={() => setActiveTab("tours")}
              className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === "tours" ? "text-red-600 border-b-2 border-red-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              <FileText className="w-4 h-4 inline mr-2" /> Ture
            </button>
            <button 
              onClick={() => setActiveTab("schedule")}
              className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === "schedule" ? "text-red-600 border-b-2 border-red-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Calendar className="w-4 h-4 inline mr-2" /> Planlægning
            </button>
            <button 
              onClick={() => setActiveTab("drivers")}
              className={`px-4 py-3 font-medium transition-colors ${activeTab === "drivers" ? "text-red-600 border-b-2 border-red-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Users className="w-4 h-4 inline mr-2" /> Chauffører
            </button>
            <button 
              onClick={() => setActiveTab("plads")}
              className={`px-4 py-3 font-medium transition-colors ${activeTab === "plads" ? "text-red-600 border-b-2 border-red-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Building2 className="w-4 h-4 inline mr-2" /> Genbrugsplads
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={`px-4 py-3 font-medium transition-colors ${activeTab === "history" ? "text-red-600 border-b-2 border-red-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              <History className="w-4 h-4 inline mr-2" /> Historik
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Overview */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-600" /> Oversigt
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{drivers.length}</div>
              <div className="text-sm text-muted-foreground">Chauffører</div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-emerald-600">
                {stats.reduce((sum, s) => sum + s.completed_tours, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Fuldførte ture</div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.reduce((sum, s) => sum + s.total_weight, 0).toLocaleString()} kg
              </div>
              <div className="text-sm text-muted-foreground">Total vægt</div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">{messages.length}</div>
              <div className="text-sm text-muted-foreground">Beskeder</div>
            </div>
          </div>
        </section>

        {/* Tours Management Tab - Admin assigns tours by plads */}
        {activeTab === "tours" && (
        <section className="space-y-6">
          {/* Plads selection for tours */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-red-600" /> Vælg Genbrugsplads
            </h2>
            <div className="flex flex-wrap gap-2">
              {pladsList.map(p => (
                <button
                  key={p.id}
                  onClick={() => setAdminSelectedPlads(p.name)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    adminSelectedPlads === p.name
                      ? "bg-red-600 text-white shadow-lg scale-105"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-red-400"
                  }`}
                  data-testid={`admin-plads-${p.name.toLowerCase()}`}
                >
                  {p.name}
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    adminSelectedPlads === p.name ? "bg-white text-red-600" : "bg-red-600 text-white"
                  }`}>
                    {adminTours.filter(t => t.plads === p.name && !t.is_pause).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {adminSelectedPlads && (
          <>
            {/* Mail Parse */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-red-500/50 shadow-lg">
              <div className="p-4 border-b border-border bg-red-50 dark:bg-red-950/20 rounded-t-xl">
                <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                  <Mail className="w-5 h-5 text-red-600" /> Indsæt ture fra mail - {adminSelectedPlads}
                </h2>
              </div>
              <div className="p-4">
                <textarea value={mailText} onChange={(e) => setMailText(e.target.value)}
                  placeholder="Kopier ture fra mail her (tab-separated format)..."
                  className="w-full h-40 px-4 py-3 bg-slate-50 dark:bg-slate-900 border rounded-lg font-mono text-sm resize-none"
                  data-testid="admin-mail-textarea" />
                <div className="flex flex-wrap gap-3 mt-4">
                  <button onClick={handleAdminParseMail} disabled={parsing}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                    data-testid="admin-parse-mail-btn">
                    <Wand2 className="w-5 h-5" /> {parsing ? "Parser..." : "+ Tilføj ture"}
                  </button>
                  <button onClick={handleAdminClearPlads}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500"
                    data-testid="admin-clear-plads-btn">
                    <Trash2 className="w-5 h-5" /> Slet alle i {adminSelectedPlads}
                  </button>
                </div>
              </div>
            </div>

            {/* Activity Summary for this plads */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
              <div className="p-4 border-b border-border">
                <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-red-600" /> Overblik - {adminSelectedPlads}
                </h2>
              </div>
              <div className="p-4">
                {(() => {
                  const pladsT = adminTours.filter(t => t.plads === adminSelectedPlads);
                  const pTours = pladsT.filter(t => !t.is_pause);
                  const pPauses = pladsT.filter(t => t.is_pause);
                  const pCompleted = pTours.filter(t => t.completed);
                  const pOnWay = pTours.filter(t => t.on_way);
                  const pWaiting = pTours.filter(t => !t.completed && !t.on_way);
                  const pTotalKg = pTours.reduce((s, t) => s + (t.weight || 0), 0);
                  const completedTimes = pCompleted.map(t => t.time).filter(Boolean).sort();
                  const firstDone = completedTimes[0] || "-";
                  const lastDone = completedTimes[completedTimes.length - 1] || "-";
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold">{pTours.length}</div>
                        <div className="text-xs text-muted-foreground">Total ture</div>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-emerald-600">{pCompleted.length}</div>
                        <div className="text-xs text-emerald-600">Færdig</div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{pOnWay.length}</div>
                        <div className="text-xs text-yellow-600">På vej</div>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-slate-500">{pWaiting.length}</div>
                        <div className="text-xs text-muted-foreground">Venter</div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{pTotalKg}</div>
                        <div className="text-xs text-blue-600">Total kg</div>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-orange-600">{pPauses.length}</div>
                        <div className="text-xs text-orange-600">Pauser</div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
                        <div className="text-sm font-bold text-purple-600">{firstDone} - {lastDone}</div>
                        <div className="text-xs text-purple-600">Første / Sidste</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Detailed Tours list for selected plads */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" /> Ture i {adminSelectedPlads}
                </h2>
                <span className="text-sm font-bold text-muted-foreground">
                  {adminTours.filter(t => t.plads === adminSelectedPlads && !t.is_pause).length} ture
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                      <th className="p-3 text-left">Fraktion</th>
                      <th className="p-3 text-left">Modtageanlæg</th>
                      <th className="p-3 text-left">Adresse</th>
                      <th className="p-3 text-left">Container</th>
                      <th className="p-3 text-center">Vægt</th>
                      <th className="p-3 text-center">Tid</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Slet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Show pauses first */}
                    {adminTours.filter(t => t.plads === adminSelectedPlads && t.is_pause).map(tour => (
                      <tr key={tour.id} className="border-b bg-orange-50 dark:bg-orange-950/20">
                        <td colSpan="4" className="p-3 text-center font-bold text-orange-600">
                          <Pause className="w-4 h-4 inline mr-1" /> PAUSE
                        </td>
                        <td className="p-3 text-center">-</td>
                        <td className="p-3 text-center font-mono font-bold text-orange-600">{tour.time || "45 min"}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">Pause</span>
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleAdminDeleteTour(tour.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Regular tours sorted: completed at bottom */}
                    {adminTours.filter(t => t.plads === adminSelectedPlads && !t.is_pause)
                      .sort((a, b) => {
                        if (a.on_way && !b.on_way) return -1;
                        if (!a.on_way && b.on_way) return 1;
                        if (a.completed && !b.completed) return 1;
                        if (!a.completed && b.completed) return -1;
                        return (a.time || "").localeCompare(b.time || "");
                      })
                      .map(tour => (
                      <tr key={tour.id} className={`border-b hover:bg-slate-50 dark:hover:bg-slate-900 ${
                        tour.completed ? "bg-emerald-50 dark:bg-emerald-950/30" 
                        : tour.on_way ? "bg-yellow-50 dark:bg-yellow-950/20" 
                        : ""
                      }`}>
                        <td className="p-3 font-medium">{tour.fraction}</td>
                        <td className="p-3 text-sm">{tour.facility}</td>
                        <td className="p-3 text-sm">{tour.address}</td>
                        <td className="p-3 font-mono text-sm">{tour.container}</td>
                        <td className="p-3 text-center font-mono font-bold">
                          {tour.weight ? <span className="text-emerald-600">{tour.weight} kg</span> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {tour.time ? <span className="font-bold">{tour.time}</span> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-3 text-center">
                          {tour.completed ? (
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                              Færdig
                            </span>
                          ) : tour.on_way ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                              På vej
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">Venter</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleAdminDeleteTour(tour.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {adminTours.filter(t => t.plads === adminSelectedPlads).length === 0 && (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-muted-foreground">
                          Ingen ture i {adminSelectedPlads}. Indsæt fra mail ovenfor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
          )}

          {!adminSelectedPlads && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-12 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-muted-foreground text-lg">Vælg en genbrugsplads for at tilføje ture</p>
            </div>
          )}
        </section>
        )}

        {/* Schedule / Planning Tab */}
        {activeTab === "schedule" && (
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600" /> Planlægning
              </h2>
              {/* View Mode Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                <button 
                  onClick={() => setViewMode("daily")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "daily" ? "bg-white dark:bg-slate-600 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}
                >
                  Daglig
                </button>
                <button 
                  onClick={() => setViewMode("weekly")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "weekly" ? "bg-white dark:bg-slate-600 shadow-sm" : "text-slate-600 dark:text-slate-400"}`}
                >
                  Ugentlig
                </button>
              </div>
            </div>
            
            {viewMode === "daily" ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString("da-DK", { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <button 
                  onClick={sendEmailToAllDrivers}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Mail className="w-4 h-4" /> Send til alle
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium px-3">
                  Uge {getWeekNumber(new Date(weekStart))} - {new Date(weekStart).toLocaleDateString("da-DK", { day: 'numeric', month: 'short' })} til {new Date(new Date(weekStart).setDate(new Date(weekStart).getDate() + 6)).toLocaleDateString("da-DK", { day: 'numeric', month: 'short' })}
                </span>
                <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={saveWeeklySchedule}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-2"
                >
                  <Download className="w-4 h-4" /> Gem uge
                </button>
                <button 
                  onClick={sendWeeklyEmailToAllDrivers}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Mail className="w-4 h-4" /> Send ugeplan
                </button>
              </div>
            )}
          </div>
          
          {/* Daily View */}
          {viewMode === "daily" && (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                  <th className="p-3 text-left">Chauffør</th>
                  <th className="p-3 text-left">Nummerplade</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Arbejdssted</th>
                  <th className="p-3 text-center">Send Mail</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => (
                  <tr key={driver.id} className={`border-b hover:bg-slate-50 dark:hover:bg-slate-900 ${driverSchedule[driver.id] === "FRI" ? "bg-green-50 dark:bg-green-950/20" : ""}`}>
                    <td className="p-3">
                      <span className="font-medium">{driver.name}</span>
                    </td>
                    <td className="p-3 font-mono text-sm">{driver.plate}</td>
                    <td className="p-3">
                      {driver.email ? (
                        <span className="text-sm text-blue-600">{driver.email}</span>
                      ) : (
                        <span className="text-sm text-red-500 italic">Ingen email</span>
                      )}
                    </td>
                    <td className="p-3">
                      <select 
                        value={driverSchedule[driver.id] || ""}
                        onChange={(e) => handleScheduleChange(driver.id, e.target.value)}
                        className={`px-3 py-2 border rounded-lg w-full max-w-xs ${driverSchedule[driver.id] === "FRI" ? "bg-green-100 text-green-800 font-bold" : ""}`}
                      >
                        <option value="">Vælg plads...</option>
                        <option value="FRI" className="bg-green-100 text-green-800 font-bold">🏖️ FRI (Fridag)</option>
                        {pladsList.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => sendEmailToDriver(driver, driverSchedule[driver.id])}
                        disabled={!driver.email || !driverSchedule[driver.id]}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!driver.email ? "Ingen email" : !driverSchedule[driver.id] ? "Vælg plads først" : "Send mail"}
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Daily Summary */}
          <div className="p-4 border-t bg-slate-50 dark:bg-slate-900">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="font-medium text-slate-600">Arbejder:</span>{" "}
                <span className="font-bold text-blue-600">
                  {drivers.filter(d => driverSchedule[d.id] && driverSchedule[d.id] !== "FRI").length}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-600">FRI:</span>{" "}
                <span className="font-bold text-green-600">
                  {drivers.filter(d => driverSchedule[d.id] === "FRI").length}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Ikke tildelt:</span>{" "}
                <span className="font-bold text-amber-600">
                  {drivers.filter(d => !driverSchedule[d.id]).length}
                </span>
              </div>
            </div>
          </div>
          </>
          )}
          
          {/* Weekly View */}
          {viewMode === "weekly" && (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                  <th className="p-3 text-left sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 min-w-[150px]">Chauffør</th>
                  {getWeekDates().map((date, idx) => {
                    const d = new Date(date);
                    const dayNames = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th key={date} className={`p-2 text-center min-w-[100px] ${isWeekend ? "bg-slate-100 dark:bg-slate-800" : ""}`}>
                        <div className="font-bold">{dayNames[d.getDay()]}</div>
                        <div className="text-xs text-muted-foreground">{d.getDate()}/{d.getMonth() + 1}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => (
                  <tr key={driver.id} className="border-b hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="p-2 sticky left-0 bg-white dark:bg-slate-800 z-10 border-r">
                      <div className="font-medium text-sm">{driver.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{driver.plate}</div>
                    </td>
                    {getWeekDates().map((date) => {
                      const d = new Date(date);
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const key = `${driver.id}-${date}`;
                      const value = weeklySchedule[key] || "";
                      
                      return (
                        <td key={date} className={`p-1 ${isWeekend ? "bg-slate-50 dark:bg-slate-800/50" : ""} ${value === "FRI" ? "bg-green-50 dark:bg-green-950/30" : ""}`}>
                          <select 
                            value={value}
                            onChange={(e) => handleWeeklyScheduleChange(driver.id, date, e.target.value)}
                            className={`w-full px-1 py-1.5 text-xs border rounded ${value === "FRI" ? "bg-green-100 text-green-800 font-bold" : "bg-white dark:bg-slate-700"}`}
                          >
                            <option value="">-</option>
                            <option value="FRI">🏖️ FRI</option>
                            {pladsList.map(p => (
                              <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Weekly Summary */}
          <div className="p-4 border-t bg-slate-50 dark:bg-slate-900">
            <div className="flex flex-wrap gap-6 text-sm">
              {getWeekDates().map((date) => {
                const d = new Date(date);
                const dayNames = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
                const working = drivers.filter(dr => {
                  const val = weeklySchedule[`${dr.id}-${date}`];
                  return val && val !== "FRI";
                }).length;
                const fri = drivers.filter(dr => weeklySchedule[`${dr.id}-${date}`] === "FRI").length;
                
                return (
                  <div key={date} className="text-center">
                    <div className="font-medium text-xs text-slate-500">{dayNames[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}</div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-blue-600 font-bold">{working}</span>
                      <span className="text-green-600 font-bold">{fri} fri</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </>
          )}
        </section>
        )}

        {/* Drivers Management */}
        {activeTab === "drivers" && (
        <>
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" /> Chauffører
            </h2>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Plus className="w-4 h-4" /> Tilføj ny
            </button>
          </div>

          {/* Add Driver Form */}
          {showAddForm && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-border">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <input type="text" value={newDriver.name} onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                  placeholder="Navn" className="px-3 py-2 border rounded-lg" />
                <input type="text" value={newDriver.plate} onChange={(e) => setNewDriver({...newDriver, plate: e.target.value})}
                  placeholder="Nummerplade" className="px-3 py-2 border rounded-lg font-mono" />
                <input type="text" value={newDriver.area} onChange={(e) => setNewDriver({...newDriver, area: e.target.value})}
                  placeholder="Område" className="px-3 py-2 border rounded-lg" />
                <input type="text" value={newDriver.phone} onChange={(e) => setNewDriver({...newDriver, phone: e.target.value})}
                  placeholder="Telefon" className="px-3 py-2 border rounded-lg" />
                <input type="email" value={newDriver.email} onChange={(e) => setNewDriver({...newDriver, email: e.target.value})}
                  placeholder="Email" className="px-3 py-2 border rounded-lg" />
                <button onClick={handleAddDriver} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Gem
                </button>
              </div>
            </div>
          )}

          {/* Drivers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                  <th className="p-3 text-left">Navn</th>
                  <th className="p-3 text-left">Nummerplade</th>
                  <th className="p-3 text-left">Område</th>
                  <th className="p-3 text-left">Telefon</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-center">Ture i dag</th>
                  <th className="p-3 text-center">Total ture</th>
                  <th className="p-3 text-center">Total kg</th>
                  <th className="p-3 text-center">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => {
                  const driverStats = stats.find(s => s.driver_id === driver.id) || {};
                  const isEditing = editingDriver?.id === driver.id;
                  
                  return (
                    <tr key={driver.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="p-3">
                        {isEditing ? (
                          <input type="text" value={editingDriver.name} 
                            onChange={(e) => setEditingDriver({...editingDriver, name: e.target.value})}
                            className="px-2 py-1 border rounded w-full" />
                        ) : (
                          <span className="font-medium">{driver.name}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <input type="text" value={editingDriver.plate}
                            onChange={(e) => setEditingDriver({...editingDriver, plate: e.target.value})}
                            className="px-2 py-1 border rounded w-full" />
                        ) : driver.plate}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input type="text" value={editingDriver.area}
                            onChange={(e) => setEditingDriver({...editingDriver, area: e.target.value})}
                            className="px-2 py-1 border rounded w-full" />
                        ) : driver.area}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input type="text" value={editingDriver.phone || ""}
                            onChange={(e) => setEditingDriver({...editingDriver, phone: e.target.value})}
                            className="px-2 py-1 border rounded w-full" />
                        ) : driver.phone || "-"}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input type="email" value={editingDriver.email || ""}
                            onChange={(e) => setEditingDriver({...editingDriver, email: e.target.value})}
                            className="px-2 py-1 border rounded w-full" />
                        ) : driver.email ? (
                          <span className="text-blue-600 text-xs">{driver.email}</span>
                        ) : (
                          <span className="text-red-500 text-xs italic">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                          {driverStats.today_completed || 0}/{driverStats.today_tours || 0}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">{driverStats.completed_tours || 0}</td>
                      <td className="p-3 text-center">{(driverStats.total_weight || 0).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={handleUpdateDriver} className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingDriver(null)} className="p-1.5 bg-slate-500 text-white rounded hover:bg-slate-600">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setEditingDriver(driver)} className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteDriver(driver.id)} className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Messages Section - inside drivers tab */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <div className="p-4 border-b border-border">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <Send className="w-5 h-5 text-red-600" /> Send besked til chauffør
            </h2>
          </div>
          <div className="p-4">
            <div className="flex gap-3 mb-4">
              <select value={selectedDriver || ""} onChange={(e) => setSelectedDriver(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg">
                <option value="">Vælg chauffør...</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)}
                placeholder="Skriv besked..." className="flex-[2] px-3 py-2 border rounded-lg" />
              <button onClick={handleSendMessage} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
            
            {/* Message History */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {messages.map(msg => (
                <div key={msg.id} className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{msg.to_driver_name}</div>
                    <div className="text-sm text-muted-foreground">{msg.content}</div>
                    <div className="text-xs text-slate-400 mt-1">{new Date(msg.created_at).toLocaleString("da-DK")}</div>
                  </div>
                  <button onClick={() => handleDeleteMessage(msg.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Ingen beskeder</p>
              )}
            </div>
          </div>
        </section>
        </>
        )}

        {/* Plads Management Tab */}
        {activeTab === "plads" && (
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-600" /> Genbrugsplads / Områder
            </h2>
          </div>
          <div className="p-4">
            {/* Add new plads */}
            <div className="flex gap-3 mb-6">
              <input 
                type="text" 
                value={newPladsName} 
                onChange={(e) => setNewPladsName(e.target.value)}
                placeholder="Ny plads/by navn..."
                className="flex-1 px-4 py-2 border rounded-lg"
                onKeyDown={(e) => e.key === "Enter" && handleAddPlads()}
              />
              <button 
                onClick={handleAddPlads}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Tilføj
              </button>
            </div>
            
            {/* Plads list */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {pladsList.map(plads => (
                <div key={plads.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="font-medium">{plads.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDeletePlads(plads.id)}
                    className="p-1 text-red-500 hover:text-red-600 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {pladsList.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-8">
                  Ingen plads tilføjet endnu
                </p>
              )}
            </div>
          </div>
        </section>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
          <div className="p-4 border-b border-border">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-red-600" /> Rapport Historik (sidste 30 dage)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                  <th className="p-3 text-left">Dato</th>
                  <th className="p-3 text-center">Ture</th>
                  <th className="p-3 text-center">Færdig</th>
                  <th className="p-3 text-center">Total kg</th>
                  <th className="p-3 text-center">Chauffører</th>
                </tr>
              </thead>
              <tbody>
                {reportHistory.map(day => (
                  <tr key={day.date} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="p-3 font-medium">
                      {new Date(day.date).toLocaleDateString("da-DK", { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        {day.total_tours}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                        {day.completed_tours}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      {day.total_weight.toLocaleString()} kg
                    </td>
                    <td className="p-3 text-center">
                      {day.driver_count}
                    </td>
                  </tr>
                ))}
                {reportHistory.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-muted-foreground">
                      Ingen historik fundet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Summary stats */}
          {reportHistory.length > 0 && (
            <div className="p-4 border-t bg-slate-50 dark:bg-slate-900">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {reportHistory.reduce((sum, d) => sum + d.total_tours, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total ture</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {reportHistory.reduce((sum, d) => sum + d.completed_tours, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Fuldførte</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">
                    {reportHistory.reduce((sum, d) => sum + d.total_weight, 0).toLocaleString()} kg
                  </div>
                  <div className="text-xs text-muted-foreground">Total vægt</div>
                </div>
              </div>
            </div>
          )}
        </section>
        )}
      </main>
    </div>
  );
};

// ============= MAIN APP =============

function App() {
  // Auth state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");

  // Driver setup state - check localStorage
  const [driverSetupDone, setDriverSetupDone] = useState(() => {
    return !!localStorage.getItem("korkman2_driver_name");
  });
  const [setupStep, setSetupStep] = useState(1); // 1=name, 2=plate
  const [setupName, setSetupName] = useState("");
  const [setupPlate, setSetupPlate] = useState(() => {
    return localStorage.getItem("korkman2_vehicle_reg") || "";
  });

  // Data state
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [tours, setTours] = useState([]);
  const [reportId, setReportId] = useState("");
  const [pladsList, setPladsList] = useState([]); // Dynamic plads list from DB
  
  // Filter state
  const [selectedPlads, setSelectedPlads] = useState("");
  
  // Form state - init from localStorage
  const [driverName, setDriverName] = useState(() => {
    return localStorage.getItem("korkman2_driver_name") || "";
  });
  const [vehicleReg, setVehicleReg] = useState(() => {
    return localStorage.getItem("korkman2_vehicle_reg") || "";
  });
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [customPlads, setCustomPlads] = useState("");
  const [notes, setNotes] = useState("");
  
  // Manual tour form
  const [manualFraction, setManualFraction] = useState("");
  const [manualFacility, setManualFacility] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualContainer, setManualContainer] = useState("");
  const [isSameDay, setIsSameDay] = useState(false);
  
  // Dropdown states
  const [showPladsDropdown, setShowPladsDropdown] = useState(false);
  const [showPlateDropdown, setShowPlateDropdown] = useState(false);

  // Messages for driver
  const [driverMessages, setDriverMessages] = useState([]);
  const [showMessages, setShowMessages] = useState(false);

  // Get plads names from dynamic list
  const pladsOptions = pladsList.map(p => p.name);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setShowPladsDropdown(false);
      setShowPlateDropdown(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ============= DRIVER SETUP =============

  const handleSetupName = () => {
    if (!setupName.trim()) { toast.error("Indtast dit navn"); return; }
    localStorage.setItem("korkman2_driver_name", setupName.trim());
    setDriverName(setupName.trim());
    setSetupStep(2);
  };

  const handleSetupPlate = () => {
    if (!setupPlate.trim()) { toast.error("Indtast vogn nr."); return; }
    localStorage.setItem("korkman2_vehicle_reg", setupPlate.trim());
    setVehicleReg(setupPlate.trim());
    setDriverSetupDone(true);
  };

  const handleChangePlate = (newPlate) => {
    setVehicleReg(newPlate);
    localStorage.setItem("korkman2_vehicle_reg", newPlate);
  };

  const handleLogoutDriver = () => {
    localStorage.removeItem("korkman2_driver_name");
    localStorage.removeItem("korkman2_vehicle_reg");
    setDriverName("");
    setVehicleReg("");
    setSetupName("");
    setSetupPlate("");
    setSetupStep(1);
    setDriverSetupDone(false);
    setSelectedPlads("");
  };

  // ============= API CALLS =============

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/drivers`);
      setDrivers(res.data);
    } catch (e) {
      console.error("Error fetching drivers:", e);
    }
  }, []);

  const fetchTours = useCallback(async () => {
    if (!reportId) return;
    try {
      const res = await axios.get(`${API}/tours?report_id=${reportId}`);
      setTours(res.data);
    } catch (e) {
      console.error("Error fetching tours:", e);
    }
  }, [reportId]);

  const seedData = useCallback(async () => {
    try {
      await axios.post(`${API}/seed`);
      fetchDrivers();
      // Fetch plads list
      const pladsRes = await axios.get(`${API}/plads`);
      setPladsList(pladsRes.data);
    } catch (e) {
      console.error("Error seeding data:", e);
    }
  }, [fetchDrivers]);

  // ============= EFFECTS =============

  useEffect(() => { seedData(); }, [seedData]);
  useEffect(() => { if (reportId) fetchTours(); }, [reportId, fetchTours]);

  // Auto-refresh tours every 10 seconds so driver sees admin-added tours
  useEffect(() => {
    if (!reportId) return;
    const interval = setInterval(() => {
      fetchTours();
    }, 10000);
    return () => clearInterval(interval);
  }, [reportId, fetchTours]);

  useEffect(() => {
    const initReport = async () => {
      if (!reportId) {
        try {
          // First check if there's already a report for today
          const existingRes = await axios.get(`${API}/reports?date=${reportDate}`);
          if (existingRes.data && existingRes.data.length > 0) {
            // Use existing report
            setReportId(existingRes.data[0].id);
          } else {
            // Create new report
            const res = await axios.post(`${API}/reports`, {
              report_date: reportDate,
              start_time: "07:00"
            });
            setReportId(res.data.id);
          }
        } catch (e) {
          console.error("Error initializing report:", e);
        }
      }
    };
    initReport();
  }, [reportDate, reportId]);

  // ============= HANDLERS =============

  const handleAdminLogin = async () => {
    try {
      const res = await axios.post(`${API}/admin/login`, { username: "admin", password: adminPass });
      if (res.data.success) {
        setIsAdmin(true);
        setShowAdminLogin(false);
        toast.success("Admin login successful");
      }
    } catch (e) {
      toast.error("Forkert kode");
    }
  };

  const fetchDriverMessages = async (driverId) => {
    try {
      const res = await axios.get(`${API}/messages?driver_id=${driverId}`);
      const unreadMessages = res.data.filter(m => !m.read);
      setDriverMessages(unreadMessages);
      if (unreadMessages.length > 0) {
        setShowMessages(true);
      }
    } catch (e) {
      console.error("Error fetching messages:", e);
    }
  };
  
  const markMessageRead = async (messageId) => {
    try {
      await axios.put(`${API}/messages/${messageId}/read`);
      setDriverMessages(driverMessages.filter(m => m.id !== messageId));
      if (driverMessages.length <= 1) {
        setShowMessages(false);
      }
    } catch (e) {
      console.error("Error marking message read:", e);
    }
  };

  // Match driver name with DB drivers for messages
  useEffect(() => {
    if (driverName && drivers.length > 0) {
      const match = drivers.find(d => d.name.toLowerCase() === driverName.toLowerCase());
      if (match) {
        setSelectedDriver(match);
        fetchDriverMessages(match.id);
      }
    }
  }, [driverName, drivers]);

  const handleAddManualTour = async () => {
    if (!manualFraction || !manualFacility) { toast.error("Udfyld fraktion og modtageanlæg!"); return; }
    
    const activeTours = tours.filter(t => !t.is_pause).length;
    if (activeTours >= 20) { toast.error("Maksimum 20 ture!"); return; }
    
    console.log("Adding tour with plads:", selectedPlads, "reportId:", reportId);
    
    try {
      const res = await axios.post(`${API}/tours`, {
        date: reportDate,
        fraction: manualFraction,
        facility: manualFacility,
        address: manualAddress,
        container: manualContainer,
        is_same_day: isSameDay,
        plads: selectedPlads || "",
        driver_id: selectedDriver?.id || "",
        driver_name: driverName,
        report_id: reportId
      });
      console.log("Tour added:", res.data);
      setTours(prevTours => [...prevTours, res.data]);
      setManualFraction(""); setManualFacility(""); setManualAddress(""); setManualContainer(""); setIsSameDay(false);
      toast.success("Tur tilføjet");
    } catch (e) {
      console.error("Error adding tour:", e);
      toast.error("Fejl ved tilføjelse");
    }
  };

  const handleAddPause = async (minutes = 45) => {
    const now = new Date();
    const pauseStart = now.toTimeString().slice(0, 5);
    const pauseEnd = new Date(now.getTime() + minutes * 60000).toTimeString().slice(0, 5);
    
    try {
      const res = await axios.post(`${API}/tours/pause?report_id=${reportId}&plads=${selectedPlads}&driver_id=${selectedDriver?.id || ""}&driver_name=${driverName}`);
      await axios.put(`${API}/tours/${res.data.id}`, { time: `${pauseStart}-${pauseEnd}` });
      setTours([...tours, { ...res.data, time: `${pauseStart}-${pauseEnd}` }]);
      toast.success(`Pause: ${pauseStart} - ${pauseEnd} (${minutes} min)`);
    } catch (e) {
      toast.error("Fejl ved pause");
    }
  };

  const handleUpdateTour = async (tourId, update) => {
    try {
      const res = await axios.put(`${API}/tours/${tourId}`, update);
      setTours(tours.map(t => t.id === tourId ? res.data : t));
    } catch (e) {
      console.error("Error updating tour:", e);
    }
  };

  const handleToggleOnWay = async (tourId) => {
    const tour = tours.find(t => t.id === tourId);
    if (!tour) return;
    const newOnWay = !tour.on_way;
    const currentTime = newOnWay ? getCurrentTime() : tour.time;
    await handleUpdateTour(tourId, { on_way: newOnWay, time: currentTime });
    if (newOnWay) toast.success(`${driverName || "Chauffør"} er på vej!`);
  };

  const handleToggleComplete = async (tourId) => {
    const tour = tours.find(t => t.id === tourId);
    if (!tour) return;
    const nowCompleting = !tour.completed;
    const currentTime = new Date().toTimeString().slice(0, 5);
    await handleUpdateTour(tourId, { 
      completed: nowCompleting, 
      on_way: false,
      time: nowCompleting ? currentTime : tour.time
    });
    if (nowCompleting) toast.success("Tur fuldført!");
  };

  const handleDeleteTour = async (tourId) => {
    try {
      await axios.delete(`${API}/tours/${tourId}`);
      setTours(tours.filter(t => t.id !== tourId));
      toast.success("Tur slettet");
    } catch (e) {
      toast.error("Fejl ved sletning");
    }
  };

  const handleClearAll = async () => {
    if (!selectedPlads) { toast.error("Vælg en plads først"); return; }
    if (!window.confirm(`Slet alle ture i ${selectedPlads}?`)) return;
    try {
      const toursToDelete = tours.filter(t => t.plads === selectedPlads);
      await Promise.all(toursToDelete.map(t => axios.delete(`${API}/tours/${t.id}`)));
      setTours(tours.filter(t => t.plads !== selectedPlads));
      toast.success(`Alle ture i ${selectedPlads} slettet`);
    } catch (e) {
      toast.error("Fejl");
    }
  };

  const handleGeneratePDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const pdfTours = tours.filter(t => !t.is_pause);
      const pdfPauses = tours.filter(t => t.is_pause);
      const pdfCompletedTours = pdfTours.filter(t => t.completed);
      const pdfTotalWeight = pdfTours.reduce((sum, t) => sum + (t.weight || 0), 0);
      
      // RED HEADER
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("KORKMAN2", 14, 18);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("ILK Company ApS", 14, 26);
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("KØRSELSRAPPORT", pageWidth - 14, 18, { align: "right" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const formattedDate = reportDate.split("-").reverse().join(".");
      doc.text(`Dato: ${formattedDate}`, pageWidth - 14, 26, { align: "right" });
      
      // DRIVER INFO BOX
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.rect(14, 42, pageWidth - 28, 32);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("CHAUFFØR NAVN:", 18, 50);
      doc.text("VOGN NR.:", 18, 58);
      doc.text("PLADS:", 18, 66);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.text(driverName || "Ikke valgt", 55, 50);
      doc.text(vehicleReg || "-", 55, 58);
      doc.text(selectedPlads || customPlads || "-", 55, 66);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("START TID:", pageWidth / 2 + 10, 50);
      doc.text("SLUT TID:", pageWidth / 2 + 10, 58);
      doc.text("TID I ALT:", pageWidth / 2 + 10, 66);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.text(startTime || "-", pageWidth / 2 + 40, 50);
      doc.text(endTime || "-", pageWidth / 2 + 40, 58);
      
      let totalTimeStr = "-";
      if (startTime && endTime) {
        const [startH, startM] = startTime.split(":").map(Number);
        const [endH, endM] = endTime.split(":").map(Number);
        let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        totalTimeStr = `${Math.floor(totalMinutes / 60)}t ${totalMinutes % 60}m`;
      }
      doc.text(totalTimeStr, pageWidth / 2 + 40, 66);
      
      // STATS BOX
      const statsY = 82;
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.rect(14, statsY, pageWidth - 28, 16);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("TURE:", 18, statsY + 11);
      doc.text("FÆRDIG:", 55, statsY + 11);
      doc.text("TOTAL KG:", 100, statsY + 11);
      doc.text("PAUSE:", 150, statsY + 11);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.text(`${pdfTours.length}`, 35, statsY + 11);
      doc.text(`${pdfCompletedTours.length}`, 75, statsY + 11);
      doc.text(`${pdfTotalWeight}`, 125, statsY + 11);
      doc.text(`${pdfPauses.length}`, 167, statsY + 11);
      
      // COMPLETED TOURS LIST - sorted by time
      let currentY = statsY + 28;
      
      const sortedCompleted = [...pdfCompletedTours].sort((a, b) => {
        return (a.time || "99:99").localeCompare(b.time || "99:99");
      });
      
      if (sortedCompleted.length > 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text("FULDFØRTE TURE:", 14, currentY);
        currentY += 8;
        
        // Table header
        doc.setFillColor(220, 38, 38);
        doc.rect(14, currentY, pageWidth - 28, 8, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("NR", 16, currentY + 5.5);
        doc.text("TID", 28, currentY + 5.5);
        doc.text("FRAKTION", 46, currentY + 5.5);
        doc.text("MODTAGEANLÆG", 82, currentY + 5.5);
        doc.text("ADRESSE", 126, currentY + 5.5);
        doc.text("VÆGT", 178, currentY + 5.5);
        currentY += 11;
        
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        
        sortedCompleted.forEach((tour, idx) => {
          // Check if we need a new page
          if (currentY > pageHeight - 25) {
            doc.addPage();
            currentY = 15;
          }
          
          // Alternating row background
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, currentY - 5, pageWidth - 28, 9, 'F');
          }
          
          // Row separator line
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.2);
          doc.line(14, currentY + 4, pageWidth - 14, currentY + 4);
          
          doc.setTextColor(0, 0, 0);
          doc.text(`${idx + 1}`, 16, currentY + 1);
          doc.setFont("helvetica", "bold");
          doc.text(tour.time || "-", 28, currentY + 1);
          doc.setFont("helvetica", "normal");
          doc.text((tour.fraction || "").substring(0, 18), 46, currentY + 1);
          doc.text((tour.facility || "").substring(0, 22), 82, currentY + 1);
          doc.text((tour.address || "").substring(0, 26), 126, currentY + 1);
          doc.setFont("helvetica", "bold");
          doc.text(tour.weight ? `${tour.weight} kg` : "-", 178, currentY + 1);
          doc.setFont("helvetica", "normal");
          currentY += 9;
        });
      }
      
      // NOTES
      if (notes) {
        currentY += 5;
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 15;
        }
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.setFontSize(9);
        doc.text("BEMÆRKNINGER:", 18, currentY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.text(doc.splitTextToSize(notes, pageWidth - 40), 18, currentY + 6);
      }
      
      // FOOTER on last page
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(128, 128, 128);
        doc.text(`Genereret: ${new Date().toLocaleString("da-DK")} | KORKMAN2 - ILK Company ApS | Side ${i}/${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      }
      
      doc.save(`korselsrapport_${formattedDate}_${driverName || "rapport"}.pdf`);
      toast.success("PDF genereret!");
    } catch (error) {
      console.error("PDF error:", error);
      toast.error("Fejl: " + error.message);
    }
  };

  // ============= COMPUTED VALUES =============

  const activeTours = tours.filter(t => !t.is_pause);
  const completedTours = activeTours.filter(t => t.completed);
  const totalWeight = activeTours.reduce((sum, t) => sum + (t.weight || 0), 0);
  
  // Filter tours by plads - only show tours that belong to selected plads
  const filteredTours = selectedPlads 
    ? tours.filter(t => t.plads === selectedPlads)
    : tours;
  
  // Stats for filtered (selected plads) tours
  const filteredActive = filteredTours.filter(t => !t.is_pause);
  const filteredCompleted = filteredActive.filter(t => t.completed);
  const filteredOnWay = filteredActive.filter(t => t.on_way && !t.completed);
  const filteredWaiting = filteredActive.filter(t => !t.completed && !t.on_way);
  const filteredWeight = filteredActive.reduce((sum, t) => sum + (t.weight || 0), 0);
  
  // Sort: group by facility first, then on_way, then normal, then completed
  const sortedTours = [...filteredTours].sort((a, b) => {
    // Pauses at the end
    if (a.is_pause && !b.is_pause) return 1;
    if (!a.is_pause && b.is_pause) return -1;
    
    // On way tours first
    if (a.on_way && !b.on_way) return -1;
    if (!a.on_way && b.on_way) return 1;
    
    // Completed tours at end
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    
    // Group by facility (same facility together)
    if (a.facility !== b.facility) {
      return (a.facility || "").localeCompare(b.facility || "");
    }
    
    // Same facility - sort by address
    if (a.address !== b.address) {
      return (a.address || "").localeCompare(b.address || "");
    }
    
    // Haster (urgent) first within same facility
    const aHaster = a.remark?.toLowerCase().includes("haster") ? 0 : 1;
    const bHaster = b.remark?.toLowerCase().includes("haster") ? 0 : 1;
    return aHaster - bHaster;
  });
  
  const calculateTotalTime = () => {
    if (!startTime || !endTime) return "0t 0m";
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    return `${Math.floor(totalMinutes / 60)}t ${totalMinutes % 60}m`;
  };
  
  // Get tour count per plads
  const getPladsTourCount = (plads) => tours.filter(t => t.plads === plads && !t.is_pause).length;

  // ============= RENDER =============

  // Admin login modal
  if (showAdminLogin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Toaster position="top-right" richColors />
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield className="w-10 h-10 text-red-600" />
            <h2 className="font-heading font-bold text-2xl">Admin Login</h2>
          </div>
          <div className="space-y-4">
            <input type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)}
              placeholder="Indtast admin kode" className="w-full px-4 py-3 border rounded-lg text-center text-xl tracking-widest"
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()} autoFocus />
            <button onClick={handleAdminLogin}
              className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">
              Log ind
            </button>
            <button onClick={() => setShowAdminLogin(false)}
              className="w-full py-2 text-slate-500 hover:text-slate-700">
              Annuller
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin page
  if (isAdmin) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <AdminPage onLogout={() => setIsAdmin(false)} />
      </>
    );
  }

  // Driver setup screen
  if (!driverSetupDone) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4" data-testid="driver-setup">
        <Toaster position="top-right" richColors />
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg mb-4">
              <Truck className="w-8 h-8" />
              <span className="font-heading font-black text-2xl">KORKMAN2</span>
            </div>
            <p className="text-sm text-muted-foreground">ILK Company ApS - Kørselsrapport</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            {setupStep === 1 && (
              <div className="space-y-6" data-testid="setup-step-name">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-red-600" />
                  <h2 className="font-heading font-bold text-xl">Velkommen!</h2>
                  <p className="text-muted-foreground text-sm mt-1">Indtast dit navn for at komme i gang</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dit navn</label>
                  <input type="text" value={setupName} onChange={(e) => setSetupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSetupName()}
                    placeholder="F.eks. Anders Nielsen"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-lg focus:border-red-500 focus:ring-0 outline-none"
                    data-testid="setup-name-input" autoFocus />
                </div>
                <button onClick={handleSetupName}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-colors"
                  data-testid="setup-name-btn">
                  Næste
                </button>
              </div>
            )}

            {setupStep === 2 && (
              <div className="space-y-6" data-testid="setup-step-plate">
                <div className="text-center">
                  <Car className="w-12 h-12 mx-auto mb-3 text-red-600" />
                  <h2 className="font-heading font-bold text-xl">Hej {setupName}!</h2>
                  <p className="text-muted-foreground text-sm mt-1">Hvilken vogn kører du i dag?</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Vogn nr. / Plade</label>
                  {/* Show registered plates as buttons */}
                  {drivers.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {drivers.map(d => d.plate).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map(plate => (
                        <button key={plate} onClick={() => setSetupPlate(plate)}
                          className={`px-3 py-2.5 rounded-lg font-mono text-sm border-2 transition-all ${
                            setupPlate === plate 
                              ? "border-red-500 bg-red-50 text-red-700 font-bold" 
                              : "border-slate-200 hover:border-red-300 hover:bg-red-50"
                          }`}
                          data-testid={`setup-plate-option-${plate}`}>
                          {plate}
                        </button>
                      ))}
                    </div>
                  )}
                  <input type="text" value={setupPlate} onChange={(e) => setSetupPlate(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleSetupPlate()}
                    placeholder="Eller skriv manuelt..."
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-lg font-mono text-center tracking-wider focus:border-red-500 focus:ring-0 outline-none"
                    data-testid="setup-plate-input" />
                </div>
                <button onClick={handleSetupPlate}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-colors"
                  data-testid="setup-plate-btn">
                  Start
                </button>
                <button onClick={() => setSetupStep(1)}
                  className="w-full py-2 text-slate-400 hover:text-slate-600 text-sm">
                  Tilbage
                </button>
              </div>
            )}
          </div>

          {/* Admin link */}
          <div className="text-center mt-6">
            <button onClick={() => setShowAdminLogin(true)} className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 mx-auto">
              <Shield className="w-3 h-3" /> Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900" data-testid="app-container">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="bg-red-600 text-white py-4 px-4 shadow-lg" data-testid="app-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-heading font-black text-2xl md:text-3xl">KORKMAN2</h1>
            <p className="text-red-100 text-xs">ILK Company ApS - Kørselsrapport</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Driver info */}
            <div className="hidden md:flex items-center gap-2 bg-red-700/50 px-3 py-1.5 rounded-lg">
              <Users className="w-4 h-4 text-red-200" />
              <span className="font-medium text-sm">{driverName}</span>
            </div>
            {/* Message notification */}
            {driverMessages.length > 0 && (
              <button onClick={() => setShowMessages(!showMessages)}
                className="relative p-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 animate-pulse">
                <Mail className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-800 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {driverMessages.length}
                </span>
              </button>
            )}
            <button onClick={handleLogoutDriver}
              className="p-2 bg-red-700 rounded-lg hover:bg-red-800 text-xs" title="Log ud">
              <LogOut className="w-4 h-4" />
            </button>
            <button onClick={() => setShowAdminLogin(true)} 
              className="p-2 bg-red-700 rounded-lg hover:bg-red-800" title="Admin">
              <Shield className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Message Box for Driver */}
      {showMessages && driverMessages.length > 0 && (
        <div className="bg-amber-50 border-b-4 border-amber-500 py-4 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-800">Beskeder fra admin</h3>
              <button onClick={() => setShowMessages(false)} className="ml-auto text-amber-600 hover:text-amber-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {driverMessages.map(msg => (
                <div key={msg.id} className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-amber-500 flex items-start justify-between">
                  <div>
                    <p className="text-slate-800">{msg.content}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(msg.created_at).toLocaleString("da-DK")}
                    </p>
                  </div>
                  <button onClick={() => markMessageRead(msg.id)}
                    className="px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> OK
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar - shows filtered stats for selected plads */}
      {selectedPlads && (
      <div className="bg-white dark:bg-slate-800 border-b border-border shadow-sm py-4" data-testid="stats-bar">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap gap-3 items-center justify-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-lg font-bold text-emerald-600">{filteredCompleted.length}</span>
                <span className="text-sm text-emerald-600">færdig</span>
              </div>
              <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-950/30 px-4 py-2 rounded-lg">
                <Truck className="w-5 h-5 text-yellow-600" />
                <span className="text-lg font-bold text-yellow-600">{filteredOnWay.length}</span>
                <span className="text-sm text-yellow-600">på vej</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-lg">
                <Clock className="w-5 h-5 text-slate-500" />
                <span className="text-lg font-bold">{filteredWaiting.length}</span>
                <span className="text-sm text-muted-foreground">venter</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-lg">
                <Weight className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-bold text-blue-600">{filteredWeight}</span>
                <span className="text-sm text-blue-600">kg</span>
              </div>
            </div>
            <div className="text-center md:text-right">
              <span className="text-2xl font-black text-red-600">{filteredCompleted.length}</span>
              <span className="text-lg text-muted-foreground font-medium"> / {filteredActive.length}</span>
              <div className="text-xs text-muted-foreground">{selectedPlads}</div>
            </div>
          </div>
        </div>
      </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Driver Info & Time */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" /> {driverName}
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Vehicle - dropdown with all plates */}
              <div className="relative">
                <label className="block text-sm font-medium text-muted-foreground mb-1">Vogn nr.</label>
                <button onClick={(e) => { e.stopPropagation(); setShowPlateDropdown(!showPlateDropdown); setShowPladsDropdown(false); }}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-center bg-white dark:bg-slate-900 flex items-center justify-between hover:border-red-400"
                  data-testid="vehicle-reg-input">
                  <Car className="w-4 h-4 text-slate-400" />
                  <span className={vehicleReg ? "font-medium" : "text-muted-foreground"}>{vehicleReg || "Vælg..."}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                {showPlateDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {drivers.map(d => d.plate).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map(plate => (
                      <button key={plate} onClick={() => { handleChangePlate(plate); setShowPlateDropdown(false); }}
                        className={`w-full px-4 py-2.5 text-left font-mono hover:bg-red-50 dark:hover:bg-slate-700 border-b border-slate-100 last:border-0 ${vehicleReg === plate ? "bg-red-50 text-red-600 font-bold" : ""}`}>
                        {plate}
                      </button>
                    ))}
                    <div className="p-2 border-t">
                      <input type="text" value={vehicleReg}
                        onChange={(e) => handleChangePlate(e.target.value.toUpperCase())}
                        placeholder="Skriv manuelt..."
                        className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                        onClick={(e) => e.stopPropagation()} />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Start time - click to record */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Start</label>
                <button onClick={() => { if (!startTime || startTime === "07:00") setStartTime(getCurrentTime()); }}
                  className={`w-full px-3 py-2 border rounded-lg font-mono text-center transition-all ${
                    startTime && startTime !== "07:00"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold"
                      : "bg-white hover:bg-red-50 hover:border-red-300"
                  }`}
                  data-testid="start-time-btn">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {startTime || "Klik for start"}
                </button>
              </div>

              {/* End time - click to record */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Slut</label>
                <button onClick={() => { if (!endTime) setEndTime(getCurrentTime()); }}
                  className={`w-full px-3 py-2 border rounded-lg font-mono text-center transition-all ${
                    endTime
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold"
                      : "bg-white hover:bg-red-50 hover:border-red-300"
                  }`}
                  data-testid="end-time-btn">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {endTime || "Klik for slut"}
                </button>
              </div>
              
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Dato</label>
                <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono" />
              </div>
            </div>
          </div>
        </section>

        {/* Plads Selection - Dropdown */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-border shadow-sm">
          <div className="p-4">
            <div className="relative">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                <MapPin className="w-4 h-4 inline mr-1 text-red-600" /> Vælg Plads / Område
              </label>
              <button onClick={(e) => { e.stopPropagation(); setShowPladsDropdown(!showPladsDropdown); setShowPlateDropdown(false); }}
                className={`w-full px-4 py-3 border-2 rounded-xl text-left flex items-center justify-between transition-all ${
                  selectedPlads 
                    ? "border-red-500 bg-red-50 dark:bg-red-950/20" 
                    : "border-slate-200 hover:border-red-400"
                }`}
                data-testid="plads-dropdown-btn">
                <div className="flex items-center gap-2">
                  <MapPin className={`w-5 h-5 ${selectedPlads ? "text-red-600" : "text-slate-400"}`} />
                  <span className={`text-lg ${selectedPlads ? "font-bold text-red-700" : "text-muted-foreground"}`}>
                    {selectedPlads || "Vælg genbrugsplads..."}
                  </span>
                  {selectedPlads && (
                    <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full font-bold">
                      {getPladsTourCount(selectedPlads)} ture
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${showPladsDropdown ? "rotate-180" : ""}`} />
              </button>
              {showPladsDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-red-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                  {pladsOptions.map(plads => {
                    const count = getPladsTourCount(plads);
                    return (
                      <button key={plads} onClick={() => { setSelectedPlads(plads); setShowPladsDropdown(false); }}
                        className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-red-50 dark:hover:bg-slate-700 border-b border-slate-100 last:border-0 transition-colors ${
                          selectedPlads === plads ? "bg-red-50 dark:bg-red-950/30" : ""
                        }`}
                        data-testid={`plads-option-${plads.toLowerCase()}`}>
                        <div className="flex items-center gap-2">
                          <MapPin className={`w-4 h-4 ${selectedPlads === plads ? "text-red-600" : "text-slate-400"}`} />
                          <span className={`font-medium ${selectedPlads === plads ? "text-red-700 font-bold" : ""}`}>{plads}</span>
                        </div>
                        {count > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            selectedPlads === plads ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"
                          }`}>{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Actions Bar - Pause + Clear */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-border shadow-sm">
          <div className="p-4 flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <span className="px-2 text-sm text-muted-foreground">Pause:</span>
              <button onClick={() => handleAddPause(15)}
                className="px-3 py-2 bg-white dark:bg-slate-600 rounded-md font-medium hover:bg-slate-200 dark:hover:bg-slate-500 text-sm">
                15 min
              </button>
              <button onClick={() => handleAddPause(30)}
                className="px-3 py-2 bg-white dark:bg-slate-600 rounded-md font-medium hover:bg-slate-200 dark:hover:bg-slate-500 text-sm">
                30 min
              </button>
              <button onClick={() => handleAddPause(45)}
                className="px-3 py-2 bg-white dark:bg-slate-600 rounded-md font-medium hover:bg-slate-200 dark:hover:bg-slate-500 text-sm">
                45 min
              </button>
            </div>
            <button onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500">
              <Trash2 className="w-5 h-5" /> Slet alt {selectedPlads ? `i ${selectedPlads}` : ""}
            </button>
          </div>
        </section>

        {/* Manual Tour */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-600" /> Tilføj tur manuelt
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input type="text" value={manualFraction} onChange={(e) => setManualFraction(e.target.value)}
                placeholder="Fraktion" className="px-3 py-2 border rounded-lg" />
              <input type="text" value={manualFacility} onChange={(e) => setManualFacility(e.target.value)}
                placeholder="Modtageanlæg" className="px-3 py-2 border rounded-lg" />
              <input type="text" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Adresse" className="px-3 py-2 border rounded-lg" />
              <input type="text" value={manualContainer} onChange={(e) => setManualContainer(e.target.value)}
                placeholder="Container" className="px-3 py-2 border rounded-lg font-mono" />
              <label className="flex items-center gap-2 px-3 py-2">
                <input type="checkbox" checked={isSameDay} onChange={(e) => setIsSameDay(e.target.checked)}
                  className="w-4 h-4 rounded" />
                <span className="text-sm">Samme dag</span>
              </label>
            </div>
            <button onClick={handleAddManualTour}
              className="mt-4 flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">
              <Plus className="w-4 h-4" /> Tilføj tur
            </button>
          </div>
        </section>

        {/* Tours Table */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" /> 
              {selectedPlads ? `Ture - ${selectedPlads}` : "Dagens ture"}
            </h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">{filteredCompleted.length} færdig</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-bold">{filteredActive.length} total</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                  <th className="p-3 text-left font-semibold">FRAKTION</th>
                  <th className="p-3 text-left font-semibold">MODTAGEANLÆG</th>
                  <th className="p-3 text-left font-semibold">ADRESSE</th>
                  <th className="p-3 text-left font-semibold">CONT.</th>
                  <th className="p-3 text-left font-semibold">ÅBEN</th>
                  <th className="p-3 text-left font-semibold">VÆGT</th>
                  <th className="p-3 text-left font-semibold">TID</th>
                  <th className="p-3 text-left font-semibold">HANDLINGER</th>
                </tr>
              </thead>
              <tbody>
                {sortedTours.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-10 text-center text-muted-foreground">
                      <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Ingen ture {selectedPlads && `i ${selectedPlads}`}
                    </td>
                  </tr>
                ) : (
                  sortedTours.map((tour, index) => {
                    // Check if this tour shares address with others (for grouping)
                    const addressCount = sortedTours.filter(t => 
                      !t.is_pause && t.address && t.address === tour.address
                    ).length;
                    const isInGroup = addressCount > 1 && !tour.is_pause && tour.address;
                    
                    // Find group boundaries
                    const prevTour = index > 0 ? sortedTours[index - 1] : null;
                    const nextTour = index < sortedTours.length - 1 ? sortedTours[index + 1] : null;
                    const isGroupStart = isInGroup && (!prevTour || prevTour.address !== tour.address);
                    const isGroupEnd = isInGroup && (!nextTour || nextTour.address !== tour.address);
                    
                    return (
                      <TourRow 
                        key={tour.id} 
                        tour={tour} 
                        onUpdate={handleUpdateTour}
                        onDelete={handleDeleteTour} 
                        onToggleOnWay={handleToggleOnWay}
                        onToggleComplete={handleToggleComplete} 
                        driverName={driverName}
                        isInGroup={isInGroup}
                        isGroupStart={isGroupStart}
                        isGroupEnd={isGroupEnd}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-border shadow-sm">
          <div className="p-4 border-b border-border">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" /> Bemærkninger
            </h2>
          </div>
          <div className="p-4">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder="Skriv noter her..." maxLength={500}
              className="w-full h-24 px-4 py-3 border rounded-lg resize-none" />
            <div className="mt-2 text-right text-xs text-muted-foreground">{notes.length}/500</div>
          </div>
        </section>
      </main>

      {/* PDF Footer */}
      <footer className="sticky bottom-0 bg-white dark:bg-slate-800 border-t p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-center">
          <button onClick={handleGeneratePDF}
            className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg">
            <Download className="w-5 h-5" /> Generer PDF
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
