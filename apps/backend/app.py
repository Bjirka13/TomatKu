"""Hugging Face Spaces launcher for the TomatKU FastAPI backend."""

import gradio as gr
import uvicorn
from fastapi.responses import RedirectResponse

from api.routes.predict import service
from main import app as fastapi_app


@fastapi_app.get("/", include_in_schema=False)
async def gradio_root():
    return RedirectResponse(url="/gradio/")


gradio_demo = gr.Interface(
    fn=service.model_service.predict,
    inputs=gr.Image(type="numpy", label="Leaf image"),
    outputs=[
        gr.Textbox(label="Classification"),
        gr.Number(label="Confidence (%)"),
        gr.JSON(label="Bounding boxes"),
    ],
    title="TomatKU leaf detection",
    api_name="predict",
)

app = gr.mount_gradio_app(
    fastapi_app,
    gradio_demo,
    path="/gradio",
    ssr_mode=False,
)


if __name__ == "__main__":
    # Spaces normally reports GPU handlers when Blocks.launch() is called. This
    # app is served by Uvicorn so it can keep the FastAPI routes available too.
    try:
        from spaces.zero import startup as zero_gpu_startup
    except ImportError:
        pass
    else:
        zero_gpu_startup()

    uvicorn.run(app, host="0.0.0.0", port=7860)
