from fastapi.responses import FileResponse
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import services
from schemas import LoanInput  # On suppose que tes classes Pydantic sont là
import pandas as pd
import io
from database import Base
from starlette.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import repository


# Créer les tables au démarrage
models.Base.metadata.create_all(bind=engine)

# Dépendance pour la base de données


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app = FastAPI()

origins = [
    "http://localhost:3000",
    # Remplace par ton URL Vercel une fois générée
    "https://ton-nom-de-projet.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/calculer")
async def calculer_pret(data: LoanInput, db: Session = Depends(get_db)):
    """
    Endpoint principal pour le calcul de simulation de crédit.

    Valide les données d'entrée via Pydantic, résout les inconnues financières 
    et retourne l'échéancier complet avec les agrégats financiers.

    Returns:
        JSON: Paramètres finaux et tableau d'amortissement détaillé.
    """
    try:
        # 1. Calcul des paramètres financiers
        m, n, p, t_mensuel = services.resoudre_parametres_pret(
            data.montant, data.taux_annuel, data.duree_mois, data.mensualite
        )

        if any(v is None for v in [m, n, p]):
            raise ValueError("Informations insuffisantes pour le calcul.")

        echeancier, total_int, total_assu = services.generer_echeancier(
            m, n, p, t_mensuel)

        params_finaux = {
            "montant": round(m, 2),
            "taux_annuel": round(data.taux_annuel if data.taux_annuel else 0, 2),
            "duree_mois": n,
            "mensualite": round(p, 2),
            "total_interets": round(total_int, 2),
            "total_assurance": round(total_assu, 2),
            "cout_total_credit": round(total_int + total_assu, 2)
        }

        # 2. Sauvegarde UNIQUE et récupération de l'ID
        # On force un client_id à 1 par défaut si data.client_id est absent pour éviter les crashs
        c_id = data.client_id if data.client_id else 1

        new_sim = repository.save_simulation(
            db, params_finaux, echeancier, c_id)

        if not new_sim:
            raise HTTPException(
                status_code=500, detail="Erreur lors de la sauvegarde en base.")

        # 3. Réponse propre pour React
        return {
            "params_finaux": params_finaux,
            "echeancier": echeancier,
            "id": new_sim.id  # L'ID qui servira à l'export Excel
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"CRASH LOG: {e}")
        raise HTTPException(
            status_code=500, detail=f"Erreur interne: {str(e)}")


@app.post("/capacite-emprunt")
async def calculer_capacite(data: dict):
    """
    Calcule la capacité d'emprunt maximale d'un client en fonction d'une mensualité cible.

    Cette fonction inverse la formule classique des annuités pour isoler le capital. 
    Elle prend en compte à la fois le taux d'intérêt bancaire et le taux d'assurance 
    pour déterminer le montant total qu'un client peut emprunter sans dépasser sa 
    mensualité maximale.

    Args:
        data (dict): Un dictionnaire contenant les clés suivantes :
            - mensualite_max (float): Le budget mensuel total (assurance incluse).
            - taux_annuel (float): Le taux d'intérêt nominal annuel
            - duree_ans (int): La durée du crédit en années.
            - taux_assurance (float): Le taux d'assurance annuel

    Returns:
        dict: Un dictionnaire contenant les résultats arrondis :
            - capital_empruntable (float): Le montant total du prêt possible.
            - mensualite_hors_assurance (float): La part de la mensualité dédiée au crédit.
            - assurance_mensuelle (float): La part de la mensualité dédiée à l'assurance.
    """
    # Data attendu: mensualite_max, taux_annuel, duree_ans, taux_assurance
    p_totale = float(data.get("mensualite_max"))
    taux_annuel = float(data.get("taux_annuel")) / 100
    duree_mois = int(data.get("duree_ans")) * 12
    t_assu_annuel = float(data.get("taux_assurance")) / 100

    # Étape A : Isoler la mensualité hors assurance
    # Puisque Mensualité = (M * t_mensuel / (1 - (1+t_mensuel)^-n)) + (M * t_assu / 12)
    # On factorise M pour trouver le capital max
    t_mensuel = taux_annuel / 12
    denominateur_pret = t_mensuel / (1 - (1 + t_mensuel)**(-duree_mois))
    frais_assurance_mensuel = t_assu_annuel / 12

    # Capital Max = Mensualité Totale / (Facteur Prêt + Facteur Assurance)
    capital_max = p_totale / (denominateur_pret + frais_assurance_mensuel)

    return {
        "capital_empruntable": round(capital_max, 2),
        "mensualite_hors_assurance": round(capital_max * denominateur_pret, 2),
        "assurance_mensuelle": round(capital_max * frais_assurance_mensuel, 2)
    }


@app.get("/historique")
async def lire_historique(db: Session = Depends(get_db)):
    """
    Récupère la liste de toutes les simulations enregistrées.
    Inclut les simulations marquées 'is_deleted' pour gestion côté Frontend.
    """
    # On récupère tout pour permettre au front d'afficher la mention "Supprimé"
    simulations = db.query(models.Simulation).all()

    resultat = []
    for sim in simulations:
        # On cherche la mensualité dans SimulationDetail si elle n'est pas dans Simulation
        premiere_echeance = db.query(models.SimulationDetail).filter(
            models.SimulationDetail.simulation_id == sim.id
        ).first()

        mensualite = premiere_echeance.mensualite if premiere_echeance else 0

        # On récupère TOUTES les lignes pour pouvoir faire la somme des intérêts et assurances
        details = db.query(models.SimulationDetail).filter(
            models.SimulationDetail.simulation_id == sim.id
        ).all()

        # Calcul des sommes AVANT de les utiliser dans le dictionnaire
        # On utilise 0.0 par défaut si la liste est vide
        somme_interet = sum((d.interet or 0.0)
                            for d in details) if details else 0.0
        somme_assurance = sum((d.assurance or 0.0)
                              for d in details) if details else 0.0

        resultat.append({
            "id": sim.id,
            "montant_desire": sim.montant_desire,
            "taux_annuel": sim.taux_annuel,
            "duree_mois": sim.duree_mois,
            "mensualite": mensualite,
            "total_interets": round(somme_interet, 2),
            "total_assurance": round(somme_assurance, 2),
            "nb_export_pdf": sim.nb_export_pdf,
            "nb_export_excel": sim.nb_export_excel,
            "is_deleted": sim.is_deleted,
            "date_traitement": sim.date_traitement
        })

    return resultat


@app.patch("/simulation/{sim_id}/supprimer")
async def supprimer_simulation(sim_id: int, db: Session = Depends(get_db)):
    """
    Effectue une suppression logique (Soft Delete).
    La donnée reste en base mais change d'état (Point 3).
    """
    sim = repository.soft_delete_simulation(db, sim_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation non trouvée")
    return {"message": "Simulation marquée comme supprimée", "id": sim_id}


@app.get("/dashboard/stats")
async def read_stats(db: Session = Depends(get_db)):
    """
    Endpoint consolidé pour le Dashboard (Point 7).
    Combine les données de la DB et l'état du Repository de fichiers.
    """
    # Statistiques DB
    db_stats = repository.get_dashboard_stats(db)

    # Statistiques Fichiers (Point 4)
    repo_stats = services.get_repository_info("exports_repository/excel")

    return {
        "financial_summary": db_stats,
        "repository_summary": repo_stats,
        "status": "success"
    }


@app.post("/export/excel/{simulation_id}")
async def export_excel(simulation_id: int, data: List[Dict]):
    """
    Remplace l'ancienne fonction. 
    1. Sauvegarde le fichier dans le dossier permanent (Point 4).
    2. Envoie le fichier au client pour téléchargement.
    """

    try:
        # Appel au service qui fait la sauvegarde physique
        chemin_fichier = services.sauvegarder_excel_localement(
            data, simulation_id)

        return FileResponse(
            path=chemin_fichier,
            filename=f"simulation_{simulation_id}.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur export: {str(e)}")


@app.post("/export/pdf/{simulation_id}")
async def export_pdf(simulation_id: int, data: List[Dict]):
    """
    1. Génère et sauvegarde le PDF localement dans /exported_simulations.
    2. Envoie le fichier au client pour téléchargement immédiat.
    """
    try:
        # Appel au service pour la génération et sauvegarde physique
        chemin_fichier = services.sauvegarder_pdf_localement(
            data, simulation_id)

        # Incrémenter le compteur dans la base de données (optionnel mais recommandé)
        # simulation = db.query(models.Simulation).filter(models.Simulation.id == simulation_id).first()
        # if simulation:
        #     simulation.nb_export_pdf += 1
        #     db.commit()

        return FileResponse(
            path=chemin_fichier,
            filename=f"simulation_{simulation_id}.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        print(f"Erreur détaillée : {str(e)}")  # les logs console
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la génération du PDF : {str(e)}"
        )


# @app.post("/export/excel")
# async def export_excel(data: List[Dict]):
#     """
#     Génère un fichier Excel (XLSX) à partir des données de l'échéancier.

#     Transforme la structure JSON en DataFrame Pandas pour un export binaire
#     structuré vers le client.

#     Returns:
#         StreamingResponse: Flux binaire du fichier Excel.
#     """
#     df = pd.DataFrame(data)
#     output = io.BytesIO()
#     with pd.ExcelWriter(output, engine='openpyxl') as writer:
#         df.to_excel(writer, index=False, sheet_name='Amortissement')
#     output.seek(0)
#     headers = {'Content-Disposition': 'attachment; filename="amortissement.xlsx"'}
#     return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)


# @app.post("/export/excel/{simulation_id}")
# async def export_excel_permanent(simulation_id: int, data: List[Dict]):
#     """
#     Enregistre le fichier dans le repository et le renvoie pour téléchargement.
#     """
#     try:
#         # 1. Sauvegarde physique dans le dossier 'exports_repository'
#         chemin_fichier = services.sauvegarder_excel_localement(
#             data, simulation_id)

#         # 2. Renvoi du fichier au client (React)
#         return FileResponse(
#             path=chemin_fichier,
#             filename=os.path.basename(chemin_fichier),
#             media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
#         )
#     except Exception as e:
#         raise HTTPException(
#             status_code=500, detail=f"Erreur lors du stockage : {str(e)}")

@app.put("/simulations/{sim_id}/increment-export")
async def increment_export(sim_id: int, type: str, db: Session = Depends(get_db)):
    # On cherche la simulation par son ID
    db_sim = db.query(models.Simulation).filter(
        models.Simulation.id == sim_id).first()

    if not db_sim:
        raise HTTPException(status_code=404, detail="Simulation non trouvée")

    # On incrémente le bon compteur selon le type envoyé ('pdf' ou 'excel')
    if type == "pdf":
        db_sim.nb_export_pdf += 1
    elif type == "excel":
        db_sim.nb_export_excel += 1
    else:
        raise HTTPException(status_code=400, detail="Type d'export invalide")

    db.commit()
    return {"status": "success", "pdf": db_sim.nb_export_pdf, "excel": db_sim.nb_export_excel}


@app.get("/stats-stockage")
async def stats_stockage():
    """
    Récupère le nombre de fichiers et la taille totale du dossier d'export.
    """
    stats = services.get_repository_info(services.EXPORT_PATH)
    return stats
