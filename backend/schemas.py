from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, List


class ClientInfo(BaseModel):
    """
    Structure des données client (Point 8 : desclients)
    Toutes les options sont ici facultatives pour permettre 
    une saisie progressive dans le formulaire React.
    """
    nom: Optional[str] = Field(None, example="Dupont")
    prenom: Optional[str] = Field(None, example="Jean")
    dateNaissance: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    cp: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    etatCivil: Optional[str] = None
    profession: Optional[str] = None
    revenu: Optional[str] = None


class LoanInput(BaseModel):
    """
    Modèle principal pour le calcul du prêt (Point 1, 2, 5, 6)
    Le '...' indique que le champ est requis s'il n'y a pas de valeur par défaut.
    """
    # Données financières
    montant: Optional[float] = Field(None, gt=0, description="Montant du prêt")
    taux_annuel: Optional[float] = Field(
        None, description="Taux d'intérêt annuel en %")
    duree_mois: Optional[int] = Field(
        None, gt=0, le=600, description="Durée en mois (max 50 ans)")
    mensualite: Optional[float] = Field(
        None, gt=0, description="Mensualité souhaitée")

    # Assurance Solde Restant Dû
    taux_assurance: Optional[float] = Field(
        0.0, description="Taux annuel de l'assurance en %")

    # Configuration
    type_taux: str = Field(
        "fixe", description="Type de taux (fixe ou variable)")
    changements_taux: Optional[Dict[int, float]] = None

    # Liaison avec le client
    client: Optional[ClientInfo] = None

    # Identifiants pour la base de données (Point 8)
    client_id: Optional[int] = None
    operateur_id: Optional[int] = None


class SimulationResponse(BaseModel):
    """Schéma pour la réponse envoyée au frontend React"""
    params_finaux: Dict
    echeancier: List[Dict]
