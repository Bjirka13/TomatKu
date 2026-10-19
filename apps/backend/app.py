"""Hugging Face Spaces launcher for the TomatKU FastAPI backend."""

import uvicorn


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=7860)
