"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Utensils, Navigation, Plus, ExternalLink, SlidersHorizontal, ArrowLeft, Compass } from "lucide-react";

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tutte");
  const [selectedStatus, setSelectedStatus] = useState("tutti");
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [maxDistance, setMaxDistance] = useState(50); // Slider: default 50km, max 300km
  const [showModal, setShowModal] = useState(false);
  const [isUnlimitedView, setIsUnlimitedView] = useState(false); // Toggle per la pagina Bordeaux & Panna

  // Form nuovo locale
  const [formData, setFormData] = useState({
    name: "",
    category: "Pizzeria",
    city: "",
    price_range: "€€",
    status: "da_provare",
    notes: ""
  });

  // Calcolo distanza (formula Haversine)
  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  }

  // Carica locali dal database
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

  // Geolocalizzazione utente
  function handleGetLocation() {
    if (!navigator.geolocation) {
      alert("Geolocalizzazione non supportata");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocating(false);
      },
      () => {
        alert("Permesso posizione negato o non disponibile");
        setLocating(false);
      }
    );
  }

  // Salva nuovo locale
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
    } catch (err) {
      console.log("Coordinate non trovate.");
    }

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
    } else {
      alert("Errore durante il salvataggio");
    }
  }

  const categories = ["Tutte", ...new Set(restaurants.map((r) => r.category))];

  // Filtri standard
  let filtered = restaurants.filter((r) => {
    const matchCategory = selectedCategory === "Tutte" || r.category === selectedCategory;
    const matchStatus = selectedStatus === "tutti" || r.status === selectedStatus;
    return matchCategory && matchStatus;
  });

  // Filtro distanza (solo se siamo nella vista normale con limiti)
  if (userLocation && !isUnlimitedView) {
    filtered = filtered
      .filter((r) => {
        if (!r.latitude || !r.longitude) return true;
        const dist = parseFloat(getDistance(userLocation.lat, userLocation.lng, r.latitude, r.longitude));
        return dist <= maxDistance;
      })
      .sort((a, b) => {
        const distA = parseFloat(getDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude) || 99999);
        const distB = parseFloat(getDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude) || 99999);
        return distA - distB;
      });
  }

  // ==========================================
  // VISTA 2: PAGINA "PANNA SPORCA & BORDEAUX" (SENZA LIMITI)
  // ==========================================
  if (isUnlimitedView) {
    return (
      <div className="min-h-screen bg-[#F4EFEA] text-[#581825] p-4 md:p-8 font-serif selection:bg-[#581825] selection:text-[#F4EFEA]">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header Vintage Bordeaux */}
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-[#581825]/20 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-[#8B263E]">
                <Compass className="h-4 w-4" /> Modalità Ovunque nel Mondo
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight mt-1 text-[#581825]">
                CIBOZZO • SENZA LIMITI
              </h1>
              <p className="text-sm text-[#7D3C4D] mt-1 font-sans">
                Tutti i locali salvati, senza barriere chilometriche.
              </p>
            </div>

            <button
              onClick={() => setIsUnlimitedView(false)}
              className="flex items-center gap-2 bg-[#581825] text-[#F4EFEA] hover:bg-[#722334] px-5 py-2.5 rounded-xl text-sm font-sans font-semibold transition shadow-md"
            >
              <ArrowLeft className="h-4 w-4" /> Torna al Radar
            </button>
          </header>

          {/* Griglia Locali Bordeaux & Panna */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
            {filtered.map((r) => {
              const distance =
                userLocation && r.latitude && r.longitude
                  ? getDistance(userLocation.lat, userLocation.lng, r.latitude, r.longitude)
                  : null;

              return (
                <div
                  key={r.id}
                  className="bg-[#FCFAF8] border-2 border-[#E7DFD5] hover:border-[#581825]/40 p-6 rounded-2xl flex flex-col justify-between gap-4 transition shadow-sm"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-serif font-bold text-xl text-[#581825]">{r.name}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#581825]/10 text-[#581825] border border-[#581825]/20">
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
                    {distance ? (
                      <span className="font-mono font-bold text-[#8B263E]">📍 {distance} km da te</span>
                    ) : (
                      <span className="text-[#A56B77]">Distanza sconosciuta</span>
                    )}

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + " " + r.city)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#581825] font-bold hover:underline"
                    >
                      Apri Mappe <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
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

        {/* BARRA SCORREVOLE + TASTO OTTAGONALE SENZA LIMITI */}
        <section className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Label "Range" con numero che diventa viola oltre i 200km */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`p-2 rounded-lg transition-colors ${maxDistance > 200 ? "bg-purple-900/30 text-purple-300" : "bg-amber-400/10 text-amber-400"}`}>
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Range</div>
              <div className={`text-base font-bold font-mono transition-colors ${maxDistance > 200 ? "text-purple-400" : "text-amber-400"}`}>
                Entro {maxDistance} km {maxDistance > 200 && <span className="text-[11px] font-sans text-purple-300 font-normal ml-1">🟣 Viaggio Lungo</span>}
              </div>
            </div>
          </div>

          {/* Barra senza scritte ai lati che diventa viola scuro oltre i 200km */}
          <div className="w-full md:flex-1 flex items-center px-2">
            <input
              type="range"
              min="1"
              max="300"
              step="1"
              value={maxDistance}
              onChange={(e) => {
                setMaxDistance(Number(e.target.value));
                if (!userLocation && !locating) handleGetLocation();
              }}
              className={`w-full h-2.5 rounded-lg cursor-pointer transition-all ${
                maxDistance > 200
                  ? "accent-purple-700 bg-purple-950/60"
                  : "accent-amber-400 bg-slate-800"
              }`}
            />
          </div>

          {/* Tasto Ottagonale "SENZA LIMITI" con evidenziazione gialla amber-400 */}
          <button
            onClick={() => setIsUnlimitedView(true)}
            title="Apri vista senza limiti di distanza"
            className="w-full md:w-auto px-4 py-2 text-xs font-black tracking-wider uppercase transition-all duration-200 
                       bg-slate-800/90 text-slate-300 border border-slate-700 
                       hover:bg-amber-400 hover:text-slate-950 hover:border-amber-300 hover:shadow-[0_0_15px_rgba(251,191,36,0.4)]
                       [clip-path:polygon(30%_0%,70%_0%,100%_30%,100%_70%,70%_100%,30%_100%,0%_70%,0%_30%)]"
          >
            Senza Limiti
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
            {filtered.map((r) => {
              const distance =
                userLocation && r.latitude && r.longitude
                  ? getDistance(userLocation.lat, userLocation.lng, r.latitude, r.longitude)
                  : null;

              return (
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
                    {distance ? (
                      <span className="text-emerald-400 font-mono font-bold">📍 {distance} km da te</span>
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
              );
            })}
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