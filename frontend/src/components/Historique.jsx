import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2, RotateCcw, Calendar, TrendingUp, ShieldCheck } from "lucide-react";

const Historique = ({ baseUrl }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${baseUrl}/historique`);
      setHistory(res.data);
    } catch (err) {
      console.error("Erreur historique:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async (id) => {
    if (!window.confirm("Marquer cette simulation comme supprimée ?")) return;
    try {
      await axios.patch(`${baseUrl}/simulation/${id}/supprimer`);
      fetchHistory(); 
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  if (loading) return <div className="p-10 text-center font-bold text-blue-600">Chargement de l'historique...</div>;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
        <h2 className="text-2xl font-black text-blue-900 flex items-center gap-2">
          <RotateCcw /> Historique des Simulations
        </h2>
        <span className="text-sm font-bold text-slate-500">{history.length} simulations au total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-widest">
              <th className="p-4">ID / Date</th>
              <th className="p-4">Client</th>
              <th className="p-4">Montant</th>
              <th className="p-4">Mensualité</th>
              <th className="p-4">Total Intérêts</th>
              <th className="p-4">Total Assurance</th>
              <th className="p-4">Durée</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((sim) => (
              <tr key={sim.id} className={`border-b transition-all ${sim.is_deleted ? "bg-red-50 opacity-60" : "hover:bg-blue-50/50"}`}>
                {/* ID / DATE */}
                <td className="p-4">
                  <div className="font-bold text-slate-700">#{sim.id}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar size={10}/> 
                    {sim.date_traitement ? new Date(sim.date_traitement).toLocaleDateString('fr-FR') : "N/A"}
                  </div>
                </td>

                {/* CLIENT */}
                <td className="p-4 font-medium text-slate-600 text-sm">
                  ID: {sim.client_id || "Anonyme"}
                </td>

                {/* MONTANT */}
                <td className="p-4 font-black text-slate-900">
                  {sim.montant_desire?.toLocaleString()} $
                </td>

                {/* MENSUALITÉ */}
                <td className="p-4 font-bold text-blue-600">
                  {sim.mensualite?.toLocaleString()} $
                </td>

                {/* TOTAL INTÉRÊTS */}
                <td className="p-4 text-rose-600 font-semibold">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={14} className="opacity-50"/>
                    {sim.total_interets?.toLocaleString() || "0"} $
                  </div>
                </td>

                {/* TOTAL ASSURANCE */}
                <td className="p-4 text-emerald-600 font-semibold">
                  <div className="flex items-center gap-1">
                    <ShieldCheck size={14} className="opacity-50"/>
                    {sim.total_assurance?.toLocaleString() || "0"} $
                  </div>
                </td>

                {/* DURÉE */}
                <td className="p-4 text-slate-500 font-medium text-sm">
                  {sim.duree_mois} mois
                </td>

                {/* ACTIONS */}
                <td className="p-4 text-center">
                  {!sim.is_deleted ? (
                    <button 
                      onClick={() => handleSoftDelete(sim.id)}
                      className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-all"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-tighter bg-rose-50 px-2 py-1 rounded border border-rose-100">Archivé</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Historique;