import React, { useState, useEffect } from "react";
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
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";

import {
  Calculator,
  Table as TableIcon,
  TrendingUp,
  AlertCircle,
  FileDown,
  FileText,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  Download,
  Info,
  User,
  Home,
  Mail,
  LayoutDashboard,
  History, // Ajout de l'icône
  Activity,
  Menu,
  X,
} from "lucide-react";

const NavItems = ({ activeTab, setActiveTab, isMobile, closeMenu }) => {
  const menuItems = [
    { id: "accueil", label: "Accueil", icon: <Home size={18} /> },
    { id: "capacite", label: "Capacité", icon: <Calculator size={18} /> },
    {
      id: "dashboard",
      label: "Tableau de bord",
      icon: <LayoutDashboard size={18} />,
    },
    { id: "historique", label: "Historique", icon: <History size={18} /> },
    { id: "propos", label: "FAQ", icon: <Info size={18} /> },
  ];

  return (
    <>
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            setActiveTab(item.id);
            if (isMobile) closeMenu();
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
            activeTab === item.id
              ? "bg-blue-600 text-white shadow-md md:shadow-none"
              : "text-slate-500 hover:bg-slate-200"
          } ${isMobile ? "w-full justify-start py-4 border-b border-slate-50" : ""}`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </>
  );
};

function App() {
  // NAVIGATION
  const [activeTab, setActiveTab] = useState("accueil");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Fonction pour afficher le pop-up temporairement
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000); // Disparaît après 3s
  };

  const [formData, setFormData] = useState({
    montant: "",
    taux: "",
    duree: "",
    mensualite: "",
    tauxAssurance: "0.36",
    type: "fixe",
  });

  const [capaciteParams, setCapaciteParams] = useState({
    mensualiteMax: "",
    taux: "3.5",
    duree: "20",
    assurance: "0.36",
  });

  const [capaciteResult, setCapaciteResult] = useState(null); // Stockage de la réponse du serveur

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentSimId, setCurrentSimId] = useState(null); // Stockage de l'ID dynamique

  const BASE_URL = "http://localhost:8000";

  const [refreshKey, setRefreshKey] = useState(0);

  const [simulationsHistory, setSimulationsHistory] = useState([]);
  const [statsExport, setStatsExport] = useState({ pdf: 0, excel: 0 });
  const [storageStats, setStorageStats] = useState({
    file_count: 0,
    total_size_mb: 0,
  });

  const enregistrerExportDansDB = async (type) => {
    if (!currentSimId) return;
    try {
      // On appelle la route PUT de ton backend Python
      await axios.put(
        `${BASE_URL}/simulations/${currentSimId}/increment-export?type=${type}`,
      );
      // On déclenche un rafraîchissement de l'historique pour mettre à jour le dashboard
      setRefreshKey((old) => old + 1);
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour des stats d'export en DB:",
        error,
      );
    }
  };

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
    enregistrerExportDansDB("pdf");
    triggerToast("Le contrat PDF a été généré et enregistré !");
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

      enregistrerExportDansDB("excel");
      triggerToast("Le fichier Excel a été téléchargé avec succès !");

      // Nettoyage
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Détails de l'erreur 404:", error.response);
      alert("Le serveur n'a pas trouvé le point d'accès pour l'export Excel.");
    }
  };

  const handleCapacite = async () => {
    // On s'assure que la mensualité n'est pas vide
    if (!capaciteParams.mensualiteMax) {
      alert("Veuillez entrer une mensualité maximale.");
      return;
    }

    try {
      // Appel à ton nouveau point de terminaison Python
      const response = await axios.post(`${BASE_URL}/capacite-emprunt`, {
        mensualite_max: parseFloat(capaciteParams.mensualiteMax),
        taux_annuel: parseFloat(capaciteParams.taux),
        duree_ans: parseInt(capaciteParams.duree),
        taux_assurance: parseFloat(capaciteParams.assurance),
      });

      // On stocke le résultat (capital_empruntable, etc.) dans le state
      setCapaciteResult(response.data);
    } catch (error) {
      console.error("Erreur lors du calcul de capacité:", error);
      alert(
        "Le serveur n'a pas pu calculer la capacité. Vérifiez que le backend est lancé.",
      );
    }
  };

  // Calcul des moyennes pour le Dashboard
  const totalPDF = simulationsHistory.reduce(
    (acc, sim) => acc + (sim.nb_export_pdf || 0),
    0,
  );
  const totalExcel = simulationsHistory.reduce(
    (acc, sim) => acc + (sim.nb_export_excel || 0),
    0,
  );

  const getMoyenne = (cle) => {
    if (!simulationsHistory || simulationsHistory.length === 0) return "0";
    const somme = simulationsHistory.reduce(
      (acc, sim) => acc + (parseFloat(sim[cle]) || 0),
      0,
    );
    return (somme / simulationsHistory.length).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  const fetchStorageStats = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/stats-stockage`);
      setStorageStats(res.data);
    } catch (err) {
      console.error("Erreur stats stockage:", err);
    }
  };

  React.useEffect(() => {
    const fetchSims = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/historique`);
        setSimulationsHistory(response.data);
      } catch (e) {
        console.error("Erreur chargement dashboard", e);
      }
    };
    fetchSims();
    fetchStorageStats();
  }, [refreshKey]); // Se recharge quand refreshKey change

  // Importe useEffect en haut avec useState : import React, { useState, useEffect } from "react";

  useEffect(() => {
    const chargerDonneesDashboard = async () => {
      try {
        // On appelle la route qui liste toutes les simulations
        const response = await axios.get(`${BASE_URL}/historique`);
        setSimulationsHistory(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des stats:", error);
      }
    };

    chargerDonneesDashboard();
  }, [refreshKey]); // Le dashboard se met à jour quand refreshKey change (après un calcul)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* NAVBAR */}
      <nav className="bg-white shadow-md p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* LOGO */}
          <div className="flex items-center gap-2 font-black text-blue-900 text-xl">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Home size={20} />
            </div>
            <span className="tracking-tight">Mon Prêt</span>
          </div>

          {/* BOUTON MENU MOBILE */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* MENU DESKTOP */}
          <div className="hidden md:flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
            <NavItems activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </div>

        {/* MENU MOBILE DROPDOWN */}
        {isMenuOpen && (
          <div className="md:hidden absolute left-0 right-0 top-[72px] bg-white border-b border-slate-200 p-4 shadow-xl flex flex-col gap-2 animate-in slide-in-from-top duration-300 z-40">
            <NavItems
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isMobile
              closeMenu={() => setIsMenuOpen(false)}
            />
          </div>
        )}
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
                        Mensualité ($) (optionnel){" "}
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
                          Taux (%) (optionnel)
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

                    {/* --- NOUVEAUX MODULES ANALYSE ACCUEIL --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      {/* 1. Camembert de répartition */}
                      <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 h-[380px] flex flex-col">
                        <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                          <PieChartIcon size={20} className="text-blue-600" />{" "}
                          Poids des Frais
                        </h3>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "Capital",
                                  value: result.params_finaux.montant,
                                },
                                {
                                  name: "Intérêts",
                                  value: result.params_finaux.total_interets,
                                },
                                {
                                  name: "Assurance",
                                  value: result.params_finaux.total_assurance,
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={8}
                              dataKey="value"
                            >
                              <Cell fill="#10b981" /> {/* Vert pour Capital */}
                              <Cell fill="#f43f5e" />{" "}
                              {/* Rouge pour Intérêts */}
                              <Cell fill="#8b5cf6" />{" "}
                              {/* Violet pour Assurance */}
                            </Pie>
                            <Tooltip
                              formatter={(value) =>
                                `${value.toLocaleString()} $`
                              }
                            />
                            <Legend verticalAlign="bottom" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* 2. Score, Sensibilité et Bascule */}
                      <div className="space-y-4">
                        {/* Card Score d'Accessibilité */}
                        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
                          <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                            <Activity size={20} className="text-emerald-500" />{" "}
                            Score d'Accessibilité
                          </h3>
                          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl">
                            <div
                              className={`w-4 h-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)] ${
                                result.params_finaux.mensualite < 2500
                                  ? "bg-emerald-500"
                                  : "bg-orange-500"
                              }`}
                            />
                            <p className="text-sm font-bold text-slate-700">
                              {result.params_finaux.mensualite < 2500
                                ? "Profil excellent, les banques vont s'arracher votre dossier."
                                : "Dossier solide, mais attention à la gestion de vos charges fixes."}
                            </p>
                          </div>
                        </div>

                        {/* Card Bascule et Sensibilité */}
                        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex-1">
                          <div className="flex justify-between items-center mb-6">
                            <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">
                              Point de Bascule
                            </span>
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-black">
                              Mois{" "}
                              {result.echeancier.find(
                                (m) => m.capital > m.interet,
                              )?.mois || "N/A"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-4 italic">
                            "À partir de ce mois, vous remboursez plus de
                            capital que d'intérêts."
                          </p>
                          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white">
                            <p className="text-xs font-bold uppercase opacity-80 mb-1">
                              Impact Négociation (-0.25%)
                            </p>
                            <p className="text-lg font-black italic">
                              Vous économiseriez environ{" "}
                              <span className="text-yellow-300">
                                {(
                                  result.params_finaux.total_interets * 0.08
                                ).toLocaleString()}{" "}
                                $
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
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

        {/* --- NOUVEL ONGLET CAPACITÉ --- */}
        {activeTab === "capacite" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-blue-100">
              <h2 className="text-2xl font-black text-blue-900 mb-6 flex items-center gap-2">
                <TrendingUp className="text-emerald-500" /> Calculer ma capacité
                d'achat
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-1">
                      Mensualité max souhaitée ($)
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 1200"
                      className="w-full p-4 border-2 rounded-2xl focus:border-blue-500 outline-none"
                      onChange={(e) =>
                        setCapaciteParams({
                          ...capaciteParams,
                          mensualiteMax: e.target.value,
                        })
                      }
                    />
                  </div>
                  {/* Tu peux ajouter ici les inputs pour taux et durée sur le même modèle */}
                  <button
                    onClick={handleCapacite} // La fonction qu'on a définie plus tôt
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg"
                  >
                    Découvrir mon budget
                  </button>
                </div>

                {/* Affichage des résultats si on a une réponse */}
                <div className="flex flex-col justify-center items-center bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-200">
                  {capaciteResult ? (
                    <div className="text-center">
                      <p className="text-slate-500 font-bold uppercase text-xs">
                        Vous pouvez emprunter
                      </p>
                      <div className="text-4xl font-black text-blue-900">
                        {capaciteResult.capital_empruntable.toLocaleString()} $
                      </div>
                      <p className="text-emerald-600 font-bold mt-2">
                        Prêt possible sur {capaciteParams.duree} ans
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center italic">
                      Entrez vos mensualités pour voir votre budget s'afficher.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NOUVEL ONGLET DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* KPIs Supérieurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Simulations
                </p>
                <p className="text-3xl font-black text-blue-600">
                  {simulationsHistory.length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Montant Moyen
                </p>
                <p className="text-3xl font-black text-emerald-600">
                  {getMoyenne("montant_desire")} $
                </p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Taux Moyen
                </p>
                <p className="text-3xl font-black text-orange-500">
                  {getMoyenne("taux_annuel")} %
                </p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Mensualité Moyenne
                </p>
                <p className="text-3xl font-black text-indigo-600">
                  {getMoyenne("mensualite")} $
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Durée Moyenne
                </p>
                <p className="text-3xl font-black text-indigo-600">
                  {getMoyenne("duree_mois")} mois
                </p>
              </div>

              {/* TOTAL INTERETS MOYEN */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Total Intérêts Moy.
                </p>
                <p className="text-3xl font-black text-rose-600">
                  {getMoyenne("total_interets")} $
                </p>
              </div>

              {/* TOTAL ASSURANCE MOYEN */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Assurance Moy.
                </p>
                <p className="text-3xl font-black text-blue-400">
                  {getMoyenne("total_assurance")} $
                </p>
              </div>

              {/* --- CARTE : STOCKAGE SERVEUR AVEC NOM DU DOSSIER  */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-50">
                <div className="flex justify-between items-start">
                  <p className="text-slate-500 text-xs font-bold uppercase flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-blue-400" />
                    Dépôt Local
                  </p>
                  {/* Badge affichant le nom du dossier */}
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">
                    /exported_simulations
                  </span>
                </div>

                <p className="text-3xl font-black text-blue-400 mt-2">
                  {storageStats.file_count || 0}
                  <span className="text-sm font-medium text-slate-400 ml-2">
                    fichiers
                  </span>
                </p>

                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">
                    Volume Total
                  </p>
                  <p className="text-[10px] font-bold text-slate-600">
                    {storageStats.total_size_mb} MB
                  </p>
                </div>
              </div>
            </div>

            {/* Section Téléchargements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between transition-hover hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-200">
                    <FileSpreadsheet size={28} />
                  </div>
                  <div>
                    <p className="font-black text-emerald-900 text-xl">
                      Excel exportés
                    </p>
                    <p className="text-emerald-600/70 text-sm font-bold">
                      Rapports générés
                    </p>
                  </div>
                </div>
                <span className="text-4xl font-black text-emerald-600">
                  {storageStats.excel_count || 0}
                </span>
              </div>

              <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex items-center justify-between transition-hover hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-rose-500 rounded-2xl text-white shadow-lg shadow-rose-200">
                    <FileText size={28} />
                  </div>
                  <div>
                    <p className="font-black text-rose-900 text-xl">
                      PDF générés
                    </p>
                    <p className="text-rose-600/70 text-sm font-bold">
                      Documents officiels
                    </p>
                  </div>
                </div>
                <span className="text-4xl font-black text-rose-600">
                  {storageStats.pdf_count || 0}
                </span>
              </div>
            </div>

            {/* Section Conseil et Export */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-700 to-indigo-800 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
                    Conseil d'expert 💡
                  </h3>
                  <p className="text-blue-100 text-lg leading-relaxed max-w-xl">
                    {result &&
                    result.params_finaux.total_interets >
                      result.params_finaux.montant * 0.5
                      ? "Attention : Vos intérêts dépassent 50% du capital. Envisagez de réduire la durée pour économiser gros."
                      : "Analyse : Votre structure de prêt est saine. Le coût des intérêts est maîtrisé par rapport au capital."}
                  </p>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                  <TrendingUp size={200} />
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border-4 border-dashed border-slate-100 flex flex-col justify-center items-center text-center">
                <p className="text-slate-400 font-bold uppercase text-xs mb-2 tracking-widest">
                  Rapport Complet
                </p>
                <p className="text-slate-800 font-black text-lg mb-6 leading-tight">
                  Besoin d'un dossier pour votre banque ?
                </p>
                <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                  <Download size={20} /> Exporter mes données
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOUVEL ONGLET HISTORIQUE */}
        {activeTab === "historique" && (
          <div className="max-w-7xl mx-auto">
            {/* AJOUTE baseUrl ET key ICI */}
            <Historique baseUrl={BASE_URL} key={refreshKey} />
          </div>
        )}

        {activeTab === "FAQ" && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* En-tête de la page */}
            <div className="bg-blue-900 text-white p-10 rounded-3xl shadow-xl flex items-center justify-between overflow-hidden relative">
              <div className="z-10">
                <h2 className="text-4xl font-black mb-2 flex items-center gap-3">
                  <Info size={32} className="text-blue-400" />
                  Centre d'Aide & FAQ
                </h2>
                <p className="text-blue-100 text-lg max-w-xl">
                  Comprenez les mécanismes du prêt hypothécaire et maîtrisez
                  votre projet immobilier de A à Z.
                </p>
              </div>
              <Calculator
                size={180}
                className="absolute -right-10 -bottom-10 opacity-10 rotate-12"
              />
            </div>

            {/* Grille des questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  q: "Qu'est-ce qu'un prêt hypothécaire ?",
                  a: "C'est un crédit destiné à financer l'achat d'un bien immobilier. Sa particularité est d'être garanti par le bien lui-même (l'hypothèque) : si l'emprunteur ne paie plus, la banque peut saisir et vendre le logement.",
                },
                {
                  q: "L'Amortissement (Tableau)",
                  a: "C'est le processus de remboursement de votre dette. Chaque mois, votre mensualité se compose d'une part d'intérêts et d'une part de capital. Au fil du temps, la part de capital augmente.",
                },
                {
                  q: "Taux d'Intérêt Fixe",
                  a: "Le taux est déterminé lors de la signature et ne change jamais pendant toute la durée du prêt. Vos mensualités sont donc connues à l'avance et restent stables, peu importe l'inflation.",
                },
                {
                  q: "Taux d'Intérêt Variable",
                  a: "Il fluctue selon les indices des marchés financiers. Vos mensualités peuvent donc être revues à la hausse ou à la baisse à des dates précises, ce qui présente un risque de volatilité.",
                },
                {
                  q: "L'Assurance Solde Restant Dû (ASRD)",
                  a: "C'est une protection indispensable. En cas de décès ou d'invalidité totale, l'assureur rembourse le solde du prêt à la banque, évitant ainsi de transmettre la dette à vos héritiers.",
                },
                {
                  q: "Le Taux d'Endettement",
                  a: "C'est la part de vos revenus consacrée au remboursement de vos crédits. Les banques exigent généralement qu'il ne dépasse pas 33% à 35% de vos revenus nets mensuels.",
                },
                {
                  q: "L'Apport Personnel",
                  a: "Il s'agit de votre épargne personnelle injectée dans l'achat. Un apport de 10% (pour couvrir les frais de notaire et de garantie) est souvent le minimum requis par les banques.",
                },
                {
                  q: "Le Coût Total du Crédit",
                  a: "C'est la somme de tous les intérêts, frais de dossier, et primes d'assurance payés sur toute la durée du prêt. C'est le montant réel que l'argent vous a coûté en plus du prix du bien.",
                },
                {
                  q: "Remboursement Anticipé",
                  a: "Vous pouvez choisir de rembourser votre prêt plus tôt que prévu (vente du bien, héritage). Attention : des pénalités (Indemnités de Remboursement Anticipé) peuvent être facturées par la banque.",
                },
                {
                  q: "Le Délai de Réflexion",
                  a: "Une fois l'offre de prêt reçue, vous disposez légalement d'un délai minimum de 10 jours de réflexion avant de pouvoir l'accepter officiellement. C'est une protection pour l'emprunteur.",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-400 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">
                        {item.q}
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Section contact rapide */}
            <div className="bg-slate-100 p-8 rounded-3xl border border-dashed border-slate-300 text-center">
              <p className="text-slate-500 font-medium italic">
                "Une simulation bien comprise est le premier pas vers une
                acquisition réussie."
              </p>
            </div>
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

      {/* Pop-up de notification (Toast) */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
          <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-white">
            <div className="bg-white text-emerald-600 rounded-full p-1">
              <Download size={18} />
            </div>
            <span className="font-bold">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
