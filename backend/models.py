from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
import datetime
from database import Base


class Operateur(Base):
    __tablename__ = "enumOperateur"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, unique=True, nullable=False)
    prenom = Column(String)
    email = Column(String)
    telephone = Column(String)

    # Relation : Un opérateur peut avoir fait plusieurs simulations
    simulations = relationship("Simulation", back_populates="operateur")


class Client(Base):
    __tablename__ = "desclients"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    email = Column(String)
    telephone = Column(String)

    simulations = relationship("Simulation", back_populates="client")


class Simulation(Base):
    __tablename__ = "simulation"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("desclients.id"))
    operateur_id = Column(Integer, ForeignKey("enumOperateur.id"))

    # Champs techniques demandés
    date_traitement = Column(DateTime, default=datetime.datetime.utcnow)
    prix_achat = Column(Float)  # Vu sur ton image HYPOTHE.JPG
    montant_desire = Column(Float)
    taux_annuel = Column(Float)
    duree_mois = Column(Integer)

    # Point 3 : Suppression logique
    is_deleted = Column(Boolean, default=False)

    client = relationship("Client", back_populates="simulations")
    operateur = relationship("Operateur", back_populates="simulations")
    details = relationship("SimulationDetail", back_populates="simulation")


class SimulationDetail(Base):
    __tablename__ = "simulationDetail"
    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("simulation.id"))

    mois = Column(Integer)
    mensualite = Column(Float)
    interet = Column(Float)
    capital_amorti = Column(Float)
    solde_restant = Column(Float)

    simulation = relationship("Simulation", back_populates="details")
