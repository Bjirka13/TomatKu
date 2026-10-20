"""Hugging Face Spaces launcher for the TomatKU FastAPI backend."""

import gradio as gr
import uvicorn
from fastapi import Request
from fastapi.responses import RedirectResponse

from api.routes.predict import service
from main import app as fastapi_app


@fastapi_app.get("/", include_in_schema=False)
async def gradio_root(request: Request):
    # Keep redirects relative so Hugging Face's /spaces/<owner>/<name> proxy
    # prefix and private-Space signature are preserved from the Hub page.
    target = "gradio/"
    if request.url.query:
        target = f"{target}?{request.url.query}"
    return RedirectResponse(url=target)


try:
    import spaces
except ImportError:
    spaces = None


def predict_fn(image):
    return service.model_service.predict(image)


if spaces is not None:
    try:
        predict_fn = spaces.GPU(predict_fn)
    except Exception:
        pass


gradio_demo = gr.Interface(
    # fn=service.model_service.predict,
    fn=predict_fn,
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
        zero_gpu_startup()
    except Exception as exc:
        print(f"ZeroGPU startup note: {exc}")

    uvicorn.run(app, host="0.0.0.0", port=7860)
