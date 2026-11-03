"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Utensils, Navigation, Plus, ExternalLink, Star } from "lucide-react";

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tutte");
  const [selectedStatus, setSelectedStatus] = useState("tutti");
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
      alert("Geolocalizzazione non supportata dal tuo browser");
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
      (err) => {
        alert("Permesso posizione negato o non disponibile");
        setLocating(false);
      }
    );
  }

  // Inserimento nuovo locale
  async function handleAddRestaurant(e) {
    e.preventDefault();
    if (!formData.name || !formData.city) return;

    const { error } = await supabase.from("restaurants").insert([formData]);
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

  // Filtri e ordinamento
  const categories = ["Tutte", ...new Set(restaurants.map((r) => r.category))];

  let filtered = restaurants.filter((r) => {
    const matchCategory = selectedCategory === "Tutte" || r.category === selectedCategory;
    const matchStatus = selectedStatus === "tutti" || r.status === selectedStatus;
    return matchCategory && matchStatus;
  });

  if (userLocation) {
    filtered = [...filtered].sort((a, b) => {
      const distA = getDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude) || 99999;
      const distB = getDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude) || 99999;
      return distA - distB;
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2 text-amber-400">
              <Utensils className="h-8 w-8" /> Food Wishlist
            </h1>
            <p className="text-sm text-slate-400 mt-1">I tuoi posti preferiti e quelli da provare al volo</p>
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
              {locating ? "Localizzo..." : userLocation ? "Posizione attiva" : "Vicini a me"}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition"
            >
              <Plus className="h-4 w-4" /> Aggiungi
            </button>
          </div>
        </header>

        {/* Filtri */}
        <section className="flex flex-col gap-3">
          {/* Categorie */}
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

          {/* Stato */}
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
            Nessun locale trovato con questi filtri.
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
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        r.name + " " + r.city
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-amber-400 hover:underline"
                    >
                      Apri Mappe <ExternalLink className="h-3 w-3" />
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
                      placeholder="es. Roma"
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
                    placeholder="es. Prova la cacio e pepe!"
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