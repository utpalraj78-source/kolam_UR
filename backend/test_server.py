from fastapi import FastAPI
import uvicorn

# from backend.main import app
app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello World"}

if __name__ == "__main__":
    uvicorn.run("backend.test_server:app", host="127.0.0.1", port=8000, reload=True)
