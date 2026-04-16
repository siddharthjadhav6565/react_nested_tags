from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.dialects.postgresql import JSONB
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

# ================= DATABASE ================= #

DATABASE_URL = "postgresql://postgres:password@localhost:5432/nested_tags"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# ================= MODEL ================= #

class Tree(Base):
    __tablename__ = "trees"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(JSONB, nullable=False)


# Create table
Base.metadata.create_all(bind=engine)


# ================= SCHEMAS ================= #

class Tag(BaseModel):
    name: str
    data: Optional[str] = None
    children: Optional[List["Tag"]] = None

Tag.model_rebuild()


class TreeCreate(BaseModel):
    data: Tag


class TreeResponse(BaseModel):
    id: int
    data: Tag

    model_config = ConfigDict(from_attributes=True)


# ================= APP ================= #

app = FastAPI()

# CORS (allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================= DB DEP ================= #

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ================= ROUTES ================= #

# GET all trees
@app.get("/trees", response_model=List[TreeResponse])
def get_trees(db: Session = Depends(get_db)):
    return db.query(Tree).all()


# CREATE new tree
@app.post("/trees", response_model=TreeResponse)
def create_tree(tree: TreeCreate, db: Session = Depends(get_db)):
    db_tree = Tree(data=tree.data.model_dump())
    db.add(db_tree)
    db.commit()
    db.refresh(db_tree)
    return db_tree


# UPDATE existing tree
@app.put("/trees/{tree_id}", response_model=TreeResponse)
def update_tree(tree_id: int, tree: TreeCreate, db: Session = Depends(get_db)):
    db_tree = db.query(Tree).filter(Tree.id == tree_id).first()

    if not db_tree:
        raise HTTPException(status_code=404, detail="Tree not found")

    db_tree.data = tree.data.model_dump()
    db.commit()
    db.refresh(db_tree)

    return db_tree