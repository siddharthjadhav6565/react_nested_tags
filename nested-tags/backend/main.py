from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.dialects.postgresql import JSONB
from pydantic import BaseModel, ConfigDict, model_validator
from typing import List, Optional

# ================= DATABASE ================= #

DATABASE_URL = "postgresql://postgres:kali@localhost:5432/nested_tags"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# ================= MODEL ================= #

class Tree(Base):
    __tablename__ = "trees"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(JSONB, nullable=False)


Base.metadata.create_all(bind=engine)


# ================= SCHEMAS ================= #

class Tag(BaseModel):
    name: str
    data: Optional[str] = None
    children: Optional[List["Tag"]] = None

    # 🔥 VALIDATION (VERY IMPORTANT)
    @model_validator(mode="after")
    def validate_node(self):
        if self.data is not None and self.children is not None:
            raise ValueError("Node cannot have both data and children")
        if self.data is None and self.children is None:
            raise ValueError("Node must have either data or children")
        return self


Tag.model_rebuild()


# Accept RAW tree (not wrapped in "data")
class TreeCreate(Tag):
    pass


class TreeResponse(BaseModel):
    id: int
    name: str
    data: Optional[str] = None
    children: Optional[List[Tag]] = None

    model_config = ConfigDict(from_attributes=True)


TreeResponse.model_rebuild()


# ================= APP ================= #

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# ✅ GET all trees
@app.get("/trees", response_model=List[TreeResponse])
def get_trees(db: Session = Depends(get_db)):
    trees = db.query(Tree).all()

    return [
        {
            "id": t.id,
            **t.data
        }
        for t in trees
    ]


# ✅ CREATE tree
@app.post("/trees", response_model=TreeResponse)
def create_tree(tree: TreeCreate, db: Session = Depends(get_db)):
    db_tree = Tree(data=tree.model_dump())

    db.add(db_tree)
    db.commit()
    db.refresh(db_tree)

    return {
        "id": db_tree.id,
        **db_tree.data
    }


# ✅ UPDATE tree
@app.put("/trees/{tree_id}", response_model=TreeResponse)
def update_tree(tree_id: int, tree: TreeCreate, db: Session = Depends(get_db)):
    db_tree = db.query(Tree).filter(Tree.id == tree_id).first()

    if not db_tree:
        raise HTTPException(status_code=404, detail="Tree not found")

    db_tree.data = tree.model_dump()

    db.commit()
    db.refresh(db_tree)

    return {
        "id": db_tree.id,
        **db_tree.data
    }

# ✅ DELETE tree
@app.delete("/trees")
def delete_all_trees(db: Session = Depends(get_db)):
    db.query(Tree).delete()
    db.commit()
    return {"message": "All trees deleted"}

# ✅ HEALTH CHECK (useful for frontend error handling)
@app.get("/health")
def health():
    return {"status": "ok"}
