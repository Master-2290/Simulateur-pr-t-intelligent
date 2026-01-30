from sqlalchemy import func
from sqlalchemy.orm import Session
import models
import schemas


def save_simulation(db: Session, params: dict, echeancier: list, client_id: int = None):
    """
    Enregistre une simulation complète en base de données.

    Cette fonction réalise une insertion atomique dans la table Simulation 
    et ses détails associés.
    """
    try:
        # 1. Création de l'entête
        db_sim = models.Simulation(
            client_id=client_id if client_id else 1,  # Sécurité
            montant_desire=params["montant"],
            taux_annuel=params["taux_annuel"],
            duree_mois=params["duree_mois"],
            is_deleted=False
        )
        db.add(db_sim)
        db.commit()  # On commit l'entête d'abord pour garantir l'ID
        db.refresh(db_sim)

        # 2. Création des lignes du tableau
        for ligne in echeancier:
            db_detail = models.SimulationDetail(
                simulation_id=db_sim.id,
                mois=ligne["mois"],
                mensualite=ligne["mensualite"],
                interet=ligne["interet"],
                capital_amorti=ligne["capital"],
                solde_restant=ligne["solde"]
            )
            db.add(db_detail)

        db.commit()
        return db_sim
    except Exception as e:
        db.rollback()
        print(f"ERREUR REPOSITORY: {e}")
        return None


def get_historique(db: Session):
    """Récupère toutes les simulations non supprimées (Point 3)."""
    return db.query(models.Simulation).filter(models.Simulation.is_deleted == False).all()


def soft_delete_simulation(db: Session, sim_id: int):
    """Marque une simulation comme supprimée sans la rayer de la DB."""
    db_sim = db.query(models.Simulation).filter(
        models.Simulation.id == sim_id).first()
    if db_sim:
        db_sim.is_deleted = True
        db.commit()
    return db_sim


def get_dashboard_stats(db: Session):
    """
    Calcule les indicateurs clés de performance (KPI) pour le dashboard.
    """
    # 1. Volume total des prêts simulés
    total_montant = db.query(func.sum(models.Simulation.montant_desire)).filter(
        models.Simulation.is_deleted == False).scalar() or 0

    # 2. Nombre total de simulations
    count_simulations = db.query(func.count(models.Simulation.id)).filter(
        models.Simulation.is_deleted == False).scalar()

    # 3. Répartition par opérateur (Point 7 : Top Opérateurs)
    stats_operateurs = db.query(
        models.Operateur.nom,
        func.count(models.Simulation.id)
    ).join(models.Simulation).group_by(models.Operateur.nom).all()

    return {
        "total_volume": round(total_montant, 2),
        "total_count": count_simulations,
        "par_operateur": {nom: count for nom, count in stats_operateurs}
    }
