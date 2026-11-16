"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  MapPin, Utensils, Navigation, Plus, ExternalLink, 
  SlidersHorizontal, ArrowLeft, Compass, Car, CheckCircle, 
  MoreVertical, Trash2, Globe, Star, MessageSquarePlus, 
  MessageSquareQuote, Dices, Send, Sparkles, UserCheck
} from "lucide-react";

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tutte");
  const [selectedStatus, setSelectedStatus] = useState("tutti");
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [maxDistance, setMaxDistance] = useState(300);
  const [showModal, setShowModal] = useState(false);
  const [isUnlimitedView, setIsUnlimitedView] = useState(false);
  const [successToast, setSuccessToast] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Roulette
  const [rouletteWinner, setRouletteWinner] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Popup Nuvoletta Recensione
  const [reviewModalData, setReviewModalData] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewNotes, setReviewNotes] = useState("");
  const [hoverRating, setHoverRating] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    category: "Ristorante",
    city: "",
    address: "",
    price_range: "€€",
    status: "da_provare",
    notes: "",
    recommended_by: "",
    occasion: "🍔 Sfondamento tra amici"
  });

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
      () => {
        alert("Impossibile rilevare la posizione o permesso negato.");
        setLocating(false);
      },
      { timeout: 10000 }
    );
  }

  async function handleDeleteRestaurant(id, name) {
    if (!confirm(`Sei sicuro di voler eliminare "${name}"?`)) return;

    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (!error) {
      setActiveMenuId(null);
      setSuccessToast(`"${name}" eliminato! 🗑️`);
      setTimeout(() => setSuccessToast(""), 3500);
      fetchRestaurants();
    } else {
      alert("Errore eliminazione: " + error.message);
    }
  }

  function openReviewModal(r) {
    setReviewModalData(r);
    setReviewRating(r.rating || 0);
    setReviewNotes(r.notes || "");
  }

  async function handleSaveReview(e) {
    e.preventDefault();
    if (!reviewModalData) return;

    const { error } = await supabase
      .from("restaurants")
      .update({
        rating: reviewRating > 0 ? reviewRating : null,
        notes: reviewNotes,
        status: "provato"
      })
      .eq("id", reviewModalData.id);

    if (!error) {
      setSuccessToast(`Pensieri su "${reviewModalData.name}" salvati! ⭐`);
      setTimeout(() => setSuccessToast(""), 3500);
      setReviewModalData(null);
      fetchRestaurants();
    } else {
      alert("Errore salvataggio recensione: " + error.message);
    }
  }

  async function handleAddRestaurant(e) {
    e.preventDefault();
    if (!formData.name || !formData.city || !formData.address) {
      alert("Compila nome, città e indirizzo completo!");
      return;
    }

    setLoading(true);
    let latitude = null;
    let longitude = null;

    try {
      const fullQuery = encodeURIComponent(`${formData.address}, ${formData.city}`);
      let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${fullQuery}`);
      let data = await res.json();

      if (data && data.length > 0) {
        latitude = parseFloat(data[0].lat);
        longitude = parseFloat(data[0].lon);
      } else {
        const cityClean = encodeURIComponent(formData.city.trim());
        const fallbackRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${cityClean}&count=1&language=it&format=json`
        );
        const fallbackData = await fallbackRes.json();
        if (fallbackData?.results?.length > 0) {
          latitude = fallbackData.results[0].latitude;
          longitude = fallbackData.results[0].longitude;
        }
      }
    } catch (err) {}

    const { error } = await supabase.from("restaurants").insert([
      { ...formData, latitude, longitude }
    ]);

    setLoading(false);

    if (error) {
      alert("Errore Supabase: " + error.message);
    } else {
      setFormData({
        name: "",
        category: "Ristorante",
        city: "",
        address: "",
        price_range: "€€",
        status: "da_provare",
        notes: "",
        recommended_by: "",
        occasion: "🍔 Sfondamento tra amici"
      });
      setShowModal(false);
      setSuccessToast("Locale salvato con precisione! 📍");
      setTimeout(() => setSuccessToast(""), 3500);
      fetchRestaurants();
    }
  }

  // Gira la Roulette
  function spinRoulette() {
    if (filtered.length === 0) {
      alert("Nessun locale disponibile con i filtri attuali!");
      return;
    }
    setIsSpinning(true);
    setTimeout(() => {
      const random = filtered[Math.floor(Math.random() * filtered.length)];
      setRouletteWinner(random);
      setIsSpinning(false);
    }, 800);
  }

  // Prepara link messaggio WhatsApp
  function getWhatsAppUrl(r) {
    const distText = r.distKm ? `📍 A ${r.distKm} km da noi\n` : "";
    const starsText = r.rating ? `⭐ Voto: ${r.rating}/5\n` : "";
    const recText = r.recommended_by ? `👤 Consigliato da: ${r.recommended_by}\n` : "";
    const occasionText = r.occasion ? `🏷️ Serata: ${r.occasion}\n` : "";
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      (r.address ? r.address + " " : "") + r.name + " " + r.city
    )}`;

    const text = 
`🍕 *Ragazzi, stasera vi andrebbe questo?*

🍴 *${r.name}* (${r.category} - ${r.price_range})
🏙️ ${r.city}${r.address ? `, ${r.address}` : ""}
${distText}${starsText}${occasionText}${recText}${r.notes ? `💬 Note: "${r.notes}"\n` : ""}
🗺️ *Mappe:* ${mapsUrl}`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  const restaurantsWithDist = useMemo(() => {
    return restaurants.map((r) => ({
      ...r,
      distKm: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, r.latitude, r.longitude) : null
    }));
  }, [restaurants, userLocation]);

  const categories = useMemo(() => ["Tutte", ...new Set(restaurants.map((r) => r.category.trim()))], [restaurants]);

  const filtered = useMemo(() => {
    return restaurantsWithDist
      .filter((r) => {
        const matchCategory =
          selectedCategory === "Tutte" ||
          r.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase();

        const matchStatus = selectedStatus === "tutti" || r.status === selectedStatus;

        if (!matchCategory || !matchStatus) return false;

        if (isUnlimitedView) {
          if (!userLocation) return true;
          return r.distKm !== null && r.distKm > 300;
        }

        if (userLocation) {
          if (r.distKm === null) return true;
          return r.distKm <= maxDistance;
        }

        return true;
      })
      .sort((a, b) => {
        if (!userLocation) return 0;
        const distA = a.distKm ?? 99999;
        const distB = b.distKm ?? 99999;
        return distA - distB;
      });
  }, [restaurantsWithDist, selectedCategory, selectedStatus, userLocation, maxDistance, isUnlimitedView]);

  const over300KmCount = useMemo(() => {
    if (!userLocation) return 0;
    return restaurantsWithDist.filter((r) => r.distKm !== null && r.distKm > 300).length;
  }, [restaurantsWithDist, userLocation]);

  const hiddenDueToSlider = useMemo(() => {
    if (!userLocation || isUnlimitedView) return 0;
    return restaurantsWithDist.filter((r) => r.distKm !== null && r.distKm > maxDistance && r.distKm <= 300).length;
  }, [restaurantsWithDist, userLocation, maxDistance, isUnlimitedView]);

  // ==========================================
  // VISTA 2: BORDEAUX & PANNA SPORCA (> 300 KM)
  // ==========================================
  if (isUnlimitedView) {
    return (
      <div 
        className="min-h-screen bg-[#F4EFEA] text-[#581825] p-4 md:p-8 font-serif selection:bg-[#581825] selection:text-[#F4EFEA]"
        onClick={() => setActiveMenuId(null)}
      >
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

        <div className="max-w-4xl mx-auto space-y-6">
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-[#581825]/20 pb-6">
            <div>
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
                CIBOZZO • GRANDI VIAGGI
              </h1>
              <p className="text-xs text-[#7D3C4D] mt-1 font-sans">
                I locali a più di 300 km da te per i grandi viaggi con gli amici.
              </p>
            </div>

            <button
              onClick={() => setIsUnlimitedView(false)}
              className="flex items-center gap-2 bg-[#581825] text-[#F4EFEA] hover:bg-[#722334] px-4 py-2.5 rounded-xl text-xs font-sans font-bold transition shadow-sm cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Torna al Radar (Entro 300km)
            </button>
          </header>

          {!userLocation && (
            <div className="bg-[#E7DFD5] p-3 rounded-xl text-xs font-sans text-[#581825] flex items-center justify-between">
              <span>📍 Attiva la posizione per calcolare quali locali sono a oltre 300 km.</span>
              <button 
                onClick={handleGetLocation} 
                className="font-bold underline cursor-pointer"
              >
                {locating ? "Localizzo..." : "Attiva Ora"}
              </button>
            </div>
          )}

          <section className="flex gap-2 overflow-x-auto pb-2 scrollbar-none font-sans">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCategory(cat);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? "bg-[#581825] text-[#F4EFEA] shadow-md"
                    : "bg-[#FCFAF8] border border-[#E7DFD5] text-[#7D3C4D] hover:bg-[#E7DFD5]"
                }`}
              >
                {cat}
              </button>
            ))}
          </section>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-[#8B263E] border-2 border-dashed border-[#E7DFD5] rounded-2xl font-sans">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nessun locale trovato a più di 300 km da te per "{selectedCategory}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="relative bg-[#FCFAF8] border-2 border-[#E7DFD5] hover:border-[#581825]/30 p-5 rounded-2xl flex flex-col justify-between gap-4 transition shadow-sm"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-serif font-bold text-lg text-[#581825]">{r.name}</h3>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#581825]/10 text-[#581825] border border-[#581825]/20">
                          {r.status === "provato" ? "Provato" : "Da Provare"}
                        </span>
                        
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === r.id ? null : r.id);
                            }}
                            className="p-1 rounded-lg hover:bg-[#E7DFD5] text-[#581825] transition cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          
                          {activeMenuId === r.id && (
                            <div className="absolute right-0 top-7 z-20 bg-white border border-[#E7DFD5] shadow-lg rounded-xl p-1 w-32">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRestaurant(r.id, r.name);
                                }}
                                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Elimina
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Prezzo + NUVOLETTA + Stellozze */}
                    <div className="flex items-center gap-2 text-xs text-[#8B263E] mt-1.5 font-medium flex-wrap">
                      <span>{r.category}</span>
                      <span>•</span>
                      <span className="font-bold">{r.price_range}</span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openReviewModal(r);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#581825]/10 hover:bg-[#581825] text-[#581825] hover:text-[#F4EFEA] text-[11px] font-bold transition cursor-pointer"
                      >
                        <MessageSquarePlus className="h-3 w-3" />
                        <span>I miei pensieri</span>
                      </button>

                      {r.rating && (
                        <div className="flex items-center gap-0.5 text-amber-500 font-bold text-xs ml-1">
                          {[...Array(r.rating)].map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-amber-500" />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CHI L'HA CONSIGLIATO CON IL ROAST "PROSSIMA VOLTA EVITA" */}
                    {r.recommended_by && (
                      <div className="mt-2.5">
                        {r.rating && r.rating <= 2 ? (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            💀 Consigliato da {r.recommended_by} - Prossima volta evita!
                          </span>
                        ) : r.rating && r.rating >= 4 ? (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            👑 Consigliato da {r.recommended_by} - Colpo da maestro!
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#7D3C4D] bg-[#E7DFD5]/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            🕵️ Scovato da {r.recommended_by}
                          </span>
                        )}
                      </div>
                    )}

                    {r.occasion && (
                      <div className="mt-1 text-[11px] font-medium text-[#7D3C4D]">
                        {r.occasion}
                      </div>
                    )}

                    <div className="text-xs text-[#7D3C4D] mt-2 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-[#581825] shrink-0" />
                      <span>{r.address ? `${r.address}, ${r.city}` : r.city}</span>
                    </div>

                    {r.notes && (
                      <p className="text-xs text-[#6B2F3D] bg-[#F4EFEA] p-3 rounded-xl border border-[#E7DFD5] mt-3 italic font-serif flex items-start gap-1.5">
                        <MessageSquareQuote className="h-3.5 w-3.5 text-[#581825] shrink-0 mt-0.5" />
                        <span>"{r.notes}"</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#E7DFD5] text-xs gap-2">
                    {r.distKm !== null ? (
                      <span className="font-mono font-bold text-[#8B263E] bg-[#581825]/10 px-2 py-0.5 rounded-md">
                        ✈️ {r.distKm} km
                      </span>
                    ) : (
                      <span className="text-[#A56B77]">Distanza da definire</span>
                    )}

                    <div className="flex items-center gap-2">
                      <a
                        href={getWhatsAppUrl(r)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] transition"
                        title="Proponi questo locale sul gruppo WhatsApp"
                      >
                        <Send className="h-3 w-3" /> WhatsApp
                      </a>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          (r.address ? r.address + " " : "") + r.name + " " + r.city
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#581825] font-bold hover:underline"
                      >
                        Mappe <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 1: VERSIONE SCURA DI DEFAULT (RADAR)
  // ==========================================
  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans"
      onClick={() => setActiveMenuId(null)}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        
        {successToast && (
          <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 animate-bounce">
            <CheckCircle className="h-5 w-5" /> {successToast}
          </div>
        )}

        {/* Header con Tasto ROULETTE */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2 text-amber-400">
              <Utensils className="h-8 w-8" /> CIBOZZO
            </h1>
            <p className="text-sm text-slate-400 mt-1">Radar gastronomico intelligente</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* TASTO ROULETTE */}
            <button
              onClick={spinRoulette}
              disabled={isSpinning}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-lg shadow-purple-600/30 cursor-pointer"
              title="Estrai un locale a caso tra quelli filtrati"
            >
              <Dices className={`h-4 w-4 ${isSpinning ? "animate-spin" : ""}`} />
              {isSpinning ? "Scelta in corso..." : "Roulette Stasera"}
            </button>

            <button
              onClick={handleGetLocation}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                userLocation
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200"
              }`}
            >
              <Navigation className="h-3.5 w-3.5" />
              {locating ? "Localizzo..." : userLocation ? "Posizione Attiva" : "Attiva Posizione"}
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Aggiungi Locale
            </button>
          </div>
        </header>

        {/* Barra Range km + Tasto Senza Limiti */}
        <section className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`p-2 rounded-lg ${maxDistance > 200 ? "bg-purple-950 text-purple-300 border border-purple-800/40" : "bg-amber-400/10 text-amber-400"}`}>
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Range Radar</div>
              <div className={`text-sm font-bold font-mono ${maxDistance > 200 ? "text-purple-300" : "text-amber-400"}`}>
                Entro {maxDistance} km {maxDistance > 200 && <span className="text-[10px] text-purple-400 font-sans ml-1">🟣 Viaggio Medio</span>}
              </div>
            </div>
          </div>

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

          <button
            onClick={() => {
              if (!userLocation && !locating) handleGetLocation();
              setSelectedCategory("Tutte");
              setSelectedStatus("tutti");
              setIsUnlimitedView(true);
            }}
            className="group flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-400/40 px-3 py-1.5 rounded-xl transition cursor-pointer"
            title="Mostra solo i locali a più di 300 km"
          >
            <div className="w-3.5 h-3.5 rounded-[3px] border border-slate-600 group-hover:border-amber-400 group-hover:bg-amber-400 transition" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-400 transition">
              Senza Limiti (&gt;300km)
            </span>
          </button>
        </section>

        {over300KmCount > 0 && (
          <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl text-xs text-amber-300 flex items-center justify-between">
            <span>✈️ Hai <strong>{over300KmCount} locale/i</strong> a più di 300 km di distanza.</span>
            <button
              onClick={() => {
                setSelectedCategory("Tutte");
                setIsUnlimitedView(true);
              }}
              className="underline font-bold hover:text-white cursor-pointer"
            >
              Vedi in Senza Limiti →
            </button>
          </div>
        )}

        {hiddenDueToSlider > 0 && (
          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-400 flex items-center justify-between">
            <span>💡 Ci sono <strong>{hiddenDueToSlider} locali</strong> tra {maxDistance} km e 300 km.</span>
            <button
              onClick={() => setMaxDistance(300)}
              className="text-amber-400 font-bold hover:underline cursor-pointer"
            >
              Imposta barra a 300 km →
            </button>
          </div>
        )}

        {/* Filtri Categoria e Stato */}
        <section className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCategory(cat);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
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
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStatus(st.id);
                }}
                className={`text-xs px-3 py-1 rounded-md transition cursor-pointer ${
                  selectedStatus === st.id ? "bg-slate-800 text-white font-bold" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </section>

        {/* Lista Locali Radar */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">Caricamento locali...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
            Nessun locale trovato nel raggio di {maxDistance} km per "{selectedCategory}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="relative bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between gap-4 transition shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-lg text-white">{r.name}</h3>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          r.status === "provato"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}
                      >
                        {r.status === "provato" ? "Provato" : "Da Provare"}
                      </span>

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === r.id ? null : r.id);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {activeMenuId === r.id && (
                          <div className="absolute right-0 top-7 z-20 bg-slate-900 border border-slate-800 shadow-xl rounded-xl p-1 w-32">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRestaurant(r.id, r.name);
                              }}
                              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg font-bold transition cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Elimina
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Prezzo + NUVOLETTA + Stellozze */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5 flex-wrap">
                    <span className="font-medium text-slate-300">{r.category}</span>
                    <span>•</span>
                    <span className="text-amber-300 font-mono font-semibold">{r.price_range}</span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openReviewModal(r);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/10 hover:bg-amber-400 hover:text-slate-950 text-amber-400 text-[11px] font-semibold border border-amber-400/20 transition cursor-pointer"
                    >
                      <MessageSquarePlus className="h-3 w-3" />
                      <span>I miei pensieri</span>
                    </button>

                    {r.rating && (
                      <div className="flex items-center gap-0.5 text-amber-400 font-bold text-xs ml-1">
                        {[...Array(r.rating)].map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CHI L'HA CONSIGLIATO CON IL ROAST "PROSSIMA VOLTA EVITA" */}
                  {r.recommended_by && (
                    <div className="mt-2.5">
                      {r.rating && r.rating <= 2 ? (
                        <span className="text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          💀 Consigliato da {r.recommended_by} - Prossima volta evita!
                        </span>
                      ) : r.rating && r.rating >= 4 ? (
                        <span className="text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          👑 Consigliato da {r.recommended_by} - Colpo da maestro!
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-800/70 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          🕵️ Scovato da {r.recommended_by}
                        </span>
                      )}
                    </div>
                  )}

                  {r.occasion && (
                    <div className="mt-1 text-[11px] text-slate-400">
                      {r.occasion}
                    </div>
                  )}

                  <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
                    <span>{r.address ? `${r.address}, ${r.city}` : r.city}</span>
                  </div>

                  {r.notes && (
                    <p className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50 mt-3 italic flex items-start gap-1.5">
                      <MessageSquareQuote className="h-3.5 w-3.5 text-amber-400/70 shrink-0 mt-0.5" />
                      <span>"{r.notes}"</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs gap-2">
                  {r.distKm !== null ? (
                    <span className="text-emerald-400 font-mono font-bold">📍 {r.distKm} km</span>
                  ) : (
                    <span className="text-slate-500 italic">Distanza in attesa</span>
                  )}

                  <div className="flex items-center gap-2">
                    {/* TASTO CONDIVIDI WHATSAPP */}
                    <a
                      href={getWhatsAppUrl(r)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 font-bold px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer"
                      title="Proponi questo locale sul gruppo WhatsApp"
                    >
                      <Send className="h-3 w-3" /> WhatsApp
                    </a>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        (r.address ? r.address + " " : "") + r.name + " " + r.city
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-amber-400 hover:underline"
                    >
                      Mappe <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* POPUP ROULETTE DEL SABATO SERA 🎲 */}
        {rouletteWinner && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-900 border-2 border-purple-500 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative text-center">
              <div className="w-16 h-16 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
                <Sparkles className="h-8 w-8 animate-bounce" />
              </div>

              <div>
                <span className="text-[11px] uppercase font-black text-purple-400 tracking-wider">La Roulette ha deciso:</span>
                <h2 className="text-2xl font-black text-white mt-1">{rouletteWinner.name}</h2>
                <p className="text-xs text-slate-300 mt-1">
                  {rouletteWinner.category} • {rouletteWinner.price_range} • {rouletteWinner.city}
                </p>
                {rouletteWinner.distKm && (
                  <p className="text-xs text-emerald-400 font-mono mt-1 font-bold">📍 A {rouletteWinner.distKm} km da voi</p>
                )}
                {rouletteWinner.recommended_by && (
                  <p className="text-xs text-slate-400 mt-1">Consigliato in origine da <strong>{rouletteWinner.recommended_by}</strong></p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <a
                  href={getWhatsAppUrl(rouletteWinner)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20"
                >
                  <Send className="h-4 w-4" /> Spedisci la decisione su WhatsApp!
                </a>
                <button
                  onClick={() => setRouletteWinner(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL NUVOLETTA: PENSIERI & STELLOZZE ⭐ */}
        {reviewModalData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">La tua recensione</span>
                <h2 className="text-xl font-black text-white mt-0.5">{reviewModalData.name}</h2>
                <p className="text-xs text-slate-400">Lascia le stellozze e assegna la gloria o la colpa!</p>
              </div>

              <form onSubmit={handleSaveReview} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Quante stellozze merita? {reviewRating > 0 && <span className="text-amber-400 font-bold">({reviewRating}/5)</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-125 cursor-pointer"
                      >
                        <Star 
                          className={`h-7 w-7 transition-colors ${
                            star <= (hoverRating || reviewRating)
                              ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                              : "text-slate-700 hover:text-slate-500"
                          }`} 
                        />
                      </button>
                    ))}
                  </div>
                  {reviewRating > 0 && reviewRating <= 2 && (
                    <p className="text-[11px] text-rose-400 font-bold mt-1.5">
                      💀 Meno di 3 stelle! Scatterà il "Prossima volta evita"!
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    I tuoi pensieri (consigli, atmosfera, piatti)
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="es. Bistecca tenerissima, vino top... oppure: posto da dimenticare!"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalData(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    Salva Pensieri ⭐
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Aggiungi Locale con Chi l'ha consigliato e Occasione */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-white">Aggiungi nuovo locale</h2>
              <form onSubmit={handleAddRestaurant} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400">Nome Locale *</label>
                  <input
                    type="text"
                    required
                    placeholder="es. Da Ciro"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-amber-400 font-semibold">Indirizzo (Via e Civico) *</label>
                  <input
                    type="text"
                    required
                    placeholder="es. Via dei Tribunali 32"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950 border border-amber-400/40 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400">Città *</label>
                    <input
                      type="text"
                      required
                      placeholder="es. Napoli"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Categoria *</label>
                    <input
                      type="text"
                      required
                      placeholder="es. Pizzeria, Sushi"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* CHI HA CONSIGLIATO IL LOCALE */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold">Chi l'ha consigliato? (Nome amico)</label>
                  <input
                    type="text"
                    placeholder="es. Andrea, Luca, Marco..."
                    value={formData.recommended_by}
                    onChange={(e) => setFormData({ ...formData, recommended_by: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* OCCASIONE DELLA SERATA */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold">Che tipo di serata è?</label>
                  <select
                    value={formData.occasion}
                    onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1"
                  >
                    <option value="🍔 Sfondamento tra amici">🍔 Sfondamento tra amici</option>
                    <option value="🍻 Birretta / Aperitivo al volo">🍻 Birretta / Aperitivo al volo</option>
                    <option value="🍷 Cena elegante">🍷 Cena elegante</option>
                    <option value="☀️ Pranzo della domenica">☀️ Pranzo della domenica</option>
                    <option value="🍕 Pizza ignorante">🍕 Pizza ignorante</option>
                  </select>
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
                  <label className="text-xs text-slate-400">Note iniziali</label>
                  <textarea
                    rows={2}
                    placeholder="es. Piatto consigliato, visto su IG..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white mt-1 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm cursor-pointer"
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