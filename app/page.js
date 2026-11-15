"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Utensils, Navigation, Plus, ExternalLink, SlidersHorizontal, ArrowLeft, Compass, Car } from "lucide-react";

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tutte");
  const [selectedStatus, setSelectedStatus] = useState("tutti");
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [maxDistance, setMaxDistance] = useState(50);
  const [showModal, setShowModal] = useState(false);
  const [isUnlimitedView, setIsUnlimitedView] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "Pizzeria",
    city: "",
    price_range: "€€",
    status: "da_provare",
    notes: ""
  });

  // Formula Haversine ottimizzata
  function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }

  async function fetchRestaurants() {
    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setRestaurants(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchRestaurants();
  }, []);

  function handleGetLocation() {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setLocating(false);
      },
      () => setLocating(false)
    );
  }

  async function handleAddRestaurant(e) {
    e.preventDefault();
    if (!formData.name || !formData.city) return;

    let latitude = null;
    let longitude = null;

    try {
      const query = encodeURIComponent(`${formData.name}, ${formData.city}`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
      const geo = await res.json();
      if (geo && geo.length > 0) {
        latitude = parseFloat(geo[0].lat);
        longitude = parseFloat(geo[0].lon);
      }
    } catch (err) {}

    const { error } = await supabase.from("restaurants").insert([
      { ...formData, latitude, longitude }
    ]);

    if (!error) {
      setFormData({
        name: "",
        category: "Pizzeria",
        city: "",
        price_range: "€€",
        status: "da_provare",
        notes: ""
      });
      setShowModal(false);
      fetchRestaurants();
    }
  }

  // PRE-CALCOLO DISTANZE (rende la barra super fluida)
  const restaurantsWithDist = useMemo(() => {
    return restaurants.map((r) => ({
      ...r,
      distKm: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, r.latitude, r.longitude) : null
    }));
  }, [restaurants, userLocation]);

  const categories = useMemo(() => ["Tutte", ...new Set(restaurants.map((r) => r.category))], [restaurants]);

  // FILTRAGGIO ULTRA-RAPIDO
  const filtered = useMemo(() => {
    return restaurantsWithDist
      .filter((r) => {
        const matchCategory = selectedCategory === "Tutte" || r.category === selectedCategory;
        const matchStatus = selectedStatus === "tutti" || r.status === selectedStatus;
        if (!matchCategory || !matchStatus) return false;

        if (userLocation && !isUnlimitedView) {
          if (r.distKm === null) return true;
          return r.distKm <= maxDistance;
        }
        return true;
      })
      .sort((a, b) => {
        if (!userLocation || isUnlimitedView) return 0;
        return (a.distKm ?? 99999) - (b.distKm ?? 99999);
      });
  }, [restaurantsWithDist, selectedCategory, selectedStatus, userLocation, maxDistance, isUnlimitedView]);

  // ==========================================
  // VISTA 2: BORDEAUX & PANNA SPORCA (SENZA LIMITI)
  // ==========================================
  if (isUnlimitedView) {
    return (
      <div className="min-h-screen bg-[#F4EFEA] text-[#581825] p-4 md:p-8 font-serif selection:bg-[#581825] selection:text-[#F4EFEA]">
        {/* Animazione CSS per la macchinina */}
        <style>{`
          @keyframes driveCar {
            0% { transform: translateX(-15px); opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 1; }
            100% { transform: translateX(110px); opacity: 0; }
          }
          .animate-car-loop {
            animation: driveCar 3s ease-in-out infinite;
          }
        `}</style>

        <div className="max-w-4xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-[#581825]/20 pb-6">
            <div>
              {/* Bussola + Macchinina che viaggia in loop sulla stradina */}
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-[#581825] shrink-0" />
                
                <div className="relative w-28 h-5 flex items-center overflow-hidden">
                  <div className="w-full h-[1.5px] bg-[#581825]/30 rounded-full"></div>
                  <div className="absolute animate-car-loop text-[#581825]">
                    <Car className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-[#581825]">
                CIBOZZO • SENZA LIMITI
              </h1>
              <p className="text-xs text-[#7D3C4D] mt-1 font-sans">
                Tutti i locali salvati, senza barriere di chilometri.
              </p>
            </div>

            <button
              onClick={() => setIsUnlimitedView(false)}
              className="flex items-center gap-2 bg-[#581825] text-[#F4EFEA] hover:bg-[#722334] px-4 py-2 rounded-xl text-xs font-sans font-bold transition shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Torna al Radar
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="bg-[#FCFAF8] border-2 border-[#E7DFD5] hover:border-[#581825]/30 p-5 rounded-2xl flex flex-col justify-between gap-4 transition"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-serif font-bold text-lg text-[#581825]">{r.name}</h3>
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#581825]/10 text-[#581825] border border-[#581825]/20">
                      {r.status === "provato" ? "Provato" : "Da Provare"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#8B263E] mt-1 font-medium">
                    <span>{r.category}</span>
                    <span>•</span>
                    <span className="font-bold">{r.price_range}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {r.city}
                    </span>
                  </div>

                  {r.notes && (
                    <p className="text-xs text-[#6B2F3D] bg-[#F4EFEA] p-3 rounded-xl border border-[#E7DFD5] mt-3 italic font-serif">
                      "{r.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E7DFD5] text-xs">
                  {r.distKm !== null ? (
                    <span className="font-mono font-bold text-[#8B263E]">📍 {r.distKm} km da te</span>
                  ) : (
                    <span className="text-[#A56B77]">Distanza sconosciuta</span>
                  )}

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + " " + r.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[#581825] font-bold hover:underline"
                  >
                    Mappe <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 1: VERSIONE SCURA DI DEFAULT
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2 text-amber-400">
              <Utensils className="h-8 w-8" /> CIBOZZO
            </h1>
            <p className="text-sm text-slate-400 mt-1">La tua lista dei desideri gastronomica</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGetLocation}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                userLocation
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
            >
              <Navigation className="h-4 w-4" />
              {locating ? "Localizzo..." : userLocation ? "Posizione Attiva" : "Attiva Posizione"}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition shadow-lg shadow-amber-500/20"
            >
              <Plus className="h-4 w-4" /> Aggiungi Locale
            </button>
          </div>
        </header>

        {/* BARRA SCORREVOLE + TASTO QUADRATO "SENZA LIMITI" */}
        <section className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`p-2 rounded-lg ${maxDistance > 200 ? "bg-purple-950 text-purple-300 border border-purple-800/40" : "bg-amber-400/10 text-amber-400"}`}>
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Range</div>
              <div className={`text-sm font-bold font-mono ${maxDistance > 200 ? "text-purple-300" : "text-amber-400"}`}>
                Entro {maxDistance} km {maxDistance > 200 && <span className="text-[10px] text-purple-400 font-sans ml-1">🟣 Viaggio Lungo</span>}
              </div>
            </div>
          </div>

          {/* Slider fluido fino a 300km (senza lag) */}
          <div className="w-full md:flex-1 flex items-center px-2">
            <input
              type="range"
              min="1"
              max="300"
              step="1"
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className={`w-full h-2 rounded-lg cursor-pointer appearance-none ${
                maxDistance > 200 ? "accent-purple-700 bg-purple-950/70" : "accent-amber-400 bg-slate-800"
              }`}
            />
          </div>

          {/* Tasto quadrato minimale da designer con testo affiancato */}
          <button
            onClick={() => setIsUnlimitedView(true)}
            className="group flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-400/40 px-3 py-1.5 rounded-xl transition cursor-pointer"
            title="Mostra tutti i locali senza limiti"
          >
            <div className="w-3.5 h-3.5 rounded-[3px] border border-slate-600 group-hover:border-amber-400 group-hover:bg-amber-400 transition" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-400 transition">
              Senza Limiti
            </span>
          </button>
        </section>

        {/* Filtri Categoria e Stato */}
        <section className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? "bg-amber-400 text-slate-950 shadow-md"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {[
              { id: "tutti", label: "Tutti" },
              { id: "da_provare", label: "🟡 Da Provare" },
              { id: "provato", label: "🟢 Provati" }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`text-xs px-3 py-1 rounded-md transition ${
                  selectedStatus === st.id ? "bg-slate-800 text-white font-bold" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </section>

        {/* Lista Locali */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">Caricamento locali...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
            Nessun locale trovato nel raggio di {maxDistance} km o con questi filtri.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between gap-4 transition shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-lg text-white">{r.name}</h3>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        r.status === "provato"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                          : "bg-amber-950 text-amber-400 border border-amber-800/50"
                      }`}
                    >
                      {r.status === "provato" ? "Provato" : "Da Provare"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="font-medium text-slate-300">{r.category}</span>
                    <span>•</span>
                    <span className="text-amber-300 font-mono font-semibold">{r.price_range}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-500" /> {r.city}
                    </span>
                  </div>

                  {r.notes && (
                    <p className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50 mt-3 italic">
                      "{r.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  {r.distKm !== null ? (
                    <span className="text-emerald-400 font-mono font-bold">📍 {r.distKm} km da te</span>
                  ) : (
                    <span className="text-slate-600">Distanza non calcolata</span>
                  )}

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + " " + r.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-amber-400 hover:underline"
                  >
                    Mappe <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Aggiungi Locale */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
              <h2 className="text-xl font-bold text-white">Aggiungi nuovo locale</h2>
              <form onSubmit={handleAddRestaurant} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400">Nome Locale</label>
                  <input
                    type="text"
                    required
                    placeholder="es. Da Ciro"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400">Categoria</label>
                    <input
                      type="text"
                      required
                      placeholder="es. Pizzeria, Sushi"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Città</label>
                    <input
                      type="text"
                      required
                      placeholder="es. Napoli"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400">Prezzo</label>
                    <select
                      value={formData.price_range}
                      onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1"
                    >
                      <option value="€">€ (Economico)</option>
                      <option value="€€">€€ (Medio)</option>
                      <option value="€€€">€€€ (Costoso)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Stato</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1"
                    >
                      <option value="da_provare">Da Provare</option>
                      <option value="provato">Già Provato</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400">Note o piatto consigliato</label>
                  <textarea
                    rows={2}
                    placeholder="es. Prendi il calzone ripieno!"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm"
                  >
                    Salva Locale
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}