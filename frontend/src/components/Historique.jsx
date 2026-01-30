import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2, RotateCcw, FileText, Calendar } from "lucide-react";

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
      fetchHistory(); // Rafraîchir la liste
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  if (loading) return <div className="p-10 text-center">Chargement de l'historique...</div>;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
        <h2 className="text-2xl font-black text-blue-900 flex items-center gap-2">
          <RotateCcw /> Historique des Simulations
        </h2>
        <span className="text-sm font-bold text-slate-500">{history.length} simulations</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-xs uppercase">
              <th className="p-4">ID / Date</th>
              <th className="p-4">Client</th>
              <th className="p-4">Montant</th>
              <th className="p-4">Duree</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((sim) => (
              <tr key={sim.id} className={`border-b transition-all ${sim.is_deleted ? "bg-red-50 opacity-50" : "hover:bg-blue-50"}`}>
                <td className="p-4">
                  <div className="font-bold">#{sim.id}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12}/> 
                    {sim.date_traitement ? new Date(sim.date_traitement).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : "Date inconnue"}
                  </div>
                </td>
                <td className="p-4 font-medium text-slate-700">Client ID: {sim.client_id || "Anonyme"}</td>
                <td className="p-4 font-bold text-blue-600">{sim.montant_desire.toLocaleString()} $</td>
                <td className="p-4">{sim.duree_mois} mois</td>
                <td className="p-4 text-center">
                  {!sim.is_deleted ? (
                    <button 
                      onClick={() => handleSoftDelete(sim.id)}
                      className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                      title="Suppression logique"
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-rose-400 italic underline">Archivé</span>
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