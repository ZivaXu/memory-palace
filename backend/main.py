import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import umap
from sklearn.cluster import KMeans
import numpy as np

app = FastAPI()

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading AI Model (this happens once)...")
model = SentenceTransformer('all-MiniLM-L6-v2') 

class TextInput(BaseModel):
    text: str

@app.post("/analyze")
async def analyze_text(input: TextInput):
    raw_text = input.text
    if not raw_text:
        raise HTTPException(status_code=400, detail="Text is empty")

    # 简单切片
    chunks = [line.strip() for line in raw_text.split('\n') if len(line.strip()) > 10]
    if len(chunks) < 5:
        return {"error": "Text too short. Please provide at least 5 lines."}

    # 向量化 & 降维
    embeddings = model.encode(chunks)
    reducer = umap.UMAP(n_components=3, n_neighbors=5, min_dist=0.1, random_state=42)
    embedding_3d = reducer.fit_transform(embeddings)

    # 聚类
    n_clusters = min(5, len(chunks))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    labels = kmeans.fit_predict(embeddings)

    nodes = []
    for i, chunk in enumerate(chunks):
        nodes.append({
            "id": i,
            "text": chunk[:100] + "...",
            "full_text": chunk,
            "group": int(labels[i]),
            "fx": float(embedding_3d[i][0]) * 10,
            "fy": float(embedding_3d[i][1]) * 10,
            "fz": float(embedding_3d[i][2]) * 10
        })

    links = [{"source": i, "target": i+1} for i in range(len(nodes) - 1)]
    return {"nodes": nodes, "links": links}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
