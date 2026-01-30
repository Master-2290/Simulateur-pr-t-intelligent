import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Historique from "./components/Historique"; // On importe le composant historique

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
  Info,
  User,
  Home,
  Mail,
  History, // Ajout de l'icône
} from "lucide-react";

function App() {
  // NAVIGATION
  const [activeTab, setActiveTab] = useState("accueil");

  // FORMULAIRE CLIENT
  const [clientData, setClientData] = useState({
    nom: "",
    prenom: "",
    dateNaissance: "",
    adresse: "",
    ville: "",
    cp: "",
    email: "",
    telephone: "",
    etatCivil: "célibataire",
    profession: "employé",
    employeur: "",
    depuis: "",
    revenu: "",
    autresRevenus: "",
  });

  const [formData, setFormData] = useState({
    montant: "",
    taux: "",
    duree: "",
    mensualite: "",
    tauxAssurance: "0.36",
    type: "fixe",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentSimId, setCurrentSimId] = useState(null); // Stockage de l'ID dynamique

  const BASE_URL = "http://localhost:8000";

  const [refreshKey, setRefreshKey] = useState(0);

  const handleCalculate = async () => {
    setLoading(true);
    const payload = {
      montant: formData.montant ? parseFloat(formData.montant) : null,
      taux_annuel: formData.taux ? parseFloat(formData.taux) : null,
      duree_mois: formData.duree ? parseInt(formData.duree) : null,
      mensualite: formData.mensualite ? parseFloat(formData.mensualite) : null,
      taux_assurance: parseFloat(formData.tauxAssurance),
      client: clientData,
      type_taux: formData.type,
    };

    try {
      const response = await axios.post(`${BASE_URL}/calculer`, payload);
      setResult(response.data);
      // On récupère l'ID généré par le backend
      if (response.data.id) {
        setCurrentSimId(response.data.id);
      }
      if (response.status === 200) {
        setRefreshKey((old) => old + 1); // Force le composant Historique à se recharger
      }
    } catch (error) {
      alert(error.response?.data?.detail || "Erreur de calcul.");
    } finally {
      setLoading(false);
    }
  };
  <Historique baseUrl={BASE_URL} key={refreshKey} />;

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text("OFFRE PRÉALABLE DE CRÉDIT", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Document généré le ${new Date().toLocaleDateString()}`, 105, 28, {
      align: "center",
    });

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("ENTRE LES SOUSSIGNÉS :", 14, 45);
    doc.setFont("helvetica", "normal");
    const introText = `M./Mme ${clientData.nom.toUpperCase()} ${
      clientData.prenom
    }, né(e) le ${clientData.dateNaissance}, demeurant au ${
      clientData.adresse
    }, ${clientData.cp} ${clientData.ville}. Exerçant la profession de ${
      clientData.profession
    } chez ${clientData.employeur || "N/A"}.`;
    doc.text(doc.splitTextToSize(introText, 180), 14, 52);

    doc.setFont("helvetica", "bold");
    doc.text("OBJET DE LA SIMULATION :", 14, 75);
    doc.setFont("helvetica", "normal");
    const synthese = `Le bénéficiaire sollicite un prêt d'un montant de ${
      result.params_finaux.montant
    }$ au taux de ${
      result.params_finaux.taux_annuel
    }%. Le remboursement s'effectuera sur ${
      result.params_finaux.duree_mois
    } mois pour une mensualité de ${
      result.params_finaux.mensualite
    }$. Le coût total des intérêts s'élève à ${(
      result.params_finaux.mensualite * result.params_finaux.duree_mois -
      result.params_finaux.montant
    ).toFixed(2)}$.`;
    doc.text(doc.splitTextToSize(synthese, 180), 14, 82);

    const tableRows = result.echeancier.map((item) => [
      item.mois,
      `${item.mensualite}$`,
      `${item.interet}$`,
      `${item.assurance}$`,
      `${item.capital}$`,
      `${item.solde}$`,
    ]);

    autoTable(doc, {
      head: [["Mois", "Mensualité", "Intérêt", "Intérêt", "Capital", "Solde"]],
      body: tableRows,
      startY: 105,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`Simulation_${clientData.nom}.pdf`);
  };

  const exportExcel = async () => {
    // 1. Sécurité : vérifier si on a un ID valide
    if (!currentSimId) {
      alert(
        "Erreur : Aucune simulation trouvée en base de données. Veuillez relancer le calcul.",
      );
      return;
    }

    try {
      console.log("Tentative d'export pour l'ID:", currentSimId);

      const response = await axios.post(
        `${BASE_URL}/export/excel/${currentSimId}`,
        result.echeancier,
        { responseType: "blob" },
      );

      // 2. Création du lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `simulation_${currentSimId}.xlsx`);
      document.body.appendChild(link);
      link.click();

      // Nettoyage
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Détails de l'erreur 404:", error.response);
      alert("Le serveur n'a pas trouvé le point d'accès pour l'export Excel.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* NAVBAR */}
      <nav className="bg-white shadow-md p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-blue-900 text-xl">
            Mon Prêt Hypothécaire
          </div>
          <div className="flex gap-6 font-bold text-slate-600">
            <button
              onClick={() => setActiveTab("accueil")}
              className={
                activeTab === "accueil" ? "text-blue-600 underline" : ""
              }
            >
              Accueil
            </button>
            {/* Nouveau bouton Historique */}
            <button
              onClick={() => setActiveTab("historique")}
              className={
                activeTab === "historique" ? "text-blue-600 underline" : ""
              }
            >
              Historique
            </button>
            <button
              onClick={() => setActiveTab("propos")}
              className={
                activeTab === "propos" ? "text-blue-600 underline" : ""
              }
            >
              À propos
            </button>
          </div>
        </div>
      </nav>

      <div className="p-4 md:p-8">
        {/* ONGLET ACCUEIL (TON CODE ORIGINAL) */}
        {activeTab === "accueil" && (
          <div className="max-w-7xl mx-auto space-y-8">
            {!result && (
              <div className="bg-blue-900 text-white p-8 rounded-3xl mb-8 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <h2 className="text-4xl font-black mb-4">
                    Plateforme de Simulation de Prêt Hypothécaire
                  </h2>
                  <p className="text-blue-100 text-lg">
                    Obtenez une offre personnalisée et exportez votre tableau
                    d'amortissement en un clic. Simple, rapide et précis.
                  </p>
                </div>
                <Home size={120} className="opacity-20" />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-900">
                    <User /> Informations Client
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <input
                      className="p-3 border rounded-xl"
                      placeholder="Nom*"
                      onChange={(e) =>
                        setClientData({ ...clientData, nom: e.target.value })
                      }
                    />
                    <input
                      className="p-3 border rounded-xl"
                      placeholder="Prénom*"
                      onChange={(e) =>
                        setClientData({ ...clientData, prenom: e.target.value })
                      }
                    />
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-400">
                        Date de naissance*
                      </label>
                      <input
                        type="date"
                        className="w-full p-3 border rounded-xl"
                        onChange={(e) =>
                          setClientData({
                            ...clientData,
                            dateNaissance: e.target.value,
                          })
                        }
                      />
                    </div>
                    <input
                      className="col-span-2 p-3 border rounded-xl"
                      placeholder="Adresse (Rue, numéro)*"
                      onChange={(e) =>
                        setClientData({
                          ...clientData,
                          adresse: e.target.value,
                        })
                      }
                    />
                    <input
                      className="p-3 border rounded-xl"
                      placeholder="Ville*"
                      onChange={(e) =>
                        setClientData({ ...clientData, ville: e.target.value })
                      }
                    />
                    <input
                      className="p-3 border rounded-xl"
                      placeholder="Code Postal*"
                      onChange={(e) =>
                        setClientData({ ...clientData, cp: e.target.value })
                      }
                    />
                    <input
                      className="p-3 border rounded-xl"
                      placeholder="Email*"
                      onChange={(e) =>
                        setClientData({ ...clientData, email: e.target.value })
                      }
                    />
                    <input
                      className="p-3 border rounded-xl"
                      placeholder="Téléphone*"
                      onChange={(e) =>
                        setClientData({
                          ...clientData,
                          telephone: e.target.value,
                        })
                      }
                    />
                    <select
                      className="p-3 border rounded-xl bg-white"
                      onChange={(e) =>
                        setClientData({
                          ...clientData,
                          etatCivil: e.target.value,
                        })
                      }
                    >
                      <option value="célibataire">Célibataire</option>
                      <option value="marié">Marié(e)</option>
                    </select>
                    <input
                      className="p-3 border rounded-xl"
                      placeholder="Profession*"
                      onChange={(e) =>
                        setClientData({
                          ...clientData,
                          profession: e.target.value,
                        })
                      }
                    />
                    <input
                      className="p-3 border rounded-xl"
                      placeholder="Revenu mensuel*"
                      onChange={(e) =>
                        setClientData({ ...clientData, revenu: e.target.value })
                      }
                    />
                    <input
                      className="p-3 border rounded-xl"
                      placeholder="Depuis le (Emploi)*"
                      onChange={(e) =>
                        setClientData({ ...clientData, depuis: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
                  <h3 className="text-xl font-bold mb-6 text-blue-900 flex items-center gap-2">
                    <Calculator /> Paramètres du Prêt
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold mb-1">
                        Montant ($){" "}
                        <Info
                          size={14}
                          className="text-slate-400 cursor-help"
                          title="Le capital emprunté."
                        />
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 border rounded-xl"
                        value={formData.montant}
                        onChange={(e) =>
                          setFormData({ ...formData, montant: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold mb-1">
                        Mensualité ($){" "}
                        <Info
                          size={14}
                          className="text-slate-400 cursor-help"
                          title="Somme payée chaque mois."
                        />
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 border rounded-xl bg-blue-50/50"
                        value={formData.mensualite}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            mensualite: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold mb-1">
                          Taux (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full p-3 border rounded-xl"
                          value={formData.taux}
                          onChange={(e) =>
                            setFormData({ ...formData, taux: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold mb-1">
                          Durée (Mois)
                        </label>
                        <input
                          type="number"
                          className="w-full p-3 border rounded-xl"
                          value={formData.duree}
                          onChange={(e) =>
                            setFormData({ ...formData, duree: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCalculate}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg"
                    >
                      {loading ? "Calcul en cours..." : "Lancer la Simulation"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                {result ? (
                  <>
                    {/* Cartes de synthèse : Passé de 2 à 3 colonnes pour inclure l'assurance */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
                        <p className="text-slate-500 text-sm font-bold uppercase">
                          Total Intérêts
                        </p>
                        <p className="text-2xl font-black text-rose-500">
                          {result.params_finaux.total_interets.toLocaleString()}{" "}
                          $
                        </p>
                      </div>

                      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
                        <p className="text-slate-500 text-sm font-bold uppercase">
                          Total Assurance
                        </p>
                        <p className="text-2xl font-black text-violet-500">
                          {result.params_finaux.total_assurance.toLocaleString()}{" "}
                          $
                        </p>
                      </div>

                      <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg">
                        <p className="text-blue-100 text-sm font-bold uppercase">
                          Coût Total du Crédit
                        </p>
                        <p className="text-3xl font-black">
                          {result.params_finaux.cout_total_credit.toLocaleString()}{" "}
                          $
                        </p>
                      </div>
                    </div>

                    {/* Graphique d'amortissement */}
                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 h-[400px]">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <TrendingUp size={20} /> Amortissement du Solde
                      </h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <AreaChart data={result.echeancier}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="mois" />
                          <YAxis />
                          <Tooltip
                            formatter={(value) => `${value.toLocaleString()} $`}
                            labelFormatter={(label) => `Mois ${label}`}
                          />
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
                    <p className="text-xl font-bold text-center">
                      Remplissez vos informations et cliquez sur "Lancer la
                      Simulation".
                    </p>
                  </div>
                )}
              </div>
            </div>

            {result && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden w-full">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-blue-900">
                    <TableIcon size={20} /> Échéancier détaillé
                  </h3>
                  <div className="flex gap-3">
                    <button
                      onClick={exportPDF}
                      className="flex items-center gap-2 bg-rose-600 text-white px-5 py-2 rounded-xl hover:bg-rose-700 font-bold"
                    >
                      <FileDown size={18} /> Contrat PDF
                    </button>
                    <button
                      onClick={exportExcel}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl hover:bg-emerald-700 font-bold"
                    >
                      <FileSpreadsheet size={18} /> Excel
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
                        <th className="p-4 font-bold text-right text-violet-600">
                          Assurance
                        </th>
                        <th className="p-4 font-bold text-right">Capital</th>
                        <th className="p-4 font-bold text-right">
                          Solde restant
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.echeancier.map((row) => (
                        <tr
                          key={row.mois}
                          className="hover:bg-blue-50 border-b"
                        >
                          <td className="p-4">{row.mois}</td>
                          <td className="p-4 text-right font-bold">
                            {row.mensualite}$
                          </td>
                          <td className="p-4 text-right text-rose-500">
                            -{row.interet}$
                          </td>
                          <td className="p-4 text-right text-violet-500">
                            -{row.assurance}$
                          </td>
                          <td className="p-4 text-right text-emerald-600">
                            +{row.capital}$
                          </td>
                          <td className="p-4 text-right font-bold text-blue-900">
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
        )}

        {/* NOUVEL ONGLET HISTORIQUE */}
        {activeTab === "historique" && (
          <div className="max-w-7xl mx-auto">
            {/* AJOUTE baseUrl ET key ICI */}
            <Historique baseUrl={BASE_URL} key={refreshKey} />
          </div>
        )}

        {/* ONGLET À PROPOS */}
        {activeTab === "propos" && (
          <div className="max-w-3xl mx-auto bg-white p-12 rounded-3xl shadow-xl border border-slate-200 text-center">
            <h2 className="text-3xl font-black text-blue-900 mb-6">À propos</h2>
            <p className="text-slate-600 text-lg mb-10 leading-relaxed">
              Ce simulateur offre une transparence totale dans le calcul des
              crédits immobiliers.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <Calculator className="text-blue-600" />
                <span className="font-bold text-slate-700">
                  +243 825 076 219
                </span>
              </div>
              <div className="flex items-center justify-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <Mail className="text-blue-600" />
                <span className="font-bold text-slate-700">
                  jordylubini64@gmail.com
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
