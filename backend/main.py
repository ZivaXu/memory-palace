import uvicorn
import os  # <--- 新增：用于读取系统环境变量
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import umap
from sklearn.cluster import KMeans
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 新增：健康检查接口 (Render 极其需要这个) ---
# Render 会尝试 ping 根路径 "/"，如果报错，它会以为服务没起
@app.get("/")
def read_root():
    return {"status": "Loci Backend is running"}

print("Loading AI Model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

class TextInput(BaseModel):
    text: str

@app.post("/analyze")
async def analyze_text(input: TextInput):
    raw_text = input.text
    if not raw_text:
        raise HTTPException(status_code=400, detail="Text is empty")

    chunks = [line.strip() for line in raw_text.split('\n') if len(line.strip()) > 10]
    if len(chunks) < 5:
        return {"error": "Text too short. Please provide at least 5 lines."}

    embeddings = model.encode(chunks)
    reducer = umap.UMAP(n_components=3, n_neighbors=5, min_dist=0.1, random_state=42)
    embedding_3d = reducer.fit_transform(embeddings)

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
    # --- 修改重点：动态获取端口 ---
    # 如果在 Render 上，它会从环境变量取 PORT
    # 如果在本地，找不到 PORT 变量，就默认用 8000
    port = int(os.environ.get("PORT", 8000))

    # host 必须是 "0.0.0.0"，不能是 "localhost"
    uvicorn.run(app, host="0.0.0.0", port=port)
