from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
import io
from fastapi.middleware.cors import CORSMiddleware
import numpy_financial as npf
import pandas as pd
from pydantic import BaseModel
from typing import Optional, List, Dict
import math

app = FastAPI()

# Autoriser le Frontend React à communiquer avec le Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# MISE À JOUR : Modèle pour inclure les données client du formulaire


class ClientInfo(BaseModel):
    nom: Optional[str] = ""
    prenom: Optional[str] = ""
    dateNaissance: Optional[str] = ""
    adresse: Optional[str] = ""
    ville: Optional[str] = ""
    cp: Optional[str] = ""
    email: Optional[str] = ""
    telephone: Optional[str] = ""
    etatCivil: Optional[str] = ""
    profession: Optional[str] = ""
    revenu: Optional[str] = ""


class LoanInput(BaseModel):
    montant: Optional[float] = None
    taux_annuel: Optional[float] = None
    duree_mois: Optional[int] = None
    mensualite: Optional[float] = None
    type_taux: str = "fixe"
    changements_taux: Optional[Dict[int, float]] = None
    # On permet de recevoir les infos client mais on ne les utilise que pour l'export si besoin
    client: Optional[ClientInfo] = None


@app.post("/calculer")
async def calculer_pret(data: LoanInput):
    try:
        # 1. Nettoyage et récupération des entrées
        m = data.montant if data.montant and data.montant > 0 else None
        t_annuel = data.taux_annuel if data.taux_annuel and data.taux_annuel > 0 else None
        n = data.duree_mois if data.duree_mois and data.duree_mois > 0 else None
        p = data.mensualite if data.mensualite and data.mensualite > 0 else None

        t = (t_annuel / 100) / 12 if t_annuel else None

        # 2. LOGIQUE DE RÉSOLUTION (Inchangée)
        if m is None and all([t, n, p]):
            m = p * (1 - (1 + t)**-n) / t
        elif n is None and all([m, t, p]):
            if p <= (m * t):
                raise ValueError(
                    "La mensualité est trop faible pour couvrir les intérêts.")
            n_brut = -math.log(1 - (t * m) / p) / math.log(1 + t)
            n = math.ceil(n_brut)
        elif p is None and all([m, t, n]):
            p = (m * t) / (1 - (1 + t)**-n)
        elif t_annuel is None:
            raise ValueError("Le taux annuel est requis.")

        if any(v is None for v in [m, n, p]):
            raise ValueError("Informations insuffisantes.")

        # 3. GÉNÉRATION DU TABLEAU ET CALCUL INTÉRÊTS TOTAUX
        echeancier = []
        solde = m
        total_interets_cumules = 0  # Nouveau calcul

        for mois in range(1, n + 1):
            interet = solde * t
            total_interets_cumules += interet

            if mois == n:
                capital = solde
                p_ajustee = capital + interet
            else:
                capital = p - interet
                p_ajustee = p

            solde -= capital

            echeancier.append({
                "mois": mois,
                "mensualite": round(p_ajustee, 2),
                "capital": round(capital, 2),
                "interet": round(interet, 2),
                "solde": round(max(0, solde), 2)
            })

        return {
            "params_finaux": {
                "montant": round(m, 2),
                "taux_annuel": round(t_annuel, 2),
                "duree_mois": n,
                "mensualite": round(p, 2),
                # Ajouté pour le frontend
                "total_interets": round(total_interets_cumules, 2)
            },
            "echeancier": echeancier
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Erreur système: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne.")


@app.post("/export/excel")
async def export_excel(data: List[Dict]):
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Amortissement')
    output.seek(0)
    headers = {'Content-Disposition': 'attachment; filename="amortissement.xlsx"'}
    return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)

if __name__ == "__main__":
    import uvicorn
    # N'oublie pas de vérifier ton IP ici pour le test téléphone
    uvicorn.run(app, host="0.0.0.0", port=8000)
