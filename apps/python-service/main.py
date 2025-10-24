from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import numpy as np
from umap import UMAP

app = FastAPI()

class ProjectReq(BaseModel):
    vectors: List[List[float]]
    algo: str = "umap"
    dim: int = 2
    seed: int = 42

class ProjectRes(BaseModel):
    coords: List[List[float]]
    elapsed_ms: int

@app.post("/api/project", response_model=ProjectRes)
def project(req: ProjectReq):
    X = np.array(req.vectors, dtype=np.float32)
    um = UMAP(n_neighbors=15, min_dist=0.1, n_components=req.dim, random_state=req.seed)
    import time
    t0 = time.time()
    Y = um.fit_transform(X)
    elapsed = int((time.time() - t0) * 1000)
    return {"coords": Y.tolist(), "elapsed_ms": elapsed}

@app.get("/api/health")
def health():
    return {"ok": True}
