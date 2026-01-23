import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Calculator,
  Table as TableIcon,
  TrendingUp,
  AlertCircle,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";

function App() {
  const [formData, setFormData] = useState({
    montant: "",
    taux: "",
    duree: "",
    mensualite: "", // AJOUT : Nouveau champ dans l'état
    type: "fixe",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // IP locale pour le test sur téléphone
  const BASE_URL = "http://192.168.1.68:8000";

  const handleCalculate = async () => {
    setLoading(true);

    // LOGIQUE FLEXIBLE : On n'utilise parseFloat que si la valeur existe, sinon null
    const payload = {
      montant: formData.montant ? parseFloat(formData.montant) : null,
      taux_annuel: formData.taux ? parseFloat(formData.taux) : null,
      duree_mois: formData.duree ? parseInt(formData.duree) : null,
      mensualite: formData.mensualite ? parseFloat(formData.mensualite) : null,
      type_taux: formData.type,
    };

    try {
      const response = await axios.post(`${BASE_URL}/calculer`, payload);
      setResult(response.data);
    } catch (error) {
      const errorMsg =
        error.response?.data?.detail ||
        "Erreur de calcul. Remplissez au moins 3 champs.";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Simulation de Prêt Hypothécaire", 14, 20);

    const tableColumn = ["Mois", "Mensualité", "Intérêt", "Capital", "Solde"];
    const tableRows = result.echeancier.map((item) => [
      item.mois,
      `${item.mensualite}$`,
      `${item.interet}$`,
      `${item.capital}$`,
      `${item.solde}$`,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save("simulation_pret.pdf");
  };

  const exportExcel = async () => {
    const response = await axios.post(
      `${BASE_URL}/export/excel`,
      result.echeancier,
      { responseType: "blob" }
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "amortissement.xlsx");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800 font-sans">
      <header className="max-w-7xl mx-auto mb-10 text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold text-blue-900 flex justify-center items-center gap-4">
          <Calculator className="text-blue-600" size={48} />
          Prêt Hypothécaire{" "}
          <span className="text-blue-600 underline">Intelligent</span>
        </h1>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-xl border border-slate-200 h-fit">
            <h2 className="text-xl font-bold mb-6 text-blue-900">
              Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-600">
                  Montant ($)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 200000"
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={formData.montant}
                  onChange={(e) =>
                    setFormData({ ...formData, montant: e.target.value })
                  }
                />
              </div>

              {/* AJOUT : Champ Mensualité Souhaitée */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-600">
                  Mensualité souhaitée ($/mois)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 1200"
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30"
                  value={formData.mensualite}
                  onChange={(e) =>
                    setFormData({ ...formData, mensualite: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-600">
                  Taux Annuel (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 3.5"
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={formData.taux}
                  onChange={(e) =>
                    setFormData({ ...formData, taux: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-600">
                  Durée (Mois)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 240"
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={formData.duree}
                  onChange={(e) =>
                    setFormData({ ...formData, duree: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-600">
                  Type d'intérêt
                </label>
                <select
                  className="w-full p-3 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option value="fixe">Taux Fixe</option>
                  <option value="variable">Taux Variable (Révisable)</option>
                </select>
              </div>

              <button
                onClick={handleCalculate}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-400 shadow-lg shadow-blue-100"
              >
                {loading ? "Calcul intelligent..." : "Lancer le calcul"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {result ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg">
                    <p className="text-blue-100 text-sm">Prêt Final</p>
                    <p className="text-2xl font-bold">
                      {result.params_finaux.montant.toLocaleString()} $
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 text-center">
                    <p className="text-slate-500 text-sm">Mensualité</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {result.params_finaux.mensualite} $
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 text-center">
                    <p className="text-slate-500 text-sm">Taux Appliqué</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {result.params_finaux.taux_annuel} %
                    </p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 h-[335px]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-900">
                    <TrendingUp size={20} /> Évolution du Capital
                  </h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <AreaChart data={result.echeancier}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mois" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="solde"
                        stroke="#2563eb"
                        fill="#dbeafe"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 border-4 border-dashed border-slate-200 rounded-3xl p-12">
                <AlertCircle size={64} className="mb-4 opacity-20" />
                <p className="text-xl">
                  Laissez un champ vide pour le calculer automatiquement
                </p>
              </div>
            )}
          </div>
        </div>

        {/* BAS : TABLEAU LARGEUR TOTALE */}
        {result && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden w-full">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold flex items-center gap-2 text-blue-900">
                <TableIcon size={20} /> Tableau d'amortissement complet
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={exportPDF}
                  className="flex items-center gap-2 bg-rose-600 text-white px-5 py-2 rounded-xl hover:bg-rose-700 transition font-bold shadow-md"
                >
                  <FileDown size={18} /> Export PDF
                </button>
                <button
                  onClick={exportExcel}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl hover:bg-emerald-700 transition font-bold shadow-md"
                >
                  <FileSpreadsheet size={18} /> Export Excel
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm uppercase">
                    <th className="p-4 font-bold">Mois</th>
                    <th className="p-4 font-bold text-right">Mensualité</th>
                    <th className="p-4 font-bold text-right">Intérêt</th>
                    <th className="p-4 font-bold text-right">Capital Amorti</th>
                    <th className="p-4 font-bold text-right text-blue-700">
                      Solde Restant Dû
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.echeancier.map((row) => (
                    <tr
                      key={row.mois}
                      className="hover:bg-blue-50/50 transition-colors group text-sm md:text-base"
                    >
                      <td className="p-4 font-medium text-slate-500">
                        {row.mois}
                      </td>
                      <td className="p-4 text-right font-bold">
                        {row.mensualite}$
                      </td>
                      <td className="p-4 text-right text-rose-500">
                        -{row.interet}$
                      </td>
                      <td className="p-4 text-right text-emerald-600">
                        +{row.capital}$
                      </td>
                      <td className="p-4 text-right font-extrabold text-blue-900 bg-blue-50/20">
                        {row.solde}$
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
