from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import uvicorn
import uuid
import json
from processor import process_image, get_histogram

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for uploaded images (for demo purposes)
# In production, use Redis or local storage
image_storage = {}

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_bytes = await file.read()
    image_id = str(uuid.uuid4())
    image_storage[image_id] = file_bytes
    
    return {"image_id": image_id}

@app.post("/process/{image_id}")
async def process(image_id: str, 
                  algorithm: str = Form(...),
                  params: str = Form(...)): # params as JSON string
    if image_id not in image_storage:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        params_dict = json.loads(params)
    except:
        params_dict = {}
        
    image_bytes = image_storage[image_id]
    processed_bytes = process_image(image_bytes, algorithm, params_dict)
    
    if processed_bytes is None:
        raise HTTPException(status_code=500, detail="Processing failed")
        
    return Response(content=processed_bytes, media_type="image/png")

@app.get("/histogram/{image_id}")
async def histogram(image_id: str):
    if image_id not in image_storage:
        raise HTTPException(status_code=404, detail="Image not found")
        
    hist = get_histogram(image_storage[image_id])
    return {"histogram": hist}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
