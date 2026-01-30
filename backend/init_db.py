from database import engine, Base
import models

print("Création des tables dans mortgage_app.db...")
Base.metadata.create_all(bind=engine)
print("Base de données prête !")
