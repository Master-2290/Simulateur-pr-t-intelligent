import math
import numpy_financial as npf
import os
import pandas as pd
from datetime import datetime

# Chemin vers le dossier de stockage
EXPORT_PATH = "exported_simulations"


def convertir_taux_actuariel(taux_annuel_pourcent: float) -> float:
    """
    Convertit un taux nominal annuel en taux périodique mensuel actuariel.

    Utilise la méthode de capitalisation composée pour garantir une précision 
    conforme aux standards bancaires européens.

    Args:
        taux_annuel_pourcent: Le taux d'intérêt annuel affiché (ex: 3.5 pour 3.5%).

    Returns:
        Le taux mensuel décimal utilisable pour les calculs d'annuités.
    """
    taux_decimal = taux_annuel_pourcent / 100
    if taux_decimal == 0:
        return 0
    return (1 + taux_decimal)**(1/12) - 1


def resoudre_parametres_pret(m: float, t_annuel: float, n: int, p: float):
    """
    Résout l'équation fondamentale de l'emprunt à annuités constantes.

    Détermine la variable manquante (Capital, Durée ou Mensualité) en fonction 
    des paramètres fournis par l'utilisateur.

    Args:
        m: Capital emprunté (Principal).
        t_annuel: Taux d'intérêt annuel nominal.
        n: Durée totale de l'amortissement en mois.
        p: Montant de la mensualité hors assurance.

    Returns:
        tuple: (montant, duree_mois, mensualite, taux_mensuel_actuariel)

    Raises:
        ValueError: Si la mensualité est insuffisante pour couvrir les intérêts 
                    ou si les paramètres sont incomplets.
    """
   # Sécurité : Si les valeurs sont à 0, on les traite comme None
    m = m if m and m > 0 else None
    n = n if n and n > 0 else None
    p = p if p and p > 0 else None

    t_annuel_val = t_annuel if t_annuel is not None else 0
    t_mensuel = convertir_taux_actuariel(t_annuel_val)

    # CAS 1 : Calcul du Montant (m)
    if m is None and all(v is not None for v in [n, p]):
        if t_mensuel == 0:
            m = p * n
        else:
            m = p * (1 - (1 + t_mensuel)**-n) / t_mensuel

    # CAS 2 : Calcul de la Durée (n)
    elif n is None and all(v is not None for v in [m, p]):
        if t_mensuel == 0:
            n = math.ceil(m / p)
        else:
            if p <= (m * t_mensuel):
                raise ValueError(
                    "La mensualité est trop faible pour couvrir les intérêts.")
            # Sécurité Logarithme
            argument_log = 1 - (t_mensuel * m) / p
            if argument_log <= 0:
                raise ValueError("Calcul impossible avec ces paramètres.")
            n_brut = -math.log(argument_log) / math.log(1 + t_mensuel)
            n = math.ceil(n_brut)

    # CAS 3 : Calcul de la Mensualité (p)
    elif p is None and all(v is not None for v in [m, n]):
        if t_mensuel == 0:
            p = m / n
        else:
            p = (m * t_mensuel) / (1 - (1 + t_mensuel)**-n)

    return m, n, p, t_mensuel


def generer_echeancier(m: float, n: int, p: float, t_mensuel: float, taux_assurance_annuel: float = 0.36):
    """
    Génère le tableau d'amortissement complet mois par mois.

    Calcule la décomposition de chaque mensualité (Principal/Intérêts) et intègre 
    la gestion de l'assurance solde restant dû (ASRD).

    Args:
        m: Capital initial.
        n: Nombre de périodes (mois).
        p: Mensualité cible hors assurance.
        t_mensuel: Taux périodique mensuel calculé.
        taux_assurance_annuel: Taux de l'assurance pour le calcul des primes.

    Returns:
        tuple: (liste_echeances, total_interets, total_assurance)
    """
    echeancier = []
    solde = m
    total_interets_cumules = 0
    total_assurance_cumulee = 0

    # On calcule la prime fixe une seule fois à l'extérieur pour la performance
    assurance_fixe = round((m * (taux_assurance_annuel / 100)) / 12, 2)

    for mois in range(1, n + 1):
        # 1. Arrondir l'intérêt immédiatement
        interet = round(solde * t_mensuel, 2)

        # 2. Gestion de la dernière échéance pour tomber pile à zéro
        if mois == n:
            capital = round(solde, 2)
            mensualite_totale = capital + interet + assurance_fixe
        else:
            capital = round(p - interet, 2)
            mensualite_totale = round(p + assurance_fixe, 2)

        solde = round(solde - capital, 2)

        # Cumul pour les stats
        total_interets_cumules += interet
        total_assurance_cumulee += assurance_fixe

        echeancier.append({
            "mois": mois,
            "mensualite": round(mensualite_totale, 2),
            "capital": capital,
            "interet": interet,
            "assurance": assurance_fixe,
            "solde": max(0, solde)  # Sécurité contre le -0.0
        })

    return echeancier, round(total_interets_cumules, 2), round(total_assurance_cumulee, 2)


if not os.path.exists(EXPORT_PATH):
    os.makedirs(EXPORT_PATH)


def sauvegarder_excel_localement(echeancier: list, simulation_id: int) -> str:
    """
    Génère un fichier Excel et le sauvegarde dans le repository local.

    Args:
        echeancier: Liste des lignes d'amortissement.
        simulation_id: ID de la simulation pour nommer le fichier de manière unique.

    Returns:
        str: Le chemin complet du fichier sauvegardé.
    """
    df = pd.DataFrame(echeancier)

    # Création d'un nom de fichier unique
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    nom_fichier = f"simulation_{simulation_id}_{timestamp}.xlsx"
    chemin_complet = os.path.join(EXPORT_PATH, nom_fichier)

    # Sauvegarde physique (Point 4)
    df.to_excel(chemin_complet, index=False, engine='openpyxl')

    return chemin_complet


def get_repository_info(directory: str) -> dict:
    """
    Analyse le dossier de stockage pour le dashboard.
    """
    if not os.path.exists(directory):
        return {"file_count": 0, "total_size_mb": 0}

    files = os.listdir(directory)
    total_size = sum(os.path.getsize(os.path.join(directory, f))
                     for f in files if os.path.isfile(os.path.join(directory, f)))

    return {
        "file_count": len(files),
        "total_size_mb": round(total_size / (1024 * 1024), 2)
    }
